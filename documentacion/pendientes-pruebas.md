# Pendientes de Prueba (E2E / Dispositivo)

> Registro de validaciones que requieren probar **en el celular real** o con el dashboard y que
> quedaron pendientes (progreso del proyecto: flujo de acceso implementado; modo $ O → recovery
> con deep link).
> Cada item se tacha `[x]` cuando se verifica en el escenario real.

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
- Complementarios vacios (altura, contacto de emergencia, datos de salud) no bloquean; quedan `null` en `profiles`.
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

---

🗒️ Actualizar este archivo (tachar items, agregar folow-ups de fecha) cada vez que se haga una
prueba manual o se descubra un nuevo pendiente.

---
🐧