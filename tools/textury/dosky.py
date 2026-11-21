# Procedurálna textúra veľkých kamenných dosiek (námestia Starého Mesta): 1024 px = 4 × 4 m, bezšvová.
# Spustenie z koreňa repozitára: python3 tools/textury/dosky.py (numpy, pillow). Vlastná textúra, CC0.
import numpy as np
from PIL import Image
rng = np.random.default_rng(7)
N = 1024; M = 4.0; px = N / M
ROW = 0.4                          # výška radu (m)
rows = int(M / ROW)
alb = np.zeros((N, N, 3), np.float32)
hgt = np.zeros((N, N), np.float32)
# zrnitosť žuly (jemný šum, bezšvový – súčet sínusov s celočíselnými frekvenciami + náhodné body)
yy, xx = np.mgrid[0:N, 0:N] / N
# bezšvový šum: biely šum rozmazaný cez FFT (periodický)
def sum_fft(sigma):
    w = rng.standard_normal((N, N)).astype(np.float32)
    f = np.fft.fftfreq(N)
    g = np.exp(-(f[None, :] ** 2 + f[:, None] ** 2) * (2 * np.pi * sigma) ** 2 / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(w) * g)).astype(np.float32)
    return (r - r.mean()) / r.std()
zrno = 0.6 * sum_fft(0.8) + 0.4 * sum_fft(6.0)
bodky = rng.random((N, N)).astype(np.float32)
zakl = np.array([201, 196, 184], np.float32) / 255
tmava = np.array([178, 172, 160], np.float32) / 255
for r in range(rows):
    y0 = int(round(r * ROW * px)); y1 = int(round((r + 1) * ROW * px))
    # dĺžky dosiek v rade, posun radu
    x = rng.random() * M; konce = []
    while True:
        dl = rng.uniform(0.6, 1.05)
        if sum(konce) + dl > M - 0.55:
            konce.append(M - sum(konce)); break
        konce.append(dl)
    pos = x
    tmavy_rad = (r == 4)
    for dl in konce:
        a = int(round(pos * px)); b = int(round((pos + dl) * px))
        farba = (tmava if tmavy_rad else zakl) * rng.uniform(0.95, 1.04) + rng.uniform(-0.004, 0.004, 3)
        for xi in range(a, b):
            alb[y0:y1, xi % N] = farba
            hgt[y0:y1, xi % N] = 1.0
        # škára na začiatku dosky
        for xi in range(a - 1, a + 2):
            alb[y0:y1, xi % N] = np.array([118, 112, 103]) / 255; hgt[y0:y1, xi % N] = 0.0
        pos += dl
    # vodorovná škára
    alb[y0:y0 + 2, :] = np.array([118, 112, 103]) / 255; hgt[y0:y0 + 2, :] = 0.0
# žula: zrnitosť a tmavé/svetlé zrnká
alb *= (1 + 0.035 * zrno)[..., None]
alb *= np.where(bodky > 0.985, 0.78, np.where(bodky < 0.012, 1.12, 1.0))[..., None]
alb = np.clip(alb, 0, 1)
Image.fromarray((alb * 255).astype(np.uint8)).save('assets/textury/dosky/farba.jpg', quality=88)
# normálová mapa z výšky (škáry = žliabky), mierne zaoblené hrany
from PIL import ImageFilter
h = Image.fromarray((hgt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
h = np.asarray(h, np.float32) / 255 + 0.02 * zrno
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 2.2; gz = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 2.2
n = np.stack([-gx, gz, np.ones_like(gx)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save('assets/textury/dosky/normal.jpg', quality=90)
rough = np.where(hgt > 0.5, 0.72, 0.95) - 0.05 * zrno
Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8)).resize((512, 512)).save('assets/textury/dosky/drsnost.jpg', quality=85)

