-- ============================================================
-- Migración: gestion_en_vivo
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new gestion_en_vivo
-- Fecha: 2026-09-17
-- Descripción: Gestión en vivo del día del torneo (SRS B.3):
--   - enfrentamientos.orden (slot dentro de la ronda) + unique (llave_id, orden).
--   - llaves.modalidad ('combate'|'tul'): las formas arman una cadena propia.
--   - Tabla resultados_torneo (historial competitivo por participante/modalidad).
--   - RLS jurados: SELECT de categorias/llaves/enfrentamientos/inscripciones(confirmado)
--     y políticas de jurados_torneo (SELECT para dueño y jurados; INSERT/DELETE dueño).
--   - RPCs: sincronizar_resultado_en_vivo (upsert incremental, preserva ids para
--     Realtime), marcar_en_curso, crear_llave_tul, finalizar_torneo (historial).
--   - Actualización de generar_llaves y guardar_llaves_manuales: escriben 'orden'.
--   - Realtime publication: enfrentamientos, llaves, torneos.
-- ============================================================

-- ============================================================
-- 1. enfrentamientos: posición dentro de la ronda (slot 0..n-1)
-- ============================================================
alter table public.enfrentamientos
  add column orden int not null default 0;

-- Backfill: orden = índice dentro de cada llave (por id, ordenación estable del armado).
with ordenados as (
  select id, row_number() over (partition by llave_id order by id) - 1 as rn
  from public.enfrentamientos
)
update public.enfrentamientos e
set orden = o.rn
from ordenados o
where e.id = o.id;

-- Un slot por (llave, orden): evita duplicados por concurrencia de jurados.
alter table public.enfrentamientos
  add constraint enfrentamientos_llave_orden_key unique (llave_id, orden);

-- ============================================================
-- 2. llaves: modalidad de la cadena (combate | tul)
-- ============================================================
alter table public.llaves
  add column modalidad text not null default 'combate'
  constraint llaves_modalidad_check check (modalidad in ('combate', 'tul'));

-- ============================================================
-- 3. Historial competitivo por participante (SRS B.3)
-- ============================================================
create table public.resultados_torneo (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  modalidad text not null check (modalidad in ('combate', 'tul')),
  posicion int check (posicion between 1 and 3), -- 3 = compartido (semifinalistas)
  rondas_alcanzadas int not null default 0,
  ganadas int not null default 0,
  perdidas int not null default 0,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  unique (torneo_id, inscripcion_id, categoria_id, modalidad)
);

alter table public.resultados_torneo enable row level security;

-- ============================================================
-- 4. RLS jurados (SELECT). El jurado solo ve confirmados de sus torneos.
-- ============================================================
create policy "categorias_select_jurado"
  on public.categorias for select
  to authenticated
  using (
    auth.uid() in (
      select jurado_id from public.jurados_torneo where torneo_id = categorias.torneo_id
    )
  );

create policy "llaves_select_jurado"
  on public.llaves for select
  to authenticated
  using (
    auth.uid() in (
      select jt.jurado_id
      from public.jurados_torneo jt
      join public.categorias c on c.torneo_id = jt.torneo_id
      where c.id = llaves.categoria_id
    )
  );

create policy "enfrentamientos_select_jurado"
  on public.enfrentamientos for select
  to authenticated
  using (
    auth.uid() in (
      select jt.jurado_id
      from public.jurados_torneo jt
      join public.categorias c on c.torneo_id = jt.torneo_id
      join public.llaves l on l.categoria_id = c.id
      where l.id = enfrentamientos.llave_id
    )
  );

-- El jurado lee inscripciones CONFIRMADAS de su torneo (para resolver nombres).
-- Los pendientes/rechazados jamás llegan (regla vigente de privacidad).
create policy "inscripciones_select_jurado"
  on public.inscripciones for select
  to authenticated
  using (
    estado = 'confirmado'
    and auth.uid() in (
      select jurado_id from public.jurados_torneo where torneo_id = inscripciones.torneo_id
    )
  );

-- 4.1 jurados_torneo: dueño gestiona; jurados se leen a sí mismos.
create policy "jurados_torneo_select"
  on public.jurados_torneo for select
  to authenticated
  using (
    auth.uid() = jurado_id
    or auth.uid() = (select organizador_id from public.torneos where id = torneo_id)
  );

create policy "jurados_torneo_insert_organizador"
  on public.jurados_torneo for insert
  to authenticated
  with check (
    auth.uid() = (select organizador_id from public.torneos where id = torneo_id)
  );

create policy "jurados_torneo_delete_organizador"
  on public.jurados_torneo for delete
  to authenticated
  using (
    auth.uid() = (select organizador_id from public.torneos where id = torneo_id)
  );

-- 4.2 resultados_torneo: organizador + el propio alumno (historial futuro).
create policy "resultados_torneo_select_organizador"
  on public.resultados_torneo for select
  to authenticated
  using (
    auth.uid() = (select organizador_id from public.torneos where id = torneo_id)
  );

create policy "resultados_torneo_select_alumno"
  on public.resultados_torneo for select
  to authenticated
  using (
    auth.uid() = (select alumno_id from public.inscripciones where id = inscripcion_id)
  );

-- ============================================================
-- 5. RPC: registro de resultado + avance de ronda (upsert incremental)
--    Preserva los ids de enfrentamientos/llaves (clave para Realtime: quien
--    suscribe por llave_id recibe los eventos sin perder referencias).
-- ============================================================
create or replace function public.sincronizar_resultado_en_vivo(
  p_torneo_id uuid,
  p_enfrentamiento uuid,
  p_ganador uuid,
  p_resultados jsonb,
  p_rondas jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  fe jsonb;
  llave_id uuid;
  ef_id uuid;
  ef_modalidad text;
begin
  -- 1. Solo organizador o jurado asignado del torneo, en estado en_vivo.
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.estado = 'en_vivo'
      and (auth.uid() = t.organizador_id
        or exists (
          select 1 from public.jurados_torneo jt
          where jt.torneo_id = t.id and jt.jurado_id = auth.uid()
        ))
  ) then
    raise exception 'No autorizado para cargar resultados en este torneo.';
  end if;

  -- 2. El enfrentamiento debe pertenecer al torneo y no estar finalizado.
  select l.modalidad into ef_modalidad
  from public.enfrentamientos ef
  join public.llaves l on l.id = ef.llave_id
  join public.categorias c on c.id = l.categoria_id
  where ef.id = p_enfrentamiento and c.torneo_id = p_torneo_id and ef.estado in ('pendiente', 'en_curso');
  if ef_modalidad is null then
    raise exception 'El enfrentamiento no está disponible para cargar resultados.';
  end if;

  -- 3. Modalidad coherente entre la llave y el resultado.
  if coalesce(p_resultados->>'modalidad', '') <> ef_modalidad then
    raise exception 'La modalidad del resultado no coincide con la llave.';
  end if;

  -- 4. Ganador explícito y obligatorio: debe ser uno de los presentes (a o b).
  --    Un empate numérico se resuelve por fallo de jueces; jamás bloqueamos la llave.
  if p_ganador is null or not exists (
    select 1 from public.enfrentamientos ef
    where ef.id = p_enfrentamiento
      and (p_ganador = ef.participante_a or p_ganador = ef.participante_b)
  ) then
    raise exception 'El ganador debe ser uno de los competidores del enfrentamiento.';
  end if;

  -- 5. Finalizar el enfrentamiento (se conserva el id: los suscriptores lo reciben).
  update public.enfrentamientos
    set estado = 'finalizado', ganador_id = p_ganador, resultados = p_resultados
    where id = p_enfrentamiento;

  -- 6. Reconciliación incremental de la ronda siguiente calculada por TS.
  for r in select value from jsonb_array_elements(coalesce(p_rondas, '[]'::jsonb))
  loop
    -- 6.1 La categoría debe pertenecer al torneo.
    if not exists (
      select 1 from public.categorias c
      where c.id = (r->>'categoria_id')::uuid and c.torneo_id = p_torneo_id
    ) then
      raise exception 'Categoría inválida en el avance.';
    end if;

    -- 6.2 Upsert de la llave (ronda) por (categoria_id, modalidad, orden).
    select id into llave_id
    from public.llaves
    where categoria_id = (r->>'categoria_id')::uuid
      and modalidad = r->>'modalidad'
      and orden = coalesce((r->>'orden')::int, 0);

    if llave_id is null then
      insert into public.llaves (categoria_id, nombre_ronda, orden, modalidad)
      values (
        (r->>'categoria_id')::uuid,
        coalesce(r->>'nombre_ronda', 'Ronda siguiente'),
        coalesce((r->>'orden')::int, 0),
        r->>'modalidad'
      )
      returning id into llave_id;
    end if;

    -- 6.3 Upsert de cada enfrentamiento por (llave_id, orden). Se llena el lado
    --     libre con coalesce (nunca se pisa un participante ya conocido).
    for fe in select value from jsonb_array_elements(coalesce(r->'enfrentamientos', '[]'::jsonb))
    loop
      insert into public.enfrentamientos (
        llave_id, participante_a, participante_b, tipo, estado, resultados, orden
      )
      values (
        llave_id,
        nullif(fe->>'a', '')::uuid,
        nullif(fe->>'b', '')::uuid,
        r->>'modalidad',
        'pendiente',
        '{}'::jsonb,
        coalesce((fe->>'orden')::int, 0)
      )
      on conflict (llave_id, orden) do update set
        participante_a = coalesce(public.enfrentamientos.participante_a, excluded.participante_a),
        participante_b = coalesce(public.enfrentamientos.participante_b, excluded.participante_b);
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- 6. RPC: marcar un enfrentamiento como en curso (jurado/organizador)
-- ============================================================
create or replace function public.marcar_en_curso(p_enfrentamiento uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.enfrentamientos ef
    join public.llaves l on l.id = ef.llave_id
    join public.categorias c on c.id = l.categoria_id
    join public.torneos t on t.id = c.torneo_id
    where ef.id = p_enfrentamiento and t.estado = 'en_vivo'
      and (auth.uid() = t.organizador_id or exists (
        select 1 from public.jurados_torneo jt
        where jt.torneo_id = t.id and jt.jurado_id = auth.uid()
      ))
  ) then
    raise exception 'No autorizado para iniciar este enfrentamiento.';
  end if;

  update public.enfrentamientos set estado = 'en_curso' where id = p_enfrentamiento;
end;
$$;

-- ============================================================
-- 7. RPC: armar la llave de Formas (tul) por categoría (organizador)
--    Emparejamiento por pares consecutivos; impar → bye.
-- ============================================================
create or replace function public.crear_llave_tul(
  p_torneo_id uuid,
  p_categoria_id uuid,
  p_participantes uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p uuid;
  llave_id uuid;
  i int := 0;
  paciente uuid;
begin
  -- 1. Solo el organizador, en etapa de armado.
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.organizador_id = auth.uid()
      and t.estado = 'armado_llaves'
  ) then
    raise exception 'La llave de Formas solo puede crearse en la etapa de armado.';
  end if;

  -- 2. La categoría pertenece al torneo.
  if not exists (
    select 1 from public.categorias c
    where c.id = p_categoria_id and c.torneo_id = p_torneo_id
  ) then
    raise exception 'Categoría no válida para este torneo.';
  end if;

  -- 3. Defensa: todos los participantes son confirmados del torneo, sin repetidos.
  foreach p in array p_participantes
  loop
    if not exists (
      select 1 from public.inscripciones i
      where i.id = p and i.torneo_id = p_torneo_id and i.estado = 'confirmado'
    ) then
      raise exception 'Participante no confirmado en este torneo.';
    end if;
    if exists (
      select 1 from unnest(p_participantes) as x(xv) where x.xv = p
      group by x.xv having count(*) > 1
    ) then
      raise exception 'Participante repetido en la llave de Formas.';
    end if;
  end loop;

  -- 4. Una sola llave de Formas por categoría (modalidad tul, orden 0).
  if exists (
    select 1 from public.llaves
    where categoria_id = p_categoria_id and modalidad = 'tul' and orden = 0
  ) then
    raise exception 'La llave de Formas de esta categoría ya fue creada.';
  end if;

  insert into public.llaves (categoria_id, nombre_ronda, orden, modalidad)
  values (p_categoria_id, 'Formas', 0, 'tul')
  returning id into llave_id;

  -- 5. Pares consecutivos (2i, 2i+1); impar → bye en el último enfrentamiento.
  while i < cardinality(p_participantes)
  loop
    paciente := p_participantes[i + 1];
    insert into public.enfrentamientos (
      llave_id, participante_a, participante_b, tipo, estado, resultados, orden
    )
    values (
      llave_id,
      paciente,
      case when i + 2 <= cardinality(p_participantes)
        then p_participantes[i + 2] end,
      'tul',
      'pendiente',
      '{}'::jsonb,
      i / 2
    );
    i := i + 2;
  end loop;
end;
$$;

-- ============================================================
-- 8. RPC: finalizar el torneo y persistir el historial (idempotente)
-- ============================================================
create or replace function public.finalizar_torneo(
  p_torneo_id uuid,
  p_historial jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h jsonb;
begin
  -- 1. Solo el organizador y en estado en_vivo.
  if not exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id and t.organizador_id = auth.uid() and t.estado = 'en_vivo'
  ) then
    raise exception 'No autorizado para finalizar este torneo.';
  end if;

  -- 2. Reemplazo idempotente del historial del torneo.
  delete from public.resultados_torneo where torneo_id = p_torneo_id;

  for h in select value from jsonb_array_elements(coalesce(p_historial, '[]'::jsonb))
  loop
    insert into public.resultados_torneo (
      torneo_id, categoria_id, inscripcion_id, modalidad, posicion,
      rondas_alcanzadas, ganadas, perdidas, detalle
    )
    values (
      p_torneo_id,
      (h->>'categoria_id')::uuid,
      (h->>'inscripcion_id')::uuid,
      h->>'modalidad',
      nullif(h->>'posicion', '')::int,
      coalesce((h->>'rondas_alcanzadas')::int, 0),
      coalesce((h->>'ganadas')::int, 0),
      coalesce((h->>'perdidas')::int, 0),
      coalesce(h->'detalle', '{}'::jsonb)
    );
  end loop;

  update public.torneos set estado = 'finalizado' where id = p_torneo_id;
end;
$$;

-- ============================================================
-- 9. Actualizar los RPCs previos para escribir enfrentamientos.orden
--    (sin cambiar el contrato jsonb: la posición = índice del arreglo).
-- ============================================================
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
  i int;
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

    i := 0;
    for f in select value from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb))
    loop
      insert into public.enfrentamientos (
        llave_id, participante_a, participante_b, tipo, estado, resultados, orden
      )
      values (
        llave_id,
        nullif(f->>'a', '')::uuid,
        nullif(f->>'b', '')::uuid,
        'combate',
        'pendiente',
        '{}'::jsonb,
        i
      );
      i := i + 1;
    end loop;
  end loop;

  update public.torneos
    set estado = 'armado_llaves'
    where id = p_torneo_id;
end;
$$;

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
  i int;
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

  -- 3. Defensa en profundidad: confirmados solamente + idi del editor (sin repetidos
  --    dentro de la misma categoría ni auto-enfrentamientos).
  for c in select value from jsonb_array_elements(p_categorias)
  loop
    -- 3.1 Sin auto-enfrentamiento (a = b) en un mismo enfrentamiento.
    if exists (
      select 1
      from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb)) as fe
      where nullif(fe->>'a', '') is not null
        and nullif(fe->>'b', '') is not null
        and fe->>'a' = fe->>'b'
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

    i := 0;
    for f in select value from jsonb_array_elements(coalesce(c->'enfrentamientos', '[]'::jsonb))
    loop
      insert into public.enfrentamientos (
        llave_id, participante_a, participante_b, tipo, estado, resultados, orden
      )
      values (
        llave_id,
        nullif(f->>'a', '')::uuid,
        nullif(f->>'b', '')::uuid,
        'combate',
        'pendiente',
        '{}'::jsonb,
        i
      );
      i := i + 1;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- 10. Realtime publication (postgres_changes filtrado por RLS).
--     Idempotente: si la tabla ya forma parte, no rompe la migración.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.enfrentamientos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.llaves;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.torneos;
exception when duplicate_object then null;
end $$;