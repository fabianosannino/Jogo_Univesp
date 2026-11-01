import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb } from '../js/db.js';

// Cliente Supabase falso. O construtor de consulta do Supabase e encadeavel e
// "thenable": da para usar await nele. O falso registra as chamadas na ordem.
function clienteFalso(resposta = { data: [], error: null }) {
  const chamadas = [];
  const alvo = {
    select(cols)            { chamadas.push(['select', cols]);            return alvo; },
    insert(linhas)          { chamadas.push(['insert', linhas]);          return alvo; },
    upsert(linhas, opcoes)  { chamadas.push(['upsert', linhas, opcoes]);  return alvo; },
    delete()                { chamadas.push(['delete']);                   return alvo; },
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
  const turmas = await criarDb(cliente).listarTurmas('prof-1');

  assert.deepEqual(turmas, [{ id: 't1', nome: 'Turma A' }]);
  assert.deepEqual(cliente.chamadas[0], ['from', 'turma']);
  assert.ok(cliente.chamadas.some(([m, c]) => m === 'order' && c === 'nome'));
});

// Cinto e suspensorio. Quem de fato impede um professor de ver a turma do outro
// e a Row Level Security do banco, e isso esta provado pelo teste de integracao
// de sql/politicas.sql. Mas era defesa em uma unica camada: politica de RLS
// errada falha em silencio -- ela simplesmente para de filtrar -- e a aplicacao
// nao segurava nada por conta propria.
test('listarTurmas filtra pelo professor, nao confia so na RLS', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarTurmas('prof-1');

  assert.ok(
    cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'professor' && v === 'prof-1'),
    'faltou o .eq("professor", id) na consulta'
  );
});

// O modo de falhar que importa: id vazio virando consulta sem filtro nao da
// erro na tela -- da uma tela que lista a turma de outro professor como se
// fosse do dono da sessao. Entre falhar alto e filtrar por nada, falhar alto.
test('listarTurmas sem id de professor recusa em vez de listar tudo', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  const db = criarDb(cliente);

  await assert.rejects(() => db.listarTurmas(), /professor/i);
  await assert.rejects(() => db.listarTurmas(''), /professor/i);
  assert.equal(cliente.chamadas.length, 0, 'nao pode nem chegar a consultar o banco');
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

  const upsert = cliente.chamadas.find(([m]) => m === 'upsert');
  assert.deepEqual(upsert[1], {
    aluno_id: 'a1',
    atividade_id: 'at1',
    origem: 'professor',
  });
  assert.equal(upsert[2].onConflict, 'aluno_id,atividade_id,origem');
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

test('listarProgresso nao deixa a chave da juncao escapar', async () => {
  const cliente = clienteFalso({
    data: [{ aluno_id: 'a1', atividade_id: 't1', origem: 'professor', aluno: { turma_id: 'x' } }],
    error: null,
  });
  const linhas = await criarDb(cliente).listarProgresso('x');

  assert.deepEqual(linhas, [{ aluno_id: 'a1', atividade_id: 't1', origem: 'professor' }]);
});

test('erro do banco virar excecao com mensagem legivel', async () => {
  const cliente = clienteFalso({ data: null, error: { message: 'permission denied' } });
  await assert.rejects(
    () => criarDb(cliente).listarTurmas('prof-1'),
    /permission denied/
  );
});

test('data nulo em listagem devolve lista vazia, nao nulo', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  assert.deepEqual(await criarDb(cliente).listarTurmas('prof-1'), []);
});
