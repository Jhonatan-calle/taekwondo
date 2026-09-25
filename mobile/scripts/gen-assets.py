#!/usr/bin/env python3
"""Genera los assets nativos (splash e íconos) del proyecto Taekwondo ITF.

Uso:
    cd mobile && npm run assets:gen          # o: python3 scripts/gen-assets.py

Requiere Python 3 con Pillow y numpy (pip install pillow numpy).

Fuentes (branding del proyecto):
  ../branding/splash.jpeg  -> emblema circular (splash-icon.png)
  ./assets/icon.png        -> emblema "A CHS" (foreground/monochrome Android)

Salidas (sobrescribe en ./assets/):
  - splash-icon.png              1024x1024 RGBA transparente
  - android-icon-foreground.png   512x512 RGBA transparente
  - android-icon-background.png   512x512 RGBA opaco
  - android-icon-monochrome.png   432x432 RGBA transparente (silueta blanca)

Notas:
  - El fondo se separa del dorado por **saturación (croma)** y no solo por brillo:
    así el carbón oscuro del tile queda 100% transparente (sin "fantasma").
  - Los cambios en estos assets son **nativos**: requieren recompilar la APK
    (`npx eas-cli build -p android --profile preview`); no llegan por OTA.
"""
from pathlib import Path

import numpy as np
from PIL import Image

SCRIPT = Path(__file__).resolve()
MOBILE = SCRIPT.parents[1]          # .../mobile
ROOT = SCRIPT.parents[2]            # raíz del repo
ASSETS = MOBILE / "assets"
BRANDING = ROOT / "branding"

SPLASH_SRC = BRANDING / "splash.jpeg"
ICON_SRC = ASSETS / "icon.png"


def alpha_gold(rgb: np.ndarray) -> np.ndarray:
    """Alpha para separar el dorado del fondo oscuro sin dejar 'fantasma'.

    Combina saturación (croma R-B) y luminancia alta: el fondo negro/carbón queda
    totalmente transparente (croma ~5) mientras el dorado y los brillos quedan opacos.
    """
    lum = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    a_chroma = np.clip((chroma - 18.0) / 70.0, 0.0, 1.0)
    a_lum = np.clip((lum - 150.0) / 70.0, 0.0, 1.0)
    return np.maximum(a_chroma, a_lum)


def tight_bbox(alpha: np.ndarray, thr: float = 0.35):
    ys, xs = np.where(alpha > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fit_into(rgba: Image.Image, canvas: int, fill: float) -> Image.Image:
    """Escala el recorte (ya tight) para ocupar `fill` del lienzo cuadrado y lo centra."""
    w, h = rgba.size
    target = canvas * fill
    scale = target / max(w, h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    r = rgba.resize((nw, nh), Image.LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.alpha_composite(r, ((canvas - nw) // 2, (canvas - nh) // 2))
    return out


# ---------------------------------------------------------------- splash-icon
def gen_splash():
    src = Image.open(SPLASH_SRC).convert("RGB")
    a = np.asarray(src).astype(np.float32)
    lum = a.mean(axis=2)
    mask = lum > 110
    band = np.zeros_like(mask)
    band[100:930, :] = mask[100:930, :]          # sólo la zona del emblema circular
    ys, xs = np.where(band)
    cx = (xs.min() + xs.max()) / 2
    cy = (ys.min() + ys.max()) / 2
    side = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.06)
    box = (int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))
    crop = a[box[1]:box[3], box[0]:box[2], :]
    alpha = alpha_gold(crop)
    rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    img = img.crop(tight_bbox(np.asarray(img)[:, :, 3] / 255.0))
    out = fit_into(img, 1024, fill=0.90)
    out.save(ASSETS / "splash-icon.png")
    print("splash-icon.png", out.size)


# ------------------------------------------------------ adaptive icon (Android)
def emblem_rgba(inset: int = 0):
    """Emblema 'A CHS' dorado con fondo transparente, a partir de icon.png.

    `inset` recorta el marco cuadrado exterior del tile (Android aporta su propia
    máscara y fondo), dejando solo el emblema circular interno.
    """
    src = Image.open(ICON_SRC).convert("RGB")
    if inset:
        w, h = src.size
        src = src.crop((inset, inset, w - inset, h - inset))
    a = np.asarray(src).astype(np.float32)
    alpha = alpha_gold(a)
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    return img.crop(tight_bbox(np.asarray(img)[:, :, 3] / 255.0))


def gen_foreground():
    emblem = emblem_rgba(inset=118)
    # Zona segura de Android: el contenido debe caber dentro del ~66% central.
    out = fit_into(emblem, 512, fill=0.66)
    out.save(ASSETS / "android-icon-foreground.png")
    print("android-icon-foreground.png", out.size)


def gen_monochrome():
    emblem = emblem_rgba(inset=118)
    fitted = fit_into(emblem, 432, fill=0.64)
    arr = np.asarray(fitted).copy()
    alpha = arr[:, :, 3].astype(np.float32)
    alpha = np.where(alpha > 100, 255.0, 0.0).astype(np.uint8)  # silueta limpia, sin ruido
    white = np.zeros_like(arr)
    white[:, :, 0:3] = 255
    white[:, :, 3] = alpha
    Image.fromarray(white, "RGBA").save(ASSETS / "android-icon-monochrome.png")
    print("android-icon-monochrome.png", white.shape[1], white.shape[0])


def gen_background():
    """Fondo oscuro con leve degradado radial y halo dorado tenue."""
    size = 512
    yy, xx = np.mgrid[0:size, 0:size]
    cx = cy = (size - 1) / 2
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size / 2)
    d = np.clip(d, 0, 1)
    # centro #24211c -> borde #0a0a0a
    center = np.array([36, 33, 28], dtype=np.float32)
    edge = np.array([10, 10, 12], dtype=np.float32)
    t = d[..., None]
    img = center * (1 - t) + edge * t
    # halo dorado muy tenue en el borde interior
    halo = np.exp(-((d - 0.62) ** 2) / (2 * 0.10 ** 2)) * 26
    img += halo[..., None] * np.array([0.45, 0.30, 0.08], dtype=np.float32)
    img = np.clip(img, 0, 255).astype(np.uint8)
    Image.fromarray(img, "RGB").convert("RGBA").save(ASSETS / "android-icon-background.png")
    print("android-icon-background.png", size)


def main():
    for src in (SPLASH_SRC, ICON_SRC):
        if not src.exists():
            raise SystemExit(f"Falta la imagen fuente: {src}")
    gen_splash()
    gen_foreground()
    gen_monochrome()
    gen_background()


if __name__ == "__main__":
    main()
