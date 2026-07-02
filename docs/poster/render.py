#!/usr/bin/env python3
"""Render a poster HTML file (body sized exactly to the poster, e.g. 6in x 9.4in)
to a high-res PNG at 288dpi, matching this project's established output size.

Usage: python3 render.py <html_path> <png_path> [width_in] [height_in]
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

CSS_PX_PER_IN = 96
DPI = 288

def render(html_path, png_path, width_in=6.0, height_in=9.4):
    width_px = round(width_in * CSS_PX_PER_IN)
    height_px = round(height_in * CSS_PX_PER_IN)
    scale = DPI / CSS_PX_PER_IN
    abs_path = Path(html_path).resolve()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": width_px, "height": height_px},
            device_scale_factor=scale,
        )
        page.goto(f"file://{abs_path}")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(500)
        page.screenshot(path=png_path)
        browser.close()
    print(f"wrote {png_path}")

if __name__ == "__main__":
    html_path = sys.argv[1]
    png_path = sys.argv[2]
    w = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
    h = float(sys.argv[4]) if len(sys.argv) > 4 else 9.4
    render(html_path, png_path, w, h)
