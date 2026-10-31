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

      const anterior = itens.findIndex((i) => mesmaCelula(i, item));

      if (anterior !== -1) {
        if (itens[anterior].acao === item.acao) return;   // duplo clique
        itens.splice(anterior, 1);                        // marcar + desmarcar = nada
        gravar();
        return;
      }

      itens.push({
        acao: item.acao,
        aluno_id: item.aluno_id,
        atividade_id: item.atividade_id,
      });
      gravar();
    },

    itens() {
      return itens.map((i) => ({ ...i }));
    },

    tamanho() {
      return itens.length;
    },

    // Tenta enviar tudo. O que falha permanece, na ordem original.
    async drenar(enviar) {
      const pendentes = [];
      let enviados = 0;

      for (const item of itens) {
        try {
          await enviar(item);
          enviados += 1;
        } catch {
          pendentes.push(item);
        }
      }

      itens = pendentes;
      gravar();
      return { enviados, pendentes: pendentes.length };
    },
  };
}
