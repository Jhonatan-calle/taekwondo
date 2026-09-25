# Plan: mostrar el dueño de la mesa (siempre)

> **⚠️ Cuentas de prueba (2026-09-24):** con el **reset total** a “Ale Criado”
> (`planes/db-seed-demo-ale-criado.md`), las cuentas viejas (`maestro2@`, `jhona@`, Jhonatan) ya no
> existen. Readaptar las verificaciones que las nombran.

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | Aprobado (implementado; datos de prueba cargados 2026-09-24) |
| **Fecha** | 2026-09-24 |
| **Alcance** | App móvil + 1 RPC de BD + seed de prueba |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Aprobado: RPC `listar_mesas_examen()` con `maestro_nombre`; mostrar el dueño en listado y detalle (Maestro e Instructor); maestro de prueba en el seed. |

## Restricciones y Correcciones Previas (No repetir)

- **La mesa es de quien la creó, sin excepción.** Aunque quien la visite sea Maestro, solo puede
  postular alumnos; nunca editar/cerrar la mesa de otro.
- **RLS de `profiles`:** un maestro **no** puede leer el perfil de otro maestro (solo el propio +
  alumnos directos). Por eso el nombre se resuelve con una **RPC `SECURITY DEFINER`**, no con un join.
- **Privacidad:** la RPC expone **solo el nombre del maestro** dueño del evento (dato organizacional),
  nunca datos de alumnos.
- **Credenciales:** el seed y la creación de la cuenta requieren Service Role/Admin API; el agente no
  las usa (regla de `AGENTS.md`). Se entregan pasos al usuario.

## Cambios implementados

### BD

- Migración `supabase/migrations/20260924170451_mesas_examen_nombre_maestro.sql`:
  - RPC `public.listar_mesas_examen()` → `id, maestro_id, maestro_nombre, fecha, lugar, estado,
    cantidad_postulados` (ordenada por fecha desc, como antes).
  - `security definer`, `set search_path = public`, `stable`; `grant execute` a `authenticated`.
- **Aplicada** con `db push --linked`. Tipos regenerados (`mobile/src/lib/database.types.ts`).

### App

- `mobile/src/lib/perfil.ts`: `MesaExamen` agrega `maestro_nombre: string | null`.
- `mobile/src/contextos/AuthGlobal.tsx`: `listarMesasExamen()` pasa a consumir la RPC.
- `mobile/src/app/(tabs)/maestro/mesas/[id].tsx`: mensaje **"Esta mesa pertenece a {nombre}: solo
  podés consultarla."** (fallback genérico si no hay nombre).
- `mobile/src/app/(tabs)/maestro/mesas.tsx`: en mesas ajenas, la fila muestra `Mesa de {nombre}`.
- `mobile/src/app/(tabs)/instructor/mesas.tsx`: la fila muestra `Mesa de {nombre}`.
- `mobile/src/app/(tabs)/instructor/mesas/[id].tsx`: el encabezado muestra `Mesa de {nombre}`.

### Seed

- `supabase/seed-auditoria.sql`: bloque **opcional** que crea el perfil **"Maestro Prueba"**
  (`maestro2@taekwondo.test`, hijo de Jhonatan, `es_maestro = true`, `dan_1`) y **su propia mesa**
  (`Seed Dojang Maestro Prueba`, abierta, idempotente) para ejercitar `TC-MES-08`.
- La cuenta de login se crea **por Admin API** (fuera del SQL, igual que el resto del seed).

## Criterios de aceptación

1. Al abrir una mesa ajena (Maestro), el detalle dice el **nombre** del dueño y sigue sin acciones de
   edición/cierre.
2. Un profesor que abre la mesa de otro ve `Mesa de {nombre}` en el listado y en el detalle.
3. El listado de Maestro marca las mesas propias como "Tu mesa" y las ajenas con el nombre.
4. `typecheck` y `lint` en verde.
5. Con `maestro2@taekwondo.test` existe una mesa ajena real para probar `TC-MES-08`.

## Verificación

- App: `cd mobile && npm run typecheck && npm run lint` → ✅ verde.
- BD: `db push --linked` → ✅ aplicada; RPC responde con `maestro_nombre`.
- Manual: pendiente (crear la cuenta `maestro2@` y correr el seed).

## Pendiente (dato cargado; falta verificar en dispositivo)

Con el script `supabase/aplicar-maestro-prueba.sh` se creó la cuenta `maestro2@taekwondo.test`
("Maestro Prueba") y su mesa (`Seed Dojang Maestro Prueba`, abierta). Verificado en la BD:
la RPC devuelve `maestro_nombre` para las 3 mesas.

- [x] Cuenta `maestro2@taekwondo.test` creada (Admin API).
- [x] Seed aplicado (15 perfiles, 3 mesas).
- [x] Verificar `TC-MES-08` en el celular con dos maestros — ✅ 2026-09-24.

---

🐧
