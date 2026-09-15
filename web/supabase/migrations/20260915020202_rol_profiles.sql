-- ============================================================
-- Migración: rol_profiles
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new rol_profiles
-- Fecha: 2026-09-15
-- ============================================================

-- 1. Columna de rol MVP (solo profesor | alumno; el organizador es el profesor dueño del torneo).
alter table public.profiles
  add column rol text not null default 'alumno'
  check (rol in ('profesor', 'alumno'));

-- 2. Endurecimiento RLS: solo el Service Role puede escribir `rol`.
--    auth.uid() es NULL bajo service_role (cliente admin.ts), por lo que el trigger
--    solo bloquea a usuarios autenticados que intenten auto-asignarse el rol.
create or replace function public.bloquear_auto_cambio_rol()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.rol <> old.rol then
    raise exception 'El rol de un perfil solo puede ser cambiado por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_cambio_rol
  before update of rol on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_rol();