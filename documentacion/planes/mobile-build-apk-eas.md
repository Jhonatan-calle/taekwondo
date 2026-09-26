# Plan / Guía operativa: builds con EAS + actualizaciones OTA (`eas update`)

> **Esta es la referencia operativa.** Explica, para **cada caso**, cómo generar un build y cómo
> subir una actualización. Plan de diseño asociado: `mobile-eas-fingerprint-canal-testeo.md`.

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.3 |
| **Estado** | Aprobado (implementado; builds pendientes) |
| **Fecha** | 2026-09-25 |
| **Alcance** | Config de app + EAS + marca (ícono/splash/nombre) + canales de testeo/producción. Sin cambios de código de UI/BD. |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Config para **APK** (perfil `preview`) y **OTA** (`expo-updates` + canales). Nombre **ITF**, `applicationId` `ar.taekwondoitf.app`. |
| 1.1 | 2026-09-25 | **Marca de la app:** plugin **`expo-splash-screen`** (splash oscuro `#1a1a1a` + emblema), ícono adaptativo Android regenerado, assets reproducibles (`mobile/scripts/gen-assets.py`) y transición sin parpadeo en `_layout.tsx`. |
| 1.2 | 2026-09-25 | **Nombre visible → `CHS ALFA`:** `expo.name`, título del login, textos de permisos, `appConfig.nombre` y docs. El `slug` y el `applicationId` **no** cambian. |
| 1.3 | 2026-09-25 | **Testeo vs producción + `fingerprint`:** `runtimeVersion` pasa a `fingerprint`; canal `preview` = testeo exclusivo, canal `production` = usuarios reales; perfil `production-apk`; **EAS Environment Variables** (resuelve que el `.env` no llegaba al build). |

## Decisiones

- **Nombre de la app:** `CHS ALFA`.
- **applicationId / bundleIdentifier:** `ar.taekwondoitf.app` (único; **inmutable** una vez publicado en Play).
- **Runtime:** `runtimeVersion: { "policy": "fingerprint" }` → el runtime es un hash de la **capa nativa** (deps nativas, permisos, plugins, config, SDK). Si cambia algo nativo, el runtime cambia solo.
- **Canales:**
  - **`preview`** → APK de **testeo, exclusiva del autor**.
  - **`production`** → apps de **usuarios reales** (APK interna hoy; AAB/Play Store a futuro).
  - Compartir el canal `production` entre APK y AAB hace que **una sola** publicación llegue a todos los usuarios reales.
- **Distribución a usuarios reales (por ahora):** APK interna (perfil `production-apk`).
- **Tema:** `userInterfaceStyle: "light"`.

## Configuración actual (referencia)

**`mobile/app.json`**
- `name: "CHS ALFA"`, `slug: "taekwondo-mobile"`, `android.package` e `ios.bundleIdentifier` = `ar.taekwondoitf.app`.
- `runtimeVersion: { "policy": "fingerprint" }`.
- `updates.url` = `https://u.expo.dev/a8f37a04-4091-46fe-a29a-20f719216598`.
- Plugins: `expo-router`, **`expo-splash-screen`**, `expo-status-bar`, `expo-system-ui`, `expo-secure-store`, `expo-image-picker`, `expo-document-picker`, `@react-native-community/datetimepicker`.
- `android.adaptiveIcon` con los assets de marca.

**`mobile/eas.json`**

| Perfil | Para qué | Canal | Distribution | Android |
|---|---|---|---|---|
| `development` | dev client | `development` | internal | dev client |
| `preview` | **tu APK de testeo** | `preview` | internal | **APK** |
| `production` | Play Store (futuro) | `production` | (store) | AAB |
| `production-apk` | **APK de usuarios reales** | `production` | internal | **APK** |

Cada perfil tiene su `"environment"` (`development` / `preview` / `production`) para las variables de EAS.

**Variables de entorno (EAS Environment Variables)**
- `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en los entornos **`preview`** y **`production`**.
- Motivo: `mobile/.env` está en `.gitignore` y **no se sube** al build; sin esto, el APK compilado quedaría sin credenciales de Supabase.
- La anon key es pública (viaja en el binario) → visibilidad `plaintext`.

## 1) Generar un build (según el caso)

> Los builds se ejecutan **solo cuando cambia algo nativo** (dependencia nativa, permisos, ícono/splash/
  nombre, plugin, config de `app.json`, SDK, etc.). Requieren `eas login`.

| Caso | Comando |
|---|---|
| **Mi APK de testeo** | `cd mobile && npx eas-cli build -p android --profile preview` |
| **APK para usuarios reales** | `cd mobile && npx eas-cli build -p android --profile production-apk` |
| **AAB para Play Store** (futuro) | `cd mobile && npx eas-cli build -p android --profile production` |
| Ver builds hechos | `npx eas-cli build:list` |

- El canal queda **grabado** en el binario: la APK de `preview` escucha `preview`; las de `production`/`production-apk` escuchan `production`.
- **Los builds de `preview` y `production-apk` deben salir del mismo commit** (misma capa nativa = mismo runtime `fingerprint`) para que las OTA apliquen a ambos.
- Instalar la APK en el celular (permitir "instalar apps de origen desconocido").

## 2) Subir una actualización (según el caso)

> Las OTA son para cambios **solo de JS/TS/assets importados/estilos/textos**. **No** aplican a cambios nativos.

| Caso | Comando |
|---|---|
| **Probar un cambio (solo vos)** | `npx eas-cli update --channel preview --environment preview -m "descripción"` |
| **Promover a producción lo ya probado** (recomendado) | `npx eas-cli update:republish --channel preview --destination-channel production -p android -m "descripción"` |
| **Publicar directo a producción** (sin probar) | `npx eas-cli update --channel production --environment production -m "descripción"` |
| Ver updates publicadas | `npx eas-cli update:list --branch preview` (o `--branch production`) |
| Ver/editar canales | `npx eas-cli channel:list` · `npx eas-cli channel:edit <canal> --branch <branch>` |
| Rollback de un update | `npx eas-cli update:rollback --channel <canal>` |

**Flujo recomendado (testeo → producción):**
```bash
# 1) mandar el cambio SOLO al canal de testeo
eas update --channel preview --environment preview -m "arreglo X"

# 2) probar en la APK de testeo. Si está OK, promover EL MISMO artefacto a producción
eas update:republish --channel preview --destination-channel production -p android -m "arreglo X"
```
`update:republish` **no recompila**: copia el grupo de update ya probado, así lo que testeaste es exactamente lo que reciben los usuarios.

## Reglas de oro

1. **Cambio de JS/assets** → `eas update` (llega a la app; se aplica al **reiniciar** la app).
2. **Cambio nativo** → **recompilar** (`eas build`). El `fingerprint` cambia → las updates viejas dejan de aplicar (comportamiento seguro).
3. **No** hace falta tocar `version` para las OTA (con `fingerprint` el runtime es automático). El `versionCode`/`buildNumber` los maneja `appVersionSource: remote` + `autoIncrement`.
4. La app **chequea al abrir**: descarga el update y lo **aplica en el próximo arranque** (`checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`).
5. **Expo Go NO sirve** para probar ícono/splash/nombre/updates: usá siempre una APK.
6. Las `EXPO_PUBLIC_*` se **hornean** en el bundle (build u update). Si cambian, hay que republicar.

## Verificación

- [x] `app.json` y `eas.json` válidos; `npx expo config` resuelve `CHS ALFA` / `ar.taekwondoitf.app` / `runtimeVersion` `fingerprint`.
- [x] `npx expo-updates runtimeversion:resolve -p android` → `48655118465efde6ad1be0dc276823c280728265`.
- [x] `eas env:list --environment preview` / `--environment production` → variables `EXPO_PUBLIC_*` presentes.
- [x] `npx expo config --type introspect` genera el splash sin errores.
- [x] `npm run assets:gen` reproduce los assets de marca (hash estable).
- [x] `typecheck` y `lint` en verde.
- [ ] `eas build --profile preview` y `--profile production-apk` (requiere login; lo corre el autor).
- [ ] APK instalada: barra de estado, **ícono/splash/nombre CHS ALFA** y conexión a Supabase OK (`TC-APP-01`…`TC-APP-04`).
- [ ] `eas update --channel preview` llega a la APK de testeo (`TC-APP-05`).
- [ ] `eas update:republish … production` llega a la APK de usuarios reales (`TC-APP-06`).

## Notas

- **Ícono/splash/nombre son nativos:** no se ven en **Expo Go** ni llegan por `eas update`; requieren **recompilar**.
- `preview` y `production-apk` usan **distribución interna**: se comparte el archivo/QR.
- `production` (AAB) queda listo para Play Store; comparte canal con `production-apk`, así que las OTA llegan igual a ambos.
- **CLI:** se recomienda `npm i -g eas-cli@latest`.
- **Variante "dev" para la app de testeo (pendiente):** ver `pendientes-pruebas.md` #33 — cuando se priorice, se agrega un `app.config.js` + `APP_VARIANT` para que la app de testeo sea **otra app** (“CHS ALFA dev”, `ar.taekwondoitf.app.dev`) y conviva con la de producción. Requiere credenciales Android para el nuevo `applicationId`.

---

🐧
