// Tela do aluno: escolhe a turma, escolhe o proprio nome, ve as proprias
// estrelas e joga. A crianca nao digita nada: tudo e clique em botao grande.
//
// Os nomes vem do banco, e o banco so entrega a turma ao professor dono dela
// (sql/politicas.sql). Por isso esta tela usa a sessao do professor que ja
// entrou neste computador -- e o limite conhecido da spec (lacuna 2): aluno e
// professor, para o banco, sao o mesmo usuario nesta maquina. Sem sessao, a
// tela pede o professor e ainda deixa jogar: baixar a versao Windows, que nao
// depende do banco, ou jogar online sem salvar.
//
// A crianca nunca ve erro tecnico (spec D7): o motivo vai para o console, e
// na tela fica so "chame o professor".
import { supabase } from './supabase.js';
import { professorAtual } from './auth.js';
import { criarDb } from './db.js';
import { armazenamentoSeguro } from './fila.js';
import { montarGrade, montarLinhaDoAluno } from './grade.js';
import {
  renderEscolhaTurma,
  renderEscolhaAluno,
  renderAreaAluno,
  escaparHtml,
} from './render.js';

const db = criarDb(supabase);
const raiz = document.querySelector('#raiz-aluno');
const guardado = armazenamentoSeguro(() => window.localStorage);
const CHAVE_TURMA = 'aluno.turma';

const estado = { turmas: [], turma: null, alunos: [], grade: null };

function semAcesso(texto) {
  raiz.innerHTML = renderAreaAluno().replace(
    '<section id="area-aluno">',
    `<section id="area-aluno"><p class="aviso">${escaparHtml(texto)}</p>`
  );
}

function mostrarTurmas() {
  estado.turma = null;
  guardado.setItem(CHAVE_TURMA, '');
  raiz.innerHTML = renderEscolhaTurma(estado.turmas);
}

// Alunos, atividades e progresso chegam juntos: as estrelas de cada crianca
// saem da mesma grade que a professora ve (js/grade.js).
async function abrirTurma(turma) {
  estado.turma = turma;
  guardado.setItem(CHAVE_TURMA, turma.id);
  raiz.innerHTML = `<section id="area-aluno"><p class="aluno-turma">Carregando…</p></section>`;
  try {
    const [alunos, atividades, progresso] = await Promise.all([
      db.listarAlunos(turma.id),
      db.listarAtividades(turma.id),
      db.listarProgresso(turma.id),
    ]);
    estado.alunos = alunos;
    estado.grade = montarGrade(alunos, atividades, progresso);
    raiz.innerHTML = renderEscolhaAluno(turma, estado.alunos);
  } catch (e) {
    console.error('[aluno] nao deu para carregar a turma:', e);
    semAcesso('Não foi possível carregar a turma agora. Chame o professor.');
  }
}

raiz.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;

  if (botao.dataset.turma) {
    const turma = estado.turmas.find((t) => t.id === botao.dataset.turma);
    if (turma) abrirTurma(turma);
  } else if (botao.dataset.aluno) {
    const aluno = estado.alunos.find((a) => a.id === botao.dataset.aluno);
    const linha = estado.grade ? montarLinhaDoAluno(estado.grade, botao.dataset.aluno) : null;
    if (aluno) raiz.innerHTML = renderAreaAluno(aluno, linha);
  } else if (botao.dataset.voltar === 'turma') {
    mostrarTurmas();
  } else if (botao.dataset.voltar === 'aluno') {
    // Volta pela turma inteira, e nao so redesenha: se a professora marcou algo
    // (ou a crianca concluiu uma fase online) enquanto a tela estava aberta, a
    // proxima crianca ja ve as estrelas atualizadas.
    abrirTurma(estado.turma);
  }
});

async function iniciar() {
  try {
    const professor = await professorAtual();
    if (!professor) {
      semAcesso('Para aparecerem as turmas, o professor precisa entrar neste computador uma vez.');
      return;
    }
    estado.turmas = (await db.listarTurmas(professor.id)).map((t) => ({ id: t.id, nome: t.nome }));
  } catch (e) {
    console.error('[aluno] nao deu para carregar as turmas:', e);
    semAcesso('Não foi possível carregar as turmas agora. Chame o professor.');
    return;
  }

  // Volta direto para a ultima turma usada neste computador: na escola, a
  // maquina costuma ser da mesma sala o dia inteiro.
  const ultima = estado.turmas.find((t) => t.id === guardado.getItem(CHAVE_TURMA));
  if (ultima) abrirTurma(ultima);
  else mostrarTurmas();
}

iniciar();
