-- Verifica o esquema: restricoes e cascata.
-- Roda no SQL Editor do Supabase. Tudo que cria, apaga no fim.
-- Se algo estiver errado, levanta excecao e desfaz a transacao inteira.
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
