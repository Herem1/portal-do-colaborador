-- =====================================================
-- Pendências dos colaboradores (anotações do RH)
-- Só o RH vê e altera. O colaborador não consegue ler, nem pela API.
-- Rode uma vez no Supabase: SQL Editor → + → cole → Run
-- =====================================================
create table if not exists public.pendencias (
  id bigint generated always as identity primary key,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  texto text not null check (length(texto) between 1 and 500),
  prazo date,
  feita boolean not null default false,
  feita_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists pendencias_colab on public.pendencias (colaborador_id);

alter table public.pendencias enable row level security;
drop policy if exists "pendencias: só rh" on public.pendencias;
create policy "pendencias: só rh" on public.pendencias for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.pendencias from anon;
grant select, insert, update, delete on public.pendencias to authenticated;
