# Guía Estética — Taekwondo ITF

> Versión 1.0 · 2026-09-15

---

## 1. Tokens de diseño

### Color de marca

| Token | Light | Dark | Uso |
|---|---|---|---|
| `itf-red` | `#b91c1c` | `#f87171` | Acentos, alertas, CTA principales |
| `itf-blue` | `#1d4ed8` | `#60a5fa` | Enlaces, info, acentos secundarios |

Disponibles como clases Tailwind: `bg-itf-red`, `text-itf-blue`, `border-itf-red`, etc.

> Los colores ITF se usan **sparingly** para resaltar elementos de marca (logo, CTA). El
> sistema de colores base (primary, secondary, muted, destructive) es el que define la UI
> general vía las variables CSS de shadcn.

### Espaciado

El proyecto usa la escala estándar de Tailwind (`gap-*`, `p-*`, `px-*`, `py-*`):
- **Páginas (main):** `p-6`
- **Cards:** `p-6` (interno vía `CardHeader`/`CardContent`)
- **Campos de formulario:** `gap-4` entre campos, `gap-1.5` label→input
- **Secciones de página:** `gap-6`

### Radio de bordes

| Elemento | Clase Tailwind | Radio |
|---|---|---|
| Botones, inputs, selects | `rounded-lg` | `--radius` (0.625rem) |
| Cards | `rounded-2xl` | `--radius-2xl` |
| Badges | `rounded-full` | ∞ |
| List items (paneles) | `rounded-xl` | `--radius-xl` |

### Tipografía

- **Fuentes:** Geist Sans (body), Geist Mono (`code`, `kbd`)
- **Títulos de página:** `text-2xl font-semibold`
- **Títulos de sección (Card):** `text-lg font-semibold`
- **Labels de formulario:** `text-sm font-medium`
- **Body:** `text-sm` (default de Tailwind)
- **Small text / muted:** `text-sm text-muted-foreground`
- **Micro text (notas):** `text-xs text-muted-foreground`

---

## 2. Patrones de layout

### Page shell (páginas con formulario centrado)

Para páginas donde el contenido principal es un formulario único (login, registro, inscripción):

```tsx
<main className="flex flex-1 items-center justify-center p-6">
  <Card className="w-full max-w-sm">
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</main>
```

- `flex flex-1 items-center justify-center` → centrado vertical y horizontal
- `max-w-sm` → ancho máximo consistente para formularios simples
- `max-w-md` → para formularios más extensos (si es necesario en el futuro)
- `w-full` → mobile-first: en móvil ocupa todo el ancho

### Page shell (paneles con contenido largo)

Para páginas con múltiples secciones y scroll (panel de profesor):

```tsx
<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
  {/* secciones */}
</main>
```

- `mx-auto max-w-3xl` → centrado horizontal con ancho máximo para legibilidad
- `flex-col gap-6` → secciones apiladas con espacio consistente

### Card wrapper

Todas las cards del proyecto usan el componente `Card` de `@/components/ui/card`:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <p className="text-sm text-muted-foreground">Subtítulo</p>
  </CardHeader>
  <CardContent>
    {/* contenido */}
  </CardContent>
</Card>
```

### Nav persistente (paneles con rutas)

Para secciones de un panel con múltiples rutas, cada página usa el page-shell de "pateles con contenido largo" y la navegación vive en una barra persistente a nivel `layout`:

```tsx
// layout.tsx (Server): guard + header + nav
<header className="border-b">
  <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 p-6 pb-3">
    {/* título del panel + acciones (ej. cerrar sesión) */}
  </div>
</header>
<PanelNav />
{children}
```

- `PanelNav` es un componente **Client** (`src/app/(panel)/panel/nav-panel.tsx`) que usa `usePathname()` para marcar la pill activa con `aria-current="page"`.
- Pills: activo `bg-primary text-primary-foreground`; inactivo `text-muted-foreground hover:bg-muted`.
- `flex gap-1 overflow-x-auto` → en móvil las pestañas hacen scroll horizontal.
- Las Server Actions redirigen SIEMPRE a la ruta de la sección contextual (`/panel/torneos`, `/panel/inscripciones`), nunca a `/panel` genérico.

### Editor de llaves (chip participante + casilla)

Patrón del Panel del Organizador (`src/app/(panel)/panel/organizador/`) para editar enfrentamientos de forma táctil (Mobile-First):

- **Chip participante** (`chip-participante.tsx`): contenedor `flex flex-1 flex-col gap-1 rounded-lg border p-2.5` con nombre + `Badge` de grado y datos antropométricos en `text-xs text-muted-foreground`. Estado **seleccionado** = `border-primary bg-primary/10 ring-2 ring-primary/30`. El botón "x" (liberar/bye) es `text-muted-foreground hover:bg-destructive/10 hover:text-destructive`.
- **Casilla** (`enfrentamiento-card.tsx`): el enfrentamiento es `flex items-stretch gap-2 rounded-xl border p-3` con `vs` central (`text-xs uppercase text-muted-foreground`). La casilla vacía es un botón `border-dashed` con `+ Libre`; se deshabilita (`disabled:opacity-40`) hasta que hay un participante seleccionado.
- **Interacción de selección:** primer toque = seleccionar; segundo toque sobre casilla/rival = mover (el ocupante pasa a "sin ubicar"). El estado se muestra en una franja `rounded-lg bg-primary/10 px-3 py-2 text-sm`.
- **Sección "Sin ubicar"** (`lista-sin-ubicar.tsx`): filas `border-dashed` con `Select` de categoría + `Button variant="outline"`.
- Las advertencias de reglas se resuelven con `window.confirm` (no bloqueantes), sin modales propios.

---

## 3. Catálogo de componentes

Todos los componentes UI viven en `src/components/ui/` y se importan con `@/components/ui/<nombre>`.

| Componente | Archivo | Descripción |
|---|---|---|
| `Button` | `button.tsx` | Botón con variantes (default, outline, secondary, ghost, destructive, link) |
| `Badge` | `badge.tsx` | Etiqueta de estado/contabilidad (`rounded-full`); variantes `default`, `success`, `warning`, `destructive` |
| `Card` | `card.tsx` | Contenedor con borde, fondo `bg-card` y sombra `shadow-sm` |
| `CardHeader` | `card.tsx` | Header de la card (`p-6`) |
| `CardTitle` | `card.tsx` | Título dentro del header (`text-lg font-semibold`) |
| `CardDescription` | `card.tsx` | Subtítulo del header (`text-sm text-muted-foreground`) |
| `CardContent` | `card.tsx` | Contenido de la card (`p-6 pt-0`) |
| `Input` | `input.tsx` | Input de texto nativo estilizado (`h-9`, focus ring) |
| `Label` | `label.tsx` | Label de formulario (`text-sm font-medium`) |
| `Select` | `select.tsx` | Select nativo estilizado (`h-9`, focus ring) |
| `FormField` | `form-field.tsx` | Wrapper Label + Input (`flex flex-col gap-1.5`) |
| `SubmitButton` | `submit-button.tsx` | Botón de envío con `useFormStatus` automático; acepta `variant`/`size` del `Button` y `textoCargando` |

### Convenciones de creación de componentes

- Cada componente es una **función con nombre** (no `export default`).
- Los componentes extienden `React.ComponentProps<"elemento">` para heredar props nativas.
- Se usa `cn()` de `@/lib/utils` para fusionar clases.
- Se agrega `data-slot="nombre"` para debugging y selectores CSS.

---

## 4. Convenciones de className

### Reglas generales

1. **Tailwind primero:** usar clases utility de Tailwind. No escribir CSS custom a menos que sea necesario (keyframes, condiciones complejas).
2. **Nunca inline styles:** todo va en `className`.
3. **Bordes y sombras:** siempre vía clases (`border`, `shadow-sm`), nunca `style`.
4. **Colores de shadcn:** usar los tokens CSS (`bg-card`, `text-muted-foreground`, `border-border`, `text-destructive`). No usar colores hardcodeados (`text-red-500`) excepto para los tokens ITF (`bg-itf-red`).

### Donde poner estilos

| Tipo | Lugar |
|---|---|
| Estilos de componente reutilizable | `src/components/ui/<componente>.tsx` |
| Estilos de layout de página | `className` directo en el `<main>` o wrapper |
| Variantes de un componente | `cva()` dentro del archivo del componente |
| CSS global (animaciones, reset) | `src/app/globals.css` |
| Tokens de color/spacing | `@theme inline` en `globals.css` + variables en `:root`/`.dark` |

### Evitar

- Duplicar strings de clases entre archivos → usar componentes UI compartidos.
- Crear variantes nuevas sin documentarlas en esta guía.
- Usar `!important` o `@apply` innecesariamente.

---

## 5. Patrón canónico de formulario

Todo formulario en el proyecto sigue esta estructura:

```tsx
// page.tsx (Server Component)
<main className="flex flex-1 items-center justify-center p-6">
  <Card className="w-full max-w-sm">
    <CardHeader>
      <CardTitle className="text-xl">Título</CardTitle>
      <p className="text-sm text-muted-foreground">Subtítulo</p>
    </CardHeader>
    <CardContent>
      <MiFormulario ... />
    </CardContent>
  </Card>
</main>
```

```tsx
// mi-formulario.tsx (Client Component)
'use client'

import { useActionState } from 'react'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function MiFormulario({ ... }: Props) {
  const [state, formAction] = useActionState<Resultado, FormData>(miAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Campo" htmlFor="campo">
        <Input id="campo" name="campo" type="text" required />
      </FormField>

      <FormField label="Selección" htmlFor="opcion">
        <Select id="opcion" name="opcion" required defaultValue="">
          <option value="" disabled>Seleccioná...</option>
          {/* opciones */}
        </Select>
      </FormField>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton texto="Enviar" />
    </form>
  )
}
```

### Checklist de formulario

- [ ] `Card` con `max-w-sm` (formularios simples) o `max-w-md` (extensos)
- [ ] `FormField` para cada campo (label + input/select)
- [ ] `SubmitButton` con `texto` (y `textoCargando` si difiere del default "Procesando…")
- [ ] `useActionState` para manejar el estado del Server Action
- [ ] Error display con `rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive`
- [ ] Sin clases de input duplicadas — todo vía componentes UI
