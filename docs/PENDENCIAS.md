# O que falta para a plataforma funcionar

Escrito em 2026-10-31, ao fim da branch `perfil-login-progresso`.

Os 59 testes automatizados passam, e isso diz menos do que parece: eles provam que a
logica de interface e de dados esta correta **isoladamente**. Nenhum deles toca o banco.

## 1. O esquema nunca foi aplicado (bloqueia tudo)

Sondando a API REST do projeto com a chave anon, as quatro tabelas respondem:

```
404 PGRST205 — Could not find the table 'public.turma' in the schema cache
                                        'public.aluno'
                                        'public.atividade'
                                        'public.progresso'
```

`sql/schema.sql` e `sql/politicas.sql` existem no repositorio e **nunca rodaram**. A chave
anon nao executa DDL; isto precisa do SQL Editor do painel do Supabase.

Ordem obrigatoria:

1. `sql/schema.sql` (tabelas, `unique (aluno_id, atividade_id, origem)`)
2. `sql/politicas.sql` (Row Level Security)
3. `NOTIFY pgrst, 'reload schema';`

O passo 3 nao e opcional. `js/db.js:112` usa o embed `aluno!inner(turma_id)`, que devolve
`PGRST200` enquanto o cache do PostgREST estiver velho. E a unica linha de `db.js` que
nao da para declarar correta so lendo o codigo.

Depois, `sql/verificacao_esquema.sql` confere a estrutura — mas atencao: a linha 11 insere
uma `turma` sem `professor` e so passa porque o SQL Editor roda como `postgres`, que tem
BYPASSRLS. **Isso nao prova que a politica funciona.** Quem prova e o item 2.

## 2. Dois testes de integracao nunca rodaram

- `tests/caminho_critico.integracao.js` — o fluxo inteiro contra o banco real
- `tests/politicas.integracao.js` — um professor nao ve a turma do outro

Nenhum dos dois termina em `.test.js`, de proposito: `npm test` tem de continuar rodando
sem rede e sem conta. Rode-os a mao (`node tests/politicas.integracao.js`).

Os dois exigem **duas contas de professor confirmadas**. Hoje
`GET /auth/v1/settings` devolve `mailer_autoconfirm: false`, entao uma conta criada por
signup nasce sem sessao e o login seguinte falha com "Email not confirmed". Ou confirme os
dois e-mails de verdade, ou ligue o autoconfirm no painel.

O teste de politicas e o unico que responde a pergunta que importa para a LGPD: se o
professor A consegue ler os alunos do professor B, a plataforma nao pode ser usada.

## 3. Verificacao manual no navegador

Nada disto foi verificado — a extensao do Chrome nao estava conectada nesta sessao.

- **Review Focus 5:** abrir `principal.html` em janela anonima (sem `localStorage`).
  Esperado: a caixa "Este computador ainda nao foi preparado. Chame o professor." Sem tela
  branca, sem erro vermelho no console. O que esta provado por teste e que
  `renderAreaAluno({ estado: 'sem-turma' })` devolve a frase certa; o que **nao** esta
  provado e a fiacao, isto e, que `js/aluno.js` chega nesse estado.
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
