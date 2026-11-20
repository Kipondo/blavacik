# Dáta MHD (VYGENEROVANÉ – needituj ručne)

Vyrába ich `tools/mhd/spracuj.mjs` z oficiálnych GTFS cestovných poriadkov a z dlaždíc mapy.

## Zdroj a licencia
- **Cestovné poriadky, zastávky, linky:** *Cestovné poriadky MHD vo formáte GTFS* – Dopravný podnik
  Bratislava, a. s. / hl. m. SR Bratislava, portál [data.bratislava.sk](https://data.bratislava.sk/datasets/aba12fd2cbac4843bc7406151bc66106/about),
  licencia **CC BY 4.0** (uvádzať zdroj). Aktualizuje sa denne.
- **Trasy po cestách a koľajach:** vypočítané po sieti z `data/mapa/mesto/` → © prispievatelia OpenStreetMap, **ODbL**.
- Pozor: staršie ročné súbory na opendata.bratislava.sk sú pod CC BY-NC 4.0; používame aktuálny súbor s CC BY 4.0.

## Súradnice
Rovnaké ako mapa: metre od Hlavného námestia (48.1435, 17.1077), `x` = východ, `z` = juh.
Prevod sa berie priamo z `tools/mesto/spolocne.mjs` (nekopíruje sa).

## Súbory
### `index.json`
- `zdroj`, `licencia`, `verzia`, `platnostOd`, `platnostDo`
- `linky`: `[{ linka, typ, subor, farba, text, spojov }]` – `typ` = `elektricka` | `trolejbus` | `autobus` | `nocny`
- `sluzby`: zoznam ID služieb (index sa používa v poriadkoch)
- `kalendar`: `{ idSluzby: { dni: [po…ne 0/1], od, do, navyse: [RRRRMMDD], nejazdi: [RRRRMMDD] } }`
  – napr. `Prac.dny_0` (školský pracovný deň), `Leto_1` (prázdninový pracovný deň), `Soboty_2`, `Nedela+sv_3`
- `statistika`: počty a kontrola trasovania (koľko úsekov išlo po sieti mapy, koľko podľa tvaru z GTFS)

### `zastavky.json`
`zastavky: [{ id (kód zastávky), nazov, pasmo, nastupistia: [...] }]`, nástupište:
- `id` (stop_id z GTFS), `oznacenie` (A, B, …), `x`, `z` – poloha z GTFS
- `bod` – miesto na osi cesty/koľaje, kde vozidlo zastaví; `smer` – jednotkový smer jazdy `[dx, dz]`
- `linky` – čísla liniek, `typy` – typy vozidiel

### `trasy/<linka>.json`
`{ linka, typ, trasy: [{ smer, zastavky: [id nástupišťa], znamenie: [0/1], km: [m od začiatku], body: [[x, z]] }] }`
- `znamenie: 1` = zastávka na znamenie (GTFS pickup_type 3)
- `km[i]` = vzdialenosť po `body` k i-tej zastávke

### `poriadky/<linka>.json`
`{ linka, ciele: [text], profily: [[s od odchodu z 1. zastávky pre každú zastávku]], spoje: [[trasa, profil, odchod (s od polnoci), sluzba, ciel]] }`
- Časy môžu byť nad 24 h (nočné spoje patria k predchádzajúcemu prevádzkovému dňu).
- Odchod zo zastávky `i` = `odchod + profily[profil][i]`.

## Obnovenie dát
```
node tools/mhd/stiahni.mjs                              # stiahne .cache/mhd/GTFS_latest.zip
node --max-old-space-size=4000 tools/mhd/spracuj.mjs   # vyrobí data/mhd/
```
Ak sa zmenia dlaždice mapy (`data/mapa/mesto/`), stačí znova spustiť `spracuj.mjs`.
