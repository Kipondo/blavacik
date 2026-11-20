# Návrh: rozšírenie formátu dialógov

Základný formát je v `data/misie/FORMAT.md` (`postavy` + `repliky` s `kto` a `text`).
Dialógy zo scény vo vlaku (`data/dialogy/vlak-*.json`) navyše používajú **voliteľné polia**.
Engine, ktorý ich ešte nepozná, ich jednoducho ignoruje a prehrá repliky po poradí.

## Polia v replike

| Pole | Popis |
|---|---|
| `volby` | Hráč si vyberá odpoveď. Zoznam `{ "text", "efekty", "skok" }`. |
| `efekty` | Zmena ukazovateľov po výbere, napr. `{ "socializacia": 3, "atraktivita": -2, "opitost": 35, "inventar": { "rezen": -1 } }`. |
| `skok` | Pokračuje sa replikou, ktorá má rovnakú `znacka`. |
| `znacka` | Označenie repliky, na ktorú sa dá skočiť. |
| `koniec` | `true` = po tejto replike dialóg skončí. |
| `varianty` | (do budúcna) Ďoďova reč podľa Bratislavskosti: `{ "vychod": "…", "mix": "…", "blava": "…" }`. Ak chýba, použije sa `text`. |

## Príklad

```json
{ "kto": "dodo", "text": "Dakus śe bojim.", "volby": [
  { "text": "„Ta ľem jednu!“", "efekty": { "opitost": 35, "socializacia": 5 }, "skok": "vypil" },
  { "text": "„Ňe, dzekujem.“", "skok": "odmietol" }
] }
```

## Poradie scény vo vlaku (návrh)
1. `vlak-hlasenie` → hráč sa voľne prechádza vagónmi
2. `vlak-babka`, `vlak-opity`, `vlak-pekna-baba`, `vlak-fero` – v ľubovoľnom poradí (pri postavách)
3. `vlak-hlasenie-druhe` – po prvých dvoch rozhovoroch
4. `vlak-revizor` → úloha nájsť lístok (je v taške u babky) → `vlak-revizor-listok`
5. `vlak-prichod` – Hlavná stanica, telefonát od mamy, začína kapitola 1
