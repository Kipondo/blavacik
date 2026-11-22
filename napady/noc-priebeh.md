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

## Rozpracované
- #101 titulka a načítavanie – vetva `feature/titulka-v2`.

## Ďalšie na rade
- Fáza 2a: #62 …

## Rozhodnutia a poznámky
- Otvorené PR z predchádzajúcich dní (#98, #99, #100) ostávajú nezlúčené – majiteľ v noci zakázal merge.
