# Geometria Ďoďa (bez Blendera): telo v metroch (Blender súradnice: X vpravo postavy je -X?, -Y dopredu, Z hore),
# kosti, váhy, označenie častí tela, oblečenie odvodené z tela, vlasy, retiazka, igelitka.
import numpy as np
import mh, telo

VYSKA = 1.76  # cieľová výška postavy v metroch


class Model:
    def __init__(self, vyska=VYSKA):
        V0, VT, F, FT, G = mh.nacitaj_obj()
        self.VT, self.F, self.FT, self.G = VT, F, FT, G
        dodo, delty = telo.vsetky_tvary()
        body_v = sorted({i for f, g in zip(F, G) if g == 'body' for i in f})
        b = self._mh2b(dodo)
        vys = b[body_v, 2].max() - b[body_v, 2].min()
        self.mierka = vyska / vys
        self.zem = b[body_v, 2].min() * self.mierka
        self.P = self._b(dodo)                      # všetky vrcholy (aj pomocné) v metroch
        self.D = {k: self._mh2b(v) * self.mierka for k, v in delty.items()}
        self.kocky = mh.kocky_klbov(F, G)
        self._kosti()
        self._vahy()
        self._normaly()

    def _mh2b(self, V):
        return np.stack([V[:, 0], -V[:, 2], V[:, 1]], 1) * 0.1

    def _b(self, V):
        out = self._mh2b(V) * self.mierka
        out[:, 2] -= self.zem
        return out

    # ---------- kostra ----------
    def _kosti(self):
        r = mh.rig()
        self.rig = r
        self.kosti = {}
        for meno, s in r.items():
            h = mh.poloha_klbu(s['head'], self.P, self.kocky)
            t = mh.poloha_klbu(s['tail'], self.P, self.kocky)
            self.kosti[meno] = dict(head=h, tail=t, roll=s['roll'], parent=s['parent'] or None)
        # koreň na zemi pod panvou, smeruje hore
        pv = self.kosti['pelvis']['head']
        self.kosti['Root'].update(head=np.array([0, pv[1], 0.0]), tail=np.array([0, pv[1], 0.25]), roll=0)
        self.mena_kosti = list(r.keys())

    def klb(self, meno):
        return self.P[self.kocky[meno]].mean(0)

    def _vahy(self):
        w = mh.vahy()
        n = len(self.P)
        self.W = np.zeros((n, len(self.mena_kosti)), np.float32)
        for j, k in enumerate(self.mena_kosti):
            for vi, ww in w.get(k, []):
                self.W[vi, j] = ww
        s = self.W.sum(1, keepdims=True)
        self.W = np.where(s > 0, self.W / np.maximum(s, 1e-9), 0)
        # vrcholy bez váh (napr. medzi prstami na nohách) prevezmú váhy najbližšieho suseda s váhami
        from scipy.spatial import cKDTree
        ok = self.W.sum(1) > 0.5
        if (~ok).any():
            _, i = cKDTree(self.P[ok]).query(self.P[~ok])
            self.W[~ok] = self.W[np.where(ok)[0][i]]

    def _normaly(self):
        P = self.P
        N = np.zeros_like(P)
        for f, g in zip(self.F, self.G):
            if g != 'body':
                continue
            for i in range(1, len(f) - 1):
                a, b, c = P[f[0]], P[f[i]], P[f[i + 1]]
                n = np.cross(b - a, c - a)
                for v in (f[0], f[i], f[i + 1]):
                    N[v] += n
        l = np.linalg.norm(N, axis=1, keepdims=True)
        self.N = np.where(l > 0, N / np.maximum(l, 1e-12), 0)

    # ---------- časti tela ----------
    def param_kosti(self, meno, p):
        k = self.kosti[meno]
        d = k['tail'] - k['head']
        return np.clip(((p - k['head']) @ d) / (d @ d), -1, 2)

    def casti_tela(self):
        """Pre každú plochu 'body' vráti označenie časti (na skrývanie pod oblečením)."""
        idx = {k: i for i, k in enumerate(self.mena_kosti)}
        out = []
        self.ziadne = 0
        for f, g in zip(self.F, self.G):
            if g != 'body':
                out.append(None)
                continue
            w = self.W[f].sum(0)
            k = self.mena_kosti[int(w.argmax())]
            c = self.P[f].mean(0)
            s = k.rsplit('_', 1)[-1] if k.endswith(('_l', '_r')) else ''
            zak = k[:-2] if s else k
            if zak in ('head', 'neck_01'):
                l = 'hlava'
            elif zak in ('spine_03', 'clavicle'):
                l = 'hrud'
            elif zak in ('spine_02', 'spine_01'):
                l = 'brucho'
            elif zak == 'pelvis':
                l = 'panva_h' if c[2] > self.pas_z else 'panva'
            elif zak == 'thigh':
                l = 'stehno_h' if self.param_kosti(k, c) < 0.55 else 'stehno_d'
            elif zak == 'calf':
                l = 'lytko' if self.param_kosti(k, c) < 0.78 else 'clenok'
            elif zak in ('foot', 'ball'):
                l = 'chodidlo'
            elif zak == 'upperarm':
                l = 'rameno_h' if self.param_kosti(k, c) < 0.45 else 'rameno_d'
            elif zak == 'lowerarm':
                l = 'predlaktie'
            else:
                l = 'dlan'
            out.append(l)
        return out

    @property
    def pas_z(self):
        return self.kosti['pelvis']['head'][2] + 0.035
