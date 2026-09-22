# Plan: Inscripción y Postulación a Examen (Fase 7, ítem 2) — `mobile-postulacion-examen.md`

## Metadatos
- **Versión:** 1.2
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: el profesor postula a sus alumnos directos en mesas abiertas; el grado aspirado se calcula en el servidor; registro manual del derecho de examen. |
| 1.1 | 2026-09-22 | Se incorpora la **recaudación total de la mesa** (suma de los derechos de examen) en el detalle del Maestro, conforme al **SRS §3.7** ("El maestro examinador podrá visualizar la recaudación total de la mesa"), con desglose de cobrados/pendientes y su criterio de aceptación. Se agrega además la recaudación a las Reglas §4, que la omitían. |
| 1.2 | 2026-09-22 | Ajuste de UX en "Tus postulaciones" (`instructor/mesas/[id]`): la acción "Cobro" pasa a **"Editar cobro"** y la `✕` a un botón **"Quitar"** con texto y `accessibilityLabel`, con jerarquía visual (Quitar en rojo, Editar cobro en neutro). Ver `mobile-postulaciones-acciones-claras.md`. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **La tabla y las políticas ya existían:** `postulaciones_examen` con `unique (mesa_id, alumno_id)` y check de `estado`; políticas select (alumno/profesor/**maestro**), insert del profesor (valida directo + `es_profesor`) y update solo con la mesa `abierta`. **No se crea tabla.**
3. **`grado_aspirado` se calcula en el SERVIDOR:** un RPC lo deriva del `grado_actual` real. La política de insert no lo validaba, así que calcularlo en el cliente lo dejaba falsificable.
4. **SRS §3.7 exige la recaudación total visible por el maestro examinador** (Gestión Financiera) — implementada en el detalle de la mesa.
5. **El alumno no es usuario:** la postulación la hace el profesor por sus **alumnos directos**.
6. **El sistema no procesa dinero** (Reglas §3): el `derecho_examen` es solo registro del cobro.
7. **No reinventar:** reutilizar `gradoSiguiente` (vista previa), `formatearMonto`, `etiquetaGrado`.
8. **Fail gracefully** con `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO`.
9. **Fuera de alcance:** planilla técnica (7.3) y registro de resultados/ascenso (7.4).

## Contexto / Objetivo
Fase 7.2: el profesor postula a sus alumnos directos para una **mesa abierta**; el sistema calcula el **grado inmediato superior** y el profesor registra el **derecho de examen**. El Maestro examinador visualiza la **recaudación total** de su mesa (SRS §3.7).

## Cambios Implementados

### 1. BD — migración `supabase/migrations/20260922012543_postular_alumno.sql` `[x]`
**a) `postular_alumno(p_mesa_id uuid, p_alumno_id uuid, p_derecho_examen numeric default null) returns uuid`** (`SECURITY DEFINER`, `search_path = public`):
1. valida `es_profesor`;
2. valida `es_alumno_directo_de(auth.uid(), p_alumno_id)`;
3. valida que la mesa exista y esté **`abierta`**;
4. **calcula `grado_aspirado`** desde `profiles.grado_actual` usando el orden del enum `public.grado` (`array_position` sobre `enum_range`); si es `dan_9`, lanza excepción (no hay superior);
5. rechaza `p_derecho_examen` negativo;
6. inserta con `profesor_id = auth.uid()` y `estado = 'postulado'`;
7. traduce `unique_violation` → `'El alumno ya está postulado en esta mesa.'`.

**b) `actualizar_derecho_examen(p_postulacion_id uuid, p_derecho_examen numeric) returns boolean`** — solo el profesor postulante, estado `postulado` y mesa `abierta`.

**c) `quitar_postulacion(p_postulacion_id uuid) returns boolean`** — solo el profesor postulante, estado `postulado` y mesa `abierta`.

Los tres `SECURITY DEFINER` con `EXECUTE` solo para `authenticated` (verificado en remoto).

**Verificación del cálculo:** se comprobó contra el enum remoto que la progresión es correcta para **toda** la escala (`blanco → … → rojo_punta_negra → dan_1 → … → dan_9`, y `dan_9 → NULL`).

### 2. Tipos `[x]`
- `mobile/src/lib/database.types.ts`: `postular_alumno`, `actualizar_derecho_examen`, `quitar_postulacion` en `Functions`.
- `mobile/src/lib/perfil.ts`:
  ```ts
  export type EstadoPostulacion = 'postulado' | 'aprobado' | 'desaprobado' | 'ausente'
  export type PostulacionExamen = Pick<...> & { estado: EstadoPostulacion; nombre_alumno: string }
  export type CandidatoPostulacion = { alumno_id; nombre_completo; grado_actual; grado_aspirado; ya_postulado }
  export type ResumenRecaudacion = { total: number; conCobro: number; sinCobro: number; postulados: number }
  export function resumirRecaudacion(postulaciones): ResumenRecaudacion
  ```
- Constantes `MENSAJE_POSTULACION_DUPLICADA`, `MENSAJE_SIN_GRADO_SUPERIOR`.

### 3. Acciones en `AuthGlobal.tsx` `[x]`
- `listarPostulacionesMesa(mesaId)` — postulaciones con nombre del alumno.
- `listarCandidatosPostulacion(mesaId)` — alumnos directos con grado actual, **grado aspirado (vista previa)** y marca de ya postulado.
- `postularAlumno(mesaId, alumnoId, derechoExamen)` — llama al RPC; distingue el duplicado.
- `editarDerechoExamen(postulacionId, monto)` y `quitarPostulacion(postulacionId)`.

### 4. Pantallas `[x]`
1. **`instructor/mesas.tsx` (nueva):** listado de las **mesas abiertas** donde el profesor puede postular.
2. **`instructor/mesas/[id].tsx` (nueva):** detalle con las postulaciones propias; acceso a postular, editar el cobro y quitar (mientras la mesa esté abierta).
3. **`instructor/mesas/[id]/postular.tsx` (nueva):** lista de **alumnos directos** con `grado actual → grado aspirado`; marca múltiple y carga del **derecho de examen** (opcional). Los ya postulados y los que alcanzaron el grado máximo se deshabilitan.
4. **`instructor/index.tsx`:** fila **"Postulación a examen"** habilitada.
5. **`maestro/mesas/[id].tsx` (extendida):**
   - **tarjeta "Recaudación de la mesa"** con el **total** (suma de `derecho_examen`) y el desglose **cobrados / pendientes** — **[SRS §3.7]**;
   - **detalle de postulaciones** con nombre, grado aspirado, derecho y estado.

### 5. Documentación `[x]`
- Nuevo plan `mobile-postulacion-examen.md` (este archivo).
- `workflow-implementacion-mobile.md`: Fase 7.2 implementada, **con la recaudación explícita**.
- `ReglasyRestricciones-SistemaTaekwondoITF.md` §4: **se agrega la recaudación** de la mesa (hoy omitida, aunque el SRS §3.7 la exige).
- `databaseModel.md`: nota de los RPCs y del cálculo en servidor.
- `README.md` y `pendientes-pruebas.md`.

## Criterios de Aceptación y Verificación
- [x] El profesor postula a sus **alumnos directos** en mesas **abiertas**.
- [x] El **grado aspirado** se calcula en el **servidor** (grado inmediato superior del enum) y se persiste.
- [x] Postular dos veces al mismo alumno en la misma mesa devuelve un mensaje claro, sin duplicado.
- [x] No se puede postular a una mesa **cerrada/finalizada** ni a un alumno **ajeno** (RPC + RLS).
- [x] El profesor registra y edita el **derecho de examen** mientras la mesa esté abierta.
- [x] Un alumno en `dan_9` no puede postularse (sin grado superior), con mensaje claro.
- [x] Un alumno puede estar postulado en **mesas distintas** (`unique` es por mesa + alumno).
- [x] **El Maestro visualiza la recaudación total de su mesa** (suma de los derechos), conforme al **SRS §3.7**.
- [x] Se muestra cuántos postulados tienen el derecho **cobrado** y cuántos **pendientes**.
- [x] El Maestro ve el **detalle de postulaciones** de su mesa.
- [x] Migración aplicada con `supabase db push --linked`; `db lint` sin hallazgos nuevos.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

---
🐧
