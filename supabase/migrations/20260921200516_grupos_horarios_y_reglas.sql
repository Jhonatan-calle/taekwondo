-- ============================================================
-- Migración: grupos_horarios_y_reglas
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4 ítem 2 · revisión v1.1)
-- Generada por CLI: supabase migration new grupos_horarios_y_reglas
-- Fecha: 2026-09-21
-- Descripción (correcciones solicitadas por el usuario):
--   1. Los horarios de un grupo dejan de ser texto libre (`grupos.horarios`
--      se elimina) y se modelan en la tabla normalizada `grupos_horarios`
--      con RLS basada en los helpers existentes `es_profesor_del_grupo`
--      (SECURITY DEFINER: rompe recursión) y gate `es_profesor` (INSERT).
--   2. `locaciones.direccion` pasa a obligatoria (NOT NULL) con backfilling
--      defensivo previo (`''` donde sea null).
--   3. Un alumno solo puede estar activo en UN grupo: índice único parcial
--      sobre `miembros_grupo(alumno_id) where estado = 'activo'`. El RPC
--      `editar_miembros_grupo` se actualiza para MOVER al alumno desde
--      cualquier otro grupo del propio profesor (delete previo al insert).
--   4. Nuevo RPC `crear_grupo_con_horarios`: crea el grupo y sus horarios
--      en una única transacción, validando día (1..7) y `hora_fin > hora_inicio`.
-- ============================================================

-- ============================================================
-- 1. Tabla normalizada de horarios con RLS (helpers existentes)
-- ============================================================
create table public.grupos_horarios (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 7),  -- 1=Lunes … 7=Domingo
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio)
);

create index grupos_horarios_grupo_idx on public.grupos_horarios (grupo_id);

alter table public.grupos_horarios enable row level security;

-- SELECT: profesor dueño del grupo (helper SECURITY DEFINER evita recursión RLS)
create policy "grupos_horarios_select_profesor"
  on public.grupos_horarios for select to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));

-- INSERT: solo profesor (`es_profesor`) y dueño del grupo
create policy "grupos_horarios_insert_profesor"
  on public.grupos_horarios for insert to authenticated
  with check (
    public.es_profesor_del_grupo(grupo_id, auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.es_profesor = true
    )
  );

-- UPDATE / DELETE: solo profesor dueño del grupo
create policy "grupos_horarios_update_profesor"
  on public.grupos_horarios for update to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()))
  with check (public.es_profesor_del_grupo(grupo_id, auth.uid()));

create policy "grupos_horarios_delete_profesor"
  on public.grupos_horarios for delete to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));

-- ============================================================
-- 2. Se elimina el texto libre de horarios de `grupos`
-- ============================================================
alter table public.grupos drop column horarios;

-- ============================================================
-- 3. `locaciones.direccion` obligatoria (backfill defensivo primero)
-- ============================================================
update public.locaciones set direccion = '' where direccion is null;

alter table public.locaciones alter column direccion set not null;

-- ============================================================
-- 4. Un alumno activo en UN solo grupo (índice único parcial)
-- ============================================================
create unique index miembros_grupo_un_grupo_activo_idx
  on public.miembros_grupo (alumno_id)
  where estado = 'activo';

-- ============================================================
-- 5. RPC crear_grupo_con_horarios (transacción única + validaciones)
--    Valida día 1..7 y hora_fin > hora_inicio por cada slot ANTES de
--    insertar. Retorna el id del grupo para navegar al detalle.
-- ============================================================
create or replace function public.crear_grupo_con_horarios(
  p_nombre text,
  p_locacion_id uuid,
  p_horarios jsonb               -- [{dia_semana, hora_inicio, hora_fin}, …]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_dia int;
  v_h_inicio time;
  v_h_fin time;
  v_elem jsonb;
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.es_profesor = true
  ) then
    raise exception 'Solo un profesor puede crear grupos.';
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

  insert into public.grupos (profesor_id, nombre, locacion_id)
  values (auth.uid(), trim(p_nombre), p_locacion_id)
  returning id into v_grupo_id;

  insert into public.grupos_horarios (grupo_id, dia_semana, hora_inicio, hora_fin)
  select v_grupo_id,
         (e->>'dia_semana')::int,
         (e->>'hora_inicio')::time,
         (e->>'hora_fin')::time
    from jsonb_array_elements(p_horarios) e;

  return v_grupo_id;
end;
$$;

revoke execute on function public.crear_grupo_con_horarios(text, uuid, jsonb) from public, anon;
grant execute on function public.crear_grupo_con_horarios(text, uuid, jsonb) to authenticated;

-- ============================================================
-- 6. Actualización RPC editar_miembros_grupo
--    MUEVE al alumno: lo saca de cualquier otro grupo activo del
--    propio profesor antes de insertarlo en el destino. El índice
--    único parcial garantiza una única membresía activa por alumno.
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

  -- Mover: saca a los alumnos de otros grupos activos del MISMO profesor
  delete from public.miembros_grupo mg
   using public.grupos g
   where mg.grupo_id = g.id
     and g.profesor_id = auth.uid()
     and mg.alumno_id = any(coalesce(p_alumno_ids, '{}'::uuid[]))
     and mg.grupo_id <> p_grupo_id;

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