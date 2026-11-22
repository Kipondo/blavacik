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

## Rozpracované (22. 11. popoludní) – pracovné kópie vedľa repozitára
| vetva | priečinok | stav |
|---|---|---|
| `feature/hlavna-stanica` | `blavacik` | stanica + pavilóny podľa pohľadov, sklo haly, bez trávy; **čaká:** interiér podľa fotiek a freska Františka Gajdoša v hale (prieskum), potom trasa po, PR |
| `fix/atriaky-budovy` | `../blavacik-atriaky` | pushnutá; pavlače bez dier, izba 314 v meste, voľná ulička na terasu; **čaká:** trasa pred/po, PR |
| `fix/titulka-zlata-linka` | `../blavacik-main` | PR #116 otvorený – zlúčenie zablokovali oprávnenia (treba majiteľa) |
| `feature/vykon-tiene` | `../blavacik-vykon` | #110: tiene stromov cez zástupné koruny, malé objekty bez tieňa ďalej ako 45 m, vikiere bez tieňa, bez vetra (listy, tráva) – meranie |

Lokálne servery: `scratchpad/server.py <port> <priečinok>` (veľká fronta spojení – `python -m http.server` na Windows
odmieta súbory dlaždíc). Blender: `PYTHONPATH=%LOCALAPPDATA%\blender-balicky` (shapely) + `--python-use-system-env`.

## Ďalšie na rade (poradie podľa majiteľa)
1. Stanica: interiér a freska podľa fotiek → PR.
2. Pamiatky (C) podľa prieskumu: **Univerzita Komenského** (Šafárikovo nám.), **Eurovea** + Eurovea Tower +
   presklené „vajce“, **Sky Park** – čo najpresnejšie.
3. Vozidlá – trochu kvalitnejšie modely, len ak to nespomalí hru.
4. A2 + A3 (vlaky, GTFS), zvyšok D.

## Rozhodnutia
- Majiteľ 22. 11.: bez vetra (kývanie listov a trávy), výkon zjednodušovať tak, aby sa grafika veľmi nezhoršila;
  Google Maps/Earth sa ako podklad nepoužívajú (licencia) – OSM, laser, Commons, stránky architektov.
- Freska v hale stanice: do hry ide vlastné prekreslenie (kompozícia, farby), nie fotka diela.
- Nástupište je v hre 0,35 m nad terénom (skutočných 0,55 m nad koľajou): menší schod pri výstupe z podchodu.
- Interiér výpravnej budovy (1905) nie je prístupný okrem priechodu z haly na 1. nástupište; hala (1988) celá.
- Vlak pri spawne zatiaľ nie je (príde s A2) – scénka začína na nástupišti po príchode vlaku.
