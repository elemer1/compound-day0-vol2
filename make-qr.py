#!/usr/bin/env python3
# Generate a QR code PNG for the deployed RSVP link.
# Usage: python3 make-qr.py "https://your-final-url"
#   (first time) pip3 install "qrcode[pil]"
import sys

if len(sys.argv) < 2:
    print('用法: python3 make-qr.py "https://你的最终链接"')
    sys.exit(1)

url = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else "qrcode.png"

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
except ImportError:
    print('缺少依赖，请先运行:  pip3 install "qrcode[pil]"')
    sys.exit(1)

qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=12, border=3)
qr.add_data(url)
qr.make(fit=True)
# Brand colors: ink on cream.
img = qr.make_image(fill_color="#010116", back_color="#EFE9DD")
img.save(out)
print("已生成 %s  ->  %s" % (out, url))
