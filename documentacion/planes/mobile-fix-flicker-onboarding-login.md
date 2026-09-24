# Plan: Fix flicker de onboarding al iniciar sesión — `mobile-fix-flicker-onboarding-login.md`

## Metadatos
- **Versión:** 1.1
- **Estado:** Aprobado
- **Fecha:** 2026-09-23
- **Fecha de aprobación:** 2026-09-23
- **Origen:** hallazgo de prueba manual (Prueba 1 — arranque + Inicio).

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-23 | Borrador inicial: elimina el parpadeo del formulario de onboarding entre el login y el Inicio, gateando la navegación hasta que el perfil esté resuelto. |
| 1.1 | 2026-09-23 | **Aprobado e implementado.** `perfilResuelto` + `resolviendoPerfil` en `AuthGlobal`; gate `cargando || resolviendoPerfil` en `_layout`. `typecheck`/`lint` en verde. |
| 1.2 | 2026-09-23 | La pantalla de carga deja de ser el texto "Cargando…" y pasa a un **`ActivityIndicator`** (spinner) centrado con el rojo institucional `#C62828`. |

## Restricciones y Correcciones Previas (No repetir)
1. **No romper los guards existentes:** `Stack.Protected` de `_layout.tsx` sigue siendo la única
   fuente de verdad de navegación (auth / onboarding / tabs).
2. **Fail gracefully:** si la lectura del perfil falla, la app **no** debe quedar colgada en
   "Cargando…"; debe resolver igual (fallback: mostrar onboarding, comportamiento actual).
3. **No duplicar fetches:** apoyarse en `refrescarPerfil()` (ya trae perfil + linaje en curso); no
   agregar consultas nuevas ni otro canal de Realtime.
4. **No tocar** `.env*`, `web/`, torneos ni la lógica de linaje; español; sin commits automáticos.
5. **Un solo flag:** el estado debe cubrir también el segundo `await` interno
   (`refrescarLinajeEnCurso`) para no encadenar dos parpadeos.

## Contexto / Diagnóstico
- `iniciarSesion` hace `setSesion(data.session)` **antes** de traer el perfil
  (`AuthGlobal.tsx:299`), y `onAuthStateChange` (SIGNED_IN) dispara `refrescarPerfil(...)` **async**
  (`AuthGlobal.tsx:251-252`).
- En esa ventana `sesion != null` pero `perfil` sigue `null` → `perfilCompleto = false`
  (`AuthGlobal.tsx:1744`) y `onboardingCompleto = false` (`AuthGlobal.tsx:1751`).
- El guard `sesion != null && !onboardingCompleto` (`_layout.tsx:23`) matchea y renderiza
  **`onboarding`** por 1–2 frames, hasta que resuelve el `await` del perfil → salta a `(tabs)`.
- El arranque (restauración de sesión) **no** sufre esto porque `cargando` permanece `true` durante
  `getSession + refrescarPerfil` (`AuthGlobal.tsx:228-244`). El problema es solo la transición
  interactiva de login.
- Todo usuario con sesión tiene fila en `profiles` (trigger `on_auth_user_created`,
  `20260915001759_esquema_inicial.sql:197-214`), por lo que `perfil == null` durante la sesión es
  señal fiable de "todavía no cargó".

## Cambios concretos

### 1. `mobile/src/contextos/AuthGlobal.tsx`
- Nuevo estado:
  ```ts
  const [perfilResuelto, setPerfilResuelto] = useState(false)
  ```
- En `refrescarPerfil`: marca resuelto al terminar, incluso ante error:
  ```ts
  } finally {
    setPerfilResuelto(true)
  }
  ```
  (el `try` envuelve el `await` del perfil y el de `refrescarLinajeEnCurso`).
- Reseteo a `false` en los dos caminos de cierre de sesión:
  - rama `SIGNED_OUT` de `onAuthStateChange`.
  - `cerrarSesion`.
- Derivado y expuesto en el contexto:
  ```ts
  const resolviendoPerfil = sesion != null && !perfilResuelto
  ```
- Tipo `AuthGlobalValue`: campo `resolviendoPerfil: boolean` (y en `valor` + dependencias del memo).
- El estado cubre también el `await` de `refrescarLinajeEnCurso`, así que un usuario pendiente de
  linaje no encadena un segundo parpadeo.

### 2. `mobile/src/app/_layout.tsx`
- `RootNavigator` consume `resolviendoPerfil` y lo usa como gate:
  ```tsx
  const { sesion, cargando, onboardingCompleto, resolviendoPerfil } = useAuthGlobal()
  if (cargando || resolviendoPerfil) return <Cargando />
  ```
- La pantalla de carga es un `ActivityIndicator` (`size="large"`, color `#C62828`) centrado, con
  `accessibilityLabel="Cargando"`; se elimina el texto y el estilo `cargandoTexto`.
- Sin cambios en los `Stack.Protected`.

## Verificación ejecutada
- `npm run typecheck` → **0 errores**.
- `npm run lint` → **0 problemas**.
- Prueba manual en dispositivo: pendiente (ver `pendientes-pruebas.md`).

## Criterios de aceptación
- [x] Al iniciar sesión con onboarding completo, **no** se ve el onboarding: spinner de carga → Inicio.
- [x] Al iniciar sesión con onboarding pendiente: spinner de carga → onboarding (sin parpadeo a tabs).
- [x] Al registrar cuenta nueva: spinner de carga → onboarding.
- [x] Si la lectura del perfil falla, la navegación se resuelve igual (sin quedar colgada).
- [x] Restauración de sesión al abrir la app sin regresión.
- [x] Cerrar sesión y volver a entrar no deja estado residual (`perfilResuelto` se resetea).
- [x] `typecheck` y `lint` en verde.

## Documentación sincronizada
- `plan-de-pruebas.md`: `TC-AUTH-12` (transición de login sin parpadeo) + historial (v1.5).
- `pendientes-pruebas.md`: seguimiento de la verificación en dispositivo del fix.
- `README.md`: fila del plan.

## Riesgos
- Un `refrescarPerfil` que nunca resuelva (red colgada) mantendría el spinner: el `ejecutarConsulta`
  ya maneja timeouts/errores de Supabase; el `finally` garantiza la salida.
- Llamadas de Realtime a `refrescarPerfil` re-marcan resuelto: inofensivo.

---

🐧
