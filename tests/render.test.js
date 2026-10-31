import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparHtml,
  renderGrade,
  renderAvataresDaTurma,
  renderProgressoDoAluno,
  renderAreaAluno,
} from '../js/render.js';
import { URL_DOWNLOAD_JOGO } from '../js/config.js';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';

const ALUNOS = [
  { id: 'a1', nome: 'Ana', avatar: 'coruja' },
  { id: 'a2', nome: 'Bruno', avatar: 'raposa' },
];
const ATIVIDADES = [
  { id: 'at1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 'at2', titulo: 'Cores', ordem: 2 },
];

// --- Review Focus 1: nome vindo da escola entra em HTML gerado ---

test('escaparHtml neutraliza os cinco caracteres perigosos', () => {
  assert.equal(
    escaparHtml(`<script>alert("x")&'`),
    '&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;'
  );
});

test('escaparHtml aceita nao-string sem quebrar', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(7), '7');
});

test('nome de aluno com tag nao vira HTML na grade', () => {
  const alunos = [{ id: 'a1', nome: '<img src=x onerror=alert(1)>', avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(!html.includes('<img'), 'tag do nome foi interpretada como HTML');
  assert.ok(html.includes('&lt;img'), 'o nome deve aparecer como texto literal');
});

test('nome com & e aspas aparece legivel', () => {
  const alunos = [{ id: 'a1', nome: `Ana & "Bia"`, avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(html.includes('Ana &amp; &quot;Bia&quot;'));
});

test('titulo de atividade com tag nao vira HTML', () => {
  const ats = [{ id: 'at1', titulo: '<b>Cores</b>', ordem: 1 }];
  const html = renderGrade(montarGrade(ALUNOS, ats, []));
  assert.ok(!html.includes('<b>Cores</b>'));
  assert.ok(html.includes('&lt;b&gt;Cores&lt;/b&gt;'));
});

// --- grade do professor ---

test('grade tem uma celula clicavel por aluno e atividade', () => {
  const html = renderGrade(montarGrade(ALUNOS, ATIVIDADES, []));
  for (const a of ALUNOS) {
    for (const at of ATIVIDADES) {
      assert.ok(
        html.includes(`data-aluno="${a.id}"`) && html.includes(`data-atividade="${at.id}"`),
        `falta a celula ${a.id}/${at.id}`
      );
    }
  }
});

test('celula concluida e marcada; pendente nao recebe marca de erro', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderGrade(g);
  assert.ok(html.includes('aria-pressed="true"'), 'falta estado marcado');
  assert.ok(html.includes('aria-pressed="false"'), 'falta estado pendente');
  assert.ok(!/\u274C|\u2716/.test(html), 'pendente nao pode levar X (spec D7)');
});

test('grade vazia explica o que falta em vez de mostrar nada', () => {
  assert.match(renderGrade(montarGrade([], [], [])), /aluno/i);
  assert.match(renderGrade(montarGrade([], ATIVIDADES, [])), /aluno/i);
  assert.match(renderGrade(montarGrade(ALUNOS, [], [])), /atividade/i);
});

// --- telas do aluno ---

test('seletor de avatar tem um botao grande por aluno', () => {
  const html = renderAvataresDaTurma(ALUNOS);
  assert.ok(html.includes('data-aluno="a1"'));
  assert.ok(html.includes('data-aluno="a2"'));
  assert.ok(html.includes('\u{1F989}'), 'falta o emoji da coruja');
  assert.ok(html.includes('Ana'), 'o nome acompanha o avatar');
});

test('avatar desconhecido nao quebra o seletor', () => {
  const html = renderAvataresDaTurma([{ id: 'a9', nome: 'Caio', avatar: 'dinossauro' }]);
  assert.ok(html.includes('Caio'));
  assert.ok(html.includes('data-aluno="a9"'));
});

test('progresso do aluno nao tem nenhum controle de escrita', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderProgressoDoAluno(montarLinhaDoAluno(g, 'a1'));

  assert.ok(html.includes('Contar ate 10'));
  assert.ok(!html.includes('<input'), 'o aluno nao digita nada (spec D3)');
  assert.ok(!html.includes('data-atividade='), 'nenhuma celula clicavel na tela do aluno');
  assert.ok(!/\u274C|\u2716/.test(html), 'atividade pendente nao leva X (spec D7)');
});

test('progresso mostra quantas atividades foram concluidas', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderProgressoDoAluno(montarLinhaDoAluno(g, 'a1'));
  assert.match(html, /1\s*\D{0,12}2/, 'esperado algo como "1 de 2"');
});

// Review Focus 5
test('area do aluno sem turma ativa manda chamar o professor', () => {
  const html = renderAreaAluno({ estado: 'sem-turma' });
  assert.match(html, /professor/i);
  assert.ok(!html.includes('data-aluno='), 'nao ha avatar para clicar');
});

test('area do aluno em carregamento nao fica em branco', () => {
  assert.ok(renderAreaAluno({ estado: 'carregando' }).trim().length > 0);
});

test('area do aluno com turma sem alunos explica a situacao', () => {
  const html = renderAreaAluno({ estado: 'escolher', alunos: [] });
  assert.match(html, /professor/i);
});

test('area do aluno nao tem nenhum controle de escrita', () => {
  const alunos = [
    { id: 'a1', nome: 'Ana', avatar: 'coruja' },
    { id: 'a2', nome: 'Bruno', avatar: 'tartaruga' },
  ];
  const atividades = [{ id: 't1', titulo: 'Contar ate 10', ordem: 1 }];
  const g = montarGrade(alunos, atividades, [
    { aluno_id: 'a1', atividade_id: 't1', origem: 'professor' },
  ]);

  const telas = [
    renderAreaAluno({ estado: 'sem-turma' }),
    renderAreaAluno({ estado: 'carregando' }),
    renderAreaAluno({ estado: 'erro' }),
    renderAreaAluno({ estado: 'escolher', alunos }),
    renderAreaAluno({ estado: 'progresso', linha: montarLinhaDoAluno(g, 'a1') }),
  ];

  for (const html of telas) {
    assert.ok(!html.includes('<input'), 'nenhum campo de entrada');
    assert.ok(!html.includes('<textarea'), 'nenhuma area de texto');
    assert.ok(!html.includes('<select'), 'nenhuma lista de selecao');
    assert.ok(!html.includes('<form'), 'nenhum formulario');
    assert.ok(!html.includes('class="celula"'), 'nenhuma celula de marcacao');
    assert.ok(!html.includes('aria-pressed'), 'nenhum botao de alternar estado');
  }
});

// O jogo foi publicado: a build mora num asset de Release e URL_DOWNLOAD_JOGO
// aponta para ela. Antes disto o teste afirmava o contrario (constante vazia,
// nenhum link em tela nenhuma) — era o verdadeiro daquele dia.
//
// O link tem de aparecer em TODAS as telas da crianca, inclusive nas de erro e
// de carregando: a crianca que chegou na tela do aluno veio para jogar, e se o
// banco esta fora do ar o download e justamente a unica coisa que ainda
// funciona. Esconder o botao quando da erro seria tirar o jogo da crianca por
// causa de um problema do servidor.
test('com o jogo publicado, toda tela do aluno oferece o download', () => {
  assert.notEqual(URL_DOWNLOAD_JOGO, '', 'o jogo precisa estar hospedado');

  const alunos = [{ id: 'a1', nome: 'Ana', avatar: 'coruja' }];
  const atividades = [{ id: 't1', titulo: 'Contar ate 10', ordem: 1 }];
  const g = montarGrade(alunos, atividades, [
    { aluno_id: 'a1', atividade_id: 't1', origem: 'professor' },
  ]);

  const telas = [
    renderAreaAluno({ estado: 'sem-turma' }),
    renderAreaAluno({ estado: 'carregando' }),
    renderAreaAluno({ estado: 'erro' }),
    renderAreaAluno({ estado: 'escolher', alunos }),
    renderAreaAluno({ estado: 'progresso', linha: montarLinhaDoAluno(g, 'a1') }),
  ];

  for (const html of telas) {
    assert.match(html, /class="botao-baixar"/, 'falta o botao de baixar');
    assert.ok(html.includes(`href="${URL_DOWNLOAD_JOGO}"`), 'o href nao e a URL configurada');
  }
});

// Um endereco http:// num link que a escola vai clicar e um download que
// qualquer rede intermediaria pode trocar por outro arquivo. Este teste nao
// deixa a constante cair para http por descuido numa troca de hospedagem.
test('a URL do jogo e https', () => {
  assert.match(URL_DOWNLOAD_JOGO, /^https:\/\//, 'o download tem de ser por https');
});
