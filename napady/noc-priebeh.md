# Nočná práca 22. 11. 2026 – priebeh

Zadanie majiteľa (správa o 00:59): pracovať samostatne celú noc, dodržiavať CLAUDE.md, nič sa nepýtať,
každá úloha = nová vetva z aktuálneho `main`, PR do `main` (popis, návod na test, snímky pred/po, README),
**do main nemergovať**, po každom PR komentár do issue. Ráno súhrn do #59 + 3 najväčšie problémy ako issues.
Keď sa niečo zasekne na viac ako 45 minút, zapísať prečo a ísť ďalej.

Tento súbor je na vetve `feature/noc-priebeh` (PR otvorený na konci noci). Pracovné kópie: `/home/claude/<vetva>`
(git worktree z `/home/claude/blavacik`). Pozor: `origin/main` sa obnovuje príkazom
`git fetch origin main:refs/remotes/origin/main` (bežný `git fetch` ho neobnoví).

## Fázy
1. **#101** titulka v2 (večerné pozadie s pamiatkami, Ďoďo bez igelitky, ploché tlačidlá, BLAVÁČIK, erb)
   + načítavanie (mapa Slovenska s reliéfom, vlak Košice → Bratislava podľa skutočného načítavania, bez lišty).
   Podklady: vetva `hlasenia`, `docs/hlasenia/2026-11-22/titulka/`.
2. **Kvalita mesta**: a) #62, #64, #65, #67, #68, #69, #70, #71, #72, #73, #75, potom #52, #53, #54 – opravy
   v generátore `tools/mesto/`, pregenerovať dlaždice, snímky pred/po (ulica aj zhora) + kontrola 5 iných miest.
   b) pamiatky ako presné modely, každých 5 stavieb jeden PR s tabuľkou stavba | pred | po.
   Priorita: Staré Mesto, Mlynská dolina.
3. Ak zostane čas: #96 (chôdza, fyzika, chodci), #97 (vozidlá – rozpracované v `/home/claude/vozidla2`).

## Hotové
- (pred nocou) PR #100 Átriaky – úprava podľa spätnej väzby: bez vonkajších schodov, ochoz z izby 314,
  vchod so šípkou a značkou na minimape, kamera a terasy, kolízie (commit e9b3d18, komentár v #91).
- **#101 → PR #102** `feature/titulka-v2`: titulka v2 + načítavanie s vlakom (reliéf `tools/ui/relief_slovenska.py`).
  Komentár v #101. Testy: Playwright `/tmp/tit/test.py` (titulka, Nastavenia, Ovládanie, pauza), `/tmp/tit/nac.py`.

- **#53/#64 → PR #103** `feature/lod2-centrum`: LOD2 strechy, stromy a terén z lasera v 64 dlaždiciach
  (`--sirsie-centrum`), budovy.py nemení časti nad priechodmi. Komentáre v #53 a #64.
- **Overenie zoznamu chýb (fáza 2a):** #62, #65, #67, #68, #69, #70, #71, #72, #75 už vyriešili skoršie PR
  (#78, #80, #45, #35, #79) – v hre (main) som overil obchodný dom s hodinami, záhony a truhlíky, Manderlák z tehly.

- **Fáza 2b → PR #104** `feature/pamiatky-presne-1`: Slavín, Modrý kostolík (`tools/blender/presne/`), Grasalkovičov
  palác (portikus), `nahlad-pamiatky.html`. Ostatné stavby zo zoznamu prezreté v náhľade – OK; SND a Reduta čakajú
  na podklady. Komentár v #59.

- **#53/#64 doplnenie PR #103**: LOD2 aj na Nivách a v Petržalke (spolu 96 dlaždíc).
- **#97 → PR #105** `feature/vozidla-typy`: typy áut, farby, taxíky Hladoš/Fičák, kuriéri, jazda podľa typu.
- **#96 → PR #106** `feature/chodza-plynula` (03:10): blend space stoj–chôdza–klus–beh so spoločnou fázou kroku,
  krok zmeraný z klipu (`js/chodec/postava/krok.js`) – chôdza bez kĺzania nôh, rozbeh/brzdenie, otáčanie 540 °/s,
  náklon do zákruty, kĺzanie popri stene, rezerva na skok; výšky chodcov z normálneho rozdelenia. GIF pred/po.
  Komentár v #96. Nespravené: nové klipy (dlhší krok behu), foot IK, hlava za kamerou, oblečenie podľa počasia,
  limit schodu 0,35 m (riziko zaseknutia na švoch terénu).
  Doplnok (03:50): nohy na teréne (IK, chodidlo so svahom) a hlava za kamerou – `telo-na-terene.js`.

- **PR #100 doplnok** (commit 2ce6f7d): nápovedy pri dverách internátu neboli vidieť – HUD ich každý snímok skryl;
  teraz idú cez `hra.stav.napoveda`. Komentár v PR #100.
- **#97 → PR #107** `feature/kolobezky` (03:35): zdieľané kolobežky Fičák na chodníkoch (InstancedMesh), jazda 25 km/h
  s náklonom, Ďoďo drží riadidlá (IK), E nasadnúť/zosadnúť. Komentár v #97.
  Doplnok (03:40): mestské bicykle – sedí, šliape (IK na pedále), Shift šprint 35 km/h; spoločná fyzika `vozidlo.js`.
  Doplnok (04:00): ľudia na kolobežkách a bicykloch po cyklopruhoch (`npc-jazdci.js`, max. 6, LOD1 za 25 m).

- **Hoverboard a onewheel** v PR #107 (05:55).
- **#60 → PR #108** `feature/kontrola-trasa`: testovacia trasa mesta (`tools/kontrola/trasa.py`, 17 bodov, galéria
  a porovnanie behov), prvý beh `docs/kontrola/2026-11-22/`. Komentár v #60 so zoznamom nájdených chýb.
- **#96 doplnok:** rozhliadanie pri státí (PR #106).
- **#111 → PR #112** `fix/budovy-na-svahu` (06:15): prízemie domu na svahu v strede rozdielu výšok (najviac 0,75 m
  pod najvyšším bodom) – Michalská 1,3 m → 0,65 m; snímky z testovacej trasy. Komentár v #111.
- **Ráno (06:20):** issues #109 (laser na celé mesto), #110 (výkon detailných dlaždíc), #111 (domy na svahu);
  súhrn s poradím zlučovania v #59 (komentár 7074653464). Tento súbor je v PR #113.

## Rozpracované
- (nič – všetko je v PR)

## Ďalšie na rade
- Doladiť body trasy (Hlavná stanica, Kamzík, Obchodná, Aupark) a pustiť trasu s `--gpu` po každom PR o meste.
- #111 poriadne: prízemie podľa uličnej strany a schodovité prízemie dlhých domov.
- #110 výkon: LOD zeme po štvorcoch, stromy bližšie, LOD pamiatok.
- #109 laser na celé mesto – po rozhodnutí o veľkosti dát.

## Rozhodnutia a poznámky
- Otvorené PR z predchádzajúcich dní (#98, #99, #100) ostávajú nezlúčené – majiteľ v noci zakázal merge.
- Dvojice otvorených PR som skúsil zlúčiť: skutočný konflikt v kóde je len #99 × #102 (`css/style.css`,
  `js/mapa/dlazdice/sprava-dlazdic.js`); `js/moduly.js` a `README.md` stačí spojiť (ponechať oba riadky).
- V sandboxe sú len 2 jadrá a 7 GB RAM – dva prehliadače naraz spadnú (Target crashed), trasa beží ~5 min na bod.
