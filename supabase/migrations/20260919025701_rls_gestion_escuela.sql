-- ============================================================
-- Migración: rls_gestion_escuela
-- Proyecto: Taekwondo ITF (nuevo SRS: gestión de escuela)
-- Generada por CLI: supabase migration new rls_gestion_escuela
-- Fecha: 2026-09-19
-- Descripción:
--   - Privacidad en cascada (SRS §2): cada profesor solo ve a sus
--     alumnos directos; los superiores ven únicamente métricas
--     anonimizadas (RPC) y las excepciones de auditoría (alquileres)
--     y de mesas de examen (planilla técnica).
--   - Helpers SECURITY DEFINER para romper la recursión RLS.
--   NOTA: idempotente (drop policy if exists) para tolerar un push.
-- ============================================================

-- ============================================================
-- 1. Helpers del árbol (patrón fix_rls_arbol: SECURITY DEFINER)
-- ============================================================

-- ¿Es p_perfil descendiente (directo o no) de p_jefe en el árbol maestro_id?
create or replace function public.es_subordinado_de(p_jefe uuid, p_perfil uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with recursive arbol as (
    select id, maestro_id from public.profiles where id = p_perfil
    union all
    select pr.id, pr.maestro_id
      from public.profiles pr
      join arbol a on a.maestro_id = pr.id
  )
  select exists (select 1 from arbol where id = p_jefe);
$$;

-- ¿Es p_alumno un alumno directo (hijo en el árbol) de p_profesor?
create or replace function public.es_alumno_directo_de(p_profesor uuid, p_alumno uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_alumno and p.maestro_id = p_profesor
  );
$$;

-- Colección de descendientes directos+indirectos de un nodo.
create or replace function public.descendientes(p_ancestro uuid)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  with recursive arbol as (
    select id from public.profiles where maestro_id = p_ancestro
    union all
    select pr.id from public.profiles pr join arbol a on pr.maestro_id = a.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) from arbol;
$$;

revoke execute on function public.es_subordinado_de(uuid, uuid) from public;
grant execute on function public.es_subordinado_de(uuid, uuid) to authenticated;
revoke execute on function public.es_alumno_directo_de(uuid, uuid) from public;
grant execute on function public.es_alumno_directo_de(uuid, uuid) to authenticated;
revoke execute on function public.descendientes(uuid) from public;
grant execute on function public.descendientes(uuid) to authenticated;

-- ============================================================
-- 2. profiles: privacidad en cascada
--    Reemplaza el viejo `profiles_select_authenticated` (using true).
-- ============================================================
drop policy if exists profiles_select_authenticated on public.profiles;

-- El propio usuario siempre ve su perfil completo.
drop policy if exists profiles_select_propio on public.profiles;
create policy "profiles_select_propio"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Gestión directa (SRS §2): el profesor ve a sus alumnos directos.
drop policy if exists profiles_select_maestro_directo on public.profiles;
create policy "profiles_select_maestro_directo"
  on public.profiles for select
  to authenticated
  using (public.es_alumno_directo_de(auth.uid(), id));

-- ============================================================
-- 3. locaciones: dueño gestiona; superiores auditan (SRS §2)
-- ============================================================
drop policy if exists locaciones_select_dueño on public.locaciones;
create policy "locaciones_select_dueño"
  on public.locaciones for select to authenticated
  using (creado_por = auth.uid());

drop policy if exists locaciones_select_superior on public.locaciones;
create policy "locaciones_select_superior"
  on public.locaciones for select to authenticated
  using (public.es_subordinado_de(auth.uid(), creado_por));

drop policy if exists locaciones_insert_profesor on public.locaciones;
create policy "locaciones_insert_profesor"
  on public.locaciones for insert to authenticated
  with check (
    creado_por = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.es_profesor = true or p.es_maestro = true)
    )
  );

drop policy if exists locaciones_update_dueño on public.locaciones;
create policy "locaciones_update_dueño"
  on public.locaciones for update to authenticated
  using (creado_por = auth.uid())
  with check (creado_por = auth.uid());

drop policy if exists locaciones_delete_dueño on public.locaciones;
create policy "locaciones_delete_dueño"
  on public.locaciones for delete to authenticated
  using (creado_por = auth.uid());

-- ============================================================
-- 4. pagos_alquiler: dueño + excepción de auditoría (SRS §2)
-- ============================================================
drop policy if exists pagos_alquiler_select_dueño on public.pagos_alquiler;
create policy "pagos_alquiler_select_dueño"
  on public.pagos_alquiler for select to authenticated
  using (
    creado_por = auth.uid()
    or locacion_id in (
      select l.id from public.locaciones l where l.creado_por = auth.uid()
    )
  );

drop policy if exists pagos_alquiler_select_superior on public.pagos_alquiler;
create policy "pagos_alquiler_select_superior"
  on public.pagos_alquiler for select to authenticated
  using (
    exists (
      select 1 from public.locaciones l
      where l.id = locacion_id
        and public.es_subordinado_de(auth.uid(), l.creado_por)
    )
  );

drop policy if exists pagos_alquiler_insert_dueño on public.pagos_alquiler;
create policy "pagos_alquiler_insert_dueño"
  on public.pagos_alquiler for insert to authenticated
  with check (
    creado_por = auth.uid()
    and exists (
      select 1 from public.locaciones l
      where l.id = locacion_id and l.creado_por = auth.uid()
    )
  );

drop policy if exists pagos_alquiler_update_dueño on public.pagos_alquiler;
create policy "pagos_alquiler_update_dueño"
  on public.pagos_alquiler for update to authenticated
  using (
    exists (
      select 1 from public.locaciones l
      where l.id = locacion_id and l.creado_por = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.locaciones l
      where l.id = locacion_id and l.creado_por = auth.uid()
    )
  );

-- ============================================================
-- 5. pagos_cuota: alumno propio + profesor directo (SRS §3.5)
-- ============================================================
drop policy if exists pagos_cuota_select_alumno on public.pagos_cuota;
create policy "pagos_cuota_select_alumno"
  on public.pagos_cuota for select to authenticated
  using (alumno_id = auth.uid());

drop policy if exists pagos_cuota_select_profesor on public.pagos_cuota;
create policy "pagos_cuota_select_profesor"
  on public.pagos_cuota for select to authenticated
  using (public.es_alumno_directo_de(auth.uid(), alumno_id));

drop policy if exists pagos_cuota_insert_profesor on public.pagos_cuota;
create policy "pagos_cuota_insert_profesor"
  on public.pagos_cuota for insert to authenticated
  with check (
    creado_por = auth.uid()
    and public.es_alumno_directo_de(auth.uid(), alumno_id)
  );

drop policy if exists pagos_cuota_update_profesor on public.pagos_cuota;
create policy "pagos_cuota_update_profesor"
  on public.pagos_cuota for update to authenticated
  using (public.es_alumno_directo_de(auth.uid(), alumno_id))
  with check (public.es_alumno_directo_de(auth.uid(), alumno_id));

-- ============================================================
-- 6. mesas_examen (SRS §3.7): visibles; apertura solo de Maestros
-- ============================================================
drop policy if exists mesas_examen_select_autenticado on public.mesas_examen;
create policy "mesas_examen_select_autenticado"
  on public.mesas_examen for select to authenticated
  using (true);

drop policy if exists mesas_examen_insert_maestro on public.mesas_examen;
create policy "mesas_examen_insert_maestro"
  on public.mesas_examen for insert to authenticated
  with check (
    maestro_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.es_maestro = true
    )
  );

drop policy if exists mesas_examen_update_maestro on public.mesas_examen;
create policy "mesas_examen_update_maestro"
  on public.mesas_examen for update to authenticated
  using (maestro_id = auth.uid())
  with check (maestro_id = auth.uid());

-- ============================================================
-- 7. postulaciones_examen: alumno, postulante y examinador
-- ============================================================
drop policy if exists postulaciones_examen_select_alumno on public.postulaciones_examen;
create policy "postulaciones_examen_select_alumno"
  on public.postulaciones_examen for select to authenticated
  using (alumno_id = auth.uid());

drop policy if exists postulaciones_examen_select_profesor on public.postulaciones_examen;
create policy "postulaciones_examen_select_profesor"
  on public.postulaciones_examen for select to authenticated
  using (profesor_id = auth.uid());

drop policy if exists postulaciones_examen_select_maestro on public.postulaciones_examen;
create policy "postulaciones_examen_select_maestro"
  on public.postulaciones_examen for select to authenticated
  using (
    exists (
      select 1 from public.mesas_examen m
      where m.id = mesa_id and m.maestro_id = auth.uid()
    )
  );

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
  );

-- El profesor puede gestionar la postulación mientras esté en postulado
-- y la mesa siga abierta; los resultados se registran vía RPC.
drop policy if exists postulaciones_examen_update_profesor on public.postulaciones_examen;
create policy "postulaciones_examen_update_profesor"
  on public.postulaciones_examen for update to authenticated
  using (
    profesor_id = auth.uid()
    and estado = 'postulado'
    and exists (
      select 1 from public.mesas_examen m
      where m.id = mesa_id and m.estado = 'abierta'
    )
  )
  with check (
    profesor_id = auth.uid()
    and estado = 'postulado'
    and exists (
      select 1 from public.mesas_examen m
      where m.id = mesa_id and m.estado = 'abierta'
    )
  );

-- ============================================================
-- 8. graduaciones (historial): lectura alumno + profesor directo
--    Escritura exclusiva vía RPC registrar_resultado_examen.
-- ============================================================
drop policy if exists graduaciones_select_alumno on public.graduaciones;
create policy "graduaciones_select_alumno"
  on public.graduaciones for select to authenticated
  using (alumno_id = auth.uid());

drop policy if exists graduaciones_select_profesor on public.graduaciones;
create policy "graduaciones_select_profesor"
  on public.graduaciones for select to authenticated
  using (public.es_alumno_directo_de(auth.uid(), alumno_id));

-- ============================================================
-- 9. Dashboard de métricas (SRS §3.6): datos ANONIMIZADOS, nunca
--    personales. SECURITY DEFINER: solo agrega conteos.
-- ============================================================
create or replace function public.metricas_dashboard(
  p_vista text default 'consolidada',
  p_instructor uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_json jsonb;
begin
  if p_vista = 'especifica' then
    if p_instructor is null then
      raise exception 'Se requiere un instructor para la vista especifica.';
    end if;
    -- El instructor debe ser el llamador o su subordinado.
    if auth.uid() <> p_instructor
       and not (p_instructor = any(public.descendientes(auth.uid()))) then
      raise exception 'No autorizado para la vista especifica.';
    end if;
    v_ids := public.descendientes(p_instructor);
  else
    v_ids := public.descendientes(auth.uid());
  end if;

  select jsonb_build_object(
    'total', (select count(*) from unnest(v_ids)),
    'por_genero',
      (select coalesce(jsonb_object_agg(g, n), '{}'::jsonb)
         from (select p.genero::text g, count(*) n
                 from unnest(v_ids) u
                 join public.profiles p on p.id = u
                where p.genero is not null
                group by p.genero) gen),
    'por_rango_edad',
      (select coalesce(jsonb_object_agg(rango, n), '{}'::jsonb)
         from (select case
                 when e.edad < 8 then '0-7'
                 when e.edad between 8 and 11 then '8-11'
                 when e.edad between 12 and 14 then '12-14'
                 when e.edad between 15 and 17 then '15-17'
                 when e.edad between 18 and 30 then '18-30'
                 else '30+'
               end as rango,
               count(*) n
               from (
                 select extract(year from age(p.fecha_nacimiento))::int as edad
                   from unnest(v_ids) u
                   join public.profiles p on p.id = u
                  where p.fecha_nacimiento is not null
               ) e
              group by 1) rng),
    'por_grado',
      (select coalesce(jsonb_object_agg(g::text, n), '{}'::jsonb)
         from (select p.grado_actual g, count(*) n
                 from unnest(v_ids) u
                 join public.profiles p on p.id = u
                where p.grado_actual is not null
                group by p.grado_actual) grad)
  ) into v_json;

  return v_json;
end;
$$;

revoke execute on function public.metricas_dashboard(text, uuid) from public;
grant execute on function public.metricas_dashboard(text, uuid) to authenticated;

-- ============================================================
-- 10. Excepción de mesas de examen (SRS §2): planilla con datos
--     técnicos solo para el maestro examinador de la mesa.
-- ============================================================
create or replace function public.planilla_mesa_examen(p_mesa uuid)
returns table (
  postulacion_id uuid,
  alumno_id uuid,
  nombre_completo text,
  edad int,
  peso numeric,
  grado_actual public.grado,
  grado_aspirado public.grado
)
language sql
security definer
set search_path = public
stable
as $$
  select po.id, po.alumno_id, pr.nombre_completo,
         extract(year from age(pr.fecha_nacimiento))::int,
         pr.peso_kg,
         pr.grado_actual,
         po.grado_aspirado
    from public.postulaciones_examen po
    join public.mesas_examen m on m.id = po.mesa_id
    join public.profiles pr on pr.id = po.alumno_id
   where po.mesa_id = p_mesa
     and m.maestro_id = auth.uid()
     and exists (
       select 1 from public.profiles x
       where x.id = auth.uid() and x.es_maestro = true
     );
$$;

revoke execute on function public.planilla_mesa_examen(uuid) from public;
grant execute on function public.planilla_mesa_examen(uuid) to authenticated;

-- ============================================================
-- 11. Storage: comprobantes (alquileres) — bucket privado
--     Sube el dueño; auditación de superiores (SRS §2).
--     Se usa la columna `owner` (uuid): `owner_id` es text en el
--     schema actual de storage.
-- ============================================================
drop policy if exists comprobantes_upload_propio on storage.objects;
create policy "comprobantes_upload_propio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and owner = auth.uid());

drop policy if exists comprobantes_select_propio on storage.objects;
create policy "comprobantes_select_propio"
  on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and owner = auth.uid());

drop policy if exists comprobantes_select_superior on storage.objects;
create policy "comprobantes_select_superior"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and public.es_subordinado_de(auth.uid(), owner)
  );

drop policy if exists comprobantes_delete_propio on storage.objects;
create policy "comprobantes_delete_propio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and owner = auth.uid());