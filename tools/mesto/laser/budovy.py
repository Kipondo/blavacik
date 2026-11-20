# Budovy z laserového skenovania ÚGKK (DMP 2.0 − DMR 6.0) – výšky, dvory a strechy (LOD2).
#
# Pre vybrané dlaždice:
#  - výška stien (odkvap) a výška strechy z lasera; zdrojVysky = 'lidar' (inak ostáva 'osm' / 'odhad'),
#  - tvarStrechy: 'plocha' / 'sikma', hreben = výška hrebeňa nad odkvapom,
#  - vnútorné dvory podľa lasera (diery v pôdoryse), ak ich OSM nemá,
#  - strecha ako mnohouholníky rovín → data/mapa/mesto/strechy/<i>_<j>.json:
#      { "sikme": {p, uv, c}, "ploche": {p, uv, c}, "steny": {p, uv, c} }  (trojuholníky bez indexov,
#      p = x,y,z v súradniciach hry, uv v metroch, c = lineárna farba RGB 0–1 na vrchol;
#      "kominy": [[x, z, spodok, vrch, šírka, hĺbka, uhol], ...] – komíny nájdené ako malé výstupky nad strechou).
# Postup strechy: povrch strechy sa rozloží na rovinné plochy (sklon a smer + spájanie podobných rovín),
# hranice plôch sa prevedú na lomené čiary a zjednodušia (spoločné hranice raz → bez škár), body na
# hrebeňoch a úžľabiach sa posunú na priesečník rovín (rovné ostré hrany), plochy sa strianguľujú (earcut)
# a medzi rôzne vysokými plochami a na okraji sa doplnia zvislé steny (štíty, nadstavby).
#
# Spustenie (po teren.py): python3 tools/mesto/laser/budovy.py [--vsetko]
import sys, os, json, math, gzip, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import mapbox_earcut as earcut
from matplotlib.path import Path
from spolocne import Raster, VYSTUP, NULA, DLAZDICA, VYREZ, nacitaj_index, uloz_json

K = 0.5            # rozlíšenie lasera (m)
OKRAJ = 30         # okraj výrezu okolo dlaždíc (m) – budovy pri hrane
TOL = 1.3          # zjednodušenie hraníc plôch strechy (pixely)
MIN_PLOCHA = 40    # najmenšia plocha strechy (pixely = 10 m²)
MIN_DVOR = 80      # najmenší dvor (pixely = 20 m²)

index = nacitaj_index()
dlazdice = [(d[0], d[1]) for d in index['dlazdice']] if '--vsetko' in sys.argv else VYREZ
detail = index.get('terenDetail', {})


def nacitaj_detail(kl):
    """Terén dlaždice (2 m) tak, ako ho bude mať hra."""
    n = detail['uzly']
    with gzip.open(os.path.join(VYSTUP, 't', f'{kl}.bin')) as f:
        dl = np.frombuffer(f.read(), '<u2').reshape(n, n).astype(np.int64)
    dl = np.where(dl > 32767, dl - 65536, dl)
    return (np.cumsum(dl, axis=1) & 0xFFFF).astype(np.float64) / 100 + 100 - NULA


def lin(hexa):
    c = np.array([int(hexa[k:k + 2], 16) for k in (1, 3, 5)], float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# priemerná farba textúr (lineárne) – odtieň sa ráta ako pomer k nej, aby výsledok mal želanú farbu
PRIEMER_SKRIDLA = np.array([0.182, 0.061, 0.028])
PRIEMER_STRK = np.array([0.226, 0.213, 0.173])
SKRIDLA = ['#9c4a35', '#a5553c', '#8e4431', '#b0603f', '#7d4a3a']
# veľkosť textúry v metroch (musí sedieť s js/mapa/budovy/strechy-lod2.js) – UV sa posúva o jej násobky
PERIODA = {'sikme': 2.2, 'ploche': 1.6, 'steny': 3.0}
KODY = {'sikme': 0, 'ploche': 1, 'steny': 2}


def spracuj_oblast(dl_oblast, dmp_r, dmr_r):
    i0 = min(i for i, _ in dl_oblast); i1 = max(i for i, _ in dl_oblast) + 1
    j0 = min(j for _, j in dl_oblast); j1 = max(j for _, j in dl_oblast) + 1
    X0, X1 = i0 * DLAZDICA - OKRAJ, i1 * DLAZDICA + OKRAJ
    Z0, Z1 = j0 * DLAZDICA - OKRAJ, j1 * DLAZDICA + OKRAJ
    W, H = int((X1 - X0) / K), int((Z1 - Z0) / K)
    t0 = time.time()
    dmp = dmp_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    dmr = dmr_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    dmp = np.nan_to_num(dmp, nan=NULA); dmr = np.nan_to_num(dmr, nan=NULA)
    dsm = ndimage.median_filter(dmp, size=3)
    print(f'oblasť {X0}…{X1} × {Z0}…{Z1}: {W}×{H} px, načítané za {time.time() - t0:.0f} s', flush=True)

    # terén hry (detail 2 m) pre výpočet päty budovy
    teren = {f'{i}_{j}': nacitaj_detail(f'{i}_{j}') for (i, j) in dl_oblast if f'{i}_{j}' in detail.get('dlazdice', [])}
    def vyska_hry(x, z):
        i, j = math.floor(x / DLAZDICA), math.floor(z / DLAZDICA)
        t = teren.get(f'{i}_{j}')
        if t is None: return None
        fx = (x - i * DLAZDICA) / detail['krok']; fz = (z - j * DLAZDICA) / detail['krok']
        a = min(int(fx), t.shape[1] - 2); b = min(int(fz), t.shape[0] - 2); tx = fx - a; tz = fz - b
        return float(t[b, a] * (1 - tx) * (1 - tz) + t[b, a + 1] * tx * (1 - tz) + t[b + 1, a] * (1 - tx) * tz + t[b + 1, a + 1] * tx * tz)

    # --- budovy ---
    data = {}; budovy = []; dlazdica_budovy = []
    img = Image.new('I', (W, H), 0); dr = ImageDraw.Draw(img)
    for (i, j) in dl_oblast:
        kl = f'{i}_{j}'
        d = json.load(open(os.path.join(VYSTUP, 'd', f'{kl}.json'))); data[kl] = d
        for b in d['budovy']:
            # pôvodné údaje z OSM (aby sa skript dal spustiť opakovane)
            if 'vyskaOsm' in b: b['vyska'] = b['vyskaOsm']; b['zdrojVysky'] = b.get('zdrojOsm', b.get('zdrojVysky', 'odhad'))
            else: b['vyskaOsm'] = b['vyska']; b['zdrojOsm'] = b.get('zdrojVysky', 'odhad')
            for k_ in ('tvarStrechy', 'hreben', 'lod2', 'dieryLaser'): b.pop(k_, None)
            if b.get('dieryLaser') is None and b.get('_dieryZLasera'): b.pop('diery', None)
            budovy.append(b); dlazdica_budovy.append(kl)
            dr.polygon([((x - X0) / K, (z - Z0) / K) for x, z in b['body']], fill=len(budovy))
            for d_ in b.get('diery', []):
                dr.polygon([((x - X0) / K, (z - Z0) / K) for x, z in d_], fill=0)
    bid = np.array(img, dtype=np.int32)
    nb = len(budovy)
    ndsm = dsm - dmr
    YY, XX = np.mgrid[0:H, 0:W].astype(np.float64)

    # --- výšky a dvory ---
    zem_b = ndimage.labeled_comprehension(dmr, bid, np.arange(nb + 1), lambda v: np.percentile(v, 10) if len(v) else np.nan, float, np.nan)
    vnutro = ndimage.binary_erosion(bid > 0, iterations=2) & (bid > 0)
    for k, b in enumerate(budovy, 1):
        b['_k'] = k
    # dvory: súvislé oblasti vnútri pôdorysu, kde laser vidí zem
    dvor = (bid > 0) & (ndsm < 2.0)
    lab, nl = ndimage.label(dvor)
    if nl:
        vel = np.bincount(lab.ravel(), minlength=nl + 1)
        dotyk = np.zeros(nl + 1, bool)  # dvor dotýkajúci sa okraja pôdorysu nie je dvor (prejazd, chyba pôdorysu)
        okraj = (bid > 0) & ~ndimage.binary_erosion(bid > 0, iterations=1)
        dotyk[np.unique(lab[okraj])] = True
        ok = (vel >= MIN_DVOR) & ~dotyk; ok[0] = False
        dvory = np.where(ok[lab], lab, 0)
    else:
        dvory = np.zeros_like(bid)
    from skimage import measure
    pocet_dvorov = 0
    for l in np.unique(dvory)[1:]:
        m = dvory == l
        k = int(np.bincount(bid[m]).argmax()); b = budovy[k - 1]
        if b.get('diery') and not b.get('_dieryZLasera'): continue      # OSM dvory majú prednosť
        cont = measure.find_contours(np.pad(m, 1).astype(float), 0.5)
        if not cont: continue
        c = max(cont, key=len) - 1
        pts = [(round(X0 + (p[1] + 0.5) * K, 1), round(Z0 + (p[0] + 0.5) * K, 1)) for p in c]
        pts = zjednodus_ring(pts, 0.6)
        if len(pts) >= 3:
            b.setdefault('diery', []).append([list(p) for p in pts]); b['_dieryZLasera'] = True; pocet_dvorov += 1
    print(f'dvory z lasera: {pocet_dvorov}', flush=True)

    # --- 1) rovinné plochy strechy ---
    strecha = (bid > 0) & (ndsm > 2.0)
    hl = ndimage.gaussian_filter(dsm, 1.0)
    gz, gx = np.gradient(hl, K)
    sklon = np.degrees(np.arctan(np.hypot(gx, gz))); smer = (np.degrees(np.arctan2(gz, gx)) + 360) % 360
    trieda = np.where(sklon < 8, 0, 1 + ((smer + 15) // 30).astype(int) % 12)
    seg = np.zeros((H, W), np.int32); n = 0
    for k in range(13):
        lab, m = ndimage.label(strecha & (sklon < 55) & (trieda == k))
        seg[lab > 0] = lab[lab > 0] + n; n += m

    def sumy(seg, n):
        m = seg > 0; s = seg[m]; x = XX[m] * K; y = YY[m] * K; z = dsm[m]
        S = lambda v: np.bincount(s, v, minlength=n + 1)
        return np.stack([S(x * x), S(x * y), S(x), S(y * y), S(y), S(np.ones_like(z)), S(x * z), S(y * z), S(z), S(z * z)], 1)

    def fit(seg, n):
        Q = sumy(seg, n)
        A = np.stack([np.stack([Q[:, 0], Q[:, 1], Q[:, 2]], -1), np.stack([Q[:, 1], Q[:, 3], Q[:, 4]], -1), np.stack([Q[:, 2], Q[:, 4], Q[:, 5]], -1)], -2)
        bv = Q[:, 6:9].copy(); ok = Q[:, 5] >= 3
        A[~ok] = np.eye(3); bv[~ok] = 0
        P = np.linalg.solve(A + np.eye(3) * 1e-9, bv[..., None])[..., 0]
        m = seg > 0; s = seg[m]
        res = dsm[m] - (P[s, 0] * XX[m] * K + P[s, 1] * YY[m] * K + P[s, 2])
        rms = np.sqrt(np.bincount(s, res * res, minlength=n + 1) / np.maximum(Q[:, 5], 1))
        return P, Q[:, 5], rms, Q

    def susedia(seg):
        out = []
        for a_, b_, yy, xx in ((seg[:, :-1], seg[:, 1:], YY[:, :-1], XX[:, :-1] + 0.5), (seg[:-1], seg[1:], YY[:-1] + 0.5, XX[:-1])):
            m = (a_ > 0) & (b_ > 0) & (a_ != b_)
            out.append((np.minimum(a_[m], b_[m]), np.maximum(a_[m], b_[m]), xx[m] * K, yy[m] * K))
        return [np.concatenate(v) for v in zip(*out)]

    def medianova_dvojica(pa, pb, hodnota, n):
        kk = pa.astype(np.int64) * (n + 1) + pb
        u_, inv = np.unique(kk, return_inverse=True)
        por = np.argsort(inv, kind='stable'); hr = np.searchsorted(inv[por], np.arange(len(u_) + 1)); ds = hodnota[por]
        med = np.array([np.median(ds[hr[i]:hr[i + 1]]) for i in range(len(u_))])
        return u_ // (n + 1), u_ % (n + 1), med

    def zluc(seg, n, P, Q, uhol_max=9, dz_max=0.3, rms_max=0.22):
        par = np.arange(n + 1)
        def f(a):
            while par[a] != a: par[a] = par[par[a]]; a = par[a]
            return a
        nrm = np.stack([-P[:, 0], -P[:, 1], np.ones(n + 1)], 1); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
        pa, pb, x, y = susedia(seg)
        if not len(pa): return seg, n
        dz = np.abs(P[pa, 0] * x + P[pa, 1] * y + P[pa, 2] - (P[pb, 0] * x + P[pb, 1] * y + P[pb, 2]))
        a_, b_, med = medianova_dvojica(pa, pb, dz, n)
        uhol = np.degrees(np.arccos(np.clip((nrm[a_] * nrm[b_]).sum(1), -1, 1)))
        Q = Q.copy()
        kand = np.nonzero((uhol < uhol_max) & (med < dz_max))[0]
        for i in kand[np.argsort(uhol[kand] + med[kand] * 10)]:
            ra, rb = f(int(a_[i])), f(int(b_[i]))
            if ra == rb: continue
            q = Q[ra] + Q[rb]
            A = np.array([[q[0], q[1], q[2]], [q[1], q[3], q[4]], [q[2], q[4], q[5]]]); bv = q[6:9]
            p = np.linalg.solve(A + np.eye(3) * 1e-9, bv)
            if math.sqrt(max(0.0, q[9] - p @ bv) / max(q[5], 1)) <= rms_max:
                par[rb] = ra; Q[ra] = q
        nove, inv2 = np.unique(np.array([f(i) for i in range(n + 1)]), return_inverse=True)
        return inv2[seg].astype(np.int32), len(nove) - 1

    P, N, rms, Q = fit(seg, n)
    for _ in range(2):
        seg, n = zluc(seg, n, P, Q); P, N, rms, Q = fit(seg, n)
    for kolo in range(2):
        male = (N < MIN_PLOCHA) | ((rms > 0.5) if kolo == 0 else False)
        seg[male[seg] & (seg > 0)] = 0
        _, (iy, ix) = ndimage.distance_transform_edt(seg == 0, return_indices=True)
        seg = np.where(strecha, seg[iy, ix], 0)
        # plocha nesmie prekročiť budovu: segmenty sa delia podľa budov
        kl_ = seg.astype(np.int64) * (nb + 1) + bid
        u_, inv = np.unique(kl_, return_inverse=True); seg = inv.reshape(seg.shape).astype(np.int32)
        if u_[0] != 0: seg = seg + 1
        seg[~strecha] = 0
        u2, inv = np.unique(seg, return_inverse=True); seg = inv.reshape(seg.shape).astype(np.int32); n = len(u2) - 1
        P, N, rms, Q = fit(seg, n)
        seg, n = zluc(seg, n, P, Q); P, N, rms, Q = fit(seg, n)
    print(f'plôch striech: {n} ({n / max(1, nb):.1f} na budovu), {time.time() - t0:.0f} s', flush=True)

    def rov(s, u, v): return P[s, 0] * u + P[s, 1] * v + P[s, 2]

    pa, pb, x, y = susedia(seg)
    d = np.abs(rov(pa, x, y) - rov(pb, x, y))
    a_, b_, med = medianova_dvojica(pa, pb, d, n) if len(pa) else (np.array([], int), np.array([], int), np.array([]))
    stretnu = set(int(a) * (n + 1) + int(b) for a, b, m in zip(a_, b_, med) if m < 0.4)

    kl_b = seg.astype(np.int64) * (nb + 1) + bid
    uu, cc = np.unique(kl_b[seg > 0], return_counts=True)
    bud_plochy = np.zeros(n + 1, np.int64); najviac = np.zeros(n + 1)
    for kx, cx in zip(uu, cc):
        s_, b2 = divmod(int(kx), nb + 1)
        if cx > najviac[s_]: najviac[s_] = cx; bud_plochy[s_] = b2
    sklon_plochy = np.degrees(np.arctan(np.hypot(P[:, 0], P[:, 1])))

    # --- výšky budov ---
    vys = np.where(seg > 0, rov(seg, XX * K, YY * K), dsm)
    okraj = strecha & ~ndimage.binary_erosion(strecha, iterations=2)
    def podla_budov(maska, hodnoty):
        ib = bid[maska]; vb = hodnoty[maska]; por = np.argsort(ib, kind='stable')
        ib = ib[por]; vb = vb[por]; hr = np.searchsorted(ib, np.arange(nb + 2))
        return lambda k: vb[hr[k]:hr[k + 1]]
    okraj_b = podla_budov(okraj, vys); strecha_b = podla_budov(strecha, vys)
    plocha_b = np.bincount(bid.ravel(), minlength=nb + 1); strecha_n = np.bincount(bid[strecha], minlength=nb + 1)
    vnutro_b = podla_budov(vnutro & strecha, ndsm)
    vrch_steny = np.zeros(nb + 1); lod2 = np.zeros(nb + 1, bool)
    stat = {'lidar': 0, 'bez': 0}
    for k, b in enumerate(budovy, 1):
        body = b['body']
        hs = [vyska_hry(x, z) for x, z in body]
        if any(h is None for h in hs) or strecha_n[k] < 0.3 * max(1, plocha_b[k]) or strecha_n[k] < 16:
            stat['bez'] += 1; vrch_steny[k] = np.nan; continue
        hmax = max(hs)
        v_okraj = okraj_b(k); v_str = strecha_b(k)
        odkvap = np.percentile(v_okraj, 10) - NULA if len(v_okraj) else np.percentile(v_str, 10) - NULA
        vrchol = np.percentile(v_str, 98) - NULA
        stred = np.median(vnutro_b(k)) if len(vnutro_b(k)) else np.median(v_str) - NULA - hmax
        b['vyska'] = round(float(max(2.5, odkvap - hmax - 0.2)), 2)
        b['vyskaLaser'] = round(float(stred), 1)       # medián (DMP − DMR) vnútri pôdorysu
        b['hreben'] = round(float(max(0.0, vrchol - odkvap)), 1)
        b['tvarStrechy'] = 'sikma' if b['hreben'] > 1.5 else 'plocha'
        b['zdrojVysky'] = 'lidar'; b['lod2'] = 1
        vrch_steny[k] = hmax + b['vyska']; lod2[k] = True; stat['lidar'] += 1
    print(f'budovy: s laserom {stat["lidar"]}, bez {stat["bez"]}', flush=True)

    # --- komíny: malé výstupky nad rovinou strechy (0,5–6 m², 0,7–4 m nad strechou) ---
    nad = np.where(strecha & (seg > 0), dsm - vys, 0)
    lab_k, nk = ndimage.label(nad > 0.7)
    kominy = {kl: [] for kl in data}
    if nk:
        objekty = ndimage.find_objects(lab_k)
        vel = np.bincount(lab_k.ravel(), minlength=nk + 1)
        for l, sl in enumerate(objekty, 1):
            if not (2 <= vel[l] <= 24): continue
            m = lab_k[sl] == l
            hy, hx = sl[0].start, sl[1].start
            vy, vx = np.nonzero(m)
            k = int(np.bincount(bid[sl][m]).argmax())
            if k == 0 or not lod2[k]: continue
            vrch = float(dsm[sl][m].max()); spod = float(vys[sl][m].min())
            if not (0.7 <= vrch - spod <= 4.0): continue
            # natočenie podľa najdlhšej steny budovy
            body = budovy[k - 1]['body']
            dl = [(math.hypot(q[0] - p_[0], q[1] - p_[1]), math.atan2(q[1] - p_[1], q[0] - p_[0])) for p_, q in zip(body, body[1:] + body[:1])]
            uhol = max(dl)[1]
            strana = min(1.6, max(0.5, math.sqrt(vel[l]) * K))
            x = X0 + (hx + vx.mean() + 0.5) * K; z = Z0 + (hy + vy.mean() + 0.5) * K
            kominy[dlazdica_budovy[k - 1]].append([round(x, 2), round(z, 2), round(spod - NULA - 0.3, 2), round(vrch - NULA, 2), round(strana, 2), round(strana * 0.8, 2), round(uhol, 3)])
    print(f'komíny: {sum(len(v) for v in kominy.values())}', flush=True)

    # --- 2) hranice plôch → reťazce ---
    L = np.where(lod2[bid] | (seg == 0), seg, 0)
    L[~lod2[bid]] = 0
    Lp = np.pad(L, 1); WC = W + 1
    up, dn = Lp[0:H + 1, 1:W + 1], Lp[1:H + 2, 1:W + 1]; hm = up != dn; hr_, hc_ = np.nonzero(hm)
    lf, rt = Lp[1:H + 1, 0:W + 1], Lp[1:H + 1, 1:W + 2]; vm = lf != rt; vr_, vc_ = np.nonzero(vm)
    Ea = np.concatenate([hr_ * WC + hc_, vr_ * WC + vc_]).astype(np.int64)
    Eb = np.concatenate([hr_ * WC + hc_ + 1, (vr_ + 1) * WC + vc_]).astype(np.int64)
    SA = np.concatenate([up[hm], rt[vm]]); SB = np.concatenate([dn[hm], lf[vm]])
    nE = len(Ea)
    konce = np.concatenate([Ea, Eb]); hrany = np.concatenate([np.arange(nE), np.arange(nE)])
    por = np.argsort(konce, kind='stable'); konce = konce[por]; hrany = hrany[por]
    rohy, zac, stupen = np.unique(konce, return_index=True, return_counts=True)
    roh_i = {int(r): i for i, r in enumerate(rohy)}
    pouzite = np.zeros(nE, bool); retazce = []
    def hrany_rohu(r):
        i = roh_i[r]; return hrany[zac[i]:zac[i] + stupen[i]]
    def chod(r0, e):
        body = [r0]; cur = r0
        sa, sb = (SA[e], SB[e]) if Ea[e] == r0 else (SB[e], SA[e])
        while True:
            pouzite[e] = True
            nx = int(Eb[e] if Ea[e] == cur else Ea[e]); body.append(nx)
            if stupen[roh_i[nx]] != 2: break
            es = hrany_rohu(nx); e2 = es[0] if es[0] != e else es[1]
            if pouzite[e2]: break
            e = e2; cur = nx
        return body, int(sa), int(sb)
    for r in rohy[stupen != 2]:
        for e in hrany_rohu(int(r)):
            if not pouzite[e]: retazce.append(chod(int(r), e))
    for e in range(nE):
        if not pouzite[e]: retazce.append(chod(int(Ea[e]), e))

    zjed = []
    for body, sa, sb in retazce:
        rr = np.array(body); pts = np.stack([rr % WC, rr // WC], 1).astype(float)
        if body[0] == body[-1] and len(body) > 3:
            j = int(np.argmax(((pts - pts[0]) ** 2).sum(1)))
            keep = dp(pts[:j + 1], TOL) + [j + i for i in dp(pts[j:], TOL)][1:]
        else:
            keep = dp(pts, TOL)
        zjed.append(([body[i] for i in keep], sa, sb))

    # --- 3) body na hrebeňoch / úžľabiach na priesečník rovín ---
    okolo = {}
    for body, sa, sb in zjed:
        for r in body: okolo.setdefault(r, set()).update((sa, sb))
    def uv(r): return ((r % WC) - 0.5) * K, ((r // WC) - 0.5) * K
    poloha = {}
    for r, labs in okolo.items():
        u0, v0 = uv(r); l = sorted(x for x in labs if x > 0)
        st_ = [(a, b) for i, a in enumerate(l) for b in l[i + 1:] if a * (n + 1) + b in stretnu]
        nova = None
        zuc = sorted(set(x for p in st_ for x in p))
        if len(zuc) >= 3:
            a, b, c = zuc[:3]
            M = np.array([P[a, :2] - P[b, :2], P[a, :2] - P[c, :2]]); y_ = -np.array([P[a, 2] - P[b, 2], P[a, 2] - P[c, 2]])
            if abs(np.linalg.det(M)) > 1e-3:
                s = np.linalg.solve(M, y_)
                if math.hypot(s[0] - u0, s[1] - v0) < 1.0: nova = (s[0], s[1])
        if nova is None and st_:
            a, b = st_[0]; ab = P[a] - P[b]; nn = math.hypot(ab[0], ab[1])
            if nn > 0.05:
                dist = (ab[0] * u0 + ab[1] * v0 + ab[2]) / nn
                if abs(dist) < 0.75: nova = (u0 - ab[0] / nn * dist, v0 - ab[1] / nn * dist)
        poloha[r] = nova if nova else (u0, v0)

    # --- 4) farby, mnohouholníky, steny ---
    f_sik = np.ones((nb + 1, 3)); f_plo = np.ones((nb + 1, 3)); f_ste = np.ones((nb + 1, 3))
    for k, b in enumerate(budovy, 1):
        ziadana = lin(b['strecha']) if b.get('strecha') else lin(SKRIDLA[k % len(SKRIDLA)])
        f_sik[k] = np.clip(ziadana / PRIEMER_SKRIDLA, 0.35, 2.2)
        f_plo[k] = np.clip((lin('#8f8c85') * (0.85 + 0.3 * ((k * 37) % 10) / 10)) / PRIEMER_STRK, 0.4, 2.0)
        f_ste[k] = lin(b.get('farba', '#d8d2c4'))
    odtien = 0.9 + 0.2 * np.random.default_rng(1).random(n + 1)
    sikma_pl = sklon_plochy > 10

    kruhy = {}
    for body, sa, sb in zjed:
        if sa > 0: kruhy.setdefault(sa, []).append(body)
        if sb > 0: kruhy.setdefault(sb, []).append(body[::-1])
    vystup = {kl: {'sikme': [], 'ploche': [], 'steny': []} for kl in data}
    def pridaj(kl, druh, tri, uvs, farba, von=None):
        # jednotné natočenie trojuholníkov: strechy normálou nahor, steny von (kvôli tieňom – normalBias)
        tri = np.array(tri, float); uvs = np.array(uvs, float)
        n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        otoc = (n[:, 1] < 0) if von is None else (n[:, 0] * von[:, 0] + n[:, 2] * von[:, 1] < 0)
        tri[otoc] = tri[otoc][:, [0, 2, 1]]; uvs[otoc] = uvs[otoc][:, [0, 2, 1]]
        perioda = PERIODA[druh] * 10
        uvs = uvs - np.floor(uvs.reshape(-1, 2).min(0) / perioda) * perioda
        vystup[kl][druh].append((tri, uvs, np.repeat(farba[None], len(tri), 0)))
    zlyhalo = 0
    for s, ch in kruhy.items():
        k = int(bud_plochy[s])
        if k == 0 or not lod2[k]: continue
        kl = dlazdica_budovy[k - 1]
        podla_zac = {}
        for c_ in ch: podla_zac.setdefault(c_[0], []).append(c_)
        zost = set(range(len(ch))); idx_ch = {id(c_): i for i, c_ in enumerate(ch)}
        rings = []
        while zost:
            i0 = zost.pop(); c_ = ch[i0]; ring = list(c_[:-1]); koniec = c_[-1]; start = c_[0]; ok = True
            while koniec != start:
                kand = [x for x in podla_zac.get(koniec, []) if idx_ch[id(x)] in zost]
                if not kand: ok = False; break
                x = kand[0]; zost.discard(idx_ch[id(x)]); ring += x[:-1]; koniec = x[-1]
            if ok and len(ring) >= 3: rings.append(ring)
            elif not ok: zlyhalo += 1
        if not rings: continue
        pol = [np.array([poloha[r] for r in rg]) for rg in rings]
        plo = [0.5 * np.sum(p[:, 0] * np.roll(p[:, 1], -1) - np.roll(p[:, 0], -1) * p[:, 1]) for p in pol]
        vonk = [i for i, a in enumerate(plo) if a < 0]; diery_ = [i for i, a in enumerate(plo) if a >= 0]
        prir = {i: [] for i in vonk}
        for h in diery_:
            for o in sorted(vonk, key=lambda i: plo[i]):
                if Path(pol[o]).contains_point(pol[h][0]): prir[o].append(h); break
        # smer spádu roviny → UV škridly (u pozdĺž vrstevnice, v po spáde, v metroch)
        g = np.array([P[s, 0], P[s, 1]]); gn = np.linalg.norm(g)
        for o, hs in prir.items():
            vs = [pol[o]] + [pol[h] for h in hs]
            V = np.concatenate(vs); konce_ = np.cumsum([len(v) for v in vs]).astype(np.uint32)
            try: t = earcut.triangulate_float64(V, konce_).reshape(-1, 3)
            except Exception: zlyhalo += 1; continue
            if not len(t): continue
            h_ = rov(s, V[:, 0], V[:, 1])
            V3 = np.stack([X0 + V[:, 0] + K / 2, h_ - NULA, Z0 + V[:, 1] + K / 2], 1)
            if sikma_pl[s] and gn > 1e-3:
                dd = -g / gn; pp = np.array([-dd[1], dd[0]])
                UV = np.stack([V3[:, [0, 2]] @ pp, (V3[:, [0, 2]] @ dd) * math.sqrt(1 + gn * gn)], 1)
                pridaj(kl, 'sikme', V3[t], UV[t], f_sik[k] * odtien[s])
            else:
                pridaj(kl, 'ploche', V3[t], V3[:, [0, 2]][t], f_plo[k] * odtien[s])
    pocet_stien = 0
    for body, sa, sb in zjed:
        if sa == 0 and sb == 0: continue
        if sa > 0 and sb > 0 and min(sa, sb) * (n + 1) + max(sa, sb) in stretnu: continue
        p = np.array([poloha[r] for r in body])
        if sa > 0 and sb > 0:
            ha, hb = rov(sa, p[:, 0], p[:, 1]), rov(sb, p[:, 0], p[:, 1])
            hore, dole = np.maximum(ha, hb) - NULA, np.minimum(ha, hb) - NULA
            k = int(bud_plochy[sa if ha.mean() > hb.mean() else sb])
        else:
            s = sa or sb; hore = rov(s, p[:, 0], p[:, 1]) - NULA; k = int(bud_plochy[s])
            if not lod2[k]: continue
            dole = np.minimum(np.full(len(p), vrch_steny[k]), hore)
        if k == 0 or not lod2[k]: continue
        kl = dlazdica_budovy[k - 1]
        x = X0 + p[:, 0] + K / 2; z = Z0 + p[:, 1] + K / 2
        u = np.concatenate([[0], np.cumsum(np.hypot(np.diff(x), np.diff(z)))])
        tri, uvs, von = [], [], []
        # strana sa (vpravo od smeru reťazca) je vyššia → von je naľavo, inak napravo
        sa_vyssia = (sa > 0 and sb == 0) or (sa > 0 and sb > 0 and rov(sa, *p.mean(0)) > rov(sb, *p.mean(0)))
        for i in range(len(p) - 1):
            if hore[i] - dole[i] < 0.05 and hore[i + 1] - dole[i + 1] < 0.05: continue
            A = (x[i], hore[i], z[i]); B = (x[i + 1], hore[i + 1], z[i + 1]); B2 = (x[i + 1], dole[i + 1], z[i + 1]); A2 = (x[i], dole[i], z[i])
            tri += [(A, B, B2), (A, B2, A2)]
            dx, dz = x[i + 1] - x[i], z[i + 1] - z[i]
            o = (-dz, dx) if sa_vyssia else (dz, -dx)
            von += [o, o]
            uvs += [((u[i], hore[i]), (u[i + 1], hore[i + 1]), (u[i + 1], dole[i + 1])), ((u[i], hore[i]), (u[i + 1], dole[i + 1]), (u[i], dole[i]))]
        if tri:
            pridaj(kl, 'steny', np.array(tri), np.array(uvs), f_ste[k], np.array(von)); pocet_stien += len(tri)
    print(f'mnohouholníky: zlyhalo {zlyhalo}, trojuholníkov stien {pocet_stien}', flush=True)

    # --- zápis ---
    os.makedirs(os.path.join(VYSTUP, 'strechy'), exist_ok=True)
    for kl, casti in vystup.items():
        i_, j_ = map(int, kl.split('_'))
        cesta = os.path.join(VYSTUP, 'strechy', f'{kl}.bin')
        zapis_strechy(cesta, i_ * DLAZDICA, j_ * DLAZDICA, casti, kominy.get(kl, []))
        stary = os.path.join(VYSTUP, 'strechy', f'{kl}.json')
        if os.path.exists(stary): os.remove(stary)
        for b in data[kl]['budovy']:
            b.pop('_k', None)
        uloz_json(os.path.join(VYSTUP, 'd', f'{kl}.json'), data[kl])
        print(f'  {kl}: {os.path.getsize(cesta) / 1e3:.0f} kB', flush=True)
    return list(vystup)


def zarovnaj(kusy):
    dlzka = sum(len(k) for k in kusy)
    if dlzka % 4: kusy.append(b'\0' * (4 - dlzka % 4))


def zapis_strechy(cesta, x0, z0, casti, kominy):
    """Binárny formát striech (gzip, little-endian):
    'STR2', x0, z0 (float32), počet skupín (uint32); pre každú skupinu: kód (uint8: 0 šikmé, 1 ploché, 2 steny),
    3 B výplň, nV, nI (uint32), poloha uint16×3·nV (x, z: (súr. − začiatok dlaždice + 20 m)·50, y: (y + 60 m)·50),
    uv int16×2·nV (cm), farba uint8×3·nV (sRGB), výplň na 4 B, indexy uint16/uint32 (uint32, ak nV > 65535), výplň na 4 B;
    nakoniec počet komínov (uint32) a float32×7 na komín."""
    import struct
    kusy = [b'STR2', struct.pack('<ffI', x0, z0, sum(1 for z in casti.values() if z))]
    for druh, zoznam in casti.items():
        if not zoznam: continue
        T = np.concatenate([z_[0] for z_ in zoznam]).reshape(-1, 3)
        U = np.concatenate([z_[1] for z_ in zoznam]).reshape(-1, 2)
        C = np.repeat(np.concatenate([z_[2] for z_ in zoznam]), 3, 0)
        q = np.stack([(T[:, 0] - x0 + 20) * 50, (T[:, 1] + 60) * 50, (T[:, 2] - z0 + 20) * 50], 1)
        q = np.clip(np.round(q), 0, 65535).astype(np.uint16)
        u = np.clip(np.round(U * 100), -32768, 32767).astype(np.int16)
        srgb = np.where(C <= 0.0031308, C * 12.92, 1.055 * np.power(np.clip(C, 0, None), 1 / 2.4) - 0.055)
        c = np.clip(np.round(srgb * 255), 0, 255).astype(np.uint8)
        riadky = np.concatenate([q.view(np.uint8).reshape(-1, 6), u.view(np.uint8).reshape(-1, 4), c], 1)
        uniq, inv = np.unique(riadky, axis=0, return_inverse=True)
        nV = len(uniq); idx = inv.ravel().astype(np.uint32 if nV > 65535 else np.uint16)
        kusy.append(struct.pack('<B3xII', KODY[druh], nV, len(idx)))
        kusy += [np.ascontiguousarray(uniq[:, 0:6]).tobytes(), np.ascontiguousarray(uniq[:, 6:10]).tobytes(),
                 np.ascontiguousarray(uniq[:, 10:13]).tobytes()]
        zarovnaj(kusy)                      # zarovnanie na 4 B od začiatku súboru (typové polia v JS)
        kusy.append(idx.tobytes())
        zarovnaj(kusy)
    kusy.append(struct.pack('<I', len(kominy)))
    kusy.append(np.array(kominy, np.float32).tobytes())
    with gzip.open(cesta, 'wb', compresslevel=9) as f:
        f.write(b''.join(kusy))


def dp(pts, tol):
    if len(pts) < 3: return [0, len(pts) - 1]
    keep = np.zeros(len(pts), bool); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop()
        if b - a < 2: continue
        A, B = pts[a], pts[b]; seg_ = pts[a + 1:b]
        ab = B - A; L2 = (ab ** 2).sum()
        dist = np.hypot(*(seg_ - A).T) if L2 == 0 else np.abs(ab[0] * (seg_[:, 1] - A[1]) - ab[1] * (seg_[:, 0] - A[0])) / math.sqrt(L2)
        i = int(np.argmax(dist))
        if dist[i] > tol: keep[a + 1 + i] = True; st += [(a, a + 1 + i), (a + 1 + i, b)]
    return list(np.nonzero(keep)[0])


def zjednodus_ring(pts, tol):
    p = np.array(pts, float)
    if len(p) > 1 and np.allclose(p[0], p[-1]): p = p[:-1]
    if len(p) < 4: return [tuple(x) for x in p]
    j = int(np.argmax(((p - p[0]) ** 2).sum(1)))
    keep = dp(p[:j + 1], tol) + [j + i for i in dp(np.vstack([p[j:], p[:1]]), tol)][1:-1]
    return [tuple(p[i]) for i in keep]


if __name__ == '__main__':
    dmp_r, dmr_r = Raster('dmp'), Raster('dmr')
    hotove = spracuj_oblast(dlazdice, dmp_r, dmr_r)
    index = nacitaj_index()
    index['strechyLod2'] = sorted(set(index.get('strechyLod2', [])) | set(hotove))
    uloz_json(os.path.join(VYSTUP, 'index.json'), index)
