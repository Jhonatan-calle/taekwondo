# Plan: Onboarding Obligatorio de Perfil — (Fase 2, ítem 2 del workflow)

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Decisiones: fecha de nacimiento con `@react-native-community/datetimepicker` (incluido en Expo Go SDK 57); unicidad del DNI = formato en app + RPC `verificar_dni_disponible` (SECURITY DEFINER) + red de seguridad capturando el unique 23505 al guardar; `perfilCompleto` calculado en cliente, sin columnas nuevas en `profiles`. |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y modulo de torneos intacto:** no se tocan.
2. **RLS en cascada:** el usuario autenticado solo lee su propio perfil (y a sus alumnos directos). NO se puede detectar un DNI duplicado con un `select` desde el cliente → la unicidad real la garantiza el indice unico de BD; el RPC `SECURITY DEFINER` solo mejora la UX ("antes de registrar").
3. **Unica dependencia nueva:** `@react-native-community/datetimepicker` instalado con `npx expo install` (incluido en Expo Go). Sin librerias de formularios; seguir el estilo existente (`CampoTexto`, `Pressable`, acentos `#C62828`).
4. **Migraciones SOLO con `npx supabase migration new <slug>`** en la raiz `supabase/`; nombre en español.
5. **Fail gracefully obligatorio:** toda llamada a Supabase via `ejecutarConsulta` (registro en `errores_runtime`, `modulo='perfil'`, severidad `critical` si `esErrorDeRed`). La UI jamas expone detalles tecnicos. Rechazo esperado (DNI duplicado 23505) → mensaje amigable sin ruido en `errores_runtime`.
6. **`grado_actual` no se toca en onboarding** (el grado proviene de examenes/activaciones): evita colisionar con el trigger `bloquear_auto_cambio_grado`.
7. **Antes de codear en `mobile/`, leer las docs versionadas de Expo SDK 57** (DateTimePicker), `mobile/AGENTS.md`.
8. **Fecha de nacimiento en zona local:** se guarda `YYYY-MM-DD` local (no UTC) para no correr la edad; `calcularEdad` usa la hora local.

## Contexto / objetivo
Cubrir el ítem 2 de la Fase 2 del workflow: **bloquear el acceso a la aplicacion principal hasta que el usuario complete su perfil** en `profiles`. Formulario obligatorio: Nombre Completo, DNI (unico, validado en la app antes de registrar), Fecha de Nacimiento (con calculo automatico de la edad cronologica), Peso (kg) y Genero. Complementarios del mismo formulario, no bloqueantes: Altura (cm), Contacto de Emergencia y Datos de Salud (si quedan vacios se completan luego desde el perfil).

Todos los campos ya existen en `profiles`; el unico cambio de BD es el RPC de unicidad del DNI.

## Cambios concretos

### 1. BD — migracion `verificar_dni_disponible`
- `supabase/migrations/<ts>_verificar_dni_disponible.sql` (creada con `npx supabase migration new verificar_dni_disponible`):
  - `public.verificar_dni_disponible(p_dni text) returns boolean` — `SECURITY DEFINER`, `set search_path = public`, `stable`:
    ```sql
    select not exists (
      select 1 from public.profiles where dni = p_dni and id <> auth.uid()
    );
    ```
  - `grant execute ... to authenticated`; `revoke` de `anon` (por defecto).

### 2. `mobile/src/lib/perfil.ts` (nuevo)
- Tipo `PerfilOnboarding` = `Pick<ProfilesRow, 'nombre_completo'|'dni'|'fecha_nacimiento'|'peso_kg'|'genero'|'altura_cm'|'contacto_emergencia'|'datos_salud'>`.
- `perfilCompleto(perfil): boolean` → `nombre_completo.trim() !== '' && dni != null && fecha_nacimiento != null && peso_kg != null && genero != null`.
- `calcularEdad(fechaISO: string | null): number | null` → anos cumplidos (hora local).
- Validaciones puras: `esDniValido` (`/^\d{7,8}$/`), `esPesoValido` (>0 y <=300), `esAlturaValida` (vacia o 50–230), `fechaValidaNacimiento` (fecha valida, no futura, edad >= 4).

### 3. `mobile/src/contextos/AuthGlobal.tsx` (editar)
- Nuevo estado `perfil: PerfilOnboarding | null`; se carga con `ejecutarConsulta` al restaurar sesion y en cada `SIGNED_IN`; `null` en `SIGNED_OUT/cerrarSesion`. `cargando` permanece `true` hasta que sesion **y** perfil esten resueltos (sin destello de guards).
- `perfilCompleto: boolean` memoizado.
- `verificarDniDisponible(dni): Promise<boolean | null>` → `supabase.rpc('verificar_dni_disponible', { p_dni: dni })` via `ejecutarConsulta`; `null` ante fallo (no bloquea el guardado: el 23505 protege igual).
- `completarPerfil(datos): Promise<{ error: string | null }>` → `update` del perfil propio (RLS `profiles_update_propio`); si `error.code === '23505'` → `'El DNI ya está registrado.'`; exito → refresca `perfil`.
- Extender el contrato del contexto con `perfil`, `perfilCompleto`, `verificarDniDisponible`, `completarPerfil`.

### 4. Rutas
- **`mobile/src/app/_layout.tsx`** (editar) — guards `Stack.Protected`:
  - `index` → `sesion != null && perfilCompleto`
  - `onboarding` → `sesion != null && !perfilCompleto`
  - `(auth)` → `sesion == null`
  - `nueva-contrasena` → siempre accesible.
- **`mobile/src/app/onboarding.tsx`** (nuevo): `ScrollView` + `KeyboardAvoidingView`.
  - `CampoTexto` para nombre, DNI (teclado numerico), Peso (kg), Altura (cm, opcional), Contacto de Emergencia (opcional), Datos de Salud (opcional).
  - Fecha de nacimiento: `Pressable` que abre `DateTimePicker` (`mode='date'`, `maximumDate={hoy}`, `display` segun plataforma); muestra "Edad calculada: X años" en vivo.
  - Genero: grupo segmentado de 3 `Pressable` (Masculino / Femenino / Otro).
  - Validacion previa con `perfil.ts` (errores inline por campo); al enviar: `verificarDniDisponible` → `completarPerfil` (maneja 23505 igual como red). Exito → `router.replace('/')` (el guard navega si no hay session? no: hay sesion, cambia `perfilCompleto`). Fallo inesperado → banner global (`reportarError`) + `errores_runtime`.

### 5. Documentacion
- Crear este plan y fila en `documentacion/README.md` (regla de oro #1).
- Agregar items a `documentacion/pendientes-pruebas.md`: bloqueo sin perfil, DNI duplicado, edad calculada, complementarios vacios completablen luego desde el perfil.

## Criterios de aceptacion y verificacion
- [x] `npm run typecheck` limpio en `mobile/`.
- [x] `supabase db lint --linked` sin errores de la migracion nueva (solo queda el issue pre-existente de `sincronizar_resultado_en_vivo`, modulo de torneos congelado, no se toca).
- [x] **`supabase db push --linked` PENDIENTE de operador:** la CLI no tiene access token (`supabase login`/`SUPABASE_ACCESS_TOKEN`). La migracion `verificar_dni_disponible.sql` debe aplicarse al remoto antes de probar el RPC en dispositivo; el tipo de la funcion ya se incorporo manualmente a `database.types.ts`.
- [x] (Dispositivo) Cuenta nueva → cae en `onboarding`; no se accede a `index`; completar → `index`.
- [x] (Dispositivo) DNI duplicado → "El DNI ya está registrado." (pre-chequeo y/o 23505).
- [ ] (Dispositivo) Fecha invalida/futura o edad < 4 → error inline; la edad se muestra al elegir la fecha.
- [ ] (Dispositivo) Complementarios vacios no bloquean; al revisar `profiles` quedan `null`.
- [ ] (Dispositivo) Red cortada al guardar → banner generico + fila `critical` (`modulo='perfil'`).
- [x] `git status`: `supabase/` solo con la migracion nueva; `web/` intacto.
- Nota conocida: en `web` el DateTimePicker nativo no soporta web (fallback `null`); probar el onboarding en dispositivo (el widget de fecha no funciona en el preview web).

---
🐧