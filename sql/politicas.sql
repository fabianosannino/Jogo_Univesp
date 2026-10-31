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

-- progresso: o using so verifica o aluno (caminho suficiente para leitura, pois
-- na pratica aluno e atividade pertencem a mesma turma). O with check fecha as
-- duas pontas na escrita: garante que aluno_id E atividade_id pertencem a uma
-- turma do professor, impedindo que o professor A grave progresso apontando para
-- a atividade da professora B.
create policy progresso_da_minha_turma on progresso
  for all
  using (exists (
    select 1 from aluno a
      join turma t on t.id = a.turma_id
    where a.id = progresso.aluno_id and t.professor = auth.uid()
  ))
  with check (
    exists (
      select 1 from aluno a
        join turma t on t.id = a.turma_id
      where a.id = progresso.aluno_id and t.professor = auth.uid()
    )
    and exists (
      select 1 from atividade atv
        join turma t2 on t2.id = atv.turma_id
      where atv.id = progresso.atividade_id and t2.professor = auth.uid()
    )
  );
