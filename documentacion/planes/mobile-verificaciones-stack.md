# Plan: Verificaciones de Stack y Tipado (Fase 9, ítem 1) — `mobile-verificaciones-stack.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: diagnóstico de `tsc`/`lint` (2 errores + 2 warnings) y correcciones propuestas. La precarga de `onboarding.tsx` quedó como punto abierto. |
| 1.1 | 2026-09-22 | Se cierra el punto abierto: la precarga del perfil (`onboarding.tsx` 78–93) se resuelve con **Opción A** (`eslint-disable` con comentario explicativo). Se elimina el punto abierto y ese paso queda como definitivo. Aprobado e implementado. |

## Restricciones y Correcciones Previas (No repetir)
1. **No tocar `web/`, torneos ni `.env*`:** la corrección es solo de código en `mobile/`.
2. **Sin cambios de comportamiento:** el objetivo es poner `tsc`/`lint` en verde sin alterar flujos. La precarga del perfil conserva su guard (`prefillHecho`) y su ciclo de vida; la asistencia sigue cargando al abrir la pantalla.
3. **No dejar decisiones abiertas:** el punto abierto de v1.0 se cerró eligiendo la **supresión mínima** (Opción A) para garantizar que no haya alteraciones imprevistas del ciclo de vida del componente.
4. **Consistencia con el patrón existente:** la supresión con `eslint-disable` ya se usa en `registrar-locacion.tsx:45`, `nuevo-grupo.tsx:129`, `mesas/nueva.tsx:59` y `asistencia.tsx:126`.
5. **No reimplementar:** se reutilizan reglas y convenciones de ESLint/Expo ya configuradas (`eslint.config.js`).

## Contexto / Objetivo
Fase 9 del workflow (verificación, calidad y compilación), ítem 1: ejecutar la comprobación de tipos (`tsc`) y el linting (`npm run lint`) en `mobile/`. Al arrancar, `npm run typecheck` pasaba limpio, pero `npm run lint` fallaba con **2 errores + 2 warnings**. El ítem no era solo "correr los comandos": había hallazgos que bloqueaban el gate de calidad y que se corrigieron.

## Cambios Implementados

### 1. `mobile/src/app/(auth)/crear-cuenta.tsx` `[x]`
- Se quitó el import de `useRouter` (`import { Link } from 'expo-router';`).
- Se eliminó `const router = useRouter();` (variable sin uso → warning `@typescript-eslint/no-unused-vars`).

### 2. `mobile/src/app/onboarding.tsx` — precarga del perfil (L78–93) `[x]`
- Se resolvió el error `react-hooks/set-state-in-effect` con **Opción A**: bloque `/* eslint-disable react-hooks/set-state-in-effect */` … `/* eslint-enable */` con comentario explicativo.
- La lógica de negocio (guard `prefillHecho`, campos precargados y fecha de nacimiento) queda **idéntica**.

### 3. `mobile/src/app/onboarding.tsx` — carga de instructores (L107–109) `[x]`
- Se agregó `// eslint-disable-next-line react-hooks/set-state-in-effect -- los setState ocurren dentro del cargador` antes de `void cargarInstructores();`, mismo patrón que los cargadores iniciales existentes.

### 4. `mobile/src/app/(tabs)/instructor/clase/[id]/asistencia.tsx` `[x]`
- Se eliminó el `useEffect(() => { void cargar(); }, [])` redundante: `useFocusEffect` ya realiza la carga (y el `useEffect` la duplicaba al montar).
- Se quitó `useEffect` del import de `react`.

## Criterios de Aceptación y Verificación
- [x] `npm run typecheck` (`tsc --noEmit`) → exit 0, sin salida.
- [x] `npm run lint` (`expo lint`) → exit 0, `0 problems`.
- [x] Sin cambio funcional: onboarding precarga una vez y lista instructores; asistencia carga al abrir y no duplica la consulta.
- [x] No se tocaron `web/`, torneos ni `.env*`.
- [ ] Verificación manual en dispositivo: crear-cuenta (Link a login), onboarding (precarga + lista de instructores) y asistencia en frío.

> **Nota de documentación:** no se agregan casos `TC-*` nuevos (`documentacion/plan-de-pruebas.md`): no hay cambio de comportamiento, solo limpieza de una carga duplicada y de código muerto.

---

🐧
