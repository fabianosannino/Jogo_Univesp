// Geracao de HTML. Funcoes puras: entram dados, sai string. Nao existe
// document aqui, e e isso que torna a interface testavel sem navegador.

import { acharAvatar, AVATARES, URL_DOWNLOAD_JOGO, CAMINHO_JOGO_WEB } from './config.js';

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
  'sem-nada': 'Esta turma ainda nao tem alunos nem atividades. Cadastre os alunos e as atividades para comecar.',
  'sem-alunos': 'Esta turma ainda nao tem alunos. Cadastre os alunos para poder marcar o progresso.',
  'sem-atividades': 'Esta turma ainda nao tem atividades. Cadastre as atividades para poder marcar o progresso.',
};

export function renderGrade(grade) {
  if (grade.vazia && grade.linhas.length === 0) {
    return aviso(MENSAGEM_VAZIA[grade.motivo]);
  }
  if (grade.vazia) {
    // ha alunos, faltam atividades: mostra os alunos e diz o que falta
    const nomes = grade.linhas
      .map((l) => `<li>${escaparHtml(l.aluno.nome)}</li>`)
      .join('');
    return `${aviso(MENSAGEM_VAZIA[grade.motivo])}<ul class="lista-alunos">${nomes}</ul>`;
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
          // gravou aparece ao lado, como selo, e nao mexe no botao. Antes, uma
          // celula so com registro do jogo vinha apertada; o clique mandava
          // "desmarcar", que so apaga a origem 'professor', e a marca ficava
          // presa na tela sem a professora conseguir tira-la.
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

  // A legenda so aparece quando ha selo para explicar: turma sem jogo no
  // navegador fica com a grade igual a de sempre.
  const legenda = algumPeloJogo
    ? `<p class="legenda"><span aria-hidden="true">\u2714</span> = você marcou. ` +
      `<span aria-hidden="true">\u{1F3AE}</span> = a criança terminou essa fase no jogo ` +
      `(fica separado da sua marcação).</p>`
    : '';

  return (
    `<table class="grade"><thead><tr><th scope="col">Aluno</th>${cabecalho}` +
    `<th scope="col">Total</th></tr></thead><tbody>${corpo}</tbody></table>${legenda}`
  );
}

// Aviso na area de atividades do professor quando o jogo do navegador esta
// ligado e a turma ainda nao tem todas as fases como atividade. Sem a
// atividade, a fase concluida no jogo nao tem onde ser gravada
// (js/ponte-jogo.js). O botao inclui as que faltam de uma vez.
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
    `<button type="button" id="incluir-fases">Incluir as fases do jogo</button>`
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

export function renderAvataresDaTurma(alunos) {
  const botoes = alunos
    .map((aluno) => {
      const avatar = acharAvatar(aluno.avatar);
      const emoji = avatar ? avatar.emoji : '\u{1F31F}';
      return (
        `<button type="button" class="avatar-aluno" ` +
        `data-aluno="${escaparHtml(aluno.id)}" ` +
        `aria-label="${escaparHtml(aluno.nome)}">` +
        `<span class="emoji" aria-hidden="true">${emoji}</span>` +
        `<span class="nome">${escaparHtml(aluno.nome)}</span>` +
        `</button>`
      );
    })
    .join('');
  return `<div class="avatares">${botoes}</div>`;
}

// `opcoes.caminhoJogoWeb` existe para o teste poder ligar e desligar a versao
// do navegador; a tela usa o valor de js/config.js.
export function renderProgressoDoAluno(linha, { caminhoJogoWeb = CAMINHO_JOGO_WEB } = {}) {
  const avatar = acharAvatar(linha.aluno.avatar);
  const emoji = avatar ? avatar.emoji : '\u{1F31F}';
  const total = linha.celulas.length;

  const itens = linha.celulas
    .map((c) => {
      const marca = c.concluida ? '\u2B50' : '\u25CB';
      const situacao = c.concluida ? 'concluida' : 'pendente';
      return (
        `<li class="atividade ${situacao}">` +
        `<span class="marca" aria-hidden="true">${marca}</span>` +
        `<span class="titulo">${escaparHtml(c.titulo)}</span>` +
        `<span class="leitor">${c.concluida ? 'Voce conseguiu!' : 'Ainda vamos fazer'}</span>` +
        `</li>`
      );
    })
    .join('');

  // Nota: "${linha.concluidas} de ${total}" ficam dentro do mesmo <strong>
  // para que o vao entre os dois numeros seja curto (" de ", 4 chars) e
  // o leitor de tela leia "1 de 2" de forma continua.
  //
  // O botao "Jogar" que GRAVA fica aqui, e nao na tela dos bichinhos, porque e
  // aqui que se sabe QUEM vai jogar: o endereco leva o id do aluno, e e para
  // ele que as fases concluidas sao gravadas.
  const jogar = caminhoJogoWeb ? botaoJogar(linha.aluno.id) : '';

  return (
    `<section class="progresso-aluno">` +
    `<h2><span class="emoji" aria-hidden="true">${emoji}</span> ${escaparHtml(linha.aluno.nome)}</h2>` +
    jogar +
    `<p class="contagem">Voce ja conseguiu <strong>${linha.concluidas} de ${total}</strong></p>` +
    `<ul class="atividades">${itens}</ul>` +
    `<button type="button" class="voltar">Voltar</button>` +
    `</section>`
  );
}

// Com aluno, o jogo grava o progresso dele. Sem aluno, a crianca joga do mesmo
// jeito, so que sem salvar: e o caso do computador que ninguem preparou ou do
// banco fora do ar. Tirar o jogo da crianca por um problema que nao e dela
// seria pior do que perder o registro daquela partida.
function botaoJogar(idAluno) {
  const destino = idAluno ? `jogar.html?aluno=${encodeURIComponent(idAluno)}` : 'jogar.html';
  const texto = idAluno ? 'Jogar online' : 'Jogar online (sem salvar)';
  return (
    `<p class="jogar"><a class="botao-jogar" href="${escaparHtml(destino)}">` +
    `<span aria-hidden="true">\u{1F3AE}</span> ${texto}</a></p>`
  );
}

export function renderAreaAluno(estado, opcoes = {}) {
  const { caminhoJogoWeb = CAMINHO_JOGO_WEB } = opcoes;
  const jogarSemSalvar = caminhoJogoWeb ? botaoJogar(null) : '';
  let conteudo;

  if (estado.estado === 'sem-turma') {
    conteudo = aviso('Este computador ainda nao foi preparado. Chame o professor.') + jogarSemSalvar;
  } else if (estado.estado === 'carregando') {
    conteudo = `<p class="carregando">Carregando...</p>`;
  } else if (estado.estado === 'erro') {
    conteudo = aviso('Nao foi possivel carregar agora. Chame o professor.') + jogarSemSalvar;
  } else if (estado.estado === 'progresso') {
    conteudo = renderProgressoDoAluno(estado.linha, opcoes);
  } else if (!estado.alunos || estado.alunos.length === 0) {
    conteudo = aviso('Nenhum aluno cadastrado nesta turma. Chame o professor.');
  } else {
    conteudo =
      `<h2 class="convite">Clique no seu bichinho</h2>` +
      renderAvataresDaTurma(estado.alunos);
  }

  return `<section id="area-aluno">${conteudo}${blocoDownload(opcoes)}</section>`;
}

// Sem URL configurada, devolve string vazia: a tela da crianca nunca mostra um
// link para arquivo que nao existe. Com URL, um botao grande e escapado.
//
// Com a versao do navegador ligada, as duas aparecem lado a lado: "online"
// (navegador, grava) e "offline" (Windows, nao grava). Decisao do grupo em
// 2026-11-06: os registros das duas NAO se comunicam, e a tela diz isso em
// vez de deixar o adulto descobrir sozinho que a partida offline nao contou.
function blocoDownload({ caminhoJogoWeb = CAMINHO_JOGO_WEB } = {}) {
  if (!URL_DOWNLOAD_JOGO) return '';
  const texto = caminhoJogoWeb ? 'Baixar para jogar offline (Windows)' : 'Baixar o jogo';
  const nota = caminhoJogoWeb
    ? `<p class="nota-versoes">Na versão baixada, o progresso não aparece aqui: ` +
      `as duas versões não se comunicam. A professora marca na grade.</p>`
    : '';
  return (
    `<p class="download">` +
    `<a class="botao-baixar" href="${escaparHtml(URL_DOWNLOAD_JOGO)}">${texto}</a>` +
    `</p>${nota}`
  );
}
