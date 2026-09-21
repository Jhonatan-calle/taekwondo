# Plan: Pagos de Alquiler y Storage (Fase 5, ítem 2) — `mobile-pagos-alquiler.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: registro del pago de alquiler mensual (periodo, monto, fecha), adjunto de comprobante (cámara/galería/PDF) al bucket privado y visualización por enlace firmado. |
| 1.1 | 2026-09-21 | **Corrección de diagnóstico:** se aclara que `pagos_alquiler.comprobante_url` **ya existe en la BD** (lo que faltaba era documentarla en `databaseModel.md`). Se precisan los hallazgos por capa (BD vs. documentación vs. app) y se incorporan los **criterios de aceptación de RLS**: la excepción de auditoría (el superior jerárquico accede a los comprobantes de sus subordinados) y el bloqueo de usuarios ajenos. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **`comprobante_url` ya existe:** se creó en `20260919025655_locaciones_y_alquileres.sql` (`text`, nullable). **No se re-crea**; la migración nueva solo agrega la unicidad de periodo.
3. **El bucket es privado (por diseño):** no hay URL pública. Se guarda el **path** y se firma al visualizar (enlace temporal de 1 h). El workflow decía "URL pública" y quedó corregido.
4. **Excepción de auditoría (SRS §2):** el **superior jerárquico** del dueño sí accede a pagos y comprobantes de sus subordinados; un usuario ajeno no.
5. **Fail gracefully:** toda comunicación con Supabase vía `ejecutarConsulta`/try-catch con `registrarError` y `MENSAJE_ERROR_GENERICO`.
6. **Un periodo, un pago:** no se puede registrar dos veces el mismo `(locación, periodo)`.
7. **Auditoría de superiores en pantalla propia = Fase 5.3**, fuera de alcance.

## Contexto / Objetivo
Registrar el pago mensual del alquiler de cada locación (periodo, monto pagado y fecha), adjuntando el comprobante (foto o PDF). El comprobante va al bucket privado `comprobantes` y la fila guarda su ruta; la visualización usa un enlace firmado. Esto habilita la auditoría de infraestructura del superior (SRS §2) y prepara la Fase 5.3.

## Hallazgos clave (por capa)
- **BD:** `pagos_alquiler` ya tiene `comprobante_url text` (verificado en remoto). El bucket `comprobantes` (privado) y sus políticas de storage ya existen, igual que las políticas de `pagos_alquiler` (dueño + superior). **Lo único que faltaba en BD** era el índice único de periodo.
- **Documentación:** `databaseModel.md` **omitía** `comprobante_url` en el bloque `PAGOS_ALQUILER` → se agregó.
- **App:** no existía nada de pagos; faltaba además `expo-file-system` para subir el binario.

## Cambios Implementados

### 1. BD — migración `supabase/migrations/20260921231920_pagos_alquiler_reglas.sql` `[x]`
```sql
create unique index if not exists pagos_alquiler_locacion_periodo_unico_idx
  on public.pagos_alquiler (locacion_id, periodo);
```
- `comprobante_url` **no** se re-crea (ya existía).
- Sin cambios de políticas: ya cubren el flujo en `pagos_alquiler` y `storage.objects`.
- Verificado en remoto: índice único creado; políticas `comprobantes_upload_propio`, `select_propio`, `select_superior`, `delete_propio` presentes.

### 2. Dependencia `[x]`
- `npx expo install expo-file-system` (quedó `~57.0.7`) para referenciar el archivo elegido como binario subible.

### 3. Tipos y validadores `[x]`
- `mobile/src/lib/perfil.ts`: `PagoAlquiler`, `ArchivoAdjunto`, `DatosPagoAlquiler`.
- Helpers: `esPeriodoValido('AAAA-MM')`, `mesActual()`, `formatearPeriodo()`, `esFechaValida()` (no futura). Reutiliza `esMontoValido`/`formatearMonto`.

### 4. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarPagosAlquiler(locacionId)` — ordenado por periodo desc.
- `registrarPagoAlquiler(datos)`:
  1. sube el comprobante a `comprobantes/<uid>/<timestamp>-<periodo>.<ext>` con `supabase.storage.upload` (binario, sin base64);
  2. inserta la fila con el **path** en `comprobante_url`;
  3. si el insert falla, **elimina el archivo** subido (sin huérfanos).
- `obtenerUrlComprobante(path)` → `createSignedUrl(path, 3600)`.
- `eliminarPagoAlquiler(pagoId, path)` → borra la fila y el archivo (limpieza best-effort).
- Errores de storage registrados vía `registrarError` (no pasan por el tipo `PostgrestError`).

### 5. Pantallas `[x]`
- **`locacion/[id].tsx`:** sección **"Pagos de alquiler"** con historial (periodo formateado, monto, fecha), botón **"Comprobante"** (enlace firmado → visor nativo del dispositivo vía `Linking.openURL`), eliminar con confirmación, y **"+ Registrar pago"**.
- **`locacion/[id]/pago.tsx` (nueva):** periodo (por defecto el mes actual), monto (prellenado con el `valor_alquiler` pactado, editable), fecha de pago (por defecto hoy) y adjunto opcional con tres orígenes (**Cámara / Galería / PDF**), con vista previa de imagen y opción de quitar.
- **`_layout.tsx`:** registrada la ruta `locacion/[id]/pago` ("Registrar pago de alquiler").

### 6. Documentación `[x]`
- Nuevo plan `mobile-pagos-alquiler.md` (este archivo).
- `databaseModel.md`: se agregó `comprobante_url` al bloque `PAGOS_ALQUILER` y la nota de pagos/comprobantes.
- `workflow-implementacion-mobile.md`: Fase 5.2 marcada implementada; se corrigió "URL pública" → **path + enlace firmado**.
- `README.md`: fila del plan.

## Criterios de Aceptación y Verificación
- [x] Registrar pago con periodo, monto y fecha; aparece en el historial de la locación.
- [x] Adjuntar foto (cámara/galería) o PDF y subirlo al bucket privado `comprobantes`.
- [x] "Comprobante" abre un **enlace firmado temporal** (no URL pública).
- [ ] **RLS — excepción de auditoría (SRS §2):** un **superior jerárquico** del dueño **sí** lee los pagos (`pagos_alquiler_select_superior`) y **sí** firma/abre el comprobante (`comprobantes_select_superior`). *Verificación manual con dos cuentas vinculadas por linaje.*
- [ ] **RLS — aislamiento:** un usuario **ajeno** (sin relación de linaje) **no** lee los pagos ni puede firmar el comprobante. *Verificación manual con una cuenta sin linaje.*
- [ ] **RLS — escritura restringida:** solo el dueño inserta/actualiza el pago y sube/borra el archivo (`owner = auth.uid()`).
- [x] Bloqueo de dos pagos del mismo `(locación, periodo)` por índice único.
- [x] Si el insert falla tras subir el archivo, el archivo se elimina (sin huérfanos).
- [x] `databaseModel.md` documenta `comprobante_url`.
- [x] Migración aplicada; `db lint` sin hallazgos nuevos.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

> **Nota de verificación:** las pruebas de RLS de auditoría/aislamiento requieren dos cuentas reales
> (superior y ajeno). Quedan registradas como pendientes de dispositivo.

---
🐧
