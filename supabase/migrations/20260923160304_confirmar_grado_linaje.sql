-- ============================================================
-- Migración: confirmar_grado_linaje
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new confirmar_grado_linaje
-- Fecha: 2026-09-23
-- Descripción:
--   Confirmación del cinturón al aceptar el linaje (nuevo profesor):
--   - El solicitante declara su grado (obligatorio dan_1+) al pedir
--     el linaje; queda como SNAPSHOT en `solicitudes_linaje`.
--   - El superior (instructor/maestro) que acepta CONFIRMA o AJUSTA
--     ese grado (siempre dan_1+) y el sistema, en el mismo acto:
--       · persiste `maestro_id`;
--       · fija `grado_actual = <grado confirmado>` y
--         `grados_verificados = true`;
--       · activa `es_profesor = true`.
--   - `es_maestro` NO se toca desde la app (solo Service Role).
--   - Escrituras SOLO vía RPC SECURITY DEFINER con los flags que
--     honran los triggers anti-escalada
--     (`app.derivacion_linaje`, `app.aprobacion_examen`,
--      `app.concesion_profesor`).
-- ============================================================

-- ============================================================
-- 1. Snapshot del grado declarado por el solicitante
-- ============================================================
alter table public.solicitudes_linaje
  add column grado_solicitado public.grado;

-- ============================================================
-- 2. RPC: el alumno solicita el linaje declarando su grado
--    (dan_1 en adelante). Reemplaza la firma de 1 argumento.
-- ============================================================
drop function if exists public.solicitar_linaje(uuid);

create or replace function public.solicitar_linaje(
  p_instructor uuid, p_grado public.grado
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

  -- El instructor debe ser profesor o maestro y estar visible.
  select (pr.es_profesor or pr.es_maestro) and pr.nombre_completo <> ''
    into v_instructor_ok
    from public.profiles pr where pr.id = p_instructor;

  if coalesce(v_instructor_ok, false) is false then
    raise exception 'Instructor inválido.';
  end if;

  -- Reutilizar una solicitud previa del mismo par (unique) o crear una nueva.
  select s.id into v_solicitud_id
    from public.solicitudes_linaje s
   where s.alumno_id = auth.uid() and s.instructor_id = p_instructor;

  if v_solicitud_id is null then
    insert into public.solicitudes_linaje (alumno_id, instructor_id, nombre_alumno, grado_solicitado)
    select pr.id, p_instructor, pr.nombre_completo, p_grado
      from public.profiles pr where pr.id = auth.uid();
    return true;
  end if;

  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'pendiente'
  ) then
    -- Si el solicitante cambió el grado declarado, se actualiza el snapshot.
    update public.solicitudes_linaje
       set grado_solicitado = p_grado
     where id = v_solicitud_id;
    return true;
  end if;

  -- Restos: aceptada o rechazada previa.
  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'aceptada'
  ) then
    return false;
  end if;

  -- Solicitud previamente rechazada: reabrirla con el grado declarado.
  update public.solicitudes_linaje
     set estado = 'pendiente', resuelto_en = null, creado_en = now(),
         grado_solicitado = p_grado
   where id = v_solicitud_id;
  return true;
end;
$$;

revoke execute on function public.solicitar_linaje(uuid, public.grado) from public, anon;
grant execute on function public.solicitar_linaje(uuid, public.grado) to authenticated;

-- ============================================================
-- 3. RPC: el instructor acepta/rechaza y CONFIRMA el cinturón.
--    Al aceptar, `p_grado` (o el declarado si viene nulo, siempre
--    dan_1+) se persiste como grado verificado y se activa la
--    faceta de profesor.
-- ============================================================
drop function if exists public.resolver_solicitud_linaje(uuid, text);

create or replace function public.resolver_solicitud_linaje(
  p_solicitud uuid, p_resultado text, p_grado public.grado default null
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
  v_grado public.grado;
begin
  select instructor_id, alumno_id, estado, grado_solicitado
    into v_instructor, v_alumno, v_estado, v_grado_solicitado
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

    perform set_config('app.derivacion_linaje', 'on', true);
    perform set_config('app.aprobacion_examen', 'on', true);
    perform set_config('app.concesion_profesor', 'on', true);

    update public.profiles
       set maestro_id = v_instructor,
           grado_actual = v_grado,
           grados_verificados = true,
           es_profesor = true
     where id = v_alumno and maestro_id is null;
  end if;

  update public.solicitudes_linaje
     set estado = p_resultado, resuelto_en = now()
   where id = p_solicitud;

  return true;
end;
$$;

revoke execute on function public.resolver_solicitud_linaje(uuid, text, public.grado) from public, anon;
grant execute on function public.resolver_solicitud_linaje(uuid, text, public.grado) to authenticated;
