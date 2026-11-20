# Načítanie MakeHuman dát (CC0) bez Blendera: base mesh, targety, makro-váhy, kĺby, váhy kostí.
import gzip, json, os
import numpy as np

MH = os.environ.get('MPFB_DATA', '/home/claude/makehumancommunity/mpfb2/src/mpfb/data')


def nacitaj_obj(cesta=None):
    """Vráti vrcholy (dm, Y hore, Z dopredu), UV, plochy (indexy vrcholov a UV) a skupinu každej plochy."""
    cesta = cesta or os.path.join(MH, '3dobjs/base.obj')
    V, VT, F, FT, G = [], [], [], [], []
    skupina = None
    for l in open(cesta):
        if l.startswith('v '):
            V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '):
            VT.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('g '):
            skupina = l.split(None, 1)[1].strip()
        elif l.startswith('f '):
            casti = [p.split('/') for p in l.split()[1:]]
            F.append([int(p[0]) - 1 for p in casti])
            FT.append([int(p[1]) - 1 for p in casti])
            G.append(skupina)
    return np.array(V), np.array(VT), F, FT, G


def nacitaj_target(meno):
    """Delta posuny vrcholov z .target.gz (index dx dy dz)."""
    cesta = os.path.join(MH, 'targets', meno + '.target.gz')
    idx, d = [], []
    with gzip.open(cesta, 'rt') as f:
        for l in f:
            l = l.strip()
            if not l or l.startswith('#'):
                continue
            p = l.split()
            idx.append(int(p[0]))
            d.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(d)


_cache = {}


def delta(meno, n):
    if meno not in _cache:
        _cache[meno] = nacitaj_target(meno)
    idx, d = _cache[meno]
    out = np.zeros((n, 3))
    if len(idx):
        out[idx] = d
    return out


_MACRO = json.load(open(os.path.join(MH, 'targets/macrodetails/macro.json')))['macrotargets']


def _zlozky(meno, hodnota):
    out = []
    for p in _MACRO[meno]['parts']:
        if p['lowest'] < hodnota < p['highest']:
            t = (hodnota - p['lowest']) / (p['highest'] - p['lowest'])
            if p['low']:
                out.append((p['low'], 1 - t))
            if p['high']:
                out.append((p['high'], t))
    return out


def makro_targety(gender=1.0, age=0.5, muscle=0.5, weight=0.5, race=None):
    """Zoznam (target, váha) podľa logiky MakeHumanu (pohlavie, vek, svaly, váha, rasa)."""
    race = race or {'caucasian': 1.0}
    z = {k: _zlozky(k, v) for k, v in dict(gender=gender, age=age, muscle=muscle, weight=weight).items()}
    out = []
    for r, rv in race.items():
        for a, av in z['age']:
            for g, gv in z['gender']:
                w = rv * av * gv
                if w > 1e-3:
                    out.append((f'macrodetails/{r}-{g}-{a}', w))
    for g, gv in z['gender']:
        for a, av in z['age']:
            for m, mv in z['muscle']:
                for wt, wv in z['weight']:
                    w = gv * av * mv * wv
                    if w > 1e-3:
                        out.append((f'macrodetails/universal-{g}-{a}-{m}-{wt}', w))
    return out


def aplikuj(V, zoznam):
    out = V.copy()
    for meno, w in zoznam:
        out += delta(meno, len(V)) * w
    return out


def kocky_klbov(F, G):
    """Pre každú skupinu joint-* vráti indexy jej vrcholov."""
    kl = {}
    for f, g in zip(F, G):
        if g and g.startswith('joint-'):
            kl.setdefault(g, set()).update(f)
    return {k: np.array(sorted(v)) for k, v in kl.items()}


def rig(meno='game_engine'):
    return json.load(open(os.path.join(MH, f'rigs/standard/rig.{meno}.json')))


def vahy(meno='game_engine'):
    return json.load(open(os.path.join(MH, f'rigs/standard/weights.{meno}.json')))['weights']


def poloha_klbu(spec, V, kocky):
    """Poloha hlavy/chvosta kosti podľa stratégie z MPFB rigu (CUBE / MEAN / VERTEX)."""
    s = spec.get('strategy')
    if s == 'CUBE':
        return V[kocky[spec['cube_name']]].mean(0)
    if s == 'VERTEX':
        return V[spec['vertex_index']]
    if s == 'MEAN':
        return V[np.array(spec['vertex_indices'])].mean(0)
    raise ValueError(spec)
