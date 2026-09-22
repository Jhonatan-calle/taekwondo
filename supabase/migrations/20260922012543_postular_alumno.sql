-- ============================================================
-- Migración: postular_alumno
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 7 ítem 2)
-- Generada por CLI: npx supabase migration new postular_alumno
-- Fecha: 2026-09-22
-- Descripción:
--   - RPCs para la inscripción y postulación a mesas de examen
--     (SRS §3.7): el profesor postula a sus alumnos directos.
--   - El `grado_aspirado` se calcula EN EL SERVIDOR a partir del
--     `grado_actual` real del alumno (grado inmediato superior del
--     enum `public.grado`), para que no sea falsificable desde el
--     cliente. La política de insert no podía validarlo.
--   - `derecho_examen` es el registro manual del cobro (no hay
--     pasarela: el sistema no procesa dinero, Reglas §3).
--   - Referencia: documentacion/planes/mobile-postulacion-examen.md
-- ============================================================

-- ============================================================
-- 1. RPC: postular un alumno a una mesa abierta
-- ============================================================
create or replace function public.postular_alumno(
  p_mesa_id uuid,
  p_alumno_id uuid,
  p_derecho_examen numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grado_actual public.grado;
  v_grado_aspirado public.grado;
  v_orden int;
  v_postulacion_id uuid;
begin
  -- Solo un profesor puede postular.
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.es_profesor = true
  ) then
    raise exception 'Solo un profesor puede postular alumnos.';
  end if;

  -- Solo alumnos directos del profesor.
  if not public.es_alumno_directo_de(auth.uid(), p_alumno_id) then
    raise exception 'Solo se pueden postular alumnos directos.';
  end if;

  -- La mesa debe existir y estar abierta.
  if not exists (
    select 1 from public.mesas_examen m
     where m.id = p_mesa_id and m.estado = 'abierta'
  ) then
    raise exception 'La mesa no está abierta para postulaciones.';
  end if;

  -- Grado actual real del alumno.
  select grado_actual into v_grado_actual
    from public.profiles
   where id = p_alumno_id;

  if v_grado_actual is null then
    raise exception 'El alumno no tiene grado registrado.';
  end if;

  -- Grado inmediato superior según el orden del enum.
  -- Orden canónico: blanco … rojo_punta_negra, dan_1 … dan_9.
  v_orden := array_position(
    enum_range(null::public.grado)::text[],
    v_grado_actual::text
  );

  if v_orden is null or v_orden >= array_length(enum_range(null::public.grado)::text[], 1) then
    raise exception 'El alumno ya alcanzó el grado máximo y no puede aspirar a uno superior.';
  end if;

  v_grado_aspirado := (
    enum_range(null::public.grado)::text[]
  )[v_orden + 1]::public.grado;

  if p_derecho_examen is not null and p_derecho_examen < 0 then
    raise exception 'El derecho de examen no puede ser negativo.';
  end if;

  insert into public.postulaciones_examen (
    mesa_id, alumno_id, profesor_id, grado_aspirado, derecho_examen, estado
  ) values (
    p_mesa_id, p_alumno_id, auth.uid(), v_grado_aspirado, p_derecho_examen, 'postulado'
  )
  returning id into v_postulacion_id;

  return v_postulacion_id;

exception
  when unique_violation then
    raise exception 'El alumno ya está postulado en esta mesa.';
end;
$$;

revoke execute on function public.postular_alumno(uuid, uuid, numeric) from public, anon;
grant execute on function public.postular_alumno(uuid, uuid, numeric) to authenticated;

-- ============================================================
-- 2. RPC: actualizar el derecho de examen (registro del cobro)
--    Solo el profesor postulante y con la mesa abierta.
-- ============================================================
create or replace function public.actualizar_derecho_examen(
  p_postulacion_id uuid,
  p_derecho_examen numeric
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_derecho_examen is null or p_derecho_examen < 0 then
    raise exception 'El derecho de examen no puede ser negativo.';
  end if;

  update public.postulaciones_examen po
     set derecho_examen = p_derecho_examen
   where po.id = p_postulacion_id
     and po.profesor_id = auth.uid()
     and po.estado = 'postulado'
     and exists (
       select 1 from public.mesas_examen m
        where m.id = po.mesa_id and m.estado = 'abierta'
     );

  if not found then
    raise exception 'No se puede actualizar el derecho de examen de esta postulación.';
  end if;

  return true;
end;
$$;

revoke execute on function public.actualizar_derecho_examen(uuid, numeric) from public, anon;
grant execute on function public.actualizar_derecho_examen(uuid, numeric) to authenticated;

-- ============================================================
-- 3. RPC: quitar una postulación (mientras siga "postulado")
-- ============================================================
create or replace function public.quitar_postulacion(
  p_postulacion_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.postulaciones_examen po
   where po.id = p_postulacion_id
     and po.profesor_id = auth.uid()
     and po.estado = 'postulado'
     and exists (
       select 1 from public.mesas_examen m
        where m.id = po.mesa_id and m.estado = 'abierta'
     );

  if not found then
    raise exception 'No se puede quitar esta postulación.';
  end if;

  return true;
end;
$$;

revoke execute on function public.quitar_postulacion(uuid) from public, anon;
grant execute on function public.quitar_postulacion(uuid) to authenticated;
