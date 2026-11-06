// Geracao de HTML. Funcoes puras: entram dados, sai string. Nao existe
// document aqui, e e isso que torna a interface testavel sem navegador.

import { AVATARES, URL_DOWNLOAD_JOGO, CAMINHO_JOGO_WEB, acharAvatar } from './config.js';

// Nome de aluno vem digitado pelo professor ou colado de uma lista da escola.
// Sem escapar, um nome com < executa codigo; um nome com & quebra a tela.
export function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function aviso(mensagem) {
  return `<p class="aviso">${escaparHtml(mensagem)}</p>`;
}

const MENSAGEM_VAZIA = {
  'sem-nada': 'Esta turma ainda não tem alunos nem atividades. Cadastre os alunos e as atividades para começar.',
  'sem-alunos': 'Esta turma ainda não tem alunos. Cadastre os alunos para poder marcar o progresso.',
  'sem-atividades': 'Esta turma ainda não tem atividades. Cadastre as atividades para poder marcar o progresso.',
};

// Atalhos da grade vazia para a aba onde se cadastra (js/abas.js le data-ir-aba).
const ATALHOS = {
  'sem-nada': ['alunos', 'atividades'],
  'sem-alunos': ['alunos'],
  'sem-atividades': ['atividades'],
};
const ROTULO_ATALHO = { alunos: 'Cadastrar alunos', atividades: 'Cadastrar atividades' };

function atalhos(motivo) {
  const botoes = (ATALHOS[motivo] ?? [])
    .map((aba) => `<button type="button" class="btn" data-ir-aba="${aba}">${ROTULO_ATALHO[aba]}</button>`)
    .join('');
  return botoes ? `<p class="atalhos">${botoes}</p>` : '';
}

export function renderGrade(grade) {
  if (grade.vazia && grade.linhas.length === 0) {
    return aviso(MENSAGEM_VAZIA[grade.motivo]) + atalhos(grade.motivo);
  }
  if (grade.vazia) {
    // ha alunos, faltam atividades: mostra os alunos e diz o que falta
    const nomes = grade.linhas
      .map((l) => `<li>${escaparHtml(l.aluno.nome)}</li>`)
      .join('');
    return `${aviso(MENSAGEM_VAZIA[grade.motivo])}${atalhos(grade.motivo)}<ul class="lista-alunos">${nomes}</ul>`;
  }

  const cabecalho = grade.atividades
    .map((a) => `<th scope="col">${escaparHtml(a.titulo)}</th>`)
    .join('');

  let algumPeloJogo = false;

  const corpo = grade.linhas
    .map((linha) => {
      const celulas = linha.celulas
        .map((c) => {
          // O botao e so da professora: apertado = ELA marcou. O que o jogo
          // gravou (origem 'jogo') aparece ao lado, como selo, e nao mexe no
          // botao. Se uma celula so com registro do jogo viesse apertada, o
          // clique mandaria "desmarcar", que so apaga a origem 'professor', e a
          // marca ficaria presa sem a professora conseguir tira-la.
          const origens = c.origens ?? [];
          const peloProfessor = origens.includes('professor');
          const peloJogo = origens.includes('jogo');
          if (peloJogo) algumPeloJogo = true;

          const rotulo =
            `${peloProfessor ? 'Desmarcar' : 'Marcar'} ${c.titulo} de ${linha.aluno.nome}` +
            (peloJogo ? ' (já concluída no jogo)' : '');
          const selo = peloJogo
            ? `<span class="selo-jogo" title="Concluída no jogo" aria-hidden="true">\u{1F3AE}</span>`
            : '';
          return (
            `<td>` +
            `<button type="button" class="celula" ` +
            `data-aluno="${escaparHtml(linha.aluno.id)}" ` +
            `data-atividade="${escaparHtml(c.atividade_id)}" ` +
            `aria-pressed="${peloProfessor}" ` +
            `aria-label="${escaparHtml(rotulo)}">` +
            `<span aria-hidden="true">${peloProfessor ? '\u2714' : '\u00A0'}</span>` +
            `</button>${selo}</td>`
          );
        })
        .join('');

      return (
        `<tr><th scope="row">${escaparHtml(linha.aluno.nome)}</th>${celulas}` +
        `<td class="total">${linha.concluidas}/${linha.celulas.length}</td></tr>`
      );
    })
    .join('');

  // A legenda so aparece quando ha selo para explicar: turma sem jogo online
  // fica com a grade igual a de sempre.
  const legenda = algumPeloJogo
    ? `<p class="legenda">` +
      `<span><span aria-hidden="true">\u2714</span> você marcou</span>` +
      `<span><span aria-hidden="true">\u{1F3AE}</span> a criança terminou essa fase no jogo ` +
      `(fica separado da sua marcação)</span></p>`
    : '';

  return (
    `<table class="grade"><thead><tr><th scope="col">Aluno</th>${cabecalho}` +
    `<th scope="col">Total</th></tr></thead><tbody>${corpo}</tbody></table>${legenda}`
  );
}

// Aviso na aba de atividades quando o jogo online esta ligado e a turma ainda
// nao tem todas as fases como atividade. Sem a atividade, a fase concluida no
// jogo nao tem onde ser gravada (js/ponte-jogo.js). O botao inclui as que
// faltam de uma vez.
export function renderFasesDoJogo(faltando) {
  if (!Array.isArray(faltando) || faltando.length === 0) return '';
  const nomes = faltando.map((f) => `<li>${escaparHtml(f.titulo)}</li>`).join('');
  const quantas = faltando.length === 1 ? '1 fase' : `${faltando.length} fases`;
  return (
    aviso(
      `O jogo tem ${quantas} que esta turma ainda não tem como atividade. ` +
        `Sem a atividade, o que a criança fizer nessa fase do jogo não aparece na grade.`
    ) +
    `<ul class="lista-fases">${nomes}</ul>` +
    `<button type="button" class="btn" id="incluir-fases">Incluir as fases do jogo</button>`
  );
}

export function renderListaSimples(itens, tipo) {
  if (itens.length === 0) {
    return aviso(`Nenhum item cadastrado ainda.`);
  }
  const linhas = itens
    .map((item) => {
      const texto = item.nome ?? item.titulo ?? '';
      return (
        `<li><span>${escaparHtml(texto)}</span>` +
        `<button type="button" class="apagar" data-tipo="${escaparHtml(tipo)}" ` +
        `data-id="${escaparHtml(item.id)}" ` +
        `aria-label="Apagar ${escaparHtml(texto)}">Apagar</button></li>`
      );
    })
    .join('');
  return `<ul class="lista">${linhas}</ul>`;
}

// O campo de avatar do formulario de cadastro.
//
// Duas coisas que o rotulo "(em uso)" sozinho nao resolvia:
//
// 1. O campo abre no primeiro bichinho LIVRE, nao no primeiro da lista. A tela
//    redesenha este campo depois de cada cadastro; abrindo sempre no primeiro,
//    ela abria sempre num bichinho ja tomado, e o professor tinha de mexer no
//    campo doze vezes numa turma de doze.
// 2. Bichinho tomado vem `disabled`. Para a crianca que nao le, o bichinho e o
//    nome dela: dois alunos com a mesma coruja ficam indistinguiveis na tela,
//    que e justamente o engano que a crianca comete sozinha.
//
// A excecao importa: se TODOS os bichinhos estiverem tomados, nada e bloqueado.
// Sao 30 avatares para turmas de 20 a 30 alunos, entao a turma que chega no 31o
// existe -- e bloquear tudo ali deixaria o professor sem conseguir cadastrar a
// crianca. Nesse caso o "(em uso)" volta a ser so um aviso, que e o certo:
// repetir o bichinho e ruim, nao cadastrar o aluno e pior.
export function renderSeletorAvatar(avataresUsados = []) {
  const usados = new Set(avataresUsados);
  const livres = AVATARES.filter((a) => !usados.has(a.id));
  const esgotou = livres.length === 0;
  const idInicial = esgotou ? AVATARES[0].id : livres[0].id;

  const opcoes = AVATARES
    .map((a) => {
      const emUso = usados.has(a.id);
      const marca = emUso ? ' (em uso)' : '';
      const bloqueio = emUso && !esgotou ? ' disabled' : '';
      const escolhido = a.id === idInicial ? ' selected' : '';
      return (
        `<option value="${escaparHtml(a.id)}"${bloqueio}${escolhido}>` +
        `${a.emoji} ${escaparHtml(a.rotulo + marca)}</option>`
      );
    })
    .join('');
  return `<select id="avatar-input" aria-label="Avatar do aluno">${opcoes}</select>`;
}

// Tela do aluno (principal.html), em tres passos, sem a crianca digitar nada:
//   1. escolhe a turma pelo nome;
//   2. escolhe o proprio nome (com o bichinho ao lado) na lista da turma;
//   3. ve as proprias estrelas e joga: online (se a build WebGL existir) ou
//      baixando a versao Windows, direto, sem passar por outra pagina.
// Decisao do grupo em 2026-11-06: a crianca VE as estrelas (spec D3), e so ve
// -- nenhum controle de escrita existe nesta tela.
// Os botoes levam data-* que js/aluno.js le; todo texto vindo do banco e escapado.

function botaoVoltar(acao, texto) {
  return `<button type="button" class="aluno-voltar" data-voltar="${acao}">← ${escaparHtml(texto)}</button>`;
}

function listaDeEscolha(itens, atributo, icone) {
  const botoes = itens
    .map(
      (item) =>
        `<li><button type="button" class="escolha-item" ${atributo}="${escaparHtml(item.id)}">` +
        `<span class="escolha-item-icone" aria-hidden="true">${icone(item)}</span>` +
        `<strong>${escaparHtml(item.nome)}</strong></button></li>`
    )
    .join('');
  return `<ul class="grade-escolha">${botoes}</ul>`;
}

export function renderEscolhaTurma(turmas) {
  const corpo =
    turmas.length === 0
      ? aviso('Ainda não há turmas cadastradas. Chame o professor.')
      : `<h2 class="aluno-pergunta">Qual é a sua turma?</h2>` +
        listaDeEscolha(turmas, 'data-turma', () => '🏫');
  return `<section id="area-aluno">${corpo}</section>`;
}

export function renderEscolhaAluno(turma, alunos) {
  const corpo =
    alunos.length === 0
      ? aviso('Esta turma ainda não tem alunos. Chame o professor.')
      : `<h2 class="aluno-pergunta">Quem é você?</h2>` +
        listaDeEscolha(alunos, 'data-aluno', (a) => acharAvatar(a.avatar)?.emoji ?? '🙂');
  return (
    `<section id="area-aluno">` +
    `<p class="aluno-turma">${escaparHtml(turma.nome)}</p>` +
    corpo +
    botaoVoltar('turma', 'Trocar de turma') +
    `</section>`
  );
}

// As estrelas da crianca: o que ela ja conseguiu, pela professora ou pelo jogo.
// Atividade pendente fica neutra, nunca com X nem vermelho (spec D7).
//
// Nota: "${linha.concluidas} de ${total}" ficam dentro do mesmo <strong> para
// que o leitor de tela leia "1 de 2" de forma continua.
export function renderProgressoDoAluno(linha) {
  const total = linha.celulas.length;
  if (total === 0) return '';
  const itens = linha.celulas
    .map((c) => {
      const marca = c.concluida ? '\u2B50' : '\u25CB';
      const situacao = c.concluida ? 'concluida' : 'pendente';
      return (
        `<li class="atividade ${situacao}">` +
        `<span class="marca" aria-hidden="true">${marca}</span>` +
        `<span class="titulo">${escaparHtml(c.titulo)}</span>` +
        `<span class="leitor">${c.concluida ? 'Você conseguiu!' : 'Ainda vamos fazer'}</span>` +
        `</li>`
      );
    })
    .join('');
  return (
    `<section class="progresso-aluno" aria-label="Progresso de ${escaparHtml(linha.aluno.nome)}">` +
    `<p class="contagem">Você já conseguiu <strong>${linha.concluidas} de ${total}</strong></p>` +
    `<ul class="atividades">${itens}</ul>` +
    `</section>`
  );
}

// Com aluno, o jogo online grava o progresso dele. Sem aluno (computador sem
// professor, banco fora do ar), a crianca joga do mesmo jeito, so que sem
// salvar: tirar o jogo dela por um problema que nao e dela seria pior do que
// perder o registro daquela partida.
function botaoJogar(idAluno) {
  const destino = idAluno ? `jogar.html?aluno=${encodeURIComponent(idAluno)}` : 'jogar.html';
  const texto = idAluno ? 'Jogar online' : 'Jogar online (sem salvar)';
  return (
    `<p class="jogar"><a class="botao-jogar" href="${escaparHtml(destino)}">` +
    `<span aria-hidden="true">\u{1F3AE}</span> ${texto}</a></p>`
  );
}

// O link de download aponta direto para o arquivo: o GitHub serve o .zip como
// anexo, entao o navegador baixa sem abrir pagina nenhuma. Sem URL configurada,
// a tela avisa em vez de mostrar um link para um arquivo que nao existe.
//
// Com o jogo online ligado, as duas versoes aparecem: "online" (grava) e
// "offline" (Windows, nao grava). Decisao do grupo em 2026-11-06: os registros
// das duas NAO se comunicam, e a tela diz isso.
function blocoDownload(caminhoJogoWeb) {
  if (!URL_DOWNLOAD_JOGO) return aviso('O jogo ainda não está disponível. Chame o professor.');
  const texto = caminhoJogoWeb ? 'Baixar para jogar offline (Windows)' : 'Baixar o jogo (versão para Windows)';
  const nota = caminhoJogoWeb
    ? `<p class="nota-versoes">Na versão baixada, o progresso não aparece aqui: ` +
      `as duas versões não se comunicam. A professora marca na grade.</p>`
    : '';
  return (
    `<div class="download"><a class="botao-baixar" href="${escaparHtml(URL_DOWNLOAD_JOGO)}" download>` +
    `<span aria-hidden="true">\u2B07\uFE0F</span> ${texto}</a>${nota}</div>`
  );
}

// `linha` e a linha do aluno na grade (js/grade.js): sem ela, a tela nao mostra
// estrelas. `opcoes.caminhoJogoWeb` existe para o teste ligar e desligar o jogo
// online; a tela usa o valor de js/config.js.
export function renderAreaAluno(aluno = null, linha = null, { caminhoJogoWeb = CAMINHO_JOGO_WEB } = {}) {
  const emoji = (aluno && acharAvatar(aluno.avatar)?.emoji) ?? '\u{1F3AE}';
  const saudacao =
    `<span class="aluno-icone" aria-hidden="true">${emoji}</span>` +
    (aluno ? `<p class="aluno-texto">Oi, ${escaparHtml(aluno.nome)}!</p>` : '');
  return (
    `<section id="area-aluno">` +
    saudacao +
    (caminhoJogoWeb ? botaoJogar(aluno?.id ?? null) : '') +
    (linha ? renderProgressoDoAluno(linha) : '') +
    blocoDownload(caminhoJogoWeb) +
    (aluno ? botaoVoltar('aluno', 'Não sou eu') : '') +
    `</section>`
  );
}
