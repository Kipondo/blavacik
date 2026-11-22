# Izba 314 a chodba v ustúpenom (4.) podlaží bloku T Átriakov – model pre chôdzu priamo v meste (issue #115).
# Podľa prieskumu (napady/atriaky-izba.md): trojlôžková izba ~3,2 × 6 m, svetlá výška 2,7 m; na konci pri pavlači
# okno a presklené dvere von (tu na terasu), pri dverách na chodbu skriňa a umývadlo; dve postele za sebou pri jednej
# stene (drevený obklad za nimi), tretia posteľ a stolíky pri druhej; nezrekonštruovaný blok T: dyhový nábytok,
# váľandy s oranžovo-hnedým čalúnením, béžové linoleum, rebrový radiátor, oranžové závesy, biela chladnička.
# Za izbou chodba (1,8 m) pozdĺž fasády s dverami susedných izieb a jadra (kuchynka, sprchy, WC), na konci schodisko.
#
# Súradnice modelu = lokálne metre hry: x dnu od líca fasády (v líci sú balkónové dvere), z pozdĺž fasády, y hore
# od podlahy. Hra model položí podľa „ochoz“ bloku T z assets/pamiatky/atriaky.json (js/mapa/atriaky/internat.js).
# V Blenderi: X = x, Y = −z, Z = y.
#
# Spustenie: blender -b --python-use-system-env -P tools/blender/atriaky_blender.py -- izba
#            (alebo python3 tools/blender/atriaky_blender.py izba s bpy z pipu)

from spolocne import material
from veze import Geo, ccw, sklo, svetlo

V = 2.7            # svetlá výška
STENA = 0.15
IZBA = (0.3, 6.3, -0.7, 2.5)        # x0, x1, z0, z1 – izba 314
CHODBA = (6.45, 8.25, -9.0, 9.0)     # chodba pozdĺž fasády
DVERE_VON = (-0.5, 0.5)              # balkónové dvere v líci fasády (z) – otvor v plášti bloku (bloky.py)
OKNO = (0.7, 2.3, 0.85, 2.3)         # z0, z1, y0, y1
DVERE_CHODBA = (0.5, 1.3)            # z – dvere z izby na chodbu (v stene x = 6.3)
VYSKA_DVERI = 2.05


def materialy():
    return {
        'stena': material('stena-izba', '#ece6d8', drsnost=0.9),
        'stena_chodba': material('stena-chodba', '#ddd8cc', drsnost=0.9),
        'strop': material('strop-izba', '#f2f0ea', drsnost=0.95),
        'linoleum': material('linoleum-izba', '#b9a888', drsnost=0.7),
        'dlazba': material('dlazba-chodba', '#8d8a83', drsnost=0.6),
        'dyha': material('dyha-nabytok', '#a07a4f', drsnost=0.6),
        'dyha_tmava': material('dyha-tmava', '#6e5038', drsnost=0.6),
        'calun': material('calun-valanda', '#b5652e', drsnost=0.95),
        'plachta': material('plachta', '#dfe2e6', drsnost=0.95),
        'deka': material('deka', '#4f6d8f', drsnost=0.95),
        'kov': material('detail-kov', '#5c6064', drsnost=0.5, kov=0.6),
        'biela': material('biela-chladnicka', '#f1f1ee', drsnost=0.4),
        'radiator': material('detail-radiator', '#e6e4de', drsnost=0.5),
        'zaves': material('zaves-oranzovy', '#d9792a', drsnost=0.95),
        'dvere': material('dvere-hnede', '#7b5b3c', drsnost=0.6),
        'zarubna': material('detail-zarubna', '#4f4a44', drsnost=0.5, kov=0.4),
        'sklo': sklo('dvere-izba', '#9fb4c2', drsnost=0.05, kov=0.2),
        'zrkadlo': sklo('zrkadlo', '#c9d6dd', drsnost=0.02, kov=0.9),
        'keramika': material('keramika-umyvadlo', '#f4f4f2', drsnost=0.3),
        'svetlo': svetlo('svetlo-ziarivka', '#fff4dc', sila=2.5),
        'pizza': material('detail-krabica', '#c9a26b', drsnost=0.9),
        'flasa': sklo('flasa', '#3d6b3a', drsnost=0.1, kov=0.2),
        'oblecenie': material('oblecenie', '#3b4a6b', drsnost=0.95),
        'oblecenie2': material('oblecenie2', '#a83a3a', drsnost=0.95),
        'taska': material('taska-dodo', '#5b6b3a', drsnost=0.9),
        'plagat': material('plagat', '#2c7fb8', drsnost=0.8),
        'notebook': material('detail-notebook', '#2a2c30', drsnost=0.4, kov=0.3),
        'knihy': material('detail-knihy', '#8a2f2f', drsnost=0.8),
        'cedula': material('cedula-dvere', '#f2f2f2', drsnost=0.6),
    }


def postav():
    M = materialy()
    G = Geo()
    prekazky = []   # kolízie nábytku: [x0, x1, z0, z1, výška]
    steny = []      # kolízie stien: [x0, x1, z0, z1]

    def box(mat, x0, x1, z0, z1, y0, y1, vrch=True, spodok=False):
        G.hranol(mat, ccw([(x0, -z0), (x1, -z0), (x1, -z1), (x0, -z1)]), y0, y1, vrch=vrch, spodok=spodok)

    def stena(mat, x0, x1, z0, z1, otvory=(), os='z'):
        """Stena (kváder) s otvormi [(od, do, y0, y1)] pozdĺž osi `os`; okolo otvorov pruhy steny."""
        a0, a1 = (z0, z1) if os == 'z' else (x0, x1)
        x = a0
        for (o0, o1, y0, y1) in sorted(otvory) + [(a1, a1, 0, 0)]:
            if o0 > x + 0.001:
                k = (x0, x1, x, o0) if os == 'z' else (x, o0, z0, z1)
                box(mat, *k, 0.0, V)
                steny.append(list(k))
            if o1 > o0:
                k = (x0, x1, o0, o1) if os == 'z' else (o0, o1, z0, z1)
                if y0 > 0.001:
                    box(mat, *k, 0.0, y0)
                    steny.append(list(k))
                if y1 < V - 0.001:
                    box(mat, *k, y1, V)
            x = max(x, o1)

    ix0, ix1, iz0, iz1 = IZBA
    cx0, cx1, cz0, cz1 = CHODBA
    # --- podlahy a stropy ---
    box(M['linoleum'], ix0, ix1, iz0, iz1, -0.05, 0.0)
    box(M['dlazba'], ix1, cx1, cz0, cz1, -0.05, 0.0)
    box(M['dlazba'], 0.0, ix0, DVERE_VON[0], DVERE_VON[1], -0.05, 0.0)       # prah balkónových dverí
    box(M['strop'], ix0 - STENA, cx1 + STENA, min(iz0, cz0) - STENA, max(iz1, cz1) + STENA, V, V + 0.05, spodok=True)
    # --- steny izby ---
    stena(M['stena'], ix0 - STENA, ix0, iz0 - STENA, iz1 + STENA,
          otvory=[(DVERE_VON[0], DVERE_VON[1], 0.0, 2.2), (OKNO[0], OKNO[1], OKNO[2], OKNO[3])])
    stena(M['stena'], ix0, ix1, iz0 - STENA, iz0, os='x')
    stena(M['stena'], ix0, ix1, iz1, iz1 + STENA, os='x')
    # --- chodba: stena k izbám (dvere izieb po 3,2 m), stena k jadru (kuchynka, sprchy, WC), konce ---
    dvere_izieb = []
    z = cz0 + 1.0
    while z + 0.9 < cz1:
        if not (iz0 - 0.2 < z + 0.45 < iz1 + 0.2):
            dvere_izieb.append((z, z + 0.85))
        z += 3.2
    stena(M['stena_chodba'], ix1, cx0, cz0, cz1,
          otvory=[(iz0 + DVERE_CHODBA[0] - iz0, DVERE_CHODBA[1], 0.0, VYSKA_DVERI)] + [(a, b, 0.0, VYSKA_DVERI) for a, b in dvere_izieb])
    stena(M['stena_chodba'], cx1, cx1 + STENA, cz0, cz1)
    stena(M['stena_chodba'], ix1, cx1 + STENA, cz0 - STENA, cz0, os='x', otvory=[(cx0 + 0.45, cx0 + 1.35, 0.0, VYSKA_DVERI)])
    stena(M['stena_chodba'], ix1, cx1 + STENA, cz1, cz1 + STENA, os='x')
    # zatvorené dvere susedných izieb (s číslami – tabuľky kreslí hra) a dvere jadra
    for (a, b) in dvere_izieb:
        box(M['dvere'], ix1 + 0.02, ix1 + 0.06, a, b, 0.0, VYSKA_DVERI)
    jadro = [(cz0 + 2.0, 'kuchynka'), (cz0 + 6.0, 'sprchy'), (cz0 + 10.5, 'wc'), (cz0 + 14.5, 'upratovanie')]
    for z, _ in jadro:
        box(M['dvere'], cx1 - 0.06, cx1 - 0.02, z, z + 0.8, 0.0, 1.97)
        box(M['cedula'], cx1 - 0.08, cx1 - 0.06, z + 0.25, z + 0.55, 1.55, 1.75)
    # schodisko na konci chodby (dvere – E von, hra prechodom), presklené dvere na terasu na druhom konci
    box(M['dvere'], cx0 + 0.45, cx0 + 1.35, cz0 - 0.08, cz0 - 0.04, 0.0, VYSKA_DVERI)
    steny.append([cx0 + 0.45, cx0 + 1.35, cz0 - STENA, cz0])     # dvere schodiska sú zatvorené (aj pre kameru)
    box(M['cedula'], cx0 + 0.6, cx0 + 1.2, cz0 + 0.005, cz0 + 0.02, 2.15, 2.45)
    box(M['sklo'], cx0 + 0.3, cx1 - 0.3, cz1 - 0.04, cz1, 0.0, 2.2)
    # zárubne dverí izby (žlté/hnedé), otvorené krídlo dverí do chodby
    dz0, dz1 = iz0 + DVERE_CHODBA[0] - iz0, DVERE_CHODBA[1]
    box(M['zarubna'], ix1 - 0.02, ix1 + 0.17, dz0 - 0.05, dz0, 0.0, VYSKA_DVERI + 0.05)
    box(M['zarubna'], ix1 - 0.02, ix1 + 0.17, dz1, dz1 + 0.05, 0.0, VYSKA_DVERI + 0.05)
    box(M['dvere'], ix1 - 0.8, ix1, dz1 - 0.04, dz1, 0.0, VYSKA_DVERI)          # krídlo otvorené dnu k stene
    # balkónové dvere: otvorené presklené krídlo (k stene izby)
    box(M['zarubna'], ix0 - 0.03, ix0, DVERE_VON[0] - 0.05, DVERE_VON[1] + 0.05, 2.15, 2.22)
    box(M['sklo'], ix0, ix0 + 0.85, DVERE_VON[0] + 0.02, DVERE_VON[0] + 0.06, 0.05, 2.15)
    box(M['zarubna'], ix0, ix0 + 0.85, DVERE_VON[0] + 0.02, DVERE_VON[0] + 0.07, 0.0, 0.05)
    # okno: rám, priečka, parapet, radiátor, závesy
    oz0, oz1, oy0, oy1 = OKNO
    box(M['zarubna'], ix0 - 0.05, ix0 + 0.02, oz0, oz1, oy0 - 0.04, oy0)
    box(M['zarubna'], ix0 - 0.05, ix0 + 0.02, oz0, oz1, oy1, oy1 + 0.04)
    box(M['zarubna'], ix0 - 0.05, ix0 + 0.02, (oz0 + oz1) / 2 - 0.03, (oz0 + oz1) / 2 + 0.03, oy0, oy1)
    box(M['dyha'], ix0, ix0 + 0.25, oz0 - 0.05, oz1 + 0.05, oy0 - 0.06, oy0 - 0.02)
    for k in range(10):
        z = oz0 + 0.1 + k * 0.14
        box(M['radiator'], ix0 + 0.05, ix0 + 0.13, z, z + 0.08, 0.15, 0.7)
    box(M['zaves'], ix0 + 0.06, ix0 + 0.1, oz0 - 0.3, oz0 + 0.05, 0.6, 2.45)
    box(M['zaves'], ix0 + 0.06, ix0 + 0.1, oz1 - 0.05, oz1 + 0.15, 0.6, 2.45)

    def postel(x0, x1, z0, z1):
        box(M['dyha_tmava'], x0, x1, z0, z1, 0.0, 0.38)
        box(M['calun'], x0 + 0.02, x1 - 0.02, z0 + 0.02, z1 - 0.02, 0.38, 0.52)
        prekazky.append([x0, x1, z0, z1, 0.55])

    # postele: dve za sebou pri stene z1 (drevený obklad za nimi), tretia pri stene z0
    postel(0.6, 2.6, 1.6, 2.5)
    postel(2.75, 4.75, 1.6, 2.5)
    box(M['dyha'], 0.5, 4.85, 2.47, 2.5, 0.45, 1.15)
    postel(3.5, 5.5, -0.7, 0.2)
    box(M['dyha'], 3.45, 5.55, -0.7, -0.67, 0.45, 1.15)
    # posteľné doplnky: plachta, vankúš, deka (neustlané)
    box(M['plachta'], 0.65, 1.1, 1.7, 2.4, 0.52, 0.62)
    box(M['deka'], 1.2, 2.5, 1.65, 2.45, 0.52, 0.6)
    box(M['plachta'], 4.3, 4.7, 1.7, 2.4, 0.52, 0.62)
    box(M['deka'], 2.85, 3.9, 1.7, 2.3, 0.52, 0.66)
    box(M['plachta'], 5.05, 5.45, -0.6, 0.1, 0.52, 0.62)
    # stolíky (dyha), stoličky, poličky nad stolíkmi a posteľami
    stoly = [(1.3, 2.3, -0.7, -0.1), (2.35, 3.35, -0.7, -0.1), (0.45, 1.05, 0.75, 1.55)]
    for (x0, x1, z0, z1) in stoly:
        box(M['dyha'], x0, x1, z0, z1, 0.72, 0.76)
        for (px, pz) in ((x0 + 0.04, z0 + 0.04), (x1 - 0.04, z0 + 0.04), (x0 + 0.04, z1 - 0.04), (x1 - 0.04, z1 - 0.04)):
            box(M['kov'], px - 0.02, px + 0.02, pz - 0.02, pz + 0.02, 0.0, 0.72, vrch=False)
        prekazky.append([x0, x1, z0, z1, 0.76])
    for (cx, cz) in ((1.8, 0.15), (2.85, 0.2), (1.35, 1.15)):
        box(M['kov'], cx - 0.2, cx + 0.2, cz - 0.2, cz + 0.2, 0.42, 0.46)
        box(M['dyha_tmava'], cx - 0.2, cx + 0.2, cz + 0.17, cz + 0.21, 0.46, 0.88) if cz < 1 else \
            box(M['dyha_tmava'], cx + 0.17, cx + 0.21, cz - 0.2, cz + 0.2, 0.46, 0.88)
    for (x0, x1, z0, z1) in ((1.3, 3.35, -0.7, -0.45), (0.8, 2.4, 2.25, 2.5), (2.9, 4.5, 2.25, 2.5)):
        box(M['dyha'], x0, x1, z0, z1, 1.5, 1.53)
    # skriňa (vešiaková s policami) pri dverách, umývadlo so zrkadlom a poličkou, chladnička
    box(M['dyha'], 5.65, 6.3, -0.7, 0.4, 0.0, 2.1)
    box(M['dyha_tmava'], 5.64, 5.66, -0.15, -0.13, 0.1, 2.0)
    prekazky.append([5.65, 6.3, -0.7, 0.4, 2.1])
    box(M['keramika'], 4.95, 5.5, 2.05, 2.5, 0.78, 0.88)
    box(M['kov'], 5.2, 5.26, 2.15, 2.5, 0.0, 0.78)
    box(M['zrkadlo'], 5.0, 5.45, 2.47, 2.5, 1.15, 1.65)
    box(M['dyha'], 4.95, 5.5, 2.35, 2.5, 1.7, 1.73)
    prekazky.append([4.95, 5.5, 2.05, 2.5, 0.9])
    box(M['biela'], 5.6, 6.2, 1.9, 2.5, 0.0, 0.85)
    prekazky.append([5.6, 6.2, 1.9, 2.5, 0.85])
    # žiarivky na strope izby a chodby
    box(M['svetlo'], 2.0, 3.2, 0.7, 0.85, V - 0.04, V, vrch=False, spodok=True)
    for z in (-6.0, -1.5, 3.0, 7.0):
        box(M['svetlo'], cx0 + 0.75, cx0 + 1.05, z, z + 1.2, V - 0.04, V, vrch=False, spodok=True)
    # --- intrákový neporiadok ---
    box(M['pizza'], 2.45, 2.85, -0.55, -0.15, 0.76, 0.8)                     # krabica od pizze na stolíku
    for k, (fx, fz) in enumerate(((5.75, 1.75), (5.85, 1.62), (5.65, 1.55), (1.15, 1.45))):
        box(M['flasa'], fx - 0.04, fx + 0.04, fz - 0.04, fz + 0.04, 0.0 if k < 3 else 0.76, (0.3 if k < 3 else 1.06))
    box(M['notebook'], 1.5, 1.85, -0.6, -0.35, 0.76, 0.78)
    box(M['notebook'], 1.5, 1.85, -0.62, -0.6, 0.78, 0.98)
    box(M['knihy'], 2.0, 2.25, -0.65, -0.45, 0.76, 0.92)
    box(M['oblecenie'], 3.7, 4.6, -0.5, 0.05, 0.52, 0.66)                    # kopa oblečenia na posteli
    box(M['oblecenie2'], 1.75, 2.0, 0.05, 0.3, 0.46, 0.62)                    # tričko na stoličke
    box(M['taska'], 0.8, 1.35, 1.1, 1.5, 0.0, 0.32)                           # Ďoďova taška (rezne!)
    prekazky.append([0.8, 1.35, 1.1, 1.5, 0.32])
    # sušiak s prádlom v strede izby
    box(M['kov'], 3.2, 4.4, 0.75, 1.25, 0.95, 0.97, vrch=True)
    for (x0, x1, mat) in ((3.3, 3.6, 'oblecenie'), (3.7, 3.95, 'plachta'), (4.05, 4.3, 'oblecenie2')):
        box(M[mat], x0, x1, 0.95, 1.0, 0.55, 0.95)
    for (px, pz) in ((3.22, 0.77), (4.38, 0.77), (3.22, 1.23), (4.38, 1.23)):
        box(M['kov'], px - 0.01, px + 0.01, pz - 0.01, pz + 0.01, 0.0, 0.95, vrch=False)
    prekazky.append([3.2, 4.4, 0.75, 1.25, 1.0])
    box(M['plagat'], 2.9, 3.6, -0.69, -0.68, 1.6, 2.3)                         # plagát nad stolíkmi
    for (sx, sz) in ((5.9, 0.6), (6.05, 0.72), (5.95, 1.05)):                  # topánky pri dverách
        box(M['dyha_tmava'], sx - 0.06, sx + 0.06, sz - 0.14, sz + 0.14, 0.0, 0.1)

    # chôdza: pochôdzne obdĺžniky (izba, chodba, prah balkónových dverí, dvere izby) – výška podlahy 0
    plochy = [[ix0, ix1, iz0, iz1], [ix1 - 0.1, cx1, cz0, cz1], [-0.6, ix0 + 0.1, DVERE_VON[0], DVERE_VON[1]]]
    info = {
        'stred': [0, 0], 'nazov': 'Átriaky – izba 314', 'dosah': 0, 'ao': False,
        'podlaTerenu': False, 'bezKoliziiObrysov': True,
        'vyskaStropu': V,
        'izba': list(IZBA), 'chodba': list(CHODBA), 'dvereVon': list(DVERE_VON), 'okno': list(OKNO),
        'dvereChodba': [dz0, dz1],
        'schodisko': [cx0 + 0.9, cz0 + 0.5],          # pred dverami schodiska (E – von)
        'izbyCisla': [[ix1 + 0.07, (a + b) / 2] for a, b in dvere_izieb],
        'jadro': [[cx1 - 0.09, z + 0.4, meno] for z, meno in jadro],
        'steny': [[round(v, 3) for v in s] for s in steny],
        'prekazky': [[round(v, 3) for v in p] for p in prekazky],
        'plochy': plochy,
    }
    print(f'izba: {G.trojuholniky} trojuholníkov, {len(steny)} stien, {len(prekazky)} prekážok')
    return G, [], V, 'atriaky-izba', info
