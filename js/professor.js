// Tela do professor: gestao de turmas, alunos e atividades, mais a grade de
// marcacao. Esta e a tela por onde todo dado entra no sistema: o aluno nao
// insere nada (spec D3).

import { supabase } from './supabase.js';
import { exigirProfessor, sair } from './auth.js';
import { criarDb } from './db.js';
import { criarFila, armazenamentoSeguro } from './fila.js';
import { montarGrade } from './grade.js';
import { renderGrade, renderListaSimples, renderSeletorAvatar, escaparHtml } from './render.js';

const db = criarDb(supabase);
const armazenamento = armazenamentoSeguro(() => window.localStorage);
const fila = criarFila(armazenamento);

const el = (seletor) => document.querySelector(seletor);

function avisar(seletor, texto) {
  const caixa = el(seletor);
  caixa.textContent = texto;
  caixa.hidden = texto === '';
}

function erroNaTela(e) {
  avisar('#aviso-fila', `Nao deu certo: ${e.message}`);
}

const estado = {
  turmas: [],
  turmaSelecionada: null,
  alunos: [],
  atividades: [],
  progresso: [],
};

// --- turmas ---

async function recarregarTurmas() {
  estado.turmas = await db.listarTurmas();
  el('#lista-turmas').innerHTML = renderListaSimples(estado.turmas, 'turma');

  // Ruling C27: escaparHtml em value e no texto do option; o replace inline nao
  // trata aspas duplas, que quebrariam o atributo value="..." (spec C27).
  el('#turma-select').innerHTML = estado.turmas
    .map((t) => `<option value="${escaparHtml(t.id)}">${escaparHtml(t.nome)}</option>`)
    .join('');

  // Ruling C28: descarta o id do localStorage se ele nao pertencer a nenhuma
  // turma do professor atual (turma apagada ou de outro professor na mesma maquina).
  if (
    estado.turmaSelecionada &&
    !estado.turmas.find((t) => t.id === estado.turmaSelecionada)
  ) {
    estado.turmaSelecionada = null;
  }

  if (!estado.turmaSelecionada && estado.turmas.length > 0) {
    estado.turmaSelecionada = estado.turmas[0].id;
  }
  if (estado.turmaSelecionada) {
    el('#turma-select').value = estado.turmaSelecionada;
  }
}

el('#form-turma').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const campo = el('#turma-nome');
  try {
    await db.criarTurma(campo.value.trim(), professor.id);
    campo.value = '';
    await recarregarTurmas();
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#turma-select').addEventListener('change', async (evento) => {
  estado.turmaSelecionada = evento.target.value;
  await recarregarTurma();
});

// Marca, nesta maquina, qual turma a tela do aluno deve mostrar.
el('#usar-turma').addEventListener('click', () => {
  if (!estado.turmaSelecionada) return;
  armazenamento.setItem('turma_ativa', estado.turmaSelecionada);
  const turma = estado.turmas.find((t) => t.id === estado.turmaSelecionada);
  avisar('#turma-ativa', `Este computador vai mostrar a turma "${turma.nome}" para os alunos.`);
});

// --- alunos e atividades ---

async function recarregarTurma() {
  if (!estado.turmaSelecionada) {
    estado.alunos = [];
    estado.atividades = [];
    estado.progresso = [];
  } else {
    [estado.alunos, estado.atividades, estado.progresso] = await Promise.all([
      db.listarAlunos(estado.turmaSelecionada),
      db.listarAtividades(estado.turmaSelecionada),
      db.listarProgresso(estado.turmaSelecionada),
    ]);
  }

  el('#lista-alunos').innerHTML = renderListaSimples(estado.alunos, 'aluno');
  el('#lista-atividades').innerHTML = renderListaSimples(estado.atividades, 'atividade');
  el('#caixa-avatar').innerHTML = renderSeletorAvatar(estado.alunos.map((a) => a.avatar));
  desenharGrade();
}

el('#form-aluno').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!estado.turmaSelecionada) {
    avisar('#aviso-fila', 'Crie uma turma antes de cadastrar alunos.');
    return;
  }
  const campo = el('#aluno-nome');
  try {
    await db.criarAluno(
      estado.turmaSelecionada,
      campo.value.trim(),
      el('#avatar-input').value
    );
    campo.value = '';
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#form-atividade').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!estado.turmaSelecionada) {
    avisar('#aviso-fila', 'Crie uma turma antes de cadastrar atividades.');
    return;
  }
  const campo = el('#atividade-titulo');
  try {
    // A ordem e a posicao na sequencia pedagogica: o proximo numero livre.
    const proxima = estado.atividades.length
      ? Math.max(...estado.atividades.map((a) => a.ordem)) + 1
      : 1;
    await db.criarAtividade(estado.turmaSelecionada, campo.value.trim(), proxima);
    campo.value = '';
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

// Apagar turma, aluno ou atividade. Um ouvinte para os tres, porque os botoes
// sao gerados depois: o clique chega por delegacao.
document.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('.apagar');
  if (!botao) return;

  const { tipo, id } = botao.dataset;
  const confirmacoes = {
    turma: 'Apagar a turma apaga tambem os alunos, as atividades e todo o progresso dela. Confirma?',
    aluno: 'Apagar o aluno apaga todo o progresso dele. Confirma?',
    atividade: 'Apagar a atividade apaga as marcacoes dela. Confirma?',
  };
  if (!window.confirm(confirmacoes[tipo])) return;

  try {
    if (tipo === 'turma') {
      await db.apagarTurma(id);
      if (estado.turmaSelecionada === id) estado.turmaSelecionada = null;
      await recarregarTurmas();
    } else if (tipo === 'aluno') {
      await db.apagarAluno(id);
    } else if (tipo === 'atividade') {
      await db.apagarAtividade(id);
    }
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#sair').addEventListener('click', async () => {
  await sair();
  window.location.href = 'login.html';
});

// desenharGrade e a ligacao com a Task 9. Por enquanto so desenha.
function desenharGrade() {
  el('#area-grade').innerHTML = renderGrade(
    montarGrade(estado.alunos, estado.atividades, estado.progresso)
  );
}

// Ruling C29: a inicializacao nao pode deixar a tela em branco se a rede cair.
// exigirProfessor rejeita de duas formas:
//   - Error('sem sessao'): ja redirecionou para login.html; nao mostrar nada.
//   - qualquer outro erro (rede, token): mostrar na tela e parar aqui.
// Sem esse envoltorio, uma rejeicao mata o modulo inteiro (pagina branca).
let professor;
try {
  // O id do localStorage e lido antes de recarregarTurmas para que o Ruling C28
  // consiga validar o id contra a lista que chegara do banco.
  estado.turmaSelecionada = armazenamento.getItem('turma_ativa');
  professor = await exigirProfessor();
  document.querySelector('#identificacao').textContent = professor.email;
  await recarregarTurmas();
  await recarregarTurma();
} catch (e) {
  // 'sem sessao': exigirProfessor ja chamou location.replace; a pagina esta
  // saindo. Qualquer mensagem piscaria e sumira — nao exibir nada.
  if (e.message !== 'sem sessao') {
    erroNaTela(e);
  }
}
