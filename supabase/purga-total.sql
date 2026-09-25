-- ============================================================
-- Purga TOTAL de la BD remota (SOLO datos)
-- Proyecto: Taekwondo ITF
-- Fecha: 2026-09-24
-- Descripción:
--   - TRUNCATE de TODAS las tablas del schema `public` (CASCADE).
--   - DELETE de TODOS los usuarios de `auth.users`.
--   - NO toca schema, migraciones (`supabase_migrations`) ni Storage.
--   - Referencia: documentacion/planes/db-seed-demo-ale-criado.md
--   Ejecutar con: npx supabase db query --linked -f supabase/purga-total.sql
-- ============================================================

select set_config('app.concesion_profesor', 'on', true);
select set_config('app.concesion_maestro', 'on', true);
select set_config('app.derivacion_linaje', 'on', true);

do $$
declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;

delete from auth.users;

-- Verificación
select
  (select count(*) from auth.users)              as auth_users,
  (select count(*) from public.profiles)         as perfiles,
  (select count(*) from public.locaciones)       as locaciones,
  (select count(*) from public.mesas_examen)     as mesas;
