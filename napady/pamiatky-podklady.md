<!-- Prieskum pre modely pamiatok (vetva feature/pamiatky-uk-vajce). Zdroje sú na konci; Google Maps/Earth sa nepoužívali (licencia). -->

# Podklady pre 3D modely: UK Šafárikovo nám., Eurovea, Sky Park, Stavebná fakulta STU

Prepočet súradníc OSM na metre robím pre 48,14° s. š.: 1° zem. šírky ≈ 111 194 m, 1° zem. dĺžky ≈ 74 420 m. Vrcholy a rozmery pôdorysov som rátal ručne z uzlov OSM, takže presnosť je asi ±0,5 m.

**K fotkám.** Fotky sa pri tomto prieskume vizuálne overili len pri východnej fasáde UK (Commons „UK budova.jpg“, Xpucmo, CC BY-SA 3.0); ostatné údaje sú z textov a OSM. Fotky sú len na pozretie – do hry sa nič nepreberá.

---

## A) Univerzita Komenského – historická budova, Šafárikovo nám. 6

### Oprava zadania
Žiadny zdroj nespája túto budovu s Uhorskou eskomptnou bankou ani s rokmi 1912–1914.
- **Pôvod:** budova vznikla ako **„Štátny obchodný dom v Bratislave“**. Mala v nej sídliť plodinová burza, dunajská plavebná spoločnosť, obchodná komisia a v suteréne zemský archív.
- **Architekt:** akad. arch. **František Krupka** (1885–1963), víťaz súťaže. Súťaž a návrh sú z roku 1925 (register-architektury.sk), projekty predstavili 17. 9. 1929.
- **Stavba:** demolácie a stavebné povolenie v roku 1930 (27. 3. 1930), stavala Českomoravská stavebná spoločnosť.
- **Univerzita:** v rokoch 1934–35 budovu pridelili univerzite a Krupka projekt prepracoval. Fakulty sa nasťahovali v jeseni 1936, otvorenie bolo 11. 3. 1937.
- **Štýl:** „moderný klasicizmus“. Budova je pamiatkovo chránená.
- **Neskoršie zmeny:** zadná prístavba z roku 1974 podľa Vladimíra Karfíka. Začiatkom 90. rokov rozdelili aulu: dole slávnostná sála, hore amfiteátrová posluchNone, 240 miest.
- **Možná zámena:** ak hľadáš stavbu s fasádou priamo na nábreží z obdobia okolo 1913, najbližšie sedí **Filozofická fakulta, Gondova 2** (Moyzesova sieň). Stojí cez cestu južne od UK, postavená 1905–1913, projektant Josef Rittner, pôvodne pre rakúsko-uhorskú armádu. V OSM je to relation **138873**: architect=Josef Rittner, art nouveau, building:levels=4, roof:shape=hipped, heritage=2. Ohraničenie má približne 84 × 86 m.

### Poloha a ulice
Budova zaberá celý blok:
- na **severe** je Tobrucká,
- na **východe** je Šafárikovo námestie, kde je hlavný vstup,
- na **juhu** je **Vajanského nábrežie**, čo je cesta (OSM highway=secondary). Samotný breh Dunaja je ešte o jeden blok južnejšie, na Fajnorovom nábreží.
- Na **západe** je voľný priestor smerom k Múzejnej ulici.

Južná fasáda teda smeruje k Dunaju, ale nestojí priamo na brehu.

### OSM
| Prvok | Tagy |
|---|---|
| way **1383879681** (obrys budovy) | building=university, building:levels=7, source=ZBGIS (bez height) |
| way **1340711263** (aula) | building:part=yes, name=Aula Univerzity Komenského, building:levels=2, roof:material=glass, roof:shape=gabled |
| way 244497754 | amenity=university, Právnická fakulta UK, source:shape=guess (len areál) |
| uzly 4369112185, 4369116794 | knižnice, addr Šafárikovo nám. 6 |

### Pôdorys
Počiatok súradníc je JZ roh ohraničenia (48.1408339 N, 17.1144758 E), x smeruje na východ, y na sever, v metroch.

Zjednodušený polygón po smere hodín od JZ:
- **Juh:** (7.4,0) → (39.0,4.3) → (62.7,7.4) → schod (62.1,13.7) → (91.3,15.9) → (97.5,16.6) → (102.2,18.3) → JV roh (109.0,18.7)
- **Východ:** (108.4,25.4) → **polkruh** s vrcholom (118.8,37.7) → (105.4,48.3) → SV roh (105.0,55.0)
- **Sever:** (98.1,55.6) → (87.2,53.1) → zárez (58.2,50.0) → (57.4,55.2) → (25.8,54.1) → SZ roh (1.35,51.4)
- **Západ:** (4.0,29.1) → výstupok (0,28.6) → (0.8,21.9) → (4.7,22.4) → späť na (7.4,0)

Rozmery:
- Dĺžka bloku Z–V je **≈ 105 m**, s rotundou **≈ 118 m**.
- Hĺbka S–J je **≈ 51 m na západe** a **≈ 37 m na východe**. Lichobežník zodpovedá popisu „lichobežníková parcela“. Istota vysoká.
- Severná fasáda je dlhá ≈ 104 m, južná ≈ 103 m a je odstupňovaná o ~6 m pri x≈62.
- **Vstupná rotunda** je polvalec so stredom tetivy na (106.9, 36.8), **R ≈ 11,6–12 m**, tetiva ≈ 23 m a vystupuje ~12 m pred fasádu. Istota vysoká.
- **Aula** je približne **28 × 14,6 m** a leží vo východnej časti bloku. Podľa textov má presklenú valenú klenbu a železný krov (F. Schenk, Brno), OSM ju má označenú ako „gabled glass“. Istota vysoká pre rozmery, stredná pre tvar strechy.
- Plocha zastavaná budovou je približne 4 700 m².

### Výšky a podlažia
- **7 nadzemných podlaží** podľa OSM (ZBGIS). Text spomína schodisko medzi 3. a 6. poschodím. Istota stredná.
- Výška je **„až 32 m“** podľa uniba.sk, ide však o údaj z projektu. Istota stredná. Z toho vychádza priemerne ~4,2–4,5 m na podlažie (odvodené).
- Rotunda má odhadom ~20–24 m, hlavný blok ~28–32 m. Je to odhad z jednej fotky skreslenej perspektívou, istota nízka.
- Strecha je **plochá s atikou**; šikmá strecha na fotke nie je. Istota stredná.

### Fasády
Východnú fasádu som videl na fotke, južnú len zboku:
- **Rotunda na Šafárikovo nám.:**
  - Prízemie je hlboká lodžia/arkáda z **masívnych hranolových pilierov** na schodiskovom sokli s nízkymi schodmi po celom obvode. Vstupné dvere sú zapustené. Na fotke je viditeľných ~5–6 pilierov, celkovo odhadom 7–9 polí.
  - Nad arkádou je rímsový pás a nad ním dva rady pravouhlých okien medzi plochými pilastrami/lizénami. Spodný rad má okná s mriežkou ~3×2 tabule, horný rad **vysoké okná** s mriežkou ~3×4 tabule. **Okná sú pravouhlé, bez oblúkov.**
  - Na vlysu pod hlavnou rímsou je nápis **„UNIVERZITA KOMENSKÉHO“** tmavými (bronzovými?) písmenami.
  - Úplne hore je atika s nízkymi kvádrikmi nad pilastrami.
- **Bočné časti hlavného bloku** majú zvislé lizény, zapustené okenné osi, výraznú rímsu v hornej tretine a nad ňou atikové podlažie so štvorcovými zapustenými poľami.
- **Pylóny:** po oboch stranách rotundy stoja na hlavnom bloku **dva komínové/vetracie pylóny** s ozdobnými mrežovými hlavicami.
- **Materiál:** pôsobí ako kamenný alebo umelokamenný kvádrový obklad pieskovo-okrovej farby. Texty spomínajú travertín, ale iba v interiéri, exteriérový obklad nie je overený. Okná sú bronzové (schodisko), v aule dubové.
- **Sochy:** na fasáde som sochy nevidel. Drevené súsošie F. Bílka „Komenský sa lúči s vlasťou“ je vo vstupnej hale.
- **Odhad farieb z fotky** (zamračené, 2007), istota nízka až stredná:
  - fasáda #C9B98C, v tieni #A99A72
  - okenné rámy #3E3528
  - sklo #2F3A40
  - písmená #4A3F30

### Postup modelovania
1. Hlavný blok vytiahni z polygónu vyššie do výšky ~28 m po hlavnú rímsu. Nad tým pridaj ustúpené atikové podlažie do ~31–32 m a plochú strechu s atikou.
2. Rotundu vymodeluj ako polvalec R 11,8 m s 24–32 segmentmi a výškou ~22 m:
   - prízemná arkáda s 8 piliermi, ~1,5 m širokými a ~5–6 m vysokými,
   - 2 rady okien (normal mapa alebo zapustené),
   - vlys s nápisom, rímsa a atika s kvádrikmi,
   - sokel so 4–6 schodmi.
3. Pridaj dva pylóny ~2,5 × 2,5 m, ~5 m nad strechou.
4. Aulu urob ako presklený valec 28 × 14,6 m nad strechou s ~12 segmentmi.

Rozpočet: blok s lizénami ~6–10k tri, rotunda ~5k, okná ako zapustené quady ~8k, zvyšok textúry.

---

## B) Eurovea (Pribinova)

### B1) Eurovea 1 (2006–2010)
- **Autori:** urbanisticko-architektonická koncepcia **Branislav Kaliský / A1 ReSpect**, ďalej Marek Varga a Miroslav Vrábel. Hlavný konzultant **Bose International** (PL).
- **Nábrežie:** krajinný architekt **Michel Desvigne**, mólá **Inessa Hansch**, fontány JML.
- **Developer a ocenenia:** Ballymore. Otvorené 26. 3. 2010, Stavba roka 2010 a CE ZA AR 2010.
- **Program:** galéria ~55–60 tis. m² (obchod a voľný čas), kancelárie Eurovea Central 1–3 / „Pribina Place“ (Pribinova 4-6-10, ~24 500 m²), hotel Sheraton, ~235 bytov.

**Hmoty podľa OSM** (relation 21708468 „Eurovea“ zahŕňa celý komplex E1+E2, ~685 × 153 m). Eurovea 1 má ~**390 m** Z–V (lon 17.1193–17.1245) a ~110–125 m S–J:
- **Sever, pri Pribinovej:** kancelárske a komerčné bloky s 8–9 podlažiami (rel. **19111916** commercial, levels 9; way 1385341970 a 1385341971 commercial, levels 8).
- **Stred:** galéria s 3 podlažiami (rel. **19111914** retail, levels 3, mall rel. 4778411). Nad pasážami sú **presklené valené strechy** (napr. way 762656642: building:part=commercial, roof:shape=round, roof:material=glass).
- **Juh, pri Dunaji:** byty s 5–8 podlažiami, odstupňované, so strešnými záhradami (rel. **19111915** „Eurovea Apartments“, levels 8; časti s 5/6/7/8 podlažiami).
- **Materiály:** „kameň a sklo“ (Ballymore). Penthousy majú stĺpikovo-priečnikovú fasádu s 680 vonkajšími žalúziami WAREMA (heinze.de).
- **Výšky** sú odvodené z ~3,3–3,6 m na podlažie, istota nízka: byty ~25–29 m, kancelárie ~30–34 m, galéria ~15 m.

**Nábrežie:** Desvigne opisuje tri pásy od budov k rieke:
1. dláždené terasy,
2. veľký **svahovitý trávnik** s ojedinelými hájmi,
3. pás pobrežnej zelene.

Okrem toho sú tam **mólá/vyhliadkové lávky** nad stromami (Hansch) a areál má ~8 ha. **Amfiteáter v zdrojoch nie je.** V OSM sú schodiská z promenády k dolnej ceste: **23 stupňov**, dlažba, ~12 m vo vodorovnom priemete (ways 59965071, 765260830), čo zodpovedá prevýšeniu ~3,5 m (odhad). Sú tam aj 5-stupňové betónové schody, fontána (way 257090395), detské ihrisko a plávajúce mólo.

### B2) „Presklené vajce“: Eurovea Egg
**Identifikácia (istota vysoká):**
- sk.wikipedia uvádza „malý objekt v tvare **zrezaného vajíčka** na severozápadnej strane“ od A1 ReSpect s obchodným a administratívnym využitím. Píše, že je jedným z vizuálnych symbolov 1. fázy.
- Waymarking „Eurovea Egg“ uvádza zakrivenú sklenenú stavbu pri vstupe do Galérie, **obchody na prízemí + 7 podlaží kancelárií**, autori Bose International + A1 ReSpect, porovnáva ju s londýnskou „Gherkin“. Súradnice tam sú N48°08.436′ E17°07.203′.

**OSM:** relation **21708447** s tagmi building=office, building:levels=8, building:material=glass, roof:shape=flat, addr Pribinova 6 (súp. č. 17953). Height chýba. Nájomná ponuka „Eurovea Central 2“ uvádza 3 000 m², čo veľkostne sedí, ale **priama zhoda nie je potvrdená** (istota nízka).

**Pôdorys:** počiatok (48.1405141 N, 17.1200596 E).
- Obrys tvorí vajcovitý, na JZ strane takmer rovný („zrezaný“) tvar s dlhou osou **SZ–JV** (azimut ~139°/319°).
- Rozmery sú **≈ 38,7 × 19,3 m**, plocha ~600 m². Istota vysoká.
- Vybrané body: J hrot (23.6,0) → (28.6,6.5) → (26.7,14.3) → (23.1,20.8) → (18.9,25.6) → (13.7,29.8) → S hrot (6.3,32.7) → (2.0,31.3) → Z (0,25.7) → (1.7,18.6) → (3.9,14.3) → (8.9,7.7) → (16.7,1.2) → J hrot.

**Ďalšie údaje:**
- **Výška** nie je zistená. Pri 8 podlažiach ×~3,6 m vychádza **~29–32 m** (odhad, istota nízka).
- Fasáda je celosklenená, odtieň skla je neoverený.
- Nie je overené, či sa stavba zužuje aj vo výške ako „Gherkin“.

**Iné presklené kandidáty pri Eurovei**, popísané s istotou:
- **Sklenená kupola** priamo pri JV hrote vajca, nad vstupom do galérie: OSM way **762656643**, building:part=roof, roof:shape=dome, roof:material=glass. Pôdorys je ~**26 × 27 m**, kruhový.
- **Organická sklenená strecha Eurovea 2** z trojuholníkových sklenených prvkov („inšpirovaná Dunajom“) medzi Pribinova 34 a Riverside. Nie je vajcovitá.

### B3) Eurovea 2 (2019–2023)
- **Autori:** architektúra **GFI** (Radoslav Grečmal), verejné priestory a bulvár Pribinova **Beth Galí** (BB+GG). Developer JTRE, otvorené v máji 2023, BREEAM Excellent.
- **Program:** +24–26 tis. m² obchodov, 40 300 m² kancelárií, park na nábreží rozšírený z 8 400 na 15 000 m², promenáda predĺžená po Most Apollo. Doprava na Pribinovej je presunutá pod zem a bulvár slúži chodcom a cyklistom.
- **Hmoty podľa OSM** (lon ~17.1244–17.1285, ~300 m):
  - retail s 2 podlažiami (way 1079311821),
  - **sklenená organická strecha** ~**163 × 40 m** (way 1164819251, roof:shape=round, glass),
  - **Pribinova 34** – kancelárie s 9 podlažiami, glass, building:colour=navy, 17 500 m² (way 1079311826),
  - **Eurovea Riverside** – 8 podlaží, 96 bytov, pri rieke (way 1079311822),
  - **Pribinova 40** – kancelárie s 15 podlažiami, 21 000 m², 5 terás, pri Moste Apollo (way 1164819252).
- **Fasády:** keramický a kovový obklad s otvorenými škárami pred tepelnou izoláciou (heinze.de pri kancelárskej budove E2). Technológia na strechách má lamelový obklad. Strecha galérie je **extenzívne zelená**. Hliníkové fasádne systémy WICONA (INGSTEEL).

### B4) Eurovea Tower
- **Projektant:** GFI (tím okrem iných R. Grečmal, P. Franko), developer JTRE. Výstavba 12/2019 – 10–11/2023.
- **Výška 168 m** podľa CTBUH (architektonická aj po špic). sk.wiki uvádza 215,5 m od päty pilót po maják. Istota vysoká.
- **46 nadzemných + 3 podzemné podlažia.** JTRE a en.wiki uvádzajú 45, rozdiel je v číslovaní.
- 408 bytov, každý s terasou, a 8 výťahov.
- **Pôdorys „zaoblený trojuholník“:** OSM relation **21708459** (building=apartments, building:levels=46, height=168, building:flats=408).
  - Ohraničenie je **≈ 43,2 × 43,4 m**, plocha obrysu ≈ **1 280 m²**. Istota vysoká.
  - Jeden roh smeruje na **juh k Dunaju**, „základňa“ je na severe.
  - **Všetky tri strany sú vypuklé oblúky** s prehnutím ~2,3–3,4 m, rohy sú zrezané/zaoblené na šírku ~6–8 m.
  - Body (počiatok 48.1395934 N, 17.1268386 E): (23.1,0) (28.3,0.2) (31.4,3.5) (37.5,13.7) (40.1,19.3) (42.6,28.5) (43.2,34.1) (40.9,38.3) (30.1,41.8) (22.2,43.0) (15.2,43.4) (4.6,42.9) (0.05,37.9) (2.6,29.3) (6.0,22.0) (12.2,11.9) (22.0,0.5).
- **Fasáda:**
  - balkóny okolo celého obvodu s „unikátne navrhnutou rímsou/architrávom“,
  - **12 osvetlených zvislých rebier**, ktoré sledujú tvar veže,
  - okná na celú výšku podlažia,
  - 4 364 okien, ~29 000 m² fasády, ~12 000 m² zábradlí.
  - GFI hovorí o „textúre lodžií a lícových pásov“ (zmierňujú vietor).
- **Vrchol:** od **38. podlažia** sa hmota zužuje. Na vrchu je **koruna z 12 lúčov vysoká 17,4 m** a nad ňou technické podlažie a údržbový žeriav.
- **Päta:** masívne betónové stĺpy v tvare **„V“**, lobby a kaviareň smerom k Dunaju.
- Priemerná výška podlažia je ~3,3 m: (168 − 17,4) / 46. Je to odvodený odhad, prízemie bude vyššie.
- **Farby fasády som v textoch nenašiel**, treba ich overiť na fotkách.

**Postup modelovania veže:**
1. Jadro vytiahni zo zaobleného trojuholníka (~48 vrcholov) po 38. podlažie, potom 3–4 ustupujúce prstence.
2. Balkónové dosky rob ako prstenec na každom podlaží: 46 × ~300 tri ≈ 14k.
3. Pridaj 12 rebier ako dlhé kvádre, ktoré vyústia do 12 lúčov koruny (17,4 m).
4. Pridaj V-stĺpy na päte.

Spolu to vychádza ~20–25k tri.

---

## C) Sky Park (Čulenova / Továrenská / Bottova)

**Autori:**
- **Zaha Hadid Architects** (Z. Hadid, P. Schumacher). Masterplan J. Borstelmann a T. Vietzke, projektový riaditeľ Jim Heverin, projektový architekt Craig Kiner.
- Lokálny/generálny projektant **GFI**, park **Townshend Landscape Architects** s Igorom Markom.
- Developer Penta (veže R1–R3, Offices, Tepláreň), Alto Real Estate (R4, Sky Park Tower).
- Súťaž 2010, R1–R3 dokončené 2020.

### Veže a ich počet (stav 11/2026 podľa zdrojov)
| Objekt | OSM way | Výška | Podlažia | Pôdorys (OSM, na úrovni terénu) | Stav |
|---|---|---|---|---|---|
| Residence 1 (Čulenova 5) | **551521352** | 104 m (GFI 104,2; Nemetschek 103,8; OSM/CTBUH 105) | 31 | elipsa ~**45,3 × 28,8 m**, dlhá os ~S–J | 2020 |
| Residence 2 (Továrenská 12) | **551521351** | dtto | 31 | ~45,3 × 28,8 m | 2020 |
| Residence 3 (Továrenská 14) | **551521353** | dtto | 31 | ~45,3 × 28,8 m | 2020 |
| Residence 4 (Bottova 5, 264 bytov) | **1105367502** | dtto („totožné parametre“) | 31 | ~45,3 × 27,1 m | 2024 |
| Sky Park Offices (Bottova 2A) | **739656752** | **79 m** (CTBUH odhad) | 18 | ~77 × 44 m, rovnobežník otočený ~60° | 2020/21 |
| Sky Park Tower (5. veža) | 902159858 (landuse=construction) | ~119–120 m | 33 (Wikipedia) / 27 (iný zoznam) | neznámy, „ako dve spojené veže“ | vo výstavbe, ~2027 |

**Tagy veží R1–R4:** building=apartments, building:levels=31, height=105, roof:levels=2, roof:shape=dome, architect=Zaha Hadid. Tag „dome“ je interpretácia mapovača, istota nízka.

**Tagy Offices:** building=office, building:levels=18, building:material=glass.

Odpoveď na zadanie: rezidenčné veže sú **4** a k nim **1 kancelárska budova**, ktorá nie je od ZHA, ale od **Vietzke & Borstelmann**. Piata veža **Sky Park Tower** je od ZHA a je rozostavaná.

**Rozmiestnenie** (stredy veží):

| Veža | Stred (N, E) |
|---|---|
| R1 | 48.143675, 17.124745 |
| R2 | 48.144358, 17.125511 |
| R3 | 48.144961, 17.126399 |
| R4 | 48.144367, 17.127068 |

R1, R2 a R3 ležia na diagonále JZ–SV s rozostupom ~**95 m**. R4 stojí ~**116 m** východne od R2. Areál (OSM way 468081086) má zhruba 380 × 300 m.

### Tvar rezidenčných veží
- **Pôdorys je eliptický** (GFI, Structurae, Allplan). Body z OSM ležia mierne mimo čistej elipsy, ide skôr o superelipsu. Polosi pri teréne sú a ≈ 22,6 m a b ≈ 14,4 m. Istota vysoká.
- **Elipsa sa od prízemia postupne rozširuje v oboch smeroch a od polovice výšky sa k streche opäť zužuje**, takže vzniká „súdkovitý“ profil (Allplan, Nemetschek). **O koľko, nie je uvedené.** Istota tvaru vysoká, veľkosti rozšírenia nulová.
- Priemer na podlažie je ~**3,35 m** (104/31, odvodené, vrátane strechy).

### Fasáda rezidenčných veží
- **Exoskelet z GRC** (sklovláknobetón) s reliéfnym profilom tvorí **3 500 panelov** vyrobených v Dánsku (GFI). Výrobca BB Fiberbeton použil biely cement Aalborg White. Architekti „zvolili **biele GRC** a pracovali so **zvislými a vodorovnými líniami**“, ktoré opticky predlžujú vežu. Istota stredná až vysoká.
- Pod exoskeletom je **prevetrávaná hliníková fasáda**, teda kovové obklady vo farbe **„SKY PARK Bronze“**: teplý, matný, jemne desaturovaný bronz s metalickým efektom, vyrobený na mieru. Okná sú hliníkové Schüco s trojsklom.
- Kombinácia „biely GRC rám + bronzový kov + sklo“ je moje spojenie dvoch zdrojov, istota stredná.
- **Biele vodorovné pásy s plynulými krivkami zdroje nepotvrdzujú.** Píšu len o „vodorovných a zvislých líniách“, „reliéfnom profile“ a „jemne zakrivených“ vežiach. Či vodorovné pásy vlnia, treba overiť na fotkách.
- **Odhad farieb** (bez vizuálneho overenia, istota nízka): GRC #ECEAE4, bronz #8C735A, sklo #3A4248.

### Sky Park Tower (5. veža)
- Má „profilovaný exoskelet, výrazné zvislé línie a presné vodorovné členenie“ a 1:1 mock-up fasády.
- V 2020 bola v povolení ako kancelárska budova (~120 m). Teraz sa predáva ako rezidenčná (Alto, energetická trieda A0).
- **Údaje sa rozchádzajú:** 119 m / 33 podlaží, 120 m / 27 podlaží a v článku Spectator 2025 aj „125 m“, ten som však nečítal priamo.

### Sky Park Offices
- 31 000–31 100 m² kancelárií, 7 000 m² obchodov, LEED Gold a WELL Gold.
- OSM obrys sú body (počiatok 48.1429757 N, 17.1255372 E): (0,41.5) (1.8,43.8) (24.5,56.5) (41.6,64.9) (48.0,67.8) (51.5,76.0) (69.4,82.2) (74.3,80.3) (79.9,70.9) (85.2,60.5) (93.9,39.6) (92.1,34.7) (73.0,23.7) (24.2,0.06) (20.8,1.2) (13.0,17.4) (4.1,29.8).
- Plocha obrysu ~3 400 m² je pri 18 podlažiach príliš veľká na typické podlažie, takže **obrys pravdepodobne zahŕňa podnož**. Tvar veže nad ňou som neoveril.

### Park a parter
- Park leží ako „vyvýšená plošina“ nad podzemnými garážami (GFI, Nemetschek).
- Plocha sa uvádza rôzne: pôvodne 20 000 m², Townshend „2 ha“, developer „>35 000 m² zelene“ vrátane 2. fázy.
- Obsahuje modelované vyvýšeniny, trávnaté svahy na sedenie, „lesnú“ prechádzkovú trasu po obvode, ihriská, outdoor gym, fontánu a vodné prvky, psiu zónu a ovocný sad (plán).
- V parteri je ~2 000 m² verejnej vybavenosti a 4 200 m² kancelárií a obchodov (1. fáza).
- V strede stojí **Jurkovičova tepláreň** z roku 1941: tehlová budova, NKP (ÚZPF 11561/2), dnes coworking.

### Postup modelovania (jedna rezidenčná veža, ~30k tri)
1. Superelipsu 45,3 × 28,8 m (48–64 vrcholov) vytiahni na 31 podlaží × 3,35 m. Mierku podlaží moduluj súdkovito, s maximom v polovici výšky.
2. Na každé podlažie daj vodorovný GRC pás ako prstenec (31 × ~400 tri ≈ 12k).
3. Zvislé GRC lamely rieš normal mapou alebo ~60 tenkými kvádrami.
4. Bronzový kov a sklo rieš textúrou.
5. Pridaj strešnú korunu/atiku a parkový „plató“ sokel ~1–3 m.

Výška sokla nie je overená.

---

## Zdroje
- UK:
  - https://register-architektury.sk/en/objekt/80-univerzita-komenskeho
  - https://uniba.sk/o-univerzite/historia/budova-univerzity-na-safarikovom-namesti-c-6/
  - https://www.teraz.sk/slovensko/hlavnu-budovu-uk-na-safarikovom-name/401627-clanok.html
  - https://sk.wikipedia.org/wiki/Univerzita_Komenského_v_Bratislave
  - https://awora.sk/blog/univerzita-jana-amose-komenskeho-budova-c/
  - https://spojenaba.sk/architektura-bratislavskych-univerzit-odkaz-na-vyznamneho-architekta-aj-premena-z-trhu-plodin-na-vzdelavaci-stanok/
  - https://www.archinfo.sk/diskusia/blog/pamiatky-historia/cesi-na-slovensku.html
  - https://www.teraz.sk/regiony/moyzesova-sien-je-sucastou-impozantn/400486-clanok.html (FiF)
  - Commons: https://commons.wikimedia.org/wiki/Category:Faculty_of_Law,_Comenius_University a fotka https://commons.wikimedia.org/wiki/File:UK_budova.jpg
- Eurovea:
  - https://sk.wikipedia.org/wiki/Eurovea
  - https://en.wikipedia.org/wiki/Eurovea_City
  - https://en.wikipedia.org/wiki/Eurovea_Galleria
  - https://www.waymarking.com/waymarks/WMAPZW_Eurovea_Egg_Bratislava_Slovakia
  - https://micheldesvignepaysagiste.com/en/node/712
  - https://www.heinze.de/architekturobjekt/eurovea/9343172/
  - https://www.heinze.de/architekturobjekt/eurovea-2/13155785/
  - https://www.wicona.com/en-int/professionals/magazine/all-references/eurovea-2
  - https://jtre.sk/en/projekty/rozsirenie_eurovea
  - https://jtre.sk/en/projekty/pribinova_34
  - https://jtre.sk/en/projekty/pribinova_40
  - https://www.teraz.sk/regiony/verejne-priestory-v-eurovea2-aj-v-zone/297492-clanok.html
  - https://www.ballymoregroup.com/place/eurovea-riverside-renewal-in-bratislavas-modern-heart
  - https://firemnereality.sk/en/offices/eurovea-central-2-bratislava/1273
- Eurovea Tower:
  - https://www.gfi.sk/en/realisations/168-eurovea-tower
  - https://sk.wikipedia.org/wiki/Eurovea_Tower
  - https://en.wikipedia.org/wiki/Eurovea_Tower
  - https://www.skyscrapercenter.com/building/eurovea-tower/29709
  - https://www.jtre.sk/en/projects/eurovea-tower
  - https://awards.share-architects.com/eurovea-tower/
  - https://commons.wikimedia.org/wiki/Category:Eurovea_Tower
- Sky Park:
  - https://en.wikipedia.org/wiki/Sky_Park_(Bratislava)
  - https://sk.wikipedia.org/wiki/SKY_PARK
  - https://www.e-architect.com/slovakia/sky-park-in-bratislava
  - https://www.designboom.com/architecture/zaha-hadid-architects-unveil-skypark-bratislava-slovakia-05-22-2017/
  - https://www.gfi.sk/en/realisations/sky-park-residential
  - https://aalborgwhite.com/projects/sky-park-bratislava
  - https://www.doerken.com/services/references/delta/skypark-bratislava
  - https://www.heinze.de/architekturobjekt/sky-park/12827331/
  - https://nemetschek.com/en/reference/sky-park-residence-prodis-plus-sro
  - https://www.pentarealestate.com/en/news/sky-park-bronze-a-unique-color-of-the-sky-park-residential-towers-is-the-only-one-in-the-world/
  - https://www.pentarealestate.com/en/commercial-project/sky-park-offices/
  - https://www.nehnutelnosti.sk/magazin-o-byvani/2484-posobive-vyhlady-a-byty-pre-narocnych-ponuka-nova-veza-v-downtowne
  - https://www.altorealestate.sk/en/?p=3234
  - https://www.property-forum.eu/news/alto-re-launches-sale-in-zaha-hadid-resi-project-in-bratislava/19641
  - https://townshendla.com/projects/sky-park-94
  - https://www.skyscrapercenter.com/building/sky-park-residential-tower-1/29913
  - https://www.skyscrapercenter.com/building/sky-park-office-tower/29916
  - https://structurae.net/en/media/337396-the-complex-planning-and-construction-of-the-facade-scaffolding-for-the-three-105-metre-high-elliptical-residential-towers-was-the-product-of-collaboration-between-engineers-from-slov
  - https://commons.wikimedia.org/wiki/Category:Sky_Park,_Bratislava
- Allplan case study (CZ/DE/EN) vrátil HTTP 403. Údaj o súdkovitom eliptickom pôdoryse pochádza len z úryvku vo výsledku vyhľadávania, takže je overený nepriamo. Potvrdzuje ho aj Nemetschek.
- OSM: https://www.openstreetmap.org/api/0.6/way/1383879681/full, /way/1340711263/full, /relation/21708447/full, /relation/21708459/full, /way/762656643/full, /way/551521352/full, /way/739656752/full, plus Overpass dotazy (https://overpass-api.de/api/interpreter). Licencia ODbL, pri použití v hre treba uviesť „© OpenStreetMap contributors“. Fotky z Commons sú CC BY-SA.

## Čo sa nepodarilo zistiť
- **UK:**
  - presná výška rímsy, hrebeňa a rotundy (len „až 32 m“ a odhad),
  - severná a západná fasáda a južná fasáda v detaile,
  - materiál exteriérového obkladu (travertín je potvrdený len v interiéri),
  - rozmery okien,
  - presná poloha Karfíkovej prístavby,
  - záznam v registri pamiatkový.sk (stránka vrátila 404).
  - Prepojenie s Uhorskou eskomptnou bankou a rokmi 1912–14 nenašiel žiadny zdroj.
- **Eurovea:**
  - výška vajca a jeho presný názov (Eurovea Central 2 je len pravdepodobný),
  - či sa vajce zužuje aj vo výške,
  - výšky jednotlivých budov E1 a E2 v metroch (máme len počty podlaží),
  - farby fasád Eurovea Tower a vajca,
  - amfiteáter pri Dunaji (nie je v zdrojoch, sú tam terasy, svah, schody a mólá),
  - presný tvar skla nad pasážami E1.
- **Sky Park:**
  - o koľko sa elipsa veží rozširuje,
  - presná výška podlažia,
  - geometria vodorovných pásov (či sú vlnité),
  - presné HEX farby,
  - tvar a výška veže Sky Park Offices nad podnožou,
  - finálna výška a počet podlaží Sky Park Tower,
  - výška parkovej plošiny.
- **Fotky** som vizuálne overil iba pri jednej (východná fasáda UK).

---

## Doplnenie z fotiek (22. 11. 2026)
Druhý prieskum: fotky z Wikimedia Commons, ortofoto ZBGIS (© ÚGKK SR) a stránky architektov – len na pozretie,
bez Google. Podľa neho sú upravené modely (`tools/blender/vyskove/`).

**Univerzita Komenského**
- Hmoty od východu: rotunda (vrch atiky ≈ 20 m) → „plecia“ po jej stranách (čelo bez okien, rímsa ≈ 18 m,
  ustúpené horné podlažie so slepými poľami do ≈ 21 m, na bokoch 2 malé okná na podlažie) → hlavný blok
  (≈ 14 m hlboký, rímsa/atika ≈ 27–29 m, nízka valba zo šedozeleného plechu za atikou) → stredné krídla s aulou
  → západná prístavba s pásovými oknami a nadstavbou na streche.
- Rotunda: 6 okenných osí, v strednej osi pilaster; 7 pilierov arkády; dolný rad okien ≈ 2,6 × 2,8 m, horný
  ≈ 2,6 × 5,4 m; nápisy „UNIVERZITA KOMENSKÉHO“ (horný vlys) a „UNIVERSITAS COMENIANA BRATISLAVENSIS“ (nad arkádou);
  nízka atika s hranolovými podstavcami.
- Pylóny: omietaný hranol ≈ 2,1 m, dve odstupňované dosky, hrdzavá mriežková koruna ≈ 1,8 × 1,5 m so zubatým
  okrajom; vrch ≈ 31–32 m.
- Farby: travertín #C8B894 (rotunda, prízemie), omietka #A89170, rámy rotundy #3A3129, ostatné rámy biele.
- Aula: presklená sedlová/segmentová strecha ≈ 28 × 14–15 m, z ulice ju nevidno.

**Eurovea – vajce a kupola**
- Vajce nie je zvislé vytiahnutie: spodná tretina zvislá, potom sa zaobľuje dnu (navrchu ≈ 0,8), plochá oválna
  strecha; 9 pásov trojuholníkových tabúľ (diagrid, priečle #A9AFB3), sklo #4F626A, výška ≈ 35–37 m.
- Kupola: nízka segmentová (vznos 4–5 m) na sklenenom bubne ≈ 11 m, trojuholníková sieť bielej ocele, presah
  okraja s dvoma bielymi stĺpmi pred vchodom.

**Eurovea Tower**
- Súvislý balkón okolo veže na každom podlaží (čelá dosiek striebrosivé #A7ADB3), tmavé sklo #3A4756,
  12 bielych rebier (4 na stranu, rohy bez rebra) od zeme po vrch; koruna je otvorená klietka s rovnakou výškou
  rebier a 3 tmavými prstencami; hala ≈ 2 podlažia a stĺpy tvaru V.

**Sky Park**
- Rezidencie: mierny súdok (+5 % v 35–50 % výšky, zaoblené „ramená“ navrchu), rovné biele prstence zhora po 1, 1,
  1, 1, 2, 3, 4, 5, 6, ~7 podlaží, ~10 rovných zvislíc, bronzové panely (#7D7569) striedané so sklom (#44505A),
  navrchu svetlosivé lamely a zvislice ohnuté dnu, prízemie ≈ 7 m presklené.
- Offices (Vietzke & Borstelmann + GFI): bloky zhora ≈ 7, 6, 3, 4 podlažia posunuté o 1–2 m, biele pásy len na
  stykoch blokov, tmavé zvislé lamely, biela rebrovaná clona techniky.

---

## Stavebná fakulta STU (Radlinského 11 / Imricha Karvaša) – #127, 23. 11. 2026
Prieskum podľa CLAUDE.md („Pamiatky a významné stavby“, #130): OSM, laser ÚGKK, stránky fakulty, výročné správy,
rozpočty v CRZ, ASB, archinfo.sk, Wikimedia Commons. Google sa nepoužil. Fotky a výkresy sa len prezreli a opísali,
do repozitára nejde nič z nich. Model: `tools/blender/vyskove/stavebna_fakulta.py`.

**História.** Ing. arch. Oldřich Černý s kolektívom (Stavoprojekt Bratislava), projekt 1962, základný kameň
28. 4. 1964, blok A v prevádzke 1967, celý komplex 1974. Neskoršie úpravy:
- 2009–10 nový plášť veže C a spoja B–C;
- 2011 rekonštrukcia hlavného vstupu;
- 2020–21 obnova plášťa bloku B (metalický obklad, nové okná, obnovená lomenica nad vstupom, tienenie svetlíkov);
- 2023 obnova bloku A a auly.

**Hmoty** (výpočet z OSM, ±0,5 m):

| časť | rozmery | podlažia, výška | OSM |
|---|---|---|---|
| Veža C (katedry, dekanát) | 47,2 × 14,7 m, os 124° | 24 NP (prízemie + 23 poschodí), 77,5 m (TASR) / 78 m (OSM) | way 77937579 |
| Blok B (podnož) | ≈ 165 × 45 m | suterén čiastočne nad terénom + 3 NP, atika ~15,6 m | relation 1181349 |
| Východné átrium (diera v B) | ≈ 52 × 25,4 m | – | inner way 77937277 |
| Stredný blok medzi átriami | ≈ 43 m dlhý | o 1 podlažie vyšší | – |
| Aula (vo V krídle) | strecha ≈ 27,4 × 29 m | vyššia ako podnož | – |
| Blok A | 66 × 15 m | 6 NP | way 77937646 |
| Spoj B–C | 10 × 7 m | 4 NP | way 77937543 |

**Fasády.**
- Veža: hliníkové elementy, raster 1,5 × 3 m. Svetlosivý parapetný pás 1,25 m, tmavé sklo 1,75 m, takže fasáda pôsobí vodorovne pruhovane.
- Úzke čelá veže (schodiská) majú vodorovné lamely a zvislý požiarny pás. Na ktorom čele presne, nie je isté.
- Blok B (od 2021): veľké svetlé pieskovo-béžové panely so škárami a pásové okná v sivých rámoch. Okná sú v skupinách, medzi nimi plné piliere.
- Do 2020 mal blok B béžový drobný obklad a modré parapety.

**Strechy.**
- Všetky strechy sú ploché a tmavé.
- Na strednom bloku je 28 pyramídových svetlíkov 2,4 × 2,4 m v skupinách 12 + 16, šachovnicovo, každý na tmavom golieri. Zdroj: rozpočet strechy SO-02 v CRZ (4 sklá na svetlík).
- Na streche veže je strojovňa a desiatky malých parabol na stojanoch (prevádzkový poriadok antén).

**Hlavný vstup** je na SV fasáde bloku B pri ulici Imricha Karvaša, OSM `entrance=main` 48.1519921, 17.1153318.
- Lomenica: 18,1 × 7,7 m (way 1324890210), lomená doska s 5 hrebeňmi. Podhľad je biely, okraj oplechovaný tmavosivo.
- Schodisko: OSM udáva 10 stupňov. Na fotke sú dve ramená s podestou a čierne zábradlie, prevýšenie ≈ 1,5 m.
- Rampa vpravo pred dvojpodlažnou presklenou halou.
- Pod lomenicou 3 vstupy v oranžových portáloch. Stredný je oblý a má biely nápis v dvoch riadkoch „STAVEBNÁ / FAKULTA“.
- Vľavo hore je tabuľa „STU SvF“, vľavo od schodiska 3 stožiare.

**Átrium.**
- Východné átrium má dláždenú oddychovú plochu, bronzovú sochu (L. Korkoš, 1976; do hry nejde – umelecké dielo) a v pôdorysoch kruhové symboly stromov.
- Laser ukazuje vnútro dvora o ~1,4–1,8 m vyššie než ulicu pri vstupe a pri fasádach zapustené pásy (anglické dvorce, obnovené 2021).
- Plytkú nádrž z opisu majiteľa som v textoch ani výkresoch nenašiel, v modeli je ako odhad.

**Rozhodnutia pre model.**
- Model sa kladie na terén v bode pri spodnom stupni schodiska (`zakladnaBod`). Terén pod blokom B klesá o ~3 m, sokel preto siaha 4 m pod ulicu.
- Schodisko je pochôdzna plocha: hráč aj chodci idú hore na podestu (`plochy`). Kolízie sú len krídla okolo átria, veža, blok A a spoj.
- Dvere pre neskorší interiér sú v `vchody` (id `hlavny`) v `assets/pamiatky/stavebna-fakulta.json`.
- Nápisy univerzity áno (verejná inštitúcia, ako pri UK), logo STU (bodkový raster) nie – len text „STU SvF“. Vlajky: SR (zjednodušený štátny znak), červená a oranžová bez znakov.

**Neisté – fotky, ktoré by mal dodať majiteľ:**
- átrium s nádržou (zo stredu dvora aj z okna nad ním);
- úzke čelo veže k Radlinského (lamely);
- schodisko zboku (počet stupňov, podesta);
- vstupná hala zvnútra (pre interiér).

**Zdroje:**
- fakulta: [virtuálna prehliadka](https://www.svf.stuba.sk/sk/fakulta/virtualna-prehliadka), [o budove](https://www.svf.stuba.sk/sk/fakulta/o-fakulte/o-budove-fakulty), [obnova bloku B 2020](https://www.svf.stuba.sk/sk/diani-na-svf/obnova-a-modernizacia-budovy-svf.html?page_id=8031);
- výročné správy SvF 2020, 2021, 2023, 2024 (`svf.stuba.sk/buxus/docs/dokumenty/vyrocne_spravy/`) a [80 rokov SvF](https://www.svf.stuba.sk/buxus/docs/rozne/80_rokov_SvF_vnutro_maly_subor.pdf);
- [ASB – obnova fasády veže](https://www.asb.sk/stavebnictvo/obnova-fasady-stavebnej-fakulty-stu) a [archinfo.sk – O. Černý](https://www.archinfo.sk/diskusia/blog/architektura-vseobecne/oldrich-cerny-st-architekt-modernych-konceptov.html);
- CRZ: [rozpočet strechy bloku B](https://crz.gov.sk//data/att/4479779_dokument1.pdf);
- [prevádzkový poriadok antén](https://www.svf.stuba.sk/buxus/docs/dokumenty/smernice/Prevadzka_anten_2015.pdf) a [socha v átriu](https://umeniemesta.sk/diela/rec8nK9JkXp89K2vY);
- Commons: [STU-Building.JPG](https://commons.wikimedia.org/wiki/File:STU-Building.JPG), [Panorama STU](https://commons.wikimedia.org/wiki/File:Panorama_STU_-_panoramio.jpg) (strecha so svetlíkmi zhora), [zastávka STU 2013](https://commons.wikimedia.org/wiki/File:Bratislava,_Imricha_Karva%C5%A1a,_tramvajov%C3%A1_zast%C3%A1vka_STU_(2013-10-25;_01).jpg);
- OSM (ODbL): lomenica 1324890210, prístrešok pri aule 1324890201, schody 241184965, rampa 1324890206, areál 248120516;
- výškopis: laser ÚGKK (DMR) – výška dvora a anglických dvorcov.

---

## Eurovea 1 – celý komplex (#131, časť 1; 23. 11. 2026)
Prieskum podľa #130. Zdroje sú OSM časti budov, výšky z lasera ÚGKK (už v dlaždiciach mesta), ~22 fotiek
z Wikimedia Commons z rokov 2009–2026 (len prezreté, opísané slovami) a články. Google sa nepoužil.
Model je v `tools/blender/vyskove/eurovea_1.py`, dáta z OSM sú v `tools/blender/osm_eurovea.py` → `tools/blender/data/eurovea.json`.

**Rozloženie (OSM → skutočné budovy):**
- **Central 1** – rel 21708445 a way 1254386623, oblúková fasáda.
- **Vajce (Central 2)** – rel 21708447, je v modeli `eurovea-vajce`.
- **Central 3** – rel 21708449. OSM ho chybne značí ako byty, sú to kancelárie.
- **Sheraton** – ways 762656648, 1254386636 a 1254386637 na SZ rohu hlavného námestia.
- **Byty pri Dunaji** – južný pás.
- **Východná skupina** pri Sklade č. 7 – byty na galérii, hotel tam nie je. Patrí k nej sklenená časť galérie a „kinová škatuľa“ (21708454, 21708455).
- Časti za Skladom č. 7 sú Eurovea 2 (2023), do tejto časti nepatria.

**Výšky (laser, m nad terénom):**

| časť | výška |
|---|---|
| Central 1 | 36,0 |
| vajce | 35,2 |
| Sheraton | 30,1 (krídlo k námestiu 20,2, vnútorná časť 17,1) |
| byty so 6 podlažiami | ~23 |
| byty so 7 podlažiami | 26–27 |
| podnož galérie | 10,6–11,5 |
| sklenená časť galérie pri námestí | 16,2 |

Central 3 a kino laser nemá. Odhad je 32 m a 28 m.

**Fasády** (farby sú odhady z fotiek):
- **Central 1:** pásové okná, zelenosivé sklo ~2,2 m (#7F9C98) a svetlý parapetný pás ~1,0 m (#C9CCCC). Prízemie má dvojpodlažné výklady.
- **Central 3:** tmavšie sklo (#4F5A60) so striebrobielymi pásmi.
- **Sheraton:** teplý béžový kameň (#D8CCB6) s jednotlivými zvislými oknami ~1,4 × 2,4 m v nepravidelnom rytme a ustúpeným presklenným podlažím.
- **Byty pri Dunaji** striedajú dva typy:
  - terakotové piliere (#B0604C) s bielymi pásmi stropov (#E6E4DE) a lodžiami so sklenými zábradliami;
  - svetlé kamenné časti (#E3E1DA) s pásovými oknami.

  Rohy sú zaoblené. Najvyššie podlažie tvoria presklené penthausy pod tenkou presahujúcou strechou. Na streche podnože sú záhrady, pri promenáde presklené kaviarenské pavilóny.
- **Východná skupina:** krémový kameň (#E3D9C6) s dierovanými oknami a tehlovočervený blok (#A65A45) s balkónmi. Časť 1254305684 visí nad promenádou (podlubie ~3,2 m).
- **Galéria k námestiu:** sklenená stena so zvislými grafitovými piliermi (#4A4E54), morskozelená sklená kocka (#A8CFC4) a kinová škatuľa z béžovo-okrových panelov.

**Presklené strechy:**
- Nad hlavnou pasážou (way 762656642, ~164 m od kupoly k námestiu) je nízky sploštený oblúk. Tvorí ho trojuholníková oceľová sieť, oceľ je svetlosivá (#D9DCDD).
- Hrana strechy je na ~11 m, vrchol na ~14–15 m. Článok uvádza ~2 300 trojuholníkov na ~5 500 m².
- Vstupy pri vajci aj z námestia sú predsadené sklenené klenby. Pri námestí stoja na bielych „stromových“ stĺpoch.
- Ploché sklenené striešky sú nad vstupmi do Sheratonu (~9 × 8 m) a Central 3 (~12 × 8 m). Pultové striešky sú nad vjazdmi do garáže z Pribinovej.

**Priestranstvo pri vajci:**
- dlažba zo sivých žulových kociek so svetlými pásmi;
- 4 kruhové kvetináče ⌀ ~4 m (OSM flowerbed) so svetlým okrajom a strihanými kríkmi;
- štíhle strieborné lampy;
- stĺp (totem) ~1,5 × 0,5 × 8 m.

**Rozhodnutia pre model:**
- Totem je hrdzavooranžový bez loga.
- Názvy obchodov a nápis galérie sa do hry nedávajú.
- Sochy (Cirkusanti, 2012) sú diela žijúceho autora, nemodelujú sa.
- Pasáže pod sklenou strechou sú priechodné, majú kolíziu len plné budovy. Vchody z OSM sú v `vchody` (na interiér galérie).

**Neisté – vlastné fotky by pomohli:**
- prierez a výška strechy nad hlavnou pasážou (zo strešnej záhrady alebo z vyššieho podlažia);
- stredný severný vstup a južné vstupy z promenády;
- výška kina a Central 3 (fotka spredu s viditeľnými podlažiami);
- fasáda Sheratonu k Pribinovej a dvorové fasády bytov;
- rozmery totemu a vzor pásov v dlažbe.

**Zdroje:**
- OSM: [API výrez](https://api.openstreetmap.org/api/0.6/map?bbox=17.1185,48.1385,17.1255,48.1415) (ODbL);
- laser ÚGKK DMP 2.0 (CC BY 4.0) cez dlaždice mesta;
- články: [europe-re.com (2010)](https://europe-re.com/eurovea-galleria-welcomes-its-first-visitors-sk/26623), [Waymarking – vajce](https://www.waymarking.com/waymarks/WMAPZW_Eurovea_Egg_Bratislava_Slovakia), [Heinze – penthausy](https://www.heinze.de/architekturobjekt/eurovea/9343172/), [sk.wikipedia](https://sk.wikipedia.org/wiki/Eurovea), [Sheraton – Spectator](https://spectator.sme.sk/politics-and-society/c/five-star-sheraton-hotel-opens-in-eurovea-centre-in-bratislava);
- Commons: [promenáda 2013](https://commons.wikimedia.org/wiki/File:Bratislava,_Eurovea,_Danube_promenade.JPG), [hlavné námestie 2013](https://commons.wikimedia.org/wiki/File:Bratislava,_Eurovea,_main_square.JPG), [Sheraton 2013](https://commons.wikimedia.org/wiki/File:Bratislava,_the_main_square_of_the_shopping_mall_Eurovea.JPG), [východný blok 2013](https://commons.wikimedia.org/wiki/File:Bratislava,_the_shopping_mall_%22Eurovea%22,_main_square.JPG), [vajce a vstup 2014](https://commons.wikimedia.org/wiki/File:Bratislava_Eurovea_MYSELF_2014_-_panoramio.jpg), [vajce 2026](https://commons.wikimedia.org/wiki/File:Eurovea_(IMG_20260604_144544).jpg), [Central 3 2019](https://commons.wikimedia.org/wiki/File:Bratislava,_7.jpg), [sklenená strecha zhora 2011](https://commons.wikimedia.org/wiki/File:JESE%C5%87_VO_VN%C3%9ATROBLOKU_EUROVEA_-_panoramio.jpg), [vstup z námestia 2010](https://commons.wikimedia.org/wiki/File:Eurovea_Galleria_03.jpg), [oblý koniec bytov 2018](https://commons.wikimedia.org/wiki/File:Eurovea_shopping_mall_Bratislava_(2).jpg).

## Eurovea 2 – hadia strecha, budovy a socha v parku (#131, časť 2; 23. 11. 2026)
Prieskum je podľa #130. Google sa nepoužil.

Zdroje:
- OSM a laser ÚGKK (v dlaždiciach mesta);
- dokumentácia EIA 2017 – text rozhodnutia a výkresy s výškovými kótami. Prečítané sú len čísla, výkresy sa do repozitára nedávajú;
- stránky architekta GFI – pôdorysy a letecká fotka, len prezreté;
- článok statika k sklenenej streche;
- 13 fotiek z Wikimedia Commons (2020–2025), články a tlačové správy.

Kde to je:
- model: `tools/blender/vyskove/eurovea_2.py`;
- dáta z OSM: `tools/blender/osm_eurovea.py --cast 2` → `tools/blender/data/eurovea-2.json`;
- Eurovea Tower má vlastný model.

**Hadia sklenená strecha** (OSM way 1164819251, je to diera v multipolygóne centra rel 15756118)

Nie je rovná. Je to had v tvare „S“ s dvoma rozšíreniami („bublinami“). Od západu:
- rovný úzky západný koniec, ~9 m široký (x≈1255). Napája sa na pasáž Eurovea 1 pri Sklade č. 7;
- stúpa na SV ku kolenu s bublinou ~18 m (x≈1320, z≈385);
- rovný úsek na JV;
- vajcovitá „hlava“ ~32 × 20 m nad vstupnou halou (x≈1400).

Os má ~169 m, plocha je 2 176 m². Statik uvádza „165 m long, 11 to 20 m wide“.

Konštrukcia:
- trojuholníková oceľová sieť (gridshell) so sklom, nie ETFE;
- v úzkych častiach je to nízka valená klenba, v bublinách plochá kupola;
- montovaná bez lešenia (statika OKF Brno, architekt GFI, 2019–2021);
- trojuholníky majú ~1,5–2 m, oceľ je svetlá.

Výšky:
- sklo dosadá na hranu strechy centra +12,4 m;
- vrchol je odhadom ~16 m v úzkych častiach a ~17 m v kupole nad halou. Žiadny zdroj číslo neuvádza.

Okolo skla je svetlosivý obvodový lem ~2,5–3 m (#C9C8C2) s bielymi skrinkami po ~6–7 m. Zo zeme strechu takmer nevidno, lebo leží na streche centra medzi Pribinova 34 a Riverside. Z ulice je vidieť len kupolu nad halou.

**Nákupné centrum**
- Teleso má 2 podlažia. Atika je +12,425 m (EIA), laser dáva 12,4 m.
- Strecha je extenzívna zelená (rozchodníky, trávy, 3 942 m²) a neprístupná. Nie je na nej park ani stromy.
- Na východnom konci je vstupná hala – presklený valec ~13,5 m:
  - stĺpiky po ~2,7 m, dva priečne pásy, číre sklo (#9FB8BE);
  - dvoje otočné dvere so striežkami;
  - otvorená na sever (námestie pri Pribinovej) aj na juh (predpolie veže a park).

**Budovy:**

| časť (OSM) | výška (atika) | vzhľad |
|---|---|---|
| Pribinova 34 východ (rel 21708458, 9 podl.) | ~41,0 m | tmavé zrkadlové sklo (#2E3439) s čiernymi pásmi na stropoch a béžovými štvorcami ~1 × 1 m šachovnicovo; zaoblené SV nárožie; dvojpodlažný parter s bronzovými lamelami (#B88D66) pod čiernou rímsou; najvyššie podlažie ustúpené a tmavé |
| Pribinova 34 západ (rel 21708457, 8 podl.) | ~38,7 m | bronzovohnedý rám (#6E5A47) so štvorcovými oknami; 2 ustúpené tmavosivé podlažia (#3C3F43); presklený parter s bronzovými piliermi; do dvora biele pásy s pásovými oknami |
| blok pri Sklade č. 7 (rel 21708456) | ~27–29 m | plná fasáda bez okien z béžových (#E2DCCB) a okrových (#C9AE6F) panelov v šikmom vzore; na streche chladiče (kiná / technika) |
| Riverside terakota (rel 21708464, 21708462) | 28,7 m | terakotový obklad (#A95A3E), biele rímsy, vysunuté balkóny v svetlých a čiernych rámoch; 2 ustúpené mezonetové podlažia v antracite (#474B50) |
| Riverside krčky (rel 21708463, 21708461) | laser 23,9 / 21,9 m | biele, s hlbokými lodžiami a sklenými zábradliami |
| Riverside sekcia E (rel 21708460) | 31,8 m | krémový rám (#DAD4C6) s pravidelnou mriežkou okien a lodžiami, dvojpodlažný presklený parter. Toto je „nárožná béžová budova“ z opisu majiteľa |
| Pribinova 40 podnož (rel 22198600) | 20,1 m | perforované kovové panely (#ADA592) v dvoch pásoch s tmavou štrbinou, ustúpené presklené prízemie |
| Pribinova 40 kancelárie (way 1164819253, 6.–15. NP) | 57,6 m (s technikou 59,9 m) | tmavé sklo (#4D565C), šampanské pásy stropov a zvislé lamely (#BDB29C), zaoblené rohy; posledné 3 podlažia ustupujú od Dunaja |

**Socha v parku** (OSM node 11184533280)

Skutočné dielo:
- „Octahedral Body“ od Viktora Freša, odhalená 21. 9. 2023;
- výška 13 m, gule majú ⌀ 2,2–2,65 m;
- ~10 gúľ (zelená, tmavomodrá, fialová, antracitová, petrolejová, levanduľová, žltá, okrová, červená) spojených striebornými štvorhrannými priehradovými nosníkmi;
- spodné gule ležia na kruhu zo svetlého štrku ⌀ ~12–14 m.

V hre: ide o dielo žijúceho autora, preto je v hre **vlastné zjednodušené stvárnenie**, nie kópia diela.
- „Molekula“ z 8 farebných gúľ: 3 na zemi, jedna stredná, trojica vyššie a jedna navrchu, spolu ~13 m.
- Gule spájajú priehradové nosníky a stoja na štrkovom kruhu.
- Všeobecná socha z OSM sa na tom mieste nestavia (`nahraditSochy` v JSON modelu).

**Rozhodnutia pre model:**
- Pasáž pod sklom je vnútri centra, takže kolíziu má celé teleso centra. Vchody z OSM sú v `vchody` (na neskorší interiér).
- Nápisy (názov centra nad vstupom, obchody) sa do hry nedávajú.
- Park, promenáda a nábrežie pred Riverside sú z dlaždíc mesta. Nábrežie príde v ďalšej časti #131.

**Neisté – vlastné fotky by pomohli:**
- šikmo zhora na hadiu strechu (z veže, z terasy P34/P40 alebo z Mosta Apollo), aby bolo vidieť výšku klenby a kupol nad zelenou strechou;
- presklený valec vstupnej haly z námestia pri Pribinovej, s človekom pre mierku; južný vstup z parku;
- interiér pasáže – pohľad hore na mriežku (farba ocele);
- ktorá časť Pribinova 34 má 38,7 m a ktorá 41,0 m (kóty EIA sú z projektu 2017);
- nízka spojka medzi vežou a P40 (rel 22198599), odfotená z parku;
- blok pri Sklade č. 7, odfotený kolmo z Pribinovej;
- socha pri Ganz House (OSM node 14183845930, 7 m, pridaná 9/2026) – autor ani tvar sa nenašli.

**Zdroje:**
- OSM (ODbL): [way 1164819251](https://www.openstreetmap.org/way/1164819251), [way 1079311821](https://www.openstreetmap.org/way/1079311821), [way 1079311822](https://www.openstreetmap.org/way/1079311822), [way 1079311826](https://www.openstreetmap.org/way/1079311826), [way 1164819252](https://www.openstreetmap.org/way/1164819252), [way 1207028033](https://www.openstreetmap.org/way/1207028033), [node 11184533280](https://www.openstreetmap.org/node/11184533280);
- laser ÚGKK DMP 2.0 (CC BY 4.0) cez dlaždice mesta;
- EIA: [Polyfunkčný súbor Eurovea 2](https://www.enviroportal.sk/eia/detail/polyfunkcny-subor-eurovea-2), [rozhodnutie 2017](https://www.enviroportal.sk/eia/dokument/263084), [oznámenie o zmene s výkresmi](https://www.enviroportal.sk/eia/dokument/257740);
- architekt GFI: [Eurovea 2](https://www.gfi.sk/en/realisations/eurovea-2), [Pribinova 40](https://www.gfi.sk/en/realisations/pribinova-40);
- statika strechy: [SCIA User Contest 2020](https://books.scia.net/UC2020/184/);
- výrobcovia a články: [Heinze](https://www.heinze.de/architekturobjekt/eurovea-2/13155785/), [Dörken](https://www.doerken.com/services/references/delta/eurovea2-bratislava), [WICONA](https://www.wicona.com/en-int/professionals/magazine/all-references/eurovea-2), [Startitup](https://www.startitup.sk/eurovea-sa-dokoncuje-a-pripravuje-na-otvorenie/), [across](https://www.across-magazine.com/euroveas-finishing-touches-before-the-ribbon-cutting/), [TASR – Beth Galí](https://www.teraz.sk/regiony/verejne-priestory-v-eurovea2-aj-v-zone/297492-clanok.html), [en.wikipedia](https://en.wikipedia.org/wiki/Eurovea_City);
- JTRE a socha: [socha Octahedral Body](https://jtre.sk/en/news/sculpture_octahedral_body_unveiled), [Pribinova 40](https://jtre.sk/en/projekty/pribinova_40), [Pribinova 34](https://jtre.sk/en/projekty/pribinova_34), [súťaž na sochu](https://euroveacity.com/news/viktor_freso_has_won_competition), [nehnutelnosti.sk](https://www.nehnutelnosti.sk/magazin-o-byvani/2077-na-dunajskom-nabrezi-bude-stat-octahedral-body-od-viktora-fresa);
- správca budov: [Riverside](https://d-fs.sk/?p=1914), [P40](https://d-fs.sk/?p=1946);
- Commons: [Pribinova 34 (2023)](https://commons.wikimedia.org/wiki/File:Pribinova_34_office_building_in_Bratislava.jpg), [päta veže a hala (2023)](https://commons.wikimedia.org/wiki/File:Eurovea_Tower_Bratislava.jpg), [P40 a veža (2023)](https://commons.wikimedia.org/wiki/File:Bratislava_8.jpg), [nábrežie z Petržalky (2023)](https://commons.wikimedia.org/wiki/File:Eurovea_Tower_vo_v%C3%BDstavbe_2.jpg), [Riverside z lode (2022)](https://commons.wikimedia.org/wiki/File:Eurovea_Tower_20072022.jpg), [z Dunaja (2023)](https://commons.wikimedia.org/wiki/File:Bratislava_z_Dunaja_3.jpg), [interiér haly (2025)](https://commons.wikimedia.org/wiki/File:Bratislava,_Eurovea.jpg), [stavenisko (2020)](https://commons.wikimedia.org/wiki/File:Eurovea_2_stavenisko.jpg).

## Eurovea – nábrežie (#131, časť 3; 24. 11. 2026)

Prieskum: OSM (Overpass), výšky z laserového terénu hry (`data/mapa/mesto/t/*.bin`), fotky na Commons (len prezreté, nič
skopírované), Michel Desvigne (krajinná architektúra), stratégia rozvoja prístavu (2020). Google nie.

**Tri rozdielne úseky:**
- A – park Eurovea 1 (lon 17.1175–17.123),
- B – Štefánikovo námestie a Sklad č. 7 (17.123–17.125),
- C – Eurovea 2 (17.125–17.1288).

**Priečny rez úsekom A** (zhodný na štyroch miestach; vzdialenosti od brehovej čiary OSM):
- fasáda ~60 m od brehu;
- kryté kaviarenské terasy 8–14 m hlboké (48–57 m);
- horná promenáda ~9 m voľnej šírky, 139,6 m n. m. (hra +0,6);
- svah trávnika 22–25 m, klesá ~3 m;
- dolný chodník 14–15 m od brehu, šírka ~3,5–4 m, 136,7 m (hra −2,3);
- trávnatý breh 8–10 m s vysokými okrasnými trávami na hornej hrane;
- betónová nábrežná hrana s oceľovými uväzovacími stĺpikmi ~2–2,5 m, ~133,8 m;
- nízky kamenný múrik pri vode (~1–1,5 m) s kamenným záhozom, voda pri skenovaní ~132,5 m (hra −6,5).

Ďalšie fakty z prieskumu:
- Obe schodiská s 23 stupňami (OSM 59965071, 765260830) vedú z dolného chodníka **dolu k nábrežnej hrane**, nie z promenády.
- Línia mobilnej protipovodňovej steny (OSM `barrier=coupure`) ide po okraji trávnika pri promenáde. Pri povodni
  18. 9. 2024 boli dolný chodník a väčšina trávnika pod vodou.
- Úsek B: od pomníka (~139,7 m) zostupuje široká sedacia terasa k dolnému nábrežiu (~136,7 m) so zábradlím zo zvislých
  pozinkovaných tyčí a uväzovacím stĺpikom. Sklad č. 7 (1922, NKP) stojí priamo na nábreží.
- Úsek C: park ~139,2 m s vyvýšenou trávnatou kopou (~141,4 m) so sochou gúľ, pod ním oplotený prístavný pás ~136,2 m
  s obslužnou cestou a koľajami.

**Mólá (Inessa Hansch)** – tri, kolmo na breh, smer ~189°, v OSM lávky (`bridge=yes`, `surface=wood`):

| mólo | OSM | dĺžka | koniec pri vode |
|---|---|---|---|
| západné | 59965066 | 37,0 m | nad svahom brehu (133,6 m) |
| stredné | 59965065 | 38,0 m | pri hladine (132,5 m) |
| východné (pri Štefánikovom nám.) | 762656646 | 39,5 m | pri hladine (132,4 m) |

- Na brehu má každé schody s 5 stupňami, betón s madlom (OSM 1002420936/35/34, `incline=down` od móla k promenáde) –
  mostovka je teda ~0,8 m nad promenádou (istota nízka).
- Mostovka je vodorovná „nad stromami“ (Desvigne). Nad dolným chodníkom ide ~3–4 m vysoko, na konci je 6–7 m nad zemou.
- Z fotiek: rovný oceľový nosník so sivou plochou rímsou (~0,5 m), štíhle okrúhle oceľové stĺpy (niektoré v dvojiciach
  do V), paluba zo sivých zvetraných dosiek, zábradlie ~1,1 m s oceľovými stĺpikmi, okrúhlym madlom a hustými zvislými
  tyčami (pozinkované / nerez). Šírka ~3–4 m (odhad z fotiek s ľuďmi, istota nízka).

**Pristávacie pontóny:**
- Pri Starom moste: pontón 74 × 6,6 m (OSM 1134986880) s 26 m kovovou lávkou (OSM 1134986879), stred 48.139415, 17.118178.
  Na fotke z 2024 je čierny oceľový trup, krémová nadstavba a značka kotviska „15“ (číslo do hry nedávam – bez nápisov).
- Pred Skladom č. 7: menší biely pontón 34 × 6,6 m (OSM 589811215) s lávkou 19,8 m (OSM 589811214).
- Verejné prístavisko Eurovea je len v pláne (stratégia prístavu 2020). Plávajúca reštaurácia sa v 2018 odtrhla a už tam nie je.

**„Koľajnica pri vode“:**
- Skutočné prístavné koľaje (rozchod 1435) začínajú zarážadlom pri päte Štefánikových schodov (48.139293, 17.123930),
  idú popred Sklad č. 7 a ďalej na východ do Zimného prístavu. V hre už sú (koľajnice z OSM).
- Zábradlie pri vode je na dolnom nábreží pri Štefánikovom námestí a pozdĺž Skladu 7 / Eurovea 2. V parku Eurovea 1 zábradlie
  pri vode nie je (otvorený breh, betónová hrana so stĺpikmi).
- Historický žeriav v tomto úseku nie je (najbližší portálový je za Mostom Apollo v Zimnom prístave).

**Rozhodnutia pre model (časť 3):**
- Mólá sú vodorovné vo výške brehu + 0,8 m, na brehu 5 schodov, na konci voľne nad vodou. Majú drevenú palubu, svetlý oceľový
  nosník, dvojice štíhlych oceľových stĺpov a zábradlie s hustými zvislými tyčami (`data/mapa/mola.json`, `js/mapa/mosty/mola.js`).
  Predtým hra postavila lávky z OSM ako mostovku od terénu na brehu k terénu pri vode, teda 6–7 m dolu svahom.
- Pontóny: jednoduchý oceľový trup na hladine, nadstavba a lávka na breh, bez nápisov.

**Neisté – vlastné fotky by pomohli:**
- bočný pohľad na stredné mólo z dolného chodníka (≈ 48.13951, 17.12172) s človekom pod ním a fotka schodov na začiatku móla
  (idú hore či dolu?) – výška a šírka paluby;
- pohľad pozdĺž móla z trávnika – počet stĺpov a dvojice do V;
- koľaje pred Skladom č. 7 od zarážadla na východ – vidno ich v dlažbe?;
- nábrežná hrana pri päte schodov s 23 stupňami (≈ 48.13950, 17.12003) pozdĺž vody – šírka, rozostup stĺpikov, výška múrika;
- pontón „15“ pri Starom moste z dolného chodníka zboku.

Zdroje: OSM (ways 59965066, 59965065, 762656646, 1002420934–36, 59965071, 765260830, 1134986880, 589811215, 1320739280,
53182418, 636897617, 291626956); [Michel Desvigne – Eurovea](https://micheldesvigne.com/); Commons:
[Grass_riverbank_near_Eurovea_01](https://commons.wikimedia.org/wiki/File:Grass_riverbank_near_Eurovea_01.jpg),
[Eurovea_shopping_mall_at_Danube_river](https://commons.wikimedia.org/wiki/File:Eurovea_shopping_mall_at_Danube_river.jpg),
[Bratislava_z_Dunaja_2](https://commons.wikimedia.org/wiki/File:Bratislava_z_Dunaja_2.jpg),
[Bratislava_-_Rozvodnený_Dunaj_-_18._9._2024_05](https://commons.wikimedia.org/wiki/File:Bratislava_-_Rozvodnen%C3%BD_Dunaj_-_18._9._2024_05.jpg),
[Bratislava_from_Danube_2020_59](https://commons.wikimedia.org/wiki/File:Bratislava_from_Danube_2020_59.jpg).

## Pomník M. R. Štefánika pri Eurovei (#131, časť 4; 24. 11. 2026)

**Dielo a história:**
- Obnovený pomník podľa diela Bohumila Kafku. Kafka zomrel v roku 1942, takže dielo je voľné.
- Pôvodný pomník bol dokončený v roku 1938 na dnešnom Námestí Ľudovíta Štúra, asi 1 km na západ, oficiálne ho však
  neodhalili. Leva odstránili v roku 1940, pylón neskôr a sochu v roku 1954.
- Kópiu odhalili 4. 5. 2009:
  - postavu znovu vymodelovali Gotthard a Jan Janda;
  - architekt Pavol Kopačka upravil osadenie a znížil pylón;
  - sochu odlial DSB EURO Blansko.
- Lev je pôvodný bronz z roku 1938 (obnovený 1988), sem prenesený v roku 2009.

**Skladba:** dva samostatné bloky na jednej osi, na nízkej kamennej plošine.
- **Pylón:**
  - hranolový (nie zúžený obelisk), ~21,6 m vysoký a ~4,25 m široký;
  - hĺbka ~3,3–3,5 m (odmerané z fotky, istota nízka);
  - obklad zo svetlého krémového vápenca podobného travertínu (~#E4DCD4 na slnku), na čelnej strane mriežka 5 × ~17 dosiek.
- **Lev navrchu pylónu:**
  - bronzový, 6,4 m dlhý, 4,2 m vysoký so základňou, 5,9 t;
  - kráča na východ po vrchu pylónu, ľavou prednou labou sa opiera o šikmý štít so štátnym znakom na východnom konci;
  - chvost presahuje západný okraj, hlava a štít východný.
- **Socha Štefánika:**
  - ~5 m pred pylónom (k Dunaju) na samostatnom podstavci 3,44 m (umeniemesta: 3,50 m), ~2,8 × 1,9 m, obklad 3 × 2 dosky;
  - socha 7,40 m vrátane bronzovej základnej dosky, 6 t;
  - letec v kombinéze, kožená prilba s okuliarmi vysunutými na čelo, v pravej ruke zvinutý zvitok, pravá noha vpredu;
  - pozerá na juh k Dunaju (os ~187°), chrbtom k novej budove SND.
- **Bronz:** takmer čierny teplý hnedý, bez zelenej patiny.
- **Tabule:** predná na podstavci (meno a funkcie), Pittsburská dohoda na severnej strane pylónu. Text do hry nedávam –
  tabule sú prázdne.
- **Celková výška:** ~25,8 m nad plošinou. Údaje „27 m“ a „takmer 30 m“ sú o pylóne z roku 1938 (o ~7 m vyššom);
  „15 m“ je o pylóne z roku 1988 pri SNM.

**Poloha:**
- socha: OSM uzol 915661112 (48.1396932, 17.1231400) = hra x 1146,9, z 423,1;
- lev a pylón: uzol 4953350157 (48.1397715, 17.1231639) = hra x 1148,7, z 414,4.

**Model:**
- `js/mapa/pamiatky/stefanik.js` – zjednodušené, ale verné tvary (elipsoidy a valce z bronzu).
- Všeobecné sochy z OSM (Štefánik, lev) na tomto mieste ustúpia modelu (`nahradSochy`).
- Pozor na licenciu: sken sochy na Sketchfabe je CC BY-NC-ND, preto som ho ako podklad nepoužil.

**Neisté – vlastné fotky by pomohli:**
- celý pylón kolmo z východu alebo západu (hĺbka pylónu);
- zväčšený štít leva z východu;
- spodné časti východnej a západnej strany pylónu (ďalšie tabule – podľa Vrábla sú na pylóne tri);
- rohy plošiny.

Zdroje:
- M. Vrábel, *Vojenská história* 2010, s. 129 (rozmery);
- [umeniemesta.sk – dielo](https://umeniemesta.sk/diela/recuMgS47Yu0U9WjU);
- [pam.epocha.sk – pamätník](https://pam.epocha.sk/pamatniky-bratislava/ruzinov-vrakuna-pod-biskupice/milan-rastislav-stefanik-pittsburghska-dohoda-1918-nam-m-r-stefanika);
- [TASR / teraz.sk – návrat sochy](https://www.teraz.sk/slovensko/glvac-socha-stefanika-navrat-bratislava/83066-clanok.html);
- [The Slovak Spectator – lev sa sťahuje k divadlu](https://spectator.sme.sk/politics-and-society/c/bronze-lion-moves-to-the-theatre);
- Commons:
  - [kategória pomníka](https://commons.wikimedia.org/wiki/Category:Milan_Rastislav_%C5%A0tef%C3%A1nik_monument,_Bratislava);
  - [čelný pohľad](https://commons.wikimedia.org/wiki/File:Bratislava,_memorial_of_Milan_Rastislav_%C5%A0tef%C3%A1nik.JPG);
  - [lev](https://commons.wikimedia.org/wiki/File:Lev_socha,_Bratislava_18_Slovakia.jpg);
  - [z Dunaja](https://commons.wikimedia.org/wiki/File:Bratislava_z_Dunaja_2.jpg);
- OSM: [uzol 915661112](https://www.openstreetmap.org/node/915661112), [uzol 4953350157](https://www.openstreetmap.org/node/4953350157).

## Nivy a Nivy Tower (#132; 24. 11. 2026)

Prieskum: OSM (Overpass a API), laserové výšky v dlaždiciach hry a fotky z Commons z rokov 2021–2022. Jednu takmer kolmú
fotku z dronu som georeferencoval podľa OSM (7,74 px/m) a meral z nej strechu. Ďalej tlačové správy a stránky architektov.
Google som nepoužil. Platí postavený stav: vizualizácie z rokov 2017–2019 (zelenkavá strieška, „pétanque“, „bouldering“)
sa nepostavili.

**Nivy – centrum a autobusová stanica** (Benoy, SIEBERT + TALAŠ; strecha BDP, 2ka, Terra Florida; HB Reavis; otvorené
30. 9. 2021):
- **Hmota:** obrys OSM 829898609 má ~349 × 151 m a 40 980 m², dlhá os ~99°.
  - Nad zemou sú 3 obchodné podlažia a strešný park na úrovni ~21 m (laser).
  - V podzemí je na −1 autobusová stanica (~30 000 m², od 2025 prestavba), na −2 parkovisko.
  - Východná tretina strechy je otvorené parkovisko.
- **Fasáda:** nad prízemím je takmer slepá, z veľkých béžových panelov nepravidelných šírok (materiál žiadny zdroj
  neuvádza). Pri zemi sú tmavosivé panely a úzke zelené steny.
  - Na Mlynských nivách sú **tri presklené výbežky** (OSM 1243845382 / 81 / 79, ~35–38 × 13–17 m). Na 2. podlaží majú
    reštaurácie za oblým pásom skla, nad ním biely zaoblený pás po strechu a pod ním biely lem.
- **Hlavný vstup** je na západnom konci fasády pri Mlynských nivách (OSM 989250478):
  - tenká biela, mierne lomená doska ~50 × 25 m s LED linkou po okraji, na úrovni strechy ~17–20 m;
  - presklený otvor ~26 × 12 m s 5 priečnymi nosníkmi a nepravidelnou trojuholníkovou mriežkou;
  - nesú ju **4 šikmé sivé stĺpy v tvare Y**;
  - pod ňou je celopresklená vstupná hala.

  Podobná klinovitá strieška (~33 × 32 m) je pri Nivy Tower.
- **Strešný park** (12 000 m², viac ako 130 stromov):
  - **bežecký okruh** – oficiálne 550 m; OSM way 1579717717 má 533 m a os z fotky z dronu leží do 0,5 m od nej. Je široký
    ~2 m, tmavočervený, bez čiar. Popri ňom ide svetlý dláždený chodník široký 3–4 m (OSM 1058302220);
  - **svetlík v tvare J** – rameno ~105 × 11,6 m (na východe rozšírené na ~16 m), oblúk s vonkajším polomerom ~25 m
    a severné rameno ~13 × 55 m; nízka klenba s jemnou mriežkou;
  - **pílovitá strecha** nad halou – ~60 × 30 m, 6 šedov s presklením na sever, fotovoltika na južnom;
  - **zapustený dvor** – ~75 × 37 m, podlaha na 2. podlaží, drevené sedacie schody, žltá lezecká stena, esovitá drevená
    rampa;
  - **pavilóny a kabíny** – dva drevené valcové pavilóny so zelenou strechou, 5 hrdzavých kabín výťahov;
  - **ihrisko „slnečná sústava“** – žlté slnko s prstencami.
- **Výšky nad parkom:** technika ~28,8 m, kabíny 25–28 m (laser).

**Nivy Tower** (Benoy + SIEBERT + TALAŠ, 2017–2020):
- **Rozmery:** 125 m, 30 nadzemných a 3 podzemné podlažia. Obdĺžnik ~52 × 27 m (OSM 662313148), dlhá os ~98,8°,
  schodík 1,4 m na južnej strane.
- **Zárezy („stuhy“):** hmotu delia na troch stranách šikmé tmavé zárezy (ASB).
  - Južný ide od 15 m od JZ rohu pri zemi po ~33 m pri streche (~8–9°), merané na ortofote.
  - Východný ide od 16 m po 12 m od JV rohu, západný je ~12 m od JZ rohu.
  - V noci v nich svieti modrá LED.
- **Hmota nahor:**
  - Severná doska a juhovýchodný blok idú po 125 m; severná doska má navrchu ~2 podlažia tmavých protidažďových žalúzií
    nad technikou.
  - Juhozápadný blok končí ~113 m. Na ňom je ustúpená presklená reštaurácia (29. NP) s terasou na juhozápad.
  - Strieška, koruna ani anténa nie sú.
- **Fasáda:** závesová stena (19 000 m² skla Saint-Gobain) v dvoch odtieňoch, zelenkavom a modravom.
  - Odrazivosť je len 13–26 %, takže v slnku pôsobí oceľovo modro, pod mrakmi tmavomodro – nie je to zrkadlo.
  - Má potlačené nepriehľadné polia a modul ~1,35–1,40 m.
  - Prízemie a reštaurácia sú priehľadné. Logo nájomcu sa nemodeluje.
- **Vstup:** päťuholníková strieška východne od veže (OSM 829898611, ~34 × 32 m) – biely podhľad, presklený stred,
  stĺpy v tvare Y.

**Rozhodnutia pre model:**
- **Generovanie:** `tools/blender/osm_nivy.py` vyrobí `tools/blender/data/nivy.json` a `tools/blender/vyskove/nivy.py`
  z neho model.
- **Hmota Nív:** postavená z hlavného obrysu po park (21 m), s otvorom pre dvor. Časti z OSM nemajú hmotu po park
  modelovanú jednotne – hlavný obrys má 7 podlaží a väčšina častí 2–4.
- **Strieška pri veži** je v modeli `nivy-tower`.
- **Interiér:** vchody z OSM sú vo `vchody` (na neskorší interiér).

**Neisté – vlastné fotky by pomohli:**
- západná strieška zboku z chodníka pri zastávke (výška, poloha stĺpov) a pohľad hore na mriežku;
- dráha zblízka (povrch, značky);
- severná (Páričkova) a východná fasáda Nív;
- Nivy Tower:
  - celá z juhozápadu (zárezy, ustúpená reštaurácia);
  - východná strana (zárez a žalúzie);
  - západná strana.

Zdroje:
- [HB Reavis – Nivy](https://hbreavis.com/en/project/nivy-mall/);
- [noviny.sk 2021](https://www.noviny.sk/slovensko/633454-hb-reavis-postavil-bratislave-novu-autobusovu-stanicu);
- [EFB – zelená strecha](https://efb-greenroof.eu/?p=8775);
- [Benoy](https://www.benoy.com/news/2021/10/benoy-project-nivy-opens-in-bratislava/);
- [BIG SEE 2023](https://bigsee.eu/?p=130866);
- [Wikipédia](https://sk.wikipedia.org/wiki/Nivy_(multifunk%C4%8Dn%C3%A9_centrum));
- [startitup 2025 – prestavba stanice](https://www.startitup.sk/autobusova-stanica-nivy-v-bratislave-prechadza-rekonstrukciou-toto-su-najzasadnejsie-zmeny/);
- [HB Reavis – Nivy Tower](https://hbreavis.com/en/project/nivy-tower-2/);
- Saint-Gobain *Glass for Façade 2019*, s. 34–35;
- Commons – séria z otvorenia 30. 9. 2021 (CC BY 2.0, ŽupaBA) a `Nivy Centrum in Bratislava.jpg` (2022);
- OSM ways 829898609, 662313148, 1579717717, 1058302220, 989250478, 829898611, relation 22058963.

## Slovenský rozhlas – Pyramída (#125; 24. 11. 2026)

**Stavba:** Štefan Svetko, Štefan Ďurkovič, Barnabáš Kisling (a M. Skočková-Pisončíková); 1967–1983, vysielanie od 1985.
Národná kultúrna pamiatka od 6. 12. 2017. Oceľovú konštrukciu (350 t) dodali Vítkovice v roku 1976, v roku 2022 dostala
nový náter.

**Poloha:** stred ihlanu je x 464,3, z −1168,1. Súhlasia s ním vrstvy OSM, jadro aj stožiar (uzol 700362876,
`height=82.64`). Záznam v hre (466,85, −1176,21) je ťažisko celého areálu (way 5215475), od stredu ihlanu ho delí len
8,5 m, takže je správne. Miesto, kde stál majiteľ (472, −1070), je križovatka Mýtnej s Námestím slobody 98 m južne,
~38 m pred hlavným vstupom – odtiaľ vidno ihlan nárožím.

**Natočenie:** strany na azimutoch 33,5° a 123,5°. JV stena hľadí na Mýtnu a nesie nápis, JZ stena na Námestie slobody.

**Ihlan:**
- **Podlažia:** 6 kancelárskych podlaží po ~3,45 m. Každá doska presahuje nižšiu o ~3,1–3,3 m na stranu
  („každé poschodie sa rozširuje o 3,3 m“).
- **Šikmá stena:** nárožia aj mriežka ležia v jednej šikmej rovine (~46–48°), takže zvonku je stena súvislá, nie schody.
- **Rozmery a výšky:**
  - horná hrana: štvorec 74,6 m;
  - spodná doska: ~35–37 m;
  - spodok ihlanu: ~16 m nad zemou;
  - horná hrana: ~38,5 m.
- **Mriežka:** na každej stene dve sady oceľových prútov rovnobežných s bočnými hranami. Tvoria kosoštvorce –
  12 polí po ~6,2 m na hornej hrane, jeden kosoštvorec na 1 pole × 2 podlažia, nárožné prúty dvojité. Mriežka pokračuje
  o podlažie nižšie k hlaviciam stĺpov.
- **Pásy podlaží:** hnedé čelo dosky (~1,1 m), tmavý pás okien (~1,7 m) a svetlosivý rebrovaný podhľad dosky nad ním.
- **Farba ocele:** po nátere 2022 tmavá čokoládovo hnedá (~#4a332e), predtým zvetraná hrdzavohnedá (~#74403a).
  Je to natieraná oceľ, nie corten.
- **Podopretie:** „tmavé jadro“ z opisu sú v skutočnosti 8 hnedých krížových oceľových stĺpov (rohy a stredy strán
  štvorca ~31 m, hlavice ~12,6 m) s rozvetvenými vzperami. Vnútri je tehlový blok okolo betónového jadra 13 m,
  v tieni pôsobí tmavo.
- **Strecha:**
  - presklená atika s hnedými stĺpikmi (~54 m, do ~45 m);
  - tmavohnedá rebrovaná atika (~40 m, do ~49,5 m);
  - veža (~13,5 m, do 67,5 m) so šikmými vzperami;
  - mriežkový stožiar do 82,6 m (uvádza sa „80 m“).
- **Nápis „SLOVENSKÝ ROZHLAS“:** len na hornej hrane SZ a JV steny (na JZ nie je). Je centrovaný, dlhý ~36 m,
  písmená ~2 m, červenooranžové so svetlou tvárou, na tenkom ráme nad hranou.

**Podnož** (OSM časti s výškami 4,2 – 16,8 m):
- **Materiály:** červenohnedá klinkerová tehla, biely debnený pohľadový betón, niekoľko lososových omietnutých plôch.
  Strechy sú pochôdzne terasy.
- **Vstup v južnom rohu:** jednopodlažné krídlo s bielou betónovou strieškou (OSM 616786276, ~18,5 × 6,5 m) na 4–5
  stĺpoch, presklené prízemie a vedľa široké schodisko s 27 stupňami na terasu.
- **Koncertné štúdio:** SV blok k Belopotockého, 16,8 m, takmer bez okien, tehla; sála 12 000 m³ s 522 miestami
  a organom so 6 373 píšťalami.
- **Ostatné krídla:** okolo štúdia a na JZ 12,6 m, na SZ 8,4 m, pri Mýtnej 4,2 m s bielym betónovým múrom.

**Rozhodnutia pre model** (`tools/blender/vyskove/rozhlas.py`):
- Ihlan je postavený z výšok a strán dosiek podľa prieskumu, natočený podľa hornej vrstvy OSM.
- Podnož je z obrysov OSM (`tools/blender/data/obrysy.json`).
- Nápis je na SZ a JV hrane. Ide o verejnú inštitúciu, rovnako ako nápis UNIVERZITA KOMENSKÉHO.
- Nápis na strieške vstupu (názov inštitúcie po premenovaní na STVR) sa nedáva.
- Prieskum predpokladá rozdiel medzi OSM a fotkami v rozmeroch atík. Použité sú hodnoty z fotiek.

**Neisté – vlastné fotky by pomohli:**
1. JV stena kolmo spoza Mýtnej (~x 533, z −1123);
2. strecha zhora zo západu alebo severozápadu (z vyššieho miesta);
3. stĺpy a tehlový blok z terasy pod ihlanom.

Zdroje:
- [sk-Wikipédia](https://sk.wikipedia.org/wiki/Budova_Slovensk%C3%A9ho_rozhlasu)
- [en-Wikipedia](https://en.wikipedia.org/wiki/Slovak_Radio_Building)
- [ASB](https://www.asb.sk/architektura/budova-slovenskeho-rozhlasu)
- [Archiweb](https://www.archiweb.cz/en/b/slovensky-rozhlas)
- [Register architektúry](https://register-architektury.sk/en/objekt/165-slovensky-rozhlas)
- [Structurae](https://structurae.net/fr/ouvrages/slovensky-rozhlas)
- [STVR – 40 rokov](https://www.stvr.sk/novinky/tipy-z-programu/397071/pyramida-slovenskeho-rozhlasu-oslavuje-40-rokov-preco-je-to-vlastne-pyramida)
- [zmudrig.sk](https://zmudrig.sk/preco-vyzera-budova-slovenskeho-rozhlasu-ako-obratena-pyramida/)
- [archinfo.sk – obnova ocele 2022](https://www.archinfo.sk/diskusia/blog/pamiatky-historia/obnova-ocelovej-konstrukcie-budovy-slovenskeho-rozhlasu-v-bratislave-bola-oficialne-ukoncena.html)
- [Commons – kategória](https://commons.wikimedia.org/wiki/Category:Slovak_Radio_Building)
- OSM: ways 5215475, 277448084, 372316287–92, 616786276, uzly 700362876 a 3730845224.

## Národná banka Slovenska (#126; 24. 11. 2026)

**Stavba:** Martin Kusý a Pavol Paňák (víťazný návrh súťaže), výstavba od 11/1996, otvorená 23. 5. 2002. Zhotoviteľ
Združenie H–V–Z (Hydrostav, Váhostav, ZIPP). 33 nadzemných podlaží, z nich 6 tvorí podnož, 3 podzemné + medzipodlažie.
Výška 111 m (NBS), 111,6 m po strechu (OSM, SkyscraperPage), 111,7 m (CTBUH). Zastavaná plocha 6 272 m².
Dvojplášťová fasáda, 23 výťahov, z toho 6 rýchlovýťahov (3,15 m/s) v obvodovej presklenej šachte veže.

**Poloha:** záznam v hre (549,38; −1 099,95) je ťažisko celej budovy (OSM way 10158374), je správny. Terén pri hlavnom
vstupe má ~146,7 m n. m., k Slovanskej klesá na ~145,0 m. Model preto stojí na teréne pri vstupe.

**Veža** (OSM way 229588344, fotky z Commons):
- **Pôdorys „kvapka“:** na západ (k Mýtnej a Námestiu slobody) kruhový oblúk s polomerom ~21,8 m a uhlom ~120°.
  Z neho idú na východ dve navzájom kolmé rovné steny po ~23,5 m (azimuty 122° a 33°) a zaoblený východný roh (R ~10 m).
- **Fasáda:** sklo číre až jemne zelenkavomodré, v module ~1,4 m. Na každom podlaží je strieborný vodorovný pás – lávka
  medzi plášťami. Na oblúku pôsobia pásy veľmi výrazne.
- **Zaoblený východný roh:** obložený tmavými kovovými lamelami (~#3f4246) po celej výške.
- **Šachta výťahov:** vedľa rohu je úzka presklená šachta panoramatických výťahov, ktorá prečnieva nad strechu.
- **Zužovanie v troch stupňoch:**
  - **Spodný pás** (OSM 411828059) okolo oblúka, ~5 m hlboký. Má 10 podlaží a končí terasou na ~34,5 m.
    Na hrane terasy je von sklonená sklenená zástena (~2 – 3 m) na šikmých oceľových konzolách.
  - **Dve „plecia“** (OSM 411828062/065) pozdĺž rovných stien, každé ~23,5 × 5 m, siahajú po ~70 m.
    - Na fotke zo severu je nad plecom ~12 podlaží veže, OSM uvádza 20 podlaží a teleobjektív ~69 – 70 m.
      Laser v dlaždici hry ukazuje 77,8 m, ale pás je len 5 m široký a medián zrejme zachytil aj vežu.
    - Ich 5 m široké čelá vedľa oblúka sú od ~33 m nahor obložené tmavými lamelami. To sú tmavé zvislé pásy, ktoré
      vidno z Námestia slobody. Pod nimi sú svetlé hliníkové panely (~#a9b0b6).
  - **Hlavné teleso** končí plochou strechou s heliportom na ~111 m.
- **Koruna:**
  - nad posledným podlažím presklená atika a za ňou tmavšie technické podlažie;
  - nad oblou časťou heliport: doska s priemerom ~20,5 m zdvihnutá nad atiku, okolo nej prstenec 16 – 20 tmavých
    radiálnych konzol so sieťou a rúrou (spolu ~27 m);
  - na JZ tenký stožiar s bleskozvodom.
  - Na heliporte nikdy nepristál vrtuľník.
- **Výška podlažia veže** je ~3,4 m (odhad z lasera a fotiek: strecha podnože ~12,8 m, terasa pásu ~34,5 m,
  plecia ~70 m, strecha veže ~111 m).

**Podnož** (OSM 411828068, 1278278316/17/19/20):
- **Rozsah:** zaberá celý blok medzi Mýtnou, Imricha Karvaša a Slovanskou.
- **Kamenná časť:** 2 podlažia (~8,4 m) obložené leštenou portugalskou žulou, svetlou béžovosivou s ružovkastým
  nádychom (~#c2bab0).
  - Úzke, hlboko osadené zvislé okná: ~1 × 2,8 m v prízemí, ~1 × 2 m vyššie, os ~2,6 m.
  - Pri vstupe je stena zaoblená (vypuklá).
  - Strany k Slovanskej a Imricha Karvaša sú biele.
- **Hlavný vstup:** vysoký presklený zárez (~7 m) na rohu Mýtnej a Imricha Karvaša, otočený na JZ.
- **Ustúpené presklené podlažie** nad kameňom; pred ním stoja štíhle okrúhle stĺpy (~0,4 m, rozostup ~6,5 m).
- **Vyššie krídlo** k Slovanskej siaha do ~21,4 m. Vnútri sú tri átriá, hlavné má lipy, nad ním je sklená strecha.
- **Severná špica** (OSM 1278278319): 6 podlaží, biela, do ~20 m.

**Strieška („markíza“, OSM 411828074, `building:part=roof`):**
- **Stavba:** železobetónová doska nad celou 4-podlažnou časťou podnože; podhľad ~12 m, hrana ~0,8 m (~#cfcfcb).
- **Tvar:** nad rohom pri vstupe vystrkuje ostrý klin – hrany ~35 m pozdĺž Mýtnej a ~64 m pozdĺž Imricha Karvaša.
- **Podhľad:** tmavý kazetový rošt ~2,2 × 2,2 m natočený o 45° k hranám (kosoštvorce) – svetlejšie rebrá (~#9a9893),
  tmavé kazety (~#3f3a36).
- **Podpory:** okrúhle stĺpy (~0,3 – 0,4 m) po ~6 m pred ustúpeným presklením a jeden dlhý stĺp od terénu pri rohu
  podnože južne od vstupu. Klin nad rohom (presah ~19 m) je vyložený a nesú ho **dva kamenné pylóny** (~0,85 m).
  - Kamenné pylóny končia ~10,5 m a tenká tyč z nich prechádza kruhovými otvormi v doske (~3,3 m), cez ktoré vidno
    oblohu. Okolo otvorov je v podhľade biely „tanier“ (~4,8 m).
  - Na pylónoch visia zvislé zástavy ~1,4 × 4 m (vrch ~9,6 m): **SR vľavo a EÚ vpravo** pri pohľade od Mýtnej (od 2017).
- **Nápis:** veľký nápis s názvom banky na budove nie je.

**Biatec** (OSM node 4134276196):
- **Dielo:** bronzová socha mince od Ľudmily Cvengrošovej, model z roku 1988, signatúra „CVENGROŠOVÁ 88“.
  Odhalili ju v decembri 2008 ako symbol prechodu na euro.
- **Rozmery:** ~317 × 349 cm, minca ~3,2 m.
- **Podstavec:** krátka trojboká bronzová nôžka na bielom betónovom valci (~1 m, výška 26 cm) a štvorcovej doske ~1,8 m.
- **Líce:** cválajúci kôň s jazdcom (vavrínový veniec, ratolesť s lipovými listami) a nápis „BIATEC“.
- **Rub:** keltský ornament a nápis „BIATEC VLÁDCA KELTOV / NA ÚZEMÍ BRATISLAVY / SÚČASNÍK JÚLIA CAESARA“.
- **Natočenie:** líce hľadí od budovy k ulici.
- **Farba:** patina ~#5b5340, vyleštené časti ~#9c8458.
- **Iná socha:** od 06/2025 stojí pred budovou aj socha Imricha Karvaša. Je v `data/mapa/sochy.json` a model ju nemení.

**Rozhodnutia pre model** (`tools/blender/vyskove/nbs.py`):
- **Tvar veže:** oblúk a zaoblený roh sú kružnice preložené bodmi OSM. Plecia, pás a podnož sú z obrysov OSM; zaoblená
  stena pri vstupe je vyhladená.
- **Kolízie:** pod strieškou sa dá prejsť, kolíziu majú len podnož, pylóny, stĺpy a socha.
- **Biatec** je súčasťou modelu – socha z OSM ustúpi (`nahraditSochy`).
- **Rub mince** je bez textu: písmená by mali ~0,12 m a v hre by sa nedali prečítať.

**Neisté – vlastné fotky by pomohli:**
1. koruna veže zblízka (z Námestia slobody teleobjektívom);
2. podhľad striešky so stĺpmi zo stredu Imricha Karvaša pred vstupom, pohľad na SV;
3. čelo „pleca“ s lamelami;
4. strana k Slovanskej (vyššie krídlo podnože).

Zdroje:
- [NBS – leták o budove (2016)](https://nbs.sk/_img/documents/_publikacie/ostatnepublik/budovanbs.pdf)
- [nextroom.at (H. Moravčíková)](https://nextroom.at/building.php?id=30748)
- [ÖGFA – Architekturtage 2010](https://oegfa.at/programm/architekturtage/architekturtage-2010/headquarters-of-the-national-bank-of-slovakia)
- [CTBUH Skyscraper Center](https://www.skyscrapercenter.com/building/narodna-banka-slovenska/9035)
- [SkyscraperPage](https://skyscraperpage.com/cities/?buildingID=500)
- [Wikipedia – National Bank of Slovakia Tower](https://en.wikipedia.org/wiki/National_Bank_of_Slovakia_Tower)
- [noviny.sk – heliport (2023)](https://www.noviny.sk/slovensko/858508-heliport-bez-helikoptery-ake-su-plany-s-nevyuzivanou-plochou)
- [Umenie mesta – Biatec](https://www.umeniemesta.sk/diela/recdg8AVBEN1XstYJ)
- [pam.epocha.sk – Biatec](https://pam.epocha.sk/pamatniky-bratislava/stare-mesto/biatec-ul-imricha-karvasa)
- [Commons – kategória](https://commons.wikimedia.org/wiki/Category:National_Bank_of_Slovakia_(Bratislava))
- OSM: ways 10158374, 229588344, 411828059/62/65/68/74, 1278278316/17/19/20, uzly 4134276196, 4134276201, 4134276207/08.
- Laser ÚGKK (DMP − DMR) z dlaždíc hry.

## Obytný dom Glória (#128; 24. 11. 2026)

**Stavba:** Záhradnícka 60 × Ružová dolina (Ružinov); architekti Peter Gál a Juraj Furdík (len Wikipédia), výstavba
2004–2006, kolaudácia 2007. Výška 100 m (niekde 100,1 m), 29 nadzemných a 1 podzemné podlažie, 79 bytov.
Konštrukcia je betónová. Okná sú drevo-hliníkové so zvonka komaxitovaným hliníkom. Balkóny majú plný betónový
parapet s oceľovým madlom.

**Prieskum:**
- OSM 3D model z 12/2025 (changeset 176590232) – 8 častí `building:part` s výškami.
- Archív predajného webu (2007–2011): technický štandard a cenník bytov po podlažiach 5.–27. NP s plochami bytov,
  balkónov a terás; nebytové priestory 1. PP – 4. NP.
- Fotky z Commons 2006–2016 a laser v dlaždici hry.
- Google nie. Pôdorysy z predajného webu archív neuložil, výkresy z konaní online nie sú.

**Natočenie:** Záhradnícka je na S, Ružová dolina na Z. Dlhá východná stena smeruje na azimut 350,7°. Na V a J sú
na Glóriu priamo pristavané domy Záhradnícka 62 (9 NP, mansarda) a Ružová dolina 7 (10 NP) – spoločné steny do ~34 m.

**Hmoty a výšky (podlažia sú z cenníka a OSM, metre odvodené):**
- **podnož 1.–3. NP:** ~11,5 m, ~30 × 38 m, zaoblené SZ nárožie (r ≈ 15,7 m);
- **ustúpené 4. NP:** do ~15,3 m, terasy 188 m² na streche podnože;
- **veža 5.–20. NP:** do 69 m, 604 m²; hlavná doska ~13,3 × 29,4 m a západné krídlo so zaoblenou SZ stenou
  (r ≈ 10 m) a rovnou JZ stenou (~16 m);
- **horná hmota 21.–28. NP:** do 96 m, 307 m²; ďalšie terasy na 21. a 26. NP;
- **kocka 29. NP:** ~10 × 9 m, do 100 m, s vyloženou strešnou doskou; na nej stožiar s anténami (~4–6 m);
- **dva otvorené rámy na terase nad 20. NP:** žltá doska na bielych okrúhlych stĺpoch. Laser v dlaždici ich ukazuje
  na 78,6 – 80,1 m, OSM ich má ako plné časti do 86 m.

**Fasády (z fotiek, farby približné):**
- **Omietka a pásy:** svetlosivá omietka (#c9cbc6), modrošedé zvislé pásy na nárožiach a v zárezoch (#8e9dad).
- **Okná:** pravidelné okná s červenými rámami (#b3202c).
- **Sever:** dva stĺpce sýtožltých oblúkových balkónov (#e3c12a, do 2016 vybledli), hlbokých ~2–2,5 m, s plným
  parapetom 1,1 m, cez 5.–20. NP. Medzi nimi je svetlosivý pilier ~4–5 m.
- **SZ oblúk a JZ stena:** priebežné vlnité (esovité) bledožlté balkóny (#ece3b8) v dvoch úsekoch, medzi nimi
  modrošedý zárez.
- **Strechy:** tenká vyložená doska (presah 1–1,5 m) so žltým vlysom pod ňou.

**Podnož:**
- strieborné hliníkové panely (#c8cdcb), veľké okná s červenými rámami, prízemie za okrúhlymi stĺpmi;
- na S/SZ oblúku v úrovni 2. NP plastický nápis „Gloria“ písaným písmom (~1 m). Je to meno domu, nie firmy;
- emblém ruže z roku 2006 sa nemodeluje.

**Rozhodnutia pre model** (`tools/blender/vyskove/gloria.py`):
- Hmoty sú z OSM, veža v osiach budovy so zaoblenou SZ stenou. Zuby na severe v OSM sú balkóny, nie stena.
- Rámy na terase majú hornú hranu 79,8 m (laser).
- Nápis je obyčajným písmom Blendera, nie písaným (licencia písma).
- Vchody do bytov a garáže v OSM nie sú, preto ich model zatiaľ nemá.

**Neisté – vlastné fotky by pomohli:**
1. nárožie podnože kolmo na nápis z chodníka pri zastávke električky;
2. celé SZ nárožie veže zo stredu križovatky (zaoblenie a počty balkónov);
3. južná a JV fasáda po celej výške;
4. strecha z výšky.

Zdroje:
- [sk-Wikipédia](https://sk.wikipedia.org/wiki/Gl%C3%B3ria_(budova))
- [en-Wikipedia](https://en.wikipedia.org/wiki/Gl%C3%B3ria_(Bratislava))
- [CTBUH](https://www.skyscrapercenter.com/building/gloria/11313)
- [Structurae](https://structurae.net/en/structures/obytny-dom-gloria)
- [archív predajného webu – štandard](https://web.archive.org/web/20070302234411/http://3xw-design.co.uk/portfolio/sites/gloria/index.html)
- [archív – byty](https://web.archive.org/web/20110409134633/http://3xw-design.co.uk/portfolio/sites/gloria/bytove_g.html)
- [archív – nebytové priestory](https://web.archive.org/web/20110408062455/http://3xw-design.co.uk/portfolio/sites/gloria/nebytove_g.html)
- [Commons – kategória Glória House](https://commons.wikimedia.org/wiki/Category:Gl%C3%B3ria_House)
- OSM: way 61398274, časti 1462633086–1462633101, [changeset 176590232](https://www.openstreetmap.org/changeset/176590232).

## Sky Park Tower – stavenisko (#129; 24. 11. 2026)

**Stavba:** Landererova × Čulenova (Downtown). Architekt Zaha Hadid Architects, developer Alto Real Estate (pôvodne
Penta), žeriavy zo Skansky. Budova bude mať 33 nadzemných a 5 podzemných podlaží a 393 bytov. Na 1.–3. NP budú
obchody a kancelárie, na 30.–33. NP penthousy.
- Výkres situácie: ±0,000 = 137,55 m n. m., atika +119,45 m, anténa +124,79 m (preto sa uvádza 120 aj 125 m).
- Dokončenie: Q3 2027 (ASB, ponuka bytov) alebo Q2 2028 (stránka projektu, YIM.BA).

**Pôdorys:** jedna budova z dvoch oblých lalokov spojených užším pásom („dvojité zakrivenie“, arašid) s jedným jadrom,
nie dve veže. 1.–8. NP tvorí terasovito rozšírenú podnož so zeleňou (k parku na SZ a na V). Od 8. NP má pôdorys
~64 × 36 m. OSM way 1503417607 (~74 × 41 m, dlhá os ~111°) je obrys podnože.

**Stav k 11/2026** (ASB 13. 10. 2026, YIM.BA 26. 8. a 12. 10. 2026, Liebherr 6/2025):
- **Hrubá stavba:** 13. 10. 2026 bola na 14. NP (tempo 10–20 dní na podlažie). Model má stropy po 17. NP (~58 m).
- **Jadro:** ~4 podlažia nad stropmi, žlté/okrové samošplhacie debnenie s plošinami a červený betónovací stožiar.
- **Vrch stavby:** vrchné ~3 podlažia obopína pás žltých ochranných panelov.
- **Nižšie podlažia:**
  - holé sivé stropy, biele obvodové stĺpy (prefabrikáty) a modré zábradlia;
  - modré záchytné siete okolo 5.–9. NP a oranžové murivo po 8.–9. NP;
  - 1.–3. NP sú už zasklené (zelenkavé sklo v tmavých rámoch);
  - montáž bieleho GRC exoskeletu sa začala v 10/2026, zatiaľ hlavne na podnoži.
- **Parter:** biela oblá markíza, okolo oblých častí podnože sivé rúrkové lešenie.
- **Žeriavy:**
  - Z/SZ: Liebherr 190 HC-L so sklopným výložníkom (žltý stožiar, červený výložník);
  - V/SV: 150 EC-B flat-top, celý žltý;
  - oba majú vyrásť na 145 m. Malý tretí žeriav na fotkách z 10/2026 nie je.
- **Okolie:** oplotenie pozdĺž Landererovej, kontajnery a buňky.

**Terén:** laser ÚGKK zachytil stavebnú jamu hlbokú až 12 m (sken počas výkopu). Dnes sú v nej podzemné podlažia
a prízemie je na úrovni Landererovej. Jama je v `tools/mesto/laser/tunely.json` (záznam s „oblast“) zarovnaná
`zasyp_tunely.py` plynulo od ulice po park.

**Rozhodnutia pre model** (`tools/blender/vyskove/sky_park_tower.py`):
- Stav k novembru 2026, výška hrubej stavby je odhad (posledná správa je zo 13. 10.).
- Obrysy podlaží: 1.–3. NP celý obrys OSM, 4.–7. NP ustupujúce terasy, od 8. NP obrys ~4 m dnu.
- Plot bez názvov a log.
- Hotový stav (biely exoskelet, zelené terasy) zatiaľ nie je – ak sa raz bude stav meniť podľa herného dátumu.

**Neisté – vlastné fotky by pomohli:**
1. z rohu Landererova × Čulenova na SV (počet podlaží, žltá ochranná stena, poloha žeriavov);
2. z parku Sky Parku od Residence 1 na juh (severná strana podnože).

Zdroje:
- [ASB 13. 10. 2026](https://www.asb.sk/development/sky-park-tower-je-v-polovici-vystavby)
- [YIM.BA 12. 10. 2026](https://www.yimba.sk/sky-park-offices/vysoky-standard-nie-je-len-slubom-sky-park-tower-nabera-vysku-a-vypredava-jeden-byt-za-druhym)
- [YIM.BA 31. 8. 2026](https://www.yimba.sk/sky-park-offices/v-polovici-vysky-a-predsa-uz-je-dominantou-sky-park-tower-ziskava-miestami-finalnu-podobu)
- [YIM.BA 12. 4. 2026](https://www.yimba.sk/sky-park-offices/novy-pohlad-na-downtown-a-netradicny-sposob-vystavby-sky-park-tower-pokracuje-v-raste-a-ziskava-aj-fasadu)
- [Liebherr 3. 6. 2025](https://www.liebherr.com/en-kr/n/liebherr-cranes-at-work-constructing-the-final-skypark-tower-in-bratislava-169344-5461608)
- [skyparktower.sk – fasáda 6. 10. 2026](https://www.skyparktower.sk/blog/sky-park-tower-zacina-s-instalaciou-jedinecnej-fasady-a-otvara-novu-ponuku-4-izbovych-rezidencii/)
- [stavebnymagazin.sk](https://stavebnymagazin.sk/sky-park-tower-v-bratislave-veza-ma-byt-hotova-v-roku-2027-byty-su-uz-v-predaji/)
- OSM way 1503417607 (stavba), 902159858 (stavenisko).

## Dunajská 2–12 pri Kamennom námestí – podlubia a arkiere (#64; 24. 11. 2026)

**Prieskum:** OSM, kataster (ZBGIS/ESKN, INSPIRE WFS), ortofoto ZBGIS 2023, laser v dlaždiciach hry, fotky z Commons,
dohoda mesta o revitalizácii chodníka (CRZ 2022). Google nie.

**Poloha:** párne čísla sú južne od osi Dunajskej, fasády hľadia na sever. Obchodný dom je na severnej strane.
Uličná čiara parteru vedie v hre cez body (476,1; −96,1) a (550,9; −114,0).

**Domy:**
- **Dunajská 2** (OSM 386574223): 6 podlaží + podkrovie s vikiermi, odkvap ~22,4 m, hrebeň ~26,6 m. Podlubie
  ani arkier nemá, v hre je správne.
- **Dunajská 4** (OSM 74739754): 8 podlaží a nadstavba, ~32,8 m.
  - Tmavý antracitový sokel na prízemí a 1. p. (~8,5–9 m), vyššie pásy kameňa typu travertín (~#c9bfae) a pásové okná.
  - Stredný arkier (x 492–503) je vyložený konzolovo nad soklom. V katastri je pred domom pás 8878/2 hlboký
    1,5–3,5 m, na fotkách vyzerá vyloženie skôr na 1–2 m.
  - Najvyššie podlažia ustupujú v stupňoch po ~1,5–2 m.
- **Dunajská 6–8** (OSM 1388864526, súp. č. 7614): polyfunkčný dom po roku 2008, 8 podlaží, ~27 m pri ulici,
  dozadu terasovito klesá.
  - Prízemie a 1. p. stoja na uličnej čiare. Horné podlažia (2. p. a vyššie) sú vyložené o ~2,5 m nad chodník –
    obrys OSM je obrys vyložených podlaží.
  - Vyložené časti: sivý panelový arkier (8 m, ~#66676b) a sklená fasáda (19,5 m) pred lodžiami s tehlovočervenou
    stenou. Medzi nimi a na koncoch je béžový kamenný obklad (~#c2b49a).
  - Na streche je presklená rotunda.
- **Dunajská 12** (OSM 74740002): ~20,5 m, sklený raster, stojí ~5 m pred čiarou Dunajskej 4.

**V hre** (ručné opravy `data/mapa/opravy-budov.json`, nové polia `podlubie` a `arkiere` v `js/mapa/budovy/opravy.js`):
- **Dunajská 6–8:** prízemie a 1. p. sú ustúpené o 2,5 m pod vyložené podlažia, pod nimi sa dá prejsť po chodníku.
  Na vyložených podlažiach je sivý arkier a sklená fasáda.
- **Dunajská 4:** kamenná farba, tmavý sokel a vyložený stredný arkier (2 m) a východný segment (1,2 m) nad soklom.
- Ustúpené horné podlažia už kreslí LOD2 strecha z lasera (#86, #103).

**Neisté – vlastné fotky by pomohli:**
1. z chodníka pod arkiermi Dunajskej 6–8 (hĺbka vyloženia);
2. celkový pohľad na Dunajskú 4 z Kamenného námestia.

Zdroje:
- [CRZ – dohoda o revitalizácii chodníka Dunajská 6–8 (2022)](https://www.crz.gov.sk//data/att/3599820.pdf)
- [Commons – kategória Dunajská 4](https://commons.wikimedia.org/wiki/Category:Dunajsk%C3%A1_4) a fotky
  [Bratislava (005)](https://commons.wikimedia.org/wiki/File:Bratislava_(005).jpg),
  [(010)](https://commons.wikimedia.org/wiki/File:Bratislava_(010).jpg),
  [(011)](https://commons.wikimedia.org/wiki/File:Bratislava_(011).jpg)
- [Kiacek 2023, ALFA](https://alfa.stuba.sk/wp-content/uploads/2023/06/02_2023_Kiacek.pdf) – regulácia bloku Špitálska–Dunajská
- kataster: [INSPIRE WFS parcely](https://inspirews.skgeodesy.sk/geoserver/cp/ows)
- OSM ways 386574223, 74739754, 1388864526, 74740002.

## Mosty cez Dunaj – SNP, Starý most, Apollo, Prístavný, Lafranconi (25. 11. 2026)

Spracované do `tools/mesto/mosty-dunaj-data.mjs` → `data/mapa/mosty-dunaj.json` a modelov `tools/blender/mosty/*.py`.
Výšky sú v m n. m. Bpv (hra: y = výška − 139).

**Spoločný zdroj výšok – laser ÚGKK.**
- Povrch mostovky je z DMP 2.0 a terén z DMR 6.0 (© ÚGKK SR, CC BY 4.0).
- Body sa vzorkovali cez verejnú službu INSPIRE WMS, GetFeatureInfo:
  [el_dsm](https://inspirews.skgeodesy.sk/geoserver/el_dsm/ows) a [el](https://inspirews.skgeodesy.sk/geoserver/el/ows).
  Os mosta sa brala po 10 m, v jazdných pruhoch.
- Služba vracia elipsoidické výšky. Prepočet na Bpv: **−43,8 m**, kalibrované proti lokálnemu DMR (±0,2 m).
- Autá, stožiare, laná a oblúky sa z profilu vyhodili (medián alebo dolná obálka pruhov).
- Polohy mostov sú z OSM (`man_made=bridge`, úseky ciest s menom mosta, `bridge:support=pier`) a ODbL.
- Nič z Google Maps, Earth ani Street View. Fotky z Wikimedia Commons sme len prezreli a neukladali.

### Most SNP (1972)
- **Dĺžky:** celá stavba 688 m, OSM obrys 238810163 (685 m). Skladá sa takto:
  - severná betónová estakáda ~130 m;
  - oceľový spojitý nosník 74,8 + 303 + 54 m: pilier hlavného poľa na staromestskej promenáde, potom pylón, potom koncová podpera na hrádzi;
  - južná betónová estakáda ~124 m. Zdroje: [sk.wiki](https://sk.wikipedia.org/wiki/Most_SNP), [SITA](https://sita.sk/most-snp-je-v-prevadzke-uz-50-rokov-vyrocie-si-v-bratislave-pripomenu-viacerymi-podujatiami/).
- **Prierez:** šírka 21 m.
  - Dvojkomorový oceľový nosník 4,6 m, steny ±6,3 m, konzoly 4,2 m. Zdroj: [Ároch a kol. 2026](https://doi.org/10.2478/cee-2026-0048).
  - Vozovky 2 + 2 pruhy. Na severnej estakáde je pravý pruh pre autobusy.
- **Lávky pre peších a cyklistov:** pod konzolami, ~3 m široké, ~3,6 m pod vozovkou.
  - Západná sa volá „Viedenská lávka“ (OSM 26668549), východná „Budapeštianska lávka“ (OSM 39533757).
  - Na Starom Meste vedie hore schodisko s 34 schodmi z Rybného nám. (OSM 228408096).
- **Laná:** jedna stredná rovina. Hlavné pole visí v troch bodoch, zadné laná kotvia ~75–80 m za pylónom.
  Body uchytenia v hlavnom poli sú odhad (~48, 98, 150 m od pylóna).
  Zdroje: [cs.wiki](https://cs.wikipedia.org/wiki/Most_Slovenského_národního_povstání), [register architektúry](https://register-architektury.sk/en/objekt/291-most-snp).
- **Pylón:** tvar A, 84,6 m nad terénom, sklon 17° k Petržalke. Nohy majú ~5,5 × 11 m (OSM 123233334/5) a sú ~28,5 m od seba.
- **Vozovka podľa DMP:**

  | miesto | m n. m. |
  |---|---|
  | Staromestská (na teréne) | 147,3 |
  | severná estakáda | 146,6–147,5 |
  | nad nábrežím | 148,4–149,5 |
  | vrchol nad riekou | **152,2** |
  | pri pylóne | ~150 |
  | násyp Panónskej cesty | 143,5 |

- **Pod mostom – sever:**
  - promenáda a pilier hlavného poľa;
  - Rázusovo nábrežie: 3 + 2 pruhy a električka v strede;
  - autobusový terminál s nástupišťami, stánkami a pamätníkom SNP;
  - Podchod pamäti.
- **Pod mostom – juh:**
  - Tyršovo nábrežie medzi nohami pylóna;
  - parkoviská a protipovodňový múr s priechodom;
  - EuroVelo 6 a Viedenská cesta na hrádzi;
  - park so skateparkom a fitnes ihriskom.
- **Neisté:** presné body lán a tvar stĺpov estakád. Pomohla by fotka z boku kolmo na most (z Eurovey alebo z Petržalky).

### Starý most (1890, nová oceľová konštrukcia 2016)
- **Dĺžky:** 465,4 m, polia 32,56 + 106,68 + 137,16 + 75,60 + 75,92 + 32,56 m.
  Zdroje: [Silnice železnice 2016](http://old.silnice-zeleznice.cz/clanek/vystavba-noveho-stareho-mostu-v-bratislave/), [ASB 2016](https://www.asb.sk/stavebnictvo/stary-most-v-bratislave), [Konstrukce 2017](http://old.konstrukce.cz/clanek/cinnost-geodeta-pri-montazi-a-vysuve-novej-ocelovej-konstrukcie-stareho-mosta-v-bratislave/).
- **Podpery:** opora 1, P2 (dolné nábrežie), P34 (nový, v rieke), P5 (v rieke), P6 (petržalský breh), P7 (Tyršovo nábrežie), opora 8.
  Kamenné piliere a opory sú z roku 1890 (žula, vápenec) a sú pamiatkovo chránené.
- **Nosníky:** hlavné nosníky 11,0 m od seba, rombická priehrada konštantnej výšky 11,285 m od P2 po P7.
  - Panely 7,56–8,14 m, horný pás 0,9 m, dolný 0,75 m.
  - Krajné polia majú nosník len 2,4–2,6 m vysoký. Nad P2 a P7 sú portály.
- **Prierez:**
  - Koľajisko je 8,0 m medzi zvodidlami: dve koľaje so 4 koľajnicami (1000 a 1435 mm), autá nie.
  - Mimo nosníkov sú konzoly 5 m: cyklopruh a chodník 3 m. Zábradlie má 1,3 m.
  - Nad P34 a P5 sú terasy, most je tam široký 33,25 m.
- **Farba:** zeleno-sivá podľa hlasovania z roku 2014. Zvonka zelená ~#5A9450, zvnútra svetlosivá ~#C0C0C4 (odhad z fotiek).
- **Niveleta:** oblúk R = 5600 m, vrchol ~148,6, pri oporách 4,16 %. Konce na laseri: sever ~143,0–143,5, juh 143,8.
  - Na severe je rampa na násype k Šafárikovmu nám.
  - Na juhu je násyp so zastávkou Sad Janka Kráľa, potom estakáda Artmedia (~200 m, v hre je to nadjazd z OSM).
- **Plavba:** 100 × 10 m nad hladinou 134,66.
- **Neisté:** tvar čiel pilierov proti prúdu. Pomohla by fotka čela piliera 5 alebo 34 z nábrežia.

### Most Apollo (2005)
- **Dĺžky:** 854 m.
  - Estakáda Petržalka ~110–143 m.
  - Oceľový spojitý nosník 52,5 + 61 + 61 + 63 + **231 (oblúk)** + 49 m. Piliere P6 … P12; P10 je jediný v rieke, P11 na ľavom brehu pri vode.
  - Estakáda Bratislava 195 m, za ňou ~120 m rampa medzi múrmi do Košickej. Laser ju nemá – v hre je to „násyp“.
  - Zdroje: [FIG 2011](https://www.fig.net/resources/proceedings/fig_proceedings/fig2011/papers/ts01e/ts01e_kopacik_kyrinovic_et_al_4845.pdf), [Doprastav](https://www.doprastav.sk/referencia/most-apollo/), [Dopravoprojekt](https://dopravoprojekt.sk/projekt/most-apollo-cez-dunaj-v-bratislave/), [noviny.sk](https://www.noviny.sk/zaujimavosti/150712-most-apollo-bude-mat-desat-rokov).
- **Os:** v pôdoryse je most v oblúku. V hre je os stred medzi oboma jazdnými pásmi z OSM (ways 59577497, 46689592, 1147196265, 1194096017/8).
- **Prierez:** šírka 32 m, 2 + 2 pruhy a stredný pás. Chodníky pre peších a cyklistov sú mimo rovín závesov (modré zábradlie). Estakády ~21–22 m.
- **Oblúk:** dve biele rebrá naklonené k sebe (~13°). Pri pätách ±10,5 m, vo vrchole sa dotýkajú.
  - Vrch rebier je **187,8** (DMP), ~37 m nad vozovkou.
  - 66 závesov do vejára. Zdroj: [Paulík, SME 2008](https://blog.sme.sk/peterpaulik/veda-a-technika/vystavba-mosta-apollo-cast-2-ocelova-konstrukcia).
- **Vozovka podľa DMP:**

  | miesto | m n. m. |
  |---|---|
  | Petržalka (násyp) | 141,4 |
  | vrchol pod oblúkom | 150,5 |
  | koniec estakády | 145,6 |
  | Košická (koniec rampy) | ~141,5 |

- **Plavba:** 11,75 m nad najvyššou plavebnou hladinou ([viaDonau 2023](https://www.viadonau.org/fileadmin/content/viadonau/05Wirtschaft/Dokumente/2023/20230921_Danube_bridges_int..pdf)).
- **Pod mostom – sever:** Pribinova (~4,5–5 m pod mostom), promenáda, prístav. Na most vedú schodiská a cyklošpirála.
- **Pod mostom – juh:** lužný les, hrádza s Klokočovou, Nové Lido.

### Prístavný most (1985)
- **Dĺžky:**
  - Cestný komplex D1 ~2,6 km.
  - Oceľový dvojpodlažný hlavný most ~461 m. Zdroj: [brožúra knižnice Petržalka](https://www.kniznicapetrzalka.sk/wp-content/uploads/2019/12/petrzalka-70x160-mosty-final.pdf).
  - Železnica km 12,965–15,263 (TTP 127 C).
- **Podlažia:** hore D1, ~30 m: 2 + 2 pruhy s odstavnými a stredný pás so stožiarmi. Dole dve koľaje, chodník (proti prúdu) a cyklotrasa (po prúde).
- **Nosníky:** Warren bez zvislíc, ~9,5 m vysoký, panely ~12,75 m (odhad z fotiek).
  - Jediný pilier v Dunaji je ~140 m od petržalského brehu. Polia ~140 + 240 + 85 m sú odhad.
  - Náter neutrálne sivý ~#9A9C9A.
- **Estakády:** dva samostatné betónové komorové nosníky na osemhranných stĺpoch.
- **Vozovka podľa DMP:** 157,3 (Petržalka) → **159,5** nad riekou → 154,6 (sever). Koľaj je ~148–150 m n. m.
- V hre je mostom len priamy úsek s menom mosta. Estakády v oblúkoch sú nadjazdy z OSM a výškou sa napoja na mostovku.
- **Neisté:** rozpätia a plavebná výška. Majú ich v albume mostov Dunajskej komisie (PDF nad 10 MB, otvoriť ručne).

### Most Lafranconi (1991)
- **Hlavný most:** 4 × 83 + 172 + 174 + 83 m (od Petržalky), 769 a 762 m. Severná estakáda ~370 m, spolu 1 134 m (OSM 282404783).
  Zdroj: [Dopravoprojekt](https://dopravoprojekt.sk/projekt/most-lafranconi-cez-dunaj-v-bratislave/).
- **Nosníky:** dva samostatné predpäté jednokomorové nosníky.
  - Rámová podpera v Dunaji, nad ňou je nosník 11 m vysoký, na 2 × 100 m sa parabolicky zníži na 4,7 m.
  - Ostatné podpery sú obdĺžnikové, jedna pod každým nosníkom.
- **Šírka:** 29,74 m medzi zábradliami, 3 + 3 pruhy (od roku 2020). Chodníky sú pod konzolami 4,7 m pod vozovkou. Zábradlie je tyrkysové.
- **Vozovka podľa DMP:**

  | miesto | m n. m. |
  |---|---|
  | násyp v Petržalke | 150,4 |
  | nad hrádzou | 151,4 |
  | vrchol nad riečnou podperou | **157,1** |
  | nad nábrežím a električkou | 154,1 |
  | severná opora | 152,3 |

- **Plavba:** 135 × 10 m.
- **Pod mostom:**
  - Pečniansky lužný les, hrádza s EuroVelo 6;
  - na severe Dvořákovo nábrežie, FTVŠ, P+R a Nábrežie arm. gen. L. Svobodu s električkou.

### Ďalšie mosty v Bratislave (zatiaľ nie v hre)
- **D4 Lužný most** (2021): ~2 933 m betónových komorových mostov. Zo západu sú to:
  - estakáda 782 m;
  - most nad Zemníkom 130 + 210 + 130 m;
  - most cez Dunaj 130 + 170 + 130 m;
  - estakáda 1 250,5 m.

  Šírka 35 m. Laser je starší ako most. Celý most leží v Bratislave (Jarovce, Podunajské Biskupice).
- **Čunovo:** cez vodné dielo vedie len cesta III. triedy po hrádzi k Danubiane, s mostmi cez prepady.
  Cez zdrž Hrušov ani cez derivačný kanál v Bratislave cesta nevedie.

## SND – historická budova a Ganymedova fontána (26. 11. 2026)

Model: `tools/blender/presne/snd.py` (spustenie cez `tools/blender/presne_blender.py -- snd`), fontána
`js/mapa/pamiatky/fontana-ganymedes.js`. Spoľahlivosť: **V** = vysoká, **S** = stredná, **N** = nízka. Fotky sa len
prezreli (farby ako priemer pixelov), výkresy ani fotky nie sú v repozitári.

### Poloha a pôdorys (OSM) – V

- Budova: OSM way 34571529 (https://www.openstreetmap.org/way/34571529) – `building=civic`, `building:levels=4`,
  architekti Fellner & Helmer, Gorkého 2. Bez `building:part` a `height`; `roof:shape=pyramidal` nesedí (strechy nižšie).
- Ťažisko 48.1423962 N, 17.1102176 E = v hre x 187,0 / z 122,7 (záznam v `data/mapa/pamiatky.json`). Plocha 1 876 m².
- Dlhá os má azimut 59,3° (dozadu ku Komenského nám.); **hlavné priečelie hľadí na ZJZ (≈ 239°)** k Hviezdoslavovmu
  nám. a fontáne. V modeli lokálna sústava u (po osi dozadu) a v (k ulici Gorkého).
- Hlavný kváder u −24,8 … +27,8 (52,6 m) × ≈ 34,4 m. Nárožné pavilóny priečelia vystupujú do bokov o ≈ 0,65 m
  (u −24,8 … −14,2), bočné rizality u 3,8 … 8,4 a 18,7 … 23,2 (predstup 0,3–0,5 m).
- Stredný rizalit priečelia: 16,4 m pri lícach krídel, zaoblené nárožia (štvrťkruh r ≈ 3,1 m) do čela širokého 10 m.
- Vstupný portikus 10 m široký, siaha ≈ 5,6 m pred rizalit (čelo u −33,6); celé priečelie je ≈ 8,8 m pred krídlami.
- Prístavba z rokov 1969–72: OSM way 294997446 (https://www.openstreetmap.org/way/294997446), u 27,8 … 45,1,
  šírka ≈ 33 m. Medzi ňou a historickou budovou je na bokoch úzka medzera (laser).

### Výšky – laser ÚGKK (DMP/DMR, INSPIRE WMS, https://inspirews.skgeodesy.sk/geoserver/el_dsm/ows) – V

Nula = chodník pri bokoch 138,9 m n. m. (Gorkého vozovka 138,2–138,4, predpolie 139,0–139,3).

| prvok | výška nad chodníkom |
|---|---|
| terasa na portiku / jej balustráda | 6,8 / 7,7 m |
| hlavná rímsa (vyloženie ≈ 0,8 m) | 15,4 m |
| plochá strecha obvodových krídel = vrch balustrády | 16,8–17,1 m (pás ≈ 6 m po obvode) |
| atika nad lodžiou / súsošie Tálie | 17,4 / ≈ 20,7 m |
| kupola nad priečelím: pätka / plošina / mreža | ≈ 17,5 / 22,7–23,3 (okraj 23,8) / ≈ 24,6–25 m |
| mansarda stredného traktu (≈ 21–24 m široká): päta / zlom / vrch | ≈ 17 / 21,7 / 22,3–23,1 m |
| vetracia vežička nad hľadiskom (≈ 3 × 5 m) | 28,4 m |
| javisková veža (u ≈ 7 … 20, šírka ≈ 21 m): odkvap / plošina / max. | ≈ 24–25,5 / 28,0–28,8 / **29,7 m** |
| zadný trakt za javiskom | 22,7 m, vyšší stred 23,7 m |
| prístavba: boky / stred | 16,8 / 19,2–19,7 m |

Javisko podľa sk Wikipédie 18 × 17,5 × 21,3 m, portál 10,5 × 7 m, točňa ⌀ 13 m. Laserové hrany ležia ≈ 1 m ďalej
k námestiu ako OSM – pôdorys z OSM, výšky z lasera.

### Fasády (fotky Wikimedia Commons, len prezreté) – V/S

- Zdroje: https://commons.wikimedia.org/wiki/File:Slovensk%C3%A9_n%C3%A1rodn%C3%A9_divadlo,_20210727_1149_0355.jpg
  (čelný pohľad), https://commons.wikimedia.org/wiki/File:Bratislava_Slovak_National_Theatre_Old-05.jpg,
  https://commons.wikimedia.org/wiki/File:Bratislava_Slovak_National_Theatre_Old-02.jpg (atika a kupola),
  https://commons.wikimedia.org/wiki/File:Slovak_National_Theatre_in_2019.09.jpg (strana Gorkého),
  https://commons.wikimedia.org/wiki/File:Tatra_T2_215_H1_Jesenskeho_ul.jpg (prístavba),
  https://sk.wikipedia.org/wiki/Historick%C3%A1_budova_Slovensk%C3%A9ho_n%C3%A1rodn%C3%A9ho_divadla,
  https://de.wikipedia.org/wiki/Slowakisches_Nationaltheater, https://snd.sk/en/node/45.
- Novorenesancia/neobarok, 1884–1886 (staviteľ I. Feigler ml.), NKP. Priečelie **11 osí (3 + 5 + 3)**.
- Členenie výšky: sokel 0–0,6 m; rustikované prízemie s mezanínom do 5,8 m (okná 0,7–2,5 a 3,8–4,8 m); kordónová
  rímsa; veľký pilastrový rád cez dve poschodia (korintské hlavice 13,0–13,5 m); okná 1. poschodia 7,0–9,3 m so
  segmentovou suprafenestrou do 10,5 m, okná 2. poschodia 11,3–12,9 m s rovnou rímsičkou; kladie 13,5–15,4 m
  s modiliónmi; balustráda 15,4–16,9 m s podstavcami a vázami. Rozpon osí ≈ 3,1 m.
- Rizalit: portikus so 4 podporami (krajné piliere s polstĺpmi, 2 toskánske stĺpy, os ≈ 3 m), za ním arkáda
  s 3 polkruhovými vchodmi, v zaoblených stenách po jednom polkruhovom vchode; nad tým lodžia so 4 stĺpmi veľkého rádu
  v čele a po 1 v nárožiach, 3 balkónové dvere s trojuholníkovými frontónmi, 5 horizontálne oválnych nik s bustami,
  v nárožiach malé balkóny; atika so zaoblenými koncami, nápisová doska s pozlátenými písmenami a rozetami, súsošie
  múzy Tálie s dvoma putti a dve sochy géniov na nárožiach atiky.
- Kupola: nízka, „prilba“ na zaoblenom obdĺžniku ≈ 11 × 16 m, zvislé lemy plechu, 2 oválne vikiere v kartušiach,
  plochý vrch s kovanou mrežou a dvoma vyššími stĺpikmi.
- Boky: rovnaké členenie, odhad **15–17 osí** (N – na Commons nie je kolmý záber boku), v bočných rizalitoch
  polkruhové vchody, nástenné lucerny na konzolách.
- Prístavba: svetlý travertínový obklad s pásmi tmavých okien (koncepcia V. Hazucha, projekt R. Hirth).

### Farby (odporúčané) – S

Omietka #E6DBBC, detaily #EFEBE2, rustika #C9B396 (škáry #8E7E6A), sokel #A9A497, plech na fotkách #A9B0B6 (v modeli
#86919C, lebo v teplom svetle hry svetlejšia sivá pôsobí béžovo), sochy #655C50, písmená #B8963E, rámy okien #3E352C.

### Ganymedova fontána – S

- OSM way 39993548 (https://www.openstreetmap.org/way/39993548), https://sk.wikipedia.org/wiki/Ganymedova_font%C3%A1na.
- Viktor Tilgner, 1888 (bronz odliala firma Beschorner, Budapešť). Ganymedes na orlovi so zdvihnutou miskou, na sokli
  4 deti s dunajskými rybami, na okraji misy 3 páry vodných zvierat.
- Stred 48.1422000 N, 17.1097207 E (hra x 150,1 / z 144,5), na osi divadla ≈ 9 m pred portikom.
- Dolná nádrž ⌀ ≈ 7 m so zaobleným obrubníkom 0,4–0,6 m; horná plytká misa ⌀ ≈ 4–4,5 m s okrajom ≈ 3,1–3,2 m;
  orol ≈ 5,8–6,0 m, vrchol ≈ 6,6 m. Kameň ≈ #CFC6B4, bronz ≈ #4A4A3C.
- Záznam fontány bol omylom v `styly` (štýly OSM budov) v `data/mapa/pamiatky.json`, takže sa nestavala a laser
  zo súsošia spravil strom – opravené, kontrola `pamiatky-model-mimo-stylov`.

### Čo chýba – vlastné fotky od majiteľa

1. Bočné fasády kolmo (z protiľahlého chodníka Gorkého a Jesenského, 2–3 zábery pri rizalitoch) – presný počet osí.
2. Strechy z výšky (z hradu alebo z vyššieho poschodia pri Hviezdoslavovom nám.) – tvar vetracej vežičky a vrch
   javiskovej veže.
3. Zadná horná časť nad prístavbou z Komenského nám. (okná a materiál zadného traktu).
