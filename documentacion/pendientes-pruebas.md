# Pendientes de Prueba (E2E / Dispositivo)

> Registro de validaciones que requieren probar **en el celular real** o con el dashboard y que
> quedaron pendientes (progreso del proyecto: flujo de acceso implementado; modo $ O → recovery
> con deep link).
> Cada item se tacha `[x]` cuando se verifica en el escenario real.

## Pendientes

### 1. Deep link de recuperacion de contraseña en el celular (Expo Go) — BLOQUEADO
- **Fecha de registro:** 2026-09-20
- **Bloqueo:** el envio de correos de recuperacion devolvio `over_email_send_rate_limit`
  ("Se enviaron muchos correos. Espera unos minutos"). No es bug; es el limite de Supabase.
- **Pasos cuando el rate limit se libere:**
  1. En el dashboard de Supabase → Auth → URL Configuration → **Additional Redirect URLs**:
     verificar que este habilitada exactamente `exp://192.168.100.143:8081/--/nueva-contrasena`
     (si cambia la IP de red o se usa `npx expo start --tunnel`, actualizar el host).
  2. Pedir recuperacion desde la app → recibir el mail → tocar el link en el telefono
     (Expo Go, misma red/Metro corriendo).
  3. Verificar que abre `/nueva-contrasena`, permite ingresar nueva contrasena y redirige a
     `iniciar-sesion`.
- **Referencia:** `documentacion/planes/mobile-deeplink-recuperacion-fix.md`.

### 2. Registro con email ya existente → mensaje de duplicado (dispositivo)
- Registrar una cuenta con un email que ya existe → debe mostrarse
  "Ya existe una cuenta con ese email." (no "Revisa tu email").
- **Referencia:** `documentacion/planes/mobile-arreglos-auth-require-cycle.md`.

### 3. Guards `Stack.Protected` en dispositivo
- Sin sesion: `/` y `(auth)` accesibles; con sesion: un deep link a `iniciar-sesion` redirige a `index`.
- **Referencia:** `documentacion/planes/mobile-flujo-acceso-auth.md`.

### 4. Onboarding de perfil (dispositivo)
- Cuenta nueva → cae en `/onboarding` y no se accede a `index` hasta completar el perfil.
- Completar (nombre, DNI, fecha nacimiento, peso, genero) → navega a `index`; el perfil queda guardado y el onboarding no reaparece al reiniciar.
- DNI duplicado (registrar dos cuentas con el mismo DNI) → "El DNI ya está registrado." (pre-chequeo del RPC y/o 23505).
- Fecha no valida / futura / edad < 4 → error inline; ver la edad calculada al elegir la fecha.
- Complementarios vacios (altura, contacto de emergencia, datos de salud) no bloquean; quedan `null` en `profiles`.
- Red cortada al guardar → banner generico + fila `critical` (`modulo='perfil'`) en `errores_runtime`.
- **Referencia:** `documentacion/planes/mobile-onboarding-perfil.md`.

### 5. Establecimiento del linaje (dispositivo)
- Nuevo alumno elige instructor en el onboarding → queda solicitud pendiente en `solicitudes_linaje`; `profiles.maestro_id` sigue `null`; al entrar a la app se ve el banner "Tu instructor todavía no confirmó tu registro".
- El instructor (con `es_profesor` o `es_maestro`) ve la sección "Solicitudes de alumnos" con el nombre del solicitante.
  - **Aceptar** → `maestro_id` se setea (única vez, vía `resolver_solicitud_linaje` con `app.derivacion_linaje`); el banner del alumno desaparece al refrescar.
  - **Rechazar** → el alumno vuelve al onboarding (datos personales ya prellenados) a elegir de nuevo; la solicitud queda `rechazada`.
- Maestro (`es_maestro` seteado en Supabase) completa el onboarding sin elegir instructor y entra directo a la app.
- Lista de instructores vacía → aviso bloqueante; luego de conferir un instructor a mano, aparece y permite completar.
- Un usuario con `maestro_id` no puede modificarlo (trigger `bloquear_auto_cambio_maestro` + UI no lo expone).
- **Referencia:** `documentacion/planes/mobile-establecimiento-linaje.md`.

### 6. ERROR en consola de dev: "Can't perform a React state update on a component that hasn't mounted yet" — CONOCIDO / BENIGNO (ignorar)
- **Fecha de registro:** 2026-09-20
- **Qué es:** aparece en el log de Metro/Expo Go **solo al arrancar en Android (dev)** y dice `ERROR`
  aunque no es una excepción crasheante.
- **Origen:** internals de **expo-router**, no del codigo del proyecto:
  - Android usa `getInitialURLWithTimeout()` (`Promise.race([Linking.getInitialURL(), timeout 150ms])`).
  - Al resolver el URL inicial, `fork/useLinking.native.js` llama `onUnhandledLinking(...)` =
    `setLastUnhandledLink()` de `NavigationContainer.js` **durante el montaje inicial**.
  - Si la promise se resuelve antes de que el fiber termine de montar, React (solo dev) emite el
    diagnóstico con `console.error()`; por eso el pipeline lo muestra como `ERROR`.
- **Impacto:** nulo. No bloquea auth/onboarding/navegacion, no genera LogBox/RedBox fatal y **en
  producción (`NODE_ENV=production`) esa verificacion no se ejecuta** (no aparece el mensaje).
- **Decision:** se ignora. No parchear `node_modules`. Si en el futuro molesta, opciones: (a)
  actualizar `expo-router` a un patch que corrija el warning, o (b) fork/patch del paquete
  (no recomendado).
- **Facil de verificar que no es nuestro codigo:** el stack siempre termina en
  `ExpoRoot.js`/`ContextNavigator`/`NavigationContainer` → `useLinking.native.js:127`; no pasa por
  `AuthGlobal`, `_layout`, `onboarding` ni ningun archivo de `mobile/src/`.

### 7. Análisis del perfil al iniciar (dispositivo)
- Al iniciar sesión (o restaurarla), el contexto `AuthGlobal` expone `gradoActual` con el grado real del perfil (ej. un maestro sembrado con `dan_X`).
- `esProfesor` es `true` solo si `es_profesor = true` **y** `grado_actual >= 'dan_1'` (un perfil con `es_profesor` pero grado Gup queda `false`).
- `esMaestro` refleja la bandera; la sección "Solicitudes de alumnos" sigue apareciendo para profesores (con Dan) y maestros (`esInstructor`), sin regresión en el flujo de linaje.
- **Referencia:** `documentacion/planes/mobile-analisis-perfil-inicio.md`.

---

🗒️ Actualizar este archivo (tachar items, agregar folow-ups de fecha) cada vez que se haga una
prueba manual o se descubra un nuevo pendiente.

---
🐧