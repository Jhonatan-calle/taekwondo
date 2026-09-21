# Plan: Flujo de Acceso — Auth (Fase 2, item 1 del workflow)

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Se fija: pantallas de registro (email/password), inicio de sesion y recuperacion de contraseña en el grupo de rutas protegidas `(auth)`; sesion gestionada por Supabase Auth con persistencia via `LargeSecureStore`; guards declarativos `Stack.Protected` (grupo `(auth)` visible solo sin sesion, `index` home provisional solo con sesion, `nueva-contrasena` deep link siempre accesible); auto-login directo tras el registro (con manejo defensivo si el remoto activara confirmacion por email); recuperacion con flujo completo via `resetPasswordForEmail` + deep link `taekwondo://nueva-contrasena`; mensajes amigables especificos para rechazos esperados de Auth y banner generico + registro en `errores_runtime` solo para fallos inesperados; sin dependencias nuevas. |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y modulo de torneos intacto:** no se tocan.
2. **Sin dependencias nuevas:** `expo-linking` ya esta instalado; `Stack.Protected` disponible en expo-router 57.0.22; `@supabase/supabase-js` cubre `signUp`, `signInWithPassword`, `resetPasswordForEmail`, `setSession`, `exchangeCodeForSession`, `updateUser`, `onAuthStateChange`, `getSession`, `signOut`.
3. **Fail gracefully obligatorio:** toda llamada a Supabase Auth va en `try/catch`. Fallos inesperados se registran en `errores_runtime` (`modulo='auth'`, severidad `critical` si `esErrorDeRed`) y muestran `MENSAJE_ERROR_GENERICO` (banner global). Rechazos esperados de Auth (credenciales invalidas, usuario existente, email no confirmado, password debil, rate limit) muestran mensaje amigable especifico sin registrar ruido en `errores_runtime` y sin exponer detalles tecnicos.
4. **Auto-login directo tras el registro** (decision del usuario): `signUp` con confirmaciones desactivadas devuelve sesion → el guard navega al home. La UI maneja defensivamente el caso `data.session == null` (confirmacion activada en el remoto) mostrando "Revisa tu email".
5. **Recuperacion de contraseña con flujo completo (decision del usuario):** `resetPasswordForEmail(email, { redirectTo: Linking.createURL('nueva-contrasena') })` + pantalla raiz `nueva-contrasena` **fuera de los grupos protegidos** (para que no se desmonte cuando la sesion de recovery se establece). Requisito operativo no-codigo: agregar `taekwondo://nueva-contrasena` (y `exp://<host>/--/nueva-contrasena` para Expo dev) en *Auth → URL Configuration → Additional Redirect URLs* del dashboard de Supabase y contar con SMTP para el envio del email.
6. **`supabase/config.toml` NO se modifica en esta fase** (item opcional no aprobado); `supabase/` queda intacto.
7. **La UI jamas expone stack traces ni mensajes crudos** de Auth.

## Contexto / objetivo
Cubrir el item 1 de la Fase 2 del workflow (`documentacion/workflow-implementacion-mobile.md`): crear las pantallas de **registro (email/password)**, **inicio de sesion** y **recuperacion de contraseña** dentro de un directorio de rutas protegidas `(auth)`, con sesion gestionada por Supabase Auth (persistida de forma segura via el patron `LargeSecureStore` del item 1.3), guards declarativos `Stack.Protected` y un home provisional con "Cerrar sesion" para probar los flujos (el home real llega en Fase 3).

## Cambios concretos

### 1. `mobile/src/contextos/AuthGlobal.tsx` (nuevo)
`AuthGlobalProvider({ children })` + `useAuthGlobal()` (lanza error si se usa fuera del provider). Contrato:
- `type ResultadoAuth = { error: string | null; pendienteConfirmacion?: boolean }`
- Contexto `{ sesion: Session | null; cargando: boolean; iniciarSesion(email, password): Promise<ResultadoAuth>; registrarCuenta(email, password): Promise<ResultadoAuth>; recuperarContrasena(email): Promise<ResultadoAuth>; cerrarSesion(): Promise<void> }`.
- Init `useEffect`: `supabase.auth.getSession()` (try/catch → `registrarError`; nunca rompe el arranque) → `sesion` + `cargando=false`; suscripcion a `onAuthStateChange` actualiza `sesion` (SIGNED_IN/SIGNED_OUT/UPDATED/TOKEN_REFRESHED); limpieza en unmount.
- Cada metodo: `try/catch` + `normalizarErrorAuth(error, contexto)`: rechazo esperado (`esRechazoEsperado`) → mensaje amigable especifico; inesperado → `void registrarError({ modulo:'auth', contexto, error, severidad: esErrorDeRed ? 'critical' : 'error' })` + `MENSAJE_ERROR_GENERICO`.
- `recuperarContrasena` usa `Linking.createURL('nueva-contrasena')` como `redirectTo`.
- Orden en el layout raiz: `ErrorGlobalProvider` (externo, el banner tapa tambien el area auth) → `AuthGlobalProvider` (interno).

### 2. `mobile/src/lib/auth-mensajes.ts` (nuevo)
- `esRechazoEsperado(error): boolean` → `error instanceof AuthError` con `code` dentro de un allowlist de rechazos de login/registro/recuperacion (`invalid_credentials`, `user_already_exists`, `email_not_confirmed`, `weak_password`, `over_email_send_rate_limit`, `over_request_rate_limit`, `email_address_invalid`).
- `mensajeAmigableDeErrorAuth(error): string` → mapeo por `error.code` de los casos anteriores; fallback `MENSAJE_ERROR_GENERICO`.

### 3. `mobile/src/lib/parsear-deeplink.ts` (nuevo)
- `obtenerParametrosDeUrl(url: string | null): Record<string, string>` — normaliza el fragment de Supabase (`#` → `?`) y parsea `access_token`, `refresh_token`, `code`, `type`.

### 4. `mobile/src/components/CampoTexto.tsx` (nuevo)
- `CampoTexto({ label, error, ...rest })` sobre `TextInput` (etiqueta, borde de error, placeholder gris, accesibilidad). Sin librerias de formularios.

### 5. Rutas
- **`mobile/src/app/_layout.tsx`** (editar): `RootNavigator` lee `useAuthGlobal()`; mientras `cargando` muestra una vista de carga simple (evita el destello de redirect antes de restaurar sesion); luego `Stack` con guards:
  - `<Stack.Protected guard={sesion != null}><Stack.Screen name="index" /></Stack.Protected>`
  - `<Stack.Protected guard={sesion == null}><Stack.Screen name="(auth)" /></Stack.Protected>`
  - `<Stack.Screen name="nueva-contrasena" />` (deep link de recovery, siempre accesible).
- **`mobile/src/app/index.tsx`** (editar): home provisional (titulo de la app, email del usuario y boton "Cerrar sesion").
- **`mobile/src/app/nueva-contrasena.tsx`** (nuevo): captura `Linking.useLinkingURL()`; con `access_token`/`refresh_token` → `supabase.auth.setSession(...)` (o `code` → `exchangeCodeForSession`); token valido → form "Nueva contraseña + confirmacion" → `supabase.auth.updateUser({ password })`; exito → `signOut()` + `router.replace('/iniciar-sesion')`. Sin token valido → "El enlace no es valido o expiro." + link al login.
- **`mobile/src/app/(auth)/_layout.tsx`** (nuevo): `Stack` con `screenOptions={{ headerShown: false }}`.
- **`mobile/src/app/(auth)/index.tsx`** (nuevo): `<Redirect href="/iniciar-sesion" />` (ancla del grupo).
- **`mobile/src/app/(auth)/iniciar-sesion.tsx`** (nuevo): email + password + boton "Iniciar sesion"; links a "Crear cuenta" y "Olvide mi contrasena"; errores inline amigables; si el error es el generico, ademas dispara el banner global.
- **`mobile/src/app/(auth)/crear-cuenta.tsx`** (nuevo): email + password + confirmacion (validacion: regex de email, min 6 caracteres — requisito de Supabase); exito → auto-login; `pendienteConfirmacion` → pantalla "Revisa tu email".
- **`mobile/src/app/(auth)/recuperar-contrasena.tsx`** (nuevo): email + "Enviar enlace" → exito muestra "Si existe una cuenta con ese email, recibiras un enlace para restablecer tu contrasena." (no revela existencia de cuentas).

### 6. Documentacion
- Crear este plan y agregar fila en `documentacion/README.md` (regla de oro #1).
- Nota operativa no-codigo: configurar Additional Redirect URLs y SMTP en el dashboard de Supabase para el flujo completo de recuperacion (ver verificación).

## Criterios de aceptacion y verificacion
- [x] `npm run typecheck` limpio en `mobile/` (sin dependencias nuevas) + bundle `npx expo export` OK.
- [ ] Registro → auto-login → index; sesion restaurada al reiniciar la app (`getSession`); "Cerrar sesion" → vuelve a `iniciar-sesion` (prueba en dispositivo).
- [ ] Login con credenciales invalidas → mensaje amigable especifico, sin stack traces, sin fila en `errores_runtime`. Red cortada → banner generico + fila `critical` (`modulo='auth'`) en `errores_runtime` (prueba en dispositivo).
- [ ] Sin sesion: `/` y `(auth)` accesibles; con sesion: deep link a `iniciar-sesion` redirige a `index` (guards de `Stack.Protected`; prueba en dispositivo).
- [ ] Recuperacion: envio de email → deep link → `nueva-contrasena` actualiza el password (**pendiente** — requiere SMTP/redirect URLs configuradas en el dashboard; no verificable end-to-end por ahora).
- [x] `git status`: `.env` ausente; `supabase/` y `web/` intactos.

---
🐧