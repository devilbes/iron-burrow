#!/usr/bin/env python3
"""Iron Burrow — rebuild of the game sprite set from existing art (no image generation).

Run from anywhere:  python3 docs/game/art/build_sprites.py [group ...]
Groups: tiles units fx ui scenes offers preview (default: all). Writes `<id>-2x.png` and
`<id>-2x.webp` into assets/game/ (then `npm run assets` makes the 1x files).

Sources (see README.md next to this file):
  assets/ui/screens/game-2x.png      — field illustration: floor, bricks, steel, Core, Rustbug, tank, bullets
  assets/ui/screens/stage-map-2x.png — clean cave background (scenes)
  assets/ui/game-icons-2x.png        — own icon sheet, 6x5 cells of 96 px
  design/system/palette.json         — colours of everything procedural
Only crop / cut-out / scale / recolour / compose and simple procedural drawing (PIL) are used.
"""
import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets' / 'game'
ART = ROOT / 'docs' / 'game' / 'art'
SRC = Image.open(ROOT / 'assets/ui/screens/game-2x.png').convert('RGBA')
MAP = Image.open(ROOT / 'assets/ui/screens/stage-map-2x.png').convert('RGBA')
SHEET = Image.open(ROOT / 'assets/ui/game-icons-2x.png').convert('RGBA')
SHEET_KEYS = ('boost,brand-mark,calendar,check,clock,close,coins,flame,gems,gift,heart,hud-hud-item-view-1,'
              'hud-settings,lock,medal,medal-1,medal-2,medal-3,no-signal,play,quest,rating-star,retry,shop,'
              'sparkle,star,stopwatch-chip,trophy,user').split(',')
PAL = {c['name']: c['hex'] for c in json.loads((ROOT / 'design/system/palette.json').read_text())['colors']}


def rgb(name, a=255):
    h = PAL[name].lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


WRITTEN = []


def save(name, im):
    im = im.convert('RGBA')
    im.save(OUT / f'{name}-2x.png', optimize=True)
    im.save(OUT / f'{name}-2x.webp', lossless=True)
    WRITTEN.append(name)


def expect(name, im, size):
    assert im.size == size, f'{name}: {im.size} != {size}'
    return im


# ---------------------------------------------------------------- pixel helpers

def resize(im, size):
    """Alpha-correct resize (premultiplied)."""
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')


def fit(im, box_w, box_h):
    s = min(box_w / im.width, box_h / im.height)
    return resize(im, (max(1, round(im.width * s)), max(1, round(im.height * s))))


def center_on(canvas, im, dx=0, dy=0):
    canvas.alpha_composite(im, ((canvas.width - im.width) // 2 + dx, (canvas.height - im.height) // 2 + dy))
    return canvas


def bbox_crop(im, pad=0):
    b = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    b = (max(0, b[0] - pad), max(0, b[1] - pad), min(im.width, b[2] + pad), min(im.height, b[3] + pad))
    return im.crop(b)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def map_rgb(im, fn):
    """Apply fn(r, g, b, a) -> (r, g, b, a) per pixel (small images only)."""
    im = im.convert('RGBA')
    out = Image.new('RGBA', im.size)
    out.putdata([fn(*p) for p in im.getdata()])
    return out


def clamp(v, lo=0, hi=255):
    return lo if v < lo else hi if v > hi else int(v)


def gradient_map(im, stops):
    """Luminance -> colour along stops [(t, (r,g,b)), ...], alpha kept."""
    def col(t):
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t <= t1:
                k = 0 if t1 == t0 else (t - t0) / (t1 - t0)
                return tuple(clamp(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
        return stops[-1][1][:3]
    table = [col(i / 255) for i in range(256)]
    return map_rgb(im, lambda r, g, b, a: table[clamp(lum((r, g, b)))] + (a,))


def tint(im, color, k):
    return map_rgb(im, lambda r, g, b, a: (clamp(r + (color[0] - r) * k), clamp(g + (color[1] - g) * k),
                                            clamp(b + (color[2] - b) * k), a))


def brighten(im, k):
    return map_rgb(im, lambda r, g, b, a: (clamp(r * k), clamp(g * k), clamp(b * k), a))


def with_alpha(im, mask):
    out = im.copy()
    out.putalpha(ImageChops.multiply(im.getchannel('A'), mask))
    return out


def outline(im, width, color, blur=0.0):
    """Dark outline behind a cut-out."""
    a = im.getchannel('A')
    grown = a.filter(ImageFilter.MaxFilter(width * 2 + 1))
    if blur:
        grown = grown.filter(ImageFilter.GaussianBlur(blur))
    base = Image.new('RGBA', im.size, color[:3] + (0,))
    base.putalpha(grown.point(lambda v: v * color[3] // 255))
    base.alpha_composite(im)
    return base


def glow(size, center, radius, color, power=1.6, strength=1.0):
    """Radial glow (alpha falls off to the radius)."""
    w, h = size
    g = Image.new('RGBA', size, color[:3] + (0,))
    a = Image.new('L', size, 0)
    px = a.load()
    cx, cy = center
    for y in range(max(0, int(cy - radius)), min(h, int(cy + radius) + 1)):
        for x in range(max(0, int(cx - radius)), min(w, int(cx + radius) + 1)):
            d = math.hypot(x - cx, y - cy) / radius
            if d < 1:
                px[x, y] = clamp(255 * strength * (1 - d) ** power)
    g.putalpha(a)
    return g


def add_light(base, light):
    """Additive blend of an RGBA light layer onto base (alpha of base kept, light extends it)."""
    out = base.copy()
    o, l = out.load(), light.load()
    for y in range(base.height):
        for x in range(base.width):
            lr, lg, lb, la = l[x, y]
            if not la:
                continue
            r, g, b, a = o[x, y]
            k = la / 255
            if a == 0:
                o[x, y] = (lr, lg, lb, la)
                continue
            na = max(a, la)
            o[x, y] = (clamp(r * a / na + lr * k), clamp(g * a / na + lg * k), clamp(b * a / na + lb * k), na)
    return out


# ------------------------------------------------------------- noise (no numpy)

def value_noise(w, h, cell, seed, period=None):
    rnd = random.Random(seed)
    gw, gh = w // cell + 2, h // cell + 2
    pw = (period or w) // cell
    ph = (period or h) // cell
    grid = [[rnd.random() for _ in range(gw)] for _ in range(gh)]

    def gv(i, j):
        return grid[j % ph if period else j][i % pw if period else i]
    out = []
    for y in range(h):
        fy = y / cell
        j = int(fy)
        ty = fy - j
        ty = ty * ty * (3 - 2 * ty)
        row = []
        for x in range(w):
            fx = x / cell
            i = int(fx)
            tx = fx - i
            tx = tx * tx * (3 - 2 * tx)
            a = gv(i, j) + (gv(i + 1, j) - gv(i, j)) * tx
            b = gv(i, j + 1) + (gv(i + 1, j + 1) - gv(i, j + 1)) * tx
            row.append(a + (b - a) * ty)
        out.append(row)
    return out


def fbm(w, h, seed, cells=(32, 16, 8), period=None):
    layers = [value_noise(w, h, c, seed + k, period) for k, c in enumerate(cells)]
    amps = [0.55, 0.3, 0.15][:len(cells)]
    return [[sum(l[y][x] * a for l, a in zip(layers, amps)) / sum(amps) for x in range(w)] for y in range(h)]


# --------------------------------------------------------------- cut-outs

def floor_like(r, g, b):
    """The slate floor of game-2x.png (blue, g between r and b, not bright)."""
    return (b - r) >= 14 and abs(g - (r + b) / 2) <= 14 and lum((r, g, b)) < 125


def cutout(box, keep=None):
    """Object on the floor of the illustration -> RGBA. The background is grown from the crop border
    through floor-like pixels (so dark outlines stop it); enclosed holes stay solid."""
    im = SRC.crop(box).convert('RGBA')
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if bg[i]:
            continue
        r, g, b, _ = px[x, y]
        if not floor_like(r, g, b) and not (keep and keep(x, y)):
            continue
        bg[i] = 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                stack.append((nx, ny))
    mask = Image.new('L', (w, h))
    mask.putdata([0 if v else 255 for v in bg])
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    return im


def emissive(box, floor=(56, 79, 102)):
    """A glowing object over the floor (bullets): the light above the floor colour becomes an
    additive RGBA layer (colour = excess / alpha)."""
    im = SRC.crop(box).convert('RGB')

    def fn(r, g, b, _a):
        ex = (max(0, r - floor[0]), max(0, g - floor[1]), max(0, b - floor[2]))
        m = max(ex)
        if m < 6:
            return (0, 0, 0, 0)
        k = 255 / m
        return (clamp(ex[0] * k), clamp(ex[1] * k), clamp(ex[2] * k), clamp(m * 1.15))
    return map_rgb(im.convert('RGBA'), fn)


def roll_columns(im, x_ranges, y0, y1, d):
    """Tread animation: content of the given columns moves d px along y (wrapping in y0..y1)."""
    out = im.copy()
    for x0, x1 in x_ranges:
        strip = im.crop((x0, y0, x1, y1))
        rolled = ImageChops.offset(strip, 0, d)
        out.paste(rolled, (x0, y0))
    return out


def sheet_cell(key):
    i = SHEET_KEYS.index(key)
    return SHEET.crop(((i % 6) * 96, (i // 6) * 96, (i % 6) * 96 + 96, (i // 6) * 96 + 96))


# ================================================================== TILES
THEMES = ('clay', 'iron', 'magma')
FLOOR_BOXES = [(280, 93, 436, 249), (740, 93, 896, 249)]  # 2x2 floor tiles each, grid line to grid line


def floor_frame(box, theme):
    im = resize(SRC.crop(box), (128, 128))
    # calm it: pull values to the middle, then darken
    im = map_rgb(im, lambda r, g, b, a: (clamp(r * 0.55 + 8), clamp(g * 0.55 + 10), clamp(b * 0.57 + 14), a))
    if theme == 'clay':
        im = gradient_map(im, [(0.0, (14, 12, 12)), (0.12, (30, 25, 24)), (0.22, (52, 42, 38)), (0.35, (70, 58, 50)),
                               (1.0, (110, 92, 80))])
    elif theme == 'magma':
        im = gradient_map(im, [(0.0, (12, 8, 10)), (0.12, (28, 17, 19)), (0.22, (48, 28, 28)), (0.35, (66, 38, 34)),
                               (1.0, (110, 60, 50))])
    return im


def build_floor():
    for theme in THEMES:
        sheet = Image.new('RGBA', (256, 128))
        for i, box in enumerate(FLOOR_BOXES):
            sheet.paste(floor_frame(box, theme), (i * 128, 0))
        save(f'tile_{theme}_floor', expect('floor', sheet, (256, 128)))


# four whole bricks of the illustration (x0, y0, x1, y1), each becomes one 64x64 quarter
BRICK_BOXES = [(262, 410, 342, 482), (340, 410, 420, 482), (418, 410, 507, 482), (164, 333, 228, 410)]


def brick_piece(box):
    """One brick cut out of the illustration (keyed off the floor), its dark outline kept."""
    return bbox_crop(cutout((box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4)))


def brick_tile(theme, seed=0):
    tile = Image.new('RGBA', (128, 128), (24, 16, 14, 255))  # mortar
    d = ImageDraw.Draw(tile)
    for q in range(4):
        qx, qy = (q % 2) * 64, (q // 2) * 64
        d.rectangle((qx, qy, qx + 63, qy + 63), fill=(30, 20, 17, 255))
    order = [(seed + k) % 4 for k in range(4)]
    for q, k in enumerate(order):
        piece = resize(brick_piece(BRICK_BOXES[k]), (62, 62))
        tile.alpha_composite(piece, ((q % 2) * 64 + 1, (q // 2) * 64 + 1))
    if theme == 'clay':
        tile = tint(tile, (205, 120, 80), 0.10)
    elif theme == 'magma':
        tile = map_rgb(tile, lambda r, g, b, a: (clamp(r * 0.98), clamp(g * 0.82), clamp(b * 0.8), a))
    return tile


def build_brick():
    for i, theme in enumerate(THEMES):
        save(f'tile_{theme}_brick', expect('brick', brick_tile(theme, i), (128, 128)))


STEEL_BOX = (579, 486, 675, 582)  # the single riveted steel block in the centre


def steel_plate(size):
    # the plate is the same hue as the floor, so it is cut by its own octagon outline, not keyed
    plate = SRC.crop(STEEL_BOX).convert('RGBA')
    w, h = plate.size
    k = 13
    S = 4
    m = Image.new('L', (w * S, h * S), 0)
    ImageDraw.Draw(m).polygon([(k * S, 0), ((w - k) * S, 0), (w * S, k * S), (w * S, (h - k) * S),
                               ((w - k) * S, h * S), (k * S, h * S), (0, (h - k) * S), (0, k * S)], fill=255)
    plate.putalpha(m.resize((w, h), Image.LANCZOS))
    plate = map_rgb(plate, lambda r, g, b, a: (clamp(r * 1.3 + 22), clamp(g * 1.25 + 22), clamp(b * 1.12 + 18), a))
    return resize(plate, (size, size))


def steel_tile(theme):
    tile = Image.new('RGBA', (128, 128), (12, 17, 23, 255))
    piece = steel_plate(62)
    for q in range(4):
        tile.alpha_composite(piece, ((q % 2) * 64 + 1, (q // 2) * 64 + 1))
    if theme == 'clay':
        tile = tint(tile, (150, 140, 130), 0.10)
    elif theme == 'magma':
        tile = tint(tile, (150, 120, 120), 0.10)
    return tile


def build_steel():
    for theme in THEMES:
        save(f'tile_{theme}_steel', expect('steel', steel_tile(theme), (128, 128)))


def lava_frame(phase, theme, noise_a, noise_b):
    w = 128
    im = Image.new('RGBA', (w, w))
    px = im.load()
    crust = {'clay': (60, 22, 12), 'iron': (40, 18, 16), 'magma': (52, 12, 6)}[theme]
    stops = [(0.0, crust), (0.42, rgb('magma_deep')[:3]), (0.58, rgb('magma_orange')[:3]),
             (0.75, rgb('magma_hot')[:3]), (0.9, rgb('core_amber')[:3]), (1.0, rgb('core_white')[:3])]

    def col(t):
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t <= t1:
                k = (t - t0) / (t1 - t0)
                return tuple(clamp(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
        return stops[-1][1]
    ang = phase * math.pi / 2
    for y in range(w):
        for x in range(w):
            # two layers drifting in opposite directions, cracks where they meet
            a = noise_a[(y + phase * 8) % w][(x + phase * 4) % w]
            b = noise_b[(y - phase * 4) % w][(x + phase * 8) % w]
            v = 1 - abs(a - b) * 3.2  # bright veins
            v = max(0.0, min(1.0, v))
            t = 0.30 + 0.62 * v ** 1.6 + 0.06 * math.sin(ang + (x + y) / 9)
            e = min(x, y, w - 1 - x, w - 1 - y)  # crust at the cell edge: a hard border against the floor
            t *= min(1.0, 0.25 + e / 8)
            px[x, y] = col(max(0, min(1, t))) + (255,)
    return im


def build_lava():
    na = fbm(128, 128, 11, (32, 16, 8), period=128)
    nb = fbm(128, 128, 29, (32, 16, 8), period=128)
    for theme in THEMES:
        sheet = Image.new('RGBA', (512, 128))
        for f in range(4):
            sheet.paste(lava_frame(f, theme, na, nb), (f * 128, 0))
        save(f'tile_{theme}_lava', expect('lava', sheet, (512, 128)))


def oil_tile(theme, seed):
    """Glossy black oil puddle: near-black body, thin-film sheen near the rim, a light rim and a
    specular streak (reads as liquid, not as floor)."""
    w = 128
    n = fbm(w, w, seed, (32, 16), period=w)
    sheen = fbm(w, w, seed + 7, (24, 12), period=w)
    im = Image.new('RGBA', (w, w))
    px = im.load()
    base = {'clay': (14, 11, 12), 'iron': (8, 11, 16), 'magma': (14, 8, 9)}[theme]
    for y in range(w):
        for x in range(w):
            dx, dy = (x - 64) / 60, (y - 64) / 58
            r = math.hypot(dx, dy) + (n[y][x] - 0.5) * 0.35
            if r > 1.0:
                continue
            a = 245 if r < 0.92 else clamp(245 * (1.0 - r) / 0.08)
            c = list(base)
            film = max(0.0, (r - 0.45) / 0.45) * (0.6 + 0.4 * sheen[y][x])
            band = math.sin(sheen[y][x] * 26 + r * 9)
            if band > 0:  # teal film
                c = [c[0] + 20 * band * film, c[1] + 95 * band * film, c[2] + 105 * band * film]
            else:  # warm film
                c = [c[0] + 90 * -band * film, c[1] + 45 * -band * film, c[2] + 70 * -band * film]
            if 0.86 < r < 0.95:  # rim
                c = [v + 45 for v in c]
            px[x, y] = (clamp(c[0]), clamp(c[1]), clamp(c[2]), a)
    spec = Image.new('RGBA', (w, w), (0, 0, 0, 0))
    m = Image.new('L', (w, w), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((30, 30, 62, 42), fill=220)
    d.ellipse((66, 28, 76, 35), fill=170)
    d.ellipse((76, 84, 92, 90), fill=90)
    m = m.filter(ImageFilter.GaussianBlur(2.0))
    spec = Image.new('RGBA', (w, w), rgb('steel_frost'))
    spec.putalpha(ImageChops.multiply(m, im.getchannel('A')))
    im.alpha_composite(spec)
    return im


def build_oil():
    for i, theme in enumerate(THEMES):
        save(f'tile_{theme}_oil', expect('oil', oil_tile(theme, 40 + i), (128, 128)))


def roots_tile(theme, seed):
    """Tangle of glowing cave roots (teal like the vines of stage-map-2x.png): hides tanks under it."""
    w = 128
    S = 3  # supersample
    big = Image.new('RGBA', (w * S, w * S), (0, 0, 0, 0))
    rnd = random.Random(seed)
    base = {'clay': (44, 36, 30), 'iron': (16, 34, 40), 'magma': (40, 18, 16)}[theme]
    d = ImageDraw.Draw(big)
    d.rounded_rectangle((4 * S, 4 * S, (w - 4) * S, (w - 4) * S), radius=22 * S, fill=base + (215,))
    vine = {'clay': ((70, 120, 96), (130, 190, 150)), 'iron': ((31, 125, 134), (111, 194, 196)),
            'magma': ((80, 110, 60), (150, 190, 90))}[theme]
    for k in range(13):
        pts = []
        x, y = rnd.uniform(0, w), rnd.choice([0, w, rnd.uniform(0, w)])
        ang = rnd.uniform(0, math.tau)
        for _ in range(14):
            pts.append((x * S, y * S))
            ang += rnd.uniform(-0.7, 0.7)
            x += math.cos(ang) * 11
            y += math.sin(ang) * 11
        width = rnd.choice([7, 9, 11, 13])
        d.line(pts, fill=(8, 14, 18, 255), width=(width + 4) * S, joint='curve')
        d.line(pts, fill=vine[0] + (255,), width=width * S, joint='curve')
        hl = [(px_ - S * 2, py_ - S * 2) for px_, py_ in pts]
        d.line(hl, fill=vine[1] + (255,), width=max(1, width // 3) * S, joint='curve')
    im = big.resize((w, w), Image.LANCZOS)
    mask = Image.new('L', (w, w), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, w - 3, w - 3), radius=18, fill=255)
    return with_alpha(im, mask.filter(ImageFilter.GaussianBlur(1.5)))


def build_roots():
    for i, theme in enumerate(THEMES):
        save(f'tile_{theme}_roots', expect('roots', roots_tile(theme, 70 + i), (128, 128)))


CORE_BOX = (548, 1012, 708, 1162)


def core_crystal():
    """The amber crystal inside the octagon ring, without the ring and the floor."""
    im = SRC.crop(CORE_BOX).convert('RGBA')
    w, h = im.size

    def fn(r, g, b, a):
        # bright yellow / amber = crystal; the dark-amber glow inside the ring fades out
        hot = (r + g) / 2 - b
        v = lum((r, g, b))
        if r < 120 or g < 60:
            k = 0
        else:
            k = max(0.0, min(1.0, (v - 115) / 60)) * max(0.0, min(1.0, (hot - 60) / 60))
        return (r, g, b, clamp(255 * k))
    out = map_rgb(im, fn)
    # keep only the inside of the ring (ellipse)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).ellipse((6, 4, w - 6, h - 4), fill=255)
    out = with_alpha(out, mask.filter(ImageFilter.GaussianBlur(4)))
    a = out.getchannel('A').point(lambda v: 255 if v > 150 else v * 255 // 150)
    out.putalpha(a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8)))
    return bbox_crop(out, 2)


def build_core():
    crystal = core_crystal()
    crystal = outline(crystal, 2, (60, 22, 6, 230), 0.8)
    c = fit(crystal, 100, 100)
    sheet = Image.new('RGBA', (256, 128))
    f0 = Image.new('RGBA', (128, 128))
    f0.alpha_composite(glow((128, 128), (64, 68), 62, rgb('magma_hot'), 1.4, 0.75))
    f0.alpha_composite(glow((128, 128), (64, 68), 40, rgb('core_white'), 2.0, 0.45))
    center_on(f0, c, 0, 2)
    sheet.paste(f0, (0, 0))
    # destroyed: dark grey, cracked, a dim ember left
    dead = map_rgb(c, lambda r, g, b, a: (clamp(lum((r, g, b)) * 0.38 + 18), clamp(lum((r, g, b)) * 0.38 + 20),
                                          clamp(lum((r, g, b)) * 0.38 + 26), a))
    f1 = Image.new('RGBA', (128, 128))
    center_on(f1, dead, 0, 10)
    # shattered: shift right part, cracks
    cr = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(cr)
    rnd = random.Random(5)
    for _ in range(7):
        x, y = 64 + rnd.uniform(-8, 8), 70 + rnd.uniform(-8, 8)
        pts = [(x, y)]
        ang = rnd.uniform(0, math.tau)
        for _ in range(5):
            ang += rnd.uniform(-0.6, 0.6)
            x += math.cos(ang) * 9
            y += math.sin(ang) * 9
            pts.append((x, y))
        d.line(pts, fill=(10, 17, 24, 255), width=3)
    cr = with_alpha(cr, f1.getchannel('A'))
    f1.alpha_composite(cr)
    f1.alpha_composite(glow((128, 128), (60, 82), 14, rgb('magma_deep'), 1.5, 0.6))
    sheet.paste(f1, (128, 0))
    save('core', expect('core', sheet, (256, 128)))
    # the 8 cells around the core: the same brick / steel with a warm (brick) or teal (steel) edge
    wall_b = brick_tile('iron', 2)
    wall_b = map_rgb(wall_b, lambda r, g, b, a: (clamp(r * 1.06 + 6), clamp(g * 1.04 + 4), clamp(b * 0.95), a))
    wall_s = steel_tile('iron')
    edge = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(edge)
    for q in range(4):
        qx, qy = (q % 2) * 64, (q // 2) * 64
        d.rectangle((qx + 1, qy + 1, qx + 62, qy + 62), outline=rgb('core_amber', 140), width=2)
    save('core_wall_brick', expect('cwb', Image.alpha_composite(wall_b, edge.filter(ImageFilter.GaussianBlur(0.6))), (128, 128)))
    edge = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(edge)
    for q in range(4):
        qx, qy = (q % 2) * 64, (q // 2) * 64
        d.rectangle((qx + 1, qy + 1, qx + 62, qy + 62), outline=rgb('steel_teal_light', 170), width=2)
    save('core_wall_steel', expect('cws', Image.alpha_composite(wall_s, edge.filter(ImageFilter.GaussianBlur(0.6))), (128, 128)))


def build_tiles():
    build_floor()
    build_brick()
    build_steel()
    build_lava()
    build_oil()
    build_roots()
    build_core()


# ================================================================== UNITS
ENEMY_BOX = (136, 129, 282, 275)  # left Rustbug (faces down in the illustration)
TANK_BOX = (546, 726, 707, 900)   # the drill tank (faces up)


def enemy_base():
    im = bbox_crop(cutout(ENEMY_BOX), 1)
    return im.rotate(180)


def tread_ranges(im):
    """Columns of the treads: neutral dark-grey columns at the two sides."""
    w, h = im.size
    px = im.load()
    cols = []
    for x in range(w):
        grey = n = 0
        for y in range(h):
            r, g, b, a = px[x, y]
            if a > 200:
                n += 1
                if abs(r - b) < 14 and abs(g - b) < 14 and lum((r, g, b)) < 120:
                    grey += 1
        cols.append(n and grey / n > 0.6 and n > h * 0.35)
    left = [x for x in range(w // 3) if cols[x]]
    right = [x for x in range(w * 2 // 3, w) if cols[x]]
    rs = []
    if left:
        rs.append((min(left), max(left) + 1))
    if right:
        rs.append((min(right), max(right) + 1))
    ys = [y for y in range(h) if px[(rs[0][0] + rs[0][1]) // 2, y][3] > 200] if rs else [0, h]
    return rs, min(ys), max(ys) + 1


def rust_recolor(im, kind):
    """Variant colours on the rust shell only (hue orange-brown); treads, eyes and outline kept."""
    def fn(r, g, b, a):
        if a == 0:
            return (r, g, b, a)
        is_rust = r > g + 18 and r > b + 30
        is_green = g > r + 30 and g > b + 30
        if kind == 'scout' and is_rust:
            return (clamp(r * 1.12 + 22), clamp(g * 1.25 + 30), clamp(b * 0.9 + 4), a)
        if kind == 'gunner' and is_rust:
            v = lum((r, g, b))
            return (clamp(v * 0.55), clamp(v * 1.05 + 18), clamp(v * 0.35), a)
        if kind == 'brute':
            if is_rust:
                return (clamp(r * 0.82 + 8), clamp(g * 0.55), clamp(b * 0.5), a)
            if not is_green:
                return (clamp(r * 0.8), clamp(g * 0.8), clamp(b * 0.85), a)
        return (r, g, b, a)
    return map_rgb(im, fn)


def gunner_barrel(im):
    """A short cannon at the front (top) of the gunner: dark iron with an acid-green muzzle."""
    w, h = im.size
    out = Image.new('RGBA', (w, h + 14), (0, 0, 0, 0))
    S = 4
    big = Image.new('RGBA', (w * S, (h + 14) * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    cx = w * S // 2
    d.rounded_rectangle((cx - 9 * S, 1 * S, cx + 9 * S, 40 * S), radius=3 * S, fill=rgb('slate_abyss'))
    d.rounded_rectangle((cx - 6 * S, 3 * S, cx + 6 * S, 38 * S), radius=2 * S, fill=rgb('rivet_iron'))
    d.rectangle((cx - 2 * S, 5 * S, cx + 0 * S, 36 * S), fill=(150, 162, 170, 255))
    d.rounded_rectangle((cx - 7 * S, 1 * S, cx + 7 * S, 7 * S), radius=2 * S, fill=rgb('acid_green_dark'))
    d.rectangle((cx - 4 * S, 2 * S, cx + 4 * S, 4 * S), fill=rgb('acid_green'))
    out.alpha_composite(big.resize(out.size, Image.LANCZOS))
    out.alpha_composite(im, (0, 14))
    return out


def unit_frames(im, size, cell=128, flash_color=(255, 244, 214), dy=0):
    """[move A, move B, flash A, flash B] of a cut-out facing up."""
    rs, y0, y1 = tread_ranges(im)
    frames = [im, roll_columns(im, rs, y0, y1, 3)]
    out = []
    for f in frames:
        c = fit(f, size, size)
        canvas = Image.new('RGBA', (cell, cell))
        center_on(canvas, c, 0, dy)
        out.append(canvas)
    def flash(r, g, b, a):
        if lum((r, g, b)) < 40:  # keep the dark outline so the silhouette stays
            return (r, g, b, a)
        k = 0.5
        return (clamp(r + (flash_color[0] - r) * k), clamp(g + (flash_color[1] - g) * k),
                clamp(b + (flash_color[2] - b) * k), a)
    flashes = [map_rgb(f, flash) for f in out]
    return out + flashes


def build_enemies():
    base = enemy_base()
    spec = {
        'grunt': (base, 112),
        'scout': (rust_recolor(base, 'scout'), 92),
        'gunner': (gunner_barrel(rust_recolor(base, 'gunner')), 120),
        'brute': (rust_recolor(base, 'brute'), 124),
    }
    for kind, (im, size) in spec.items():
        frames = unit_frames(im, size)
        if kind == 'brute':
            # heavier: a thicker dark rim and two armour bolts
            frames = [outline(f, 2, (10, 8, 8, 255)) for f in frames]
        sheet = Image.new('RGBA', (512, 128))
        for i, f in enumerate(frames):
            sheet.paste(f, (i * 128, 0))
        save(f'enemy_{kind}', expect(kind, sheet, (512, 128)))
    # brute damage overlays (on the brute body only)
    body = Image.open(OUT / 'enemy_brute-2x.png').crop((0, 0, 128, 128)).getchannel('A')
    body = body.point(lambda v: 255 if v > 200 else 0).filter(ImageFilter.MinFilter(9))
    sheet = Image.new('RGBA', (384, 128))
    rnd = random.Random(9)
    cracks = []
    for stage in range(3):
        for _ in range(2 + stage * 2):
            x, y = rnd.uniform(40, 88), rnd.uniform(30, 90)
            pts = [(x, y)]
            ang = rnd.uniform(0, math.tau)
            for _ in range(rnd.randint(3, 5)):
                ang += rnd.uniform(-0.8, 0.8)
                x += math.cos(ang) * 8
                y += math.sin(ang) * 8
                pts.append((x, y))
            cracks.append(pts)
        f = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        gl = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        d, dg = ImageDraw.Draw(f), ImageDraw.Draw(gl)
        for pts in cracks:
            dg.line(pts, fill=rgb('magma_orange', 230), width=5)
        gl = gl.filter(ImageFilter.GaussianBlur(2.2))
        for pts in cracks:
            d.line(pts, fill=(10, 8, 8, 255), width=3)
            d.line(pts, fill=rgb('magma_hot', 220), width=1)
        layer = Image.alpha_composite(gl, f)
        sheet.paste(with_alpha(layer, body), (stage * 128, 0))
    save('enemy_brute_damage', expect('bd', sheet, (384, 128)))


def build_player():
    im = bbox_crop(cutout(TANK_BOX), 1)
    rs, y0, y1 = tread_ranges(im)
    sheet = Image.new('RGBA', (256, 128))
    for i, f in enumerate([im, roll_columns(im, rs, y0, y1, 3)]):
        canvas = Image.new('RGBA', (128, 128))
        center_on(canvas, fit(f, 118, 118))
        sheet.paste(canvas, (i * 128, 0))
    save('player_hull', expect('hull', sheet, (256, 128)))


BULLET_RAMPS = {
    'bullet_player': [(0.0, rgb('magma_deep')[:3]), (0.45, rgb('magma_orange')[:3]), (0.75, rgb('magma_hot')[:3]),
                      (1.0, rgb('core_white')[:3])],
    'bullet_enemy': [(0.0, rgb('acid_green_dark')[:3]), (0.55, rgb('acid_green')[:3]), (1.0, (236, 255, 200))],
}


def bullet(name, box, flip):
    em = bbox_crop(emissive(box), 1)
    if flip:
        em = em.rotate(180)
    # recolour the cut-out light by its strength along the palette ramp (shape stays from the source)
    em = map_rgb(em, lambda r, g, b, a: (r, g, b, a) if a == 0 else
                 (clamp(a * 0.4 + lum((r, g, b)) * 0.6),) * 3 + (clamp(a * 1.3),))
    return gradient_map(em, BULLET_RAMPS[name])


def build_bullets():
    for name, box, flip in (('bullet_player', (608, 636, 648, 712), False), ('bullet_enemy', (606, 280, 650, 356), True)):
        em = bullet(name, box, flip)
        sheet = Image.new('RGBA', (64, 32))
        for i, (h, gain) in enumerate(((31, 1.0), (28, 0.85))):
            f = Image.new('RGBA', (32, 32))
            b = fit(em, 18, h)
            if gain != 1.0:
                b = map_rgb(b, lambda r, g, bb, a, k=gain: (r, g, bb, clamp(a * k)))
            # a dark halo under it so it reads on brick and lava too
            halo = outline(b, 1, (10, 17, 24, 150), 1.0)
            center_on(f, halo)
            sheet.paste(f, (i * 32, 0))
        save(name, expect(name, sheet, (64, 32)))


def build_units():
    build_enemies()
    build_player()
    build_bullets()


# ================================================================== FX (procedural, palette colours)
FIRE = [(0.0, (60, 40, 40)), (0.25, rgb('magma_deep')[:3]), (0.5, rgb('magma_orange')[:3]),
        (0.75, rgb('magma_hot')[:3]), (0.9, rgb('core_amber')[:3]), (1.0, rgb('core_white')[:3])]


def ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(clamp(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
    return stops[-1][1][:3]


def explosion_sheet(size, n, seed, shards=False):
    """Fireball -> smoke, drawn as separately composited soft blobs (ImageDraw replaces alpha, so
    every blob gets its own layer)."""
    rnd = random.Random(seed)
    R = size * 0.46
    blobs = [(rnd.uniform(0, math.tau), rnd.uniform(0.0, 1.0), rnd.uniform(0.55, 1.0), rnd.uniform(0, 0.35))
             for _ in range(16)]
    puffs = [(rnd.uniform(0, math.tau), rnd.uniform(0.45, 1.0), rnd.uniform(0.5, 0.9)) for _ in range(12)]
    rays = [(rnd.uniform(0, math.tau), rnd.uniform(0.6, 1.0)) for _ in range(10 if not shards else 16)]
    sheet = Image.new('RGBA', (size * n, size))
    c = size / 2

    def disc(layer, x, y, r, col, a, soft):
        tmp = Image.new('RGBA', layer.size, col + (0,))
        m = Image.new('L', layer.size, 0)
        ImageDraw.Draw(m).ellipse((x - r, y - r, x + r, y + r), fill=clamp(a))
        if soft:
            m = m.filter(ImageFilter.GaussianBlur(soft))
        tmp.putalpha(m)
        layer.alpha_composite(tmp)

    for i in range(n):
        t = i / (n - 1)
        heat = 1 - t
        f = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        if t > 0.15:
            sa = 210 * min(1, (t - 0.15) / 0.3) * (1 - t) ** 0.7
            for ang, dist, rr in puffs:
                pr = R * (0.25 + 0.6 * t) * dist
                shade = 0.85 + 0.25 * math.sin(ang * 3)
                disc(f, c + math.cos(ang) * pr, c + math.sin(ang) * pr, R * rr * (0.28 + 0.25 * t),
                     (clamp(40 * shade), clamp(46 * shade), clamp(56 * shade)), sa, size * 0.03)
        for ang, dist, rr, cool in blobs:
            pr = R * (0.08 + 0.5 * math.sqrt(t)) * dist
            r = R * rr * 0.4 * (0.6 + 0.9 * min(1, t * 3)) * (1 - 0.7 * t)
            if r < 1:
                continue
            col = ramp(FIRE, heat * 1.05 - cool * 0.55 - dist * 0.15)
            disc(f, c + math.cos(ang) * pr, c + math.sin(ang) * pr, r, col, 255 * (1 - t ** 1.5), size * 0.02)
        if t < 0.6:
            f.alpha_composite(glow((size, size), (c, c), R * (0.75 - 0.4 * t), rgb('core_white'), 1.4, 1 - t * 1.5))
        if t < 0.75:
            S = 2
            big = Image.new('RGBA', (size * S, size * S), (0, 0, 0, 0))
            dl = ImageDraw.Draw(big)
            for ang, ln in rays:
                r0 = R * S * (0.25 + 0.7 * t)
                r1 = r0 + R * S * 0.35 * ln * (1 - t)
                col = rgb('core_amber')[:3]
                w = max(1, int(size * S * (0.02 if not shards else 0.03) * (1 - t)))
                dl.line((c * S + math.cos(ang) * r0, c * S + math.sin(ang) * r0, c * S + math.cos(ang) * r1,
                         c * S + math.sin(ang) * r1), fill=col + (clamp(255 * (1 - t)),), width=w)
            f.alpha_composite(big.resize((size, size), Image.LANCZOS))
        sheet.paste(f, (i * size, 0))
    return sheet


def build_fx():
    save('fx_explosion_small', expect('xs', explosion_sheet(96, 4, 3), (384, 96)))
    save('fx_explosion_big', expect('xb', explosion_sheet(256, 6, 4), (1536, 256)))
    save('fx_explosion_core', expect('xc', explosion_sheet(256, 8, 5, shards=True), (2048, 256)))
    # spawn: a pulsing four-point star in a green ring (palette: acid_green_dark = enemy spawn)
    sheet = Image.new('RGBA', (768, 128))
    for i in range(6):
        k = 0.5 + 0.5 * math.sin(i / 6 * math.tau)
        S = 3
        big = Image.new('RGBA', (128 * S, 128 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(big)
        c = 64 * S
        rr = (30 + 22 * k) * S
        d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=rgb('acid_green_dark', 200), width=5 * S)
        d.ellipse((c - rr + 3 * S, c - rr + 3 * S, c + rr - 3 * S, c + rr - 3 * S), outline=rgb('acid_green', 160), width=2 * S)
        big = big.filter(ImageFilter.GaussianBlur(2 * S))
        d = ImageDraw.Draw(big)
        L = (26 + 26 * k) * S
        wdt = (6 + 4 * k) * S
        rot = i * math.pi / 12
        for arm in range(4):
            a = rot + arm * math.pi / 2
            tip = (c + math.cos(a) * L, c + math.sin(a) * L)
            l = (c + math.cos(a + math.pi / 2) * wdt, c + math.sin(a + math.pi / 2) * wdt)
            r = (c + math.cos(a - math.pi / 2) * wdt, c + math.sin(a - math.pi / 2) * wdt)
            d.polygon([tip, l, (c, c), r], fill=rgb('steel_frost'))
        d.ellipse((c - wdt * 1.2, c - wdt * 1.2, c + wdt * 1.2, c + wdt * 1.2), fill=rgb('core_white'))
        f = big.resize((128, 128), Image.LANCZOS)
        g = glow((128, 128), (64, 64), 40 + 14 * k, rgb('core_white'), 2.2, 0.55)
        g.alpha_composite(f)
        sheet.paste(g, (i * 128, 0))
    save('fx_spawn', expect('spawn', sheet, (768, 128)))
    # hit spark: 3 frames of 64
    sheet = Image.new('RGBA', (192, 64))
    rnd = random.Random(12)
    rays = [(rnd.uniform(0, math.tau), rnd.uniform(0.6, 1.0)) for _ in range(8)]
    for i in range(3):
        S = 4
        big = Image.new('RGBA', (64 * S, 64 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(big)
        c = 32 * S
        for ang, ln in rays:
            r0 = (3 + i * 7) * S
            r1 = r0 + (14 - i * 3) * ln * S
            d.line((c + math.cos(ang) * r0, c + math.sin(ang) * r0, c + math.cos(ang) * r1, c + math.sin(ang) * r1),
                   fill=(rgb('core_white') if i == 0 else rgb('magma_hot'))[:3] + (255 - i * 70,), width=(4 - i) * S)
        if i < 2:
            r = (10 - i * 5) * S
            d.ellipse((c - r, c - r, c + r, c + r), fill=rgb('core_white', 255 - i * 80))
        f = big.resize((64, 64), Image.LANCZOS)
        g = glow((64, 64), (32, 32), 22 - i * 4, rgb('magma_orange'), 1.8, 0.7 - i * 0.2)
        g.alpha_composite(f)
        sheet.paste(g, (i * 64, 0))
    save('fx_hit_spark', expect('spark', sheet, (192, 64)))
    # frost: icy translucent overlay, clear in the middle so the frozen unit shows
    w = 128
    im = Image.new('RGBA', (w, w), (0, 0, 0, 0))
    px = im.load()
    fr = rgb('steel_frost')
    for y in range(w):
        for x in range(w):
            dx, dy = abs(x - 63.5) / 60, abs(y - 63.5) / 60
            e = max(dx, dy) ** 4 * 0.6 + (dx * dx + dy * dy) * 0.25
            if max(dx, dy) > 1:
                continue
            px[x, y] = (fr[0], fr[1], fr[2], clamp(45 + 150 * min(1, e)))
    mask = Image.new('L', (w, w), 0)
    ImageDraw.Draw(mask).rounded_rectangle((4, 4, w - 5, w - 5), radius=18, fill=255)
    im = with_alpha(im, mask)
    d = ImageDraw.Draw(im)
    rnd = random.Random(21)
    for _ in range(14):  # ice cracks / facets
        x, y = rnd.choice([(rnd.uniform(6, 122), rnd.choice([8, 120])), (rnd.choice([8, 120]), rnd.uniform(6, 122))])
        ang = math.atan2(64 - y, 64 - x) + rnd.uniform(-0.6, 0.6)
        pts = [(x, y)]
        for _ in range(3):
            x += math.cos(ang) * rnd.uniform(6, 13)
            y += math.sin(ang) * rnd.uniform(6, 13)
            ang += rnd.uniform(-0.5, 0.5)
            pts.append((x, y))
        d.line(pts, fill=(255, 255, 255, 190), width=2)
    for cx_, cy_ in ((12, 12), (116, 12), (12, 116), (116, 116)):  # corner ice crystals
        for k in range(3):
            a = math.atan2(64 - cy_, 64 - cx_) + (k - 1) * 0.5
            d.polygon([(cx_, cy_), (cx_ + math.cos(a + 0.18) * 8, cy_ + math.sin(a + 0.18) * 8),
                       (cx_ + math.cos(a) * 20, cy_ + math.sin(a) * 20), (cx_ + math.cos(a - 0.18) * 8, cy_ + math.sin(a - 0.18) * 8)],
                      fill=(207, 230, 232, 230), outline=(111, 194, 196, 255))
    d.rounded_rectangle((4, 4, w - 5, w - 5), radius=18, outline=(111, 194, 196, 230), width=3)
    save('fx_frost', expect('frost', im, (128, 128)))
    # bubble shield: translucent teal sphere with a hex pattern; frame 1 dimmer (flicker)
    sheet = Image.new('RGBA', (320, 160))
    for i in range(2):
        S = 3
        big = Image.new('RGBA', (160 * S, 160 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(big)
        c, R = 80 * S, 74 * S
        k = 1.0 if i == 0 else 0.6
        d.ellipse((c - R, c - R, c + R, c + R), fill=rgb('steel_teal', clamp(40 * k)))
        hexr = 12 * S
        for row in range(-8, 9):
            for col in range(-8, 9):
                hx = c + col * hexr * 1.5
                hy = c + row * hexr * math.sqrt(3) + (col % 2) * hexr * math.sqrt(3) / 2
                if math.hypot(hx - c, hy - c) > R - 6 * S:
                    continue
                pts = [(hx + math.cos(a) * hexr, hy + math.sin(a) * hexr) for a in [j * math.pi / 3 for j in range(6)]]
                edge = math.hypot(hx - c, hy - c) / R
                d.polygon(pts, outline=rgb('steel_teal_light', clamp((30 + 110 * edge ** 2) * k)), width=S)
        d.ellipse((c - R, c - R, c + R, c + R), outline=rgb('steel_teal_light', clamp(230 * k)), width=4 * S)
        d.arc((c - R + 14 * S, c - R + 14 * S, c + R - 14 * S, c + R - 14 * S), 200, 250, fill=rgb('steel_frost', clamp(220 * k)), width=5 * S)
        f = big.resize((160, 160), Image.LANCZOS)
        g = glow((160, 160), (80, 80), 80, rgb('steel_teal_light'), 0.5, 0.0)
        sheet.paste(f, (i * 160, 0))
    save('fx_bubble', expect('bubble', sheet, (320, 160)))


# ================================================================== UI art
SRC_ICONS = ROOT / 'assets/source/icons'


def src_icon(key):
    """High-resolution original of an icon of the own sheet (assets/source/icons/batch-*/<key>-2x.png)."""
    path = next(SRC_ICONS.glob(f'batch-*/{key}-2x.png'))
    return bbox_crop(Image.open(path).convert('RGBA'))


def icon_canvas():
    return Image.new('RGBA', (96, 96), (0, 0, 0, 0))


def octagon(box, cut):
    x0, y0, x1, y1 = box
    return [(x0 + cut, y0), (x1 - cut, y0), (x1, y0 + cut), (x1, y1 - cut), (x1 - cut, y1), (x0 + cut, y1),
            (x0, y1 - cut), (x0, y0 + cut)]


def draw_ss(size, S, fn):
    """Draw at S x supersampling with fn(draw, S), return the downsampled RGBA."""
    big = Image.new('RGBA', (size[0] * S, size[1] * S), (0, 0, 0, 0))
    fn(ImageDraw.Draw(big), S, big)
    return big.resize(size, Image.LANCZOS)


def symbol_on_plate(shape_fn):
    """Steel plate of the field (cut from the illustration) + a light symbol with a dark outline."""
    c = icon_canvas()
    center_on(c, steel_plate(88))
    sym = draw_ss((96, 96), 4, shape_fn)
    sym = outline(sym, 3, rgb('slate_abyss', 255), 0.5)
    c.alpha_composite(sym)
    return c


def speaker(d, S, muted):
    o = rgb('slate_abyss')
    body = [(14, 38), (30, 38), (50, 20), (54, 20), (54, 76), (50, 76), (30, 58), (14, 58)]
    d.polygon([(x * S, y * S) for x, y in body], fill=o)
    inner = [(18, 42), (32, 42), (50, 25), (50, 71), (32, 54), (18, 54)]
    d.polygon([(x * S, y * S) for x, y in inner], fill=rgb('rivet_iron'))
    d.polygon([(x * S, y * S) for x, y in [(18, 42), (32, 42), (50, 25), (50, 44), (18, 46)]], fill=(150, 168, 178, 255))
    d.rectangle((18 * S, 42 * S, 23 * S, 54 * S), fill=rgb('steel_teal_light'))
    if not muted:
        for r, wdt in ((14, 6), (26, 6)):
            box = ((50 - r) * S, (48 - r) * S, (50 + r) * S, (48 + r) * S)
            d.arc(box, -48, 48, fill=o, width=(wdt + 4) * S)
            d.arc(box, -45, 45, fill=rgb('steel_teal_light'), width=wdt * S)
    else:
        for (a, b) in (((60, 34), (84, 62)), ((84, 34), (60, 62))):
            d.line((a[0] * S, a[1] * S, b[0] * S, b[1] * S), fill=o, width=13 * S)
        for (a, b) in (((60, 34), (84, 62)), ((84, 34), (60, 62))):
            d.line((a[0] * S, a[1] * S, b[0] * S, b[1] * S), fill=rgb('alarm_red'), width=7 * S)


def build_icons():
    # pause: steel plate + two bars
    def pause(d, S, _):
        for x in (31, 53):
            d.rounded_rectangle((x * S, 27 * S, (x + 12) * S, 69 * S), radius=2 * S, fill=rgb('steel_frost'))
            d.rectangle(((x + 1) * S, 28 * S, (x + 4) * S, 67 * S), fill=(255, 255, 255, 255))
    save('icon_pause', symbol_on_plate(pause))

    def back(d, S, _):
        pts = [(22, 48), (46, 24), (46, 38), (74, 38), (74, 58), (46, 58), (46, 72)]
        d.polygon([(x * S, y * S) for x, y in pts], fill=rgb('steel_frost'))
        d.polygon([(x * S, y * S) for x, y in [(22, 48), (46, 24), (46, 38), (74, 38), (74, 44), (40, 44)]],
                  fill=(255, 255, 255, 255))
    save('icon_back', symbol_on_plate(back))
    for name, muted in (('icon_sfx', False), ('icon_sfx_off', True)):
        save(name, draw_ss((96, 96), 4, lambda d, S, _b, m=muted: speaker(d, S, m)))

    def music(d, S, _):
        o, fill, hi = rgb('slate_abyss'), rgb('steel_teal_light'), rgb('steel_frost')
        for col, wdt in ((o, 4), (fill, 0)):
            e = wdt
            d.polygon([(x * S, y * S) for x, y in [(34 - e, 26 - e), (74 + e, 16 - e), (74 + e, 30 + e), (34 - e, 40 + e)]], fill=col)
            d.rectangle(((34 - e) * S, (26 - e) * S, (40 + e) * S, (70 + e) * S), fill=col)
            d.rectangle(((68 - e) * S, (16 - e) * S, (74 + e) * S, (62 + e) * S), fill=col)
            d.ellipse(((20 - e) * S, (60 - e) * S, (40 + e) * S, (78 + e) * S), fill=col)
            d.ellipse(((54 - e) * S, (52 - e) * S, (74 + e) * S, (70 + e) * S), fill=col)
        d.ellipse((24 * S, 63 * S, 31 * S, 68 * S), fill=hi)
        d.ellipse((58 * S, 55 * S, 65 * S, 60 * S), fill=hi)
    save('icon_music', draw_ss((96, 96), 4, music))
    # life: the player's tank (brand mark of the own sheet: the drill tank, facing up)
    c = icon_canvas()
    center_on(c, fit(src_icon('brand-mark'), 88, 88))
    save('icon_life', c)
    # enemies left: the Rustbug head as in the illustration (facing the viewer)
    c = icon_canvas()
    center_on(c, fit(bbox_crop(cutout(ENEMY_BOX)), 90, 90))
    save('icon_enemy_left', c)
    # gun level: a cannon barrel with a gold star
    def barrel(d, S, _):
        o = rgb('slate_abyss')
        a = -math.pi / 4
        def seg(r0, r1, wdt, col):
            x0, y0 = 30 + math.cos(a) * r0, 66 + math.sin(a) * r0
            x1, y1 = 30 + math.cos(a) * r1, 66 + math.sin(a) * r1
            d.line((x0 * S, y0 * S, x1 * S, y1 * S), fill=col, width=int(wdt * S))
        seg(-14, 56, 26, o)
        seg(-12, 54, 20, (120, 138, 150, 255))
        seg(-10, 52, 7, rgb('steel_frost'))
        seg(44, 56, 30, o)
        seg(46, 54, 24, rgb('slate_mid'))
        d.ellipse((10 * S, 54 * S, 38 * S, 82 * S), fill=o)
        d.ellipse((14 * S, 58 * S, 34 * S, 78 * S), fill=rgb('steel_teal'))
        d.ellipse((19 * S, 63 * S, 26 * S, 70 * S), fill=rgb('steel_teal_light'))
    c = draw_ss((96, 96), 4, barrel)
    star = fit(src_icon('rating-star'), 46, 46)
    c.alpha_composite(star, (96 - star.width - 2, 96 - star.height - 2))
    save('icon_gun', c)
    # stage: the flag (quest) of the own sheet; shop / daily / leaderboard: own sheet originals
    for name, key, box in (('icon_stage', 'quest', 86), ('icon_shop', 'shop', 88), ('icon_daily', 'calendar', 88),
                           ('icon_leaderboard', 'trophy', 88)):
        c = icon_canvas()
        center_on(c, fit(src_icon(key), box, box))
        save(name, c)


def dark_steel(im, k=1.0):
    return gradient_map(im, [(0.0, rgb('slate_abyss')[:3]), (0.3, rgb('slate_blue')[:3]), (0.7, rgb('slate_mid')[:3]),
                             (1.0, rgb('rivet_iron')[:3])])


def build_stars():
    star = src_icon('rating-star')
    for name, fs in (('star_small', 48), ('star_big', 192)):
        full = fit(star, int(fs * 0.94), int(fs * 0.94))
        empty = dark_steel(full)
        sheet = Image.new('RGBA', (fs * 2, fs))
        for i, im in enumerate((full, empty)):
            f = Image.new('RGBA', (fs, fs))
            center_on(f, im)
            sheet.paste(f, (i * fs, 0))
        save(name, expect(name, sheet, (fs * 2, fs)))


def node_plate(size, state):
    plate = steel_plate(size)
    cut = round(size * 0.29)
    m = draw_ss((size, size), 4, lambda d, S, _b: d.polygon([(x * S, y * S) for x, y in octagon((0, 0, size - 1, size - 1), cut)], fill=(255, 255, 255, 255)))
    plate = with_alpha(plate, m.getchannel('A'))
    if state == 'locked':
        plate = dark_steel(plate)
    elif state == 'cleared':
        plate = gradient_map(plate, [(0.0, rgb('slate_abyss')[:3]), (0.35, (24, 70, 78)), (0.6, rgb('steel_teal')[:3]),
                                     (1.0, rgb('steel_teal_light')[:3])])
    rim = {'locked': rgb('rivet_iron'), 'open': rgb('steel_teal_light'), 'current': rgb('magma_orange'),
           'cleared': rgb('core_amber')}[state]

    def deco(d, S, _b):
        o = octagon((2, 2, size - 3, size - 3), cut - 1)
        d.polygon([(x * S, y * S) for x, y in o], outline=rgb('slate_abyss'), width=int(size * 0.1 * S))
        o = octagon((3, 3, size - 4, size - 4), cut - 1)
        d.polygon([(x * S, y * S) for x, y in o], outline=rim, width=int(size * 0.06 * S))
        r = size * 0.27
        c = size / 2
        d.ellipse(((c - r) * S, (c - r) * S, (c + r) * S, (c + r) * S), fill=rgb('slate_deep', 170 if state != 'locked' else 110))
    plate.alpha_composite(draw_ss((size, size), 4, deco))
    return plate


def build_nodes():
    states = ('locked', 'open', 'current', 'cleared')  # NODE_FRAMES of src/screens/map-view.ts
    for name, fs, ps in (('node_stage', 128, 100), ('node_finale', 160, 118)):
        sheet = Image.new('RGBA', (fs * 4, fs))
        for i, st in enumerate(states):
            f = Image.new('RGBA', (fs, fs))
            if st == 'current':
                f.alpha_composite(glow((fs, fs), (fs / 2, fs / 2), fs * 0.5, rgb('magma_orange'), 1.3, 0.8))
            elif st == 'cleared':
                f.alpha_composite(glow((fs, fs), (fs / 2, fs / 2), fs * 0.5, rgb('core_amber'), 1.6, 0.45))
            plate = node_plate(ps, st)
            if name == 'node_finale':
                # boss border: rust spikes around and the Rustbug head on top
                spikes = draw_ss((fs, fs), 4, lambda d, S, _b: [
                    d.polygon([((fs / 2 + math.cos(a) * fs * 0.49) * S, (fs / 2 + math.sin(a) * fs * 0.49) * S),
                               ((fs / 2 + math.cos(a + 0.2) * fs * 0.33) * S, (fs / 2 + math.sin(a + 0.2) * fs * 0.33) * S),
                               ((fs / 2 + math.cos(a - 0.2) * fs * 0.33) * S, (fs / 2 + math.sin(a - 0.2) * fs * 0.33) * S)],
                              fill=rgb('rust_light') if st != 'locked' else rgb('slate_mid'), outline=rgb('slate_abyss'), width=2 * S)
                    for a in [math.pi / 8 + k * math.pi / 4 for k in range(8)]])
                f.alpha_composite(spikes)
            center_on(f, plate)
            if name == 'node_finale':
                head = fit(bbox_crop(cutout(ENEMY_BOX)), 46, 46)
                if st == 'locked':
                    head = dark_steel(head)
                f.alpha_composite(head, ((fs - head.width) // 2, 0))
            sheet.paste(f, (i * fs, 0))
        save(name, expect(name, sheet, (fs * 4, fs)))


def build_tut_hand():
    """Tutorial pointer: an orange arrow pointing down with a dark outline, 2 frames bobbing."""
    sheet = Image.new('RGBA', (320, 160))
    for i, dy in enumerate((0, 14)):
        def arrow(d, S, _b, dy=dy):
            pts = [(56, 18), (104, 18), (104, 74), (134, 74), (80, 136), (26, 74), (56, 74)]
            pts = [(x, y + dy - 6) for x, y in pts]
            d.polygon([(x * S, y * S) for x, y in pts], fill=rgb('slate_abyss'))
            inner = [(62, 24), (98, 24), (98, 80), (122, 80), (80, 128), (38, 80), (62, 80)]
            inner = [(x, y + dy - 6) for x, y in inner]
            d.polygon([(x * S, y * S) for x, y in inner], fill=rgb('magma_orange'))
            hi = [(62, 24), (98, 24), (98, 32), (70, 32), (70, 86), (52, 86), (62, 80)]
            d.polygon([(x * S, (y + dy - 6) * S) for x, y in hi], fill=rgb('magma_hot'))
        f = draw_ss((160, 160), 4, arrow)
        sheet.paste(f, (i * 160, 0))
    save('tut_hand', expect('tut', sheet, (320, 160)))


def build_ui():
    build_icons()
    build_stars()
    build_nodes()
    build_tut_hand()


# ================================================================== scenes, offers
def build_scenes():
    clean = MAP.convert('RGB')
    clean.save(OUT / 'scene-map-2x.webp', quality=80, method=6)
    dark = ImageEnhance.Brightness(clean).enhance(0.72)
    dark = ImageEnhance.Color(dark).enhance(0.8)
    # calm the far tunnel glow (a second warm focus next to the field)
    g = glow(dark.size, (1160, 225), 150, (0, 0, 0), 1.2, 0.55)
    dark = dark.convert('RGBA')
    dark.alpha_composite(g)
    dark.convert('RGB').save(OUT / 'scene-game-2x.webp', quality=80, method=6)
    WRITTEN.extend(['scene-map', 'scene-game'])


def build_offers():
    # the shop takes OFFERS of src/skin/art.ts (assets/ui/offers/offer-*); the old game-folder copies
    # pack_hull / pack_starter were plate clones: they become the same art as the offers
    for name, offer in (('pack_hull', 'hull_pack'), ('pack_starter', 'starter_crate')):
        save(name, Image.open(ROOT / f'assets/ui/offers/offer-{offer}-2x.png').convert('RGBA'))


GROUPS = {'tiles': build_tiles, 'units': build_units, 'fx': build_fx, 'ui': build_ui, 'scenes': build_scenes,
          'offers': build_offers}


def main(argv):
    names = argv or list(GROUPS)
    for n in names:
        GROUPS[n]()
    print('wrote', len(WRITTEN), ' '.join(WRITTEN))


if __name__ == '__main__':
    main(sys.argv[1:])
