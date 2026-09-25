# Plan: barra de estado (status bar) adaptable y safe area superior

## Metadatos

| Campo | Valor |
|---|---|
| **Versión** | 1.0 |
| **Estado** | Aprobado (implementado) |
| **Fecha** | 2026-09-24 |
| **Alcance** | App móvil (config + UI). Sin cambios de BD. |

## Historial de revisiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-24 | Fix: la barra de estado del celular quedaba invisible (íconos claros sobre fondo claro) por edge-to-edge + `userInterfaceStyle` ignorado en Android. Se instala `expo-system-ui`, se agrega `SafeAreaProvider` y un contenedor `PantallaSegura`. |
| 1.1 | 2026-09-24 | Ajuste tras la prueba: en SDK 57 `StatusBar.backgroundColor` **no existe** (edge-to-edge). El fondo de la barra se resuelve con `SystemUI.setBackgroundColorAsync('#ffffff')` + fondo blanco en el root; los íconos quedan fijos en `dark` (ir sobre el fondo blanco). |

## Contexto / diagnóstico

- En **Expo SDK 57 / RN 0.86**, Android corre en **edge-to-edge obligatorio**: la barra de estado es
  transparente y la app dibuja debajo.
- `app.json` declara `userInterfaceStyle: "light"`, pero **en Android eso solo se respeta con
  `expo-system-ui` instalado**. Sin él, `useColorScheme()` devuelve el **tema del dispositivo** y
  `<StatusBar style="auto" />` pone íconos **claros** cuando el celular está en modo oscuro → sobre el
  fondo claro de la app quedan **invisibles** (blanco sobre blanco).
- Las pantallas **sin header nativo** (Inicio, onboarding, auth) además quedan **debajo** de la barra.

## Cambios implementados

1. **`expo-system-ui`** (`npx expo install`, `~57.0.4`) + entrada en `plugins` de `app.json`. Así
   `userInterfaceStyle` manda en Android (el tema del dispositivo ya no pisa el de la app).
2. **Fondo raíz blanco**: en `app/_layout.tsx` se llama `SystemUI.setBackgroundColorAsync('#ffffff')`.
   Es el color que se ve **detrás de la barra de estado** (en SDK 57 `StatusBar.backgroundColor` ya no
   existe por edge-to-edge), así que la franja de la barra queda **blanca**.
3. **`BarraEstado`**: `<StatusBar style="dark" />` → íconos **oscuros** sobre el fondo blanco (la app es
   clara). Al implementar modo oscuro, se deriva del esquema junto con la paleta.
4. **`SafeAreaProvider`** en el root (con fondo blanco) y **`components/PantallaSegura.tsx`** (nuevo):
   `SafeAreaView edges={['top']}` para pantallas sin header.
5. Aplicado en **`(tabs)/index.tsx`** (Inicio) y **`onboarding.tsx`**. Los tabs de Instructor/Maestro ya
   usan **header nativo** (respeta el inset) y las pantallas de `(auth)` / `nueva-contrasena` están
   centradas (no tocan el tope).

## Criterios de aceptación

- [x] `typecheck` y `lint` en verde.
- [ ] En dispositivo (**Expo Go**), con el celular en **modo oscuro** los íconos de la barra se ven
      (oscuros sobre el fondo claro de la app).
- [ ] Con **notch/agujero**, el contenido de Inicio y onboarding **no** queda debajo de la barra.
- [ ] Sin regresiones en las pantallas con header (Instructor/Maestro) ni en auth.

## Verificación

- `cd mobile && npm run typecheck && npm run lint` → ✅.
- Manual: probar la app con el celular en modo claro y oscuro; revisar Inicio, onboarding y una
  pantalla de Instructor.

---

🐧
