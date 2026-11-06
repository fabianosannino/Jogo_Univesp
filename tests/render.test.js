import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparHtml,
  renderGrade,
  renderAreaAluno,
  renderSeletorAvatar,
  renderEscolhaTurma,
  renderEscolhaAluno,
  renderFasesDoJogo,
  renderProgressoDoAluno,
} from '../js/render.js';
import { existsSync } from 'node:fs';
import { URL_DOWNLOAD_JOGO, AVATARES } from '../js/config.js';
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

// --- o campo de avatar do formulario de cadastro ---
//
// Contexto do bug, visto no navegador em 2026-10-31: depois de cadastrar a Ana
// com a coruja, a tela redesenha o campo e ele volta para "Coruja (em uso)".
// Numa turma de doze o professor repete isso doze vezes, e na pressa cadastra
// dois alunos com o mesmo bichinho. O plano ja dizia por que isso importa:
// "dois alunos ficam indistinguiveis na tela -- que e exatamente o erro que a
// crianca comete sozinha". Para a crianca que nao le, o bichinho E o nome dela.

function opcoesDe(html) {
  return html.match(/<option[^>]*>/g) ?? [];
}

test('o campo de avatar ja vem no primeiro bichinho livre', () => {
  // Coruja e raposa sao os dois primeiros da lista, e estao tomados.
  const html = renderSeletorAvatar(['coruja', 'raposa']);
  const selecionadas = opcoesDe(html).filter((o) => o.includes('selected'));

  assert.equal(selecionadas.length, 1, 'exatamente uma opcao pre-selecionada');
  assert.ok(
    selecionadas[0].includes(`value="${AVATARES[2].id}"`),
    `esperava ${AVATARES[2].id}, o terceiro da lista; veio ${selecionadas[0]}`
  );
});

test('sem ninguem cadastrado, o campo vem no primeiro da lista', () => {
  const selecionadas = opcoesDe(renderSeletorAvatar([])).filter((o) => o.includes('selected'));
  assert.equal(selecionadas.length, 1);
  assert.ok(selecionadas[0].includes(`value="${AVATARES[0].id}"`));
});

test('bichinho em uso nao da para escolher, nao so avisa', () => {
  const html = renderSeletorAvatar(['coruja']);
  const opcoes = opcoesDe(html);

  const coruja = opcoes.find((o) => o.includes('value="coruja"'));
  assert.ok(coruja.includes('disabled'), 'a coruja ja e da Ana: o campo tem de barrar');

  const livres = opcoes.filter((o) => !o.includes('value="coruja"'));
  for (const o of livres) {
    assert.ok(!o.includes('disabled'), `bichinho livre bloqueado: ${o}`);
  }
});

// Sao 30 avatares e o plano fala de turmas de 20 a 30 alunos: a turma que
// chega no 31o aluno existe. Se o campo bloqueasse tudo, o professor
// simplesmente nao conseguiria cadastrar essa crianca -- seria trocar um
// incomodo por uma parede. Quando nao sobra bichinho, o campo libera a
// repeticao e o rotulo "(em uso)" volta a ser o que era: um aviso.
test('turma que esgotou os bichinhos ainda deixa cadastrar', () => {
  const html = renderSeletorAvatar(AVATARES.map((a) => a.id));
  const opcoes = opcoesDe(html);

  assert.ok(!html.includes('disabled'), 'nada bloqueado quando nao sobra escolha');
  assert.equal(
    opcoes.filter((o) => o.includes('selected')).length,
    1,
    'o campo nao pode ficar vazio: tem de dar para enviar o formulario'
  );
  assert.ok(html.includes('(em uso)'), 'o aviso continua visivel');
});

// --- tela do aluno: turma -> nome -> estrelas e jogo ---
//
// A crianca escolhe a turma, depois o proprio nome, ve as proprias estrelas
// (decisao do grupo em 2026-11-06) e baixa o jogo direto, sem pagina
// intermediaria. Nao digita nada.

const TURMAS = [
  { id: 't1', nome: 'Turma Girassol' },
  { id: 't2', nome: 'Turma <b>Sol</b>' },
];

test('a escolha de turma mostra o nome de cada turma, escapado', () => {
  const html = renderEscolhaTurma(TURMAS);
  assert.match(html, /Qual é a sua turma\?/);
  assert.ok(html.includes('data-turma="t1"'));
  assert.ok(html.includes('Turma Girassol'));
  assert.ok(html.includes('Turma &lt;b&gt;Sol&lt;/b&gt;'), 'nome de turma tem de ser escapado');
  assert.ok(!html.includes('<b>'));
});

test('sem turmas, a tela pede o professor', () => {
  assert.match(renderEscolhaTurma([]), /class="aviso"/);
});

test('a escolha de aluno mostra a turma e todos os alunos com o bichinho', () => {
  const html = renderEscolhaAluno(TURMAS[0], ALUNOS);
  assert.ok(html.includes('Turma Girassol'), 'o nome da turma aparece');
  assert.match(html, /Quem é você\?/);
  for (const a of ALUNOS) {
    assert.ok(html.includes(`data-aluno="${a.id}"`), `falta o botao de ${a.nome}`);
    assert.ok(html.includes(a.nome));
  }
  assert.ok(html.includes('\u{1F989}'), 'o bichinho da Ana (coruja) aparece');
  assert.ok(html.includes('data-voltar="turma"'), 'da para trocar de turma');
});

test('turma sem alunos avisa e deixa voltar', () => {
  const html = renderEscolhaAluno(TURMAS[0], []);
  assert.match(html, /class="aviso"/);
  assert.ok(html.includes('data-voltar="turma"'));
});

test('o botao de baixar aponta direto para o arquivo do jogo', () => {
  assert.notEqual(URL_DOWNLOAD_JOGO, '', 'o jogo precisa estar hospedado');
  const html = renderAreaAluno(ALUNOS[0]);
  assert.match(html, /class="botao-baixar"/, 'falta o botao de baixar');
  assert.ok(html.includes(`href="${URL_DOWNLOAD_JOGO}"`), 'o link tem de ser o arquivo, sem pagina intermediaria');
  assert.ok(!html.includes('.html'), 'nao pode levar a outra pagina');
  assert.equal((html.match(/<a /g) ?? []).length, 1, 'o download e o unico link da tela');
  assert.ok(html.includes('Oi, Ana!'), 'cumprimenta o aluno escolhido');
  assert.ok(html.includes('data-voltar="aluno"'), 'da para dizer "nao sou eu"');
});

function linhaDaAna(progresso = [{ aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' }]) {
  return montarLinhaDoAluno(montarGrade(ALUNOS, ATIVIDADES, progresso), 'a1');
}

test('a tela do aluno mostra as estrelas dele, e so as dele', () => {
  const html = renderAreaAluno(ALUNOS[0], linhaDaAna());
  assert.match(html, /Você já conseguiu <strong>1 de 2<\/strong>/);
  assert.match(html, /class="atividade concluida"/);
  assert.match(html, /class="atividade pendente"/);
  assert.ok(html.includes('Contar ate 10') && html.includes('Cores'));
  assert.ok(!html.includes('Bruno'), 'nao aparece progresso de colega');
});

test('estrela vale para o que a professora marcou e para o que o jogo gravou', () => {
  const html = renderProgressoDoAluno(linhaDaAna([{ aluno_id: 'a1', atividade_id: 'at2', origem: 'jogo' }]));
  assert.match(html, /1 de 2/);
});

test('atividade pendente nao leva X nem vermelho (spec D7)', () => {
  const html = renderAreaAluno(ALUNOS[0], linhaDaAna([]));
  assert.ok(!/\u274C|\u2716/.test(html));
  assert.match(html, /0 de 2/);
});

test('turma sem atividades nao mostra contagem vazia', () => {
  const linha = montarLinhaDoAluno(montarGrade(ALUNOS, [], []), 'a1');
  assert.ok(!renderAreaAluno(ALUNOS[0], linha).includes('conseguiu'));
});

test('nenhuma tela do aluno tem controle de escrita (spec D3)', () => {
  const telas = [
    renderEscolhaTurma(TURMAS),
    renderEscolhaAluno(TURMAS[0], ALUNOS),
    renderAreaAluno(ALUNOS[0], linhaDaAna()),
    renderAreaAluno(ALUNOS[0], linhaDaAna(), { caminhoJogoWeb: 'jogo-web/index.html' }),
    renderAreaAluno(),
  ];
  for (const html of telas) {
    assert.ok(!/<canvas/i.test(html), 'nao pode haver jogo desenhado na tela');
    assert.ok(!html.includes('aria-pressed'), 'nenhum botao de marcar');
    assert.ok(!html.includes('class="celula"'), 'nenhuma celula da grade');
    for (const tag of ['<input', '<textarea', '<select', '<form']) {
      assert.ok(!html.includes(tag), `a crianca nao digita nada (${tag})`);
    }
  }
});

test('a pagina intermediaria de download nao existe mais', () => {
  assert.ok(!existsSync(new URL('../baixar.html', import.meta.url)));
});

// Um endereco http:// num link que a escola vai clicar e um download que
// qualquer rede intermediaria pode trocar por outro arquivo. Este teste nao
// deixa a constante cair para http por descuido numa troca de hospedagem.
test('a URL do jogo e https', () => {
  assert.match(URL_DOWNLOAD_JOGO, /^https:\/\//, 'o download tem de ser por https');
});

test('grade vazia oferece o atalho para cadastrar o que falta', () => {
  assert.match(renderGrade(montarGrade([], [], [])), /data-ir-aba="alunos".*data-ir-aba="atividades"/s);
  assert.match(renderGrade(montarGrade([], ATIVIDADES, [])), /data-ir-aba="alunos"/);
  assert.match(renderGrade(montarGrade(ALUNOS, [], [])), /data-ir-aba="atividades"/);
});

// --- grade com o que o jogo gravou ---

function celulaDaAna(html) {
  return html.match(/<td><button[^>]*data-aluno="a1"[^>]*data-atividade="at1"[^>]*>.*?<\/td>/)[0];
}

test('celula so com registro do jogo NAO aparece como marcada pela professora', () => {
  const html = renderGrade(montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ]));
  const celula = celulaDaAna(html);
  // Se viesse apertada, o clique mandaria "desmarcar", que so apaga a origem
  // professor: a marca ficaria presa na tela.
  assert.match(celula, /aria-pressed="false"/);
  assert.match(celula, /aria-label="Marcar Contar ate 10 de Ana \(já concluída no jogo\)"/);
  assert.match(celula, /class="selo-jogo"/, 'falta o selo do jogo');
  assert.ok(!celula.includes('\u2714'), 'o visto e so da professora');
});

test('celula com professora e jogo mostra os dois, separados', () => {
  const celula = celulaDaAna(renderGrade(montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ])));
  assert.match(celula, /aria-pressed="true"/);
  assert.ok(celula.includes('\u2714'));
  assert.match(celula, /class="selo-jogo"/);
});

test('a legenda do selo so aparece quando ha registro do jogo', () => {
  const semJogo = renderGrade(montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]));
  assert.ok(!semJogo.includes('class="legenda"'), 'turma sem jogo fica com a grade de sempre');
  assert.ok(!semJogo.includes('selo-jogo'));

  const comJogo = renderGrade(montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a2', atividade_id: 'at2', origem: 'jogo' },
  ]));
  assert.match(comJogo, /class="legenda"/);
});

test('aviso das fases do jogo some quando nao falta nenhuma', () => {
  assert.equal(renderFasesDoJogo([]), '');
  assert.equal(renderFasesDoJogo(undefined), '');
});

test('aviso das fases do jogo lista as que faltam, escapadas, e oferece o botao', () => {
  const html = renderFasesDoJogo([
    { codigo: 'x', titulo: '<b>Cores</b>' },
    { codigo: 'y', titulo: 'Contar' },
  ]);
  assert.match(html, /2 fases/);
  assert.ok(html.includes('&lt;b&gt;Cores&lt;/b&gt;'));
  assert.ok(!html.includes('<b>Cores</b>'));
  assert.match(html, /id="incluir-fases"/);
});

// --- jogo online e offline ---
//
// CAMINHO_JOGO_WEB vazio = so a versao Windows (offline), como hoje.
// Preenchido = "Jogar online" grava; o download continua como "offline".

const ONLINE = { caminhoJogoWeb: 'jogo-web/index.html' };

test('sem o jogo online, nenhuma tela do aluno mostra "Jogar"', () => {
  for (const html of [renderAreaAluno(ALUNOS[0], linhaDaAna(), { caminhoJogoWeb: '' }), renderAreaAluno(null, null, { caminhoJogoWeb: '' })]) {
    assert.ok(!html.includes('botao-jogar'));
    assert.ok(!html.includes('jogar.html'));
    assert.ok(!html.includes('nota-versoes'), 'com uma versao so, nao ha o que explicar');
    assert.match(html, /Baixar o jogo \(versão para Windows\)/);
  }
});

test('com o jogo online, a tela da crianca leva o id dela ao jogo', () => {
  const html = renderAreaAluno(ALUNOS[0], linhaDaAna(), ONLINE);
  assert.match(html, /class="botao-jogar" href="jogar\.html\?aluno=a1"/);
  assert.match(html, /Jogar online</);
  assert.match(html, /Baixar para jogar offline \(Windows\)/, 'o .exe continua como opcao offline');
  assert.match(html, /não se comunicam/, 'a tela avisa que o offline nao conta aqui');
});

test('sem saber quem e a crianca, joga online sem salvar', () => {
  const html = renderAreaAluno(null, null, ONLINE);
  assert.match(html, /class="botao-jogar" href="jogar\.html"/, 'sem id: nao ha para quem gravar');
  assert.match(html, /sem salvar/);
});

test('"Jogar" nunca aparece nas telas de escolha', () => {
  assert.ok(!renderEscolhaTurma(TURMAS).includes('botao-jogar'));
  assert.ok(!renderEscolhaAluno(TURMAS[0], ALUNOS).includes('botao-jogar'));
});

test('id estranho no botao Jogar vai codificado e escapado', () => {
  const aluno = { id: 'a"1&<x>', nome: 'Ana', avatar: 'coruja' };
  const html = renderAreaAluno(aluno, null, ONLINE);
  assert.ok(html.includes('href="jogar.html?aluno=a%221%26%3Cx%3E"'));
  assert.ok(!html.includes('<x>'));
});
