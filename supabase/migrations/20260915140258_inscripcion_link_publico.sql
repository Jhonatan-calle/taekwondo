-- ============================================================
-- Migración: inscripcion_link_publico
-- Proyecto: Taekwondo ITF (MVP Módulo de Torneos)
-- Generada por CLI: npx supabase migration new inscripcion_link_publico
-- Fecha: 2026-09-15
-- ============================================================

-- link_token auto-generado (link secreto de inscripción `/t/<token>`).
alter table public.torneos alter column link_token set default gen_random_uuid()::text;

-- Alta de torneos: solo profesores (faceta es_profesor) pueden crear torneos.
-- Consistente con "los alumnos tienen terminantemente prohibido crear/modificar/eliminar eventos".
create policy "torneos_insert_profesor"
  on public.torneos for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.es_profesor = true
    )
  );