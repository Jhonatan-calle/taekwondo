# Plan: Fix navegación a stacks anidados de tabs — `mobile-fix-navegacion-tab-stacks.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-23
- **Origen:** hallazgo de prueba manual (navegación desde las tarjetas del Inicio).

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-23 | Aprobado e implementado: se ancla cada stack de tab (`unstable_settings.initialRouteName`) y se navega con `withAnchor` desde el Inicio; el tab vuelve a su menú al tocarlo. |

## Restricciones y Correcciones Previas (No repetir)
1. **No romper los guards** de `Stack.Protected` ni los `<Redirect>` por faceta de cada tab.
2. **No tocar** torneos, `web/` ni `.env*`; español; sin commits automáticos.
3. **Mantener las URLs** (`/instructor/...`, `/maestro/...`): el fix es de navegación, no de rutas.

## Contexto / Diagnóstico
- Al navegar **de un tab a una pantalla profunda de otro tab** (`router.push('/instructor/cuotas')` desde Inicio), expo-router armaba el stack del tab destino **solo con esa pantalla**, sin `instructor/index` debajo.
- Consecuencia: no había forma de llegar al **menú del tab**; el back salía al Inicio (comportamiento por defecto del tab) y volver a tocar la pestaña no reaccionaba.
- Comportamiento documentado por Expo (Router settings): `initialRouteName` solo aplica al deep-link; en navegación imperativa hace falta **`withAnchor`** para insertar el ancla debajo.

## Cambios implementados
### 1. Ancla de los stacks anidados
- `mobile/src/app/(tabs)/instructor/_layout.tsx` y `...(tabs)/maestro/_layout.tsx`:
  ```ts
  export const unstable_settings = { initialRouteName: 'index' };
  ```
### 2. Ancla al cruzar de tab desde el Inicio
- `mobile/src/app/(tabs)/index.tsx`: todas las navegaciones a otro tab usan
  `router.push('<ruta>', { withAnchor: true })` (tarjetas y acciones rápidas de Instructor y Maestro):
  `/instructor/alumnos`, `/instructor/grupos`, `/instructor/cuotas`, `/instructor/clases`,
  `/instructor/alta-alumno`, `/maestro/auditoria`, `/maestro/mesas`, `/maestro/mesas/nueva`.
### 3. Tocar la pestaña vuelve al menú del tab
- `mobile/src/app/(tabs)/_layout.tsx`: `listeners.tabPress` en `instructor` y `maestro` →
  `router.navigate('/instructor' | '/maestro')` (pop al índice del stack; comportamiento predecible).

## Verificación ejecutada
- `npm run typecheck` → **0 errores**.
- `npm run lint` → **0 problemas**.
- Prueba manual en dispositivo: ver `pendientes-pruebas.md` / `TC-NAV-05`.

## Criterios de aceptación
- [x] Desde el Inicio, abrir una tarjeta de otro tab muestra la **flecha de atrás** y el back vuelve al **menú del tab**.
- [x] Tocar la pestaña **Instructor**/**Maestro** (desde cualquier pantalla) lleva al **menú del tab**.
- [x] Sin regresión en los guards por faceta ni en las rutas existentes.
- [x] `typecheck` y `lint` en verde.

## Documentación sincronizada
- `plan-de-pruebas.md`: nuevo `TC-NAV-05`.
- `README.md`: fila del plan.

## Riesgos
- `unstable_settings` es una API “unstable” de expo-router; si cambia de nombre en un SDK futuro
  (SDK 58 la renombra a `anchor`), se ajusta al migrar.
- `tabPress` sin `preventDefault`: la navegación por defecto y `router.navigate` convergen al índice;
  si en algún dispositivo se percibe doble transición, se evalúa `preventDefault`.

---

🐧
