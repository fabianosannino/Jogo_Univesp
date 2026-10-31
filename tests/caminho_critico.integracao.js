// Verifica, contra o banco real, o caminho que nao pode quebrar (spec §9):
// professor cria turma, aluno e atividade -> marca a atividade na grade ->
// a tela do aluno mostra a atividade marcada.
//
// Banco por fetch, tela pelos modulos puros. Zero dependencias.
//
// Nao se chama *.test.js de proposito: precisa de rede e de uma conta real,
// e `node --test tests/` nao deve tentar roda-lo.
//
// Uso:
//   PROF_A_EMAIL=... PROF_A_SENHA=... node tests/caminho_critico.integracao.js

import assert from 'node:assert/strict';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';
import { renderProgressoDoAluno } from '../js/render.js';

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

const prof = await logar(exigido('PROF_A_EMAIL'), exigido('PROF_A_SENHA'));
const como = rest(prof);

const turma = await como('turma', {
  method: 'POST',
  body: JSON.stringify({ nome: '__caminho_critico__', professor: prof.id }),
});
assert.ok(turma.ok, `nao criou a turma: ${JSON.stringify(turma.corpo)}`);
const idTurma = turma.corpo[0].id;

try {
  // nome com & de proposito: e o Review Focus 1 chegando ao HTML de verdade
  const aluno = await como('aluno', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, nome: 'Ana & Bruno', avatar: 'coruja' }),
  });
  assert.ok(aluno.ok, 'nao criou o aluno');
  const idAluno = aluno.corpo[0].id;

  const at1 = await como('atividade', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, titulo: 'Contar ate 10', ordem: 1 }),
  });
  const at2 = await como('atividade', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, titulo: 'Reconhecer as cores', ordem: 2 }),
  });
  assert.ok(at1.ok && at2.ok, 'nao criou as atividades');
  const idAt1 = at1.corpo[0].id;

  // marca a primeira, como a grade do professor faz
  const marca = await como('progresso', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: idAluno, atividade_id: idAt1, origem: 'professor' }),
  });
  assert.ok(marca.ok, 'nao marcou a atividade');

  // duplo clique: a mesma marcacao nao pode entrar duas vezes
  const repetida = await como('progresso', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: idAluno, atividade_id: idAt1, origem: 'professor' }),
  });
  assert.equal(repetida.ok, false, 'o banco aceitou marcacao duplicada');

  // le exatamente como a tela do aluno le
  const alunos = await como(
    `aluno?turma_id=eq.${idTurma}&select=id,nome,avatar&order=nome`
  );
  const atividades = await como(
    `atividade?turma_id=eq.${idTurma}&select=id,titulo,ordem&order=ordem`
  );
  const progresso = await como(
    `progresso?select=aluno_id,atividade_id,origem,aluno!inner(turma_id)` +
      `&aluno.turma_id=eq.${idTurma}`
  );

  const grade = montarGrade(alunos.corpo, atividades.corpo, progresso.corpo);
  const linha = montarLinhaDoAluno(grade, idAluno);
  assert.ok(linha, 'o aluno nao apareceu na grade');
  assert.equal(linha.celulas.length, 2, 'a grade nao tem as duas atividades');
  assert.equal(linha.concluidas, 1, 'a contagem nao deu 1 de 2');

  const html = renderProgressoDoAluno(linha);
  assert.match(html, /Contar ate 10/, 'a atividade marcada nao apareceu');
  assert.match(html, /atividade concluida/, 'a atividade nao apareceu como concluida');
  assert.match(html, /atividade pendente/, 'a atividade pendente nao apareceu');
  assert.match(html, /Ana &amp; Bruno/, 'o nome nao foi escapado');
  assert.ok(!html.includes('aria-pressed'), 'apareceu controle de escrita na tela do aluno');

  console.log('OK: caminho critico verificado de ponta a ponta');
} finally {
  // Apagar a turma leva aluno, atividade e progresso na cascata da Task 1.
  // Fica no finally para nao deixar lixo no banco se um assert falhar.
  await como(`turma?id=eq.${idTurma}`, { method: 'DELETE' });
}
