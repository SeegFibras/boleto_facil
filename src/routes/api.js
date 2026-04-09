// Rotas da API interna
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { buscarCliente, buscarContratos, buscarBoletos, obterPdfBoleto, obterDadosBoleto, obterPix, buscarEnderecoParaImpressao } = require('../services/ixcApi');
const { gerarHtmlBoletoGateway, gerarHtmlPixPuro } = require('../templates/termicaBoleto');
const { gerarPdfBoleto } = require('../services/pdfGenerator');
const { validar, mascarar } = require('../utils/cpfCnpj');
const { registrarConsulta } = require('../config/database');
const { apiLimiter } = require('../middleware/rateLimit');
const { sanitizeCpfCnpj } = require('../middleware/sanitize');
const logger = require('../utils/logger');

function formatarEndereco(end) {
  if (!end) return '';
  const partes = [end.endereco, end.numero, end.complemento, end.bairro, end.cidade].filter(Boolean);
  let str = partes.join(', ');
  if (end.cep) str += ' - CEP: ' + end.cep;
  return str;
}

// Consulta boletos por CPF/CNPJ
router.post('/consultar', apiLimiter, sanitizeCpfCnpj, async (req, res) => {
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ erro: 'Informe o CPF ou CNPJ.' });
  }

  if (!validar(documento)) {
    return res.status(400).json({ erro: 'CPF ou CNPJ inválido. Verifique os números digitados.' });
  }

  const ip = req.ip || req.socket.remoteAddress;
  const docMascarado = mascarar(documento);

  try {
    // Busca o cliente
    const cliente = await buscarCliente(documento);
    if (!cliente) {
      logger.info(`Consulta: ${docMascarado} - Cliente não encontrado (IP: ${ip})`);
      registrarConsulta(docMascarado, 'nao_encontrado', 0, ip);
      return res.status(404).json({ erro: 'Cliente não encontrado. Verifique o CPF/CNPJ digitado.' });
    }

    // Busca contratos e boletos em paralelo
    const [contratos, boletos] = await Promise.all([
      buscarContratos(cliente.id),
      buscarBoletos(cliente.id)
    ]);

    logger.info(`Consulta: ${docMascarado} - Encontrado: ${cliente.nome}, ${boletos.length} boleto(s) (IP: ${ip})`);
    registrarConsulta(docMascarado, 'encontrado', boletos.length, ip);

    // Mapa de contratos por ID para associar endereço a cada boleto
    const contratosMap = {};
    for (const c of contratos) {
      contratosMap[c.id] = c;
    }

    res.json({
      cliente: {
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj
      },
      boletos: boletos.map(b => {
        const contrato = contratosMap[b.idContrato];
        let endereco = null;
        if (contrato) {
          const partes = [contrato.endereco, contrato.numero, contrato.complemento, contrato.bairro, contrato.cidade].filter(Boolean);
          endereco = partes.join(', ') + (contrato.cep ? ' - CEP: ' + contrato.cep : '');
        }
        return {
          id: b.id,
          valor: b.valor,
          dataVencimento: b.dataVencimento,
          linhaDigitavel: b.linhaDigitavel,
          temPdf: !!(b.gatewayLink || b.id),
          endereco,
          tipoRecebimento: b.tipoRecebimento
        };
      })
    });
  } catch (error) {
    logger.error(`Erro na consulta ${docMascarado}: ${error.message}`);
    res.status(500).json({ erro: 'Erro ao consultar. Tente novamente em alguns instantes.' });
  }
});

// Obtém PDF do boleto
router.get('/boleto/:id/pdf', apiLimiter, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ erro: 'ID de boleto inválido.' });
  }

  try {
    const pdf = await obterPdfBoleto(id);
    res.setHeader('Content-Type', pdf.contentType);
    res.setHeader('Content-Disposition', `inline; filename=boleto-${id}.pdf`);
    res.send(Buffer.from(pdf.data));
  } catch (error) {
    logger.error(`Erro ao obter PDF do boleto ${id}: ${error.message}`);
    res.status(500).json({ erro: 'Não foi possível obter o boleto. Tente novamente.' });
  }
});

// Obtém boleto em formato térmico (HTML 297mm x 80mm)
// Query param: ?tipo=gateway (boleto+pix) ou ?tipo=pix (somente pix)
router.get('/boleto/:id/termica', apiLimiter, async (req, res) => {
  const { id } = req.params;
  const tipo = req.query.tipo || 'gateway';

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ erro: 'ID de boleto inválido.' });
  }

  if (!['gateway', 'pix'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use gateway ou pix.' });
  }

  try {
    const [dadosResult, pixResult, enderecoResult] = await Promise.allSettled([
      obterDadosBoleto(id),
      obterPix(id),
      buscarEnderecoParaImpressao(id)
    ]);

    const enderecoStr = enderecoResult.status === 'fulfilled' && enderecoResult.value
      ? formatarEndereco(enderecoResult.value)
      : '';

    let html;
    if (tipo === 'pix') {
      if (pixResult.status === 'rejected' || !pixResult.value) {
        return res.status(500).json({ erro: 'PIX não disponível para este boleto.' });
      }
      const dadosCliente = dadosResult.status === 'fulfilled'
        ? { nome: dadosResult.value.sacado, cpf: dadosResult.value.CPF }
        : { nome: '', cpf: '' };
      html = gerarHtmlPixPuro(pixResult.value, dadosCliente, enderecoStr);
    } else {
      if (dadosResult.status === 'rejected') {
        logger.error(`Erro ao obter dados do boleto ${id}: ${dadosResult.reason?.message}`);
        return res.status(500).json({ erro: 'Não foi possível obter os dados do boleto.' });
      }
      const dados = dadosResult.value;
      const pix = pixResult.status === 'fulfilled' ? pixResult.value : null;
      html = gerarHtmlBoletoGateway(dados, pix, enderecoStr);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error(`Erro na rota térmica do boleto ${id}: ${error.message}`);
    res.status(500).json({ erro: 'Erro ao gerar boleto térmico.' });
  }
});

// Gera PDF do boleto com tamanho 297mm x 80mm (via Puppeteer)
// Query param: ?tipo=gateway (boleto+pix) ou ?tipo=pix (somente pix)
router.get('/boleto/:id/termica-pdf', apiLimiter, async (req, res) => {
  const { id } = req.params;
  const tipo = req.query.tipo || 'gateway';

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ erro: 'ID de boleto inválido.' });
  }

  if (!['gateway', 'pix'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use gateway ou pix.' });
  }

  try {
    const [dadosResult, pixResult, enderecoResult] = await Promise.allSettled([
      obterDadosBoleto(id),
      obterPix(id),
      buscarEnderecoParaImpressao(id)
    ]);

    const enderecoStr = enderecoResult.status === 'fulfilled' && enderecoResult.value
      ? formatarEndereco(enderecoResult.value)
      : '';

    if (tipo === 'pix') {
      if (pixResult.status === 'rejected' || !pixResult.value) {
        return res.status(500).json({ erro: 'PIX não disponível para este boleto.' });
      }
      const dados = dadosResult.status === 'fulfilled' ? dadosResult.value : null;
      const pdfBuffer = await gerarPdfBoleto(dados, pixResult.value, 'pix', enderecoStr);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=pix-${id}.pdf`);
      return res.send(Buffer.from(pdfBuffer));
    }

    // tipo === 'gateway'
    if (dadosResult.status === 'rejected') {
      logger.error(`Erro ao obter dados do boleto ${id}: ${dadosResult.reason?.message}`);
      return res.status(500).json({ erro: 'Não foi possível obter os dados do boleto.' });
    }

    const dados = dadosResult.value;
    const pix = pixResult.status === 'fulfilled' ? pixResult.value : null;
    const pdfBuffer = await gerarPdfBoleto(dados, pix, 'gateway', enderecoStr);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=boleto-${id}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    logger.error(`Erro na rota térmica-pdf do boleto ${id}: ${error.message}`);
    res.status(500).json({ erro: 'Erro ao gerar boleto térmico.' });
  }
});

// Obtém PDF de múltiplos boletos em um único arquivo
router.post('/boletos/pdf', apiLimiter, async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => /^\d+$/.test(String(id)))) {
    return res.status(400).json({ erro: 'IDs de boleto inválidos.' });
  }

  try {
    const pdf = await obterPdfBoleto(ids);
    res.setHeader('Content-Type', pdf.contentType);
    res.setHeader('Content-Disposition', `inline; filename=boletos.pdf`);
    res.send(Buffer.from(pdf.data));
  } catch (error) {
    logger.error(`Erro ao obter PDF dos boletos ${ids.join(',')}: ${error.message}`);
    res.status(500).json({ erro: 'Não foi possível obter os boletos. Tente novamente.' });
  }
});

// Status do deploy
router.get('/deploy/status', (req, res) => {
  const deployInfoPath = path.join(__dirname, '..', '..', 'deploy-info.json');
  let deployInfo = { version: 'unknown', lastDeploy: null, deployedBy: null };

  try {
    if (fs.existsSync(deployInfoPath)) {
      deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    }
  } catch (err) {
    logger.warn(`Erro ao ler deploy-info.json: ${err.message}`);
  }

  res.json({
    version: deployInfo.version,
    fullCommit: deployInfo.fullCommit || null,
    lastDeploy: deployInfo.lastDeploy,
    deployedBy: deployInfo.deployedBy || null,
    uptime: `${Math.floor(process.uptime())}s`,
    status: 'online'
  });
});

module.exports = router;
