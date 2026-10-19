"""Builds frontend/public/media/og/floodway-og.jpg (1200x630), the link-preview image.

It uses the AI-generated NORMAL base photo of the Klang sample camera (no water overlay) and states plainly that the
imagery is sample imagery and the data is simulated. Re-run after changing the text:
    python scripts/make_og_image.py
Needs Pillow and the Windows fonts Segoe UI / Segoe UI Bold (falls back to PIL's default font elsewhere).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / "backend/app/vision/sample_media/klang-normal.jpg"
OUT = ROOT / "frontend/public/media/og/floodway-og.jpg"
W, H = 1200, 630
NAVY, BLUE, WHITE, MUTED = (7, 20, 38), (22, 119, 255), (255, 255, 255), (186, 200, 220)


def font(name: str, size: int):
    try:
        return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
    except OSError:
        return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, width: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= width:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    return lines + ([cur] if cur else [])


img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img)

# photo on the right, rounded, with a thin blue edge
photo = Image.open(PHOTO).convert("RGB")
pw, ph = 520, 520
scale = max(pw / photo.width, ph / photo.height)
photo = photo.resize((int(photo.width * scale), int(photo.height * scale)), Image.LANCZOS)
left = (photo.width - pw) // 2
photo = photo.crop((left, 0, left + pw, ph))
mask = Image.new("L", (pw, ph), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw, ph), radius=28, fill=255)
img.paste(photo, (W - pw - 55, (H - ph) // 2), mask)
d.rounded_rectangle((W - pw - 55, (H - ph) // 2, W - 55, (H + ph) // 2), radius=28, outline=BLUE, width=3)

# text on the left
x = 70
d.rounded_rectangle((x, 62, x + 84, 146), radius=20, fill=WHITE)
logo = Image.open(Path(__file__).resolve().parents[1] / "frontend" / "public" / "logo-512.png").convert("RGBA")
logo.thumbnail((60, 60), Image.LANCZOS)
img.paste(logo, (x + (84 - logo.width) // 2, 62 + (84 - logo.height) // 2), logo)
d.text((x, 175), "FloodWay", font=font("segoeuib.ttf", 76), fill=WHITE)
y = 275
for line in wrap(d, "Flood-prevention prototype: camera water-level analysis, evacuation guidance and citizen reports.", font("segoeui.ttf", 31), 480):
    d.text((x, y), line, font=font("segoeui.ttf", 31), fill=MUTED)
    y += 42
d.rounded_rectangle((x, 466, x + 470, 548), radius=14, fill=(40, 30, 6), outline=(245, 158, 11), width=2)
note = font("segoeuib.ttf", 22)
d.text((x + 18, 480), "Sample imagery. Simulated data.", font=note, fill=(253, 224, 71))
d.text((x + 18, 512), "Not real camera footage.", font=font("segoeui.ttf", 22), fill=(253, 224, 71))
d.text((x, 575), "Prototype for the Sime Darby Property University Hackathon 2026", font=font("segoeui.ttf", 22), fill=MUTED)

OUT.parent.mkdir(parents=True, exist_ok=True)
quality = 88
while True:
    img.save(OUT, "JPEG", quality=quality, optimize=True)
    if OUT.stat().st_size <= 300 * 1024 or quality <= 60:
        break
    quality -= 6
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, quality {quality})")
