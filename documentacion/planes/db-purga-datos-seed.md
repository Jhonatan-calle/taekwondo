# Plan: Purga de datos seed de la BD remota (Supabase) y baja de usuarios

> **Metadatos**
> - **Version:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobacion:** 2026-09-20
> - **Alcance:** SOLO datos (filas). No se modifica schema ni codigo.

## Historial de revisiones
| Version | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-20 | Borrador aprobado por el usuario e implementado. Decisiones: conservar la cuenta `jhonatancallegaleano@gmail.com` (+ su perfil) y la fila de `errores_runtime`; eliminar `jhonatansitoo312@gmail.com`, los 10 usuarios `seed-tkd-*` y toda la data seed de las tablas publicas. |

## Restricciones y Correcciones Previas (No repetir)
1. **No borrar la cuenta de desarrollo real** `jhonatancallegaleano@gmail.com`.
2. **No vaciar `errores_runtime`** (telemetria de la app, no seed).
3. **No alterar el schema:** la BD remota del proyecto ligado `zxzcgkcbzrgbgnsmrtkv` esta DESACTUALIZADA respecto a `supabase/migrations/` (esquema de torneos/inscripciones previo a las migraciones 2026-09-19). Esta purga es solo de datos; alinear el schema (ej. `supabase db push --linked`) es un paso futuro fuera de este alcance y no debe hacerse sin plan aparte.
4. **Módulo torneos congelado:** se borran sus datos seed, no su codigo ni sus tablas.

## Contexto / objetivo
Eliminar la data de seed del proyecto remoto: el usuario `jhonatansitoo312@gmail.com` no podia borrarse desde la interfaz del dashboard (el boton daba error), y por decision del usuario se purga TODA la data seed restante. Diagnostico previo (solo lectura): el usuario tenia 0 referencias sin `ON DELETE CASCADE` (por lo que el error de Studio no era por datos bloqueantes) y el resto de los datos eran seed.

## Cambios concretos (ejecutados)

### 1. Inventario previo (solo lectura, `npx supabase db query --linked`)
- `auth.users`: 12 (1 real + el solicitado + 10 `seed-tkd-*`).
- Datos: `torneos`=2, `categorias`=6, `llaves`=6, `enfrentamientos`=7, `inscripciones`=11, `inscripciones_datos_privados`=11, `profiles`=12, `errores_runtime`=1; resto en 0.

### 2. Purga (una transaccion logica)
```sql
TRUNCATE public.asistencia, public.categorias, public.clases,
 public.enfrentamientos, public.graduaciones, public.grupos,
 public.inscripciones, public.inscripciones_datos_privados,
 public.jurados_torneo, public.llaves, public.locaciones,
 public.mesas_examen, public.miembros_grupo, public.pagos_alquiler,
 public.pagos_cuota, public.postulaciones_examen,
 public.resultados_torneo, public.torneos
 RESTART IDENTITY CASCADE;

delete from auth.users
 where email = 'jhonatansitoo312@gmail.com' or email like 'seed-tkd-%';
```

### 3. Verificacion (solo lectura)
- `auth.users` = 1 (solo `jhonatancallegaleano@gmail.com`).
- `profiles` = 1 (perfil conservado).
- `inscripciones`, `torneos`, `categorias`, `llaves`, `enfrentamientos` = 0.
- `errores_runtime` = 1 (conservada).

## Notas
- La app conserva tokens de sesion viejos (LargeSecureStore); tras la purga conviene tocar "Cerrar sesion"/re-login para no operar con un usuario eliminado.
- Si mas adelante se puebla la BD remota con las migraciones 2026-09-19+, revisar antes el estado de `supabase db push --linked`.

## Criterios de aceptacion y verificacion
- [x] 12 → 1 `auth.users`; `jhonatancallegaleano@gmail.com` intacto.
- [x] Tablas publicas de data seed en 0 (incluidas las de torneos).
- [x] `errores_runtime` conserva su fila.
- [x] Schema intacto (solo DELETE/TRUNCATE de datos).

---
🐧