-- ============================================================
-- Migración: clases_politicas_rls
-- Proyecto: Taekwondo ITF (gestión de escuela, Fase 4 ítem 3)
-- Generada por CLI: supabase migration new clases_politicas_rls
-- Fecha: 2026-09-21
-- Descripción:
--   - Políticas de seguridad RLS para la tabla `clases`.
--   - Permite al profesor ver, crear, actualizar y eliminar
--     sesiones de entrenamiento (clases) correspondientes
--     exclusivamente a sus propios grupos (`profesor_id = auth.uid()`).
-- ============================================================

-- Asegurar RLS en public.clases
alter table public.clases enable row level security;

-- 1. SELECT: Profesor lee las clases de sus grupos
drop policy if exists "clases_select_profesor" on public.clases;
create policy "clases_select_profesor"
  on public.clases for select to authenticated
  using (
    exists (
      select 1 from public.grupos g
       where g.id = grupo_id
         and g.profesor_id = auth.uid()
    )
  );

-- 2. INSERT: Solo profesores autorizados dueños del grupo
drop policy if exists "clases_insert_profesor" on public.clases;
create policy "clases_insert_profesor"
  on public.clases for insert to authenticated
  with check (
    exists (
      select 1 from public.grupos g
       where g.id = grupo_id
         and g.profesor_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.es_profesor = true
    )
  );

-- 3. UPDATE: El profesor dueño del grupo puede actualizar la clase
drop policy if exists "clases_update_profesor" on public.clases;
create policy "clases_update_profesor"
  on public.clases for update to authenticated
  using (
    exists (
      select 1 from public.grupos g
       where g.id = grupo_id
         and g.profesor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.grupos g
       where g.id = grupo_id
         and g.profesor_id = auth.uid()
    )
  );

-- 4. DELETE: El profesor dueño del grupo puede eliminar la clase
drop policy if exists "clases_delete_profesor" on public.clases;
create policy "clases_delete_profesor"
  on public.clases for delete to authenticated
  using (
    exists (
      select 1 from public.grupos g
       where g.id = grupo_id
         and g.profesor_id = auth.uid()
    )
  );

-- Índice de soporte para consultas cronológicas por grupo
create index if not exists clases_grupo_fecha_idx
  on public.clases (grupo_id, fecha desc);
