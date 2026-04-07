// Comunicação com o backend
const Api = {
  async consultar(documento) {
    const response = await fetch('/api/consultar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Erro ao consultar.');
    }

    return data;
  },

  getBoletoUrl(id) {
    return `/api/boleto/${id}/termica-pdf`;
  },

  getBoletoPdfUrl(id) {
    return `/api/boleto/${id}/pdf`;
  },

  getBoletosUrl(ids) {
    return `/api/boletos/pdf`;
  },

  async healthCheck() {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch {
      return false;
    }
  },

  async getConfig() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) return await response.json();
      return null;
    } catch {
      return null;
    }
  }
};
