import { test } from 'node:test';
import assert from 'node:assert/strict';

import { traduzirErroAuth } from '../js/mensagens.js';

// A regra que vale para todos: o professor nunca le ingles tecnico.
const EM_PORTUGUES = /^[^a-z]*[A-Z]/;

test('erro de senha errada vira frase que o professor entende', () => {
  assert.equal(
    traduzirErroAuth('Invalid login credentials'),
    'E-mail ou senha incorretos.'
  );
});

test('conta sem confirmacao diz o que fazer antes de entrar', () => {
  assert.equal(
    traduzirErroAuth('Email not confirmed'),
    'Confirme o e-mail antes de entrar.'
  );
});

test('e-mail repetido avisa que ja existe conta', () => {
  assert.equal(
    traduzirErroAuth('User already registered'),
    'Este e-mail ja tem conta.'
  );
});

test('senha curta diz o tamanho minimo', () => {
  assert.match(
    traduzirErroAuth('Password should be at least 6 characters'),
    /6 caracteres/
  );
});

// Este e o erro que o professor levou na pratica. Antes desta traducao a tela
// de cadastro mostrava "email rate limit exceeded" sem mais nada.
test('limite de e-mail do Supabase manda esperar, nao mostra ingles', () => {
  const esperado = 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.';
  assert.equal(traduzirErroAuth('email rate limit exceeded'), esperado);
  assert.equal(traduzirErroAuth('over_email_send_rate_limit'), esperado);
});

test('autocadastro desligado manda procurar a equipe', () => {
  assert.match(
    traduzirErroAuth('Signups not allowed for this instance'),
    /cadastro esta fechado/
  );
});

test('e-mail mal digitado pede para conferir a escrita', () => {
  assert.match(
    traduzirErroAuth('Unable to validate email address: invalid format'),
    /nao parece valido/
  );
});

test('sem internet nao fala de fetch', () => {
  const texto = traduzirErroAuth('TypeError: Failed to fetch');
  assert.equal(texto, 'Sem conexao com a internet.');
  assert.doesNotMatch(texto, /fetch/i);
});

test('a traducao nao depende da caixa das letras do Supabase', () => {
  // O texto exato muda entre versoes do GoTrue; a comparacao e minuscula.
  assert.equal(
    traduzirErroAuth('INVALID LOGIN CREDENTIALS'),
    traduzirErroAuth('invalid login credentials')
  );
});

test('erro desconhecido devolve o texto original, nao uma frase generica', () => {
  // Deliberado: uma mensagem estranha permite diagnostico, "Erro inesperado"
  // nao permite nada. Se alguem trocar isto por um texto fixo, este teste cai.
  assert.equal(traduzirErroAuth('Some brand new GoTrue failure'), 'Some brand new GoTrue failure');
});

test('nenhuma traducao conhecida vaza termo tecnico em ingles', () => {
  const conhecidos = [
    'Invalid login credentials',
    'Email not confirmed',
    'User already registered',
    'Password should be at least 6 characters',
    'email rate limit exceeded',
    'Signups not allowed for this instance',
    'Unable to validate email address: invalid format',
    'Failed to fetch',
  ];
  for (const bruto of conhecidos) {
    const texto = traduzirErroAuth(bruto);
    assert.notEqual(texto, bruto, `"${bruto}" ficou sem traducao`);
    assert.match(texto, EM_PORTUGUES, `"${texto}" nao parece frase para o professor`);
  }
});
