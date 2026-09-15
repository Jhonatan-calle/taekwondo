# Plan: Guía Estética + Consistencia Visual del Proyecto

> **Metadatos**
> - **Versión:** 1.0
> - **Estado:** Aprobado
> - **Fecha de aprobación:** 2026-09-15

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-15 | Borrador y aprobación inmediata con 3 directivas: submit-button, cards, tokens ITF. |

## Contexto / objetivo
Consolidar un design system centralizado y eliminar la duplicación de estilos detectada
tras el flujo de inscripción web: `inputClase`, `BotonEnviar`, error-styling y label-wrapper
repetidos en 4 formularios. Corregir el formulario de inscripción (centrado y card wrapper).

## Cambios concretos

### 1. Componentes UI compartidos (`web/src/components/ui/`)
- **`input.tsx`** — Input nativo estilizado (`h-9 rounded-lg border ... focus-visible:ring-2`)
- **`label.tsx`** — Label (`text-sm font-medium`)
- **`select.tsx`** — Select nativo estilizado (mismo patrón que Input)
- **`card.tsx`** — `Card`, `CardHeader`, `CardTitle`, `CardContent` (shadcn pattern con divs)
- **`form-field.tsx`** — Wrapper `FormField` label + children (`flex flex-col gap-1.5`)
- **`submit-button.tsx`** — `SubmitButton` con `useFormStatus`, texto de carga configurable

### 2. Tokens de color ITF (`web/src/app/globals.css`)
- Agregados en `@theme inline`: `--color-itf-red: var(--itf-red)`, `--color-itf-blue: var(--itf-blue)`
- `:root`: `--itf-red: #b91c1c`, `--itf-blue: #1d4ed8`
- `.dark`: `--itf-red: #f87171`, `--itf-blue: #60a5fa`
- Disponibles como `bg-itf-red`, `text-itf-blue`, etc.

### 3. Refactorizar 4 formularios
- `login/login-form.tsx` → `FormField` + `Input` + `SubmitButton`
- `registro/registro-form.tsx` → idem
- `t/[token]/inscripcion-form.tsx` → idem + `Select`
- `(panel)/panel/torneo-nuevo-form.tsx` → idem + `textoCargando="Creando…"`
- Eliminados: `inputClase` string, `BotonEnviar` local, clases inline de inputs

### 4. Refactorizar 4 páginas de layout con Card
- `login/page.tsx` — `Card` + `CardHeader` + `CardContent`, `max-w-sm`
- `registro/page.tsx` — idem
- `t/[token]/page.tsx` — `Card` + `flex items-center justify-center` para centrado; componente `Mensaje` también en `Card`
- `(panel)/panel/page.tsx` — `Card` para secciones "Nuevo torneo" y "Tus torneos", `mx-auto max-w-3xl`

### 5. Guía estética (`documentacion/guia-estetica.md`)
- Tokens de diseño (colores, spacing, radio, tipografía)
- Patrones de layout (page shell, card wrapper, max-widths)
- Catálogo de componentes UI
- Convenciones de className
- Patrón canónico de formulario

## Verificación
- [x] `npm run lint` OK en `web/`
- [x] `npm run build` OK en `web/`
- [x] Sin strings de input ni `BotonEnviar` duplicados
- [x] `/t/[token]` centrado y en card
- [x] Login/registro/panel sin regresión visual
