# Plan: Planilla Técnica y Evaluación (Fase 7, ítem 3) — `mobile-planilla-evaluacion.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial y aprobación. El maestro examinador consulta la **planilla técnica** (RPC `planilla_mesa_examen`) y registra el resultado **individual** (Aprobado / Desaprobado / Ausente) vía `registrar_resultado_examen`. Incluye el cierre del ítem 7.4 (ascenso y log), ya resuelto en el servidor por ese RPC. |
| 1.1 | 2026-09-22 | Extensión de los desenlaces del examen: **mención especial** y **doble graduación** (se salta un cinturón). La doble graduación solo aplica si el grado actual está entre `blanco` y `azul_punta_roja` (nuevo grado +2, tope `rojo_punta_negra`); de ahí en adelante el máximo es mención especial. Se documenta además la **sobreescritura deliberada de `grado_aspirado`** (ver "Decisiones de diseño"). Incluye migración, RPC, tipos, UI y aviso al abrir la planilla con la mesa abierta. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **v1.0 sin migración; v1.1 con una migración acotada:** `planilla_mesa_examen(p_mesa)` ya existía; `registrar_resultado_examen` se **recrea con dos banderas nuevas** en la migración `20260922153640_resultados_mencion_doble_graduacion.sql` (se dropea la firma vieja `(uuid, text)` para no dejar sobrecargas ambiguas). No se crean tablas ni políticas.
3. **`planilla_mesa_examen` devuelve 0 filas para mesas ajenas:** filtra por `m.maestro_id = auth.uid()` y exige `es_maestro = true` (excepción de mesa de examen del SRS §2). La pantalla detecta la mesa ajena con `mesa.maestro_id`.
4. **`registrar_resultado_examen` es irreversible:** solo admite postulaciones en estado `postulado` y marca `evaluado_por`/`evaluado_en`. No se corrige un resultado ya cargado (decisión de producto).
5. **Gating de evaluación:** la UI solo habilita evaluar con la mesa **`cerrada`/`finalizada`** (el RPC no lo restringe; es una regla de UI para no evaluar mientras se siguen inscribiendo alumnos). **v1.1:** el botón ya no queda mudo; al presionarlo con la mesa abierta muestra un aviso y ofrece cerrarla.
6. **Registro individual:** no hay carga masiva (lo pide el ítem).
7. **No reinventar:** se reutilizan `listarPostulacionesMesa`, `listarMesasExamen`, `etiquetaGrado`, el patrón `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO` y el layout de la pestaña Maestro.
8. **Fail gracefully** con `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO` y `reportarError()`.
9. **Mención especial y doble graduación (v1.1):** son **banderas** que acompañan a un `aprobado`; no se agregan valores a los `check` de `estado`/`resultado`.
10. **Límite de la doble graduación (v1.1):** solo si el grado **actual** está entre `blanco` y `azul_punta_roja` (inclusive); el nuevo grado es **+2** (tope `rojo_punta_negra`). Para `rojo`, `rojo_punta_negra` y dans el máximo es mención especial. El servidor valida el límite y la UI no ofrece el botón fuera de rango.
11. **`grado_aspirado` se sobreescribe (v1.1):** al evaluar, el RPC guarda el grado final **otorgado** en `grado_aspirado`. Mientras está `postulado` sigue siendo la aspiración +1. Decisión deliberada documentada abajo y con `comment on column` en la BD.
12. **Fuente histórica:** el detalle de cada graduación (incluido el salto) vive en `graduaciones` (`grado_anterior`/`grado_nuevo`, `mencion_especial`, `promocion_doble`).

## Contexto / Objetivo
Fase 7.3: el Maestro examinador consulta la **planilla digital** de su mesa mediante el RPC seguro `planilla_mesa_examen` (datos técnicos: nombre, edad, peso, grado actual y aspirado) y carga de forma **individual** el resultado de cada postulante (Aprobado / Desaprobado / Ausente). Fase 7.4 (ascenso + historial) queda cubierta porque `registrar_resultado_examen` ya asciende `profiles.grado_actual` e inserta la fila de `graduaciones` al aprobar.

## Cambios Implementados

### 1. BD `[x]`
- `planilla_mesa_examen(p_mesa)` (`SECURITY DEFINER`, solo maestro examinador dueño de la mesa) se reutiliza tal cual.
- **v1.1 — migración `supabase/migrations/20260922153640_resultados_mencion_doble_graduacion.sql`:**
  - `postulaciones_examen`: `mencion_especial boolean not null default false`, `promocion_doble boolean not null default false`.
  - `graduaciones`: mismas dos banderas (el salto queda además en `grado_nuevo`).
  - `comment on column public.postulaciones_examen.grado_aspirado` registrando la sobreescritura.
  - `drop function registrar_resultado_examen(uuid, text)` + nueva firma `registrar_resultado_examen(p_postulacion uuid, p_resultado text, p_mencion_especial boolean default false, p_promocion_doble boolean default false)` (`SECURITY DEFINER`): valida maestro + dueño + estado `postulado`; rechaza mención/doble si el resultado no es `aprobado`; en doble exige `grado_actual ∈ [blanco … azul_punta_roja]` y calcula +2; escribe banderas, `grado_aspirado` = grado otorgado, `graduaciones` y asciende `profiles.grado_actual` bajo `app.aprobacion_examen`. `revoke/grant` a `authenticated`.
  - Migración aplicada y verificada con `supabase db push --linked`; `database.types.ts` regenerado. `supabase db lint --linked` sin hallazgos nuevos (solo el preexistente de torneos).

### 2. Tipos — `mobile/src/lib/perfil.ts` `[x]`
```ts
export type ResultadoExamen = Exclude<EstadoPostulacion, 'postulado'> // 'aprobado' | 'desaprobado' | 'ausente'
export type FilaPlanillaExamen = {
  postulacion_id; alumno_id; nombre_completo; edad: number | null;
  peso: number | null; grado_actual: Grado | null; grado_aspirado: Grado;
  estado: EstadoPostulacion; mencion_especial: boolean; promocion_doble: boolean
}
export type PostulacionExamen = { …; mencion_especial: boolean; promocion_doble: boolean }
export type ResumenEvaluacion = { total: number; evaluados: number; pendientes: number }
export function resumirEvaluacion(filas: FilaPlanillaExamen[]): ResumenEvaluacion
export const GRADO_TOPE_DOBLE_GRADUACION: Grado = 'azul_punta_roja'
export function esElegibleDobleGraduacion(grado: Grado | null): boolean
export function etiquetaResultadoExamen(resultado): string
export const MENSAJE_YA_EVALUADA = 'Esta postulación ya fue evaluada.'
```

### 3. Acciones — `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `obtenerPlanillaMesa(mesaId)`: llama en paralelo al RPC `planilla_mesa_examen` (datos técnicos) y a `listarPostulacionesMesa` (estado + banderas) y **fusiona por `postulacion_id`**; si no hay coincidencia, asume `postulado` / sin banderas.
- `registrarResultadoExamen(postulacionId, resultado, mencionEspecial, promocionDoble)`: invoca el RPC; `data !== true` ⇒ error genérico.
- `listarPostulacionesMesa` selecciona también `mencion_especial` y `promocion_doble`.
- Ambas declaradas en `AuthGlobalValue` y en el `useMemo` del provider.

### 4. Pantalla — `mobile/src/app/(tabs)/maestro/mesas/[id]/planilla.tsx` (nueva) `[x]`
- Cabecera con fecha, lugar, estado de la mesa y resumen (`Evaluados X de Y`, pendientes).
- Fila por alumno con **nombre, edad, peso** y, si está pendiente, **grado actual → grado aspirado**; si ya se evaluó, **"Grado otorgado"**.
- Con `estado === 'postulado'`: casilla **"Mención especial"** + botones **Aprobado / Doble graduación / Desaprobado / Ausente** (el de doble solo si el grado actual es elegible), con `Alert` de confirmación que refleja mención y doble.
- Con resultado ya cargado: badge con `etiquetaResultadoExamen` ("Aprobado", "Aprobado · Mención especial", "Doble graduación", …).
- Si la mesa es ajena: mensaje de solo-lectura.
- Si la mesa está **`abierta`**: aviso "Cerrá la mesa para poder evaluar" (el detalle de la mesa ahora avisa al presionar).
- Recarga la planilla tras cada resultado; `useFocusEffect` + fail gracefully.

### 5. Detalle de mesa — `maestro/mesas/[id].tsx` `[x]`
- Botón **"Abrir planilla de evaluación"** (solo dueño). **v1.1:** ya no queda mudo; con la mesa `abierta` muestra un `Alert` que ofrece **cerrarla**, y si no hay postulados avisa que no hay alumnos.
- **v1.1:** el detalle de postulaciones muestra "Grado otorgado" cuando ya está evaluado y la etiqueta del desenlace (mención/doble).
- **v1.1 (instructor):** `instructor/mesas/[id].tsx` muestra la etiqueta del desenlace para el profesor (solo lectura).

### 6. Navegación y menú `[x]`
- `maestro/_layout.tsx`: registrada `mesas/[id]/planilla` ("Planilla de evaluación").
- `maestro/index.tsx`: fila **"Planilla técnica de evaluación"** habilitada (abre el listado de mesas para elegir cuál evaluar).

### 7. Documentación `[x]`
- Nuevo plan `mobile-planilla-evaluacion.md` (este archivo).
- `workflow-implementacion-mobile.md`: Fase 7.3 implementada y **7.4 cubierta** por el RPC; mención y doble graduación.
- `srs-sistemaDeGestionTaekwondo.md` §3.7, `ReglasyRestricciones-SistemaTaekwondoITF.md` §4, `databaseModel.md`, `bd-gestion-escuela.md`.
- `README.md` y `pendientes-pruebas.md`.

### 8. Extensión v1.1 — mención especial y doble graduación `[x]`
- **Mención especial:** bandera sobre un `aprobado` (simple o doble); **combinable** con la doble graduación. Se registra en `postulaciones_examen.mencion_especial` y `graduaciones.mencion_especial`.
- **Doble graduación:** el alumno se salta un cinturón (grado **+2**). Solo si el grado actual está entre `blanco` y `azul_punta_roja`; tope `azul_punta_roja → rojo_punta_negra`. Se registra en `promocion_doble` y el salto queda en `graduaciones.grado_nuevo`.
- Para `rojo`, `rojo_punta_negra` y dans, el máximo es **mención especial** (sin doble).
- El RPC valida el límite en el servidor y la UI no ofrece el botón fuera de rango.
- `desaprobado`/`ausente` nunca llevan mención ni doble (RPC + UI).

## Decisiones de diseño

### Sobreescritura de `grado_aspirado`
- **Decisión:** al evaluar, `registrar_resultado_examen` guarda en `postulaciones_examen.grado_aspirado` el **grado final otorgado** (+1 en aprobado simple, +2 en doble graduación).
- **Motivo:** reflejar el resultado real en la postulación sin agregar una columna nueva.
- **Caveat (a documentar a fondo en el futuro):** el nombre de la columna deja de describir su contenido una vez evaluada; mientras está `postulado` sigue siendo la aspiración +1. En la UI se etiqueta **"Aspira a"** si `postulado` y **"Grado otorgado"** si ya está evaluada.
- **Fuente de verdad histórica:** `graduaciones` (`grado_anterior`/`grado_nuevo` + banderas). La diferencia de grados se lee de ahí, no de `grado_aspirado`.
- **Registro canónico:** `comment on column` en la migración + `databaseModel.md` + SRS §3.7 + Reglas §4.

## Criterios de Aceptación y Verificación
- [x] El maestro examinador abre la **planilla** de su mesa y ve nombre, edad, peso y grados.
- [x] Solo el **dueño de la mesa** ve la planilla (la RPC devuelve 0 filas a otro maestro; la UI muestra solo-lectura).
- [x] Registra **individualmente** Aprobado / Desaprobado / Ausente con **confirmación** previa.
- [x] Con la mesa **abierta**, al presionar "Abrir planilla" aparece el aviso con opción de **cerrar la mesa**.
- [x] Un `aprobado` **asciende** `grado_actual` y crea fila en `graduaciones`; `desaprobado`/`ausente` no ascienden (7.4).
- [x] **Mención especial** combinable con aprobado simple o con **doble graduación**; nunca con desaprobado/ausente.
- [x] **Doble graduación** (grado +2) solo de `blanco` a `azul_punta_roja`; `azul_punta_roja → rojo_punta_negra` funciona; `rojo`/dans la rechazan y la UI no ofrece el botón.
- [x] Tras una evaluación, `grado_aspirado` muestra el **grado otorgado**.
- [x] Una postulación ya evaluada no se puede volver a cargar (RPC + UI).
- [x] `supabase db push --linked` aplicado; `db lint --linked` sin hallazgos nuevos.
- [x] `npm run typecheck` limpio; `npm run lint` sin hallazgos nuevos.

> **Nota de evolución:** si se quiere permitir **corregir** un resultado ya cargado, hace falta un RPC/migración que revierta el ascenso y los registros de `graduaciones` (fuera de alcance).

---
🐧
