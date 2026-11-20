# Matadorka (Petržalka): bytová veža (28 podlaží) a nižšie bloky, biela omietka, okná s balkónmi.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'matadorka', 'matadorka', druh='byty', podlazie=3.0, styly={'*': {'balkony': lambda i, j, k: j % 2 == 0}})
