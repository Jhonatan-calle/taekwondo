# Plan: Arreglos en Auth — Duplicado de email y Require Cycle (mobile)

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Se fija: deteccion de email duplicado en `registrarCuenta` usando `data.identities.length === 0` (Supabase responde 200 sin `error` cuando el email ya existe) con mensaje amigable "Ya existe una cuenta con ese email."; y ruptura del require cycle `ErrorGlobal.tsx -> BannerError.tsx -> ErrorGlobal.tsx` pasando `mensaje`/`onCerrar` por props (el ciclo deja de existir; direccion unica `ErrorGlobal -> BannerError`). |

## Restricciones y Correcciones Previas (No repetir)
1. **Sin dependencias nuevas:** los fixes usan solo codigo existente (`@supabase/supabase-js`, react-navigation, expo). No se anade ninguna libreria.
2. **No volver a crear el ciclo:** `BannerError` no debe importar nada de `contextos/`; recibe estado y callback por props. Si se vuelve a renderizar el banner en otro lado, replicar el patron props.
3. **No detectar el duplicado por `error.code`:** con el email ya registrado, `signUp` de Supabase (aun con confirmaciones activadas o desactivadas en ciertas versiones) devuelve `data.user` y `data.session == null` SIN `error`. El indicador confiable es `data.identities` vacio. No depender de que el servidor devuelva `user_already_exists`.
4. **Fail gracefully intacto:** los rechazos esperados siguen mostrando mensaje amigable sin escribir en `errores_runtime`; los inesperados siguen registrandose y mostrando el banner generico.
5. **No tocar `supabase/` ni `web/`** (congelada).

## Contexto / objetivo
Tras probar el flujo de acceso manualmente en Metro:
1. Metro reporta un require cycle en runtime: `src/contextos/ErrorGlobal.tsx -> src/components/BannerError.tsx -> src/contextos/ErrorGlobal.tsx` (ciclo real: ErrorGlobal importa BannerError para renderizarlo, y BannerError importa `useErrorGlobal` para leer el estado). Los ciclos pueden producir valores sin inicializar; se elimina.
2. Registrar una cuenta con un email ya existente no se detecta como duplicado: la UI pasaba a "Revisá tu email" en lugar de avisar. Se corrige en `registrarCuenta`.

## Cambios concretos

### 1. `mobile/src/lib/auth-mensajes.ts` (editar)
- Exportar `export const MENSAJE_USUARIO_YA_EXISTE = MENSAJES_POR_CASO.user_already_exists`.

### 2. `mobile/src/contextos/AuthGlobal.tsx` (editar)
- Importar `MENSAJE_USUARIO_YA_EXISTE`.
- En `registrarCuenta`, para el caso `data.session == null`:
  - Si `(data.identities?.length ?? 0) === 0` → `{ error: MENSAJE_USUARIO_YA_EXISTE }` (cuenta ya existe).
  - Caso contrario → `{ error: null, pendienteConfirmacion: data.user != null }` (confirmacion por email activa en el remoto).

### 3. `mobile/src/components/BannerError.tsx` (editar)
Firma por props: `BannerError({ mensaje, onCerrar }: BannerErrorProps)`.
- Eliminar `import { useErrorGlobal } from '@/contextos/ErrorGlobal'`.
- Usar `mensaje`/`onCerrar` recibidos; el fallback `MENSAJE_ERROR_GENERICO` se mantiene.

### 4. `mobile/src/contextos/ErrorGlobal.tsx` (editar)
- Renderizar `<BannerError mensaje={mensaje} onCerrar={ocultarError} />`.
- La direccion de imports queda `ErrorGlobal -> BannerError -> (react-native / lib)`: sin ciclo.

### 5. Documentacion
- Crear este plan y agregar fila en `documentacion/README.md`.
- Registro separado de la purga de datos de la BD remota en `documentacion/planes/db-purga-datos-seed.md`.

## Criterios de aceptacion y verificacion
- [x] `npm run typecheck` limpio en `mobile/` + bundle `npx expo export` OK.
- [x] Sin require cycle `ErrorGlobal <-> BannerError` en la salida de Metro (el import de `contextos/` desaparece de BannerError).
- [x] `git status`: `.env` ausente; `supabase/` y `web/` intactos.
- [ ] (dispositivo) Registrar un mail ya existente muestra "Ya existe una cuenta con ese email." sin pasar por "Revisá tu email".

---
🐧