import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';

const ALUNOS = [
  { id: 'a1', nome: 'Ana', avatar: 'coruja' },
  { id: 'a2', nome: 'Bruno', avatar: 'raposa' },
];
const ATIVIDADES = [
  { id: 'at1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 'at2', titulo: 'Cores', ordem: 2 },
];

test('grade cruza todo aluno com toda atividade', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.equal(g.linhas.length, 2);
  assert.equal(g.linhas[0].celulas.length, 2);
  assert.equal(g.vazia, false);
});

test('sem progresso, nenhuma celula esta concluida', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  for (const linha of g.linhas) {
    assert.equal(linha.concluidas, 0);
    for (const c of linha.celulas) assert.equal(c.concluida, false);
  }
});

test('marcacao do professor marca a celula certa, e so ela', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at2', origem: 'professor' },
  ]);
  const ana = g.linhas.find((l) => l.aluno.id === 'a1');
  assert.equal(ana.celulas.find((c) => c.atividade_id === 'at1').concluida, false);
  assert.equal(ana.celulas.find((c) => c.atividade_id === 'at2').concluida, true);
  assert.equal(ana.concluidas, 1);

  const bruno = g.linhas.find((l) => l.aluno.id === 'a2');
  assert.equal(bruno.concluidas, 0);
});

test('celula guarda as origens separadas, sem somar', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ]);
  const celula = g.linhas[0].celulas.find((c) => c.atividade_id === 'at1');
  assert.deepEqual(celula.origens.slice().sort(), ['jogo', 'professor']);
  assert.equal(
    g.linhas[0].concluidas, 1,
    'a atividade foi concluida uma vez, registrada por duas fontes'
  );
});

test('as colunas seguem a ordem das atividades recebidas', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.deepEqual(g.atividades.map((a) => a.id), ['at1', 'at2']);
  assert.deepEqual(g.linhas[0].celulas.map((c) => c.atividade_id), ['at1', 'at2']);
});

test('progresso de aluno que nao esta na lista e ignorado', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'fantasma', atividade_id: 'at1', origem: 'professor' },
  ]);
  assert.equal(g.linhas.reduce((s, l) => s + l.concluidas, 0), 0);
});

test('progresso de atividade apagada nao cria coluna', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at-apagada', origem: 'professor' },
  ]);
  assert.equal(g.atividades.length, 2);
  assert.equal(g.linhas[0].celulas.length, 2);
});

// Review Focus 3 — o primeiro estado de toda turma recem-criada
test('turma sem aluno e sem atividade e vazia com motivo', () => {
  const g = montarGrade([], [], []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-nada');
  assert.deepEqual(g.linhas, []);
});

test('turma com atividade e sem aluno diz que faltam alunos', () => {
  const g = montarGrade([], ATIVIDADES, []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-alunos');
});

test('turma com aluno e sem atividade diz que faltam atividades', () => {
  const g = montarGrade(ALUNOS, [], []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-atividades');
  assert.equal(g.linhas.length, 2, 'os alunos continuam visiveis');
});

test('entrada nula nao quebra', () => {
  const g = montarGrade(null, undefined, null);
  assert.equal(g.vazia, true);
  assert.deepEqual(g.linhas, []);
});

test('montarLinhaDoAluno devolve so a linha pedida', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a2', atividade_id: 'at1', origem: 'professor' },
  ]);
  const linha = montarLinhaDoAluno(g, 'a2');
  assert.equal(linha.aluno.nome, 'Bruno');
  assert.equal(linha.concluidas, 1);
});

test('montarLinhaDoAluno devolve nulo para aluno inexistente', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.equal(montarLinhaDoAluno(g, 'nao-existe'), null);
});
