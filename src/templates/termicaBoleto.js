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
  const uf = escapeHtml(dados.Estado_sigla || '');
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

  // Endereco completo do pagador
  const enderecoCompleto = [endereco, cidade ? `${cidade}${uf ? '/' + uf : ''}` : '', cep ? `CEP: ${cep}` : '']
    .filter(Boolean).join(' - ');

  // Largura da tabela e coluna PIX
  const temPix = pix && pix.qrCodeBase64;
  const larguraTabela = temPix ? '1050px' : '865px';

  // QR Code PIX celula (rowspan na coluna direita)
  const pixRowspan = temPix ? `
    <td rowspan="10" style="width:200px; text-align:center; vertical-align:middle; padding:5px;">
      <strong style="font-size:11px;">PAGUE COM PIX</strong><br>
      <img src="${pix.qrCodeBase64}" width="180" height="180" style="margin:3px 0;"><br>
      <span style="font-size:8px; word-break:break-all; display:block; max-width:190px; margin:0 auto;">${escapeHtml(pix.qrCodeText || '')}</span>
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
        <span>${vencimento}</span>
      </td>
      ${pixRowspan}
    </tr>

    <!-- Linha: Beneficiario | CNPJ | Agencia/Codigo -->
    <tr>
      <td colspan="4">
        <label>Benefici&aacute;rio</label>
        <span>${cedente}</span>
      </td>
      <td>
        <label>CNPJ</label>
        <span style="font-size:10px;">25.452.912/0001-25</span>
      </td>
      <td>
        <label>Ag&ecirc;ncia/C&oacute;digo Benefici&aacute;rio</label>
        <span>${agenciaCodigo}</span>
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
        <span>${nossoNumero}</span>
      </td>
    </tr>

    <!-- Linha: Uso banco | Carteira | Moeda | Qtd moeda | Valor | Valor documento -->
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
        <label>Moeda</label>
        <span>${especie}</span>
      </td>
      <td>
        <label>Quantidade</label>
        <span>&nbsp;</span>
      </td>
      <td>
        <label>Valor</label>
        <span>&nbsp;</span>
      </td>
      <td>
        <label>(=) Valor do Documento</label>
        <span style="font-size:13px;">R$ ${valor}</span>
      </td>
    </tr>

    <!-- Linha: Instrucoes (rowspan 5) | Desconto -->
    <tr>
      <td colspan="5" rowspan="5" style="vertical-align:top;">
        <label>Instru&ccedil;&otilde;es (Texto de responsabilidade do benefici&aacute;rio)</label>
        ${instrucoes.map(i => `<p>${i}</p>`).join('\n        ')}
      </td>
      <td>
        <label>(-) Desconto/Abatimento</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Deducoes -->
    <tr>
      <td>
        <label>(-) Outras Dedu&ccedil;&otilde;es</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Mora/Multa -->
    <tr>
      <td>
        <label>(+) Mora/Multa</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Acrescimos -->
    <tr>
      <td>
        <label>(+) Outros Acr&eacute;scimos</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Valor cobrado -->
    <tr>
      <td>
        <label>(=) Valor Cobrado</label>
        <span>&nbsp;</span>
      </td>
    </tr>

    <!-- Pagador -->
    <tr>
      <td colspan="${temPix ? '7' : '6'}">
        <label>Pagador</label>
        <span>${nome} - ${cpf}</span>
        <p style="font-size:10px;">${enderecoCompleto}</p>
      </td>
    </tr>

    <!-- Sacador/Avalista -->
    <tr>
      <td colspan="${temPix ? '7' : '6'}">
        <label>Sacador/Avalista</label>
        <span style="font-size:10px;">${sacadorRazao}</span>
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
