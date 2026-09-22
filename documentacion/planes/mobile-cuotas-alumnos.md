# Plan: Registro de Cuotas de Alumnos (Fase 6) — `mobile-cuotas-alumnos.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: registro manual de cuotas mensuales (periodo, monto, fecha), prevención de duplicados por periodo, historial en el detalle del alumno y listado de cobranzas por periodo. |
| 1.1 | 2026-09-21 | Correcciones de revisión: (1) se quita `observaciones` de tipos, formulario y criterios; (2) se alinean los nombres de columna con la **BD real** (`fecha`, `creado_por`) en lugar de los que figuraban en el diagrama (`fecha_pago`, `profesor_id`), que describía columnas inexistentes; (3) se corrige el bloque `PAGOS_CUOTA` de `databaseModel.md` para que refleje la tabla real. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **La BD es la fuente de verdad para los nombres de columna.** `pagos_cuota` real tiene: `id`, `alumno_id`, `fecha`, `monto`, `periodo`, `observaciones`, `creado_por`, `creado_en`. **No** tiene `fecha_pago` ni `profesor_id`.
3. **`databaseModel.md` estaba desactualizado:** su bloque `PAGOS_CUOTA` describía `fecha_pago` y `profesor_id` (inexistentes) y omitía `observaciones`/`creado_por`. **Se corrige el diagrama, no la tabla.**
4. **Sin migración:** la tabla ya tiene `unique (alumno_id, periodo)` → la unicidad que exige el workflow está garantizada por el esquema.
5. **Solo el profesor directo** accede a las cuotas (RLS `es_alumno_directo_de`). Los superiores **no** ven cuotas: las Reglas §2 limitan su visibilidad a métricas **anonimizadas** de alumnos; una cuota es dato financiero personal, no infraestructura.
6. **El alumno no consulta sus cuotas** (no tiene cuenta; decisión v1).
7. **Sin adjuntos** en cuotas (a diferencia de los alquileres).
8. **No reinventar:** reutilizar `esMontoValido`, `esPeriodoValido`, `mesActual`, `formatearPeriodo`, `formatearMonto`.
9. **Fail gracefully** con `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO`.

## Contexto / Objetivo
Fase 6 del workflow: el profesor registra manualmente el pago mensual de un alumno directo (alumno, periodo, monto y fecha) y la app **previene** registrar dos pagos del mismo periodo. La tabla y su restricción de unicidad ya existían desde `20260919025658_pagos_cuota.sql`; el trabajo es íntegramente de aplicación.

## Cambios Implementados

### 1. BD — verificación y saneamiento documental `[x]`
- **Sin migración de esquema.** Verificado en remoto: `pagos_cuota_alumno_id_periodo_key UNIQUE (alumno_id, periodo)`.
- **`databaseModel.md` corregido** (bloque `PAGOS_CUOTA` y su relación en el diagrama):
  - se eliminan `fecha_pago` y `profesor_id` (no existen);
  - se agregan `fecha`, `observaciones` y `creado_por`;
  - la relación del diagrama pasa de `PROFILES ||--o| PAGOS_CUOTA : profesor_id` a `: creado_por`.
- `supabase db push --linked`: sin migraciones pendientes.

### 2. Tipos en `mobile/src/lib/perfil.ts` `[x]`
```ts
export const MENSAJE_CUOTA_DUPLICADA = 'Ya registraste un pago para ese periodo.'
export type PagoCuota = Pick<PagoCuotaRow, 'id' | 'alumno_id' | 'fecha' | 'monto' | 'periodo'>
export type DatosPagoCuota = { alumno_id: string; periodo: string; monto: number; fecha: string }
export type CuotaAlumno = {
  alumno_id: string; nombre_completo: string; grado_actual: Grado | null
  periodo: string; estado: 'pagado' | 'pendiente'; pago_id: string | null; monto: number | null
}
```
- **Sin `observaciones`** (la columna queda en BD, sin uso por la app).

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarCuotasAlumno(alumnoId)` — historial por alumno, orden por periodo desc.
- `listarCuotasPorPeriodo(periodo)` — cruza los alumnos directos con los pagos del periodo; devuelve el estado pagado/pendiente de cada uno.
- `registrarCuota(datos)`:
  - **pre-chequeo** de duplicado → `MENSAJE_CUOTA_DUPLICADA`;
  - insert con `alumno_id`, `periodo`, `monto`, **`fecha`** y **`creado_por = auth.uid()`** (columna real que identifica al profesor que registra);
  - **red de seguridad** ante el `23505` (carrera entre dispositivos) → también devuelve el mensaje de duplicado.
- `eliminarCuota(cuotaId)` — permite corregir un cobro mal cargado.

### 4. Pantallas `[x]`
1. **`alumno/[id].tsx` (extendida):** sección **"Cuotas"** con el **estado del mes actual** (Pagado/Pendiente), historial de periodos, botón **"+ Registrar cuota"** y eliminar con confirmación.
2. **`alumno/[id]/cuota.tsx` (nueva):** formulario con **periodo** (default mes actual), **monto percibido** y **fecha de pago** (default hoy). Valida con los helpers existentes; el duplicado devuelve el mensaje específico.
3. **`instructor/cuotas.tsx` (nueva):** listado de **cobranzas por periodo** con selector de los últimos 6 meses, resumen "X de Y alumnos pagaron", badges Pagado/Pendiente y acceso directo a registrar el pendiente.
4. **`instructor/index.tsx`:** fila **"Cuotas de alumnos"** habilitada.
5. **`instructor/_layout.tsx`:** registradas `alumno/[id]/cuota` y `cuotas`.

### 5. Fuera de alcance (plan aparte)
- **Rediseño de la pantalla de Inicio** como panel operativo (resumen del mes, acciones rápidas, avisos de cuotas pendientes). La base de datos y las acciones de este plan quedan listas para alimentarlo.

### 6. Documentación `[x]`
- Nuevo plan `mobile-cuotas-alumnos.md` (este archivo).
- `databaseModel.md`: bloque `PAGOS_CUOTA` y su relación **corregidos** para reflejar la tabla real.
- `workflow-implementacion-mobile.md`: Fase 6 marcada implementada, aclarando que el historial es del **profesor directo**.
- `README.md`: fila del plan.
- `pendientes-pruebas.md`: prueba de duplicado y de aislamiento entre profesores.

## Criterios de Aceptación y Verificación
- [x] El profesor registra una cuota (**periodo, monto, fecha**) para un alumno directo.
- [x] El insert persiste **`creado_por = auth.uid()`** (profesor que registra).
- [x] Intentar el **mismo periodo** muestra un mensaje amable y no crea una fila duplicada (pre-chequeo + red de seguridad del `23505`).
- [x] El detalle del alumno muestra el **estado del mes** y el historial de periodos.
- [x] El listado por periodo muestra **pagados vs. pendientes** entre los alumnos directos.
- [x] Solo el **profesor directo** accede a las cuotas (RLS intacta).
- [x] **Sin campo `observaciones`** en tipos ni formulario.
- [x] Se puede **eliminar** una cuota mal cargada.
- [x] `databaseModel.md` refleja la tabla real (sin `fecha_pago` ni `profesor_id`).
- [x] Verificado en remoto que `pagos_cuota` tiene `UNIQUE (alumno_id, periodo)`, **sin migración nueva**.
- [x] `supabase db push --linked` sin pendientes.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

---
🐧
