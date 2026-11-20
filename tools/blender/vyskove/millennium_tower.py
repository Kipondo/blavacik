# Millennium Tower I a II (dnes myhive Vajnorská, Tower 1 a 2): sklenené kancelárske veže 80 a ~100 m.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'millennium-tower', 'millennium-tower', druh='kancelarie', podlazie=3.9)
