# Laserové skenovanie (LLS) ÚGKK SR – ako vyrobiť terén, budovy a stromy

Hra používa letecké laserové skenovanie Úradu geodézie, kartografie a katastra SR (ÚGKK SR):

| Produkt | Čo to je | Rozlíšenie | Na čo ho hra používa |
|---|---|---|---|
| **DMR 6.0** | digitálny model reliéfu – holý terén bez budov a stromov | 0,5 m | terén celého mesta (mriežka 20 m) a detailný terén výrezu (2 m) |
| **DMP 2.0** | digitálny model povrchu – terén + budovy + stromy | 0,5 m | výšky budov, strechy z rovín (LOD2), komíny, dvory, stromy |

- **Zdroj:** ÚGKK SR, LLS 2. cyklus, blok **LOT08** (Bratislava a okolie), <https://www.geoportal.sk/sk/zbgis/lls-dmr/>
- **Licencia:** CC BY 4.0, citácia **„© ÚGKK SR“** (uvedená v hre v menu a v README).
- **Súradnice:** S-JTSK [JTSK03] / Krovak East-North (EPSG:8353), výšky Bpv. Prepočet do hry robí `pyproj`
  (EPSG:4326 → EPSG:8353); posun voči OSM sme overili – pôdorysy z OSM sedia na laseri bez posunu (±0,5 m).
- Pokrytie LOT08 končí na západe pri Devíne a Karlovej Vsi – tam ostáva terén z Copernicus DEM s plynulým prechodom.

**Surové dáta nie sú v gite** (`.cache/` je v `.gitignore`), do repozitára idú len hotové dlaždice.

## Súbory na stiahnutie

ZIPy z <https://opendata.skgeodesy.sk/static/LLS/2_cyklus/LOT08/>:

- `LOT08_DMR6_sjtsk03_bpv.zip` → `sjtsk03_bpv/dmr6_08_23_s.tif` (11,2 GB) + `.tfw`
- `LOT08_DMP2_sjtsk03_bpv.zip` → `sjtsk03_bpv/dmp2_08_23_s.tif` (5,9 GB) + `.tfw`

`tools/mesto/laser/stiahni.py` ich stiahne automaticky: ZIP neukladá, číta len potrebné časti (HTTP Range)
a TIFF rozbaľuje rovno do `.cache/laser/`. Treba ~17 GB miesta, trvá to asi 25 minút.
Ak automatické sťahovanie nejde, stiahni ZIPy ručne a do `.cache/laser/` rozbaľ súbory
`dmr6_08_23_s.tif`, `dmr6_08_23_s.tfw`, `dmp2_08_23_s.tif`, `dmp2_08_23_s.tfw`.

## Postup (z koreňa repozitára)

```bash
pip install numpy scipy pillow tifffile imagecodecs zarr pyproj requests scikit-image mapbox-earcut matplotlib
python3 tools/mesto/laser/stiahni.py            # laserové dáta → .cache/laser/
cd tools/mesto && npm run stiahni && npm run dlazdice && npm run teren && cd ../..   # OSM dlaždice + Copernicus
python3 tools/mesto/laser/teren.py              # terén z DMR: celé mesto 20 m + detail 2 m pre výrez
python3 tools/mesto/laser/budovy.py             # výšky, dvory, strechy z rovín, komíny pre výrez
python3 tools/mesto/laser/stromy.py             # stromy (poloha, výška, šírka koruny) pre výrez
```

Bez prepínača sa detail robí len pre **výrez Starého Mesta s Hradným kopcom** (1,5 × 1 km, dlaždice −2…0 × −1…0, `VYREZ`
v `tools/mesto/laser/spolocne.py`), na ktorom sa postup ladí. `--vsetko` spracuje celé mesto.
`teren.py` je potrebné spustiť po každom `npm run dlazdice` (prepíše index.json) – stačí `--len-detail`.

**Širšie centrum, Mlynská dolina, Nivy a Petržalka** (`--sirsie-centrum`, 96 dlaždíc: Staré Mesto od Palisád po
Landererovu a od Hlavnej stanice po Dunaj, Karlova Ves – Mlynská dolina – Družba, Mlynské nivy – Nivy – Trnavské mýto,
stred Petržalky s Chorvátskym ramenom) – detailný terén, cesty na teréne, LOD2 strechy a stromy:

```bash
python3 tools/mesto/laser/teren.py --sirsie-centrum
python3 tools/mesto/laser/cesty_teren.py $(python3 -c "import sys; sys.path.insert(0,'tools/mesto/laser'); from spolocne import SIRSIE_CENTRUM as S; print(' '.join(f'{i}_{j}' for i, j in S))")
# zošitie švov medzi dlaždicami (výplň pri okraji výrezu, dlaždice z rôznych behov) – vždy po cesty_teren.py
python3 tools/mesto/laser/svy_terenu.py
# budovy.py a stromy.py po jednej dlaždici – laser sa číta pre obálku všetkých vybraných dlaždíc naraz
for t in $(python3 -c "import sys; sys.path.insert(0,'tools/mesto/laser'); from spolocne import SIRSIE_CENTRUM as S; print(' '.join(f'{i}_{j}' for i, j in S))"); do
  python3 tools/mesto/laser/budovy.py --dlazdice $t && python3 tools/mesto/laser/stromy.py --dlazdice $t
done
```
Na dlaždiciach, ktoré už prešli `priechody.py` a `casti-budov.mjs`, `budovy.py` nemení časti nad priechodmi
(`priechod`, `minVyska`) ani vyvýšené časti (`cast`) – laser nad nimi vidí celú budovu, prízemné kúsky by narástli
do výšky domu a horná časť by „visela“. Takéto budovy ostávajú bez LOD2 strechy (ako predtým).

## Čo vznikne

- `data/mapa/mesto/teren.bin` + `teren.json` – terén celého mesta (Int16, decimetre nad 139 m n. m., 20 m).
- `data/mapa/mesto/t/<i>_<j>.bin` – detailný terén dlaždice (2 m, 251 × 251 uzlov, uint16 (výška − 100 m)·100,
  po riadkoch rozdiely susedov, gzip; ~50 kB na dlaždicu).
- `data/mapa/mesto/strechy/<i>_<j>.bin` – strechy z rovín (šikmé so škridlou, ploché so štrkom, štíty), komíny;
  binárne (indexované trojuholníky, poloha na 2 cm, gzip), ~250–500 kB na dlaždicu Starého Mesta. Formát je popísaný
  vo funkcii `zapis_strechy` v `tools/mesto/laser/budovy.py`, číta ho `js/mapa/dlazdice/doplnky.js`.
- v `data/mapa/mesto/d/<i>_<j>.json` pri budovách: `vyska` (po odkvap), `vyskaLaser` (medián DMP − DMR
  vnútri pôdorysu), `hreben`, `tvarStrechy`, `zdrojVysky` (`lidar` / `osm` / `odhad`), `diery` (dvory),
  `lod2`; stromy `[x, z, mierka, výška, polomer koruny]`.
- `index.json`: `terenDetail` a `strechyLod2` – zoznam dlaždíc, pre ktoré hra načíta doplnky.

## Ako sa robia strechy (tools/mesto/laser/budovy.py)

1. povrch strechy (DMP vnútri pôdorysu, > 2 m nad terénom) sa rozdelí podľa sklonu a smeru na plochy,
2. susedné plochy s rovnakou rovinou sa spájajú (len ak spoločná rovina sedí do 0,22 m), malé sa priradia susedom,
3. hranice plôch sa prevedú na lomené čiary a zjednodušia (spoločné hranice raz → bez škár),
4. body na hrebeňoch a úžľabiach sa posunú na priesečník rovín → rovné ostré hrany,
5. plochy sa strianguľujú (earcut), medzi rôzne vysokými plochami a na okraji sa doplnia zvislé steny,
6. komíny = malé výstupky (0,5–6 m², 0,7–4 m) nad rovinou strechy.

Kontrola: výšky striech z lasera sa so starším mestským modelom LOD1 (len na porovnanie, nič sa z neho
nepreberá) zhodujú v mediáne na 0,14 m.
