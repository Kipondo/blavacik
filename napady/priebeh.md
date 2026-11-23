# Priebeh práce – stanica a opravy (zadanie `prompt-blavacik-stanica-a-opravy`)

> Nový chat / po limite: prečítaj si tento súbor, `CLAUDE.md` a otvorené PR. Pokračuj od „Rozpracované“.

## Poradie zo zadania
1. B (výkon, #110) → 2. D6 (Átriaky, #115) → 3. A2, A3 (vlaky, cestovný poriadok) → 4. C (pamiatky v Blenderi)
→ 5. A1, A4 (stanica, spawn) → 6. zvyšok D.
Výkresy stanice prišli 22. 11. 2026 hneď na začiatku (pred B), nič nebolo rozrobené → podľa zadania
„keď výkresy pošlem, … hneď prejdi na A1 a A4“ som začal stanicou.

## 22. 11. 2026
- Prostredie: Windows, Blender 5.2 (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`),
  gltfpack z npm (`npm install gltfpack@0.24.0`, cesta cez premennú `GLTFPACK`), Python 3.12, Node.
- **A1 + A4 → vetva `feature/hlavna-stanica`:**
  - `tools/blender/osm_stanica.py` – podklady z OSM (budovy, nástupištia, prístrešky, vchody) a schody podchodu
    z dlaždíc → `tools/blender/data/stanica.json`.
  - `tools/blender/stanica_blender.py` – tri modely: plášť (`stanica`), interiér haly (`stanica-interier`, len do 100 m),
    nástupištia s prístreškami (`stanica-nastupistia`). Výšky z rezov (hala +10,32, rímsa +13,88, hrebeň +19,63,
    podchod −3,02). Výkresy NIE sú v repozitári – len rozmery v skripte.
  - `js/mapa/stanica/` – modul (kolízie stien s medzerami vo dverách a v priechode, nástupištia ako pochôdzne plochy,
    tabuľa odchodov a hodiny podľa herného času), postavy (staničný filozof, ľudia bez domova), úvodná scénka.
  - `js/ui/titulky.js` – prehrávač dialógov z `data/dialogy/*.json` (titulky, Enter preskočí).
  - Štart hry presunutý na 1. nástupište (`data/mapa/zakladna.json`).
  - Oprava: pamiatky „podľa terénu“ (prázdna skupina pri stavbe) mal dohľad so stredom (0, 0) a polomerom −1 →
    ďaleko od stredu mapy sa nekreslili (`js/mapa/pamiatky/nacitaj-pamiatky.js`).
- Požiadavka majiteľa počas práce: po stanici znova Átriaky – prieskum fotiek, opraviť model budov
  (blikajúce textúry, diery v budovách) → spojené s D6 (#115).

## Zlúčené 22. 11.
#116 (zlatá linka na titulke), #117 (Átriaky), #118 (výkon – tiene, bez vetra), #119 (Hlavná stanica: plášť,
interiér, freska, strechy, dvere a chodci), #120 (trakčné vedenie električiek a trolejbusov v celom meste),
#121 (kvalitnejšie autá, 17 sietí namiesto 27), #122 (Univerzita Komenského, Eurovea vajce, Eurovea Tower, Sky Park),
#123 (workflow hlasov – sady viet stanice).

## Rozpracované (22. 11. večer)
| vetva | priečinok | stav |
|---|---|---|
| `feature/vlaky-poriadok` | `blavacik` | A2 + A3: GTFS ŽSR → `data/vlaky/poriadok.json`, trasy z OSM → `data/vlaky/trate.json`, modely `tools/blender/vlaky_blender.py`, modul `js/vlaky/`, koľaje 3D, tabule príchodov, hlásenia; **čaká:** PR |

- GTFS ŽSR: odkaz `www.zsr.sk/files/…/gtfs.zip` vracia len stránku „GTFS info“ s odkazom do Národného katalógu
  otvorených dát (data.slovensko.sk, dataset ebeeedf1-…, distribúcia `download?id=556da5af-…`) – nástroj sťahuje odtiaľ.
  Verzia 13. 11. 2026 platí do 12. 12. 2026 (nový poriadok od 13. 12. v nej ešte nie je).
- Wikimedia API pri viacerých požiadavkách hneď vracia 429 – fotky na porovnanie cez prehliadač (stránka súboru).

Lokálne servery: `scratchpad/server.py <port> <priečinok>` (veľká fronta spojení – `python -m http.server` na Windows
odmieta súbory dlaždíc). Blender: `PYTHONPATH=%LOCALAPPDATA%\blender-balicky` (shapely) + `--python-use-system-env`.

## Ďalšie na rade (poradie podľa majiteľa)
1. ~~Stanica~~ (#119), ~~pamiatky UK / Eurovea / Sky Park~~ (#122), ~~vozidlá~~ (#121).
2. A2 + A3 (vlaky na stanici, cestovný poriadok z GTFS).
3. B – LOD terénu (cieľ „polovica času snímky“ zatiaľ nesplnený).
4. Zvyšok D, súhrn do #59.

## Rozhodnutia
- Majiteľ 22. 11.: bez vetra (kývanie listov a trávy), výkon zjednodušovať tak, aby sa grafika veľmi nezhoršila;
  Google Maps/Earth sa ako podklad nepoužívajú (licencia) – OSM, laser, Commons, stránky architektov.
- Freska v hale stanice: do hry ide vlastné prekreslenie (kompozícia, farby), nie fotka diela.
- Nástupište je v hre 0,35 m nad terénom (skutočných 0,55 m nad koľajou): menší schod pri výstupe z podchodu.
- Interiér výpravnej budovy (1905) nie je prístupný okrem priechodu z haly na 1. nástupište; hala (1988) celá.
- Vlak pri spawne zatiaľ nie je (príde s A2) – scénka začína na nástupišti po príchode vlaku.
- Majiteľ 22. 11.: počas hovoru s mamou sa má dať chodiť; úvodné scénky pri testoch preskakovať (`?bezScenok`,
  Playwright a `?meranie` ich vynechávajú samy).
- Strechy stanice (prieskum 22. 11.): výšky z výkresov majú prednosť pred 3D vrstvou ZBGIS (LOD1, výšky blokov);
  z OSM building:part sú svetlík Skleníka (way 1523818057) a dve nárožné vežičky rizalitu; farby z ortofota ZBGIS 2023.
  Nápis na Skleníku bez loga a značky dopravcu – len „BRATISLAVA HLAVNÁ STANICA“.
  Nerobené: prízemná (5,5 m) východná časť Skleníka a ustúpené prízemie pod vysunutým poschodím – hala má zatiaľ
  jednu výšku a sklo v línii obrysu z OSM.
- Okolie stanice: zastávky s prístreškami a lampy už v hre sú; chýba trakčné vedenie električiek a trolejbusov →
  samostatná vetva (celé mesto, nie len stanica).
- Majiteľ 22. 11.: dvere, vchody a východy stanice napasovať, chodci po schodoch a cez dvere, „rampy“ nie do múrov →
  dvere sú tam, kde pešia cesta z OSM prechádza múrom; bočný priechod má otvor po celej šírke (vonkajšie schody pri
  Skleníku viedli do vnútorného múru medzi časťami budovy); chodci nechodia cez múry stanice (udalosť
  'steny-chodcov'), chodia podchodom a po nástupištiach (udalosť 'ciary-chodcov'), výšku majú ako hráč.
- Pamiatky (22. 11.): bez nápisov značiek (Eurovea), nápisy univerzity áno (verejná inštitúcia); podklady len
  slovami v `napady/pamiatky-podklady.md`, žiadne fotky v repozitári.
- Vlaky (22. 11.): typy súprav podľa zadania (Považan = 671, Košice = 361 + vozne, ostatné = regionálna jednotka);
  navyše aj ostatné diaľkové kategórie (Ex, IC, EC, EN, R, rj, RJ, LE) idú s lokomotívou a vozňami – trojvozňová
  regionálna jednotka ako EuroCity by vyzerala zle. Kategórie (aj RJ, LE, rj) ostávajú presne podľa poriadku, názvy
  produktov dopravcov (railjet, RegioJet…) sa vynechávajú ako značky. Nástupištia v GTFS nie sú – koľaje sa prideľujú
  v hre (jedna súprava na koľaj). Odstavené súpravy idú do depa na východ. Kolízie vlak–hráč zatiaľ nie sú.
- Autá (22. 11.): detaily lacnou cestou – disky textúrou, tvarovanie vrcholov raz pri stavbe typu; zlúčením
  sietí je auto hráča/zaparkované lacnejšie na kreslenie, auto v premávke má +~700 trojuholníkov.

## Stavebná fakulta STU (#127, 23. 11.) – vetva `feature/stavebna-fakulta`
- Prieskum podľa #130 (OSM, laser, stránky a výročné správy SvF, CRZ, ASB, Commons; bez Google) →
  `napady/pamiatky-podklady.md`; model `tools/blender/vyskove/stavebna_fakulta.py` (blok B s átriom, stredný blok
  so svetlíkmi, aula, veža C, blok A, spoj, vstup s lomenicou, átrium s nádržou), obrysy `osm_obrysy_overpass.py`
  (relácie teraz aj s dvormi, `LEN=` na jeden cieľ).
- Hra: `zakladnaBod` (model na terén pri schodisku – terén pod blokom B klesá o 3 m), `plochy` (schodisko ako
  pochôdzna plocha cez `js/mapa/mosty/pochodzne-pamiatok.js`), `kolizie` (krídla bez átria), `vchody` (interiér),
  OSM schody v mieste modelu sa nekreslia.
- Snímky pred/po neukladám do repozitára (#137) – sú v PR (vetva `hlasenia`, priečinok `obrazky/`).
- Rozhodnutie: nápisy univerzity áno, grafické logo STU nie; nádrž v átriu podľa opisu majiteľa (neoverená) –
  v issue žiadosť o vlastné fotky (átrium, čelo veže, schodisko zboku, hala).

## Eurovea 1 (#131 časť 1, 23. 11.) – vetva `feature/eurovea-1` (nadväzuje na `feature/stavebna-fakulta`)
- Prieskum (agent; OSM, laser, ~22 fotiek z Commons, články) → `napady/pamiatky-podklady.md`; agent sa raz zastavil
  na týždennom limite API a po 11:00 pokračoval.
- `tools/blender/osm_eurovea.py` (výrez z API openstreetmap.org – Overpass bol preťažený) → `data/eurovea.json`:
  57 častí, výšky z lasera z dlaždíc, terén pod časťou (čítanie t/*.bin v Pythone), vchody, kvetináče.
- Model `tools/blender/vyskove/eurovea_1.py`: štýly fasád podľa skupín, steny medzi susednými časťami sa nekreslia,
  valené presklené strechy z obrysu pasáže (Delaunay v Blenderi), štíty a stĺpy na otvorených koncoch.
- Trojuholníky: stĺpiky okien ako jedna plocha (94 → 50 tis.).
- Ďalšie časti #131: Eurovea 2 + hadia strecha + park a socha gúľ → nábrežie → pomník Štefánika.
