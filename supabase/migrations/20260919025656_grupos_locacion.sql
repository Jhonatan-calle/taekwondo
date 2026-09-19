-- ============================================================
-- Migración: grupos_locacion
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new grupos_locacion
-- Fecha: 2026-09-19
-- Descripción:
--   - Grupos asociados a un salón/locación (SRS §3.4).
--   - `grupos.ubicacion` (texto libre) queda como legacy deprecated;
--     la relación canónica pasa a `locacion_id`.
-- ============================================================

alter table public.grupos
  add column locacion_id uuid references public.locaciones(id) on delete set null;

create index grupos_locacion_id_idx on public.grupos (locacion_id);