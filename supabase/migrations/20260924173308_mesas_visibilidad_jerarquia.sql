-- ============================================================
-- Migración: mesas_visibilidad_jerarquia
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new mesas_visibilidad_jerarquia
-- Fecha: 2026-09-24
-- Descripción:
--   - Las mesas de examen dejan de ser de visibilidad GLOBAL: ahora
--     las ve su DUEÑO y los SUBORDINADOS DIRECTOS del dueño.
--     Dirección: del superior hacia el subordinado (el superior NO ve
--     las mesas de sus subordinados). Sin recursividad por ahora.
--   - Postular queda restringido a: dueño o subordinado directo del
--     dueño (siempre con sus propios alumnos directos).
--   - Reusa el helper public.es_alumno_directo_de(p_profesor, p_alumno).
--   - La RPC listar_mesas_examen() es SECURITY DEFINER: hay que filtrar
--     DENTRO de la función (cambiar solo la RLS no alcanza).
--   - Referencia: documentacion/planes/mobile-mesas-visibilidad-jerarquia.md
-- ============================================================

-- ============================================================
-- 1. RLS de mesas_examen (select): dueño o subordinado directo
-- ============================================================
drop policy if exists mesas_examen_select_autenticado on public.mesas_examen;
drop policy if exists mesas_examen_select_jerarquia on public.mesas_examen;
create policy "mesas_examen_select_jerarquia"
  on public.mesas_examen for select to authenticated
  using (
    maestro_id = auth.uid()
    or public.es_alumno_directo_de(maestro_id, auth.uid())
  );

-- ============================================================
-- 2. RPC listar_mesas_examen(): mismo filtro de jerarquía
-- ============================================================
create or replace function public.listar_mesas_examen()
returns table (
  id uuid,
  maestro_id uuid,
  maestro_nombre text,
  fecha date,
  lugar text,
  estado text,
  cantidad_postulados int
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id,
         m.maestro_id,
         pr.nombre_completo,
         m.fecha,
         m.lugar,
         m.estado,
         (select count(*)::int from public.postulaciones_examen po where po.mesa_id = m.id)
    from public.mesas_examen m
    left join public.profiles pr on pr.id = m.maestro_id
   where m.maestro_id = auth.uid()
      or public.es_alumno_directo_de(m.maestro_id, auth.uid())
   order by m.fecha desc;
$$;

revoke execute on function public.listar_mesas_examen() from public;
grant execute on function public.listar_mesas_examen() to authenticated;

-- ============================================================
-- 3. RPC postular_alumno(): solo en mesas propias o del superior directo
-- ============================================================
create or replace function public.postular_alumno(
  p_mesa_id uuid,
  p_alumno_id uuid,
  p_derecho_examen numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grado_actual public.grado;
  v_grado_aspirado public.grado;
  v_orden int;
  v_postulacion_id uuid;
begin
  -- Solo un profesor puede postular.
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.es_profesor = true
  ) then
    raise exception 'Solo un profesor puede postular alumnos.';
  end if;

  -- Solo alumnos directos del profesor.
  if not public.es_alumno_directo_de(auth.uid(), p_alumno_id) then
    raise exception 'Solo se pueden postular alumnos directos.';
  end if;

  -- La mesa debe existir y estar abierta.
  if not exists (
    select 1 from public.mesas_examen m
     where m.id = p_mesa_id and m.estado = 'abierta'
  ) then
    raise exception 'La mesa no está abierta para postulaciones.';
  end if;

  -- Jerarquía: solo en mesas propias o de tu superior directo.
  if not exists (
    select 1 from public.mesas_examen m
     where m.id = p_mesa_id
       and (m.maestro_id = auth.uid()
            or public.es_alumno_directo_de(m.maestro_id, auth.uid()))
  ) then
    raise exception 'Solo podés postular en las mesas de tu superior directo.';
  end if;

  -- Grado actual real del alumno.
  select grado_actual into v_grado_actual
    from public.profiles
   where id = p_alumno_id;

  if v_grado_actual is null then
    raise exception 'El alumno no tiene grado registrado.';
  end if;

  -- Grado inmediato superior según el orden del enum.
  v_orden := array_position(
    enum_range(null::public.grado)::text[],
    v_grado_actual::text
  );

  if v_orden is null or v_orden >= array_length(enum_range(null::public.grado)::text[], 1) then
    raise exception 'El alumno ya alcanzó el grado máximo y no puede aspirar a uno superior.';
  end if;

  v_grado_aspirado := (
    enum_range(null::public.grado)::text[]
  )[v_orden + 1]::public.grado;

  if p_derecho_examen is not null and p_derecho_examen < 0 then
    raise exception 'El derecho de examen no puede ser negativo.';
  end if;

  insert into public.postulaciones_examen (
    mesa_id, alumno_id, profesor_id, grado_aspirado, derecho_examen, estado
  ) values (
    p_mesa_id, p_alumno_id, auth.uid(), v_grado_aspirado, p_derecho_examen, 'postulado'
  )
  returning id into v_postulacion_id;

  return v_postulacion_id;

exception
  when unique_violation then
    raise exception 'El alumno ya está postulado en esta mesa.';
end;
$$;

revoke execute on function public.postular_alumno(uuid, uuid, numeric) from public, anon;
grant execute on function public.postular_alumno(uuid, uuid, numeric) to authenticated;

-- ============================================================
-- 4. RLS de postulaciones_examen (insert): backstop de jerarquía
--    (la app usa la RPC, que saltea RLS; esto cubre la vía directa)
-- ============================================================
drop policy if exists postulaciones_examen_insert_profesor on public.postulaciones_examen;
create policy "postulaciones_examen_insert_profesor"
  on public.postulaciones_examen for insert to authenticated
  with check (
    profesor_id = auth.uid()
    and public.es_alumno_directo_de(auth.uid(), alumno_id)
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.es_profesor = true
    )
    and exists (
      select 1 from public.mesas_examen m
       where m.id = mesa_id
         and (m.maestro_id = auth.uid()
              or public.es_alumno_directo_de(m.maestro_id, auth.uid()))
    )
  );
