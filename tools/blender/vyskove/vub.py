# Centrála VÚB na Mlynských nivách: 103 m, svetlosivá doska s kamenným obkladom a pásovými oknami
# a modré sklenené časti (OSM building:colour royalblue, material glass).
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'vub', 'vub', druh='pasy', styly={'1461946566': {'typ': 'pasy', 'farba_obkladu': '#cfd1d0', 'parapet': 1.1}})
