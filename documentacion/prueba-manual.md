# Prueba manual (documento auxiliar)

> **Documento auxiliar** con los **pasos a paso de ejecución** de pruebas manuales en dispositivo.
> Es una guía de corrida (botón por botón), **no** un catálogo: los casos reproducibles viven en
> [`plan-de-pruebas.md`](./plan-de-pruebas.md) y la lista viva de pendientes en
> [`pendientes-pruebas.md`](./pendientes-pruebas.md).
>
> Se reemplaza por el bloque correspondiente a medida que se preparan las corridas (demo, regresión,
> etc.). Cada apartado referencia su plan y los `TC-*` que cubre.

---

## Postulación a examen (rol Profesor)

- **Fecha de registro:** 2026-09-24
- **Rol:** Profesor (tab **Instructor**)
- **Cuenta:** `jhona@taekwondo.test` / `Seed123456!`
- **Planes de referencia:** [`planes/mobile-postulacion-examen.md`](./planes/mobile-postulacion-examen.md),
  [`planes/mobile-postulaciones-acciones-claras.md`](./planes/mobile-postulaciones-acciones-claras.md),
  [`planes/mobile-mesas-visibilidad-jerarquia.md`](./planes/mobile-mesas-visibilidad-jerarquia.md)
- **Casos cubiertos:** `TC-POS-01`, `TC-POS-02`, `TC-POS-03`, `TC-POS-04`, `TC-POS-05`, `TC-POS-06`,
  `TC-POS-07`, `TC-POS-08`, `TC-POS-09`, `TC-POS-10`

> **Visibilidad (jerarquía):** el profesor solo ve las mesas abiertas **de su superior directo** (o
> propias). `jhona@` es subordinado directo de **Jhonatan**, así que solo aparecen las mesas de
> Jhonatan. Referencia: [`planes/mobile-mesas-visibilidad-jerarquia.md`](./planes/mobile-mesas-visibilidad-jerarquia.md).

### Precondiciones

- Celular con **Expo Go** y Metro corriendo en la **misma red** (o túnel).
- Sesión iniciada con **`jhona@taekwondo.test`**.
- **Una mesa "Abierta" de Jhonatan** (⚠️ si no hay, abrir una desde la cuenta Maestro: tab Maestro →
  "Mesas de examen" → "+ Nueva mesa"; `jhona@` **no** ve las mesas de otros dueños).
- **"Alumno Prueba 1"** es alumno directo de `jhona@` (el de la demo).

#### A. Entrar al módulo

1. Iniciá sesión con **`jhona@taekwondo.test`**.
2. Tocá la pestaña **Instructor**.
3. Tocá la fila **"Postulación a examen"** (descripción: *"Postular a tus alumnos a las mesas
   abiertas"*).

**✅ Esperado (`TC-POS-01`):** se listan **solo las mesas abiertas de tu superior directo**. Cada fila
muestra fecha, lugar, **`Mesa de {nombre del dueño}`** y `N postulado(s)`.

#### B. `TC-POS-02` — Mesa y candidatos

1. Tocá la fila de la mesa de Jhonatan (NO de "Maestro Prueba": esa no te la muestra).
2. En el detalle verificá el encabezado: fecha, lugar y **`Mesa de Jhonatan Calle Galeano`**.
3. Tocá **"Postular alumnos"**.

**✅ Esperado:** cada alumno directo muestra `grado actual → grado aspirado` (el inmediato superior).
Los que ya están postulados aparecen con **"Ya postulado en esta mesa"** (deshabilitados).

#### C. `TC-POS-03` — Postular con derecho de examen

1. (Opcional) En **"Derecho de examen (opcional)"** escribí un monto, ej. `5000`.
2. Marcá el checkbox de **"Alumno Prueba 1"** (queda resaltada en rojo).
3. Tocá **"Postular seleccionados"**.

**✅ Esperado:** vuelve al detalle y en **"Tus postulaciones"** aparece *Alumno Prueba 1* con
`Aspira a {grado}` · `$ 5.000,00` y estado **"Postulado"**.

#### D. `TC-POS-04` — Duplicado

1. Tocá de nuevo **"Postular alumnos"**.
2. Verificá que **"Alumno Prueba 1"** aparece **deshabilitado** ("Ya postulado en esta mesa") y no deja
   volver a marcarlo.

**✅ Esperado:** **no** se puede duplicar; **sin** fila repetida. (Por API, `postular_alumno` devuelve
*"El alumno ya está postulado en esta mesa."*)

#### E. `TC-POS-05` — Grado máximo (requiere dato)

- **Precondición:** un alumno directo en `dan_9`.
- **Esperado:** aparece deshabilitado con **"Ya alcanzó el grado máximo"**.

#### F. `TC-POS-06` — Mesa cerrada

1. Desde la cuenta **Maestro (Jhonatan)** → Mesas de examen → abrir la mesa → **"Cerrar mesa"** →
   confirmar.
2. Volvé a `jhona@` → detalle de la mesa.

**✅ Esperado:** el botón **"Postular alumnos"** ya no está; se ve *"Esta mesa está cerrada: ya no se
pueden hacer postulaciones."* y **no** se pueden editar cobros ni quitar postulaciones.

#### G. `TC-POS-07` — Alumno ajeno

- **Esperado:** un alumno que **no** es directo de `jhona@` **no** aparece en la lista de candidatos.

#### H. `TC-POS-09` — Editar cobro y quitar (mesa abierta)

1. En **"Tus postulaciones"**, tocá **"Editar cobro"** → cambiá el monto → **"Guardar cobro"**.
2. Tocá **"Quitar"** → confirmar.

**✅ Esperado:** "Editar cobro" actualiza el monto (y la recaudación del Maestro); "Quitar" elimina la
postulación de la lista.

#### I. `TC-POS-08` — Recaudación (rol Maestro)

1. Cambiá a la cuenta **Maestro (Jhonatan)** → Mesas de examen → abrí la mesa.

**✅ Esperado:** tarjeta **"Recaudación de la mesa"** con el **total** (suma de derechos) y la nota
*"Cobrados: X · Pendientes: Y"*, más el **"Detalle de postulaciones"** (nombre, grado y derecho).

#### J. `TC-POS-10` — Postular fuera de jerarquía (API, no UI)

- **Pasos:** con un profesor que **no** es dueño ni subordinado directo del dueño (ej. `sensei@`,
  nieto), intentar postular a una mesa de Jhonatan vía RPC/API.
- **Esperado:** excepción **"Solo podés postular en las mesas de tu superior directo."**; **sin** fila
  en `postulaciones_examen`.

#### Cierre

- Marcar en [`pendientes-pruebas.md`](./pendientes-pruebas.md) los `TC-POS-*` verificados.
- Si aparece una desviación, registrarla como pendiente con fecha y referencia al plan.

---

🐧
