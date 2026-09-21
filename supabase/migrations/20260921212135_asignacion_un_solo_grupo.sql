-- ============================================================
-- Migración: asignacion_un_solo_grupo
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4 ítem 2)
-- Generada por CLI: npx supabase migration new asignacion_un_solo_grupo
-- Fecha: 2026-09-21
-- Descripción:
--   - Un alumno asignado a un grupo NO puede agregarse a otro grupo.
--   - Se REEMPLAZA la semántica introducida en la migración
--     `grupos_horarios_y_reglas` (v1.1 del plan mobile-grupos-horarios):
--     antes `editar_miembros_grupo` MOVÍA al alumno entre grupos del
--     mismo profesor; ahora RECHAZA la operación con una excepción
--     si algún alumno ya tiene una membresía activa en otro grupo.
--   - El índice único parcial `miembros_grupo_un_grupo_activo_idx`
--     sigue garantizando que nunca existan dos membresías activas
--     para el mismo alumno.
--   - La baja de un alumno del grupo actual se mantiene: desmarcarlo
--     y guardar lo elimina de la lista de miembros de este grupo.
--   - Referencia: documentacion/planes/mobile-asignacion-alumno-un-grupo.md
-- ============================================================

create or replace function public.editar_miembros_grupo(
  p_grupo_id uuid,
  p_alumno_ids uuid[]
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profesor uuid;
  v_es_profesor boolean;
  v_alumno uuid;
begin
  select profesor_id into v_profesor
    from public.grupos
   where id = p_grupo_id;

  if v_profesor is null or v_profesor <> auth.uid() then
    raise exception 'No autorizado para este grupo.';
  end if;

  select es_profesor into v_es_profesor
    from public.profiles
   where id = auth.uid();

  if coalesce(v_es_profesor, false) <> true then
    raise exception 'Solo un profesor puede administrar miembros del grupo.';
  end if;

  if p_alumno_ids is not null then
    foreach v_alumno in array p_alumno_ids loop
      if not public.es_alumno_directo_de(auth.uid(), v_alumno) then
        raise exception 'Solo se pueden asignar alumnos directos.';
      end if;
    end loop;
  end if;

  -- Un alumno solo puede pertenecer a un grupo: si ya está activo en
  -- otro grupo, se rechaza la asignación (no se lo mueve).
  if exists (
    select 1
      from public.miembros_grupo mg
     where mg.alumno_id = any (coalesce(p_alumno_ids, '{}'::uuid[]))
       and mg.estado = 'activo'
       and mg.grupo_id <> p_grupo_id
  ) then
    raise exception 'Uno o más alumnos ya pertenecen a otro grupo.';
  end if;

  -- Baja de los alumnos desmarcados de este grupo.
  delete from public.miembros_grupo
   where grupo_id = p_grupo_id
     and (p_alumno_ids is null
          or alumno_id <> all (p_alumno_ids));

  -- Alta de los alumnos marcados en este grupo.
  insert into public.miembros_grupo (grupo_id, alumno_id, estado)
  select p_grupo_id, a, 'activo'
    from unnest(coalesce(p_alumno_ids, '{}'::uuid[])) as a
   on conflict (grupo_id, alumno_id) do nothing;

  return true;
end;
$$;

revoke execute on function public.editar_miembros_grupo(uuid, uuid[]) from public, anon;
grant execute on function public.editar_miembros_grupo(uuid, uuid[]) to authenticated;
