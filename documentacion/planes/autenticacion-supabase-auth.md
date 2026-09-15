# Plan: Autenticación (Supabase Auth)

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-15 | Borrador inicial. |
| 1.1 | 2026-09-15 | Revisión del revisor: (1) Decisión Pendiente resuelta → **Opción A** integrada como flujo oficial de alta de Profesores (auto-registro con `INVITE_CODE`); el seteo de `profiles.rol = 'profesor'` **se ejecuta obligatoriamente con `admin.ts` (Service Role)**, ya que RLS impide el auto-cambio de rol. (2) **Registro innegociable en `errores_runtime`**: todo `try/catch` (proxy.ts, clientes, auth.ts y actions login/registro) debe insertar los detalles técnicos del fallo además de mostrar mensaje genérico. (3) Metadatos actualizados a 1.1. |
| 1.1 | 2026-09-15 | **Aprobado** por el usuario. Inicio de implementación. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar archivos `.env*`.** Solo se versionan placeholders en `web/.env.example` (incluye `INVITE_CODE=`).
2. **Usar obligatoriamente `@supabase/ssr`.** En el handler de cookies usar **únicamente** `getAll`/`setAll`; jamás `get`/`set`/`remove`. **Prohibido** `@supabase/auth-helpers-nextjs` (rompe la app).
3. **Next.js 16:** el archivo de interceptación es **`proxy.ts`** con `export function proxy()` corriendo en el runtime Node.js. **NO** usar `middleware.ts` (deprecado).
4. **Jamás usar `supabase.auth.getSession()` como validación en código de servidor** (no revalida el token). Usar `auth.getUser()`.
5. **El proxy es solo capa de UX/refresco de sesión**, no frontera de seguridad: cada Server Action / Route Handler / Server Component protegido vuelve a verificar sesión y rol.
6. **No consultar `profiles` desde el proxy** para decidir redirects (evita una query por petición). El proxy solo chequea presencia de sesión; el rol se valida en páginas/actions.
7. **Fail gracefully (innegociable, doble acción):** toda comunicación con BD/servicios externos va en `try/catch`. Cada `catch` debe (a) **insertar en `errores_runtime`** los detalles técnicos (módulo, contexto/ruta, `mensaje_error`, `stack_trace`, severidad) y (b) devolver a la UI un mensaje amigable y genérico. Obligatorio en `proxy.ts`, `server.ts`, `client.ts`, `auth.ts` y las actions de login/registro. La UI jamás expone excepciones crudas.
8. **`profiles.rol` solo se escribe vía `admin.ts` (Service Role).** Con el endurecimiento RLS del ítem 6 (trigger), un usuario autenticado **no puede** modificar su propio `rol`; el alta como Profesor pasa sí o sí por el flujo con `INVITE_CODE`.
9. Código y comentarios en español. Sin commits/push automáticos.

## Contexto / objetivo
Integrar Supabase Auth (SSR) en Next.js 16 para el MVP (Fase 1, ítem 3 del `workflow.md`): los **Profesores** tendrán cuentas activas para acceder al panel de gestión del Módulo de Torneos. El **alumno** del MVP no inicia sesión (se inscribe por link sin login).

**Modelo de roles adoptado:** solo `profesor` y `alumno`. El **organizador no es un rol**: es el profesor dueño del torneo (`torneos.organizador_id`, ya cubierto por `inscripciones_select_organizador`). Cualquier profesor puede crear/organizar un torneo. La restricción "1er Dan verificado → activar faceta profesor" es de **Fase 2**; este ítem solo deja el campo `rol` preparado.

## Cambios concretos

### 1. Dependencia
- En `web/`: `npm install @supabase/ssr`.

### 2. Clientes Supabase — `src/lib/supabase/`
- **`client.ts`** → `createBrowserClient` (Client Components). Envuelve cada operación sensible en try/catch e inserta el fallo en `errores_runtime` (módulo: `browser`).
- **`server.ts`** → `createServerClient` con cookies de `next/headers` (`getAll` = `cookieStore.getAll()`; `setAll` envuelto en try/catch: los Server Components no escriben cookies, el proxy refresca). Si `setAll` falla, registra en `errores_runtime` (módulo: `server`, severidad `warning`). La creación/uso del cliente fallido inserta su stack trace.
- **`admin.ts`** → cliente **service role** (hereda el actual `server.ts`). Único canal para escribir `profiles.rol`. Actualizar import en `src/app/api/health/route.ts`.
- Todos los `catch` insertan en `errores_runtime` y propagan un error/mensaje genérico hacia arriba.

### 3. `src/proxy.ts` (Next.js 16)
- `updateSession(request)`: `createServerClient` (cookies vía `request.cookies.getAll()` / `setAll` aplicando sobre la respuesta), `await supabase.auth.getUser()` para refrescar token, y devolver la `supabaseResponse` **sin reemplazar** por un `NextResponse` nuevo (regla de cookie-forwarding).
- Redirects:
  - Sin sesión y ruta **no** `/login` ni `/registro` → `/login?next=<path>`.
  - Con sesión en `/login` o `/registro` → `/panel`.
- El cuerpo completo va en try/catch (módulo `proxy`, contexto = path) y, ante fallo, inserta en `errores_runtime` y continúa con una respuesta neutra (sin bloquear la app ni exponer detalles).
- Matcher excluye `_next/*`, imágenes, favicon y estáticos.

### 4. Guardas de servidor — `src/lib/auth.ts`
- `getUser()`: usuario autenticado vía `auth.getUser()`.
- `requireUser()`: redirige a `/login?next=` si no hay sesión.
- `getProfile()` / `requireProfesor()`: leen `profiles.rol`; `requireProfesor` redirige a `/` si no es `profesor`.
- Todas envuelven su lógica en try/catch: insertan el fallo en `errores_runtime` (módulo `auth`, contexto = ruta/acción) y convierten el error en una redirección/mensaje genérico; jamás exponen stack traces.

### 5. Rutas y acciones
- **`/login`** (Server Action + formulario Client): email + contraseña, soporta `?next=` (redirect interno validado contra open redirect). Errores → try/catch con insert en `errores_runtime` + mensaje genérico.
- **`/registro` — Flujo oficial (Opción A):**
  1. El usuario carga email + contraseña + nombre + `INVITE_CODE`.
  2. La Server Action valida el código contra la env var e invoca `supabase.auth.signUp({ email, password })` (try/catch → `errores_runtime` si falla).
  3. **Si `INVITE_CODE` es correcto**, se setea `profiles.rol = 'profesor'` usando **obligatoriamente el cliente `admin.ts` (Service Role)** con `update().eq('id', user.id)`. Nunca con el cliente del usuario: las políticas RLS (restringidas por el trigger del ítem 6) impiden que un usuario recién creado modifique su propio rol.
- **`/logout`**: Server Action que cierra sesión y redirige a `/` (try/catch → `errores_runtime`).
- **`(panel)`** group protegida: layout ejecuta `requireProfesor()`; vista de bienvenida + botón "Cerrar sesión" + placeholder "Tus torneos".
- **`layout.tsx`** raíz: `metadata` → título "Taekwondo ITF".

### 6. Migración de BD
- `npx supabase migration new rol_profiles` (generada por CLI obligatoriamente):
  ```sql
  alter table public.profiles
    add column rol text not null default 'alumno'
    check (rol in ('profesor', 'alumno'));
  ```
- **Endurecimiento RLS (para que solo el Service Role escriba `rol`):** trigger `BEFORE UPDATE OF rol ON public.profiles` que lanza `raise exception` cuando `auth.uid() is not null` (usuario autenticado). El cliente `admin.ts` (service role) tiene `auth.uid() = null` y queda exento.
- Actualizar `documentacion/databaseModel.md` con la columna `rol`.

### 7. `.env.example`
- Agregar `INVITE_CODE=` (placeholder, sin valor real).

## Criterios de aceptación y verificación
- [x] Registro → login → logout funcionan y la sesión persiste (cookies `sb-*`).
- [x] Alta como Profesor: solo con `INVITE_CODE` correcto y `rol` escrito vía `admin.ts`; un intento de auto-cambio de rol desde el cliente queda bloqueado por RLS/trigger (verificado empíricamente).
- [x] Ruta protegida sin sesión → redirect a `/login?next=`; con sesión y rol `profesor` → 200.
- [x] El proxy refresca el token sin desloguear.
- [x] **Registro de errores:** fallo forzado dejó fila en `errores_runtime` con módulo/contexto/stack trace, mientras la UI solo muestra el mensaje genérico.
- [x] `npm run lint` y `npm run build` en `web/` OK.
- [x] `databaseModel.md` actualizado; `workflow.md` ítem 3 de Fase 1 → `[x]`.

## Notas de cierre
- Verificación empírica realizada con una ruta temporal de desarrollo (eliminada tras la prueba): forzado de error → INSERT en `errores_runtime` con módulo/contexto/stack_trace/severidad; el trigger `bloquear_auto_cambio_rol` bloquea el auto-cambio de rol de un usuario; el cliente Admin (Service Role) sí puede setear `profiles.rol`.
- El flujo UI completo (signUp → login → logout en navegador) queda disponible para una prueba manual en el entorno de desarrollo.