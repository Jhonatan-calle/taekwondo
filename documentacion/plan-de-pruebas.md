# Plan de Pruebas — Taekwondo ITF (app móvil)

> **Catálogo permanente de casos de prueba.** No es una lista de bugs: documenta **cómo debe
> funcionar cada cosa**, para verificar que no se rompió al tocar código y para probar manualmente
> en el dispositivo.
>
> **Regla de mantenimiento:** al implementar o modificar una función, **agregar o actualizar sus
> casos acá** (con ID y prioridad). Este documento crece con el proyecto.
>
> Los **pendientes puntuales** (bloqueos, fechas, follow-ups) viven en `pendientes-pruebas.md`.

## Metadatos
- **Versión:** 1.37
- **Estado:** Vigente
- **Fecha:** 2026-09-24
- **Cobertura:** 160 casos en 18 módulos (44 marcados Smoke)

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Creación inicial: catálogo de casos por módulo (auth, onboarding, linaje, navegación, inicio, alumnos, grupos, locaciones, clases, asistencia, cuotas, alquileres, auditoría, mesas, postulación, evaluación), matriz de roles/RLS, resiliencia y smoke test. |
| 1.1 | 2026-09-22 | Fase 8.1: nuevo módulo **TC-DASH** (dashboard de métricas anonimizadas) con 8 casos (2 Smoke) y dos entradas al smoke test; se quita el pendiente de Fase 8. |
| 1.2 | 2026-09-23 | **Confirmación del cinturón en el linaje:** se actualizan `TC-LIN-01`/`TC-LIN-02` (declaración obligatoria `dan_1+` y confirmación/ajuste del grado con activación de `es_profesor`) y se agregan `TC-LIN-07` (Gup rechazado) y `TC-LIN-08` (ajuste al aceptar). Referencia: `planes/mobile-linaje-confirmar-grado.md`. |
| 1.3 | 2026-09-23 | **Contacto de emergencia obligatorio** (nombre + teléfono con formato), para staff y alumnos: `TC-ONB-04` y `TC-ALU-04` dejan de ser "opcionales"; se agregan `TC-ONB-06` y `TC-ALU-09`. Referencia: `planes/mobile-contacto-emergencia-obligatorio.md`. |
| 1.4 | 2026-09-23 | **Refresco del linaje en tiempo real:** se agregan `TC-LIN-09` (el solicitante ve el cambio en vivo sin re-loguear) y `TC-LIN-10` (el superior ve las solicitudes nuevas/resueltas en vivo). Referencia: `planes/mobile-refresco-linaje-tiempo-real.md`. |
| 1.5 | 2026-09-23 | **Transición de login sin parpadeo:** se agrega `TC-AUTH-12` (no se muestra el onboarding al iniciar sesión mientras el perfil se resuelve). Referencia: `planes/mobile-fix-flicker-onboarding-login.md`. |
| 1.6 | 2026-09-23 | Prueba manual: se agrega la cuenta `realtime1@taekwondo.test` y se marca `TC-LIN-10` (solicitudes del superior en vivo) como ✅ verificado. |
| 1.7 | 2026-09-23 | Prueba manual: `TC-LIN-09` (refresco en vivo del solicitante — caso **aceptar**) marcado ✅ verificado. |
| 1.8 | 2026-09-23 | Prueba manual: se agrega la cuenta `realtime2@taekwondo.test`; `TC-LIN-03` (rechazar) y el caso **rechazar** de `TC-LIN-09` marcados ✅ verificados. |
| 1.9 | 2026-09-23 | Prueba manual: `TC-ONB-02`, `TC-ONB-04`, `TC-ONB-05` y `TC-ONB-06` (validaciones del onboarding) marcados ✅ verificados. |
| 1.10 | 2026-09-23 | Prueba manual: `TC-ONB-03` (DNI duplicado) marcado ✅ verificado. |
| 1.11 | 2026-09-23 | Prueba manual: `TC-AUTH-02` (registro con email duplicado) marcado ✅ verificado. Se registra el hallazgo del onboarding sin forma de cerrar sesión. |
| 1.12 | 2026-09-23 | Prueba manual + ajustes de UI: `TC-INI-01`/`TC-INI-02` verificados; se actualiza el esperado del panel (tarjeta **Grupos** y **Asistencia** con estado al día en verde). Referencia: `planes/mobile-rediseno-inicio.md` (v1.2). |
| 1.13 | 2026-09-23 | Fix de navegación a stacks anidados (ancla de tab + `withAnchor` + tabPress al menú): se agrega `TC-NAV-05`. Referencia: `planes/mobile-fix-navegacion-tab-stacks.md`. |
| 1.14 | 2026-09-23 | Prueba manual: `TC-NAV-05`, `TC-ALU-01`, `TC-ALU-02`, `TC-ALU-05` y `TC-ALU-06` marcados ✅ verificados. |
| 1.15 | 2026-09-23 | Prueba manual: `TC-ALU-03`, `TC-ALU-04` y `TC-ALU-09` verificados; mensaje del nombre de contacto inválido diferenciado del vacío. Referencia: `planes/mobile-contacto-emergencia-obligatorio.md` (v1.1). |
| 1.16 | 2026-09-24 | Prueba manual: `TC-GRU-01`, `TC-GRU-02`, `TC-GRU-03`, `TC-GRU-05`, `TC-GRU-06`, `TC-GRU-07` y `TC-GRU-08` marcados ✅ verificados. |
| 1.17 | 2026-09-24 | Ajuste de UX en Locaciones: el botón "Eliminar locación" con grupos asociados ahora responde con una alerta explicativa (`TC-LOC-05` actualizado). Referencia: `planes/mobile-editar-grupo-locacion.md` (v1.1). |
| 1.18 | 2026-09-24 | Prueba manual: `TC-LOC-01`, `TC-LOC-02`, `TC-LOC-03`, `TC-LOC-04`, `TC-LOC-05` y `TC-LOC-06` marcados ✅ verificados. |
| 1.19 | 2026-09-24 | **Objetivo de clase por elementos ITF:** `TC-CLA-01/02/05` actualizados, nuevo `TC-CLA-07` (tope de 2) y nuevo módulo **`TC-OBJ`** (distribución por elemento). Referencia: `planes/mobile-objetivo-clase-elementos.md`. |
| 1.20 | 2026-09-24 | Se **elimina `preparacion_fisica`** y se amplía el campo "Detalles (opcional)"; `TC-CLA-01/02` ajustados. Referencia: `planes/mobile-objetivo-clase-elementos.md` (v1.2). |
| 1.21 | 2026-09-24 | Prueba manual: `TC-CLA-01`…`TC-CLA-07` y `TC-OBJ-01/02/03/06` marcados ✅ verificados. |
| 1.22 | 2026-09-24 | Prueba manual: `TC-ASI-01`…`TC-ASI-04` marcados ✅ verificados. |
| 1.23 | 2026-09-24 | **Auditoría agrupada por rama:** `TC-AUD-04` pasa a "filtro por rama", `TC-AUD-05` ajustado y nuevo `TC-AUD-08` (agrupamiento). Referencia: `planes/mobile-auditoria-rama-agrupada.md`. |
| 1.24 | 2026-09-24 | Prueba manual: `TC-INI-05`, `TC-AUD-01`…`TC-AUD-05` y `TC-AUD-08` marcados ✅ verificados. |
| 1.25 | 2026-09-24 | **Date-picker en todos los campos de fecha:** `TC-MES-01` actualizado y nuevo `TC-MES-10` (fecha con selector / límites); `TC-CUO-01`, `TC-CUO-07` y `TC-ALQ-01` actualizados (periodo con selector de mes y fecha de pago con date-picker). Referencia: `planes/mobile-date-picker-campos-fecha.md`. |
| 1.26 | 2026-09-24 | Prueba manual: `TC-MES-01`, `TC-MES-02` y `TC-MES-03` (crear mesa con date-picker + lugar) y la parte de **crear** de `TC-MES-10` marcados ✅ verificados. |
| 1.27 | 2026-09-24 | Prueba manual: `TC-MES-04` (listado de mesas: fecha, lugar, estado y postulados; propias primero) marcado ✅ verificado. |
| 1.28 | 2026-09-24 | **Validación de fecha de mesa en la BD:** nuevo `TC-MES-11` (fecha pasada rechazada por el trigger `validar_fecha_mesa`, no salteable por API). Referencia: `planes/bd-validar-fecha-mesa.md`. |
| 1.29 | 2026-09-24 | **Revertido:** se elimina todo límite de fecha en mesas (a pedido). Se retira `TC-MES-11` y se ajusta `TC-MES-10` (el date-picker admite cualquier fecha). Referencia: `planes/bd-validar-fecha-mesa.md` (Revertido). |
| 1.30 | 2026-09-24 | Prueba manual: `TC-MES-05` (editar mesa: fecha/lugar y reflejo al volver) marcado ✅ verificado. |
| 1.31 | 2026-09-24 | Prueba manual: `TC-MES-06` (cerrar y finalizar mesa) marcado ✅ verificado. **Módulo Mesas completo** (`TC-MES-01…06`, `TC-MES-10`). |
| 1.32 | 2026-09-24 | **Dueño de la mesa a la vista:** `TC-MES-08` actualizado (mensaje con nombre del dueño en el detalle y `Mesa de {nombre}` en los listados de Maestro e Instructor); RPC `listar_mesas_examen()` con `maestro_nombre`. Referencia: `planes/mobile-mesas-dueno-nombre.md`. |
| 1.33 | 2026-09-24 | Prueba manual: `TC-MES-08` (mesa ajena con nombre del dueño), `TC-MES-09` (sin límite de inscripción) y `TC-EVA-02` ("Abrir planilla" con mesa abierta ofrece cerrarla) marcados ✅ verificados. |
| 1.34 | 2026-09-24 | **Visibilidad de mesas por jerarquía:** `TC-MES-08` cambia de escenario (requiere re-verificación); `TC-POS-01` ajustado; nuevos `TC-MES-12` (nieto/superior no ve) y `TC-POS-10` (postular fuera de jerarquía → rechazo). Referencia: `planes/mobile-mesas-visibilidad-jerarquia.md`. |
| 1.35 | 2026-09-24 | Prueba manual: `TC-MES-08` (nuevo escenario) y `TC-MES-12` (visibilidad solo directos) marcados ✅ verificados; **módulo Mesas de examen completo**. |
| 1.36 | 2026-09-24 | **Refuerzo del fix de parpadeo de onboarding:** `TC-AUTH-12` ampliado (gate por usuario + reintento único; no reaparece al re-loguear/cambiar de cuenta). Referencia: `planes/mobile-fix-flicker-onboarding-login.md` (v1.3). |
| 1.37 | 2026-09-24 | Prueba manual: `TC-POS-01`…`TC-POS-05` (lista de mesas del superior, candidatos con grado aspirado, postular con derecho, duplicado y grado máximo) marcados ✅ verificados. |

---

## 1. Cómo usar este documento

- **Entorno:** app Expo (Expo Go) en dispositivo real, apuntando a la BD remota de Supabase.
- **Ejecución:** manual. Cada caso es una **ficha** con rol, precondición, pasos y resultado esperado.
- **Prioridad:**
  - **Smoke:** verificación rápida (debe pasar siempre; si falla, algo grave se rompió).
  - **Regresión:** cobertura completa; se corre antes de dar un módulo por cerrado.
- **IDs:** `TC-<MÓDULO>-<NN>`. Los IDs **no se reutilizan** aunque un caso se descarte.
- **Estados del caso:** ✅ verificado · ⏳ pendiente · ❌ falla (con nota).

## 2. Usuarios y datos de prueba

Escenario creado por el seed (`planes/db-seed-auditoria.md`).

| Cuenta                           | Contraseña                       | Rol                           | Uso                                     |
| -------------------------------- | -------------------------------- | ----------------------------- | --------------------------------------- |
| `jhonatancallegaleano@gmail.com` | *(la del dueño; no se versiona)* | **Maestro** (raíz del árbol)  | Mesas, auditoría, evaluación            |
| `jhona@taekwondo.test`           | `Seed123456!`                    | **Profesor** (nivel 1)        | Gestión diaria, cuotas, postulación     |
| `sensei@taekwondo.test`          | `Seed123456!`                    | **Profesor** (nivel 2, nieto) | Probar **recursividad** de la auditoría |
| `ajeno@taekwondo.test`           | `Seed123456!`                    | **Profesor ajeno** (P3)       | Casos de aislamiento horizontal         |
| `realtime1@taekwondo.test`       | `Seed123456!`                    | **Solicitante de linaje**     | Realtime del linaje (creada a mano en la app) |
| `realtime2@taekwondo.test`       | `Seed123456!`                    | **Solicitante rechazado**     | Rechazo de linaje + onboarding (creada a mano) |

> **Credenciales del seed:** `jhona@` y `sensei@` comparten la contraseña `Seed123456!` y se crean por **Admin API**. La cuenta del Maestro es personal del dueño (no está en el repositorio).
>
> **`realtime1@taekwondo.test`** se creó **manualmente en la app** (2026-09-23) para probar el Realtime del
> linaje: quedó como solicitante pendiente de `jhona@` (declaró Dan I y eligió a Profesor Jhona). No la
> crea el seed; si se limpia la base, hay que registrarla de nuevo.
>
> **`realtime2@taekwondo.test`** se creó **manualmente en la app** (2026-09-23) para probar el **rechazo**
> del linaje: su solicitud fue rechazada por `jhona@` y quedó volviendo al onboarding. Se conserva para
> reutilizarla en pruebas de onboarding/validaciones.

**Datos del seed:**

| Locación | Dueño | Estado de pago |
|---|---|---|
| Banda Norte | Jhonatan | Al día (2026-09) |
| Seed Dojang Jhona A | Profesor Jhona | Vencida (2026-07) |
| Seed Dojang Jhona B | Profesor Jhona | Sin pagos |
| Seed Dojang Sensei | Sensei Seed | Vencida (2026-08) |

Además: 6 alumnos de Sensei Seed (`Alumno Seed *`) y grupos con locación (`Niños` y `Adultos Noche` del Maestro, `Seed Grupo Jhona`, `Seed Grupo Sensei`).

> **Nota:** el seed es **aditivo e idempotente**; se puede re-ejecutar con
> `npx supabase db query --linked -f supabase/seed-auditoria.sql`.
> Las cuentas `jhona@` y `sensei@` se crean por **Admin API** (no por SQL).
> Para dejar la base determinista se corre una **limpieza** que conserva
> `jhonatancallegaleano@gmail.com` y `errores_runtime` (ver `planes/db-fix-mapeo-cuentas-seed.md`).

---

## 3. Casos por módulo

### TC-AUTH — Acceso (registro, login, recuperación, guards)

#### TC-AUTH-01 — Registro de cuenta nueva · **Smoke**
- **Rol:** anónimo
- **Pasos:** abrir la app → "Crear cuenta" → email nuevo + contraseña válida → Continuar
- **Esperado:** se crea la cuenta; queda pendiente de confirmación o entra según la config de Supabase; **no** se accede a la app principal sin completar el onboarding
- **Referencia:** `planes/mobile-flujo-acceso-auth.md`

#### TC-AUTH-02 — Registro con email ya existente · **Smoke** · ✅ verificado (2026-09-23)
- **Rol:** anónimo
- **Precondición:** un email ya registrado
- **Pasos:** "Crear cuenta" con ese email → Continuar
- **Esperado:** mensaje **"Ya existe una cuenta con ese email."** (no "Revisa tu email")
- **Referencia:** `planes/mobile-arreglos-auth-require-cycle.md`

#### TC-AUTH-03 — Inicio de sesión correcto · **Smoke**
- **Rol:** anónimo
- **Pasos:** "Iniciar sesión" con credenciales válidas
- **Esperado:** entra a la app; si el perfil está incompleto → `/onboarding`; si está completo → Inicio

#### TC-AUTH-04 — Inicio de sesión con contraseña incorrecta
- **Rol:** anónimo
- **Esperado:** mensaje amigable, sin detalles técnicos

#### TC-AUTH-05 — Recuperación de contraseña (deep link)
- **Rol:** anónimo
- **Pasos:** "Olvidé mi contraseña" → email → tocar el enlace del correo en el dispositivo
- **Esperado:** abre `/nueva-contrasena`, permite cambiarla y redirige a iniciar sesión
- **Nota:** puede bloquearse por `over_email_send_rate_limit` de Supabase (ver `pendientes-pruebas.md` #1)
- **Referencia:** `planes/mobile-deeplink-recuperacion-fix.md`

#### TC-AUTH-06 — Guard de sesión · **Smoke**
- **Pasos:** con sesión activa, intentar un deep link a `iniciar-sesion`
- **Esperado:** redirige a Inicio (no se muestra el login)

#### TC-AUTH-07 — Persistencia de sesión
- **Pasos:** cerrar y reabrir la app con sesión iniciada
- **Esperado:** sigue logueado (storage seguro)

#### TC-AUTH-08 — Cerrar sesión
- **Rol:** cualquier usuario autenticado
- **Pasos:** Inicio → "Cerrar sesión" (enlace al final)
- **Esperado:** vuelve al login; no quedan pantallas de gestión accesibles

#### TC-AUTH-09 — Mostrar/ocultar contraseña en login · **Smoke**
- **Rol:** anónimo
- **Pasos:** escribir una contraseña en el campo → tocar el ícono de ojo
- **Esperado:** alterna entre oculta y visible; **el texto no se pierde** ni se borra; el ícono cambia (ojo abierto / tachado)
- **Accesibilidad:** el botón anuncia "Mostrar contraseña" / "Ocultar contraseña"
- **Referencia:** `planes/mobile-toggle-contrasena.md`

#### TC-AUTH-10 — Toggle en registro (ambos campos)
- **Rol:** anónimo
- **Pasos:** en "Crear cuenta", alternar la visibilidad de **Contraseña** y de **Confirmar contraseña**
- **Esperado:** **cada campo tiene su propio toggle independiente**; alternar uno no afecta al otro; los valores se conservan

#### TC-AUTH-11 — Toggle en nueva contraseña
- **Rol:** usuario en recuperación de contraseña
- **Pasos:** en `/nueva-contrasena`, alternar los dos campos
- **Esperado:** mismo comportamiento que `TC-AUTH-10`; los valores se conservan al alternar

#### TC-AUTH-12 — Transición de login sin parpadeo de onboarding · **Smoke**
- **Rol:** usuario con onboarding completo
- **Pasos:** iniciar sesión y observar la transición login → Inicio
- **Esperado:** se ve un **spinner de carga** y de ahí directo al **Inicio**; **nunca** aparece el formulario de onboarding, ni por un instante
- **Cuenta nueva:** spinner de carga → `/onboarding` (no parpadea a tabs)
- **Fail gracefully:** si la lectura del perfil falla, la app no queda colgada en el spinner
- **Reintentos:** tras la v1.3 del plan, el gate se resuelve **por usuario** y reintenta una vez si el
  perfil vuelve vacío; el parpadeo **no** debe reaparecer ni al re-loguear ni al cambiar de cuenta
- **Referencia:** `planes/mobile-fix-flicker-onboarding-login.md`

---

### TC-ONB — Onboarding y perfil

#### TC-ONB-01 — Onboarding obligatorio · **Smoke**
- **Rol:** cuenta nueva con perfil incompleto
- **Esperado:** cae en `/onboarding` y **no** puede entrar a la app principal hasta completarlo

#### TC-ONB-02 — Validaciones del formulario · ✅ verificado (2026-09-23)
- **Pasos:** intentar guardar con campos vacíos / fecha futura / edad < 4
- **Esperado:** errores **inline por campo**; no deja guardar

#### TC-ONB-03 — DNI duplicado · **Smoke** · ✅ verificado (2026-09-23)
- **Precondición:** un DNI ya registrado
- **Esperado:** "El DNI ya está registrado." (pre-chequeo del RPC y/o `23505`)

#### TC-ONB-04 — Campos complementarios · ✅ verificado (2026-09-23)
- **Pasos:** completar los obligatorios (nombre, DNI, nacimiento, peso, género, **contacto de emergencia**) y dejar vacíos altura/teléfono/datos de salud
- **Esperado:** deja finalizar; altura, teléfono y datos de salud quedan `null`; el **contacto de emergencia es obligatorio**

#### TC-ONB-05 — Edad calculada · ✅ verificado (2026-09-23)
- **Esperado:** al elegir la fecha de nacimiento se muestra la edad cronológica correcta

#### TC-ONB-06 — Contacto de emergencia obligatorio · ✅ verificado (2026-09-23)
- **Pasos:** intentar guardar sin nombre de contacto, o con un teléfono inválido (ej. `abc`)
- **Esperado:** error inline y **no** deja guardar. El contacto exige **nombre + teléfono con formato** (`^[+0-9 ()-]{6,20}$`)
- **Referencia:** `planes/mobile-contacto-emergencia-obligatorio.md`

---

### TC-LIN — Linaje y solicitudes

#### TC-LIN-01 — Solicitud de linaje · **Smoke**
- **Rol:** usuario staff nuevo sin `maestro_id`
- **Pasos:** onboarding → declarar el cinturón (chips **Dan I…Dan IX**) → elegir instructor de la lista → enviar
- **Esperado:** con un Gup o sin grado **no deja continuar**; el grado declarado queda como **snapshot** en la solicitud; queda **pendiente**; `maestro_id` sigue `null`; en Inicio aparece el aviso "Tu instructor todavía no confirmó tu registro"
- **Referencia:** `planes/mobile-linaje-confirmar-grado.md`

#### TC-LIN-02 — Aceptar solicitud y confirmar cinturón
- **Rol:** instructor (con `es_profesor` o `es_maestro`)
- **Pasos:** Inicio → "Solicitudes de alumnos" → **Aceptar** → confirmar o **ajustar** el grado (Dan I…Dan IX) → "Confirmar y aceptar"
- **Esperado:** `maestro_id` se persiste (única vez); `grado_actual` = grado confirmado con **`grados_verificados = true`**; se activa **`es_profesor`**; el aviso del alumno desaparece al refrescar
- **Referencia:** `planes/mobile-linaje-confirmar-grado.md`

#### TC-LIN-03 — Rechazar solicitud · ✅ verificado (2026-09-23)
- **Esperado:** el alumno vuelve al onboarding (datos prellenados) a elegir de nuevo; la solicitud queda `rechazada`

#### TC-LIN-04 — Linaje inamovible
- **Pasos:** revisar que la UI no expone forma de cambiar `maestro_id`
- **Esperado:** el trigger `bloquear_auto_cambio_maestro` lo impide también a nivel BD

#### TC-LIN-05 — Maestro raíz
- **Rol:** usuario con `es_maestro`
- **Esperado:** completa el onboarding **sin** elegir instructor

#### TC-LIN-06 — Lista de instructores vacía
- **Esperado:** aviso bloqueante; al conferir un instructor, aparece y permite completar

#### TC-LIN-07 — Grado Gup rechazado
- **Pasos:** intentar declarar un cinturón Gup al pedir el linaje (llamada directa al RPC con `azul`)
- **Esperado:** `ERROR: El grado debe ser primer Dan o superior.` (validación en servidor, no solo UI)

#### TC-LIN-08 — Ajuste del cinturón al aceptar
- **Pasos:** solicitud con grado declarado **Dan I** → al aceptar, ajustar a **Dan II**
- **Esperado:** el perfil queda con `grado_actual = dan_2` y `es_profesor = true`. Al **rechazar**, el grado y `es_profesor` **no** cambian
- **Referencia:** `planes/mobile-linaje-confirmar-grado.md`

#### TC-LIN-09 — Refresco en vivo del solicitante · ✅ verificado (aceptar, 2026-09-23)
- **Rol:** solicitante pendiente, con la app abierta en el Inicio
- **Pasos:** en otro dispositivo, el superior **Aceptar** (o **Rechazar**) la solicitud
- **Esperado:** **sin tocar la app**, desaparece el aviso "Tu instructor todavía no confirmó tu registro" y se habilita la pestaña **Instructor** (al aceptar) o vuelve al **onboarding** (al rechazar). No hace falta salir ni re-loguear
- **Pendiente:** caso **rechazar** (volver al onboarding en vivo). · ✅ verificado (rechazar, 2026-09-23)
- **Referencia:** `planes/mobile-refresco-linaje-tiempo-real.md`

#### TC-LIN-10 — Solicitudes del superior en vivo · ✅ verificado (2026-09-23)
- **Rol:** instructor/maestro con "Solicitudes de alumnos" en pantalla
- **Pasos:** que otra cuenta envíe una solicitud de linaje, y luego resolverla desde otro dispositivo
- **Esperado:** la solicitud **aparece sola** en la lista y **desaparece** al resolverse, sin recuperar foco
- **Referencia:** `planes/mobile-refresco-linaje-tiempo-real.md`

---

### TC-NAV — Navegación y rutas condicionales

#### TC-NAV-01 — Tabs por facetas · **Smoke**
- **Esperado:**
  - Sin facetas → solo **Inicio**
  - `es_profesor` → Inicio + **Instructor**
  - `es_maestro` → Inicio + **Maestro**
  - Ambas → las tres

#### TC-NAV-02 — Deep links bloqueados · **Smoke**
- **Pasos:** con cuenta sin faceta, abrir `/instructor` o `/maestro`
- **Esperado:** `<Redirect>` a Inicio sin renderizar la pantalla

#### TC-NAV-03 — Menús por fase
- **Esperado:** las opciones de cada menú que no están implementadas aparecen deshabilitadas ("Próximamente")

#### TC-NAV-04 — Barra de tabs
- **Esperado:** solo etiquetas (sin glifos `MissingIcon`) y solo las tabs habilitadas

#### TC-NAV-05 — Navegación a stacks anidados (ancla de tab) · **Smoke** · ✅ verificado (2026-09-23)
- **Pasos:** desde el **Inicio**, tocar una tarjeta de otro tab (p. ej. "Cuotas pendientes" → Instructor/Cuotas) → volver (flecha/atrás); luego tocar la pestaña **Instructor** desde el Inicio
- **Esperado:** la pantalla profunda muestra **flecha de atrás** y el back vuelve al **menú del tab** (no al Inicio); tocar la **pestaña** lleva siempre al **menú del tab** (`instructor/index` / `maestro/index`)
- **Referencia:** `planes/mobile-fix-navegacion-tab-stacks.md`

---

### TC-INI — Inicio (panel operativo)

#### TC-INI-01 — Panel con datos · **Smoke** · ✅ verificado (2026-09-23)
- **Rol:** profesor con linaje confirmado y alumnos
- **Esperado:** saludo con el **nombre**, tarjetas de resumen (alumnos, **Grupos**, cuotas pendientes, **Asistencia**) y acciones rápidas. **No** se ve vacío. La tarjeta de asistencia muestra **"Clases sin asistencia cargada"** en rojo si hay pendientes, o **"Asistencia al día"** en verde si no hay
- **Referencia:** `planes/mobile-rediseno-inicio.md`

#### TC-INI-02 — Cuotas pendientes · ✅ verificado (2026-09-23)
- **Esperado:** la tarjeta muestra `pendientes/total` del mes; en rojo si hay pendientes; al tocarla abre "Cuotas de alumnos"

#### TC-INI-03 — Clases sin asistencia (7 días)
- **Pasos:** tomar asistencia de una clase reciente → volver al Inicio
- **Esperado:** el contador **baja** (valida el filtro de 7 días y el `useFocusEffect`)

#### TC-INI-04 — Refresco sin reiniciar · **Smoke**
- **Pasos:** registrar una cuota → volver al Inicio
- **Esperado:** el contador se actualiza **sin reiniciar la app**

#### TC-INI-05 — Resumen del Maestro · ✅ verificado (2026-09-24)
- **Rol:** Maestro
- **Esperado:** bloque "Tu rama" con **alquileres vencidos** de subordinados, **mesas abiertas** y **recaudación**; acciones rápidas de Maestro

#### TC-INI-06 — Fail gracefully por bloque
- **Pasos:** cortar la red y recargar el Inicio
- **Esperado:** las tarjetas quedan en "—" **sin romper** el resto del panel

#### TC-INI-07 — Usuario sin datos
- **Esperado:** textos guía, no errores

#### TC-INI-08 — Solicitudes desde Inicio
- **Esperado:** aceptar/rechazar sigue funcionando; al aceptar se recarga el resumen

---

### TC-ALU — Alumnos (directorio, alta, detalle)

#### TC-ALU-01 — Directorio por RLS · **Smoke** · ✅ verificado (2026-09-23)
- **Rol:** profesor
- **Esperado:** "Mis alumnos" lista **solo** sus alumnos directos (`maestro_id = auth.uid()`); sin alumnos → CTA de alta

#### TC-ALU-02 — Alta de alumno · **Smoke** · ✅ verificado (2026-09-23)
- **Pasos:** Instructor → "Alta de alumno" → completar obligatorios (nombre, DNI, nacimiento, peso, género, grado)
- **Esperado:** se crea la ficha con `maestro_id` = profesor; aparece en el directorio

#### TC-ALU-03 — DNI duplicado en alta · ✅ verificado (2026-09-23)
- **Esperado:** bloqueado con "El DNI ya está registrado."

#### TC-ALU-04 — Opcionales del alta · ✅ verificado (2026-09-23)
- **Esperado:** altura, teléfono y datos de salud son opcionales; vacíos quedan `null`. El **contacto de emergencia (nombre + teléfono) es obligatorio**

#### TC-ALU-05 — Etiquetas de grado por color · **Smoke** · ✅ verificado (2026-09-23)
- **Esperado:** "Blanco", "Amarillo punta verde", …, "Dan I"…"Dan IX" (sin "Gup") en listado, detalle y chips

#### TC-ALU-06 — Detalle solo lectura · ✅ verificado (2026-09-23)
- **Esperado:** muestra la ficha completa; no permite editar desde ahí

#### TC-ALU-07 — Alumno sin cuenta
- **Esperado:** `profiles.id` del alumno **no** referencia `auth.users` (no tiene login)

#### TC-ALU-08 — Deep link sin faceta
- **Esperado:** `/instructor/alumnos` o `/instructor/alta-alumno` → redirect a Inicio

#### TC-ALU-09 — Contacto de emergencia obligatorio en el alta · ✅ verificado (2026-09-23)
- **Pasos:** intentar guardar el alumno sin contacto de emergencia o con un teléfono inválido; y llamar directo al RPC `alta_alumno` sin los campos
- **Esperado:** error inline en la app y **rechazo del RPC** (`Contacto de emergencia: nombre/teléfono inválido.`). Si el **nombre** tiene caracteres no permitidos (p. ej. dígitos), el mensaje inline es **“El nombre del contacto solo puede tener letras, espacios, puntos y guiones.”** (distinto del de campo vacío)
- **Referencia:** `planes/mobile-contacto-emergencia-obligatorio.md`

---

### TC-GRU — Grupos y horarios

#### TC-GRU-01 — Crear grupo · **Smoke**
- **Pasos:** Instructor → "Grupos y horarios" → "+ Nuevo grupo" → nombre + horarios + locación
- **Esperado:** se crea y aparece en el listado

#### TC-GRU-02 — Horarios estructurados
- **Esperado:** día (1-7) + hora inicio/fin; valida **fin posterior al inicio**; no hay texto libre

#### TC-GRU-03 — Locación obligatoria
- **Esperado:** sin elegir locación no deja guardar

#### TC-GRU-04 — Alta rápida de locación desde el grupo
- **Esperado:** si no hay locaciones, ofrece registrarla sin salir del flujo

#### TC-GRU-05 — Asignar alumnos · ✅ verificado (2026-09-23)
- **Pasos:** detalle del grupo → marcar alumnos → "Guardar miembros"
- **Esperado:** quedan miembros `activo`

#### TC-GRU-06 — Un alumno = un grupo · **Smoke** · ✅ verificado (2026-09-23)
- **Pasos:** intentar asignar a un alumno que ya está en otro grupo
- **Esperado:** **no aparece** en la lista de asignables (la UI lo oculta) y el RPC **rechaza** la llamada directa
- **Referencia:** `planes/mobile-asignacion-alumno-un-grupo.md`

#### TC-GRU-07 — Baja de un alumno del grupo · ✅ verificado (2026-09-23)
- **Esperado:** desmarcarlo + guardar lo saca del grupo; vuelve a estar disponible como libre

#### TC-GRU-08 — Editar grupo · **Smoke**
- **Pasos:** detalle del grupo → "Editar" → cambiar nombre/locación/horarios → Guardar cambios
- **Esperado:** al volver, el detalle refleja los cambios **sin reiniciar la app**

#### TC-GRU-09 — Reasignar locación
- **Esperado:** el grupo aparece en el detalle de la **nueva** locación y desaparece de la anterior

#### TC-GRU-10 — Index único de membresía
- **Esperado:** nunca hay dos membresías `activo` para el mismo alumno (`miembros_grupo_un_grupo_activo_idx`)

---

### TC-LOC — Locaciones

#### TC-LOC-01 — Alta de locación · **Smoke** · ✅ verificado (2026-09-24)
- **Pasos:** Instructor → "Locaciones" → "+ Nueva locación" → nombre, dirección y **valor de alquiler pactado**
- **Esperado:** se guarda y aparece en el listado con el monto

#### TC-LOC-02 — Validaciones · ✅ verificado (2026-09-24)
- **Esperado:** nombre, dirección y monto son obligatorios; el monto debe ser > 0

#### TC-LOC-03 — Editar locación · ✅ verificado (2026-09-24)
- **Esperado:** permite cambiar nombre, dirección y **valor pactado**; se refleja al volver al detalle

#### TC-LOC-04 — Detalle con grupos asociados · ✅ verificado (2026-09-24)
- **Esperado:** muestra los grupos que usan la locación; cada uno navegable

#### TC-LOC-05 — Bloqueo de borrado · **Smoke** · ✅ verificado (2026-09-24)
- **Precondición:** locación con grupos asociados
- **Esperado:** el botón "Eliminar locación" se ve deshabilitado pero **responde al toque** con una **alerta explicativa** (cuántos grupos hay y que hay que reasignarlos); el RPC `eliminar_locacion_segura` también rechaza
- **Referencia:** `planes/mobile-editar-grupo-locacion.md`

#### TC-LOC-06 — Borrado permitido · ✅ verificado (2026-09-24)
- **Precondición:** locación **sin** grupos
- **Esperado:** se elimina correctamente

#### TC-LOC-07 — Ningún grupo en cascada
- **Esperado:** al eliminar una locación, los grupos **no** se borran (`on delete set null`)

#### TC-LOC-08 — Valor pactado vs. monto pagado
- **Esperado:** el detalle distingue el **valor pactado** del contrato del **monto pagado** por periodo

---

### TC-CLA — Clases

#### TC-CLA-01 — Crear clase · **Smoke** · ✅ verificado (2026-09-24)
- **Pasos:** "Toma de asistencia" → "+ Nueva clase" → grupo, fecha, hora inicio/fin, **objetivo (1–2 elementos del ciclo ITF, modal)**, detalle opcional
- **Esperado:** se crea y aparece en el listado

#### TC-CLA-02 — Campos obligatorios · ✅ verificado (2026-09-24)
- **Esperado:** sin **al menos un objetivo** no deja guardar

#### TC-CLA-03 — Horario válido · ✅ verificado (2026-09-24)
- **Esperado:** `hora_fin` debe ser posterior a `hora_inicio` (formato HH:mm)

#### TC-CLA-04 — Badge "Hoy" · ✅ verificado (2026-09-24)
- **Esperado:** la clase de la fecha actual se marca con el badge **"Hoy"**

#### TC-CLA-05 — Detalle de la clase · ✅ verificado (2026-09-24)
- **Esperado:** ficha técnica completa (muestra los **elementos del objetivo** y, si hay, los **Detalles**) + botón "Tomar asistencia" + "Ver grupo"

#### TC-CLA-06 — Clases por grupo · ✅ verificado (2026-09-24)
- **Esperado:** el filtro por grupo muestra solo las clases de ese grupo

#### TC-CLA-07 — Tope de 2 objetivos · ✅ verificado (2026-09-24)
- **Pasos:** en el modal de objetivos, elegir 2 y tocar un tercero
- **Esperado:** aviso **"Podés elegir hasta 2 objetivos."** y **no** se agrega; se pueden destildar
- **Referencia:** `planes/mobile-objetivo-clase-elementos.md`

---

### TC-ASI — Control de asistencia

#### TC-ASI-01 — Toma de asistencia · **Smoke** · ✅ verificado (2026-09-24)
- **Pasos:** detalle de clase → "Tomar asistencia"
- **Esperado:** lista **solo** los alumnos activos del grupo; arranca con **todos Presente**

#### TC-ASI-02 — Marcado de un toque · ✅ verificado (2026-09-24)
- **Esperado:** un toque alterna Presente ↔ Ausente; los contadores se actualizan en vivo

#### TC-ASI-03 — Todos presentes / ausentes · ✅ verificado (2026-09-24)
- **Esperado:** marcan el conjunto completo de una vez

#### TC-ASI-04 — Guardado atómico · **Smoke** · ✅ verificado (2026-09-24)
- **Pasos:** marcar y "Guardar asistencia" → reabrir la clase
- **Esperado:** se refleja lo guardado (todo o nada)

#### TC-ASI-05 — RLS de asistencia
- **Esperado:** otro profesor **no** lee ni registra asistencia de clases ajenas

#### TC-ASI-06 — Fail gracefully
- **Esperado:** red cortada al guardar → banner genérico + fila en `errores_runtime` (`modulo='asistencia'`)

---

### TC-OBJ — Objetivos de clase (distribución)

#### TC-OBJ-01 — Distribución por elemento · **Smoke** · ✅ verificado (2026-09-24)
- **Rol:** profesor con clases cargadas
- **Pasos:** Instructor → "Objetivos de clase"
- **Esperado:** barras por cada uno de los 5 elementos con `N clases · X%`; el **% se calcula sobre menciones** y los cinco **suman 100%**
- **Referencia:** `planes/mobile-objetivo-clase-elementos.md`

#### TC-OBJ-02 — Filtro de período · ✅ verificado (2026-09-24)
- **Pasos:** alternar **Mes actual / Últimos 3 meses / Todo**
- **Esperado:** el conteo y los % cambian según las clases del período; una clase fuera del rango no se cuenta

#### TC-OBJ-03 — Filtro de grupo · ✅ verificado (2026-09-24)
- **Pasos:** elegir un grupo puntual (y "Todos")
- **Esperado:** solo se consideran las clases de ese grupo

#### TC-OBJ-04 — Sin clases
- **Esperado:** si no hay clases en el período → mensaje guía (no error)

#### TC-OBJ-05 — Aislamiento (RLS)
- **Esperado:** otro profesor **no** ve clases propias ni sus objetivos (solo las suyas)

#### TC-OBJ-06 — Refresco al volver · ✅ verificado (2026-09-24)
- **Pasos:** crear una clase nueva con otro objetivo → volver a "Objetivos de clase"
- **Esperado:** la distribución se actualiza **sin reiniciar** (`useFocusEffect`)

#### TC-OBJ-07 — Fail gracefully
- **Esperado:** con red cortada, la vista muestra el mensaje de error + "Reintentar", sin romperse

---

### TC-CUO — Cuotas de alumnos

#### TC-CUO-01 — Registrar cuota · **Smoke**
- **Pasos:** alumno → sección "Cuotas" → "+ Registrar cuota" → **periodo (selector de mes)**, monto, **fecha de pago (date-picker, no futura)**
- **Esperado:** aparece en el historial y el mes pasa a **"Pagado"**

#### TC-CUO-02 — Bloqueo de duplicado · **Smoke**
- **Precondición:** el alumno ya tiene cuota del periodo
- **Esperado:** mensaje **"Ya registraste un pago para ese periodo."**; **sin** fila duplicada
- **Referencia:** `planes/mobile-cuotas-alumnos.md`

#### TC-CUO-03 — Estado del mes
- **Esperado:** el detalle del alumno muestra Pagado/Pendiente del mes actual

#### TC-CUO-04 — Cobranzas por periodo
- **Pasos:** Instructor → "Cuotas de alumnos" → elegir periodo
- **Esperado:** lista alumnos directos con badge Pagado/Pendiente y el resumen "X de Y"

#### TC-CUO-05 — Aislamiento entre profesores
- **Esperado:** un profesor **no** ve cuotas de alumnos ajenos

#### TC-CUO-06 — Eliminar cuota
- **Esperado:** desaparece del historial y el mes vuelve a "Pendiente"

#### TC-CUO-07 — Periodo ≠ fecha
- **Esperado:** con el **selector de mes** se puede elegir un periodo anterior y con el **date-picker**
  una fecha de pago distinta (el periodo y la fecha pueden diferir)

---

### TC-ALQ — Pagos de alquiler y comprobantes

#### TC-ALQ-01 — Registrar pago · **Smoke**
- **Pasos:** detalle de locación → "+ Registrar pago" → **periodo (selector de mes)**, monto, **fecha de pago (date-picker, no futura)**
- **Esperado:** aparece en el historial con periodo formateado y monto

#### TC-ALQ-02 — Comprobante desde cámara/galería
- **Esperado:** sube la imagen al bucket **privado** y queda asociada al pago

#### TC-ALQ-03 — Comprobante PDF
- **Esperado:** sube el PDF y se puede abrir

#### TC-ALQ-04 — Enlace firmado · **Smoke**
- **Pasos:** tocar "Comprobante"
- **Esperado:** se abre con el visor del sistema mediante un **enlace firmado temporal** (1 h); no hay URL pública

#### TC-ALQ-05 — Duplicado de periodo
- **Esperado:** bloqueado por el índice único `(locacion_id, periodo)` con mensaje amigable

#### TC-ALQ-06 — RLS: auditoría del superior
- **Rol:** superior jerárquico del dueño
- **Esperado:** **ve** los pagos y **puede abrir** el comprobante del subordinado (SRS §2)

#### TC-ALQ-07 — RLS: aislamiento
- **Rol:** usuario sin relación de linaje
- **Esperado:** **no** ve los pagos y el enlace firmado **falla**

#### TC-ALQ-08 — RLS: escritura
- **Esperado:** solo el dueño sube/borra el archivo (`owner = auth.uid()`) y edita el pago

#### TC-ALQ-09 — Sin huérfanos
- **Esperado:** al borrar un pago se elimina también el archivo del bucket; si el insert falla tras subir, el archivo se limpia

---

### TC-AUD — Auditoría en cascada (Maestro)

#### TC-AUD-01 — Listado de la rama · **Smoke** · ✅ verificado (2026-09-24)
- **Rol:** Maestro
- **Esperado:** ve locaciones de **toda su rama** con **dueño** y valor pactado

#### TC-AUD-02 — Estados de pago · ✅ verificado (2026-09-24)
- **Esperado:** "Al día" / "Vencida · N meses" / "Sin pagos", derivados del último periodo pagado

#### TC-AUD-03 — Recursividad · **Smoke** · ✅ verificado (2026-09-24)
- **Rol:** Maestro (nivel 0)
- **Esperado:** ve las locaciones de **Sensei Seed (nivel 2)**, no solo las de su subordinado directo
- **Referencia:** `planes/mobile-auditoria-cascada.md`

#### TC-AUD-04 — Filtro por rama · ✅ verificado (2026-09-24)
- **Esperado:** al elegir un **subordinado directo**, se ven **todas** las locaciones de su **rama** (las propias y las de sus descendientes)

#### TC-AUD-05 — Detalle auditado · ✅ verificado (2026-09-24)
- **Esperado:** historial de pagos + comprobante (enlace firmado); **solo lectura**; el dueño se muestra como **“De su rama”** si no es legible

#### TC-AUD-08 — Agrupamiento por rama · ✅ verificado (2026-09-24)
- **Pasos:** abrir la auditoría con una rama que tenga un sub-instructor (Jhona → Sensei)
- **Esperado:** un **bloque por subordinado directo**; las locaciones de descendientes indirectos van **dentro de ese bloque**, marcadas **“De su rama”** y **sin** nombre; **no** aparece el literal “Instructor”
- **Referencia:** `planes/mobile-auditoria-rama-agrupada.md`

#### TC-AUD-06 — Aislamiento
- **Esperado:** un usuario ajeno **no** ve nada

#### TC-AUD-07 — Privacidad
- **Esperado:** **no** se exponen datos personales de alumnos (solo infraestructura)

---

### TC-MES — Mesas de examen (Maestro)

#### TC-MES-01 — Crear mesa · **Smoke** · ✅ verificado (2026-09-24)
- **Pasos:** Maestro → "Mesas de examen" → "+ Nueva mesa" → **fecha (date-picker)** + lugar
- **Esperado:** queda en estado **"Abierta"**

#### TC-MES-02 — Lugar desde locaciones · ✅ verificado (2026-09-24)
- **Esperado:** chips con las locaciones propias

#### TC-MES-03 — "+ Otro lugar" · ✅ verificado (2026-09-24)
- **Esperado:** permite escribir un lugar libre y se guarda en `lugar`

#### TC-MES-04 — Listado · ✅ verificado (2026-09-24)
- **Esperado:** fecha, lugar, badge de estado y cantidad de postulados; las propias primero

#### TC-MES-05 — Editar mesa · ✅ verificado (2026-09-24)
- **Esperado:** cambia fecha/lugar y se refleja al volver

#### TC-MES-06 — Cerrar y finalizar · ✅ verificado (2026-09-24)
- **Esperado:** Abierta → "Cerrar mesa" → Cerrada → "Finalizar mesa"

#### TC-MES-07 — Gate de Maestro · **Smoke**
- **Esperado:** un usuario sin `es_maestro` **no** ve la pestaña ni puede crear mesas

#### TC-MES-08 — Mesa ajena (visibilidad por jerarquía) · ✅ verificado (2026-09-24)
- **Precondición:** el visor **no** es el dueño, pero es **subordinado directo** del dueño
- **Esperado:** el detalle muestra **"Esta mesa pertenece a {nombre del maestro dueño}: solo podés
  consultarla."** (sin editar/cerrar). El **listado** muestra `Mesa de {nombre}` en las mesas ajenas
  (y "Tu mesa" en las propias). El **profesor** ve `Mesa de {nombre}` en el listado y en el detalle
- **Referencia:** `planes/mobile-mesas-visibilidad-jerarquia.md`, `planes/mobile-mesas-dueno-nombre.md`

#### TC-MES-09 — Sin límite de inscripción · ✅ verificado (2026-09-24)
- **Esperado:** el formulario **no** pide límite y la tabla ya no tiene la columna

#### TC-MES-10 — Fecha con selector de fecha · ✅ verificado (2026-09-24)
- **Pasos:** en "+ Nueva mesa", tocar el campo "Fecha"
- **Esperado:** abre el **date-picker** (no se escribe texto libre); se puede elegir **cualquier
  fecha** (sin límite de rango), pasada o futura
- **Referencia:** `planes/mobile-date-picker-campos-fecha.md`

#### TC-MES-12 — Visibilidad solo para directos · ✅ verificado (2026-09-24)
- **Pasos:** iniciar sesión con un **descendiente indirecto** (ej. `sensei@taekwondo.test`, hijo de
  Jhona) y listar mesas; y con un **superior** ver las mesas de sus subordinados
- **Esperado:** el nieto ve **0 mesas** (no ve las del abuelo); el superior **no** ve las mesas de sus
  subordinados (Jhonatan no ve la de `maestro2@`). El dueño ve las suyas y sus **subordinados directos**
  ven las del dueño
- **Referencia:** `planes/mobile-mesas-visibilidad-jerarquia.md`

---

### TC-POS — Postulación a examen (Profesor)

#### TC-POS-01 — Mesas abiertas · **Smoke** · ✅ verificado (2026-09-24)
- **Rol:** profesor
- **Esperado:** el listado muestra **solo** mesas abiertas **de su superior directo** (o propias); no
  aparecen mesas de otras ramas ni de descendientes indirectos

#### TC-POS-02 — Grado aspirado · **Smoke** · ✅ verificado (2026-09-24)
- **Esperado:** cada alumno muestra `grado actual → grado aspirado` (el inmediato superior)

#### TC-POS-03 — Postular con derecho de examen · ✅ verificado (2026-09-24)
- **Esperado:** aparece en "Tus postulaciones" con el monto y estado "Postulado"

#### TC-POS-04 — Duplicado · **Smoke** · ✅ verificado (2026-09-24)
- **Esperado:** postular al mismo alumno otra vez en la misma mesa → mensaje claro y **sin** fila duplicada

#### TC-POS-05 — Grado máximo · ✅ verificado (2026-09-24)
- **Precondición:** alumno en `dan_9`
- **Esperado:** deshabilitado con "Ya alcanzó el grado máximo"

#### TC-POS-06 — Mesa cerrada
- **Esperado:** con la mesa cerrada, el profesor **no** puede postular ni editar el cobro

#### TC-POS-07 — Alumno ajeno
- **Esperado:** no aparece en la lista de candidatos del profesor

#### TC-POS-08 — Recaudación del Maestro · **Smoke**
- **Rol:** Maestro dueño de la mesa
- **Esperado:** ve la **recaudación total** (suma de derechos) + cobrados/pendientes + detalle de postulaciones (SRS §3.7)

#### TC-POS-09 — Editar cobro y quitar
- **Esperado:** "Editar cobro" actualiza el monto (y la recaudación); "Quitar" saca la postulación

#### TC-POS-10 — Postular fuera de jerarquía
- **Rol:** profesor
- **Pasos:** un profesor que **no** es dueño ni subordinado directo del dueño de la mesa intenta
  postular (por RPC/API, salteando la UI)
- **Esperado:** excepción **"Solo podés postular en las mesas de tu superior directo."**; **sin** fila
  en `postulaciones_examen`
- **Referencia:** `planes/mobile-mesas-visibilidad-jerarquia.md`

---

### TC-EVA — Planilla técnica y evaluación (Maestro)

#### TC-EVA-01 — Abrir planilla con mesa cerrada · **Smoke**
- **Rol:** Maestro dueño de la mesa
- **Esperado:** ve cada postulado con **nombre, edad, peso** y `grado actual → aspirado`

#### TC-EVA-02 — Mesa abierta · ✅ verificado (2026-09-24)
- **Esperado:** el botón está deshabilitado con la nota "Cerrá la mesa para poder evaluar"; al presionarlo ofrece cerrarla

#### TC-EVA-03 — Aprobar · **Smoke**
- **Pasos:** cargar **Aprobado** → confirmar
- **Esperado:** asciende el `grado_actual` del alumno (verificable en su detalle) y registra la fila en `graduaciones`

#### TC-EVA-04 — Desaprobar / Ausente
- **Esperado:** **no** cambian el grado del alumno

#### TC-EVA-05 — Mención especial
- **Pasos:** marcar la casilla + Aprobado
- **Esperado:** desenlace "Aprobado · Mención especial" y `graduaciones.mencion_especial = true`; el grado sube **un** nivel

#### TC-EVA-06 — Doble graduación
- **Precondición:** alumno entre `blanco` y `azul_punta_roja`
- **Esperado:** el grado sube **dos** niveles y `graduaciones.promocion_doble = true`

#### TC-EVA-07 — Límite de doble graduación
- **Precondición:** alumno `rojo`, `rojo_punta_negra` o dan
- **Esperado:** el botón **no** aparece (máximo: mención especial)

#### TC-EVA-08 — Doble + mención
- **Esperado:** se pueden combinar; el badge muestra ambos

#### TC-EVA-09 — Grado otorgado
- **Esperado:** tras evaluar, "Aspira a" pasa a mostrar **"Grado otorgado"** con el grado real (en doble, el +2)

#### TC-EVA-10 — Irreversibilidad
- **Esperado:** una postulación evaluada muestra badge y **no** permite volver a cargar (el RPC rechaza)

#### TC-EVA-11 — Mesa ajena
- **Esperado:** solo mensaje de **solo lectura**, sin datos técnicos

#### TC-EVA-12 — Resumen "Evaluados X de Y"
- **Esperado:** se actualiza tras cada resultado **sin reiniciar** la app

---

### TC-DASH — Dashboard de métricas anonimizadas (Maestro)

#### TC-DASH-01 — Vista consolidada · **Smoke**
- **Rol:** Maestro (raíz del árbol)
- **Pasos:** Inicio → pestaña Maestro → "Estadísticas anonimizadas"
- **Esperado:** chip "Toda mi rama" activo; tarjeta con el **total** de descendientes y los 3 gráficos (género, rango de edad, grado). El total coincide con el RPC `metricas_dashboard('consolidada')`

#### TC-DASH-02 — Vista específica por instructor
- **Pasos:** con un Maestro/Profesor con subordinados, tocar el chip de un instructor
- **Esperado:** los conteos cambian a los de **solo esa rama**; coincide con `metricas_dashboard('especifica', p_instructor)`

#### TC-DASH-03 — Rama sin descendientes
- **Precondición:** usuario sin alumnos ni instructores por debajo
- **Esperado:** estado vacío "No hay integrantes en tu rama descendente." (sin gráficos ni errores)

#### TC-DASH-04 — Cambiar filtro refresca sin reiniciar
- **Esperado:** alternar entre "Toda mi rama" e instructores actualiza total y gráficos en el momento

#### TC-DASH-05 — Distribución por género
- **Esperado:** la dona muestra Masculino / Femenino / Otro con conteo y porcentaje; la suma coincide con los perfiles con género cargado

#### TC-DASH-06 — Distribución por rango de edad
- **Esperado:** 6 barras (`0 a 7`, `8 a 11`, `12 a 14`, `15 a 17`, `18 a 30`, **Mayores de 30**); la última corresponde al bucket `30+` del RPC (31+)

#### TC-DASH-07 — Distribución por grado
- **Esperado:** barras en el **orden del enum** `grado`, con etiquetas de color / "Dan I…IX"; **no** se listan grados sin integrantes

#### TC-DASH-08 — Privacidad, autorización y fail gracefully · **Smoke**
- **Pasos:** (1) verificar que la pantalla **no** muestra nombres ni datos personales; (2) forzar un `p_instructor` ajeno (no autorizado) y cortar la red
- **Esperado:** nunca se exponen datos personales; el RPC rechaza la vista específica ajena; con red cortada aparece mensaje genérico + **Reintentar**, sin excepciones crudas

---

## 4. Matriz de roles y RLS

Pruebas de seguridad que cruzan varios módulos. Se ejecutan con las **tres cuentas del seed**.

| Recurso | Maestro (nivel 0) | Profesor directo | Profesor ajeno |
|---|---|---|---|
| Perfil propio | ✅ | ✅ | ✅ |
| Alumnos directos | ✅ (los suyos) | ✅ | ❌ |
| Datos personales de alumnos de subordinados | ❌ (solo métricas) | ❌ | ❌ |
| Cuotas | ❌ | ✅ (sus alumnos) | ❌ |
| Locaciones propias | ✅ | ✅ | ❌ |
| Locaciones de la rama (auditoría) | ✅ | ❌ | ❌ |
| Pagos de alquiler de subordinados | ✅ (auditoría) | ❌ | ❌ |
| Comprobantes de subordinados | ✅ (auditoría) | ❌ | ❌ |
| Mesas de examen (crear) | ✅ | ❌ | ❌ |
| Postular | ❌ | ✅ (sus alumnos) | ❌ |
| Planilla de evaluación | ✅ (su mesa) | ❌ | ❌ |
| `metricas_dashboard` | ✅ (rama) | ❌ | ❌ |

#### TC-RLS-01 — Recursividad de la auditoría · **Smoke**
- **Pasos:** con Jhonatan (nivel 0), verificar que ve las locaciones de **Sensei Seed (nivel 2)**
- **Esperado:** sí las ve (el helper `es_subordinado_de` es recursivo)

#### TC-RLS-02 — Aislamiento horizontal
- **Pasos:** con un profesor, intentar ver datos de alumnos/locaciones de otro profesor
- **Esperado:** no aparecen; los enlaces firmados fallan

#### TC-RLS-03 — Escritura restringida
- **Esperado:** ningún rol puede escribir fuera de lo permitido (probar al menos un INSERT directo a la API)

#### TC-RLS-04 — Gates anti-escalada
- **Esperado:** `es_profesor`, `es_maestro` y `grado_actual` no se pueden cambiar desde la app (solo vía RPC/servicio)

---

## 5. Resiliencia (fail gracefully)

#### TC-ERR-01 — Red cortada en cada módulo · **Smoke**
- **Pasos:** con la red cortada, entrar a: alumnos, grupos, locaciones, clases, asistencia, cuotas, alquileres, auditoría, mesas, planilla
- **Esperado:** siempre mensaje genérico + opción de reintentar; **nunca** excepciones crudas, stack traces ni datos técnicos

#### TC-ERR-02 — Registro de errores
- **Esperado:** los fallos inesperados quedan en `errores_runtime` con su `modulo` (verificable con query a la BD)

#### TC-ERR-03 — Guardado con red cortada
- **Esperado:** el botón no queda colgado; se informa el fallo y se puede reintentar

---

## 6. Smoke test (verificación rápida)

Subconjunto para correr antes de dar por cerrado cualquier cambio. Si alguno falla, **detener**.

1. `TC-AUTH-03` Inicio de sesión correcto
2. `TC-AUTH-02` Email duplicado
3. `TC-AUTH-09` Mostrar/ocultar contraseña
4. `TC-ONB-01` Onboarding obligatorio
5. `TC-LIN-01` Solicitud de linaje
6. `TC-NAV-01` Tabs por facetas
7. `TC-INI-01` Panel de Inicio con datos
8. `TC-INI-04` Refresco sin reiniciar
9. `TC-ALU-01` Directorio por RLS
10. `TC-ALU-02` Alta de alumno
11. `TC-GRU-06` Un alumno = un grupo
12. `TC-LOC-05` Bloqueo de borrado de locación
13. `TC-CLA-01` Crear clase
14. `TC-ASI-04` Guardado atómico de asistencia
15. `TC-CUO-02` Bloqueo de cuota duplicada
16. `TC-ALQ-04` Enlace firmado del comprobante
17. `TC-AUD-01` Auditoría de la rama
18. `TC-MES-01` Crear mesa (abierta)
19. `TC-POS-02` Grado aspirado calculado
20. `TC-POS-08` Recaudación del Maestro
21. `TC-EVA-03` Aprobar y ascender
22. `TC-RLS-01` Recursividad de la auditoría
23. `TC-ERR-01` Fail gracefully
24. `TC-DASH-01` Dashboard en vista consolidada
25. `TC-DASH-08` Privacidad y fail gracefully del dashboard

---

## 7. Pendientes de cobertura

- **Reasignación explícita de alumno de grupo:** pendiente de diseño (ver `pendientes-pruebas.md` #12).
- **Torneos:** congelados; **no se cubren**.

---
🐧
