# Slovenský rozhlas (1983, Štefan Svetko, Štefan Ďurkovič, Barnabáš Kisling) – „obrátená pyramída“ na
# Mýtnej: hnedé oceľové obklady s pásmi okien, podlažia sa smerom nahor rozširujú; nízke krídla s obkladom.
# Každé podlažie pyramídy je v OSM samostatná časť (výška, spodok) – generátor ich poskladá.

from vyskove.z_osm import postav_z_osm


def postav(obrysy):
    return postav_z_osm(obrysy, 'rozhlas', 'rozhlas', druh='pasy', podlazie=3.6, svetla=False,
                        styly={'*': {'farba_obkladu': '#8a644f', 'sklo': '#4f5b62', 'parapet': 1.6, 'preklad': 0.9}})
