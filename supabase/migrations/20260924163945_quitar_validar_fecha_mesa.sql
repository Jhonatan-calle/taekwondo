-- ============================================================
-- Migración: quitar_validar_fecha_mesa
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new quitar_validar_fecha_mesa
-- Fecha: 2026-09-24
-- Descripción:
--   - Revierte la migración 20260924163301_validar_fecha_mesa.
--   - A pedido: se elimina todo límite de fecha en `mesas_examen`
--     (se pueden crear/editar mesas con cualquier fecha).
--   - Referencia: documentacion/planes/bd-validar-fecha-mesa.md
-- ============================================================

drop trigger if exists validar_fecha_mesa on public.mesas_examen;
drop function if exists public.validar_fecha_mesa();
