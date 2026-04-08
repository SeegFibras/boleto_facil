// Gera PDF do boleto usando Puppeteer com tamanho de papel customizado
// Replica a logica do DomPDF do sistema antigo (278mm x 85mm)
const puppeteer = require('puppeteer');
const { gerarHtmlTermica } = require('../templates/termicaBoleto');
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

async function gerarPdfBoleto(dadosBoleto, dadosPix) {
  const idBoleto = dadosBoleto.numero_documento || dadosBoleto.id_receber || 'desconhecido';
  let page = null;

  try {
    const html = gerarHtmlTermica(dadosBoleto, dadosPix);
    const b = await getBrowser();
    page = await b.newPage();

    // Tamanho customizado igual ao sistema antigo:
    // DomPDF usa [0, 0, 790, 240] pontos = ~278mm x 85mm (com PIX)
    // Sem PIX: [0, 0, 650, 240] = ~229mm x 85mm
    const temPix = !!(dadosPix && dadosPix.qrCodeBase64);
    const largura = temPix ? '278mm' : '229mm';

    // Viewport compativel com DPI 96 do DomPDF (largura em pixels = pontos do papel)
    await page.setViewport({ width: temPix ? 1050 : 865, height: 240, deviceScaleFactor: 1 });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      width: largura,
      height: '85mm',
      printBackground: true,
      scale: 1,
      preferCSSPageSize: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    logger.info(`PDF térmico gerado para boleto ${idBoleto} (${temPix ? 'com' : 'sem'} PIX)`);
    return pdf;
  } catch (error) {
    logger.error(`Erro ao gerar PDF térmico do boleto ${idBoleto}: ${error.message}`);
    throw error;
  } finally {
    if (page) await page.close();
  }
}

// Fecha o browser ao encerrar o processo
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
});

module.exports = { gerarPdfBoleto };
