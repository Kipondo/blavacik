# Most Lafranconi (1991): predpätý betónový komorový most diaľnice D2, polia 83 + 174 + 172 + 4 × 83 m.
# Nosník má premennú výšku – nad riečnymi piliermi sa zväčšuje (náběhy), v strede polí je tenší.
# Dvojité steny riečnych pilierov, zábradlia a lampy.

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, zabradlie, lampa, pilier_rieka, uloz_most, obdlznik_xy, komorovy_nosnik, tyc_x)


def postav():
    d = data_mosta('Most Lanfranconi')
    L = d['L']
    POL = d['sirka'] / 2
    beton = material('beton-mosta', '#b2aea5', drsnost=0.85)
    beton_t = material('beton', '#9f9b93', drsnost=0.9)
    zabr = material('detail-zabradlie', '#b3b9bd', drsnost=0.45, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    voda = (min(a for a, b in d['voda']), max(b for a, b in d['voda']))
    xs = (voda[0] + voda[1]) / 2
    hlavne = [xs - 174.0, xs, xs + 172.0]
    piliere = sorted({x for x in hlavne + [hlavne[0] - 83.0, hlavne[-1] + 83.0] if 3 < x < L - 3})

    def hlbka(x):
        dmin = min(abs(x - p) for p in hlavne)
        k = max(0.0, 1 - dmin / 70.0)
        return 4.2 + 5.3 * k * k
    komorovy_nosnik(G, beton, 0, L, POL, hlbka, spodok=13.0, konzola=0.8, obrubnik=0.35, sirka_obrubnika=0.8, krok=4.0)
    kolizie = []
    for x in piliere:
        z = -hlbka(x)
        for s in (1, -1):
            pilier_rieka(G, beton_t, beton_t, x + s * 2.6, z, 15.0, 1.8, z_dole=-35.0, hlava=0.6)
        kolizie.append(obdlznik_xy(x, 0, 7.0, 15.0))
    for s in (1, -1):
        zabradlie(G, zabr, 0, L, s * (POL - 0.4), 0.35, vyska=1.0, krok_stlpika=2.0, priecky=(0.5,))
        tyc_x(G, beton_t, 0, L, s * (POL + 0.05), -0.25, 0.12, 0.9)
        x = 12.0
        while x < L - 5:
            lampa(G, lampy, svetla, x, s * (POL - 0.9), 0.35, vyska=11.0, rameno=2.0, smer=-s)
            x += 40.0
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'most-lafranconi', d, kolizie)
