# Terén nového modelu ako jedno pole (z model/data/teren/ – tools/model/teren.py) – na výšku spodku budov, plôch…
import gzip, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import VYSTUP  # noqa: E402


class Teren:
    def __init__(self):
        m = json.load(open(os.path.join(VYSTUP, 'teren', 'index.json'), encoding='utf8'))
        self.m = m
        N, D, k = m['uzly'], m['dlazdica'], m['krok']
        n = N - 1
        self.k = k
        self.x0, self.z0 = m['x0'], m['z0']
        self.H = np.full((m['nj'] * n + 1, m['ni'] * n + 1), np.nan, np.float32)
        for t in m['dlazdice']:
            raw = np.frombuffer(gzip.decompress(open(os.path.join(VYSTUP, 'teren', f"{t['i']}_{t['j']}.bin"), 'rb').read()), '<u2').reshape(N, N)
            v = (np.cumsum(raw.astype(np.int64), axis=1) % 65536) / 100 + t['min']
            self.H[t['j'] * n:t['j'] * n + N, t['i'] * n:t['i'] * n + N] = v

    def vyska(self, x, z):
        """Bilineárne; x, z môžu byť polia. Mimo územia NaN."""
        fx = (np.asarray(x, float) - self.x0) / self.k
        fz = (np.asarray(z, float) - self.z0) / self.k
        h, w = self.H.shape
        mimo = (fx < 0) | (fz < 0) | (fx > w - 1) | (fz > h - 1)
        fx = np.clip(fx, 0, w - 1.001); fz = np.clip(fz, 0, h - 1.001)
        i = np.floor(fx).astype(int); j = np.floor(fz).astype(int); tx = fx - i; tz = fz - j
        H = self.H
        v = (H[j, i] * (1 - tx) + H[j, i + 1] * tx) * (1 - tz) + (H[j + 1, i] * (1 - tx) + H[j + 1, i + 1] * tx) * tz
        return np.where(mimo, np.nan, v)
