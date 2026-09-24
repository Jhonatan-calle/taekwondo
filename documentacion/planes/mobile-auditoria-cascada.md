# Plan: Auditoría en Cascada para Superiores (Fase 5, ítem 3) — `mobile-auditoria-cascada.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: pestaña de Auditoría para el Maestro con locaciones, montos, estado de pago derivado y comprobantes de toda su rama descendente (SRS §2). |
| 1.1 | 2026-09-21 | Correcciones de revisión: (1) se aclara que `comprobantes_select_superior` es una política de **Supabase Storage** (`storage.objects`) y **no** una tabla —no existe tabla de comprobantes; (2) se documenta la verificación de `locaciones.valor_alquiler` como **existente** (no se crea migración redundante de columna) y se corrige la **contradicción residual** del `workflow-implementacion-mobile.md` (decía que el valor del alquiler "no se solicita", contra el SRS §3.3); (3) se agregan criterios de verificación con `supabase db push`. |
| 1.2 | 2026-09-24 | **Auditoría agrupada por rama** (plan `mobile-auditoria-rama-agrupada.md`): se agrupa por subordinado directo con las locaciones de toda su rama; las de descendientes indirectos se marcan "De su rama" (privacidad) y el filtro pasa a ser **por rama**. Nuevo helper `rama_descendientes` (solo ids). |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **La seguridad ya existe:** las políticas de auditoría están creadas y verificadas:
   - `locaciones_select_superior` (tabla `locaciones`)
   - `pagos_alquiler_select_superior` (tabla `pagos_alquiler`)
   - `comprobantes_select_superior` (**Storage**, sobre `storage.objects`)
   No se recrean.
3. **`comprobantes_select_superior` es Storage, no una tabla:** las Reglas §3 establecen que los alquileres se manejan "con comprobantes adjuntos en storage privado"; `databaseModel.md` confirma que **no existe tabla de comprobantes**. La fila de `pagos_alquiler` solo guarda `comprobante_url` (el path en el bucket privado `comprobantes`).
4. **`locaciones.valor_alquiler` YA EXISTE:** columna `numeric NOT NULL` con `check (valor_alquiler >= 0)`, aplicada por `20260921215825_locaciones_valor_alquiler.sql` y **verificada en remoto**. **No se crea migración de columna.**
5. **Reutilizar:** `es_subordinado_de`, `descendientes`, `obtenerUrlComprobante`.
6. **Solo lectura:** el auditor no crea, edita ni borra nada.
7. **No exponer datos personales de alumnos** (privacidad en cascada, SRS §2).
8. **Fail gracefully** con `ejecutarConsulta` + `MENSAJE_ERROR_GENERICO`.

## Contexto / Objetivo
El SRS §2 (y Reglas §2) exige que **cualquier Maestro en la cadena de mando audite recursivamente** a sus instructores subordinados, viendo pagos de alquileres y comprobantes de toda su rama inferior. La RLS ya lo garantiza; faltaba la UI: el tab Maestro no tenía layout ni pantallas y la fila estaba deshabilitada.

### "Vencimientos": derivado, no almacenado
El modelo **no** tiene fecha de vencimiento (ni en `locaciones` ni en `pagos_alquiler`; el SRS §3.3 no la menciona). El estado se **deriva del último pago**:
- **al_dia:** tiene pago del mes actual o posterior.
- **vencida:** el último periodo pagado es anterior (`meses_adeudados > 0`).
- **sin_pagos:** nunca se registró un pago.

## Cambios Implementados

### 1. BD — verificación (sin migración nueva) `[x]`
- **`locaciones.valor_alquiler` verificado en remoto:** `numeric`, `NOT NULL`, `check (valor_alquiler >= 0)`. **No se creó migración** (un `ALTER ... ADD COLUMN` fallaría por existir ya).
- **Políticas de auditoría verificadas en remoto:** `locaciones_select_superior` y `pagos_alquiler_select_superior` (tablas) + `comprobantes_select_superior` (`storage.objects`).
- `es_subordinado_de` y `descendientes` son **recursivos**, por lo que la lectura alcanza descendientes indirectos (nietos), no solo directos.
- `supabase db push --linked`: **sin migraciones pendientes** (esquema alineado).

### 2. Tipos y helper `[x]`
- `mobile/src/lib/perfil.ts`: `EstadoPagoAlquiler` y `LocacionAuditada`.
- `estadoPagoAlquiler(ultimoPeriodo, periodoActual)` → `{ estado, meses_adeudados }`.

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarInstructoresSubordinados()` — usa el RPC `descendientes` para armar la lista del filtro.
- `listarLocacionesAuditadas(instructorId?)` — consulta `locaciones` + `pagos_alquiler` + dueño (`profiles`); la RLS `*_select_superior` limita a la rama; calcula el estado de pago.
- Reutiliza `obtenerUrlComprobante` (enlace firmado de 1 h sobre el bucket privado).

### 4. Pantallas — `mobile/src/app/(tabs)/maestro/` `[x]`
1. **`_layout.tsx` (nuevo):** Stack del tab con guard de `esMaestro` y registro de `auditoria` y `auditoria/[id]`.
2. **`auditoria.tsx` (nueva):** listado de locaciones de la rama con nombre, **dueño (instructor)**, valor pactado, último pago, **badge de estado** (Al día / Vencida con meses / Sin pagos) y filtro "Toda mi rama / instructor".
3. **`auditoria/[id].tsx` (nueva):** detalle de solo lectura con valor pactado, estado de pago, historial y **"Comprobante"** (enlace firmado → visor nativo).
4. **`index.tsx`:** fila **"Auditoría de locaciones en cascada"** habilitada.

### 5. Documentación `[x]`
- Nuevo plan `mobile-auditoria-cascada.md` (este archivo).
- **`workflow-implementacion-mobile.md`:** Fase 5.3 implementada y **corregida la frase residual** que decía que el valor del alquiler "no se solicita en este paso" (contradecía las líneas 21/94 del mismo documento y al SRS §3.3).
- `databaseModel.md`: nota de que el **vencimiento es derivado** y de que los comprobantes viven en **Storage** (no hay tabla).
- `README.md`: fila del plan.
- `pendientes-pruebas.md`: prueba de auditoría con cuenta de **nieto** y de aislamiento.

## Criterios de Aceptación y Verificación
- [x] La pestaña Maestro tiene layout, guard de `esMaestro` y la fila de auditoría habilitada.
- [x] El listado muestra locaciones de **toda la rama** con el **dueño** y el **valor pactado**.
- [x] Estado de pago derivado: **Al día** / **Vencida** (con meses adeudados) / **Sin pagos**.
- [x] Filtro por instructor subordinado.
- [x] El Maestro **abre el comprobante** de un subordinado (enlace firmado sobre Storage privado).
- [x] Vista **solo lectura** (sin alta/edición/borrado).
- [x] **Verificado** que `locaciones.valor_alquiler` existe en remoto —**sin** nueva migración de columna.
- [x] **Verificado** que `comprobantes_select_superior` es una política de **Storage** (`storage.objects`) y no una tabla; el modelo no tiene tabla de comprobantes.
- [x] `workflow-implementacion-mobile.md` **sin contradicciones** sobre el valor pactado.
- [x] `supabase db push --linked` sin migraciones pendientes.
- [x] Migración/esquema: `db lint` sin hallazgos nuevos.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.
- [ ] **Pendiente de dispositivo:** verificar con una cuenta de **nieto** (descendiente indirecto) que la lectura en cascada funciona, y con una cuenta **ajena** que queda bloqueada.

---
🐧
