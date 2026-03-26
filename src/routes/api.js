// Rotas da API interna
const express = require('express');
const router = express.Router();
const { buscarCliente, buscarContratos, buscarBoletos, obterPdfBoleto } = require('../services/ixcApi');
const { validar, mascarar } = require('../utils/cpfCnpj');
const { registrarConsulta } = require('../config/database');
const { apiLimiter } = require('../middleware/rateLimit');
const { sanitizeCpfCnpj } = require('../middleware/sanitize');
const logger = require('../utils/logger');

// Consulta boletos por CPF/CNPJ
router.post('/consultar', apiLimiter, sanitizeCpfCnpj, async (req, res) => {
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ erro: 'Informe o CPF ou CNPJ.' });
  }

  if (!validar(documento)) {
    return res.status(400).json({ erro: 'CPF ou CNPJ inválido. Verifique os números digitados.' });
  }

  const ip = req.ip || req.connection.remoteAddress;
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
          endereco
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

module.exports = router;
