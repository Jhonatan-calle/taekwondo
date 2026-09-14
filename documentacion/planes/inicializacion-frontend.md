# Plan: Inicialización del Frontend

> **Metadatos**
> - **Versión:** 1.2
> - **Estado:** Aprobado

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | — | Borrador inicial: proyecto en `app/`. |
| 1.1 | 2026-09-14 | Correcciones revisor: directorio `frontend/`, viewport 360–390px, Turbopack y `.env` resueltos. |
| 1.2 | 2026-09-14 | **Cambio solicitado por el usuario:** directorio destino pasa a **`web/`**. Flag `--turbopack` incorporado directamente al comando de inicialización. |

## Restricciones y Correcciones Previas (No repetir)
1. **NO usar `app/` como carpeta raíz del proyecto** (colisiona con `web/src/app/` y genera redundancia). La carpeta destino es **`web/`**.
2. **NO dejar el criterio Mobile-First sin método de verificación:** emular viewport móvil `360px`–`390px` en las DevTools del navegador.
3. **NO dejar ambigüedad técnica pendiente:** Turbopack y `.env.local` quedan resueltos en las secciones 4.1 y 4.2.
4. Reglas globales del proyecto: no tocar `.obsidian/`, `.env*` ni credenciales; no hacer commits/push automáticos; todo en español.

## Contexto / objetivo
Inicializar el stack de frontend de `documentacion/mvc/stack.md` (Next.js + React + Tailwind + shadcn/ui, Mobile-First) para el MVP (Módulo de Torneos). Primer ítem de la **Fase 1** de `documentacion/mvc/workflow.md`.

## Cambios concretos

### 1. Inicialización de Next.js en `web/`
Desde la raíz `/home/jhonatan/Documentos/taekwondo/`, ejecutar **exactamente**:

```
npx create-next-app@latest web --ts --eslint --tailwind --app --src-dir --turbopack --use-npm --yes
```

- TypeScript, ESLint y Tailwind activos.
- App Router con `src/` → `web/src/app/`.
- Import alias `@/*`.
- React Compiler: no se habilita.

### 2. Decisiones técnicas explícitas
- **Turbopack (4.1):** el flag `--turbopack` se pasa **directamente en el comando** de `create-next-app`, que configura el script `dev` del `package.json` solo; **no** se edita el `package.json` manualmente después.
- **`.env.local` (4.2):** **no** se crea en esta fase; queda **postergado** al siguiente ítem del workflow ("Inicialización del Backend y Base de Datos / Supabase"). Las variables de entorno son archivos protegidos.

### 3. Setup de shadcn/ui
Dentro de `web/`:
```
npx shadcn@latest init
```
- CSS variables, base de color neutral, alias `@/*`.
- Genera `components.json`, `lib/utils.ts` y estilos en `src/app/globals.css`.

## Criterios de aceptación y verificación
1. `npm run lint` en `web/` sin errores.
2. `npm run build` en `web/` exitoso.
3. Servidor dev responde en `http://localhost:3000` con la página base.
4. **Mobile-First explícito:** emular viewport `360px`–`390px` en DevTools, sin desbordes horizontales y con legibilidad/funcionalidad correcta.
5. Estructura final esperada: `web/` con `src/`, Tailwind y shadcn/ui inicializados.
6. `documentacion/mvc/workflow.md` → Fase 1, ítem "Inicialización del Frontend" marcado `[x]`.