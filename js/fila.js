// Fila de marcacoes que ainda nao chegaram ao banco.
//
// Internet de laboratorio de escola cai no meio da aula (spec R6). O professor
// marca, a tela confirma, e o envio acontece quando der. Perder a marcacao de
// um aluno e a falha que faz a escola abandonar a ferramenta (spec D6).
//
// Recebe o armazenamento por parametro para poder ser testada sem navegador.

const ACOES = new Set(['marcar', 'desmarcar']);

function ehItemValido(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    ACOES.has(item.acao) &&
    typeof item.aluno_id === 'string' &&
    item.aluno_id.length > 0 &&
    typeof item.atividade_id === 'string' &&
    item.atividade_id.length > 0
  );
}

function mesmaCelula(a, b) {
  return a.aluno_id === b.aluno_id && a.atividade_id === b.atividade_id;
}

// Aplica um item sobre uma lista usando a mesma logica de enfileirar:
// mesma celula + mesma acao = ignora (duplicata); mesma celula + acao oposta = cancela;
// celula nova = adiciona. Retorna a lista resultante (muta e retorna a mesma referencia).
function aplicarItem(lista, item) {
  const idx = lista.findIndex((i) => mesmaCelula(i, item));
  if (idx !== -1) {
    if (lista[idx].acao === item.acao) return lista;  // duplicata: ignora
    lista.splice(idx, 1);                              // oposto: cancela
    return lista;
  }
  lista.push({ acao: item.acao, aluno_id: item.aluno_id, atividade_id: item.atividade_id });
  return lista;
}

// Identidade de uma celula da grade. O \u0000 separa os dois ids porque nunca
// aparece dentro de um uuid: evita que 'ab' + 'c' colida com 'a' + 'bc'.
// E a mesma convencao que js/professor.js usa para as celulas em voo.
function chaveDaCelula(item) {
  return `${item.aluno_id}\u0000${item.atividade_id}`;
}

// O proprio acesso a window.localStorage pode lancar (Firefox com
// resistFingerprinting, cookie bloqueado). Recebe uma FUNCAO em vez do objeto
// porque e o acesso que lanca -- e isso torna a funcao testavel no Node, que
// nao tem window.
export function armazenamentoSeguro(obter) {
  try {
    const bruto = obter();
    if (bruto) return bruto;
  } catch {
    // navegador bloqueou o armazenamento
  }
  // Substituto inerte: a fila segue funcionando em memoria, so nao sobrevive
  // ao recarregar a pagina.
  return { getItem: () => null, setItem: () => {} };
}

export function criarFila(armazenamento, chave = 'fila_progresso') {
  // Copia em memoria: e a verdade da fila. O armazenamento e so a copia que
  // sobrevive ao recarregar a pagina. Se ele falhar, a fila continua.
  let itens = carregar();

  // Celulas que ESTA aba ja tocou -- enfileirou, enviou ou anulou. So cresce.
  //
  // Serve para gravar sem atropelar outra aba. O professor deixa a plataforma
  // aberta numa aba e abre outra: as duas usam o mesmo localStorage com a mesma
  // chave, cada uma com sua copia em memoria. Gravando a copia inteira, a
  // ultima a gravar apagava as marcacoes da outra, em silencio.
  //
  // Com este conjunto, a regra de gravacao fica: celula que esta aba tocou, ela
  // manda (ela sabe se esta pendente, se foi enviada ou se foi anulada); celula
  // que ela nunca viu veio da outra aba e e preservada como esta no disco.
  //
  // Por que nao simplesmente unir as duas listas: unir ressuscitaria o que esta
  // aba acabou de enviar com sucesso, e o progresso do aluno iria duas vezes.
  //
  // Se as duas abas tocarem a MESMA celula, a ultima a gravar vence. Nao ha o
  // que fazer sem relogio confiavel, e e a mesma celula: a intencao do
  // professor e ambigua de qualquer modo.
  const tocadas = new Set(itens.map(chaveDaCelula));

  function carregar() {
    let bruto;
    try {
      bruto = armazenamento.getItem(chave);
    } catch {
      return [];           // navegador bloqueou o acesso
    }
    if (!bruto) return [];

    let lido;
    try {
      lido = JSON.parse(bruto);
    } catch {
      return [];           // JSON cortado no meio: descarta e segue
    }
    if (!Array.isArray(lido)) return [];
    return lido.filter(ehItemValido);
  }

  function gravar() {
    // Le o disco de novo na hora de gravar: entre a ultima leitura e agora,
    // a outra aba pode ter enfileirado algo.
    const alheias = carregar().filter((i) => !tocadas.has(chaveDaCelula(i)));
    try {
      armazenamento.setItem(chave, JSON.stringify([...itens, ...alheias]));
    } catch {
      // Sem espaco ou sem permissao. A fila segue em memoria; o professor
      // nao precisa saber. Perde-se apenas se a pagina for recarregada.
    }
  }

  return {
    enfileirar(item) {
      if (!ehItemValido(item)) return;
      aplicarItem(itens, item);
      tocadas.add(chaveDaCelula(item));
      gravar();
    },

    itens() {
      return itens.map((i) => ({ ...i }));
    },

    tamanho() {
      return itens.length;
    },

    // Tenta enviar tudo. O que falha permanece, na ordem original.
    //
    // Seguranca contra corrida com enfileirar:
    //   1. Captura snapshot antes dos awaits -- a iteracao nunca ve mutacoes
    //      causadas por enfileirar (splice) durante os awaits.
    //   2. Zera itens = [] antes do loop -- qualquer enfileirar durante o drain
    //      acumula em uma lista limpa, sem interferir no snapshot.
    //   3. Ao final, mescla pendentes (falhas do snapshot) com itens (chegados
    //      durante o drain) usando aplicarItem, que aplica deduplicacao correta.
    //
    // Invariantes garantidos:
    //   - Nenhum item do snapshot anterior ao drain se perde.
    //   - Nenhum item enfileirado durante o drain se perde.
    //   - enfileirar durante o drain nao corrompe a iteracao.
    async drenar(enviar) {
      const snapshot = [...itens];  // captura imutavel para iteracao
      itens = [];                   // novos enfileiramentos acumulam aqui

      const pendentes = [];
      let enviados = 0;

      for (const item of snapshot) {
        try {
          await enviar(item);
          enviados += 1;
        } catch {
          pendentes.push(item);
        }
      }

      // chegadosDurante: tudo que enfileirar acumulou em itens=[] durante o loop
      const chegadosDurante = itens;
      const nPendentes = pendentes.length;

      // Reconstruir: comecar com pendentes (falhas do snapshot) e aplicar,
      // com deduplicacao, cada item que chegou durante o drain.
      itens = pendentes;
      for (const i of chegadosDurante) {
        aplicarItem(itens, i);
      }

      gravar();
      return { enviados, pendentes: nPendentes };
    },
  };
}
