# Manderla (Manderlák, 1935, Ch. Ludwig): prvý bratislavský „mrakodrap“ – 12 podlaží, funkcionalizmus:
# biela omietka, pásové okná, ustupujúce horné podlažia a obchody v parteri.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'manderla', 'manderla', druh='pasy', podlazie=3.4, svetla=False, styly={'*': {'farba_obkladu': '#ece7dc', 'parapet': 1.0, 'preklad': 0.35, 'sklo': '#6f7f88'}})
