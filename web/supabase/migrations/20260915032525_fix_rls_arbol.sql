-- ============================================================
-- Migración: fix_rls_arbol
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new fix_rls_arbol
-- Fecha: 2026-09-15
-- Descripción: Corrige recursión infinita de RLS entre
--   public.grupos y public.miembros_grupo (las políticas se
--   referenciaban cruzadas). Se reemplazan por helpers
--   SECURITY DEFINER que rompen el ciclo.
-- ============================================================

-- 1. Helpers SECURITY DEFINER (corren como postgres, sin RLS: rompen la recursión)
create or replace function public.es_alumno_del_grupo(p_grupo_id uuid, p_perfil_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.miembros_grupo mg
    where mg.grupo_id = p_grupo_id and mg.alumno_id = p_perfil_id
  );
$$;

create or replace function public.es_profesor_del_grupo(p_grupo_id uuid, p_perfil_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.grupos g
    where g.id = p_grupo_id and g.profesor_id = p_perfil_id
  );
$$;

-- Uso exclusivo interno (políticas): anon no puede invocarlas vía RPC.
revoke execute on function public.es_alumno_del_grupo(uuid, uuid) from public;
revoke execute on function public.es_profesor_del_grupo(uuid, uuid) from public;
grant execute on function public.es_alumno_del_grupo(uuid, uuid) to authenticated;
grant execute on function public.es_profesor_del_grupo(uuid, uuid) to authenticated;

-- 2. Reemplazo de las 4 políticas cruzadas por versiones con helpers
drop policy if exists grupos_select_miembro on public.grupos;
create policy grupos_select_miembro on public.grupos
  for select to authenticated
  using (public.es_alumno_del_grupo(id, auth.uid()));

drop policy if exists miembros_select_profesor on public.miembros_grupo;
create policy miembros_select_profesor on public.miembros_grupo
  for select to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));

drop policy if exists miembros_update_profesor on public.miembros_grupo;
create policy miembros_update_profesor on public.miembros_grupo
  for update to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()))
  with check (public.es_profesor_del_grupo(grupo_id, auth.uid()));

drop policy if exists miembros_delete_profesor on public.miembros_grupo;
create policy miembros_delete_profesor on public.miembros_grupo
  for delete to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));