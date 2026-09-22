-- ============================================================
-- Migración: mesas_examen_sin_limite
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 7 ítem 1)
-- Generada por CLI: npx supabase migration new mesas_examen_sin_limite
-- Fecha: 2026-09-22
-- Descripción:
--   - Se elimina `mesas_examen.limite_inscripcion`.
--   - DECISIÓN DEL USUARIO: el cupo máximo de la mesa no se aplica
--     en ningún flujo actual, así que se descarta del modelo para no
--     pedir un dato que no se usa.
--   - El SRS §3.7 y las Reglas §4 mencionaban el "límite de
--     inscripción" como requisito de la planificación; esos
--     documentos se actualizaron para no contradecir al modelo
--     (ver documentacion/planes/mobile-mesas-examen.md).
--   - Las políticas de `mesas_examen` no referencian la columna, por
--     lo que no requieren cambios.
-- ============================================================

alter table public.mesas_examen
  drop column if exists limite_inscripcion;
