# Plan: Rutas Condicionales en la UI — Tabs por Árbol de Poder (Fase 3, ítem 2)

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 0.1 | 2026-09-21 | Borrador inicial. Decisiones del usuario: (1) un Maestro sin `es_profesor` **también ve la pestaña "Instructor"** (`esInstructor = esProfesor || esMaestro`); (2) las opciones de menú quedan como **filas deshabilitadas** ("Próximamente") sin rutas stub ni código muerto; (3) se agrega la fila **"Cuotas de alumnos"** (Fase 6) al menú "Instructor". |
| 0.2 | 2026-09-21 | Correcciones previas: (1) se **elimina `Tabs.Protected`** del layout de tabs — envolver `Tabs.Screen` en componentes personalizados rompe la configuración estática del layout y la barra inferior; se oculta condicionalmente con `href: null` en `options`; (2) la protección contra **deep links** se implementa dentro de cada pantalla landing con `<Redirect href="/" />` (ocultar la tab no bloquea el acceso directo por URL). |
| 1.0 | 2026-09-21 | Aprobado por el usuario e implementado. |
| 1.1 | 2026-09-21 | Cambio de decisión: la pestaña "Instructor" pasa a depender **solo de `es_profesor`** (ya no `esInstructor`); un maestro sin `es_profesor` ya no la ve. Se ajustan `(tabs)/_layout.tsx`, el `Redirect` de `instructor/index.tsx` y la doc asociada. Se agrega `tabBarIcon: () => null` en `screenOptions` para eliminar el glifo `MissingIcon` (`|x|`) que la barra mostraba al no definir iconos. |
| 1.2 | 2026-09-21 | Corrección de regresión detectada en dispositivo: un usuario con `es_profesor=true` y `es_maestro=true` no veía "Instructor" porque `esProfesor` (gated por Dan: `grado_actual >= 'dan_1'`) daba `false`. Decisión del usuario: la pestaña "Instructor" y su guard dependen **solo de la bandera cruda** `es_profesor`. Se agrega `esProfesorBandera` al contexto `AuthGlobal` (no se altera `esProfesor` gated, que sigue para el resto de la lógica, ej. "Solicitudes de alumnos"). Se relaja la regla del SRS "Vista Profesor exige Dan" únicamente para la visibilidad de esta pestaña. |

## Restricciones y Correcciones Previas (No repetir)
1. **`web/` congelada y módulo de torneos intacto:** no se tocan.
2. **Sin migración BD ni cambios en `database.types.ts`:** este ítem es solo UI/navegación. Reusar los derivados que `AuthGlobal` ya expone (`esProfesor` gated por Dan, `esMaestro`, `esInstructor`). **No reimplementar gates** en la UI ni extenderse en AuthGlobal.
3. **Expo SDK 57:** leer las docs versionadas (`mobile/AGENTS.md`). Usar JS Tabs de `expo-router`; **no importar de `@react-navigation/*`** (bloqueado desde SDK 56). **No usar `Tabs.Protected`**: en este SDK envolver los `Tabs.Screen` en envoltorios rompe la configuración estática y la barra inferior. El ocultamiento condicional se hace con `href: null` en `options`.
4. **Ocultar ≠ proteger:** `href: null` solo saca la pestaña de la barra; **el acceso directo por URL se bloquea con `<Redirect href="/" />` al inicio del renderizado** de cada pantalla landing (`instructor`/`maestro`).
5. **Sin nuevas dependencias:** los tabs van solo con etiqueta + tint de color (estilo `#C62828` activo, `#666` inactivo). No introducir `@expo/vector-icons` (no está declarado en `package.json`).
6. **Filas de menú deshabilitadas (decisión):** no crear rutas placeholder/código muerto. Cada Fase 4–8 creará su ruta y activará la fila correspondiente en el menú.
7. **Facetas por tab (decisión revisada):** pestaña "Instructor" visible **solo si `es_profesor = true`** (bandera cruda, sin gate de Dan); "Maestro" solo si `es_maestro = true`. El gate de Dan queda exclusivamente en `esProfesor` (contexto, para el resto de la lógica). Un maestro sin `es_profesor` no ve "Instructor".
8. **Alumnos no son usuarios:** no existe vista "Alumno"; un usuario autenticado sin facetas ve solo "Inicio" con aviso informativo (el otorgamiento de facetas lo hace un superior/Service Role).
9. **Fail gracefully:** en este ítem no hay llamadas nuevas a Supabase (solo reorganización de rutas y UI estática); si se toca carga, va por `ejecutarConsulta`.
10. **Verificación:** `npm run typecheck` (no hay script de lint en `mobile/`). Migraciones solo con CLI (ninguna aquí).

## Contexto / objetivo
Construir la arquitectura de navegación por **tabs condicionales** (árbol de poder): migrar la pantalla `index` a un grupo `(tabs)` y habilitar las pestañas "Instructor" y "Maestro" según facetas del perfil, ocultándolas con `href: null` y protegiendo el acceso por URL con `Redirect` en cada landing. Esas pantallas muestran, como filas deshabilitadas, las opciones que cada Fase posterior implementará.

## Cambios concretos

### 1. `mobile/src/app/_layout.tsx` (editar)
- En el `Stack` raíz, reemplazar `index` por `(tabs)`:
  ```tsx
  <Stack.Protected guard={sesion != null && onboardingCompleto}>
    <Stack.Screen name="(tabs)" />
  </Stack.Protected>
  ```
- Se elimina la declaración de `index` (se moverá) y se conservan `onboarding`, `(auth)` y `nueva-contrasena` sin cambios.

### 2. `mobile/src/app/(tabs)/_layout.tsx` (nuevo)
- JS Tabs de `expo-router`; ocultamiento condicional **sin envoltorios** vía `href` en `options` (nativo, sin romper la barra inferior):
  ```tsx
  import { Tabs } from 'expo-router';
  import { useAuthGlobal } from '@/contextos/AuthGlobal';

  export default function TabsLayout() {
    const { esProfesorBandera, esMaestro } = useAuthGlobal();
    return (
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#C62828', tabBarInactiveTintColor: '#666', tabBarIcon: () => null }}>
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="instructor" options={{ title: 'Instructor', href: esProfesorBandera ? undefined : null }} />
        <Tabs.Screen name="maestro" options={{ title: 'Maestro', href: esMaestro ? undefined : null }} />
      </Tabs>
    );
  }
  ```
- Nota: `href: null` oculta la tab de la barra inferior pero **no** bloquea la navegación por URL; esa protección vive en cada pantalla (secciones 5 y 6). Si en la versión instalada el JS Tabs requiere el entry `expo-router/js-tabs`, ajustar el import (verificar contra docs v57 antes de codear).

### 3. `mobile/src/app/index.tsx` → `mobile/src/app/(tabs)/index.tsx` (mover + editar)
- Mover el archivo tal cual (misma ruta `/`).
- Cuando `!esProfesor && !esMaestro`, agregar un aviso (estilo del banner de pendiente `#FFF3E0`): *"Tu cuenta todavía no tiene habilitadas las pestañas de gestión. Un superior o la administración debe otorgarte las facetas."*
- Conservar sección "Solicitudes de alumnos" (si corresponde), banner de confirmación pendiente y "Cerrar sesión".

### 4. `mobile/src/components/FilaOpcionMenu.tsx` (nuevo)
- Fila reutilizable deshabilitada: `{ titulo, descripcion }` con etiqueta "Próximamente". `Pressable` con `disabled`, borde `#ccc`, título `#111`, descripción `#666` (mismos acentos del resto de la app). Evita duplicar estilo en las dos pantallas.

### 5. `mobile/src/app/(tabs)/instructor/index.tsx` (nuevo)
- **Redirección contra deep links al inicio del renderizado:** si `!esProfesorBandera`, renderizar `<Redirect href="/" />` (de `expo-router`); también pausar/evitar el resto del render.
- Título "Instructor" + subtítulo (gestión de alumnos directos). Lista `FilaOpcionMenu` deshabilitadas:
  - Mis alumnos (lista/detalle) · *Fase 4*
  - Alta de alumno · *Fase 4*
  - Grupos y horarios · *Fase 4*
  - Toma de asistencia · *Fase 4*
  - Cuotas de alumnos · *Fase 6*
  - Locaciones · *Fase 5*
  - Registro de alquileres · *Fase 5*
  - Postulación a examen · *Fase 7*

### 6. `mobile/src/app/(tabs)/maestro/index.tsx` (nuevo)
- **Redirección contra deep links al inicio del renderizado:** si `!esMaestro`, renderizar `<Redirect href="/" />` (de `expo-router`); también pausar/evitar el resto del render.
- Título "Maestro" + subtítulo (poder recursivo sobre la rama). Lista `FilaOpcionMenu` deshabilitadas:
  - Mesas de examen (planificación y apertura) · *Fase 7*
  - Planilla técnica de evaluación · *Fase 7*
  - Auditoría de locaciones en cascada · *Fase 5*
  - Estadísticas anonimizadas (dashboard) · *Fase 8*

### 7. Documentación
- Crear `documentacion/planes/mobile-rutas-condicionales-navegacion.md` (este plan) y fila en `documentacion/README.md`.
- Agregar ítems a `documentacion/pendientes-pruebas.md`.
- Al cerrar la implementación, marcar el ítem 2 de Fase 3 en `workflow-implementacion-mobile.md`.

## Criterios de aceptación y verificación
- [x] `npm run typecheck` limpio en `mobile/`.
- [x] `git status`: solo archivos de `mobile/` + documentación; `supabase/` y `web/` intactos.
- [ ] (Dispositivo) Usuario sin facetas → ve solo la pestaña "Inicio" con el aviso informativo.
- [ ] (Dispositivo) Profesor (`es_profesor = true`, con o sin Dan) → pestañas "Inicio" + "Instructor".
- [ ] (Dispositivo) Usuario con `es_profesor=true` y `es_maestro=true` sin grado Dan → "Inicio" + "Instructor" + "Maestro" (caso que motivó la v1.2).
- [ ] (Dispositivo) Maestro sin `es_profesor` → "Inicio" + "Maestro" (sin "Instructor").
- [ ] (Dispositivo) Deep link a `/instructor` o `/maestro` desde una cuenta no autorizada → `<Redirect href="/" />` lleva al usuario a "Inicio" (la pantalla no se renderiza).
- [ ] (Dispositivo) La barra inferior muestra solo las tabs habilitadas (verificar que no se rompe el layout al declarar las 3 `<Tabs.Screen>`).
- [ ] (Dispositivo) Flujo de linaje sin regresión: "Solicitudes de alumnos" sigue operando desde "Inicio".

---
🐧