# Obytný dom Glória (Ružová dolina): 100 m, 29 podlaží; bytová veža s balkónmi, horné ustupujúce
# časti presklené (min_height 69/96 m v OSM).
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'gloria', 'gloria', druh='byty', podlazie=3.1, styly={'*': {'balkony': lambda i, j, k: (i + j + k) % 3 == 0}, '1462633088': {'typ': 'sklo'}, '1462633086': {'typ': 'sklo'}, '1462633087': {'typ': 'sklo'}})
