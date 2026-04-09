// Lógica de impressão de boletos
// Usa iframe escondido + contentWindow.print() (mesmo método da Six Startup)
// Isso envia o PDF direto para o driver da impressora sem abrir nova aba
const Printer = {

  // Imprime um boleto individual via iframe escondido
  async imprimir(boletoId, tipo) {
    return new Promise((resolve, reject) => {
      const iframeId = 'printFrame-' + boletoId;

      // Remove iframe anterior se existir
      const existente = document.getElementById(iframeId);
      if (existente) existente.remove();

      // Cria iframe escondido com o PDF do boleto
      const iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.src = Api.getBoletoUrl(boletoId, tipo);
      iframe.style.cssText = 'display:none; width:1px; height:1px; position:absolute; left:-9999px;';
      document.body.appendChild(iframe);

      // Aguarda o PDF carregar no iframe e dispara a impressão
      iframe.onload = function () {
        try {
          iframe.contentWindow.print();
          resolve(true);
        } catch (error) {
          // Fallback: abre em nova aba se o print() falhar (ex: cross-origin)
          console.warn('Fallback para window.open:', error.message);
          window.open(Api.getBoletoUrl(boletoId, tipo), '_blank');
          resolve(true);
        }

        // Remove o iframe após um tempo (para dar tempo da impressão processar)
        setTimeout(() => {
          const el = document.getElementById(iframeId);
          if (el) el.remove();
        }, 30000);
      };

      iframe.onerror = function () {
        // Fallback: abre em nova aba
        window.open(Api.getBoletoUrl(boletoId, tipo), '_blank');
        resolve(true);
      };
    });
  },

  // Imprime múltiplos boletos (um iframe por boleto, como a Six Startup faz)
  async imprimirVarios(boletoIds) {
    for (const id of boletoIds) {
      await this.imprimir(id);
    }
    return true;
  }
};
