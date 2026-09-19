-- ============================================================
-- Migración: pagos_cuota
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new pagos_cuota
-- Fecha: 2026-09-19
-- Descripción:
--   - Gestión de cuotas mensuales por alumno (SRS §3.5): fecha de la
--     transacción, monto percibido y periodo.
--   - Registro financiero (no pasarela de pago).
-- ============================================================

create table public.pagos_cuota (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null,
  monto numeric(10,2) not null check (monto > 0),
  periodo text not null,             -- ej. '2026-09'
  observaciones text,
  creado_por uuid references public.profiles(id),
  creado_en timestamptz not null default now(),
  -- Un solo pago mensual por alumno (SRS §3.5)
  unique (alumno_id, periodo)
);

create index pagos_cuota_periodo_idx on public.pagos_cuota (periodo);

alter table public.pagos_cuota enable row level security;