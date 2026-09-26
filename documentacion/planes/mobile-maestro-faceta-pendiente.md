# Plan: faceta de Maestro pendiente + conteo de hijos maestros

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | Aprobado (implementado) |
| **Fecha** | 2026-09-26 |
| **Alcance** | BD (migración) + app (onboarding y solicitudes de linaje). |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-26 | Implementado: `profiles.hijos_maestros` (conteo por trigger), declaración "soy maestro" en la solicitud de linaje, confirmación opcional del superior, y listado de linaje solo con maestros. |
| 1.1 | 2026-09-26 | **Ajuste de textos:** la declaración y la confirmación pasan a redactarse como **"¿Tenés/Tiene profesores a cargo?"** (para no confundir con que el aceptante se habilite a sí mismo). |

## Restricciones y Correcciones Previas (No repetir)

- **`es_maestro` NO es auto-declarable:** se activa solo al **confirmarlo el superior** (con el flag del
  sistema `app.concesion_maestro` que honra el trigger `bloquear_auto_activacion_maestro`).
- **`hijos_maestros` se mantiene por trigger** (no en la app); el update del propio campo no dispara
  recursión (guarda por `maestro_id`/`es_maestro` sin cambios).
- **Solo maestros se listan** para elegir linaje (no instructores sueltos).
- Migraciones con `npx supabase migration new`.

## Diseño

1. **Conteo `profiles.hijos_maestros`**: cantidad de **hijos directos** (`maestro_id = id`) con
   `es_maestro = true`. Se muestra (a futuro) en el árbol de poder; no se expone en UI todavía.
2. **Declaración "¿Tenés profesores a cargo?"** en el onboarding → `solicitudes_linaje.solicita_maestro`.
   No activa nada.
3. **Listado de linaje:** `lista_instructores_linaje()` devuelve **solo `es_maestro = true`**.
4. **Aceptación (el superior):** confirma el cinturón y **decide**:
   - aceptar sin marcar maestro → `es_profesor = true`, `es_maestro = false`;
   - aceptar + "¿Tiene profesores a cargo?" → `es_profesor = true` **y** `es_maestro = true`.

## Cambios concretos

### BD — `supabase/migrations/20260926023536_maestro_faceta_pendiente.sql`

- `alter table profiles add column hijos_maestros int not null default 0` + **backfill**.
- Trigger `recalcular_hijos_maestros` (after insert/update/delete en `profiles`) que recalcula el
  conteo de los padres afectados.
- `alter table solicitudes_linaje add column solicita_maestro boolean not null default false`.
- `solicitar_linaje(p_instructor, p_grado, p_solicita_maestro default false)`.
- `resolver_solicitud_linaje(p_solicitud, p_resultado, p_grado default null, p_conceder_maestro default false)`
  → concede `es_maestro` solo si el solicitante declaró **y** el superior confirmó.
- `lista_instructores_linaje()` → `where p.es_maestro = true`.

### App

- `lib/perfil.ts`: `SolicitudLinaje` incluye `solicita_maestro`.
- `contextos/AuthGlobal.tsx`: `solicitarLinaje(..., declaraMaestro)`,
  `resolverSolicitudLinaje(..., concederMaestro)` y `listarSolicitudesPendientes` trae `solicita_maestro`.
- `app/onboarding.tsx`: checkbox **"¿Tenés profesores a cargo?"**; textos y listado pasan a "maestro";
  se envía `declaraMaestro` al solicitar el linaje.
- `app/(tabs)/index.tsx` (Solicitudes de alumnos): muestra "Declara ser maestro" y, al aceptar,
  un toggle **"¿Tiene profesores a cargo?"** (pre-marcado si lo declaró; se puede desmarcar para aceptar
  como profesor corriente).

## Verificación

- [x] `typecheck` y `lint` en verde.
- [x] `db push --linked` aplicado + tipos regenerados.
- [x] `hijos_maestros` correcto: Nico=1 (Ale), Ale=2 (Andres, Teresita), resto=0.
- [x] `lista_instructores_linaje()` con JWT de `marti@` → solo maestros (Ale, Andres, Nico, Teresita).
- [ ] Prueba en dispositivo del flujo completo (registro con "¿Tenés profesores a cargo?" → aceptar con/sin
      confirmar maestro).

---

🐧
