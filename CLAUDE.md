# Blavačík – pravidlá projektu

Zábavná 3D hra v prehliadači v štýle open-world akčných hier, odohráva sa v Bratislave.
Ide len o srandu. **Nepoužívaj názov GTA ani nič z originálnych hier** (logá, hudba, postavy, texty).
Na projekte pracujú dvaja ľudia naraz (z dvoch rôznych Claude účtov) – pravidlá nižšie sú na to, aby sme si neprepisovali prácu.

## Hra
- Mapa: **celá Bratislava** (dlaždice 500 × 500 m streamované okolo hráča), výškový model terénu.
- Hra je **len pre PC** (klávesnica + myš) – grafika môže byť náročnejšia (rozhodnutie v issue #8).
- Budovy a cesty z OpenStreetMap – `data/mapa/mesto/` (vyrába `tools/mesto/`); staršie zdroje (`data/mapa/osm.json`, ručná mapa) sú len záloha.
- Výškový model: Copernicus DEM GLO-30 (v README musí ostať uvedený zdroj).
- OSM dáta sú pod licenciou ODbL – v hre (menu) a v README musí ostať uvedené „© prispievatelia OpenStreetMap“.
- Chodenie pešo, nastupovanie/vystupovanie z áut, jazda s jednoduchou fyzikou a kolíziami.
- Kamera za postavou/autom, ovládanie klávesnicou aj dotykom na mobile.
- Polícia s hviezdičkami, krátke vtipné misie s bratislavským humorom, minimapa, menu.

**Dizajn hry (príbeh, postava, systémy) je v [napady/dizajn-hry.md](napady/dizajn-hry.md) – pred novou funkciou si ho prečítaj.**

## Technológie
- Three.js (súbor priamo v `vendor/`, žiadne CDN ani build proces).
- Čisté HTML + JavaScript (ES moduly cez `importmap`), CSS.
- Hostovanie: GitHub Pages z vetvy `main`, koreňový priečinok.
- Lokálne spustenie: `python3 -m http.server 8000` a otvor `http://localhost:8000` (cez `file://` to nepôjde kvôli modulom a JSON).

## Štruktúra priečinkov
```
index.html            vstupná stránka
css/style.css         vzhľad UI
js/main.js            štart hry a herná slučka (meň len minimálne)
js/config.js          spoločné konštanty
js/moduly.js          zoznam modulov (nový modul = 1 import + 1 položka)
js/jadro/hra.js       rozhranie hry: stav, moduly, udalosti (popis v komentári)
js/vstup/             klávesnica, dotyk (joystick), spoločný stav ovládania
js/kamera/            kamera za postavou/autom, skrývanie vzdialených objektov
js/grafika/           vzhľad: odrazy okolia (environment), neskôr deň/noc a efekty
js/mapa/              načítanie mapy (celé mesto / OSM / ručná), kolízie, geometria, obloha
js/mapa/dlazdice/     streamovanie dlaždíc mesta (správca, stavba dlaždice, LOD)
js/mapa/teren/        výškopis (kopce, koryto Dunaja, mosty) a model zeme
js/mapa/budovy/       vysunuté budovy, textúra okien
js/mapa/cesty/        cesty, námestia
js/mapa/voda/         Dunaj
js/mapa/mosty/        všeobecný model mosta
js/mapa/zelen/        stromy
js/mapa/pamiatky/     jedna stavba = jeden súbor (<model>.js) + záznam v data/mapa/pamiatky.json
js/auto/              fyzika auta, model auta, správa áut, riadenie hráčom
js/chodec/            hráč pešo, NPC chodci; js/chodec/postava/ = realistický Ďoďo, js/chodec/npc/ = davy
js/cas/               herný čas (hra.stav.datumCas, zrýchľovanie)
js/mhd/               MHD: zastávky, odchody, spoje (číta data/mhd/)
js/policia/           hviezdičky, policajné autá, zatknutie
js/misie/             engine misií (číta data/misie/*.json)
js/dialogy/           zobrazovanie dialógov (číta data/dialogy/*.json)
js/doprava/           NPC doprava, semafory
js/ui/                HUD, minimapa, menu, názvy miest
js/zvuk/              syntetizované zvuky (žiadna cudzia hudba)
data/mapa/            pamiatky, pomenované miesta, štart; záložná ručná mapa
data/mapa/mesto/      VYGENEROVANÉ: index.json, teren.bin, d/<i>_<j>.json (dlaždice)
data/osm/             návod na OSM dáta, prípadný GeoJSON export (spracovaná mapa je data/mapa/osm.json)
data/misie/           jedna misia = jeden JSON súbor (formát v FORMAT.md)
data/dialogy/         jeden dialóg / sada dialógov = jeden JSON súbor
data/mhd/             VYGENEROVANÉ z GTFS: linky, zastávky, poriadky (tools/mhd/)
data/postavy/         šatník a profily NPC
data/lidar/           návod k laserovému skenovaniu ÚGKK (tools/mesto/laser/)
assets/               modely (postavy .glb) a CC0 textúry
napady/               dizajn hry, príbeh, nápady (markdown)
tools/                pomocné skripty; tools/mesto/ = celé mesto (OSM + DEM → dlaždice), tools/osm/ = spoločné triedenie OSM
vendor/               knižnice tretích strán (three.js)
```

## Pravidlá práce v gite
1. **Nikdy nepracuj priamo v `main`.** Každá úloha = samostatná vetva:
   `feature/<krátky-popis>` (napr. `feature/misia-hrad`, `feature/policia-vrtulnik`),
   opravy `fix/<popis>`.
2. Pred začatím: `git checkout main && git pull`, potom `git checkout -b feature/...`.
3. Commituj často, s krátkou správou po slovensky.
4. Po dokončení pushni vetvu a **otvor pull request** do `main` s popisom, čo sa zmenilo a ako to otestovať.
5. Pred PR si stiahni najnovší `main` a vyrieš konflikty u seba vo vetve (podrobne v časti „Zlučovanie“).
6. Do `main` sa merguje len cez PR.

## Zlučovanie
Opravy sa nám pri zlučovaní strácali (stromy na mostoch, staré verzie dlaždíc, pravidlá v tomto súbore) –
preto platí:
1. **Najprv `main` do vetvy, až potom PR.** Pred otvorením aj pred zlúčením PR: `git fetch origin`
   a `git merge origin/main` do svojej vetvy, vyriešiť konflikty, otestovať – až potom PR otvoriť / zlúčiť.
2. **Generované súbory sa pri konflikte NIKDY neriešia výberom jednej strany** (`--ours` / `--theirs`, „vezmem
   celý súbor z vetvy“). Celý súbor z jednej strany zahodí zmeny druhej (takto sa 21. 11. stratili zmeny
   v 575 dlaždiciach). Po zlúčení sa súbor **pregeneruje skriptom**, aby obsahoval zmeny z oboch vetiev
   (skripty aj opravy v nich sú v kóde, ten sa zlúči ručne). Ktorý skript čo vyrába:

   | generovaný súbor | skript (z koreňa repozitára) |
   |---|---|
   | `data/mapa/mesto/index.json`, `data/mapa/mesto/d/*.json` (dlaždice) | `cd tools/mesto && npm run dlazdice`, potom doplnky v tomto poradí: `node osm-doplnky.mjs`, `node podchody.mjs`, `node casti-budov.mjs`, `node priechody-osm.mjs && python3 priechody.py`, `node nadjazdy.mjs` (všetky s `--max-old-space-size=8000`) |
   | výšky, strechy a stromy v dlaždiciach, `data/mapa/mesto/strechy/*` | `python3 tools/mesto/laser/vysky.py`, `budovy.py`, `casti.py`, `stromy.py` (návod a výber dlaždíc v `data/lidar/README.md`) |
   | `data/mapa/mesto/teren.bin`, `teren.json` (terén mesta) | `cd tools/mesto && npm run teren`, potom `python3 tools/mesto/laser/teren.py --len-detail` |
   | `data/mapa/mesto/t/*.bin` (terén 2 m z lasera) | `python3 tools/mesto/laser/teren.py …` a **vždy po ňom** `python3 tools/mesto/laser/cesty_teren.py …` (vyhladenie pod cestami) a `python3 tools/mesto/laser/svy_terenu.py` (zošitie švov medzi dlaždicami) |
   | `data/mapa/cyklopruhy.json`, `ihriska.json`, `sluzby.json`, `podniky.json`, `sochy.json`, `zastavba.json` | `tools/mesto/cyklopruhy.mjs`, `ihriska.mjs`, `sluzby.mjs`, `podniky.mjs`, `sochy.mjs`, `zastavba.mjs` |
   | `data/mapa/osm.json` (záložná mapa centra) | `node tools/osm/stiahni.mjs && node tools/osm/prevod.mjs` |
   | `data/mhd/*` | `node tools/mhd/stiahni.mjs && node --max-old-space-size=4000 tools/mhd/spracuj.mjs` |
   | `data/vlaky/poriadok.json`, `data/vlaky/trate.json` | `python3 tools/vlaky/gtfs_vlaky.py`, `python3 tools/vlaky/trate_osm.py` |
   | `assets/pamiatky/*.glb(.gz)`, `assets/pamiatky/*.json`, `assets/vlaky/vlaky.glb` | skript v `tools/blender/` podľa hlavičky modelu (`blender -b --factory-startup -P …`) |
   | `tools/blender/data/stanica.json` | `python3 tools/blender/osm_stanica.py` |
   | `assets/zvuk/dialogy/*` | workflow `.github/workflows/hlasy.yml` (needituj ručne) |
   | `docs/kontrola/<beh>/` | `python3 tools/kontrola/trasa.py` |

   Keď skript na pregenerovanie nemáš (napr. chýba laser v `.cache/`), zlúč súbor **po položkách** (nástroj
   na JSON, nie výber strany) a v PR napíš, čo treba pregenerovať.
3. **Konflikty v kóde rieš ručne tak, aby ostali zmeny z oboch strán.** Keď nie je jasné, ktorá zmena platí
   (obe menia to isté správanie), opýtaj sa majiteľa – nehádaj.
4. **Po zlúčení spusti testovaciu trasu** (`python3 tools/kontrola/trasa.py --nazov po-zluceni`) a porovnaj snímky
   pred/po (`docs/kontrola/porovnanie.html`); a **regresné kontroly** (`python3 tools/kontrola/regresie.py`).
5. **Po zlúčení do `main` over nasadenie:** GitHub Pages nasadil nový commit (`gh api repos/Kipondo/blavacik/pages/builds/latest`
   – `status: built` a `commit` = nový `main`) a workflowy na `main` neskončili chybou (`gh run list --branch main --limit 5`,
   napr. `hlasy.yml`). Chybu oprav hneď samostatným PR.
6. **Zlúčené vetvy maž** (`gh pr merge N --merge --delete-branch`, staré: `git push origin --delete <vetva>`), aby sa omylom
   nezlúčili znova. Ponechaj len `main`, otvorené PR a vetvu `hlasenia` (obrázky do issues).
7. **Každá nová oprava = nová kontrola** v `tools/kontrola/regresie/kontroly.js` (jedna opravená chyba = jedna kontrola,
   s odkazom na commit/PR opravy). Kontroly bežia v GitHub Actions pri každom PR (`.github/workflows/regresie.yml`);
   **PR, v ktorom kontrola zlyhá, sa nezlučuje.**

## Úlohy pre dvoch Claudov (issues so štítkami)
Úlohy sa zadávajú ako GitHub issues so štítkom podľa toho, kto ich robí:
- `pre-kamosa` – úloha pre druhého Clauda (kamoša),
- `pre-mna` – úloha pre prvého Clauda (majiteľa repozitára).

Postup:
1. **Na začiatku práce si pozri otvorené issues so svojím štítkom**
   (`gh api "repos/Kipondo/blavacik/issues?labels=pre-mna&state=open"`, resp. `labels=pre-kamosa`).
2. **Pred začatím napíš do issue komentár, že na ňom pracuješ** (a v akej vetve).
   Na issue, na ktorom už pracuje ten druhý, nesiahaj.
3. **PR uzatvára issue** – do popisu PR napíš `Closes #N`.

## Pamiatky a významné stavby
Platí pri **každej** pamiatke a stavbe, ktorú dorábaš alebo prerábaš (#130):
- Čo pošle majiteľ (fotky, súradnice, opis) je **len hrubý odhad** a ukazovateľ, čo sa mu nepáči – nie presný podklad.
- Pred modelovaním vždy sprav **hĺbkový prieskum** zo všetkých voľne dostupných zdrojov: pôdorysy, rezy, pohľady,
  výkresy, vizualizácie, fotky zo všetkých strán, počty podlaží, výšky, materiály, farby, detaily vstupov a striech.
- Zdroje: OSM (`building:part`, `height`, `building:levels`), laser ÚGKK (DMP − DMR, LOD2), ortofoto ZBGIS,
  3D modely mesta (opendata.bratislava.sk), Wikimedia Commons, Wikipédia, stránky architektov a developerov,
  archinfo.sk, ASB a odborné články, súťažné návrhy, dokumentácia z verejných konaní (EIA na enviroportal.sk,
  územné a stavebné konania – často s výkresmi), správy.
- **Nič z Google Maps / Earth / Street View** (licencia).
- Výkresy a cudzie fotky sa do repozitára **nedávajú** – len rozmery a opis slovami do `napady/pamiatky-podklady.md`
  **s odkazmi na zdroje**; do repozitára ide len hotový model a skript, ktorý ho vyrába.
- Ak ani po prieskume niečo nie je jasné, napíš majiteľovi, akú vlastnú fotku má dodať (odkiaľ, z akého uhla).

## Pravidlá kódu
- Kód rozdeľ do **malých samostatných súborov podľa oblastí** (mapa, auto, chodec, polícia, misie, dialógy, UI).
  Jeden súbor = jedna zodpovednosť. Nové veci pridávaj radšej ako nový súbor než do cudzieho.
- Nový modul hry = nový súbor + registrácia v `js/moduly.js` (rozhranie je popísané v `js/jadro/hra.js`).
  Moduly medzi sebou komunikujú cez `hra.stav` a udalosti `hra.na()` / `hra.posli()`, nie priamym importom.
- `js/main.js`, `js/config.js` a `js/jadro/hra.js` sú spoločné – meň ich čo najmenej a len s jasným dôvodom v PR.
- **Misie a dialógy sú dáta (JSON), nie kód.** Nová misia = nový súbor v `data/misie/` + záznam
  v `data/misie/zoznam.json`; nový dialóg = súbor v `data/dialogy/`. Engine misií sa mení len vtedy,
  keď treba nový typ kroku.
- **Komentáre v kóde a všetky texty v hre sú po slovensky.**
- Bez build procesu a bez npm závislostí v hre; knižnice idú do `vendor/`.
- Hra je pre PC; dotykové ovládanie zostáva, ale netreba ho rozvíjať.
- Žiadny obsah z originálnych hier, žiadne značky firiem, žiadne reálne osoby.

## README.md
Pri každom PR aktualizuj `README.md`: ako hru spustiť, čo je hotové, čo sa robí ďalej.
