-- ============================================================
-- Migración: motor_emparejamiento
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new motor_emparejamiento
-- Fecha: 2026-09-16
-- Descripción: RLS de lectura (organizador) para categorias/llaves/enfrentamientos,
--   UPDATE de torneo para el organizador y RPC atómico generar_llaves que persiste
--   el resultado del motor de emparejamiento (Node/TS) y pasa el torneo a 'armado_llaves'.
-- ============================================================

-- 1. SELECT de llaves del torneo habilitado para su organizador.
--    NOTA: las columnas de la tabla principal se califican con el alias correcto
--    (c.id, l.id) para evitar ambigüedad en PostgreSQL al hacer JOIN con la misma columna.
create policy "categorias_select_organizador"
  on public.categorias for select
  to authenticated
  using (
    auth.uid() in (select organizador_id from public.torneos where id = torneo_id)
  );

create policy "llaves_select_organizador"
  on public.llaves for select
  to authenticated
  using (
    auth.uid() in (
      select t.organizador_id
      from public.torneos t
      join public.categorias c on c.torneo_id = t.id
      where c.id = llaves.categoria_id
    )
  );

create policy "enfrentamientos_select_organizador"
  on public.enfrentamientos for select
  to authenticated
  using (
    auth.uid() in (
      select t.organizador_id
      from public.torneos t
      join public.categorias c on c.torneo_id = t.id
      join public.llaves l on l.categoria_id = c.id
      where l.id = enfrentamientos.llave_id
    )
  );

-- 2. El organizador puede actualizar su propio torneo (p. ej. transición de estado).
create policy "torneos_update_organizador"
  on public.torneos for update
  to authenticated
  using (auth.uid() = organizador_id)
  with check (auth.uid() = organizador_id);

-- 3. RPC atómico que persiste el armado de llaves (SECURITY DEFINER).
--    Recibe el payload jsonb calculado por el motor TypeScript:
--    { categorias: [{ nombre, rango_min, rango_max_especial, edad_min, edad_max,
--                    enfrentamientos: [{ a, b }] }] }
--    Valida que auth.uid() sea el organizador, resetea categorías previas (cascade
--    a llaves/enfrentamientos) y reconstruye en una única transacción.
--    El torneo pasa a estado 'armado_llaves'.
create or replace function public.generar_llaves(
  p_torneo_id uuid,
  p_categorias jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb;
  cat_id uuid;
  llave_id uuid;
  f jsonb;
begin
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.organizador_id = auth.uid()
  ) then
    raise exception 'No autorizado para armar las llaves de este torneo.';
  end if;

  delete from public.categorias where torneo_id = p_torneo_id;

  for c in select value from jsonb_array_elements(p_categorias)
  loop
    insert into public.categorias (torneo_id, nombre, rango_min, rango_max_especial, edad_min, edad_max)
    values (
      p_torneo_id,
      c->>'nombre',
      nullif(c->>'rango_min', '')::public.grado_gup,
      nullif(c->>'rango_max_especial', ''),
      nullif(c->>'edad_min', '')::int,
      nullif(c->>'edad_max', '')::int
    )
    returning id into cat_id;

    insert into public.llaves (categoria_id, nombre_ronda, orden)
    values (cat_id, 'Primera ronda', 0)
    returning id into llave_id;

    for f in select value from jsonb_array_elements(c->'enfrentamientos')
    loop
      insert into public.enfrentamientos (
        llave_id, participante_a, participante_b, tipo, estado, resultados
      )
      values (
        llave_id,
        nullif(f->>'a', '')::uuid,
        nullif(f->>'b', '')::uuid,
        'combate',
        'pendiente',
        '{}'::jsonb
      );
    end loop;
  end loop;

  update public.torneos
    set estado = 'armado_llaves'
    where id = p_torneo_id;
end;
$$;