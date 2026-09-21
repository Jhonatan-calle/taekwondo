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

---

🗒️ Actualizar este archivo (tachar items, agregar folow-ups de fecha) cada vez que se haga una
prueba manual o se descubra un nuevo pendiente.

---
🐧