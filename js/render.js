// Geracao de HTML. Funcoes puras: entram dados, sai string. Nao existe
// document aqui, e e isso que torna a interface testavel sem navegador.

import { acharAvatar, AVATARES } from './config.js';

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

  const corpo = grade.linhas
    .map((linha) => {
      const celulas = linha.celulas
        .map((c) => {
          const rotulo = c.concluida
            ? `Desmarcar ${c.titulo} de ${linha.aluno.nome}`
            : `Marcar ${c.titulo} de ${linha.aluno.nome}`;
          return (
            `<td>` +
            `<button type="button" class="celula" ` +
            `data-aluno="${escaparHtml(linha.aluno.id)}" ` +
            `data-atividade="${escaparHtml(c.atividade_id)}" ` +
            `aria-pressed="${c.concluida}" ` +
            `aria-label="${escaparHtml(rotulo)}">` +
            `<span aria-hidden="true">${c.concluida ? '\u2714' : '\u00A0'}</span>` +
            `</button></td>`
          );
        })
        .join('');

      return (
        `<tr><th scope="row">${escaparHtml(linha.aluno.nome)}</th>${celulas}` +
        `<td class="total">${linha.concluidas}/${linha.celulas.length}</td></tr>`
      );
    })
    .join('');

  return (
    `<table class="grade"><thead><tr><th scope="col">Aluno</th>${cabecalho}` +
    `<th scope="col">Total</th></tr></thead><tbody>${corpo}</tbody></table>`
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

export function renderSeletorAvatar(avataresUsados = []) {
  const usados = new Set(avataresUsados);
  const opcoes = AVATARES
    .map((a) => {
      const marca = usados.has(a.id) ? ' (em uso)' : '';
      return `<option value="${escaparHtml(a.id)}">${a.emoji} ${escaparHtml(a.rotulo + marca)}</option>`;
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

export function renderProgressoDoAluno(linha) {
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
  return (
    `<section class="progresso-aluno">` +
    `<h2><span class="emoji" aria-hidden="true">${emoji}</span> ${escaparHtml(linha.aluno.nome)}</h2>` +
    `<p class="contagem">Voce ja conseguiu <strong>${linha.concluidas} de ${total}</strong></p>` +
    `<ul class="atividades">${itens}</ul>` +
    `<button type="button" class="voltar">Voltar</button>` +
    `</section>`
  );
}

export function renderAreaAluno(estado) {
  let conteudo;

  if (estado.estado === 'sem-turma') {
    conteudo = aviso('Este computador ainda nao foi preparado. Chame o professor.');
  } else if (estado.estado === 'carregando') {
    conteudo = `<p class="carregando">Carregando...</p>`;
  } else if (estado.estado === 'erro') {
    conteudo = aviso('Nao foi possivel carregar agora. Chame o professor.');
  } else if (estado.estado === 'progresso') {
    conteudo = renderProgressoDoAluno(estado.linha);
  } else if (!estado.alunos || estado.alunos.length === 0) {
    conteudo = aviso('Nenhum aluno cadastrado nesta turma. Chame o professor.');
  } else {
    conteudo =
      `<h2 class="convite">Clique no seu bichinho</h2>` +
      renderAvataresDaTurma(estado.alunos);
  }

  return `<section id="area-aluno">${conteudo}</section>`;
}
