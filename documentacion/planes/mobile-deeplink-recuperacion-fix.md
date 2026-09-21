# Plan: Deep Link de recuperacion de contraseña — fix web-safe y redirect de Expo Go

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Se fija: `LargeSecureStore` pasa a ser seguro en web (fallback a `localStorage` cuando `Platform.OS === 'web'`) para eliminar el crash `ExpoSecureStore...getValueWithKeyAsync is not a function` al recuperar sesion/auto-refresh en navegador; y se documenta el paso de configuracion en el dashboard de Supabase (Additional Redirect URLs) necesario para que el link del mail funcione en el telefono con Expo Go (`exp://<host>/--/nueva-contrasena`). |

## Restricciones y Correcciones Previas (No repetir)
1. **No usar `expo-secure-store` en web:** no tiene implementacion web; cualquier `getItemAsync`/`setItemAsync`/`deleteItemAsync` crashea con `... is not a function`. En `LargeSecureStore` se decide por `Platform.OS === 'web'` antes de tocar SecureStore.
2. **El flujo de recuperacion en el codigo ya funciona** (cold start con `useLinkingURL`, `setSession`/`exchangeCodeForSession`, parseo `obtenerParametrosDeUrl`). El fallo del telefono era de configuracion del proyecto (redirect no habilitado), no de codigo.
3. **El redirect `exp://` depende del host de Metro:** la IP/puerto del `npx expo start` actual. Si cambia la red o se usa `--tunnel`, agregar/actualizar la URL en el dashboards. Para un build nativo se usaria `taekwondo://nueva-contrasena`.
4. **No tocar `supabase/` ni `web/`** (congelada).

## Contexto / objetivo
El usuario reporto que los links de recuperacion enviados por mail "no funcionan en el celular". Tras diagnosticar:
- Cambiando el `localhost:3000` por la IP privada `http://192.168.100.143:8081` en la configuracion del proyecto, la redireccion llega a la app (web), lo que confirmo que el eslabon de redireccion funciona.
- Ese test cayo en el build web y expuso un crash real: `LargeSecureStore` no contempla que `expo-secure-store` no existe en web (`TypeError: ExpoSecureStore.default.getValueWithKeyAsync is not a function` en `_recoverAndRefresh`).
- Para el telefono con **Expo Go**, el `redirectTo` que genera la app es `exp://192.168.100.143:8081/--/nueva-contrasena`; ese destino no estaba habilitado en Auth → URL Configuration del dashboard, por lo cual Supabase bloqueaba la redireccion.

## Cambios concretos

### 1. `mobile/src/lib/large-secure-store.ts` (editar) — web-safe
- `import { Platform } from 'react-native'` y `const esWeb = Platform.OS === 'web'`.
- `getItem`/`setItem`/`removeItem`: si `esWeb` → operar sobre `globalThis.localStorage` con la clave tal cual (sin AES, sin SecureStore). Caso nativo: comportamiento previo intacto.

### 2. Dashboard Supabase (paso del usuario, no codigo)
- Auth → URL Configuration → **Additional Redirect URLs** → agregar exacto: `exp://192.168.100.143:8081/--/nueva-contrasena`.
- Mantener el `http://192.168.100.143:8081` ya habilitado (web).
- Conectar el telefono con Expo Go a la misma red/Metro y probar el mail end-to-end.

### 3. Documentacion
- Crear este plan y agregar fila en `documentacion/README.md`.

## Criterios de aceptacion y verificacion
- [x] `npm run typecheck` limpio + bundle `npx expo export` OK.
- [x] En el navegador (web) la app ya no crashea con `getValueWithKeyAsync is not a function` (al restaurar sesion ni al recibir el deep link).
- [ ] (usuario) Con el redirect `exp://` habilitado en el dashboard, el link del mail abre Expo Go en `nueva-contrasena` y permite cambiar la contrasena. **PENDIENTE (bloqueado por `over_email_send_rate_limit` el 2026-09-20; ver `documentacion/pendientes-pruebas.md`).**
- [x] `git status`: `.env` ausente; `supabase/` y `web/` intactos.

---
🐧