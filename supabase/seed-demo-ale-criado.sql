-- ============================================================
-- Seed: demo "Ale Criado" (árbol de no-añadir-a-git.txt)
-- Proyecto: Taekwondo ITF
-- Fecha: 2026-09-24
-- Descripción:
--   Árbol:
--     Nico Saez                [MAESTRO]  dan_7  (sin login)   ← raíz
--     └── Ale criado           [MAESTRO]  dan_5  alecriado@taekwondo.test
--         ├── Lucas Pérez      [alumno]   blanco
--         ├── Sofía Gómez      [alumno]   amarillo
--         ├── Mateo Fernández  [alumno]   verde
--         ├── Teresita         [MAESTRO]  dan_5  (sin login)
--         └── Andres           [MAESTRO]  dan_4  andres@taekwondo.test
--             ├── Ian          [PROFESOR] dan_2  (sin login)
--             ├── mechas       [PROFESOR] dan_2  (sin login)
--             ├── Martí        [PROFESOR] dan_1  marti@taekwondo.test
--             ├── Valentina Ruiz [alumno] azul
--             ├── Benjamín Sosa  [alumno] rojo
--             └── Camila Díaz    [alumno] dan_1
--
--   - Las cuentas de login se crean por Admin API (no aquí).
--   - ADITIVO/IDEMPOTENTE por clave natural (dni / email).
--   - Referencia: documentacion/planes/db-seed-demo-ale-criado.md
--   Ejecutar con: npx supabase db query --linked -f supabase/seed-demo-ale-criado.sql
-- ============================================================

select set_config('app.concesion_profesor', 'on', true);
select set_config('app.concesion_maestro', 'on', true);
select set_config('app.derivacion_linaje', 'on', true);

do $$
declare
  v_nico uuid;
  v_ale uuid;
  v_andres uuid;
  v_marti uuid;
  v_teresita uuid;
  v_ian uuid;
  v_mechas uuid;
begin
  select id into v_ale    from auth.users where email = 'alecriado@taekwondo.test';
  select id into v_andres from auth.users where email = 'andres@taekwondo.test';
  select id into v_marti  from auth.users where email = 'marti@taekwondo.test';

  if v_ale is null or v_andres is null or v_marti is null then
    raise exception 'Faltan cuentas de login (alecriado@/andres@/marti@): crearlas por Admin API antes del seed.';
  end if;

  -- Asegurar las filas de perfil de las cuentas (las crea el trigger on_auth_user_created).
  insert into public.profiles (id, nombre_completo) values (v_ale, 'Ale criado')    on conflict (id) do nothing;
  insert into public.profiles (id, nombre_completo) values (v_andres, 'Andres')     on conflict (id) do nothing;
  insert into public.profiles (id, nombre_completo) values (v_marti, 'Martí')       on conflict (id) do nothing;

  -- Nico Saez (raíz, sin login)
  insert into public.profiles (
    id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, grado_actual,
    grados_verificados, es_maestro, es_profesor,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values (
    gen_random_uuid(), 'Nico Saez', '91000001', '1974-03-12', 84, 'masculino', 'dan_7',
    true, true, true, 'Contacto Nico', '1155510001'
  ) returning id into v_nico;

  -- Ale criado (nivel 1, login): Maestro bajo Nico
  update public.profiles set
    nombre_completo = 'Ale criado', es_maestro = true, es_profesor = true,
    grado_actual = 'dan_5', grados_verificados = true, maestro_id = v_nico,
    dni = '91000002', fecha_nacimiento = '1980-06-20', peso_kg = 80, genero = 'masculino',
    contacto_emergencia_nombre = 'Contacto Ale', contacto_emergencia_telefono = '1155510002'
  where id = v_ale;

  -- Teresita (sin login): Maestro bajo Ale
  insert into public.profiles (
    id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, grado_actual,
    grados_verificados, es_maestro, es_profesor, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values (
    gen_random_uuid(), 'Teresita', '91000005', '1985-11-02', 68, 'femenino', 'dan_5',
    true, true, true, v_ale, 'Contacto Teresita', '1155510005'
  ) returning id into v_teresita;

  -- Andres (nivel 2, login): Maestro bajo Ale
  update public.profiles set
    nombre_completo = 'Andres', es_maestro = true, es_profesor = true,
    grado_actual = 'dan_4', grados_verificados = true, maestro_id = v_ale,
    dni = '91000003', fecha_nacimiento = '1983-09-14', peso_kg = 78, genero = 'masculino',
    contacto_emergencia_nombre = 'Contacto Andres', contacto_emergencia_telefono = '1155510003'
  where id = v_andres;

  -- Ian (sin login): Profesor bajo Andres
  insert into public.profiles (
    id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, grado_actual,
    grados_verificados, es_maestro, es_profesor, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values (
    gen_random_uuid(), 'Ian', '91000006', '1995-01-25', 74, 'masculino', 'dan_2',
    true, false, true, v_andres, 'Contacto Ian', '1155510006'
  ) returning id into v_ian;

  -- mechas (sin login): Profesor bajo Andres
  insert into public.profiles (
    id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, grado_actual,
    grados_verificados, es_maestro, es_profesor, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values (
    gen_random_uuid(), 'mechas', '91000007', '1993-07-08', 70, 'femenino', 'dan_2',
    true, false, true, v_andres, 'Contacto mechas', '1155510007'
  ) returning id into v_mechas;

  -- Martí (login): Profesor bajo Andres
  update public.profiles set
    nombre_completo = 'Martí', es_maestro = false, es_profesor = true,
    grado_actual = 'dan_1', grados_verificados = true, maestro_id = v_andres,
    dni = '91000004', fecha_nacimiento = '1998-04-18', peso_kg = 72, genero = 'masculino',
    contacto_emergencia_nombre = 'Contacto Martí', contacto_emergencia_telefono = '1155510004'
  where id = v_marti;

  -- Alumnos de test bajo Ale (variados)
  insert into public.profiles (
    id, nombre_completo, dni, genero, grado_actual, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values
    (gen_random_uuid(), 'Lucas Pérez',     '91000101', 'masculino', 'blanco',   v_ale, 'Contacto Lucas',   '1155510101'),
    (gen_random_uuid(), 'Sofía Gómez',     '91000102', 'femenino',  'amarillo', v_ale, 'Contacto Sofía',   '1155510102'),
    (gen_random_uuid(), 'Mateo Fernández', '91000103', 'masculino', 'verde',    v_ale, 'Contacto Mateo',   '1155510103');

  -- Alumnos de test bajo Andres (variados)
  insert into public.profiles (
    id, nombre_completo, dni, genero, grado_actual, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  ) values
    (gen_random_uuid(), 'Valentina Ruiz', '91000104', 'femenino',  'azul',  v_andres, 'Contacto Valentina', '1155510104'),
    (gen_random_uuid(), 'Benjamín Sosa',  '91000105', 'masculino', 'rojo',  v_andres, 'Contacto Benjamín',  '1155510105'),
    (gen_random_uuid(), 'Camila Díaz',    '91000106', 'femenino',  'dan_1', v_andres, 'Contacto Camila',    '1155510106');

  raise notice 'Seed demo Ale Criado aplicado. Nico=% Ale=% Andres=% Marti=%', v_nico, v_ale, v_andres, v_marti;
end $$;

-- Verificación
select
  (select count(*) from public.profiles) as perfiles,
  (select count(*) from auth.users)      as cuentas;
