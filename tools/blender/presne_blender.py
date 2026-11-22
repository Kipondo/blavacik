# Presné modely vybraných pamiatok (noc 22. 11.): Slavín, Modrý kostolík. Prepíšu assets/pamiatky/sm-<kľúč>.glb.gz,
# záznamy v data/mapa/pamiatky.json aj obrysy (kolízie) ostávajú. Postup a zdroje sú v hlavičke každého súboru
# v tools/blender/presne/.
# Spustenie: python3 tools/blender/presne_blender.py [slavin] [modry-kostolik]

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz, z_hry, ccw  # noqa: E402
from historicke.budova import nacitaj  # noqa: E402
from presne import slavin, modry_kostolik  # noqa: E402

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def info(subor):
    with open(os.path.join(KOREN, 'assets', 'pamiatky', f'{subor}.json')) as f:
        return json.load(f)


def bez_konca(b):
    return b[:-1] if b and b[0] == b[-1] else b


for kluc in sys.argv[1:] or ['slavin', 'modry-kostolik']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    subor = f'sm-{kluc}'
    i = info(subor)
    obrysy = [ccw([(x, -z) for x, z in o]) for o in i['obrysy']]   # lokálne metre hry → rovina Blendera
    if kluc == 'slavin':
        G, H = slavin.postav(obrysy[0])
    elif kluc == 'modry-kostolik':
        z = next(z for z in nacitaj()['modry-kostolik'] if z['id'] == '39962221')
        casti = [(z_hry(bez_konca(c['body']), i['stred']), c.get('t', {})) for c in z['casti']]
        G, H = modry_kostolik.postav(casti, z_hry(bez_konca(z['body']), i['stred']))
    else:
        raise SystemExit(f'neznáma pamiatka {kluc}')
    uloz(G, subor, obrysy, H, info={k: v for k, v in i.items() if k not in ('obrysy', 'vyska')}, minimum=0.72, vzdialenost=2.5)
