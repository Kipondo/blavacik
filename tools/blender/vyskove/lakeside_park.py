# Lakeside Park (pri Kuchajde): kancelárska budova 86 m s terasovito odstupňovanými sklenenými časťami.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'lakeside-park', 'lakeside-park', druh='kancelarie')
