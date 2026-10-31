// Traduz o formato do banco (uma linha por marcacao) para o formato da tela
// (matriz alunos x atividades). Funcao pura: nenhuma dependencia, nenhum
// efeito, nenhum acesso a DOM.

function chave(idAluno, idAtividade) {
  return `${idAluno}\u0000${idAtividade}`;
}

export function montarGrade(alunos, atividades, progresso) {
  const listaAlunos = Array.isArray(alunos) ? alunos : [];
  const listaAtividades = Array.isArray(atividades) ? atividades : [];
  const listaProgresso = Array.isArray(progresso) ? progresso : [];

  // chave aluno+atividade -> conjunto de origens
  const porCelula = new Map();
  for (const p of listaProgresso) {
    const k = chave(p.aluno_id, p.atividade_id);
    if (!porCelula.has(k)) porCelula.set(k, new Set());
    porCelula.get(k).add(p.origem);
  }

  const linhas = listaAlunos.map((aluno) => {
    const celulas = listaAtividades.map((atividade) => {
      const origens = porCelula.get(chave(aluno.id, atividade.id));
      return {
        atividade_id: atividade.id,
        titulo: atividade.titulo,
        concluida: origens !== undefined,
        origens: origens ? [...origens] : [],
      };
    });

    return {
      aluno,
      celulas,
      // Conta atividades concluidas, nao registros: uma atividade confirmada
      // pelo professor e pelo jogo continua sendo uma atividade (spec D4).
      concluidas: celulas.filter((c) => c.concluida).length,
    };
  });

  const semAlunos = listaAlunos.length === 0;
  const semAtividades = listaAtividades.length === 0;

  let motivo = null;
  if (semAlunos && semAtividades) motivo = 'sem-nada';
  else if (semAlunos) motivo = 'sem-alunos';
  else if (semAtividades) motivo = 'sem-atividades';

  return {
    atividades: listaAtividades,
    linhas,
    vazia: motivo !== null,
    motivo,
  };
}

export function montarLinhaDoAluno(grade, idAluno) {
  return grade.linhas.find((l) => l.aluno.id === idAluno) ?? null;
}
