# Plataforma Educativa — Projeto Integrador UNIVESP

Plataforma web educativa e gamificada para crianças e estudantes com deficiência
intelectual, feita para uso real em escola parceira.

**No ar desde 2026-11-01:** <https://fabianosannino.github.io/Jogo_Univesp/>

---

## Como usar agora (sem instalar nada)

Abra o endereço acima. A tela de entrada pergunta quem está no computador, e os dois
caminhos existem de propósito:

- **"Sou aluno"** — tela de progresso. A criança escolhe o avatar dela e vê o que já
  conseguiu. **Ela não digita nada em momento nenhum.** Essa é a decisão central do
  projeto, não um detalhe de interface.
- **"Sou professor"** — login, e de lá o cadastro de turma, aluno, atividade e
  progresso.

### Contas de demonstração

O autocadastro está **fechado** de propósito (ver `docs/PENDENCIAS.md`, item 7), então
`cadastro.html` recusa — é o comportamento correto. Para avaliar, use uma das contas
prontas. **A senha é a mesma nas três: `Demo2026!univesp`**

| Conta | Já tem dentro |
|---|---|
| `prof1.teste@example.com` | Turma Girassol - 3º ano — 5 alunos, 4 atividades |
| `prof2.teste@example.com` | Turma Arco-Íris - 4º ano — 4 alunos, 5 atividades |
| `prof3.teste@example.com` | Turma Jabuticaba - 2º ano — 6 alunos, 3 atividades |

São três e não uma compartilhada porque a tela tem um botão "Apagar turma": numa conta
só, o primeiro que confirmasse esse botão esvaziaria a tela de todos os seguintes. Com
três, **pode apagar e bagunçar à vontade** sem estragar o teste de ninguém.

**Nenhum dado real de escola mora nessas contas, e nunca vai** — senha publicada e dado
de criança não convivem. Quando o projeto entrar em sala, cada professora recebe conta
própria e estas três são apagadas.

### Roteiro de 5 minutos

1. Entre com uma das contas. Você cai numa turma montada — clique em
   **"Usar esta turma"**.
2. Cadastre um aluno e escolha o avatar dele (são 30 bichos).
3. Cadastre uma atividade.
4. Marque a atividade como feita para um ou dois alunos.
5. Volte à entrada, clique em **"Sou aluno"** e escolha o avatar que você criou. É isso
   que a criança vê.

Depois entre numa conta diferente: a turma da anterior **desaparece**. Não é a tela
escondendo — é o banco recusando, por professor. Mexer no endereço do navegador não
contorna.

### Uma pegadinha de sala de aula

A turma ativa fica gravada **no navegador**, separada por endereço. Em cada computador
da escola a professora precisa entrar no site e clicar "Usar esta turma" uma vez.
Depois aquele computador lembra.

---

## Divisão da equipe

| Pessoa | Produto | Arquivos |
|---|---|---|
| Pedro Henrique dos Santos Alves | Layout | `style.css`, `principal.html`, `perfil.html`, `script.js`, `login.html`, `cadastro.html` |
| Olívia de Carvalho | Jogos (Unity) | fora deste repositório |
| Fabiano S. | Perfis, Login e Progresso | `js/`, `css/plataforma.css`, `sql/`, `tests/`, `professor.html`, `index.html` |

**Regra seguida neste repositório:** nada é alterado no produto de um colega sem o aval
dele. As exceções que existem estão todas comentadas no próprio arquivo, explicando por
que não deu para ser aditivo. Quem for mexer, mantenha isso.

---

## O que ainda NÃO está ligado

**O jogo e a plataforma funcionam lado a lado, não juntos.** O botão "Baixar o jogo"
entrega o jogo certo, mas quando a criança joga, **o jogo não avisa a plataforma** —
quem marca o que foi concluído é a professora, na mão.

O banco já está pronto para os dois casos: cada progresso grava uma origem,
`'professor'` ou `'jogo'` (`sql/schema.sql`). Hoje só existe `'professor'`; o lugar do
jogo está pronto e vazio.

Ligar isso tem dois caminhos, e **a escolha é uma decisão de equipe ainda aberta**:

- **Caminho A** — o jogo faz uma chamada de rede ao fim de cada fase e a plataforma
  registra sozinha. Mais completo; exige mexer no projeto Unity.
- **Caminho B** — a plataforma só exibe o que o jogo guardar no próprio computador.
  Mais rápido; o progresso fica preso àquela máquina.

---

## Para quem for mexer no código

Site **estático**, sem build e sem instalação: HTML, CSS e JavaScript puro, com módulos
nativos do navegador. O Supabase entra por CDN. Não há bundler, não há framework —
trocar isso destruiria o layout do Pedro.

```
index.html          porta de entrada (aluno ou professor)
principal.html      tela do aluno
professor.html      tela de gestão
login.html          autenticação
js/config.js        URL do Supabase, chave pública, lista de avatares, link do jogo
js/db.js            acesso ao banco
js/fila.js          fila de marcações quando a internet cai
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

80 testes, sem dependência externa — só o `node --test`. **As aspas no comando são
obrigatórias** no Git Bash do Windows, senão o shell expande o `*` antes do Node e o
teste roda vazio.

Os dois arquivos `*.integracao.js` ficam fora desse comando de propósito: eles falam com
o Supabase de verdade e precisam de um `.env.teste` com credenciais, que não está no
repositório.
