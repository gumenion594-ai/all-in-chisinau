"""Pack satellite + terrain tiles into a few binary files and bake the elevation map.
Pack format: [uint32 LE index length][index JSON {"z/x/y": [offset, length]}][tile bytes]."""
import os, json, struct, glob, io, math
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..")
T = os.path.join(ROOT, "data", "raw", "tiles")
OUT = os.path.join(ROOT, "web", "data")

def pack(paths, out):
    idx, blobs, off = {}, [], 0
    for p in paths:
        z, x, yf = p.split(os.sep)[-3:]
        b = open(p, "rb").read() if isinstance(p, str) else p
        idx[f"{z}/{x}/{yf.split('.')[0]}"] = [off, len(b)]; blobs.append(b); off += len(b)
    head = json.dumps(idx, separators=(",", ":")).encode()
    with open(out, "wb") as f:
        f.write(struct.pack("<I", len(head))); f.write(head)
        for b in blobs: f.write(b)
    print(os.path.basename(out), len(idx), "tiles", round(os.path.getsize(out) / 1e6, 1), "MB")

def pack_mem(items, out):
    idx, off = {}, 0
    for k, b in items: idx[k] = [off, len(b)]; off += len(b)
    head = json.dumps(idx, separators=(",", ":")).encode()
    with open(out, "wb") as f:
        f.write(struct.pack("<I", len(head))); f.write(head)
        for _, b in items: f.write(b)
    print(os.path.basename(out), len(idx), "tiles", round(os.path.getsize(out) / 1e6, 1), "MB")

sat = sorted(glob.glob(os.path.join(T, "sat", "*", "*", "*.jpg")))
pack([p for p in sat if int(p.split(os.sep)[-3]) <= 13], os.path.join(OUT, "sat_a.bin"))
pack([p for p in sat if int(p.split(os.sep)[-3]) == 14], os.path.join(OUT, "sat_b.bin"))
dem = sorted(glob.glob(os.path.join(T, "dem", "*", "*", "*.png")))
pack(dem, os.path.join(OUT, "dem.bin"))

# ---- elevation map tiles (colour relief + hillshade) from z12 terrain, generated for z9..12
def elev(z, x, y):
    p = os.path.join(T, "dem", str(z), str(x), f"{y}.png")
    a = np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
STOPS = [(0, (64, 120, 80)), (60, (120, 165, 95)), (110, (190, 205, 120)), (160, (235, 220, 140)),
         (210, (215, 170, 100)), (270, (175, 120, 75)), (330, (140, 95, 70)), (420, (235, 230, 225))]
def ramp(e):
    out = np.zeros(e.shape + (3,), np.float32)
    xs = [s[0] for s in STOPS]
    for c in range(3):
        out[..., c] = np.interp(e, xs, [s[1][c] for s in STOPS])
    return out
items = []
for z in range(9, 13):
    for p in glob.glob(os.path.join(T, "dem", str(z), "*", "*.png")):
        x, y = int(p.split(os.sep)[-2]), int(p.split(os.sep)[-1][:-4])
        e = elev(z, x, y)
        lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 0.5) / 2 ** z))))
        res = 40075016 * math.cos(math.radians(lat)) / 2 ** z / 256
        gy, gx = np.gradient(e, res)
        slope = np.arctan(np.hypot(gx, gy) * 1.6)
        aspect = np.arctan2(-gx, gy)
        az, alt = math.radians(315), math.radians(45)
        hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
        hs = np.clip(hs, 0, 1)
        rgb = ramp(e) * (0.55 + 0.6 * hs[..., None])
        img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
        buf = io.BytesIO(); img.save(buf, "JPEG", quality=80)
        items.append((f"{z}/{x}/{y}", buf.getvalue()))
pack_mem(items, os.path.join(OUT, "relief.bin"))

# ---- elevation grid for stats (z12 pixel grid, halved => ~52 m)
Z = 12
def tx(lon): return (lon + 180) / 360 * 2 ** Z
def ty(lat):
    r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z
W, S, E, N = 28.50, 46.82, 29.22, 47.23
x0, x1, y0, y1 = int(tx(W)), int(tx(E)), int(ty(N)), int(ty(S))
mos = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        mos[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = elev(Z, x, y)
g = mos.reshape(mos.shape[0] // 2, 2, mos.shape[1] // 2, 2).mean(axis=(1, 3))
g = np.clip(np.round(g), 0, 65535).astype("<u2")
with open(os.path.join(OUT, "elev.bin"), "wb") as f:
    f.write(struct.pack("<IIII", g.shape[1], g.shape[0], x0 * 128, y0 * 128)); f.write(g.tobytes())
print("elev grid", g.shape, "min/max", int(g.min()), int(g.max()), round(os.path.getsize(os.path.join(OUT, "elev.bin")) / 1e6, 1), "MB")
