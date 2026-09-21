# Plan: Registro de Locaciones (Fase 5, ítem 1) — `mobile-registro-locaciones.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial: cierre del registro de locaciones (listado, detalle, edición, eliminación) y habilitación del menú, reutilizando el alta anticipada en la fase de grupos. Proponía **eliminar** `locaciones.valor_alquiler` por considerarla huérfana. |
| 1.1 | 2026-09-21 | **Corrección (el SRS manda):** se cancela la eliminación de `valor_alquiler`. El SRS §3.3 exige registrar el **valor de alquiler pactado** al crear un centro de entrenamiento, y la columna ya existe en la BD. La migración pasa a volverla obligatoria (`NOT NULL` + `check >= 0`); tipos, formularios, detalle, listado y documentación se alinean al SRS. Se corrigen además las restricciones del workflow y de `mobile-grupos-horarios.md` que contradecían al SRS. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **No reimplementar:** el alta (`registrar-locacion.tsx`, `crearLocacion`) y la RLS de `locaciones` ya existían desde la fase de grupos; se **extienden**, no se reescriben.
3. **El SRS es la fuente de verdad (SRS §3.3):** al registrar/editar una locación se solicitan `nombre`, `direccion` (obligatoria) y **`valor_alquiler` pactado**. **NO se elimina** `locaciones.valor_alquiler`.
4. **Dos conceptos distintos, no confundir:**
   - `locaciones.valor_alquiler` = **valor pactado** del contrato (obligatorio).
   - `pagos_alquiler.monto` = **monto pagado** en un periodo (`periodo`, `fecha_pago`, `comprobante_url`) — Fase 5.2.
5. **Alinear los docs que contradecían al SRS:** `workflow-implementacion-mobile.md` (restricción #6) y `mobile-grupos-horarios.md` (restricción #5) afirmaban que la tabla no posee monto; quedaron corregidos.
6. **Fail gracefully:** toda comunicación con Supabase vía `ejecutarConsulta` y `MENSAJE_ERROR_GENERICO`.
7. **No se toca el flujo de pagos de alquiler** (ítem 5.2, posterior).

## Contexto / Objetivo
La Fase 5.1 fue anticipada en `mobile-grupos-horarios.md` para poder asociar grupos a una locación física: ya existían tabla, RLS, formulario de alta y acciones de contexto. Sin embargo, el alta quedó **sin el valor pactado**, contradiciendo al SRS §3.3, y faltaba la gestión completa (listado, detalle, edición y eliminación).

Este plan cierra el módulo y restituye el monto pactado conforme al SRS.

---

## Cambios Implementados

### 1. BD — migración `supabase/migrations/20260921215825_locaciones_valor_alquiler.sql` `[x]`
- Backfill defensivo: `update public.locaciones set valor_alquiler = 0 where valor_alquiler is null;` (locaciones creadas en la fase de grupos, cuando el alta mínima no pedía monto).
- `alter table public.locaciones alter column valor_alquiler set not null;`
- `add constraint locaciones_valor_alquiler_no_negativo check (valor_alquiler >= 0);`
- **No se dropea** la columna.
- RLS sin cambios (`locaciones_select_dueño/superior`, `insert_profesor` —valida `es_profesor` o `es_maestro`—, `update_dueño`, `delete_dueño`).
- Verificado en remoto: columna `valor_alquiler numeric NOT NULL` + constraint `check (valor_alquiler >= 0)`.

### 2. Tipos y validadores `[x]`
- `mobile/src/lib/database.types.ts`: `locaciones.valor_alquiler: number` (Row), `number` (Insert), `number` (Update).
- `mobile/src/lib/perfil.ts`:
  ```ts
  export type Locacion = Pick<LocacionRow, 'id' | 'nombre' | 'direccion' | 'valor_alquiler'>
  export type DatosNuevaLocacion = { nombre: string; direccion: string; valor_alquiler: number }
  export type LocacionDetalle = Locacion & { grupos: { id: string; nombre: string }[] }
  ```
- Validadores/formateadores nuevos: `esMontoValido(monto)` (numérico > 0, tope 99.999.999) y `formatearMonto(monto)` (`$ 50.000,00`).

### 3. Acciones en `mobile/src/contextos/AuthGlobal.tsx` `[x]`
- `listarLocaciones()`: el `select` incluye `valor_alquiler`.
- `obtenerLocacionDetalle(locacionId)`: **nueva** — locación + `grupos(id, nombre)` por `grupos.locacion_id`, ordenados por nombre.
- `crearLocacion(datos)`: agrega `valor_alquiler` al INSERT.
- `editarLocacion(locacionId, datos)`: **nueva** — `update` de `nombre`, `direccion`, `valor_alquiler` (RLS `update_dueño`, filtrado por `creado_por`).
- `eliminarLocacion(locacionId)`: **nueva** — `delete` filtrado por `creado_por`.

### 4. Pantallas en `mobile/src/app/(tabs)/instructor/` `[x]`
1. **`locaciones.tsx` (nueva):** listado con nombre, dirección y **"Alquiler pactado"** formateado; CTA "+ Nueva locación"; acceso al detalle; estados cargando / error con reintentar / vacío con CTA.
2. **`locacion/[id].tsx` (nueva):** detalle con nombre, dirección, tarjeta **"Valor de alquiler pactado"** (con nota aclaratoria valor pactado vs. monto pagado) y **grupos asociados** navegables; acciones "Editar locación" y "Eliminar locación" (con confirmación; avisa cuántos grupos quedarán sin locación).
3. **`registrar-locacion.tsx` (extendida):** agrega el campo obligatorio **"Valor de alquiler pactado"** (`keyboardType="numeric"`, validado con `esMontoValido`) y soporta **modo edición** vía `?locacion_id=...` (precarga y llama a `editarLocacion`).
4. **`_layout.tsx`:** registradas `locaciones` ("Mis locaciones") y `locacion/[id]` ("Detalle de la locación").
5. **`instructor/index.tsx`:** habilitada la fila **"Locaciones"** → `/instructor/locaciones`.

### 5. Documentación `[x]`
- **Nuevo plan** `documentacion/planes/mobile-registro-locaciones.md` (este archivo).
- **`databaseModel.md`:** el bloque `LOCACIONES` ahora documenta `valor_alquiler` (`NOT NULL`, `check >= 0`, valor pacto del contrato).
- **`bd-gestion-escuela.md`:** sin cambios (ya listaba `valor_alquiler`; ahora queda correcto).
- **Contradicciones corregidas:** `workflow-implementacion-mobile.md` restricción #6 y Fase 5.1; `mobile-grupos-horarios.md` restricción #5.
- **`README.md`:** fila del plan agregada.

---

## Criterios de Aceptación y Verificación
- [x] `locaciones.valor_alquiler` es obligatoria (`NOT NULL` + `check >= 0`) en la BD y persiste el monto pactado al crear una locación.
- [x] El campo "Valor de alquiler pactado" es obligatorio en el alta y en la edición; se valida numérico > 0 (`esMontoValido`).
- [x] El detalle visualiza el valor pactado (formateado) y el listado lo muestra como dato secundario.
- [x] Editar la locación permite actualizar el valor pactado y se refleja al reabrir el detalle.
- [x] Se distingue el **valor pactado** (`locaciones.valor_alquiler`) del **monto pagado** (`pagos_alquiler.monto`, Fase 5.2).
- [x] Los documentos del workflow y de `mobile-grupos-horarios` quedaron alineados al SRS §3.3.
- [x] Migración aplicada con `supabase db push --linked`.
- [x] Verificación de tipos TypeScript (`npm run typecheck` en `mobile/`) limpio.

> **Actualización posterior:** el borrado de una locación con grupos asociados ya **no** los deja
> huérfanos silenciosamente: queda bloqueado y los grupos se reasignan desde la edición del grupo.
> Ver `mobile-editar-grupo-locacion.md`.

---
🐧
