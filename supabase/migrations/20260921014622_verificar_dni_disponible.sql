-- ============================================================
-- Migración: verificar_dni_disponible
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new verificar_dni_disponible
-- Fecha: 2026-09-20
-- Descripción:
--   - RPC de unicidad del DNI para el onboarding de perfil (SRS §3.1).
--   - Por RLS en cascada el usuario no puede leer los DNI de terceros
--     (solo su propio perfil y alumnos directos); este helper SECURITY
--     DEFINER mejora la UX ("validar antes de registrar") y el índice
--     único `profiles_dni_unique_key` sigue siendo la fuente de verdad.
--   - Excluye el propio perfil (auth.uid()) para soportar el caso de
--     re-editar el DNI sin que se reporte como duplicado.
-- ============================================================

create or replace function public.verificar_dni_disponible(p_dni text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
     where dni = p_dni and id <> auth.uid()
  );
$$;

revoke execute on function public.verificar_dni_disponible(text) from public, anon;
grant execute on function public.verificar_dni_disponible(text) to authenticated;