// Tela do jogo no navegador (jogar.html).
//
// Abre a build WebGL do jogo num <iframe> e deixa em window.PlataformaJogo a
// funcao que o jogo chama ao fim de cada fase (unity/Plataforma.jslib). Cada
// fase concluida vira progresso com origem 'jogo' para o aluno do endereco.
//
// Roda na sessao do professor que ja entrou neste computador, como a tela do
// aluno (spec D2). Nenhuma regra nova de acesso ao banco: a RLS de progresso ja
// aceita origem 'jogo' para turma do professor da sessao.
//
// Sem como gravar -- endereco sem aluno, computador sem sessao do professor,
// banco fora do ar -- o jogo abre do mesmo jeito, so que SEM SALVAR, e o topo
// da tela diz isso (decisao do grupo em 2026-11-06). A crianca nunca ve erro
// tecnico (spec D7): o motivo vai para o console.
import { supabase } from './supabase.js';
import { professorAtual } from './auth.js';
import { criarDb } from './db.js';
import { criarFila, armazenamentoSeguro } from './fila.js';
import { criarPonte, acharFase } from './ponte-jogo.js';
import { CAMINHO_JOGO_WEB, FASES_DO_JOGO, acharAvatar } from './config.js';
import { escaparHtml } from './render.js';

const db = criarDb(supabase);
const armazenamento = armazenamentoSeguro(() => window.localStorage);

// Fila propria, com chave propria. A do professor ('fila_progresso') reenvia
// com origem 'professor'; se o jogo usasse a mesma, uma fase concluida sem
// internet seria reenviada como se a professora tivesse marcado.
const fila = criarFila(armazenamento, 'fila_jogo');

const area = document.querySelector('#area-jogo');
const quemJoga = document.querySelector('#quem-joga');
const comemoracao = document.querySelector('#comemoracao');

// O id vem do endereco: qualquer um pode digitar outra coisa ali. Conferir o
// formato antes de consultar evita mandar lixo ao banco; quem impede ler aluno
// de outro professor continua sendo a RLS.
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function avisar(texto) {
  area.innerHTML = `<p class="aviso">${escaparHtml(texto)}</p>`;
}

function enviar(item) {
  return db.marcarPeloJogo(item.aluno_id, item.atividade_id);
}

async function escoarFila() {
  if (fila.tamanho() === 0) return;
  const { enviados, pendentes } = await fila.drenar(enviar);
  if (enviados > 0) console.info(`[jogo] ${enviados} fase(s) guardada(s) chegaram ao banco`);
  if (pendentes > 0) console.info(`[jogo] ${pendentes} fase(s) ainda aguardando a internet`);
}

// Nunca lanca: sem internet, guarda na fila e segue. A crianca esta no meio do
// jogo e nao tem nada a fazer com uma falha de rede.
async function gravar(idAluno, idAtividade) {
  try {
    await db.marcarPeloJogo(idAluno, idAtividade);
  } catch (e) {
    console.warn('[jogo] nao gravou agora, guardado para reenviar:', e.message);
    fila.enfileirar({ acao: 'marcar', aluno_id: idAluno, atividade_id: idAtividade });
    return;
  }
  // Se este envio passou, a internet esta de volta: aproveita para mandar o
  // que tinha ficado para tras.
  escoarFila().catch((e) => console.warn('[jogo] fila:', e.message));
}

let relogioComemoracao;
function comemorar(fase) {
  comemoracao.textContent = `⭐ Muito bem! Você terminou: ${fase.titulo}`;
  clearTimeout(relogioComemoracao);
  relogioComemoracao = setTimeout(() => {
    comemoracao.textContent = '';
  }, 6000);
}

// Descobre para quem gravar. Devolve null quando nao da -- e entao o jogo abre
// sem salvar. Cada motivo vai para o console, para quem for investigar.
async function prepararGravacao(idAluno) {
  if (!idAluno) {
    console.info('[jogo] sem aluno no endereco: jogando sem salvar');
    return null;
  }
  if (!FORMATO_UUID.test(idAluno)) {
    console.warn('[jogo] id de aluno invalido no endereco: jogando sem salvar');
    return null;
  }
  try {
    const professor = await professorAtual();
    if (!professor) {
      console.warn('[jogo] nenhum professor entrou neste computador: jogando sem salvar');
      return null;
    }
    const aluno = await db.buscarAluno(idAluno);
    const atividades = await db.listarAtividades(aluno.turma_id);
    return { aluno, atividades };
  } catch (e) {
    console.warn('[jogo] nao deu para preparar a gravacao, jogando sem salvar:', e.message);
    return null;
  }
}

async function iniciar() {
  if (!CAMINHO_JOGO_WEB) {
    avisar('O jogo online ainda não está pronto. Volte e use o botão de baixar o jogo.');
    return;
  }

  const idAluno = new URLSearchParams(window.location.search).get('aluno') ?? '';
  const contexto = await prepararGravacao(idAluno);

  let ponte = null;
  if (contexto) {
    const { aluno, atividades } = contexto;
    const emoji = acharAvatar(aluno.avatar)?.emoji ?? '\u{1F31F}';
    quemJoga.innerHTML = `<span aria-hidden="true">${emoji}</span> ${escaparHtml(aluno.nome)}`;
    ponte = criarPonte({ idAluno: aluno.id, atividades, fases: FASES_DO_JOGO, gravar });
  } else {
    quemJoga.textContent = 'Jogando sem salvar o progresso';
    quemJoga.classList.add('sem-salvar');
  }

  // A ponte so e publicada depois de decidido se ha onde gravar, e o jogo so e
  // carregado depois disso: nenhuma fase pode terminar antes dessa decisao.
  window.PlataformaJogo = {
    async faseConcluida(codigo) {
      try {
        if (!ponte) {
          // Sem salvar: a crianca e comemorada do mesmo jeito.
          const fase = acharFase(codigo, FASES_DO_JOGO);
          if (fase) comemorar(fase);
          return { gravou: false, motivo: 'sem-salvar', fase };
        }
        const r = await ponte.faseConcluida(codigo);
        if (r.fase) comemorar(r.fase);
        if (!r.gravou && r.motivo !== 'repetida') {
          console.warn(`[jogo] fase "${codigo}" nao gravada: ${r.motivo}`);
        }
        return r;
      } catch (e) {
        console.error('[jogo] erro ao registrar fase:', e);
        return null;
      }
    },
  };

  const quadro = document.createElement('iframe');
  quadro.className = 'quadro-jogo';
  quadro.title = 'Jogo';
  quadro.src = CAMINHO_JOGO_WEB;
  quadro.allow = 'fullscreen; autoplay';
  quadro.setAttribute('allowfullscreen', '');
  area.replaceChildren(quadro);

  escoarFila().catch((e) => console.warn('[jogo] fila:', e.message));
}

window.addEventListener('online', () => {
  escoarFila().catch((e) => console.warn('[jogo] fila:', e.message));
});

iniciar();
