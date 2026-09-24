# Plan: visibilidad de mesas de examen por jerarquía (subordinados directos)

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.1 |
| **Estado** | Revisión |
| **Fecha** | 2026-09-24 |
| **Autor** | Agente IA (sesión demo) |
| **Alcance** | RLS + RPCs de mesas/postulación; sin cambios de esquema (columnas/tablas) |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Borrador inicial: reemplazar la visibilidad global de `mesas_examen` por visibilidad por jerarquía (dueño + subordinados directos del dueño) y restringir la postulación en consecuencia. |
| 1.1 | 2026-09-24 | **Decisiones confirmadas por el usuario:** (1) la dirección es *el subordinado ve las mesas de su superior directo* (el superior **no** ve las de sus subordinados); (2) el **dueño también puede postular** a sus propios alumnos directos; (3) **nietos/indirectos: no** ven ni postulan *por ahora* (puede cambiar a futuro). Se pasa a estado **Revisión**. |

## Restricciones y Correcciones Previas (No repetir)

- **Crear migración con CLI:** `npx supabase migration new mesas_visibilidad_jerarquia` dentro de
  `supabase/migrations/` (raíz). No inventar nombre/timestamp.
- **No tocar tablas de torneos** ni `web/` (congelados).
- **Reusar helper existente:** `public.es_alumno_directo_de(p_profesor uuid, p_alumno uuid)`
  (`20260919025701_rls_gestion_escuela.sql`): devuelve `true` si `p_alumno.maestro_id = p_profesor`.
  No reimplementar la lógica de relación.
- **La RPC `listar_mesas_examen()` es `SECURITY DEFINER`:** cambiar solo la RLS **no** filtra el listado
  de la app; hay que agregar el filtro **dentro** de la RPC. `auth.uid()` sigue disponible dentro de una
  función `SECURITY DEFINER`.
- **No romper `TC-EVA`/recaudación:** el dueño sigue viendo todas las postulaciones de su mesa y la
  planilla sigue siendo solo del dueño.
- **La mesa es de quien la creó, sin excepción:** el dueño crea/edita/cierra; los demás solo postulan.
- **Credenciales:** aplicar migración/seed lo hace el usuario o el agente **con autorización explícita**
  (el usuario ya dio permiso en esta sesión; respetar `AGENTS.md` vigente).

## Contexto / objetivo

Hoy `mesas_examen` es de **visibilidad global**:
```sql
create policy "mesas_examen_select_autenticado" ... using (true);
```
Cualquier usuario autenticado ve todas las mesas, sin importar jerarquía.

**Objetivo:** que la visibilidad de la mesa respete la jerarquía:
- **Dueño** ve su mesa.
- **Sus subordinados directos** ven su mesa.
- El resto (hermanos, superiores, nietos, ajenos) **no** la ve.
- Postular queda restringido a: **dueño** o **subordinado directo del dueño** (con sus propios alumnos
  directos).

**Dirección (confirmada):** es **del superior hacia el subordinado**. El subordinado ve/usa las mesas
de su superior directo; el superior **no** ve las mesas de sus subordinados. (Esto difiere de la
auditoría de locaciones, que es `es_subordinado_de` — superior ve la rama.)

## Decisiones confirmadas

1. **Dirección:** el subordinado ve las mesas de su **superior directo**; el superior **NO** ve las de
   sus subordinados. ✅
2. **Dueño postulando:** el **dueño también puede postular** a sus propios alumnos directos en su mesa. ✅
3. **Nietos/indirectos:** **no** ven ni postulan *por ahora* (puede cambiar a futuro; el diseño queda
   abierto a recursividad vía el helper `es_subordinado_de`/`descendientes`). ✅ (por ahora)

## Cambios concretos (migración `mesas_visibilidad_jerarquia`)

### 1. RLS de `mesas_examen` (select)

Reemplazar la política global:
```sql
drop policy if exists mesas_examen_select_autenticado on public.mesas_examen;
create policy "mesas_examen_select_jerarquia"
  on public.mesas_examen for select to authenticated
  using (
    maestro_id = auth.uid()
    or public.es_alumno_directo_de(maestro_id, auth.uid())
  );
```
- `maestro_id = auth.uid()` → el dueño.
- `es_alumno_directo_de(maestro_id, auth.uid())` → quien mira es **subordinado directo** del dueño.

### 2. RPC `listar_mesas_examen()` (SECURITY DEFINER)

`create or replace` agregando el filtro (mantener `maestro_nombre`, `cantidad_postulados` y el
`order by m.fecha desc`):
```sql
where m.maestro_id = auth.uid()
   or public.es_alumno_directo_de(m.maestro_id, auth.uid())
```

### 3. RPC `postular_alumno(...)`

Mantener sus validaciones actuales (profesor, alumno directo, mesa abierta, grado) y **agregar**:
```sql
-- La mesa debe ser del propio profesor o de su superior directo.
if not exists (
  select 1 from public.mesas_examen m
   where m.id = p_mesa_id
     and (m.maestro_id = auth.uid()
          or public.es_alumno_directo_de(m.maestro_id, auth.uid()))
) then
  raise exception 'Solo podés postular en las mesas de tu superior directo.';
end if;
```

### 4. RLS de `postulaciones_examen` (insert) — backstop

Aunque la app usa la RPC (que saltea RLS), endurecer el `with check` del insert para que una llamada
directa a la tabla tampoco saltee la jerarquía:
```sql
drop policy if exists postulaciones_examen_insert_profesor on public.postulaciones_examen;
create policy "postulaciones_examen_insert_profesor"
  on public.postulaciones_examen for insert to authenticated
  with check (
    profesor_id = auth.uid()
    and public.es_alumno_directo_de(auth.uid(), alumno_id)
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.es_profesor = true
    )
    and exists (
      select 1 from public.mesas_examen m
       where m.id = mesa_id
         and (m.maestro_id = auth.uid()
              or public.es_alumno_directo_de(m.maestro_id, auth.uid()))
    )
  );
```

### 5. Sin cambios

- `planilla_mesa_examen` (ya es solo del dueño).
- `actualizar_derecho_examen` / `quitar_postulacion` (ya exigen `profesor_id = auth.uid()`).
- Políticas `select` de `postulaciones_examen` (alumno/postulante/examinador) — siguen siendo válidas.
- Esquema (tablas/columnas): sin cambios.

## App (`mobile/`)

- **Sin cambios obligatorios**: el listado y el detalle ya consumen la RPC `listar_mesas_examen()`,
  que queda filtrada por jerarquía.
- **Texto opcional** en `instructor/mesas.tsx`: aclarar *"mesas abiertas de tu superior directo"*.
- Verificar estados vacíos: un usuario sin mesas visibles sigue mostrando el aviso correspondiente.

## Impacto en los datos/escenarios actuales

- **Jhonatan (raíz):** verá solo **sus propias** mesas (no tiene superior; y no ve las de sus
  subordinados).
- **Maestro Prueba:** verá las mesas de **Jhonatan** (su superior) → aparece como "mesa ajena"
  (solo lectura, con el nombre de Jhonatan). Postula a sus propios alumnos.
- **Profesor Jhona:** ve las mesas de **Jhonatan** (su superior) y postula a sus alumnos.
- **Sensei Seed (nieto):** **no ve ninguna mesa** (Jhona no tiene mesas).
- **TC-MES-08 cambia de escenario:** el caso "mesa ajena" para un Maestro pasa a ser *Maestro Prueba
  viendo la mesa de Jhonatan* (antes era Jhonatan viendo la de Maestro Prueba).

## Criterios de aceptación

1. El **dueño** ve su mesa; sus **subordinados directos** la ven; **nadie más** la ve.
2. Un **descendiente indirecto** (nieto) **no** ve ni puede postular en la mesa del abuelo.
3. `postular_alumno` **rechaza** con excepción si el profesor no es dueño ni subordinado directo del
   dueño, aunque la mesa esté abierta y el alumno sea suyo.
4. La inserción directa en `postulaciones_examen` (sin RPC) también queda bloqueada fuera de la
   jerarquía permitida.
5. Sin regresiones: el dueño sigue viendo recaudación/planilla; `jhona@` sigue pudiendo postular a la
   mesa de Jhonatan; el dueño puede postular a sus propios alumnos directos.
6. `mobile` `typecheck`/`lint` en verde (si se ajusta el texto) y `supabase db lint --linked` sin
   issues nuevos.

## Verificación

- BD: `npx supabase migration new mesas_visibilidad_jerarquia` → `db push --linked` → `db lint --linked`.
- Manual (dispositivo), con las cuentas del árbol:
  - `jhona@`: lista la mesa de Jhonatan y postula a **Alumno Prueba 1**.
  - `sensei@`: **no** ve mesas.
  - `maestro2@`: ve las mesas de Jhonatan (ajenas, solo lectura) y postula a sus alumnos.
  - `jhonatan`: ve solo sus mesas; **no** ve la de `maestro2@`.
- BD/API (chequeo directo): `select * from mesas_examen` con JWT de `sensei@` → 0 filas; llamada directa
  a `postular_alumno` con un profesor fuera de jerarquía → excepción.

## Documentación a actualizar al implementar

- `documentacion/srs-sistemaDeGestionTaekwondo.md` (§3.7): visibilidad de mesas por jerarquía
  (dueño + subordinados directos) y postulación restringida al superior directo (el dueño también puede).
- `documentacion/ReglasyRestricciones-SistemaTaekwondoITF.md` (§4): misma regla.
- `documentacion/plan-de-pruebas.md`: actualizar `TC-MES-08` (nuevo escenario) y `TC-POS-*`
  (aislamiento por jerarquía); agregar `TC-MES-12` (nieto no ve) y `TC-POS-10` (postular fuera de
  jerarquía → rechazo).
- `documentacion/planes/mobile-mesas-dueno-nombre.md`: nota de que la RPC ahora filtra por jerarquía.
- `documentacion/prueba-manual.md`: ajustar el apartado Mesas.
- `documentacion/README.md`: registrar este plan.

## Fuera de alcance

- Recursividad hacia abajo (que el superior vea las mesas de su rama) — se decidió **no** por ahora
  (puede cambiar a futuro).
- Cambiar la creación/edición/cierre de mesas (sigue siendo solo del dueño).
- Notificar/avisar a los subordinados cuando se abre una mesa.

---

🐧
