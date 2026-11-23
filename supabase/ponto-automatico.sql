-- Ponto automático, horário padrão e situação do colaborador (pode rodar mais de uma vez)
alter table public.colaboradores add column if not exists obra text;
alter table public.colaboradores add column if not exists horario jsonb;                         -- horário padrão por dia (dom..sáb)
alter table public.colaboradores add column if not exists ponto_auto boolean not null default true;
alter table public.colaboradores add column if not exists situacao text not null default 'Ativo';
alter table public.colaboradores add column if not exists demissao date;
grant select (id, user_id, nome, cpf, codigo, cargo, cbo, departamento, filial, centro_custo, lotacao, tipo_salario,
              admissao, email, tel, salario, ajuda_custo, dependentes, banco, jornada, criado_em, obra,
              horario, ponto_auto, situacao, demissao)
  on public.colaboradores to authenticated;
