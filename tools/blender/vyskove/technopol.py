# Technopol I a II (Petržalka, Kutlíkova): dve 90 m kancelárske veže z 80. rokov s pásovými oknami
# z bronzového skla a tmavohnedými parapetmi.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'technopol', 'technopol', druh='pasy', styly={'*': {'farba_obkladu': '#5e4532', 'sklo': '#8f8270', 'parapet': 1.0, 'preklad': 0.5}})
