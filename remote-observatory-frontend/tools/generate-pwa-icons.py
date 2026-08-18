"""Generate deterministic Apple/PWA PNG icons from the ASTRA vector mark."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "assets" / "pwa"

def make(size: int) -> None:
    image = Image.new("RGBA", (size, size), (13, 15, 14, 255))
    draw = ImageDraw.Draw(image)
    pad = size * 0.18
    center = size / 2
    apex = (center, size * 0.16)
    left = (size * 0.25, size * 0.80)
    right = (size * 0.75, size * 0.80)
    inner_left = (center, size * 0.42)
    inner_right = (center + size * 0.08, size * 0.42)
    draw.polygon([apex, left, (left[0] + size * 0.09, left[1]), inner_left, inner_right, (right[0] - size * 0.09, right[1]), right], fill=(245, 247, 244, 255))
    draw.rectangle((pad, size * 0.84, size - pad, size * 0.88), fill=(88, 184, 255, 255))
    image.save(ROOT / f"icon-{size}.png", optimize=True)

for icon_size in (60, 72, 76, 120, 152, 167, 180, 192, 512):
    make(icon_size)
