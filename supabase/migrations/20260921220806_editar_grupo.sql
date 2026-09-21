-- ============================================================
-- Migración: editar_grupo
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4/5)
-- Generada por CLI: npx supabase migration new editar_grupo
-- Fecha: 2026-09-21
-- Descripción:
--   - RPC `editar_grupo`: permite al profesor dueño editar nombre,
--     locación y horarios de un grupo existente, en una transacción.
--     Sin esto, un grupo creado con la locación equivocada quedaba
--     inmutable desde la app.
--   - RPC `eliminar_locacion_segura`: bloquea el borrado de una
--     locación que todavía tiene grupos asociados, evitando que los
--     grupos queden huérfanos ("Sin locación") de forma silenciosa.
--   - La FK `grupos.locacion_id on delete set null` se mantiene como
--     red de seguridad a nivel de esquema: un grupo nunca se borra en
--     cascada al eliminar una locación.
--   - Referencia: documentacion/planes/mobile-editar-grupo-locacion.md
-- ============================================================

-- ============================================================
-- 1. RPC editar_grupo
--    Reutiliza las validaciones de `crear_grupo_con_horarios`.
-- ============================================================
create or replace function public.editar_grupo(
  p_grupo_id uuid,
  p_nombre text,
  p_locacion_id uuid default null,
  p_horarios jsonb default '[]'::jsonb  -- [{dia_semana, hora_inicio, hora_fin}, …]
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profesor uuid;
  v_dia int;
  v_h_inicio time;
  v_h_fin time;
  v_elem jsonb;
begin
  select profesor_id into v_profesor
    from public.grupos
   where id = p_grupo_id;

  if v_profesor is null or v_profesor <> auth.uid() then
    raise exception 'No autorizado para este grupo.';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.es_profesor = true
  ) then
    raise exception 'Solo un profesor puede editar grupos.';
  end if;

  if trim(coalesce(p_nombre, '')) = '' then
    raise exception 'El nombre del grupo es obligatorio.';
  end if;

  if p_locacion_id is not null and not exists (
    select 1 from public.locaciones l
     where l.id = p_locacion_id and l.creado_por = auth.uid()
  ) then
    raise exception 'Locación no válida para este profesor.';
  end if;

  if p_horarios is null or not jsonb_typeof(p_horarios) = 'array'
     or jsonb_array_length(p_horarios) = 0 then
    raise exception 'Indicá al menos un horario de clase.';
  end if;

  for v_elem in select * from jsonb_array_elements(p_horarios)
  loop
    v_dia := (v_elem->>'dia_semana')::int;
    v_h_inicio := (v_elem->>'hora_inicio')::time;
    v_h_fin := (v_elem->>'hora_fin')::time;

    if v_dia not between 1 and 7 then
      raise exception 'Día de horario inválido (1..7).';
    end if;
    if v_h_inicio is null or v_h_fin is null or v_h_fin <= v_h_inicio then
      raise exception 'Horario inválido; la hora de fin debe ser posterior al inicio.';
    end if;
  end loop;

  update public.grupos
     set nombre = trim(p_nombre),
         locacion_id = p_locacion_id
   where id = p_grupo_id;

  delete from public.grupos_horarios where grupo_id = p_grupo_id;

  insert into public.grupos_horarios (grupo_id, dia_semana, hora_inicio, hora_fin)
  select p_grupo_id,
         (e->>'dia_semana')::int,
         (e->>'hora_inicio')::time,
         (e->>'hora_fin')::time
    from jsonb_array_elements(p_horarios) e;

  return true;
end;
$$;

revoke execute on function public.editar_grupo(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.editar_grupo(uuid, text, uuid, jsonb) to authenticated;

-- ============================================================
-- 2. RPC eliminar_locacion_segura
--    Bloquea el borrado si la locación todavía tiene grupos.
-- ============================================================
create or replace function public.eliminar_locacion_segura(
  p_locacion_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.locaciones l
     where l.id = p_locacion_id and l.creado_por = auth.uid()
  ) then
    raise exception 'No autorizado para esta locación.';
  end if;

  if exists (
    select 1 from public.grupos g where g.locacion_id = p_locacion_id
  ) then
    raise exception 'La locación tiene grupos asociados.';
  end if;

  delete from public.locaciones where id = p_locacion_id;

  return true;
end;
$$;

revoke execute on function public.eliminar_locacion_segura(uuid) from public, anon;
grant execute on function public.eliminar_locacion_segura(uuid) to authenticated;
