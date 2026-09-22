-- ============================================================
-- Seed: db_seed_auditoria
-- Proyecto: Taekwondo ITF
-- Fecha: 2026-09-21
-- Descripción:
--   Escenario de prueba manual para la AUDITORÍA EN CASCADA
--   (Fase 5, ítem 3) y los PAGOS DE ALQUILER (Fase 5, ítem 2).
--
--   Árbol de 3 niveles para probar la recursividad:
--     Jhonatan (Maestro, cuenta real)
--       └── Profesor Jhona (ya existía)
--              └── Sensei Seed (NUEVO, es_profesor)
--                     └── 6 alumnos sin cuenta
--
--   - ADITIVO e IDEMPOTENTE: se puede correr N veces; usa
--     `on conflict do nothing` y busca por claves naturales.
--   - NO borra datos existentes.
--   - SIN comprobantes (comprobante_url = null): no se apunta a
--     archivos inexistentes en el bucket.
--
--   Las cuentas de login se crean por Admin API (no aquí):
--     seed-sensei@taekwondo.test  / Seed123456!
--     seed-jhona@taekwondo.test   / Seed123456!
--   El trigger `on_auth_user_created` crea sus filas en `profiles`.
--
--   Ejecutar con: npx supabase db query --linked -f <este archivo>
-- ============================================================

-- ============================================================
-- 0. Contexto: sembrar facetas y linaje con los flags del
--    proyecto (los triggers anti-escalada los exigen).
-- ============================================================
select set_config('app.concesion_profesor', 'on', true);
select set_config('app.concesion_maestro', 'on', true);
select set_config('app.derivacion_linaje', 'on', true);

do $$
declare
  v_maestro uuid;        -- Jhonatan (cuenta real)
  v_jhona uuid;          -- Profesor Jhona (perfil previo)
  v_sensei uuid;         -- Sensei Seed (cuenta nueva)
  v_loc_banda uuid;      -- locación real existente
  v_loc_jhona_a uuid;
  v_loc_jhona_b uuid;
  v_loc_sensei uuid;
  v_grupo_ninos uuid;
  v_grupo_adultos uuid;
  v_grupo_jhona uuid;
  v_grupo_sensei uuid;
begin
  -- ----------------------------------------------------------
  -- 1. Personas base
  -- ----------------------------------------------------------
  select id into v_maestro from public.profiles
   where nombre_completo = 'Jhonatan Calle Galeano' limit 1;

  select id into v_jhona from public.profiles
   where nombre_completo = 'Profesor Jhona' limit 1;

  select id into v_sensei from public.profiles
   where nombre_completo = 'Sensei Seed' limit 1;

  if v_maestro is null then
    raise exception 'No se encontró el perfil de Jhonatan Calle Galeano.';
  end if;

  -- Crear/actualizar "Sensei Seed" (nivel 2) con faceta de profesor.
  if v_sensei is null then
    insert into public.profiles (id, nombre_completo, dni, genero, grado_actual,
                                 es_profesor, grados_verificados, maestro_id)
    values (gen_random_uuid(), 'Sensei Seed', '90000001', 'masculino', 'dan_2',
            true, true, coalesce(v_jhona, v_maestro))
    returning id into v_sensei;
  else
    update public.profiles
       set es_profesor = true,
           grado_actual = coalesce(grado_actual, 'dan_2'),
           maestro_id = coalesce(maestro_id, coalesce(v_jhona, v_maestro))
     where id = v_sensei;
  end if;

  -- Profesor Jhona: asegurar faceta y linaje con el Maestro.
  if v_jhona is not null then
    update public.profiles
       set es_profesor = true,
           maestro_id = coalesce(maestro_id, v_maestro)
     where id = v_jhona;
  end if;

  -- ----------------------------------------------------------
  -- 2. Alumnos sin cuenta del nivel 2 (alumnos de Sensei Seed)
  -- ----------------------------------------------------------
  insert into public.profiles (id, nombre_completo, dni, genero, grado_actual, maestro_id)
  values
    (gen_random_uuid(), 'Alumno Seed Blanco',   '90000101', 'masculino', 'blanco', v_sensei),
    (gen_random_uuid(), 'Alumno Seed Amarillo', '90000102', 'femenino',  'amarillo', v_sensei),
    (gen_random_uuid(), 'Alumno Seed Verde',    '90000103', 'masculino', 'verde', v_sensei),
    (gen_random_uuid(), 'Alumno Seed Azul',     '90000104', 'femenino',  'azul', v_sensei),
    (gen_random_uuid(), 'Alumno Seed Rojo',     '90000105', 'masculino', 'rojo', v_sensei),
    (gen_random_uuid(), 'Alumno Seed Dan',      '90000106', 'femenino',  'dan_1', v_sensei)
  on conflict do nothing;

  -- ----------------------------------------------------------
  -- 3. Locaciones por DUEÑO (para poder auditar en cascada)
  -- ----------------------------------------------------------
  -- 3.a Locación real (la conserva); queda a nombre del Maestro.
  select id into v_loc_banda from public.locaciones
   where nombre = 'Banda Norte' limit 1;

  if v_loc_banda is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Banda Norte', 'Americo vidal 456', 5000, v_maestro)
    returning id into v_loc_banda;
  end if;

  -- 3.b Locaciones de PROFESOR JHONA (subordinado directo del Maestro)
  select id into v_loc_jhona_a from public.locaciones
   where nombre = 'Seed Dojang Jhona A' limit 1;
  if v_loc_jhona_a is null and v_jhona is not null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Jhona A', 'Av. Subordinado 100', 12000, v_jhona)
    returning id into v_loc_jhona_a;
  end if;

  select id into v_loc_jhona_b from public.locaciones
   where nombre = 'Seed Dojang Jhona B' limit 1;
  if v_loc_jhona_b is null and v_jhona is not null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Jhona B', 'Av. Subordinado 200', 8500, v_jhona)
    returning id into v_loc_jhona_b;
  end if;

  -- 3.c Locación de SENSEI SEED (nivel 2: prueba la recursividad)
  select id into v_loc_sensei from public.locaciones
   where nombre = 'Seed Dojang Sensei' limit 1;
  if v_loc_sensei is null then
    insert into public.locaciones (nombre, direccion, valor_alquiler, creado_por)
    values ('Seed Dojang Sensei', 'Calle Nivel 2 - 300', 9900, v_sensei)
    returning id into v_loc_sensei;
  end if;

  -- ----------------------------------------------------------
  -- 4. Grupos con locación asignada
  -- ----------------------------------------------------------
  select id into v_grupo_ninos from public.grupos where nombre = 'Niños' limit 1;
  if v_grupo_ninos is not null and v_loc_banda is not null then
    update public.grupos set locacion_id = v_loc_banda where id = v_grupo_ninos;
  end if;

  select id into v_grupo_adultos from public.grupos where nombre = 'Adultos Noche' limit 1;
  if v_grupo_adultos is not null then
    update public.grupos set locacion_id = coalesce(locacion_id, v_loc_banda) where id = v_grupo_adultos;
  end if;

  -- Grupo de Profesor Jhona
  if v_jhona is not null then
    select id into v_grupo_jhona from public.grupos
     where nombre = 'Seed Grupo Jhona' limit 1;
    if v_grupo_jhona is null then
      insert into public.grupos (profesor_id, nombre, locacion_id)
      values (v_jhona, 'Seed Grupo Jhona', v_loc_jhona_a)
      returning id into v_grupo_jhona;
    end if;
  end if;

  -- Grupo de Sensei Seed (nivel 2)
  select id into v_grupo_sensei from public.grupos
   where nombre = 'Seed Grupo Sensei' limit 1;
  if v_grupo_sensei is null then
    insert into public.grupos (profesor_id, nombre, locacion_id)
    values (v_sensei, 'Seed Grupo Sensei', v_loc_sensei)
    returning id into v_grupo_sensei;
  end if;

  -- ----------------------------------------------------------
  -- 5. Pagos de alquiler: cubrir los 3 ESTADOS del auditor
  -- ----------------------------------------------------------
  -- Al día: último pago = mes actual (2026-09).
  insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
  values (v_loc_banda, 5000, '2026-09', '2026-09-05', null, v_maestro)
  on conflict do nothing;

  -- Vencida (2 meses): último pago = 2026-07.
  if v_loc_jhona_a is not null then
    insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
    values (v_loc_jhona_a, 12000, '2026-07', '2026-07-04', null, v_jhona)
    on conflict do nothing;
  end if;

  -- Sin pagos: la locación Jhona B no recibe pagos (caso explícito).

  -- Vencida (1 mes) en el nivel 2: último pago = 2026-08.
  insert into public.pagos_alquiler (locacion_id, monto, periodo, fecha_pago, comprobante_url, creado_por)
  values (v_loc_sensei, 9900, '2026-08', '2026-08-06', null, v_sensei)
  on conflict do nothing;

  raise notice 'Seed de auditoría aplicado. Sensei=% Jhona=%', v_sensei, v_jhona;
end;
$$;

-- ============================================================
-- 6. Limpieza del comprobante roto del pago previo
--    (apunta a un archivo que no existe en el bucket).
-- ============================================================
update public.pagos_alquiler
   set comprobante_url = null
 where comprobante_url is not null
   and not exists (
     select 1 from storage.objects o
      where o.bucket_id = 'comprobantes' and o.name = comprobante_url
   );

-- ============================================================
-- 7. Verificación
-- ============================================================
select
  (select count(*) from public.profiles)        as perfiles,
  (select count(*) from public.locaciones)      as locaciones,
  (select count(*) from public.grupos)          as grupos,
  (select count(*) from public.pagos_alquiler)  as pagos;
