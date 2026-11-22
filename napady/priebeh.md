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

## Rozpracované
- A1/A4: PR, meranie pred/po, snímky.

## Ďalšie na rade
- D6 / #115 Átriaky (prieskum fotiek, diery, z-fighting, ovládanie v izbe ako vonku) – na želanie majiteľa hneď po stanici.
- B (#110 výkon), A2 + A3 (vlaky, GTFS), C (pamiatky), zvyšok D.

## Rozhodnutia
- Nástupište je v hre 0,35 m nad terénom (skutočných 0,55 m nad koľajou): menší schod pri výstupe z podchodu.
- Interiér výpravnej budovy (1905) nie je prístupný okrem priechodu z haly na 1. nástupište; hala (1988) celá.
- Vlak pri spawne zatiaľ nie je (príde s A2) – scénka začína na nástupišti po príchode vlaku.
