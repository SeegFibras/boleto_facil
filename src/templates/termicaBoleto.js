// Gerador de HTML para boleto termico — layout horizontal 297mm x 80mm
// Dois layouts: Gateway (boleto + PIX) e PIX Puro (somente PIX)
// Recebe dados do get_boleto (tipo_boleto: 'dados') e dados do get_pix

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Gera codigo de barras ITF como base64 PNG
function gerarCodigoBarras(codigoBarras) {
  if (!codigoBarras) return '';
  try {
    const canvas = createCanvas(500, 40);
    JsBarcode(canvas, codigoBarras, {
      format: 'ITF',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}

// Carrega logo como base64 para embedir no HTML
let logoBase64 = '';
try {
  const logoPath = path.join(__dirname, '..', '..', 'logo_grupo_seeg.png');
  if (fs.existsSync(logoPath)) {
    logoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');
  }
} catch (e) {
  // Logo nao disponivel, segue sem
}

// Formata CPF com mascara
function formatarCpf(cpf) {
  if (!cpf) return '';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (limpo.length === 14) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cpf;
}

// Formata valor como R$ XX,XX
function formatarValor(valor) {
  if (!valor) return 'R$ 0,00';
  const num = parseFloat(valor);
  if (isNaN(num)) return `R$ ${valor}`;
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

// ============================================================
// Layout 1: Boleto Gateway (boleto + PIX) — 297mm x 80mm
// ============================================================
function gerarHtmlBoletoGateway(dadosBoleto, dadosPix, endereco) {
  // Extrai numero da fatura do solicitacaoPagador (ex: "Fatura 1045330" -> "1045330")
  const numFaturaPix = dadosPix?.solicitacaoPagador
    ? dadosPix.solicitacaoPagador.replace(/\D/g, '')
    : '';

  // Formata data de vencimento do Pix (YYYY-MM-DD -> DD/MM/YYYY)
  let vencimentoPix = '';
  if (dadosPix?.vencimento) {
    const partes = dadosPix.vencimento.split('-');
    if (partes.length === 3) {
      vencimentoPix = `${partes[2]}/${partes[1]}/${partes[0]}`;
    } else {
      vencimentoPix = dadosPix.vencimento;
    }
  }

  // Campos com fallback para dados do Pix quando o boleto vem vazio
  const nome = escapeHtml(dadosBoleto.sacado || dadosPix?.devedor?.nome || '');
  const cpf = escapeHtml(dadosBoleto.CPF || formatarCpf(dadosPix?.devedor?.cpf) || '');
  const numDocumento = escapeHtml(dadosBoleto.numero_documento || numFaturaPix || '');
  const nossoNumero = escapeHtml(dadosBoleto.nosso_numero || numFaturaPix || '');
  const vencimento = escapeHtml(dadosBoleto.data_vencimento || vencimentoPix || '');
  const valor = escapeHtml(dadosBoleto.valor_boleto || (dadosPix?.valor ? formatarValor(dadosPix.valor) : '') || '');
  const linhaDigitavel = escapeHtml(dadosBoleto.linha_digitavel || '');
  const codigoBanco = escapeHtml(dadosBoleto.codigo_banco_com_dv || '');
  const cedente = escapeHtml(dadosBoleto.cedente_nome || 'SEEG FIBRAS TELECOMUNICAÇÕES LTDA');
  const linha1 = escapeHtml(dadosBoleto.linha1 || '');
  const linha2 = escapeHtml(dadosBoleto.linha2 || '');
  const linha3 = escapeHtml(dadosBoleto.linha3 || '');
  const instrucao1 = escapeHtml(dadosBoleto.Instrucao1 || '');
  const instrucao2 = escapeHtml(dadosBoleto.Instrucao2 || '');

  const barcodeBase64 = gerarCodigoBarras(dadosBoleto.codigo_barras);
  const temPix = dadosPix && dadosPix.qrCodeBase64;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boleto - ${numDocumento}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { font-family: Arial, Helvetica, sans-serif; font-size: 9px; }
    @page { size: 297mm 80mm; margin: 0; }
    @media print { body { margin: 0; } @page { size: 297mm 80mm; margin: 0; } }

    .container { width: 297mm; height: 80mm; display: flex; overflow: hidden; }
    .boleto-col { flex: 1; padding: 2mm 3mm; display: flex; flex-direction: column; }
    .pix-col { width: 85mm; border-left: 1px dashed #666; padding: 2mm; display: flex; flex-direction: column; align-items: center; }

    .linha-digitavel { font-size: 13px; font-weight: bold; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 1mm; }
    .banco-codigo { font-size: 15px; font-weight: bold; border-right: 2px solid #000; padding-right: 3mm; margin-right: 3mm; display: inline-block; }

    .dados-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5mm; font-size: 9px; margin-bottom: 1mm; }
    .dados-grid .item { border: 0.5px solid #ccc; padding: 0.5mm 1mm; }
    .dados-grid .item label { display: block; font-size: 7.5px; color: #555; text-transform: uppercase; }
    .dados-grid .item span { font-size: 10px; font-weight: bold; }

    .instrucoes { font-size: 8.5px; line-height: 1.3; margin-bottom: 1mm; flex-shrink: 1; overflow: hidden; }
    .instrucoes p { margin: 0; font-weight: bold; }

    .pagador { font-size: 9px; margin-bottom: 1mm; }
    .pagador strong { font-size: 10px; }

    .barcode { margin-top: auto; }
    .barcode img { width: 100%; max-height: 28px; }

    .pix-titulo { font-size: 11px; font-weight: bold; margin-bottom: 1mm; color: #333; }
    .pix-qr img { width: 60mm; height: 60mm; }
  </style>
</head>
<body>
  <div class="container">
    <div class="boleto-col">
      <div class="linha-digitavel">
        <span class="banco-codigo">${codigoBanco}</span>
        ${linhaDigitavel}
      </div>

      <div class="dados-grid">
        <div class="item">
          <label>Benefici&aacute;rio</label>
          <span>${cedente}</span>
        </div>
        <div class="item">
          <label>CNPJ Benefici&aacute;rio</label>
          <span>25.452.912/0001-25</span>
        </div>
        <div class="item">
          <label>Vencimento</label>
          <span>${vencimento}</span>
        </div>
        <div class="item">
          <label>Valor do Documento</label>
          <span>${valor}</span>
        </div>
        <div class="item">
          <label>Nosso N&uacute;mero</label>
          <span>${nossoNumero}</span>
        </div>
        <div class="item">
          <label>N&uacute;mero Documento</label>
          <span>${numDocumento}</span>
        </div>
        <div class="item">
          <label>Pagador</label>
          <span>${nome} - ${cpf}</span>
        </div>${endereco ? `
        <div class="item" style="grid-column: span 2;">
          <label>Endere&ccedil;o</label>
          <span>${endereco}</span>
        </div>` : ''}
      </div>

      <div class="instrucoes">
        ${linha1 ? `<p>${linha1}</p>` : ''}
        ${linha2 ? `<p>${linha2}</p>` : ''}
        ${linha3 ? `<p>${linha3}</p>` : ''}
        ${instrucao1 ? `<p>${instrucao1}</p>` : ''}
        ${instrucao2 ? `<p>${instrucao2}</p>` : ''}
      </div>

      <div class="barcode">
        ${barcodeBase64 ? `<img src="${barcodeBase64}" alt="barcode"/>` : ''}
      </div>
    </div>

    ${temPix ? `
    <div class="pix-col">
      <div class="pix-titulo">Pague com PIX</div>
      <div class="pix-qr">
        <img src="${dadosPix.qrCodeBase64}" alt="QR Code PIX"/>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

// ============================================================
// Layout 2: PIX Puro (somente PIX) — 297mm x 80mm
// ============================================================
function gerarHtmlPixPuro(dadosPix, dadosCliente, endereco) {
  const nomePagador = escapeHtml(dadosPix.devedor?.nome || dadosCliente?.nome || '');
  const cpfPagador = escapeHtml(formatarCpf(dadosPix.devedor?.cpf || dadosCliente?.cpf || ''));
  const valorFormatado = formatarValor(dadosPix.valor);
  const vencimento = escapeHtml(dadosPix.vencimento || '');
  const expiracaoPix = escapeHtml(dadosPix.expiracaoPix || '');
  const solicitacao = escapeHtml(dadosPix.solicitacaoPagador || '');
  const qrCodeBase64 = dadosPix.qrCodeBase64 || '';

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="max-width: 60mm; max-height: 20mm; margin-bottom: 2mm;"/>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>PIX - Pagamento</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { font-family: Arial, Helvetica, sans-serif; font-size: 9px; }
    @page { size: 297mm 80mm; margin: 0; }
    @media print { body { margin: 0; } @page { size: 297mm 80mm; margin: 0; } }

    .container { width: 297mm; height: 80mm; display: flex; flex-direction: column; overflow: hidden; }
    .main-row { display: flex; flex: 1; min-height: 0; }

    .col-logo { width: 80mm; padding: 3mm; display: flex; flex-direction: column; justify-content: center; align-items: center; border-right: 1px dashed #ccc; }
    .col-logo .empresa { font-size: 13px; font-weight: bold; text-align: center; color: #222; }
    .col-logo .subtitulo { font-size: 10px; color: #555; margin-top: 1mm; }

    .col-qr { width: 90mm; padding: 2mm; display: flex; flex-direction: column; justify-content: center; align-items: center; border-right: 1px dashed #ccc; }
    .col-qr img { width: 58mm; height: 58mm; }
    .col-qr .qr-label { font-size: 8.5px; color: #555; margin-top: 1mm; }

    .col-dados { flex: 1; padding: 3mm 4mm; display: flex; flex-direction: column; justify-content: center; }
    .col-dados .dado { margin-bottom: 1.5mm; }
    .col-dados .dado label { font-size: 8px; color: #777; text-transform: uppercase; display: block; }
    .col-dados .dado span { font-size: 11px; font-weight: bold; color: #222; }
    .col-dados .dado.valor span { font-size: 16px; color: #000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="main-row">
      <div class="col-logo">
        ${logoImg}
        <div class="empresa">SEEG FIBRAS</div>
        <div class="empresa" style="font-size: 9px;">TELECOMUNICA&Ccedil;&Otilde;ES LTDA</div>
        <div class="subtitulo">Pagamento via PIX</div>
      </div>

      <div class="col-qr">
        ${qrCodeBase64 ? `<img src="${qrCodeBase64}" alt="QR Code PIX"/>` : '<div style="font-size:10px;color:#999;">QR Code indisponivel</div>'}
        <div class="qr-label">Escaneie para pagar</div>
      </div>

      <div class="col-dados">
        <div class="dado valor">
          <label>Valor</label>
          <span>${valorFormatado}</span>
        </div>
        <div class="dado">
          <label>Pagador</label>
          <span>${nomePagador}</span>
        </div>
        <div class="dado">
          <label>CPF/CNPJ</label>
          <span>${cpfPagador}</span>
        </div>${endereco ? `
        <div class="dado">
          <label>Endere&ccedil;o</label>
          <span>${endereco}</span>
        </div>` : ''}
        <div class="dado">
          <label>Vencimento</label>
          <span>${vencimento}</span>
        </div>
        ${solicitacao ? `
        <div class="dado">
          <label>Descri&ccedil;&atilde;o</label>
          <span>${solicitacao}</span>
        </div>` : ''}
        ${expiracaoPix ? `
        <div class="dado">
          <label>Expira em</label>
          <span>${expiracaoPix}</span>
        </div>` : ''}
      </div>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { gerarHtmlBoletoGateway, gerarHtmlPixPuro };
