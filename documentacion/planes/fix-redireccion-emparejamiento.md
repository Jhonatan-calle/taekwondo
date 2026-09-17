# Plan: Fix `NEXT_REDIRECT` ingerido por `try/catch` en `generarEmparejamiento`

> **Metadatos**
> - **Versión:** 0.2
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-17

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 0.1 | 2026-09-17 | Borrador inicial. Proponía helper propio `esErrorRedireccion` en `lib/errores.ts`. |
| 0.2 | 2026-09-17 | **Revisión del usuario:** eliminar el helper custom (viola la regla de no reinventar lógica existente) y usar la **función nativa de Next** en el `catch`. Se verificó en `next@16.3.5` que `next/navigation` NO exporta `isRedirectError` (solo existe en `next/dist/client/components/redirect-error`); el equivalente público nativo que re-lanza errores de redirección dentro de un `catch` es **`unstable_rethrow(error)`**. Aprobado con ese ajuste. |

## Restricciones y Correcciones Previas (No repetir)
1. En Server Actions, **`redirect()` de `next/navigation` lanza una excepción interna (`digest` `NEXT_REDIRECT`)**. Si el `redirect()` quedara dentro de un `try/catch` y el `catch` lo tratara como error real, la redirección se pierde y se registra un falso positivo. Regla: **los `redirect()` van SIEMPRE fuera del `try`, o el `catch` re-lanza con `unstable_rethrow(error)` antes de registrar**.
2. **No reinventar:** para re-lanzar errores de redirección DEBE usarse la función nativa (`unstable_rethrow` en Next ≥ 16, importada de `next/navigation`). NO crear helpers propios tipo `esErrorRedireccion`. (Nota: `isRedirectError` no es export público de `next/navigation` en Next 16; solo existe en la ruta interna `next/dist/client/components/redirect-error`.)
3. `try/catch` → `registrarError` + mensaje genérico. La UI nunca expone detalles técnicos.
4. NO tocar `.env*`, NO commits/push automáticos. Verificaciones finales: `npm run lint` + `npm run build`.

## Contexto / objetivo
Bug de flujo en el Módulo de Torneos: al tocar **"Generar llaves"** en `/panel`, el `redirect()` de éxito (panel/actions.ts:238) está **dentro** del `try`, y el `catch` lo intercepta:
- registra en `errores_runtime` un falso positivo (`modulo=emparejamiento, contexto=generarEmparejamiento, mensaje=NEXT_REDIRECT` — hay 2 filas reales del 2026-09-17 03:16/03:17),
- devuelve `{ error: 'No pudimos armar las llaves…' }` → el usuario ve fallo y nunca llega el banner verde.

**Datos no dañados:** el RPC `generar_llaves` (línea 232) ya corrió antes del redirect, así que `categorias/llaves/enfrentamientos` quedaron persistidas. Reintentar solo reconstruye (borra y reinserta, sin duplicados). Es estrictamente un bug de UI/flujo.

Solo `generarEmparejamiento` está afectado hoy (registro, login y `/t/<token>` tienen el `redirect()` fuera del `try`).

## Cambios concretos
### 1. Server Action — `web/src/app/(panel)/panel/actions.ts`
- Importar la función nativa: `import { redirect, unstable_rethrow } from 'next/navigation'`.
- En el `catch` de `generarEmparejamiento`, re-lanzar **antes** de `registrarError`:
```ts
} catch (error) {
  unstable_rethrow(error)   // re-lanza redirect (y notFound/forbidden); Next ejecuta la redirección
  await registrarError({ modulo: 'emparejamiento', contexto: 'generarEmparejamiento', error })
  return { error: 'No pudimos armar las llaves, intentá de nuevo en unos minutos.' }
}
```
Al re-lanzarlo, el framework intercepta y el cliente redirige a `/panel?llaves=<id>&omitidos=<N>`.
- **Sin helper nuevo:** no se toca `web/src/lib/errores.ts`.

### 2. Limpieza de falsos positivos (solo en implementación)
`update public.errores_runtime set estado='descartado', solucion='Falso positivo: NEXT_REDIRECT re-lanzado por catch vía unstable_rethrow' where contexto='generarEmparejamiento' and mensaje_error='NEXT_REDIRECT'` vía `supabase db query --linked`.

### 3. Documentación
- `documentacion/mvc/workflow.md`: nota del fix.
- Plan `fix-redireccion-emparejamiento.md`: historial + `Aprobado` con fecha al cerrar.
- La restricción preventiva (2) queda como `Restricciones y Correcciones Previas` para futuras Server Actions.

## Criterios de aceptación
- [ ] `redirect()` de éxito re-lanzado vía nativo: tocar "Generar llaves" conduce a `/panel?llaves=…` con banner verde, **sin** mensaje de error.
- [ ] Sin helpers custom de redirección (`lib/errores.ts` intacto).
- [ ] No se registran más `NEXT_REDIRECT` como `error` en `errores_runtime`.
- [ ] Falsos positivos históricos marcados como `descartado`.
- [ ] `npm run lint` + `npm run build` OK.

## Verificación manual (la hacés vos)
1. `cd web && npm run dev`; login como jhonatan.
2. `/panel` → "Torneo Seed Emparejamiento" → **"Generar llaves"**.
3. **Esperado tras el fix:** URL `/panel?llaves=<id>&omitidos=0`, banner verde "Las llaves se armaron correctamente", badge "Armado de llaves", bloque "Llaves armadas" con las 5 categorías. **Ningún** mensaje rojo.
4. Repetir 1 vez más (regenerar) → mismo resultado, sin duplicados.
5. SQL (opcional) para confirmar que no hay ruido nuevo:
```sql
select fecha, contexto, mensaje_error, estado
from public.errores_runtime
where contexto = 'generarEmparejamiento'
order by fecha desc;
```
   → solo las filas históricas, con `estado='descartado'`.