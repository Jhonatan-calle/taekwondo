# Plan: Análisis del Perfil al Iniciar — (Fase 3, ítem 1 del workflow)

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador aprobado por el usuario e implementado. Decisiones: `esProfesor` derivado **gated como el SRS** (`es_profesor = true` y `grado_actual >= 'dan_1'`) y `index.tsx` se actualiza ya para usar los derivados del contexto (reemplazando el chequeo crudo). |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y módulo de torneos intacto:** no se tocan.
2. **Columnas solo-sistema, solo lectura:** `grado_actual`, `es_profesor` y `es_maestro` son escritas solo por el sistema (Service Role / RPC con gate). Este ítem **solo LEE** el perfil propio (RLS `profiles_select_propio`). **No hay migración BD.**
3. **No reinventar:** `refrescarPerfil` ya se ejecuta al restaurar sesión y en cada `SIGNED_IN` (`AuthGlobal.tsx`); la carga ya pasa por `ejecutarConsulta` (fail gracefully, módulo `'perfil'`). Solo falta agregar `grado_actual` al `SELECT` y derivar las banderas. Sin Realtime.
4. **Gate de profesor = SRS y gate de BD:** `es_profesor = true Y grado_actual >= 'dan_1'`, coherente con `puede_activar_profesor` de la BD. El enum `grado` está ordenado (Gup → `dan_1…dan_9`), así que el Dan se resuelve con `esGradoDan` sobre `GRADOS_DAN` (no reimplementar comparaciones).
5. **Migraciones SOLO con `npx supabase migration new <slug>`:** en este ítem no se crea ninguna.
6. **Fail gracefully obligatorio:** la carga del perfil ya registra en `errores_runtime`; la UI no expone detalles técnicos.
7. **Antes de codear en `mobile/`, leer las docs versionadas de Expo SDK 57** (`mobile/AGENTS.md`). Este ítem no agrega dependencias ni APIs nativas.
8. **No hay script de lint** en `mobile/` (solo `typecheck`): la verificación de calidad es `npm run typecheck`.

## Contexto / objetivo
Cubrir el ítem 1 de la Fase 3 del workflow: **recuperar las banderas técnicas de `profiles` para el usuario autenticado** (`grado_actual`, `es_profesor` y `es_maestro`) al iniciar, y exponerlas como derivados del contexto `AuthGlobal` para alimentar la navegación dinámica por "Árbol de Poder" (ítem 2 de la Fase 3). Hoy `AuthGlobal` ya carga el perfil pero **no solicita `grado_actual`** ni expone `esProfesor`/`gradoActual`.

## Cambios concretos

### 1. `mobile/src/constants/grados.ts` (editar)
- Exportar `GRADOS_DAN` (hoy `const` local) para reutilizarlo sin duplicar la lista.
- Nueva función pura `esGradoDan(grado: Grado | null): boolean` → `grado != null && GRADOS_DAN.includes(grado)`.

### 2. `mobile/src/lib/perfil.ts` (editar)
- `PerfilOnboarding` += `'grado_actual'`.
- Helper puro `esProfesorActivo(perfil: PerfilOnboarding | null): boolean` → `perfil?.es_profesor === true && esGradoDan(perfil.grado_actual)` (gate SRS, reutiliza `esGradoDan`).
- Helper puro `esInstructor(perfil)` → `esProfesorActivo(perfil) || perfil?.es_maestro === true`.

### 3. `mobile/src/contextos/AuthGlobal.tsx` (editar)
- `CAMPOS_PERFIL_SELECT` += `grado_actual`.
- `AuthGlobalValue` += `gradoActual: Grado | null`, `esProfesor: boolean` (gated) e `esInstructor: boolean`. Se mantienen `esMaestro` y `onboardingCompleto`.
- Nuevos derivados memorizeados: `gradoActual = perfil?.grado_actual ?? null`, `esProfesor = esProfesorActivo(perfil)`, `esInstructor = esInstructor(perfil)` (equivale a `esProfesor || esMaestro`).

### 4. `mobile/src/app/index.tsx` (editar)
- Reemplazar el chequeo crudo local `esInstructor = perfil?.es_profesor === true || perfil?.es_maestro === true` por el derivado `esInstructor` del contexto (desestructurado de `useAuthGlobal`).

### 5. Documentación
- Crear este plan y fila en `documentacion/README.md` (regla de oro #1).
- Agregar ítem a `documentacion/pendientes-pruebas.md`: verificar en dispositivo que al iniciar sesión se exponen `gradoActual`, `esProfesor` (gated) y `esMaestro`.

## Criterios de aceptación y verificación
- [x] `npm run typecheck` limpio en `mobile/`.
- [x] Sin cambios en `supabase/` ni `web/`; `git status` solo con los archivos de `mobile/` + documentación esperados.
- [x] Flujo de linaje sin regresión: la sección "Solicitudes de alumnos" sigue apareciendo para `esProfesor` (con Dan) y `esMaestro`.
- [ ] (Dispositivo/Pendiente) Al iniciar sesión, el contexto expone `gradoActual` correcto (ej. maestro sembrado con `dan_X`), `esProfesor` solo si `es_profesor` + Dan, y `esMaestro` según bandera.

---
🐧