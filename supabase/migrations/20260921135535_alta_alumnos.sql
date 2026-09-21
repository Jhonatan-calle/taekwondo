-- Alta de alumnos sin cuenta de usuario (Fase 4, ítem 1).
-- Los alumnos regulares dejan de ser usuarios: la ficha la crea el profesor.
-- 1) Se elimina la FK de profiles.id a auth.users para poder insertar alumnos
--    sin cuenta. Los perfiles con cuenta existentes siguen intactos.
-- 2) RPC SECURITY DEFINER alta_alumno: valida que el llamador sea profesor
--    (bandera es_profesor) y los datos, y fija maestro_id al profesor.

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

create or replace function public.alta_alumno(
  p_nombre_completo text,
  p_dni text,
  p_fecha_nacimiento date,
  p_peso_kg numeric,
  p_genero public.genero,
  p_grado_actual public.grado,
  p_altura_cm numeric default null,
  p_contacto_emergencia text default null,
  p_datos_salud text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_profesor boolean;
  v_nuevo_id uuid;
begin
  select es_profesor into v_es_profesor
    from public.profiles
   where id = auth.uid();

  if coalesce(v_es_profesor, false) <> true then
    raise exception 'Solo un profesor puede dar de alta alumnos.';
  end if;

  if length(trim(p_nombre_completo)) = 0 then
    raise exception 'Nombre incompleto.';
  end if;

  if p_dni is null or p_dni !~ '^[0-9]{7,8}$' then
    raise exception 'DNI inválido.';
  end if;

  if exists (select 1 from public.profiles where dni = p_dni) then
    raise exception 'El DNI ya está registrado.';
  end if;

  if p_fecha_nacimiento is null or p_fecha_nacimiento > current_date then
    raise exception 'Fecha de nacimiento inválida.';
  end if;

  if p_peso_kg is null or p_peso_kg <= 0 then
    raise exception 'Peso inválido.';
  end if;

  if p_genero is null then
    raise exception 'Género inválido.';
  end if;

  if p_grado_actual is null then
    raise exception 'Grado inválido.';
  end if;

  if p_altura_cm is not null and (p_altura_cm < 50 or p_altura_cm > 230) then
    raise exception 'Altura inválida.';
  end if;

  v_nuevo_id := gen_random_uuid();

  insert into public.profiles (
    id,
    nombre_completo,
    dni,
    fecha_nacimiento,
    peso_kg,
    genero,
    altura_cm,
    contacto_emergencia,
    datos_salud,
    grado_actual,
    maestro_id
  ) values (
    v_nuevo_id,
    trim(p_nombre_completo),
    p_dni,
    p_fecha_nacimiento,
    p_peso_kg,
    p_genero,
    p_altura_cm,
    p_contacto_emergencia,
    p_datos_salud,
    p_grado_actual,
    auth.uid()
  );

  return v_nuevo_id;
end;
$$;

revoke execute on function public.alta_alumno(text, text, date, numeric, public.genero, public.grado, numeric, text, text) from public, anon;
grant execute on function public.alta_alumno(text, text, date, numeric, public.genero, public.grado, numeric, text, text) to authenticated;