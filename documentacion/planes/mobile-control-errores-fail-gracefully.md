# Plan: Mecanismo Global de Control de Errores ("Fail Gracefully") — Fase 1.4 del Workflow

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario. Se fija: wrapper centralizado `ejecutarConsulta`, registro asincrono en `errores_runtime`, banner global vía Context en el layout raiz, mensaje generico unico, severidad `critical` automatica ante errores de red (`TypeError`), y auto-dismiss de 6s. |

## Restricciones y Correcciones Previas (No repetir)
1. **`supabase/` y `web/` intactos:** la tabla `errores_runtime` ya existe (`20260915001759_esquema_inicial.sql:180`) con política `errores_runtime_insert_all` (`TO anon, authenticated` → el cliente anon puede insertar). **No se crea migracion.**
2. **Sin dependencias nuevas:** Expo Router ya envuelve la raiz en `SafeAreaProvider` (verificado en `expo-router/build/ExpoRoot.js`), por lo que `useSafeAreaInsets` funciona sin agregar otro provider.
3. **El registro nunca rompe el flujo:** `registrarError` traga sus propios fallos (si la red esta caida, el insert falla en silencio). El registro se hace con `void` (fire-and-forget) para no bloquear la UI.
4. **La UI jamás expone detalles tecnicos:** solo se muestra `MENSAJE_ERROR_GENERICO` = "No pudimos procesar tu solicitud, intentá de nuevo en unos minutos." (regla Fail gracefully de AGENTS.md). Sin stack traces, códigos ni mensajes crudos.
5. **`.env` sigue excluido de git:** sin cambios en credenciales; ningun secreto se agrega en esta fase.
6. **Referencia de patron (no copiar codigo de web):** el concepto `extraerMensajeError` / `crearRegistrador` ya existio en `web/src/lib/errores.ts` (enfoque web congelado). Se replica la idea en RN, no se importa ni duplica su codigo.

## Contexto / objetivo
Cerrar la Fase 1.4 del workflow: implementar un interceptor/wrapper centralizado para las solicitudes de BD de `mobile/` para que cualquier error crítico de conexión o consulta se registre de forma **asincrona** en `errores_runtime` y se muestre un **mensaje generico y amigable** en la UI (banner global), sin exponer detalles tecnicos.

## Cambios concretos

### 1. `mobile/src/lib/errores.ts` (nuevo)
Contrato:
- `export type SeveridadError = 'info' | 'warning' | 'error' | 'critical'`
- `export const MENSAJE_ERROR_GENERICO = 'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.'`
- `export type ParametrosRegistroError = { modulo: string; contexto?: string; error: unknown; severidad?: SeveridadError }`
- `export function extraerMensajeError(error: unknown): string`
  - `Error` → `.message`; objeto plano / `PostgrestError` → `.message`; fallback `JSON.stringify`; ultimo recurso `String(error)`. **Nunca** `'[object Object]'`.
- `export function esErrorDeRed(error: unknown): boolean` → `error instanceof TypeError` (fetch/network fallidos) para mapear a severidad `critical`.
- `export function crearRegistrador(cliente: SupabaseClient<Database>)` → devuelve `async (params: ParametrosRegistroError): Promise<void>`:
  - `try { insert into errores_runtime { modulo, contexto, mensaje_error, stack_trace (solo si `error instanceof Error`), severidad ?? 'error' } } catch { /* silencioso, nunca re-lanza */ }`.
- `export const registrarError = crearRegistrador(supabase)` (importa `@/lib/supabase`; sin ciclos de imports).

### 2. `mobile/src/lib/consulta-supabase.ts` (nuevo) — wrapper centralizado de BD
Contrato:
- `export type ResultadoConsulta<T> = { data: T | null; error: string | null }`
- `export type OpcionesConsulta = { modulo: string; contexto: string; severidad?: SeveridadError }`
- `export async function ejecutarConsulta<T>(promesa: Promise<{ data: T; error: PostgrestError | null }>, opciones: OpcionesConsulta): Promise<ResultadoConsulta<T>>`
  - `try`: si `error` (PostgREST/RLS) → `void registrarError({ modulo, contexto, error, severidad: opciones.severidad ?? 'error' })` y devuelve `{ data: null, error: MENSAJE_ERROR_GENERICO }`. Si `data` → `{ data, error: null }`.
  - `catch`: `void registrarError(...)` con severidad `critical` si `esErrorDeRed(error)` (sino `opciones.severidad ?? 'error'`) y devuelve `{ data: null, error: MENSAJE_ERROR_GENERICO }`.
  - Genérico: aplica a `.select/.insert/.update/.delete/.rpc`.

### 3. `mobile/src/contextos/ErrorGlobal.tsx` (nuevo)
- Contexto `{ mensaje: string | null; reportarError(mensaje?: string): void; ocultarError(): void }`.
- `export function ErrorGlobalProvider({ children }: PropsWithChildren)`:
  - Estado `mensaje` + timer de auto-dismiss de **~6000 ms** (se reinicia ante cada nuevo `reportarError`; se limpia al desmontar el provider).
  - Renderiza `{children}` seguido de `<BannerError />` (el banner vive dentro del provider).
- `export function useErrorGlobal(): ErrorContexto` — lanza error si se usa fuera del provider.
- `export function useConsultaSupabase()` → `{ ejecutar(promesa, opciones) }`: invoca `ejecutarConsulta` y, si `resultado.error`, llama `reportarError(resultado.error)`. Así el mensaje generico se muestra automaticamente sin repetir logica por pantalla.

### 4. `mobile/src/components/BannerError.tsx` (nuevo)
- `View` posicionado absoluto arriba, `zIndex` alto, fondo rojo, padding, `paddingTop` con `useSafeAreaInsets().top`.
- Muestra `Text` con el mensaje actual del contexto (default `MENSAJE_ERROR_GENERICO`).
- `Pressable`/boton de cierre que llama `ocultarError()`.
- Sin stack traces, ids ni detalles tecnicos.

### 5. Editar `mobile/src/app/_layout.tsx`
Envolver el layout raiz con `<ErrorGlobalProvider>` (manteniendo `<Stack screenOptions={{ headerShown: false }} />` y `<StatusBar style="auto" />` como hijos). El banner queda renderizado sobre las pantallas.

### 6. Documentacion
- Crear este plan (`documentacion/planes/mobile-control-errores-fail-gracefully.md`).
- Agregar fila en `documentacion/README.md` (regla de oro #1: mantener el indice vigente).
- Fase 1.4 del workflow queda cubierta (el workflow no posee checklist que marcar).

## Criterios de aceptacion y verificacion
- [ ] `npm run typecheck` limpio en `mobile/` (sin nuevas dependencias).
- [ ] Prueba manual dev: forzar fallo real (`.select()` sobre tabla inexistente o red cortada) → (a) fila nueva en `errores_runtime` con `modulo`, `contexto`, `mensaje_error` y `stack_trace` verificable via `npx supabase db query --linked "select * from public.errores_runtime order by id desc limit 5"`, y (b) banner visible con mensaje generico y amigable, sin detalles tecnicos en pantalla.
- [ ] `git status`: `.env` ausente; `supabase/` y `web/` sin cambios; sin datos sensibles entre los archivos nuevos.
- [ ] Un segundo `reportarError` mientras el banner esta visible reinicia el timer (no acumula ni superpone banners).

---
🐧