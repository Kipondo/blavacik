# Incheba (1991, Vladimír Dedeček): výšková budova 85,6 m pri výstavisku v Petržalke, svetlé pásy
# a pásové okná; nízke výstavné haly podľa OSM.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'incheba', 'incheba', druh='pasy', styly={'*': {'farba_obkladu': '#d9d6cf', 'sklo': '#7a8d99'}})
