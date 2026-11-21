# City Business Center I (2008): kancelárska veža 95 m (s nadstavbou ~107 m), sklenené časti a červené
# (crimson) a bledomodré časti podľa OSM.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'cbc-1', 'cbc-1', druh='kancelarie')
