# Plan: Mostrar/ocultar contraseña (ícono de ojo) — `mobile-toggle-contrasena.md`

## Metadatos
- **Versión:** 1.0
- **Estado:** Aprobado
- **Fecha:** 2026-09-22
- **Fecha de aprobación:** 2026-09-22

## Historial de revisiones
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-09-22 | Borrador inicial y aprobación: botón de mostrar/ocultar contraseña con **ícono de ojo** en los **5 campos** de contraseña (login, registro y nueva contraseña). Se dibuja con `react-native-svg` (dependencia ya declarada) para no instalar una librería de íconos por un solo elemento. |

## Restricciones y Correcciones Previas (No repetir)
1. **Sin dependencias nuevas:** el proyecto **no** tiene librería de íconos (`@expo/vector-icons` no está instalado) y hoy toda la UI es de texto. Se usa **`react-native-svg`** (v15.15.4), que **ya es dependencia declarada** (la usa `react-native-gifted-charts`).
2. **Prop opcional:** `esContrasena` es optativa; los formularios que no la pasan quedan **idénticos**.
3. **Toggle independiente por campo:** cada `CampoTexto` maneja su propio estado de visibilidad; alternar uno no afecta al otro (importante en los campos de confirmación).
4. **La contraseña arranca oculta** (comportamiento actual intacto).
5. **No reinventar:** se extiende el componente compartido `CampoTexto`, que ya centraliza label, error y estilos.

## Contexto / Objetivo
Al iniciar sesión (y en cualquier campo de contraseña) el usuario no puede verificar lo que escribió, lo que genera errores de tipeo. Se agrega un botón de **mostrar/ocultar** con ícono de ojo.

## Cambios Implementados

### 1. `mobile/src/components/IconoOjo.tsx` (nuevo) `[x]`
Ícono dibujado con `react-native-svg` (`Svg`, `Path`, `Circle`):
- Ojo con contorno + pupila.
- **Tachado diagonal** cuando la contraseña está **oculta**.
- Props: `visible: boolean`, `size` (default 22), `color` (default `#666`).

### 2. `mobile/src/components/CampoTexto.tsx` (extendido) `[x]`
```ts
type CampoTextoProps = {
  label: string
  error?: string | null
  esContrasena?: boolean   // nuevo, opcional
} & Omit<TextInputProps, 'style'>
```
- Con `esContrasena`: estado interno `visible` (inicia `false`), `secureTextEntry={!visible}` y el `Pressable` con el ícono dentro del campo (posición absoluta a la derecha).
- `entradaConToggle` agrega `paddingRight: 44` para que el texto no quede debajo del ícono.
- El ícono se pinta en rojo si el campo tiene error, para mantener la señal visual.
- **Accesibilidad:** `accessibilityRole="button"`, `accessibilityLabel` dinámico ("Mostrar contraseña" / "Ocultar contraseña"), `accessibilityState={{ selected: visible }}` y `hitSlop={8}`.

### 3. Pantallas actualizadas (5 campos) `[x]`
| Archivo | Campos |
|---|---|
| `(auth)/iniciar-sesion.tsx` | Contraseña |
| `(auth)/crear-cuenta.tsx` | Contraseña + Confirmar contraseña |
| `nueva-contrasena.tsx` | Nueva contraseña + Confirmar contraseña |

En los 5 se reemplazó `secureTextEntry` por `esContrasena`.

### 4. Catálogo de pruebas `[x]`
- `TC-AUTH-09` Mostrar/ocultar contraseña en login · **Smoke**
- `TC-AUTH-10` Toggle en registro (ambos campos, independientes)
- `TC-AUTH-11` Toggle en nueva contraseña
- `TC-AUTH-09` agregado a la lista del smoke test (sección 6).

## Criterios de Aceptación y Verificación
- [x] En **iniciar sesión**, el campo de contraseña tiene un ícono de ojo que alterna mostrar/ocultar.
- [x] El **texto escrito no se pierde** ni se borra al alternar.
- [x] El ícono cambia entre **ojo abierto / tachado** según el estado.
- [x] El toggle existe en los **5 campos** de contraseña (login, registro, nueva contraseña).
- [x] En los formularios con confirmación, los toggles son **independientes**.
- [x] Accesibilidad: el botón anuncia "Mostrar contraseña" / "Ocultar contraseña".
- [x] **Sin dependencias nuevas** (usa `react-native-svg`, ya declarada).
- [x] Los formularios sin contraseña quedan **sin cambios** (prop opcional).
- [x] Casos `TC-AUTH-09/10/11` agregados al catálogo.
- [x] `npm run typecheck` limpio; lint sin hallazgos nuevos.

> **A verificar en dispositivo:** al alternar `secureTextEntry`, iOS puede reposicionar el cursor al inicio del campo. Si se reproduce, se mitiga sin remontar el `TextInput`. Cubierto por `TC-AUTH-09`.

---
🐧
