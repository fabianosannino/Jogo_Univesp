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
