# Plan: Editar grupo y proteger el borrado de locaciones — `mobile-editar-grupo-locacion.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial y aprobación. Resuelve dos huecos del vínculo grupo–locación: (A) **bloquear** el borrado de una locación que todavía tiene grupos asociados (evita grupos huérfanos silenciosos) y (C) permitir **editar el grupo** (nombre, locación y horarios) vía RPC `editar_grupo` con el formulario en modo dual. Elegido por el usuario: enfoque **C + A**. |
| 1.1 | 2026-09-24 | **Ajuste de UX (prueba manual):** con grupos asociados, el botón "Eliminar locación" se ve deshabilitado pero ahora **es tocable** y muestra una **alerta explicativa** (`confirmarEliminar`) con la cantidad de grupos y la instrucción de reasignarlos. Antes estaba `disabled` y no daba ninguna respuesta al toque. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **No reimplementar:** el RPC `editar_grupo` reutiliza las validaciones de `crear_grupo_con_horarios`; el formulario `nuevo-grupo.tsx` se extiende en modo dual (patrón ya usado en `registrar-locacion.tsx`).
3. **No reasignar alumnos aquí:** mover a un alumno de grupo sigue siendo el pendiente #12 (`pendientes-pruebas.md`), ajeno a este plan.
4. **Fail gracefully:** toda comunicación con Supabase vía `ejecutarConsulta` y `MENSAJE_ERROR_GENERICO`.
5. **Ningún grupo se borra en cascada:** la FK `grupos.locacion_id on delete set null` se mantiene como red de seguridad de esquema.
6. **El SRS manda:** el valor de alquiler pactado ya se registra en `locaciones` (SRS §3.3); este plan no lo altera.

## Contexto / Objetivo
`grupos.locacion_id` es FK `on delete set null`. Antes de este plan, al eliminar una locación sus grupos quedaban con `locacion_id = NULL` ("Sin locación") y **no había forma de reasignarlos**: `nuevo-grupo.tsx` era solo alta y no existía RPC de actualización de grupo. Tampoco eran editables el nombre ni los horarios.

Se resuelve con:
- **(A) Bloqueo del borrado:** no se puede eliminar una locación mientras tenga grupos asociados; hay que reasignarlos primero.
- **(C) Edición del grupo:** nombre, locación y horarios editables, lo que permite reasignar los grupos y corregir errores de carga.

---

## Cambios Implementados

### 1. BD — migración `supabase/migrations/20260921220806_editar_grupo.sql` `[x]`
**a) RPC `editar_grupo(p_grupo_id uuid, p_nombre text, p_locacion_id uuid default null, p_horarios jsonb default '[]') returns boolean`**
- `SECURITY DEFINER`, `search_path = public`.
- Validaciones (idénticas a `crear_grupo_con_horarios`): grupo propio (`profesor_id = auth.uid()`), `es_profesor`, nombre no vacío, locación propia (si se pasa), ≥1 horario, `dia_semana` 1..7 y `hora_fin > hora_inicio`.
- En **una transacción**: `update grupos (nombre, locacion_id)` + `delete grupos_horarios` del grupo + reinsert de los horarios.
- Parámetros con `default` para que `p_locacion_id` sea opcional (permite dejar el grupo sin locación) y para que el generador de tipos lo marque como opcional.
- `revoke ... from public, anon; grant ... to authenticated`.

**b) RPC `eliminar_locacion_segura(p_locacion_id uuid) returns boolean`**
- Valida dueño (`creado_por = auth.uid()`).
- Si existen grupos con esa `locacion_id` → `raise exception 'La locación tiene grupos asociados.'` (bloquea).
- Si no hay grupos → `delete`.
- `revoke ... from public, anon; grant ... to authenticated`.

Verificado en remoto: ambas funciones `SECURITY DEFINER` con `EXECUTE` solo para `authenticated`.

### 2. Tipos `[x]`
- `mobile/src/lib/database.types.ts`: `editar_grupo` y `eliminar_locacion_segura` en `Functions`.
- `DatosNuevoGrupo` (existente) se reutiliza para alta y edición.

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `editarGrupo(grupoId, datos)`: **nueva** → RPC `editar_grupo`.
- `eliminarLocacion(locacionId)`: **cambiada** de `delete` directo a RPC `eliminar_locacion_segura` (bloqueo a nivel servidor, no solo UI).

### 4. Pantallas `[x]`
- **`nuevo-grupo.tsx` → modo dual:** detecta `?grupo_id=` (alta) o `params.id` (ruta anidada) para precargar nombre, locación y horarios vía `obtenerGrupoDetalle`; botón "Guardar cambios" y `router.back()` en edición; estado de carga propio; el texto de ayuda cambia según el modo.
- **`grupo/[id]/editar.tsx` (nueva):** reexporta el formulario en la ruta anidada `/instructor/grupo/[id]/editar` (no colisiona con `grupo/[id].tsx`).
- **`grupo/[id]/index.tsx`:** botón **"Editar"** en la cabecera, junto a "+ Clase".
- **`_layout.tsx`:** registrada la ruta `grupo/[id]/editar` ("Editar grupo").
- **`locacion/[id].tsx`:** el botón "Eliminar locación" se ve como deshabilitado si hay grupos asociados, pero sigue **siendo tocable**: al presionarlo muestra una **alerta explicativa** (cuántos grupos hay y que hay que reasignarlos); la tarjeta "Grupos asociados" también lo indica y cada grupo es navegable. El botón se ejecuta solo cuando no hay grupos.

### 5. Documentación `[x]`
- Nuevo plan `mobile-editar-grupo-locacion.md` (este archivo).
- `README.md`: fila del plan.
- `workflow-implementacion-mobile.md`: nota de que el grupo es editable (nombre, locación, horarios) en la Fase 4.2.
- `databaseModel.md`: nota del modelo sobre `grupos.locacion_id` (`on delete set null`) y el borrado bloqueado.
- `mobile-registro-locaciones.md`: referencia a este plan (el borrado ya no deja grupos huérfanos).
- `pendientes-pruebas.md`: prueba en dispositivo del flujo editar/reasignar + bloqueo.

---

## Criterios de Aceptación y Verificación
- [x] Se puede editar el nombre, la locación y los horarios de un grupo existente desde la app.
- [x] Reasignar la locación de un grupo se refleja en el detalle del grupo y en el detalle de la locación (ambos listados).
- [x] Eliminar una locación **con grupos asociados** queda bloqueado (UI deshabilitada + RPC que rechaza).
- [x] Eliminar una locación **sin grupos** funciona normalmente.
- [x] La FK `on delete set null` permanece: ningún grupo se borra en cascada.
- [x] Migración aplicada; `db lint` sin hallazgos nuevos.
- [x] Verificación de tipos TypeScript (`npm run typecheck` en `mobile/`) limpio.

> **Corrección posterior:** al volver de editar, el detalle mostraba datos viejos hasta reiniciar la
> app. Se corrigió el refresco en las pantallas de detalle (`useFocusEffect`) — ver
> `mobile-refresco-detalle-foco.md`.

---
🐧
