# Plan: Seed de datos para prueba manual (auditoría en cascada) — `db-seed-auditoria.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial y aprobación: seed **aditivo e idempotente** para probar manualmente la auditoría en cascada (Fase 5, ítem 3) y los pagos de alquiler (ítem 2). Crea un **árbol de 3 niveles** con cuentas de login reales, locaciones por dueño y los 3 estados de pago. Corrige además un `comprobante_url` roto de una prueba previa. |

## Restricciones y Correcciones Previas (No repetir)
1. **No borrar la cuenta real** `jhonatancallegaleano@gmail.com` ni los datos ya cargados.
2. **Seed aditivo e idempotente:** se puede re-ejecutar sin duplicar filas.
3. **Torneos y `web/` congelados.**
4. **Sin comprobantes en el seed** (`comprobante_url = null`): no se apunta a archivos inexistentes en el bucket.
5. **Respetar los triggers anti-escalada:** `es_profesor` / `es_maestro` / `maestro_id` se siembran con los flags del proyecto (`app.concesion_profesor`, `app.concesion_maestro`, `app.derivacion_linaje`).
6. **`profiles.id` no tiene default:** todo insert lleva `gen_random_uuid()`.

## Contexto / Diagnóstico
Antes del seed, el árbol tenía **2 niveles y sin datos auditables**:

```
Jhonatan (es_maestro, cuenta real)
   └── Profesor Jhona (es_profesor)   ← sin subordinados ni locaciones
```

La única locación ("Banda Norte") era del propio Maestro, así que **la cascada no se podía probar**: un Maestro debe ver la infraestructura de **sus subordinados**, no la propia.

Además se detectó un **dato roto**: un pago con `comprobante_url` apuntando a un archivo inexistente en el bucket (`storage.objects` = 0).

## Cambios Implementados

### 1. Cuentas de login (Admin API)
Creadas con contraseña conocida (`email_confirm: true`). El trigger `on_auth_user_created` generó sus filas en `profiles`.

| Email | Contraseña | Rol |
|---|---|---|
| `seed-sensei@taekwondo.test` | `Seed123456!` | Profesor (nivel 2) |
| `seed-jhona@taekwondo.test` | `Seed123456!` | Profesor (nivel 1) |

### 2. Archivo `supabase/seed-auditoria.sql`
Bloque `do $$ … $$` idempotente que siembra:

- **Árbol de 3 niveles** (para probar la recursividad):
  ```
  Jhonatan (Maestro)
    └── Profesor Jhona (nivel 1)
           └── Sensei Seed (nivel 2, es_profesor)
                  └── 6 alumnos sin cuenta (blanco → dan_1)
  ```
  Total del árbol: **niveles 0, 1, 2 y 3** (los alumnos).
- **Locaciones por dueño** (para que el Maestro audite ajenas, no propias):
  | Locación | Dueño | Valor pactado |
  |---|---|---|
  | Banda Norte | Jhonatan (ya existía) | 5.000 |
  | Seed Dojang Jhona A | Profesor Jhona | 12.000 |
  | Seed Dojang Jhona B | Profesor Jhona | 8.500 |
  | Seed Dojang Sensei | **Sensei Seed (nivel 2)** | 9.900 |
- **Grupos** con locación asignada (incluye "Niños" y "Adultos Noche", antes sin locación).
- **Pagos que cubren los 3 estados del auditor:**
  | Locación | Último periodo | Estado esperado |
  |---|---|---|
  | Banda Norte | 2026-09 | **Al día** |
  | Seed Dojang Jhona A | 2026-07 | **Vencida (2 meses)** |
  | Seed Dojang Jhona B | — | **Sin pagos** |
  | Seed Dojang Sensei | 2026-08 | **Vencida (1 mes)** |

### 3. Corrección del comprobante roto
```sql
update public.pagos_alquiler
   set comprobante_url = null
 where comprobante_url is not null
   and not exists (
     select 1 from storage.objects o
      where o.bucket_id = 'comprobantes' and o.name = comprobante_url
   );
```
Elimina referencias a archivos inexistentes sin tocar los comprobantes válidos.

### 4. Ejecución
```bash
npx supabase db query --linked -f supabase/seed-auditoria.sql
```

## Verificación realizada
- **Conteos:** 20 `profiles`, 4 `locaciones`, 5 `grupos`, 3 `pagos_alquiler`.
- **Cascada:** la consulta recursiva desde Jhonatan devuelve **niveles 0-3** (incluye a Sensei Seed y sus 6 alumnos), confirmando que `es_subordinado_de`/`descendientes` alcanzan descendientes **indirectos**.
- **Locaciones por dueño:** las 4 se reparten entre 3 dueños distintos → el Maestro tiene algo real que auditar.
- **Idempotencia:** una segunda ejecución deja los mismos conteos (20/4/5/3).
- **Comprobante roto:** corregido (`comprobante_url = null`).

## Cómo probar manualmente
1. Iniciar sesión como **Jhonatan** (cuenta real) → tab **Maestro** → **Auditoría de locaciones en cascada**.
2. Verificar que aparecen las locaciones de **Profesor Jhona** y **Sensei Seed** (no solo la propia).
3. Verificar los estados: **Al día** (Banda Norte), **Vencida · 2 meses** (Jhona A), **Sin pagos** (Jhona B), **Vencida · 1 mes** (Sensei).
4. Probar el filtro por instructor.
5. Abrir el detalle de una locación de subordinado.
6. Iniciar sesión como `seed-sensei@taekwondo.test` y registrar un pago **con comprobante** para probar el flujo completo.

## Criterios de Aceptación y Verificación
- [x] Cuentas de login creadas con contraseña conocida para los niveles 1 y 2.
- [x] Árbol de **3 niveles** verificado con consulta recursiva.
- [x] Locaciones de **3 dueños distintos** (base para la auditoría en cascada).
- [x] Los **3 estados de pago** representados en los datos.
- [x] Seed **idempotente** (mismos conteos al re-ejecutar).
- [x] Cuenta real y datos previos **intactos**.
- [x] `comprobante_url` roto corregido.
- [x] Sin comprobantes apuntando a archivos inexistentes.

---
🐧
