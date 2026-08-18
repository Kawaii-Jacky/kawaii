"""Generate deterministic Apple/PWA PNG icons from the ASTRA vector mark."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "assets" / "pwa"
TAURI_ROOT = Path(__file__).resolve().parents[2] / "apps" / "astra-tauri" / "src-tauri" / "icons"

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

TAURI_ROOT.mkdir(parents=True, exist_ok=True)
for source_size, name in ((60, "32x32.png"), (120, "128x128.png"), (192, "128x128@2x.png"), (512, "icon.png")):
    source = Image.open(ROOT / f"icon-{source_size}.png")
    target_size = 32 if name == "32x32.png" else 128 if name == "128x128.png" else 256 if name == "128x128@2x.png" else 512
    source.resize((target_size, target_size), Image.Resampling.LANCZOS).save(TAURI_ROOT / name, optimize=True)
Image.open(ROOT / "icon-512.png").save(TAURI_ROOT / "icon.ico", sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])
