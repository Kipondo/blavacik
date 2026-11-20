# Procedurálna textúra sivej zámkovej dlažby (betónové kocky 20 × 10 cm vo väzbe „väzba na polovicu“) – chodníky
# pri domoch, vnútrobloky, parkoviská mimo historického jadra: 1024 px = 2 × 2 m, bezšvová. Vlastná textúra, CC0.
# Spustenie z koreňa repozitára: python3 tools/textury/zamkova.py (numpy, pillow).
import os
import numpy as np
from PIL import Image, ImageFilter
rng = np.random.default_rng(23)
N = 1024; M = 2.0; px = N / M
os.makedirs('assets/textury/zamkova', exist_ok=True)


def sum_fft(sigma):
    w = rng.standard_normal((N, N)).astype(np.float32)
    f = np.fft.fftfreq(N)
    g = np.exp(-(f[None, :] ** 2 + f[:, None] ** 2) * (2 * np.pi * sigma) ** 2 / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(w) * g)).astype(np.float32)
    return (r - r.mean()) / r.std()


# väzba: rady kociek 20 × 10 cm, každý druhý rad posunutý o pol kocky
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / px          # metre
DL, SI = 0.2, 0.1
rad = np.floor(yy / SI).astype(int)
posun = (rad % 2) * DL / 2
stl = np.floor((xx + posun) / DL).astype(int) % int(M / DL)
id_v = rad * 1000 + stl
okraj_x = ((xx + posun) / DL) % 1.0
okraj_y = (yy / SI) % 1.0
sk = 0.012                                                      # škára ~2,5 mm na každej strane
skara = (np.minimum(okraj_x, 1 - okraj_x) * DL < 0.0022) | (np.minimum(okraj_y, 1 - okraj_y) * SI < 0.0022)
d = np.minimum(np.minimum(okraj_x, 1 - okraj_x) * DL, np.minimum(okraj_y, 1 - okraj_y) * SI) / 0.05
# farba kocky podľa id (pseudonáhoda)
h = (np.sin(id_v.astype(np.float64) * 12.9898) * 43758.5453) % 1.0
zakl = np.array([0.53, 0.525, 0.51], np.float32)
alb = zakl[None, None, :] * (0.94 + 0.1 * h[..., None]).astype(np.float32)
# niektoré kocky tmavšie (vymenené, zašpinené)
alb *= np.where(h[..., None] > 0.93, 0.82, 1.0)
zrno = 0.5 * sum_fft(0.6) + 0.3 * sum_fft(3.0) + 0.2 * sum_fft(25.0)
alb *= (1 + 0.05 * zrno)[..., None]
# zaoblené hrany: tmavšie pri škárach
alb *= (0.86 + 0.14 * np.clip(d / 0.25, 0, 1))[..., None]
alb[skara] = np.array([0.30, 0.29, 0.27])          # piesok/špina v škárach
alb = np.clip(alb, 0, 1)
Image.fromarray((alb * 255).astype(np.uint8)).save('assets/textury/zamkova/farba.jpg', quality=88)
vys = np.clip(d / 0.2, 0, 1) ** 0.6
vys[skara] = 0
vys = np.asarray(Image.fromarray((vys * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255 + 0.01 * zrno
gx = (np.roll(vys, -1, 1) - np.roll(vys, 1, 1)) * 2.5; gz = (np.roll(vys, -1, 0) - np.roll(vys, 1, 0)) * 2.5
nrm = np.stack([-gx, gz, np.ones_like(gx)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save('assets/textury/zamkova/normal.jpg', quality=90)
print('hotovo: assets/textury/zamkova/{farba,normal}.jpg')
