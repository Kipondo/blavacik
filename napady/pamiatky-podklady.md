<!-- Prieskum pre modely pamiatok (vetva feature/pamiatky-uk-vajce). Zdroje sú na konci; Google Maps/Earth sa nepoužívali (licencia). -->

# Podklady pre 3D modely: UK Šafárikovo nám., Eurovea, Sky Park

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
