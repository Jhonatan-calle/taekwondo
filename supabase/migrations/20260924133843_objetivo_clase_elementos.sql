-- ============================================================
-- Migración: objetivo_clase_elementos
-- Proyecto: Taekwondo ITF (gestión de escuela)
-- Generada por CLI: supabase migration new objetivo_clase_elementos
-- Fecha: 2026-09-24
-- Descripción:
--   - El "objetivo" de una clase deja de ser texto libre y pasa a ser
--     1 o 2 elementos del ciclo de composición del Taekwondo ITF:
--       * movimientos_fundamentales (Gibon Dongjak)
--       * formas (Tules)
--       * accesorios (Dallyon)
--       * matsogi (Ejercicios de Combate)
--       * hosin_sul (Defensa Personal)
--   - Se agrega `objetivo_detalle` (texto, opcional) para descripciones.
--   - La columna `contenido_tuls` se elimina (su info pasa a Detalles).
--   - Migración de datos: el texto de `objetivo` + `contenido_tuls` se
--     conserva en `objetivo_detalle` antes de eliminar las columnas.
--   - `preparacion_fisica` se mantiene.
-- ============================================================

-- ============================================================
-- 1. Enum de elementos del ciclo de composición ITF.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'elemento_clase') then
    create type public.elemento_clase as enum (
      'movimientos_fundamentales',
      'formas',
      'accesorios',
      'matsogi',
      'hosin_sul'
    );
  end if;
end
$$;

-- ============================================================
-- 2. Columnas nuevas en `clases`.
-- ============================================================
alter table public.clases
  add column if not exists elementos_objetivo public.elemento_clase[],
  add column if not exists objetivo_detalle text;

-- ============================================================
-- 3. Migración de datos: preservar el texto existente en Detalles.
-- ============================================================
update public.clases
   set objetivo_detalle = nullif(
     concat_ws(
       E'\n',
       nullif(btrim(objetivo), ''),
       nullif(btrim(contenido_tuls), '')
     ),
     ''
   )
 where objetivo_detalle is null;

-- ============================================================
-- 4. Eliminar las columnas viejas.
-- ============================================================
alter table public.clases
  drop column if exists objetivo,
  drop column if exists contenido_tuls;

-- ============================================================
-- 5. Regla: 1 o 2 elementos cuando hay selección (null = fila previa).
-- ============================================================
alter table public.clases
  drop constraint if exists clases_elementos_objetivo_check;

alter table public.clases
  add constraint clases_elementos_objetivo_check
  check (
    elementos_objetivo is null
    or cardinality(elementos_objetivo) between 1 and 2
  );

-- ============================================================
-- 6. RLS: las políticas existentes no cambian (siguen operando por
--    `grupo_id` y `profesor_id`). Insert directo desde la app.
-- ============================================================
