# Výškové budovy Bratislavy z Blendera: každá stavba je jeden súbor v tools/blender/vyskove/<meno>.py
# s funkciou postav(obrysy) → (Geo, obrysy v Blenderi, výška, meno súboru). Obrysy a časti budov
# sú z OpenStreetMap (tools/blender/osm_obrysy.mjs → data/obrysy.json), tvar fasád je ručne
# podľa verejných popisov a fotografií (len na pozretie, nič sa nepreberá).
#
# Spustenie (bpy z pip, Python 3.13):
#   python3 tools/blender/vyskove_budovy.py               – všetky
#   python3 tools/blender/vyskove_budovy.py nivy_tower    – len vybrané
# Výsledok: assets/pamiatky/<meno>.glb + <meno>.json (obrysy pre kolízie a vynechanie budov v hre).

import importlib
import os
import sys

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TU)

import bpy  # noqa: E402  (musí byť pred bmesh v ďalších moduloch)
from veze import nacitaj_obrysy, uloz  # noqa: E402

VSETKY = ['nivy_tower', 'twin_city_tower', 'eurovea_tower', 'panorama_city', 'sky_park_rezidencia',
          'sky_park_offices', 'tower_115', 'nbs']


def main():
    mena = sys.argv[1:] or VSETKY
    obrysy = nacitaj_obrysy()
    for meno in mena:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        modul = importlib.import_module(f'vyskove.{meno}')
        G, obrysy_hry, vyska, subor, *dalsie = modul.postav(obrysy)
        uloz(G, subor, obrysy_hry, vyska, info=dalsie[0] if dalsie else None)


if __name__ == '__main__':
    main()
