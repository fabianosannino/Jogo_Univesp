import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATARES, CAMINHO_JOGO_WEB, FASES_DO_JOGO } from '../js/config.js';
import { normalizarTitulo } from '../js/ponte-jogo.js';

test('existe avatar suficiente para uma turma', () => {
  assert.ok(AVATARES.length >= 30, 'cada crianca precisa de um bichinho so dela; turmas chegam a 30 alunos');
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

// --- as duas versoes do jogo ---

// O jogo avisa a plataforma por window.parent, e o navegador so deixa isso
// entre paginas do mesmo site. Um endereco de outro site abriria o jogo, mas
// nenhuma fase seria gravada -- e ninguem perceberia.
// Barra no inicio tambem quebra: o site mora em /Jogo_Univesp/, e "/jogo-web"
// aponta para a raiz do dominio (a mesma armadilha do login.html).
test('o jogo do navegador, se configurado, mora no mesmo site e em caminho relativo', () => {
  if (CAMINHO_JOGO_WEB === '') return;
  assert.doesNotMatch(CAMINHO_JOGO_WEB, /^[a-z][a-z0-9+.-]*:/i, 'sem http(s):// nem outro esquema');
  assert.doesNotMatch(CAMINHO_JOGO_WEB, /^\//, 'sem barra no inicio');
  assert.match(CAMINHO_JOGO_WEB, /\.html$/, 'aponta para o index.html da build');
});

test('toda fase do jogo tem codigo simples e titulo', () => {
  for (const f of FASES_DO_JOGO) {
    assert.match(f.codigo, /^[a-z0-9]+(-[a-z0-9]+)*$/, `codigo invalido: ${f.codigo}`);
    assert.ok(normalizarTitulo(f.titulo).length > 0, `titulo vazio em ${f.codigo}`);
  }
});

test('nenhuma fase repete codigo nem titulo', () => {
  const codigos = FASES_DO_JOGO.map((f) => f.codigo);
  const titulos = FASES_DO_JOGO.map((f) => normalizarTitulo(f.titulo));
  assert.equal(new Set(codigos).size, codigos.length, 'duas fases com o mesmo codigo');
  // Dois titulos iguais cairiam na mesma atividade, e uma fase apagaria a outra.
  assert.equal(new Set(titulos).size, titulos.length, 'duas fases com o mesmo titulo');
});
