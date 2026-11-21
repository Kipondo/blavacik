# Aupark Tower (2008, AK Jančina): 96 m; stredná veža s dvojitou sklenenou fasádou, kde je len každé
# druhé podlažie naznačené vodorovnou linkou, okolo nej krídla s výrazne vodorovnými pásmi.
# Tvar, výšky, farby a materiály častí sú z OSM (tools/blender/data/obrysy.json), fasády z vyskove/z_osm.py.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'aupark-tower', 'aupark-tower', druh='kancelarie', styly={'1490387003': {'typ': 'sklo', 'linka_kazde': 2, 'parapet': 0.0}, '*': {'typ': 'sklo', 'linka_kazde': 1}})
