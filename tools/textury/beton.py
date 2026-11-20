# Procedurálna textúra veľkých svetlosivých betónových dlaždíc 50 × 50 cm (moderné námestia mimo historického
# jadra, napr. Kamenné námestie): 1024 px = 3 × 3 m, bezšvová. Vlastná textúra, CC0.
# Spustenie z koreňa repozitára: python3 tools/textury/beton.py (numpy, pillow).
import os
import numpy as np
from PIL import Image, ImageFilter
rng = np.random.default_rng(11)
N = 1024; M = 3.0; px = N / M
D = 0.5                                   # dlaždica 50 cm
n = int(M / D)
os.makedirs('assets/textury/beton', exist_ok=True)

def sum_fft(sigma):
    w = rng.standard_normal((N, N)).astype(np.float32)
    f = np.fft.fftfreq(N)
    g = np.exp(-(f[None, :] ** 2 + f[:, None] ** 2) * (2 * np.pi * sigma) ** 2 / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(w) * g)).astype(np.float32)
    return (r - r.mean()) / r.std()

zrno = 0.5 * sum_fft(0.7) + 0.3 * sum_fft(4.0) + 0.2 * sum_fft(30.0)   # betón: jemné zrno + škvrny
bodky = rng.random((N, N)).astype(np.float32)
zakl = np.array([196, 196, 191], np.float32) / 255
skara = np.array([132, 130, 124], np.float32) / 255
alb = np.zeros((N, N, 3), np.float32)
hgt = np.zeros((N, N), np.float32)
for j in range(n):
    for i in range(n):
        x0 = int(round(i * D * px)); x1 = int(round((i + 1) * D * px))
        y0 = int(round(j * D * px)); y1 = int(round((j + 1) * D * px))
        farba = zakl * rng.uniform(0.94, 1.05) + rng.uniform(-0.006, 0.006, 3)
        alb[y0:y1, x0:x1] = farba
        hgt[y0:y1, x0:x1] = 1.0
        # škáry (3 mm ≈ 1 px, mierne širšie kvôli mipmapám)
        alb[y0:y0 + 2, x0:x1] = skara; hgt[y0:y0 + 2, x0:x1] = 0
        alb[y0:y1, x0:x0 + 2] = skara; hgt[y0:y1, x0:x0 + 2] = 0
alb *= (1 + 0.045 * zrno)[..., None]
alb *= np.where(bodky > 0.992, 0.85, np.where(bodky < 0.006, 1.08, 1.0))[..., None]
# jemné stopy nečistôt pri škárach
blur = np.asarray(Image.fromarray((hgt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)), np.float32) / 255
alb *= (0.93 + 0.07 * blur)[..., None]
alb = np.clip(alb, 0, 1)
Image.fromarray((alb * 255).astype(np.uint8)).save('assets/textury/beton/farba.jpg', quality=88)
h = np.asarray(Image.fromarray((hgt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.4)), np.float32) / 255 + 0.015 * zrno
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 2.0; gz = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 2.0
nrm = np.stack([-gx, gz, np.ones_like(gx)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save('assets/textury/beton/normal.jpg', quality=90)
rough = np.where(hgt > 0.5, 0.8, 0.95) - 0.04 * zrno
Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8)).resize((512, 512)).save('assets/textury/beton/drsnost.jpg', quality=85)
print('hotovo: assets/textury/beton/{farba,normal,drsnost}.jpg')
