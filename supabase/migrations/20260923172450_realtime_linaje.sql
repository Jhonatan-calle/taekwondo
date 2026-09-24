-- ============================================================
-- Migración: realtime_linaje
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new realtime_linaje
-- Fecha: 2026-09-23
-- Descripción:
--   Habilita Realtime (Postgres Changes) para el flujo de linaje:
--   - `profiles`: el solicitante detecta en vivo cuando el superior
--     confirma (maestro_id + grado + es_profesor).
--   - `solicitudes_linaje`: el solicitante detecta el cambio de estado
--     y el superior ve las solicitudes nuevas/resueltas en vivo.
--   - No se tocan las tablas ya publicadas (torneos/llaves/enfrentamientos).
--   - Postgres Changes respeta RLS: cada usuario recibe solo sus filas.
-- ============================================================

alter publication supabase_realtime
  add table public.profiles, public.solicitudes_linaje;
