#!/usr/bin/env python3
"""Aggressive magenta chroma + crop for JPEG-generated sprites."""
from pathlib import Path

import numpy as np
from PIL import Image


def chroma(arr: np.ndarray) -> np.ndarray:
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)
    dist = np.sqrt((r - 255.0) ** 2 + g**2 + (b - 255.0) ** 2)
    mag = np.minimum(r, b) - g
    hard = (dist < 95) | ((mag > 55) & (g < 90) & (r > 140) & (b > 140))
    a = np.where(hard, 0.0, a)
    fringe = (~hard) & (dist < 165) & (mag > 20)
    fade = np.clip((dist - 95.0) / 70.0, 0.0, 1.0)
    a = np.where(fringe, a * fade, a)
    out = arr.copy()
    out[:, :, 3] = a.astype(np.uint8)
    mask = out[:, :, 3] == 0
    out[mask, 0] = 0
    out[mask, 1] = 0
    out[mask, 2] = 0
    return out


def crop_content(arr: np.ndarray, pad_ratio: float = 0.10) -> np.ndarray:
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return arr
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    w, h = x1 - x0, y1 - y0
    pad = int(max(w, h) * pad_ratio)
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(arr.shape[1], x1 + pad)
    y1 = min(arr.shape[0], y1 + pad)
    return arr[y0:y1, x0:x1]


def fit_square(arr: np.ndarray, size: int) -> Image.Image:
    im = Image.fromarray(arr, "RGBA")
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2))
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def process_single(src: Path, dest: Path, size: int) -> None:
    im = Image.open(src).convert("RGBA")
    arr = chroma(np.array(im))
    arr = crop_content(arr)
    fit_square(arr, size).save(dest)
    print(f"wrote {dest} {size}x{size}")


def process_grid(
    src: Path, dest_dir: Path, rows: int, cols: int, size: int, names: list[str]
) -> None:
    im = Image.open(src).convert("RGBA")
    arr = chroma(np.array(im))
    h, w = arr.shape[:2]
    cw, ch = w // cols, h // rows
    dest_dir.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        cell = arr[r * ch : (r + 1) * ch, c * cw : (c + 1) * cw]
        cell = crop_content(cell, pad_ratio=0.12)
        fit_square(cell, size).save(dest_dir / f"{name}.png")
        print(f"wrote {dest_dir / name}.png")


def main() -> None:
    pub = Path("/workspace/public/sprites")
    pub.mkdir(parents=True, exist_ok=True)
    raw = Path("/workspace/assets/sprites")

    process_single(raw / "player/raw-sheet.png", pub / "player.png", 160)
    process_single(raw / "scout/raw-sheet.png", pub / "scout.png", 112)
    process_single(raw / "fighter/raw-sheet.png", pub / "fighter.png", 128)
    process_single(raw / "bomber/raw-sheet.png", pub / "bomber.png", 176)
    process_single(raw / "player-bolt/raw-sheet.png", pub / "player-bolt.png", 48)
    process_single(raw / "enemy-bolt/raw-sheet.png", pub / "enemy-bolt.png", 40)

    process_grid(
        raw / "explode/raw-sheet.png",
        pub,
        2,
        2,
        128,
        ["explode-1", "explode-2", "explode-3", "explode-4"],
    )
    process_grid(
        raw / "muzzle/raw-sheet.png",
        pub,
        2,
        2,
        80,
        ["muzzle-1", "muzzle-2", "muzzle-3", "muzzle-4"],
    )
    process_grid(
        raw / "powerups/raw-sheet.png",
        pub,
        2,
        2,
        80,
        ["power-multi", "power-shield", "power-speed", "power-life"],
    )


if __name__ == "__main__":
    main()
