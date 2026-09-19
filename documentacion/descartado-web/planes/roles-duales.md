# Plan: Esquema de Roles Duales (Facetas)

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-14

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-14 | Borrador inicial. |
| 1.0 | 2026-09-14 | **Aprobado** por el usuario sin objeciones. Decisión de diseño: se utiliza únicamente el flag booleano `es_profesor` (descartado `es_alumno`); `profiles.rol` se elimina y la faceta se deriva de `es_profesor`. |
| 1.1 | 2026-09-14 | Implementación completa. Migración `roles_duales` aplicada; guards de la app actualizados (`auth.ts`, `registro/actions.ts`, comentarios de `admin.ts`); `databaseModel.md` sincronizado; trigger anti-escalada verificado; ítem 1 de Fase 2 marcado `[x]` en `workflow.md`. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO tocar `.env*`.** Solo `web/.env.example` versionado.
2. **NO commits/push automáticos.**
3. **Migración generada por CLI** (`npx supabase migration new roles_duales`), jamás archivo suelto.
4. **Solo el Service Role (`admin.ts`) puede activar la faceta de profesor** (trigger de seguridad, igual que hoy con `rol`).
5. **Fail gracefully:** los cambios de app que tocan BD van en `try/catch` y registran en `errores_runtime`.
6. **`profiles.rol` se elimina** (decisión del usuario). La faceta se deriva de `es_profesor`; **nunca** reintroducir una columna de rol paralela.
7. **Fuera de alcance de este plan:**
   - *Árbol de Jerarquías* (ítem 2 de Fase 2: `grupos`/`miembros_grupo`/`maestro_id`, linaje). Acá ya existe el modelo; no se toca.
   - *Restricciones de Acceso* (ítem 3 de Fase 2: gating por 1er Dan verificado para activar la faceta profesor). Este plan solo deja el marcador `es_profesor` listo.
8. **Representación adoptada: solo `es_profesor`.** La faceta alumno es el perfil base (todo usuario es practicante por defecto); no existe columna `es_alumno`.

## Contexto / objetivo
Permitir que **un mismo usuario actúe como alumno y como profesor bajo una sola cuenta** (SRS §2 "Perfil Único con Facetas Duales").

**Análisis de la diferencia:** un profesor tiene TODOS los datos de un alumno (nombre, nacimiento, peso, altura, contacto, cinturón, historial, asistencia). Como ambos facetas viven en la misma tabla `profiles`, la faceta **alumno es el perfil base / estado por defecto** y no necesita representación propia. La relación "alumno → profesor asignado" ya se modela por fuera del perfil (grupos/miembros y `maestro_id`). **La única diferencia estructural necesaria en la BD es un marcador booleano "puede actuar como profesor".**

## Cambios concretos

### 1. Migración SQL (`roles_duales`)
```sql
-- 1. Nueva faceta (alumno = perfil base; profesor = flag de capacidad)
alter table public.profiles
  add column es_profesor boolean not null default false;

-- 2. Backfill desde el rol actual
update public.profiles set es_profesor = true where rol = 'profesor';

-- 3. Quitar la protección del rol viejo
drop trigger if exists bloquear_auto_cambio_rol on public.profiles;
drop function if exists public.bloquear_auto_cambio_rol;

-- 4. Eliminar rol (cae también su check constraint)
alter table public.profiles drop column rol;

-- 5. Blindaje de la faceta: solo el Service Role puede activarla
create or replace function public.bloquear_auto_activacion_profesor()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.es_profesor is distinct from old.es_profesor then
    raise exception 'La faceta de profesor solo puede ser activada por un servicio interno (Service Role).';
  end if;
  return new;
end;
$$;

create trigger bloquear_auto_activacion_profesor
  before update of es_profesor on public.profiles
  for each row
  when (auth.uid() is not null)
  execute function public.bloquear_auto_activacion_profesor();
```
> **Nota:** no se agregan políticas RLS nuevas: el guard de acceso de la app lee `es_profesor` y el trigger ya impide el auto-activación desde el cliente.

### 2. App (ajustes mínimos para no romper nada)
- **`web/src/lib/auth.ts`:**
  - `getProfile()` → `.select('es_profesor')` (hoy `.select('rol')`).
  - `requireProfesor()` → valida `profile.es_profesor === true`; devuelve `{ user, profile, esProfesor }`.
  - Actualizar comentarios.
- **`web/src/app/registro/actions.ts`:** el alta con `INVITE_CODE` escribe `{ es_profesor: true, nombre_completo: nombre }` vía `supabaseAdmin` (hoy `rol: 'profesor'`). Actualizar comentarios.
- **`web/src/lib/supabase/admin.ts`:** comentario → "canal autorizado para escribir `profiles.es_profesor`".
- Sin cambios funcionales en `proxy.ts`, `panel/*`, `login/*` (los guards ya pasan por `requireProfesor`).

### 3. Documentación (sincronizar)
- **`documentacion/databaseModel.md`:** en el bloque `PROFILES`, reemplazar el campo `rol` por `bool es_profesor "faceta profesor (alumno = perfil base)"`.
- **`documentacion/mvc/workflow.md`:** marcar `[x]` el ítem 1 de Fase 2 al cierre.

## Verificación
- Migración aplicada con `supabase db push`; backfill correcto (usuarios `profesor` → `es_profesor = true`).
- Trigger: intento de activar `es_profesor` desde cliente → excepción; Service Role → OK.
- `requireProfesor` sigue protegiendo `/panel`.
- Registro con `INVITE_CODE` deja `es_profesor = true`.
- `rg "rol"` en `web/src` → solo aparecen comentarios/prosa de docs, no lógica.
- `npm run lint` y `npm run build` en `web/` OK.