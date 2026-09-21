-- ============================================================
-- Migración: establecer_linaje
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new establecer_linaje
-- Fecha: 2026-09-20
-- Descripción:
--   - Establecimiento del linaje (workflow Fase 2, ítem 3) con
--     confirmación del instructor/maestro: el alumno elige de una
--     lista a su futuro maestro_id y queda una SOLICITUD pendiente;
--     el instructor la acepta/rechaza desde su panel. Solo al
--     aceptar se persiste maestro_id (única vez, respetando el
--     trigger bloquear_auto_cambio_maestro con
--     set_config('app.derivacion_linaje','on',true)).
--   - La tabla `solicitudes_linaje` guarda un SNAPSHOT del nombre
--     del solicitante (patrón del proyecto, como inscripciones) para
--     que el instructor pueda listarla sin romper la privacidad en
--     cascada (RLS de profiles no le permite ver al alumno aún).
--   - Escrituras SOLO vía RPC SECURITY DEFINER: el alumno no puede
--     auto-activarse ni el instructor editar filas ajenas.
-- ============================================================

-- ============================================================
-- 1. Tabla de solicitudes de linaje
-- ============================================================
create table public.solicitudes_linaje (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  nombre_alumno text not null default '',
  estado text not null default 'pendiente', -- 'pendiente' | 'aceptada' | 'rechazada'
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  unique (alumno_id, instructor_id)
);

create index solicitudes_linaje_instructor_estado_idx
  on public.solicitudes_linaje (instructor_id, estado);

alter table public.solicitudes_linaje enable row level security;

-- SELECT: el solicitante ve sus propias solicitudes; el instructor ve
-- las que le llegaron (solo snapshot del nombre, sin datos privados).
create policy "solicitudes_linaje_select_alumno"
  on public.solicitudes_linaje for select
  to authenticated
  using (alumno_id = auth.uid());

create policy "solicitudes_linaje_select_instructor"
  on public.solicitudes_linaje for select
  to authenticated
  using (instructor_id = auth.uid());

-- Sin INSERT/UPDATE/DELETE directos: toda escritura pasa por los RPC.

-- ============================================================
-- 2. RPC: listado de instructores/maestros elegibles
--    SECURITY DEFINER para sortear la RLS en cascada; expone solo
--    id, nombre, grado y facetas (nunca datos privados).
-- ============================================================
create or replace function public.lista_instructores_linaje()
returns table (
  id uuid,
  nombre_completo text,
  grado_actual public.grado,
  es_profesor boolean,
  es_maestro boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nombre_completo, p.grado_actual, p.es_profesor, p.es_maestro
    from public.profiles p
   where (p.es_profesor = true or p.es_maestro = true)
     and p.nombre_completo <> ''
     and p.id <> auth.uid()
   order by p.nombre_completo;
$$;

revoke execute on function public.lista_instructores_linaje() from public, anon;
grant execute on function public.lista_instructores_linaje() to authenticated;

-- ============================================================
-- 3. RPC: el alumno solicita el linaje a un instructor
--    Devuelve true si queda (o ya había) una solicitud pendiente;
--    false si existe una solicitud aceptada/ya resuelta. Lanza
--    excepción ante llamados inválidos (fail fast).
-- ============================================================
create or replace function public.solicitar_linaje(p_instructor uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_maestro boolean;
  v_ya_tiene_maestro boolean;
  v_instructor_ok boolean;
  v_solicitud_id uuid;
begin
  select es_maestro, maestro_id is not null
    into v_es_maestro, v_ya_tiene_maestro
    from public.profiles where id = auth.uid();

  if v_es_maestro is null then
    raise exception 'Perfil no encontrado.';
  end if;

  -- Un Maestro raíz no establece un superior desde la app.
  if v_es_maestro then
    raise exception 'El linaje de un Maestro se define vía Service Role.';
  end if;

  if v_ya_tiene_maestro then
    raise exception 'Tu linaje ya fue establecido.';
  end if;

  if p_instructor is null or p_instructor = auth.uid() then
    raise exception 'Instructor inválido.';
  end if;

  -- El instructor debe ser profesor o maestro y estar visible.
  select (pr.es_profesor or pr.es_maestro) and pr.nombre_completo <> ''
    into v_instructor_ok
    from public.profiles pr where pr.id = p_instructor;

  if coalesce(v_instructor_ok, false) is false then
    raise exception 'Instructor inválido.';
  end if;

  -- Reutilizar una solicitud rechazada previa del mismo par (un único
  -- registro por par por el unique) o crear una nueva.
  select s.id into v_solicitud_id
    from public.solicitudes_linaje s
   where s.alumno_id = auth.uid() and s.instructor_id = p_instructor;

  if v_solicitud_id is null then
    insert into public.solicitudes_linaje (alumno_id, instructor_id, nombre_alumno)
    select pr.id, p_instructor, pr.nombre_completo
      from public.profiles pr where pr.id = auth.uid();
    return true;
  end if;

  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'pendiente'
  ) then
    return true;
  end if;

  -- Restos: aceptada o rechazada previa.
  if exists (
    select 1 from public.solicitudes_linaje s
     where s.id = v_solicitud_id and s.estado = 'aceptada'
  ) then
    return false;
  end if;

  -- Solicitud previamente rechazada: reabrirla.
  update public.solicitudes_linaje
     set estado = 'pendiente', resuelto_en = null, creado_en = now()
   where id = v_solicitud_id;
  return true;
end;
$$;

revoke execute on function public.solicitar_linaje(uuid) from public, anon;
grant execute on function public.solicitar_linaje(uuid) to authenticated;

-- ============================================================
-- 4. RPC: el instructor acepta o rechaza una solicitud de linaje.
--    Solo el instructor destino; al aceptar persiste maestro_id del
--    alumno con el flag que el trigger bloquear_auto_cambio_maestro
--    honra (una única vez, WHERE maestro_id is null).
-- ============================================================
create or replace function public.resolver_solicitud_linaje(
  p_solicitud uuid, p_resultado text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instructor uuid;
  v_alumno uuid;
  v_estado text;
begin
  select instructor_id, alumno_id, estado
    into v_instructor, v_alumno, v_estado
    from public.solicitudes_linaje where id = p_solicitud;

  if v_instructor is null then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_instructor <> auth.uid() then
    raise exception 'No está autorizado a resolver esta solicitud.';
  end if;

  if v_estado <> 'pendiente' then
    return false; -- ya resuelta
  end if;

  if p_resultado not in ('aceptada', 'rechazada') then
    raise exception 'Resultado inválido.';
  end if;

  if p_resultado = 'aceptada' then
    perform set_config('app.derivacion_linaje', 'on', true);
    update public.profiles
       set maestro_id = v_instructor
     where id = v_alumno and maestro_id is null;
  end if;

  update public.solicitudes_linaje
     set estado = p_resultado, resuelto_en = now()
   where id = p_solicitud;

  return true;
end;
$$;

revoke execute on function public.resolver_solicitud_linaje(uuid, text) from public, anon;
grant execute on function public.resolver_solicitud_linaje(uuid, text) to authenticated;