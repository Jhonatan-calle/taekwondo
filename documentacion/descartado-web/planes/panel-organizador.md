# Plan: Panel del Organizador — Armado y Edición Manual de Llaves

> **Metadatos**
> - **Versión:** 1.1
> - **Estado:** Aprobado (2026-09-17)

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-17 | Borrador inicial. |
| 1.1 | 2026-09-17 | Implementado y verificado (lint + build + 53 tests OK). Estado → Aprobado. |

## Restricciones y Correcciones Previas (No repetir)
1. NO tocar `.env*`. NO commits/push automáticos. Migraciones por CLI (`npx supabase migration new panel_organizador`).
2. **RLS-first:** todas las lecturas con `createClient` (sesión del organizador, apoyándose en RLS). Escritura de llaves **solo** vía RPC `guardar_llaves_manuales` (SECURITY DEFINER, valida `organizador_id` y estado adentro, `search_path = public`). Nunca `supabaseAdmin` para datos operativos.
3. `try/catch` → `registrarError` (módulo `organizador`) + mensaje genérico ("No pudimos guardar los cambios en las llaves, intentá de nuevo en unos minutos."). `redirect()` fuera del `try`, o re-lanzar con `unstable_rethrow` (regla vigente del bugfix de emparejamiento).
4. En consultas embedded Supabase la tabla del usuario es `profiles` y la propiedad `fila.profiles` (nunca `perfiles`). Para el detalle de llaves **no** se embeddean ambas FKs (`participante_a`/`participante_b`) hacia `inscripciones` (evita ambigüedad de JOIN); los datos de los participantes se resuelven desde el mapa de confirmados ya cargado.
5. El filtro `estado='confirmado'` se aplica en `datos.ts` **y** está blindado por RLS (`inscripciones_select_organizador`). Un pendiente jamás llega al panel del organizador (doble capa).
6. `lib/emparejamiento/` NO se toca; los 23 tests Vitest deben seguir pasando. El módulo nuevo `lib/llaves/` es puro y determinista (sin I/O), espejando el patrón del motor.
7. El editor permite el control total del organizador (SRS B.2.3): la regla infantil de ≤5 kg se informa con advertencia, **no bloquea**.

## Decisiones cerradas (feedback de usuario)
- **D-1:** Edición manual **completa**: mover participantes entre enfrentamientos y categorías, liberar (bye) y agregar confirmados sin ubicar. El editor construye el **estado final de la llave** y la guarda atómicamente vía RPC `guardar_llaves_manuales`, con el **mismo contrato jsonb** que `generar_llaves` (reemplazo completo con cascade del torneo; el torneo permanece en `armado_llaves`).
- **D-2:** Los confirmados que al generar quedaron fuera (datos incompletos, liberados, etc.) aparecen en la lista **"Participantes sin ubicar"** y el organizador puede insertarlos manualmente en cualquier llave.
- **D-3:** Advertencias de seguridad/categoría (infantil ≤5 kg, rango/edad fuera) = aviso con confirmación en la UI; nunca bloquean.

## Contexto / objetivo
Cuarto ítem de Fase 3. Panel del organizador (`/panel/organizador`) alimentado **exclusivamente** por inscripciones `confirmado` (regla §3 y SRS §B.2.1), que visualiza las llaves armadas por el motor y brinda **control total de edición manual** (SRS B.2.3): mover, liberar y agregar participantes. Se apoya en las RLS ya existentes (SELECT del organizador sobre `categorias/llaves/enfrentamientos`, SELECT de confirmados e `inscripciones_datos_privados`) y en el contrato jsonb del motor para la persistencia.

## Cambios concretos

### 1. Navegación — `web/src/app/(panel)/panel/nav-panel.tsx`
- Agregar pill `{ href: '/panel/organizador', label: 'Organizador' }` a `SECCIONES`. Hereda el shell `(panel)/panel/layout.tsx` (`requireProfesor` + header + nav).

### 2. Datos — `web/src/app/(panel)/panel/organizador/datos.ts` (nuevo, server)
- **Reutilizar** `listarTorneos` de `../datos` (idéntico: `organizador_id = user.id`). No duplicar queries.
- `contarConfirmadosPorTorneo(supabase, torneoIds)`: `inscripciones` `.select('torneo_id').eq('estado','confirmado').in('torneo_id', ids)` → `Map<torneoId, number>` (RLS filtra confirmados).
- `listarDetalleOrganizador(supabase, torneoId, organizadorId)` → `{ torneo, confirmados, categorias } | null`:
  - Torneo: `.eq('id', torneoId).eq('organizador_id', organizadorId).maybeSingle()` (ausente → `null`).
  - Confirmados: `inscripciones` `.select('id, datos_antropometricos, inscripciones_datos_privados(nivel_agresividad), profiles!inscripciones_alumno_id_fkey(nombre_completo)')` `.eq('torneo_id', id).eq('estado','confirmado')` → `ParticipanteLlave[]` (nombre, grado, peso, altura, edad calculada, agresividad). Mapa `Map<inscripcionId, ParticipanteLlave>`.
  - Categorías: `categorias` `.select('id, nombre, rango_min, rango_max_especial, edad_min, edad_max, llaves(id, nombre_ronda, orden, enfrentamientos(id, participante_a, participante_b)))` `.eq('torneo_id', id)` `.order('edad_min')` → `CategoriaEditor[]` (enfrentamientos aplanados de las llaves; ids crudos).
- Tipos reutilizados de `lib/llaves/tipos.ts`.

### 3. Módulo puro — `web/src/lib/llaves/`
- **`tipos.ts`:** `Lado`, `EnfrentamientoEditor`, `CategoriaEditor`, `ParticipanteLlave`, `DestinoMover`, `PayloadCategoriaGuardar`, `PayloadGuardarLlaves`.
- **`editar.ts`:** `liberarDeCategoria` (bye parcial), `moverParticipante` (destino `null` = liberar de todas; en un destino solo libera dentro de la categoría destino), `agregarParticipante` (a la primera casilla vacía de la categoría; si no hay, crea enfrentamiento bye). Invariantes: un participante a lo sumo una vez POR categoría (doble categoría habilitada, SRS B.2.3); enfrentamientos con ambos lados nulos se podan; colisión en el destino → el ocupante pasa a sin ubicar solo en esa categoría.
- **`payload.ts`:** `serializarPayload(categorias)` → `PayloadGuardarLlaves` (mismo contrato que `generar_llaves`); `parsePayload(jason)` → valida forma (uuid-null en `a`/`b`) y devuelve `null` ante JSON inválido.
- **`advertencias.ts`:** `esCategoriaInfantil(categoria)` (`edad_max != null && edad_max <= 13`, espejo de `EDAD_MAX_INFANTIL`); `advertenciasPar(a, b, categoria)` → `{ peso_infantil, rango_fuera, edad_fuera }[]` usando `reglas.ts` (determinarRango/determinarBanda) del motor (import puro, sin modificarlo).
- **Tests (Vitest):** mover libera origen y asigna destino; colisión desplaza al ocupante; liberar; poda de vacíos; invariante de una sola aparición; `agregarParticipante`; re-serialización del payload; `parsePayload` (válido/inválido); advertencia peso infantil; rango/edad fuera.

### 4. RPC — `web/supabase/migrations/<ts>_panel_organizador.sql`
`create or replace function public.guardar_llaves_manuales(p_torneo_id uuid, p_categorias jsonb) returns void` SECURITY DEFINER `set search_path = public`:
1. Valida `organizador_id = auth.uid()` (raise si no).
2. Valida `torneos.estado = 'armado_llaves'` (raise si no).
3. Defensa en profundidad: para cada `a`/`b` del payload verifica que la `inscripciones` pertenezca al torneo y esté en `estado='confirmado'` (raise si no); además rechaza participantes repetidos DENTRO de la misma categoría y auto-enfrentamientos (`a = b`) — la doble categoría se vale entre categorías distintas (migración `doble_categoria`).
4. `delete from categorias where torneo_id = p_torneo_id` (cascade a llaves/enfrentamientos) y reconstruye desde el payload (mismo bucle que `generar_llaves`), **sin** cambiar el estado del torneo.
> Nota: reconstruir categorías/llaves cambia sus ids en cada guardado (igual que regenerar); se documenta porque el módulo en vivo referenciará FKs recién creadas.

### 5. Server Actions — `web/src/app/(panel)/panel/organizador/actions.ts` (nuevo)
- `guardarLlavesManuales(_estadoPrevio, formData)`: campos `torneo_id` + `payload` (JSON string).
  1. Validar uuid; `requireUser()`; cargar torneo `.eq('id',id).eq('organizador_id', user.id).maybeSingle()` (ausente → "El torneo no existe o no tenés permisos para modificarlo.").
  2. `estado !== 'armado_llaves'` → "El torneo ya está en curso o finalizado; no se pueden modificar las llaves."
  3. `parsePayload(payload)` → null → "Los datos de las llaves no son válidos."
  4. `supabase.rpc('guardar_llaves_manuales', { p_torneo_id, p_categorias })`.
  5. `redirect('/panel/organizador/<id>?guardadas=1')`.
  - `try/catch` → `unstable_rethrow` + `registrarError` + mensaje genérico.

### 6. UI (Mobile-First, page-shell `max-w-3xl p-6`)
- **`panel/organizador/page.tsx`** (Server): listado de torneos propios: nombre, `fechaLegible`, Badges estado + confirmados, link "Ver panel" al detalle. Empty state.
- **`panel/organizador/[torneoId]/page.tsx`** (Server): detalle. Header (nombre/fecha/estado + nota "Panel alimentado solo con inscripciones confirmadas"). Card "Participantes confirmados" (nombre, Badge grado, peso/altura/edad, agresividad). Card "Llaves" por categoría. Si el estado no tiene llaves (`borrador`/`inscripciones`) → CTA "Armar llaves" a `/panel/torneos`. Editor **solo** si `armado_llaves`; si `en_vivo`/`finalizado` → llaves read-only. Banner `?guardadas=1` (verde).
- **`panel/organizador/editor-llaves.tsx`** (Client, orquestador): recibe por props el estado inicial, lo copia en state y expone:
  - **Chip participante** (en cada enfrentamiento y en "Sin ubicar") → al tocar entra en modo selección; tocar una **casilla destino** aplica `moverParticipante` (suma a la categoría sin quitarlo de otras); botón "Liberar" (x) aplica `liberarDeCategoria` (solo de la categoría en curso).
  - **Tarjeta enfrentamiento**: "A vs B | Libre"; casillas vacías visibles como destino `+`; al quedar vacío el enfrentamiento se poda automáticamente.
  - **Subsección "Participantes sin ubicar"**: selección de categoría + "Agregar" → `agregarParticipante`.
  - **Advertencias** (`advertencias.ts`): `window.confirm` si el par resultante rompe la regla infantil (≤5 kg) o sale de rango/edad; "Aceptar" procede.
  - **Guardar**: `useActionState` + `SubmitButton` con hidden `torneo_id`/`payload` (serializado con `serializarPayload`) → `guardarLlavesManuales`.
  - Subcomponentes presentacionales: `categoria-bracket.tsx`, `enfrentamiento-card.tsx`, `chip-participante.tsx`, `lista-sin-ubicar.tsx`.

### 7. Documentación (sincronizar)
- `documentacion/databaseModel.md`: RPC `guardar_llaves_manuales`; nota edición manual (reemplazo atómico, ids nuevos por guardado); organizador lee solo confirmados.
- `documentacion/guia-estetica.md`: patrón "chip participante + casilla de llave" e interacción de selección/conformación del editor.
- `documentacion/mvc/workflow.md`: ítem "Panel del Organizador" → `[x]` al cierre.
- Plan: historial + `Aprobado` al cerrar.

## Criterios de aceptación
- [x] Panel del organizador alimentado **solo** por confirmados: pendientes/rechazados jamás aparecen (RLS + filtro doble). Otro usuario/rol no ve llaves ajenas.
- [x] Control total manual: mover, liberar (bye) y agregar sin ubicar, con edición cruzada de categorías; persistencia atómica vía RPC.
- [x] Invariante: ningún participante aparece dos veces; enfrentamientos vacíos podados.
- [x] Advertencia infantil (≤5 kg) y de rango/edad: se informa y requiere confirmación, no bloquea.
- [x] Guardar reemplaza categorías (ids nuevos) sin duplicados; en `en_vivo`/`finalizado` la edición queda bloqueada.
- [x] Redirects contextuales post-guardado con banner verde; `lib/emparejamiento/` intacto.
- [x] `npm run lint` + `npm run build` + `npm run test` OK (nuevos tests del planner incluidos).

## Verificación manual
(1) Crear torneo + inscribir/confirmar + generar llaves. (2) `/panel/organizador`: ver confirmados y llaves por categoría. (3) Mover un participante a otra casilla/categoría, liberar uno, agregar uno sin ubicar → guardar → recargar y verificar. (4) Pendiente/otro usuario: no visible. (5) Torneo `en_vivo` → editor bloqueado. (6) Mover infantil con |Δpeso|>5 kg → advertencia, confirmar → procede.