# Plan: Restricciones de Acceso (1er Dan verificado → faceta Profesor)

> **Metadatos**
> - **Versión:** 1.3
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-15

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-14 | Borrador inicial con decisiones pendientes (D-1/D-2). |
| 1.1 | 2026-09-14 | Revisión del plan: **D-1 → D-1a** (columna `grado_dan_actual`; descartada D-1b), **D-2 → D-2a** (RPC `activar_faceta_profesor` con `set_config`; descartada D-2b). RPC vía cliente de servidor autenticado (`server.ts`). `STABLE` en `puede_activar_profesor()`. |
| 1.2 | 2026-09-15 | **Aprobado** por el usuario sin objeciones. |
| 1.3 | 2026-09-15 | **Implementación efectiva y verificada:** migración `restricciones_acceso` escrita y aplicada (`supabase db push`), Server Action `activarModoProfesor()` creada, dump remoto OK (columna, funciones, triggers, `STABLE`), verificación empírica completa (11/11 checks OK, incluido intento de auto-registro de Dan bloqueado por blindaje y bypass INVITE intacto), `lint` + `build` OK, docs sincronizadas e ítem 3 de Fase 2 `[x]`. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar `.env*`.** Solo `web/.env.example` versionado.
2. **NO commits/push automáticos.**
3. **Migración generada por CLI** (`npx supabase migration new restricciones_acceso`).
4. **Patrones ya establecidos (reutilizar, no reinventar):**
   - Escribir campos sensibles solo con funciones `SECURITY DEFINER` + `create or replace` de triggers de blindaje.
   - Función `SECURITY DEFINER` que escribe desde sesión autenticada → `set_config('app.<contexto>','on',true)` para no ser bloqueada (patrón `derivacion_linaje` del ítem 2).
   - RPC con `auth.uid()` → **obligatorio usar el cliente autenticado de servidor** (`server.ts`). El cliente admin (Service Role) tiene `auth.uid() = NULL` y el gate devolvería `false`.
   - Guardas TS: `requireProfesor` ya gatea funciones de gestión vía `es_profesor`; no se toca.
5. **`INVITE_CODE` SIGUE como bypass** (registro actual otorga `es_profesor` vía Service Role; sin cambios en `registro/actions.ts`). La vía Dan es **adicional**.
6. **Decisiones cerradas (D-1a / D-2a):**
   - **D-1a:** el Dan vigente verificado se modela como **columna `profiles.grado_dan_actual public.grado_dan` (nullable)** escrita solo por el sistema. Su **presencia = Dan verificado vigente** (gate directo; `grados_verificados` se mantiene como flag complementario).
   - **D-2a:** la concesión real de la faceta vive en la **función RPC `activar_faceta_profesor()`** con el gate adentro; el bypass INVITE queda como escritura directa de Service Role (excepción).
7. **Alcance elegido: Backend + Server Action** (sin UI). La entrada visual de "Activar Modo Profesor" se vincula en Fase 3; acá queda lógica y acción botón-ready.
8. **Fail gracefully:** Server Action con `try/catch` → insert en `errores_runtime` + mensaje genérico. La UI jamás expone detalles técnicos.

## Contexto / objetivo
SRS §2 (Faceta Profesor): *"Solo los usuarios con 1er Dan (Cinturón Negro) o superior verificado pueden activar la faceta de Profesor y acceder a funciones de gestión. Desbloqueo automático al alcanzar el 1er Dan (examen aprobado registrado por su maestro): el sistema sugiere 'Activar Modo Profesor'."* Hoy `es_profesor` se otorga únicamente por `INVITE_CODE`, sin gate de grado. Este plan agrega el **gate de 1er Dan verificado** como segunda vía de concesión, con la validación alojada en PostgreSQL (RPC) + una Server Action que la invoca. "Acceder a funciones de gestión" ya lo cubre `requireProfesor`.

## Cambios concretos

### 1. Migración SQL (`restricciones_acceso`) — parte 1 (estado del grado, D-1a)
```sql
-- Estado del Dan vigente verificado (solo-sistema)
alter table public.profiles add column grado_dan_actual public.grado_dan;

-- Blindaje: el usuario no se auto-edita el grado ni la verificación
create or replace function public.bloquear_auto_cambio_grado()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.grado_dan_actual is distinct from old.grado_dan_actual
     or new.grados_verificados is distinct from old.grados_verificados
  then
    raise exception 'El grado solo puede ser modificado por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_cambio_grado
  before update of grado_dan_actual, grados_verificados on public.profiles
  for each row when (auth.uid() is not null)
  execute function public.bloquear_auto_cambio_grado();

-- Registro interno del grado (solo Service Role / futura acción del Sinodal)
create or replace function public.registrar_grado_dan_verificado(
  p_perfil uuid, p_grado public.grado_dan
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set grado_dan_actual = p_grado, grados_verificados = true
   where id = p_perfil;
end;
$$;
revoke execute on function public.registrar_grado_dan_verificado(uuid, public.grado_dan) from public;
grant execute on function public.registrar_grado_dan_verificado(uuid, public.grado_dan) to service_role;

-- Gate de lectura: ¿este usuario (auth.uid()) ya puede ser profesor? STABLE para optimizar.
create or replace function public.puede_activar_profesor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select grado_dan_actual is not null
                   from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.puede_activar_profesor() to authenticated;
```

### 2. Migración SQL — parte 2 (concesión centralizada, D-2a)
```sql
-- Concesión con gate interno (usa auth.uid(): requiere sesión autenticada)
create or replace function public.activar_faceta_profesor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select grado_dan_actual is not null into v_ok
    from public.profiles where id = auth.uid();
  if coalesce(v_ok, false) then
    perform set_config('app.concesion_profesor', 'on', true);
    update public.profiles set es_profesor = true where id = auth.uid();
    return true;
  end if;
  return false;
end;
$$;
grant execute on function public.activar_faceta_profesor() to authenticated;

-- Ampliar el trigger anti-escalada del ítem 1 para honrar la concesión del sistema
create or replace function public.bloquear_auto_activacion_profesor()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.es_profesor is distinct from old.es_profesor
     and coalesce(current_setting('app.concesion_profesor', true), '') <> 'on'
  then
    raise exception 'La faceta de profesor solo puede ser activada por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;
```
> Nota: `revoke execute ... from public` + `grant ... to authenticated` dejan `anon` fuera de estas RPC.

### 3. Server Action — `web/src/lib/profesores.ts` (nuevo, con `'use server'`)
- `activarModoProfesor(): Promise<{ error?: string } | undefined>`:
  1. Sesión: `requireUser()` (desde `src/lib/auth.ts`).
  2. Llamar `supabase.rpc('activar_faceta_profesor')` **con el cliente de servidor autenticado `createClient()` de `src/lib/supabase/server.ts`** (nunca `supabaseAdmin`): así `auth.uid()` llega correcto al gate.
  3. Si `false` → devolver mensaje genérico: "Necesitás tener un 1er Dan verificado para activar el modo profesor."
  4. Todo en `try/catch` → `registrarError({ modulo: 'profesores', contexto: 'activarModoProfesor', error })` + mensaje genérico de fallo.
  5. No redirige (la UI de Fase 3 decide el flujo).
- Fuera de alcance: `desactivarModoProfesor` (SRS no lo exige) y la UI.

### 4. Sin cambios en `registro/actions.ts` (INVITE sigue otorgando profesor) ni en guards de acceso.

### 5. Documentación (sincronizar)
- `documentacion/databaseModel.md`: en `PROFILES`, agregar `grado_dan_actual` con comentario: "Dan vigente verificado (solo-sistema; su presencia habilita la faceta profesor)".
- `documentacion/mvc/workflow.md`: ítem 3 de Fase 2 → `[x]` al cierre.
- Plan: actualizar el historial con el cierre y pasar a `Aprobado` tras implementación.

## Verificación
- `supabase db push` + dump: columna, funciones y grants presentes; `puede_activar_profesor` con `STABLE`; trigger `bloquear_auto_cambio_grado` y `bloquear_auto_activacion_profesor` actualizado.
- Script desechable (patrón ítems 1-2):
  1. Alta de usuario desechable **U** (sin Dan).
  2. **U** autenticado (cliente de sesión) llama `puede_activar_profesor()` → `false`; llama `activar_faceta_profesor()` → `false` y `es_profesor` sigue `false`.
  3. Misma llamada con Service Role → `false` (confirma que el RPC exige sesión autenticada con `auth.uid()`).
  4. Service Role llama `registrar_grado_dan_verificado(U, 'dan_1')` → `grados_verificados = true`, `grado_dan_actual = 'dan_1'`.
  5. **U** autenticado → `puede_activar_profesor()` → `true`; `activar_faceta_profesor()` → `true`; `es_profesor = true` (gate + flag anti-bloqueo).
  6. **U** autenticado intenta editar `grado_dan_actual`/`grados_verificados` → excepción (blindaje).
  7. Confirmar que el bypass INVITE sigue intacto (Service Role setea `es_profesor = true` a un perfil sin Dan).
  8. Limpieza total de usuarios desechables.
- `npm run lint` y `npm run build` en `web/` OK.

## Criterios de aceptación
- [x] Un usuario sin Dan verificado NO puede activar la faceta (ni por RPC ni por la acción).
- [x] Con Dan verificado (vía sistema), la faceta se activa y `requireProfesor` le abre `/panel`.
- [x] El usuario no puede auto-editar su grado ni su verificación.
- [x] `puede_activar_profesor()` devuelve `false` bajo Service Role (la vía autenticada es la única).
- [x] INVITE_CODE sigue otorgando `es_profesor` (sin regresión).
- [x] Docs sincronizadas y ítem 3 de Fase 2 `[x]` en `workflow.md`.