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

export function criarFila(armazenamento, chave = 'fila_progresso') {
  // Copia em memoria: e a verdade da fila. O armazenamento e so a copia que
  // sobrevive ao recarregar a pagina. Se ele falhar, a fila continua.
  let itens = carregar();

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
    try {
      armazenamento.setItem(chave, JSON.stringify(itens));
    } catch {
      // Sem espaco ou sem permissao. A fila segue em memoria; o professor
      // nao precisa saber. Perde-se apenas se a pagina for recarregada.
    }
  }

  return {
    enfileirar(item) {
      if (!ehItemValido(item)) return;
      aplicarItem(itens, item);
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
