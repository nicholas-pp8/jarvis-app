# Generates the app icons at build time so no binary files live in the repo.
import os
from PIL import Image, ImageDraw, ImageFont

def icon(sz, maskable=False):
    im = Image.new('RGB', (sz, sz)); d = ImageDraw.Draw(im)
    for y in range(sz):
        t = y / sz; d.line([(0, y), (sz, y)], fill=(int(6 + 10 * t), int(20 + 8 * t), int(28 + 50 * t)))
    r = sz * (0.30 if maskable else 0.36); c = sz / 2
    d.ellipse([c - r, c - r, c + r, c + r], outline=(34, 211, 238), width=max(2, int(sz * 0.045)))
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(sz * (0.34 if maskable else 0.40)))
    except Exception: f = ImageFont.load_default()
    b = d.textbbox((0, 0), 'J', font=f); d.text((c - (b[2] + b[0]) / 2, c - (b[3] + b[1]) / 2), 'J', font=f, fill=(224, 242, 254))
    return im

os.makedirs('www/icons', exist_ok=True); os.makedirs('assets', exist_ok=True)
icon(192).save('www/icons/icon-192.png'); icon(512).save('www/icons/icon-512.png'); icon(512, True).save('www/icons/maskable-512.png')
icon(1024, True).save('assets/icon-only.png')
