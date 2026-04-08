// Gera PDF do boleto usando Puppeteer com tamanho de papel customizado
// Replica a logica do DomPDF do sistema antigo
// DomPDF usa [0, 0, 790, 240] pontos = ~278mm x 85mm
// Puppeteer/Chromium renderiza ligeiramente maior, entao usamos altura extra
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

    // Tamanho customizado:
    // DomPDF [0, 0, 790, 240] pontos => 790/72*25.4 = ~278mm largura, 240/72*25.4 = ~85mm altura
    // Chromium precisa de mais altura (~120mm) para conter pagador + codigo de barras
    const temPix = !!(dadosPix && dadosPix.qrCodeBase64);
    const larguraMm = temPix ? 278 : 229;
    const alturaMm = 155; // Maior que os 85mm do DomPDF para caber tudo no Chromium

    // Viewport deve corresponder a largura em pixels (DPI 96: 1pt ≈ 1.333px)
    const viewportWidth = temPix ? 1050 : 865;

    await page.setViewport({ width: viewportWidth, height: 600, deviceScaleFactor: 1 });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Mede a altura real do conteudo renderizado e converte px -> mm (96 DPI)
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const alturaDinamica = Math.ceil(bodyHeight * 25.4 / 96) + 5; // +5mm margem seguranca
    const alturaFinal = Math.max(alturaMm, alturaDinamica);
    logger.info(`Boleto ${idBoleto}: body=${bodyHeight}px -> ${alturaDinamica}mm, usando ${alturaFinal}mm`);

    const pdf = await page.pdf({
      width: `${larguraMm}mm`,
      height: `${alturaFinal}mm`,
      printBackground: true,
      scale: 1,
      preferCSSPageSize: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    logger.info(`PDF térmico gerado para boleto ${idBoleto} (${temPix ? 'com' : 'sem'} PIX, ${larguraMm}x${alturaMm}mm)`);
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

process.on('SIGTERM',