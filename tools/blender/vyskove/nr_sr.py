# Národná rada SR (1994) na Hradnom kopci: biele krídla s pravidelnými oknami a sivá rokovacia sála.
# Časti a podlažia z OSM.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'nr-sr', 'nr-sr', druh='pasy', podlazie=3.8, svetla=False, hlavne_bez_casti=False,
                        styly={'*': {'farba_obkladu': '#f1efe9', 'sklo': '#71848f', 'parapet': 1.0, 'preklad': 0.6}})
