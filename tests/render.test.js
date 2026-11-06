import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparHtml,
  renderGrade,
  renderAvataresDaTurma,
  renderProgressoDoAluno,
  renderAreaAluno,
  renderSeletorAvatar,
  renderFasesDoJogo,
} from '../js/render.js';
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

// --- grade com o que o jogo gravou ---

test('celula so com registro do jogo NAO aparece como marcada pela professora', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ]);
  const html = renderGrade(g);
  const celula = html.match(/<td><button[^>]*data-aluno="a1"[^>]*data-atividade="at1"[^>]*>.*?<\/td>/)[0];

  // Se viesse apertada, o clique mandaria "desmarcar", que so apaga a origem
  // professor: a marca ficaria presa na tela.
  assert.match(celula, /aria-pressed="false"/);
  assert.match(celula, /aria-label="Marcar Contar ate 10 de Ana \(já concluída no jogo\)"/);
  assert.match(celula, /class="selo-jogo"/, 'falta o selo do jogo');
  assert.ok(!celula.includes('✔'), 'o visto e so da professora');
});

test('celula com professora e jogo mostra os dois, separados', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ]);
  const celula = renderGrade(g).match(/<td><button[^>]*data-aluno="a1"[^>]*data-atividade="at1"[^>]*>.*?<\/td>/)[0];
  assert.match(celula, /aria-pressed="true"/);
  assert.ok(celula.includes('✔'));
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

// --- as duas versoes do jogo ---
//
// CAMINHO_JOGO_WEB vazio = so a versao Windows, exatamente como antes.
// Preenchido = a tela de cada crianca ganha "Jogar", e o download continua.

function linhaDaAna() {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  return montarLinhaDoAluno(g, 'a1');
}

test('sem a versao do navegador, nenhuma tela do aluno mostra "Jogar"', () => {
  const opcoes = { caminhoJogoWeb: '' };
  const telas = [
    renderAreaAluno({ estado: 'sem-turma' }, opcoes),
    renderAreaAluno({ estado: 'escolher', alunos: ALUNOS }, opcoes),
    renderAreaAluno({ estado: 'progresso', linha: linhaDaAna() }, opcoes),
  ];
  for (const html of telas) {
    assert.ok(!html.includes('botao-jogar'), 'botao Jogar sem jogo para abrir');
    assert.ok(!html.includes('jogar.html'));
    assert.match(html, />Baixar o jogo</, 'o download continua igual ao de hoje');
  }
});

test('com a versao do navegador, a tela da crianca leva o id dela ao jogo', () => {
  const html = renderAreaAluno(
    { estado: 'progresso', linha: linhaDaAna() },
    { caminhoJogoWeb: 'jogo-web/index.html' }
  );
  assert.match(html, /class="botao-jogar" href="jogar\.html\?aluno=a1"/);
  assert.match(html, /Baixar o jogo para Windows/, 'o .exe continua como plano B');
});

test('"Jogar" so aparece na tela de quem vai jogar, nunca na lista de bichinhos', () => {
  const opcoes = { caminhoJogoWeb: 'jogo-web/index.html' };
  const html = renderAreaAluno({ estado: 'escolher', alunos: ALUNOS }, opcoes);
  assert.ok(!html.includes('botao-jogar'), 'sem saber quem e a crianca, nao ha para quem gravar');
});

test('id estranho no botao Jogar vai codificado e escapado', () => {
  const linha = { ...linhaDaAna(), aluno: { id: 'a"1&<x>', nome: 'Ana', avatar: 'coruja' } };
  const html = renderProgressoDoAluno(linha, { caminhoJogoWeb: 'jogo-web/index.html' });
  assert.ok(html.includes('href="jogar.html?aluno=a%221%26%3Cx%3E"'));
  assert.ok(!html.includes('<x>'));
});

test('o botao Jogar nao e controle de escrita (spec D3)', () => {
  const html = renderProgressoDoAluno(linhaDaAna(), { caminhoJogoWeb: 'jogo-web/index.html' });
  assert.ok(!html.includes('<input'));
  assert.ok(!html.includes('<form'));
  assert.ok(!html.includes('aria-pressed'));
});
