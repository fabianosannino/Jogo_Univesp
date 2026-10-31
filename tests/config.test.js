import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATARES } from '../js/config.js';

test('existe avatar suficiente para uma turma', () => {
  assert.ok(AVATARES.length >= 12, 'uma turma tem 20 a 30 alunos; 12 e o minimo util');
});

test('todo avatar tem id, rotulo e emoji', () => {
  for (const a of AVATARES) {
    assert.match(a.id, /^[a-z]+$/, `id invalido: ${a.id}`);
    assert.ok(a.rotulo.length > 0, `rotulo vazio em ${a.id}`);
    assert.ok(a.emoji.length > 0, `emoji vazio em ${a.id}`);
  }
});

test('nenhum id de avatar repetido', () => {
  const ids = AVATARES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'dois avatares com o mesmo id');
});
