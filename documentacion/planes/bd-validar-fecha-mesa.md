# Plan: validar en la BD que las mesas no se creen con fecha pasada

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.2 |
| **Estado** | **Revertido** (a pedido: sin límites de fecha en la mesa) |
| **Fecha** | 2026-09-24 |
| **Autor** | Agente IA (sesión demo) |
| **Alcance** | BD (migración nueva + trigger). No modifica la UI (ya valida), salvo mensaje opcional |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Borrador inicial: trigger `BEFORE INSERT/UPDATE` en `mesas_examen` que rechaza fechas pasadas. |
| 1.1 | 2026-09-24 | **Aprobado.** Zona horaria confirmada (`America/Argentina/Buenos_Aires`). Migración creada: `supabase/migrations/20260924163301_validar_fecha_mesa.sql`. **Pendiente:** `db push --linked` (la CLI no tiene access token en este entorno) y `db lint`. |
| 1.2 | 2026-09-24 | **Revertido a pedido:** se elimina todo límite de fecha en la mesa. Se crea la migración de rollback `supabase/migrations/20260924163945_quitar_validar_fecha_mesa.sql` (dropea trigger y función) y se revierte la validación en `mesas/nueva.tsx`. Nota: el usuario ya había aplicado la 1.1, por lo que hay que aplicar el rollback. |

## Restricciones y Correcciones Previas (No repetir)

- **Migración con CLI:** crear SOLO con `npx supabase migration new validar_fecha_mesa` dentro de
  `supabase/migrations/` (raíz). No inventar el nombre ni el timestamp.
- **Patrón de trigger del proyecto:** `language plpgsql`, `security invoker`,
  `set search_path = public` y `when (auth.uid() is not null)` para que los procesos internos
  (Service Role / seeds) puedan seguir cargando datos históricos. Espejo de
  `bloquear_auto_cambio_grado` (`20260919025653_grado_unificado_y_perfil.sql`).
- **No tocar tablas de torneos** ni `web/` (congelados).
- **La UI ya valida:** `mesas/nueva.tsx` (crear) exige hoy o posterior con `esFechaNoPasada` y el
  picker usa `minimo = hoy`. Este plan agrega el **backstop** en la BD (no se puede saltear por API).
- **Editar una mesa heredada con fecha pasada no se debe romper:** el trigger solo rechaza en
  `UPDATE` cuando **cambia** la fecha; editar el lugar/cerrar una mesa vieja sigue funcionando.
- **Timezone:** la app compara con la fecha **local** del dispositivo; la BD corre en UTC. Se usa la
  zona de la escuela para alinear (ver "Decisión").

## Contexto / objetivo

Hoy `mesas_examen` no tiene ninguna validación de fecha: la RLS solo limita **quién** inserta
(Maestro), no **qué** fecha. Un cliente con la anon key + JWT de Maestro podría crear una mesa con
fecha pasada. El objetivo es que la BD rechace ese caso, alineada con la app.

## Decisión (a confirmar en revisión)

**Zona horaria de comparación:** se compara contra hoy en `America/Argentina/Buenos_Aires` (la
escuela es en Argentina; el resto del proyecto usa formato `es-AR`). Si se usara `current_date` (UTC)
puro, entre las ~21:00 y 23:59 locales crear una mesa **para hoy** daría `fecha < current_date` y se
rechazaría por el corrimiento de zona.

- **Alternativa** si preferís no fijar la zona: usar `current_date` (UTC) y aceptar ese borde de 3 h.
- **Recomendado:** fijar `America/Argentina/Buenos_Aires`.

## Cambio concreto

### Migración `supabase/migrations/<timestamp>_validar_fecha_mesa.sql`

```sql
-- Impide crear mesas con fecha pasada y mover una mesa existente a una fecha pasada.
-- La app ya lo valida; esto es el backstop de la BD (no se puede saltear por API).

create or replace function public.validar_fecha_mesa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if tg_op = 'INSERT' then
    if new.fecha < v_hoy then
      raise exception 'La fecha de la mesa no puede ser anterior a hoy.';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.fecha is distinct from old.fecha and new.fecha < v_hoy then
      raise exception 'La fecha de la mesa no puede ser anterior a hoy.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_fecha_mesa on public.mesas_examen;
create trigger validar_fecha_mesa
  before insert or update on public.mesas_examen
  for each row
  when (auth.uid() is not null)
  execute function public.validar_fecha_mesa();
```

**Notas:**
- `when (auth.uid() is not null)` deja pasar a Service Role/seeds (sin usuario) para datos históricos.
- En `UPDATE` solo valida si `fecha` cambió → no rompe editar mesas heredadas con fecha pasada.
- No requiere cambios de RLS ni de tipos generados (`database.types.ts` no cambia: es función + trigger).

### UI (opcional / no bloqueante)

La app ya bloquea antes de llamar a la BD, así que el error de la BD es un caso de borde que cae en el
mensaje genérico de "fail gracefully". **No** hace falta tocar la UI. Si se quisiera, se puede mapear
el mensaje específico, pero se deja fuera de alcance para no romper el patrón actual.

## Criterios de aceptación

1. Con un JWT de Maestro, un `INSERT` en `mesas_examen` con `fecha < hoy` **falla** con excepción.
2. Un `INSERT` con `fecha = hoy` y con `fecha > hoy` **funciona**.
3. Un `UPDATE` que **cambia** la fecha a pasada **falla**; un `UPDATE` que **no** cambia la fecha
   (p. ej. editar lugar o cerrar la mesa) **funciona**, aun si la fecha original es pasada.
4. La app sigue creando mesas normalmente (sin regresión) y el listado/edición/cierre funcionan.
5. `supabase db push --linked` y `supabase db lint --linked` sin issues nuevos.

## Verificación

- Crear la migración con el CLI y aplicarla:
  - `npx supabase migration new validar_fecha_mesa`
  - `npx supabase db push --linked`
  - `npx supabase db lint --linked`
- Prueba por API (authenticated, rol Maestro): intentar insertar una mesa con fecha de ayer → debe
  fallar; con fecha de hoy/mañana → debe pasar. (Se puede dejar como caso BD en el catálogo.)
- Prueba en la app: crear mesa con el date-picker (sin regresión) y verificar que no permite pasado.

## Documentación a actualizar al implementar

- `documentacion/plan-de-pruebas.md`: nuevo `TC-MES-11` (fecha pasada rechazada por BD) + su historial.
- `documentacion/pendientes-pruebas.md`: registrar la validación BD en el item 24 o como pendiente
  de prueba BD.
- `documentacion/README.md`: registrar este plan.

## Estado de implementación (2026-09-24)

- [x] Migración creada: `supabase/migrations/20260924163301_validar_fecha_mesa.sql` (función + trigger).
- [x] **Revertido:** migración de rollback
      `supabase/migrations/20260924163945_quitar_validar_fecha_mesa.sql` (drop trigger + función).
- [x] UI revertida: `mesas/nueva.tsx` ya no limita la fecha (cualquier fecha es válida).
- [ ] `npx supabase db push --linked` (para aplicar la nueva migración con el rollback) — **pendiente
      de credenciales** (la CLI no tiene access token en este entorno: `supabase login` o
      `SUPABASE_ACCESS_TOKEN`).
- [ ] `npx supabase db lint --linked` — pendiente (ídem credenciales).
- [x] Documentación: `plan-de-pruebas.md`, `prueba-manual.md`, `pendientes-pruebas.md` y `README.md`.

## Fuera de alcance

- Validar fechas pasadas en otras tablas (cuota/pago ya usan "no futura" y su lógica es distinta).
- Cambiar RLS o tipos generados.
- Mapear el mensaje de error específico en la UI.

---

🐧
