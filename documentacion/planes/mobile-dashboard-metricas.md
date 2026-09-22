# Plan — Fase 8.1: Dashboard de métricas anonimizadas

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-22
> - **Módulo / Fase:** Fase 8, ítem 1 (`workflow-implementacion-mobile.md`)
> - **Referencias:** SRS §3.6, Reglas §2, `databaseModel.md`, migración `20260919025701_rls_gestion_escuela.sql`

## Historial de revisiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial: consumo del RPC `metricas_dashboard` en el tab Maestro, gráficos de distribución (género, rango de edad, grado) con filtro consolidada/específica. Aprobado e implementado en la misma fecha. |
| 1.1 | 2026-09-22 | Corrección posterior a la primera ejecución: `expo-linear-gradient` **es obligatoria** para `react-native-gifted-charts` (corrige la restricción #7). Sin ella, el import de `PieChart`/`BarChart` lanza `Gradient package was not found`, la ruta no evalúa y expo-router reporta un falso "missing default export". Se instala `expo-linear-gradient`. |

## Restricciones y Correcciones Previas (No repetir)

1. **Módulo de torneos congelado:** no tocar tablas, flujos ni lógica de torneos.
2. **Plataforma web congelada:** no tocar `web/`.
3. **Privacidad en cascada (SRS §2 / Reglas §2):** esta vista **solo** consume conteos agregados del
   RPC `metricas_dashboard`; **nunca** se listan ni consultan datos personales de alumnos indirectos
   (nombres, DNI, fechas, contacto).
4. **Sin migraciones:** el RPC `metricas_dashboard` ya existe y está aplicado (`grant execute` a
   `authenticated`). No se crean tablas, columnas ni políticas.
5. **Rango de edad `30+`:** el RPC agrupa `between 18 and 30` en `'18-30'` y el resto en `'30+'` (es
   decir, 31+). Decisión: corregir **solo la etiqueta visible** a "Mayores de 30" en la UI, **sin**
   tocar la BD.
6. **Filtro validado en el servidor:** la vista específica de un instructor no autorizado la rechaza
   el propio RPC; la app no replica esa validación ni muestra el texto crudo del error.
7. **Dependencia de gradiente (corrige v1.0):** `react-native-gifted-charts` declara
   `expo-linear-gradient`/`react-native-linear-gradient` como peers "opcionales", pero en la práctica
   su módulo `Components/common/LinearGradient` se **importa a nivel de módulo** desde `BarChart` y
   `PieChart`, y **lanza excepción si ninguna está instalada** (`Gradient package was not found`).
   Aunque no se usen degradados, **`expo-linear-gradient` es obligatoria** y se instala.
8. **Idioma:** código, comentarios y UI en español.

## Contexto / objetivo

El SRS §3.6 define un "panel de control interactivo" para usuarios con personal subordinado, con
distribución demográfica por **género, rangos de edad y niveles de graduación**, y herramientas de
filtrado entre **Vista Consolidada** (toda la rama descendente) y **Vista Específica** (un instructor
subordinado).

El backend ya lo resuelve: el RPC `metricas_dashboard(p_vista text default 'consolidada',
p_instructor uuid default null) returns jsonb` (migración `20260919025701`, líneas 307‑374) devuelve
únicamente conteos anonimizados de los descendientes del llamador. Faltaba la capa móvil: la fila
**"Estadísticas anonimizadas"** del menú Maestro estaba deshabilitada y no existía ruta.

**Objetivo:** consumir el RPC y presentar las tres distribuciones con gráficos, con filtro
consolidada/específica, respetando el fail gracefully y sin exponer datos personales.

**Fuera de alcance:** ampliar el RPC, agregar dimensiones nuevas, acceso de Profesor (queda solo
Maestro), exportación de datos.

## Contrato de datos del RPC

`supabase.rpc('metricas_dashboard', { p_vista, p_instructor })` → `jsonb`:

```json
{
  "total": 42,
  "por_genero":      { "masculino": 20, "femenino": 18, "otro": 4 },
  "por_rango_edad":  { "0-7": 1, "8-11": 5, "12-14": 9, "15-17": 8, "18-30": 15, "30+": 4 },
  "por_grado":       { "blanco": 10, "amarillo": 6, "dan_1": 3 }
}
```

Semántica relevante:

- `consolidada` → descendientes de `auth.uid()` (el propio Maestro **no** se cuenta:
  `descendientes()` arranca en `maestro_id = p_ancestro`).
- `especifica` + `p_instructor` → descendientes de ese instructor; el RPC valida que sea el llamador
  o un subordinado.
- `total` = cantidad de nodos descendientes (incluye instructores intermedios, no solo alumnos).
- Los bloques omiten `null` (sin género / sin fecha de nacimiento / sin grado).
- **Nunca** devuelve nombres ni datos personales.

## Cambios concretos

### 1) Dependencias — `mobile/package.json`

```
npx expo install react-native-svg
npx expo install react-native-gifted-charts
npx expo install expo-linear-gradient   # obligatoria para gifted-charts (import de LinearGradient)
```

- `react-native-svg` es parte del SDK 57 (incluido en Expo Go).
- `react-native-gifted-charts` es motor JS sobre `react-native-svg`; funciona en Expo Go.
- `expo-linear-gradient` es módulo del SDK 57 (incluido en Expo Go); la librería lo carga al importar
  los gráficos, aunque no se usen degradados.
- Verificación: `npx expo-doctor`.

### 2) Tipos y normalizador — `mobile/src/lib/perfil.ts`

```ts
export type VistaMetricas = 'consolidada' | 'especifica'

/** Agrupa el conteo de una categoría para graficar. */
export type ItemDistribucion = { clave: string; etiqueta: string; total: number }

export type MetricasDashboard = {
  total: number
  por_genero: ItemDistribucion[]      // siempre 3, orden fijo
  por_rango_edad: ItemDistribucion[]  // siempre 6, orden fijo
  por_grado: ItemDistribucion[]       // orden del enum GRADOS, solo con total > 0
}

export const GENEROS_METRICA = ['masculino', 'femenino', 'otro'] as const
export const RANGOS_EDAD_METRICA = [
  { clave: '0-7',   etiqueta: '0 a 7' },
  { clave: '8-11',  etiqueta: '8 a 11' },
  { clave: '12-14', etiqueta: '12 a 14' },
  { clave: '15-17', etiqueta: '15 a 17' },
  { clave: '18-30', etiqueta: '18 a 30' },
  { clave: '30+',   etiqueta: 'Mayores de 30' },
] as const

export function normalizarMetricas(json: unknown): MetricasDashboard
```

Comportamiento del normalizador:

- `total`: número (0 si falta / no es número).
- `por_genero`: recorre `GENEROS_METRICA` en orden, con `0` si la clave falta.
- `por_rango_edad`: recorre `RANGOS_EDAD_METRICA` en orden (última etiqueta "Mayores de 30").
- `por_grado`: recorre `GRADOS` (de `@/constants/grados`) con `etiquetaGrado()` e **incluye solo**
  categorías con `total > 0`.
- Ignora claves desconocidas y tolera `null` / valores no numéricos.

### 3) Acción — `mobile/src/contextos/AuthGlobal.tsx`

Se agrega al `type AuthGlobalValue`, siguiendo el patrón de `listarInstructoresSubordinados`:

```ts
obtenerMetricasDashboard(
  vista: VistaMetricas,
  instructorId?: string,
): Promise<ResultadoConsulta<MetricasDashboard | null>>
```

Implementación:

- `supabase.rpc('metricas_dashboard', { p_vista: vista, p_instructor: instructorId ?? null })`.
- Envuelto en `ejecutarConsulta(..., { modulo: 'estadisticas', contexto: 'obtenerMetricasDashboard' })`.
- Mapea con `normalizarMetricas`; errores/excepciones del RPC → `MENSAJE_ERROR_GENERICO`.
- Se suma al objeto del `useMemo` y a su lista de dependencias.

### 4) Componentes de gráficos — `mobile/src/components/`

- **`GraficoDona.tsx`** — `PieChart` en modo `donut` + leyenda (etiqueta, conteo, %). Entrada:
  `items: ItemDistribucion[]`. Se usa para **Género**.
- **`GraficoBarras.tsx`** — `BarChart` con prop `horizontal?: boolean` y altura calculada según la
  cantidad de categorías. Entrada: `items: ItemDistribucion[]`, `horizontal?: boolean`. Se usa para
  **Rango de edad** (vertical) y **Grado** (horizontal).
- Paleta institucional breve (`#C62828` y tonos neutros), coherente con `TarjetaMetrica` / menús.

### 5) Pantalla — `mobile/src/app/(tabs)/maestro/estadisticas.tsx` (nueva)

- Guard: `if (!esMaestro) return <Redirect href="/" />`.
- Carga con `useFocusEffect` (refresca al volver); estado `cargando` / `error` / `vacio` con botón
  **Reintentar** y `reportarError()` cuando el error es genérico (patrón de `maestro/auditoria.tsx`).
- **Filtro** (chips, patrón de auditoría): "Toda mi rama" (`consolidada`) + un chip por instructor de
  `listarInstructoresSubordinados()` (`especifica` + `p_instructor`).
- **Encabezado:** `TarjetaMetrica` con el `total` ("Integrantes en la vista") + nota "Datos
  anonimizados: nunca se muestran nombres ni datos personales".
- **Contenido** (en `ScrollView`): bloque **Género** (`GraficoDona`), **Rango de edad**
  (`GraficoBarras` vertical) y **Grado** (`GraficoBarras` horizontal, orden del enum, solo con
  `total > 0`).
- **Estados vacíos:** "No hay integrantes en tu rama descendente" / "Este instructor no tiene
  descendientes".
- Accesibilidad: `accessibilityRole="button"` y `accessibilityLabel` en chips.

### 6) Navegación

- `mobile/src/app/(tabs)/maestro/_layout.tsx`:
  `<Stack.Screen name="estadisticas" options={{ title: 'Estadísticas' }} />`.
- `mobile/src/app/(tabs)/maestro/index.tsx`: habilitar la fila "Estadísticas anonimizadas" con
  `onPresionar={() => router.push('/maestro/estadisticas')}`.

### 7) Documentación

- `documentacion/README.md`: alta del plan en el índice.
- `documentacion/workflow-implementacion-mobile.md`: marcar Fase 8, ítem 1 como implementada.
- `documentacion/plan-de-pruebas.md`: nuevo módulo **`TC-DASH`**, entradas al smoke test, metadatos y
  remoción del pendiente "Fase 8 sin casos".
- `documentacion/databaseModel.md`: el RPC ya está documentado; no requiere cambio.

## Casos de prueba agregados (`TC-DASH`)

| ID | Caso | Prioridad |
|---|---|---|
| TC-DASH-01 | Vista consolidada: total y 3 gráficos | Smoke |
| TC-DASH-02 | Vista específica por instructor | Regresión |
| TC-DASH-03 | Rama sin descendientes: estado vacío | Regresión |
| TC-DASH-04 | Cambiar filtro refresca sin reiniciar | Regresión |
| TC-DASH-05 | Distribución por género | Regresión |
| TC-DASH-06 | Distribución por rango de edad (incl. "Mayores de 30") | Regresión |
| TC-DASH-07 | Distribución por grado (orden del enum y etiquetas) | Regresión |
| TC-DASH-08 | Instructor no autorizado / red cortada (fail gracefully) | Smoke |

## Criterios de aceptación

- Con `jhonatancallegaleano@gmail.com` (Maestro), la fila "Estadísticas anonimizadas" abre la pantalla
  y muestra total + 3 gráficos de su rama.
- El chip de un instructor muestra **solo** su rama y coincide con el RPC en `especifica`.
- Usuario sin descendientes → estado vacío, sin errores.
- Red cortada → mensaje genérico + Reintentar; nunca excepciones, stack traces ni datos técnicos.
- La pantalla **no** lista personas ni consulta `profiles` de alumnos; solo el `jsonb` agregado.
- `npm run typecheck` y `npm run lint` pasan en `mobile/`; `npx expo-doctor` sin errores de
  dependencias.
- Sin migraciones ni cambios de esquema.

## Verificación

- `npx expo-doctor` en `mobile/`.
- `npm run typecheck` y `npm run lint` en `mobile/`.
- `supabase db lint --linked` (informativo; sin cambios de esquema).
- Query manual con la cuenta Maestro para contrastar el `jsonb` del RPC contra la pantalla.
- E2E en Expo Go con el árbol de 3 niveles del seed.

## Riesgos / notas

- `total` incluye instructores intermedios de la rama (comportamiento del RPC), no solo alumnos.
- Los porcentajes se calculan sobre la suma del bloque (los `null` excluidos hacen que la suma del
  bloque sea ≤ `total`).
- `react-native-gifted-charts` agrega peso al bundle; se asume como decisión de producto.
- Con muchos grados, las barras horizontales pueden ser largas: el bloque usa `ScrollView` y altura
  dinámica.

## Checklist de implementación

- [x] Dependencias `react-native-svg` + `react-native-gifted-charts` + `expo-linear-gradient`
  (`npx expo install`; la última corrige el crash de import de v1.0).
- [x] Tipos, constantes de orden y `normalizarMetricas()` en `mobile/src/lib/perfil.ts`.
- [x] Acción `obtenerMetricasDashboard(vista, instructorId?)` en `AuthGlobal` (+ tipo, memo y deps).
- [x] Componentes `GraficoDona` y `GraficoBarras`.
- [x] Pantalla `mobile/src/app/(tabs)/maestro/estadisticas.tsx`.
- [x] Ruta en `maestro/_layout.tsx` y fila habilitada en `maestro/index.tsx`.
- [x] Documentación: `README.md`, `workflow-implementacion-mobile.md`, `plan-de-pruebas.md`.
- [x] Verificación: `npm run typecheck` (OK), `npx expo-doctor` (21/21 OK), `supabase db lint --linked`
  (sin hallazgos nuevos; persiste un error preexistente y ajeno en una función de torneos congelada).
- [ ] Pruebas manuales en dispositivo (`TC-DASH-01..08`).
