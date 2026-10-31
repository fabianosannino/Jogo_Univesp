// Verifica, contra o banco real, que um professor nao alcanca a turma do
// outro. Usa apenas fetch e a API REST do Supabase: zero dependencias.
//
// Uso:
//   node tests/politicas.integracao.js
//
// Exige duas contas de professor ja criadas, informadas por variavel de
// ambiente, para nao deixar credencial no repositorio:
//   PROF_A_EMAIL  PROF_A_SENHA  PROF_B_EMAIL  PROF_B_SENHA

import assert from 'node:assert/strict';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';

const exigido = (nome) => {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variavel de ambiente ${nome}`);
  return v;
};

async function logar(email, senha) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const corpo = await r.json();
  if (!r.ok) throw new Error(`login falhou para ${email}: ${JSON.stringify(corpo)}`);
  return { token: corpo.access_token, id: corpo.user.id };
}

function rest(sessao) {
  return async (caminho, opcoes = {}) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
      ...opcoes,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessao.token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(opcoes.headers ?? {}),
      },
    });
    const texto = await r.text();
    return { ok: r.ok, status: r.status, corpo: texto ? JSON.parse(texto) : null };
  };
}

const a = await logar(exigido('PROF_A_EMAIL'), exigido('PROF_A_SENHA'));
const b = await logar(exigido('PROF_B_EMAIL'), exigido('PROF_B_SENHA'));
const comoA = rest(a);
const comoB = rest(b);

// A cria uma turma com um aluno
const turmaA = await comoA('turma', {
  method: 'POST',
  body: JSON.stringify({ nome: '__integracao_A__', professor: a.id }),
});
assert.ok(turmaA.ok, `A nao conseguiu criar a propria turma: ${JSON.stringify(turmaA.corpo)}`);
const idTurmaA = turmaA.corpo[0].id;

const alunoA = await comoA('aluno', {
  method: 'POST',
  body: JSON.stringify({ turma_id: idTurmaA, nome: 'Ana', avatar: 'coruja' }),
});
assert.ok(alunoA.ok, 'A nao conseguiu criar aluno na propria turma');

try {
  // B nao le a turma de A
  const lidas = await comoB(`turma?id=eq.${idTurmaA}`);
  assert.deepEqual(lidas.corpo, [], 'FALHA GRAVE: B leu a turma de A');

  // B nao le os alunos de A
  const alunos = await comoB(`aluno?turma_id=eq.${idTurmaA}`);
  assert.deepEqual(alunos.corpo, [], 'FALHA GRAVE: B leu os alunos de A');

  // B nao cria aluno na turma de A
  const invasao = await comoB('aluno', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurmaA, nome: 'Invasor', avatar: 'gato' }),
  });
  assert.equal(invasao.ok, false, 'FALHA GRAVE: B criou aluno na turma de A');

  // B nao apaga a turma de A
  await comoB(`turma?id=eq.${idTurmaA}`, { method: 'DELETE' });
  const aindaExiste = await comoA(`turma?id=eq.${idTurmaA}`);
  assert.equal(aindaExiste.corpo.length, 1, 'FALHA GRAVE: B apagou a turma de A');

  console.log('OK: um professor nao alcanca a turma do outro');
} finally {
  await comoA(`turma?id=eq.${idTurmaA}`, { method: 'DELETE' });
}
