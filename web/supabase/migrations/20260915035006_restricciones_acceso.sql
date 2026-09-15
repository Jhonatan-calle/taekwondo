-- ============================================================
-- Migración: restricciones_acceso
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new restricciones_acceso
-- Fecha: 2026-09-15
-- Descripción: Gate de 1er Dan verificado para la faceta Profesor
--   (SRS §2). Columna solo-sistema grado_dan_actual + concesión
--   centralizada en RPC activar_faceta_profesor(). El bypass por
--   INVITE_CODE sigue intacto (escritura directa de Service Role).
-- ============================================================

-- ============================================================
-- Parte 1: estado del Dan vigente verificado (D-1a)
-- ============================================================

-- 1. Dan vigente verificado (solo-sistema). Su presencia habilita la
--    faceta profesor. grados_verificados queda como flag complementario.
alter table public.profiles
  add column grado_dan_actual public.grado_dan;

-- 2. Blindaje: el usuario autenticado no se auto-edita el grado ni la
--    verificación. auth.uid() es NULL bajo service_role (escritura interna
--    permitida).
create or replace function public.bloquear_auto_cambio_grado()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.grado_dan_actual is distinct from old.grado_dan_actual
     or new.grados_verificados is distinct from old.grados_verificados
  then
    raise exception 'El grado solo puede ser modificado por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_cambio_grado
  before update of grado_dan_actual, grados_verificados on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_grado();

-- 3. Registro interno del grado (solo Service Role / futura acción del Sinodal)
create or replace function public.registrar_grado_dan_verificado(
  p_perfil uuid, p_grado public.grado_dan
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set grado_dan_actual = p_grado, grados_verificados = true
   where id = p_perfil;
end;
$$;

revoke execute on function public.registrar_grado_dan_verificado(uuid, public.grado_dan) from public;
grant execute on function public.registrar_grado_dan_verificado(uuid, public.grado_dan) to service_role;

-- 4. Gate de lectura: ¿este usuario (auth.uid()) ya puede ser profesor?
--    STABLE para optimizar. Requiere sesión autenticada (auth.uid() no NULL).
create or replace function public.puede_activar_profesor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select grado_dan_actual is not null
                   from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.puede_activar_profesor() to authenticated;

-- ============================================================
-- Parte 2: concesión centralizada de la faceta (D-2a)
-- ============================================================

-- 5. Concesión con gate interno (usa auth.uid(): requiere sesión autenticada).
--    Si el gate pasa, marca la excepción de configuración para que el trigger
--    anti-escalada honre esta escritura interna del sistema.
create or replace function public.activar_faceta_profesor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select grado_dan_actual is not null into v_ok
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

-- 6. Ampliar el trigger anti-escalada de roles_duales para honrar la
--    concesión del sistema (set_config 'app.concesion_profesor').
create or replace function public.bloquear_auto_activacion_profesor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.es_profesor is distinct from old.es_profesor
     and coalesce(current_setting('app.concesion_profesor', true), '') <> 'on'
  then
    raise exception 'La faceta de profesor solo puede ser activada por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;