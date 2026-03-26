// Teclado numérico virtual
const VirtualKeyboard = {
  init() {
    const container = document.getElementById('keyboard');
    if (!container) return;

    const keys = [
      { label: '1', type: 'num' },
      { label: '2', type: 'num' },
      { label: '3', type: 'num' },
      { label: '4', type: 'num' },
      { label: '5', type: 'num' },
      { label: '6', type: 'num' },
      { label: '7', type: 'num' },
      { label: '8', type: 'num' },
      { label: '9', type: 'num' },
      { label: 'clear', type: 'clear' },
      { label: '0', type: 'num' },
      { label: '⌫', type: 'backspace' },
    ];

    keys.forEach(key => {
      const btn = document.createElement('button');
      btn.setAttribute('type', 'button');

      if (key.type === 'clear') {
        btn.className = 'key-btn key-clear';
        btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M5 6l1 14h12l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.clear();
        });
      } else {
        btn.className = `key-btn key-${key.type}`;
        btn.textContent = key.label;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleKey(key);
        });
      }

      container.appendChild(btn);
    });
  },

  handleKey(key) {
    const input = document.getElementById('documentoInput');
    if (!input) return;

    // Reset da inatividade
    if (typeof app !== 'undefined') app.resetInactivity();

    const limpo = input.value.replace(/\D/g, '');

    if (key.type === 'num') {
      if (limpo.length >= 14) return; // Máximo CNPJ
      const novoValor = limpo + key.label;
      input.value = this.formatarDocumento(novoValor);
    } else if (key.type === 'backspace') {
      if (limpo.length > 0) {
        const novoValor = limpo.slice(0, -1);
        input.value = this.formatarDocumento(novoValor);
      }
    }
  },

  clear() {
    const input = document.getElementById('documentoInput');
    if (input) input.value = '';
    if (typeof app !== 'undefined') app.resetInactivity();
  },

  // Formata CPF ou CNPJ conforme o tamanho
  formatarDocumento(numeros) {
    if (!numeros) return '';

    if (numeros.length <= 11) {
      // CPF: XXX.XXX.XXX-XX
      return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: XX.XXX.XXX/XXXX-XX
      return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  }
};
