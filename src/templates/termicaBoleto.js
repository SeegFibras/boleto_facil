// Gerador de HTML para boleto termico — layout horizontal
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
      width: 2,
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

  // Instrucoes (sempre mostra todas as linhas, igual ao DomPDF)
  const linha1 = escapeHtml(dados.linha1 || '');
  const linha2 = escapeHtml(dados.linha2 || '');
  const linha3 = escapeHtml(dados.linha3 || '');
  const instrucao1 = escapeHtml(dados.Instrucao1 || '');
  const instrucao2 = escapeHtml(dados.Instrucao2 || '');
  const obs = escapeHtml(dados.obs || '');

  // Codigo de barras
  const barcodeBase64 = gerarCodigoBarras(dados.codigo_barras);

  // Endereco completo do pagador (formato identico ao DomPDF)
  const enderecoCompleto = `${endereco} - Cidade: ${cidade}, CEP: ${cep}, UF: ${estado}`;

  // Largura da tabela e coluna PIX
  const temPix = pix && pix.qrCodeBase64;
  const larguraTabela = temPix ? '1050px' : '865px';

  // QR Code PIX celula (rowspan na coluna direita)
  const pixRowspan = temPix ? `
    <td rowspan="10" style="width:200px; height: 1px; padding: 1px; overflow: hidden;">
      <div style="position: absolute; width: 220px; height: 220px; padding: 2px; overflow: hidden">
        Pague com Pix:
        <img style="padding: 0; margin: 0; height: 220px" src="${pix.qrCodeBase64}">
      </div>
    </td>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Boleto - ${numDocumento}</title>
  <style>
    body, html { margin: 0; padding: 0; font-family: Arial, Verdana, sans-serif; }
    table, table tbody { margin: 0; padding: 0; border: 0; border-collapse: collapse; }
    table.bordas td { border: 1px solid #000; border-collapse: collapse; }
    td { padding: 1px 5px; vertical-align: top; }
    label { font-size: 9px; }
    span { font-size: 11px; font-weight: bold; }
    p { margin: 0; padding: 2px; font-size: 11px; }
    .bold { font-weight: bold; }
    .right { float: right; }
    .obs { font-style: italic; }
    @media print { @page { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <!-- Linha 1: Codigo banco + Linha digitavel -->
  <table style="width:${larguraTabela}; margin: 0;">
    <tr>
      <td style="width:50px;">
        <span style="font-size:15px; vertical-align: middle; border-right:1px solid #000; padding:0 10px;">
          ${codigoBanco}
        </span>
      </td>
      <td>
        <span style="font-size:14px; vertical-align: middle;">${linhaDigitavel}</span>
      </td>
    </tr>
  </table>

  <!-- Tabela principal -->
  <table class="bordas" style="width:${larguraTabela};">
    <!-- Linha: Local pagamento | Vencimento | PIX -->
    <tr>
      <td colspan="5">
        <label>Local de pagamento</label>
        <span>${localPagamento}</span>
      </td>
      <td style="width: 200px;">
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
      <td style="width: 200px">
        <label>CPF/CNPJ Benefici&aacute;rio</label>
        <br><span>25.452.912/0001-25</span>
      </td>
      <td>
        <label>Ag&ecirc;ncia/C&oacute;digo Benefici&aacute;rio</label>
        <span>${agenciaCodigo}</span>
      </td>
    </tr>

    <!-- Linha: Data doc | Num doc | Especie doc | Aceite | Data proc | Nosso numero -->
    <tr>
      <td>
        <label> Data Doc.</label>
        <span class="right">${dataDocumento}</span>
      </td>
      <td>
        <label>N&uacute;mero Doc.</label>
        <span class="right">${numDocumento}</span>
      </td>
      <td>
        <label>Esp&eacute;cie Doc.</label>
        <span class="right">${especieDoc}</span>
      </td>
      <td>
        <label>Aceite</label>
        <span class="right">${aceite}</span>
      </td>
      <td>
        <label>Data Processamento</label>
        <span class="right">${dataProcessamento}</span>
      </td>
      <td>
        <label>Nosso N&uacute;mero</label>
        <br><span class="right">${nossoNumero}</span>
      </td>
    </tr>

    <!-- Linha: Uso banco | Carteira | Especie Moeda | Qtd moeda | Valor | Valor documento -->
    <tr>
      <td>
        <label>Uso do Banco</label>
      </td>
      <td>
        <label>Carteira</label>
      </td>
      <td>
        <label>Esp&eacute;cie Moeda</label>
        <span class="right">${especie || 'R$'}</span>
      </td>
      <td>
        <label>Quant. Moeda</label>
      </td>
      <td>
        <label>(X) Valor</label>
      </td>
      <td>
        <label>(=) Valor Documento</label>
        <span class="right">${valor}</span>
      </td>
    </tr>

    <!-- Linha: Instrucoes (rowspan 5) | Desconto -->
    <tr>
      <td colspan="5" rowspan="5">
        <label>Instru&ccedil;&otilde;es de responsabilidade do BENEFICI&Aacute;RIO. Qualquer d&uacute;vida sobre este boleto contate o benefici&aacute;rio</label>
        <p class="bold">${linha1}</p>
        <p class="bold">${linha2}</p>
        <p class="bold">${linha3}</p>
        <p class="bold">${instrucao1}</p>
        <p class="bold">${instrucao2}</p>
        <p class="obs">${obs}</p>
      </td>
      <td>
        <label>(-)Desconto</label>
      </td>
    </tr>

    <!-- Deducoes -->
    <tr>
      <td>
        <label>(-)Outras Dedu&ccedil;&otilde;es/Abatimentos</label>
      </td>
    </tr>

    <!-- Mora/Multa -->
    <tr>
      <td>
        <label>(+)Mora/Multa/Juros</label>
      </td>
    </tr>

    <!-- Acrescimos -->
    <tr>
      <td>
        <label>(+)Outros Acr&eacute;scimos</label>
      </td>
    </tr>

    <!-- Valor cobrado -->
    <tr>
      <td>
        <label>(=)Valor cobrado</label>
      </td>
    </tr>

    <!-- Pagador + Sacador/Avalista -->
    <tr>
      <td colspan="6">
        <label>Pagador</label>
        <span class="bold">
          ${nome}
          -
          ${cpf}
        </span>
        <p style="font-size: 11px; margin-left: 37px;">
          ${enderecoCompleto}
        </p>
        <label class="bold">Sacador/ Avalista:</label>
        <span>${sacadorRazao}</span>
      </td>
    </tr>
  </table>

  <!-- Codigo de barras -->
  <p style="margin-left: 5px; display: flex;">
    ${barcodeBase64 ? `<img width="500px" src="${barcodeBase64}" alt="barcode"/>` : ''}
  </p>

</body>
</html>`;
}

module.exports = { gerarHtmlTermica };
