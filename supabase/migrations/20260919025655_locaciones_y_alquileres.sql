-- ============================================================
-- Migración: locaciones_y_alquileres
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new locaciones_y_alquileres
-- Fecha: 2026-09-19
-- Descripción:
--   - Locaciones: centros de entrenamiento (nombre, dirección, alquiler).
--   - Pagos de alquiler con comprobantes (SRS §3.3).
--   - Bucket privado `comprobantes` (auditoría de infraestructura SRS §2).
-- ============================================================

-- ============================================================
-- 1. Locaciones
-- ============================================================
create table public.locaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  valor_alquiler numeric(10,2),
  creado_por uuid not null references public.profiles(id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 2. Pagos de alquiler (comprobante como URL del storage)
--    `on delete restrict`: el historial financiero jamás se borra
--    en cascada al eliminar una locación.
-- ============================================================
create table public.pagos_alquiler (
  id uuid primary key default gen_random_uuid(),
  locacion_id uuid not null references public.locaciones(id) on delete restrict,
  monto numeric(10,2) not null check (monto > 0),
  periodo text not null,             -- ej. '2026-09'
  fecha_pago date not null,
  comprobante_url text,
  creado_por uuid references public.profiles(id),
  creado_en timestamptz not null default now()
);

create index pagos_alquiler_locacion_periodo_idx on public.pagos_alquiler (locacion_id, periodo);

-- ============================================================
-- 3. RLS (políticas detalladas llegan con rls_gestion_escuela)
-- ============================================================
alter table public.locaciones enable row level security;
alter table public.pagos_alquiler enable row level security;

-- ============================================================
-- 4. Bucket privado de comprobantes (storage)
--    RLS de storage.objects se define en rls_gestion_escuela.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;