# O que falta para a plataforma funcionar

Escrito em 2026-10-31, ao fim da branch `perfil-login-progresso`.
Itens 1 e 2 resolvidos no mesmo dia; o restante continua aberto.

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

## 3. Verificacao manual no navegador

Nada disto foi verificado — a extensao do Chrome nao estava conectada nesta sessao.

- ~~**Review Focus 5**~~ — VERIFICADO em 2026-10-31, no navegador: `principal.html` sem
  `turma_ativa` mostra "Este computador ainda nao foi preparado. Chame o professor." na
  caixa de aviso, sem tela branca e com zero erro no console.
- O caminho critico a mao: criar turma, cadastrar aluno com avatar, criar atividade,
  marcar, abrir a tela do aluno, clicar no bichinho, ver a estrela, Voltar.
- Acessibilidade: `Tab` percorre os avatares, `Enter`/`Espaco` abre o progresso, o foco e
  visivel em cada parada, e uma turma de doze alunos e inteiramente alcancavel (rolagem
  dentro de `#area-aluno`).
- Com a rede desligada: marcar progresso, confirmar o aviso de pendencia, religar a rede e
  confirmar que a fila esvazia e o aviso sai.

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

## 5. A mesclagem com `main`

A branch esta **23 commits a frente** de `main`, onde o Pedro trabalha, e **nada foi
empurrado**. Mesclar e empurrar para ramo compartilhado e decisao de quem coordena a
equipe, nao de quem implementou.

```bash
git checkout main && git merge perfil-login-progresso && git push
```

## 6. Debito conhecido, deliberadamente adiado

- `principal.html` ainda tem residuo de mockup do Pedro: `<h1 ...>a</h1>` e
  `<h1>O jogo vai aqui!</h1>`. Nao mexi porque e arquivo de colega; a unica alteracao
  nao-aditiva autorizada foi `lang="en"` -> `lang="pt-BR"`, por acessibilidade.
- `perfil.html` esta orfao e mostra os textos literais "Nome" e "Email".
- `listarTurmas()` nao filtra por `professor`: hoje a RLS e que garante o isolamento, e e
  por isso que o item 2 importa tanto.
- Duas abas de `professor.html` abertas na mesma maquina sobrescrevem a fila offline uma
  da outra.
- Redesenhar `#caixa-avatar` devolve o `<select>` para um avatar ja em uso; o rotulo
  "(em uso)" avisa, mas nao impede.
