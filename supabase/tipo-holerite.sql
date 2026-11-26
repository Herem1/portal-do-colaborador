-- =====================================================
-- Tipo do holerite (Mensal, 13º 1ª parcela, 13º 2ª parcela, Férias...)
-- Permite ter o holerite mensal e o do 13º no mesmo mês.
-- Rode uma vez no Supabase: SQL Editor → + → cole → Run
-- =====================================================
alter table public.holerites add column if not exists tipo text not null default 'Mensal';
alter table public.holerites drop constraint if exists holerites_colaborador_id_ref_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'holerites_colaborador_id_ref_tipo_key') then
    alter table public.holerites add constraint holerites_colaborador_id_ref_tipo_key unique (colaborador_id, ref, tipo);
  end if;
end $$;

-- Mudou o tipo do holerite: a assinatura do colaborador cai, como nas outras mudanças
create or replace function public.invalida_holerite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.itens is distinct from new.itens or old.rodape is distinct from new.rodape or old.ref is distinct from new.ref
     or old.obs is distinct from new.obs or old.tipo is distinct from new.tipo then
    delete from assinaturas_holerite where holerite_id = new.id;
  end if;
  return null;
end $$;
revoke execute on function public.invalida_holerite() from public, anon, authenticated;
