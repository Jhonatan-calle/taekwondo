-- ============================================================
-- Migración: rama_descendientes
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new rama_descendientes
-- Fecha: 2026-09-24
-- Descripción:
--   - Helper para la auditoría en cascada agrupada por rama.
--   - Devuelve, para cada descendiente (directo o indirecto) de un
--     ancestro, a qué SUBORDINADO DIRECTO pertenece (`raiz_id`): el
--     hijo directo del ancestro que encabeza esa rama.
--   - Privacidad: expone SOLO ids (relación organizacional); nunca
--     nombres ni datos personales. Las locaciones siguen limitadas
--     por RLS; esto solo permite agrupar en la UI.
--   - Referencia: documentacion/planes/mobile-auditoria-rama-agrupada.md
-- ============================================================

create or replace function public.rama_descendientes(p_ancestro uuid)
returns table (descendiente_id uuid, raiz_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  with recursive arbol as (
    -- Primer nivel: hijos directos (cada uno es la raíz de su rama).
    select id, id as raiz_id
      from public.profiles
     where maestro_id = p_ancestro
    union all
    -- Niveles siguientes: heredan la raíz de su ancestro.
    select pr.id, a.raiz_id
      from public.profiles pr
      join arbol a on pr.maestro_id = a.id
  )
  select id as descendiente_id, raiz_id from arbol;
$$;

revoke execute on function public.rama_descendientes(uuid) from public, anon;
grant execute on function public.rama_descendientes(uuid) to authenticated;
