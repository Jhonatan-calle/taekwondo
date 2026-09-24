# Plan: date-picker en todos los campos de fecha (app móvil)

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.2 |
| **Estado** | Aprobado (implementado; fecha de mesa **sin límite**) |
| **Fecha** | 2026-09-24 |
| **Autor** | Agente IA (sesión demo) |
| **Alcance** | App móvil (`mobile/`, Expo) — solo UI/validación; sin cambios de BD |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Borrador inicial: reemplazar campos de fecha/periodo de texto libre por selectores nativos. |
| 1.1 | 2026-09-24 | **Aprobado e implementado.** Decisión del usuario: el selector de mes **permite periodos futuros**. Se implementaron utilidades, `CampoFecha`, `CampoPeriodo` y las 3 pantallas; `typecheck`/`lint` en verde. |
| 1.2 | 2026-09-24 | **Revertido el límite de fecha de mesa** (a pedido): se quita el mínimo "hoy" en el date-picker y la validación de fecha pasada; las mesas se pueden crear/editar con **cualquier** fecha. El selector de fecha sigue. La validación en BD también se revirtió (`planes/bd-validar-fecha-mesa.md`). |

## Restricciones y Correcciones Previas (No repetir)

- **Reusar lo existente:** `@react-native-community/datetimepicker@9.1.0` **ya está instalado** y en uso
  (`onboarding.tsx`, `alta-alumno.tsx`, `nueva-clase.tsx`). **No** agregar dependencias nuevas.
- **API v9.1.0:** `onChange` está **deprecado**; usar **`onValueChange` + `onDismiss`**
  (`alta-alumno.tsx` ya lo hace así). No volver a `onChange` en código nuevo.
- **Contrato de datos intacto:** la BD sigue guardando `fecha` como `AAAA-MM-DD` (`date`) y
  `periodo` como `AAAA-MM` (`text`). El selector solo cambia **cómo se elige**, no el formato guardado.
- **Fail gracefully:** errores de BD/servicios envueltos en try/catch con mensaje genérico (ya
  vigente en estas pantallas); no romper ese patrón.
- **No tocar congelados:** módulo de torneos y `web/`.
- **Riesgo demo (mañana):** cambios acotados a UI de formularios; **no** refactorizar pantallas que
  ya funcionan con picker (onboarding/alta-alumno/nueva-clase) para no introducir regresiones.
- **Idioma:** código, comentarios y copy en español.

## Contexto / objetivo

Hoy varios formularios piden fechas **como texto libre** (`AAAA-MM-DD`), lo que es propenso a errores
de tipeo y a formatos inválidos. El objetivo es que **todos los campos de fecha/mes se elijan con un
selector** (date-picker nativo o selector de mes), manteniendo el mismo formato persistido y las
mismas reglas de negocio.

### Campos relevados

| Pantalla | Campo | Estado actual | Objetivo |
|---|---|---|---|
| `(tabs)/maestro/mesas/nueva.tsx` | **Fecha** (de la mesa) | `CampoTexto` texto libre | `CampoFecha` (date-picker) |
| `(tabs)/instructor/alumno/[id]/cuota.tsx` | **Periodo** | `CampoTexto` texto libre | `CampoPeriodo` (selector de mes) |
| `(tabs)/instructor/alumno/[id]/cuota.tsx` | **Fecha de pago** | `CampoTexto` texto libre | `CampoFecha` (date-picker ≤ hoy) |
| `(tabs)/instructor/locacion/[id]/pago.tsx` | **Periodo** | `CampoTexto` texto libre | `CampoPeriodo` (selector de mes) |
| `(tabs)/instructor/locacion/[id]/pago.tsx` | **Fecha de pago** | `CampoTexto` texto libre | `CampoFecha` (date-picker ≤ hoy) |
| `onboarding.tsx` (fecha nacimiento) | Fecha | **ya** date-picker | sin cambios |
| `(tabs)/instructor/alta-alumno.tsx` (fecha nacimiento) | Fecha | **ya** date-picker | sin cambios |
| `(tabs)/instructor/nueva-clase.tsx` (fecha de clase) | Fecha | **ya** date-picker | sin cambios |

## Hallazgo (a decidir en revisión)

`esFechaValida()` (`mobile/src/lib/perfil.ts:467`) devuelve `fecha <= new Date()`, es decir
**rechaza fechas futuras y acepta pasadas**. En `mesas/nueva.tsx` se usaba con el mensaje
*"Ingresá una fecha válida (no anterior a hoy)"*, que decía **lo contrario** de lo que validaba.

- **Resolución final (v1.2):** a pedido del usuario, **no hay ningún límite de fecha** en las mesas:
  el date-picker permite **cualquier** fecha (pasada o futura) y la validación solo exige que sea
  una fecha bien formada (`esFechaBienFormada`). Se descartó el "hoy o posterior" y también la
  validación en BD (ver `planes/bd-validar-fecha-mesa.md`, Revertido).
- `esFechaValida` se mantiene **sin cambios** para cuota/pago (fecha de pago: no futura).

## Cambios concretos

### 1. Utilidades (`mobile/src/lib/perfil.ts`)

Agregar (sin tocar `esFechaValida`, `esPeriodoValido`, `mesActual`, `formatearPeriodo`):

```ts
// 'AAAA-MM-DD' -> Date local (inverso de aIsoLocal). null si no es una fecha de calendario válida.
export function fechaLocalDesdeISO(fechaISO: string): Date | null

// Fecha de calendario válida (sin restricción de rango).
export function esFechaBienFormada(fechaISO: string): boolean

// 'DD/MM/AAAA' a partir de un Date local.
export function formatearFechaLegible(fecha: Date): string
```

> La utilidad `esFechaNoPasada` (para "hoy o posterior") se agregó en v1.1 y se **eliminó en v1.2**
> al revertirse el límite de fecha de mesa.

> `formatearFechaLegible` hoy está duplicada como función local en `nueva-clase.tsx`; se centraliza
> en `lib/perfil.ts`. (Opcional, fuera de alcance: migrar esa pantalla para usar la compartida.)

### 2. Componente nuevo `mobile/src/components/CampoFecha.tsx`

Envoltorio reutilizable del `DateTimePicker` (patrón ya usado en `alta-alumno.tsx`).

**Props:**

```ts
type Props = {
  label: string;
  value: Date | null;
  onChange: (fecha: Date) => void;
  error?: string;
  minimo?: Date;          // opcional
  maximo?: Date;          // opcional
  placeholder?: string;   // por defecto 'Seleccionar fecha'
};
```

**Comportamiento:**
- `Pressable` (`accessibilityRole="button"`) que muestra `formatearFechaLegible(value)` o el
  placeholder; borde rojo si `error`.
- Al presionar abre el picker (`useState` local).
- `<DateTimePicker mode="date" value={value ?? new Date()} minimumDate={minimo} maximumDate={maximo}
  display={Platform.OS === 'ios' ? 'inline' : 'default'}
  onValueChange={(_e, fecha) => { if (Platform.OS !== 'ios') setMostrar(false); onChange(fecha); }}
  onDismiss={() => setMostrar(false)} />`.
- Estilo consistente con el form (label + recuadro + texto de error).

### 3. Componente nuevo `mobile/src/components/CampoPeriodo.tsx`

`@react-native-community/datetimepicker` **no** tiene modo solo-mes; se implementa un selector de mes
propio con `Modal` de React Native (**sin dependencias nuevas**).

**Props:**

```ts
type Props = {
  label: string;
  value: string;                    // 'AAAA-MM'
  onChange: (periodo: string) => void;
  error?: string;
  minAnio?: number;                 // por defecto año actual - 5
  maxAnio?: number;                 // por defecto año actual
};
```

**Comportamiento:**
- `Pressable` que muestra `formatearPeriodo(value)` (ej. `09/2026`).
- Abre un `Modal` con:
  - Cabecera con **selector de año** `‹ 2026 ›` (respeta `minAnio`/`maxAnio`; por defecto ±5 años,
    por lo que **permite periodos futuros**, decisión aprobada).
  - Grilla de **12 meses** en español (Enero…Diciembre); el mes vigente resaltado.
  - Al elegir mes: `onChange(`${anio}-${MM}`)` y cierra.
- Accesibilidad: cada mes `accessibilityRole="button"` + `accessibilityState={{ selected }}`.

### 4. Pantallas

**`mobile/src/app/(tabs)/maestro/mesas/nueva.tsx`**
- Estado: `fecha: string` → `fechaSeleccionada: Date` (init `new Date()`).
- Precarga en edición: `setFechaSeleccionada(fechaLocalDesdeISO(mesa.fecha) ?? new Date())`.
- Reemplazar `<CampoTexto label="Fecha *" …>` por
  `<CampoFecha label="Fecha *" value={fechaSeleccionada} onChange={setFechaSeleccionada}
  error={errores.fecha} />` (**sin `minimo`**: cualquier fecha es válida).
- Validación: `if (!esFechaBienFormada(aIsoLocal(fechaSeleccionada))) e.fecha = 'Elegí una fecha válida.';`
  (misma para crear y editar).
- Al enviar: enviar `aIsoLocal(fechaSeleccionada)` en lugar de `fecha`.

**`mobile/src/app/(tabs)/instructor/alumno/[id]/cuota.tsx`**
- `periodo` → `<CampoPeriodo label="Periodo *" value={periodo} onChange={setPeriodo} error={errores.periodo} />`.
- `fecha: string` → `fechaSeleccionada: Date`; `<CampoFecha label="Fecha de pago *"
  value={fechaSeleccionada} onChange={setFechaSeleccionada} maximo={new Date()} error={errores.fecha} />`.
- Validación existente: `esPeriodoValido(periodo)` y
  `esFechaValida(aIsoLocal(fechaSeleccionada))` (no futura) — **sin cambios de regla**.
- Enviar `aIsoLocal(fechaSeleccionada)`.

**`mobile/src/app/(tabs)/instructor/locacion/[id]/pago.tsx`**
- Idéntico a cuota: `periodo` → `CampoPeriodo`; `fechaPago` → `fechaSeleccionada: Date` + `CampoFecha`
  con `maximo={new Date()}`; validación y contrato sin cambios.

### 5. Sin cambios (ya cumplen)

- `onboarding.tsx`, `(tabs)/instructor/alta-alumno.tsx`, `(tabs)/instructor/nueva-clase.tsx`
  (ya usan `DateTimePicker`).
- Backend, RPCs, RLS, migraciones: **ninguno**.

### 6. Documentación a actualizar al implementar

- `documentacion/plan-de-pruebas.md`:
  - `TC-MES-01`: ajustar pasos ("elegir fecha con el selector; no permite fechas pasadas al crear").
  - `TC-CUO-01`, `TC-CUO-07`: ajustar pasos (periodo con selector de mes; fecha de pago con picker).
  - `TC-ALQ-01`: ajustar pasos (periodo con selector de mes; fecha con picker).
  - Alta prioridad: agregar caso **"campos de fecha usan selector (no texto libre)"** por pantalla.
- `documentacion/prueba-manual.md`: actualizar la nota técnica del apartado Mesas (ya no es texto
  libre) y agregar el paso con el selector.
- `documentacion/README.md`: registrar este plan.

## Criterios de aceptación

1. En **crear/editar mesa**, "Fecha" se elige con el date-picker y se puede elegir **cualquier**
   fecha (sin límite de rango); el valor se guarda igual (`AAAA-MM-DD`).
2. En **registrar cuota** y **registrar pago**, "Periodo" se elige con el selector de mes (formato
   `AAAA-MM`) y "Fecha de pago" con el date-picker (no permite futuras).
3. El valor persistido conserva los formatos `AAAA-MM-DD` y `AAAA-MM`.
4. `npm run typecheck` y `npm run lint` en verde (0 problemas).
5. Sin regresiones en onboarding, alta de alumno y creación de clase (siguen usando su picker).
6. Prueba en dispositivo (Android/Expo Go): los selectores abren, se cierran y respetan los límites.

## Verificación

- App: `cd mobile && npm run typecheck && npm run lint`.
- Manual (dispositivo), según `documentacion/prueba-manual.md` y el guion de demo:
  - Mesa: crear con cualquier fecha (pasada o futura) — sin límite.
  - Cuota: elegir periodo de un mes anterior + fecha de pago pasada (ok); fecha futura (bloqueada).
  - Pago de alquiler: elegir periodo y fecha pasada (ok); fecha futura (bloqueada).
- BD: sin migraciones nuevas; verificar que el alta sigue guardando exactamente los mismos valores.

## Estado de implementación (2026-09-24)

- [x] Utilidades en `mobile/src/lib/perfil.ts` (`fechaLocalDesdeISO`, `esFechaBienFormada`,
      `formatearFechaLegible`).
- [x] `mobile/src/components/CampoFecha.tsx`.
- [x] `mobile/src/components/CampoPeriodo.tsx` (permite periodos futuros).
- [x] `mobile/src/app/(tabs)/maestro/mesas/nueva.tsx` (Fecha con picker, **cualquier fecha**; v1.2).
- [x] `mobile/src/app/(tabs)/instructor/alumno/[id]/cuota.tsx` (Periodo + Fecha de pago).
- [x] `mobile/src/app/(tabs)/instructor/locacion/[id]/pago.tsx` (Periodo + Fecha de pago).
- [x] `npm run typecheck` y `npm run lint` en verde (0 problemas).
- [x] Documentación: `plan-de-pruebas.md`, `prueba-manual.md` y `README.md`.
- [ ] Prueba manual en dispositivo: crear/listar mesa con date-picker ✅ (2026-09-24); pendiente
      editar/cerrar de mesa y los selectores de cuota/pago.

## Fuera de alcance

- Cambiar el modelo/formatos de fecha en la BD.
- Migrar `onboarding.tsx` y `nueva-clase.tsx` de `onChange` (deprecado) a `onValueChange`.
- Reutilizar `CampoFecha` en las pantallas que ya tienen picker (consolidación posterior).
- Cualquier módulo congelado (torneos, `web/`).

---

🐧
