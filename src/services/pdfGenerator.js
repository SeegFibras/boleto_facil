// Gera PDF do boleto usando Puppeteer com tamanho de papel customizado
// Replica a logica do DomPDF do sistema antigo (278mm x 85mm)
const puppeteer = require('puppeteer');
const { gerarHtmlTermica } = require('../templates/termicaBoleto');
const logger = require('../utils/logger');

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return browser;
}

async function gerarPdfBoleto(dadosBoleto, dadosPix) {
  const html = gerarHtmlTermica(dadosBoleto, dadosPix);
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Tamanho customizado igual ao sistema antigo:
    // DomPDF usa [0, 0, 790, 240] pontos = ~278mm x 85mm (com PIX)
    // Sem PIX: [0, 0, 650, 240] = ~229mm x 85mm
    const temPix = !!(dadosPix && dadosPix.qrCodeBase64);
    const largura = temPix ? '278mm' : '229mm';

    const pdf = await page.pdf({
      width: largura,
      height: '85mm',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    return pdf;
  } finally {
    await page.close();
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
