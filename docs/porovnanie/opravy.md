# Porovnanie hry so skutočnosťou – zoznam opráv

Jediný súbor so všetkými nájdenými chybami, rozdelený po etapách (od Hlavného námestia smerom von).
Porovnáva sa hra z `main` so Street View / Google Earth **len okom** – odkazy slúžia na pozretie, nič z Google
sa nesťahuje, neukladá do repa ani nepoužíva ako textúra; OpenStreetMap sa podľa Google neupravuje.

**Pre Clauda, ktorý opravy robí:** ber etapy po poradí, v každej najprv priorita 1. Opravené odškrtni (`- [x]`)
a pridaj snímku PRED/PO do `docs/snimky/porovnanie/`. Nové etapy dopĺňa druhý Claude na konci tohto súboru.

Snímky z hry použité pri porovnaní sú v `docs/snimky/porovnanie/`.

---

# Etapa 1: Hlavné námestie a Františkánske námestie

Porovnanie: hra z vetvy `main` (stav 20. 11. 2026, 10:51, po zlúčení LiDAR etapy a2) a Google Street View.
Odkazy na Google slúžia **len na pozretie okom**. Nič z nich nesťahuj, neukladaj do repozitára a nepoužívaj ako textúru.
OpenStreetMap podľa Google neupravuj. Opravy rob len v dátach a kóde hry.

Celkovo: oproti nočnej verzii je to veľký skok (LiDAR výšky, šikmé strechy, dlažba, fasády s detailmi).
Výšky a hmota budov okolo námestia zhruba sedia. Najviac chýb je v pamiatkach, v povrchu námestia
a v detailoch striech a fasád.

Formát: `- [ ] [priorita 1–3] miesto – čo je zle → ako to má byť`

## Odkazy na porovnanie
- Pohľad z rohu Zelenej na Starú radnicu (na východ):
  https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14338,17.10775&heading=80&pitch=3&fov=90
- Pohľad od radnice na severozápadnú stranu námestia:
  https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14345,17.10862&heading=320&pitch=5&fov=95
- Južná strana námestia (pohľad na juh):
  https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14362,17.10815&heading=180&pitch=5&fov=90
- Františkánske námestie (pohľad na sever):
  https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14395,17.10838&heading=340&pitch=5&fov=95
- Letecký 3D pohľad na celé námestie (Google Earth):
  https://earth.google.com/web/@48.14345,17.10860,150a,300d,35y,60h,55t,0r

Rovnaké miesta v hre (súradnice hry: x = (lon − 17.1077) × 74 280, z = −(lat − 48.1435) × 111 132):
kamera vo výške očí 1,7 m, smer podľa „heading“ v odkaze.

## Súpis budov okolo Hlavného námestia (budova po budove)

Názvy sú z OSM v dátach hry (`data/mapa/mesto/d/0_0.json`, `-1_-1.json`, `0_-1.json`), poloha je ťažisko pôdorysu.
Výšky z LiDARu sedia (rozdiel do ~1 podlažia), preto sa súpis týka hlavne farieb, okien, striech a detailov.
Počty okenných osí sú odhad zo Street View, over ich na odkaze.

Odkazy na strany námestia:
- juh a juhovýchod: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14344,17.10866&heading=200&pitch=8&fov=100
- západ a severozápad: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14344,17.10866&heading=275&pitch=8&fov=100
- východ (radnica) a sever: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14338,17.10775&heading=80&pitch=3&fov=90

| # | Budova (OSM v hre), poloha | V hre teraz | V skutočnosti | Oprava |
|---|---|---|---|---|
| 1 | **Dom na východnej strane hneď vedľa radnice** („2 Hlavné námestie“), 48.14332, 17.10881 | biela/krémová `#f5f0e0`, 15,5 m, bordové okenice, obyčajné prízemie | **sivozelená (šalviová) omietka**, prízemie a nárožia s bosážou (kamenné pásy), **tmavozelené okenice**, bohato zdobený kamenný portál so sochami a kamenným oblúkom, kovaná nástenná lampa | farba fasády ~sivozelená, okenice tmavozelené, bosáž prízemia, zdobený portál |
| 2 | **Palác Uhorskej eskontnej a zmenárenskej banky** (južná strana, juhovýchodná časť), 48.14301, 17.10796 | hladká biela fasáda `#f4efe4`, 19,6 m, tmavá plochá mansarda, rovnaké okná | **secesný palác**, krémová/slonovinová fasáda s bohatou štukovou výzdobou, **zvlnené štíty** nad rímsou, medené zelené prvky na streche, **prízemie z tmavosivého kameňa s veľkými výkladmi**, cca 5 podlaží, ~8 osí do námestia | zvlnené štíty, krémová farba, tmavé kamenné prízemie s výkladmi, zelené medené strešné prvky, výraznejšia výzdoba okolo okien |
| 3 | **Palugyaiho palác** (južná strana, juhozápadná časť), 48.14315, 17.10777 | svetlomodrá `#c9d6dc`, 17,9 m, tmavá strecha | **biela až svetlosivá** (nie modrastá), historizujúci palác s **balkónmi s kovaným zábradlím**, bohaté rímsy a šambrány, **tmavá bridlicová mansarda s vikiermi**, cca 4–5 podlaží | farbu na bielosivú, pridať balkóny, vikiere v mansarde |
| 4 | **Kutscherfeldov palác** (severozápad, s francúzskou vlajkou), 48.14375, 17.10761 | biela `#f4efe4`, 12,2 m | **svetložltá/okrová** fasáda, biele šambrány okolo okien, **bez okeníc**, 3 podlažia (prízemie + 2), dlhé priečelie s ~12–13 osami, **červená škridlová strecha s radom ~9 vikierov**, portál s bránou | farbu na svetložltú, vikiere, zrušiť okenice |
| 5 | **„Miestodržiteľský palác“** (podľa OSM, severozápad, pokračovanie priečelia č. 4), 48.14375, 17.10783 | ružová/lososová `#f0c4b4` so zelenými okenicami | v Street View je priečelie súvislé s č. 4: **svetložlté**, rovnaký rytmus okien, bez okeníc | farbu a okná zjednotiť s č. 4; **over názov v OSM**, či nejde o zle priradený pôdorys |
| 6 | Dom na západnej strane vľavo od č. 4, 48.14371, 17.10745 | biela `#f4efe4`, 11,5 m, červená strecha | biela, 3 podlažia, ~5 osí, červená strecha **s vikiermi** | len doplniť vikiere |
| 7 | **Jezuitský kostol** (severovýchodný roh) – pamiatka | béžová budova so štítom | biela fasáda, štít, vysoké oblúkové okná, strmá červená strecha, vežička na hrebeni | pozri prioritu 2 nižšie |
| 8 | **Stará radnica** – pamiatka | biely valec so zeleným kužeľom, žlté krídlo | štvorhranná okrová veža s hodinami, galériou a medeným helmom; biele krídlo s vikiermi a bránou | pozri prioritu 1 nižšie |
| 9 | Zelenoizbový dom, 48.14323, 17.10739; Jesenákov palác, 48.14318, 17.10856; Budova Prvej bratislavskej sporiteľne, 48.14317, 17.10902; Apponyiho palác, 48.14341, 17.10919 | rôzne (lososová, okrová, žltá) | zo Street View z námestia nie sú dobre vidieť | **neoverené**, porovnať v etape 2 z Rybárskej brány, Radničnej a Zelenej |

**Spoločné pre všetky historické budovy na námestí:**
- [ ] [1] **Okenice** – v hre má okenice skoro každý dom (bordové alebo zelené) → v skutočnosti ich má na námestí len dom č. 1.
  Okenice dávaj len tam, kde sú naozaj. Predvolene ich historické budovy nemajú.
- [ ] [1] **Vikiere** – takmer všetky šikmé škridlové strechy okolo námestia majú rad vikierov, v hre nemá vikiere žiadna.
- [ ] [2] **Okná** – v skutočnosti sú okná vyššie, hlavne v 1. poschodí (piano nobile), s bielymi šambránami a rímsami nad oknami.
  V hre sú všetky podlažia rovnaké. Navrhni 1. poschodie o ~20 % vyššie s výraznejšou rímsou nad oknom.
- [ ] [2] **Rámy okien** – v skutočnosti biele alebo svetlé. V hre sú tmavé, a preto fasády pôsobia smutnejšie.

## Priorita 1 – najviac viditeľné

- [ ] [1] **Povrch Hlavného a Františkánskeho námestia** – v hre tmavé drobné kocky ukladané do oblúkov
  → v skutočnosti veľké svetlé sivobéžové kamenné dlaždice/kvádre ukladané v radoch (obdĺžnikový vzor),
  s pásmi tmavšieho kameňa a mrežami odvodnenia. Drobné kocky nechaj v uliciach, na námestiach daj veľké svetlé dlaždice.
- [ ] [1] **Prerušovaná biela čiara cez námestie** – na Hlavnom námestí je v hre vodorovné dopravné značenie
  (vidieť ho pri fontáne a pred juhovýchodnou stranou) → námestie je pešia zóna, žiadne čiary. Skontroluj, či sa
  značenie nekreslí aj na iných pešich zónach (`highway=pedestrian`, `area:highway`).
- [ ] [1] **Veža Starej radnice** – v hre biely valec so zelenou kužeľovou strechou
  → štvorhranná veža po celej výške, okrovožltá omietka, hodiny na stranách, pod strechou vyhliadková galéria
  s balustrádou, navrchu barokový zelený (medený) cibuľovitý helm s lucernou a krížom/hrotom.
- [ ] [1] **Krídlo Starej radnice napravo od veže** – v hre žltá fasáda s pravidelnými oknami a oranžovou strechou bez detailov
  → biela/svetlá fasáda, strmá strecha s vikiermi, v prízemí oblúková brána/podjazd pod vežou, gotický arkier.
  Strecha radnice má farebnú glazovanú škridlu so vzorom – over na leteckom pohľade a aspoň naznač vzorom textúry.
- [ ] [1] **Maximiliánova (Rolandova) fontána** – v hre hladký obelisk v plochej modrej mise
  → okrúhla kamenná nádrž so zdobeným kamenným okrajom/zábradlím, v strede podstavec so stĺpom a **socha rytiera
  v brnení navrchu**. Stĺp je zdobený, nie hladký ihlan.

## Priorita 2

- [ ] [2] **Jezuitský kostol (severovýchodný roh, vľavo od radnice)** – v hre béžová budova so štítom
  → biela fasáda so štítom, vysoké okná, strmá červená strecha a malá vežička (sanktusník) na hrebeni.
- [ ] [2] **Strechy domov na severnej a západnej strane námestia** – v hre hladké škridlové plochy
  → takmer každý dom má rad vikierov (malé okná v streche). Pridaj vikiere pre historické budovy so šikmou strechou
  (podľa LiDARu sa dajú nájsť ako výstupky v streche, inak pravidlom pre `historické` budovy).
- [ ] [2] **Južná strana námestia** – v hre ploché fasády so svetlomodrou/bielou farbou
  → mohutné historizujúce paláce (4–5 podlaží), bohato zdobené fasády s balkónmi, štítmi a nárožnou vežičkou,
  tmavé mansardové strechy. Farby: krémová, svetlosivá, biela. Doplň aspoň balkóny, výraznejšie rímsy a mansardu.
- [ ] [2] **Františkánske námestie – stromy** – v hre aleja 6+ stromov a veľa lavičiek
  → v skutočnosti len 1–2 stromy pri budovách a otvorená dláždená plocha. Over stromy z lasera, či nejde o zle
  priradené body (napr. markízy, stánky), a zredukuj.
- [ ] [2] **Františkánske námestie – Mariánsky stĺp** – v hre chýba
  → v strede námestia vysoký štíhly stĺp so sochou navrchu (barokový morový/mariánsky stĺp).
- [ ] [2] **Veža Františkánskeho kostola** – v pozadí v hre len malá špička
  → výrazná gotická veža so strmou ihlancovou strechou, dominanta pohľadu na sever.

## Priorita 3 – detail a atmosféra

- [ ] [3] **Bronzové sochy** – chýbajú: napoleonský vojak opretý o lavičku (Hlavné námestie), Čumil (roh Rybárskej brány a Panskej),
  Schöner Náci (Sedlárska). Malé low-poly sochy, dôležité pre bratislavskú atmosféru.
- [ ] [3] **Prízemia** – v skutočnosti kaviarne s markízami a slnečníkmi, výklady s oblúkmi; v hre rovnaké tmavé výklady.
  Pridaj markízy a vonkajšie sedenie pri kaviarňach (`amenity=cafe/restaurant` z OSM).
- [ ] [3] **Stromy pri radnici** – v hre plné listnaté koruny → v skutočnosti menšie stromy s lavičkami okolo,
  v Street View bez lístia (jar/zima). Ak bude ročné obdobie, pridaj holé stromy.
- [ ] [3] **Pouličné lampy** – na námestí historické lampy na stĺpoch, skontroluj počet a polohu podľa OSM.

## Neoverené (ďalšia etapa)
- Primaciálne námestie a Primaciálny palác: pohľad v hre bol z nesprávneho miesta (kamera v budove),
  treba ho porovnať v ďalšej etape spolu s Michalskou a Ventúrskou.

## Pokračovanie
Ďalej podľa etáp z komentára v PR #11: etapa 2 = Michalská, Ventúrska, Panská, Michalská brána, Dóm sv. Martina.


---

# Etapa 2: Michalská, Ventúrska, Primaciálne námestie, okolie Dómu

Porovnanie: hra z vetvy `main` (20. 11. 2026, 10:51) a Google Street View.
Odkazy na Google slúžia **len na pozretie okom**. Nič z nich nesťahuj, neukladaj do repozitára a nepoužívaj ako textúru.
OpenStreetMap podľa Google neupravuj. Opravy rob len v dátach a kóde hry.

Formát: `- [ ] [priorita 1–3] miesto – čo je zle → ako to má byť`

## Spoločné pre celú pešiu zónu (platí aj pre etapu 1)
- [ ] [1] **Dlažba** – v Michalskej, Ventúrskej aj na Primaciálnom námestí sú v hre tmavé drobné kocky v oblúkoch
  → v skutočnosti veľké svetlé sivobéžové žulové dosky ukladané v radoch. Platí pre celú pešiu zónu Starého Mesta.
  Drobné kocky nechaj len tam, kde naozaj sú (napr. Hradný kopec, okolie Dómu – over).
- [ ] [2] **Prízemia** – v skutočnosti kaviarne a reštaurácie s terasami (stoly, stoličky, slnečníky, kvetináče),
  firemné štíty a nástenné lampy. V hre sú všade rovnaké prázdne tmavé výklady.
  Pridaj terasy pre `amenity=cafe/restaurant/bar` z OSM a aspoň pár typov výkladov (svetlé, s tovarom, s markízou).

## Michalská ulica a Michalská brána
Odkaz (pohľad na sever na bránu):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.144729,17.106767&heading=350&pitch=8&fov=80

- [ ] [2] **Michalská brána** – v hre biela veža so zelenou cibuľou, celkovo sedí. Over a doplň:
  spodná časť je kamenná gotická brána s prejazdom (svetlý kameň/okrová), horná časť biela baroková nadstavba,
  medená zelená cibuľa s lucernou a **soška archanjela Michala navrchu**. V hre over prejazd a sošku.
- [ ] [2] **Domy pri bráne** – v skutočnosti farebné (ružová, žltá, krémová), 3–4 podlažia, s výkladmi a firemnými štítmi.
  V hre prevládajú olivové a béžové tóny. Zosvetli a pestrejšie zafarbi.
- [ ] [3] **Terasy kaviarní** v strede ulice (stoly, kvetináče s palmami, slnečníky) – v hre žiadne.

## Ventúrska ulica
Odkaz (pohľad na juh):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14400,17.10668&heading=190&pitch=8&fov=80

- [ ] [2] **Barokové paláce** – v skutočnosti majú okná s **frontónmi** (trojuholníkové a oblúkové rímsy nad oknami),
  vysoké okná v 1. poschodí, zdobené portály a balkóny. V hre sú okná ploché s rovnakou rímsou.
  Pridaj typ okna „frontón“ pre historické paláce (OSM `historic`, názov s „palác“ alebo podľa veku).
- [ ] [2] **Dom na konci pohľadu** – v hre biely s modrastým nádychom → v skutočnosti krémový/svetložltý, 3 podlažia,
  nárožie zaoblené, zdobené šambrány okien.
- [ ] [3] **Rohová lampa na stĺpe a smerové tabule** – v skutočnosti historická lampa a ukazovatele pre turistov.

## Primaciálne námestie
Odkaz (pohľad na Primaciálny palác):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14395,17.10945&heading=110&pitch=8&fov=85

- [ ] [1] **Stĺpy Primaciálneho paláca visia vo vzduchu** – v hre sú biele valce len hore pod strechou a nedosahujú na zem
  → v skutočnosti je pred palácom **portikus**: masívne stĺpy (~1 m hrubé) stoja na zemi na podstavcoch
  a nesú balkón v 1. poschodí. Stĺpy musia ísť od dlažby po balkón, nad nimi balkón so zábradlím.
- [ ] [2] **Farba Primaciálneho paláca** – v hre ružová/fialkastá a tmavšia → v skutočnosti svetlá krémová omietka
  s bielymi pilastrami a šambránami. Na štíte navrchu je známy kardinálsky klobúk – over v hre.
- [ ] [2] **Okná paláca** – vysoké, so šambránami a rímsami. V 1. poschodí výrazne vyššie ako ostatné.

## Okolie Dómu sv. Martina
Street View je pri Dóme len z interiéru, preto som porovnával len to, čo bolo vidieť v hre. Over to na leteckom pohľade:
https://earth.google.com/web/@48.14215,17.10530,150a,250d,35y,220h,55t,0r

- [ ] [1] **Visiaci blok budovy nad ulicou** – na mieste 48.14239, 17.10553 (súradnice hry x ≈ −161, z ≈ 123)
  visí nad chodníkom veľký žltý kváder bez opory, akoby budova bola zdvihnutá nad zem.
  Over, či je tam naozaj prejazd alebo podchod. Ak nie, ide o chybu v dátach (`min_height`/`building:part`
  alebo dvor z lasera). Ak áno, prejazd musí mať steny, strop a oblúk, nie len visiacu hmotu.
- [ ] [2] **Trávnik pri Dóme** – v hre veľká plocha trávy hneď pri budovách. Over na leteckom pohľade,
  či tam je park, alebo dláždené priestranstvo.

## Pokračovanie
Ďalšia etapa: Hviezdoslavovo námestie, SND, Reduta, nábrežie po Eurovea.
