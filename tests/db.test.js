import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb } from '../js/db.js';

// Cliente Supabase falso. O construtor de consulta do Supabase e encadeavel e
// "thenable": da para usar await nele. O falso registra as chamadas na ordem.
function clienteFalso(resposta = { data: [], error: null }) {
  const chamadas = [];
  const alvo = {
    select(cols)      { chamadas.push(['select', cols]);      return alvo; },
    insert(linhas)    { chamadas.push(['insert', linhas]);    return alvo; },
    delete()          { chamadas.push(['delete']);            return alvo; },
    eq(col, val)      { chamadas.push(['eq', col, val]);      return alvo; },
    order(col, opts)  { chamadas.push(['order', col, opts]);  return alvo; },
    single()          { chamadas.push(['single']);            return alvo; },
    then(ok, falha)   { return Promise.resolve(resposta).then(ok, falha); },
  };
  return {
    chamadas,
    from(tabela) { chamadas.push(['from', tabela]); return alvo; },
  };
}

test('listarTurmas le a tabela turma em ordem de nome', async () => {
  const cliente = clienteFalso({ data: [{ id: 't1', nome: 'Turma A' }], error: null });
  const turmas = await criarDb(cliente).listarTurmas();

  assert.deepEqual(turmas, [{ id: 't1', nome: 'Turma A' }]);
  assert.deepEqual(cliente.chamadas[0], ['from', 'turma']);
  assert.ok(cliente.chamadas.some(([m, c]) => m === 'order' && c === 'nome'));
});

test('criarTurma grava nome e professor', async () => {
  const cliente = clienteFalso({ data: { id: 't1', nome: 'Turma A' }, error: null });
  const turma = await criarDb(cliente).criarTurma('Turma A', 'prof-1');

  assert.deepEqual(turma, { id: 't1', nome: 'Turma A' });
  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], { nome: 'Turma A', professor: 'prof-1' });
});

test('listarAlunos filtra pela turma e ordena por nome', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarAlunos('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'aluno']);
  assert.ok(cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'turma_id' && v === 't1'));
  assert.ok(cliente.chamadas.some(([m, c]) => m === 'order' && c === 'nome'));
});

test('criarAluno grava turma, nome e avatar', async () => {
  const cliente = clienteFalso({ data: { id: 'a1' }, error: null });
  await criarDb(cliente).criarAluno('t1', 'Joao', 'coruja');

  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], { turma_id: 't1', nome: 'Joao', avatar: 'coruja' });
});

test('listarAtividades ordena pelo campo ordem, nao pelo titulo', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarAtividades('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'atividade']);
  assert.ok(
    cliente.chamadas.some(([m, c]) => m === 'order' && c === 'ordem'),
    'a sequencia pedagogica e a ordem definida pelo professor'
  );
});

test('marcar grava origem professor', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  await criarDb(cliente).marcar('a1', 'at1');

  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], {
    aluno_id: 'a1',
    atividade_id: 'at1',
    origem: 'professor',
  });
});

test('desmarcar apaga apenas o registro do professor', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  await criarDb(cliente).desmarcar('a1', 'at1');

  assert.ok(cliente.chamadas.some(([m]) => m === 'delete'));
  assert.ok(
    cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'origem' && v === 'professor'),
    'desmarcar nao pode apagar o que o jogo registrou'
  );
});

test('listarProgresso filtra pela turma do aluno', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarProgresso('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'progresso']);
  assert.ok(cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'aluno.turma_id' && v === 't1'));
});

test('erro do banco virar excecao com mensagem legivel', async () => {
  const cliente = clienteFalso({ data: null, error: { message: 'permission denied' } });
  await assert.rejects(
    () => criarDb(cliente).listarTurmas(),
    /permission denied/
  );
});

test('data nulo em listagem devolve lista vazia, nao nulo', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  assert.deepEqual(await criarDb(cliente).listarTurmas(), []);
});
