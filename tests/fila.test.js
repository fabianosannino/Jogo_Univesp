import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarFila, armazenamentoSeguro } from '../js/fila.js';

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

// Corrida: enfileirar durante drenar nao pode perder item
test('enfileirar durante drenar nao perde itens da fila', async () => {
  // Cenario: fila tem [A, B]. Durante o envio de A, o usuario clica em desmarcar A
  // (mesma celula, acao oposta). Isso chama splice(0,1) no array ao vivo. O iterador
  // de for...of sobre array usa cursor numerico: o item B, que estava no indice 1,
  // cai para o indice 0, mas o cursor ja avancou para 1 -- B e pulado e some.
  const itemA = { acao: 'marcar', aluno_id: 'x1', atividade_id: 'z1' };
  const itemB = { acao: 'marcar', aluno_id: 'x2', atividade_id: 'z1' };
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(itemA);
  fila.enfileirar(itemB);

  let primeiraVez = true;
  const enviados = [];
  await fila.drenar(async (item) => {
    if (primeiraVez) {
      primeiraVez = false;
      // Simula o usuario clicando "desmarcar x1" enquanto o envio de A esta em voo.
      // splice remove A do array; o iterador pula B.
      fila.enfileirar({ acao: 'desmarcar', aluno_id: 'x1', atividade_id: 'z1' });
    }
    enviados.push(item);
  });

  // Invariante 1: A foi enviado (estava no snapshot)
  assert.ok(enviados.some((i) => i.aluno_id === 'x1'), 'A deve ter sido enviado');

  // Invariante 2: B nao pode sumir -- ou foi enviado, ou esta na fila
  const bEnviado = enviados.some((i) => i.aluno_id === 'x2');
  const bNaFila  = fila.itens().some((i) => i.aluno_id === 'x2');
  assert.ok(bEnviado || bNaFila, 'B nao pode desaparecer silenciosamente');

  // Invariante 3: desmarcar x1 enfileirado durante o drain nao pode sumir
  // (se A foi enviado com sucesso, desmarcar x1 deve estar na fila para a proxima tentativa)
  const desmarcarNaFila = fila.itens().some(
    (i) => i.aluno_id === 'x1' && i.acao === 'desmarcar',
  );
  assert.ok(desmarcarNaFila, 'desmarcar enfileirado durante drain deve sobreviver');
});

// Fix 1: armazenamentoSeguro -- tolera navegador que bloqueia localStorage
test('armazenamentoSeguro devolve o proprio armazenamento quando o acesso funciona', () => {
  const falso = armazenamentoFalso();
  const resultado = armazenamentoSeguro(() => falso);
  assert.strictEqual(resultado, falso, 'deve ser a mesma referencia');
});

test('armazenamentoSeguro devolve substituto inerte quando o acesso lanca', () => {
  const substituto = armazenamentoSeguro(() => { throw new Error('bloqueado'); });
  assert.equal(substituto.getItem('qualquer'), null, 'getItem deve devolver null');
  assert.doesNotThrow(() => substituto.setItem('k', 'v'), 'setItem nao pode lancar');

  // A fila deve seguir funcionando em memoria com o substituto
  const fila = criarFila(armazenamentoSeguro(() => { throw new Error('bloqueado'); }));
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1, 'a fila sobrevive ao armazenamento bloqueado');
});

// --- duas abas de professor.html na mesma maquina ---
//
// Acontece de verdade: o professor deixa a plataforma aberta numa aba, abre
// outra para conferir alguma coisa, e as duas passam a usar o mesmo
// localStorage com a mesma chave. Cada aba tem sua copia da fila em memoria e
// gravava a copia inteira por cima da do vizinho -- a ultima a gravar apagava
// as marcacoes da outra, em silencio. Perder marcacao de aluno e a falha que
// faz a escola abandonar a ferramenta (spec D6).

const CELULA_A = { acao: 'marcar', aluno_id: 'ana', atividade_id: 't1' };
const CELULA_B = { acao: 'marcar', aluno_id: 'bruno', atividade_id: 't2' };

test('duas abas offline nao apagam as marcacoes uma da outra', () => {
  const arm = armazenamentoFalso();
  const aba1 = criarFila(arm);
  const aba2 = criarFila(arm);

  aba1.enfileirar(CELULA_A);
  aba2.enfileirar(CELULA_B);   // antes, esta gravacao apagava a da aba1

  // Uma terceira leitura do mesmo armazenamento e o que sobrevive a um
  // recarregar de pagina: tem de ter as duas marcacoes.
  const depoisDeRecarregar = criarFila(arm);
  assert.equal(depoisDeRecarregar.tamanho(), 2, 'as duas marcacoes tem de estar no disco');

  const alunos = depoisDeRecarregar.itens().map((i) => i.aluno_id).sort();
  assert.deepEqual(alunos, ['ana', 'bruno']);
});

test('aba que envia com sucesso nao ressuscita o proprio item', async () => {
  const arm = armazenamentoFalso();
  const aba1 = criarFila(arm);
  const aba2 = criarFila(arm);

  aba1.enfileirar(CELULA_A);
  aba2.enfileirar(CELULA_B);

  // A aba1 volta a ter internet e envia o que era dela.
  const r = await aba1.drenar(async () => {});
  assert.equal(r.enviados, 1, 'a aba1 so tem o item dela para enviar');

  // O que sobra no disco e so o item da aba2. Se o item da aba1 voltasse,
  // o progresso da Ana seria enviado duas vezes.
  const depoisDeRecarregar = criarFila(arm);
  assert.deepEqual(depoisDeRecarregar.itens(), [CELULA_B]);
});

test('uma aba nao reabre o que a outra ja cancelou', () => {
  const arm = armazenamentoFalso();
  const aba1 = criarFila(arm);
  const aba2 = criarFila(arm);

  aba1.enfileirar(CELULA_A);
  aba1.enfileirar({ ...CELULA_A, acao: 'desmarcar' });  // professor desfez: anula
  assert.equal(aba1.tamanho(), 0);

  aba2.enfileirar(CELULA_B);

  const depoisDeRecarregar = criarFila(arm);
  assert.deepEqual(
    depoisDeRecarregar.itens(),
    [CELULA_B],
    'a celula anulada na aba1 nao pode voltar quando a aba2 grava'
  );
});
