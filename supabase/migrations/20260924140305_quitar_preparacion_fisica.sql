-- ============================================================
-- Migración: quitar_preparacion_fisica
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new quitar_preparacion_fisica
-- Fecha: 2026-09-24
-- Descripción:
--   - La ficha técnica de la clase ya no incluye "preparación física".
--     El objetivo (1–2 elementos del ciclo ITF) + un detalle opcional
--     alcanzan para documentar la sesión.
--   - Se descarta el texto existente de la columna.
--   - Referencia: documentacion/planes/mobile-objetivo-clase-elementos.md
-- ============================================================

alter table public.clases
  drop column if exists preparacion_fisica;
