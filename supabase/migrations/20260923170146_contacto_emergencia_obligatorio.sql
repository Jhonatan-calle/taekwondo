-- ============================================================
-- Migración: contacto_emergencia_obligatorio
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new contacto_emergencia_obligatorio
-- Fecha: 2026-09-23
-- Descripción:
--   El contacto de emergencia pasa a ser un dato OBLIGATORIO, con
--   dos campos separados (nombre + teléfono) y formato de teléfono
--   validado, tanto para el onboarding del staff como para el alta
--   de alumnos.
--   - `contacto_emergencia` (text, nullable) se reemplaza por
--     `contacto_emergencia_nombre` y `contacto_emergencia_telefono`
--     (NOT NULL, default '' para no romper el alta de usuarios:
--     el trigger `manejar_nuevo_usuario()` inserta solo `id`).
--   - CHECK de formato del teléfono cuando no está vacío.
--   - `alta_alumno` exige y valida ambos campos.
--   - El "no vacío" se exige en la app (`perfilCompleto`) y en el
--     RPC: la BD no puede distinguir "sin onboarding" de "completo".
-- ============================================================

-- ============================================================
-- 1. Reemplazo de la columna por nombre + teléfono
-- ============================================================
alter table public.profiles
  add column contacto_emergencia_nombre text not null default '',
  add column contacto_emergencia_telefono text not null default '';

alter table public.profiles
  drop column contacto_emergencia;

-- ============================================================
-- 2. Formato del teléfono de contacto (cuando está presente)
-- ============================================================
alter table public.profiles
  add constraint contacto_emergencia_telefono_formato
  check (contacto_emergencia_telefono = '' or contacto_emergencia_telefono ~ '^[+0-9 ()-]{6,20}$');

-- ============================================================
-- 3. alta_alumno: contacto obligatorio (nombre + teléfono)
--    Cambia la firma → se elimina la versión anterior.
-- ============================================================
drop function if exists public.alta_alumno(text, text, date, numeric, public.genero, public.grado, numeric, text, text, text);

create function public.alta_alumno(
  p_nombre_completo text,
  p_dni text,
  p_fecha_nacimiento date,
  p_peso_kg numeric,
  p_genero public.genero,
  p_grado_actual public.grado,
  p_contacto_emergencia_nombre text,
  p_contacto_emergencia_telefono text,
  p_altura_cm numeric default null,
  p_telefono text default null,
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

  -- Contacto de emergencia obligatorio: nombre + teléfono con formato.
  if p_contacto_emergencia_nombre is null
     or length(trim(p_contacto_emergencia_nombre)) < 2 then
    raise exception 'Contacto de emergencia: nombre inválido.';
  end if;

  if p_contacto_emergencia_telefono is null
     or p_contacto_emergencia_telefono !~ '^[+0-9 ()-]{6,20}$' then
    raise exception 'Contacto de emergencia: teléfono inválido.';
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
    telefono,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
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
    p_telefono,
    trim(p_contacto_emergencia_nombre),
    p_contacto_emergencia_telefono,
    p_datos_salud,
    p_grado_actual,
    auth.uid()
  );

  return v_nuevo_id;
end;
$$;

revoke execute on function public.alta_alumno(text, text, date, numeric, public.genero, public.grado, text, text, numeric, text, text) from public, anon;
grant execute on function public.alta_alumno(text, text, date, numeric, public.genero, public.grado, text, text, numeric, text, text) to authenticated;
