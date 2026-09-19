-- ============================================================
-- Migración: examenes_graduacion
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new examenes_graduacion
-- Fecha: 2026-09-19
-- Descripción:
--   - Mesas de examen (SRS §3.7): planificación con fecha, lugar y
--     límite de inscripción.
--   - Postulaciones de alumnos con grado aspirado calculado y derecho
--     de examen (recaudación).
--   - Refactor de `graduaciones` → historial académico permanente con
--     grados unificados y resultado.
--   - RPC `registrar_resultado_examen`: aprobado → asciende el grado
--     automáticamente (SRS §3.7) y registra el evento.
-- ============================================================

-- ============================================================
-- 1. Mesas de examen (las aperturan los Maestros)
-- ============================================================
create table public.mesas_examen (
  id uuid primary key default gen_random_uuid(),
  maestro_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null,
  lugar text,
  limite_inscripcion int,
  estado text not null default 'abierta'
    check (estado in ('abierta', 'cerrada', 'finalizada')),
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 2. Postulaciones de examen
--    grado_aspirado = grado inmediato superior al actual (lo calcula
--    la app al postular; la BD lo persiste como snapshot).
-- ============================================================
create table public.postulaciones_examen (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references public.mesas_examen(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  profesor_id uuid not null references public.profiles(id),
  grado_aspirado public.grado not null,
  derecho_examen numeric(10,2),
  estado text not null default 'postulado'
    check (estado in ('postulado', 'aprobado', 'desaprobado', 'ausente')),
  evaluado_por uuid references public.profiles(id),
  evaluado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (mesa_id, alumno_id)
);

-- ============================================================
-- 3. Refactor de graduaciones → historial académico permanente
--    Grados unificados (gup o dan), resultado y trazabilidad de mesa.
-- ============================================================

-- 3a. Nueva columna de trazabilidad y resultado
alter table public.graduaciones
  add column mesa_id uuid references public.mesas_examen(id),
  add column resultado text not null default 'aprobado'
    check (resultado in ('aprobado', 'desaprobado', 'ausente'));

-- 3b. Unificar grados: se toma el valor gup o dan según corresponda
alter table public.graduaciones
  alter column grado_anterior type public.grado
  using coalesce(grado_anterior::text, dan_anterior::text)::public.grado;

alter table public.graduaciones
  alter column grado_nuevo type public.grado
  using coalesce(grado_nuevo::text, dan_nuevo::text)::public.grado;

-- 3c. Eliminar columnas legacy
alter table public.graduaciones
  drop column dan_anterior,
  drop column dan_nuevo,
  drop column aprobado;

-- ============================================================
-- 4. RLS (detalle en rls_gestion_escuela)
-- ============================================================
alter table public.mesas_examen enable row level security;
alter table public.postulaciones_examen enable row level security;

-- ============================================================
-- 5. RPC: registro de resultado de examen (SECURITY DEFINER)
--    - Valida faceta de maestro + dueño de la mesa.
--    - aprobado → estado, graduaciones y ascenso automático en
--      profiles.grado_actual (escritura del sistema vía set_config).
-- ============================================================
create or replace function public.registrar_resultado_examen(
  p_postulacion uuid,
  p_resultado text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mesa uuid;
  v_maestro uuid;
  v_alumno uuid;
  v_estado text;
  v_grado_nuevo public.grado;
begin
  if p_resultado not in ('aprobado', 'desaprobado', 'ausente') then
    raise exception 'Resultado de examen invalido.';
  end if;

  select p.mesa_id, m.maestro_id, p.alumno_id, p.estado, p.grado_aspirado
    into v_mesa, v_maestro, v_alumno, v_estado, v_grado_nuevo
    from public.postulaciones_examen p
    join public.mesas_examen m on m.id = p.mesa_id
   where p.id = p_postulacion;

  if v_mesa is null then
    raise exception 'Postulacion inexistente.';
  end if;

  if auth.uid() is null or auth.uid() <> v_maestro then
    raise exception 'Solo el maestro examinador puede registrar resultados.';
  end if;

  if not exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.es_maestro = true
  ) then
    raise exception 'Se requiere la faceta de maestro.';
  end if;

  if v_estado <> 'postulado' then
    raise exception 'La postulacion ya fue evaluada.';
  end if;

  if p_resultado = 'aprobado' then
    -- Escritura del sistema: habilita el salto del blindaje de grado.
    perform set_config('app.aprobacion_examen', 'on', true);

    update public.postulaciones_examen
       set estado = 'aprobado', evaluado_por = auth.uid(), evaluado_en = now()
     where id = p_postulacion;

    insert into public.graduaciones
      (alumno_id, sinodal_id, mesa_id, grado_anterior, grado_nuevo, resultado, examinado_en)
    values (
      v_alumno,
      auth.uid(),
      v_mesa,
      (select grado_actual from public.profiles where id = v_alumno),
      v_grado_nuevo,
      'aprobado',
      now()
    );

    update public.profiles
       set grado_actual = v_grado_nuevo, grados_verificados = true
     where id = v_alumno;
  else
    update public.postulaciones_examen
       set estado = p_resultado, evaluado_por = auth.uid(), evaluado_en = now()
     where id = p_postulacion;
  end if;

  return true;
end;
$$;

revoke execute on function public.registrar_resultado_examen(uuid, text) from public;
grant execute on function public.registrar_resultado_examen(uuid, text) to authenticated;