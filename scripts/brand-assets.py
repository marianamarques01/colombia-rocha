"""
Generates the tab icon, the phone home-screen icon and the link preview image
from the same organic star (src/Star.tsx) and the site's serif.

    python3 scripts/brand-assets.py

Writes public/favicon.svg, public/apple-touch-icon.png and public/og.png.
"""
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
NAVY, NAVY_HI, NAVY_LO = (3, 39, 65), (10, 58, 92), (2, 28, 48)
CREAM, MUSTARD = (254, 250, 223), (224, 161, 8)
FONT = ROOT / 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff'
FONT_ITALIC = ROOT / 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff'

STAR = re.search(r"ORGANIC_STAR = '([^']+)'", (ROOT / 'src/Star.tsx').read_text()).group(1)


def star_points(path: str, steps: int = 10):
    """Flattens the M/Q/Z path of the star into a polygon (100 × 100 box)."""
    tokens = re.findall(r'[MQZ]|-?\d*\.?\d+', path)
    pts, i, cur = [], 0, (0.0, 0.0)
    while i < len(tokens):
        t = tokens[i]
        if t == 'M':
            cur = (float(tokens[i + 1]), float(tokens[i + 2]))
            pts.append(cur)
            i += 3
        elif t == 'Q':
            cx, cy, x, y = map(float, tokens[i + 1:i + 5])
            for s in range(1, steps + 1):
                u = s / steps
                pts.append(((1 - u) ** 2 * cur[0] + 2 * (1 - u) * u * cx + u * u * x,
                            (1 - u) ** 2 * cur[1] + 2 * (1 - u) * u * cy + u * u * y))
            cur = (x, y)
            i += 5
        else:
            i += 1
    return pts


POLY = star_points(STAR)
CX = (min(p[0] for p in POLY) + max(p[0] for p in POLY)) / 2
CY = (min(p[1] for p in POLY) + max(p[1] for p in POLY)) / 2


def draw_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float, fill):
    k = size / 100
    draw.polygon([(cx + (x - CX) * k, cy + (y - CY) * k) for x, y in POLY], fill=fill)


def gradient(w: int, h: int):
    img = Image.new('RGB', (w, h), NAVY)
    px = img.load()
    for y in range(h):
        for x in range(w):
            d = min(1, (((x - w * .5) / (w * .62)) ** 2 + ((y - h * .32) / (h * .9)) ** 2) ** .5)
            a, b = (NAVY_HI, NAVY) if d < .55 else (NAVY, NAVY_LO)
            t = d / .55 if d < .55 else (d - .55) / .45
            px[x, y] = tuple(round(a[c] + (b[c] - a[c]) * t) for c in range(3))
    return img


def favicon_svg():
    """Red star with a white outline, no background."""
    (ROOT / 'public/favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<g transform="translate({32 - CX * .74:.2f} {32 - CY * .74:.2f}) scale(.74)">'
        f'<path d="{STAR}" fill="#d0341f" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/>'
        '</g></svg>\n')


def apple_icon():
    s = 4
    img = Image.new('RGB', (180 * s, 180 * s), NAVY)
    draw_star(ImageDraw.Draw(img), 90 * s, 90 * s, 118 * s, MUSTARD)
    img.resize((180, 180), Image.LANCZOS).save(ROOT / 'public/apple-touch-icon.png')


def og_image():
    s = 2
    w, h = 1200 * s, 630 * s
    img = gradient(w // 4, h // 4).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    draw = ImageDraw.Draw(img)

    # COL★MBIA — the first O keeps a star in its counter.
    font = ImageFont.truetype(str(FONT), 236 * s)
    word = 'COLOMBIA'
    width = draw.textlength(word, font=font) - 0.03 * 236 * s * (len(word) - 1)
    x = (w - width) / 2
    y = h * .27
    o_box = None
    for i, ch in enumerate(word):
        draw.text((x, y), ch, font=font, fill=CREAM)
        adv = draw.textlength(ch, font=font) - 0.03 * 236 * s
        if ch == 'O' and o_box is None:
            o_box = draw.textbbox((x, y), ch, font=font)
        x += adv
    if o_box:
        draw_star(draw, (o_box[0] + o_box[2]) / 2, (o_box[1] + o_box[3]) / 2 - 12 * s, 76 * s, MUSTARD)

    italic = ImageFont.truetype(str(FONT_ITALIC), 52 * s)
    lead, role = 'Designer e artista ', 'audiovisual'
    lw = draw.textlength(lead, font=italic)
    rw = draw.textlength(role, font=italic)
    x = (w - lw - rw) / 2
    ty = h * .66
    draw.text((x, ty), lead, font=italic, fill=CREAM)
    draw.text((x + lw, ty), role, font=italic, fill=MUSTARD)

    draw_star(draw, w * .08, h * .14, 120 * s, MUSTARD)
    draw_star(draw, w * .93, h * .84, 90 * s, MUSTARD)
    img.resize((1200, 630), Image.LANCZOS).save(ROOT / 'public/og.png', optimize=True)


if __name__ == '__main__':
    favicon_svg()
    apple_icon()
    og_image()
    print('public/favicon.svg, public/apple-touch-icon.png, public/og.png')
