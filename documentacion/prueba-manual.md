# Prueba manual (documento auxiliar)

> **Documento auxiliar** con los **pasos a paso de ejecución** de pruebas manuales en dispositivo.
> Es una guía de corrida (botón por botón), **no** un catálogo: los casos reproducibles viven en
> [`plan-de-pruebas.md`](./plan-de-pruebas.md) y la lista viva de pendientes en
> [`pendientes-pruebas.md`](./pendientes-pruebas.md).
>
> Se reemplaza por el bloque correspondiente a medida que se preparan las corridas (demo, regresión,
> etc.). Cada apartado referencia su plan y los `TC-*` que cubre.

---

## Dashboard de métricas anonimizadas (rol Maestro)

- **Fecha de registro:** 2026-09-24
- **Rol:** Maestro (tab **Maestro**)
- **Cuenta:** `alecriado@taekwondo.test` / `Seed123456!` (Maestro; tiene rama con descendientes)
- **Plan de referencia:** [`planes/mobile-dashboard-metricas.md`](./planes/mobile-dashboard-metricas.md)
- **Casos cubiertos:** `TC-DASH-01`…`TC-DASH-08`

> **Privacidad:** la pantalla muestra **solo conteos** (género, rango de edad y grado) de la rama
> descendente; **nunca** nombres ni datos personales. El filtro es por **rama** (consolidada o por
> instructor directo).

### Precondiciones

- Celular con **Expo Go** y Metro corriendo en la **misma red** (o túnel).
- Sesión con **Ale criado** (`alecriado@taekwondo.test`), que tiene rama con descendientes.
- (Para `TC-DASH-03`) un **Maestro sin descendientes**: hoy **no hay** cuenta con login así (Teresita es
  Maestro sin login). Alternativa: usar el **filtro por instructor** de alguien sin gente → muestra
  *"Este instructor no tiene descendientes."*

#### A. `TC-DASH-01` — Vista consolidada (**Smoke**)

1. Iniciá sesión con **Ale criado** (`alecriado@taekwondo.test`).
2. Pestaña **Maestro** → tocá **"Estadísticas anonimizadas"**.
3. Verificá que el chip **"Toda mi rama"** está activo.
4. Observá las dos tarjetas de resumen: **"Integrantes en la vista"** y **"Grados representados"**.

**✅ Esperado:** se ven el **total** de integrantes de la rama y los **3 gráficos** (Género, Rango de
edad, Grado). El total coincide con `metricas_dashboard` en modo consolidada. **En ningún lado**
aparecen nombres ni datos personales.

#### B. `TC-DASH-05` — Distribución por género

1. En la sección **"Género"** observá la **dona**.

**✅ Esperado:** muestra **Masculino / Femenino / Otro** con conteo y porcentaje; el centro dice
*"integrantes"*. La suma coincide con los perfiles con género cargado.

#### C. `TC-DASH-06` — Distribución por rango de edad

1. En la sección **"Rango de edad"** observá las barras.

**✅ Esperado:** **6 barras**: `0 a 7`, `8 a 11`, `12 a 14`, `15 a 17`, `18 a 30` y
**Mayores de 30** (el bucket `30+` del RPC, o sea 31+).

#### D. `TC-DASH-07` — Distribución por grado

1. En la sección **"Grado"** observá las barras.

**✅ Esperado:** barras en el **orden del enum** `grado`, con las **etiquetas de color** ("Blanco",
"Amarillo punta verde", …, "Dan I"…"Dan IX"); **no** se listan grados sin integrantes.

#### E. `TC-DASH-02` — Vista específica por instructor

1. Tocá el chip de un **instructor** (ej. "Andres").
2. Observá las tarjetas y los gráficos.

**✅ Esperado:** los conteos cambian a los de **solo esa rama**; coincide con
`metricas_dashboard('especifica', p_instructor)`. El chip queda resaltado.

#### F. `TC-DASH-04` — Cambiar filtro refresca sin reiniciar

1. Alterná entre **"Toda mi rama"** y distintos instructores.
2. Observá que total y gráficos se actualizan **en el momento**.

**✅ Esperado:** cada cambio refresca los datos sin reiniciar la app.

#### G. `TC-DASH-03` — Rama sin descendientes

1. Como **Ale criado**, tocá un chip de instructor **sin gente** (si lo hubiera), o entrá con un
   **Maestro sin descendientes** (hoy no hay cuenta con login así).

**✅ Esperado:** estado vacío **"No hay integrantes en tu rama descendente."** (o *"Este instructor no
tiene descendientes."* al filtrar) — sin gráficos ni errores.

#### H. `TC-DASH-08` — Privacidad, autorización y fail gracefully (**Smoke**)

1. Confirmá visualmente que **no** se muestran nombres ni datos personales (solo conteos).
2. (API) Forzar `metricas_dashboard('especifica', p_instructor)` con un instructor **fuera de la rama**
   → el RPC lo **rechaza**.
3. **Cortá la red** y volvé a entrar a la pantalla (o tocá un chip).

**✅ Esperado:** nunca se exponen datos personales; la vista específica ajena se rechaza; con red
cortada aparece el mensaje genérico **"No pudimos cargar las estadísticas."** con **"Reintentar"**,
sin excepciones crudas.

#### Cierre

- Marcar en [`pendientes-pruebas.md`](./pendientes-pruebas.md) los `TC-DASH-*` verificados.
- Si aparece una desviación, registrarla como pendiente con fecha y referencia al plan.

---

🐧
