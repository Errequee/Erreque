#!/usr/bin/env python3
"""Empaqueta el sitio en un solo HTML autónomo (dist/taller-libre.html)."""
import os, re, pathlib

ROOT = pathlib.Path(__file__).parent
src = (ROOT / "index.html").read_text(encoding="utf-8")

def inline_css(m):
    path = ROOT / m.group(1)
    return "<style>\n" + path.read_text(encoding="utf-8") + "\n</style>"

def inline_js(m):
    path = ROOT / m.group(1)
    return "<script>\n" + path.read_text(encoding="utf-8") + "\n</script>"

out = re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">', inline_css, src)
out = re.sub(r'<script src="(assets/[^"]+)"></script>', inline_js, out)

dist = ROOT / "dist"
dist.mkdir(exist_ok=True)
target = dist / "taller-libre.html"
target.write_text(out, encoding="utf-8")
print(f"{target} — {len(out)/1024:.0f} KB")
