# Plan: Creación de Grupos y Horarios (Fase 4, ítem 2) — `mobile-grupos-horarios.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial aprobado por el usuario e implementado. Se fija: formulario de creación de grupo (nombre, horarios, locación), alta mínima de locación (adelanto parcial de Fase 5.1) para resolver la dependencia `grupos.locacion_id`, listado "Mis grupos", detalle del grupo con asignación directa de alumnos (estado `activo`) y sin código de invitación (`codigo_invitacion` pasa a nullable para uso futuro). |
| 1.1 | 2026-09-21 | **Aprobado por el usuario.** Correcciones sobre la implementación 1.0: (1) los horarios dejan de ser texto libre (`grupos.horarios` se elimina) y se modelan en la tabla normalizada `grupos_horarios` con RLS propia basada en los helpers `es_profesor_del_grupo` y gate `es_profesor`; (2) `locaciones.direccion` pasa a obligatoria (NOT NULL con backfill defensivo `''`); (3) un alumno solo puede estar activo en UN grupo (índice único parcial `where estado = 'activo'`); al reasignarlo, el RPC `editar_miembros_grupo` lo MUEVE a nivel transaccional entre los grupos del mismo profesor; (4) nuevo RPC `crear_grupo_con_horarios` que crea el grupo y sus horarios en una transacción validando día (1..7) y `hora_fin > hora_inicio`. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos/web congelados:** no se tocan tablas de torneos ni `web/`.
2. **`codigo_invitacion` fuera de alcance v1:** el flujo móvil jamás genera ni pide códigos; la columna queda en BD (`unique`, nullable) para uso futuro.
3. **Linaje inamovible:** los alumnos ya tienen `maestro_id` fijado en `alta_alumno`; el trigger `vincular_linaje_al_aprobar` solo rellena `maestro_id` si está NULL. Los RPCs nuevos no tocan `profiles.maestro_id`.
4. **Fail gracefully:** toda comunicación con Supabase vía `ejecutarConsulta`/try-catch con `registrarError` y `MENSAJE_ERROR_GENERICO`; la UI nunca expone excepciones crudas.
5. **Alta de locación sin monto:** `locaciones.valor_alquiler` no se solicita (el monto solo va a `pagos_alquiler`, Fase 5); solo `nombre` y **`direccion` (obligatoria)**.
6. **Horarios NO son string libre (corrección v1.1):** el campo texto `grupos.horarios` se elimina; los horarios viven en `grupos_horarios` (día + `hora_inicio`/`hora_fin` con `hora_fin > hora_inicio`). No volver a ofrecer texto libre para horarios.
7. **Un alumno = un solo grupo (corrección v1.1; semántica actualizada):** membresía `activa` única por alumno (índice único parcial). **Actualización posterior (plan `mobile-asignacion-alumno-un-grupo.md`):** el RPC `editar_miembros_grupo` ya **no mueve** al alumno; **rechaza** la asignación si el alumno ya está activo en otro grupo, y la UI oculta a los alumnos ya asignados. Ver ese plan para el comportamiento vigente.
8. **Alumnos no son usuarios:** se asignan desde el listado del profesor (`maestro_id = auth.uid()`); no hay flujo de auto-alta ni de invitación.

## Contexto / objetivo
Implementar el ítem 2 de la Fase 4 del workflow: el profesor crea un **grupo** vinculado a una **locación física** (con alta mínima de locación adelantada de Fase 5.1) indicando **nombre y horarios estructurados**, y asigna a **sus alumnos directos** como miembros en estado `activo` (un alumno solo en un grupo). Resoluciones tomadas por el usuario: incluir el alta mínima de locación para habilitar la asociación, flujo en dos pasos (creación + pantalla de detalle para asignar miembros), horarios modelados en tabla normalizada `grupos_horarios` y dirección obligatoria.

> **Actualización posterior:** la reasignación automática (mover al alumno) fue reemplazada — ver `mobile-asignacion-alumno-un-grupo.md`.

## Cambios implementados

### 1. BD — migración `supabase/migrations/20260921200516_grupos_horarios_y_reglas.sql` `[x]`
- Tabla **`public.grupos_horarios`** (`id uuid PK`, `grupo_id uuid NOT NULL FK → grupos on delete cascade`, `dia_semana int NOT NULL check 1..7`, `hora_inicio time NOT NULL`, `hora_fin time NOT NULL`, `check (hora_fin > hora_inicio)`, índice `grupos_horarios_grupo_idx`) con RLS:
  - `grupos_horarios_select_profesor`: `using es_profesor_del_grupo(grupo_id, auth.uid())`.
  - `grupos_horarios_insert_profesor`: `with check es_profesor_del_grupo(...) and exists (profiles es_profesor = true)`.
  - `grupos_horarios_update_profesor` / `grupos_horarios_delete_profesor`: solo profesor dueño del grupo.
- `alter table public.grupos drop column horarios;` (se elimina el texto libre).
- **`locaciones.direccion` obligatoria:** `update public.locaciones set direccion = '' where direccion is null;` + `alter column direccion set not null;`.
- Índice único parcial **`miembros_grupo_un_grupo_activo_idx`** sobre `miembros_grupo (alumno_id) where estado = 'activo'`.
- RPC **`public.crear_grupo_con_horarios(p_nombre text, p_locacion_id uuid, p_horarios jsonb) returns uuid`** (SECURITY DEFINER, `search_path = public`): valida `es_profesor`, nombre no vacío, locación propia (si se pasa), ≥1 horario y, por cada slot, `dia_semana` 1..7 y `hora_fin > hora_inicio`; inserta el grupo y sus horarios en **una transacción**; devuelve el id del grupo. `revoke ... from public, anon; grant ... to authenticated;`.
- RPC **`public.editar_miembros_grupo(...)`** actualizado: agrega el **movimiento** — `delete` de membresías activas de los alumnos en otros grupos **del mismo profesor** (`g.profesor_id = auth.uid()`) previo al delete/insert del grupo destino; el índice único parcial garantiza una sola membresía activa.
- Verificación: `supabase db push/lint --linked` ejecutados en el remoto.

### 2. Tipos y validadores `[x]`
- `mobile/src/lib/database.types.ts`: `grupos` sin `horarios`; `grupos_horarios` (Row/Insert/Update + relación); `locaciones.direccion: string` (no null); función `crear_grupo_con_horarios` en `Functions`.
- `mobile/src/lib/perfil.ts`: tipos `HorarioGrupo`, `ETIQUETAS_DIAS`; `Locacion`/`DatosNuevaLocacion.direccion: string`; `Grupo`/`DetalleGrupo.horarios: HorarioGrupo[]`; `Grupo.miembro_ids: string[]`; `DatosNuevoGrupo.horarios: HorarioGrupo[]`; `FilaGrupoConRelaciones.grupos_horarios`; validadores `esDireccionValida`, `esHorarioGrupoValido`, `formatearHorarios` (se elimina `esHorarioValido`).

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `SELECT_GRUPO` → incluye `grupos_horarios(dia_semana, hora_inicio, hora_fin)`; `mapearHorarios`/`mapearGrupo` mapean horarios y `miembro_ids`.
- `crearGrupo(datos)` → RPC `crear_grupo_con_horarios` (retorna `nuevoId`).
- `crearLocacion(datos)` → INSERT con `direccion` siempre presente (sin fallback a null).
- `obtenerGrupoDetalle(id)` → mapea `horarios` desde `grupos_horarios`.
- Resto (`listarGrupos`, `editarMiembrosGrupo`, `listarLocaciones`) conservado.

### 4. Pantallas `[x]`
- `instructor/grupos.tsx` — Listado "Mis grupos" con horarios formateados vía `formatearHorarios`.
- `instructor/nuevo-grupo.tsx` — Formulario: nombre\*, **editor estructurado de horarios** (lista de slots: chips de día Lun–Dom + `Hora inicio`/`Hora fin` con validación `HH:mm` y `fin > inicio`, botón "+ Agregar horario", "Quitar"), selector de locación (chips) con alta inline vía `registrar-locacion`. Crear → `crearGrupo` → `router.replace('/instructor/grupo/[id]')`.
- `instructor/registrar-locacion.tsx` — Alta mínima: nombre\* + **dirección\*** (obligatoria). Al guardar → `router.back()`.
- `instructor/grupo/[id].tsx` — Detalle: cabecera (nombre, locación, horarios formateados); check-list de alumnos directos pre-marcados según `miembro_ids` con badge "Se trasladará desde '<otro grupo>'" cuando el alumno marcado pertenece a otro grupo del profesor; "Guardar miembros" → `editarMiembrosGrupo` (que mueve).

### 5. Navegación y menú `[x]`
- Sin rutas nuevas: se conservan `grupos`, `nuevo-grupo`, `grupo/[id]`, `registrar-locacion` de la 1.0.

### 6. Documentación `[x]`
- `documentacion/planes/mobile-grupos-horarios.md` (este plan, v1.1 Aprobado).
- `documentacion/README.md`: fila del plan vigente.
- `databaseModel.md`: GRUPOS sin `horarios`, entidad GRUPOS_HORARIOS, `direccion not null`, nota "1 grupo activo por alumno".
- `workflow-implementacion-mobile.md`: Fase 4 ítem 2 y Fase 5.1 actualizados (dirección obligatoria, horarios normalizados, un grupo por alumno).

## Criterios de aceptación
- [x] Profesor crea grupo con nombre, horarios estructurados (día + inicio/fin, `fin > inicio`, ≥1 slot) y locación propia; **sin** código de invitación; `grupos.horarios` (text) eliminado.
- [x] `locaciones.direccion` es NOT NULL; el formulario la exige.
- [x] Un alumno solo puede estar activo en un grupo (índice único parcial); al reasignarlo, `editar_miembros_grupo` lo mueve atómicamente y queda en el nuevo con aviso visual.
- [x] RLS de `grupos_horarios` restringida al profesor dueño del grupo (helpers `es_profesor_del_grupo` + gate `es_profesor`).
- [x] Fail gracefully en toda acción; `npm run typecheck` en `mobile/` limpio.
- [x] `supabase db push --linked` y re-lint aplicados en el remoto.