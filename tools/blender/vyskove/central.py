# Centrál (Metodova, Trnavské mýto): sklenená kancelárska veža 84 m.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'central', 'central', druh='kancelarie')
