# Formát misií a dialógov

Misie a dialógy sú **iba dáta (JSON)**. Na novú misiu netreba písať kód:
stačí nový súbor v `data/misie/` a jeho názov v `data/misie/zoznam.json`.
Engine misií (`js/misie/`) ich načíta sám.

> Tip: JSON nesmie mať čiarku za poslednou položkou a všetky texty sú v úvodzovkách `"..."`.
> Ak si nie si istý, skontroluj súbor na https://jsonlint.com

---

## 1. Zoznam misií – `data/misie/zoznam.json`

```json
{
  "misie": [
    "halusky-pre-stryka.json",
    "moja-nova-misia.json"
  ]
}
```

Poradie v zozname = poradie v hre. Misia sa odomkne, keď hráč dokončí tú predchádzajúcu
(ak nemá `"vzdy_dostupna": true`).

---

## 2. Misia – `data/misie/<id>.json`

```json
{
  "id": "halusky-pre-stryka",
  "nazov": "Halušky pre strýka",
  "popis": "Strýko Jožo potrebuje doniesť halušky na Eurovea, kým vychladnú.",
  "start": { "miesto": "hlavne-namestie", "polomer": 4 },
  "zadavatel": { "meno": "Strýko Jožo", "farba": "#f2c14e" },
  "odmena": 500,
  "vzdy_dostupna": false,
  "kroky": [
    { "typ": "dialog", "dialog": "strycek-jozo-halusky" },
    { "typ": "nastup_do_auta", "text": "Nájdi si nejaké auto." },
    { "typ": "dojdi", "ciel": "eurovea", "v_aute": true, "limit": 120, "text": "Odvez halušky na Eurovea!" },
    { "typ": "sprava", "text": "Halušky doručené. Ešte teplé!", "trvanie": 3 }
  ],
  "pri_zlyhani": "Halušky vychladli. Strýko je sklamaný."
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | áno | Jedinečný názov bez medzier a diakritiky. Rovnaký ako názov súboru. |
| `nazov` | áno | Názov misie, ktorý vidí hráč. |
| `popis` | nie | Krátky popis (napr. v zozname misií). |
| `start` | áno | Kde misia začína. Hráč tam vidí značku a misia sa spustí, keď do nej vojde. |
| `zadavatel` | nie | Kto misiu dáva (meno a farba značky). |
| `odmena` | nie | Peniaze za dokončenie (€). |
| `vzdy_dostupna` | nie | `true` = dá sa hrať hneď, bez dokončenia predošlých. |
| `kroky` | áno | Zoznam krokov, idú postupne jeden po druhom. |
| `pri_zlyhani` | nie | Text, ktorý sa ukáže, keď misia zlyhá. |

### Miesto (`miesto` / `ciel`)

Všade, kde sa zadáva poloha, môžeš použiť:

- **názov miesta** zo súboru `data/mapa/miesta.json`, napr. `"eurovea"`, `"hrad"`, `"ufo"`
- **alebo súradnice** `{ "x": 120, "z": -40 }` v metroch (x = východ, z = juh, 0,0 = Hlavné námestie).
  Súradnice zistíš v hre klávesou **P** (vypíše polohu hráča).

---

## 3. Typy krokov

Každý krok má `"typ"`. Pole `"text"` je voliteľný pokyn, ktorý sa zobrazí hore na obrazovke.

### `dialog` – rozhovor
```json
{ "typ": "dialog", "dialog": "strycek-jozo-halusky" }
```
Zobrazí dialóg zo súboru `data/dialogy/strycek-jozo-halusky.json`. Hra sa počas dialógu zastaví,
hráč posúva repliky klávesou Medzerník / Enter alebo ťuknutím.

### `dojdi` – dostaň sa na miesto
```json
{ "typ": "dojdi", "ciel": "hrad", "polomer": 10, "v_aute": true, "limit": 90, "text": "Hor sa na hrad!" }
```
| Pole | Povinné | Popis |
|---|---|---|
| `ciel` | áno | Miesto alebo súradnice. |
| `polomer` | nie | Ako blízko treba byť (m). Predvolené 8. |
| `v_aute` | nie | `true` = treba prísť autom, `false` = pešo. Bez poľa = je to jedno. |
| `limit` | nie | Časový limit v sekundách. Po uplynutí misia zlyhá. |

### `nastup_do_auta` – nastúp do auta
```json
{ "typ": "nastup_do_auta", "text": "Nájdi si auto.", "farba": "#c8102e" }
```
Bez `farba` stačí ľubovoľné auto. S `farba` musí hráč nastúpiť do auta s touto farbou
(engine ho vtedy pristaví pri hráčovi, ak také auto na mape nie je).

### `nahanacka` – dobehni cieľové auto
```json
{
  "typ": "nahanacka",
  "auto": { "start": { "x": 700, "z": -100, "uhol": 3.14 }, "farba": "#ffffff" },
  "trasa": ["stare-mesto-sever", "eurovea", "ufo"],
  "rychlost": 22,
  "vzdialenost": 6,
  "limit": 120,
  "text": "Dobehni bieleho taxikára!"
}
```
| Pole | Povinné | Popis |
|---|---|---|
| `auto` | áno | Kde sa cieľové auto objaví (`start`) a akej je farby. |
| `trasa` | áno | Miesta, cez ktoré auto postupne ide. Keď dôjde na koniec, ide odznova. |
| `rychlost` | nie | Rýchlosť cieľového auta v m/s (20 ≈ 72 km/h). Predvolené 18. |
| `vzdialenost` | nie | Ako blízko treba prísť, aby si ho „chytil“ (m). Predvolené 6. |
| `limit` | nie | Časový limit v sekundách. |

### `zbav_sa_policie` – strať políciu
```json
{ "typ": "zbav_sa_policie", "hviezdicky": 2, "text": "Polícia ti je v pätách!" }
```
Hráč dostane zadaný počet hviezdičiek (1–5). Krok je splnený, keď hviezdičky klesnú na 0.

### `sprava` – krátka správa
```json
{ "typ": "sprava", "text": "Výborne!", "trvanie": 3 }
```
Zobrazí text na `trvanie` sekúnd (predvolené 3) a pokračuje ďalej.

---

## 4. Dialóg – `data/dialogy/<id>.json`

```json
{
  "id": "strycek-jozo-halusky",
  "postavy": {
    "jozo": { "meno": "Strýko Jožo", "farba": "#f2c14e" },
    "hrac": { "meno": "Ty", "farba": "#ffffff" }
  },
  "repliky": [
    { "kto": "jozo", "text": "Počuj, máš vodičák?" },
    { "kto": "hrac", "text": "Niečo také." },
    { "kto": "jozo", "text": "To mi stačí." }
  ]
}
```

| Pole | Povinné | Popis |
|---|---|---|
| `id` | áno | Rovnaký ako názov súboru. |
| `postavy` | áno | Kto v dialógu hovorí: kľúč (krátky názov) → meno a farba mena. |
| `repliky` | áno | Repliky v poradí. `kto` = kľúč postavy, `text` = čo povie. |

Rady na písanie:
- Jedna replika = max. 2 krátke vety, nech sa to dá čítať aj na mobile.
- Humor áno, urážky skutočných ľudí nie. Žiadne skutočné osoby ani značky firiem.

---

## 5. Pomenované miesta – `data/mapa/miesta.json`

Ak potrebuješ nové miesto, pridaj ho sem (kľúč bez medzier a diakritiky):

```json
{ "moje-miesto": { "nazov": "Pri fontáne", "x": 10, "z": -20 } }
```

---

## 6. Kontrolný zoznam pre novú misiu

1. Napíš dialógy do `data/dialogy/<id>.json`.
2. Napíš misiu do `data/misie/<id>.json`.
3. Pridaj názov súboru do `data/misie/zoznam.json`.
4. Ak treba, pridaj miesta do `data/mapa/miesta.json`.
5. Spusti hru lokálne a misiu si zahraj.
6. Commit do vlastnej vetvy (napr. `feature/misia-halusky`) a otvor PR.
