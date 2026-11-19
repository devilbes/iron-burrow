#!/usr/bin/env python3
"""Mechanical build of game assets (no generation, no decisions).

Input : assets/source/game/plan.json            - list of {id, area, skin, role, size{w,h}, transparent, prompt, ref}
        assets/source/game/batch-*/<id>.png     - generated sources (any canvas), assets/source/game/retry/<id>.png wins
Output: assets/game/<id>.webp and <id>-2x.webp for every asset, plus <id>.png and <id>-2x.png for sprites with transparency,
        assets/game/manifest.json,
        assets/source/game/review/contact-sheet.webp (+ gray), assets/source/game/review/verification.json
Exit 0 = every planned id is built; exit 1 = see "problems" (ids to regenerate into assets/source/game/retry/).
Run from the project root: python3 assets/source/game/build_assets.py
"""
import concurrent.futures
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path.cwd()
SRC = ROOT / "assets/source/game"
OUT = ROOT / "assets/game"
REVIEW = SRC / "review"
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

plan = json.loads((SRC / "plan.json").read_text())
items = plan["assets"] if isinstance(plan, dict) else plan


def find_source(asset_id):
    for folder in [SRC / "retry"] + sorted(SRC.glob("batch-*")):
        for ext in (".png", ".webp"):
            p = folder / (asset_id + ext)
            if p.is_file() and p.stat().st_size > 0:
                return p
    return None


def png_bytes(im, budget):
    b = io.BytesIO()
    im.save(b, "PNG", optimize=True)
    if b.tell() <= budget:
        return b.getvalue()
    method = Image.Quantize.FASTOCTREE if im.mode == "RGBA" else Image.Quantize.MEDIANCUT
    for colors in (256, 192, 128, 96, 64):
        b = io.BytesIO()
        im.quantize(colors=colors, method=method).save(b, "PNG", optimize=True)
        if b.tell() <= budget:
            return b.getvalue()
    raise ValueError("png weight over budget")


def webp_bytes(im, budget):
    data = b""
    for q in (82, 76, 68, 58, 48):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=5)
        data = b.getvalue()
        if len(data) <= budget:
            return data
    raise ValueError("webp weight over budget")


def fit(im, target, alpha):
    """Source canvas -> exact 2x size without distortion: sprites are contained on a transparent canvas, opaque art is centre-cropped."""
    tw, th = target
    if im.size == target:
        return im
    sw, sh = im.size
    if alpha:
        box = im.getbbox() or (0, 0, sw, sh)
        im = im.crop(box)
        sw, sh = im.size
        k = min(tw / sw, th / sh)
        im = im.resize((max(1, round(sw * k)), max(1, round(sh * k))), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", target, (0, 0, 0, 0))
        canvas.paste(im, ((tw - im.width) // 2, (th - im.height) // 2), im)
        return canvas
    k = max(tw / sw, th / sh)
    im = im.resize((max(tw, round(sw * k)), max(th, round(sh * k))), Image.Resampling.LANCZOS)
    left, top = (im.width - tw) // 2, (im.height - th) // 2
    return im.crop((left, top, left + tw, top + th))


def build(a):
    asset_id = a["id"]
    try:
        src = find_source(asset_id)
        if src is None:
            return {"id": asset_id, "ok": False, "error": "missing source"}
        im = Image.open(src)
        im.load()
        native = im.size
        alpha = bool(a.get("transparent"))
        im = im.convert("RGBA" if alpha else "RGB")
        if alpha:
            lo, hi = im.getchannel("A").getextrema()
            if lo == 255 or hi == 0:
                return {"id": asset_id, "ok": False, "error": "no transparency in source"}
        w, h = int(a["size"]["w"]), int(a["size"]["h"])
        master = fit(im, (w * 2, h * 2), alpha)
        one = master.resize((w, h), Image.Resampling.LANCZOS)
        background = a.get("role") == "background" or max(w, h) >= 1000
        files = []
        for scale, img in (("1x", one), ("2x", master)):
            suffix = "" if scale == "1x" else "-2x"
            budget = (300_000 if scale == "1x" else 1_000_000) if background else 500_000
            for ext in ("png", "webp"):
                if ext == "png" and not alpha:
                    continue  # opaque art ships as WebP only (PNG is for sprites with transparency)
                data = png_bytes(img, budget) if ext == "png" else webp_bytes(img, budget)
                path = OUT / (asset_id + suffix + "." + ext)
                path.write_bytes(data)
                files.append({"file": path.relative_to(ROOT).as_posix(), "scale": scale, "bytes": len(data),
                              "size": {"w": img.width, "h": img.height}, "sha256": hashlib.sha256(data).hexdigest()})
        row = {k: a.get(k) for k in ("id", "area", "skin", "role", "size", "prompt", "ref")}
        row.update(file="assets/game/" + asset_id + (".png" if alpha else ".webp"), scale=["1x", "2x"], source="codex",
                   genCount=int(a.get("genCount", 1)), sourceFile=src.relative_to(ROOT).as_posix(), files=files)
        return {"id": asset_id, "ok": True, "native": list(native), "asset": row}
    except Exception as e:  # one broken file must not stop the rest
        return {"id": asset_id, "ok": False, "error": str(e)[:200]}


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(build, items))

assets = [r["asset"] for r in results if r["ok"]]
(OUT / "manifest.json").write_text(json.dumps({"assets": assets}, ensure_ascii=False, indent=2) + "\n")
problems = [{"id": r["id"], "error": r["error"]} for r in results if not r["ok"]]

cols, cw, ch = 8, 220, 190
rows = max(1, (len(items) + cols - 1) // cols)
sheet = Image.new("RGB", (cols * cw, rows * ch), "#20303a")
draw = ImageDraw.Draw(sheet)
for i, a in enumerate(items):
    x, y = (i % cols) * cw, (i // cols) * ch
    p = OUT / (a["id"] + ".png")
    if not p.exists():
        p = OUT / (a["id"] + ".webp")
    if p.exists():
        img = Image.open(p).convert("RGBA")
        img.thumbnail((196, 140))
        sheet.paste(img, (x + 8, y + 4), img)
    draw.text((x + 6, y + 166), a["id"][:30], fill="#fff6e0")
sheet.save(REVIEW / "contact-sheet.webp", "WEBP", quality=85)
sheet.convert("L").save(REVIEW / "contact-sheet-gray.webp", "WEBP", quality=85)

summary = {
    "planned": len(items), "ready": len(assets), "problems": problems,
    "exportFiles": sum(len(a["files"]) for a in assets),
    "maxExportBytes": max((f["bytes"] for a in assets for f in a["files"]), default=0),
    "totalExportBytes": sum(f["bytes"] for a in assets for f in a["files"]),
    "resized": [r["id"] for r in results if r["ok"] and r.get("native") != [r["asset"]["size"]["w"] * 2, r["asset"]["size"]["h"] * 2]],
}
(REVIEW / "verification.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: v for k, v in summary.items() if k != "resized"}, ensure_ascii=False, indent=2))
sys.exit(1 if problems else 0)
