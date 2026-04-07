// Gerador de HTML para impressao termica 80mm
// Recebe dados do get_boleto (tipo_boleto: 'dados') e dados do get_pix

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  // Instrucoes (linhas 1-3)
  const instrucoes = [dados.linha1, dados.linha2, dados.linha3]
    .filter(l => l && l.trim())
    .map(l => escapeHtml(l.trim()));

  // Secao PIX (condicional)
  let pixHtml = '';
  if (pix && pix.qrCodeBase64) {
    pixHtml = `
    <div class="separator-double"></div>
    <div class="section pix-section">
      <div class="pix-header">PAGUE COM PIX</div>
      <div class="qr-container">
        <img src="${pix.qrCodeBase64}" alt="QR Code PIX" class="qr-code">
      </div>
      ${pix.qrCodeText ? `
        <div class="pix-label">PIX Copia e Cola:</div>
        <div class="pix-code break-all">${escapeHtml(pix.qrCodeText)}</div>
      ` : ''}
      ${pix.valor ? `<div class="pix-valor">Valor: R$ ${escapeHtml(parseFloat(pix.valor).toFixed(2).replace('.', ','))}</div>` : ''}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boleto - ${numDocumento}</title>
  <style>
    @page {
      margin: 0;
      padding: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 2mm 3mm;
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }

    .header-empresa {
      text-align: center;
      padding: 2mm 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      margin-bottom: 2mm;
    }

    .header-empresa .nome {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .header-empresa .cnpj {
      font-size: 10px;
      margin-top: 1mm;
    }

    .section {
      margin-bottom: 1mm;
    }

    .section-title {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 1mm;
    }

    .separator {
      border-bottom: 1px dashed #000;
      margin: 2mm 0;
    }

    .separator-double {
      border-bottom: 2px solid #000;
      margin: 2mm 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5mm;
    }

    .label {
      font-weight: bold;
      font-size: 10px;
    }

    .value {
      font-size: 11px;
    }

    .valor-destaque {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin: 1mm 0;
    }

    .instrucoes {
      font-size: 9px;
      line-height: 1.3;
    }

    .instrucoes li {
      margin-bottom: 0.5mm;
      list-style: none;
    }

    .instrucoes li::before {
      content: "- ";
    }

    .linha-digitavel {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.3px;
      padding: 1mm 0;
      word-break: break-all;
    }

    .local-pagamento {
      font-size: 8px;
      text-align: center;
      margin-top: 1mm;
    }

    .pix-section {
      text-align: center;
    }

    .pix-header {
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 2mm;
    }

    .qr-container {
      display: flex;
      justify-content: center;
      margin: 1mm 0;
    }

    .qr-code {
      width: 50mm;
      height: 50mm;
    }

    .pix-label {
      font-size: 10px;
      font-weight: bold;
      margin-top: 2mm;
      text-align: left;
    }

    .pix-code {
      font-size: 8px;
      line-height: 1.3;
      text-align: left;
      margin-top: 1mm;
      padding: 1mm;
      border: 1px dashed #000;
    }

    .pix-valor {
      font-size: 12px;
      font-weight: bold;
      margin-top: 2mm;
    }

    .break-all {
      word-break: break-all;
    }

    .footer-corte {
      text-align: center;
      margin-top: 3mm;
      font-size: 10px;
      letter-spacing: 2px;
    }

    .timestamp {
      text-align: center;
      font-size: 8px;
      color: #333;
      margin-top: 2mm;
    }

    @media print {
      body {
        width: 80mm;
        max-width: 80mm;
        padding: 2mm 3mm;
      }

      .no-print {
        display: none !important;
      }
    }

    @media screen {
      body {
        border: 1px solid #ccc;
        margin: 10px auto;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
  <!-- Cabecalho Empresa -->
  <div class="header-empresa">
    <div class="nome">SEEG FIBRAS TELECOM</div>
    <div class="cnpj">CNPJ: 25.452.912/0001-25</div>
  </div>

  <!-- Dados do Cliente -->
  <div class="section">
    <div class="section-title">BOLETO BANCARIO</div>
    <div><span class="label">Cliente:</span> ${nome}</div>
    <div><span class="label">CPF/CNPJ:</span> ${cpf}</div>
    ${endereco ? `<div><span class="label">End.:</span> ${endereco}</div>` : ''}
    <div>${cidade}${uf ? '/' + uf : ''}${cep ? ' - CEP: ' + cep : ''}</div>
  </div>

  <div class="separator"></div>

  <!-- Dados do Boleto -->
  <div class="section">
    <div><span class="label">Documento:</span> ${numDocumento}</div>
    <div><span class="label">Nosso Nr.:</span> ${nossoNumero}</div>
    <div><span class="label">Vencimento:</span> ${vencimento}</div>
    <div class="valor-destaque">R$ ${valor}</div>
  </div>

  <div class="separator"></div>

  ${instrucoes.length > 0 ? `
  <!-- Instrucoes -->
  <div class="section">
    <div class="label">Instrucoes:</div>
    <ul class="instrucoes">
      ${instrucoes.map(i => `<li>${i}</li>`).join('\n      ')}
    </ul>
  </div>
  <div class="separator"></div>
  ` : ''}

  <!-- Linha Digitavel -->
  <div class="section">
    <div class="label" style="text-align:center;">LINHA DIGITAVEL</div>
    <div class="linha-digitavel">${linhaDigitavel}</div>
    ${localPagamento ? `<div class="local-pagamento">${localPagamento}</div>` : ''}
  </div>

  <!-- PIX -->
  ${pixHtml}

  <!-- Rodape -->
  <div class="separator-double"></div>
  <div class="timestamp">Impresso em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</div>
  <div class="footer-corte">&#9986; - - - - - - - - - - - - - -</div>

  <script>
    // Só auto-imprime se abriu direto no navegador (não em iframe)
    if (window === window.top) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          window.print();
        });
      });
    }
  </script>
</body>
</html>`;
}

module.exports = { gerarHtmlTermica };
