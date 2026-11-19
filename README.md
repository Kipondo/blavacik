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
- **Mapa zo skutočnej Bratislavy (OpenStreetMap):** ~5 800 budov s reálnymi pôdorysmi a výškami,
  ~2 000 ulíc s názvami, šírkami a jednosmerkami, chodníky, cyklotrasy, električkové trate,
  parky, trávniky, námestia, ~14 000 stromov, Dunaj, Most SNP, Starý most, Most Apollo.
  Oblasť: Staré Mesto, Hradný kopec, Palisády, nábrežie, Eurovea, Nivy, Petržalka po Aupark.
- **Terén:** Hradný kopec (~50 m nad nábrežím), Palisády a Slavín, mierne stúpanie Starého Mesta,
  Dunaj v koryte 5 m pod nábrežím s kamennými nábrežnými múrmi a zábradlím, nájazdy na mosty.
  Auto aj chodec idú po teréne (auto sa nakláňa).
- **Pamiatky (low-poly modely na skutočných miestach):** Bratislavský hrad, Národná rada, Katedrála sv. Martina
  so zlatou korunou, Michalská brána, Stará radnica, Maximiliánova fontána, Primaciálny palác, historická SND,
  Reduta, Prezidentský palác, Modrý kostolík, Most SNP s pylónom, UFO a lanami, Starý most (priehradový),
  Most Apollo (oblúk), Nová SND, mrakodrap pri Eurovei, Slovenský rozhlas (obrátená pyramída),
  Kamzík s televíznou vežou na horizonte. Sklenené fasády pre Eurovea, Aupark, Tower 115, Nivy…
- **Doprava a značky:** cesty s jazdnými pruhmi a značením (prerušovaná/dvojitá plná, krajnice), čisté plochy
  križovatiek, chodníky s obrubníkmi, zebry (~900 z OSM), električkové koľaje, ~215 semaforov so striedaním fáz,
  značky STOP, daj prednosť, zákaz vjazdu, jednosmerka, obmedzenie rýchlosti, modré tabule s názvami ulíc,
  ~780 pouličných lámp. Graf ciest pre NPC dopravu (`data/mapa/graf-ciest.json`, modul `hra.doprava`).
- **Hráč pešo:** chôdza, beh, skok, kolízie s budovami, stromami a autami.
- **Autá:** arkádová fyzika (plyn, brzda, cúvanie, drift ručnou brzdou), kolízie, nárazy medzi autami.
- **Kamera** za postavou/autom, dá sa otáčať, pri rýchlosti sa rozšíri zorné pole.
- **Ovládanie** klávesnicou aj dotykom (joystick + tlačidlá).
- **HUD:** rýchlomer, nápoveda, krátke správy, názov miesta pri pamiatkach.
- **Formát misií a dialógov:** [data/misie/FORMAT.md](data/misie/FORMAT.md) (PR #1).

## Čo ďalej
- NPC doprava a chodci (dáta sú pripravené v `data/mapa/graf-ciest.json`).
- `feature/grafika` – krajšie autá, postavy, stromy, fasády, osvetlenie, denná doba.
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

## Doprava pre ďalšie moduly
- `hra.doprava.graf` – uzly a hrany ciest (pruhy, jednosmerky, max. rýchlosť), `hra.doprava.hranyZUzla(i)`, `hra.doprava.najblizsiUzol(x, z)`
- `hra.doprava.semafor(x, z, smerX, smerZ)` → `'zelena' | 'oranzova' | 'cervena' | null` pre vozidlo, ktoré sa blíži ku križovatke

## Ako pridať stavbu (pamiatku)
Nový súbor `js/mapa/pamiatky/<nazov>.js` + záznam v `data/mapa/pamiatky.json`.
Návod je v [js/mapa/pamiatky/nacitaj-pamiatky.js](js/mapa/pamiatky/nacitaj-pamiatky.js), príklad je `hrad.js`.

## Mapa
- **OpenStreetMap:** `data/mapa/osm.json` – vyrába ho `node tools/osm/stiahni.mjs && node tools/osm/prevod.mjs`.
  Návod (aj ručný export cez overpass-turbo) je v [data/osm/README.md](data/osm/README.md).
- **Výškopis a štart:** `data/mapa/zakladna.json` (kopce, svahy, štart hráča, ulice pre zaparkované autá).
- **Záložná ručná mapa** (keď OSM chýba): `zakladna.json` + `budovy.json` (`node tools/generuj-mapu.mjs`).
- Mapové dáta © prispievatelia OpenStreetMap, licencia ODbL.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
