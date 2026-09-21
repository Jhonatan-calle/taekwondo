-- ============================================================
-- Migración: pagos_alquiler_reglas
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 5 ítem 2)
-- Generada por CLI: npx supabase migration new pagos_alquiler_reglas
-- Fecha: 2026-09-21
-- Descripción:
--   - Reglas para los pagos de alquiler mensual (SRS §3.3).
--   - `pagos_alquiler.comprobante_url` YA EXISTE en la BD desde la
--     migración `locaciones_y_alquileres` (columna `text` nullable).
--     NO se re-crea aquí; lo que faltaba era documentarla en
--     `documentacion/databaseModel.md`.
--   - Se agrega la UNICIDAD de (locacion_id, periodo): un periodo no
--     puede pagarse dos veces para la misma locación, coherente con
--     la restricción de `pagos_cuota (alumno_id, periodo)`.
--   - Las políticas RLS ya existentes cubren el flujo:
--       * `pagos_alquiler`: select dueño + select superior (auditoría
--         SRS §2), insert y update del dueño.
--       * `storage.objects` del bucket privado `comprobantes`:
--         upload/select/delete del dueño + select del superior.
--   - Referencia: documentacion/planes/mobile-pagos-alquiler.md
-- ============================================================

-- Un pago por periodo y locación (evita duplicar el pago del mismo mes).
create unique index if not exists pagos_alquiler_locacion_periodo_unico_idx
  on public.pagos_alquiler (locacion_id, periodo);
