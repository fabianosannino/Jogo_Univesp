// Tela do aluno: duas etapas, escolher o bichinho e ver o progresso.
// Somente leitura — nenhum controle de escrita existe aqui (spec D3).
// Roda dentro da sessao do professor (spec D2) e usa o mesmo cliente.
import { supabase } from './supabase.js';
import { criarDb } from './db.js';
import { montarGrade, montarLinhaDoAluno } from './grade.js';
import { renderAreaAluno } from './render.js';
import { armazenamentoSeguro } from './fila.js';

const db = criarDb(supabase);
const raiz = document.querySelector('#raiz-aluno');

// Ruling C41: window.localStorage e um getter que lanca excecao em navegadores
// com armazenamento bloqueado. armazenamentoSeguro captura essa excecao e
// devolve um substituto inerte (getItem retorna null), o que faz carregar()
// cair no caminho 'sem-turma' em vez de matar o modulo com tela branca.
const armazenamento = armazenamentoSeguro(() => window.localStorage);

let grade = null;

function desenhar(estado) {
  raiz.innerHTML = renderAreaAluno(estado);
}

async function carregar() {
  const idTurma = armazenamento.getItem('turma_ativa');

  // Ninguem preparou esta maquina, ou o cache foi limpo.
  if (!idTurma) {
    desenhar({ estado: 'sem-turma' });
    return;
  }

  desenhar({ estado: 'carregando' });

  try {
    const [alunos, atividades, progresso] = await Promise.all([
      db.listarAlunos(idTurma),
      db.listarAtividades(idTurma),
      db.listarProgresso(idTurma),
    ]);
    grade = montarGrade(alunos, atividades, progresso);
    desenhar({ estado: 'escolher', alunos });
  } catch (e) {
    // O aluno nao pode ver mensagem de erro tecnica. O console ve.
    console.error(e);
    desenhar({ estado: 'erro' });
  }
}

raiz.addEventListener('click', (evento) => {
  const botaoAvatar = evento.target.closest('.avatar-aluno');
  if (botaoAvatar && grade) {
    const linha = montarLinhaDoAluno(grade, botaoAvatar.dataset.aluno);
    if (linha) desenhar({ estado: 'progresso', linha });
    return;
  }

  // Voltar recarrega do banco: se o professor marcou algo enquanto esta tela
  // estava aberta, o aluno ve o novo estado ao entrar de novo.
  if (evento.target.closest('.voltar')) {
    carregar();
  }
});

await carregar();
