// Gerador de HTML para boleto termico — layout horizontal (278mm x 85mm)
// Replica o layout do sistema antigo (boleto.blade.php / DomPDF)
// Recebe dados do get_boleto (tipo_boleto: 'dados') e dados do get_pix

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
    const canvas = createCanvas(500, 50);
    JsBarcode(canvas, codigoBarras, {
      format: 'ITF',
      width: 1.5,
      height: 50,
      displayValue: false,
      margin: 0
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}

function gerarHtmlTermica(dados, pix) {
  const nome = escapeHtml(dados.sacado || '');
  const cpf = escapeHtml(dados.CPF || '');
  const endereco = escapeHtml(dados.Endereco || '');
  const cep = escapeHtml(dados.CEP || '');
  const cidade = escapeHtml(dados.Cidade || '');
  const estado = escapeHtml(dados.Estado || '');
  const numDocumento = escapeHtml(dados.numero_documento || '');
  const nossoNumero = escapeHtml(dados.nosso_numero || '');
  const vencimento = escapeHtml(dados.data_vencimento || '');
  const valor = escapeHtml(dados.valor_boleto || '');
  const linhaDigitavel = escapeHtml(dados.linha_digitavel || '');
  const localPagamento = escapeHtml(dados.local_pagamento || '');
  const codigoBanco = escapeHtml(dados.codigo_banco_com_dv || '');
  const agenciaCodigo = escapeHtml(dados.agencia_codigo || '');
  const cedente = escapeHtml(dados.cedente_nome || '');
  const sacadorRazao = escapeHtml(dados.sacador_razao || '');
  const dataDocumento = escapeHtml(dados.data_documento || '');
  const dataProcessamento = escapeHtml(dados.data_processamento || '');
  const especieDoc = escapeHtml(dados.especie_doc || '');
  const especie = escapeHtml(dados.especie || '');
  const aceite = escapeHtml(dados.aceite || '');
  const carteira = escapeHtml(dados.carteira || '');

  // Instrucoes
  const instrucoes = [dados.linha1, dados.linha2, dados.linha3, dados.Instrucao1, dados.Instrucao2]
    .filter(l => l && l.trim())
    .map(l => escapeHtml(l.trim()));

  // Codigo de barras
  const barcodeBase64 = gerarCodigoBarras(dados.codigo_barras);

  // Endereco completo do pagador (formato do sistema antigo)
  const enderecoCompleto = `${endereco} - Cidade: ${cidade}, CEP: ${cep}, UF: ${estado}`;

  // Largura da tabela e coluna PIX
  const temPix = pix && pix.qrCodeBase64;
  const larguraTabela = temPix ? '1050px' : '865px';
  const colspanTotal = temPix ? 7 : 6;

  // QR Code PIX celula (rowspan na coluna direita)
  const pixRowspan = temPix ? `
    <td rowspan="10" style="width:220px; text-align:center; vertical-align:middle; padding:5px; position:relative;">
      <div style="width:220px; height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <strong style="font-size:11px;">Pague com Pix:</strong>
        <img src="${pix.qrCodeBase64}" width="180" height="180" style="margin:3px 0;">
      </div>
    </td>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boleto - ${numDocumento}</title>
  <style>
    body, html { margin: 0; padding: 0; font-family: Arial, Verdana, sans-serif; background: #fff; }
    table, table tbody { margin: 0; padding: 0; border: 0; border-collapse: collapse; }
    table.bordas td { border: 1px solid #000; border-collapse: collapse; }
    td { padding: 1px 5px; vertical-align: top; }
    label { font-size: 9px; display: block; margin-bottom: 0; color: #000; }
    span { font-size: 11px; font-weight: bold; }
    p { margin: 0; padding: 2px; font-size: 11px; }
    .bold { font-weight: bold; }
    .right { float: right; }
    @media print { @page { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <!-- Linha 1: Codigo banco + Linha digitavel -->
  <table style="width:${larguraTabela}; margin: 0;">
    <tr>
      <td style="width:50px;">
        <span style="font-size:15px; border-right:1px solid #000; padding:0 10px;">
          ${codigoBanco}
        </span>
      </td>
      <td>
        <span style="font-size:14px; letter-spacing:1px;">${linhaDigitavel}</span>
      </td>
    </tr>
  </table>

  <!-- Tabela principal -->
  <table class="bordas" style="width:${larguraTabela};">
    <!-- Linha: Local pagamento | Vencimento | PIX -->
    <tr>
      <td colspan="5">
        <label>Local de Pagamento</label>
        <span style="font-size:10px;">${localPagamento}</span>
      </td>
      <td>
        <label>Vencimento</label>
        <span class="right">${vencimento}</span>
      </td>
      ${pixRowspan}
    </tr>

    <!-- Linha: Beneficiario | CPF/CNPJ | Agencia/Codigo -->
    <tr>
      <td colspan="4">
        <label>Benefici&aacute;rio</label>
        <span>${cedente}</span>
      </td>
      <td>
        <label>CPF/CNPJ Benefici&aacute;rio</label>
        <span style="font-size:10px;">25.452.912/0001-25</span>
      </td>
      <td>
        <label>Ag&ecirc;ncia/C&oacute;digo Benefici&aacute;rio</label>
        <span class="right">${agenciaCodigo}</span>
      </td>
    </tr>

    <!-- Linha: Data doc | Num doc | Especie doc | Aceite | Data proc | Nosso numero -->
    <tr>
      <td>
        <label>Data Documento</label>
        <span>${dataDocumento}</span>
      </td>
      <td>
        <label>N&ordm; Documento</label>
        <span>${numDocumento}</span>
      </td>
      <td>
        <label>Esp&eacute;cie Doc.</label>
        <span>${especieDoc}</span>
      </td>
      <td>
        <label>Aceite</label>
        <span>${aceite}</span>
      </td>
      <td>
        <label>Data Processamento</label>
        <span>${dataProcessamento}</span>
      </td>
      <td>
        <label>Nosso N&uacute;mero</label>
        <span class="right">${nossoNumero}</span>
      </td>
    </tr>

    <!-- Linha: Uso banco | Carteira | Especie Moeda | Qtd moeda | Valor | Valor documento -->
    <tr>
      <td>
        <label>Uso do Banco</label>
        <span>&nbsp;</span>
      </td>
      <td>
        <label>Carteira</label>
        <span>${carteira}</span>
      </td>
      <td>
        <label>Esp&eacute;cie Moeda</label>
        <span>${especie}</span>
      </td>
      <td>
        <label>Quant. Moeda</label>
        <span>&nbsp;</span>
      </td>
      <td>
        <label>(X) Valor</label>
        <span>&nbsp;</span>
      </td>
      <td>
        <label>(=) Valor do Documento</label>
        <span class="right" style="font-size:13px;">${valor}</span>
      </td>
    </tr>

    <!-- Linha: Instrucoes (rowspan 5) | Desconto -->
    <tr>
      <td colspan="5" rowspan="5" style="vertical-align:top;">
        <label>Instru&ccedil;&otilde;es de responsabilidade do BENEFICI&Aacute;RIO. Qualquer d&uacute;vida sobre este boleto contate o benefici&aacute;rio</label>
        ${instrucoes.map(i => `<p>${i}</p>`).join('\n        ')}
      </td>
      <td>
        <label>(-)Desconto</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Deducoes -->
    <tr>
      <td>
        <label>(-)Outras Dedu&ccedil;&otilde;es/Abatimentos</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Mora/Multa -->
    <tr>
      <td>
        <label>(+)Mora/Multa/Juros</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Acrescimos -->
    <tr>
      <td>
        <label>(+)Outros Acr&eacute;scimos</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Valor cobrado -->
    <tr>
      <td>
        <label>(=)Valor cobrado</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Pagador + Sacador/Avalista (mesma celula como no sistema antigo) -->
    <tr>
      <td colspan="${colspanTotal}">
        <label>Pagador</label>
        <span>${nome} - ${cpf}</span>
        <p style="font-size:10px;">${enderecoCompleto}</p>
        <p style="font-size:10px;"><strong>Sacador/Avalista:</strong> ${sacadorRazao}</p>
      </td>
    </tr>
  </table>

  <!-- Codigo de barras -->
  ${barcodeBase64 ? `
  <div style="margin-top:3px;">
    <img src="${barcodeBase64}" width="500" style="display:block;">
  </div>
  ` : ''}
</body>
</html>`;
}

module.exports = { gerarHtmlTermica };
