-- =====================================================================
-- Portal do Colaborador — banco de dados (Supabase / PostgreSQL)
-- Cole este arquivo inteiro em: Supabase → SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem perder dados.
-- =====================================================================

-- ---------- TABELAS ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.empresa (
  id int primary key default 1 check (id = 1),
  nome text not null default 'Minha Empresa',
  cnpj text,
  logo text                      -- imagem em data URL (pequena)
);
insert into public.empresa(id) values (1) on conflict do nothing;

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  codigo text,                   -- código do funcionário (holerite)
  cargo text, cbo text, departamento text, filial text,
  centro_custo text,             -- ex.: CT6065 (folha de ponto)
  lotacao text,                  -- ex.: OPERACIONAL (CC do holerite)
  tipo_salario text default 'Mensalista',
  admissao date, email text, tel text,
  salario numeric(12,2) default 0, ajuda_custo numeric(12,2) default 0,
  banco text,
  -- jornada prevista por dia da semana (dom..sáb), formato HH:MM ou vazio
  jornada text[] not null default '{"","09:00","09:00","09:00","09:00","08:00",""}',
  codigo_acesso text,            -- código de primeiro acesso (some depois do uso)
  tentativas int not null default 0,
  criado_em timestamptz not null default now()
);
-- dependentes para o IRRF (coluna nova; o "if not exists" deixa rodar o script de novo)
alter table public.colaboradores add column if not exists dependentes int not null default 0;

create table if not exists public.pontos (
  id bigserial primary key,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  dia date not null,
  marcacoes text[] not null default '{}',   -- entrada, saída almoço, retorno almoço, saída
  ocorrencia text,                           -- Feriado, Sem expediente, Folga, Atestado, Férias, Falta
  observacao text,
  unique (colaborador_id, dia)
);

create table if not exists public.holerites (
  id bigserial primary key,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  ref text not null check (ref ~ '^[0-9]{4}-[0-9]{2}$'),
  itens jsonb not null default '[]',        -- [{codigo, desc, ref, tipo:'p'|'d', valor}]
  rodape jsonb not null default '{}',       -- salario_base, sal_contr_inss, base_fgts, fgts_mes, base_irrf, faixa_irrf
  obs text,
  criado_em timestamptz not null default now(),
  unique (colaborador_id, ref)
);

-- Confirmação ("dar OK") do colaborador na folha de ponto do mês
create table if not exists public.confirmacoes (
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  ref text not null check (ref ~ '^[0-9]{4}-[0-9]{2}$'),
  confirmado_em timestamptz not null default now(),
  primary key (colaborador_id, ref)
);

create table if not exists public.avisos (
  id bigserial primary key,
  titulo text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);

-- ---------- FUNÇÕES AUXILIARES ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.meu_colaborador() returns uuid
language sql stable security definer set search_path = public as $$
  select id from colaboradores where user_id = auth.uid();
$$;

-- Primeiro administrador: só funciona enquanto não existir nenhum.
create or replace function public.criar_primeiro_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from admins) then return false; end if;
  insert into admins(user_id) values (auth.uid());
  return true;
end $$;

-- Existe algum administrador? (usado na tela de login)
create or replace function public.tem_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins);
$$;

-- Confere CPF + código antes de criar a senha. Bloqueia após 5 erros.
create or replace function public.checar_codigo(p_cpf text, p_codigo text) returns text
language plpgsql security definer set search_path = public as $$
declare c colaboradores%rowtype;
begin
  select * into c from colaboradores where cpf = p_cpf;
  if not found or c.user_id is not null or c.codigo_acesso is null then return 'invalido'; end if;
  if c.tentativas >= 5 then return 'bloqueado'; end if;
  if c.codigo_acesso <> upper(trim(p_codigo)) then
    update colaboradores set tentativas = tentativas + 1 where id = c.id;
    return 'invalido';
  end if;
  return 'ok';
end $$;

-- Liga a conta recém-criada ao cadastro feito pelo RH.
create or replace function public.vincular_conta(p_cpf text, p_codigo text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update colaboradores
     set user_id = auth.uid(), codigo_acesso = null, tentativas = 0
   where cpf = p_cpf and user_id is null and tentativas < 5
     and codigo_acesso = upper(trim(p_codigo));
  return found;
end $$;

-- RH: gera novo código de acesso (para o 1º acesso ou quando a pessoa esquece a senha).
create or replace function public.resetar_acesso(p_colab uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid; v_cod text;
begin
  if not is_admin() then raise exception 'Apenas o RH pode fazer isso'; end if;
  select user_id into v_user from colaboradores where id = p_colab;
  v_cod := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  update colaboradores set user_id = null, codigo_acesso = v_cod, tentativas = 0 where id = p_colab;
  if v_user is not null and not exists (select 1 from admins where user_id = v_user) then
    delete from auth.users where id = v_user;
  end if;
  return v_cod;
end $$;

-- Colaborador dá OK na própria folha do mês.
create or replace function public.confirmar_folha(p_ref text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_colab uuid; v_quando timestamptz;
begin
  v_colab := meu_colaborador();
  if v_colab is null then raise exception 'Conta sem cadastro de colaborador'; end if;
  insert into confirmacoes(colaborador_id, ref) values (v_colab, p_ref)
  on conflict (colaborador_id, ref) do nothing;
  select confirmado_em into v_quando from confirmacoes where colaborador_id = v_colab and ref = p_ref;
  return v_quando;
end $$;

-- RH: consulta o código de primeiro acesso de um colaborador.
create or replace function public.codigo_acesso(p_colab uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Apenas o RH pode fazer isso'; end if;
  return (select codigo_acesso from colaboradores where id = p_colab);
end $$;

drop function if exists public.bater_ponto();

-- Novo cadastro já nasce com código de acesso.
create or replace function public.gera_codigo() returns trigger
language plpgsql as $$
begin
  if new.user_id is null and new.codigo_acesso is null then
    new.codigo_acesso := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  end if;
  return new;
end $$;
drop trigger if exists trg_gera_codigo on public.colaboradores;
create trigger trg_gera_codigo before insert on public.colaboradores
  for each row execute function public.gera_codigo();

-- ---------- PERMISSÕES (Row Level Security) ----------
alter table public.admins        enable row level security;
alter table public.empresa       enable row level security;
alter table public.colaboradores enable row level security;
alter table public.pontos        enable row level security;
alter table public.holerites     enable row level security;
alter table public.avisos        enable row level security;
alter table public.confirmacoes  enable row level security;

drop policy if exists "admins: ver" on public.admins;
create policy "admins: ver" on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "empresa: ver" on public.empresa;
create policy "empresa: ver" on public.empresa for select to authenticated using (true);
drop policy if exists "empresa: rh grava" on public.empresa;
create policy "empresa: rh grava" on public.empresa for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "colab: ver" on public.colaboradores;
create policy "colab: ver" on public.colaboradores for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
drop policy if exists "colab: rh grava" on public.colaboradores;
create policy "colab: rh grava" on public.colaboradores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pontos: ver" on public.pontos;
create policy "pontos: ver" on public.pontos for select to authenticated
  using (public.is_admin() or colaborador_id = public.meu_colaborador());
drop policy if exists "pontos: rh grava" on public.pontos;
create policy "pontos: rh grava" on public.pontos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "holerites: ver" on public.holerites;
create policy "holerites: ver" on public.holerites for select to authenticated
  using (public.is_admin() or colaborador_id = public.meu_colaborador());
drop policy if exists "holerites: rh grava" on public.holerites;
create policy "holerites: rh grava" on public.holerites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "confirmacoes: ver" on public.confirmacoes;
create policy "confirmacoes: ver" on public.confirmacoes for select to authenticated
  using (public.is_admin() or colaborador_id = public.meu_colaborador());
drop policy if exists "confirmacoes: rh apaga" on public.confirmacoes;
create policy "confirmacoes: rh apaga" on public.confirmacoes for delete to authenticated
  using (public.is_admin());

drop policy if exists "avisos: ver" on public.avisos;
create policy "avisos: ver" on public.avisos for select to authenticated using (true);
drop policy if exists "avisos: rh grava" on public.avisos;
create policy "avisos: rh grava" on public.avisos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Ninguém lê o código de acesso direto da tabela (o RH usa a função codigo_acesso).
revoke select on public.colaboradores from anon, authenticated;
grant select (id, user_id, nome, cpf, codigo, cargo, cbo, departamento, filial, centro_custo, lotacao, tipo_salario,
              admissao, email, tel, salario, ajuda_custo, dependentes, banco, jornada, criado_em)
  on public.colaboradores to authenticated;

-- Permissões das tabelas (projetos novos do Supabase não dão essas permissões sozinhos)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.admins, public.empresa, public.pontos, public.holerites, public.confirmacoes, public.avisos to authenticated;
grant insert, update, delete on public.colaboradores to authenticated;
grant select (id, user_id, nome, cpf, codigo, cargo, cbo, departamento, filial, centro_custo, lotacao, tipo_salario,
              admissao, email, tel, salario, ajuda_custo, dependentes, banco, jornada, criado_em)
  on public.colaboradores to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Quem pode chamar cada função
revoke execute on all functions in schema public from public, anon;
grant execute on function public.tem_admin()                to anon, authenticated;
grant execute on function public.checar_codigo(text,text)  to anon, authenticated;
grant execute on function public.vincular_conta(text,text) to authenticated;
grant execute on function public.criar_primeiro_admin()    to authenticated;
grant execute on function public.is_admin()                to authenticated;
grant execute on function public.meu_colaborador()         to authenticated;
grant execute on function public.resetar_acesso(uuid)      to authenticated;
grant execute on function public.codigo_acesso(uuid)       to authenticated;
grant execute on function public.confirmar_folha(text)     to authenticated;
