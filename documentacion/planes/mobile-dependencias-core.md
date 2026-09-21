# Plan: Dependencias Core de la App Mobile (`@supabase/supabase-js` + almacenamiento seguro + pickers)

> **Metadatos**
> - **Version:** 1.2
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-21

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador inicial: instalacion de dependencias de comunicacion con Supabase, persistencia segura de sesion (patron LargeSecureStore) y pickers para comprobantes (imagen + documento). |
| 1.1 | 2026-09-20 | **Revisado.** Correccion de clasificacion de dependencias: `react-native-get-random-values` (con codigo nativo, requerida para criptografia) pasa a las dependencias gestionadas por `npx expo install`; `@supabase/supabase-js` y `aes-js` (JavaScript puro) pasan a las dependencias adicionales via npm. |
| 1.2 | 2026-09-21 | **Aprobado por el usuario e implementado.** Instaladas: nativas (async-storage 2.2.0, expo-secure-store ~57.0.4, expo-image-picker ~57.0.19, expo-document-picker ~57.0.2, react-native-get-random-values ~1.11.0) + JS puras (supabase-js ^2.116.0, aes-js ^3.1.2, @types/aes-js ^3.1.4). Config plugins en `app.json` (secure-store auto-agregado, image-picker con permisos en espanol y `microphonePermission: false`, document-picker). Nota de resolucion: hubo que alinear `react-dom` a 19.2.3 (SDK 57) para desbloquear el install. Verificado: `expo-doctor` 21/21, `tsc --noEmit` OK, export android+ios OK. No se agregan referencias a planes en `documentacion/README.md` (desicion del usuario). |

## Restricciones y Correcciones Previas (No repetir)
1. **Clasificacion de dependencias (corregido en v1.1):**
   - Dependencias con **codigo nativo** o que **requieran criptografia segura** (login, generacion de IV, almacenamiento) deben resolverse con `npx expo install` para respetar la gestion de versiones del SDK 57. Ejemplo: `react-native-get-random-values`.
   - Paquetes de **JavaScript puro** (sin binarios nativos ni versiones atadas al SDK) se instalan con `npm install`. Ejemplo: `@supabase/supabase-js`, `aes-js`.
2. **No repetir el error:** NO clasificar todo con `npx expo install`. Verificar por paquete si trae codigo nativo (sin `skipBundling`/sin binarios .so/.a) antes de elegir el mecanismo de instalacion.
3. Para las librerias nativas de Expo, respetar las versiones del SDK 57 (verificadas: expo ~57.0.24, RN 0.86.3, TS 6.0.3).
4. `LargeSecureStore` (patron oficial guia RN de Supabase): SecureStore guarda la clave, AsyncStorage guarda el payload cifrado con AES → evita el limite ~2KB de SecureStore en iOS. Requiere `@types/aes-js` como devDependency.
5. Permisos de pickers se configuran en el **config plugin** de `app.json` (CNG); mensajes en espanol; `microphonePermission: false` (no grabamos video).
6. Esta fase solo instala/configura dependencias. **El `src/lib/supabase.ts` con el cliente + `LargeSecureStore` pertenece a la Fase 1.3** (Entorno y Cliente Supabase) del workflow.

## Contexto / objetivo
Ejecutar el punto 2 de la Fase 1 del workflow (`documentacion/workflow-implementacion-mobile.md`): dejar la app con las dependencias minimas correctas para comunicarse con Supabase (BD, auth + storage), persistir la sesion de forma segura en el dispositivo y poder adjuntar comprobantes de alquiler (fotos o PDFs) en fases posteriores.

## Cambios concretos

### 1. Dependencias de ejecucion (`npx expo install`)
Gestionadas por Expo porque tienen codigo nativo o saneza de version con el SDK 57:
- `@react-native-async-storage/async-storage` — almacenamiento de la sesion cifrada (modulo nativo).
- `expo-secure-store` — clave de cifrado (keychain/keystore nativo).
- `expo-image-picker` — subir fotos/escaneos de comprobantes (galeria + camara).
- `expo-document-picker` — adjuntar PDFs de comprobantes.
- `react-native-get-random-values` — polyfill de `crypto.getRandomValues` requerido para generar IV de AES en RN (codigo nativo, criptografia segura): version resuelta por Expo.

### 2. Dependencias adicionales (npm)
JavaScript puro, sin resolucion de versiones nativas del SDK:
- `@supabase/supabase-js` — cliente backend (BD, Auth, Storage).
- `aes-js` — cifrado AES del payload de sesion (patron LargeSecureStore).
- `@types/aes-js` (devDependency) — tipos de TypeScript.

### 3. Config plugins en `app.json`
- Agregar a `plugins`:
  - `"expo-secure-store"` (default: `configureAndroidBackup: true` — evita que el backup de Android corrompa SecureStore).
  - `["expo-image-picker", { "photosPermission": "...", "cameraPermission": "...", "microphonePermission": false }]` con textos en espanol (onda "Taekwondo ITF necesita acceso a tus fotos para adjuntar comprobantes de pago").
- `expo-document-picker` se agrega sin opciones (iCloud no aplica por ahora).

### 4. Fuera de alcance
- Implementacion del cliente (`.env`, `src/lib/supabase.ts`, clase `LargeSecureStore`) → plan de Fase 1.3.
- Pantallas de auth/onboarding.

## Verificacion / Criterios de aceptacion
- [x] Comandos de instalacion exitosos sin errores de resolucion de versiones del SDK 57.
- [x] `npx expo-doctor` sin problemas criticos (21/21).
- [x] `npx tsc --noEmit` pasa limpio.
- [x] `app.json` con los plugins correctos (secure-store, image-picker con permisos en espanol, document-picker).
- [x] `supabase/` y `web/` intactos.