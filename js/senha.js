// Botao "Mostrar" ao lado do campo de senha. Script comum (nao modulo): nao
// depende de rede nem do Supabase, entao funciona mesmo se o resto falhar.
document.querySelectorAll('.mostrar-senha').forEach((botao) => {
  const campo = document.getElementById(botao.getAttribute('aria-controls'));
  if (!campo) return;
  botao.setAttribute('aria-pressed', 'false');
  botao.addEventListener('click', () => {
    const mostrando = campo.type === 'text';
    campo.type = mostrando ? 'password' : 'text';
    botao.textContent = mostrando ? 'Mostrar' : 'Esconder';
    botao.setAttribute('aria-pressed', String(!mostrando));
    campo.focus();
  });
});
