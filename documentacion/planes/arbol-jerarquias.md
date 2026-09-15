# Plan: Árbol de Jerarquías (maestro directo y RLS de grupos)

> **Metadatos**
> - **Versión:** 1.2
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-14

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-14 | Borrador inicial. |
| 1.0 | 2026-09-14 | **Aprobado** por el usuario sin objeciones. Decisiones: alcance solo modelado BD; maestro_id automático (1ª aprobación) + reasignación vía Service Role; sin funciones RPC de árbol. |
| 1.1 | 2026-09-14 | Mejora sugerida por el usuario incorporada: en `vincular_linaje_al_aprobar`, el condicional verifica la transición exacta `new.estado = 'activo' and (TG_OP = 'INSERT' or old.estado <> 'activo')`. |
| 1.2 | 2026-09-15 | Implementación completa. Corrección de recursión RLS (ver Restricciones ítem 8) con migración `fix_rls_arbol`; verificación empírica OK (derivación, escalada bloqueada, reasignación Service Role, no pisa maestro existente); docs sincronizadas y ítem 2 de Fase 2 `[x]`. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar `.env*`.** Solo `web/.env.example` versionado.
2. **NO commits/push automáticos.**
3. **Migración generada por CLI** (`npx supabase migration new arbol_jerarquias`).
4. **Solo el sistema (Service Role / trigger `SECURITY DEFINER`) puede escribir `profiles.maestro_id`.** Un usuario autenticado no puede auto-asignarse un maestro (escalada de linaje). Patrón trigger consistente con `bloquear_auto_activacion_profesor` del ítem 1.
5. **Según decisión del usuario:**
   - **No** se crean funciones RPC de árbol/linaje (recursivas). El maestro directo se lee con un `SELECT` simple sobre `profiles.maestro_id`.
   - El maestro ascendente se deriva **automáticamente** con la 1ª aprobación de grupo y es **reasignable vía Service Role**.
   - Fuera de alcance: UI, Server Actions de grupos (crear/join/aprobar), generación de `codigo_invitacion` (para Fase 3/6). Este plan solo modela y blinda las relaciones.
6. **Fail gracefully:** si algo de la app posterior lo usa, seguir el patrón `try/catch` + `errores_runtime`.
7. **Fuera de alcance de este plan:** ítem 3 de Fase 2 (gating de 1er Dan / grados verificados). El `maestro_id` no depende de grados.
8. **NO crear políticas RLS que se referencien entre sí cruzando tablas** (`grupos` ↔ `miembros_grupo`): Postgres entra en `infinite recursion detected in policy`. Las relaciones cruzadas se resuelven con funciones helper `SECURITY DEFINER` (ver `es_alumno_del_grupo` / `es_profesor_del_grupo`). Corrección aplicada en la migración `fix_rls_arbol`.

## Contexto / objetivo
Modelar el linaje del "Árbol de Poder" (SRS §5) de forma mínima y segura: **cada alumno conectado a un grupo administrado por su profesor** (`miembros_grupo` + `grupos.profesor_id`) y un **maestro ascendente único** (`profiles.maestro_id`) que se deriva solo. Hoy `grupos` y `miembros_grupo` tienen RLS **sin políticas** (inaccesibles) y `maestro_id` es manipulable por su dueño vía RLS (un alumno podría auto-asignarse un maestro). Este plan habilita las relaciones con RLS y blinda el linaje.

## Cambios concretos

### 1. Migración SQL (`arbol_jerarquias`)

```sql
-- 1. Índice para joins/consultas del maestro directo y futuro linaje
create index profiles_maestro_id_idx on public.profiles (maestro_id);

-- 2. No auto-maestro (evita maestro_id = id)
alter table public.profiles
  add constraint profiles_no_auto_maestro check (maestro_id is null or maestro_id <> id);

-- 3. Blindaje: solo el sistema escribe maestro_id.
--    El trigger deriva maestro_id con "set_config('app.derivacion_linaje','on',true)";
--    auth.uid() es NULL bajo service_role (reasignación manual permitida).
create or replace function public.bloquear_auto_cambio_maestro()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.maestro_id is distinct from old.maestro_id
     and coalesce(current_setting('app.derivacion_linaje', true), '') <> 'on'
  then
    raise exception 'El maestro ascendente solo puede ser modificado por el sistema (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_cambio_maestro
  before update of maestro_id on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_maestro();

-- 4. Derivación automática: al aprobarse la membresía de un grupo,
--    el alumno hereda el linaje del profesor (solo si aún no tiene maestro).
--    Transición exacta: se dispara en INSERT con estado activo o al pasar
--    DE un estado distinto de 'activo' A 'activo'.
create or replace function public.vincular_linaje_al_aprobar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profesor uuid;
begin
  if new.estado = 'activo' and (TG_OP = 'INSERT' or old.estado <> 'activo') then
    select g.profesor_id into v_profesor
      from public.grupos g where g.id = new.grupo_id;
    if v_profesor is not null and v_profesor <> new.alumno_id then
      perform set_config('app.derivacion_linaje', 'on', true);
      update public.profiles
         set maestro_id = v_profesor
       where id = new.alumno_id and maestro_id is null;
    end if;
  end if;
  return new;
end;
$$;

create trigger vincular_linaje_al_aprobar
  after insert or update of estado on public.miembros_grupo
  for each row
  execute function public.vincular_linaje_al_aprobar();

-- 5. RLS grupos: dueño (profesor) + miembros (alumnos aprobados/solicitantes)
--    Helpers SECURITY DEFINER para las políticas cruzadas (evitan recursión RLS).
create or replace function public.es_alumno_del_grupo(p_grupo_id uuid, p_perfil_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.miembros_grupo mg
    where mg.grupo_id = p_grupo_id and mg.alumno_id = p_perfil_id);
$$;
create or replace function public.es_profesor_del_grupo(p_grupo_id uuid, p_perfil_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.grupos g
    where g.id = p_grupo_id and g.profesor_id = p_perfil_id);
$$;
revoke execute on function public.es_alumno_del_grupo(uuid, uuid) from public;
revoke execute on function public.es_profesor_del_grupo(uuid, uuid) from public;
grant execute on function public.es_alumno_del_grupo(uuid, uuid) to authenticated;
grant execute on function public.es_profesor_del_grupo(uuid, uuid) to authenticated;

create policy "grupos_select_profesor" on public.grupos
  for select to authenticated using (profesor_id = auth.uid());
create policy "grupos_select_miembro" on public.grupos
  for select to authenticated
  using (public.es_alumno_del_grupo(id, auth.uid()));
create policy "grupos_insert_profesor" on public.grupos
  for insert to authenticated
  with check (
    auth.uid() = profesor_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.es_profesor = true)
  );
create policy "grupos_update_profesor" on public.grupos
  for update to authenticated
  using (profesor_id = auth.uid())
  with check (profesor_id = auth.uid());
create policy "grupos_delete_profesor" on public.grupos
  for delete to authenticated
  using (profesor_id = auth.uid());

-- 6. RLS miembros_grupo: alumno solo a sí mismo; profesor a su grupo.
--    INSERT solo con estado pendiente (el alumno no puede auto-activarse).
create policy "miembros_select_alumno" on public.miembros_grupo
  for select to authenticated using (auth.uid() = alumno_id);
create policy "miembros_select_profesor" on public.miembros_grupo
  for select to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));
create policy "miembros_insert_pendiente" on public.miembros_grupo
  for insert to authenticated
  with check (auth.uid() = alumno_id and estado = 'pendiente_aprobacion');
create policy "miembros_update_profesor" on public.miembros_grupo
  for update to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()))
  with check (public.es_profesor_del_grupo(grupo_id, auth.uid()));
create policy "miembros_delete_alumno" on public.miembros_grupo
  for delete to authenticated using (auth.uid() = alumno_id);
create policy "miembros_delete_profesor" on public.miembros_grupo
  for delete to authenticated
  using (public.es_profesor_del_grupo(grupo_id, auth.uid()));
```

> **Notas:**
> - Las políticas que cruzan tablas se implementan con helpers `SECURITY DEFINER` (`es_alumno_del_grupo` / `es_profesor_del_grupo`) para evitar la recursión infinita de RLS (ver Restricciones ítem 8). Migración correctiva: `fix_rls_arbol`.
> - El helper `es_profesor_del_grupo` consulta `grupos` como `postgres` (sin RLS): bloquea el acceso al `codigo_invitacion` de usuarios que no son profesor/miembro del grupo.
> - La derivación automática corre con el **profesor** que aprueba (sesión autenticada): por eso el trigger de blindaje chequea el flag `app.derivacion_linaje`; el `SECURITY DEFINER` corre como `postgres` y no golpea RLS.
> - Reasignación manual = Service Role (`admin.ts`), con `auth.uid() = null` queda exento del blindaje.
> - Sin cambios en `web/src` (alcance BD).

### 2. Documentación (sincronizar)
- **`documentacion/databaseModel.md`:**
  - `PROFILES.maestro_id` → comentario: "maestro ascendente (se deriva al aprobarse el 1er grupo; reasignable solo vía Service Role)".
  - `GRUPOS` / `MIEMBROS_GRUPO` → nota de RLS propia (dueño + miembro).
- **`documentacion/mvc/workflow.md`:** marcar `[x]` ítem 2 de Fase 2 al cierre.

## Verificación
- `supabase db push` (migraciones `arbol_jerarquias` + `fix_rls_arbol`) y dump de esquema: políticas (con helpers), ambos triggers, índice y constraint presentes.
- Script desechable (eliminado tras la prueba):
  1. Alta de **profesor P**, **alumno A** y **maestro raíz R** desechables (Service Role).
  2. **A** (sesión autenticada) pide entrar a un grupo (INSERT `pendiente_aprobacion`).
  3. **P** (sesión autenticada) aprueba (UPDATE → `activo`).
  4. `A.maestro_id == P.id` (derivación automática, corrobora el flag anti-bloqueo).
  5. **A** intenta reasignar su `maestro_id` a **R** (persona real y distinta) → bloqueado (excepción).
  6. Service Role reasigna `A.maestro_id = R` → OK, y una re-aprobación NO pisa el maestro existente.
  7. Limpieza de usuarios/grupo desechables (usuarios residuales de corridas fallidas eliminados).
- `npm run lint` y `npm run build` en `web/` OK (sanity, sin cambios de app).
- `rg "maestro_id"` — solo en migración/docs.

## Criterios de aceptación
- [x] `grupos` y `miembros_grupo` accesibles con las políticas del plan (sin romper tablas existentes).
- [x] La aprobación de membresía deriva `maestro_id` automáticamente (1ª vez).
- [x] Un usuario autenticado no puede auto-asignar/reasignar su `maestro_id`.
- [x] Service Role puede reasignar `maestro_id`.
- [x] Ítem 2 de Fase 2 `[x]` en `workflow.md` y `databaseModel.md` sincronizado.