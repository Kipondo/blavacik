# Nová budova SND (2007, Peter Bauer, Martin Kusý, Pavol Paňák): rozľahlá stavba pri Eurovei – kamenné
# obklady, presklené foyer s kupolami a vysunutá javisková veža. Časti, výšky a materiály z OSM.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'nove-snd', 'nove-snd', druh='pasy', podlazie=4.2, svetla=False,
                        styly={'*': {'farba_obkladu': '#d9d3c5', 'sklo': '#6e8696', 'parapet': 1.1, 'preklad': 0.7}})
