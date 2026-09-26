# Pendientes de Prueba (E2E / Dispositivo)

> Registro de validaciones que requieren probar **en el celular real** o con el dashboard y que
> quedaron pendientes (progreso del proyecto: flujo de acceso implementado; modo $ O → recovery
> con deep link).
> Cada item se tacha `[x]` cuando se verifica en el escenario real.
>
> **Los casos reproducibles (cómo debe funcionar cada función) están en
> [`plan-de-pruebas.md`](./plan-de-pruebas.md).** Este archivo es la lista **viva de pendientes
> puntuales**: bloqueos, fechas, follow-ups y lo que falta verificar.

## Pendientes

### 1. Deep link de recuperacion de contraseña en el celular (Expo Go) — BLOQUEADO
- **Fecha de registro:** 2026-09-20
- **Bloqueo:** el envio de correos de recuperacion devolvio `over_email_send_rate_limit`
  ("Se enviaron muchos correos. Espera unos minutos"). No es bug; es el limite de Supabase.
- **Pasos cuando el rate limit se libere:**
  1. En el dashboard de Supabase → Auth → URL Configuration → **Additional Redirect URLs**:
     verificar que este habilitada exactamente `exp://192.168.100.143:8081/--/nueva-contrasena`
     (si cambia la IP de red o se usa `npx expo start --tunnel`, actualizar el host).
  2. Pedir recuperacion desde la app → recibir el mail → tocar el link en el telefono
     (Expo Go, misma red/Metro corriendo).
  3. Verificar que abre `/nueva-contrasena`, permite ingresar nueva contrasena y redirige a
     `iniciar-sesion`.
- **Referencia:** `documentacion/planes/mobile-deeplink-recuperacion-fix.md`.

### 2. Registro con email ya existente → mensaje de duplicado (dispositivo)
- Registrar una cuenta con un email que ya existe → debe mostrarse
  "Ya existe una cuenta con ese email." (no "Revisa tu email").
- **Referencia:** `documentacion/planes/mobile-arreglos-auth-require-cycle.md`.

### 3. Guards `Stack.Protected` en dispositivo
- Sin sesion: `/` y `(auth)` accesibles; con sesion: un deep link a `iniciar-sesion` redirige a `index`.
- **Referencia:** `documentacion/planes/mobile-flujo-acceso-auth.md`.

### 4. Onboarding de perfil (dispositivo)
- Cuenta nueva → cae en `/onboarding` y no se accede a `index` hasta completar el perfil.
- Completar (nombre, DNI, fecha nacimiento, peso, genero) → navega a `index`; el perfil queda guardado y el onboarding no reaparece al reiniciar.
- DNI duplicado (registrar dos cuentas con el mismo DNI) → "El DNI ya está registrado." (pre-chequeo del RPC y/o 23505).
- Fecha no valida / futura / edad < 4 → error inline; ver la edad calculada al elegir la fecha.
- Complementarios vacios (altura, telefono, datos de salud) no bloquean; quedan `null` en `profiles`. El **contacto de emergencia (nombre + telefono) es obligatorio**.
- Red cortada al guardar → banner generico + fila `critical` (`modulo='perfil'`) en `errores_runtime`.
- **Referencia:** `documentacion/planes/mobile-onboarding-perfil.md`.

### 5. Establecimiento del linaje (dispositivo)
- Nuevo alumno elige instructor en el onboarding → queda solicitud pendiente en `solicitudes_linaje`; `profiles.maestro_id` sigue `null`; al entrar a la app se ve el banner "Tu instructor todavía no confirmó tu registro".
- El instructor (con `es_profesor` o `es_maestro`) ve la sección "Solicitudes de alumnos" con el nombre del solicitante.
  - **Aceptar** → `maestro_id` se setea (única vez, vía `resolver_solicitud_linaje` con `app.derivacion_linaje`); el banner del alumno desaparece al refrescar.
  - **Rechazar** → el alumno vuelve al onboarding (datos personales ya prellenados) a elegir de nuevo; la solicitud queda `rechazada`.
- Maestro (`es_maestro` seteado en Supabase) completa el onboarding sin elegir instructor y entra directo a la app.
- Lista de instructores vacía → aviso bloqueante; luego de conferir un instructor a mano, aparece y permite completar.
- Un usuario con `maestro_id` no puede modificarlo (trigger `bloquear_auto_cambio_maestro` + UI no lo expone).
- **Referencia:** `documentacion/planes/mobile-establecimiento-linaje.md`.

### 6. ERROR en consola de dev: "Can't perform a React state update on a component that hasn't mounted yet" — CONOCIDO / BENIGNO (ignorar)
- **Fecha de registro:** 2026-09-20
- **Qué es:** aparece en el log de Metro/Expo Go **solo al arrancar en Android (dev)** y dice `ERROR`
  aunque no es una excepción crasheante.
- **Origen:** internals de **expo-router**, no del codigo del proyecto:
  - Android usa `getInitialURLWithTimeout()` (`Promise.race([Linking.getInitialURL(), timeout 150ms])`).
  - Al resolver el URL inicial, `fork/useLinking.native.js` llama `onUnhandledLinking(...)` =
    `setLastUnhandledLink()` de `NavigationContainer.js` **durante el montaje inicial**.
  - Si la promise se resuelve antes de que el fiber termine de montar, React (solo dev) emite el
    diagnóstico con `console.error()`; por eso el pipeline lo muestra como `ERROR`.
- **Impacto:** nulo. No bloquea auth/onboarding/navegacion, no genera LogBox/RedBox fatal y **en
  producción (`NODE_ENV=production`) esa verificacion no se ejecuta** (no aparece el mensaje).
- **Decision:** se ignora. No parchear `node_modules`. Si en el futuro molesta, opciones: (a)
  actualizar `expo-router` a un patch que corrija el warning, o (b) fork/patch del paquete
  (no recomendado).
- **Facil de verificar que no es nuestro codigo:** el stack siempre termina en
  `ExpoRoot.js`/`ContextNavigator`/`NavigationContainer` → `useLinking.native.js:127`; no pasa por
  `AuthGlobal`, `_layout`, `onboarding` ni ningun archivo de `mobile/src/`.

### 7. Análisis del perfil al iniciar (dispositivo)
- Al iniciar sesión (o restaurarla), el contexto `AuthGlobal` expone `gradoActual` con el grado real del perfil (ej. un maestro sembrado con `dan_X`).
- `esProfesor` es `true` solo si `es_profesor = true` **y** `grado_actual >= 'dan_1'` (un perfil con `es_profesor` pero grado Gup queda `false`).
- `esMaestro` refleja la bandera; la sección "Solicitudes de alumnos" sigue apareciendo para profesores (con Dan) y maestros (`esInstructor`), sin regresión en el flujo de linaje.
- **Referencia:** `documentacion/planes/mobile-analisis-perfil-inicio.md`.

### 8. Rutas condicionales / tabs por árbol de poder (dispositivo)
- Usuario sin facetas (`!es_profesor` y `!es_maestro`) → solo pestaña "Inicio" con el aviso "Tu cuenta todavía no tiene habilitadas las pestañas de gestión...".
- Profesor (`es_profesor = true`, con o sin grado Dan) → pestañas "Inicio" + "Instructor" (v1.2: la tab depende de la bandera cruda `es_profesor`, no del gate de Dan).
- Usuario con `es_profesor=true` y `es_maestro=true` (sin Dan) → "Inicio" + "Instructor" + "Maestro" (caso que motivó la v1.2).
- Maestro sin `es_profesor` → "Inicio" + "Maestro" (sin "Instructor").
- La barra muestra solo etiquetas (sin glifo `MissingIcon` `|x|`): `tabBarIcon: () => null` en `screenOptions`.
- Deep link directo a `/instructor` (cuenta no autorizada) o `/maestro` (no maestro) → redirige a "Inicio" vía `<Redirect>`, sin renderizar la pantalla.
- La barra inferior muestra solo las tabs habilitadas (layout no roto declarando los 3 `Tabs.Screen`).
- "Solicitudes de alumnos" (flujo de linaje) sigue operando desde "Inicio" sin regresión.
- Las opciones de cada menú aparecen deshabilitadas como "Próximamente".
- **Referencia:** `documentacion/planes/mobile-rutas-condicionales-navegacion.md`.

### 9. Directorio y alta de alumnos directos (dispositivo)
- Profesor (`es_profesor = true`) → "Mis alumnos" lista solo sus alumnos directos (RLS `maestro_id = auth.uid()`); sin alumnos muestra el CTA de alta.
- Alta de alumno: los obligatorios (nombre, DNI, fecha de nacimiento + edad, peso, género, grado) validan por campo; el DNI duplicado se bloquea (`verificar_dni_disponible`); los opcionales (altura, teléfono, contacto, datos de salud) son opcionales.
- Grado por color: listado, detalle, chips de alta y selección de instructor muestran "Blanco", "Amarillo punta verde", …, "Dan I"…"Dan IX" (sin "Gup"); `ETIQUETAS_GRADO` en `mobile/src/constants/grados.ts`.
- Teléfono: se carga en onboarding/alta y se ve en el detalle (`alumno.telefono`); vacío queda `null`. Requiere migración `contacto_telefono` (`profiles.telefono` + `p_telefono` en `alta_alumno`).
- Al guardar, la ficha aparece en el directorio con `maestro_id` = profesor; el alumno no tiene cuenta de usuario (`profiles.id` ya no referencia `auth.users`).
- Detalle (`/instructor/alumno/[id]`) muestra la ficha completa en solo-lectura.
- Deep link a `/instructor/alumnos` o `/instructor/alta-alumno` sin faceta → `<Redirect href="/" />`.
- Aplicar migración y regenerar types: `npx supabase db push --linked`, `npx supabase lint --linked`, `npx supabase gen types typescript --linked > mobile/src/lib/database.types.ts`.
- **Referencia:** `documentacion/planes/mobile-directorio-alta-alumnos.md`.

### 10. Control de asistencia (dispositivo)
- **Referencia:** `documentacion/planes/mobile-control-asistencia.md`.
- Flujo completo: crear clase (`/instructor/nueva-clase`) → abrir el detalle (`/instructor/clase/[id]`) → **"Tomar asistencia"**.
- La pantalla lista **solo** los alumnos activos del grupo; arranca con **todos Presente**; un toque alterna a Ausente; los contadores "Presentes / Ausentes" se actualizan en vivo.
- "Todos presentes" / "Todos ausentes" marcan el conjunto completo de una vez.
- **"Guardar asistencia"** persiste todo el set en una transacción (upsert atómico); reabrir la clase refleja lo guardado.
- El selector `/instructor/clases` muestra el badge **"Hoy"** en la sesión de la fecha actual.
- RLS: con otro profesor, no se leen ni se registran asistencias de clases ajenas.
- Red cortada al guardar → banner genérico + fila en `errores_runtime` (`modulo='asistencia'`).

### 11. Asignación de un alumno a un solo grupo (dispositivo)
- **Referencia:** `documentacion/planes/mobile-asignacion-alumno-un-grupo.md`.
- En el detalle de un grupo (`/instructor/grupo/[id]`), un alumno que ya pertenece a otro grupo **no aparece** en el listado de asignables (ya no hay badge "Se trasladará desde…").
- Los alumnos del propio grupo siguen visibles y pre-marcados; desmarcarlo + "Guardar miembros" lo da de baja del grupo.
- Quitar a un alumno de su grupo lo vuelve a ofrecer como libre en el resto de los grupos (verificar recarga al volver a la pantalla con `useFocusEffect`/foco).
- Probar que un alumno nunca queda en dos grupos activos (índice único parcial `miembros_grupo_un_grupo_activo_idx`).
- El RPC `editar_miembros_grupo` **rechaza** con excepción la asignación directa (llamada a la API) de un alumno ya activo en otro grupo.

### 12. Reasignación explícita de grupo — PENDIENTE DE DISEÑO
- **Fecha de registro:** 2026-09-21
- **Contexto:** al pasar a "un alumno = un grupo" con rechazo en el RPC (plan `mobile-asignacion-alumno-un-grupo.md`), el traslado dejó de ser automático. Falta una forma explícita de **mover a un alumno de un grupo a otro**.
- **Pendiente:** definir el flujo con el usuario (opciones evaluadas: selector "Grupo actual" en el detalle del alumno; botón "Mover a otro grupo" desde el detalle del grupo; acción de traslado en la lista de alumnos).
- **Implicancia técnica:** requiere un RPC propio (p. ej. `reasignar_alumno_a_grupo`), porque `editar_miembros_grupo` ya no mueve. Debe ser atómico (baja del origen + alta en el destino) respetando el índice único parcial.
- **Acción:** crear un plan aparte cuando se defina el diseño.

### 14. Pagos de alquiler y comprobantes (dispositivo + RLS)
- **Referencia:** `documentacion/planes/mobile-pagos-alquiler.md`.
- En el detalle de una locación (`/instructor/locacion/[id]`) → "+ Registrar pago" → cargar periodo (por defecto el mes actual), monto (prellenado con el valor pactado) y fecha; adjuntar foto (cámara y galería) y un PDF.
- El pago aparece en el historial con periodo formateado, monto y fecha.
- "Comprobante" abre el archivo con el **visor del sistema** (enlace firmado de 1 h); verificar con foto y con PDF.
- Intentar registrar **dos pagos del mismo `(locación, periodo)`** → debe bloquearse por el índice único con mensaje amigable.
- **RLS auditoría (superior jerárquico):** con la cuenta del superior, verificar que **ve los pagos** y **puede abrir el comprobante** del subordinado (excepción SRS §2).
- **RLS aislamiento:** con una cuenta **sin linaje**, verificar que **no** ve los pagos y que el enlace firmado **falla**.
- **RLS escritura:** verificar que solo el dueño puede subir/borrar el archivo del bucket (`owner = auth.uid()`) y editar el pago.
- Borrar un pago → debe eliminar también el archivo del bucket (sin huérfanos).
- Cortar la red al guardar → banner genérico + fila en `errores_runtime` (`modulo='pagos_alquiler'`).

### 15. Auditoría en cascada para superiores (dispositivo + RLS)
- **Referencia:** `documentacion/planes/mobile-auditoria-cascada.md`.
- Tab **Maestro** → "Auditoría de locaciones en cascada" → listado con locación, **dueño**, valor pactado y **estado de pago**.
- **Estado derivado:** con un pago del mes actual → "Al día"; con pagos anteriores → "Vencida" y el número de meses adeudados; sin pagos → "Sin pagos".
- Filtro "Toda mi rama / instructor": al elegir un instructor, solo se ven sus locaciones.
- Abrir el detalle → historial de pagos y **"Comprobante"** (enlace firmado; verificar con foto y PDF).
- **Recursividad (clave):** con una cuenta de **nieto** (descendiente indirecto, no subordinado directo) verificar que el Maestro **sí** ve sus locaciones, pagos y comprobantes.
- **Aislamiento:** con una cuenta **ajena** (sin linaje) verificar que **no** ve nada y que el enlace firmado del comprobante **falla**.
- **Solo lectura:** verificar que la vista no ofrece alta, edición ni borrado.
- **Privacidad:** confirmar que no se exponen datos personales de alumnos (solo infraestructura).

### 16. Cuotas de alumnos (dispositivo)
- **Referencia:** `documentacion/planes/mobile-cuotas-alumnos.md`.
- Detalle del alumno → sección **"Cuotas"**: verificar que muestra el estado del mes actual (Pagado/Pendiente) y el historial.
- "+ Registrar cuota" → cargar periodo (por defecto el mes actual), monto y fecha → guardar; debe aparecer en el historial y pasar el mes a "Pagado".
- **Duplicado:** intentar registrar otra cuota del **mismo periodo** → mensaje "Ya registraste un pago para ese periodo." y **sin fila duplicada** en la BD.
- **Cobranzas:** menú Instructor → "Cuotas de alumnos" → elegir un periodo y verificar que lista los alumnos directos con badge Pagado/Pendiente y el resumen "X de Y".
- **Aislamiento:** con un profesor distinto, verificar que **no** ve las cuotas de alumnos ajenos (RLS `es_alumno_directo_de`).
- Eliminar una cuota mal cargada → desaparece del historial y el mes vuelve a "Pendiente".
- **Fecha pasada permitida:** cargar una cuota de un mes anterior y verificar que se registra correctamente (el periodo y la fecha pueden diferir).

### 17. Mesas de examen (dispositivo)
- **Referencia:** `documentacion/planes/mobile-mesas-examen.md`.
- Tab **Maestro** → "Mesas de examen" → "+ Nueva mesa": cargar fecha y lugar → la mesa queda en estado **"Abierta"**.
- **Lugar:** elegir una locación propia desde los chips; probar también **"+ Otro lugar"** con texto libre.
- Listado: verificar fecha, lugar, badge de estado y cantidad de postulados; las propias aparecen primero.
- Detalle: **Editar mesa** (fecha/lugar) → verificar que se refleja al volver; **Cerrar mesa** → el estado pasa a "Cerrada" y aparece "Finalizar mesa".
- **Gate:** un usuario **sin `es_maestro`** no ve la pestaña Maestro ni puede crear mesas.
- Mesa ajena: al abrir una mesa de otro maestro, debe mostrarse en **solo lectura** (sin acciones de edición/cierre).
- Verificar que `mesas_examen` ya no tiene la columna `limite_inscripcion` y que el formulario **no** la pide.

### 18. Postulación a examen (dispositivo)
- **Referencia:** `documentacion/planes/mobile-postulacion-examen.md`.
- Menú Instructor → "Postulación a examen": deben listarse **solo las mesas abiertas**.
- Entrar a una mesa → "Postular alumnos": verificar que cada alumno directo muestra **grado actual → grado aspirado** (el inmediato superior).
- Postular a un alumno con derecho de examen cargado → debe aparecer en "Tus postulaciones" con el monto y en estado "Postulado".
- **Duplicado:** intentar postular al **mismo alumno** otra vez en la misma mesa → mensaje claro y **sin fila duplicada**.
- **Grado máximo:** un alumno en `dan_9` debe aparecer deshabilitado ("Ya alcanzó el grado máximo").
- **Mesa cerrada:** cerrar la mesa desde la cuenta del Maestro → el profesor ya no debe poder postular ni editar el cobro.
- **Aislamiento:** un profesor no puede postular a un alumno **ajeno** (no aparece en su lista de candidatos directos).
- **Recaudación (clave, SRS §3.7):** desde la cuenta del Maestro, abrir el detalle de su mesa → debe verse la **recaudación total** (suma de los derechos) y el desglose de **cobrados / pendientes**, ademas del detalle de postulaciones.
- Editar el cobro de una postulación existente y verificar que la recaudación se actualiza.
- Quitar una postulación → debe desaparecer de la lista y de la recaudación.

### 19. Panel de Inicio (dispositivo)
- **Referencia:** `documentacion/planes/mobile-rediseno-inicio.md`.
- Con un usuario **profesor** con linaje confirmado: el Inicio debe mostrar **saludo con el nombre**, tarjetas de resumen (alumnos, grupos, cuotas pendientes del mes, clases sin asistencia) y **acciones rápidas**; ya no debe verse vacío.
- **Cuotas pendientes:** la tarjeta debe mostrar `pendientes/total` del mes actual y resaltarse en rojo si hay pendientes; al tocarla debe abrir "Cuotas de alumnos".
- **Clases sin asistencia:** debe contar solo las de los **últimos 7 días**; tomar asistencia de una clase y volver → el número debe **bajar** (verifica el `useFocusEffect`).
- **Refresco:** registrar una cuota y volver al Inicio → el contador debe actualizarse **sin reiniciar la app**.
- Con un usuario **Maestro**: debe verse el bloque "Tu rama" (alquileres vencidos de subordinados, mesas abiertas y **recaudación** de mesas abiertas) y las acciones rápidas de Maestro.
- **Fail gracefully:** con red cortada, las tarjetas deben quedar en "—" **sin romper** el resto del panel.
- **Sin datos:** un usuario recién creado (sin alumnos) debe ver textos guía, no errores.
- Verificar que las **solicitudes de linaje** siguen funcionando (aceptar/rechazar) y que al aceptar se recarga el resumen.
- "Cerrar sesión" debe verse discreto al final, sin competir con el contenido.

### 13. Editar grupo y bloquear borrado de locación (dispositivo)
- **Referencia:** `documentacion/planes/mobile-editar-grupo-locacion.md`.
- Detalle del grupo (`/instructor/grupo/[id]`) → botón **"Editar"** → cambiar nombre, locación y horarios → "Guardar cambios"; al volver se reflejan los cambios.
- Reasignar un grupo a otra locación y verificar que aparece en el detalle de la **nueva** locación y desaparece de la anterior.
- Dejar un grupo **sin locación** (no aplica en la UI: la locación es obligatoria en el formulario; verificar el comportamiento al venir un grupo heredado con `locacion_id = null`).
- En el detalle de una locación **con grupos asociados**: el botón "Eliminar locación" está deshabilitado y el aviso invita a reasignar; tocar un grupo lleva a su detalle.
- En el detalle de una locación **sin grupos**: eliminar funciona normalmente.
- Probar el bloqueo a nivel servidor: llamar al RPC `eliminar_locacion_segura` con una locación con grupos → debe lanzar excepción.
- Verificar que ningún grupo se borra en cascada al eliminar la locación (`on delete set null`).
- **Refresco:** editar el grupo y volver → el detalle debe reflejar los cambios **sin reiniciar** la app (ver `documentacion/planes/mobile-refresco-detalle-foco.md`). Mismo chequeo al editar una locación.

### 20. Planilla técnica y evaluación (dispositivo)
- **Referencia:** `documentacion/planes/mobile-planilla-evaluacion.md`.
- Con la cuenta **maestro dueño** de una mesa **cerrada**: en el detalle de la mesa, tocar **"Abrir planilla de evaluación"** → se ve cada postulado con **nombre, edad, peso y `grado actual → aspirado`**.
- Con la mesa **abierta**: el botón está deshabilitado con la nota "Cerrá la mesa para poder evaluar"; la planilla muestra el mismo aviso y sin acciones.
- Cargar **Aprobado** a un postulado → debe pedir **confirmación**, ascender el `grado_actual` del alumno (ver su detalle en Instructor) y registrar la fila en `graduaciones`. `Desaprobado`/`Ausente` no deben cambiar el grado.
- **Mención especial:** marcar la casilla + Aprobado → el desenlace queda "Aprobado · Mención especial" y en `graduaciones.mencion_especial = true`; el grado sube solo un nivel.
- **Doble graduación:** con un alumno de grado entre `blanco` y `azul punta roja`, usar **Doble graduación** → el grado sube **dos** niveles (probar el caso tope `azul punta roja → rojo punta negra`) y `graduaciones.promocion_doble = true`. Con un alumno `rojo`/`rojo punta negra`/dan el botón **no** debe aparecer.
- **Doble + mención:** confirmar que se pueden combinar y que el badge muestra ambos.
- **Grado otorgado:** tras evaluar, "Aspira a" pasa a mostrar **"Grado otorgado"** con el grado real (para doble, el +2).
- Con la mesa **abierta**, presionar "Abrir planilla de evaluación" debe mostrar el aviso con opción de **cerrar la mesa** (ya no queda mudo).
- Volver a la planilla: la fila evaluada muestra **badge** y no permite volver a cargar (el RPC rechaza el reintento).
- **Mesa ajena:** abrir la planilla de una mesa de otro maestro → debe verse solo el mensaje de **solo lectura** (sin datos técnicos).
- **Fail gracefully:** con red cortada al cargar o al registrar, debe verse el banner genérico y **no** romperse la pantalla.
- Verificar que el resumen **"Evaluados X de Y"** se actualiza tras cada resultado sin reiniciar la app.

---

### 21. Transición de login sin parpadeo de onboarding (FIX — verificar en dispositivo)
- **Fecha de registro:** 2026-09-23
- **Hallazgo (Prueba 1 manual):** al iniciar sesión aparecía por un instante el formulario de
  onboarding antes de caer al Inicio.
- **Causa:** `setSesion` ocurría antes del fetch del perfil; el guard `sesion != null &&
  !onboardingCompleto` renderizaba `onboarding` por 1–2 frames.
- **Fix (implementado):** `perfilResuelto` / `resolviendoPerfil` en `AuthGlobal` y gate
  `cargando || resolviendoPerfil` en `_layout`; `typecheck`/`lint` en verde.
- **Refuerzo (2026-09-24):** reaparecía el parpadeo. Se pasó a resolver **por usuario**
  (`perfilResueltoPara`), reset en login/registro y **reintento único** si el perfil vuelve vacío.
  `typecheck`/`lint` en verde. Referencia: `planes/mobile-fix-flicker-onboarding-login.md` (v1.3).
- **Verificación pendiente en dispositivo:** login con cuenta completa → **spinner de carga** → **Inicio**
  (sin onboarding); cuenta nueva → spinner → onboarding; **re-loguear / cambiar de cuenta** sin parpadeo.
- **Referencia:** `planes/mobile-fix-flicker-onboarding-login.md`.

---

### 22. Onboarding sin forma de cerrar sesión (UX — ANOTADO)
- **Fecha de registro:** 2026-09-23
- **Hallazgo (prueba manual):** un usuario con sesión y onboarding incompleto **no puede cerrar
  sesión**: el único botón "Cerrar sesión" está en el Inicio, y los guards lo devuelven siempre a
  `/onboarding` (recargar también). No hay escape si se equivocó de cuenta.
- **Impacto:** bloqueo de UX en pruebas y para usuarios reales; no es un error de seguridad.
- **Posible mejora:** enlace discreto **"Cerrar sesión"** al pie del onboarding (llama a `cerrarSesion`).
- **Acción:** evaluar como plan aparte cuando se priorice.

---

### 23. DEMO (prioridad Maestro) — pendientes para mañana
- **Fecha de registro:** 2026-09-24
- **Contexto:** primera muestra a un **Maestro de la escuela**. Se prioriza el **rol Maestro** y el
  guion de demo por sobre cubrir todo el catálogo. Guion completo: `guion-demo.md` (raíz, **gitignored**).
- **Cuentas (escenario nuevo 2026-09-24):** **Maestro** `alecriado@taekwondo.test`, **Maestro** `andres@taekwondo.test`, **Profesor** `marti@taekwondo.test` (todas `Seed123456!`). Ver `planes/db-seed-demo-ale-criado.md`.
- **⚠️ Guion obsoleto:** `guion-demo.md` (gitignored) todavía referencia las cuentas viejas (Jhonatan/`jhona@`).

**Bloques a probar (checklist):**
- [x] Inicio Maestro “Tu rama” (`TC-INI-05`) — ✅ 2026-09-24
- [x] Auditoría agrupada por rama (`TC-AUD-01…05`, `TC-AUD-08`) — ✅ 2026-09-24
- [x] Mesas de examen — crear/listar/editar/cerrar (`TC-MES-01/02/03/04/05/06`, incluye date-picker) — ✅ 2026-09-24
- [x] Mesas de examen — dueño visible + jerarquía (`TC-MES-08` nuevo escenario, `TC-MES-12`) — ✅ 2026-09-24
- [x] Mesas de examen — sin límite de inscripción (`TC-MES-09`) — ✅ 2026-09-24
- [x] Postulación — mesas/candidatos/postular/duplicado/grado máximo (`TC-POS-01…05`) — ✅ 2026-09-24
- [x] Postulación — mesa cerrada, alumno ajeno, editar cobro/quitar, recaudación y aislamiento (`TC-POS-06…10`) — ✅ 2026-09-24
- [x] Planilla/evaluación (`TC-EVA-01`…`TC-EVA-12`) — **rol Maestro** — ✅ 2026-09-24
- [ ] Dashboard de métricas (`TC-DASH-01`) — **rol Maestro**
- [ ] Datos poblados para la demo (⚠️ la BD quedó **solo con perfiles**: no hay locaciones, grupos, mesas ni cuotas; agregar si hace falta)
- [ ] Plan B si falla la red: capturas / video.

**Migraciones:** `objetivo_clase_elementos`, `quitar_preparacion_fisica` y `rama_descendientes` **ya aplicadas** (`db push`).

---

### 24. Date-picker en campos de fecha (verificar en dispositivo)
- **Fecha de registro:** 2026-09-24
- **Referencia:** `planes/mobile-date-picker-campos-fecha.md`, `prueba-manual.md`.
- **Qué cambió:** la fecha de mesa, el periodo de cuota/alquiler y la fecha de pago pasan de texto
  libre a selectores (`CampoFecha` con el picker nativo; `CampoPeriodo` con selector de mes propio).
- **Verificar:**
  - Mesa → "Fecha": abre el date-picker y admite **cualquier** fecha (sin límite) —
    ✅ verificado 2026-09-24.
  - Cuota y Pago → "Periodo": selector de mes (formato `AAAA-MM`, permite meses futuros);
    "Fecha de pago": date-picker que **no** permite fechas futuras.
  - `typecheck`/`lint` ya en verde; falta la corrida manual en Android/Expo Go.

---

### 25. Validación de fecha de mesa en la BD — REVERTIDO
- **Fecha de registro:** 2026-09-24
- **Referencia:** `planes/bd-validar-fecha-mesa.md` (Revertido).
- **Qué pasó:** se creó la migración `20260924163301_validar_fecha_mesa.sql` (trigger que rechazaba
  fechas pasadas) y el usuario la aplicó; luego pidió **revertir todo límite de fecha** en mesas.
- **Rollback:** `supabase/migrations/20260924163945_quitar_validar_fecha_mesa.sql` (drop trigger y
  función). La UI también se revirtió (`mesas/nueva.tsx` acepta cualquier fecha).
- **Pendiente:** aplicar el rollback en la BD (`npx supabase db push --linked`; requiere
  `supabase login`/`SUPABASE_ACCESS_TOKEN`).

---

### 26. Visibilidad de mesas por jerarquía (implementado — verificar en dispositivo)
- **Fecha de registro:** 2026-09-24
- **Referencia:** `planes/mobile-mesas-visibilidad-jerarquia.md`.
- **Qué cambió:** una mesa la ve su **dueño** y sus **subordinados directos** (dirección
  superior→subordinado); postular solo en mesas propias o del superior directo. Toca RLS de
  `mesas_examen` y `postulaciones_examen` (insert) + RPCs `listar_mesas_examen` y `postular_alumno`.
  Migración `mesas_visibilidad_jerarquia` **aplicada** (`db push`).
- **Verificado (escenario anterior, 2026-09-24):** por API (`jhona@` veía las de Jhonatan; `sensei@` 0;
  `maestro2@` las del superior) y en dispositivo (`TC-MES-08` nuevo escenario y `TC-MES-12`).
- **Pendiente:** `TC-POS-10` (postular fuera de jerarquía) — se prueba con el módulo Postulación.

---

### 27. MEJORA FUTURA — el profesor ve el detalle de una mesa cerrada y el resultado de sus alumnos
- **Fecha de registro:** 2026-09-24
- **Idea:** hoy, al cerrar la mesa, el profesor la pierde de vista (el listado de Postulación solo
  muestra mesas **abiertas**) y no puede consultar cómo les fue a sus alumnos postulados.
- **Propuesta:** incluir las mesas **cerradas/finalizadas** del superior directo en el listado en modo
  lectura (o un apartado "Mesas cerradas") y reutilizar el detalle para mostrar el desenlace de sus
  propias postulaciones (`etiquetaResultadoExamen`: Aprobado/Desaprobado/Ausente + mención/doble).
- **Técnico:** es casi solo UI; la RLS `postulaciones_examen_select_profesor` ya permite al profesor
  leer sus propias postulaciones aunque la mesa esté cerrada. Decidir si se listan **todas** las
  cerradas o solo aquellas donde el profesor tiene postulaciones.
- **Acción:** crear plan aparte cuando se priorice.

---

### 28. RESET TOTAL de la BD para la demo (Ale Criado)
- **Fecha de registro:** 2026-09-24
- **Referencia:** `planes/db-seed-demo-ale-criado.md`.
- **Qué se hizo:** purga total (todas las tablas `public` + `auth.users`, incluida la cuenta real
  Jhonatan) y recreación del árbol de `no-añadir-a-git.txt`: **Nico Saez → Ale criado → Andres/Teresita**,
  con 3 cuentas de login (`alecriado@`, `andres@`, `marti@` `@taekwondo.test`, contraseña de test) y 6
  alumnos variados. Seeds: `supabase/purga-total.sql`, `supabase/seed-demo-ale-criado.sql`.
- **⚠️ Ojo:** las cuentas viejas (`jhonatancallegaleano@`, `jhona@`, `sensei@`, `maestro2@`, etc.) **ya
  no existen**. El `guion-demo.md`, `supabase/seed-auditoria.sql` y `supabase/aplicar-maestro-prueba.sh`
  quedaron **obsoletos** (referencian esas cuentas).
- **App:** cerrar sesión / re-loguear (los tokens viejos quedaron inválidos).

---

### 29. Barra de estado + safe area superior (verificar en dispositivo)
- **Fecha de registro:** 2026-09-24
- **Referencia:** `planes/mobile-status-bar-tema.md`.
- **Qué cambió:** `expo-system-ui` + `SafeAreaProvider` en el root y `PantallaSegura` (inset superior)
  en Inicio y onboarding; `<StatusBar style="auto" />` ahora sigue el tema de la app.
- **Verificar en el celular:** con el equipo en **modo oscuro** los íconos de la barra se ven
  (oscuros sobre el fondo claro); Inicio/onboarding **no** quedan debajo de la barra.

---

### 30. Build APK con EAS + OTA (próximo)
- **Fecha de registro:** 2026-09-24 (actualizado 2026-09-25)
- **Referencia:** `planes/mobile-build-apk-eas.md` (v1.3).
- **Config lista:** `name: "CHS ALFA"`, `applicationId ar.taekwondoitf.app`, `expo-updates` + `runtimeVersion **fingerprint**`, `eas.json` con `preview` (APK, canal `preview`, testeo), `production-apk` (APK, canal `production`, usuarios reales) y EAS Environment Variables en `preview`/`production`.
- **Pendiente (requiere login):** `eas build -p android --profile preview` y `eas build -p android --profile production-apk`.
- **Después:** instalar la APK, verificar barra de estado, ícono/splash/nombre y probar `eas update --channel preview`.

---

### 31. Ícono, splash y nombre de marca (verificar en APK de `preview`)
- **Fecha de registro:** 2026-09-25
- **Referencia:** `planes/mobile-build-apk-eas.md` (v1.3); `plan-de-pruebas.md` → `TC-APP-01`…`TC-APP-04`.
- **Qué cambió:** ícono adaptativo Android regenerado con la marca, **nombre visible `CHS ALFA`** (launcher, login y permisos) y **splash propio**: al montar el JS se oculta el splash nativo (que en Android 12+ encajona el ícono en un círculo) y se muestra el **póster del cliente a pantalla completa** (`src/components/PantallaArranque.tsx` + `assets/splash-poster.png`). El splash nativo queda con el emblema para el instante previo.
- **Bloqueo:** **Expo Go no muestra** el ícono/splash/nombre propios (muestra los de Expo Go). Requiere **compilar la APK** (`npx eas-cli build -p android --profile preview`) e instalar.
- **Verificar:** póster a pantalla completa al abrir, transición sin franja blanca, ícono en el launcher, **label `CHS ALFA`** bajo el ícono e ícono adaptativo/temático (Android 13+).

---

### 32. OTA testeo → producción (verificar en APK)
- **Fecha de registro:** 2026-09-25
- **Referencia:** `planes/mobile-build-apk-eas.md` (v1.3); `plan-de-pruebas.md` → `TC-APP-05`/`TC-APP-06`.
- **Qué cambió:** `runtimeVersion` `fingerprint`; canal `preview` (testeo exclusivo) y canal `production` (usuarios reales); variables de EAS para `preview`/`production`; promoción con `eas update:republish`.
- **Resuelto:** el `.env` no llegaba al build en la nube (estaba gitignored sin `.easignore`); ahora las `EXPO_PUBLIC_*` viven en **EAS Environment Variables**.
- **Verificar:**
  1. Con las APK de `preview` y `production-apk` instaladas, publicar `eas update --channel preview` → **solo** llega a la APK de testeo (al reiniciar).
  2. `eas update:republish --channel preview --destination-channel production -p android` → llega a la APK de usuarios reales.
  3. Un cambio **nativo** no aplica por OTA sobre el binario viejo (runtime distinto).

---

### 33. App de testeo con nombre/paquete propios (variante "dev") — PENDIENTE
- **Fecha de registro:** 2026-09-25
- **Pedido:** que la app de **testeo** se vea distinta en el celular (ej. **“CHS ALFA dev”**) y sea **otra app**, para convivir con la de producción sin pisarse.
- **Enfoque (patrón oficial de variantes de EAS):**
  1. `mobile/app.config.js` dinámico que lee `app.json` y, si `APP_VARIANT === 'preview'`, cambia `name` → `CHS ALFA dev` y `android.package` / `ios.bundleIdentifier` → `ar.taekwondoitf.app.dev`.
  2. `eas.json`, perfil `preview`: `"env": { "APP_VARIANT": "preview" }`.
  3. EAS env var `APP_VARIANT=preview` (plaintext) en el entorno `preview` (para que `eas update --environment preview` use la variante correcta).
  4. (Opcional) ícono distinto para dev (badge “DEV”), generado con `scripts/gen-assets.py`.
- **Bloqueo:** requiere configurar/**generar credenciales Android** para el nuevo `applicationId` (`…app.dev`) — el keystore actual es del paquete de producción. El primer build lo pediría. **Postergado a pedido del usuario (no es prioridad).**
- **Consecuencia a tener en cuenta:** la variante cambia el `fingerprint` de preview → su `runtimeVersion` deja de coincidir con producción, así que **`eas update:republish` (promover) deja de aplicar cross-variante**. Se reemplaza por publicar a cada canal por separado (`eas update --channel preview --environment preview` y `--channel production --environment production`).
- **Referencia:** `planes/mobile-build-apk-eas.md` (v1.3); patrón oficial: `https://docs.expo.dev/build-reference/variants/`.

---

### 34. Faceta de Maestro pendiente + conteo `hijos_maestros` (verificar en dispositivo)
- **Fecha de registro:** 2026-09-26
- **Referencia:** `planes/mobile-maestro-faceta-pendiente.md`.
- **Qué cambió:** el onboarding tiene **"¿Tenés profesores a cargo?"** y el listado **"Tu maestro"** muestra solo cuentas Maestro; al aceptar, el superior confirma el cinturón y puede marcar/desmarcar **"¿Tiene profesores a cargo?"** (si no, queda profesor corriente); `profiles.hijos_maestros` (conteo de hijos directos que son maestros, por trigger).
- **Verificar:** `TC-LIN-11` (declarar + aceptar con/sin confirmar) y `TC-LIN-12` (listado solo maestros + conteo).
- **Nota:** la migración `maestro_faceta_pendiente` ya se aplicó (`db push`).

---

## Por dónde vamos (resumen de sesión)
- **Catálogo:** 168 casos en 19 módulos; **82 verificados** (auth, onboarding, linaje, navegación, inicio, alumnos, grupos, locaciones, clases, asistencia, objetivos, auditoría, mesas, postulación, planilla/evaluación y panel Maestro).
- **Bloques cerrados:** Auth/login, Onboarding, Linaje (Realtime), Alumnos, Grupos, Locaciones, Clases+Objetivos, Asistencia, Auditoría+Inicio Maestro, Mesas de examen, Postulación y Planilla/evaluación.
- **Siguiente sesión:** continuar el **guion de demo** (Dashboard de métricas) y, cuando haya tiempo, los `TC` de **RLS/aislamiento** (con una cuenta sin acceso, ej. `marti@` o un perfil sin facetas).
- **Pendiente técnico:** `db lint` sigue reportando 1 issue **preexistente** de **torneos** (`llave_id` ambiguo en `sincronizar_resultado_en_vivo`) — congelado, no se toca.

---

🗒️ Actualizar este archivo (tachar items, agregar folow-ups de fecha) cada vez que se haga una
prueba manual o se descubra un nuevo pendiente.

---
🐧