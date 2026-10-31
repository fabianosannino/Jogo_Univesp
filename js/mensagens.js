// Traducao das mensagens de erro do Supabase Auth para o professor.
//
// Vive fora de js/auth.js de proposito. O auth.js importa js/supabase.js, que
// importa uma URL https:// que o `import` do Node nao resolve: nada que mora
// naquele arquivo e testavel sem navegador. Esta funcao e a unica coisa entre
// um professor e um erro tecnico em ingles, decide entre oito ramos, e por isso
// merece teste. Aqui ela tem.

export function traduzirErroAuth(mensagem) {
  const m = String(mensagem).toLowerCase();

  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (m.includes('already registered')) return 'Este e-mail ja tem conta.';
  if (m.includes('password should be')) return 'A senha precisa de pelo menos 6 caracteres.';

  // O Supabase limita o envio de e-mail a poucas mensagens por hora. Com a
  // confirmacao de e-mail ligada, CADA cadastro tenta enviar uma, e a terceira
  // tentativa da hora falha assim. O professor nao tem como consertar isso, mas
  // tem como esperar -- e "espere alguns minutos" e verdade e e acionavel, o que
  // "email rate limit exceeded" nao era.
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.';
  }

  // Aparece quando o autocadastro esta desligado no painel. Sem esta linha, quem
  // abrir cadastro.html depois disso le "Signups not allowed for this instance".
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'O cadastro esta fechado. Peca para a equipe criar a sua conta.';
  }

  // Erro de digitacao no e-mail, que e o caso mais provavel de todos.
  if (m.includes('unable to validate email address') || m.includes('invalid email')) {
    return 'Esse e-mail nao parece valido. Confira se esta escrito certo.';
  }

  if (m.includes('failed to fetch')) return 'Sem conexao com a internet.';

  // Ultimo recurso: devolve o texto original em vez de uma frase generica.
  // Uma mensagem estranha em ingles e ruim, mas permite que alguem descubra o
  // que aconteceu; "Erro inesperado" nao permite nada.
  return mensagem;
}
