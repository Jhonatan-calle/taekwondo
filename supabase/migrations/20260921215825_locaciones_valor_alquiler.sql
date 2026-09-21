-- ============================================================
-- Migración: locaciones_valor_alquiler
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 5 ítem 1)
-- Generada por CLI: npx supabase migration new locaciones_valor_alquiler
-- Fecha: 2026-09-21
-- Descripción:
--   - El SRS §3.3 (Gestión de Lugares y Alquileres) exige registrar
--     el "valor de alquiler pactado" al crear un centro de
--     entrenamiento. La columna `locaciones.valor_alquiler` ya existe
--     desde el esquema inicial (`locaciones_y_alquileres`); NO se
--     elimina.
--   - Se vuelve OBLIGATORIA + no negativa, con backfill defensivo
--     para las locaciones creadas en la fase de grupos (cuando el
--     alta mínima no solicitaba el monto).
--   - Distinción de conceptos:
--       * `locaciones.valor_alquiler`  = valor PACTO del contrato.
--       * `pagos_alquiler.monto`       = monto PAGADO en un periodo.
--   - Sin cambios de RLS: las políticas del dueño y de auditoría de
--     superiores ya cubren SELECT/INSERT/UPDATE/DELETE.
--   - Referencia: documentacion/planes/mobile-registro-locaciones.md
-- ============================================================

-- Backfill defensivo: locaciones sin monto pactado quedan en 0.
update public.locaciones
   set valor_alquiler = 0
 where valor_alquiler is null;

-- El valor pactado pasa a ser obligatorio.
alter table public.locaciones
  alter column valor_alquiler set not null;

-- No se admiten valores negativos (coherente con pagos_alquiler.monto > 0).
alter table public.locaciones
  drop constraint if exists locaciones_valor_alquiler_no_negativo;

alter table public.locaciones
  add constraint locaciones_valor_alquiler_no_negativo
  check (valor_alquiler >= 0);
