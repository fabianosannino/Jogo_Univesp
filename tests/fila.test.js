import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarFila } from '../js/fila.js';

// localStorage falso: a parte do contrato que a fila usa.
function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: (k) => { delete dados[k]; },
  };
}

const ITEM = { acao: 'marcar', aluno_id: 'a1', atividade_id: 't1' };

test('fila nova esta vazia', () => {
  const fila = criarFila(armazenamentoFalso());
  assert.equal(fila.tamanho(), 0);
  assert.deepEqual(fila.itens(), []);
});

test('enfileirar guarda o item', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1);
  assert.deepEqual(fila.itens(), [ITEM]);
});

test('enfileirar persiste no armazenamento', () => {
  const arm = armazenamentoFalso();
  criarFila(arm).enfileirar(ITEM);
  // uma fila nova, sobre o mesmo armazenamento, ve o que a anterior gravou
  assert.equal(criarFila(arm).tamanho(), 1);
});

test('o mesmo item nao entra duas vezes', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  fila.enfileirar({ ...ITEM });
  assert.equal(fila.tamanho(), 1, 'duplo clique nao pode virar duas marcacoes');
});

test('marcar e desmarcar a mesma celula se anulam', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar({ acao: 'marcar', aluno_id: 'a1', atividade_id: 't1' });
  fila.enfileirar({ acao: 'desmarcar', aluno_id: 'a1', atividade_id: 't1' });
  assert.equal(fila.tamanho(), 0, 'nao ha o que enviar: o estado voltou ao inicio');
});

test('drenar envia e esvazia', async () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  fila.enfileirar({ acao: 'marcar', aluno_id: 'a2', atividade_id: 't1' });

  const enviados = [];
  const r = await fila.drenar(async (item) => { enviados.push(item); });

  assert.equal(r.enviados, 2);
  assert.equal(r.pendentes, 0);
  assert.equal(fila.tamanho(), 0);
  assert.equal(enviados.length, 2);
});

test('o que falha fica na fila; o que passa sai', async () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar({ acao: 'marcar', aluno_id: 'ok', atividade_id: 't1' });
  fila.enfileirar({ acao: 'marcar', aluno_id: 'ruim', atividade_id: 't1' });

  const r = await fila.drenar(async (item) => {
    if (item.aluno_id === 'ruim') throw new Error('sem rede');
  });

  assert.equal(r.enviados, 1);
  assert.equal(r.pendentes, 1);
  assert.deepEqual(fila.itens(), [
    { acao: 'marcar', aluno_id: 'ruim', atividade_id: 't1' },
  ]);
});

test('o que falhou persiste para a proxima tentativa', async () => {
  const arm = armazenamentoFalso();
  const fila = criarFila(arm);
  fila.enfileirar(ITEM);
  await fila.drenar(async () => { throw new Error('sem rede'); });

  assert.equal(criarFila(arm).tamanho(), 1, 'recarregar a pagina nao pode perder a marcacao');
});

// Review Focus 4
test('JSON corrompido no armazenamento e descartado sem travar', () => {
  const arm = armazenamentoFalso({ fila_progresso: '{isto nao e json' });
  const fila = criarFila(arm);
  assert.equal(fila.tamanho(), 0);
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1, 'a fila volta a funcionar depois do lixo');
});

test('conteudo que nao e lista e descartado', () => {
  const arm = armazenamentoFalso({ fila_progresso: '{"a":1}' });
  assert.equal(criarFila(arm).tamanho(), 0);
});

test('itens sem os campos obrigatorios sao descartados', () => {
  const arm = armazenamentoFalso({
    fila_progresso: JSON.stringify([
      ITEM,
      { acao: 'marcar' },
      { acao: 'inventada', aluno_id: 'a1', atividade_id: 't1' },
    ]),
  });
  assert.deepEqual(criarFila(arm).itens(), [ITEM], 'so o item valido sobrevive');
});

test('armazenamento indisponivel nao derruba a fila', () => {
  const quebrado = {
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
    removeItem: () => {},
  };
  const fila = criarFila(quebrado);
  assert.equal(fila.tamanho(), 0);
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1, 'a fila segue na memoria mesmo sem conseguir gravar');
});
