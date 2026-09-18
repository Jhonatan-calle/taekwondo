# Plan: Doble categoría (participante en más de una categoría)

- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-17

## Historial de revisiones

- **v1.0 (2026-09-17):** Implementado. `lib/llaves/editar.ts` con invariante por categoría (`liberarDeCategoria`, `moverParticipante` scoped, `agregarParticipante` conservando apariciones); tests actualizados (33 OK); UI con liberar scoped y textos de doble categoría; migración `20260917234030_doble_categoria.sql` aplicada (RPC con defensa: sin repetidos por categoría ni auto-enfrentamientos); docs sincronizados. Typecheck + lint OK.
- **v0.2 (2026-09-17):** Correcciones de estructura del plan:
  1. Se agregó la sección **"Historial de revisiones"** justo debajo de los metadatos (requisito del flujo plan → revisión → implementación).
  2. Se agregó la sección **"Restricciones y Correcciones Previas (No repetir)"** antes del contexto y objetivo.
  3. En el punto 4 de "Cambios concretos" se especifica que la migración SQL debe generarse obligatoriamente con el CLI de Supabase usando el comando exacto `npx supabase migration new doble_categoria`.
- **v0.1 (2026-09-17):** Borrador inicial. Decisiones de alcance cerradas con el usuario: solo editor manual, libertad total con avisos, sin límite de categorías por participante.

## Restricciones y Correcciones Previas (No repetir)

- NO tocar archivos protegidos: `.env*`, vouchers/credenciales; NO commits ni push automáticos (solo si el usuario lo pide).
- Antes de codear verificar si ya existen helpers/librerías del proyecto; no reinventar.
- `web/src/lib/emparejamiento/` **NO se toca**; sus 53 tests Vitest deben seguir pasando (regla vigente de `panel-organizador.md`).
- `try/catch` → `registrarError` + mensaje genérico en UI; el registro de errores jamás rompe el flujo.
- `redirect()` fuera del `try`, o re-lanzar con `unstable_rethrow` antes de `registrarError` (regla del bugfix `fix-redireccion-emparejamiento`); jamás helpers custom.
- Migraciones generadas por CLI de Supabase (`npx supabase migration new <nombre>`); las ya aplicadas NO se modifican (se agrega función nueva con `create or replace`).
- Al cerrar: typecheck, lint y tests del stack.

## Contexto / objetivo

Hoy cada participante puede aparecer en una única casilla de todo el torneo (`lib/llaves/editar.ts`). Se requiere que el organizador pueda ubicar a un participante en **varias categorías** (conservando su categoría original) para que la mayor cantidad de competidores tenga rival. SRS B.2.3 ya otorga "control total" al organizador; esta capacidad opera **solo en el editor manual** (el generador automático sigue armando categorías estrictas).

### Decisiones cerradas

- Ámbito: **solo editor manual**. Motor `lib/emparejamiento/` intacto.
- Restricciones de la categoría extra: **libertad total** con las advertencias actuales (peso infantil ≤ 5 kg, rango y edad fuera) — solo informan, no bloquean.
- Sin límite de categorías por participante.
- Nuevo invariante: *cada participante aparece a lo sumo una vez POR categoría; puede aparecer en varias categorías*.

## Cambios concretos

1. **`web/src/lib/llaves/editar.ts`** — redefinir operaciones con alcance por categoría:
   - `moverParticipante(categorias, id, destino)`: ubica en el destino liberando previamente **solo dentro de la categoría destino** (no de las demás). `destino = null` libera todas las apariciones (bye total). El ocupante de la casilla destino pasa a sin ubicar solo en esa categoría.
   - `liberarParticipante(categorias, id, categoriaId)` → nueva firma con `categoriaId` (saca al participante solo de esa categoría). Exportar como `liberarDeCategoria` y actualizar `index.ts`.
   - `agregarParticipante(categorias, id, categoriaId)`: mantiene apariciones en otras categorías; no-op si el participante ya está en esa categoría; si no hay casilla libre crea enfrentamiento bye.
   - `ubicacionDe` se mantiene global (para la lista "sin ubicar" = 0 apariciones).
   - Actualizar comentarios de invariantes.

2. **`web/src/lib/llaves/editar.test.ts`** — ajustar casos existentes (mover entre categorías ahora conserva la aparición original) y agregar casos: aparición doble (una por categoría), liberar solo de la categoría indicada, ocupante desplazado solo en esa categoría, agregar conservando otra aparición.

3. **UI editor** — `web/src/app/(panel)/panel/organizador/editor-llaves.tsx`, `categoria-bracket.tsx`, `enfrentamiento-card.tsx`, `chip-participante.tsx`:
   - `onLiberar` pasa a `onLiberar(participanteId, categoriaId)` (CategoriaBracket envía su `categoria.id`).
   - `clickCasilla`: si el participante ya está en la categoría destino → mover dentro; si no → agregar conservando las demás.
   - Actualizar textos de ayuda ("Tocá un participante para moverlo o sumarlo a otra categoría; la 'x' lo saca de esa categoría").

4. **Migración SQL** — `web/supabase/migrations/<ts>_doble_categoria.sql`, generada obligatoriamente por el CLI de Supabase con el comando exacto:
   ```
   npx supabase migration new doble_categoria
   ```
   Debe crear (`create or replace`) `public.guardar_llaves_manuales` con defensa en profundidad: mantener los guards actuales (dueño, estado `armado_llaves`, inscripciones confirmadas) y **agregar**: dentro de cada categoría los ids en `a`/`b` deben ser únicos (participante repetido en la misma categoría → `raise exception`) y `a <> b` en un mismo enfrentamiento. Aplicar vía `npx supabase db push --linked`.

5. **Docs** — actualizar:
   - `documentacion/ReglasyRestricciones-SistemaTaekwondoITF.md`: regla de multi-categoría manual (libertad del organizador).
   - `documentacion/databaseModel.md`: nota de validación del RPC.
   - `documentacion/mvc/workflow.md` y `documentacion/planes/panel-organizador.md`: invariante "aparición única" → "una vez por categoría".

## Criterios de aceptación y verificación

- En el editor, un participante puede aparecer en varias categorías y guardar sin error.
- Sacar con "x" lo elimina solo de esa categoría, no de las demás.
- La lista "sin ubicar" solo muestra participantes con 0 apariciones.
- RPC rechaza repetición dentro de la misma categoría (defensa).
- `lib/emparejamiento/` intacto; typecheck + lint + `npm run test` (Vitest) pasan.
- Migración aplicada y verificada con `npx supabase migration list --linked`.