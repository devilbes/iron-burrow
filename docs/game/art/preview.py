#!/usr/bin/env python3
"""Previews of the rebuilt sprites: CONTACT.png (every rebuilt sprite at 2x on slate) and
FIELD_PREVIEW.png (a 13x13 field at 48 px per cell drawn the way src/screens/field-draw.ts draws it:
floor checker by (col+row)%2, brick / steel by 64x64 quarters, core + 8 core-wall cells, units
rotated by direction). Grayscale copies (*_GRAY.png) check the value hierarchy.
Run: python3 docs/game/art/preview.py [theme]"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[3]
GAME = ROOT / 'assets' / 'game'
ART = ROOT / 'docs' / 'game' / 'art'
C = 48


def load(name):
    return Image.open(GAME / f'{name}-2x.png').convert('RGBA')


def frame(im, i, n):
    w = im.width // n
    return im.crop((i * w, 0, i * w + w, im.height))


def put(canvas, im, x, y, size, rot=0):
    f = im.convert('RGBa').resize((round(size), round(size)), Image.LANCZOS).convert('RGBA')
    if rot:
        f = f.rotate(rot)
    canvas.alpha_composite(f, (round(x), round(y)))


LAYOUT = [
    '.............',
    '.BB..SS..BB..',
    '.BB..S...BB..',
    '.....LL......',
    '.SS..LL..OO..',
    '.....R.......',
    '..BBB.S.BBB..',
    '..b..R...R...',
    '.......SS....',
    '.BB.......BB.',
    '.....xxx.....',
    '.....xCx.....',
    '.....xxx.....',
]


def field(theme='iron'):
    img = Image.new('RGBA', (C * 13, C * 13), (18, 30, 41, 255))
    floor = load(f'tile_{theme}_floor')
    lava = load(f'tile_{theme}_lava')
    oil = load(f'tile_{theme}_oil')
    brick = load(f'tile_{theme}_brick')
    steel = load(f'tile_{theme}_steel')
    roots = load(f'tile_{theme}_roots')
    cwb = load('core_wall_brick')
    for r, row in enumerate(LAYOUT):
        for c, t in enumerate(row):
            put(img, frame(floor, (r + c) % 2, 2), c * C, r * C, C)
            if t == 'L':
                put(img, frame(lava, (r * 13 + c) % 4, 4), c * C, r * C, C)
            if t == 'O':
                put(img, oil, c * C, r * C, C)
    for r, row in enumerate(LAYOUT):
        for c, t in enumerate(row):
            im = {'B': brick, 'b': brick, 'S': steel, 'x': cwb}.get(t)
            if im is None:
                continue
            mask = 15 if t != 'b' else 0b0101  # half-destroyed: left quarters only
            if (r, c) == (2, 6):
                mask = 0b0011
            for bit, qx, qy in ((1, 0, 0), (2, 1, 0), (4, 0, 1), (8, 1, 1)):
                if mask & bit:
                    q = im.crop((qx * 64, qy * 64, qx * 64 + 64, qy * 64 + 64)).resize((C // 2, C // 2), Image.LANCZOS)
                    img.alpha_composite(q, (c * C + qx * C // 2, r * C + qy * C // 2))
    core = load('core')
    put(img, frame(core, 0, 2), 6 * C, 11 * C, C)
    # units: (sheet, frames, frame, col, row, rotation ccw degrees: art faces up)
    for name, f, col, row, rot in (('enemy_grunt', 0, 1, 0, 180), ('enemy_scout', 1, 6, 0, 180),
                                   ('enemy_gunner', 0, 11, 0, 90), ('enemy_brute', 0, 3, 3, 180),
                                   ('enemy_grunt', 2, 9, 7, -90)):
        put(img, frame(load(name), f, 4), col * C, row * C, C, rot)
    put(img, frame(load('enemy_brute_damage'), 1, 3), 3 * C, 3 * C, C, 180)
    put(img, frame(load('player_hull'), 0, 2), 4 * C, 10 * C, C)
    put(img, frame(load('player_hull'), 1, 2), 7 * C, 7 * C, C, 90)
    for name, x, y, rot in (('bullet_player', 4.5, 8.4, 0), ('bullet_enemy', 1.5, 1.2, 180),
                            ('bullet_player', 6.2, 7.5, 90), ('bullet_enemy', 3.5, 4.6, 180)):
        b = frame(load(name), 0, 2)
        put(img, b, x * C - C * 0.25, y * C - C * 0.25, C * 0.5, rot)
    # roots over the units
    for r, row in enumerate(LAYOUT):
        for c, t in enumerate(row):
            if t == 'R':
                put(img, roots, c * C, r * C, C)
    return img


def contact(names):
    tiles = []
    for n in names:
        im = load(n)
        s = min(1.0, 512 / im.width)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) if s < 1 else im
        tiles.append((n, im))
    W = 1600
    x = y = rowh = 0
    pos = []
    for n, im in tiles:
        if x + im.width + 16 > W:
            x, y, rowh = 0, y + rowh + 30, 0
        pos.append((x, y, n, im))
        x += im.width + 16
        rowh = max(rowh, im.height)
    sheet = Image.new('RGBA', (W, y + rowh + 30), (18, 30, 41, 255))
    d = ImageDraw.Draw(sheet)
    for x, y, n, im in pos:
        d.rectangle((x - 1, y + 13, x + im.width, y + 14 + im.height), outline=(47, 69, 88, 255))
        sheet.alpha_composite(im, (x, y + 14))
        d.text((x, y), n, fill=(242, 246, 247, 255))
    return sheet


def main(theme='iron'):
    f = field(theme)
    f.save(ART / ('FIELD_PREVIEW.png' if theme == 'iron' else f'FIELD_PREVIEW_{theme}.png'))
    ImageOps.grayscale(f).save(ART / ('FIELD_PREVIEW_GRAY.png' if theme == 'iron' else f'FIELD_PREVIEW_{theme}_GRAY.png'))
    names = [l.strip() for l in (ART / 'sprites.txt').read_text().split() if l.strip()] if (ART / 'sprites.txt').exists() else []
    if names and theme == 'iron':
        contact(names).save(ART / 'CONTACT.png')


if __name__ == '__main__':
    main(*(sys.argv[1:] or ['iron']))
