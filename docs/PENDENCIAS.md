# O que falta para a plataforma funcionar

Escrito em 2026-10-31, ao fim da branch `perfil-login-progresso`.
Itens 1, 2, 3 e 5 resolvidos no mesmo dia, mais a confirmacao de e-mail do item 7.
Continuam abertos: o download do jogo (4), o debito conhecido (6) e o autocadastro
aberto (7) — este ultimo porque e chave de painel, nao linha de codigo.

Os 59 testes automatizados passam, e isso diz menos do que parece: eles provam que a
logica de interface e de dados esta correta **isoladamente**. Nenhum deles toca o banco.
Quem toca o banco sao os dois testes do item 2 — e esses agora rodaram.

## 1. ~~O esquema nunca foi aplicado~~ — APLICADO em 2026-10-31

Projeto `mdtuldswgsgewqfnggqe` (JOGOUNIVESP), via conector do Supabase. Rodou na ordem:

1. `sql/schema.sql` — migracao `esquema_perfil_login_progresso`
2. `sql/politicas.sql` — migracao `politicas_isolamento_por_professor`
3. `NOTIFY pgrst, 'reload schema';`

Estado conferido depois de aplicar:

- As quatro tabelas respondem **200 com lista vazia** a chave anon, nao mais `404 PGRST205`.
- O embed `aluno!inner(turma_id)` de `js/db.js:112` respondeu 200. Era a unica linha de
  `db.js` impossivel de declarar correta so lendo o codigo; agora esta verificada.
- `INSERT` anonimo em `turma` e recusado com `42501 new row violates row-level security
  policy`. A RLS esta de fato no caminho, nao apenas ligada.
- `pg_policies` lista as quatro politicas, uma por tabela.
- Painel de seguranca do Supabase: nenhum aviso.

As duas migracoes sao idempotentes (`create table if not exists`, `drop policy if exists`
antes de cada `create policy`), entao rodar de novo nao quebra nada.

## 2. ~~Dois testes de integracao nunca rodaram~~ — RODARAM e PASSARAM em 2026-10-31

```
node tests/politicas.integracao.js      -> OK: um professor nao alcanca a turma do outro
node tests/caminho_critico.integracao.js -> OK: caminho critico verificado de ponta a ponta
```

O de politicas e o que responde a pergunta que importa para a LGPD, e a resposta foi a
desejada: o professor A nao alcanca a turma do professor B. Os dois limpam o que criam —
as quatro tabelas voltaram a zero linhas depois da execucao.

Nenhum dos dois termina em `.test.js`, de proposito: `npm test` tem de continuar rodando
sem rede e sem conta.

**Como as duas contas foram criadas** (vale saber, porque signup normal nao funciona aqui):
`GET /auth/v1/settings` devolve `mailer_autoconfirm: false`, entao cada signup tenta enviar
e-mail de confirmacao e o servico padrao do Supabase corta isso em poucos por hora —
`429 over_email_send_rate_limit`. Como os enderecos sao `@example.com` (dominio reservado
pela IANA, que nunca recebe e-mail), esse envio e desperdicio puro. As contas foram inseridas
direto em `auth.users` com `email_confirmed_at` preenchido e senha via
`crypt(senha, gen_salt('bf'))` — o mesmo bcrypt que o GoTrue valida.

Uma pegadinha pela qual vale a pena nao passar duas vezes: `confirmation_token`,
`recovery_token`, `email_change_token_new` e `email_change` sao nullable e **sem default**.
Deixadas nulas, o login devolve `500 Database error querying schema`, porque o GoTrue as le
em `string` do Go, que nao aceita `NULL`. Preencha as quatro com `''`.

As credenciais estao em `.env.teste`, que o `.gitignore` bloqueia. Os testes as leem de
variaveis de ambiente:

```bash
set -a && . ./.env.teste && set +a && node tests/politicas.integracao.js
```

## 3. ~~Verificacao manual no navegador~~ — FEITA em 2026-10-31

Tudo abaixo foi percorrido no Chrome, em `localhost:8777`, logado como
`prof.a.teste@example.com`. Zero erro no console em qualquer momento. A turma de teste
("3o ano B", doze alunos) foi apagada no fim; so a turma do professor sobrou no banco.

- ~~**Review Focus 5**~~ — `principal.html` sem `turma_ativa` mostra "Este computador
  ainda nao foi preparado. Chame o professor." na caixa de aviso, sem tela branca.
- ~~**Caminho critico**~~ — login -> criar turma -> "Usar esta turma aqui" (que responde
  "Este computador vai mostrar a turma ... para os alunos") -> dois alunos com avatares
  diferentes -> atividade -> marcar na grade (Ana foi a 1/1 na hora) -> tela do aluno ->
  abrir o bichinho -> **estrela** ao lado de "Contar ate 10" e "Voce ja conseguiu 1 de 1"
  -> Voltar. Conferido no banco depois de cada passo.
- ~~**Acessibilidade**~~ — `Tab` percorre os doze avatares na ordem de leitura, sem
  nenhuma parada intrusa pelo caminho; o anel de foco e amarelo sobre o verde e visivel em
  cada parada; `Enter` e `Espaco` abrem o progresso e `Espaco` aciona o Voltar. A celula da
  grade se anuncia como "Marcar Contar ate 10 de Bruno" — nome do aluno e da atividade, nao
  so "marcar". Os doze alunos couberam na tela sem rolagem na janela usada; a rolagem
  dentro de `#area-aluno` nao chegou a ser exercitada, e e o unico item desta lista que
  continua sem prova direta.
- ~~**Rede caida**~~ — com `fetch` rejeitando `TypeError: Failed to fetch`, marcar o Bruno
  pintou a celula **na hora** (1/1) e o topo da pagina passou a dizer "1 marcacao(oes)
  aguardando a internet. Nao feche esta pagina."; o banco **nao** tinha o registro. Depois
  de devolver o `fetch` e disparar o evento `online`, o progresso do Bruno apareceu no
  banco com `origem = 'professor'` e o aviso saiu da tela sozinho.

Uma ressalva honesta sobre o ultimo: a queda foi simulada trocando `window.fetch` por uma
funcao que rejeita, nao desligando a placa de rede. O caminho exercitado e exatamente o
que o codigo trata (`enviar()` lanca -> `catch` -> `fila.enfileirar`), e o retorno passou
pelo mesmo listener de `online` que o navegador usaria. O que **nao** foi provado e que o
Chrome dispara esse evento quando o Wi-Fi da escola volta — isso e comportamento do
navegador, nao do codigo.

Um detalhe de ferramenta, nao de produto: definir o valor de um campo por script sem
disparar `input` nao faz o formulario gravar. Professor nenhum encontra isso, porque
professor digita. Fica registrado so para a proxima pessoa que automatizar esta tela.

## 4. O download do jogo

A build existe (`Jogo v.1.01`), tem **334 MB** e nao entra no git: o limite do GitHub e
100 MB por arquivo, e nem zipada cabe. Entao `js/config.js` tem

```js
export const URL_DOWNLOAD_JOGO = '';
```

Vazia, nenhum link aparece na tela da crianca — nunca um link quebrado. Para ligar o
download: publique a build como asset de Release do GitHub (ou Drive), cole a URL nessa
constante, e inverta o teste "sem URL configurada, nenhuma tela do aluno mostra link de
download" em `tests/render.test.js`. Nada mais muda.

## 5. ~~A mesclagem com `main`~~ — FEITA em 2026-10-31

Os 31 commits da branch entraram em `main` e foram empurrados: `c82785e..3f071e8`.

Foi **fast-forward**, nao mesclagem de verdade: `main` local estava igual a `origin/main`,
isto e, o Pedro nao tinha empurrado nada desde que a branch saiu, e `main` era ancestral
dela. Entao nenhum commit dele foi reescrito nem perdido — o historico so andou para a
frente. Usei `--ff-only` de proposito: se `main` tivesse andado, o comando teria falhado
em vez de inventar um merge que ninguem revisou.

Conferido antes de empurrar: nenhum arquivo de credencial rastreado (`.env.teste` e
`.superpowers/` ficaram de fora, como o `.gitignore` manda) e os 70 testes passando ja
dentro de `main`, nao so na branch.

A branch `perfil-login-progresso` continua existindo, local e remota, apontando para o
mesmo commit. Apagar e decisao de quem coordena.

```bash
# o que rodou
git checkout main && git merge --ff-only perfil-login-progresso && git push origin main
```

## 6. Debito conhecido, deliberadamente adiado

- `principal.html` ainda tem residuo de mockup do Pedro: `<h1 ...>a</h1>` e
  `<h1>O jogo vai aqui!</h1>`. Nao mexi porque e arquivo de colega; a unica alteracao
  nao-aditiva autorizada foi `lang="en"` -> `lang="pt-BR"`, por acessibilidade.
- `perfil.html` esta orfao e mostra os textos literais "Nome" e "Email".
- `listarTurmas()` nao filtra por `professor`: quem garante o isolamento e a RLS, e isso
  **esta provado** desde que o teste do item 2 passou. Continua sendo defesa em uma unica
  camada: se alguem errar uma politica no futuro, a aplicacao nao segura nada por conta
  propria. Adicionar `.eq('professor', id)` seria cinto e suspensorio.
- Duas abas de `professor.html` abertas na mesma maquina sobrescrevem a fila offline uma
  da outra.
- Redesenhar `#caixa-avatar` devolve o `<select>` para um avatar ja em uso; o rotulo
  "(em uso)" avisa, mas nao impede. **Visto no navegador em 2026-10-31**: depois de
  cadastrar a Ana com a coruja, o campo voltou sozinho para "🦉 Coruja (em uso)". Numa
  turma de doze, os doze primeiros avatares ficam marcados "(em uso)" e o campo continua
  parando no primeiro deles — o professor tem de mexer no campo toda vez.

## 7. Duas decisoes de configuracao da autenticacao (do time, nao do codigo)

Nenhuma das duas se resolve no repositorio: as duas sao chaves no painel do Supabase, em
`Authentication` -> `Sign In / Providers` -> `Email`. A primeira ja foi decidida; a
segunda continua aberta.

**~~"Confirm email" esta LIGADO~~ — DESLIGADO em 2026-10-31.** Ligado, cada cadastro
tentava enviar um e-mail, e o remetente padrao do Supabase corta em poucas mensagens por
hora — e ai o cadastro falhava com `429` mesmo estando tudo certo. E a plataforma nao tem
**nenhum** fluxo de e-mail: nao existe tela de confirmacao, nao existe "esqueci minha
senha". Logo a confirmacao nao protegia nada e custava o cadastro.

Conferido depois de desligar: `GET /auth/v1/settings` devolve `mailer_autoconfirm: true`,
e um `POST /auth/v1/signup` novo respondeu **200 com `access_token` na resposta** — conta
criada e sessao na mesma chamada, sem e-mail, sem cota para estourar. A conta descartavel
da verificacao foi apagada; `auth.users` tem so as duas de teste e a do professor.
`js/auth.js:23` ja tratava os dois casos e nao mudou.

**`disable_signup` esta `false`: qualquer pessoa na internet pode criar conta de
professor.** Nao e vazamento de dados — a RLS esta provada, cada conta so alcanca as
proprias turmas —, mas numa escola de verdade o normal e a equipe criar as contas, nao
haver autocadastro aberto. Se desligarem, `js/mensagens.js` ja traduz o erro que a pagina
passa a dar ("O cadastro esta fechado. Peca para a equipe criar a sua conta.").

Isto **nao da para fazer por aqui**, e vale registrar o porque para ninguem tentar de
novo: o conector do Supabase executa SQL e migracoes, e `disable_signup` nao e uma linha
de tabela — e configuracao do GoTrue, que so muda por
`PATCH /v1/projects/{ref}/config/auth` da Management API, autenticada com token pessoal.
Token pessoal e credencial, e credencial nao passa por aqui. No painel sao dois cliques:

> `Authentication` -> `Sign In / Providers` -> provedor `Email` -> **"Allow new users to
> sign up"**, desligar.

Um aviso para nao se enganar depois: **esconder ou apagar `cadastro.html` nao fecha o
autocadastro.** A pagina e so um formulario; o endereco `/auth/v1/signup` do projeto
continua aberto a quem souber o que e a chave anon esta no `js/config.js`, visivel para
qualquer um. Quem fecha o cadastro e a chave do painel, so ela.
