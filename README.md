# Blava City

Zábavná 3D hra v prehliadači, odohráva sa v Bratislave. Len pre srandu.

## Ako hru spustiť
- **Online:** GitHub Pages (Settings → Pages → Source: *Deploy from a branch*, vetva `main`, priečinok `/ (root)`).
  Hra potom beží na `https://kipondo.github.io/blavacik/`.
- **Lokálne:** v priečinku projektu spusti `python3 -m http.server 8000` a otvor `http://localhost:8000`
  (cez dvojklik na `index.html` to nepôjde – prehliadač nedovolí načítať moduly a JSON zo súboru).

## Ovládanie
| | Klávesnica | Mobil |
|---|---|---|
| Chôdza / jazda | W A S D alebo šípky | joystick vľavo |
| Beh / ručná brzda | Shift / Medzerník | ⚡ |
| Skok | Medzerník | ⤒ |
| Nastúpiť / vystúpiť | E | E |
| Kamera | ťahanie myšou | ťahanie prstom |
| Pauza | Esc | ❚❚ |
| Vypísať polohu (pre misie) | P | – |

## Čo je hotové
- **Základ hry:** úvodné menu, pauza, herná slučka, modulárne jadro (`hra.pridajModul`).
- **Mapa (zjednodušená):** Staré Mesto, nábrežie, Dunaj, Most SNP, Hradný kopec s hradom, Petržalka,
  ~3 600 budov s oknami a strechami, ~3 700 stromov, námestia.
- **Terén:** kopce, koryto Dunaja, nájazdy na most. Auto aj chodec idú po teréne (auto sa nakláňa).
- **Hráč pešo:** chôdza, beh, skok, kolízie s budovami, stromami a autami.
- **Autá:** arkádová fyzika (plyn, brzda, cúvanie, drift ručnou brzdou), kolízie, nárazy medzi autami.
- **Kamera** za postavou/autom, dá sa otáčať, pri rýchlosti sa rozšíri zorné pole.
- **Ovládanie** klávesnicou aj dotykom (joystick + tlačidlá).
- **HUD:** rýchlomer, nápoveda, krátke správy, názov miesta pri pamiatkach.
- **Formát misií a dialógov:** [data/misie/FORMAT.md](data/misie/FORMAT.md) (PR #1).

## Čo ďalej
- `feature/teren-a-polohopis` – ulice a nábrežie podľa skutočných súradníc, nábrežné múry, OSM dáta.
- `feature/pamiatky` – Most SNP s UFO, Dóm, Michalská brána, radnica, SND, Eurovea, Kamzík…
- `feature/doprava-a-znacky` – jazdné pruhy, chodníky, prechody, koľaje, semafory, značky, graf ciest.
- Engine misií a dialógov, polícia, minimapa (kamoš).

## Ako pridať vlastný modul
1. Vytvor súbor, napr. `js/policia/policia.js`:
   ```js
   export default {
     nazov: 'policia',
     init(hra) { /* raz po načítaní mapy */ },
     update(dt, hra) {
       // hra.stav.pozicia, hra.stav.auto, hra.stav.rychlostKmh, hra.auta, hra.mapa …
     },
   };
   ```
2. Pridaj ho do `js/moduly.js` (jeden import + jedna položka v zozname).

Všetko, čo modul môže použiť (`hra.stav`, `hra.mapa`, `hra.ui`, `hra.pridajAuto`, udalosti…),
je popísané v komentári na začiatku [js/jadro/hra.js](js/jadro/hra.js).

## Ako pridať stavbu (pamiatku)
Nový súbor `js/mapa/pamiatky/<nazov>.js` + záznam v `data/mapa/pamiatky.json`.
Návod je v [js/mapa/pamiatky/nacitaj-pamiatky.js](js/mapa/pamiatky/nacitaj-pamiatky.js), príklad je `hrad.js`.

## Mapa
- Ručná mapa: `data/mapa/zakladna.json` (cesty, Dunaj, mosty, kopce, námestia, štart).
- Budovy a stromy generuje `node tools/generuj-mapu.mjs` do `data/mapa/budovy.json` – po zmene ciest ho spusti znova.
- Ak existuje `data/osm/bratislava.geojson`, hra použije budovy, cesty a vodu z OpenStreetMap.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
