# Plataforma Educativa — Projeto Integrador UNIVESP

Plataforma web educativa e gamificada para crianças e estudantes com deficiência
intelectual. Feita para a avaliação da disciplina e pensada, desde o início, para
funcionar numa escola de verdade: é isso que explica as decisões descritas abaixo.

**No ar desde 2026-11-01:** <https://fabianosannino.github.io/Jogo_Univesp/>
· última atualização em 2026-11-06

---

## Estado atual (2026-11-06)

| | |
|---|---|
| **Funcionando no site** | tela do aluno (turma → nome → estrelas → baixar o jogo), área do professor com abas, isolamento por professor no banco, fila de marcações quando a internet cai, download do jogo para Windows |
| **Pronto, esperando a Olívia** | jogo online (WebGL) gravando o progresso sozinho. O lado da plataforma está feito e testado; faltam o projeto Unity, a lista de fases e a build (`unity/LEIA-ME.md`) |
| **Atenção** | o banco (Supabase gratuito) **pausa depois de 7 dias sem acesso**: o site abre, mas o login não responde. O último acesso foi em 06/11, então alguém precisa entrar no site antes de 13/11 e depois a cada poucos dias (`docs/PENDENCIAS.md`, item 10) |
| **Prazo** | o projeto é para a avaliação da disciplina, sem uso aberto em produção, e sai do ar no fim de 2026 |

---

## Como usar agora (sem instalar nada)

Abra o endereço acima. A tela de entrada pergunta quem está no computador, e os dois
caminhos existem de propósito:

- **"Sou aluno"** — a criança escolhe a turma, depois o próprio nome, vê **as estrelas
  dela** e clica em **"Baixar o jogo"**, que baixa direto a versão Windows. **Ela não
  digita nada em momento nenhum.** Essa é a decisão central do projeto, não um detalhe de
  interface.
- **"Sou professor"** — login, e de lá quatro abas: **Marcar progresso**, **Cadastrar
  alunos**, **Cadastrar atividades** e **Turmas**.

### Contas de demonstração

O autocadastro está **fechado** de propósito (ver `docs/PENDENCIAS.md`, item 7), então
`cadastro.html` recusa — é o comportamento correto. Para avaliar, use uma das contas
prontas. **A senha é a mesma nas três: `Demo2026!univesp`**

| Conta | Já tem dentro (conferido em 2026-11-06) |
|---|---|
| `prof1.teste@example.com` | Turma Girassol - 3o ano — 6 alunos, 5 atividades, e um registro feito pelo jogo (aparece como 🎮 na grade) |
| `prof2.teste@example.com` | Turma Arco-Iris - 4o ano — 4 alunos, 5 atividades |
| `prof3.teste@example.com` | Turma Jabuticaba - 2o ano — 6 alunos, 3 atividades |

Os números mudam conforme as pessoas testam, e é para mudar mesmo.

São três e não uma compartilhada porque a tela tem um botão "Apagar turma": numa conta
só, o primeiro que confirmasse esse botão esvaziaria a tela de todos os seguintes. Com
três, **pode apagar e bagunçar à vontade** sem estragar o teste de ninguém.

**Nenhum dado real de escola mora nessas contas, e nunca vai** — senha publicada e dado
de criança não convivem. Se o projeto um dia entrar em sala, cada professora recebe
conta própria e estas três são apagadas.

### Roteiro de 5 minutos

1. Entre com uma das contas. Você cai na aba **Marcar progresso** de uma turma montada.
2. Na aba **Cadastrar alunos**, cadastre um aluno e escolha o bichinho dele (são 30).
3. Na aba **Cadastrar atividades**, cadastre uma atividade.
4. Volte a **Marcar progresso** e marque a atividade como feita para um ou dois alunos.
5. Clique em **"Abrir a tela dos alunos →"**: é isso que a criança vê — turma, nome, as
   estrelas dela e o download do jogo.

Depois entre numa conta diferente: a turma da anterior **desaparece**. Não é a tela
escondendo — é o banco recusando, por professor. Mexer no endereço do navegador não
contorna.

---

## Divisão da equipe

| Pessoa | Produto | Arquivos |
|---|---|---|
| Pedro Henrique dos Santos Alves | Layout | `style.css`, `principal.html`, `login.html`, `cadastro.html` |
| Olívia de Carvalho | Jogos (Unity) | fora deste repositório; os arquivos que entram no projeto dela estão em `unity/` |
| Fabiano S. | Perfis, Login e Progresso | `js/`, `css/plataforma.css`, `sql/`, `tests/`, `professor.html`, `index.html`, `jogar.html` |

A tela do aluno nova, as abas do professor e o visual atual vieram do PR #1
(`dpereirajuli`, 2026-11-06). Ele reescreveu os arquivos do Pedro e apagou `perfil.html`,
`script.js` e as duas imagens antigas, **com o aval do Pedro**. Os originais estão
guardados em `backup/layout-pedro-2026-11-06.zip`.

**Regra seguida neste repositório:** nada é alterado no produto de um colega sem o aval
dele. As exceções que existem estão todas comentadas no próprio arquivo, explicando por
que não deu para ser aditivo. Quem for mexer, mantenha isso.

---

## O jogo: online e offline, a mesma plataforma

A plataforma aceita as duas versões do jogo da Olívia, e quem escolhe é uma linha de
`js/config.js`:

| | Offline: Windows (`.exe`) — **ligada hoje** | Online: navegador (WebGL) — **pronta, esperando a build** |
|---|---|---|
| Como a criança joga | "Baixar para jogar offline" | **"Jogar online"** na tela dela; abre dentro da plataforma |
| Quem registra o progresso | a professora, na grade | o próprio jogo, a cada fase concluída |
| Como liga | `URL_DOWNLOAD_JOGO` | `CAMINHO_JOGO_WEB` + `FASES_DO_JOGO` |

**O sistema funciona só com o offline.** Com `CAMINHO_JOGO_WEB` vazio, que é o estado de
hoje, nada muda para quem usa. O online é desejado, mas não garantido: depende de a
Olívia ainda ter o projeto Unity (`unity/LEIA-ME.md`).

Decisões do grupo (2026-11-06) para quando o online existir:

- **O jogo registra o progresso, e a criança vê as estrelas dela.** Na grade da
  professora, o que veio do jogo aparece como 🎮 ao lado do botão; o ✔ e o botão
  continuam sendo só dela (`docs/especificacao-perfil-login-progresso.md`, D4).
- **Online e offline não se comunicam.** Partida jogada na versão baixada não gera
  registro: a professora marca na grade. As telas da criança e da professora dizem isso.
- **Sem como gravar, joga sem salvar.** Computador que ninguém preparou, banco fora do
  ar ou endereço sem aluno: o jogo online abre do mesmo jeito, com o aviso "Jogando sem
  salvar o progresso".
- **A primeira vez demora.** O jogo online é baixado inteiro na primeira abertura em
  cada computador; depois o navegador guarda. As telas avisam.

**Configuração recomendada**

| | Online | Offline |
|---|---|---|
| Sistema | qualquer um com Chrome ou Edge atualizado | Windows 10 ou 11, 64 bits |
| Memória | 4 GB ou mais | 4 GB ou mais |
| Teste rápido | abrir `get.webgl.org/webgl2`: cubo girando = funciona | — |
| Espaço | o navegador guarda o jogo sozinho | cerca de 200 MB para descompactar |

**Não existe jogo recriado em JavaScript.** Uma recriação chegou a existir (2026-11-03)
e foi retirada por decisão do projeto. O jogo online é o mesmo projeto Unity da Olívia,
exportado para WebGL.

Para ver o online funcionando antes da build existir, há um jogo de mentira em
`tests/jogo-falso/index.html` (as instruções estão no próprio arquivo).

---

## Para quem for mexer no código

Site **estático**, sem build e sem instalação: HTML, CSS e JavaScript puro, com módulos
nativos do navegador. O Supabase entra por CDN. Não há bundler, não há framework —
trocar isso destruiria o layout do Pedro.

```
index.html          porta de entrada (aluno ou professor)
principal.html      tela do aluno, com js/aluno.js (turma → nome → estrelas)
professor.html      tela de gestão, com js/professor.js e js/abas.js
login.html          autenticação
js/config.js        URL do Supabase, chave pública, avatares, links do jogo e fases
js/db.js            acesso ao banco
js/fila.js          fila de marcações quando a internet cai
jogar.html          jogo online (versão WebGL), com js/jogar.js
js/ponte-jogo.js    traduz "fase concluída" do jogo em progresso do aluno
unity/              arquivos que entram no projeto Unity (ver unity/LEIA-ME.md)
backup/             layout original do Pedro, guardado em .zip (ver backup/LEIA-ME.md)
sql/schema.sql      tabelas
sql/politicas.sql   isolamento por professor (RLS)
docs/PENDENCIAS.md  histórico das decisões e do que falta — leia antes de mudar algo
docs/especificacao-perfil-login-progresso.md   o que o produto tem de fazer, e por quê
docs/plano-perfil-login-progresso.md           como foi construído, etapa por etapa
```

A chave que está no `js/config.js` é a **pública** (anon), e pode ficar no repositório:
ela só abre o que as políticas de `sql/politicas.sql` permitem. Chave de serviço nunca
entra aqui.

### Rodar os testes

```bash
npm test
```

110 testes, sem dependência externa — só o `node --test`. **As aspas no comando são
obrigatórias** no Git Bash do Windows, senão o shell expande o `*` antes do Node e o
teste roda vazio.

Os dois arquivos `*.integracao.js` ficam fora desse comando de propósito: eles falam com
o Supabase de verdade e precisam de um `.env.teste` com credenciais, que não está no
repositório.
