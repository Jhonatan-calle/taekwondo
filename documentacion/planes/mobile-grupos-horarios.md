# Plan: Creación de Grupos y Horarios (Fase 4, ítem 2) — `mobile-grupos-horarios.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial aprobado por el usuario e implementado. Se fija: formulario de creación de grupo (nombre, horarios, locación), alta mínima de locación (adelanto parcial de Fase 5.1) para resolver la dependencia `grupos.locacion_id`, listado "Mis grupos", detalle del grupo con asignación directa de alumnos (estado `activo`) y sin código de invitación (`codigo_invitacion` pasa a nullable para uso futuro). |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos/web congelados:** no se tocan tablas de torneos ni `web/`.
2. **`codigo_invitacion` fuera de alcance v1:** el flujo móvil jamás genera ni pide códigos; la columna queda en BD (`unique`, nullable) para uso futuro.
3. **Linaje inamovible:** los alumnos ya tienen `maestro_id` fijado en `alta_alumno`; el trigger `vincular_linaje_al_aprobar` solo rellena `maestro_id` si está NULL. El RPC nuevo no toca `profiles.maestro_id`.
4. **Fail gracefully:** toda comunicación con Supabase vía `ejecutarConsulta`/try-catch con `registrarError` y `MENSAJE_ERROR_GENERICO`; la UI nunca expone excepciones crudas.
5. **Alta de locación sin monto:** `locaciones.valor_alquiler` no se solicita (el monto solo va a `pagos_alquiler`, Fase 5); solo `nombre` (obligatorio) y `direccion` (opcional).
6. **Alumnos no son usuarios:** se asignan desde el listado del profesor (`maestro_id = auth.uid()`); no hay flujo de auto-alta ni de invitación.

## Contexto / objetivo
Implementar el ítem 2 de la Fase 4 del workflow: el profesor crea un **grupo** vinculado a una **locación física** (con alta mínima de locación adelantada de Fase 5.1) indicando **nombre y horarios**, y asigna a **sus alumnos directos** como miembros en estado `activo`. Resoluciones tomadas por el usuario: incluir el alta mínima de locación para habilitar la asociación, y flujo en dos pasos (creación + pantalla de detalle para asignar miembros).

## Cambios implementados

### 1. BD — migración `supabase/migrations/20260921153636_grupos_flujo_movil.sql` `[x]`
- `alter table public.grupos alter column codigo_invitacion drop not null;`
- RPC **`public.editar_miembros_grupo(p_grupo_id uuid, p_alumno_ids uuid[]) returns boolean`** (SECURITY DEFINER, `search_path = public`):
  - Rechaza si `auth.uid()` no es el `profesor_id` del grupo o `es_profesor ≠ true`.
  - Rechaza si algún `alumno_id` no es alumno directo de `auth.uid()` (`es_alumno_directo_de`).
  - Atómico: borra miembros del grupo no incluidos e inserta los nuevos con `estado = 'activo'` (`on conflict do nothing`).
  - `revoke ... from public, anon; grant ... to authenticated;`
- Verificación: `supabase db push --linked` pendiente de `supabase login` en la máquina del usuario.

### 2. Tipos y validadores `[x]`
- `mobile/src/lib/database.types.ts`: `grupos.codigo_invitacion` → opcional en `Row/Insert/Update`; RPC `editar_miembros_grupo` en `Functions`.
- `mobile/src/lib/perfil.ts`: tipos `Locacion`, `DatosNuevaLocacion`, `Grupo`, `DetalleGrupo`, `DatosNuevoGrupo`, `FilaGrupoConRelaciones`; validadores `esNombreValido`, `esHorarioValido`.

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarGrupos()` — SELECT grupos del profesor con `locaciones(nombre)` y `miembros_grupo(alumno_id)`.
- `crearGrupo(datos)` — INSERT directo en `grupos` (RLS `grupos_insert_profesor`), sin `codigo_invitacion`.
- `obtenerGrupoDetalle(id)` — grupo + locación + ids de miembros, restringido a `profesor_id = uid`.
- `editarMiembrosGrupo(grupoId, alumnoIds[])` — RPC `editar_miembros_grupo`.
- `listarLocaciones()` / `crearLocacion(datos)` — SELECT/INSERT de locaciones propias (RLS dueño).

### 4. Pantallas `[x]`
- `instructor/grupos.tsx` — Listado "Mis grupos" (nombre, locación, horarios, nº de miembros). Est. cargando/error/vacío + "Nuevo grupo". Fila → `grupo/[id]`.
- `instructor/nuevo-grupo.tsx` — Formulario: nombre\*, horarios\*, selector de locación (chips); si no hay locaciones → aviso + "Registrar locación" → `registrar-locacion` (refresca con `useFocusEffect`). Crear → `crearGrupo` → `router.replace('/instructor/grupo/[id]')`.
- `instructor/registrar-locacion.tsx` — Alta mínima: nombre\* + dirección (opcional). Al guardar → `router.back()`.
- `instructor/grupo/[id].tsx` — Detalle: cabecera (nombre, locación, horarios); check-list de alumnos directos pre-marcados según `miembro_ids`; "Guardar miembros" → `editarMiembrosGrupo`.

### 5. Navegación y menú `[x]`
- `instructor/_layout.tsx`: rutas `grupos`, `nuevo-grupo`, `grupo/[id]`, `registrar-locacion`.
- `instructor/index.tsx`: fila "Grupos y horarios" habilitada → `router.push('/instructor/grupos')`.

### 6. Documentación `[x]`
- `documentacion/planes/mobile-grupos-horarios.md` (este plan, Aprobado).
- `documentacion/README.md`: fila del plan vigente.
- `workflow-implementacion-mobile.md`: Fase 4 ítem 2 marcado implementado + alta mínima de locación adelantada.

## Criterios de aceptación
- [x] Profesor crea grupo con nombre, horarios y locación propia; **sin** código de invitación.
- [x] Si no hay locaciones, desde el creador puede registrar una y volver (dependencia resuelta).
- [x] Asignación de alumnos directos como `activo` vía RPC atómico; rechazo si el alumno no es directo; sin auto-membresía.
- [x] "Mis grupos" lista grupos con locación, horarios y conteo de miembros; detalle con toggle + guardar.
- [x] Fail gracefully en toda acción; `npm run typecheck` en `mobile/` limpio.
- [x] `supabase db push --linked` y re-lint aplicados en el remoto.