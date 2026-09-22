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
- **Versión:** 1.1
- **Estado:** Vigente
- **Fecha:** 2026-09-22
- **Cobertura:** 137 casos en 19 módulos (42 marcados Smoke)

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Creación inicial: catálogo de casos por módulo (auth, onboarding, linaje, navegación, inicio, alumnos, grupos, locaciones, clases, asistencia, cuotas, alquileres, auditoría, mesas, postulación, evaluación), matriz de roles/RLS, resiliencia y smoke test. |
| 1.1 | 2026-09-22 | Fase 8.1: nuevo módulo **TC-DASH** (dashboard de métricas anonimizadas) con 8 casos (2 Smoke) y dos entradas al smoke test; se quita el pendiente de Fase 8. |

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

Escenario creado por el seed (`planes/db-seed-auditoria.md` y `planes/db-seed-alumnos.md`).

| Cuenta | Rol | Uso |
|---|---|---|
| `jhonatancallegaleano@gmail.com` | **Maestro** (raíz del árbol) | Mesas, auditoría, evaluación |
| `seed-jhona@taekwondo.test` / `Seed123456!` | **Profesor** (nivel 1) | Gestión diaria, cuotas, postulación |
| `seed-sensei@taekwondo.test` / `Seed123456!` | **Profesor** (nivel 2, nieto) | Probar **recursividad** de la auditoría |

**Datos del seed:**

| Locación | Dueño | Estado de pago |
|---|---|---|
| Banda Norte | Jhonatan | Al día (2026-09) |
| Seed Dojang Jhona A | Profesor Jhona | Vencida (2026-07) |
| Seed Dojang Jhona B | Profesor Jhona | Sin pagos |
| Seed Dojang Sensei | Sensei Seed | Vencida (2026-08) |

Además: 6 alumnos de Sensei Seed (`Alumno Seed *`), grupos con locación y algunos pagos.

> **Nota:** el seed es **aditivo e idempotente**; se puede re-ejecutar con
> `npx supabase db query --linked -f supabase/seed-auditoria.sql`.

---

## 3. Casos por módulo

### TC-AUTH — Acceso (registro, login, recuperación, guards)

#### TC-AUTH-01 — Registro de cuenta nueva · **Smoke**
- **Rol:** anónimo
- **Pasos:** abrir la app → "Crear cuenta" → email nuevo + contraseña válida → Continuar
- **Esperado:** se crea la cuenta; queda pendiente de confirmación o entra según la config de Supabase; **no** se accede a la app principal sin completar el onboarding
- **Referencia:** `planes/mobile-flujo-acceso-auth.md`

#### TC-AUTH-02 — Registro con email ya existente · **Smoke**
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

---

### TC-ONB — Onboarding y perfil

#### TC-ONB-01 — Onboarding obligatorio · **Smoke**
- **Rol:** cuenta nueva con perfil incompleto
- **Esperado:** cae en `/onboarding` y **no** puede entrar a la app principal hasta completarlo

#### TC-ONB-02 — Validaciones del formulario
- **Pasos:** intentar guardar con campos vacíos / fecha futura / edad < 4
- **Esperado:** errores **inline por campo**; no deja guardar

#### TC-ONB-03 — DNI duplicado · **Smoke**
- **Precondición:** un DNI ya registrado
- **Esperado:** "El DNI ya está registrado." (pre-chequeo del RPC y/o `23505`)

#### TC-ONB-04 — Campos complementarios opcionales
- **Pasos:** completar solo los obligatorios (nombre, DNI, nacimiento, peso, género)
- **Esperado:** deja finalizar; altura, teléfono, contacto de emergencia y datos de salud quedan `null`

#### TC-ONB-05 — Edad calculada
- **Esperado:** al elegir la fecha de nacimiento se muestra la edad cronológica correcta

---

### TC-LIN — Linaje y solicitudes

#### TC-LIN-01 — Solicitud de linaje · **Smoke**
- **Rol:** usuario staff nuevo sin `maestro_id`
- **Pasos:** onboarding → elegir instructor de la lista → enviar
- **Esperado:** queda solicitud **pendiente**; `maestro_id` sigue `null`; en Inicio aparece el aviso "Tu instructor todavía no confirmó tu registro"

#### TC-LIN-02 — Aceptar solicitud
- **Rol:** instructor (con `es_profesor` o `es_maestro`)
- **Pasos:** Inicio → "Solicitudes de alumnos" → **Aceptar**
- **Esperado:** `maestro_id` se persiste (única vez); el aviso del alumno desaparece al refrescar

#### TC-LIN-03 — Rechazar solicitud
- **Esperado:** el alumno vuelve al onboarding (datos prellenados) a elegir de nuevo; la solicitud queda `rechazada`

#### TC-LIN-04 — Linaje inamovible
- **Pasos:** revisar que la UI no expone forma de cambiar `maestro_id`
- **Esperado:** el trigger `bloquear_auto_cambio_maestro` lo impide también a nivel BD

#### TC-LIN-05 — Maestro raíz
- **Rol:** usuario con `es_maestro`
- **Esperado:** completa el onboarding **sin** elegir instructor

#### TC-LIN-06 — Lista de instructores vacía
- **Esperado:** aviso bloqueante; al conferir un instructor, aparece y permite completar

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

---

### TC-INI — Inicio (panel operativo)

#### TC-INI-01 — Panel con datos · **Smoke**
- **Rol:** profesor con linaje confirmado y alumnos
- **Esperado:** saludo con el **nombre**, tarjetas de resumen (alumnos, grupos, cuotas pendientes, clases sin asistencia) y acciones rápidas. **No** se ve vacío

#### TC-INI-02 — Cuotas pendientes
- **Esperado:** la tarjeta muestra `pendientes/total` del mes; en rojo si hay pendientes; al tocarla abre "Cuotas de alumnos"

#### TC-INI-03 — Clases sin asistencia (7 días)
- **Pasos:** tomar asistencia de una clase reciente → volver al Inicio
- **Esperado:** el contador **baja** (valida el filtro de 7 días y el `useFocusEffect`)

#### TC-INI-04 — Refresco sin reiniciar · **Smoke**
- **Pasos:** registrar una cuota → volver al Inicio
- **Esperado:** el contador se actualiza **sin reiniciar la app**

#### TC-INI-05 — Resumen del Maestro
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

#### TC-ALU-01 — Directorio por RLS · **Smoke**
- **Rol:** profesor
- **Esperado:** "Mis alumnos" lista **solo** sus alumnos directos (`maestro_id = auth.uid()`); sin alumnos → CTA de alta

#### TC-ALU-02 — Alta de alumno · **Smoke**
- **Pasos:** Instructor → "Alta de alumno" → completar obligatorios (nombre, DNI, nacimiento, peso, género, grado)
- **Esperado:** se crea la ficha con `maestro_id` = profesor; aparece en el directorio

#### TC-ALU-03 — DNI duplicado en alta
- **Esperado:** bloqueado con "El DNI ya está registrado."

#### TC-ALU-04 — Opcionales del alta
- **Esperado:** altura, teléfono, contacto de emergencia y datos de salud son opcionales; vacíos quedan `null`

#### TC-ALU-05 — Etiquetas de grado por color · **Smoke**
- **Esperado:** "Blanco", "Amarillo punta verde", …, "Dan I"…"Dan IX" (sin "Gup") en listado, detalle y chips

#### TC-ALU-06 — Detalle solo lectura
- **Esperado:** muestra la ficha completa; no permite editar desde ahí

#### TC-ALU-07 — Alumno sin cuenta
- **Esperado:** `profiles.id` del alumno **no** referencia `auth.users` (no tiene login)

#### TC-ALU-08 — Deep link sin faceta
- **Esperado:** `/instructor/alumnos` o `/instructor/alta-alumno` → redirect a Inicio

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

#### TC-GRU-05 — Asignar alumnos
- **Pasos:** detalle del grupo → marcar alumnos → "Guardar miembros"
- **Esperado:** quedan miembros `activo`

#### TC-GRU-06 — Un alumno = un grupo · **Smoke**
- **Pasos:** intentar asignar a un alumno que ya está en otro grupo
- **Esperado:** **no aparece** en la lista de asignables (la UI lo oculta) y el RPC **rechaza** la llamada directa
- **Referencia:** `planes/mobile-asignacion-alumno-un-grupo.md`

#### TC-GRU-07 — Baja de un alumno del grupo
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

#### TC-LOC-01 — Alta de locación · **Smoke**
- **Pasos:** Instructor → "Locaciones" → "+ Nueva locación" → nombre, dirección y **valor de alquiler pactado**
- **Esperado:** se guarda y aparece en el listado con el monto

#### TC-LOC-02 — Validaciones
- **Esperado:** nombre, dirección y monto son obligatorios; el monto debe ser > 0

#### TC-LOC-03 — Editar locación
- **Esperado:** permite cambiar nombre, dirección y **valor pactado**; se refleja al volver al detalle

#### TC-LOC-04 — Detalle con grupos asociados
- **Esperado:** muestra los grupos que usan la locación; cada uno navegable

#### TC-LOC-05 — Bloqueo de borrado · **Smoke**
- **Precondición:** locación con grupos asociados
- **Esperado:** botón "Eliminar locación" **deshabilitado**, con aviso para reasignar; el RPC `eliminar_locacion_segura` también rechaza

#### TC-LOC-06 — Borrado permitido
- **Precondición:** locación **sin** grupos
- **Esperado:** se elimina correctamente

#### TC-LOC-07 — Ningún grupo en cascada
- **Esperado:** al eliminar una locación, los grupos **no** se borran (`on delete set null`)

#### TC-LOC-08 — Valor pactado vs. monto pagado
- **Esperado:** el detalle distingue el **valor pactado** del contrato del **monto pagado** por periodo

---

### TC-CLA — Clases

#### TC-CLA-01 — Crear clase · **Smoke**
- **Pasos:** "Toma de asistencia" → "+ Nueva clase" → grupo, fecha, hora inicio/fin, objetivo, tuls, preparación física
- **Esperado:** se crea y aparece en el listado

#### TC-CLA-02 — Campos obligatorios
- **Esperado:** sin objetivo/tuls/preparación física no deja guardar

#### TC-CLA-03 — Horario válido
- **Esperado:** `hora_fin` debe ser posterior a `hora_inicio` (formato HH:mm)

#### TC-CLA-04 — Badge "Hoy"
- **Esperado:** la clase de la fecha actual se marca con el badge **"Hoy"**

#### TC-CLA-05 — Detalle de la clase
- **Esperado:** ficha técnica completa + botón "Tomar asistencia" + "Ver grupo"

#### TC-CLA-06 — Clases por grupo
- **Esperado:** el filtro por grupo muestra solo las clases de ese grupo

---

### TC-ASI — Control de asistencia

#### TC-ASI-01 — Toma de asistencia · **Smoke**
- **Pasos:** detalle de clase → "Tomar asistencia"
- **Esperado:** lista **solo** los alumnos activos del grupo; arranca con **todos Presente**

#### TC-ASI-02 — Marcado de un toque
- **Esperado:** un toque alterna Presente ↔ Ausente; los contadores se actualizan en vivo

#### TC-ASI-03 — Todos presentes / ausentes
- **Esperado:** marcan el conjunto completo de una vez

#### TC-ASI-04 — Guardado atómico · **Smoke**
- **Pasos:** marcar y "Guardar asistencia" → reabrir la clase
- **Esperado:** se refleja lo guardado (todo o nada)

#### TC-ASI-05 — RLS de asistencia
- **Esperado:** otro profesor **no** lee ni registra asistencia de clases ajenas

#### TC-ASI-06 — Fail gracefully
- **Esperado:** red cortada al guardar → banner genérico + fila en `errores_runtime` (`modulo='asistencia'`)

---

### TC-CUO — Cuotas de alumnos

#### TC-CUO-01 — Registrar cuota · **Smoke**
- **Pasos:** alumno → sección "Cuotas" → "+ Registrar cuota" → periodo, monto, fecha
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
- **Esperado:** permite cargar un periodo anterior con fecha de pago distinta

---

### TC-ALQ — Pagos de alquiler y comprobantes

#### TC-ALQ-01 — Registrar pago · **Smoke**
- **Pasos:** detalle de locación → "+ Registrar pago" → periodo, monto, fecha
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

#### TC-AUD-01 — Listado de la rama · **Smoke**
- **Rol:** Maestro
- **Esperado:** ve locaciones de **toda su rama** con **dueño** y valor pactado

#### TC-AUD-02 — Estados de pago
- **Esperado:** "Al día" / "Vencida · N meses" / "Sin pagos", derivados del último periodo pagado

#### TC-AUD-03 — Recursividad · **Smoke**
- **Rol:** Maestro (nivel 0)
- **Esperado:** ve las locaciones de **Sensei Seed (nivel 2)**, no solo las de su subordinado directo
- **Referencia:** `planes/mobile-auditoria-cascada.md`

#### TC-AUD-04 — Filtro por instructor
- **Esperado:** al elegir un instructor, solo se ven sus locaciones

#### TC-AUD-05 — Detalle auditado
- **Esperado:** historial de pagos + comprobante (enlace firmado); **solo lectura**

#### TC-AUD-06 — Aislamiento
- **Esperado:** un usuario ajeno **no** ve nada

#### TC-AUD-07 — Privacidad
- **Esperado:** **no** se exponen datos personales de alumnos (solo infraestructura)

---

### TC-MES — Mesas de examen (Maestro)

#### TC-MES-01 — Crear mesa · **Smoke**
- **Pasos:** Maestro → "Mesas de examen" → "+ Nueva mesa" → fecha + lugar
- **Esperado:** queda en estado **"Abierta"**

#### TC-MES-02 — Lugar desde locaciones
- **Esperado:** chips con las locaciones propias

#### TC-MES-03 — "+ Otro lugar"
- **Esperado:** permite escribir un lugar libre y se guarda en `lugar`

#### TC-MES-04 — Listado
- **Esperado:** fecha, lugar, badge de estado y cantidad de postulados; las propias primero

#### TC-MES-05 — Editar mesa
- **Esperado:** cambia fecha/lugar y se refleja al volver

#### TC-MES-06 — Cerrar y finalizar
- **Esperado:** Abierta → "Cerrar mesa" → Cerrada → "Finalizar mesa"

#### TC-MES-07 — Gate de Maestro · **Smoke**
- **Esperado:** un usuario sin `es_maestro` **no** ve la pestaña ni puede crear mesas

#### TC-MES-08 — Mesa ajena
- **Esperado:** se muestra en **solo lectura** (sin editar/cerrar)

#### TC-MES-09 — Sin límite de inscripción
- **Esperado:** el formulario **no** pide límite y la tabla ya no tiene la columna

---

### TC-POS — Postulación a examen (Profesor)

#### TC-POS-01 — Mesas abiertas · **Smoke**
- **Rol:** profesor
- **Esperado:** el listado muestra **solo** mesas abiertas

#### TC-POS-02 — Grado aspirado · **Smoke**
- **Esperado:** cada alumno muestra `grado actual → grado aspirado` (el inmediato superior)

#### TC-POS-03 — Postular con derecho de examen
- **Esperado:** aparece en "Tus postulaciones" con el monto y estado "Postulado"

#### TC-POS-04 — Duplicado · **Smoke**
- **Esperado:** postular al mismo alumno otra vez en la misma mesa → mensaje claro y **sin** fila duplicada

#### TC-POS-05 — Grado máximo
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

---

### TC-EVA — Planilla técnica y evaluación (Maestro)

#### TC-EVA-01 — Abrir planilla con mesa cerrada · **Smoke**
- **Rol:** Maestro dueño de la mesa
- **Esperado:** ve cada postulado con **nombre, edad, peso** y `grado actual → aspirado`

#### TC-EVA-02 — Mesa abierta
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
