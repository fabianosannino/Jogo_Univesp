import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarTitulo,
  acharFase,
  atividadeDaFase,
  fasesSemAtividade,
  criarPonte,
} from '../js/ponte-jogo.js';

const FASES = [
  { codigo: 'contar-ate-10', titulo: 'Contar até 10' },
  { codigo: 'reconhecer-cores', titulo: 'Reconhecer as cores' },
];
const ATIVIDADES = [
  { id: 't1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 't2', titulo: 'Formas geometricas', ordem: 2 },
];

// Gravacao falsa: registra cada chamada e pode falhar sob demanda.
function gravacaoFalsa() {
  const chamadas = [];
  let falhar = false;
  async function gravar(idAluno, idAtividade) {
    chamadas.push([idAluno, idAtividade]);
    if (falhar) throw new Error('sem rede');
  }
  return { chamadas, gravar, falharDaquiPraFrente: (v) => { falhar = v; } };
}

// --- titulo ---

test('titulo com e sem acento, maiuscula e espaco extra e o mesmo', () => {
  assert.equal(normalizarTitulo('Contar até 10'), normalizarTitulo('  contar  ATE 10 '));
  assert.equal(normalizarTitulo('Reconhecer as Cores'), 'reconhecer as cores');
});

test('normalizarTitulo aceita vazio e nulo sem quebrar', () => {
  assert.equal(normalizarTitulo(null), '');
  assert.equal(normalizarTitulo(undefined), '');
});

// --- fase e atividade ---

test('acharFase encontra pelo codigo exato e nada mais', () => {
  assert.equal(acharFase('contar-ate-10', FASES).titulo, 'Contar até 10');
  assert.equal(acharFase('Contar-ate-10', FASES), null, 'codigo e exato');
  assert.equal(acharFase('', FASES), null);
  assert.equal(acharFase(42, FASES), null);
  assert.equal(acharFase('contar-ate-10', null), null);
});

test('fase encontra a atividade da turma mesmo sem o acento', () => {
  assert.equal(atividadeDaFase(FASES[0], ATIVIDADES).id, 't1');
});

test('fase sem atividade com o mesmo titulo nao encontra nada', () => {
  assert.equal(atividadeDaFase(FASES[1], ATIVIDADES), null);
});

test('fasesSemAtividade lista so as que faltam na turma', () => {
  assert.deepEqual(fasesSemAtividade(FASES, ATIVIDADES), [FASES[1]]);
  assert.deepEqual(fasesSemAtividade(FASES, [...ATIVIDADES, { id: 't3', titulo: 'reconhecer as cores' }]), []);
  assert.deepEqual(fasesSemAtividade([], ATIVIDADES), []);
});

// --- ponte ---

test('fase concluida grava para o aluno que esta jogando', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: FASES, gravar: g.gravar });

  const r = await ponte.faseConcluida('contar-ate-10');

  assert.equal(r.gravou, true);
  assert.equal(r.atividade.id, 't1');
  assert.deepEqual(g.chamadas, [['a1', 't1']]);
});

test('codigo que o jogo inventou nao grava nada', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: FASES, gravar: g.gravar });

  const r = await ponte.faseConcluida('fase-que-nao-existe');

  assert.equal(r.gravou, false);
  assert.equal(r.motivo, 'fase-desconhecida');
  assert.equal(r.fase, null, 'sem fase, a tela nao comemora');
  assert.equal(g.chamadas.length, 0);
});

test('fase sem atividade na turma nao grava, mas a crianca ainda e comemorada', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: FASES, gravar: g.gravar });

  const r = await ponte.faseConcluida('reconhecer-cores');

  assert.equal(r.gravou, false);
  assert.equal(r.motivo, 'sem-atividade');
  assert.equal(r.fase.titulo, 'Reconhecer as cores', 'a fase existe: a tela comemora (spec D7)');
  assert.equal(g.chamadas.length, 0);
});

test('jogar a mesma fase de novo nao grava de novo', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: FASES, gravar: g.gravar });

  await ponte.faseConcluida('contar-ate-10');
  const r = await ponte.faseConcluida('contar-ate-10');

  assert.equal(r.motivo, 'repetida');
  assert.ok(r.fase, 'a repeticao tambem e comemorada');
  assert.equal(g.chamadas.length, 1);
});

test('gravacao que falhou de vez deixa a proxima conclusao tentar de novo', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: FASES, gravar: g.gravar });

  g.falharDaquiPraFrente(true);
  await assert.rejects(ponte.faseConcluida('contar-ate-10'));

  g.falharDaquiPraFrente(false);
  const r = await ponte.faseConcluida('contar-ate-10');
  assert.equal(r.gravou, true, 'a falha nao pode marcar a fase como ja gravada');
  assert.equal(g.chamadas.length, 2);
});

test('sem lista de fases configurada, nenhuma fase grava', async () => {
  const g = gravacaoFalsa();
  const ponte = criarPonte({ idAluno: 'a1', atividades: ATIVIDADES, fases: [], gravar: g.gravar });

  const r = await ponte.faseConcluida('contar-ate-10');
  assert.equal(r.motivo, 'fase-desconhecida');
  assert.equal(g.chamadas.length, 0);
});
