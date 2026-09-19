-- ============================================================
-- Migración: arbol_jerarquias
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new arbol_jerarquias
-- Fecha: 2026-09-15
-- Descripción: Linaje del Árbol de Poder (SRS §5). Habilita las
--   relaciones grupos/miembros_grupo con RLS propia y blinda el
--   maestro ascendente (profiles.maestro_id): derivación automática
--   con la 1ª aprobación de grupo y reasignación solo vía Service Role.
-- ============================================================

-- 1. Índice para joins/consultas del maestro directo y futuro linaje
create index profiles_maestro_id_idx on public.profiles (maestro_id);

-- 2. No auto-maestro (evita maestro_id = id)
alter table public.profiles
  add constraint profiles_no_auto_maestro check (maestro_id is null or maestro_id <> id);

-- 3. Blindaje: solo el sistema escribe maestro_id.
--    El trigger de derivación usa set_config('app.derivacion_linaje','on',true);
--    auth.uid() es NULL bajo service_role (reasignación manual permitida).
create or replace function public.bloquear_auto_cambio_maestro()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.maestro_id is distinct from old.maestro_id
     and coalesce(current_setting('app.derivacion_linaje', true), '') <> 'on'
  then
    raise exception 'El maestro ascendente solo puede ser modificado por el sistema (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_cambio_maestro
  before update of maestro_id on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_maestro();

-- 4. Derivación automática: al aprobarse la membresía de un grupo, el alumno
--    hereda el linaje del profesor (solo si aún no tiene maestro).
--    Transición exacta: INSERT con estado activo o paso DE un estado distinto
--    de 'activo' A 'activo'. SECURITY DEFINER: corre como postgres (sin RLS).
create or replace function public.vincular_linaje_al_aprobar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profesor uuid;
begin
  if new.estado = 'activo' and (TG_OP = 'INSERT' or old.estado <> 'activo') then
    select g.profesor_id into v_profesor
      from public.grupos g where g.id = new.grupo_id;
    if v_profesor is not null and v_profesor <> new.alumno_id then
      perform set_config('app.derivacion_linaje', 'on', true);
      update public.profiles
         set maestro_id = v_profesor
       where id = new.alumno_id and maestro_id is null;
    end if;
  end if;
  return new;
end;
$$;

create trigger vincular_linaje_al_aprobar
  after insert or update of estado on public.miembros_grupo
  for each row
  execute function public.vincular_linaje_al_aprobar();

-- 5. RLS grupos: dueño (profesor) + miembros (alumnos aprobados/solicitantes)
create policy "grupos_select_profesor" on public.grupos
  for select to authenticated using (profesor_id = auth.uid());

create policy "grupos_select_miembro" on public.grupos
  for select to authenticated
  using (auth.uid() in (select mg.alumno_id from public.miembros_grupo mg where mg.grupo_id = id));

create policy "grupos_insert_profesor" on public.grupos
  for insert to authenticated
  with check (
    auth.uid() = profesor_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.es_profesor = true)
  );

create policy "grupos_update_profesor" on public.grupos
  for update to authenticated
  using (profesor_id = auth.uid())
  with check (profesor_id = auth.uid());

create policy "grupos_delete_profesor" on public.grupos
  for delete to authenticated
  using (profesor_id = auth.uid());

-- 6. RLS miembros_grupo: alumno solo a sí mismo; profesor a su grupo.
--    INSERT solo con estado pendiente (el alumno no puede auto-activarse).
create policy "miembros_select_alumno" on public.miembros_grupo
  for select to authenticated using (auth.uid() = alumno_id);

create policy "miembros_select_profesor" on public.miembros_grupo
  for select to authenticated
  using (auth.uid() in (select g.profesor_id from public.grupos g where g.id = grupo_id));

create policy "miembros_insert_pendiente" on public.miembros_grupo
  for insert to authenticated
  with check (auth.uid() = alumno_id and estado = 'pendiente_aprobacion');

create policy "miembros_update_profesor" on public.miembros_grupo
  for update to authenticated
  using (auth.uid() in (select g.profesor_id from public.grupos g where g.id = grupo_id))
  with check (auth.uid() in (select g.profesor_id from public.grupos g where g.id = grupo_id));

create policy "miembros_delete_alumno" on public.miembros_grupo
  for delete to authenticated using (auth.uid() = alumno_id);

create policy "miembros_delete_profesor" on public.miembros_grupo
  for delete to authenticated
  using (auth.uid() in (select g.profesor_id from public.grupos g where g.id = grupo_id));