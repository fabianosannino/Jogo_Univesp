// Ponte entre o jogo que roda no navegador (build WebGL da Unity) e o banco.
//
// O jogo nao conhece aluno, turma nem atividade: ele so sabe dizer "terminei a
// fase contar-ate-10". Quem traduz isso em progresso e esta ponte:
//
//   codigo da fase -> fase em FASES_DO_JOGO -> atividade da turma com o mesmo
//   titulo -> registro em progresso com origem 'jogo', para o aluno que esta
//   jogando.
//
// Nada aqui toca em DOM, rede ou window: a gravacao chega por parametro. Isso
// deixa toda a regra testavel no Node (tests/ponte-jogo.test.js).

// "Contar até 10", "contar ate 10" e "Contar  Ate 10 " sao a mesma atividade.
// A professora digita o titulo; exigir igualdade exata faria um acento
// esquecido apagar em silencio tudo o que a crianca fez no jogo.
export function normalizarTitulo(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function acharFase(codigo, fases) {
  if (typeof codigo !== 'string' || codigo === '') return null;
  const lista = Array.isArray(fases) ? fases : [];
  return lista.find((f) => f.codigo === codigo) ?? null;
}

export function atividadeDaFase(fase, atividades) {
  if (!fase) return null;
  const alvo = normalizarTitulo(fase.titulo);
  const lista = Array.isArray(atividades) ? atividades : [];
  return lista.find((a) => normalizarTitulo(a.titulo) === alvo) ?? null;
}

// Fases que a turma ainda nao tem como atividade. Sem a atividade, a fase
// concluida no jogo nao tem onde ser gravada: a tela do professor usa esta
// lista para oferecer o botao que as inclui.
export function fasesSemAtividade(fases, atividades) {
  const lista = Array.isArray(fases) ? fases : [];
  return lista.filter((f) => !atividadeDaFase(f, atividades));
}

// `gravar(idAluno, idAtividade)` e quem fala com o banco. Em jogar.js ela ja
// cuida da internet que cai (guarda na fila e reenvia), entao a ponte so
// decide O QUE gravar.
//
// O resultado diz o que aconteceu, para a tela comemorar e para o console
// explicar. A crianca nunca ve "fase desconhecida" (spec D7): se a fase existe,
// ela ganha a comemoracao mesmo que a turma nao tenha a atividade.
export function criarPonte({ idAluno, atividades, fases, gravar }) {
  // Jogar a mesma fase de novo e normal. Gravar de novo nao: o banco ignoraria
  // (upsert), mas seria uma chamada de rede inutil a cada repeticao.
  const jaGravadas = new Set();

  return {
    async faseConcluida(codigo) {
      const fase = acharFase(codigo, fases);
      if (!fase) return { gravou: false, motivo: 'fase-desconhecida', fase: null };

      const atividade = atividadeDaFase(fase, atividades);
      if (!atividade) return { gravou: false, motivo: 'sem-atividade', fase };

      if (jaGravadas.has(atividade.id)) {
        return { gravou: false, motivo: 'repetida', fase, atividade };
      }

      jaGravadas.add(atividade.id);
      try {
        await gravar(idAluno, atividade.id);
      } catch (e) {
        // Se a gravacao falhou de vez, a proxima conclusao tem de tentar de novo.
        jaGravadas.delete(atividade.id);
        throw e;
      }
      return { gravou: true, motivo: null, fase, atividade };
    },
  };
}
