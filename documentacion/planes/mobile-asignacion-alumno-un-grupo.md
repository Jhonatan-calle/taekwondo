# Plan: Asignación de un alumno a un solo grupo — `mobile-asignacion-alumno-un-grupo.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial y aprobación: un alumno activo en un grupo no puede agregarse a otro. La UI (`instructor/grupo/[id]`) deja de ofrecer traslado (oculta a los alumnos ya asignados y elimina el badge "Se trasladará desde …") y el RPC `editar_miembros_grupo` **rechaza** la asignación con excepción en vez de mover al alumno. Corrige la semántica v1.1 de `mobile-grupos-horarios.md`. La reasignación explícita queda como plan aparte. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** No tocar tablas ni lógica de torneos ni la plataforma `web/`.
2. **Uso exclusivo del staff:** Los alumnos no tienen usuario ni sesión propia.
3. **Fail gracefully:** Toda comunicación con Supabase se envuelve con `ejecutarConsulta` y `MENSAJE_ERROR_GENERICO`, sin exponer errores crudos.
4. **Corrige la semántica v1.1 de `mobile-grupos-horarios.md`:** el RPC `editar_miembros_grupo` **deja de mover** al alumno entre grupos del mismo profesor. Ahora **rechaza** la asignación si el alumno ya tiene una membresía `activo` en otro grupo. La decisión anterior (movimiento atómico + badge "Se trasladará") queda **reemplazada** por este plan.
5. **No se toca el resto:** `asistencia`, `clases`, membresía por grupo y el índice único parcial siguen igual.

## Contexto / Objetivo
Hasta ahora la pantalla de detalle del grupo ofrecía a **todos** los alumnos directos y, si un alumno pertenecía a otro grupo, mostraba el aviso "Se trasladará desde \<otro grupo\>": el RPC lo **movía** silenciosamente de un grupo a otro.

El objetivo es que un alumno **pertenezca a un solo grupo** de forma coherente en UI y BD:
- La UI **no ofrece** agregar a un alumno que ya está en otro grupo (se oculta del listado de asignables).
- La BD **rechaza** la operación si se intenta (red de seguridad ante llamadas directas a la API).

La integridad ya estaba garantizada por el índice único parcial `miembros_grupo_un_grupo_activo_idx`; este plan cambia la **semántica** (rechazar en vez de mover) y la **presentación** (ocultar en vez de avisar traslado).

---

## Cambios Concretos

### 1. Base de Datos (Supabase)
Migración: `supabase/migrations/20260921212135_asignacion_un_solo_grupo.sql`.

`create or replace function public.editar_miembros_grupo(p_grupo_id uuid, p_alumno_ids uuid[])`:
- Se conservan las validaciones previas: grupo propio (`profesor_id = auth.uid()`), `es_profesor` y `es_alumno_directo_de` por alumno.
- **Nuevo bloqueo** (reemplaza al `delete` que movía):
  ```sql
  if exists (
    select 1 from public.miembros_grupo mg
     where mg.alumno_id = any (coalesce(p_alumno_ids, '{}'::uuid[]))
       and mg.estado = 'activo'
       and mg.grupo_id <> p_grupo_id
  ) then
    raise exception 'Uno o más alumnos ya pertenecen a otro grupo.';
  end if;
  ```
- Se elimina el `delete ... using grupos` que sacaba al alumno de otros grupos.
- Se mantienen: baja de los desmarcados de **este** grupo e inserción de los marcados (`on conflict do nothing`).
- Permisos sin cambios (`revoke` de `public, anon`; `grant` a `authenticated`).

> Nota: la baja implícita al desmarcar se mantiene (decisión acordada).

### 2. UI — `mobile/src/app/(tabs)/instructor/grupo/[id].tsx`
- **Ocultar** a los alumnos activos en otro grupo:
  - `armarSetOcupadosEnOtroGrupo(grupos, grupoActualId)` reemplaza a `armarMapaGrupoDeAlumno`; usa `listarGrupos()` (ya trae `miembro_ids`), sin consultas nuevas.
  - `alumnosAsignables = alumnos.filter(a => !ocupados.has(a.id))`. Los alumnos del **propio** grupo siguen visibles para poder darlos de baja o mantenerlos.
- **Eliminados**: badge `Se trasladará desde "<otro grupo>"`, estado `grupoDeAlumno` y estilos `badge`/`badgeTexto`.
- **Leyenda actualizada**: "Solo se listan los alumnos sin grupo asignado. Un alumno pertenece a un único grupo: para moverlo, primero quitalo de su grupo actual."
- **Nuevo estado vacío**: si no quedan alumnos asignables, aviso + acceso "Ver mis grupos".
- El `FlatList` usa `alumnosAsignables`.

### 3. Documentación
- `documentacion/planes/mobile-grupos-horarios.md`: nota de revisión — la restricción #7 y el criterio de "mover atómicamente" quedan reemplazados por este plan.
- `documentacion/README.md`: fila del plan nuevo.
- `documentacion/workflow-implementacion-mobile.md`: Fase 4.2 ajustada (ya no se mueve al alumno; un alumno solo se asigna a un grupo).
- `documentacion/databaseModel.md`: nota del modelo actualizada.

### Fuera de alcance (plan aparte)
- **Reasignación explícita de grupo (pendiente):** el usuario pidió una forma de reasignar a un alumno de grupo, aún sin definir. Al rechazar el RPC la asignación, el traslado requerirá su propia operación (p. ej. RPC `reasignar_alumno_a_grupo`) y su propio plan. No se diseña aquí.

---

## Criterios de Aceptación y Verificación
- [x] Un alumno activo en otro grupo **no aparece** en el listado de asignables; los del propio grupo siguen visibles y pre-marcados.
- [x] `editar_miembros_grupo` **rechaza** con excepción asignar a un alumno que ya está activo en otro grupo.
- [x] El índice único parcial `miembros_grupo_un_grupo_activo_idx` sigue vigente (una única membresía activa por alumno).
- [x] Desmarcar + guardar sigue dando de baja al alumno de este grupo.
- [x] Ya no existe el badge ni el texto de "Se trasladará".
- [x] Migración aplicada con `supabase db push --linked`; `db lint` sin hallazgos nuevos.
- [x] Verificación de tipos TypeScript (`npm run typecheck` en `mobile/`) limpio.

---
🐧
