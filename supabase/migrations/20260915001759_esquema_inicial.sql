-- ============================================================
-- Migración: esquema_inicial
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new esquema_inicial
-- Fecha: 2026-09-15
-- ============================================================

-- Extensión de UUIDs en BD
create extension if not exists pgcrypto;

-- ============================================================
-- 1. Grados / cinturones (ITF - orden jerárquico estricto)
-- ============================================================
create type public.grado_gup as enum (
  'blanco',               -- 10º Gup
  'blanco_punta_amarilla',--  9º Gup
  'amarillo',             --  8º Gup
  'amarillo_punta_verde', --  7º Gup
  'verde',                --  6º Gup
  'verde_punta_azul',     --  5º Gup
  'azul',                 --  4º Gup
  'azul_punta_roja',      --  3º Gup
  'rojo',                 --  2º Gup
  'rojo_punta_negra'      --  1º Gup
);

create type public.grado_dan as enum (
  'dan_1', 'dan_2', 'dan_3', 'dan_4', 'dan_5', 'dan_6'
);

-- ============================================================
-- 2. Perfiles de usuario (profesores y alumnos)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null default '',
  fecha_nacimiento date,
  peso_kg numeric(5,2),
  altura_cm numeric(5,2),
  contacto_emergencia text,
  datos_salud text,
  -- Faceta dual: maestro ascendente (linaje / árbol de poder)
  maestro_id uuid references public.profiles(id),
  grados_verificados bool not null default false,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 3. Grupos de clase (flujo de vinculación por código)
-- ============================================================
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  profesor_id uuid not null references public.profiles(id) on delete cascade,
  nombre text not null,
  ubicacion text,
  horarios text,
  codigo_invitacion text unique not null,
  creado_en timestamptz not null default now()
);

create table public.miembros_grupo (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'activo', -- 'activo' | 'pendiente_aprobacion'
  creado_en timestamptz not null default now(),
  primary key (grupo_id, alumno_id)
);

-- ============================================================
-- 4. Clases y asistencia
-- ============================================================
create table public.clases (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  objetivo text,
  contenido_tuls text,
  preparacion_fisica text,
  creado_en timestamptz not null default now()
);

create table public.asistencia (
  clase_id uuid not null references public.clases(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  presente bool not null default false,
  creado_en timestamptz not null default now(),
  primary key (clase_id, alumno_id)
);

-- ============================================================
-- 5. Módulo de Torneos (prioridad MVP / vía de monetización)
-- ============================================================
create table public.torneos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references public.profiles(id) on delete cascade,
  nombre text not null,
  fecha date not null,
  link_token text unique not null,      -- link de inscripción (secreto para inscribirse)
  estado text not null default 'borrador', -- borrador | inscripciones | armado_llaves | en_vivo | finalizado
  creado_en timestamptz not null default now()
);

-- Inscripciones: el alumno nunca confirma automáticamente
create table public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  profesor_id uuid not null references public.profiles(id), -- profesor a cargo que da el aval
  datos_antropometricos jsonb not null default '{}'::jsonb, -- edad, peso, altura
  estado text not null default 'pendiente', -- pendiente | confirmado | rechazado
  confirmado_por uuid references public.profiles(id),
  confirmado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (torneo_id, alumno_id)
);

-- TABLA PROTEGIDA: dato privado del profesor (no visible para el alumno, ni siquiera en SELECT)
-- Aislado en tabla aparte para garantizar que RLS nunca exponga el dato al alumno.
create table public.inscripciones_datos_privados (
  inscripcion_id uuid primary key references public.inscripciones(id) on delete cascade,
  nivel_agresividad int not null default 3 check (nivel_agresividad between 1 and 5),
  creado_en timestamptz not null default now()
);

-- Categorías y llaves (armado automatizado + modificación manual)
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  nombre text not null,
  rango_min public.grado_gup,
  rango_max_especial text, -- maneja caso 'dan' (1er Dan+)
  edad_min int, edad_max int,
  peso_min numeric(5,2), peso_max numeric(5,2)
);

create table public.llaves (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nombre_ronda text not null,
  orden int not null default 0
);

create table public.enfrentamientos (
  id uuid primary key default gen_random_uuid(),
  llave_id uuid not null references public.llaves(id) on delete cascade,
  participante_a uuid references public.inscripciones(id),
  participante_b uuid references public.inscripciones(id),
  ganador_id uuid references public.inscripciones(id),
  tipo text not null default 'combate', -- 'combate' | 'tul'
  estado text not null default 'pendiente', -- pendiente | en_curso | finalizado
  resultados jsonb not null default '{}'::jsonb
);

create table public.jurados_torneo (
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  jurado_id uuid not null references public.profiles(id) on delete cascade,
  primary key (torneo_id, jurado_id)
);

-- ============================================================
-- 6. Graduaciones (exámenes de pase de cinturón)
-- ============================================================
create table public.graduaciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  sinodal_id uuid not null references public.profiles(id), -- maestro/sinodal evaluador
  grado_anterior public.grado_gup,
  grado_nuevo public.grado_gup,
  dan_anterior public.grado_dan,
  dan_nuevo public.grado_dan,
  aprobado bool not null default false,
  examinado_en timestamptz not null default now()
);

-- ============================================================
-- 7. Registro de errores en tiempo de ejecución (fail gracefully)
-- ============================================================
create table public.errores_runtime (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  modulo text not null,
  contexto text,
  mensaje_error text not null,
  stack_trace text,
  severidad text not null default 'error', -- info | warning | error | critical
  estado text not null default 'nuevo',    -- nuevo | en_revision | resuelto | descartado
  solucion text
);

create index errores_runtime_fecha_idx on public.errores_runtime (fecha desc);

-- ============================================================
-- 8. Trigger: Auth → profiles (synErr con SECURITY DEFINER)
-- ============================================================
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer            -- evita que RLS bloquee la inserción inicial
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.manejar_nuevo_usuario();
