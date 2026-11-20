# Blava City – pravidlá projektu

Zábavná 3D hra v prehliadači v štýle open-world akčných hier, odohráva sa v Bratislave.
Ide len o srandu. **Nepoužívaj názov GTA ani nič z originálnych hier** (logá, hudba, postavy, texty).
Na projekte pracujú dvaja ľudia naraz (z dvoch rôznych Claude účtov) – pravidlá nižšie sú na to, aby sme si neprepisovali prácu.

## Hra
- Mapa: Staré Mesto, nábrežie Dunaja, Most SNP (s UFO), Bratislavský hrad, Eurovea.
- Budovy a cesty z OpenStreetMap (vysunuté pôdorysy s výškou); kým nie sú OSM dáta, používa sa zjednodušená ručná mapa.
- Chodenie pešo, nastupovanie/vystupovanie z áut, jazda s jednoduchou fyzikou a kolíziami.
- Kamera za postavou/autom, ovládanie klávesnicou a myšou. **Hra je len pre PC** (mobil sa nerieši).
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
js/kamera/            kamera za postavou/autom
js/mapa/              načítanie mapy (ručná + OSM), kolízie, geometria, obloha
js/mapa/teren/        výškopis (kopce, koryto Dunaja, mosty) a model zeme
js/mapa/budovy/       vysunuté budovy, textúra okien
js/mapa/cesty/        cesty, námestia
js/mapa/voda/         Dunaj
js/mapa/mosty/        všeobecný model mosta
js/mapa/zelen/        stromy
js/mapa/pamiatky/     jedna stavba = jeden súbor (<model>.js) + záznam v data/mapa/pamiatky.json
js/auto/              fyzika auta, model auta, správa áut, riadenie hráčom
js/chodec/            hráč pešo, NPC chodci
js/policia/           hviezdičky, policajné autá, zatknutie
js/misie/             engine misií (číta data/misie/*.json)
js/dialogy/           zobrazovanie dialógov (číta data/dialogy/*.json)
js/doprava/           NPC doprava, semafory
js/ui/                HUD, minimapa, menu, názvy miest
js/zvuk/              syntetizované zvuky (žiadna cudzia hudba)
data/mapa/            ručná mapa (JSON), pamiatky, pomenované miesta
data/osm/             export z OpenStreetMap (GeoJSON)
data/misie/           jedna misia = jeden JSON súbor (formát v FORMAT.md)
data/dialogy/         jeden dialóg / sada dialógov = jeden JSON súbor
napady/               dizajn hry, príbeh, nápady (markdown)
tools/                pomocné skripty (napr. generovanie ručnej mapy)
vendor/               knižnice tretích strán (three.js)
```

## Pravidlá práce v gite
1. **Nikdy nepracuj priamo v `main`.** Každá úloha = samostatná vetva:
   `feature/<krátky-popis>` (napr. `feature/misia-hrad`, `feature/policia-vrtulnik`),
   opravy `fix/<popis>`.
2. Pred začatím: `git checkout main && git pull`, potom `git checkout -b feature/...`.
3. Commituj často, s krátkou správou po slovensky.
4. Po dokončení pushni vetvu a **otvor pull request** do `main` s popisom, čo sa zmenilo a ako to otestovať.
5. Pred PR si stiahni najnovší `main` a vyrieš konflikty u seba vo vetve.
6. Do `main` sa merguje len cez PR.

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
- Hra je **len pre PC** (klávesnica + myš); dotykové ovládanie a mobilný výkon sa neriešia.
- Žiadny obsah z originálnych hier, žiadne značky firiem, žiadne reálne osoby.

## README.md
Pri každom PR aktualizuj `README.md`: ako hru spustiť, čo je hotové, čo sa robí ďalej.
