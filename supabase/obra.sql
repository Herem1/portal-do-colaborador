-- Campo "Obra" no cadastro do colaborador (pode rodar mais de uma vez)
alter table public.colaboradores add column if not exists obra text;
grant select (id, user_id, nome, cpf, codigo, cargo, cbo, departamento, filial, centro_custo, lotacao, tipo_salario,
              admissao, email, tel, salario, ajuda_custo, dependentes, banco, jornada, criado_em, obra)
  on public.colaboradores to authenticated;
