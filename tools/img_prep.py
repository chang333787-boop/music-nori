#!/usr/bin/env python3
# 그림 손질 — 코덱스가 그린 PNG(흰 바탕) → 앱용 webp
#  캐릭터·돌: 테두리에서 이어진 흰 바탕만 투명하게(토끼 흰 털처럼 외곽선 안쪽 흰색은 그대로) → 여백 자르기 → 긴 변 512px
#  배경(bg_*): 1600×900으로 줄여 그대로
#  쓰는 법: python3 tools/img_prep.py <코덱스 out 폴더> app/img/band
import sys, os
from collections import deque
from PIL import Image

def cut_white(im, thr=242, soft=200):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    def white(x, y, t=thr):
        r, g, b, a = px[x, y]
        return r >= t and g >= t and b >= t
    for x in range(w):
        for y in (0, h - 1):
            if white(x, y): q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if white(x, y) and not seen[y * w + x]: q.append((x, y)); seen[y * w + x] = 1
    while q:
        x, y = q.popleft()
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and white(nx, ny):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    # 가장자리 반투명(흰 테두리 번짐 줄이기): 투명 옆의 밝은 화소는 밝기만큼 투명하게
    out = im.copy(); po = out.load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a == 0: continue
            if any(px[nx, ny][3] == 0 for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
                l = min(r, g, b)
                if l > soft:
                    k = (l - soft) / (255 - soft)
                    po[x, y] = (r, g, b, int(255 * (1 - k)))
    return out

def trim(im, margin=8):
    bb = im.getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - margin), max(0, y0 - margin), min(im.width, x1 + margin), min(im.height, y1 + margin)))

def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith('.png'): continue
        name = f[:-4]
        im = Image.open(os.path.join(src, f))
        if name.startswith('bg_'):
            im = im.convert('RGB').resize((1600, 900), Image.LANCZOS)
            im.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=80, method=6)
        else:
            im = trim(cut_white(im))
            s = 512 / max(im.size)
            if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            im.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=86, method=6)
        print(name, im.size, os.path.getsize(os.path.join(dst, name + '.webp')) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
