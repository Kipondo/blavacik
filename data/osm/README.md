# Dáta z OpenStreetMap

Hra používa skutočnú mapu Bratislavy z [OpenStreetMap](https://www.openstreetmap.org)
(© prispievatelia OpenStreetMap, licencia [ODbL](https://www.openstreetmap.org/copyright)).
Spracované dáta sú v `data/mapa/osm.json` – hra ich načíta automaticky.
Ak súbor chýba, použije sa zjednodušená ručná mapa (`data/mapa/zakladna.json` + `budovy.json`).

## Spôsob A – automaticky (odporúčané)

V koreni projektu (treba [Node.js](https://nodejs.org) 18+):

```bash
node tools/osm/stiahni.mjs   # stiahne oblasť hry z api.openstreetmap.org do .osm-cache/ (≈ 1 min)
node tools/osm/prevod.mjs    # spracuje ju do data/mapa/osm.json
```

## Spôsob B – ručne cez overpass-turbo

1. Otvor https://overpass-turbo.eu
2. Vlož tento dotaz (oblasť = Staré Mesto, nábrežie, Petržalka po Aupark, Eurovea, Nivy):

   ```
   [out:json][timeout:120];
   (
     way["building"](48.129,17.088,48.155,17.137);
     way["building:part"](48.129,17.088,48.155,17.137);
     relation["building"](48.129,17.088,48.155,17.137);
     way["highway"](48.129,17.088,48.155,17.137);
     way["railway"](48.129,17.088,48.155,17.137);
     way["landuse"](48.129,17.088,48.155,17.137);
     way["leisure"](48.129,17.088,48.155,17.137);
     way["natural"](48.129,17.088,48.155,17.137);
     way["amenity"="parking"](48.129,17.088,48.155,17.137);
     way["place"="square"](48.129,17.088,48.155,17.137);
     relation["natural"="water"](48.129,17.088,48.155,17.137);
     relation["place"="square"](48.129,17.088,48.155,17.137);
     node["highway"~"traffic_signals|crossing|stop|give_way|street_lamp|bus_stop"](48.129,17.088,48.155,17.137);
     node["natural"="tree"](48.129,17.088,48.155,17.137);
     node["railway"="tram_stop"](48.129,17.088,48.155,17.137);
   );
   out body; >; out skel qt;
   ```
3. Klikni **Spustiť** (Run), potom **Exportovať → GeoJSON → stiahnuť**.
4. Ulož súbor ako `data/osm/bratislava.geojson`.
5. Spusti `node tools/osm/prevod.mjs data/osm/bratislava.geojson`.

## Čo prevod robí
- súradnice lat/lon → metre od bodu 48.1435 N, 17.1077 E (x = východ, z = juh)
- budovy: výška z `height` alebo `building:levels` (3,2 m/poschodie), farba z `building:colour`
  alebo podľa štvrte, šikmé strechy podľa `roof:shape` / Staré Mesto
- cesty pre autá (šírka, pruhy, jednosmerky, max. rýchlosť), chodníky, cyklotrasy, koľaje
- trávniky, parky, lesy, námestia, parkoviská → textúra zeme
- Dunaj (vyrezáva koryto s nábrežnými múrmi), fontány, mosty cez Dunaj (mostovky s nájazdmi)
- stromy, semafory, prechody, značky STOP / daj prednosť, lampy, zastávky, lavičky
- budovy v miestach pamiatok s vlastným modelom (`zaber` v `data/mapa/pamiatky.json`) sa vynechajú
