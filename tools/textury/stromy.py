# Procedurálne textúry pre stromy (vlastné, CC0):
#   assets/textury/kora/farba.jpg, normal.jpg – bežná kôra (lipa, javor, topoľ, smrek): pozdĺžne brázdy
#   assets/textury/kora/platan.jpg            – kôra platana: odlupujúce sa škvrny (sivozelená, krémová, olivová)
#   assets/textury/kora/breza.jpg             – kôra brezy: biela s tmavými vodorovnými lenticelami a škvrnami
#   assets/textury/ihlice/karta.png           – vetvička smreka s ihlicami (karta s priehľadnosťou)
# Textúry kôry sú bezšvové (periodický šum cez FFT), 256 × 512 px ≈ obvod 0,8 m × 1,6 m kmeňa.
# Spustenie z koreňa repozitára: python3 tools/textury/stromy.py (numpy, pillow).
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

rng = np.random.default_rng(7)
W, H = 256, 512
os.makedirs('assets/textury/kora', exist_ok=True)
os.makedirs('assets/textury/ihlice', exist_ok=True)


def sum_fft(sx, sy, w=W, h=H):
    """Periodický šum: biely šum rozmazaný gaussom (sx, sy v pixeloch), normovaný na priemer 0 a odchýlku 1."""
    n = rng.standard_normal((h, w)).astype(np.float32)
    fx = np.fft.fftfreq(w)[None, :]
    fy = np.fft.fftfreq(h)[:, None]
    g = np.exp(-((fx * 2 * np.pi * sx) ** 2 + (fy * 2 * np.pi * sy) ** 2) / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(n) * g)).astype(np.float32)
    return (r - r.mean()) / r.std()


def uloz_jpg(arr, cesta, q=88):
    Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).save(cesta, quality=q)


def normalova(vyska, sila):
    gy, gx = np.gradient(np.pad(vyska, 1, mode='wrap'))
    gx, gy = gx[1:-1, 1:-1] * sila, gy[1:-1, 1:-1] * sila
    n = np.stack([-gx, gy, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


# --- bežná kôra: pozdĺžne hrebene a hlboké brázdy, ktoré sa občas spájajú ---
zvlnenie = sum_fft(6, 40) * 6.0
xs = np.arange(W)[None, :] + zvlnenie
hrebene = np.abs(np.sin(xs / W * math.pi * 9 + sum_fft(10, 60) * 0.9))     # 9 brázd po obvode
brazdy = np.clip((0.62 - hrebene) / 0.5, 0, 1) ** 0.8      # brázdy ~ tretina obvodu
jemne = sum_fft(0.8, 3) * 0.5 + sum_fft(2, 10) * 0.5
vyska = (1 - brazdy) * 0.8 + jemne * 0.08 + sum_fft(12, 30) * 0.06
zakl = np.array([0.40, 0.355, 0.31], np.float32)
tmava = np.array([0.14, 0.12, 0.105], np.float32)
t = np.clip(vyska, 0, 1)[..., None]
alb = tmava + (zakl - tmava) * t
alb *= (1 + jemne[..., None] * 0.07 + sum_fft(20, 40)[..., None] * 0.05)
# lišajník: miestami zelenkavý nádych
lisaj = np.clip(sum_fft(14, 24) - 0.9, 0, 1)[..., None]
alb = alb * (1 - lisaj * 0.5) + np.array([0.42, 0.45, 0.33]) * lisaj * 0.5
uloz_jpg(alb, 'assets/textury/kora/farba.jpg')
uloz_jpg(normalova(vyska, 3.0), 'assets/textury/kora/normal.jpg')

# --- platan: veľké škvrny po odlúpnutej kôre ---
p1, p2 = sum_fft(18, 26), sum_fft(9, 14)
farby = [np.array(c, np.float32) for c in ([0.52, 0.52, 0.43], [0.76, 0.72, 0.58], [0.42, 0.40, 0.31], [0.63, 0.62, 0.52])]
alb = np.zeros((H, W, 3), np.float32) + farby[0]
for k, (prah, f) in enumerate([(0.35, farby[1]), (0.9, farby[2]), (-0.6, farby[3])]):
    pole = p1 if k != 1 else p2
    m = np.clip((pole - prah) * 4, 0, 1)[..., None] if k != 2 else np.clip((prah - pole) * 4, 0, 1)[..., None]
    alb = alb * (1 - m) + f * m
alb *= (1 + sum_fft(1, 2)[..., None] * 0.04)
uloz_jpg(alb, 'assets/textury/kora/platan.jpg')

# --- breza: biela kôra, vodorovné tmavé čiarky a tmavé škvrny ---
alb = np.zeros((H, W, 3), np.float32) + np.array([0.86, 0.85, 0.81], np.float32)
alb *= (1 + sum_fft(3, 1.2)[..., None] * 0.035)
img = Image.fromarray((alb * 255).astype(np.uint8))
d = ImageDraw.Draw(img)
for _ in range(170):                                   # lenticely – krátke vodorovné čiarky
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    l, hr = rng.uniform(6, 28), rng.uniform(1.2, 3.2)
    for dx in (-W, 0, W):
        d.ellipse([x + dx - l / 2, y - hr / 2, x + dx + l / 2, y + hr / 2], fill=(52, 48, 45))
for _ in range(10):                                    # väčšie tmavé škvrny
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    l, hr = rng.uniform(30, 80), rng.uniform(3.5, 8)
    for dx in (-W, 0, W):
        d.ellipse([x + dx - l / 2, y - hr / 2, x + dx + l / 2, y + hr / 2], fill=(38, 36, 34))
img = img.filter(ImageFilter.GaussianBlur(0.7))
img.save('assets/textury/kora/breza.jpg', quality=88)

# --- vetvička smreka: hlavná vetvička s bočnými, husto ihlice (karta 512 × 256, vetvička vodorovne) ---
S = 2                                                   # kreslí sa vo dvojnásobku, potom sa zmenší (vyhladenie)
KW, KH = 512 * S, 256 * S
karta = Image.new('RGBA', (KW, KH), (0, 0, 0, 0))
d = ImageDraw.Draw(karta)


def ihlice(x0, y0, x1, y1, dlzka, hustota, hrubka):
    """Ihlice pozdĺž vetvičky z (x0,y0) do (x1,y1): krátke čiarky šikmo dopredu na obe strany."""
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    n = int(L * hustota)
    for i in range(n):
        t = i / n
        px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        ku = 1 - 0.55 * t                                # ku koncu kratšie ihlice
        for strana in (-1, 1, -1, 1):
            a = math.radians(rng.uniform(35, 70)) * strana
            ca, sa = math.cos(a), math.sin(a)
            dx, dy = ux * ca - uy * sa, ux * sa + uy * ca
            l = dlzka * ku * rng.uniform(0.75, 1.15)
            g = rng.uniform(0.75, 1.15)
            tm = rng.uniform(0, 1) < 0.3
            farba = (int(34 * g), int(58 * g + (8 if tm else 0)), int(30 * g), 255)
            d.line([px, py, px + dx * l, py + dy * l], fill=farba, width=int(hrubka))


# hlavná vetvička zľava doprava, mierne prehnutá
body = [(14 * S, 132 * S), (170 * S, 124 * S), (330 * S, 128 * S), (498 * S, 140 * S)]
for a, b in zip(body, body[1:]):
    d.line([*a, *b], fill=(70, 52, 36, 255), width=4 * S)
for k, (a, b) in enumerate(zip(body, body[1:])):
    ihlice(*a, *b, 34 * S * (1 - 0.15 * k), 0.36, 2.2 * S)
# bočné vetvičky
for t in np.linspace(0.08, 0.82, 9):
    i = min(2, int(t * 3))
    a, b = body[i], body[i + 1]
    lt = t * 3 - i
    px, py = a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt
    for strana in (-1, 1):
        ang = math.radians(rng.uniform(30, 55)) * strana
        L = rng.uniform(85, 130) * S * (1 - 0.45 * t)
        ex, ey = px + math.cos(ang) * L, py + math.sin(ang) * L
        d.line([px, py, ex, ey], fill=(70, 52, 36, 255), width=2 * S)
        ihlice(px, py, ex, ey, 22 * S, 0.42, 1.8 * S)
karta = karta.resize((512, 256), Image.LANCZOS)
# farba aj pod priehľadnými okrajmi (inak sa pri mipmapách okraje stmavia)
a = np.array(karta).astype(np.float32)
alfa = a[..., 3:4] / 255
rozm = np.array(karta.filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
rozm_a = rozm[..., 3:4] / 255
farba_pod = np.where(rozm_a > 0.01, rozm[..., :3] / np.maximum(rozm_a, 1e-3), np.array([34, 56, 30], np.float32))
a[..., :3] = np.where(alfa > 0.02, a[..., :3] / np.maximum(alfa, 1e-3), farba_pod)
a[..., :3] = np.clip(a[..., :3], 0, 255)
Image.fromarray(a.astype(np.uint8), 'RGBA').save('assets/textury/ihlice/karta.png', optimize=True)
print('hotovo')
