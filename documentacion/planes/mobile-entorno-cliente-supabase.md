# Plan: Entorno y Cliente Supabase (Fase 1.3 del Workflow)

> **Metadatos**
> - **Version:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador inicial. |
| 1.1 | 2026-09-20 | **Revisado.** Se fija la nomenclatura de la variable de la clave: se adopta obligatoriamente la **Opcion B** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) por ser el estandar de Supabase para clientes frontend y la redaccion original del workflow, aunque el valor sea una *publishable key* (`sb_publishable_...`). Se actualizan los puntos 1, 2 y 5, la seccion "Decision pendiente" pasa a "Decision tomada" y el punto 3 agrega el paso de crear el directorio destino (`mkdir -p mobile/src/lib`) antes de redirigir la salida de `supabase gen types`. |

## Restricciones y Correcciones Previas (No repetir)
1. **`.env*` son archivos protegidos** (AGENTS.md): el nuevo `mobile/.env` se crea con valores reales SOLO por autorizacion explicita del usuario para leer `credenciales.txt`. Nunca commitear; el `.gitignore` de `mobile/` ya excluye `.env*` con excepcion `!.env.example`.
2. **El `.env` no se commitea; `.env.example` (placeholders) SI.**
3. **Nomenclatura de la variable de key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`** (decidida): aunque la credencial guardada sea una *publishable key* (`sb_publishable_...`), el estandar de la documentacion de Supabase para clientes frontend y la redaccion original del workflow exigen el uso de `ANON_KEY`. Ver "Decision tomada" mas abajo.
4. **`crypto.getRandomValues` en RN**: requiere import de `react-native-get-random-values` al inicio del archivo que lo usa (ya instalada en Fase 1.2).
5. **No instalar dependencias nuevas**: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `aes-js` y `react-native-get-random-values` ya estan en `package.json` (Fase 1.2 aprobada).
6. **No se toca**: `supabase/` (migraciones), `web/` (congelada), tablas de torneos, y no se implementa aun el "Mecanismo Global de Control de Errores" (es la Fase 1.4 del workflow).

## Contexto / objetivo
Cerrar la configuracion de infraestructura de la app movil: definir el entorno con las credenciales de Supabase en `mobile/.env` (excluido de git), proveer un `.env.example` de referencia commiteado, generar los tipos TypeScript de la base de datos (cliente tipado de punta a punta) y crear el cliente `supabase` en `mobile/src/lib/supabase.ts` con almacenamiento seguro de sesion (patron `LargeSecureStore`: clave AES-256 en `expo-secure-store` + payload cifrado en AsyncStorage, rompe el limite ~2KB de SecureStore en iOS).

## Cambios concretos

### 1. Archivo `.env` (local, NO versionado) — `mobile/.env`
Contenido (valores reales provenientes de `credenciales.txt`, ya autorizado):
```
EXPO_PUBLIC_SUPABASE_URL=https://zxzcgkcbzrgbgnsmrtkv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_pzw0S0WcTlQ0UefFx--4zA_Hc40HMJH
```
- Nota de seguridad: estas vars son publicas por diseño (la seguridad real la da RLS). El prefijo `EXPO_PUBLIC_` es OBLIGATORIO para que Expo las inline en el bundle.

### 2. Archivo `.env.example` (versionado) — `mobile/.env.example`
Idem estructura anterior con placeholders vacios (sin valores reales), para que cualquier clone sepa que variables requiere:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Tipos de la BD — generar `mobile/src/lib/database.types.ts`
- Asegurar que el directorio destino exista antes de redirigir la salida (evita error de la terminal sobre ruta inexistente):
  `mkdir -p mobile/src/lib`
- Ejecutar desde la RAIZ del repo (donde vive `supabase/`):
  `npx supabase gen types typescript --linked > mobile/src/lib/database.types.ts`
- Requiere sesion de CLI (`sbp_...` ya guardada con `supabase login`, proyecto vinculado en `supabase/.temp`). Si pide login, correr `npx supabase login`.
- Contrato: archivo con el tipo raiz `Database` (tablas, enums `grado`, funciones/RPCs). No se edita a mano; se regenera ante cambios de BD.

### 4. Storage seguro — nuevo `mobile/src/lib/large-secure-store.ts`
Clase `LargeSecureStore` que implementa la interfaz de storage de `@supabase/supabase-js` (`getItem`/`setItem`/`removeItem`), separada en su propio archivo para testabilidad:
- `setItem(key, value)`: genera clave AES-256 con `crypto.getRandomValues(new Uint8Array(32))`, cifra `value` con `aes-js` en modo CTR, guarda la clave en `expo-secure-store` y el payload cifrado (hex) en AsyncStorage.
- `getItem(key)`: lee clave desde SecureStore, descifra el payload de AsyncStorage y devuelve el valor plano (o `null`).
- `removeItem(key)`: elimina de AsyncStorage y SecureStore.
- Firmas: `getItem(key: string): Promise<string | null>`, `setItem(key: string, value: string): Promise<void>`, `removeItem(key: string): Promise<void>`.
- `import 'react-native-get-random-values'` al tope.

### 5. Cliente — `mobile/src/lib/supabase.ts`
- Import tipado: `import { Database } from '@/lib/database.types';`
- Construccion:
  ```ts
  export const supabase = createClient<Database>(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: new LargeSecureStore(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  )
  ```
- `process.env` accede con notacion de punto (requisito Expo para inline).
- Sin import de `react-native-url-polyfill` (no instalado y no necesario: Expo provee el global `URL`).

### 6. Tipado de env vars (verificacion)
- `mobile/expo-env.d.ts` ya referencia `expo/types`, que expone `process.env.EXPO_PUBLIC_*` tipadas; verificar que `tsc` no reclame `process`.
- Si TS no tipa las vars, descartar necesidad de `@types/node` (no instalar salvo que tsc lo exija).

## Decision tomada (revision 1.1)
**Nombre de la variable de la clave: `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Opcion B).**

Aunque la credencial almacenada en `credenciales.txt` es una *publishable key* generada en 2026 (`sb_publishable_...`), se adopta obligatoriamente la nomenclatura `ANON_KEY` por ser el estandar de la documentacion de Supabase para clientes frontend y por la redaccion original del workflow (v1.1, Fase 1, punto 3). El valor de la variable es el mismo (`sb_publishable_pzw0S0WcTlQ0UefFx--4zA_Hc40HMJH`); solo cambia el nombre bajo el cual se expone en el bundle de Expo.

| Decision | Variable en `.env` | Uso en `supabase.ts` | Estado |
|---|---|---|---|
| A | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!` | **Descartada.** |
| B | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!` | **Adoptada.** |

Fija en `.env`, `.env.example` y `supabase.ts`. Al ser igual al texto del workflow aprobado, **no** requiere actualizar `documentacion/workflow-implementacion-mobile.md`.

## Criterios de aceptacion y verificacion
- [x] `mobile/.env` creado con vars reales y PREFIJO `EXPO_PUBLIC_`; ausente de git (`git status`).
- [x] `mobile/.env.example` creado y versionado con placeholders.
- [x] `mobile/src/lib/database.types.ts` generado y versionado; `tsc` lo acepta.
- [x] `mobile/src/lib/large-secure-store.ts` implementa `getItem`/`setItem`/`removeItem` (SecureStore + AsyncStorage + aes-js).
- [x] `mobile/src/lib/supabase.ts` crea `createClient<Database>` con `storage: new LargeSecureStore()`, `autoRefreshToken`, `persistSession`, `detectSessionInUrl: false`.
- [x] `supabase/` y `web/` intactos; sin nuevas dependencias.
- [x] `npx tsc --noEmit` (o `npm run typecheck`) limpio en `mobile/`.

---
🐧