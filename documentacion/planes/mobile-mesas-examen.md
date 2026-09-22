# Plan: Creación de Mesas de Examen (Fase 7, ítem 1) — `mobile-mesas-examen.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial y aprobación. Creación de mesas de examen por el Maestro (fecha, lugar, estado "abierta"), listado, detalle, edición y cierre. **Decisión de producto:** se elimina `mesas_examen.limite_inscripcion` del modelo y se corrigen el SRS §3.7, las Reglas §4, el workflow y el modelo de datos, que lo exigían, para que no se contradigan. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **Decisión de producto (no corrección documental):** el usuario determinó que el cupo máximo de la mesa no se usa en ningún flujo actual, por lo que se **elimina** `limite_inscripcion`. Esto **modifica el SRS §3.7** y las **Reglas §4**, que lo listaban como requisito. Queda registrado aquí como decisión deliberada.
3. **La tabla y las políticas ya existían:** `mesas_examen` con `estado` (`abierta|cerrada|finalizada`), select para autenticados, **insert solo con `es_maestro = true`** y update del dueño. La migración solo elimina la columna.
4. **"Maestro calificado" = `es_maestro`:** es la única calificación que modela el sistema y lo que exige la política de insert.
5. **No reinventar:** reutilizar `listarLocaciones` (chips de lugar), `esFechaValida`, `aIsoLocal`.
6. **Fail gracefully** con `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO`.
7. **Fuera de alcance:** postulación de alumnos (7.2), planilla técnica (7.3) y registro de resultados/ascenso (7.4).

## Contexto / Objetivo
Fase 7.1 del workflow: el Maestro abre una mesa de examen con **fecha**, **lugar** y estado **"abierta"**. La tabla y la seguridad ya existían; faltaba la UI en la pestaña Maestro (que hasta ahora solo tenía la Auditoría).

## Cambios Implementados

### 1. BD — migración `supabase/migrations/20260922010819_mesas_examen_sin_limite.sql` `[x]`
```sql
alter table public.mesas_examen drop column if exists limite_inscripcion;
```
- Sin cambios de políticas (no referencian la columna).
- Verificado en remoto: `mesas_examen` queda con `id, maestro_id, fecha, lugar, estado, creado_en`.

### 2. Documentos corregidos (para no contradecir al modelo) `[x]`
| Documento | Cambio |
|---|---|
| `srs-sistemaDeGestionTaekwondo.md` §3.7 | "fecha, lugar y límite de inscripción" → "**fecha y lugar**" |
| `ReglasyRestricciones-SistemaTaekwondoITF.md` §4 | "fecha, lugar, límite de inscripción" → "**fecha, lugar**" |
| `workflow-implementacion-mobile.md` Fase 7.1 | se quita "el limite maximo de participantes" |
| `databaseModel.md` | se quita `int limite_inscripcion` del bloque `MESAS_EXAMEN` |
| `planes/bd-gestion-escuela.md` | se quita el campo de la lista de columnas |
| `mobile/src/lib/database.types.ts` | regenerado (sin `limite_inscripcion`) |

### 3. Tipos en `mobile/src/lib/perfil.ts` `[x]`
```ts
export type EstadoMesa = 'abierta' | 'cerrada' | 'finalizada'
export type MesaExamen = Pick<MesaRow, 'id' | 'maestro_id' | 'fecha' | 'lugar'> & {
  estado: EstadoMesa
  cantidad_postulados: number
}
export type DatosNuevaMesa = { fecha: string; lugar: string }
```

### 4. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarMesasExamen()` — mesas visibles (RLS: cualquier autenticado) con el **conteo de postulados** y el `maestro_id` para distinguir las propias.
- `crearMesaExamen(datos)` — insert con `maestro_id = auth.uid()` y **`estado = 'abierta'`**.
- `editarMesaExamen(mesaId, datos)` — fecha y lugar (política de update del dueño).
- `cambiarEstadoMesa(mesaId, estado)` — cerrar / finalizar.

### 5. Pantallas — `mobile/src/app/(tabs)/maestro/` `[x]`
1. **`mesas.tsx` (nueva):** listado con fecha, lugar, **estado** (badge) y cantidad de postulados; las mesas propias se muestran primero. Botón **"+ Nueva mesa"** (solo Maestro).
2. **`mesas/nueva.tsx` (nueva):** formulario con **fecha** y **lugar**. El lugar se elige entre las **locaciones propias** (chips) o con **"+ Otro lugar"** (texto libre). En modo edición precarga los datos. Al crear, la mesa queda **abierta**.
3. **`mesas/[id].tsx` (nueva):** detalle con fecha, lugar, estado y postulados; **Editar mesa**, **Cerrar mesa** (si está abierta) y **Finalizar mesa** (si está cerrada), solo para el dueño. Para mesas ajenas: solo lectura.
4. **`index.tsx`:** fila **"Mesas de examen"** habilitada.
5. **`_layout.tsx`:** registradas `mesas`, `mesas/nueva` y `mesas/[id]`.

## Criterios de Aceptación y Verificación
- [x] `mesas_examen` **sin** `limite_inscripcion`; migración aplicada con `supabase db push --linked`.
- [x] El **SRS §3.7**, las **Reglas §4**, el workflow, el modelo y `bd-gestion-escuela.md` **ya no mencionan** el límite de inscripción (sin contradicciones).
- [x] Un **Maestro** crea una mesa con **fecha y lugar**; queda en estado **`abierta`**.
- [x] El lugar se elige de las **locaciones** propias, con opción de **escribir otro lugar**.
- [x] El listado muestra fecha, lugar, **estado** y **cantidad de postulados**, con las propias primero.
- [x] Se puede **editar** (fecha, lugar) y **cerrar/finalizar** la mesa; solo el dueño.
- [x] Un usuario **sin `es_maestro`** no accede a la pestaña y no puede crear mesas (RLS).
- [x] `supabase db push --linked` sin pendientes.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

> **Nota de evolución:** si más adelante se quiere limitar la cantidad de postulantes por mesa, habrá que volver a agregar el cupo al modelo (y a los documentos). Queda anotado como posible evolución futura.

---
🐧
