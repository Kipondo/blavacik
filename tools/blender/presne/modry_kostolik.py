# Modrý kostolík – Kostol sv. Alžbety (Ödön Lechner, 1907–1913), secesia. Presný model podľa OSM častí budovy
# (loď s krížovou strechou, bočné krídla, predsieň, okrúhla veža 36,8 m s kupolou) a verejných fotografií
# (Wikimedia Commons, kategória „Blue Church (Bratislava)“, len na porovnanie):
#  - svetlomodrá omietka, biele a modré pásy, oblé (polkruhové) okná s bielymi rámami a modrou majolikou,
#  - strecha z modrej glazovanej škridly,
#  - okrúhla veža: valec s vodorovnými pásmi, okrúhle okienka pod rímsou, modrá kupola, lucerna a kríž,
#  - hlavný vstup s polkruhovým portálom a zlatou mozaikou v tympanóne, nad ním oblý štít.
import math

from veze import Geo, dlzka, normala, odsad, ccw
from spolocne import material
from historicke.strechy import strecha_podla_vzdialenosti, profil_valbovy

STENA, BIELA, MODRA, MAJOLIKA = '#a9d0e8', '#f3f7fa', '#5d98cc', '#2c66a9'


def _hrana_oknami(G, a, b, z0, z1, M, os_okien=4.2, sirka=1.5, oblúk=True):
    """Stena s polkruhovými oknami (biely rám, tmavé sklo, modrý parapet)."""
    L = dlzka(a, b)
    G.stena(M['stena'], a, b, z0, z1)
    if L < 3.5:
        return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)
    pocet = max(1, round(L / os_okien))
    h = (z1 - z0) * 0.58
    zo = z0 + (z1 - z0) * 0.22
    for k in range(pocet):
        s = L * (k + 0.5) / pocet
        c = (a[0] + ux * s + nx * 0.04, a[1] + uy * s + ny * 0.04)
        w = min(sirka, L / pocet * 0.55)
        # rám a sklo (obdĺžnik + polkruh z niekoľkých plôšok)
        def obrys(von, roz):
            body = [(c[0] - ux * (w / 2 + roz) + nx * von, c[1] - uy * (w / 2 + roz) + ny * von, zo - roz),
                    (c[0] + ux * (w / 2 + roz) + nx * von, c[1] + uy * (w / 2 + roz) + ny * von, zo - roz)]
            r = w / 2 + roz
            for j in range(9):
                fi = math.pi * j / 8
                body.append((c[0] + ux * r * math.cos(fi) + nx * von, c[1] + uy * r * math.cos(fi) + ny * von,
                             zo + h + r * math.sin(fi)))
            return body
        G.plocha(M['biela'], obrys(0.02, 0.18))
        G.plocha(M['sklo'], obrys(0.05, 0.0))
        G.kvader(M['modra'], (c[0] + nx * 0.12, c[1] + ny * 0.12), (ux, uy), w + 0.5, 0.25, zo - 0.35, zo - 0.15)


def postav(casti, obrys_celku):
    """casti = [(obrys v Blenderi, tagy)], obrys_celku = celý pôdorys. Vracia (Geo, výška)."""
    G = Geo()
    M = {
        'stena': material('omietka-modry-kostolik', STENA, drsnost=0.85),
        'biela': material('detail-biely-mk', BIELA, drsnost=0.7),
        'modra': material('majolika-pas', MODRA, drsnost=0.35),
        'strecha': material('strecha-majolika', MAJOLIKA, drsnost=0.3, kov=0.1),
        'sklo': material('sklo-okna-mk', '#2f3f52', drsnost=0.1, kov=0.5),
        'sokel': material('sokel-mk', '#8fb2c8', drsnost=0.9),
        'mozaika': material('mozaika-zlata', '#c9a040', drsnost=0.35, kov=0.6),
        'dvere': material('dvere-mk', '#3b4f63', drsnost=0.6),
        'kriz': material('kriz-zlaty', '#d4af37', drsnost=0.3, kov=0.8),
    }
    vyska_max = 0.0
    veza = None
    for obrys, t in casti:
        tvar = t.get('roof:shape', '')
        if tvar == 'dome' or float(t.get('height', 0) or 0) > 25:
            veza = (obrys, t)
            continue
        lv = int(t.get('building:levels', 2) or 2)
        H = 5.2 if lv == 1 else 11.5
        n = len(obrys)
        # sokel, steny s oknami, biely pás v polovici, modrý majolikový pás pod rímsou, rímsa
        G.pas(M['sokel'], obrys, -1.5, 0.9, 0.12, dnu=0.0, vrch=True, spodok=False)
        for i in range(n):
            _hrana_oknami(G, obrys[i], obrys[(i + 1) % n], 0.9, H - 1.0, M, os_okien=4.4 if lv > 1 else 3.2,
                          sirka=1.6 if lv > 1 else 1.0)
            G.stena(M['stena'], obrys[i], obrys[(i + 1) % n], H - 1.0, H)
        G.pas(M['biela'], obrys, H * 0.18, H * 0.18 + 0.35, 0.1, dnu=0.0)
        G.pas(M['modra'], obrys, H - 1.0, H - 0.45, 0.08, dnu=0.0)
        G.pas(M['biela'], obrys, H - 0.45, H, 0.45, dnu=0.0)
        # strmá strecha z modrej majoliky (krížová / valbová podľa tvaru pôdorysu)
        vys_strechy = 3.5 if lv == 1 else 8.5
        strecha_podla_vzdialenosti(G, M['strecha'], obrys, [], H, profil_valbovy(1.25, vys_strechy), krok=1.0)
        vyska_max = max(vyska_max, H + vys_strechy)

    # hlavný vstup: na hrane celku najďalej na západ (Bezručova) – polkruhový portál so zlatou mozaikou a oblý štít
    n = len(obrys_celku)
    i_vstup = min(range(n), key=lambda i: normala(obrys_celku[i], obrys_celku[(i + 1) % n])[0]
                  - 0.02 * dlzka(obrys_celku[i], obrys_celku[(i + 1) % n]))
    a, b = obrys_celku[i_vstup], obrys_celku[(i_vstup + 1) % n]
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)
    m = ((a[0] + b[0]) / 2 + nx * 0.6, (a[1] + b[1]) / 2 + ny * 0.6)
    G.kvader(M['stena'], m, (ux, uy), 6.4, 1.2, -1.5, 8.0)
    # oblý štít nad portálom
    for j in range(12):
        f0, f1 = math.pi * j / 12, math.pi * (j + 1) / 12
        r = 3.2
        p0 = (m[0] + ux * r * math.cos(f0) + nx * 0.61, m[1] + uy * r * math.cos(f0) + ny * 0.61)
        p1 = (m[0] + ux * r * math.cos(f1) + nx * 0.61, m[1] + uy * r * math.cos(f1) + ny * 0.61)
        G.plocha(M['stena'], [(m[0] + nx * 0.61, m[1] + ny * 0.61, 8.0), (p1[0], p1[1], 8.0 + r * math.sin(f1)),
                              (p0[0], p0[1], 8.0 + r * math.sin(f0))])
        G.tram(M['modra'], (p0[0], p0[1], 8.0 + r * math.sin(f0)), (p1[0], p1[1], 8.0 + r * math.sin(f1)), 0.35)
    # portál: biely oblúk, tmavé dvere, zlatá mozaika (sv. Alžbeta) v tympanóne
    def oblúk(r, z_pata, von, mat, w_dole):
        body = [(m[0] - ux * w_dole + nx * von, m[1] - uy * w_dole + ny * von, 0.0),
                (m[0] + ux * w_dole + nx * von, m[1] + uy * w_dole + ny * von, 0.0)]
        for j in range(13):
            fi = math.pi * j / 12
            body.append((m[0] + ux * r * math.cos(fi) + nx * von, m[1] + uy * r * math.cos(fi) + ny * von, z_pata + r * math.sin(fi)))
        G.plocha(mat, body)
    oblúk(2.3, 3.8, 0.62, M['biela'], 2.3)
    oblúk(1.9, 3.8, 0.66, M['mozaika'], 1.9)
    G.kvader(M['dvere'], (m[0] + nx * 0.62, m[1] + ny * 0.62), (ux, uy), 3.2, 0.1, 0.0, 3.6)
    G.kvader(M['biela'], (m[0] + nx * 0.64, m[1] + ny * 0.64), (ux, uy), 4.6, 0.2, 3.5, 3.8)
    # schody pred vstupom
    for k in range(3):
        G.kvader(M['sokel'], (m[0] + nx * (1.4 + (2 - k) * 0.4), m[1] + ny * (1.4 + (2 - k) * 0.4)), (ux, uy), 7.0, 0.4, -1.5, -0.9 + k * 0.3)

    # okrúhla veža s kupolou
    if veza:
        obrys, t = veza
        cx = sum(p[0] for p in obrys) / len(obrys)
        cy = sum(p[1] for p in obrys) / len(obrys)
        r = sum(math.hypot(p[0] - cx, p[1] - cy) for p in obrys) / len(obrys)
        Hv = float(t.get('height', 36.8))
        z_rimsa = Hv - 6.6
        G.valec(M['sokel'], (cx, cy), r + 0.15, -1.5, 1.0, seg=24, vrch=False)
        G.valec(M['stena'], (cx, cy), r, 1.0, z_rimsa, seg=24, vrch=False)
        z = 3.0
        while z < z_rimsa - 2.0:
            G.valec(M['biela'], (cx, cy), r + 0.06, z, z + 0.3, seg=24, vrch=False)
            G.valec(M['modra'], (cx, cy), r + 0.07, z + 0.3, z + 0.5, seg=24, vrch=False)
            z += 4.2
        # úzke okná po obvode a okrúhle okienka pod rímsou
        for k in range(8):
            fi = 2 * math.pi * k / 8 + 0.2
            ox, oy = math.cos(fi), math.sin(fi)
            tx, ty = -oy, ox
            for (zo, h) in ((z_rimsa - 9.5, 3.0), (z_rimsa - 15.0, 2.6)):
                c = (cx + ox * (r + 0.03), cy + oy * (r + 0.03))
                G.plocha(M['sklo'], [(c[0] - tx * 0.3, c[1] - ty * 0.3, zo), (c[0] + tx * 0.3, c[1] + ty * 0.3, zo),
                                     (c[0] + tx * 0.3, c[1] + ty * 0.3, zo + h), (c[0] - tx * 0.3, c[1] - ty * 0.3, zo + h)])
            c = (cx + ox * (r + 0.05), cy + oy * (r + 0.05))
            body = [(c[0] + tx * 0.55 * math.cos(2 * math.pi * j / 10), c[1] + ty * 0.55 * math.cos(2 * math.pi * j / 10),
                     z_rimsa - 1.6 + 0.55 * math.sin(2 * math.pi * j / 10)) for j in range(10)]
            G.plocha(M['biela'], body)
            G.plocha(M['sklo'], [(p[0] + ox * 0.03, p[1] + oy * 0.03, z_rimsa - 1.6 + (p[2] - (z_rimsa - 1.6)) * 0.7) for p in body])
        # rímsa, kupola (modrá majolika), lucerna a kríž
        G.valec(M['modra'], (cx, cy), r + 0.1, z_rimsa - 0.6, z_rimsa, seg=24, vrch=False)
        G.valec(M['biela'], (cx, cy), r + 0.45, z_rimsa, z_rimsa + 0.5, seg=24)
        prof = [(1.0, 0.0), (0.98, 0.18), (0.9, 0.36), (0.76, 0.54), (0.56, 0.72), (0.32, 0.88), (0.16, 0.95)]
        hk = 3.6
        for j in range(len(prof) - 1):
            G.valec(M['strecha'], (cx, cy), r * prof[j][0], z_rimsa + 0.5 + hk * prof[j][1],
                    z_rimsa + 0.5 + hk * prof[j + 1][1], seg=24, r1=r * prof[j + 1][0], vrch=False)
        zl = z_rimsa + 0.5 + hk * 0.95
        G.valec(M['biela'], (cx, cy), 0.55, zl, zl + 1.1, seg=10)
        G.valec(M['strecha'], (cx, cy), 0.62, zl + 1.1, zl + 1.6, seg=10, r1=0.1)
        G.kvader(M['kriz'], (cx, cy), (1.0, 0.0), 0.12, 0.12, zl + 1.6, Hv)
        G.kvader(M['kriz'], (cx, cy), (1.0, 0.0), 0.8, 0.12, Hv - 0.9, Hv - 0.75)
        vyska_max = max(vyska_max, Hv)
    return G, vyska_max
