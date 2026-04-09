// Lógica principal do frontend - SEEG FIBRAS
const app = {
  inactivityTimer: null,
  inactivityTimeout: 60000, // 60 segundos
  inactivityStart: null,
  inactivityAnimFrame: null,
  isShowingResults: false,

  // Inicialização
  async init() {
    VirtualKeyboard.init();
    this.startClock();
    this.updateGreeting();
    this.loadConfig();
    this.startHealthCheck();
    this.setupKioskMode();
    this.setupKeyboardEvents();
    this.setupButtons();

    // Previne menu de contexto (exceto no input) e seleção fora do input
    document.addEventListener('contextmenu', e => {
      if (e.target.id !== 'documentoInput') e.preventDefault();
    });
    document.addEventListener('selectstart', e => {
      if (e.target.id !== 'documentoInput') e.preventDefault();
    });

    // Reseta inatividade em qualquer interação
    ['click', 'touchstart', 'keydown'].forEach(evt => {
      document.addEventListener(evt, () => this.resetInactivity());
    });
  },

  // Relógio digital
  startClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      document.getElementById('clock').textContent = `${h}:${m}:${s}`;
    };
    update();
    setInterval(update, 1000);
  },

  // Saudação por período do dia
  updateGreeting() {
    const hora = new Date().getHours();
    let saudacao;
    if (hora >= 5 && hora < 12) saudacao = 'Bom dia!';
    else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde!';
    else saudacao = 'Boa noite!';
    document.getElementById('greeting').textContent = saudacao;
  },

  // Carrega configurações do servidor
  async loadConfig() {
    document.getElementById('footerText').textContent = 'SEEG FIBRAS TELECOMUNICAÇÕES LTDA - CNPJ: 25.452.912/0001-25';
  },

  // Health check periódico
  startHealthCheck() {
    const check = async () => {
      const online = await Api.healthCheck();
      const dot = document.querySelector('.status-dot');
      const text = document.querySelector('.status-text');
      if (online) {
        dot.classList.remove('offline');
        text.textContent = 'Conectado';
      } else {
        dot.classList.add('offline');
        text.textContent = 'Offline';
      }
    };
    check();
    setInterval(check, 30000);
  },

  // Modo quiosque
  setupKioskMode() {
    // Detecta se está em modo kiosk (tela cheia)
    if (window.navigator.standalone || window.matchMedia('(display-mode: fullscreen)').matches) {
      document.body.classList.add('kiosk-mode');
    }

    // F11 para modo quiosque
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        document.body.classList.toggle('kiosk-mode');
      }
    });
  },

  // Registra event listeners nos botões
  setupButtons() {
    document.getElementById('btnBuscar').addEventListener('click', (e) => {
      e.preventDefault();
      this.buscar();
    });

    const btnNova = document.getElementById('btnNovaConsulta');
    if (btnNova) btnNova.addEventListener('click', () => this.novaConsulta());

    const btnNova2 = document.getElementById('btnNovaConsulta2');
    if (btnNova2) btnNova2.addEventListener('click', () => this.novaConsulta());

    // Delegação de eventos para botões dinâmicos (imprimir)
    document.addEventListener('click', (e) => {
      const btnImprimir = e.target.closest('.btn-imprimir');
      if (btnImprimir) {
        const id = btnImprimir.dataset.boletoId;
        const tipo = btnImprimir.dataset.boletoTipo || 'gateway';
        if (id) this.imprimir(id, tipo);
        return;
      }
    });
  },

  // Permite teclado físico e colar
  setupKeyboardEvents() {
    const input = document.getElementById('documentoInput');

    document.addEventListener('keydown', (e) => {
      // Permite Ctrl+V, Ctrl+C, Ctrl+A no input
      if ((e.ctrlKey || e.metaKey) && ['v', 'c', 'a'].includes(e.key.toLowerCase())) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        this.buscar();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.novaConsulta();
      }
    });

    // Formata ao digitar diretamente no input
    input.addEventListener('input', () => {
      const limpo = input.value.replace(/\D/g, '').slice(0, 14);
      input.value = VirtualKeyboard.formatarDocumento(limpo);
    });

    // Formata ao colar
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const colado = (e.clipboardData || window.clipboardData).getData('text');
      const limpo = colado.replace(/\D/g, '').slice(0, 14);
      input.value = VirtualKeyboard.formatarDocumento(limpo);
    });
  },

  // Buscar boletos
  async buscar() {
    const input = document.getElementById('documentoInput');
    const documento = input.value.replace(/\D/g, '');

    if (!documento || documento.length < 11) {
      this.showError('Digite um CPF ou CNPJ válido.');
      return;
    }

    // Validação básica
    if (documento.length !== 11 && documento.length !== 14) {
      this.showError('CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos.');
      return;
    }

    this.hideAll();
    this.showLoading(true);

    try {
      const data = await Api.consultar(documento);
      this.showLoading(false);

      if (!data.boletos || data.boletos.length === 0) {
        this.showSuccess(data.cliente);
      } else {
        this.showResults(data);
      }
    } catch (error) {
      this.showLoading(false);
      this.showError(error.message);
    }
  },

  // Exibe resultados
  showResults(data) {
    this.isShowingResults = true;
    const clientInfo = document.getElementById('clientInfo');
    const boletosList = document.getElementById('boletosList');
    const results = document.getElementById('results');

    // Limpa o bloco de info do cliente (nome e endereço agora ficam nos cards)
    clientInfo.innerHTML = '';

    // Ordena: vencidos primeiro, depois por data
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const boletos = data.boletos.sort((a, b) => {
      const dA = this.parseDate(a.dataVencimento);
      const dB = this.parseDate(b.dataVencimento);
      const vencidoA = dA < hoje;
      const vencidoB = dB < hoje;
      if (vencidoA !== vencidoB) return vencidoA ? -1 : 1;
      return dA - dB;
    });

    let html = `
      <div class="boletos-header">
        <h2>${boletos.length} boleto(s) em aberto</h2>
      </div>
    `;

    boletos.forEach(boleto => {
      const dataVenc = this.parseDate(boleto.dataVencimento);
      const diffDays = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

      let statusClass, statusText, cardClass;
      if (diffDays < 0) {
        statusClass = 'status-vencido';
        statusText = `Vencido há ${Math.abs(diffDays)} dia(s)`;
        cardClass = 'vencido';
      } else if (diffDays === 0) {
        statusClass = 'status-hoje';
        statusText = 'Vence hoje';
        cardClass = 'vence-hoje';
      } else {
        statusClass = 'status-aberto';
        statusText = `Vence em ${diffDays} dia(s)`;
        cardClass = 'a-vencer';
      }

      const valorFormatado = parseFloat(boleto.valor).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
      });

      const dataFormatada = this.formatDate(boleto.dataVencimento);

      html += `
        <div class="boleto-card ${cardClass}">
          <div class="boleto-info">
            <div class="boleto-cliente-nome">${this.escapeHtml(data.cliente.nome)}</div>
            ${boleto.endereco ? `
              <div class="boleto-endereco">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                ${this.escapeHtml(boleto.endereco)}
              </div>
            ` : ''}
            <div class="boleto-valor">${valorFormatado}</div>
            <div class="boleto-vencimento">Vencimento: ${dataFormatada}</div>
            <span class="boleto-status ${statusClass}">${statusText}</span>
          </div>
          ${boleto.temPdf ? `
            <button type="button" class="btn-imprimir" data-boleto-id="${boleto.id}" data-boleto-tipo="${boleto.tipoRecebimento === '5' ? 'pix' : 'gateway'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
          ` : ''}
        </div>
      `;
    });

    boletosList.innerHTML = html;
    results.style.display = 'block';
    this.startInactivityTimer();
  },

  // Cliente sem boletos
  showSuccess(cliente) {
    this.isShowingResults = true;
    const msg = document.getElementById('successMessage');
    msg.style.display = 'block';
    this.startInactivityTimer();
  },

  // Imprimir boleto individual
  async imprimir(id, tipo) {
    try {
      this.showToast('Preparando boleto...', 'success');
      await Printer.imprimir(id, tipo);
      this.showToast('Boleto enviado para impressão!', 'success');
    } catch (error) {
      this.showToast('Erro ao imprimir. Tente novamente.', 'error');
    }
  },

  // Nova consulta
  novaConsulta() {
    VirtualKeyboard.clear();
    this.hideAll();
    this.isShowingResults = false;
    this.stopInactivityTimer();
    document.getElementById('documentoInput').focus();
  },

  // Helpers de exibição
  showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
  },

  showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  },

  hideAll() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
  },

  showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  },

  // Inatividade
  startInactivityTimer() {
    this.stopInactivityTimer();
    if (!this.isShowingResults) return;

    const bar = document.getElementById('inactivityBar');
    const progress = document.getElementById('inactivityProgress');
    bar.style.display = 'block';

    this.inactivityStart = Date.now();
    progress.style.width = '100%';

    const animate = () => {
      const elapsed = Date.now() - this.inactivityStart;
      const remaining = Math.max(0, 1 - elapsed / this.inactivityTimeout);
      progress.style.width = (remaining * 100) + '%';

      if (remaining <= 0) {
        this.novaConsulta();
        return;
      }
      this.inactivityAnimFrame = requestAnimationFrame(animate);
    };

    this.inactivityAnimFrame = requestAnimationFrame(animate);
  },

  stopInactivityTimer() {
    if (this.inactivityAnimFrame) {
      cancelAnimationFrame(this.inactivityAnimFrame);
      this.inactivityAnimFrame = null;
    }
    document.getElementById('inactivityBar').style.display = 'none';
  },

  resetInactivity() {
    if (this.isShowingResults) {
      this.startInactivityTimer();
    }
  },

  // Utilitários
  parseDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    // Aceita YYYY-MM-DD ou DD/MM/YYYY
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    const [d, m, y] = dateStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  },

  formatDate(dateStr) {
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', () => app.init());
