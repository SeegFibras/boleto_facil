// Lógica de impressão de boletos
const Printer = {
  // Imprime um boleto individual — abre o PDF em nova aba para evitar
  // re-paginação do window.print() sobre iframe
  async imprimir(boletoId) {
    const url = Api.getBoletoUrl(boletoId);
    window.open(url, '_blank');
    return true;
  },

  // Imprime múltiplos boletos em um único PDF
  async imprimirVarios(boletoIds) {
    try {
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
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return true;
    } catch (error) {
      // Fallback: imprime individualmente o primeiro
      await this.imprimir(boletoIds[0]);
      return true;
    }
  }
};
