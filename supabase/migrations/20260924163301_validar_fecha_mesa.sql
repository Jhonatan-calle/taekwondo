-- ============================================================
-- Migración: validar_fecha_mesa
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new validar_fecha_mesa
-- Fecha: 2026-09-24
-- Descripción:
--   - Backstop en la BD: impide crear mesas de examen con fecha pasada
--     y mover una mesa existente a una fecha pasada.
--   - La app ya lo valida (date-picker con mínimo hoy); esto cubre el
--     caso de una llamada directa a la API con JWT de Maestro.
--   - No rompe mesas heredadas: en UPDATE solo valida si `fecha` CAMBIÓ
--     (editar el lugar o cerrar una mesa vieja sigue funcionando).
--   - `when (auth.uid() is not null)`: los procesos internos (Service
--     Role / seeds) pueden seguir cargando datos históricos si hace falta.
--   - Timezone: se compara contra hoy en la zona de la escuela
--     (America/Argentina/Buenos_Aires) para alinear con la fecha local
--     que usa la app (la BD corre en UTC).
--   - Referencia: documentacion/planes/bd-validar-fecha-mesa.md
-- ============================================================

create or replace function public.validar_fecha_mesa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if tg_op = 'INSERT' then
    if new.fecha < v_hoy then
      raise exception 'La fecha de la mesa no puede ser anterior a hoy.';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.fecha is distinct from old.fecha and new.fecha < v_hoy then
      raise exception 'La fecha de la mesa no puede ser anterior a hoy.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_fecha_mesa on public.mesas_examen;
create trigger validar_fecha_mesa
  before insert or update on public.mesas_examen
  for each row
  when (auth.uid() is not null)
  execute function public.validar_fecha_mesa();
