# Plan: Plan de Pruebas (catálogo permanente de casos) — `mobile-plan-de-pruebas.md`

> **⚠️ Cuentas de prueba (2026-09-24):** el escenario cambió con el **reset total** a “Ale Criado”
> (`planes/db-seed-demo-ale-criado.md`); las cuentas viejas (`jhona@`, `sensei@`) ya no existen.

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Creación del **catálogo de casos de prueba** `documentacion/plan-de-pruebas.md`, permanente y por módulo, con IDs estables, fichas detalladas, matriz de roles/RLS y smoke test. Se integra al flujo de trabajo en `AGENTS.md` (referencia obligatoria, regla de mantenimiento y paso de cierre) y al índice de documentación. Se diferencia explícitamente de `pendientes-pruebas.md` (que queda como lista viva de pendientes). |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y `web/` congelados:** no se documentan sus casos.
2. **No duplicar `pendientes-pruebas.md`:** ese archivo es la lista **temporal** de lo que falta verificar (bloqueos, fechas, follow-ups); el nuevo es el **catálogo permanente** de cómo debe funcionar cada cosa. Se agrega una nota cruzada en ambos.
3. **No inventar comportamiento:** cada caso se redacta a partir del **código y los planes ya implementados**, sin asumir features sin construir.
4. **Este documento es de mantenimiento continuo:** debe crecer con cada implementación (regla en `AGENTS.md`).

## Contexto / Objetivo
El proyecto no tenía un catálogo de pruebas: existía `pendientes-pruebas.md` (to-do temporal) y los planes individuales, pero **no** un documento único que describa cómo verificar **todas** las funciones, incluida la regresión de lo que ya anda bien.

## Cambios Implementados

### 1. `documentacion/plan-de-pruebas.md` (nuevo) `[x]`
Estructura:
- **Metadatos + historial** y regla de mantenimiento.
- **1. Cómo usar:** entorno (Expo Go en dispositivo), prioridades **Smoke** / **Regresión**, IDs `TC-<MÓDULO>-<NN>` (no se reutilizan).
- **2. Usuarios y datos de prueba:** cuentas del seed (Jhonatan Maestro, Profesor Jhona, Sensei Seed) y tabla de locaciones con sus estados de pago.
- **3. Casos por módulo** (fichas con rol, precondición, pasos, esperado y referencia):
  `TC-AUTH` · `TC-ONB` · `TC-LIN` · `TC-NAV` · `TC-INI` · `TC-ALU` · `TC-GRU` · `TC-LOC` · `TC-CLA` · `TC-ASI` · `TC-CUO` · `TC-ALQ` · `TC-AUD` · `TC-MES` · `TC-POS` · `TC-EVA`
- **4. Matriz de roles y RLS:** tabla de "quién ve/hace qué" + casos de recursividad, aislamiento horizontal, escritura restringida y gates anti-escalada.
- **5. Resiliencia:** fail gracefully por módulo y registro en `errores_runtime`.
- **6. Smoke test:** 22 casos para verificación rápida.
- **7. Pendientes de cobertura:** Fase 8 (dashboard), reasignación de grupo; torneos excluidos.

### 2. `AGENTS.md` (3 ediciones) `[x]`
- **Docs de referencia obligatoria:** agregado `documentacion/plan-de-pruebas.md` como catálogo de casos de uso.
- **Documentación (mantener sincronizada):** regla nueva → al implementar o modificar una función, **agregar o actualizar sus casos** en el catálogo.
- **Flujo de trabajo → Cierre (punto 5):** sumado "agregar/extender los casos en `plan-de-pruebas.md`" a las verificaciones de cierre.

### 3. `documentacion/README.md` `[x]`
- Fila nueva del plan y fila del catálogo, aclarando la diferencia con `pendientes-pruebas.md`.

### 4. `documentacion/pendientes-pruebas.md` `[x]`
- Nota de cabecera enlazando al catálogo, para dejar clara la separación de responsabilidades.

## Criterios de Aceptación y Verificación
- [x] Existe `documentacion/plan-de-pruebas.md` con casos para **todos** los módulos implementados.
- [x] Los casos tienen **ID estable**, prioridad y ficha con pasos y resultado esperado.
- [x] Incluye **matriz de roles/RLS** y casos de **resiliencia**.
- [x] Incluye un **smoke test** de verificación rápida.
- [x] `AGENTS.md` referencia el catálogo, define su regla de mantenimiento y lo incluye en el cierre.
- [x] `README.md` actualizado, con la diferencia respecto de `pendientes-pruebas.md`.
- [x] No se duplica `pendientes-pruebas.md`: se agrega nota cruzada en ambos.

---
🐧
