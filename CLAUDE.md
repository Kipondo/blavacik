# Blava City – pravidlá projektu

Zábavná 3D hra v prehliadači v štýle open-world akčných hier, odohráva sa v Bratislave.
Ide len o srandu. **Nepoužívaj názov GTA ani nič z originálnych hier** (logá, hudba, postavy, texty).
Na projekte pracujú dvaja ľudia naraz (z dvoch rôznych Claude účtov) – pravidlá nižšie sú na to, aby sme si neprepisovali prácu.

## Hra
- Mapa: Staré Mesto, nábrežie Dunaja, Most SNP (s UFO), Bratislavský hrad, Eurovea.
- Budovy a cesty z OpenStreetMap (vysunuté pôdorysy s výškou); kým nie sú OSM dáta, používa sa zjednodušená ručná mapa.
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
js/mapa/              načítanie mapy, budovy, cesty, Dunaj, mosty, kolízie
js/auto/              fyzika auta, modely áut, doprava (NPC autá)
js/chodec/            hráč pešo, NPC chodci
js/policia/           hviezdičky, policajné autá, zatknutie
js/misie/             engine misií (číta data/misie/*.json)
js/dialogy/           zobrazovanie dialógov (číta data/dialogy/*.json)
js/ui/                HUD, minimapa, menu, dotykové ovládanie
js/zvuk/              syntetizované zvuky (žiadna cudzia hudba)
data/mapa/            ručná mapa (JSON)
data/osm/             export z OpenStreetMap (GeoJSON)
data/misie/           jedna misia = jeden JSON súbor
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

## Pravidlá kódu
- Kód rozdeľ do **malých samostatných súborov podľa oblastí** (mapa, auto, chodec, polícia, misie, dialógy, UI).
  Jeden súbor = jedna zodpovednosť. Nové veci pridávaj radšej ako nový súbor než do cudzieho.
- `js/main.js` a `js/config.js` sú spoločné – meň ich čo najmenej a len s jasným dôvodom v PR.
- **Misie a dialógy sú dáta (JSON), nie kód.** Nová misia = nový súbor v `data/misie/` + záznam
  v `data/misie/zoznam.json`; nový dialóg = súbor v `data/dialogy/`. Engine misií sa mení len vtedy,
  keď treba nový typ kroku.
- **Komentáre v kóde a všetky texty v hre sú po slovensky.**
- Bez build procesu a bez npm závislostí v hre; knižnice idú do `vendor/`.
- Hra musí fungovať aj na mobile (dotyk) – pri každej novej funkcii mysli aj na ovládanie dotykom.
- Žiadny obsah z originálnych hier, žiadne značky firiem, žiadne reálne osoby.

## README.md
Pri každom PR aktualizuj `README.md`: ako hru spustiť, čo je hotové, čo sa robí ďalej.
