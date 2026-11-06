// Abas da area do professor. Script comum (nao modulo): so mostra e esconde
// secoes, nao fala com o banco. Lembra a ultima aba aberta neste navegador.
// Teclado segue o padrao WAI-ARIA de abas: setas, Home e End.
(function () {
  const abas = Array.from(document.querySelectorAll('[role="tab"]'));
  if (abas.length === 0) return;

  function guardar(id) {
    try { window.localStorage.setItem('aba_professor', id); } catch { /* bloqueado */ }
  }
  function lembrada() {
    try { return window.localStorage.getItem('aba_professor'); } catch { return null; }
  }

  function ativar(aba, focar) {
    for (const a of abas) {
      const sel = a === aba;
      a.setAttribute('aria-selected', String(sel));
      a.tabIndex = sel ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !sel;
    }
    guardar(aba.dataset.aba);
    if (focar) aba.focus();
  }

  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => ativar(aba, false));
    aba.addEventListener('keydown', (ev) => {
      let alvo = null;
      if (ev.key === 'ArrowRight') alvo = abas[(i + 1) % abas.length];
      else if (ev.key === 'ArrowLeft') alvo = abas[(i - 1 + abas.length) % abas.length];
      else if (ev.key === 'Home') alvo = abas[0];
      else if (ev.key === 'End') alvo = abas[abas.length - 1];
      if (alvo) { ev.preventDefault(); ativar(alvo, true); }
    });
  });

  const inicial = abas.find((a) => a.dataset.aba === lembrada()) ?? abas[0];
  ativar(inicial, false);

  // Botoes com data-ir-aba (ex.: atalhos da grade vazia) levam para a aba.
  document.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-ir-aba]');
    const aba = botao && abas.find((x) => x.dataset.aba === botao.dataset.irAba);
    if (aba) ativar(aba, true);
  });

  // Outras partes da pagina podem pedir uma aba (ex.: professor sem turma).
  window.abrirAba = (id) => {
    const aba = abas.find((a) => a.dataset.aba === id);
    if (aba) ativar(aba, false);
  };
})();
