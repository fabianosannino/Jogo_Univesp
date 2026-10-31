// Todas as operacoes de banco em um lugar.
//
// Recebe o cliente por parametro em vez de importar js/supabase.js: aquele
// arquivo importa de uma URL de CDN, e o Node nao resolve URL em import. Com
// o cliente vindo de fora, toda consulta aqui e testavel sem rede.

// O Supabase devolve { data, error }. Transformar error em excecao evita que
// cada tela precise lembrar de checar.
async function pegar(consulta, padrao) {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message ?? 'falha ao acessar o banco');
  return data ?? padrao;
}

export function criarDb(cliente) {
  return {
    // --- turma ---

    listarTurmas() {
      return pegar(
        cliente.from('turma').select('id, nome, criada_em').order('nome'),
        []
      );
    },

    criarTurma(nome, idProfessor) {
      return pegar(
        cliente
          .from('turma')
          .insert({ nome, professor: idProfessor })
          .select('id, nome')
          .single(),
        null
      );
    },

    async apagarTurma(idTurma) {
      await pegar(cliente.from('turma').delete().eq('id', idTurma), null);
    },

    // --- aluno ---

    listarAlunos(idTurma) {
      return pegar(
        cliente
          .from('aluno')
          .select('id, nome, avatar')
          .eq('turma_id', idTurma)
          .order('nome'),
        []
      );
    },

    criarAluno(idTurma, nome, avatar) {
      return pegar(
        cliente
          .from('aluno')
          .insert({ turma_id: idTurma, nome, avatar })
          .select('id, nome, avatar')
          .single(),
        null
      );
    },

    async apagarAluno(idAluno) {
      await pegar(cliente.from('aluno').delete().eq('id', idAluno), null);
    },

    // --- atividade ---

    listarAtividades(idTurma) {
      return pegar(
        cliente
          .from('atividade')
          .select('id, titulo, ordem')
          .eq('turma_id', idTurma)
          .order('ordem'),
        []
      );
    },

    criarAtividade(idTurma, titulo, ordem) {
      return pegar(
        cliente
          .from('atividade')
          .insert({ turma_id: idTurma, titulo, ordem })
          .select('id, titulo, ordem')
          .single(),
        null
      );
    },

    async apagarAtividade(idAtividade) {
      await pegar(cliente.from('atividade').delete().eq('id', idAtividade), null);
    },

    // --- progresso ---

    // progresso nao tem turma_id: o vinculo e via aluno. O "aluno!inner(...)"
    // pede ao Supabase a juncao, e o eq filtra pela coluna do outro lado.
    listarProgresso(idTurma) {
      return pegar(
        cliente
          .from('progresso')
          .select('aluno_id, atividade_id, origem, aluno!inner(turma_id)')
          .eq('aluno.turma_id', idTurma),
        []
      );
    },

    async marcar(idAluno, idAtividade) {
      await pegar(
        cliente.from('progresso').insert({
          aluno_id: idAluno,
          atividade_id: idAtividade,
          origem: 'professor',
        }),
        null
      );
    },

    // O filtro de origem e essencial: quando o jogo passar a gravar
    // (origem = 'jogo'), desmarcar nao pode apagar o registro dele.
    async desmarcar(idAluno, idAtividade) {
      await pegar(
        cliente
          .from('progresso')
          .delete()
          .eq('aluno_id', idAluno)
          .eq('atividade_id', idAtividade)
          .eq('origem', 'professor'),
        null
      );
    },
  };
}
