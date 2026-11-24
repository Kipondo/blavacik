# Pravidlá ulice – ako vyzerajú cesty v skutočnosti a ako to robí hra

Zhrnutie pre #136 (pravidlá ulice), časť 3. Vychádza z bežného vodorovného značenia na Slovensku (vyhláška
o dopravných značkách: V1a plná čiara, V2a/V2b prerušovaná čiara, V4 vodiaca čiara, V13 šikmé rovnobežné čiary,
V14 cyklistický pruh, V15 piktogram bicykla) a z toho, ako to vyzerá na bratislavských uliciach (Mýtna,
Radlinského, Vajnorská, Einsteinova). Hra je zábava, nie projekt – cieľ je jasný a čistý dojem, nie každá značka.

## Jazdné pruhy
- **Čiary idú rovnobežne s okrajom vozovky.** Deliace čiary pruhov (prerušované) a vodiace čiary pri okraji
  (plné) sa nikdy nekrížia a nejdú šikmo cez pruh. Lom alebo zúženie cesty je plynulé.
- **Pri križovatke značenie končí** (stopčiara, priechod), cez križovatku pokračuje len výnimočne vodiacimi čiarami.
- **Rozdvojenie a pripojenie:** pruh sa oddeľuje v úzkom kline („V“). Medzi oboma okrajovými čiarami je
  vyšrafovaná alebo zvýšená plocha, nie dve sady čiar cez seba. Platí značenie hlavnej cesty, odbočovací pruh
  má vlastné čiary až od miesta, kde sa od nej oddelí.
- **Rozdelená cesta** (dva jazdné pásy) má medzi pásmi deliaci pás – trávu, obrubník alebo električkovú trať.

**V hre:**
- pás cesty má rovnakú šírku od prvého bodu (oprava chyby, ktorá pás na začiatku každej cesty zúžila – odtiaľ
  boli šikmé čiary);
- kde sa vozovky dvoch ciest prekrývajú, kreslí čiary len dôležitejšia z nich (trieda, šírka, počet pruhov –
  `prednostZnacenia` v `js/mapa/cesty/cesty.js`);
- kontrola `znacenie-cez-seba` (`tools/kontrola/mapa/kontroly-mapy.js`) počíta miesta, kde by čiary dvoch ciest
  ležali na sebe.

## Cyklopruhy
- **Cyklistický pruh je pri pravom okraji** vozovky v smere jazdy, široký 1,25–1,5 m, v Bratislave červený,
  oddelený plnou bielou čiarou a s piktogramom bicykla. Pri obojsmernej ceste je jeden na každej strane.
- Pruh ide rovnobežne s okrajom, **nikdy krížom cez cestu**. Na križovatke pokračuje farebným pásom alebo sa preruší.

**V hre:** cyklopruh je posunutý od osi cesty rovnako ako okraj asfaltu (rovnaká oprava prvého bodu ako pri
pruhoch – predtým začínal v strede cesty, a preto sa ľavý a pravý pruh krížili do „X“).

## Ostrovčeky a deliace pásy
- **Dopravný ostrovček** je zvýšená plocha medzi jazdnými pruhmi (pri odbočovacích pruhoch, na námestiach,
  pri priechodoch). Lemuje ho obrubník, vnútri je tráva alebo dlažba.
- **V hre sú všetky ostrovčeky zelené** (tráva aj tam, kde OSM uvádza betón) s obrubníkom po obvode a bez
  chodníka, aby bolo na prvý pohľad jasné, kde je cesta a kde ostrovček.
- **Ako ich hra nájde** (`js/mapa/cesty/ostrovceky.js`):
  - **ostrovček** je stena rovinného grafu ciest pre autá, ktorá splní tieto podmienky:
    - plocha medzi osami je menšia ako 1 500 m², alebo ide o úzky pás so strednou šírkou do 12 m;
    - nie je v nej budova;
    - po odpočítaní vozoviek ostane kus zelene;
  - **deliaci pás** je priestor medzi jednosmerným pásom hlavnej cesty a protismerným pásom vľavo od neho
    (medzera 0,3–12 m, bez budovy). Nájde sa aj tam, kde trieda prechádza cez hranicu dlaždice.

## Chodníky
- **Chodník popri ceste:** vozovka – obrubník – (pás zelene so stromami) – chodník – zeleň alebo predzáhradka.
  Okraje sú rovné a rovnobežné, šírka je stála.
- **Samostatný chodník v parku alebo na sídlisku** má stálu šírku, rovné úseky a plynulé oblúky. Hrana medzi
  dlažbou a trávou je ostrá, často s nízkym betónovým obrubníkom (palisádou).
- **Trávnik siaha až po chodník** – medzi nimi nie je pás holej zeme.

**V hre:**
- osi chodníkov sa zjednodušia a zaoblia rovnako ako cesty (`upravOsiCiest`);
- dlažba má ostrú hranu bez svetlého a zeleného lemu (`js/mapa/teren/material-zeme.js`);
- trávniky z OSM sa natiahnu o 1,5 m k chodníku (`js/mapa/teren/textura-zeme.js`);
- chodníky v zeleni majú nízke obrubníky (`js/mapa/cesty/obrubniky-chodnikov.js`). Na námestiach, parkoviskách,
  v historickom jadre, pri budovách a pri cestách obrubníky nie sú.
