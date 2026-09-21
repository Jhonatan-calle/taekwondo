# Plan: Refresco de pantallas de detalle al recuperar foco — `mobile-refresco-detalle-foco.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-21
- **Fecha de aprobación:** 2026-09-21

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-21 | Borrador inicial y aprobación. Corrige el bug reportado: al editar un grupo y volver al detalle, seguía mostrando "Sin locación" hasta reiniciar la app. Causa: las pantallas de detalle cargaban con `useEffect` (solo al montar) en vez de `useFocusEffect`. Se alinean las cuatro pantallas de detalle al patrón vigente. |

## Restricciones y Correcciones Previas (No repetir)
1. **Torneos y web congelados:** no tocar tablas de torneos ni `web/`.
2. **El guardado ya era correcto:** el bug es **solo de refresco en cliente**; no se tocan RPCs, consultas ni contratos de datos.
3. **Usar el patrón vigente:** `useFocusEffect`, ya empleado por los listados del proyecto; no introducir mecanismos nuevos.
4. **No tocar los `useEffect` de inicialización:** los que precargan formularios (`registrar-locacion.tsx`, `nuevo-grupo.tsx`) cumplen otra función y se dejan como están.

## Contexto / Diagnóstico
Al editar un grupo (p. ej. asignarle una locación) y volver con `router.back()`, el detalle **no se vuelve a montar** porque permanece en el stack de navegación. Su carga se disparaba con:

```tsx
useEffect(() => {
  void cargar();
}, [cargar]);       // solo al montar
```

Por eso el `useEffect` no se re-ejecutaba y la pantalla seguía mostrando el estado previo hasta reiniciar la app.

**Auditoría del patrón** (evidencia):

| Pantalla | Antes | Resultado |
|---|---|---|
| `grupo/[id]/index.tsx` | `useEffect` | **Bug reportado** (volver de editar) |
| `locacion/[id].tsx` | `useEffect` | Mismo bug (editar locación → volver) |
| `clase/[id]/index.tsx` | `useEffect` | Latente (edición de clase aún no existe) |
| `alumno/[id].tsx` | `useEffect` | Latente (detalle solo-lectura) |
| `locaciones.tsx`, `grupos.tsx`, `alumnos.tsx`, `clases.tsx` | `useFocusEffect` | Ya correctas |
| `clase/[id]/asistencia.tsx`, `nuevo-grupo.tsx` | ambos | Ya correctas |

## Cambios Implementados
En las cuatro pantallas de detalle se reemplazó el `useEffect` de carga por:

```tsx
useFocusEffect(
  useCallback(() => {
    void cargar();
  }, [cargar]),
);
```

- `mobile/src/app/(tabs)/instructor/grupo/[id]/index.tsx`
- `mobile/src/app/(tabs)/instructor/locacion/[id].tsx`
- `mobile/src/app/(tabs)/instructor/clase/[id]/index.tsx`
- `mobile/src/app/(tabs)/instructor/alumno/[id].tsx`

Ajustes asociados:
- Import de `useFocusEffect` desde `expo-router`; se retiró `useEffect` de `react` donde quedó sin uso.
- Se eliminaron los comentarios `eslint-disable-next-line react-hooks/set-state-in-effect` que ya no aplicaban.

**Beneficio colateral:** desaparecieron 3 errores de lint (`react-hooks/set-state-in-effect`) del proyecto.

## Criterios de Aceptación y Verificación
- [x] Editar un grupo (asignar locación) → volver al detalle → se refleja **sin reiniciar** la app.
- [x] Editar una locación → volver al detalle → se refleja sin reiniciar.
- [x] `clase/[id]` y `alumno/[id]` recargan al recuperar foco.
- [x] Los listados siguen refrescando igual (sin regresión).
- [x] `npm run typecheck` limpio.
- [x] Lint: errores del proyecto reducidos de 6 a 3 (los restantes son preexistentes y ajenos: `(tabs)/index.tsx` y `onboarding.tsx`).

---
🐧
