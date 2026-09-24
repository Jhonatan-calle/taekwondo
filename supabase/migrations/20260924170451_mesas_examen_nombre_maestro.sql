-- ============================================================
-- Migración: mesas_examen_nombre_maestro
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new mesas_examen_nombre_maestro
-- Fecha: 2026-09-24
-- Descripción:
--   - RPC `listar_mesas_examen()` para que la app muestre SIEMPRE el
--     dueño de la mesa (quien la abrió), sin importar quién la visita.
--   - Devuelve lo mismo que la app ya listaba + `maestro_nombre`.
--   - `SECURITY DEFINER` porque las RLS de `profiles` no permiten leer
--     el perfil de otro maestro (solo el propio + alumnos directos).
--     Expone únicamente el NOMBRE del maestro del evento (dato
--     organizacional), nunca datos de alumnos.
--   - Referencia: documentacion/planes/mobile-mesas-dueno-nombre.md
-- ============================================================

create or replace function public.listar_mesas_examen()
returns table (
  id uuid,
  maestro_id uuid,
  maestro_nombre text,
  fecha date,
  lugar text,
  estado text,
  cantidad_postulados int
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id,
         m.maestro_id,
         pr.nombre_completo,
         m.fecha,
         m.lugar,
         m.estado,
         (select count(*)::int from public.postulaciones_examen po where po.mesa_id = m.id)
    from public.mesas_examen m
    left join public.profiles pr on pr.id = m.maestro_id
   order by m.fecha desc;
$$;

revoke execute on function public.listar_mesas_examen() from public;
grant execute on function public.listar_mesas_examen() to authenticated;
