#!/usr/bin/env python3
"""Mechanical image shrink for the project repository (no generation, no decisions).

Usage (from the project root): python3 shrink_images.py <dir> [<dir> ...] [--quality 90] [--report docs/plan/REPO_SIZE.json]
For every .png / .jpg / .jpeg under the given directories:
  - re-saves it as <same name>.webp (lossy, given quality, alpha kept); the original is removed only when the WebP is smaller;
  - rewrites references to the old path / file name in text files of the project (md, json, yaml, html, css, ts, js, txt).
Byte-identical duplicates are listed in the report (not removed). Exit 0 always; the JSON report goes to stdout and to --report.
"""
import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

from PIL import Image

TEXT_EXT = {".md", ".json", ".yaml", ".yml", ".html", ".css", ".ts", ".tsx", ".js", ".mjs", ".txt", ".svg"}
SKIP_DIRS = {".git", "node_modules", "dist", ".scratch", "vendor"}
IMG_EXT = {".png", ".jpg", ".jpeg"}

ap = argparse.ArgumentParser()
ap.add_argument("dirs", nargs="+")
ap.add_argument("--quality", type=int, default=90)
ap.add_argument("--report", default="")
args = ap.parse_args()
ROOT = Path.cwd()


def size_of(paths):
    total = 0
    for d in paths:
        for p in Path(d).rglob("*"):
            if p.is_file():
                total += p.stat().st_size
    return total


before = size_of(args.dirs)
renamed, kept, failed, hashes = {}, [], [], {}
for d in args.dirs:
    for p in sorted(Path(d).rglob("*")):
        if not p.is_file() or p.suffix.lower() not in IMG_EXT:
            continue
        try:
            target = p.with_suffix(".webp")
            if target.exists():
                kept.append(p.as_posix())
                continue
            im = Image.open(p)
            im.load()
            im = im.convert("RGBA" if "A" in im.getbands() or im.mode == "P" else "RGB")
            tmp = p.with_suffix(".webp.tmp")
            im.save(tmp, "WEBP", quality=args.quality, method=4)
            if tmp.stat().st_size < p.stat().st_size:
                os.replace(tmp, target)
                p.unlink()
                renamed[p.as_posix()] = target.as_posix()
            else:
                tmp.unlink()
                kept.append(p.as_posix())
        except Exception as e:  # one broken file must not stop the rest
            failed.append({"file": p.as_posix(), "error": str(e)[:160]})

for d in args.dirs:
    for p in Path(d).rglob("*"):
        if p.is_file():
            hashes.setdefault(hashlib.sha256(p.read_bytes()).hexdigest(), []).append(p.as_posix())
duplicates = [v for v in hashes.values() if len(v) > 1]

# references: full relative path always; bare file name only when it is unique among the renamed files
names = {}
for old in renamed:
    names.setdefault(Path(old).name, []).append(old)
pairs = [(old, new) for old, new in renamed.items()]
pairs += [(n, Path(renamed[olds[0]]).name) for n, olds in names.items() if len(olds) == 1]
pairs.sort(key=lambda x: -len(x[0]))
touched = []
if pairs:
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            p = Path(base) / f
            if p.suffix.lower() not in TEXT_EXT or p.stat().st_size > 5_000_000:
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except Exception:
                continue
            new_text = text
            for old, new in pairs:
                if old in new_text:
                    new_text = new_text.replace(old, new)
            if new_text != text:
                p.write_text(new_text, encoding="utf-8")
                touched.append(p.relative_to(ROOT).as_posix())

report = {"dirs": args.dirs, "bytesBefore": before, "bytesAfter": size_of(args.dirs), "converted": len(renamed),
          "keptAsIs": len(kept), "failed": failed, "referencesUpdatedIn": touched, "duplicates": duplicates[:200]}
out = json.dumps(report, ensure_ascii=False, indent=2)
if args.report:
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(out + "\n")
print(out)
sys.exit(0)
