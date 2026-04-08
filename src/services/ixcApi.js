// Client da API IXC Provedor
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { decrypt } = require('../config/encryption');
const logger = require('../utils/logger');

let credentials = null;

// Carrega e descriptografa as credenciais
function loadCredentials() {
  if (credentials) return credentials;

  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) throw new Error('MASTER_KEY não definida no .env');

  const encPath = path.join(__dirname, '../../data/credentials.enc');
  if (!fs.existsSync(encPath)) throw new Error('Arquivo credentials.enc não encontrado. Execute npm run setup');

  const encData = JSON.parse(fs.readFileSync(encPath, 'utf8'));
  credentials = decrypt(encData, masterKey);
  return credentials;
}

// Monta o header de autorização Basic
function getAuthHeader() {
  const creds = loadCredentials();
  const token = `${creds.userId}:${creds.apiToken}`;
  return 'Basic ' + Buffer.from(token).toString('base64');
}

// Monta a URL base da API
function getBaseUrl() {
  const creds = loadCredentials();
  return creds.apiUrl.replace(/\/$/, '') + '/webservice/v1';
}

// Requisição genérica para a API IXC
async function apiRequest(endpoint, data, method = 'POST') {
  const url = `${getBaseUrl()}/${endpoint}`;
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      'ixcsoft': 'listar'
    },
    timeout: 15000
  };

  if (method === 'POST' && data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) throw new Error('Credenciais da API inválidas. Execute npm run setup novamente.');
      if (status === 404) throw new Error('Endpoint não encontrado na API IXC.');
      if (status === 500) throw new Error('Erro interno no servidor IXC. Tente novamente.');
      throw new Error(`Erro na API IXC: ${status} - ${error.response.statusText}`);
    }
    if (error.code === 'ECONNABORTED') throw new Error('Timeout na conexão com a API IXC.');
    if (error.code === 'ENOTFOUND') throw new Error('Servidor IXC não encontrado. Verifique a conexão.');
    throw new Error(`Erro de conexão: ${error.message}`);
  }
}

// Busca cliente por CPF/CNPJ
async function buscarCliente(cpfCnpj) {
  const limpo = cpfCnpj.replace(/\D/g, '');
  logger.info(`Buscando cliente com documento: ***${limpo.substring(3, 6)}***`);

  // IXC armazena CPF/CNPJ com máscara
  let formatado;
  if (limpo.length === 11) {
    formatado = limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (limpo.length === 14) {
    formatado = limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  } else {
    formatado = limpo;
  }

  const data = {
    qtype: 'cliente.cnpj_cpf',
    query: formatado,
    oper: '=',
    page: '1',
    rp: '20',
    sortname: 'cliente.id',
    sortorder: 'desc'
  };

  const result = await apiRequest('cliente', data);

  if (!result.registros || result.total === '0' || result.total === 0) {
    return null;
  }

  const cliente = result.registros[0];
  return {
    id: cliente.id,
    nome: cliente.razao,
    cpfCnpj: cliente.cnpj_cpf,
    telefone: cliente.telefone_celular,
    email: cliente.email
  };
}

// Busca nome da cidade pelo ID
async function buscarNomeCidade(idCidade) {
  if (!idCidade || idCidade === '0') return '';

  const data = {
    qtype: 'cidade.id',
    query: String(idCidade),
    oper: '=',
    page: '1',
    rp: '1'
  };

  const result = await apiRequest('cidade', data);

  if (!result.registros || result.total === '0' || result.total === 0) {
    return '';
  }

  return result.registros[0].nome || '';
}

// Busca endereço do cliente pelo ID
async function buscarEnderecoCliente(idCliente) {
  const data = {
    qtype: 'cliente.id',
    query: String(idCliente),
    oper: '=',
    page: '1',
    rp: '1'
  };

  const result = await apiRequest('cliente', data);

  if (!result.registros || result.total === '0' || result.total === 0) {
    return null;
  }

  const c = result.registros[0];
  return {
    endereco: c.endereco,
    numero: c.numero,
    bairro: c.bairro,
    cidade: c.cidade,
    cep: c.cep,
    complemento: c.complemento
  };
}

// Busca contratos ativos do cliente
async function buscarContratos(idCliente) {
  const data = {
    qtype: 'cliente_contrato.id_cliente',
    query: String(idCliente),
    oper: '=',
    page: '1',
    rp: '20',
    sortname: 'cliente_contrato.id',
    sortorder: 'desc'
  };

  const result = await apiRequest('cliente_contrato', data);

  if (!result.registros || result.total === '0' || result.total === 0) {
    return [];
  }

  const contratosAtivos = result.registros.filter(c => c.status === 'A');

  // Verifica se algum contrato usa endereço padrão do cliente
  const precisaEnderecoCliente = contratosAtivos.some(c => c.endereco_padrao_cliente === 'S');
  let enderecoCliente = null;

  if (precisaEnderecoCliente) {
    enderecoCliente = await buscarEnderecoCliente(idCliente);
  }

  // Coleta todos os IDs de cidade únicos para resolver os nomes
  const idsCidade = new Set();
  for (const c of contratosAtivos) {
    if (c.endereco_padrao_cliente === 'S' && enderecoCliente) {
      idsCidade.add(enderecoCliente.cidade);
    } else {
      idsCidade.add(c.cidade);
    }
  }

  // Resolve nomes das cidades em paralelo
  const mapaCidades = {};
  await Promise.all([...idsCidade].map(async (id) => {
    mapaCidades[id] = await buscarNomeCidade(id);
  }));

  return contratosAtivos.map(c => {
    // Se endereco_padrao_cliente = "S", usa endereço do cadastro do cliente
    if (c.endereco_padrao_cliente === 'S' && enderecoCliente) {
      return {
        id: c.id,
        endereco: enderecoCliente.endereco,
        numero: enderecoCliente.numero,
        bairro: enderecoCliente.bairro,
        cidade: mapaCidades[enderecoCliente.cidade] || enderecoCliente.cidade,
        cep: enderecoCliente.cep,
        complemento: enderecoCliente.complemento
      };
    }

    return {
      id: c.id,
      endereco: c.endereco,
      numero: c.numero,
      bairro: c.bairro,
      cidade: mapaCidades[c.cidade] || c.cidade,
      cep: c.cep,
      complemento: c.complemento
    };
  });
}

// Busca boletos em aberto do cliente
async function buscarBoletos(idCliente) {
  const data = {
    qtype: 'fn_areceber.id_cliente',
    query: String(idCliente),
    oper: '=',
    page: '1',
    rp: '50',
    sortname: 'fn_areceber.data_vencimento',
    sortorder: 'asc',
    grid_param: JSON.stringify([{ TB: 'fn_areceber.status', OP: '=', P: 'A' }])
  };

  const result = await apiRequest('fn_areceber', data);

  if (!result.registros || result.total === '0' || result.total === 0) {
    return [];
  }

  return result.registros.map(b => ({
    id: b.id,
    idCliente: b.id_cliente,
    idContrato: b.id_contrato,
    dataVencimento: b.data_vencimento,
    valor: b.valor,
    status: b.status,
    nossoNumero: b.nosso_numero,
    linhaDigitavel: b.linha_digitavel,
    gatewayLink: b.gateway_link
  }));
}

// Obtém PDF do(s) boleto(s) via get_boleto
// idBoleto pode ser um ID único ou um array de IDs
async function obterPdfBoleto(idBoleto) {
  const url = `${getBaseUrl()}/get_boleto`;
  const ids = Array.isArray(idBoleto) ? idBoleto.join(',') : String(idBoleto);

  try {
    const response = await axios({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'ixcsoft': 'listar'
      },
      data: {
        boletos: ids,
        juro: 'S',
        multa: 'S',
        atualiza_boleto: 'S',
        tipo_boleto: 'arquivo',
        base64: 'S',
        layout_impressao: 'boleto_mini_margem_menor'
      },
      timeout: 30000
    });

    // Resposta vem em base64
    const base64Data = response.data;
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    return {
      data: pdfBuffer,
      contentType: 'application/pdf'
    };
  } catch (error) {
    logger.error(`Erro ao obter PDF do boleto ${idBoleto}: ${error.message}`);
    throw new Error('Não foi possível obter o PDF do boleto.');
  }
}

// Obtém dados estruturados do boleto (JSON) via get_boleto com tipo_boleto: 'dados'
async function obterDadosBoleto(idBoleto) {
  const url = `${getBaseUrl()}/get_boleto`;

  try {
    const response = await axios({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'ixcsoft': 'listar'
      },
      data: {
        boletos: String(idBoleto),
        juro: 'S',
        multa: 'S',
        atualiza_boleto: 'S',
        tipo_boleto: 'dados',
        base64: 'N',
        layout_impressao: ''
      },
      timeout: 15000
    });

    const dados = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!dados) throw new Error('Nenhum dado retornado para o boleto.');

    return dados;
  } catch (error) {
    logger.error(`Erro ao obter dados do boleto ${idBoleto}: ${error.message}`);
    throw new Error('Não foi possível obter os dados do boleto.');
  }
}

// Obtém dados do PIX (QR Code) via get_pix
// Retorna null em caso de erro (boleto imprime sem PIX)
async function obterPix(idBoleto) {
  const url = `${getBaseUrl()}/get_pix`;

  try {
    const response = await axios({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'ixcsoft': 'listar'
      },
      data: {
        id_areceber: String(idBoleto)
      },
      timeout: 15000
    });

    const data = response.data;
    if (!data || data.type !== 'success' || !data.pix || !data.pix.qrCode) {
      logger.warn(`PIX não disponível para boleto ${idBoleto}`);
      return null;
    }

    const qrCode = data.pix.qrCode;
    let qrCodeBase64 = qrCode.imagemQrcode || '';

    // Garante prefixo data:image se ausente
    if (qrCodeBase64 && !qrCodeBase64.startsWith('data:')) {
      qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
    }

    return {
      qrCodeBase64,
      qrCodeText: qrCode.qrcode || '',
      valor: data.pix.dadosPix?.valor?.original || ''
    };
  } catch (error) {
    logger.warn(`Erro ao obter PIX do boleto ${idBoleto}: ${error.message}`);
    return null;
  }
}

// Testa conexão com a API
async function testarConexao() {
  try {
    const data = {
      qtype: 'cliente.id',
      query: '1',
      oper: '>',
      page: '1',
      rp: '1',
      sortname: 'cliente.id',
      sortorder: 'desc'
    };
    await apiRequest('cliente', data);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  loadCredentials,
  buscarCliente,
  buscarContratos,
  buscarBoletos,
  obterPdfBoleto,
  obterDadosBoleto,
  obterPix,
  testarConexao
};
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             