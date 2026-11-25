# Veľké súbory mimo gitu – plán pre Cloudflare R2 (#137)

## Stav (25. 11. 2026)
- Repozitár má **141,5 MB** v gite (`git count-objects -vH`, size-pack). Súbory v aktuálnom strome majú **155 MB**.
  GitHub odporúča do 1 GB; súbor nad 50 MB odmietne s varovaním, nad 100 MB vôbec.
- Najväčšie priečinky v strome:
  - `data/mapa` – 66 MB (dlaždice, terén, strechy);
  - `docs/snimky` – 31 MB (snímky a gify do README);
  - `assets/postavy` – 14 MB (Ďoďo a NPC .glb);
  - `docs/kontrola` – 10 MB (staršie behy testovacej trasy);
  - `nastroje/prehlad` – 8 MB;
  - `assets/pamiatky` – 7 MB.
- Najväčšie objekty v histórii sú staré `.osm-cache/*.osm` (5–8 MB), ktoré už v strome nie sú. Históriu neprepisujeme
  (rozbilo by to klony a PR oboch Claudov).
- Najväčší súbor v strome má 4,3 MB (`assets/postavy/dodo.glb`).

## Pravidlá (platia hneď, sú aj v CLAUDE.md)
- **Žiadny súbor v gite nad 25 MB.** Stráži to `tools/kontrola/velke-subory.py` v GitHub Actions pri každom PR.
- **Veľké binárne súbory** (modely, textúry, interiéry nad ~5 MB) len po dohode s majiteľom.
- **Snímky testovacej trasy** (`docs/kontrola/<beh>/`) sa do gitu nedávajú (`.gitignore`). Do PR a issues idú
  cez vetvu `hlasenia` (obrázky v `obrazky/`).
- **Generované dáta mapy** sa commitujú, len keď sa naozaj zmenili. Pregenerovanie s rovnakým výsledkom nesmie
  vytvoriť nový commit dlaždíc. Pred commitom treba pozrieť `git diff --stat data/mapa`.

## Čo pôjde na R2, keď to bude treba
Do gitu by sa nezmestili (alebo by ho zbytočne nafúkli):
1. **LOD2 strechy a terén 2 m pre celé mesto** (#53, #109) – odhad ~500 MB.
2. **Interiéry** (Eurovea #131, internáty #73) – modely a textúry, desiatky až stovky MB.
3. **Podrobnejšie modely pamiatok a postáv** (.glb s textúrami 2–4k).

Kód hry, malé dáta (OSM dlaždice, zoznamy, misie, dialógy) a súbory potrebné na prvé spustenie ostávajú v gite.

## Ako to bude fungovať
- **Úložisko:**
  - Cloudflare R2 (S3 API) bez poplatku za prenos z úložiska;
  - bezplatných je 10 GB miesta a milióny čítaní mesačne, čo na hru stačí;
  - bucket napr. `blavacik-data`, verejný cez vlastnú doménu alebo `*.r2.dev`.
- **CORS:** bucket povolí `GET` z `https://kipondo.github.io` a `http://localhost:8000` (lokálne hranie).
- **Cesty v hre:**
  - v `js/config.js` pribudne `ZDROJ_DAT` (základná adresa veľkých súborov);
  - hra najprv skúsi lokálnu cestu (`assets/…`, `data/…`) – pri vývoji sú súbory na disku;
  - keď lokálny súbor nie je, načíta ho z `ZDROJ_DAT`;
  - hra funguje lokálne aj z GitHub Pages.
- **Verzie:**
  - súbory na R2 sú v priečinku podľa obsahu (napr. `strechy/<hash>/…`) a manifest v gite hovorí, ktorá verzia platí;
  - pri zlučovaní vetiev sa tak rieši len malý manifest, nie veľké súbory (pravidlo o generovaných súboroch platí ďalej –
    pregenerovať skriptom).
- **Nahrávanie:**
  - skript `tools/r2/nahraj.mjs` (S3 API, kľúče z prostredia, nikdy v repozitári);
  - v GitHub Actions ich nesie secret;
  - po pregenerovaní dát nahrá nové súbory a prepíše manifest.

## Čo musí spraviť majiteľ (raz)
1. Založiť účet Cloudflare (stačí bezplatný) a bucket R2.
2. Vytvoriť API token s právom zápisu len do tohto bucketu.
3. Token uložiť ako GitHub secret (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`).
4. Rozhodnúť verejnú adresu (vlastná doména alebo `r2.dev`).

Potom sa dá napísať `tools/r2/nahraj.mjs`, `ZDROJ_DAT` v hre a presunúť prvé veľké dáta (LOD2 celého mesta).
