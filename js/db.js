// Todas as operacoes de banco em um lugar.
//
// Recebe o cliente por parametro em vez de importar js/supabase.js: aquele
// arquivo importa de uma URL de CDN, e o Node nao resolve URL em import. Com
// o cliente vindo de fora, toda consulta aqui e testavel sem rede.

// O Supabase devolve { data, error }. Transformar error em excecao evita que
// cada tela precise lembrar de checar.
//
// O codigo vem junto: '23505' (duplicata), '42501' (RLS recusou), 'PGRST205'
// (tabela nao existe), 'PGRST301' (token expirado) sao problemas diferentes, e
// achatar os quatro numa frase so torna qualquer diagnostico impossivel. Quem
// trata so `e.message` continua funcionando igual.
async function pegar(consulta, padrao) {
  const { data, error } = await consulta;
  if (error) {
    const e = new Error(error.message ?? 'falha ao acessar o banco');
    e.codigo = error.code ?? null;
    throw e;
  }
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
    //
    // O map descarta a chave `aluno` que a juncao devolve. Sem ele, esta e a
    // unica funcao daqui cujo retorno nao corresponde a sua propria lista de
    // select, e quem mexer nela em 2027 nao tem como adivinhar que vem uma
    // chave a mais. Uma linha resolve por construcao o que era convencao.
    async listarProgresso(idTurma) {
      const linhas = await pegar(
        cliente
          .from('progresso')
          .select('aluno_id, atividade_id, origem, aluno!inner(turma_id)')
          .eq('aluno.turma_id', idTurma),
        []
      );
      return linhas.map(({ aluno, ...resto }) => resto);
    },

    // upsert, nao insert: a fila offline reenvia o que nao teve resposta, e
    // schema.sql tem unique(aluno_id, atividade_id, origem). Com insert, o
    // reenvio de uma marcacao que JA gravou devolve 23505 para sempre, a fila
    // nunca esvazia e o professor fica com o aviso de pendencia o dia inteiro.
    // Marcar duas vezes tem de ser o mesmo que marcar uma vez.
    async marcar(idAluno, idAtividade) {
      await pegar(
        cliente.from('progresso').upsert(
          {
            aluno_id: idAluno,
            atividade_id: idAtividade,
            origem: 'professor',
          },
          { onConflict: 'aluno_id,atividade_id,origem', ignoreDuplicates: true }
        ),
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
