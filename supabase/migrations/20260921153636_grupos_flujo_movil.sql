-- ============================================================
-- Migración: grupos_flujo_movil
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4 ítem 2)
-- Generada por CLI: supabase migration new grupos_flujo_movil
-- Fecha: 2026-09-21
-- Descripción:
--   - Creación de grupos y horarios desde la app móvil.
--   - `grupos.codigo_invitacion` pasa a nullable: el flujo móvil v1
--     asigna a los alumnos directos sin código de invitación; la
--     columna queda para uso futuro (Postgres permite múltiples NULL
--     en la constraint UNIQUE vigente).
--   - RPC editar_miembros_grupo: el profesor reemplaza el conjunto de
--     miembros de uno de sus grupos (estado 'activo'), validando que
--     cada alumno sea alumno directo suyo. Atómico: borra los que
--     salieron e inserta los nuevos en una sola transacción.
-- ============================================================

alter table public.grupos
  alter column codigo_invitacion drop not null;

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

  delete from public.miembros_grupo
   where grupo_id = p_grupo_id
     and (p_alumno_ids is null
          or alumno_id <> all (p_alumno_ids));

  insert into public.miembros_grupo (grupo_id, alumno_id, estado)
  select p_grupo_id, a, 'activo'
    from unnest(coalesce(p_alumno_ids, '{}'::uuid[])) as a
   on conflict (grupo_id, alumno_id) do nothing;

  return true;
end;
$$;

revoke execute on function public.editar_miembros_grupo(uuid, uuid[]) from public, anon;
grant execute on function public.editar_miembros_grupo(uuid, uuid[]) to authenticated;