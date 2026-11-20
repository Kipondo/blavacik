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

---

# Etapa 3: Hviezdoslavovo námestie, SND, Reduta, nábrežie

Porovnanie: hra z `main` (20. 11. 2026, 10:51) a Google Street View, len okom. Snímky z hry: `docs/snimky/porovnanie/e3-hra-mozaika.jpg`
(vľavo hore SND, vpravo hore promenáda Hviezdoslavovho námestia, vľavo dole Reduta, vpravo dole nábrežie).

## Historická budova SND a priestor pred ňou
Odkaz (pohľad na východ k SND):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14225,17.10940&heading=95&pitch=8&fov=85

- [ ] [1] **Vysoká štítová budova uprostred pohľadu** – v hre stojí na mieste 48.14225, 17.10940 → smer východ asi 30–50 m
  vysoká krémová budova so štítom (6 podlaží). V skutočnosti je tam otvorený priestor pred divadlom s fontánou
  Ganymedes, kvetinovými záhonmi a lampami. Over, či nejde o zle umiestnenú budovu alebo zdvojený pôdorys
  (OSM budova a zároveň model pamiatky).
- [ ] [1] **SND (historická budova)** – v hre je vidieť len malú zelenú kupolu v diaľke za stromami → v skutočnosti
  dominantná neorenesančná budova blízko pohľadu: krémovobiela fasáda, stĺpy a lodžia v priečelí, sochy,
  zdobená strecha s kupolou. Over polohu a mierku modelu `snd.js` voči OSM pôdorysu.
- [ ] [2] **Fontána Ganymedes** pred divadlom – v hre chýba.
- [ ] [2] **Kandelábre** – pred SND stoja historické lampy s viacerými svietidlami na jednom stĺpe. V hre sú jednoduché lampy.
- [ ] [3] **Rad domov vľavo (Hviezdoslavovo nám., severná strana)** – v skutočnosti 5-podlažné historizujúce domy
  s bohatými fasádami, kaviarne s terasami a slnečníkmi v prízemí.

## Promenáda Hviezdoslavovho námestia
Odkaz (pohľad na východ po promenáde):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14160,17.10760&heading=80&pitch=5&fov=85

- [ ] [1] **Voda na promenáde** – v hre je to kľukatý potôčik s trávnatými brehmi → v skutočnosti pravouhlé **kamenné
  vodné jazierko/kanál** s nízkym kamenným okrajom a zábradlím, okolo dláždená plocha a lavičky.
- [ ] [2] **Stromy** – v hre sú medzi listnatými aj ihličnany (kužeľovité). V skutočnosti sú na promenáde len veľké listnaté
  stromy (platany/javory) s hustou súvislou korunou, ktorá vytvára tieň nad celou promenádou.
- [ ] [2] **Povrch promenády** – v skutočnosti svetlá dlažba/mlat, v hre tmavé kocky a pásy trávy. Trávu nechaj len v záhonoch.

## Reduta a nábrežie
Street View je tu z blízkych bodov len z interiérov (reštaurácie), preto **neoverené**. Porovnaj na leteckom pohľade:
https://earth.google.com/web/@48.14100,17.11050,150a,350d,35y,30h,55t,0r
- [ ] [2] Reduta – v hre dlhá krémová 4-podlažná budova s jednou zelenou kupolou na nároží. Over tvar strechy, nárožné vežičky
  a farbu fasády (v skutočnosti neobaroková, bohato zdobená).
- [ ] [3] Nábrežie (Rázusovo/Fajnorovo) – over stromoradie, električku a nábrežný múr.

## Pokračovanie
Ďalšia etapa: 4 – Hrad, Podhradie, Parlament.

---

# Etapa 4: Hrad, Podhradie, Parlament

Porovnanie: hra z `main` (20. 11. 2026, 10:51) a Google Street View, len okom. Snímky z hry: `docs/snimky/porovnanie/e4-hra-mozaika.jpg`
(vľavo hore nádvorie hradu, vpravo hore Parlament, vpravo dole hrad z diaľky; pohľad vľavo dole je nepoužiteľný – kamera v strome).

## Nádvorie Bratislavského hradu
Odkaz (pohľad na juhovýchod po nádvorí):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14262,17.09940&heading=130&pitch=8&fov=85

- [ ] [1] **Výklady na hrade** – prízemie krídel hradu má v hre veľké tmavé výklady ako obchody → v skutočnosti obyčajné
  okná rovnakého tvaru ako na poschodiach a niekoľko dverí. Hrad (a ďalšie pamiatky, kostoly, úrady) nesmie dostať
  „obchodné“ prízemie. Výklady len pre budovy so `shop`/`amenity` v OSM.
- [ ] [1] **Vikiere na streche hradu** – v skutočnosti má strecha každého krídla dlhý rad vikierov, v hre žiadne.
- [ ] [2] **Fasáda hradu** – v skutočnosti čisto biela, 3 podlažia s pravidelnými oknami so svetlými rámami, bez ríms a šambrán,
  strecha červenohnedá škridla. V hre je fasáda krémová s farebnými pásmi nad oknami. Zjednoduš na bielu, okná v pravidelnom rastri.
- [ ] [2] **Korunná veža (nárožná)** – v skutočnosti biela, vyššia ako krídla, so strmou červenou strechou. Over pomer výšky veže a krídel.
- [ ] [2] **Povrch nádvoria** – svetlé kamenné kocky/dlaždice, v hre tmavé kocky v oblúkoch (rovnaká chyba ako v pešej zóne).

## Hradný kopec z diaľky
Letecký pohľad na porovnanie:
https://earth.google.com/web/@48.14160,17.10050,170a,600d,35y,300h,65t,0r

- [ ] [1] **Holý hnedý svah** – v pohľade z nábrežia je pod hradom veľká béžovohnedá plocha bez zelene → over na leteckom pohľade;
  svah Hradného kopca je v skutočnosti prevažne zelený (trávniky, stromy, záhrady, hradby a terasy).
  Ak ide o chýbajúci `landuse`/zeleň v OSM, doplň predvolenú trávu/stromy na svahy nad určitý sklon.
- [ ] [2] **Hradby a bašty** – pod hradom vedú kamenné hradby a terasy (záhrady), v hre ich nevidno. Over a doplň aspoň hlavné múry.

## Parlament (Národná rada SR)
- [ ] [3] Modernistická budova s pravidelnými oknami celkovo sedí. Over farbu (svetlý kameň) a plochú strechu na leteckom pohľade.

## Neoverené
- Podhradie (Žižkova ulica) – pohľad sa nepodaril, porovnať v ďalšej etape spolu s nájazdom na Most SNP.

## Pokračovanie
Ďalšia etapa: 5 – Most SNP, Starý most, Apollo a najbližšia Petržalka (Aupark, Sad Janka Kráľa).

---

# Etapa 5: Mosty a Sad Janka Kráľa

Porovnanie: hra z `main` (20. 11. 2026, 10:51) a Google Street View, len okom. Snímky z hry: `docs/snimky/porovnanie/e5-hra-mozaika.jpg`
(vľavo hore Most SNP, vpravo hore Starý most, vľavo dole Most Apollo s Eurovea Tower, vpravo dole Sad Janka Kráľa).
Pozor: tri pohľady na mosty sú z hladiny Dunaja (bod vybraný automaticky mimo budov), preto nie sú vhodné na posúdenie vody.

## Mosty
- [ ] [2] **Most SNP, Starý most, Most Apollo** – tvar sedí (pylón s UFO a lanami, priehradové oblúky, oceľový oblúk).
  Over na leteckom pohľade farbu oblúka Apolla a počet polí Starého mosta:
  https://earth.google.com/web/@48.13780,17.11500,150a,2500d,35y,90h,65t,0r
- [ ] [2] **Hladina Dunaja pri pohľade z nízka** – pri kamere tesne nad vodou je celá hladina jednoliato biela/svetlosivá bez vlniek
  a farby. Over z nábrežia (kamera na chodníku), či ide len o odraz oblohy pri ostrom uhle, alebo chybu materiálu vody
  (Fresnel, chýbajúca normálová mapa). Dunaj je v skutočnosti hnedozelenkastý a aj z nízka je na ňom vidieť vlny.
- [ ] [3] **Kamera v strome** – pri Moste SNP stojí strom priamo na nábreží v ceste pohľadu. Over polohu stromov z lasera pri vode.

## Sad Janka Kráľa
Odkaz (pohľad do parku):
https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.13450,17.10950&heading=45&pitch=5&fov=80

- [ ] [1] **Hustota a veľkosť stromov** – v hre veľký otvorený trávnik s riedkymi malými low-poly stromami → v skutočnosti
  najstarší verejný park v strednej Európe: **husto vysadené mohutné staré stromy** (hrubé kmene, koruny 20–30 m),
  ktoré tvoria súvislú klenbu tieňa nad celým parkom. Pod nimi tráva a asfaltové chodníky.
  Ak laser stromy v parku nenašiel (mimo výrezu), použi pre `leisure=park` s historickým charakterom hustú výsadbu veľkých listnatých stromov.
- [ ] [2] **Ihličnany** – v hre sú medzi stromami kužeľovité ihličnany, v parku prevládajú listnaté stromy (platany, duby, gaštany).
- [ ] [2] **Gotická vežička** (presunutá veža Františkánskeho kostola) a **socha Janka Kráľa** – v hre chýbajú.

## Neoverené
- Aupark a sídliská pri Dunaji, Eurovea promenáda – porovnať v etape 6 (Nivy, Mlynské nivy, Eurovea).

## Pokračovanie
Ďalšia etapa: 6 – Nivy, Mlynské nivy, Eurovea.

---

# Kamenné námestie (doplnková etapa)

Porovnanie: hra z `main` (20. 11. 2026, 10:51) a Google Street View, len okom. Snímky z hry: `docs/snimky/porovnanie/k-hra-mozaika.jpg`
(vľavo hore pohľad na západ, vpravo hore na sever, dole letecký pohľad).
Odkazy:
- na západ (Kyjev): https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14465,17.11340&heading=280&pitch=8&fov=90
- na sever (Tesco, trávnik): https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.14465,17.11340&heading=10&pitch=8&fov=90
- letecký pohľad: https://earth.google.com/web/@48.14460,17.11330,150a,450d,35y,330h,60t,0r

- [ ] [1] **Hotel Kyjev (výšková budova)** – v hre z námestia nie je vidieť žiadnu výškovú budovu, v strede stoja 5–6-podlažné farebné domy
  → v skutočnosti dominantná **asi 15-podlažná veža** s hnedou fasádou, zvislými pásmi a balkónmi. Over výšku z lasera
  (Kamenné námestie je mimo výrezu LiDARu, výška je z OSM alebo odhadnutá). Budova pri 48.14453, 17.11238 má v dátach 41,8 m,
  over, či je to Kyjev a či sa vykresľuje v plnej výške.
- [ ] [1] **Obchodný dom Tesco (bývalý Prior)** – v hre veľký biely kváder → v skutočnosti modernistická budova
  s **tmavočervenohnedými zvislými lamelami/pásmi** na hornej fasáde a presklenými vstupmi v prízemí.
- [ ] [1] **Podchod a schodiská** – v Street View je pri Tescu schodisko/rampa vedúca do nižšej úrovne. Over, či vedie do podchodu
  (OSM `tunnel=yes`/`layer=-1` chodníky, `highway=steps`). Ak áno, modeluj **zahĺbený vstup so schodmi, zábradlím a stropom**,
  podchod pod cestou s osvetlením a vchodmi do obchodov. Rovnako over ďalšie podchody a nadchody v meste (napr. pri Hlavnej stanici,
  Trnavské mýto, Patrónka) – teraz sa `tunnel`/`bridge` pre chodníky v kóde mapy vôbec nerieši.
- [ ] [2] **Povrch** – v skutočnosti veľké svetlosivé betónové dlaždice, v hre tmavé kocky v oblúkoch so svetlými pásmi.
- [ ] [2] **Stromy** – v hre zhluk kužeľovitých ihličnanov na západnej strane → v skutočnosti listnaté stromy pri okrajoch,
  žiadne ihličnany v strede.
- [ ] [2] **Okolité budovy na západ** – v skutočnosti sivomodrá kancelárska budova (5–6 podlaží, sklo) a hnedá veža Kyjeva,
  nie rad pestrofarebných historických domov.
- [ ] [3] **Mobiliár** – rad zdieľaných bicyklov, vysoké pouličné lampy, kvetinový záhon na trávniku, zastávky električiek
  na Špitálskej (prístrešky, nástupištia).
