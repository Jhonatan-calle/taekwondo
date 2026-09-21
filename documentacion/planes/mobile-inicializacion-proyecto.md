# Plan: Inicializacion del Proyecto Mobile (scaffold Expo + Expo Router)

> **Metadatos**
> - **Version:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador inicial: scaffold Expo en `mobile/` (template blank-typescript) + configuracion manual de Expo Router con estructura `src/`. Decisiones: template blank-typescript (sin boilerplate) y directorio de rutas en `mobile/src/app/` (alias `@/* -> ./src/*`). |
| 1.1 | 2026-09-20 | **Aprobado por el usuario e implementado.** Scaffold `mobile/` con SDK 57 (expo ~57.0.24, RN 0.86.3, TS 6.0.3), Expo Router manual (entry `expo-router/entry`, scheme `taekwondo`, typed routes, plugin auto-agregado), `src/app/` con layout Stack + pantalla base, carpetas `src/lib|constants|components`, alias `@/*`, `.gitignore` endurecido (`.env*`) y docs sincronizadas. Verificado: `tsc --noEmit` OK, `expo-doctor` 21/21, Metro detecta `src/app`, bundle HTTP 200 y export android+ios correctos. |

## Restricciones y Correcciones Previas (No repetir)
1. **Modulo de torneos congelado:** no tocar tablas, RLS ni RPCs de torneos; no interactua con la app movil.
2. **Web congelada:** no modificar `web/`.
3. **No commits/push automaticos** (solo si el usuario lo pide).
4. **`mobile/` dentro del monorepo:** sin migraciones de BD en esta fase (0 cambios en `supabase/`).
5. **SDK 56+:** la navegacion se importa de `expo-router`, **no** de `@react-navigation/*`.
6. **Archivos de agente generados por `create-expo-app`:** revisar y limpiar `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` para no contradecir el `AGENTS.md` raiz del repo.

## Contexto / objetivo
Crear la app Expo `mobile/` de cero como base limpia para las fases 2-9 del workflow `documentacion/workflow-implementacion-mobile.md` (auth, onboarding/perfil, navegacion por roles, alumnos/clases, locaciones/alquileres, cuotas, examenes, dashboard). Stack: React Native + Expo SDK 57 + TypeScript estricto + Expo Router (rutas basadas en archivos).

## Fase de tecnologia
- **Template:** `expo-template-blank-typescript` (minimo, sin navegacion preconfigurada).
- **Expo Router manual:** agregar dependencias (`expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`), entry point `expo-router/entry`, `scheme` para deep links, `typedRoutes` activado y estructura `src/app/`.
- **Alias de modulos:** `@/* -> ./src/*` en `tsconfig.json` (`strict: true`).

## Cambios concretos

### 1. Scaffold del proyecto
- Desde la raiz del repo: `npx create-expo-app@latest mobile --template expo-template-blank-typescript` (SDK 57; Node 24 cumple requisitos).
- Verificar estructura base generada: `package.json`, `app.json`, `tsconfig.json`, `assets/`, `.gitignore` propio de `mobile/`.

### 2. Dependencias de Expo Router
- `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar` (versiones compatibles con SDK 57).

### 3. Configuracion de Expo Router
- `package.json`: `"main": "expo-router/entry"`.
- `app.json`: `"scheme": "taekwondo"` (deep links), `"experiments": { "typedRoutes": true }`, plugin de `expo-router` (si aplica).
- Eliminar `App.tsx` / `index.ts` del template (el entry point lo gestiona Expo Router).
- `tsconfig.json`: `"strict": true` + `paths` `"@/*": ["./src/*"]`.

### 4. Estructura inicial de rutas y pantalla base
- `mobile/src/app/_layout.tsx` -> `Stack` raiz con config minima.
- `mobile/src/app/index.tsx` -> pantalla placeholder ("Taekwondo ITF") para validar el router.
- Crear `mobile/src/lib/` (cliente Supabase en fase siguiene) y `mobile/src/constants/` (config del esquema) como carpetas base.

### 5. Entorno y housekeeping
- `mobile/.gitignore`: verificar exclusion de `node_modules/`, `.expo/`, `dist/` y `.env*`.
- Limpiar archivos de agente generados: conservar `AGENTS.md` solo si aporta contexto Expo sin contradecir el raiz; eliminar `CLAUDE.md` y `.claude/settings.json`.
- Actualizar `documentacion/README.md`: corregir la ruta del workflow movido (`planes/workflow-implementacion-mobile.md` -> `workflow-implementacion-mobile.md`).

## Fuera de alcance (de este plan)
- Cliente Supabase (`src/lib/supabase.ts`, SecureStore, `.env`): fase siguiente de `documentacion/workflow-implementacion-mobile.md`.
- Pantallas de auth/onboarding y modulos de negocio.

## Verificacion / Criterios de aceptacion
- [x] `create-expo-app` genera `mobile/` con el template blank-typescript y npm install exitoso.
- [x] `npx expo start` arranca Metro y renderiza la pantalla base (rutas tipadas activas).
- [x] `npx tsc --noEmit` pasa limpio con `strict` y alias `@/*`.
- [x] `npx expo-doctor` sin problemas criticos (21/21).
- [x] `mobile/.gitignore` protege `.env*`, `node_modules/`, `.expo/`.
- [x] `supabase/` y `web/` intactos.
- [x] `documentacion/README.md` refleja la ruta real del workflow.