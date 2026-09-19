-- ============================================================
-- Migración: roles_duales
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new roles_duales
-- Fecha: 2026-09-15
-- Descripción: Faceta dual alumno+profesor bajo la misma cuenta.
--   La faceta alumno es el perfil base; la faceta profesor es un flag
--   booleano (es_profesor). Se elimina profiles.rol (rol único MVP).
-- ============================================================

-- 1. Nueva faceta (alumno = perfil base; profesor = flag de capacidad)
alter table public.profiles
  add column es_profesor boolean not null default false;

-- 2. Backfill desde el rol actual (usuarios dados de alta como profesor)
update public.profiles set es_profesor = true where rol = 'profesor';

-- 3. Quitar la protección del rol viejo
drop trigger if exists bloquear_auto_cambio_rol on public.profiles;
drop function if exists public.bloquear_auto_cambio_rol;

-- 4. Eliminar rol (cae también su check constraint)
alter table public.profiles drop column rol;

-- 5. Blindaje de la faceta: solo el Service Role puede activarla.
--    auth.uid() es NULL bajo service_role (cliente admin.ts), por lo que el
--    trigger solo bloquea a usuarios autenticados que intenten auto-activarse.
create or replace function public.bloquear_auto_activacion_profesor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.es_profesor is distinct from old.es_profesor then
    raise exception 'La faceta de profesor solo puede ser activada por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_activacion_profesor
  before update of es_profesor on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_activacion_profesor();