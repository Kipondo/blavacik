# Slovenská národná galéria: barokové Vodné kasárne (biela omietka) a „premostenie“ (1977, Vladimír Dedeček) –
# zdvihnutá hnedá hmota nad nádvorím; po rekonštrukcii (2022) s tmavými lamelami. Časti z OSM.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'sng', 'sng', druh='pasy', podlazie=4.0, svetla=False, hlavne_bez_casti=True,
                        styly={'56341128': {'typ': 'byty', 'farba': '#f2efe6'},
                               '245884765': {'farba_obkladu': '#5b4a3e', 'sklo': '#3e474d', 'parapet': 0.4, 'preklad': 2.0},
                               '*': {'farba_obkladu': '#e9e4d8', 'sklo': '#6f8592'}})
