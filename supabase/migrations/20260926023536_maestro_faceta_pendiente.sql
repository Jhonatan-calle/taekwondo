-- ============================================================
-- Migración: maestro_faceta_pendiente
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new maestro_faceta_pendiente
-- Fecha: 2026-09-26
-- Descripción:
--   1. `profiles.hijos_maestros`: cantidad de hijos DIRECTOS que también
--      son maestros (`maestro_id = id` y `es_maestro = true`), mantenida
--      por trigger.
--   2. Faceta de Maestro PENDIENTE: el nuevo usuario declara "soy maestro"
--      al solicitar el linaje (`solicitudes_linaje.solicita_maestro`); NO
--      se activa nada. Al aceptar, el superior decide:
--        - aceptar como profesor corriente (es_maestro queda false), o
--        - aceptar confirmando la faceta de Maestro (es_maestro = true).
--   3. `lista_instructores_linaje()` devuelve SOLO cuentas `es_maestro`.
--   - Referencia: documentacion/planes/mobile-maestro-faceta-pendiente.md
-- ============================================================

-- ============================================================
-- 1. Conteo de hijos directos que son maestros
-- ============================================================
alter table public.profiles
  add column hijos_maestros int not null default 0;

-- Backfill del conteo actual (antes de crear el trigger).
update public.profiles p
   set hijos_maestros = (
     select count(*)::int
       from public.profiles c
      where c.maestro_id = p.id and c.es_maestro = true
   );

create or replace function public.recalcular_hijos_maestros()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Solo recalcula si cambió algo relevante (evita recursión al tocar
  -- `hijos_maestros` en el update de abajo).
  if tg_op = 'UPDATE'
     and new.maestro_id is not distinct from old.maestro_id
     and new.es_maestro is not distinct from old.es_maestro then
    return null;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.profiles p
       set hijos_maestros = (
         select count(*)::int
           from public.profiles c
          where c.maestro_id = p.id and c.es_maestro = true
       )
     where p.id = new.maestro_id;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    update public.profiles p
       set hijos_maestros = (
         select count(*)::int
           from public.profiles c
          where c.maestro_id = p.id and c.es_maestro = true
       )
     where p.id = old.maestro_id;
  end if;

  return null;
end;
$$;

drop trigger if exists recalcular_hijos_maestros on public.profiles;
create trigger recalcular_hijos_maestros
  after insert or update or delete on public.profiles
  for each row
  execute function public.recalcular_hijos_maestros();

-- ============================================================
-- 2. Declaración "soy maestro" en la solicitud de linaje
-- ============================================================
alter table public.solicitudes_linaje
  add column solicita_maestro boolean not null default false;

-- ============================================================
-- 3. RPC: solicitar linaje (agrega la declaración de maestro)
-- ============================================================
drop function if exists public.solicitar_linaje(uuid, public.grado);

create or replace function public.solicitar_linaje(
  p_instructor uuid, p_grado public.grado, p_solicita_maestro boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_maestro boolean;
  v_ya_tiene_maestro boolean;
  v_instructor_ok boolean;
  v_solicitud_id uuid;
begin
  -- El cinturón declarado debe ser primer Dan o superior.
  if p_grado is null or p_grado < 'dan_1'::public.grado then
    raise exception 'El grado debe ser primer Dan o superior.';
  end if;

  select es_maestro, maestro_id is not null
    into v_es_maestro, v_ya_tiene_maestro
    from public.profiles where id = auth.uid();

  if v_es_maestro is null then
    raise exception 'Perfil no encontrado.';
  end if;

  -- Un Maestro raíz no establece un superior desde la app.
  if v_es_maestro then
    raise exception 'El linaje de un Maestro se define vía Service Role.';
  end if;

  if v_ya_tiene_maestro then
    raise exception 'Tu linaje ya fue establecido.';
  end if;

  if p_instructor is null or p_instructor = auth.uid() then
    raise exception 'Instructor inválido.';
  end if;

  -- El maestro elegido debe ser una cuenta Maestro y estar visible.
  select (pr.es_maestro = true) and pr.nombre_completo <> ''
    into v_instructor_ok
    from public.profiles pr where pr.id = p_instructor;

  if coalesce(v_instructor_ok, false) is false then
    raise exception 'Maestro inválido.';
  end if;

  -- Reutilizar una solicitud previa del mismo par (unique) o crear una nueva.
  select s.id into v_solicitud_id
    from public.solicitudes_linaje s
   where s.alumno_id = auth.uid() and s.instructor_id = p_instructor;

  if v_solicitud_id is null then
    insert into public.solicitudes_linaje (
      alumno_id, instructor_id, nombre_alumno, grado_solicitado, solicita_maestro
    )
    select pr.id, p_instructor, pr.nombre_completo, p_grado, coalesce(p_solicita_maestro, false)
      from public.profiles pr where pr.id = auth.uid();
    return true;
  end if;

  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'pendiente'
  ) then
    update public.solicitudes_linaje
       set grado_solicitado = p_grado,
           solicita_maestro = coalesce(p_solicita_maestro, false)
     where id = v_solicitud_id;
    return true;
  end if;

  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'aceptada'
  ) then
    return false;
  end if;

  -- Solicitud previamente rechazada: reabrirla con el grado declarado.
  update public.solicitudes_linaje
     set estado = 'pendiente', resuelto_en = null, creado_en = now(),
         grado_solicitado = p_grado,
         solicita_maestro = coalesce(p_solicita_maestro, false)
   where id = v_solicitud_id;
  return true;
end;
$$;

revoke execute on function public.solicitar_linaje(uuid, public.grado, boolean) from public, anon;
grant execute on function public.solicitar_linaje(uuid, public.grado, boolean) to authenticated;

-- ============================================================
-- 4. RPC: resolver la solicitud (confirma cinturón + decide la faceta)
-- ============================================================
drop function if exists public.resolver_solicitud_linaje(uuid, text, public.grado);

create or replace function public.resolver_solicitud_linaje(
  p_solicitud uuid,
  p_resultado text,
  p_grado public.grado default null,
  p_conceder_maestro boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instructor uuid;
  v_alumno uuid;
  v_estado text;
  v_grado_solicitado public.grado;
  v_solicita_maestro boolean;
  v_grado public.grado;
  v_conceder boolean;
begin
  select instructor_id, alumno_id, estado, grado_solicitado, solicita_maestro
    into v_instructor, v_alumno, v_estado, v_grado_solicitado, v_solicita_maestro
    from public.solicitudes_linaje where id = p_solicitud;

  if v_instructor is null then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_instructor <> auth.uid() then
    raise exception 'No está autorizado a resolver esta solicitud.';
  end if;

  if v_estado <> 'pendiente' then
    return false; -- ya resuelta
  end if;

  if p_resultado not in ('aceptada', 'rechazada') then
    raise exception 'Resultado inválido.';
  end if;

  if p_resultado = 'aceptada' then
    v_grado := coalesce(p_grado, v_grado_solicitado);
    if v_grado is null or v_grado < 'dan_1'::public.grado then
      raise exception 'El grado confirmado debe ser primer Dan o superior.';
    end if;

    -- Solo se concede la faceta de Maestro si el solicitante la declaró
    -- y el superior la confirmó.
    v_conceder := coalesce(v_solicita_maestro, false) and coalesce(p_conceder_maestro, false);

    perform set_config('app.derivacion_linaje', 'on', true);
    perform set_config('app.aprobacion_examen', 'on', true);
    perform set_config('app.concesion_profesor', 'on', true);
    perform set_config('app.concesion_maestro', 'on', true);

    update public.profiles
       set maestro_id = v_instructor,
           grado_actual = v_grado,
           grados_verificados = true,
           es_profesor = true,
           es_maestro = v_conceder
     where id = v_alumno and maestro_id is null;
  end if;

  update public.solicitudes_linaje
     set estado = p_resultado, resuelto_en = now()
   where id = p_solicitud;

  return true;
end;
$$;

revoke execute on function public.resolver_solicitud_linaje(uuid, text, public.grado, boolean) from public, anon;
grant execute on function public.resolver_solicitud_linaje(uuid, text, public.grado, boolean) to authenticated;

-- ============================================================
-- 5. Listado de maestros para elegir linaje (solo es_maestro)
-- ============================================================
create or replace function public.lista_instructores_linaje()
returns table (
  id uuid,
  nombre_completo text,
  grado_actual public.grado,
  es_profesor boolean,
  es_maestro boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nombre_completo, p.grado_actual, p.es_profesor, p.es_maestro
    from public.profiles p
   where p.es_maestro = true
     and p.nombre_completo <> ''
     and p.id <> auth.uid()
   order by p.nombre_completo;
$$;

revoke execute on function public.lista_instructores_linaje() from public, anon;
grant execute on function public.lista_instructores_linaje() to authenticated;
