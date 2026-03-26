// Lógica de impressão de boletos
const Printer = {
  // Imprime um boleto individual
  async imprimir(boletoId) {
    try {
      const url = Api.getBoletoUrl(boletoId);
      const frame = document.getElementById('printFrame');

      return new Promise((resolve, reject) => {
        frame.onload = () => {
          try {
            frame.contentWindow.print();
            resolve(true);
          } catch (e) {
            // Fallback: abre em nova aba
            window.open(url, '_blank');
            resolve(true);
          }
        };

        frame.onerror = () => {
          reject(new Error('Erro ao carregar boleto'));
        };

        frame.src = url;
      });
    } catch (error) {
      // Fallback final: abre direto
      window.open(Api.getBoletoUrl(boletoId), '_blank');
      return true;
    }
  },

  // Imprime múltiplos boletos em um único PDF
  async imprimirVarios(boletoIds) {
    try {
      // Busca o PDF combinado via POST
      const response = await fetch('/api/boletos/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: boletoIds })
      });

      if (!response.ok) {
        throw new Error('Erro ao obter boletos');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const frame = document.getElementById('printFrame');

      return new Promise((resolve, reject) => {
        frame.onload = () => {
          try {
            frame.contentWindow.print();
            resolve(true);
          } catch (e) {
            window.open(url, '_blank');
            resolve(true);
          } finally {
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
        };

        frame.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Erro ao carregar boletos'));
        };

        frame.src = url;
      });
    } catch (error) {
      // Fallback: imprime individualmente o primeiro
      await this.imprimir(boletoIds[0]);
      return true;
    }
  }
};
