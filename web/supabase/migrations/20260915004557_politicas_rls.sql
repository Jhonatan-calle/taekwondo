-- ============================================================
-- Migración: politicas_rls
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new politicas_rls
-- Fecha: 2026-09-15
-- ============================================================

-- ============================================================
-- 0. Habilitar RLS en TODAS las tablas (día uno)
--    Las tablas sin políticas quedan inaccesibles hasta Fase 2.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.grupos enable row level security;
alter table public.miembros_grupo enable row level security;
alter table public.clases enable row level security;
alter table public.asistencia enable row level security;
alter table public.torneos enable row level security;
alter table public.inscripciones enable row level security;
alter table public.inscripciones_datos_privados enable row level security;
alter table public.categorias enable row level security;
alter table public.llaves enable row level security;
alter table public.enfrentamientos enable row level security;
alter table public.jurados_torneo enable row level security;
alter table public.graduaciones enable row level security;
alter table public.errores_runtime enable row level security;

-- ============================================================
-- 1. profiles
-- ============================================================
-- SELECT: cualquier usuario autenticado.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- UPDATE: solo el propio perfil.
create policy "profiles_update_propio"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 2. errores_runtime (registro interno)
-- ============================================================
-- INSERT: anon/authenticated (para que todo try/catch pueda registrar).
create policy "errores_runtime_insert_all"
  on public.errores_runtime for insert
  to anon, authenticated
  with check (true);

-- SELECT: sin política para roles públicos (ningún usuario común lo lee).
-- Lectura exclusiva server-side vía service role.

-- ============================================================
-- 3. torneos
-- ============================================================
-- SELECT público (anon/authenticated): listado y detalle visibles.
create policy "torneos_select_publico"
  on public.torneos for select
  to anon, authenticated
  using (true);

-- ============================================================
-- 4. inscripciones
-- ============================================================
-- Alumno: solo sus propias filas.
create policy "inscripciones_select_alumno"
  on public.inscripciones for select
  to authenticated
  using (auth.uid() = alumno_id);

-- Profesor: filas donde da el aval (incluye pendientes, confirmados y rechazados).
create policy "inscripciones_select_profesor"
  on public.inscripciones for select
  to authenticated
  using (auth.uid() = profesor_id);

-- Organizador: solo inscripciones confirmadas (nunca pendientes).
create policy "inscripciones_select_organizador"
  on public.inscripciones for select
  to authenticated
  using (
    estado = 'confirmado'
    and auth.uid() in (
      select t.organizador_id from public.torneos t where t.id = torneo_id
    )
  );

-- INSERT: el alumno se inscribe a sí mismo (queda pendiente por defecto).
create policy "inscripciones_insert_alumno"
  on public.inscripciones for insert
  to authenticated
  with check (auth.uid() = alumno_id);

-- UPDATE: el profesor del aval gestiona su inscripción (valida pago/aval).
create policy "inscripciones_update_profesor"
  on public.inscripciones for update
  to authenticated
  using (auth.uid() = profesor_id)
  with check (auth.uid() = profesor_id);

-- ============================================================
-- 5. inscripciones_datos_privados (aislada del alumno)
-- ============================================================
-- SIN SELECT para anon/authenticated: el alumno jamás ve nivel_agresividad.
-- Lectura exclusiva server-side vía service role.

-- INSERT: solo el profesor que da el aval de esa inscripción.
create policy "datos_privados_insert_profesor"
  on public.inscripciones_datos_privados for insert
  to authenticated
  with check (
    auth.uid() = (select profesor_id from public.inscripciones where id = inscripcion_id)
  );

-- UPDATE: profesor del aval u organizador del torneo de la inscripción.
create policy "datos_privados_update_profesor"
  on public.inscripciones_datos_privados for update
  to authenticated
  using (
    auth.uid() = (select profesor_id from public.inscripciones where id = inscripcion_id)
    or auth.uid() in (
      select t.organizador_id
      from public.torneos t
      join public.inscripciones i on i.torneo_id = t.id
      where i.id = inscripcion_id
    )
  )
  with check (
    auth.uid() = (select profesor_id from public.inscripciones where id = inscripcion_id)
    or auth.uid() in (
      select t.organizador_id
      from public.torneos t
      join public.inscripciones i on i.torneo_id = t.id
      where i.id = inscripcion_id
    )
  );