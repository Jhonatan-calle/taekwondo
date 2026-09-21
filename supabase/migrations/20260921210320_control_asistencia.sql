-- ============================================================
-- Migración: control_asistencia
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4 ítem 4)
-- Generada por CLI: npx supabase migration new control_asistencia
-- Fecha: 2026-09-21
-- Descripción:
--   - Control de asistencia (Fase 4, ítem 4 del workflow móvil).
--   - La tabla `public.asistencia` ya existe con su PK compuesta
--     `primary key (clase_id, alumno_id)` desde el esquema inicial
--     (20260915001759_esquema_inicial.sql). NO se altera: esa PK es
--     el índice único que requiere el `on conflict` del RPC.
--     Se dejó constancia de la verificación en el plan
--     `documentacion/planes/mobile-control-asistencia.md`.
--   - Policy de lectura RLS para el profesor dueño del grupo de la
--     clase. La escritura NO tiene políticas: se realiza únicamente
--     a través del RPC atómico `guardar_asistencia_clase`
--     (mismo patrón que `graduaciones`).
--   - RPC `guardar_asistencia_clase`: persiste todo el conjunto de
--     presentes/ausentes de una clase en una sola transacción
--     (upsert `insert ... on conflict (clase_id, alumno_id)`),
--     validando que la clase pertenezca a un grupo del profesor y
--     que cada alumno sea alumno directo suyo.
-- ============================================================

-- ============================================================
-- 1. RLS de lectura: el profesor dueño del grupo de la clase lee
--    la asistencia de sus clases.
-- ============================================================
alter table public.asistencia enable row level security;

drop policy if exists "asistencia_select_profesor" on public.asistencia;
create policy "asistencia_select_profesor"
  on public.asistencia for select to authenticated
  using (
    exists (
      select 1
        from public.clases c
        join public.grupos g on g.id = c.grupo_id
       where c.id = asistencia.clase_id
         and g.profesor_id = auth.uid()
    )
  );

-- Sin políticas de INSERT/UPDATE/DELETE: la escritura pasa solo por
-- el RPC `guardar_asistencia_clase` (SECURITY DEFINER).

-- ============================================================
-- 2. RPC de escritura atómica de asistencia por clase.
-- ============================================================
create or replace function public.guardar_asistencia_clase(
  p_clase_id uuid,
  p_registros jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profesor uuid;
  v_es_profesor boolean;
begin
  -- La clase debe pertenecer a un grupo del profesor autenticado.
  select g.profesor_id into v_profesor
    from public.clases c
    join public.grupos g on g.id = c.grupo_id
   where c.id = p_clase_id;

  if v_profesor is null or v_profesor <> auth.uid() then
    raise exception 'No autorizado para esta clase.';
  end if;

  -- Solo un profesor puede registrar asistencia.
  select es_profesor into v_es_profesor
    from public.profiles
   where id = auth.uid();

  if coalesce(v_es_profesor, false) <> true then
    raise exception 'Solo un profesor puede registrar asistencia.';
  end if;

  -- Cada alumno listado debe ser alumno directo del profesor.
  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_registros, '[]'::jsonb)) as r
     where not public.es_alumno_directo_de(auth.uid(), (r->>'alumno_id')::uuid)
  ) then
    raise exception 'Solo se puede registrar asistencia de alumnos directos.';
  end if;

  -- Upsert atómico de todo el conjunto (no borra filas omitidas).
  insert into public.asistencia (clase_id, alumno_id, presente)
  select p_clase_id,
         (r->>'alumno_id')::uuid,
         coalesce((r->>'presente')::boolean, false)
    from jsonb_array_elements(coalesce(p_registros, '[]'::jsonb)) as r
  on conflict (clase_id, alumno_id)
    do update set presente = excluded.presente;

  return true;
end;
$$;

revoke execute on function public.guardar_asistencia_clase(uuid, jsonb) from public, anon;
grant execute on function public.guardar_asistencia_clase(uuid, jsonb) to authenticated;
