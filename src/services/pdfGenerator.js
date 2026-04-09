// Gera PDF do boleto usando Puppeteer com tamanho de papel customizado
// Replica a logica do DomPDF do sistema antigo
// DomPDF usa [0, 0, 790, 240] pontos = ~278mm x 85mm
// Puppeteer/Chromium renderiza ligeiramente maior, entao usamos altura extra
const puppeteer = require('puppeteer');
const { gerarHtmlBoletoGateway, gerarHtmlPixPuro } = require('../templates/termicaBoleto');
const logger = require('../utils/logger');

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      logger.info('Puppeteer browser iniciado');
    } catch (error) {
      logger.error(`Falha ao iniciar Puppeteer: ${error.message}`);
      throw error;
    }
  }
  return browser;
}

async function gerarPdfBoleto(dadosBoleto, dadosPix, tipo = 'gateway', endereco = '') {
  const idBoleto = (dadosBoleto && (dadosBoleto.numero_documento || dadosBoleto.id_receber)) || 'desconhecido';
  let page = null;

  try {
    // Seleciona template baseado no tipo
    let html;
    if (tipo === 'pix') {
      const dadosCliente = dadosBoleto
        ? { nome: dadosBoleto.sacado, cpf: dadosBoleto.CPF }
        : { nome: '', cpf: '' };
      html = gerarHtmlPixPuro(dadosPix, dadosCliente, endereco);
    } else {
      html = gerarHtmlBoletoGateway(dadosBoleto, dadosPix, endereco);
    }

    const b = await getBrowser();
    page = await b.newPage();

    // Dimensoes fixas: 297mm x 80mm (A4 paisagem, 80mm altura)
    const viewportWidth = 1122; // 297mm a 96dpi

    await page.setViewport({ width: viewportWidth, height: 302, deviceScaleFactor: 1 });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      width: '297mm',
      height: '80mm',
      printBackground: true,
      scale: 1,
      preferCSSPageSize: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    logger.info(`PDF térmico gerado para boleto ${idBoleto} (tipo: ${tipo}, 297x80mm)`);
    return pdf;
  } catch (error) {
    logger.error(`Erro ao gerar PDF térmico do boleto ${idBoleto}: ${error.message}`);
    throw error;
  } finally {
    if (page) {
      try { await page.close(); } catch (e) { /* ignore */ }
    }
  }
}

// Fecha o browser ao encerrar o processo
async function fecharBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      logger.error(`Erro ao fechar browser Puppeteer durante encerramento: ${e.message}`);
    }
    browser = null;
  }
}

process.on('SIGTERM', fecharBrowser);
process.on('SIGINT', fecharBrowser);

module.exports = { gerarPdfBoleto };