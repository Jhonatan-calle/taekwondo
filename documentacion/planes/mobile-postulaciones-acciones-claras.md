# Plan: Claridad de las acciones en "Tus postulaciones" — `mobile-postulaciones-acciones-claras.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial y aprobación: en el detalle de la mesa (vista del profesor), la acción "Cobro" pasa a **"Editar cobro"** y la `✕` a un botón **"Quitar"** con texto y `accessibilityLabel`. Solo presentación; sin cambios de lógica. |

## Contexto / Problema
En `instructor/mesas/[id]` ("Tus postulaciones") cada fila mostraba dos acciones **ambiguas**:

- El texto **`Cobro`** (sustantivo) abría la edición del **derecho de examen**, pero no lo indicaba.
- El icono **`✕`** en rojo **quitaba la postulación** (acción destructiva), sin texto ni `accessibilityLabel`.

Ambas tenían el mismo peso visual, aunque son acciones muy distintas: una **edita un monto** y la otra **da de baja al alumno del examen**.

## Cambios Implementados
Archivo: `mobile/src/app/(tabs)/instructor/mesas/[id].tsx`.

**Antes:**
```
Postulado
                            Cobro    ✕
```

**Después:**
```
Postulado
              [ Editar cobro ]   [ Quitar ]
```

- **"Editar cobro"** → mismo comportamiento (navega a `postular?postulacion_id=...`); ahora explícito. Color neutro.
- **"Quitar"** → mismo comportamiento (confirmación + `quitarPostulacion`); ahora con **texto**, en rojo por ser destructivo, y `accessibilityLabel` ("Quitar la postulación de <alumno>").
- Ambas con `accessibilityRole="button"` y estilo de botón chico, consistente con el resto de la app.
- Reemplazados los estilos `editar`/`quitar` por `botonEditarCobro`/`botonQuitar` (y sus variantes de texto).

**Sin cambios de lógica:** no se tocaron los RPC, el cobro por postulación ni el flujo de postulación masiva.

## Criterios de Aceptación y Verificación
- [x] La acción de editar el derecho dice **"Editar cobro"** (ya no "Cobro").
- [x] La acción de baja dice **"Quitar"**, con texto, `accessibilityRole` y `accessibilityLabel` (ya no una `✕` suelta).
- [x] Ambas conservan su comportamiento (editar el monto / quitar con confirmación).
- [x] Jerarquía clara: "Quitar" en rojo, "Editar cobro" en neutro.
- [x] Sin cambios en RPCs ni en el flujo de cobro.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

> **Nota:** la vista del **Maestro** (`maestro/mesas/[id]`) no tiene estas acciones (es solo lectura + recaudación), por lo que no requirió cambios.

---
🐧
