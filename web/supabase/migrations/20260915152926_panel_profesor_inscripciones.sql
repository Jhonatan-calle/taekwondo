-- ============================================================
-- Migración: panel_profesor_inscripciones
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new panel_profesor_inscripciones
-- Fecha: 2026-09-15
-- ============================================================

-- 1. Auditoría simétrica de rechazo (par de confirmado_por/confirmado_en).
--    Rechazar una inscripción deja registro de quién y cuándo la rechazó.
alter table public.inscripciones
  add column rechazado_por uuid references public.profiles(id),
  add column rechazado_en timestamptz;

-- 2. SELECT de datos privados limitado al profesor del aval u organizador del torneo.
--    El alumno NO tiene ninguna política que se lo conceda (aislamiento de nivel_agresividad).
create policy "datos_privados_select_profesor"
  on public.inscripciones_datos_privados for select
  to authenticated
  using (
    auth.uid() = (select profesor_id from public.inscripciones where id = inscripcion_id)
    or auth.uid() in (
      select t.organizador_id
      from public.torneos t
      join public.inscripciones i on i.torneo_id = t.id
      where i.id = inscripcion_id
    )
  );