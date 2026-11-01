# Perfil, Login e Progresso — Plano de Implementação

> As etapas usam caixas de marcação (`- [ ]`) para acompanhar o que já foi feito.

**Goal:** O professor cria turmas, alunos e atividades, marca o que cada aluno concluiu, e o aluno vê o próprio progresso clicando no seu avatar.

**Architecture:** Site estático servido direto do repositório. O Supabase entra por `import` de CDN em módulos ES, sem `npm install` e sem empacotador. A lógica que dá para errar — fila offline, montagem da grade, geração de HTML, consultas — fica em módulos puros que recebem suas dependências por parâmetro, e por isso roda no test runner embutido do Node sem rede e sem navegador. A fiação de DOM fica fina de propósito, porque é a única parte verificada à mão.

**Tech Stack:** HTML/CSS/JS sem framework · módulos ES nativos · Supabase JS v2 via `cdn.jsdelivr.net` · Postgres com Row Level Security · `node --test` (embutido no Node 24, zero dependências)

**Spec:** `docs/especificacao-perfil-login-progresso.md`

## Global Constraints

- **Não alterar os produtos dos colegas** (spec R1). Em arquivos do Pedro, só mudanças aditivas: uma tag `<script>`, uma tag `<link>`, atributos `id`. Exceções aprovadas e únicas: linhas 33–42 do `script.js` e o `cadastro.js` inteiro — ambos implementam perfil/cadastro via `localStorage`, que é escopo deste documento.
- **`style.css` não é tocado.** Estilo novo vai em `css/plataforma.css`, ligado por uma tag `<link>` adicional.
- **Sem etapa de build e sem `npm install`** (spec R5). O `package.json` criado na Task 2 existe só para dizer ao Node que `.js` é módulo ES; não tem dependências e não é instalado.
- **Nada de framework.** Nenhum React, Next, Vite, bundler ou transpilador.
- **Não armazenar** e-mail de aluno, foto de aluno, sobrenome completo, nem a condição de deficiência (spec §7).
- **A única origem de progresso em uso é `'professor'`.** O valor `'jogo'` existe no banco e não é gravado por nenhum código deste plano.
- **O aluno não insere dado nenhum.** Nenhuma tela do aluno tem campo de texto, botão de marcar, ou qualquer controle de escrita.
- **Nunca marcar atividade pendente com erro.** Sem X vermelho, sem "você não fez". Concluída ganha marca; pendente fica neutra (spec D7).
- **Chave do Supabase:** usar apenas a chave `anon public`. A `service_role` nunca entra no repositório nem no navegador.
- **URL do projeto Supabase:** `https://mdtuldswgsgewqfnggqe.supabase.co`
- **Idioma:** identificadores, mensagens e comentários em português, sem acento em nomes de arquivo e de função.
- **Testes:** `node --test tests/` tem de passar antes de cada commit.

## Review Focus

Cinco coisas que a spec implica, que um usuário real encontra, e que nenhuma tarefa testaria se este plano não mandasse. Cada linha tem o teste já embutido na tarefa dona do código.

1. **Nome de aluno com `<`, `&` ou `"`** vai para dentro de HTML gerado por concatenação. Um nome colado de um PDF da escola, ou um `Ana & Maria`, quebra a tela — e um nome com `<script>` é execução de código. Esperado: o nome aparece como texto literal. *(Task 6, teste de `escaparHtml`)*
2. **Duplo clique na mesma célula da grade.** Professor com 30 alunos clica rápido; a segunda chamada chega antes da primeira terminar. Esperado: uma marcação, não duas, e nenhum erro na tela. *(Task 1, restrição `unique` no banco; Task 3, teste "o mesmo item nao entra duas vezes" na fila)*
3. **Turma sem alunos ou sem atividades.** É o estado de toda turma recém-criada, ou seja, o primeiro estado que o professor vê. Esperado: grade vazia com instrução do que fazer, não `undefined` nem tela branca. *(Task 5, testes de grade vazia com motivo; Task 6, teste "grade vazia explica o que falta")*
4. **`localStorage` com JSON corrompido** na chave da fila. Máquina de laboratório compartilhada, limpeza parcial de cache, outra aba escrevendo. Esperado: descartar o conteúdo ilegível e seguir funcionando, nunca travar a tela de marcação. *(Task 3, testes de JSON inválido, conteúdo que não é lista, e armazenamento bloqueado)*
5. **Aluno abre `principal.html` sem turma ativa definida** naquela máquina — ninguém configurou, ou o cache foi limpo. Esperado: uma frase dizendo para chamar o professor, não tela branca nem erro no console. *(Task 6, teste "area do aluno sem turma ativa manda chamar o professor")*

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Testado |
|---|---|---|
| `sql/schema.sql` | tabelas, restrições, índices, RLS ligada | `sql/verificacao_esquema.sql` |
| `sql/politicas.sql` | políticas de acesso por professor | `tests/politicas.integracao.js` (banco real) |
| `package.json` | diz ao Node que `.js` é módulo ES. Sem dependências | — |
| `js/config.js` | URL, chave anon, lista de avatares | — |
| `js/supabase.js` | cria o cliente a partir da CDN | — (só fiação; nunca importado por teste) |
| `js/fila.js` | fila offline: enfileirar, drenar, descartar lixo | `tests/fila.test.js` |
| `js/db.js` | todas as operações de banco; recebe o cliente por parâmetro | `tests/db.test.js` |
| `js/grade.js` | monta a matriz alunos × atividades | `tests/grade.test.js` |
| `js/render.js` | funções puras: dados → string de HTML | `tests/render.test.js` |
| `js/auth.js` | login, cadastro, sessão, guarda de página | manual |
| `js/professor.js` | fiação da tela do professor | manual |
| `js/aluno.js` | fiação da tela do aluno | manual |
| `css/plataforma.css` | estilo só do que é novo | manual |
| `professor.html` | tela de gestão e marcação (arquivo novo, meu) | manual |
| `tests/caminho_critico.integracao.js` | o caminho que não pode quebrar, da spec §9 | é o teste |
| `jogo/JogosEducativos.zip` | a build Windows que o aluno baixa | manual |

Arquivos do Pedro e o que acontece com cada um:

| Arquivo | Mudança |
|---|---|
| `login.html` | `id` nos dois campos e no `<form>`; uma tag `<script>` |
| `cadastro.html` | `id` nos dois campos de senha; troca de `cadastro.js` por `js/auth.js` |
| `principal.html` | uma tag `<link>`, uma tag `<script>` |
| `perfil.html` | nada |
| `script.js` | remover linhas 33–42 |
| `cadastro.js` | arquivo removido |
| `style.css` | **nada** |

A razão de `fila.js`, `db.js`, `grade.js` e `render.js` serem arquivos separados é que são as quatro coisas que dá para testar sem navegador. Mantê-las longe de `querySelector` é o que permite rodar `node --test` sem nenhuma dependência instalada.

**Duas diferenças em relação ao §6 da spec, de propósito.** A spec previa `js/gestao.js`, `js/marcacao.js` e `js/relatorio.js`.

- `gestao.js` e `marcacao.js` viraram um só `js/professor.js`. Os dois seriam fiação de DOM da mesma página, mexendo no mesmo objeto de estado e no mesmo seletor de turma; separá-los obrigaria a inventar um canal entre eles para nada. O corte que vale é o que foi feito: a lógica testável saiu para `grade.js` e `fila.js`, e sobrou fiação fina num arquivo.
- `relatorio.js` não é criado. O relatório que a spec descreve em §8 — "por aluno e por atividade, o que foi registrado" — é literalmente a grade: alunos nas linhas, atividades nas colunas. Quanto à separação por origem, `montarGrade` já devolve `origens` em cada célula, mas nenhum código deste plano grava `'jogo'`, então toda célula marcada teria a mesma origem e a distinção não mostraria nada. Quando a build WebGL existir e começar a gravar, exibir a distinção é mudança só em `render.js`, com o dado já no lugar.

---

## Task 1: Esquema do banco

**Files:**
- Create: `sql/schema.sql`
- Create: `sql/verificacao_esquema.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tabelas `turma`, `aluno`, `atividade`, `progresso` com os nomes de coluna que a Task 4 (`db.js`) usa nas consultas: `turma(id, professor, nome, criada_em)`, `aluno(id, turma_id, nome, avatar)`, `atividade(id, turma_id, titulo, ordem)`, `progresso(id, aluno_id, atividade_id, origem, criado_em)`.

As políticas de acesso **não** entram aqui — entram na Task 7, junto com a autenticação, porque uma política só pode ser verificada quando existem contas de verdade para comparar. Esta tarefa liga a RLS sem criar política nenhuma, o que faz o Postgres negar tudo por padrão. É o estado seguro para o intervalo entre esta tarefa e a Task 7.

- [ ] **Step 1: Escrever a verificação que vai falhar**

Crie `sql/verificacao_esquema.sql`:

```sql
-- Verifica o esquema: restrições e cascata.
-- Roda no SQL Editor do Supabase. Tudo que cria, apaga no fim.
-- Se algo estiver errado, levanta exceção e desfaz a transação inteira.
do $$
declare
  id_turma     uuid;
  id_aluno     uuid;
  id_atividade uuid;
  sobraram     int;
begin
  insert into turma (nome) values ('__verificacao__')
    returning id into id_turma;
  insert into aluno (turma_id, nome, avatar) values (id_turma, 'Teste', 'coruja')
    returning id into id_aluno;
  insert into atividade (turma_id, titulo, ordem) values (id_turma, 'Teste', 1)
    returning id into id_atividade;
  insert into progresso (aluno_id, atividade_id, origem)
    values (id_aluno, id_atividade, 'professor');

  -- origem 'aluno' tem de ser recusada: o aluno nao registra nada
  begin
    insert into progresso (aluno_id, atividade_id, origem)
      values (id_aluno, id_atividade, 'aluno');
    raise exception 'FALHOU: origem "aluno" foi aceita';
  exception
    when check_violation then null;
  end;

  -- marcacao duplicada tem de ser recusada (duplo clique na grade)
  begin
    insert into progresso (aluno_id, atividade_id, origem)
      values (id_aluno, id_atividade, 'professor');
    raise exception 'FALHOU: marcacao duplicada foi aceita';
  exception
    when unique_violation then null;
  end;

  -- apagar a turma tem de apagar aluno, atividade e progresso
  delete from turma where id = id_turma;

  select count(*) into sobraram from aluno where id = id_aluno;
  if sobraram <> 0 then
    raise exception 'FALHOU: aluno sobreviveu ao delete da turma';
  end if;

  select count(*) into sobraram from atividade where id = id_atividade;
  if sobraram <> 0 then
    raise exception 'FALHOU: atividade sobreviveu ao delete da turma';
  end if;

  select count(*) into sobraram from progresso where aluno_id = id_aluno;
  if sobraram <> 0 then
    raise exception 'FALHOU: progresso sobreviveu ao delete da turma';
  end if;

  raise notice 'OK: esquema verificado';
end $$;
```

- [ ] **Step 2: Rodar a verificação para confirmar que falha**

Abra https://supabase.com/dashboard/project/mdtuldswgsgewqfnggqe/sql/new, cole o conteúdo de `sql/verificacao_esquema.sql` e execute.

Esperado: FALHA com `relation "turma" does not exist`.

- [ ] **Step 3: Escrever o esquema**

Crie `sql/schema.sql`:

```sql
-- Esquema de Perfil, Login e Progresso.
-- Seguro de rodar mais de uma vez.

create table if not exists turma (
  id         uuid primary key default gen_random_uuid(),
  professor  uuid references auth.users (id) on delete cascade,
  nome       text not null,
  criada_em  timestamptz not null default now()
);

create table if not exists aluno (
  id        uuid primary key default gen_random_uuid(),
  turma_id  uuid not null references turma (id) on delete cascade,
  nome      text not null,          -- primeiro nome apenas
  avatar    text not null           -- id de avatar pre-definido (js/config.js)
);

create table if not exists atividade (
  id        uuid primary key default gen_random_uuid(),
  turma_id  uuid not null references turma (id) on delete cascade,
  titulo    text not null,
  ordem     int  not null
);

create table if not exists progresso (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references aluno (id) on delete cascade,
  atividade_id  uuid not null references atividade (id) on delete cascade,
  origem        text not null check (origem in ('professor', 'jogo')),
  criado_em     timestamptz not null default now(),
  unique (aluno_id, atividade_id, origem)
);

create index if not exists aluno_turma_idx     on aluno (turma_id);
create index if not exists atividade_turma_idx on atividade (turma_id);
create index if not exists progresso_aluno_idx on progresso (aluno_id);

-- RLS ligada sem politica nenhuma = ninguem acessa.
-- As politicas entram em sql/politicas.sql (Task 7).
alter table turma     enable row level security;
alter table aluno     enable row level security;
alter table atividade enable row level security;
alter table progresso enable row level security;
```

Três decisões que a spec não detalha e que ficam registradas aqui:

- `unique (aluno_id, atividade_id, origem)` existe para o duplo clique da Review Focus 2. Sem ela, o professor clicando rápido gera duas linhas e o relatório conta dois.
- `turma.professor` aceita nulo. É o que permite a verificação acima rodar sem inventar uma conta de usuário.
- `on delete cascade` em `turma.professor`: apagar a conta do professor apaga as turmas dele. É o que a escola vai pedir ao desligar um professor.

- [ ] **Step 4: Aplicar o esquema**

No mesmo SQL Editor, cole o conteúdo de `sql/schema.sql` e execute.

Esperado: `Success. No rows returned`.

- [ ] **Step 5: Rodar a verificação para confirmar que passa**

Cole `sql/verificacao_esquema.sql` novamente e execute.

Esperado: SUCESSO, com `OK: esquema verificado` no painel de mensagens. Nenhuma linha `__verificacao__` sobra em `turma`.

- [ ] **Step 6: Commit**

```bash
git add sql/schema.sql sql/verificacao_esquema.sql
git commit -m "feat: esquema de turma, aluno, atividade e progresso"
```

---

## Task 2: Configuração e cliente Supabase

**Files:**
- Create: `package.json`
- Create: `js/config.js`
- Create: `js/supabase.js`
- Create: `tests/config.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `js/config.js` → `SUPABASE_URL: string`, `SUPABASE_ANON_KEY: string`, `AVATARES: Array<{id: string, rotulo: string, emoji: string}>`
  - `js/supabase.js` → `supabase` (cliente já criado). **Nunca importe este arquivo num teste**: ele importa de uma URL, e o Node não resolve URL em `import`. Todo módulo testável recebe o cliente por parâmetro.

- [ ] **Step 1: Criar o `package.json`**

```json
{
  "name": "jogo-univesp-perfil-progresso",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

Esse arquivo não tem dependências e **não deve ser instalado**. `"type": "module"` serve para o Node ler os `.js` como módulo ES, do mesmo jeito que o navegador já lê com `<script type="module">`. Sem ele, o Node trataria os arquivos como CommonJS e os `import` falhariam. Isso não é etapa de build: nada é compilado, nada é empacotado, e os arquivos servidos ao navegador são exatamente os do repositório.

- [ ] **Step 2: Escrever o teste da lista de avatares**

Crie `tests/config.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATARES } from '../js/config.js';

test('existe avatar suficiente para uma turma', () => {
  assert.ok(AVATARES.length >= 12, 'uma turma tem 20 a 30 alunos; 12 e o minimo util');
});

test('todo avatar tem id, rotulo e emoji', () => {
  for (const a of AVATARES) {
    assert.match(a.id, /^[a-z]+$/, `id invalido: ${a.id}`);
    assert.ok(a.rotulo.length > 0, `rotulo vazio em ${a.id}`);
    assert.ok(a.emoji.length > 0, `emoji vazio em ${a.id}`);
  }
});

test('nenhum id de avatar repetido', () => {
  const ids = AVATARES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'dois avatares com o mesmo id');
});
```

O id é o que vai gravado em `aluno.avatar`. Se dois avatares tiverem o mesmo id, dois alunos ficam indistinguíveis na tela — que é exatamente o erro que a criança comete sozinha.

- [ ] **Step 3: Rodar o teste para confirmar que falha**

Run: `node --test tests/config.test.js`
Esperado: FALHA com `Cannot find module` apontando para `js/config.js`.

- [ ] **Step 4: Escrever a configuração**

Crie `js/config.js`:

```js
// Configuracao da plataforma.
// A chave anon e publica por desenho: quem protege os dados e a Row Level
// Security do banco, nao o sigilo desta chave. A chave service_role NUNCA
// entra aqui.
export const SUPABASE_URL = 'https://mdtuldswgsgewqfnggqe.supabase.co';
export const SUPABASE_ANON_KEY = 'COLE_A_CHAVE_ANON_AQUI';

// Avatares em emoji: nenhum arquivo de imagem para carregar, funciona sem
// rede, e cresce no tamanho que a tela precisar sem perder nitidez.
export const AVATARES = [
  { id: 'coruja',    rotulo: 'Coruja',    emoji: '\u{1F989}' },
  { id: 'raposa',    rotulo: 'Raposa',    emoji: '\u{1F98A}' },
  { id: 'tartaruga', rotulo: 'Tartaruga', emoji: '\u{1F422}' },
  { id: 'gato',      rotulo: 'Gato',      emoji: '\u{1F431}' },
  { id: 'cachorro',  rotulo: 'Cachorro',  emoji: '\u{1F436}' },
  { id: 'leao',      rotulo: 'Leao',      emoji: '\u{1F981}' },
  { id: 'sapo',      rotulo: 'Sapo',      emoji: '\u{1F438}' },
  { id: 'pinguim',   rotulo: 'Pinguim',   emoji: '\u{1F427}' },
  { id: 'abelha',    rotulo: 'Abelha',    emoji: '\u{1F41D}' },
  { id: 'borboleta', rotulo: 'Borboleta', emoji: '\u{1F98B}' },
  { id: 'golfinho',  rotulo: 'Golfinho',  emoji: '\u{1F42C}' },
  { id: 'elefante',  rotulo: 'Elefante',  emoji: '\u{1F418}' },
  { id: 'panda',     rotulo: 'Panda',     emoji: '\u{1F43C}' },
  { id: 'unicornio', rotulo: 'Unicornio', emoji: '\u{1F984}' },
  { id: 'caranguejo',rotulo: 'Caranguejo',emoji: '\u{1F980}' },
  { id: 'joaninha',  rotulo: 'Joaninha',  emoji: '\u{1F41E}' },
];

export function acharAvatar(id) {
  return AVATARES.find((a) => a.id === id) ?? null;
}
```

- [ ] **Step 5: Rodar o teste para confirmar que passa**

Run: `node --test tests/config.test.js`
Esperado: PASSA, 3 testes.

- [ ] **Step 6: Pegar a chave anon e colar na configuração**

No painel: https://supabase.com/dashboard/project/mdtuldswgsgewqfnggqe/settings/api-keys → seção **Project API keys** → copie o valor de **`anon` `public`**.

Substitua `'COLE_A_CHAVE_ANON_AQUI'` em `js/config.js` por essa chave.

Confirme que a chave copiada é a `anon public`. Se o rótulo disser `service_role`, é a errada: ela ignora todas as políticas de acesso e colocá-la no navegador entrega o banco inteiro a qualquer visitante.

- [ ] **Step 7: Escrever o cliente**

Crie `js/supabase.js`:

```js
// Cria o cliente Supabase a partir da CDN, sem npm e sem empacotador.
// Este arquivo e carregado apenas pelo navegador.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (SUPABASE_ANON_KEY.startsWith('COLE_')) {
  throw new Error(
    'A chave anon nao foi configurada. Edite js/config.js e cole a chave ' +
    '"anon public" do painel do Supabase.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,     // a sessao do professor sobrevive ao fechar a aba
    autoRefreshToken: true,
  },
});
```

`persistSession: true` é o que realiza a decisão D2 da spec: o professor loga uma vez na máquina do laboratório, não uma vez por aula.

- [ ] **Step 8: Commit**

```bash
git add package.json js/config.js js/supabase.js tests/config.test.js
git commit -m "feat: configuracao, lista de avatares e cliente Supabase via CDN"
```

---

## Task 3: Fila offline

**Files:**
- Create: `js/fila.js`
- Create: `tests/fila.test.js`

**Interfaces:**
- Consumes: nada. Recebe o armazenamento por parâmetro, para o teste poder passar um falso.
- Produces: `criarFila(armazenamento, chave?) → { enfileirar(item), itens(), tamanho(), drenar(enviar) }`
  - `item` é `{ acao: 'marcar' | 'desmarcar', aluno_id: string, atividade_id: string }`
  - `drenar(enviar)` recebe `enviar: (item) => Promise<void>` e devolve `Promise<{ enviados: number, pendentes: number }>`

Esta é a primeira tarefa de JavaScript porque é a de maior risco e a de dependência zero: perder a marcação de um aluno é o tipo de falha que faz uma escola abandonar a ferramenta (spec D6), e dá para testar inteira sem rede, sem banco e sem navegador.

- [ ] **Step 1: Escrever os testes que vão falhar**

Crie `tests/fila.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarFila } from '../js/fila.js';

// localStorage falso: a parte do contrato que a fila usa.
function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: (k) => { delete dados[k]; },
  };
}

const ITEM = { acao: 'marcar', aluno_id: 'a1', atividade_id: 't1' };

test('fila nova esta vazia', () => {
  const fila = criarFila(armazenamentoFalso());
  assert.equal(fila.tamanho(), 0);
  assert.deepEqual(fila.itens(), []);
});

test('enfileirar guarda o item', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1);
  assert.deepEqual(fila.itens(), [ITEM]);
});

test('enfileirar persiste no armazenamento', () => {
  const arm = armazenamentoFalso();
  criarFila(arm).enfileirar(ITEM);
  // uma fila nova, sobre o mesmo armazenamento, ve o que a anterior gravou
  assert.equal(criarFila(arm).tamanho(), 1);
});

test('o mesmo item nao entra duas vezes', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  fila.enfileirar({ ...ITEM });
  assert.equal(fila.tamanho(), 1, 'duplo clique nao pode virar duas marcacoes');
});

test('marcar e desmarcar a mesma celula se anulam', () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar({ acao: 'marcar', aluno_id: 'a1', atividade_id: 't1' });
  fila.enfileirar({ acao: 'desmarcar', aluno_id: 'a1', atividade_id: 't1' });
  assert.equal(fila.tamanho(), 0, 'nao ha o que enviar: o estado voltou ao inicio');
});

test('drenar envia e esvazia', async () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar(ITEM);
  fila.enfileirar({ acao: 'marcar', aluno_id: 'a2', atividade_id: 't1' });

  const enviados = [];
  const r = await fila.drenar(async (item) => { enviados.push(item); });

  assert.equal(r.enviados, 2);
  assert.equal(r.pendentes, 0);
  assert.equal(fila.tamanho(), 0);
  assert.equal(enviados.length, 2);
});

test('o que falha fica na fila; o que passa sai', async () => {
  const fila = criarFila(armazenamentoFalso());
  fila.enfileirar({ acao: 'marcar', aluno_id: 'ok', atividade_id: 't1' });
  fila.enfileirar({ acao: 'marcar', aluno_id: 'ruim', atividade_id: 't1' });

  const r = await fila.drenar(async (item) => {
    if (item.aluno_id === 'ruim') throw new Error('sem rede');
  });

  assert.equal(r.enviados, 1);
  assert.equal(r.pendentes, 1);
  assert.deepEqual(fila.itens(), [
    { acao: 'marcar', aluno_id: 'ruim', atividade_id: 't1' },
  ]);
});

test('o que falhou persiste para a proxima tentativa', async () => {
  const arm = armazenamentoFalso();
  const fila = criarFila(arm);
  fila.enfileirar(ITEM);
  await fila.drenar(async () => { throw new Error('sem rede'); });

  assert.equal(criarFila(arm).tamanho(), 1, 'recarregar a pagina nao pode perder a marcacao');
});

// Review Focus 4
test('JSON corrompido no armazenamento e descartado sem travar', () => {
  const arm = armazenamentoFalso({ fila_progresso: '{isto nao e json' });
  const fila = criarFila(arm);
  assert.equal(fila.tamanho(), 0);
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1, 'a fila volta a funcionar depois do lixo');
});

test('conteudo que nao e lista e descartado', () => {
  const arm = armazenamentoFalso({ fila_progresso: '{"a":1}' });
  assert.equal(criarFila(arm).tamanho(), 0);
});

test('itens sem os campos obrigatorios sao descartados', () => {
  const arm = armazenamentoFalso({
    fila_progresso: JSON.stringify([
      ITEM,
      { acao: 'marcar' },
      { acao: 'inventada', aluno_id: 'a1', atividade_id: 't1' },
    ]),
  });
  assert.deepEqual(criarFila(arm).itens(), [ITEM], 'so o item valido sobrevive');
});

test('armazenamento indisponivel nao derruba a fila', () => {
  const quebrado = {
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
    removeItem: () => {},
  };
  const fila = criarFila(quebrado);
  assert.equal(fila.tamanho(), 0);
  fila.enfileirar(ITEM);
  assert.equal(fila.tamanho(), 1, 'a fila segue na memoria mesmo sem conseguir gravar');
});
```

Os três últimos testes são a Review Focus 4. Numa máquina de laboratório compartilhada, `localStorage` é território hostil: outra aba escreve, uma limpeza corta o JSON no meio, ou o navegador bloqueia o acesso por configuração. Nenhum desses casos pode impedir o professor de marcar a aula.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `node --test tests/fila.test.js`
Esperado: FALHA com `Cannot find module` apontando para `js/fila.js`.

- [ ] **Step 3: Escrever a fila**

Crie `js/fila.js`:

```js
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
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `node --test tests/fila.test.js`
Esperado: PASSA, 12 testes.

- [ ] **Step 5: Commit**

```bash
git add js/fila.js tests/fila.test.js
git commit -m "feat: fila offline de marcacoes com descarte de dado corrompido"
```

---

## Task 4: Camada de dados

**Files:**
- Create: `js/db.js`
- Create: `tests/db.test.js`

**Interfaces:**
- Consumes: `js/supabase.js` → `supabase`, mas **apenas quem chama** passa o cliente. O módulo não importa nada.
- Produces: `criarDb(cliente) → db`, com:
  - `db.listarTurmas() → Promise<Array<{id, nome, criada_em}>>`
  - `db.criarTurma(nome, idProfessor) → Promise<{id, nome}>`
  - `db.apagarTurma(idTurma) → Promise<void>`
  - `db.listarAlunos(idTurma) → Promise<Array<{id, nome, avatar}>>`
  - `db.criarAluno(idTurma, nome, avatar) → Promise<{id, nome, avatar}>`
  - `db.listarAtividades(idTurma) → Promise<Array<{id, titulo, ordem}>>`
  - `db.criarAtividade(idTurma, titulo, ordem) → Promise<{id, titulo, ordem}>`
  - `db.listarProgresso(idTurma) → Promise<Array<{aluno_id, atividade_id, origem}>>`
  - `db.marcar(idAluno, idAtividade) → Promise<void>`
  - `db.desmarcar(idAluno, idAtividade) → Promise<void>`

O cliente entra por parâmetro por um motivo prático: `js/supabase.js` importa de uma URL, e `import` de URL não funciona no Node. Passando o cliente, toda consulta fica testável sem rede.

- [ ] **Step 1: Escrever os testes que vão falhar**

Crie `tests/db.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb } from '../js/db.js';

// Cliente Supabase falso. O construtor de consulta do Supabase e encadeavel e
// "thenable": da para usar await nele. O falso registra as chamadas na ordem.
function clienteFalso(resposta = { data: [], error: null }) {
  const chamadas = [];
  const alvo = {
    select(cols)      { chamadas.push(['select', cols]);      return alvo; },
    insert(linhas)    { chamadas.push(['insert', linhas]);    return alvo; },
    delete()          { chamadas.push(['delete']);            return alvo; },
    eq(col, val)      { chamadas.push(['eq', col, val]);      return alvo; },
    order(col, opts)  { chamadas.push(['order', col, opts]);  return alvo; },
    single()          { chamadas.push(['single']);            return alvo; },
    then(ok, falha)   { return Promise.resolve(resposta).then(ok, falha); },
  };
  return {
    chamadas,
    from(tabela) { chamadas.push(['from', tabela]); return alvo; },
  };
}

test('listarTurmas le a tabela turma em ordem de nome', async () => {
  const cliente = clienteFalso({ data: [{ id: 't1', nome: 'Turma A' }], error: null });
  const turmas = await criarDb(cliente).listarTurmas();

  assert.deepEqual(turmas, [{ id: 't1', nome: 'Turma A' }]);
  assert.deepEqual(cliente.chamadas[0], ['from', 'turma']);
  assert.ok(cliente.chamadas.some(([m, c]) => m === 'order' && c === 'nome'));
});

test('criarTurma grava nome e professor', async () => {
  const cliente = clienteFalso({ data: { id: 't1', nome: 'Turma A' }, error: null });
  const turma = await criarDb(cliente).criarTurma('Turma A', 'prof-1');

  assert.deepEqual(turma, { id: 't1', nome: 'Turma A' });
  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], { nome: 'Turma A', professor: 'prof-1' });
});

test('listarAlunos filtra pela turma e ordena por nome', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarAlunos('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'aluno']);
  assert.ok(cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'turma_id' && v === 't1'));
  assert.ok(cliente.chamadas.some(([m, c]) => m === 'order' && c === 'nome'));
});

test('criarAluno grava turma, nome e avatar', async () => {
  const cliente = clienteFalso({ data: { id: 'a1' }, error: null });
  await criarDb(cliente).criarAluno('t1', 'Joao', 'coruja');

  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], { turma_id: 't1', nome: 'Joao', avatar: 'coruja' });
});

test('listarAtividades ordena pelo campo ordem, nao pelo titulo', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarAtividades('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'atividade']);
  assert.ok(
    cliente.chamadas.some(([m, c]) => m === 'order' && c === 'ordem'),
    'a sequencia pedagogica e a ordem definida pelo professor'
  );
});

test('marcar grava origem professor', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  await criarDb(cliente).marcar('a1', 'at1');

  const insert = cliente.chamadas.find(([m]) => m === 'insert');
  assert.deepEqual(insert[1], {
    aluno_id: 'a1',
    atividade_id: 'at1',
    origem: 'professor',
  });
});

test('desmarcar apaga apenas o registro do professor', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  await criarDb(cliente).desmarcar('a1', 'at1');

  assert.ok(cliente.chamadas.some(([m]) => m === 'delete'));
  assert.ok(
    cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'origem' && v === 'professor'),
    'desmarcar nao pode apagar o que o jogo registrou'
  );
});

test('listarProgresso filtra pela turma do aluno', async () => {
  const cliente = clienteFalso({ data: [], error: null });
  await criarDb(cliente).listarProgresso('t1');

  assert.deepEqual(cliente.chamadas[0], ['from', 'progresso']);
  assert.ok(cliente.chamadas.some(([m, c, v]) => m === 'eq' && c === 'aluno.turma_id' && v === 't1'));
});

test('erro do banco virar excecao com mensagem legivel', async () => {
  const cliente = clienteFalso({ data: null, error: { message: 'permission denied' } });
  await assert.rejects(
    () => criarDb(cliente).listarTurmas(),
    /permission denied/
  );
});

test('data nulo em listagem devolve lista vazia, nao nulo', async () => {
  const cliente = clienteFalso({ data: null, error: null });
  assert.deepEqual(await criarDb(cliente).listarTurmas(), []);
});
```

O teste de `desmarcar` é o que protege a decisão D4 da spec: quando a build WebGL existir, o jogo vai gravar linhas com `origem = 'jogo'`. Um `delete` sem o filtro de origem apagaria o registro do jogo junto, e o professor destruiria dado de telemetria sem perceber. O filtro custa uma linha agora e evita um bug que só apareceria meses depois.

O último teste existe porque o Supabase devolve `data: null` quando a consulta não casa nada em algumas situações. Devolver `null` para a tela faria a grade quebrar com `Cannot read properties of null`.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `node --test tests/db.test.js`
Esperado: FALHA com `Cannot find module` apontando para `js/db.js`.

- [ ] **Step 3: Escrever a camada de dados**

Crie `js/db.js`:

```js
// Todas as operacoes de banco em um lugar.
//
// Recebe o cliente por parametro em vez de importar js/supabase.js: aquele
// arquivo importa de uma URL de CDN, e o Node nao resolve URL em import. Com
// o cliente vindo de fora, toda consulta aqui e testavel sem rede.

// O Supabase devolve { data, error }. Transformar error em excecao evita que
// cada tela precise lembrar de checar.
async function pegar(consulta, padrao) {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message ?? 'falha ao acessar o banco');
  return data ?? padrao;
}

export function criarDb(cliente) {
  return {
    // --- turma ---

    listarTurmas() {
      return pegar(
        cliente.from('turma').select('id, nome, criada_em').order('nome'),
        []
      );
    },

    criarTurma(nome, idProfessor) {
      return pegar(
        cliente
          .from('turma')
          .insert({ nome, professor: idProfessor })
          .select('id, nome')
          .single(),
        null
      );
    },

    async apagarTurma(idTurma) {
      await pegar(cliente.from('turma').delete().eq('id', idTurma), null);
    },

    // --- aluno ---

    listarAlunos(idTurma) {
      return pegar(
        cliente
          .from('aluno')
          .select('id, nome, avatar')
          .eq('turma_id', idTurma)
          .order('nome'),
        []
      );
    },

    criarAluno(idTurma, nome, avatar) {
      return pegar(
        cliente
          .from('aluno')
          .insert({ turma_id: idTurma, nome, avatar })
          .select('id, nome, avatar')
          .single(),
        null
      );
    },

    async apagarAluno(idAluno) {
      await pegar(cliente.from('aluno').delete().eq('id', idAluno), null);
    },

    // --- atividade ---

    listarAtividades(idTurma) {
      return pegar(
        cliente
          .from('atividade')
          .select('id, titulo, ordem')
          .eq('turma_id', idTurma)
          .order('ordem'),
        []
      );
    },

    criarAtividade(idTurma, titulo, ordem) {
      return pegar(
        cliente
          .from('atividade')
          .insert({ turma_id: idTurma, titulo, ordem })
          .select('id, titulo, ordem')
          .single(),
        null
      );
    },

    async apagarAtividade(idAtividade) {
      await pegar(cliente.from('atividade').delete().eq('id', idAtividade), null);
    },

    // --- progresso ---

    // progresso nao tem turma_id: o vinculo e via aluno. O "aluno!inner(...)"
    // pede ao Supabase a juncao, e o eq filtra pela coluna do outro lado.
    listarProgresso(idTurma) {
      return pegar(
        cliente
          .from('progresso')
          .select('aluno_id, atividade_id, origem, aluno!inner(turma_id)')
          .eq('aluno.turma_id', idTurma),
        []
      );
    },

    async marcar(idAluno, idAtividade) {
      await pegar(
        cliente.from('progresso').insert({
          aluno_id: idAluno,
          atividade_id: idAtividade,
          origem: 'professor',
        }),
        null
      );
    },

    // O filtro de origem e essencial: quando o jogo passar a gravar
    // (origem = 'jogo'), desmarcar nao pode apagar o registro dele.
    async desmarcar(idAluno, idAtividade) {
      await pegar(
        cliente
          .from('progresso')
          .delete()
          .eq('aluno_id', idAluno)
          .eq('atividade_id', idAtividade)
          .eq('origem', 'professor'),
        null
      );
    },
  };
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `node --test tests/db.test.js`
Esperado: PASSA, 10 testes.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `node --test tests/`
Esperado: PASSA, 25 testes (3 de config, 12 de fila, 10 de db).

- [ ] **Step 6: Commit**

```bash
git add js/db.js tests/db.test.js
git commit -m "feat: camada de dados com cliente injetado"
```

---

## Task 5: Montagem da grade

**Files:**
- Create: `js/grade.js`
- Create: `tests/grade.test.js`

**Interfaces:**
- Consumes: as listas que a Task 4 produz: `listarAlunos`, `listarAtividades`, `listarProgresso`.
- Produces: `montarGrade(alunos, atividades, progresso) → grade`, onde `grade` é:
  ```
  {
    atividades: Array<{id, titulo, ordem}>,
    linhas: Array<{
      aluno: {id, nome, avatar},
      celulas: Array<{atividade_id, titulo, concluida: boolean, origens: string[]}>,
      concluidas: number
    }>,
    vazia: boolean,
    motivo: 'sem-alunos' | 'sem-atividades' | 'sem-nada' | null
  }
  ```
- Produces: `montarLinhaDoAluno(grade, idAluno) → linha | null`

Função pura: entra dado, sai dado. Nenhuma dependência, nenhum efeito. É a tradução entre o formato do banco (uma linha por marcação) e o formato da tela (uma matriz).

- [ ] **Step 1: Escrever os testes que vão falhar**

Crie `tests/grade.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';

const ALUNOS = [
  { id: 'a1', nome: 'Ana', avatar: 'coruja' },
  { id: 'a2', nome: 'Bruno', avatar: 'raposa' },
];
const ATIVIDADES = [
  { id: 'at1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 'at2', titulo: 'Cores', ordem: 2 },
];

test('grade cruza todo aluno com toda atividade', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.equal(g.linhas.length, 2);
  assert.equal(g.linhas[0].celulas.length, 2);
  assert.equal(g.vazia, false);
});

test('sem progresso, nenhuma celula esta concluida', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  for (const linha of g.linhas) {
    assert.equal(linha.concluidas, 0);
    for (const c of linha.celulas) assert.equal(c.concluida, false);
  }
});

test('marcacao do professor marca a celula certa, e so ela', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at2', origem: 'professor' },
  ]);
  const ana = g.linhas.find((l) => l.aluno.id === 'a1');
  assert.equal(ana.celulas.find((c) => c.atividade_id === 'at1').concluida, false);
  assert.equal(ana.celulas.find((c) => c.atividade_id === 'at2').concluida, true);
  assert.equal(ana.concluidas, 1);

  const bruno = g.linhas.find((l) => l.aluno.id === 'a2');
  assert.equal(bruno.concluidas, 0);
});

test('celula guarda as origens separadas, sem somar', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'jogo' },
  ]);
  const celula = g.linhas[0].celulas.find((c) => c.atividade_id === 'at1');
  assert.deepEqual(celula.origens.slice().sort(), ['jogo', 'professor']);
  assert.equal(
    g.linhas[0].concluidas, 1,
    'a atividade foi concluida uma vez, registrada por duas fontes'
  );
});

test('as colunas seguem a ordem das atividades recebidas', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.deepEqual(g.atividades.map((a) => a.id), ['at1', 'at2']);
  assert.deepEqual(g.linhas[0].celulas.map((c) => c.atividade_id), ['at1', 'at2']);
});

test('progresso de aluno que nao esta na lista e ignorado', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'fantasma', atividade_id: 'at1', origem: 'professor' },
  ]);
  assert.equal(g.linhas.reduce((s, l) => s + l.concluidas, 0), 0);
});

test('progresso de atividade apagada nao cria coluna', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at-apagada', origem: 'professor' },
  ]);
  assert.equal(g.atividades.length, 2);
  assert.equal(g.linhas[0].celulas.length, 2);
});

// Review Focus 3 — o primeiro estado de toda turma recem-criada
test('turma sem aluno e sem atividade e vazia com motivo', () => {
  const g = montarGrade([], [], []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-nada');
  assert.deepEqual(g.linhas, []);
});

test('turma com atividade e sem aluno diz que faltam alunos', () => {
  const g = montarGrade([], ATIVIDADES, []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-alunos');
});

test('turma com aluno e sem atividade diz que faltam atividades', () => {
  const g = montarGrade(ALUNOS, [], []);
  assert.equal(g.vazia, true);
  assert.equal(g.motivo, 'sem-atividades');
  assert.equal(g.linhas.length, 2, 'os alunos continuam visiveis');
});

test('entrada nula nao quebra', () => {
  const g = montarGrade(null, undefined, null);
  assert.equal(g.vazia, true);
  assert.deepEqual(g.linhas, []);
});

test('montarLinhaDoAluno devolve so a linha pedida', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a2', atividade_id: 'at1', origem: 'professor' },
  ]);
  const linha = montarLinhaDoAluno(g, 'a2');
  assert.equal(linha.aluno.nome, 'Bruno');
  assert.equal(linha.concluidas, 1);
});

test('montarLinhaDoAluno devolve nulo para aluno inexistente', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, []);
  assert.equal(montarLinhaDoAluno(g, 'nao-existe'), null);
});
```

O teste das origens separadas realiza a decisão D4 da spec: `concluidas` conta atividades, não registros. Contar registros faria uma atividade confirmada pelo professor e pelo jogo valer dois — o número sem significado que a spec manda evitar.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `node --test tests/grade.test.js`
Esperado: FALHA com `Cannot find module` apontando para `js/grade.js`.

- [ ] **Step 3: Escrever a montagem**

Crie `js/grade.js`:

```js
// Traduz o formato do banco (uma linha por marcacao) para o formato da tela
// (matriz alunos x atividades). Funcao pura: nenhuma dependencia, nenhum
// efeito, nenhum acesso a DOM.

function chave(idAluno, idAtividade) {
  return `${idAluno}\u0000${idAtividade}`;
}

export function montarGrade(alunos, atividades, progresso) {
  const listaAlunos = Array.isArray(alunos) ? alunos : [];
  const listaAtividades = Array.isArray(atividades) ? atividades : [];
  const listaProgresso = Array.isArray(progresso) ? progresso : [];

  // chave aluno+atividade -> conjunto de origens
  const porCelula = new Map();
  for (const p of listaProgresso) {
    const k = chave(p.aluno_id, p.atividade_id);
    if (!porCelula.has(k)) porCelula.set(k, new Set());
    porCelula.get(k).add(p.origem);
  }

  const linhas = listaAlunos.map((aluno) => {
    const celulas = listaAtividades.map((atividade) => {
      const origens = porCelula.get(chave(aluno.id, atividade.id));
      return {
        atividade_id: atividade.id,
        titulo: atividade.titulo,
        concluida: origens !== undefined,
        origens: origens ? [...origens] : [],
      };
    });

    return {
      aluno,
      celulas,
      // Conta atividades concluidas, nao registros: uma atividade confirmada
      // pelo professor e pelo jogo continua sendo uma atividade (spec D4).
      concluidas: celulas.filter((c) => c.concluida).length,
    };
  });

  const semAlunos = listaAlunos.length === 0;
  const semAtividades = listaAtividades.length === 0;

  let motivo = null;
  if (semAlunos && semAtividades) motivo = 'sem-nada';
  else if (semAlunos) motivo = 'sem-alunos';
  else if (semAtividades) motivo = 'sem-atividades';

  return {
    atividades: listaAtividades,
    linhas,
    vazia: motivo !== null,
    motivo,
  };
}

export function montarLinhaDoAluno(grade, idAluno) {
  return grade.linhas.find((l) => l.aluno.id === idAluno) ?? null;
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `node --test tests/grade.test.js`
Esperado: PASSA, 13 testes.

- [ ] **Step 5: Commit**

```bash
git add js/grade.js tests/grade.test.js
git commit -m "feat: montagem da matriz alunos x atividades"
```

---

## Task 6: Renderização

**Files:**
- Create: `js/render.js`
- Create: `css/plataforma.css`
- Create: `tests/render.test.js`

**Interfaces:**
- Consumes: `grade` da Task 5; `AVATARES` e `acharAvatar` da Task 2.
- Produces:
  - `escaparHtml(texto) → string`
  - `renderGrade(grade) → string` — tabela do professor; cada célula é um `<button>` com `data-aluno` e `data-atividade`
  - `renderListaSimples(itens, tipo) → string` — lista de turmas, alunos ou atividades com botão de apagar
  - `renderSeletorAvatar(avataresUsados) → string` — `<select>` de avatares para o cadastro de aluno
  - `renderAvataresDaTurma(alunos) → string` — grade de botões grandes para o aluno escolher
  - `renderProgressoDoAluno(linha) → string` — visão somente leitura
  - `renderAreaAluno(estado) → string` — invólucro da área do aluno em `principal.html`

Funções puras que devolvem string. Essa é a escolha que torna a interface testável sem navegador: não existe `document` aqui.

- [ ] **Step 1: Escrever os testes que vão falhar**

Crie `tests/render.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparHtml,
  renderGrade,
  renderAvataresDaTurma,
  renderProgressoDoAluno,
  renderAreaAluno,
} from '../js/render.js';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';

const ALUNOS = [
  { id: 'a1', nome: 'Ana', avatar: 'coruja' },
  { id: 'a2', nome: 'Bruno', avatar: 'raposa' },
];
const ATIVIDADES = [
  { id: 'at1', titulo: 'Contar ate 10', ordem: 1 },
  { id: 'at2', titulo: 'Cores', ordem: 2 },
];

// --- Review Focus 1: nome vindo da escola entra em HTML gerado ---

test('escaparHtml neutraliza os cinco caracteres perigosos', () => {
  assert.equal(
    escaparHtml(`<script>alert("x")&'`),
    '&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;'
  );
});

test('escaparHtml aceita nao-string sem quebrar', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(7), '7');
});

test('nome de aluno com tag nao vira HTML na grade', () => {
  const alunos = [{ id: 'a1', nome: '<img src=x onerror=alert(1)>', avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(!html.includes('<img'), 'tag do nome foi interpretada como HTML');
  assert.ok(html.includes('&lt;img'), 'o nome deve aparecer como texto literal');
});

test('nome com & e aspas aparece legivel', () => {
  const alunos = [{ id: 'a1', nome: `Ana & "Bia"`, avatar: 'coruja' }];
  const html = renderGrade(montarGrade(alunos, ATIVIDADES, []));
  assert.ok(html.includes('Ana &amp; &quot;Bia&quot;'));
});

test('titulo de atividade com tag nao vira HTML', () => {
  const ats = [{ id: 'at1', titulo: '<b>Cores</b>', ordem: 1 }];
  const html = renderGrade(montarGrade(ALUNOS, ats, []));
  assert.ok(!html.includes('<b>Cores</b>'));
  assert.ok(html.includes('&lt;b&gt;Cores&lt;/b&gt;'));
});

// --- grade do professor ---

test('grade tem uma celula clicavel por aluno e atividade', () => {
  const html = renderGrade(montarGrade(ALUNOS, ATIVIDADES, []));
  for (const a of ALUNOS) {
    for (const at of ATIVIDADES) {
      assert.ok(
        html.includes(`data-aluno="${a.id}"`) && html.includes(`data-atividade="${at.id}"`),
        `falta a celula ${a.id}/${at.id}`
      );
    }
  }
});

test('celula concluida e marcada; pendente nao recebe marca de erro', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderGrade(g);
  assert.ok(html.includes('aria-pressed="true"'), 'falta estado marcado');
  assert.ok(html.includes('aria-pressed="false"'), 'falta estado pendente');
  assert.ok(!/\u274C|\u2716/.test(html), 'pendente nao pode levar X (spec D7)');
});

test('grade vazia explica o que falta em vez de mostrar nada', () => {
  assert.match(renderGrade(montarGrade([], [], [])), /aluno/i);
  assert.match(renderGrade(montarGrade([], ATIVIDADES, [])), /aluno/i);
  assert.match(renderGrade(montarGrade(ALUNOS, [], [])), /atividade/i);
});

// --- telas do aluno ---

test('seletor de avatar tem um botao grande por aluno', () => {
  const html = renderAvataresDaTurma(ALUNOS);
  assert.ok(html.includes('data-aluno="a1"'));
  assert.ok(html.includes('data-aluno="a2"'));
  assert.ok(html.includes('\u{1F989}'), 'falta o emoji da coruja');
  assert.ok(html.includes('Ana'), 'o nome acompanha o avatar');
});

test('avatar desconhecido nao quebra o seletor', () => {
  const html = renderAvataresDaTurma([{ id: 'a9', nome: 'Caio', avatar: 'dinossauro' }]);
  assert.ok(html.includes('Caio'));
  assert.ok(html.includes('data-aluno="a9"'));
});

test('progresso do aluno nao tem nenhum controle de escrita', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderProgressoDoAluno(montarLinhaDoAluno(g, 'a1'));

  assert.ok(html.includes('Contar ate 10'));
  assert.ok(!html.includes('<input'), 'o aluno nao digita nada (spec D3)');
  assert.ok(!html.includes('data-atividade='), 'nenhuma celula clicavel na tela do aluno');
  assert.ok(!/\u274C|\u2716/.test(html), 'atividade pendente nao leva X (spec D7)');
});

test('progresso mostra quantas atividades foram concluidas', () => {
  const g = montarGrade(ALUNOS, ATIVIDADES, [
    { aluno_id: 'a1', atividade_id: 'at1', origem: 'professor' },
  ]);
  const html = renderProgressoDoAluno(montarLinhaDoAluno(g, 'a1'));
  assert.match(html, /1\s*\D{0,12}2/, 'esperado algo como "1 de 2"');
});

// Review Focus 5
test('area do aluno sem turma ativa manda chamar o professor', () => {
  const html = renderAreaAluno({ estado: 'sem-turma' });
  assert.match(html, /professor/i);
  assert.ok(!html.includes('data-aluno='), 'nao ha avatar para clicar');
});

test('area do aluno em carregamento nao fica em branco', () => {
  assert.ok(renderAreaAluno({ estado: 'carregando' }).trim().length > 0);
});

test('area do aluno com turma sem alunos explica a situacao', () => {
  const html = renderAreaAluno({ estado: 'escolher', alunos: [] });
  assert.match(html, /professor/i);
});

test('area do aluno sempre oferece o download do jogo', () => {
  for (const estado of ['sem-turma', 'carregando', 'escolher']) {
    assert.match(
      renderAreaAluno({ estado, alunos: ALUNOS }),
      /baixar/i,
      `falta o download no estado ${estado}`
    );
  }
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `node --test tests/render.test.js`
Esperado: FALHA com `Cannot find module` apontando para `js/render.js`.

- [ ] **Step 3: Escrever a renderização**

Crie `js/render.js`:

```js
// Geracao de HTML. Funcoes puras: entram dados, sai string. Nao existe
// document aqui, e e isso que torna a interface testavel sem navegador.

import { acharAvatar, AVATARES } from './config.js';

// Nome de aluno vem digitado pelo professor ou colado de uma lista da escola.
// Sem escapar, um nome com < executa codigo; um nome com & quebra a tela.
export function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function aviso(mensagem) {
  return `<p class="aviso">${escaparHtml(mensagem)}</p>`;
}

const MENSAGEM_VAZIA = {
  'sem-nada': 'Esta turma ainda nao tem alunos nem atividades. Cadastre os alunos e as atividades para comecar.',
  'sem-alunos': 'Esta turma ainda nao tem alunos. Cadastre os alunos para poder marcar o progresso.',
  'sem-atividades': 'Esta turma ainda nao tem atividades. Cadastre as atividades para poder marcar o progresso.',
};

export function renderGrade(grade) {
  if (grade.vazia && grade.linhas.length === 0) {
    return aviso(MENSAGEM_VAZIA[grade.motivo]);
  }
  if (grade.vazia) {
    // ha alunos, faltam atividades: mostra os alunos e diz o que falta
    const nomes = grade.linhas
      .map((l) => `<li>${escaparHtml(l.aluno.nome)}</li>`)
      .join('');
    return `${aviso(MENSAGEM_VAZIA[grade.motivo])}<ul class="lista-alunos">${nomes}</ul>`;
  }

  const cabecalho = grade.atividades
    .map((a) => `<th scope="col">${escaparHtml(a.titulo)}</th>`)
    .join('');

  const corpo = grade.linhas
    .map((linha) => {
      const celulas = linha.celulas
        .map((c) => {
          const rotulo = c.concluida
            ? `Desmarcar ${c.titulo} de ${linha.aluno.nome}`
            : `Marcar ${c.titulo} de ${linha.aluno.nome}`;
          return (
            `<td>` +
            `<button type="button" class="celula" ` +
            `data-aluno="${escaparHtml(linha.aluno.id)}" ` +
            `data-atividade="${escaparHtml(c.atividade_id)}" ` +
            `aria-pressed="${c.concluida}" ` +
            `aria-label="${escaparHtml(rotulo)}">` +
            `<span aria-hidden="true">${c.concluida ? '\u2714' : '\u00A0'}</span>` +
            `</button></td>`
          );
        })
        .join('');

      return (
        `<tr><th scope="row">${escaparHtml(linha.aluno.nome)}</th>${celulas}` +
        `<td class="total">${linha.concluidas}/${linha.celulas.length}</td></tr>`
      );
    })
    .join('');

  return (
    `<table class="grade"><thead><tr><th scope="col">Aluno</th>${cabecalho}` +
    `<th scope="col">Total</th></tr></thead><tbody>${corpo}</tbody></table>`
  );
}

export function renderListaSimples(itens, tipo) {
  if (itens.length === 0) {
    return aviso(`Nenhum item cadastrado ainda.`);
  }
  const linhas = itens
    .map((item) => {
      const texto = item.nome ?? item.titulo ?? '';
      return (
        `<li><span>${escaparHtml(texto)}</span>` +
        `<button type="button" class="apagar" data-tipo="${escaparHtml(tipo)}" ` +
        `data-id="${escaparHtml(item.id)}" ` +
        `aria-label="Apagar ${escaparHtml(texto)}">Apagar</button></li>`
      );
    })
    .join('');
  return `<ul class="lista">${linhas}</ul>`;
}

export function renderSeletorAvatar(avataresUsados = []) {
  const usados = new Set(avataresUsados);
  const opcoes = AVATARES
    .map((a) => {
      const marca = usados.has(a.id) ? ' (em uso)' : '';
      return `<option value="${escaparHtml(a.id)}">${a.emoji} ${escaparHtml(a.rotulo + marca)}</option>`;
    })
    .join('');
  return `<select id="avatar-input" aria-label="Avatar do aluno">${opcoes}</select>`;
}

export function renderAvataresDaTurma(alunos) {
  const botoes = alunos
    .map((aluno) => {
      const avatar = acharAvatar(aluno.avatar);
      const emoji = avatar ? avatar.emoji : '\u{1F31F}';
      return (
        `<button type="button" class="avatar-aluno" ` +
        `data-aluno="${escaparHtml(aluno.id)}" ` +
        `aria-label="${escaparHtml(aluno.nome)}">` +
        `<span class="emoji" aria-hidden="true">${emoji}</span>` +
        `<span class="nome">${escaparHtml(aluno.nome)}</span>` +
        `</button>`
      );
    })
    .join('');
  return `<div class="avatares">${botoes}</div>`;
}

export function renderProgressoDoAluno(linha) {
  const avatar = acharAvatar(linha.aluno.avatar);
  const emoji = avatar ? avatar.emoji : '\u{1F31F}';
  const total = linha.celulas.length;

  const itens = linha.celulas
    .map((c) => {
      const marca = c.concluida ? '\u2B50' : '\u25CB';
      const situacao = c.concluida ? 'concluida' : 'pendente';
      return (
        `<li class="atividade ${situacao}">` +
        `<span class="marca" aria-hidden="true">${marca}</span>` +
        `<span class="titulo">${escaparHtml(c.titulo)}</span>` +
        `<span class="leitor">${c.concluida ? 'Voce conseguiu!' : 'Ainda vamos fazer'}</span>` +
        `</li>`
      );
    })
    .join('');

  return (
    `<section class="progresso-aluno">` +
    `<h2><span class="emoji" aria-hidden="true">${emoji}</span> ${escaparHtml(linha.aluno.nome)}</h2>` +
    `<p class="contagem">Voce ja conseguiu <strong>${linha.concluidas}</strong> de ${total}</p>` +
    `<ul class="atividades">${itens}</ul>` +
    `<button type="button" class="voltar">Voltar</button>` +
    `</section>`
  );
}

const BLOCO_DOWNLOAD =
  `<section class="download">` +
  `<h2>Jogo educativo</h2>` +
  `<p>O jogo roda no computador, fora do navegador.</p>` +
  `<a class="botao-baixar" href="jogo/JogosEducativos.zip" download>Baixar o jogo</a>` +
  `</section>`;

export function renderAreaAluno(estado) {
  let conteudo;

  if (estado.estado === 'sem-turma') {
    conteudo = aviso('Este computador ainda nao foi preparado. Chame o professor.');
  } else if (estado.estado === 'carregando') {
    conteudo = `<p class="carregando">Carregando...</p>`;
  } else if (estado.estado === 'erro') {
    conteudo = aviso('Nao foi possivel carregar agora. Chame o professor.');
  } else if (estado.estado === 'progresso') {
    conteudo = renderProgressoDoAluno(estado.linha);
  } else if (!estado.alunos || estado.alunos.length === 0) {
    conteudo = aviso('Nenhum aluno cadastrado nesta turma. Chame o professor.');
  } else {
    conteudo =
      `<h2 class="convite">Clique no seu bichinho</h2>` +
      renderAvataresDaTurma(estado.alunos);
  }

  return `<section id="area-aluno">${conteudo}${BLOCO_DOWNLOAD}</section>`;
}
```

Duas escolhas de acessibilidade que ficam no HTML, não no CSS, e por isso são testáveis:

- `aria-pressed` em cada célula da grade diz o estado ao leitor de tela. É o que permite o teste verificar marcado/pendente sem navegador.
- `<span class="leitor">` traz "Voce conseguiu!" / "Ainda vamos fazer" em texto. A estrela e o círculo são visuais; cor e forma não podem ser a única informação disponível.

- [ ] **Step 4: Escrever o estilo do que é novo**

Crie `css/plataforma.css`. Alvos de clique grandes e contraste alto são requisito de acessibilidade da spec, não enfeite.

```css
/* Estilo apenas dos elementos novos. style.css do Pedro nao e tocado. */

.aviso {
  background: #fff8e1;
  border-left: 6px solid #f0a500;
  color: #3a2c00;
  padding: 16px;
  margin: 16px 0;
  font-size: 1.1rem;
  border-radius: 6px;
}

/* --- grade do professor --- */

.grade { border-collapse: collapse; width: 100%; background: #fff; color: #111; }
.grade th, .grade td { border: 1px solid #bbb; padding: 6px; text-align: center; }
.grade th[scope="row"] { text-align: left; white-space: nowrap; }
.grade .total { font-variant-numeric: tabular-nums; }

.celula {
  width: 44px; height: 44px;       /* alvo minimo recomendado para toque */
  font-size: 1.3rem;
  border: 2px solid #777;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.celula[aria-pressed="true"] { background: #1b7f4b; border-color: #10532f; color: #fff; }
.celula:focus-visible { outline: 3px solid #0057d9; outline-offset: 2px; }
.celula[disabled] { opacity: .5; cursor: progress; }

/* --- listas de gestao --- */

.lista { list-style: none; padding: 0; }
.lista li {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; padding: 8px; border-bottom: 1px solid #ddd;
}
.apagar { min-height: 36px; cursor: pointer; }

/* --- area do aluno --- */

#area-aluno { color: #fff; padding: 24px; overflow-y: auto; max-height: 100%; }
.convite { font-size: 1.8rem; text-align: center; }

.avatares { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
.avatar-aluno {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  min-width: 120px; min-height: 120px;    /* alvo grande: mao de crianca */
  padding: 12px;
  font-size: 1.1rem;
  background: #ffffff;
  color: #111;
  border: 3px solid #0b6b45;
  border-radius: 16px;
  cursor: pointer;
}
.avatar-aluno .emoji { font-size: 3.5rem; line-height: 1; }
.avatar-aluno:focus-visible { outline: 4px solid #ffd400; outline-offset: 3px; }

.progresso-aluno { background: #ffffff; color: #111; padding: 20px; border-radius: 16px; }
.progresso-aluno h2 { font-size: 1.8rem; }
.progresso-aluno .emoji { font-size: 2.4rem; }
.contagem { font-size: 1.3rem; }

.atividades { list-style: none; padding: 0; }
.atividade {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; margin-bottom: 8px;
  font-size: 1.2rem;
  border-radius: 10px;
  background: #f4f4f4;            /* pendente: neutro, nunca vermelho */
}
.atividade.concluida { background: #e3f6e9; }
.atividade .marca { font-size: 1.6rem; }

/* Texto so para leitor de tela: a cor nao pode ser a unica informacao. */
.leitor {
  position: absolute; width: 1px; height: 1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}

.voltar { min-height: 48px; min-width: 120px; font-size: 1.1rem; cursor: pointer; }

/* --- download --- */

.download { margin-top: 24px; }
.botao-baixar {
  display: inline-block; padding: 14px 24px;
  font-size: 1.2rem; font-weight: 600;
  background: #0b6b45; color: #fff;
  border-radius: 10px; text-decoration: none;
}
.botao-baixar:focus-visible { outline: 4px solid #ffd400; outline-offset: 3px; }
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

Run: `node --test tests/render.test.js`
Esperado: PASSA, 17 testes.

- [ ] **Step 6: Rodar a suíte inteira**

Run: `node --test tests/`
Esperado: PASSA, 55 testes.

- [ ] **Step 7: Commit**

```bash
git add js/render.js css/plataforma.css tests/render.test.js
git commit -m "feat: renderizacao com escape de HTML e estilo acessivel"
```

---

## Task 7: Autenticação do professor e políticas de acesso

**Files:**
- Create: `sql/politicas.sql`
- Create: `js/auth.js`
- Create: `tests/politicas.integracao.js`
- Modify: `login.html` (adicionar `id` nos campos e no form, mais uma tag `<script>` e uma `<link>`)
- Modify: `cadastro.html:38` (trocar o `<script>` de `cadastro.js` por `js/auth.js`)
- Modify: `script.js:33-42` (remover)
- Delete: `cadastro.js`

**Interfaces:**
- Consumes: `js/supabase.js` → `supabase`.
- Produces:
  - `entrar(email, senha) → Promise<{id, email}>`
  - `cadastrar(email, senha) → Promise<{id, email} | null>` (nulo quando o Supabase exige confirmação por e-mail)
  - `sair() → Promise<void>`
  - `professorAtual() → Promise<{id, email} | null>`
  - `exigirProfessor() → Promise<{id, email}>` — redireciona para `login.html` se não houver sessão

As políticas entram aqui, e não na Task 1, porque só agora existem contas de verdade para provar que um professor não alcança a turma do outro. Uma política de acesso que só existe no documento não protege ninguém.

**Nota sobre a restrição R1:** este é o ponto em que o `cadastro.js` do Pedro sai. A justificativa é a mesma já aprovada para as linhas 33–42 do `script.js`: o arquivo implementa cadastro de usuário via `localStorage`, que é escopo deste documento, implementado provisoriamente. Mantê-lo faria dois códigos disputarem o `submit` do mesmo formulário — o dele chama `preventDefault` e redireciona antes de o nosso rodar. **Confirme com o Fabiano antes de apagar**, porque é uma exceção a mais do que a spec listou.

- [ ] **Step 1: Escrever as políticas**

Crie `sql/politicas.sql`:

```sql
-- Politicas de acesso: cada professor so alcanca as proprias turmas.
--
-- Limite conhecido (spec, lacuna 2): a tela do aluno roda dentro da sessao do
-- professor. Para o banco, as duas telas sao o mesmo usuario. Logo estas
-- politicas isolam professor de professor, e NAO aluno de aluno na mesma
-- maquina.

drop policy if exists turma_do_professor     on turma;
drop policy if exists aluno_da_minha_turma   on aluno;
drop policy if exists atividade_da_minha_turma on atividade;
drop policy if exists progresso_da_minha_turma on progresso;

-- turma: dona pelo campo professor
create policy turma_do_professor on turma
  for all
  using (professor = auth.uid())
  with check (professor = auth.uid());

-- aluno: pertence a uma turma minha
create policy aluno_da_minha_turma on aluno
  for all
  using (exists (
    select 1 from turma t where t.id = aluno.turma_id and t.professor = auth.uid()
  ))
  with check (exists (
    select 1 from turma t where t.id = aluno.turma_id and t.professor = auth.uid()
  ));

-- atividade: mesma regra
create policy atividade_da_minha_turma on atividade
  for all
  using (exists (
    select 1 from turma t where t.id = atividade.turma_id and t.professor = auth.uid()
  ))
  with check (exists (
    select 1 from turma t where t.id = atividade.turma_id and t.professor = auth.uid()
  ));

-- progresso: chega na turma passando pelo aluno
create policy progresso_da_minha_turma on progresso
  for all
  using (exists (
    select 1 from aluno a
      join turma t on t.id = a.turma_id
    where a.id = progresso.aluno_id and t.professor = auth.uid()
  ))
  with check (exists (
    select 1 from aluno a
      join turma t on t.id = a.turma_id
    where a.id = progresso.aluno_id and t.professor = auth.uid()
  ));
```

- [ ] **Step 2: Escrever o teste de integração que vai falhar**

Crie `tests/politicas.integracao.js`. Não termina em `.test.js` de propósito: `node --test tests/` não o executa, porque ele depende de rede e de duas contas de verdade. Roda sob comando.

```js
// Verifica, contra o banco real, que um professor nao alcanca a turma do
// outro. Usa apenas fetch e a API REST do Supabase: zero dependencias.
//
// Uso:
//   node tests/politicas.integracao.js
//
// Exige duas contas de professor ja criadas, informadas por variavel de
// ambiente, para nao deixar credencial no repositorio:
//   PROF_A_EMAIL  PROF_A_SENHA  PROF_B_EMAIL  PROF_B_SENHA

import assert from 'node:assert/strict';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';

const exigido = (nome) => {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variavel de ambiente ${nome}`);
  return v;
};

async function logar(email, senha) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const corpo = await r.json();
  if (!r.ok) throw new Error(`login falhou para ${email}: ${JSON.stringify(corpo)}`);
  return { token: corpo.access_token, id: corpo.user.id };
}

function rest(sessao) {
  return async (caminho, opcoes = {}) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
      ...opcoes,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessao.token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(opcoes.headers ?? {}),
      },
    });
    const texto = await r.text();
    return { ok: r.ok, status: r.status, corpo: texto ? JSON.parse(texto) : null };
  };
}

const a = await logar(exigido('PROF_A_EMAIL'), exigido('PROF_A_SENHA'));
const b = await logar(exigido('PROF_B_EMAIL'), exigido('PROF_B_SENHA'));
const comoA = rest(a);
const comoB = rest(b);

// A cria uma turma com um aluno
const turmaA = await comoA('turma', {
  method: 'POST',
  body: JSON.stringify({ nome: '__integracao_A__', professor: a.id }),
});
assert.ok(turmaA.ok, `A nao conseguiu criar a propria turma: ${JSON.stringify(turmaA.corpo)}`);
const idTurmaA = turmaA.corpo[0].id;

const alunoA = await comoA('aluno', {
  method: 'POST',
  body: JSON.stringify({ turma_id: idTurmaA, nome: 'Ana', avatar: 'coruja' }),
});
assert.ok(alunoA.ok, 'A nao conseguiu criar aluno na propria turma');

try {
  // B nao le a turma de A
  const lidas = await comoB(`turma?id=eq.${idTurmaA}`);
  assert.deepEqual(lidas.corpo, [], 'FALHA GRAVE: B leu a turma de A');

  // B nao le os alunos de A
  const alunos = await comoB(`aluno?turma_id=eq.${idTurmaA}`);
  assert.deepEqual(alunos.corpo, [], 'FALHA GRAVE: B leu os alunos de A');

  // B nao cria aluno na turma de A
  const invasao = await comoB('aluno', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurmaA, nome: 'Invasor', avatar: 'gato' }),
  });
  assert.equal(invasao.ok, false, 'FALHA GRAVE: B criou aluno na turma de A');

  // B nao apaga a turma de A
  await comoB(`turma?id=eq.${idTurmaA}`, { method: 'DELETE' });
  const aindaExiste = await comoA(`turma?id=eq.${idTurmaA}`);
  assert.equal(aindaExiste.corpo.length, 1, 'FALHA GRAVE: B apagou a turma de A');

  console.log('OK: um professor nao alcanca a turma do outro');
} finally {
  await comoA(`turma?id=eq.${idTurmaA}`, { method: 'DELETE' });
}
```

- [ ] **Step 3: Escrever a autenticação**

Crie `js/auth.js`:

```js
// Login, cadastro e guarda de pagina do professor.
// Unica conta autenticada do sistema: nenhuma crianca tem e-mail ou senha
// (spec D2, LGPD Art. 14).

import { supabase } from './supabase.js';

function simplificar(usuario) {
  return usuario ? { id: usuario.id, email: usuario.email } : null;
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw new Error(traduzir(error.message));
  return simplificar(data.user);
}

// Devolve nulo quando o projeto exige confirmacao por e-mail: a conta foi
// criada, mas ainda nao ha sessao.
export async function cadastrar(email, senha) {
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) throw new Error(traduzir(error.message));
  return data.session ? simplificar(data.user) : null;
}

export async function sair() {
  await supabase.auth.signOut();
}

export async function professorAtual() {
  const { data } = await supabase.auth.getUser();
  return simplificar(data?.user ?? null);
}

export async function exigirProfessor() {
  const professor = await professorAtual();
  if (!professor) {
    window.location.replace('login.html');
    throw new Error('sem sessao');
  }
  return professor;
}

function traduzir(mensagem) {
  const m = String(mensagem).toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (m.includes('already registered')) return 'Este e-mail ja tem conta.';
  if (m.includes('password should be')) return 'A senha precisa de pelo menos 6 caracteres.';
  if (m.includes('failed to fetch')) return 'Sem conexao com a internet.';
  return mensagem;
}

// --- fiacao das paginas do Pedro ---
// Um unico arquivo atende login.html e cadastro.html: cada pagina tem apenas
// um dos dois formularios, e o codigo so liga o que encontrar.

function mostrarErro(form, texto) {
  let caixa = form.querySelector('.erro-auth');
  if (!caixa) {
    caixa = document.createElement('p');
    caixa.className = 'erro-auth aviso';
    caixa.setAttribute('role', 'alert');
    form.prepend(caixa);
  }
  caixa.textContent = texto;
}

const formLogin = document.querySelector('#login-form');
if (formLogin) {
  formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = formLogin.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await entrar(
        formLogin.querySelector('#email-input').value.trim(),
        formLogin.querySelector('#senha-input').value
      );
      window.location.href = 'professor.html';
    } catch (e) {
      mostrarErro(formLogin, e.message);
    } finally {
      botao.disabled = false;
    }
  });
}

const formCadastro = document.querySelector('#cadastro-form');
if (formCadastro) {
  formCadastro.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const senha = formCadastro.querySelector('#senha-input').value;
    const confirmacao = formCadastro.querySelector('#senha-confirma-input').value;

    if (senha !== confirmacao) {
      mostrarErro(formCadastro, 'As duas senhas nao sao iguais.');
      return;
    }

    const botao = formCadastro.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const professor = await cadastrar(
        formCadastro.querySelector('#email-input').value.trim(),
        senha
      );
      if (professor) {
        window.location.href = 'professor.html';
      } else {
        mostrarErro(formCadastro, 'Conta criada. Confirme o e-mail e depois entre.');
      }
    } catch (e) {
      mostrarErro(formCadastro, e.message);
    } finally {
      botao.disabled = false;
    }
  });
}
```

- [ ] **Step 4: Ligar o `login.html`**

Três mudanças aditivas. Nenhuma altera o layout.

No `<head>`, depois da linha 7 (`<link rel="stylesheet" href="style.css">`):

```html
    <link rel="stylesheet" href="css/plataforma.css">
```

Na linha 12, trocar `<form>` por:

```html
        <form id="login-form">
```

Nas linhas 16 e 20, acrescentar `id` (o resto do atributo fica igual):

```html
                <input id="email-input" placeholder="Usuário" type="email" required>
```

```html
                <input id="senha-input" placeholder="Senha" type="password" required>
```

Antes de `</body>` (linha 38):

```html
    <script type="module" src="js/auth.js"></script>
```

Os inputs hoje não têm `id` nem `name`, e o `<form>` também não. Selecionar por posição (`.input-box:nth-child(1) input`) funcionaria e quebraria em silêncio no dia em que o formulário fosse reordenado.

- [ ] **Step 5: Ligar o `cadastro.html`**

No `<head>`, depois da linha 6:

```html
    <link rel="stylesheet" href="css/plataforma.css">
```

Nas linhas 24 e 28, acrescentar `id` aos campos de senha:

```html
                <input id="senha-input" placeholder="Senha" type="password" required>
```

```html
                <input id="senha-confirma-input" placeholder="Confirmar Senha" type="password" required>
```

Na linha 38, trocar:

```html
    <script src="cadastro.js"></script>
```

por:

```html
    <script type="module" src="js/auth.js"></script>
```

Os campos `#nome-input` e `#email-input` já têm `id` — são do Pedro e ficam como estão. O `#nome-input` deixa de ser usado: não guardamos nome de professor, só e-mail (minimização de dados, spec §7).

- [ ] **Step 6: Remover o código provisório de perfil**

Em `script.js`, apagar as linhas 33 a 42 (da constante `nomeSalvo` até o fim do arquivo), deixando o arquivo terminar na linha 31 com `});`. É a exceção aprovada na spec R1.

Apagar `cadastro.js`:

```bash
git rm cadastro.js
```

- [ ] **Step 7: Aplicar as políticas**

No SQL Editor do Supabase, cole o conteúdo de `sql/politicas.sql` e execute.

Esperado: `Success. No rows returned`.

- [ ] **Step 8: Criar duas contas de professor**

Abra `cadastro.html` por um servidor local (`import` de módulo não funciona em `file://`):

```bash
cd D:/00-Sistemas_Dev/Univesp_Jogo/Jogo_Univesp && python -m http.server 8000
```

Em http://localhost:8000/cadastro.html, cadastre duas contas de teste, por exemplo `profa@teste.local` e `profb@teste.local`, ambas com senha de 6 caracteres ou mais.

Se o projeto exigir confirmação de e-mail, desligue em Authentication → Sign In / Providers → Email → **Confirm email** (desmarque) enquanto estiver testando.

- [ ] **Step 9: Rodar o teste de políticas para confirmar que passa**

```bash
cd D:/00-Sistemas_Dev/Univesp_Jogo/Jogo_Univesp && \
PROF_A_EMAIL=profa@teste.local PROF_A_SENHA=teste123 \
PROF_B_EMAIL=profb@teste.local PROF_B_SENHA=teste123 \
node tests/politicas.integracao.js
```

Esperado: `OK: um professor nao alcanca a turma do outro`.

Se qualquer asserção com `FALHA GRAVE` disparar, **pare**: dado de aluno de uma escola estaria visível a outro professor. Releia `sql/politicas.sql` e confirme que a RLS está ligada nas quatro tabelas.

- [ ] **Step 10: Verificar o login à mão**

Em http://localhost:8000/login.html: entre com a conta A. Esperado: vai para `professor.html` (404 por enquanto — a página é da Task 8; o importante é que o redirecionamento aconteceu).

Volte a `login.html` e tente uma senha errada. Esperado: a frase "E-mail ou senha incorretos." aparece acima do formulário, e o layout do Pedro continua igual.

- [ ] **Step 11: Commit**

```bash
git add sql/politicas.sql js/auth.js tests/politicas.integracao.js \
        login.html cadastro.html script.js
git rm --cached cadastro.js 2>/dev/null; true
git commit -m "feat: login do professor e politicas de acesso por turma"
```

---

## Task 8: Tela de gestão do professor

**Files:**
- Create: `professor.html`
- Create: `js/professor.js`

**Interfaces:**
- Consumes: `exigirProfessor`, `sair` (Task 7); `criarDb` (Task 4); `renderListaSimples`, `renderSeletorAvatar` (Task 6); `supabase` (Task 2).
- Produces: `professor.html` com os `id` que a Task 9 usa para montar a grade: `#area-grade`, `#turma-select`, `#aviso-fila`.

Esta é a tela que a spec chama de produto, não acessório: como o aluno não insere nada, tudo que entra no sistema entra por aqui.

- [ ] **Step 1: Criar a página**

Crie `professor.html`:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Área do professor - Plataforma Educativa</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="css/plataforma.css">
</head>
<body class="stars">
    <main class="painel">
        <header class="painel-topo">
            <h1>Área do professor</h1>
            <p id="identificacao"></p>
            <button type="button" id="sair">Sair</button>
        </header>

        <p id="aviso-fila" class="aviso" hidden role="status"></p>

        <section class="bloco">
            <h2>Turmas</h2>
            <form id="form-turma">
                <label for="turma-nome">Nome da turma</label>
                <input id="turma-nome" type="text" required maxlength="60">
                <button type="submit">Criar turma</button>
            </form>
            <div id="lista-turmas"></div>

            <label for="turma-select">Turma em uso neste computador</label>
            <select id="turma-select"></select>
            <button type="button" id="usar-turma">Usar esta turma aqui</button>
            <p id="turma-ativa" class="aviso" hidden role="status"></p>
        </section>

        <section class="bloco">
            <h2>Alunos</h2>
            <form id="form-aluno">
                <label for="aluno-nome">Primeiro nome</label>
                <input id="aluno-nome" type="text" required maxlength="40">
                <label for="avatar-input">Avatar</label>
                <span id="caixa-avatar"></span>
                <button type="submit">Adicionar aluno</button>
            </form>
            <div id="lista-alunos"></div>
        </section>

        <section class="bloco">
            <h2>Atividades</h2>
            <form id="form-atividade">
                <label for="atividade-titulo">Título da atividade</label>
                <input id="atividade-titulo" type="text" required maxlength="80">
                <button type="submit">Adicionar atividade</button>
            </form>
            <div id="lista-atividades"></div>
        </section>

        <section class="bloco">
            <h2>Marcar progresso</h2>
            <div id="area-grade"></div>
        </section>
    </main>

    <script type="module" src="js/professor.js"></script>
</body>
</html>
```

Guardar apenas o primeiro nome do aluno é exigência da spec §7 (minimização de dados). O `maxlength="40"` deixa a restrição visível na própria interface.

- [ ] **Step 2: Escrever a fiação da gestão**

Crie `js/professor.js`:

```js
// Tela do professor: gestao de turmas, alunos e atividades, mais a grade de
// marcacao. Esta e a tela por onde todo dado entra no sistema: o aluno nao
// insere nada (spec D3).

import { supabase } from './supabase.js';
import { exigirProfessor, sair } from './auth.js';
import { criarDb } from './db.js';
import { criarFila } from './fila.js';
import { montarGrade } from './grade.js';
import { renderGrade, renderListaSimples, renderSeletorAvatar } from './render.js';

const db = criarDb(supabase);
const fila = criarFila(window.localStorage);

const professor = await exigirProfessor();
document.querySelector('#identificacao').textContent = professor.email;

const estado = {
  turmas: [],
  turmaSelecionada: null,
  alunos: [],
  atividades: [],
  progresso: [],
};

const el = (seletor) => document.querySelector(seletor);

function avisar(seletor, texto) {
  const caixa = el(seletor);
  caixa.textContent = texto;
  caixa.hidden = texto === '';
}

function erroNaTela(e) {
  avisar('#aviso-fila', `Nao deu certo: ${e.message}`);
}

// --- turmas ---

async function recarregarTurmas() {
  estado.turmas = await db.listarTurmas();
  el('#lista-turmas').innerHTML = renderListaSimples(estado.turmas, 'turma');

  el('#turma-select').innerHTML = estado.turmas
    .map((t) => `<option value="${t.id}">${t.nome.replace(/</g, '&lt;')}</option>`)
    .join('');

  if (!estado.turmaSelecionada && estado.turmas.length > 0) {
    estado.turmaSelecionada = estado.turmas[0].id;
  }
  if (estado.turmaSelecionada) {
    el('#turma-select').value = estado.turmaSelecionada;
  }
}

el('#form-turma').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const campo = el('#turma-nome');
  try {
    await db.criarTurma(campo.value.trim(), professor.id);
    campo.value = '';
    await recarregarTurmas();
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#turma-select').addEventListener('change', async (evento) => {
  estado.turmaSelecionada = evento.target.value;
  await recarregarTurma();
});

// Marca, nesta maquina, qual turma a tela do aluno deve mostrar.
el('#usar-turma').addEventListener('click', () => {
  if (!estado.turmaSelecionada) return;
  window.localStorage.setItem('turma_ativa', estado.turmaSelecionada);
  const turma = estado.turmas.find((t) => t.id === estado.turmaSelecionada);
  avisar('#turma-ativa', `Este computador vai mostrar a turma "${turma.nome}" para os alunos.`);
});

// --- alunos e atividades ---

async function recarregarTurma() {
  if (!estado.turmaSelecionada) {
    estado.alunos = [];
    estado.atividades = [];
    estado.progresso = [];
  } else {
    [estado.alunos, estado.atividades, estado.progresso] = await Promise.all([
      db.listarAlunos(estado.turmaSelecionada),
      db.listarAtividades(estado.turmaSelecionada),
      db.listarProgresso(estado.turmaSelecionada),
    ]);
  }

  el('#lista-alunos').innerHTML = renderListaSimples(estado.alunos, 'aluno');
  el('#lista-atividades').innerHTML = renderListaSimples(estado.atividades, 'atividade');
  el('#caixa-avatar').innerHTML = renderSeletorAvatar(estado.alunos.map((a) => a.avatar));
  desenharGrade();
}

el('#form-aluno').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!estado.turmaSelecionada) {
    avisar('#aviso-fila', 'Crie uma turma antes de cadastrar alunos.');
    return;
  }
  const campo = el('#aluno-nome');
  try {
    await db.criarAluno(
      estado.turmaSelecionada,
      campo.value.trim(),
      el('#avatar-input').value
    );
    campo.value = '';
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#form-atividade').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!estado.turmaSelecionada) {
    avisar('#aviso-fila', 'Crie uma turma antes de cadastrar atividades.');
    return;
  }
  const campo = el('#atividade-titulo');
  try {
    // A ordem e a posicao na sequencia pedagogica: o proximo numero livre.
    const proxima = estado.atividades.length
      ? Math.max(...estado.atividades.map((a) => a.ordem)) + 1
      : 1;
    await db.criarAtividade(estado.turmaSelecionada, campo.value.trim(), proxima);
    campo.value = '';
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

// Apagar turma, aluno ou atividade. Um ouvinte para os tres, porque os botoes
// sao gerados depois: o clique chega por delegacao.
document.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('.apagar');
  if (!botao) return;

  const { tipo, id } = botao.dataset;
  const confirmacoes = {
    turma: 'Apagar a turma apaga tambem os alunos, as atividades e todo o progresso dela. Confirma?',
    aluno: 'Apagar o aluno apaga todo o progresso dele. Confirma?',
    atividade: 'Apagar a atividade apaga as marcacoes dela. Confirma?',
  };
  if (!window.confirm(confirmacoes[tipo])) return;

  try {
    if (tipo === 'turma') {
      await db.apagarTurma(id);
      if (estado.turmaSelecionada === id) estado.turmaSelecionada = null;
      await recarregarTurmas();
    } else if (tipo === 'aluno') {
      await db.apagarAluno(id);
    } else if (tipo === 'atividade') {
      await db.apagarAtividade(id);
    }
    await recarregarTurma();
  } catch (e) {
    erroNaTela(e);
  }
});

el('#sair').addEventListener('click', async () => {
  await sair();
  window.location.href = 'login.html';
});

// desenharGrade e a ligacao com a Task 9. Por enquanto so desenha.
function desenharGrade() {
  el('#area-grade').innerHTML = renderGrade(
    montarGrade(estado.alunos, estado.atividades, estado.progresso)
  );
}

estado.turmaSelecionada = window.localStorage.getItem('turma_ativa');
await recarregarTurmas();
await recarregarTurma();
```

A confirmação antes de apagar existe porque a cascata é silenciosa: apagar uma turma remove alunos, atividades e todo o progresso, e não há desfazer. Era o caminho mais curto para o professor destruir o trabalho de um semestre com um clique.

- [ ] **Step 3: Verificar a gestão à mão**

Com `python -m http.server 8000` rodando, entre em http://localhost:8000/login.html com a conta A e confirme, em `professor.html`:

1. O e-mail aparece no topo.
2. Criar turma "Turma Teste" → ela aparece na lista e no seletor.
3. Cadastrar "Ana" com avatar Coruja e "Bruno" com Raposa → aparecem na lista; o seletor passa a marcar Coruja e Raposa como "(em uso)".
4. Cadastrar as atividades "Contar ate 10" e "Cores" → aparecem na ordem cadastrada.
5. A grade aparece com 2 linhas e 2 colunas, todas as células vazias.
6. Antes de cadastrar qualquer aluno, a grade mostra a frase sobre cadastrar alunos — não fica em branco (Review Focus 3).
7. Cadastrar um aluno chamado `<b>Teste</b>` → o nome aparece literal, com os sinais visíveis, e nada fica em negrito (Review Focus 1).
8. "Usar esta turma aqui" → a frase de confirmação aparece citando o nome da turma.
9. "Sair" → volta ao login; abrir `professor.html` direto redireciona para o login.

- [ ] **Step 4: Rodar a suíte para confirmar que nada quebrou**

Run: `node --test tests/`
Esperado: PASSA, 55 testes.

- [ ] **Step 5: Commit**

```bash
git add professor.html js/professor.js
git commit -m "feat: tela de gestao de turmas, alunos e atividades"
```

---

## Task 9: Grade de marcação com fila offline

**Files:**
- Modify: `js/professor.js` (substituir `desenharGrade` e acrescentar o clique na célula e o envio da fila)

**Interfaces:**
- Consumes: `fila` (Task 3), `db.marcar` e `db.desmarcar` (Task 4), `renderGrade` (Task 6).
- Produces: nada novo para outras tarefas.

A marcação é a ação que o professor repete 30 vezes por aula. Duas coisas importam: a tela responder na hora, e a marcação não se perder quando a internet cair no meio (spec D6, R6).

- [ ] **Step 1: Substituir `desenharGrade`**

Em `js/professor.js`, troque a função `desenharGrade` e o trecho final do arquivo por:

```js
function desenharGrade() {
  el('#area-grade').innerHTML = renderGrade(
    montarGrade(estado.alunos, estado.atividades, estado.progresso)
  );
  mostrarPendencias();
}

function mostrarPendencias() {
  const quantas = fila.tamanho();
  avisar(
    '#aviso-fila',
    quantas === 0
      ? ''
      : `${quantas} marcacao(oes) aguardando a internet. Nao feche esta pagina.`
  );
}

// Altera o estado local antes de falar com o banco: a tela responde na hora,
// e e a fila que garante a chegada. O professor nao espera a rede.
function aplicarLocalmente(item) {
  if (item.acao === 'marcar') {
    estado.progresso.push({
      aluno_id: item.aluno_id,
      atividade_id: item.atividade_id,
      origem: 'professor',
    });
  } else {
    estado.progresso = estado.progresso.filter(
      (p) => !(
        p.aluno_id === item.aluno_id &&
        p.atividade_id === item.atividade_id &&
        p.origem === 'professor'
      )
    );
  }
}

function enviar(item) {
  return item.acao === 'marcar'
    ? db.marcar(item.aluno_id, item.atividade_id)
    : db.desmarcar(item.aluno_id, item.atividade_id);
}

async function escoarFila() {
  await fila.drenar(enviar);
  mostrarPendencias();
}

document.addEventListener('click', async (evento) => {
  const celula = evento.target.closest('.celula');
  if (!celula) return;

  // Trava a celula durante o envio: duplo clique do professor com 30 alunos
  // chegaria antes de a primeira chamada terminar (Review Focus 2).
  if (celula.disabled) return;
  celula.disabled = true;

  const marcada = celula.getAttribute('aria-pressed') === 'true';
  const item = {
    acao: marcada ? 'desmarcar' : 'marcar',
    aluno_id: celula.dataset.aluno,
    atividade_id: celula.dataset.atividade,
  };

  aplicarLocalmente(item);
  desenharGrade();          // redesenha ja marcado: resposta imediata

  try {
    await enviar(item);
  } catch {
    // Sem rede, ou o banco recusou. Guarda para reenviar depois; a marcacao
    // ja esta visivel e nao se perde ao recarregar a pagina.
    fila.enfileirar(item);
    mostrarPendencias();
  }
});

// Quando a conexao volta, reenvia o que ficou para tras.
window.addEventListener('online', escoarFila);

estado.turmaSelecionada = window.localStorage.getItem('turma_ativa');
await recarregarTurmas();
await recarregarTurma();
await escoarFila();         // havia pendencia de uma sessao anterior?
```

Remova as três linhas finais antigas (`estado.turmaSelecionada = ...`, `await recarregarTurmas();`, `await recarregarTurma();`) que ficaram duplicadas — o bloco acima já as inclui, agora seguidas de `escoarFila()`.

- [ ] **Step 2: Verificar a marcação à mão**

Em `professor.html`, com a turma de teste carregada:

1. Clicar numa célula vazia → fica verde com o sinal de conferido, e o total da linha vira `1/2`.
2. Recarregar a página → a marcação continua lá (foi ao banco).
3. Clicar na mesma célula → volta a vazia, total `0/2`. Recarregar: continua vazia.
4. Clicar rápido cinco vezes na mesma célula → o estado final é coerente, e nenhum erro aparece no console (Review Focus 2).

- [ ] **Step 3: Verificar a fila offline**

1. Nas ferramentas de desenvolvedor, aba Network, ligue **Offline**.
2. Marque três células. Esperado: ficam verdes na hora, e o aviso diz "3 marcacao(oes) aguardando a internet".
3. Recarregue a página ainda offline. Esperado: o aviso volta a aparecer com 3 pendências — a fila sobreviveu.
4. Desligue o **Offline**. Esperado: em segundos o aviso desaparece.
5. Recarregue com a rede normal. Esperado: as três marcações estão lá, agora vindas do banco.

Esse é o comportamento que a spec D6 descreve, e o passo 3 é o que prova que ele funciona: sem persistência, recarregar perderia as três marcações.

- [ ] **Step 4: Verificar no banco**

No SQL Editor:

```sql
select a.nome, at.titulo, p.origem
from progresso p
  join aluno a      on a.id = p.aluno_id
  join atividade at on at.id = p.atividade_id
order by a.nome, at.ordem;
```

Esperado: uma linha por marcação, todas com `origem = 'professor'`, nenhuma duplicada.

- [ ] **Step 5: Rodar a suíte**

Run: `node --test tests/`
Esperado: PASSA, 55 testes.

- [ ] **Step 6: Commit**

```bash
git add js/professor.js
git commit -m "feat: grade de marcacao com envio imediato e fila offline"
```

---

## Task 10: Tela do aluno em `principal.html`

**Files:**
- Create: `js/aluno.js`
- Modify: `principal.html:7` (uma tag `<link>`), `principal.html:14` (um `<div>` vazio), `principal.html:15` (uma tag `<script>`)
- Modify: `tests/render.test.js` (um teste a mais)

**Interfaces:**
- Consumes: `supabase` de `js/supabase.js` (Task 2); `criarDb(supabase)` com `listarAlunos`, `listarAtividades`, `listarProgresso` (Task 4); `montarGrade(alunos, atividades, progresso)` e `montarLinhaDoAluno(grade, idAluno)` (Task 5); `renderAreaAluno(estado)` (Task 6).
- Produces: nada. É a última ponta da cadeia; nenhuma tarefa depende dela.

Esta é a tela que o aluno usa, e a spec D3 diz o que ela é: duas etapas, clicar no bichinho e ver o próprio progresso. Nada mais.

A tela roda **dentro da sessão do professor** (spec D2): o professor entra na máquina pela manhã e deixa `principal.html` aberta. Para o banco, a tela do aluno e a tela do professor são o mesmo usuário autenticado — o servidor não tem como distinguir uma da outra. Por isso a garantia de "somente leitura" não vem do banco: vem de não existir, nesta tela, nenhum controle que escreva. É uma garantia de interface, e é exatamente por isso que ela precisa de um teste automatizado. Uma edição futura que acrescentasse um botão de marcar quebraria a spec sem quebrar nada visível.

- [ ] **Step 1: Escrever o teste que trava a garantia de somente leitura**

Acrescente ao fim de `tests/render.test.js`:

```javascript
test('area do aluno nao tem nenhum controle de escrita', () => {
  const alunos = [
    { id: 'a1', nome: 'Ana', avatar: 'coruja' },
    { id: 'a2', nome: 'Bruno', avatar: 'tartaruga' },
  ];
  const atividades = [{ id: 't1', titulo: 'Contar ate 10', ordem: 1 }];
  const g = montarGrade(alunos, atividades, [
    { aluno_id: 'a1', atividade_id: 't1', origem: 'professor' },
  ]);

  const telas = [
    renderAreaAluno({ estado: 'sem-turma' }),
    renderAreaAluno({ estado: 'carregando' }),
    renderAreaAluno({ estado: 'erro' }),
    renderAreaAluno({ estado: 'escolher', alunos }),
    renderAreaAluno({ estado: 'progresso', linha: montarLinhaDoAluno(g, 'a1') }),
  ];

  for (const html of telas) {
    assert.ok(!html.includes('<input'), 'nenhum campo de entrada');
    assert.ok(!html.includes('<textarea'), 'nenhuma area de texto');
    assert.ok(!html.includes('<select'), 'nenhuma lista de selecao');
    assert.ok(!html.includes('<form'), 'nenhum formulario');
    assert.ok(!html.includes('class="celula"'), 'nenhuma celula de marcacao');
    assert.ok(!html.includes('aria-pressed'), 'nenhum botao de alternar estado');
  }
});
```

- [ ] **Step 2: Rodar o teste**

Run: `node --test tests/render.test.js`
Esperado: PASSA, 18 testes.

Este teste passa de primeira, e isso é o esperado. Ele não existe para dirigir código novo — existe para travar uma garantia que a spec faz (§7) e que uma edição futura poderia quebrar sem ninguém notar. Rodá-lo agora é o que confirma que a garantia vale hoje.

- [ ] **Step 3: Commit do teste**

```bash
git add tests/render.test.js
git commit -m "test: travar ausencia de controle de escrita na area do aluno"
```

- [ ] **Step 4: Escrever a fiação da tela do aluno**

Crie `js/aluno.js`:

```javascript
// Tela do aluno: duas etapas, escolher o bichinho e ver o progresso.
// Somente leitura — nenhum controle de escrita existe aqui (spec D3).
// Roda dentro da sessao do professor (spec D2) e usa o mesmo cliente.
import { supabase } from './supabase.js';
import { criarDb } from './db.js';
import { montarGrade, montarLinhaDoAluno } from './grade.js';
import { renderAreaAluno } from './render.js';

const db = criarDb(supabase);
const raiz = document.querySelector('#raiz-aluno');

let grade = null;

function desenhar(estado) {
  raiz.innerHTML = renderAreaAluno(estado);
}

async function carregar() {
  const idTurma = window.localStorage.getItem('turma_ativa');

  // Ninguem preparou esta maquina, ou o cache foi limpo.
  if (!idTurma) {
    desenhar({ estado: 'sem-turma' });
    return;
  }

  desenhar({ estado: 'carregando' });

  try {
    const [alunos, atividades, progresso] = await Promise.all([
      db.listarAlunos(idTurma),
      db.listarAtividades(idTurma),
      db.listarProgresso(idTurma),
    ]);
    grade = montarGrade(alunos, atividades, progresso);
    desenhar({ estado: 'escolher', alunos });
  } catch (e) {
    // O aluno nao pode ver mensagem de erro tecnica. O console ve.
    console.error(e);
    desenhar({ estado: 'erro' });
  }
}

raiz.addEventListener('click', (evento) => {
  const botaoAvatar = evento.target.closest('.avatar-aluno');
  if (botaoAvatar && grade) {
    const linha = montarLinhaDoAluno(grade, botaoAvatar.dataset.aluno);
    if (linha) desenhar({ estado: 'progresso', linha });
    return;
  }

  // Voltar recarrega do banco: se o professor marcou algo enquanto esta tela
  // estava aberta, o aluno ve o novo estado ao entrar de novo.
  if (evento.target.closest('.voltar')) {
    carregar();
  }
});

await carregar();
```

O `await carregar()` solto no fim do arquivo funciona porque `<script type="module">` permite `await` no nível de topo. Não é gambiarra: é o que dispensa envolver tudo numa função só para poder chamá-la.

- [ ] **Step 5: Ligar os três pedaços em `principal.html`**

Três mudanças aditivas. Nada é removido nem alterado — o `<h1>O jogo vai aqui!</h1>` do Pedro continua onde está.

Na linha 7, depois da folha de estilo do Pedro:

```html
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="css/plataforma.css">
```

Dentro do `<main class="game">`, depois do `<h1>`:

```html
    <main class="game">
        <h1>O jogo vai aqui!</h1>
        <div id="raiz-aluno"></div>
    </main>
```

Antes do `</body>`:

```html
    <script type="module" src="js/aluno.js"></script>
</body>
```

- [ ] **Step 6: Dar altura ao container, senão a turma fica cortada**

O `.game` do Pedro tem `height: 100vh` e `overflow: hidden` — conteúdo que passa da altura é cortado **sem barra de rolagem**. A Task 6 deu `max-height: 100%` e `overflow-y: auto` ao `#area-aluno`, mas uma porcentagem de altura não resolve contra um pai de altura automática, e o `#raiz-aluno` não tem altura nenhuma. Resultado: numa turma de 20 alunos, a última fileira de avatares fica invisível e inalcançável.

Como o `style.css` não é tocado, a correção é dar altura explícita ao container novo. Acrescente ao fim de `css/plataforma.css`:

```css
/* O .game do Pedro tem height:100vh e overflow:hidden, e nao e tocado.
   Damos altura explicita ao container novo para que o max-height:100% do
   #area-aluno resolva e ele possa rolar por conta propria. Sem isto, uma
   turma de 20 alunos fica cortada e sem barra de rolagem. */
#raiz-aluno {
  height: calc(100vh - 140px);   /* desconta o <h1> do Pedro */
  box-sizing: border-box;
}
```

- [ ] **Step 7: Verificar à mão a máquina ainda não preparada**

Abra `principal.html` numa janela anônima (sem `localStorage`).

Esperado: a frase "Este computador ainda nao foi preparado. Chame o professor." dentro de uma caixa de aviso. Sem tela branca, sem erro vermelho no console. É o Review Focus 5.

- [ ] **Step 8: Verificar à mão as duas etapas**

Na janela normal, com a turma de teste já carregada em `professor.html` (o que gravou `turma_ativa`):

1. Abra `principal.html`. Esperado: "Clique no seu bichinho" e os avatares grandes, um por aluno, com o nome embaixo de cada um.
2. Clique num avatar. Esperado: o nome do aluno no título, a contagem "Voce ja conseguiu N de M", e a lista de atividades — as concluídas com estrela, as pendentes neutras, nenhum X vermelho e nenhuma palavra de erro (spec D7).
3. Clique em **Voltar**. Esperado: volta para os avatares.
4. Em `professor.html`, marque uma atividade nova desse aluno. Volte para `principal.html`, clique em Voltar e entre de novo no mesmo aluno. Esperado: a marcação nova aparece.
5. Navegue só pelo teclado: `Tab` percorre os avatares, `Enter` ou `Espaço` abre o progresso, `Tab` chega ao Voltar. Esperado: o foco é visível em cada parada.

- [ ] **Step 9: Verificar à mão a turma grande**

Em `professor.html`, cadastre alunos até chegar a doze. Volte para `principal.html`.

Esperado: todos os doze avatares são alcançáveis — rolando com a roda do mouse dentro da área, e com `Tab` pelo teclado. Esperado também: o botão de baixar o jogo, que fica depois dos avatares, continua alcançável. Se algum avatar ficar cortado sem forma de chegar nele, o Step 6 não surtiu efeito.

Vale fazer este teste com doze e não com três porque três cabem na tela de qualquer jeito, e uma turma real tem vinte.

- [ ] **Step 10: Commit**

```bash
git add js/aluno.js principal.html css/plataforma.css
git commit -m "feat: tela do aluno com escolha de avatar e progresso somente leitura"
```

---

## Task 11: Caminho crítico, acessibilidade e limpeza

**Files:**
- Create: `tests/caminho_critico.integracao.js`
- Create: `jogo/` com o arquivo do jogo
- Delete: `cadastro.js`
- Modify: `script.js:33-42` (remover)

**Interfaces:**
- Consumes: tudo das Tasks 1–10.
- Produces: nada. É a tarefa de fechamento.

Esta tarefa remove o que ficou órfão, coloca o jogo no lugar, e verifica a costura entre as tarefas — porque cada uma verificou só a sua própria parte. O único código novo é o teste do caminho crítico que a spec §9 pede.

- [ ] **Step 1: Remover o perfil falso do `script.js`**

Em `script.js`, apague as linhas 33–42 — da linha `const nomeSalvo = ...` até a última `}`:

```javascript
const nomeSalvo = localStorage.getItem("usuarioNome");
const emailSalvo = localStorage.getItem("usuarioEmail");

if (nomeSalvo) {
    document.querySelector("#perfil-nome").textContent = nomeSalvo;
}

if (emailSalvo) {
    document.querySelector("#perfil-email").textContent = emailSalvo;
}
```

As linhas 1–31, que são o seletor de foto de perfil do Pedro, **ficam intactas**. Esse bloco apenas lê o `localStorage` que o `cadastro.js` gravava; com o cadastro real da Task 7, ele lê uma chave que ninguém mais escreve.

Confira depois: `script.js` tem 31 linhas e termina em `});`.

- [ ] **Step 2: Remover o `cadastro.js`**

```bash
git rm cadastro.js
```

**Isto é uma exceção à restrição R1 além das que a spec listou — confirme com o Fabiano antes de rodar.** A justificativa é a mesma das linhas 33–42: o `cadastro.js` implementa cadastro de usuário via `localStorage`, que é o escopo deste documento, e a Task 7 já trocou a tag `<script>` do `cadastro.html` por `js/auth.js`. Depois dessa troca o arquivo não é carregado por página nenhuma. Se o Fabiano preferir, deixe o arquivo no repositório: ele fica inerte, só ocupa espaço.

- [ ] **Step 3: Colocar o jogo no lugar**

O `renderAreaAluno` da Task 6 gera um link para `jogo/JogosEducativos.zip`. Esse arquivo precisa existir, senão a criança clica e recebe uma página de erro.

```bash
mkdir -p jogo
```

Copie para `jogo/JogosEducativos.zip` um `.zip` contendo a build Windows do jogo (o `.exe` e a pasta de dados que o Unity gera ao lado dele — os dois juntos, porque o `.exe` sozinho não roda).

**Se a build não estiver disponível na hora de executar esta tarefa**, remova o bloco de download: em `js/render.js`, troque

```javascript
return `<section id="area-aluno">${conteudo}${BLOCO_DOWNLOAD}</section>`;
```

por

```javascript
return `<section id="area-aluno">${conteudo}</section>`;
```

e rode `node --test tests/render.test.js` para confirmar que os 18 testes continuam passando. Um link quebrado numa tela de criança é pior que link nenhum. Essa é também a razão de o bloco estar numa constante separada: tirá-lo é uma linha.

- [ ] **Step 4: Escrever o teste automatizado do caminho crítico**

A spec §9 pede **um teste automatizado** para o caminho que não pode quebrar, não uma checagem manual. Um teste de navegador exigiria instalar um driver, o que a restrição R5 não permite. O que dá para automatizar sem nada instalado é tudo entre o `insert` e o HTML final: a parte de banco por `fetch`, e a parte de tela pelos módulos puros. Fica de fora só o clique, que é fiação de DOM e é verificada à mão no Step 9.

Crie `tests/caminho_critico.integracao.js`:

```js
// Verifica, contra o banco real, o caminho que nao pode quebrar (spec §9):
// professor cria turma, aluno e atividade -> marca a atividade na grade ->
// a tela do aluno mostra a atividade marcada.
//
// Banco por fetch, tela pelos modulos puros. Zero dependencias.
//
// Nao se chama *.test.js de proposito: precisa de rede e de uma conta real,
// e `node --test tests/` nao deve tentar roda-lo.
//
// Uso:
//   PROF_A_EMAIL=... PROF_A_SENHA=... node tests/caminho_critico.integracao.js

import assert from 'node:assert/strict';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js';
import { montarGrade, montarLinhaDoAluno } from '../js/grade.js';
import { renderProgressoDoAluno } from '../js/render.js';

const exigido = (nome) => {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variavel de ambiente ${nome}`);
  return v;
};

async function logar(email, senha) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  const corpo = await r.json();
  if (!r.ok) throw new Error(`login falhou para ${email}: ${JSON.stringify(corpo)}`);
  return { token: corpo.access_token, id: corpo.user.id };
}

function rest(sessao) {
  return async (caminho, opcoes = {}) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
      ...opcoes,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessao.token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(opcoes.headers ?? {}),
      },
    });
    const texto = await r.text();
    return { ok: r.ok, status: r.status, corpo: texto ? JSON.parse(texto) : null };
  };
}

const prof = await logar(exigido('PROF_A_EMAIL'), exigido('PROF_A_SENHA'));
const como = rest(prof);

const turma = await como('turma', {
  method: 'POST',
  body: JSON.stringify({ nome: '__caminho_critico__', professor: prof.id }),
});
assert.ok(turma.ok, `nao criou a turma: ${JSON.stringify(turma.corpo)}`);
const idTurma = turma.corpo[0].id;

try {
  // nome com & de proposito: e o Review Focus 1 chegando ao HTML de verdade
  const aluno = await como('aluno', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, nome: 'Ana & Bruno', avatar: 'coruja' }),
  });
  assert.ok(aluno.ok, 'nao criou o aluno');
  const idAluno = aluno.corpo[0].id;

  const at1 = await como('atividade', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, titulo: 'Contar ate 10', ordem: 1 }),
  });
  const at2 = await como('atividade', {
    method: 'POST',
    body: JSON.stringify({ turma_id: idTurma, titulo: 'Reconhecer as cores', ordem: 2 }),
  });
  assert.ok(at1.ok && at2.ok, 'nao criou as atividades');
  const idAt1 = at1.corpo[0].id;

  // marca a primeira, como a grade do professor faz
  const marca = await como('progresso', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: idAluno, atividade_id: idAt1, origem: 'professor' }),
  });
  assert.ok(marca.ok, 'nao marcou a atividade');

  // duplo clique: a mesma marcacao nao pode entrar duas vezes
  const repetida = await como('progresso', {
    method: 'POST',
    body: JSON.stringify({ aluno_id: idAluno, atividade_id: idAt1, origem: 'professor' }),
  });
  assert.equal(repetida.ok, false, 'o banco aceitou marcacao duplicada');

  // le exatamente como a tela do aluno le
  const alunos = await como(
    `aluno?turma_id=eq.${idTurma}&select=id,nome,avatar&order=nome`
  );
  const atividades = await como(
    `atividade?turma_id=eq.${idTurma}&select=id,titulo,ordem&order=ordem`
  );
  const progresso = await como(
    `progresso?select=aluno_id,atividade_id,origem,aluno!inner(turma_id)` +
      `&aluno.turma_id=eq.${idTurma}`
  );

  const grade = montarGrade(alunos.corpo, atividades.corpo, progresso.corpo);
  const linha = montarLinhaDoAluno(grade, idAluno);
  assert.ok(linha, 'o aluno nao apareceu na grade');
  assert.equal(linha.celulas.length, 2, 'a grade nao tem as duas atividades');
  assert.equal(linha.concluidas, 1, 'a contagem nao deu 1 de 2');

  const html = renderProgressoDoAluno(linha);
  assert.match(html, /Contar ate 10/, 'a atividade marcada nao apareceu');
  assert.match(html, /atividade concluida/, 'a atividade nao apareceu como concluida');
  assert.match(html, /atividade pendente/, 'a atividade pendente nao apareceu');
  assert.match(html, /Ana &amp; Bruno/, 'o nome nao foi escapado');
  assert.ok(!html.includes('aria-pressed'), 'apareceu controle de escrita na tela do aluno');

  console.log('OK: caminho critico verificado de ponta a ponta');
} finally {
  // Apagar a turma leva aluno, atividade e progresso na cascata da Task 1.
  // Fica no finally para nao deixar lixo no banco se um assert falhar.
  await como(`turma?id=eq.${idTurma}`, { method: 'DELETE' });
}
```

- [ ] **Step 5: Rodar o teste do caminho crítico**

```bash
PROF_A_EMAIL=<professor A> PROF_A_SENHA=<senha A> \
node tests/caminho_critico.integracao.js
```

Esperado: `OK: caminho critico verificado de ponta a ponta`, e nenhuma turma `__caminho_critico__` sobrando no banco depois.

- [ ] **Step 6: Commit do teste**

```bash
git add tests/caminho_critico.integracao.js
git commit -m "test: caminho critico contra o banco real"
```

- [ ] **Step 7: Rodar a suíte inteira**

Run: `node --test tests/`
Esperado: PASSA, 56 testes, nenhum pulado por erro de importação.

A contagem por arquivo: 3 em `config.test.js`, 12 em `fila.test.js`, 10 em `db.test.js`, 13 em `grade.test.js`, 18 em `render.test.js`. Os dois arquivos `*.integracao.js` **não** entram nessa conta de propósito: o nome não casa com `*.test.js`, porque eles precisam de rede e de contas de verdade.

- [ ] **Step 8: Rodar a verificação das políticas contra o banco**

```bash
PROF_A_EMAIL=<professor A> PROF_A_SENHA=<senha A> \
PROF_B_EMAIL=<professor B> PROF_B_SENHA=<senha B> \
node tests/politicas.integracao.js
```

Esperado: `OK: um professor nao alcanca a turma do outro`.

A URL e a chave não vão por variável de ambiente: o teste as importa de `js/config.js`, que já as tem.

Vale rodar de novo aqui, mesmo tendo passado na Task 7, porque as Tasks 8–10 acrescentaram consultas novas — `listarProgresso` com o filtro por turma, entre outras — e é esta verificação que prova que elas também respeitam o isolamento.

- [ ] **Step 9: Percorrer o caminho crítico à mão**

Numa janela anônima, do zero, na ordem:

1. Abra `cadastro.html`. Crie uma conta de professora com e-mail real seu. Esperado: vai para `professor.html` já autenticada, e o canto superior mostra o e-mail.
2. Crie a turma "3º ano B". Esperado: aparece na lista e no seletor.
3. Selecione a turma e clique em usar. Esperado: o nome da turma aparece como turma ativa.
4. Cadastre três alunos com avatares diferentes: `Ana`, `Bruno & Clara`, `Davi <3`. Esperado: os três nomes aparecem como texto literal, com `&` e `<` visíveis, sem nada quebrado na página (Review Focus 1).
5. Cadastre duas atividades: "Contar ate 10" e "Reconhecer as cores".
6. Esperado agora: a grade mostra 3 linhas × 2 colunas, todas as células vazias, cada linha com `0/2`.
7. Marque quatro células quaisquer. Esperado: ficam verdes na hora, os totais das linhas acertam.
8. Recarregue `professor.html`. Esperado: as quatro marcações continuam lá.
9. Abra `principal.html`. Clique no avatar do `Bruno & Clara`. Esperado: o nome dele, com o `&`, e as atividades que você marcou com estrela.
10. Volte em `professor.html` e apague a atividade "Reconhecer as cores". Confirme no aviso. Esperado: a coluna desaparece, e as marcações daquela coluna vão com ela (foi a cascata da Task 1).
11. Clique em **Sair**. Esperado: volta para `login.html`.
12. Abra `professor.html` direto pela barra de endereço. Esperado: é mandado de volta para `login.html` — a guarda da Task 7 funciona.

O Step 5 já provou que os dados fazem o percurso certo. O que este passo prova é o que ele não alcança: que os cliques, os formulários, a guarda de página e os redirecionamentos ligam uma coisa na outra. Se algo falhar, é aqui que se descobre, antes de uma sala de aula descobrir.

- [ ] **Step 10: Verificar acessibilidade à mão**

Na grade do professor e na tela do aluno:

1. **Alvo de clique.** Nas ferramentas de desenvolvedor, inspecione uma `.celula` e um `.avatar-aluno`. Esperado: a célula tem no mínimo 44 × 44 px; o avatar, 120 × 120 px.
2. **Cor não é a única informação.** Nas ferramentas de desenvolvedor, ative a simulação de acromatopsia (visão sem cores). Esperado: ainda se distingue concluída de pendente, porque a concluída tem um sinal de conferido e a pendente não tem nada. Este é o teste que prova o requisito da spec de não usar cor como sinal único.
3. **Contraste.** Rode a auditoria de acessibilidade do navegador em `professor.html` e em `principal.html`. Esperado: nenhum apontamento de contraste insuficiente.
4. **Leitor de tela.** Com o leitor de tela do sistema ligado, percorra a grade pelo teclado. Esperado: cada célula é anunciada com o nome do aluno, o nome da atividade e o estado — porque o `aria-label` e o `aria-pressed` da Task 6 estão lá.
5. **Zoom em 200%.** Esperado: nada fica cortado nem sobreposto nas duas telas.

- [ ] **Step 11: Commit**

```bash
git add script.js jogo/
git commit -m "chore: remover perfil via localStorage e incluir a build do jogo"
```

Se o Step 2 foi confirmado, o `git rm cadastro.js` já deixou a remoção preparada e ela entra neste mesmo commit.

- [ ] **Step 12: Juntar na `main`**

```bash
git checkout main
git pull
git merge perfil-login-progresso
git push
```

A `main` já tem o trabalho do Pedro, e `merge` só acrescenta — nenhum commit dele é reescrito ou perdido. Se aparecer conflito, é porque o Pedro editou os mesmos arquivos nesse meio-tempo: resolva mantendo as duas mudanças, nunca descartando a dele.

---

## O que fica em aberto

Nada disto bloqueia a execução do plano, mas vale ter na mão:

1. **A chave `anon public` do Supabase** tem de ser colada em `js/config.js` na Task 2. Sem ela, nada funciona — é o primeiro item do caminho crítico.
2. **O jogo da Olivia só existe como `.exe` de Windows.** Não há projeto-fonte em lugar nenhum, nem no repositório. Enquanto não houver uma build WebGL, o jogo não roda no navegador e não consegue reportar progresso sozinho: por isso a coluna `origem` aceita `'jogo'` mas nenhum código deste plano grava esse valor. Vale confirmar com a Olivia se ela ainda tem o projeto Unity.
3. **`perfil.html` continua com o seletor de foto do Pedro** (`script.js` linhas 1–31). A spec proíbe guardar foto de aluno, mas essa tela é do professor, e o seletor nunca salvou nada em servidor nenhum — ele só mostra a imagem na própria tela. Fica como está; é pergunta para o Pedro, não decisão deste plano.
4. **`principal.html` declara `lang="en"`** e o conteúdo é todo em português. Um leitor de tela vai pronunciar português com fonemas de inglês. Trocar para `lang="pt-BR"` é um atributo, mas é alteração de arquivo do Pedro e não é aditiva — por isso não está em nenhuma tarefa. Vale combinar com ele.
