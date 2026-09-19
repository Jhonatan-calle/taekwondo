-- ============================================================
-- Migración: doble_categoria
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new doble_categoria
-- Fecha: 2026-09-17
-- Descripción: habilita la doble categoría en la edición manual (SRS B.2.3):
--   un participante puede aparecer en varias categorías, pero a lo sumo una vez
--   DENTRO de cada categoría. Se actualiza el RPC guardar_llaves_manuales con
--   defensa en profundidad: rechazar participantes repetidos en la misma categoría
--   y enfrentamientos de un participante contra sí mismo (a = b).
-- ============================================================

create or replace function public.guardar_llaves_manuales(
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
  pid uuid;
begin
  -- 1. Solo el organizador (dueño) del torneo puede modificar sus llaves.
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.organizador_id = auth.uid()
  ) then
    raise exception 'No autorizado para modificar las llaves de este torneo.';
  end if;

  -- 2. Solo en etapa de armado (en_vivo/finalizado se bloquea en la UI, y aquí también).
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.estado = 'armado_llaves'
  ) then
    raise exception 'El torneo no está en etapa de armado de llaves.';
  end if;

  -- 3. Defensa en profundidad: todo participante referenciado debe ser una
  --    inscripción CONFIRMADA del torneo. Las pendientes jamás entran a las llaves.
  --    Doble categoría: un participante puede repetirse entre categorías distintas,
  --    pero jamás dentro de la misma categoría (ni enfrentarse a sí mismo).
  for c in select value from jsonb_array_elements(p_categorias)
  loop
    -- 3.1 Sin auto-enfrentamiento (a = b) en un mismo enfrentamiento.
    if exists (
      select 1
      from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb)) as f
      where nullif(f->>'a', '') is not null
        and nullif(f->>'b', '') is not null
        and f->>'a' = f->>'b'
    ) then
      raise exception 'Un participante no puede enfrentarse a sí mismo en esta categoría.';
    end if;

    -- 3.2 Sin participantes repetidos dentro de la misma categoría.
    if exists (
      select 1
      from (
        select id, count(*) as n
        from (
          select f1.value->>'a' as id
          from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb)) as f1
          union all
          select f2.value->>'b' as id
          from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb)) as f2
        ) as t
        where id is not null and id <> ''
        group by id
        having count(*) > 1
      ) as dup
    ) then
      raise exception 'Un participante no puede repetirse en la misma categoría.';
    end if;

    -- 3.3 Toda aparición debe corresponder a una inscripción confirmada del torneo.
    for f in select value from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb))
    loop
      pid := nullif(f->>'a', '')::uuid;
      if pid is not null and not exists (
        select 1 from public.inscripciones i
        where i.id = pid and i.torneo_id = p_torneo_id and i.estado = 'confirmado'
      ) then
        raise exception 'Inscripción no confirmada en este torneo.';
      end if;

      pid := nullif(f->>'b', '')::uuid;
      if pid is not null and not exists (
        select 1 from public.inscripciones i
        where i.id = pid and i.torneo_id = p_torneo_id and i.estado = 'confirmado'
      ) then
        raise exception 'Inscripción no confirmada en este torneo.';
      end if;
    end loop;
  end loop;

  -- 4. Reemplazo atómico: delete categorías (cascade a llaves/enfrentamientos)
  --    y reconstrucción desde el payload. El estado del torneo no cambia.
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

    for f in select value from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb))
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
end;
$$;