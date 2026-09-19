-- ============================================================
-- Migración: grado_unificado_y_perfil
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new grado_unificado_y_perfil
-- Fecha: 2026-09-19
-- Descripción:
--   - Enum unificado `public.grado` (Gup 10º→1º + Dan I→IX, SRS §3.2).
--   - Enum `public.genero` (SRS §3.1).
--   - profiles: + dni (único), + genero, + grado_actual (reemplaza
--     grado_dan_actual), + es_maestro (jerarquía de maestros).
--   - Re-cableado de gates/triggers que usaban grado_dan_actual.
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================
-- Grado unificado (SRS §3.2): Gup 10º → 1º primero, luego Dan I..IX.
-- El orden posibilita comparar `grado_actual >= 'dan_1'` (gate
-- profesor/maestro) y modela "VI Dan y rangos superiores".
create type public.grado as enum (
  'blanco',               -- 10º Gup
  'blanco_punta_amarilla',--  9º Gup
  'amarillo',             --  8º Gup
  'amarillo_punta_verde', --  7º Gup
  'verde',                --  6º Gup
  'verde_punta_azul',     --  5º Gup
  'azul',                 --  4º Gup
  'azul_punta_roja',      --  3º Gup
  'rojo',                 --  2º Gup
  'rojo_punta_negra',     --  1º Gup
  'dan_1', 'dan_2', 'dan_3', 'dan_4', 'dan_5',
  'dan_6', 'dan_7', 'dan_8', 'dan_9'
);

create type public.genero as enum ('masculino', 'femenino', 'otro');

-- ============================================================
-- 2. profiles: columnas nuevas
-- ============================================================
alter table public.profiles
  add column dni text,
  add column genero public.genero,
  add column grado_actual public.grado,
  add column es_maestro boolean not null default false;

-- DNI obligatorio a nivel app; único en BD (SRS §3.1).
create unique index profiles_dni_unique_key on public.profiles (dni);

-- ============================================================
-- 3. Migrar el Dan vigente → grado_actual (Opción B unificada)
--    Se hace antes de re-definir los objetos que lo referenciaban.
-- ============================================================
update public.profiles
   set grado_actual = grado_dan_actual::text::grado
 where grado_dan_actual is not null;

-- ============================================================
-- 4. Re-cablear objetos que usaban grado_dan_actual
-- ============================================================

-- 4a. Blindaje de grado: ahora vigila grado_actual y honra la
--     aprobación de examen del sistema (`app.aprobacion_examen`).
create or replace function public.bloquear_auto_cambio_grado()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (new.grado_actual is distinct from old.grado_actual
      or new.grados_verificados is distinct from old.grados_verificados)
     and coalesce(current_setting('app.aprobacion_examen', true), '') <> 'on'
  then
    raise exception 'El grado solo puede ser modificado por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

drop trigger if exists bloquear_auto_cambio_grado on public.profiles;
create trigger bloquear_auto_cambio_grado
  before update of grado_actual, grados_verificados on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_grado();

-- 4b. Registro interno del grado (Service Role) → forma unificada.
drop function if exists public.registrar_grado_dan_verificado(uuid, public.grado_dan);
create or replace function public.registrar_grado_verificado(
  p_perfil uuid, p_grado public.grado
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set grado_actual = p_grado, grados_verificados = true
   where id = p_perfil;
end;
$$;

revoke execute on function public.registrar_grado_verificado(uuid, public.grado) from public;
grant execute on function public.registrar_grado_verificado(uuid, public.grado) to service_role;

-- 4c. Gate de lectura: ¿alcanzó 1er Dan o superior? (gate del profesor)
create or replace function public.puede_activar_profesor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select grado_actual >= 'dan_1'::public.grado
                   from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.puede_activar_profesor() to authenticated;

-- 4d. Concesión de la faceta profesor con gate interno
create or replace function public.activar_faceta_profesor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select grado_actual >= 'dan_1'::public.grado into v_ok
    from public.profiles where id = auth.uid();
  if coalesce(v_ok, false) then
    perform set_config('app.concesion_profesor', 'on', true);
    update public.profiles set es_profesor = true where id = auth.uid();
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.activar_faceta_profesor() to authenticated;

-- 4e. Eliminar columna legacy (sin otros dependientes en BD)
alter table public.profiles drop column grado_dan_actual;

-- ============================================================
-- 5. Faceta Maestro (jerarquía SRS §2 + mesas de examen SRS §3.7)
--    Concesión centralizada solo vía Service Role (RPC).
-- ============================================================
create or replace function public.bloquear_auto_activacion_maestro()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.es_maestro is distinct from old.es_maestro
     and coalesce(current_setting('app.concesion_maestro', true), '') <> 'on'
  then
    raise exception 'La faceta de maestro solo puede ser activada por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_activacion_maestro
  before update of es_maestro on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_activacion_maestro();

create or replace function public.conceder_faceta_maestro(
  p_perfil uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.concesion_maestro', 'on', true);
  update public.profiles set es_maestro = true where id = p_perfil;
end;
$$;

revoke execute on function public.conceder_faceta_maestro(uuid) from public;
grant execute on function public.conceder_faceta_maestro(uuid) to service_role;