-- Permissões das tabelas para o site (projetos novos do Supabase não dão essas permissões sozinhos).
-- As regras de quem vê o quê continuam valendo (Row Level Security).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.admins, public.empresa, public.pontos, public.holerites, public.confirmacoes, public.avisos to authenticated;
grant insert, update, delete on public.colaboradores to authenticated;
grant select (id, user_id, nome, cpf, codigo, cargo, cbo, departamento, filial, centro_custo, lotacao, tipo_salario,
              admissao, email, tel, salario, ajuda_custo, dependentes, banco, jornada, criado_em)
  on public.colaboradores to authenticated;
grant usage, select on all sequences in schema public to authenticated;
