-- ============================================================
-- Seed: db_seed_auditoria
-- Proyecto: Taekwondo ITF
-- Fecha: 2026-09-22 (v2)
-- Descripción:
--   Escenario determinista de prueba manual para la AUDITORÍA EN
--   CASCADA, los PAGOS DE ALQUILER y las pruebas de RLS (Fase 9).
--
--   Árbol de 3 niveles para probar la recursividad:
--     Jhonatan (Maestro, cuenta real)  jhonatancallegaleano@gmail.com
--       └── Profesor Jhona (nivel 1)   jhona@taekwondo.test    / Seed123456!
--              └── Sensei Seed (nivel 2, es_profesor)
--                                     sensei@taekwondo.test   / Seed123456!
--                     └── 6 alumnos sin cuenta
--
--   CORRECCIÓN v2: los perfiles se resuelven por EMAIL de auth
--   (no por `nombre_completo`), que era la causa del drift anterior.
--   Se re-escribe el nombre canónico del perfil igualmente.
--
--   - ADITIVO e IDEMPOTENTE: se puede correr N veces (guarda por
--     clave natural: dni, nombre de locación/grupo, periodo de pago).
--   - NO borra datos existentes.
--   - SIN comprobantes (comprobante_url = null).
--   - Las cuentas de login se crean por Admin API (no aquí).
--
--   Ejecutar con: npx supabase db query --linked -f <este archivo>
-- ============================================================

-- Flags del sistema: los triggers anti-escalada solo se disparan con
-- auth.uid() no nulo, pero se dejan por robustez/documentación.
select set_config('app.concesion_profesor', 'on', true);
select set_config('app.concesion_maestro', 'on', true);
select set_config('app.derivacion_linaje', 'on', true);

do $$
declare
  v_maestro uuid;        -- Jhonatan (cuenta real)
  v_jhona uuid;          -- jhona@taekwondo.test (nivel 1)
  v_sensei uuid;         -- sensei@taekwondo.test (nivel 2)
  v_loc_banda uuid;
  v_loc_jhona_a uuid;
  v_loc_jhona_b uuid;
  v_loc_sensei uuid;
  v_grupo uuid;
begin
  -- ----------------------------------------------------------
  -- 1. Personas base resueltas POR EMAIL
  -- ----------------------------------------------------------
  select id into v_maestro from auth.users where email = 'jhonatancallegaleano@gmail.com';
  select id into v_jhona   from auth.users where email = 'jhona@taekwondo.test';
  select id into v_sensei  from auth.users where email = 'sensei@taekwondo.test';

  if v_maestro is null then
    raise exception 'Falta la cuenta real jhonatancallegaleano@gmail.com';
  end if;
  if v_jhona is null then
    raise exception 'Falta la cuenta jhona@taekwondo.test (crearla por Admin API antes del seed)';
  end if;
  if v_sensei is null then
    raise exception 'Falta la cuenta sensei@taekwondo.test (crearla por Admin API antes del seed)';
  end if;

  -- Asegurar filas de perfil (el trigger on_auth_user_created las crea).
  insert into public.profiles (id, nombre_completo) values (v_maestro, 'Jhonatan Calle Galeano')
    on conflict (id) do nothing;
  insert into public.profiles (id, nombre_completo) values (v_jhona, 'Profesor Jhona')
    on conflict (id) do nothing;
  insert into public.profiles (id, nombre_completo) values (v_sensei, 'Sensei Seed')
    on conflict (id) do nothing;

  -- ----------------------------------------------------------
  -- 2. Perfil P1 (Profesor Jhona): nivel 1
  -- ----------------------------------------------------------
  update public.profiles
     set nombre_completo = 'Profesor Jhona',
         es_profesor = true,
         es_maestro = false,
         grado_actual = coalesce(grado_actual, 'dan_1'),
         grados_verificados = true,
         maestro_id = v_maestro,
         dni = coalesce(dni, '90000011'),
         fecha_nacimiento = coalesce(fecha_nacimiento, '1990-05-10'),
         peso_kg = coalesce(peso_kg, 75),
         genero = coalesce(genero, 'masculino'::public.genero),
         contacto_emergencia_nombre = coalesce(nullif(contacto_emergencia_nombre, ''), 'Contacto Jhona'),
         contacto_emergencia_telefono = coalesce(nullif(contacto_emergencia_telefono, ''), '1155500001')
   where id = v_jhona;

  -- ----------------------------------------------------------
  -- 3. Perfil P2 (Sensei Seed): nivel 2
  -- ----------------------------------------------------------
  update public.profiles
     set nombre_completo = 'Sensei Seed',
         es_profesor = true,
         es_maestro = false,
         grado_actual = coalesce(grado_actual, 'dan_2'),
         grados_verificados = true,
         maestro_id = v_jhona,
         dni = coalesce(dni, '90000012'),
         fecha_nacimiento = coalesce(fecha_nacimiento, '1992-08-20'),
         peso_kg = coalesce(peso_kg, 80),
         genero = coalesce(genero, 'masculino'::public.genero),
         contacto_emergencia_nombre = coalesce(nullif(contacto_emergencia_nombre, ''), 'Contacto Sensei'),
         contacto_emergencia_telefono = coalesce(nullif(contacto_emergencia_telefono, ''), '1155500002')
   where id = v_sensei;

  -- ----------------------------------------------------------
  -- 3.b Perfil P0 (Jhonatan): asegurar faceta y contacto de
  --     emergencia (la cuenta real conserva el resto de sus datos).
  -- ----------------------------------------------------------
  update public.profiles
     set es_maestro = true,
         es_profesor = true,
         contacto_emergencia_nombre = coalesce(nullif(contacto_emergencia_nombre, ''), 'Contacto Jhonatan'),
         contacto_emergencia_telefono = coalesce(nullif(contacto_emergencia_telefono, ''), '1155500000')
   where id = v_maestro;

  -- ----------------------------------------------------------
  -- 4. Alumnos sin cuenta del nivel 2 (alumnos de Sensei Seed)
  -- ----------------------------------------------------------
  insert into public.profiles (
    id, nombre_completo, dni, genero, grado_actual, maestro_id,
    contacto_emergencia_nombre, contacto_emergencia_telefono
  )
  select gen_random_uuid(), x.nombre, x.dni, x.genero::public.genero, x.grado::public.grado, v_sensei,
         x.contacto_nombre, x.contacto_telefono
    from (values
      ('Alumno Seed Blanco',   '90000101', 'masculino', 'blanco',   'Contacto Blanco',   '1155500101'),
      ('Alumno Seed Amarillo', '90000102', 'femenino',  'amarillo', 'Contacto Amarillo', '1155500102'),
      ('Alumno Seed Verde',    '90000103', 'masculino', 'verde',    'Contacto Verde',    '1155500103'),
      ('Alumno Seed Azul',     '90000104', 'femenino',  'azul',     'Contacto Azul',     '1155500104'),
      ('Alumno Seed Rojo',     '90000105', 'masculino', 'rojo',     'Contacto Rojo',     '1155500105'),
      ('Alumno Seed Dan',      '90000106', 'femenino',  'dan_1',    'Contacto Dan',      '1155500106')
    ) as x(nombre, dni, genero, grado, contacto_nombre, contacto_telefono)
   where not exists (select 1 from public.profiles p where p.dni = x.dni);

  -- Backfill de contacto para alumnos ya existentes (el insert no los re-crea).
  update public.profiles p
     set contacto_emergencia_nombre = coalesce(nullif(p.contacto_emergencia_nombre, ''), 'Contacto ' || p.nombre_completo),
         contacto_emergencia_telefono = coalesce(nullif(p.contacto_emergencia_telefono, ''), '115550' || right(p.dni, 4))
   where p.maestro_id = v_sensei
     and (p.contacto_emergencia_nombre = '' or p.contacto_emergencia_telefono = '');

  -- ----------------------------------------------------------
  -- 5. Locaciones por DUEÑO (para auditar en cascada)
  -- ----------------------------------------------------------
  v_loc_banda := null;
  select id into v_loc_banda from public.locaciones where nombre = 'Banda Norte' limit 1;
  if v_loc_banda is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Banda Norte', 'Americo Vidal 456', 5000, v_maestro)
    returning id into v_loc_banda;
  end if;

  select id into v_loc_jhona_a from public.locaciones where nombre = 'Seed Dojang Jhona A' limit 1;
  if v_loc_jhona_a is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Jhona A', 'Av. Subordinado 100', 12000, v_jhona)
    returning id into v_loc_jhona_a;
  end if;

  select id into v_loc_jhona_b from public.locaciones where nombre = 'Seed Dojang Jhona B' limit 1;
  if v_loc_jhona_b is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Jhona B', 'Av. Subordinado 200', 8500, v_jhona)
    returning id into v_loc_jhona_b;
  end if;

  select id into v_loc_sensei from public.locaciones where nombre = 'Seed Dojang Sensei' limit 1;
  if v_loc_sensei is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Sensei', 'Calle Nivel 2 - 300', 9900, v_sensei)
    returning id into v_loc_sensei;
  end if;

  -- ----------------------------------------------------------
  -- 6. Grupos con locación asignada (uno por dueño + base del Maestro)
  -- ----------------------------------------------------------
  select id into v_grupo from public.grupos where nombre = 'Niños' limit 1;
  if v_grupo is null then
    insert into public.grupos (profesor_id, nombre, locacion_id)
    values (v_maestro, 'Niños', v_loc_banda);
  end if;

  select id into v_grupo from public.grupos where nombre = 'Adultos Noche' limit 1;
  if v_grupo is null then
    insert into public.grupos (profesor_id, nombre, locacion_id)
    values (v_maestro, 'Adultos Noche', v_loc_banda);
  end if;

  select id into v_grupo from public.grupos where nombre = 'Seed Grupo Jhona' and profesor_id = v_jhona limit 1;
  if v_grupo is null then
    insert into public.grupos (profesor_id, nombre, locacion_id)
    values (v_jhona, 'Seed Grupo Jhona', v_loc_jhona_a);
  end if;

  select id into v_grupo from public.grupos where nombre = 'Seed Grupo Sensei' and profesor_id = v_sensei limit 1;
  if v_grupo is null then
    insert into public.grupos (profesor_id, nombre, locacion_id)
    values (v_sensei, 'Seed Grupo Sensei', v_loc_sensei);
  end if;

  -- ----------------------------------------------------------
  -- 7. Pagos de alquiler: los 3 ESTADOS del auditor
  -- ----------------------------------------------------------
  -- Al día: último pago = mes actual (2026-09).
  insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
  values (v_loc_banda, 5000, '2026-09', '2026-09-05', null, v_maestro)
  on conflict do nothing;

  -- Vencida (2 meses): último pago = 2026-07.
  insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
  values (v_loc_jhona_a, 12000, '2026-07', '2026-07-04', null, v_jhona)
  on conflict do nothing;

  -- Sin pagos: Seed Dojang Jhona B no recibe pagos (caso explícito).

  -- Vencida (1 mes) en el nivel 2: último pago = 2026-08.
  insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
  values (v_loc_sensei, 9900, '2026-08', '2026-08-06', null, v_sensei)
  on conflict do nothing;

  raise notice 'Seed v2 aplicado. Maestro=% Jhona=% Sensei=%', v_maestro, v_jhona, v_sensei;
end;
$$;

-- ============================================================
-- 8. Verificación
-- ============================================================
select
  (select count(*) from public.profiles)        as perfiles,
  (select count(*) from public.locaciones)      as locaciones,
  (select count(*) from public.grupos)          as grupos,
  (select count(*) from public.pagos_alquiler)  as pagos;
