-- =====================================================
-- ASSINATURA ELETRÔNICA da folha de ponto e do holerite
-- (pode rodar mais de uma vez)
-- =====================================================
alter table public.confirmacoes add column if not exists assinatura text;   -- desenho da assinatura (imagem)
alter table public.confirmacoes add column if not exists codigo text;       -- código de verificação do conteúdo assinado
alter table public.confirmacoes add column if not exists ip text;
alter table public.confirmacoes add column if not exists aparelho text;

create table if not exists public.assinaturas_holerite (
  holerite_id bigint primary key references public.holerites(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  assinado_em timestamptz not null default now(),
  assinatura text not null,
  codigo text not null,
  ip text,
  aparelho text
);
alter table public.assinaturas_holerite enable row level security;
drop policy if exists "assinaturas: ver" on public.assinaturas_holerite;
create policy "assinaturas: ver" on public.assinaturas_holerite for select to authenticated
  using (public.is_admin() or colaborador_id = public.meu_colaborador());
grant select on public.assinaturas_holerite to authenticated;

-- Código de verificação: resumo (md5) do conteúdo do documento no momento da assinatura
create or replace function public.codigo_folha(p_colab uuid, p_ref text) returns text
language sql stable security definer set search_path = public as $$
  select upper(substr(md5(coalesce(string_agg(dia::text || array_to_string(marcacoes, ',') || coalesce(ocorrencia, '') || coalesce(observacao, ''), '|' order by dia), '')), 1, 16))
  from pontos where colaborador_id = p_colab and to_char(dia, 'YYYY-MM') = p_ref;
$$;
create or replace function public.codigo_holerite(p_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select upper(substr(md5(ref || itens::text || rodape::text || coalesce(obs, '')), 1, 16)) from holerites where id = p_id;
$$;
create or replace function public.ip_da_requisicao() returns text
language sql stable as $$
  select split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1);
$$;

-- Colaborador assina a própria folha do mês
drop function if exists public.confirmar_folha(text);
create or replace function public.confirmar_folha(p_ref text, p_assinatura text default null, p_aparelho text default null) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_colab uuid; v_quando timestamptz;
begin
  v_colab := meu_colaborador();
  if v_colab is null then raise exception 'Conta sem cadastro de colaborador'; end if;
  if p_assinatura is not null and (p_assinatura not like 'data:image/png;base64,%' or length(p_assinatura) > 300000) then raise exception 'Assinatura inválida'; end if;
  insert into confirmacoes(colaborador_id, ref, assinatura, codigo, ip, aparelho)
  values (v_colab, p_ref, p_assinatura, codigo_folha(v_colab, p_ref), ip_da_requisicao(), left(p_aparelho, 300))
  on conflict (colaborador_id, ref) do nothing;
  select confirmado_em into v_quando from confirmacoes where colaborador_id = v_colab and ref = p_ref;
  return v_quando;
end $$;

-- Colaborador assina o recebimento do próprio holerite (só depois de assinar a folha do mês)
create or replace function public.assinar_holerite(p_id bigint, p_assinatura text, p_aparelho text default null) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_colab uuid; v_ref text; v_quando timestamptz;
begin
  v_colab := meu_colaborador();
  if v_colab is null then raise exception 'Conta sem cadastro de colaborador'; end if;
  select ref into v_ref from holerites where id = p_id and colaborador_id = v_colab;
  if v_ref is null then raise exception 'Holerite não encontrado'; end if;
  if p_assinatura is null or p_assinatura not like 'data:image/png;base64,%' or length(p_assinatura) > 300000 then raise exception 'Assinatura inválida'; end if;
  insert into assinaturas_holerite(holerite_id, colaborador_id, assinatura, codigo, ip, aparelho)
  values (p_id, v_colab, p_assinatura, codigo_holerite(p_id), ip_da_requisicao(), left(p_aparelho, 300))
  on conflict (holerite_id) do nothing;
  select assinado_em into v_quando from assinaturas_holerite where holerite_id = p_id;
  return v_quando;
end $$;

-- Se o RH mudar a folha ou o holerite depois da assinatura, a assinatura cai e o colaborador assina de novo
create or replace function public.invalida_folha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from confirmacoes where colaborador_id = old.colaborador_id and ref = to_char(old.dia, 'YYYY-MM');
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    delete from confirmacoes where colaborador_id = new.colaborador_id and ref = to_char(new.dia, 'YYYY-MM');
  end if;
  return null;
end $$;
drop trigger if exists pontos_invalida on public.pontos;
create trigger pontos_invalida after insert or update or delete on public.pontos
  for each row execute function public.invalida_folha();

create or replace function public.invalida_holerite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.itens is distinct from new.itens or old.rodape is distinct from new.rodape or old.ref is distinct from new.ref or old.obs is distinct from new.obs then
    delete from assinaturas_holerite where holerite_id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists holerites_invalida on public.holerites;
create trigger holerites_invalida after update on public.holerites
  for each row execute function public.invalida_holerite();

revoke execute on function public.codigo_folha(uuid, text), public.codigo_holerite(bigint), public.invalida_folha(), public.invalida_holerite() from public, anon, authenticated;
grant execute on function public.confirmar_folha(text, text, text)  to authenticated;
grant execute on function public.assinar_holerite(bigint, text, text) to authenticated;
grant execute on function public.ip_da_requisicao() to authenticated;
