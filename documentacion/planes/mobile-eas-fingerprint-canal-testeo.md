# Plan: runtime `fingerprint` + canal de testeo propio + producción (EAS Update)

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | Aprobado (implementado) |
| **Fecha** | 2026-09-25 |
| **Alcance** | Configuración de build/actualizaciones en `mobile/` (app.json, eas.json, package.json) y en EAS (variables de entorno y canales). **Sin cambios de UI ni de BD.** |
| **Referencia operativa** | `planes/mobile-build-apk-eas.md` (v1.3) |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-09-25 | Borrador: `runtimeVersion` `fingerprint`, variables de entorno en EAS (bloqueante), canal de testeo `preview` y canal `production`, perfil `production-apk`. |
| 1.0 | 2026-09-25 | **Aprobado e implementado.** Se resolvió el bloqueante del `.env` con EAS Environment Variables; se activó `fingerprint`; canales `preview` (testeo) y `production` (usuarios reales); perfil `production-apk` y `environment` por perfil. |

## Restricciones y Correcciones Previas (No repetir)

1. **No tocar** `web/` (congelada) ni el módulo de torneos.
2. **No cambiar** la identidad de la app: `slug` (`taekwondo-mobile`), `android.package` e `ios.bundleIdentifier` (`ar.taekwondoitf.app`).
3. **No commitear `.env`** (archivo protegido). Las variables viven en **EAS Environment Variables**.
4. Ícono, splash, nombre **CHS ALFA** y permisos son **nativos** y ya quedaron configurados; este plan **no** los vuelve a tocar.
5. **No** usar el patrón "branch promotion" con ramas versionadas (no soporta políticas automáticas de runtime). Acá se usan **canales fijos + `update:republish`**.

## Contexto / objetivo

La app ya tenía `expo-updates`, pero:

- `runtimeVersion` usaba `{ "policy": "appVersion" }` (riesgo de olvidar subir `version` al tocar algo nativo).
- No había un **ambiente de testeo exclusivo** para validar cambios antes de que los reciban los usuarios reales.
- **Bloqueante detectado:** `mobile/.env` está en `.gitignore`, no está trackeado y **no hay `.easignore`** → EAS CLI usa `.gitignore` para armar el archivo que sube al build → **el `.env` no llegaba al build en la nube** y `process.env.EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` habría quedado `undefined` en el APK.

**Objetivo:** un flujo seguro donde se testea primero en un canal propio y luego se promueve a producción, sin riesgo de publicar updates incompatibles y con las variables de entorno resueltas en build y update.

## Decisiones tomadas

- **Canal de testeo:** `preview` (reutiliza el existente; **exclusivo del autor**).
- **Canal de producción:** `production` (usuarios reales).
- **Distribución a usuarios reales por ahora:** **APK interna** (perfil `production-apk`). El perfil `production` (AAB) queda listo para Play Store.
- **Variables de entorno:** EAS Environment Variables en `preview` y `production`, visibilidad `plaintext` (la anon key es pública y viaja dentro del binario).
- **Runtime:** política `fingerprint` (`@expo/fingerprint`).

## Cambios implementados

### `mobile/app.json`

```json
"runtimeVersion": { "policy": "fingerprint" }
```

### `mobile/eas.json`

`environment` por perfil + perfil `production-apk` (mismo canal `production` que el AAB):

```json
{
  "cli": { "version": ">= 5.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true, "distribution": "internal",
      "channel": "development", "environment": "development"
    },
    "preview": {
      "distribution": "internal", "channel": "preview", "environment": "preview",
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production", "environment": "production", "autoIncrement": true
    },
    "production-apk": {
      "distribution": "internal", "channel": "production", "environment": "production",
      "android": { "buildType": "apk" }
    }
  }
}
```

### `mobile/package.json`

- Dependencia declarada: `@expo/fingerprint` (`~0.20.13`).

### EAS Environment Variables

```bash
eas env:push preview    --path .env
eas env:push production --path .env
```

Resultado: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` presentes en `preview` y `production`.

### Documentación

- `planes/mobile-build-apk-eas.md` → v1.3 (referencia operativa de builds y updates).
- `documentacion/README.md`, `documentacion/pendientes-pruebas.md`, `AGENTS.md` y `plan-de-pruebas.md` (`TC-APP`) actualizados.

## Criterios de aceptación (verificados)

| Criterio | Estado |
|---|---|
| 1. `npx expo config --type public` muestra `runtimeVersion` con política `fingerprint`. | ✅ |
| 2. `eas env:list` incluye las dos variables `EXPO_PUBLIC_*` en `preview` y `production`. | ✅ |
| 3. Un cambio solo de JS publicado en `preview` llega a la APK de testeo sin recompilar. | ⏳ (requiere builds) |
| 4. `eas update:republish` lleva el mismo cambio a la APK de usuarios reales (canal `production`). | ⏳ (requiere builds) |
| 5. Un cambio nativo no aplica sobre el binario viejo (runtime distinto). | ✅ por diseño (`fingerprint`) |
| 6. `npm run typecheck` y `npm run lint` en verde. | ✅ |

## Verificación

- `npx expo config --type public` → `runtimeVersion: { policy: 'fingerprint' }`.
- `npx expo-updates runtimeversion:resolve --platform android` → `48655118465efde6ad1be0dc276823c280728265` (fingerprint de la capa nativa; **no** depende del `.env`).
- `eas env:list --environment preview` / `--environment production`.
- `npm run typecheck` y `npm run lint`.

## Riesgos y notas

- **CLI:** hay `eas-cli@24.8.0`; se recomienda `npm i -g eas-cli@latest`.
- **Compatibilidad de updates:** toda update debe compartir el `runtimeVersion` del binario; con `fingerprint` se garantiza.
- **Expo Go no aplica:** las updates solo se prueban en una APK (canal `preview`).
- Los builds de `preview` y `production-apk` deben salir del **mismo commit** para compartir runtime.

## Fuera de alcance

- Publicación en Play Store (perfil `production` AAB).
- Chequeo de updates en primer plano / `reloadAsync`.
- Migración de datos / BD.

---

🐧
