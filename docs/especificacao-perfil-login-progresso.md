# Perfil, Login e Progresso — Design

- **Data:** 2026-10-31
- **Responsável:** Fabiano Sannino
- **Status:** aprovado, pronto para plano de implementação
- **Escopo escolhido:** Degrau 2 (ver "Escopo e degraus")

---

## 1. Contexto

Projeto Integrador da UNIVESP: plataforma web educativa e gamificada para crianças e
estudantes com deficiência intelectual, em parceria com escolas.

Três produtos, três responsáveis:

| Produto | Responsável | Estado |
|---|---|---|
| Layout da plataforma | Pedro Henrique dos Santos Alves | HTML/CSS/JS estático, 5 commits, funcional como maquete |
| Jogo educativo 2D | Olivia de Carvalho | Build Windows `.exe` (Unity 6000.5.10f1), protótipo jogável |
| Perfis, Login e Progresso | Fabiano Sannino | este documento |
| Backend | Fabiano X. | não iniciado, sem confirmação de que alguém esteja tocando |

Este documento cobre apenas a terceira linha, e a costura entre as três.

## 2. Objetivo

O professor gerencia a turma, os alunos e as atividades, e registra o que cada aluno
conseguiu fazer. O aluno chega a uma máquina do laboratório, clica no seu avatar e **vê**
o seu progresso — sem digitar nem registrar nada.

Critério de sucesso: funciona com alunos reais em escola — não apenas como demonstração
acadêmica. Essa escolha é o que torna acessibilidade e proteção de dados requisitos de
primeira ordem, e não refinamentos posteriores.

## 3. Restrições

**R1. Não alterar os produtos dos colegas.** Mudanças nos arquivos do Pedro devem ser
aditivas. Exceção única e aprovada: as linhas 33–42 do `script.js`, que implementam
leitura de perfil via `localStorage`. Isso é escopo deste documento, implementado
provisoriamente; mantê-lo causaria dois códigos escrevendo em `#perfil-nome`.

**R2. O jogo não roda no navegador.** Existe apenas como `.exe` Windows. Um executável
fora do navegador não tem canal para reportar nada à plataforma.

**R3. Não existe projeto-fonte Unity.** Verificado: nem no diretório local, nem no
repositório git. Não há `Assets/`, `ProjectSettings/`, `.cs`, `.unity` nem `.csproj`.
Uma build WebGL depende inteiramente de a Olivia ainda ter o projeto na máquina dela.
Se tiver sido perdido, o jogo está congelado como está — ninguém consegue mais
recompilá-lo nem alterá-lo.

**R4. Sem backend próprio.** Supabase como serviço gerenciado. Isso é configuração, não
um projeto de servidor, e portanto não invade a tarefa do Fabiano X.

**R5. Site permanece estático, sem etapa de build.** Supabase entra por `<script>` de CDN.
Migrar para um framework destruiria o trabalho do Pedro e violaria R1.

**R6. Ambiente real:** máquinas de laboratório compartilhadas, internet instável.

## 4. Escopo e degraus

O design foi dimensionado em três degraus. **O escolhido é o Degrau 2.**

| | Degrau 1 | **Degrau 2 (escolhido)** | Degrau 3 (fase seguinte) |
|---|---|---|---|
| Quem registra progresso | professor | professor | professor + jogo |
| Visão do aluno | nenhuma | avatar → vê o próprio progresso | idem, com PIN |
| Gestão do professor | crua | turmas, alunos, atividades, marcação em grade | relatórios elaborados |
| Internet cai ao marcar | perde o registro | guarda e reenvia | guarda e reenvia |
| Testes | manual | caminho crítico automatizado | cobertura ampliada |
| Ponte WebGL | coluna preparada | coluna preparada | ponte implementada |

O Degrau 3 foi deliberadamente adiado: montar relatórios detalhados antes de observar o
que o professor realmente quer olhar tende a produzir trabalho descartado.

**O esforço principal do Degrau 2 é a tela de gestão do professor.** Como o aluno não
insere dado nenhum, essa tela deixa de ser acessório e passa a ser o produto.

## 5. Decisões

### D1 — Supabase via CDN, site estático

Autenticação e banco Postgres gerenciados. Entra como tag `<script>`, sem `npm`, sem
build. Publicável direto no Vercel a partir do repositório.

### D2 — Uma única conta: a do professor

O professor usa e-mail e senha (Supabase Auth padrão). Adulto, com capacidade de
consentimento.

O navegador mantém a sessão. O professor ou o técnico loga em cada máquina do
laboratório **uma vez** — não a cada aula. Isso elimina o problema de um professor
precisar autenticar vinte máquinas no início de cada turma.

Nenhuma criança tem conta de autenticação, e-mail ou senha no sistema.

### D3 — O aluno só vê; quem registra é o professor

```
professor:  login → turma → marca na grade quem fez o quê
aluno:      clica no seu bichinho → vê o próprio progresso
```

O público-alvo são crianças com deficiência intelectual. Pedir a elas que avaliem e
registrem o próprio desempenho transfere a parte mais difícil da tarefa para quem tem
menos condição de executá-la — e o dado resultante não serviria ao professor. Quem
observa, avalia e registra é o adulto.

Para o aluno sobra o que lhe é útil: reconhecer o próprio avatar e ver as próprias
conquistas. Zero digitação, zero entrada de dado, nada que ele possa errar.

A seleção de avatar é **apenas visual** — não autentica nada, porque não há nada a
proteger numa tela que só lê. Se a criança clicar no avatar errado, vê o progresso de
outro colega; não corrompe registro nenhum.

**As duas etapas — escolher avatar e ver o progresso — ficam separadas de propósito.**
É o ponto onde um PIN entraria no futuro, se a visão do aluno algum dia virar escrita,
sem reescrever o fluxo.

### D4 — Progresso é registrado pelo professor, com a coluna `origem`

O jogo não consegue reportar nada (R2). Portanto "progresso" significa *o que o professor
observou e registrou*, não *o que a criança fez no jogo*. O documento registra isso
explicitamente para que ninguém leia o número como uma medição automática.

Cada registro guarda **quem marcou**, no campo `origem`:

- `'professor'` — o professor observou e registrou. Única origem em uso hoje.
- `'jogo'` — reservado. Nenhum registro usa este valor hoje.

O relatório mostra as origens **separadas** e nunca as soma. Quando o jogo começar a
gravar, somar observação humana com telemetria produziria um número sem significado.

Quando a build WebGL existir, o jogo passa a gravar registros com `origem = 'jogo'`.
Mesma tabela, mesmas telas, mesmo código de leitura. É uma fonte nova, não uma
arquitetura nova. Esta coluna é o motivo de ela existir desde já apesar de parecer
inútil hoje.

### D5 — O professor cria o catálogo de atividades

Não há conteúdo educativo definido: a documentação do jogo descreve o mecanismo
(NPC, pergunta, resposta certa/errada) mas não as perguntas.

Isso também é o que o plano de ação já determina — *"os conteúdos seriam definidos de
acordo com as orientações e necessidades apresentadas pela instituição"*.

### D6 — Fila offline

Quando gravar falha, o registro é guardado na própria máquina e reenviado assim que a
conexão voltar. O professor marca a grade inteira da aula e vai embora; a sincronização
acontece sem ele precisar acompanhar.

Perder o progresso de um aluno é exatamente o tipo de falha que faz uma escola abandonar
a ferramenta, e laboratório de escola pública com internet instável é o ambiente previsto
(R6).

### D7 — A tela do aluno nunca o repreende

Mensagens de erro em vermelho falham duas vezes com este público: a criança
provavelmente não lê bem, e a tela está dizendo que ela errou.

Como o aluno não insere nada, ele não tem como errar — essa é a principal razão de a
decisão D3 ser também uma decisão de acessibilidade. O que resta é não transformar
atividade não feita em reprovação: atividade concluída ganha marca visível, atividade
pendente fica neutra e aguardando. Nunca um X vermelho, nunca "você não fez".

Mensagens de erro técnico (falha de rede, por exemplo) aparecem apenas nas telas do
professor.

## 6. Arquitetura de arquivos

```
Jogo_Univesp/
├── login.html  cadastro.html  perfil.html  principal.html   ← Pedro
├── style.css  Forest-Background.jpg  avatar.jpg             ← Pedro, intocados
├── script.js                                                ← Pedro, menos linhas 33–42
│
├── js/                           ← novo
│   ├── supabase.js               inicialização do cliente
│   ├── auth.js                   login do professor, sessão, guarda de página
│   ├── gestao.js                 turmas, alunos e atividades (CRUD do professor)
│   ├── marcacao.js               grade turma × atividade, marcar/desmarcar, fila offline
│   ├── aluno.js                  seleção de avatar e visão somente-leitura do progresso
│   └── relatorio.js              leitura consolidada para o professor
├── sql/
│   └── schema.sql                tabelas e políticas, versionado
└── docs/                        este documento
```

### Alterações nos arquivos do Pedro

1. **Uma tag `<script>` por página.** Aditivo, sem efeito visual.
2. **Atributos `id` nos campos do `login.html`.** Hoje os inputs não têm `id` nem `name`,
   e o `<form>` não tem `id` — não há como ligá-los a nada. Selecionar por estrutura CSS
   funcionaria, mas quebra silenciosamente se o formulário for reordenado. Adicionar `id`
   não altera layout nem aparência. Mesma situação nos dois campos de senha do
   `cadastro.html`.
3. **Remover as linhas 33–42 do `script.js`** (ver R1).

Nada mais. O `style.css` não é tocado.

## 7. Modelo de dados

```sql
turma (
  id          uuid primary key,
  professor   uuid references auth.users,
  nome        text not null
)

aluno (
  id          uuid primary key,
  turma_id    uuid references turma on delete cascade,
  nome        text not null,        -- primeiro nome apenas
  avatar      text not null         -- identificador de avatar pré-definido
)

atividade (
  id          uuid primary key,
  turma_id    uuid references turma on delete cascade,
  titulo      text not null,
  ordem       int  not null
)

progresso (
  id            uuid primary key,
  aluno_id      uuid references aluno on delete cascade,
  atividade_id  uuid references atividade on delete cascade,
  origem        text not null check (origem in ('professor','jogo')),
  criado_em     timestamptz default now()
)
```

Não há coluna `pin`: o aluno não escreve nada, portanto não há escrita a proteger. Se a
visão do aluno algum dia virar escrita, a coluna é adicionada então — não existe dado
histórico que se perca por ela não existir hoje. Isso é o oposto de `origem`, que é
mantida desde já justamente porque registros antigos ficariam ambíguos para sempre sem ela.

### Minimização de dados

**Não são armazenados:** e-mail de aluno, foto de aluno, sobrenome completo, e **em
nenhum lugar a condição de deficiência**. Esta última é inferível do propósito da
plataforma; registrá-la adicionaria risco sem utilidade alguma.

O público é formado por menores, e a plataforma se dirige a pessoas com deficiência
intelectual. Coletar o mínimo é tanto exigência legal quanto a postura correta.

Apagar uma turma remove em cascata alunos, atividades e progresso — que é a forma como a
escola vai solicitar exclusão.

### Isolamento entre turmas

As políticas de acesso do banco garantem que cada professor leia e escreva apenas nas
suas próprias turmas.

**Mas o isolamento para de valer dentro da mesma máquina**, e isso precisa estar escrito
sem rodeio: a tela do aluno roda dentro da sessão do professor (D2). Para o banco, as
duas telas são o *mesmo* usuário autenticado. Logo o banco **não** tem como recusar uma
escrita vinda da tela do aluno — ele não consegue distinguir uma da outra.

A tela do aluno é somente leitura **porque não oferece nenhum controle de escrita**, não
porque o servidor a proíba. Quem abrir as ferramentas de desenvolvedor naquela máquina
escreve como se fosse o professor.

Tornar isso uma garantia de servidor exigiria que a tela do aluno rodasse *deslogada*,
com uma política de leitura pública por turma — ou seja, expor nomes e avatares de
menores num endereço público. O custo é maior que o risco que remove, dado que o
ambiente previsto (R6) é uma máquina de laboratório sob supervisão do professor.
Registrado como lacuna 2.

## 8. Fluxos

**Professor, primeira vez na máquina:** entra com e-mail e senha. A sessão fica guardada.

**Professor, preparando a turma:** cria a turma, cadastra os alunos (nome e avatar) e
monta a lista de atividades. É aqui que está o volume de interface deste degrau.

**Professor, durante ou após a aula:** abre a grade da turma — alunos nas linhas,
atividades nas colunas — e marca o que cada um conseguiu fazer. Com 20 a 30 alunos, a
grade existe para que marcar a turma inteira seja questão de cliques, não de abrir uma
tela por aluno.

**Aluno:** abre a plataforma já logada, clica no seu avatar e vê as suas atividades —
concluídas marcadas, pendentes neutras. Não marca nada. Pode baixar o jogo pela mesma
tela.

**Professor, acompanhando:** abre o relatório e vê, por aluno e por atividade, o que foi
registrado — com as origens separadas.

### A tela principal

Hoje `principal.html` contém apenas `<main class="game"><h1>O jogo vai aqui!</h1></main>`.
O CSS do Pedro já define `.game` com `80vw × 100vh` e `overflow: hidden` — ou seja, um
encaixe pronto para receber conteúdo.

No Degrau 2, esse espaço recebe: um botão para baixar o jogo com instruções de instalação,
e a lista de atividades do aluno em modo leitura. Quando a build WebGL existir, o mesmo
espaço passa a receber o jogo embutido, sem alteração no CSS.

## 9. Testes

Um teste automatizado cobrindo o caminho que não pode quebrar:

> professor cria turma, aluno e atividade → marca a atividade na grade → o aluno clica no
> seu avatar e vê a atividade marcada

Se esse caminho falhar, a plataforma não serve para nada. O restante é verificado
manualmente.

Um segundo teste cobre o isolamento que o banco **de fato** garante: um professor não lê
nem escreve na turma de outro professor. Rodado contra o banco real, porque é exatamente
a política do servidor que está sendo verificada — e uma política de acesso que só existe
no documento não protege ninguém.

Esse teste *não* tenta provar que a tela do aluno é incapaz de escrever: dentro da mesma
máquina ela é capaz, por consequência de D2, e isso está registrado como lacuna 2.

Além disso, uma checagem manual de acessibilidade: navegação por teclado, tamanho dos
alvos de clique, e contraste suficiente para baixa visão.

## 10. Lacunas conhecidas

Registradas deliberadamente, não construídas:

1. **O aluno pode ver o progresso de um colega** clicando no avatar errado, por engano ou
   de propósito. Não há verificação de identidade na tela de leitura. O dado visível é
   nome, avatar e atividades concluídas — nada sensível. Se isso incomodar a escola, é o
   ponto onde o PIN entra (D3).
2. **A sessão do professor fica aberta na máquina**, e é dela que a tela do aluno também
   depende. Consequência: naquela máquina, o acesso de escrita às turmas daquele professor
   está disponível a quem souber usar o console do navegador. A máquina de laboratório tem
   de ser tratada como ambiente confiável e supervisionado — é uma premissa do design, não
   um descuido. Resolver isso de verdade significaria rodar a tela do aluno deslogada, com
   leitura pública por turma, e expor dados de menores publicamente.
3. **Progresso é observado pelo professor, não medido pelo jogo.** Consequência direta de
   R2, e não se resolve sem a build WebGL.

## 11. Dependências externas

| De quem | O que | Impacto se não vier |
|---|---|---|
| Olivia | Confirmar se ainda tem o projeto Unity | Sem ele, o jogo está congelado para sempre |
| Olivia | Build WebGL | Progresso permanece declarado; `origem = 'jogo'` nunca é usado |
| Pedro | Decisão sobre o seletor de foto | Ver abaixo |
| Fabiano X. | Backend | Nenhum. Este design não o bloqueia nem o duplica |

### Questão em aberto com o Pedro

O `perfil.html` tem um seletor que aceita **upload de foto**
(`<input type="file" accept="image/*">`). Para uso real, isso significaria fotos de
crianças com deficiência intelectual — dado pessoal de menor, de categoria sensível.
Atualmente a foto nem chega a ser salva, apenas exibida, então nada depende disso.

Recomendação a levar a ele: substituir por uma grade de avatares pré-definidos. É mais
seguro juridicamente e melhor para o público, que reconhece a própria conta por um
personagem consistente com mais facilidade do que por uma foto. Conversa também com o
mascote previsto no plano de ação.

A decisão é dele: é interface, território do Pedro. Este documento não a toma.

## 12. O que este design deliberadamente não faz

- Não reescreve nada do Pedro nem da Olivia
- Não adota framework nem etapa de build
- Não constrói o backend do Fabiano X.
- Não tenta extrair dados do `.exe` — é impossível, e fingir o contrário produziria
  números falsos
- Não implementa sincronização bidirecional nem modo offline completo
