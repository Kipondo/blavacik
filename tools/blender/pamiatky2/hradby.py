# Zvyšky mestských hradieb Starého Mesta (OSM barrier=city_wall: Kapucínska, Zochova, Nám. Ľ. Štúra…):
# kamenný múr ~8 m s cimburím, mierne zošikmený sokel. Kopíruje terén (podlaTerenu).

from veze import Geo
from spolocne import material
from pamiatky2.zaklad import data, v_bl, stred_bodov, zrucany_mur, cimburie, kolizie_muru, delenie

VYSKA = 7.5
HRUBKA = 2.2


def postav():
    H = data()['hradby']
    vsetky = [p for h in H for p in h['body']]
    stred = stred_bodov(vsetky)
    kamen = [material('hradby-kamen-a', '#b9b09c', drsnost=0.93), material('hradby-kamen-b', '#aba28d', drsnost=0.94),
             material('hradby-kamen-c', '#c4bba7', drsnost=0.92)]
    kryt = material('hradby-kryt', '#a59c88', drsnost=0.9)
    G = Geo()
    kolizie = []
    for i, h in enumerate(H):
        body = [v_bl(p, stred) for p in h['body']]
        if len(body) < 2:
            continue
        # hlavný múr (vrch rovný – hradby sú zachované/obnovené), sokel o 0,3 m širší
        zrucany_mur(G, kamen, body, VYSKA, HRUBKA, seed=i, rozpad=0.0, kryt=kryt, krok=3.0)
        zrucany_mur(G, [kryt], body, 1.2, HRUBKA + 0.6, seed=i, rozpad=0.0, krok=3.0)
        cimburie(G, kamen[2], delenie(body, 3.0), VYSKA, 0.8, zub=1.1, medzera=0.75, vyska=1.2)
        kolizie += kolizie_muru(body, HRUBKA + 0.6)
    print('hradby: úsekov', len(H))
    return G, [], VYSKA + 1.2, 'hradby', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'podlaTerenu': True, 'kolizie': kolizie}
