# Prueba manual (documento auxiliar)

> **Documento auxiliar** con los **pasos a paso de ejecución** de pruebas manuales en dispositivo.
> Es una guía de corrida (botón por botón), **no** un catálogo: los casos reproducibles viven en
> [`plan-de-pruebas.md`](./plan-de-pruebas.md) y la lista viva de pendientes en
> [`pendientes-pruebas.md`](./pendientes-pruebas.md).
>
> Se va ampliando con un apartado por bloque a medida que se preparan las corridas (demo, regresión,
> etc.). Cada apartado referencia su plan y los `TC-*` que cubre.

---

## Mesas de examen (rol Maestro)

- **Fecha de registro:** 2026-09-24
- **Rol:** Maestro (tab **Maestro**)
- **Cuenta:** `jhonatancallegaleano@gmail.com`
- **Plan de referencia:** [`planes/mobile-mesas-examen.md`](./planes/mobile-mesas-examen.md)
- **Casos cubiertos:** `TC-MES-01`, `TC-MES-02`, `TC-MES-03`, `TC-MES-04`, `TC-MES-05`,
  `TC-MES-06`, `TC-MES-08`, `TC-MES-09`

> **Fecha:** se elige con el **selector de fecha** (date-picker), no se escribe texto; viene
> precargada con la fecha de hoy y admite **cualquier** fecha (pasada o futura). Referencia:
> [`planes/mobile-date-picker-campos-fecha.md`](./planes/mobile-date-picker-campos-fecha.md).

### Precondiciones

- Celular con **Expo Go** y Metro corriendo en la **misma red** (o túnel).
- Sesión iniciada con la cuenta **Maestro**.

#### A. Entrar al módulo

1. Abrí la app (Expo Go, misma red/Metro).
2. Iniciá sesión con la cuenta **Maestro**.
3. En la barra inferior tocá la pestaña **Maestro**.
4. Tocá la fila **"Mesas de examen"** (descripción: *"Planificar y abrir mesas de graduación"*).
   - También hay otra fila **"Planilla técnica de evaluación"** que lleva al mismo listado de mesas.

**✅ Esperado:** si no hay mesas, se ve *"Todavía no hay mesas de examen abiertas."* con un botón
**"Crear la primera"**.

#### B. `TC-MES-01` + `TC-MES-02` + `TC-MES-03` — Crear mesa

1. Tocá **"+ Nueva mesa"** (botón rojo arriba).
2. En **"Fecha \*"** tocá el campo y elegí la fecha en el **selector** (ej. `30/09/2026`),
   sin límite de rango.
3. En **"Lugar \*"**:
   - Los **chips con tus locaciones propias** → tocá una (queda resaltada en rojo).
   - El chip **"+ Otro lugar"** → al tocarlo aparece el campo **"Otro lugar"**; escribí un texto
     libre (ej. `Dojang Central`).
4. Tocá **"Abrir mesa"**.

**✅ Esperado:**

- `MES-01`: la mesa queda en estado **"Abierta"** y la app lleva directo al **detalle** de la mesa.
- `MES-02`: los chips eran tus locaciones.
- `MES-03`: con "+ Otro lugar" el texto libre se guarda y se ve como lugar.

> **Validaciones:** si la fecha no es válida → *"Elegí una fecha válida."*; si no se elige/escribe
> lugar → *"Elegí una locación o escribí el lugar."*

#### C. `TC-MES-04` — Listado

1. Desde el detalle, tocá **← (volver)** para regresar al listado.
2. Observá la fila de la mesa recién creada.

**✅ Esperado:**

- Fecha en formato `DD/MM/AAAA`, **lugar**, **badge de estado** ("Abierta") y **`N postulado(s)`**.
- Las mesas propias van primero, con el prefijo **"Tu mesa · "**; si hay mesas de otros maestros
  aparece el encabezado **"Tus mesas primero"**.

#### D. `TC-MES-05` — Editar mesa

1. Tocá la fila de la mesa para entrar al **detalle**.
2. Tocá **"Editar mesa"**.
3. Cambiá la **fecha** y/o el **lugar** y tocá **"Guardar cambios"** (vuelve al detalle).
4. Salí y volvé a entrar al detalle.

**✅ Esperado:** el detalle muestra la fecha/lugar nuevos **sin reiniciar la app**
(`useFocusEffect`).

#### E. `TC-MES-06` — Cerrar y finalizar

1. En el detalle (mesa propia, estado **"Abierta"**) tocá **"Cerrar mesa"**.
2. En el diálogo *"Al cerrarla, los profesores ya no podrán postular alumnos. ¿Continuar?"* tocá
   **"Continuar"**.
3. Verificá que el badge pase a **"Cerrada"** y que ahora aparezca el botón **"Finalizar mesa"**.
4. (Opcional) Tocá **"Finalizar mesa"** → confirmar → badge **"Finalizada"**.

**✅ Esperado:** Abierta → **"Cerrar mesa"** → Cerrada → **"Finalizar mesa"**.

#### F. Extras rápidos

- **`TC-MES-08` — Mesa ajena:** abrí una mesa que **no** sea tuya → debe decir *"Esta mesa pertenece
  a otro maestro: solo podés consultarla."* y **no** mostrar botones de editar/cerrar.
- **`TC-MES-09` — Sin límite:** confirmar que el formulario **no pide** "límite de inscripción"
  (solo fecha y lugar).
- **Botón "Abrir planilla de evaluación"** con la mesa **abierta**: debe avisar *"Primero cerrá la
  mesa"* con opción **"Cerrar mesa"** (enlaza con el bloque Planilla).

#### G. ⚠️ Importante para la demo — dejar la mesa lista

El orden de la demo es **Mesas → Postulación → Planilla**. Antes de pasar al bloque de Postulación
(con `jhona@`):

- **Dejar una mesa en estado "Abierta"** (no finalizar la que se usará en la demo).
- Esa mesa la va a usar el profesor `jhona@` para **postular a "Alumno Prueba 1"**.
- Recién en el **Punto 5 (Planilla)** se la **cierra** para poder evaluar.

#### Cierre

- Marcar en [`pendientes-pruebas.md`](./pendientes-pruebas.md) (item 23) los `TC-MES-*` verificados.
- Si aparece una desviación, registrarla como pendiente con fecha y referencia al plan.

---

🐧
