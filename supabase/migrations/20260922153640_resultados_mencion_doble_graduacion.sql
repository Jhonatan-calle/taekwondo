-- ============================================================
-- Migración: resultados_mencion_doble_graduacion
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 7 ítems 3 y 4)
-- Generada por CLI: npx supabase migration new resultados_mencion_doble_graduacion
-- Fecha: 2026-09-22
-- Descripción:
--   - Nuevos desenlaces del examen (SRS §3.7, Reglas §4): además de
--     aprobado/desaprobado/ausente, el maestro examinador puede marcar
--     "mención especial" y "doble graduación" (se salta un cinturón).
--   - La doble graduación solo aplica si el grado ACTUAL está entre
--     `blanco` y `azul_punta_roja` (el nuevo grado es +2; tope
--     `rojo_punta_negra`). De ahí en adelante el máximo es mención especial.
--   - Se reeemplaza la firma del RPC `registrar_resultado_examen` (ahora con
--     las dos banderas) y se documenta la sobreescritura de `grado_aspirado`.
--   - Referencia: documentacion/planes/mobile-planilla-evaluacion.md
-- ============================================================

-- ============================================================
-- 1. Banderas de evaluación en postulaciones y graduaciones
-- ============================================================
alter table public.postulaciones_examen
  add column mencion_especial boolean not null default false,
  add column promocion_doble boolean not null default false;

alter table public.graduaciones
  add column mencion_especial boolean not null default false,
  add column promocion_doble boolean not null default false;

-- Decisión de diseño (documentada en databaseModel.md y SRS §3.7):
-- `grado_aspirado` = +1 mientras la postulación está `postulado`. Al evaluar,
-- el RPC lo sobreescribe con el grado final OTORGADO (+1 aprobado simple,
-- +2 si hay doble graduación). La fuente histórica sigue siendo `graduaciones`.
comment on column public.postulaciones_examen.grado_aspirado is
  'Grado al que aspira el alumno (+1) mientras la postulación está "postulado". Al evaluar, registrar_resultado_examen lo sobreescribe con el grado final OTORGADO (+1 aprobado simple, +2 doble graduación). El historial canónico es graduaciones.grado_nuevo.';

-- ============================================================
-- 2. RPC: registro de resultado de examen (SECURITY DEFINER)
--    - Se elimina la firma anterior de dos argumentos para no dejar
--      sobrecargas ambiguas con los defaults.
--    - Valida faceta de maestro + dueño de la mesa + estado `postulado`.
--    - aprobado → graduaciones + ascenso automático en profiles.grado_actual
--      (escritura del sistema vía `app.aprobacion_examen`).
-- ============================================================
drop function if exists public.registrar_resultado_examen(uuid, text);

create or replace function public.registrar_resultado_examen(
  p_postulacion uuid,
  p_resultado text,
  p_mencion_especial boolean default false,
  p_promocion_doble boolean default false
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
  v_grado_actual public.grado;
  v_grado_nuevo public.grado;
  v_orden int;
  v_orden_tope int;
  v_total int;
begin
  if p_resultado not in ('aprobado', 'desaprobado', 'ausente') then
    raise exception 'Resultado de examen invalido.';
  end if;

  -- La mención y la doble graduación solo acompañan a un examen aprobado.
  if (p_mencion_especial or p_promocion_doble) and p_resultado <> 'aprobado' then
    raise exception 'La mención especial y la doble graduación solo aplican a un examen aprobado.';
  end if;

  select p.mesa_id, m.maestro_id, p.alumno_id, p.estado
    into v_mesa, v_maestro, v_alumno, v_estado
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
    select grado_actual into v_grado_actual
      from public.profiles
     where id = v_alumno;

    if v_grado_actual is null then
      raise exception 'El alumno no tiene grado registrado.';
    end if;

    v_total := array_length(enum_range(null::public.grado)::text[], 1);
    v_orden := array_position(enum_range(null::public.grado)::text[], v_grado_actual::text);
    v_orden_tope := array_position(enum_range(null::public.grado)::text[], 'azul_punta_roja');

    if v_orden is null then
      raise exception 'Grado actual invalido.';
    end if;

    -- Grado final: +1 por defecto, +2 si hay doble graduación.
    if p_promocion_doble then
      if v_orden > v_orden_tope then
        raise exception 'La doble graduación solo aplica desde blanco hasta azul punta roja.';
      end if;
      if v_orden + 2 > v_total then
        raise exception 'No existe un grado suficiente para la doble graduación.';
      end if;
      v_grado_nuevo := (enum_range(null::public.grado)::text[])[v_orden + 2]::public.grado;
    else
      if v_orden + 1 > v_total then
        raise exception 'El alumno ya alcanzó el grado máximo.';
      end if;
      v_grado_nuevo := (enum_range(null::public.grado)::text[])[v_orden + 1]::public.grado;
    end if;

    -- Escritura del sistema: habilita el salto del blindaje de grado.
    perform set_config('app.aprobacion_examen', 'on', true);

    update public.postulaciones_examen
       set estado = 'aprobado',
           evaluado_por = auth.uid(),
           evaluado_en = now(),
           mencion_especial = p_mencion_especial,
           promocion_doble = p_promocion_doble,
           -- Sobreescritura deliberada: pasa a ser el grado OTORGADO.
           grado_aspirado = v_grado_nuevo
     where id = p_postulacion;

    insert into public.graduaciones
      (alumno_id, sinodal_id, mesa_id, grado_anterior, grado_nuevo, resultado,
       mencion_especial, promocion_doble, examinado_en)
    values (
      v_alumno,
      auth.uid(),
      v_mesa,
      v_grado_actual,
      v_grado_nuevo,
      'aprobado',
      p_mencion_especial,
      p_promocion_doble,
      now()
    );

    update public.profiles
       set grado_actual = v_grado_nuevo, grados_verificados = true
     where id = v_alumno;
  else
    update public.postulaciones_examen
       set estado = p_resultado,
           evaluado_por = auth.uid(),
           evaluado_en = now(),
           mencion_especial = false,
           promocion_doble = false
     where id = p_postulacion;
  end if;

  return true;
end;
$$;

revoke execute on function public.registrar_resultado_examen(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.registrar_resultado_examen(uuid, text, boolean, boolean) to authenticated;
