# Blava City – dizajn hry (pracovná verzia)

> Živý dokument. Brainstorm, nie finálne rozhodnutia. Čo je označené **❓**, ešte treba doriešiť.
> Kód sa riadi `CLAUDE.md`; tento súbor hovorí, **čo** staviame, nie **ako**.

## 1. Pointa v jednej vete
Open-world hra v štýle akčných mestských hier, ale hlavný hrdina je **prvák z Košíc**, ktorý prvýkrát
prichádza do Bratislavy na vysokú a na internát. Hráč si sám volí, či bude vzorný študent,
brigádnik, kráľ párty, alebo pôjde cestou pochybných kšeftov – a hra mu za to dá zabrať.

**Cieľ humoru:** aby sa v hre našiel **každý vysokoškolák**, ktorý išiel prvýkrát na intrák – nielen
východniari. Humor je láskavý, zo situácií, ktoré pozná každý; Ďoďo sa smeje aj sám zo seba.
Východniarčina je korenie, nie terč.

## 2. Hlavná postava – Ďoďo
- **Meno:** Jozef Hudák, všetci ho volajú **Ďoďo** (v hre takmer výlučne).
- **Odkiaľ:** Košice. Typický Košičan – hrdý na východ, nahlas, srdečný, rád si vypije
  („dva piva“), mamin chlapec.
- **Na cestu:** mama mu zabalila **rezne** (v alobale aj v novinách), domáce koláče, zaváraniny
  a príkaz „zavolaj, keď prídeš“.
- **Povaha:** dobrák, ktorý sa rád ukazuje; v Bratislave ho všetko prekvapuje (ceny, tempo,
  „bratislavčina“). Občas naivný, ale nikdy hlúpy – často je najmúdrejší v miestnosti, len to tak neznie.

### Reč a jej vývoj („pobratislavčenie“)
Ďoďo začína hovoriť po východniarsky a postupne sa „pobratislavčí“. Riadi to ukazovateľ
**Bratislavskosť** (0–100), ktorý rastie s časom v meste a so socializáciou s Bratislavčanmi.

- Dialógy majú voliteľné varianty textu podľa úrovne: `vychod` / `mix` / `blava`
  (dáta v JSON, engine vyberie variant).
- Mama to komentuje do telefónu („Ďoďo, co ty tak hutoriš? Jak keby ši ňebul naš!“).
- Pri návšteve domova (❓ budúca misia) sa vráti k východniarčine.

**Znaky východniarčiny, z ktorých čerpať** (len inšpirácia, texty píšeme vlastné):
- prízvuk na predposlednej slabike, žiadne dlhé samohlásky, mäkké ś / ź („śe“, „ňeznam“),
- univerzálne „dva“ („dva piva“, „dva eura“), tvary typu „oni jeju“,
- slová: *ta* (tak/no), *šicko* (všetko), *dze* (kde), *co* (čo), *ňe*, *fras* („jak frasa“),
  *bandurky / grule / kompere* (zemiaky), *garadiče* (schody), *havaj* (WC, staršie a vtipné),
  *hutoriť* (rozprávať), *chlop*, *džad*,
- regionálna hrdosť: „som z východu“ s významným úsmevom; Šariš, Spiš, Zemplín, Abov.

**Príklady vlastných hlášok (návrhy):**
- „Ta dze tu je ta Eurovea? Na mape to bulo bliźko, a ja idzem už pul hodziny.“
- „Kava za tri eura? U nas za to mam obed aj s polievku.“
- „Ňeznam, co to je ‚brunch‘, ale ked tam daju rezeň, idzem.“
- „Vrátnička mi povedala, že po desiatej ňe. Ta ja ju poznam dva dni a už ma ňemuśi.“
- Bratislavčan mu nerozumie → v dialógu sa ukáže „preklad do bratislavčiny“.

**Zdroj inšpirácie pre tón:** slovenské internetové paródie východniarov a regionálny marketing
(napr. reštaurácie písané vo východniarčine), diskusie „Bratislava vs. východ“, internátne historky.
Žiadne reálne osoby ani ich hlášky v hre.

## 2a. Ľudia okolo Ďoďa (rozhodnuté)
- **Sociálny status na začiatku = 0.** Ďoďo v Bratislave nikoho nepozná.
- **Spolubývajúci – vždy náhodný** z 5 typov; každý rok sa losuje znova (môže padnúť aj ten istý):
  1. **Smradoch** – zázračne sa vyhýba sprche, ponožky žijú vlastným životom,
  2. **Ukrajinec** – pracovitý, popri škole robí, má najlepšie domáce jedlo na chodbe,
  3. **Ind** – zahraničný študent, pre ktorého je Bratislava aj Ďoďova východniarčina úplná záhada,
  4. **Trenčan** – stredoslovenský „normálny“ chalan, večne sa háda, kto hovorí správne,
  5. **Gamer** – nevychádza z izby, ale **stane sa Ďoďovým najlepším kamošom**.
  Humor zo situácií a povahy, nie z národnosti – každý spolubývajúci je sympatický a má svoj príbeh.
- **Mama:** hlavne telefonáty (vždy v najhoršej chvíli); **raz príde na intrák osobne** a donesie jedlo.
- **Frajerka:** viac možností, treba sa k nej dopracovať (socializácia, atraktivita, misie).
  Stretnúť ju môže ako spolužiačku, na párty, vo vlaku, na ulici alebo v práci.
- **Nepriatelia (viac naraz):** prísna vrátnička, vyučujúci, ktorý ho nemá rád, rival na intráku,
  revízor v MHD (opakovaný minibos).
- **NPC v meste:** typickí Bratislavčania a postavičky (dôchodcovia v MHD, turisti, holuby…),
  postupne sa budú pridávať. Politici a herci len ako **vymyslené typy** (viď 2c) – žiadne skutočné osoby.

## 2b. Stále postavy v meste (rozhodnuté, budeme pridávať)
> Ak sú inšpirované skutočnými ľuďmi z ulice, len voľne – iný výzor a detaily, aby sa nikto nedal
> spoznať. Bezdomovci sú sympatické postavy s vlastnou hrdosťou a múdrosťami, nie terč posmechu.

- **Čert** – zarastený bezdomovec (dlhé vlasy, brada), **hovorí po česky**. Filozof ulice,
  každému povie svoju pravdu o živote; môže dávať malé úlohy a tipy.
- **Čertova frajerka** – vysoká, vždy v **čiapke s brmbolcom**; Čerta bráni pred celým svetom.
- **Taškárka** – bezdomovkyňa s množstvom tašiek, ktoré nikdy nepustí z ruky. Nevyspytateľná
  a obávaná: **len nadáva** (vymyslené, kvetnaté nadávky), **pľuje po ľuďoch**, keď ide okolo,
  hádže po okoloidúcich, čo má po ruke. Ľudia sa jej obchádzajú oblúkom; keď sa k nej Ďoďo
  priblíži, dostane spŕšku nadávok a musí uhnúť. Komická hrozba, nie zlá postava.
- **Spievajúci kuriér jedla** – jazdí po meste a **vždy, keď ide okolo Čerta, jeho frajerky
  a Taškárky, začne spievať** (vlastné vymyslené pesničky, syntetizované).
- **Architekt z kaviarne** – študent architektúry na Stavebnej fakulte; **každý deň vysedáva pred
  kaviarňou** s náčrtníkom, v lete na posedení na chodníku. Môže byť Ďoďov kamarát/rada pre
  študentov stavebnej.
  - Kaviareň: inšpirovaná kaviarňou **Blue Mondays na Dunajskej ulici v Starom Meste**
    (malá výberová kaviareň s posedením na chodníku). V hre pod vymysleným názvom, napr.
    **„Modrý pondelok“**, bez ich loga (pravidlo bez značiek firiem). Pri modelovaní pozrieť
    fotky a street view, nech fasáda a posedenie sedia.
- **Pentagon** – sídlisko vo Vrakuni (mimo pôvodnej mapy → rozšírenie mapy), kde si študent
  môže kúpiť „zelené“; riziková zóna s vyššou šancou polície.

## 2c. Politika, kampane, protesty, reklamy (rozhodnuté)
**Princíp:** žiadni konkrétni politici ani prekrútené mená skutočných ľudí. **Vymyslené typy
a situácie zo slovenskej politickej kultúry**, ktoré každý pozná – zosmiešňujú sa rovnako všetky
strany. Mená opisujú typ (Sľubný, Bilbordová, Páska), nie skutočnú osobu.
V titulkoch: *„Všetky postavy sú vymyslené. Ak sa v niektorej spoznáte, je to vaša vec.“*

**Typy politikov:**
- **premiér z bilbordov** – tvár na každom plote, ranné tlačovky na sociálnych sieťach, za všetko môžu „tí predtým“,
- **večný opozičník** – live videá z auta, riešenie na všetko, kým sa nedostane k moci,
- **rečník do rána** – 12-hodinové prejavy v parlamente pri hrade,
- **minister pásky** – strihá pásku na diaľnici do poľa, na tej istej ceste už tretíkrát,
- **regionálny barón** – tender vždy vyhrá švagrova firma, kosačka za cenu auta,
- **kandidát, čo objavil mladých** – týždeň pred voľbami chodí po intrákoch s perami a energeťákmi.

**Bilbordy a kampane:** vymyslené bilbordy po celom meste (menia sa pred voľbami), stánky na Hlavnom,
letáky v schránkach, autá s ampliónmi.

**Protesty:** veľké zhromaždenia na Námestí SNP a pred úradmi – vlajky, transparenty, píšťalky,
sviečky; občas protest aj „protiprotest“ naraz. Mesto sa uzavrie, MHD ide obchádzkou, polícia je
v pohotovosti; Ďoďo sa môže pridať, len sa pozerať, alebo predávať čaj a párky.

**Slogany na bilbordoch (paródia štýlu politických kampaní, vymyslené, nekopírujú skutočné):**
- „Robíme pre ľudí. Hlavne pre našich.“
- „Poriadok musí byť! (Okrem papierov v našej strane.)“
- „Zmena, ktorá nič nezmení.“
- „Slovensko na prvom mieste. V poradí od konca.“
- „Sľúbili sme. A sľúbime znova.“
- „Dôchodcom 14. dôchodok. Študentom 13. komentár.“
- „Bezpečné Slovensko – zamknite sa doma.“
- „Hlas pre rozum. Rozum na dovolenke.“
- „Mladí, zostaňte doma! Ale voliť príďte.“
- „Diaľnica do Košíc do roku… budúceho.“
- „My nie sme ako oni. Oni sú ako my.“
- „Ruky preč od Slovenska! Peňaženky sem.“
Rovnako sa smejeme zo všetkých strán – pri každom slogane si nemá byť jasné, ktorá strana to je.

**Reklamy (vymyslené značky):** bilbordy, rádio, plagáty v MHD – nebankové pôžičky „Peniaze hneď,
dlh navždy“, energeťák, rozvoz jedla „Hladoš“, realitky s bytmi za nehoráznu cenu, jazykové kurzy
„Nauč sa bratislavčinu za víkend“ atď.

**Situácie na misie:**
- brigáda: roznášať letáky dvoch súperiacich strán naraz a nepomýliť si schránky,
- niekto domaľuje bilbordom fúzy a podozrievajú Ďoďa,
- Ďoďo sa ocitne v pozadí živého vysielania z tlačovky – mama ho vidí v telke,
- rádio: každý týždeň nová „kauza“, moderátori čoraz unavenejší,
- politická debata na intrákovej kuchynke → týždeň sa nikto nebaví,
- sľub rýchlika Košice – Bratislava za dve hodiny, ktorý sa nikdy nesplní,
- spolubývajúci Ind sa snaží pochopiť slovenskú politiku, Ďoďo mu to vysvetľuje po východniarsky.

## 3. Úvod – vlak z Košíc (dlhšia interaktívna scéna, zároveň tutoriál)
- Preplnený rýchlik Košice → Bratislava, Ďoďo stojí na chodbe s kufrom a taškou rezňov.
- **Hlásenie:** klasické „vlak mešká približne 120 minút“ – a potom ešte raz s inou číslicou.
- Hráč sa **prechádza cez vagóny a kupé** a interaguje (učí sa ovládanie, dialógy, inventár):
  - **Babka v kupé** – ponúka jedlo, vypytuje sa, či má Ďoďo frajerku, a radí, ako prežiť v Blave.
  - **Opitý spolucestujúci** – spieva, ponúka „jedno na cestu“ (voľba → prvá ukážka opitosti).
  - **Pekná baba** – prvý dialóg so socializáciou/atraktivitou (môže sa neskôr objaviť v meste).
  - **Fero, čo ide do roboty** (stavbár na týždňovky) – životné múdrosti o cenách v Bratislave.
  - **Revízor** – kontrola lístka; ak ho Ďoďo „stratil“, mini-úloha nájsť ho (pod sedadlom, u babky…).
- Koniec: príchod na **Hlavnú stanicu v Bratislave** → prvé „Vitajte v Blave“.

**Výber školy prebehne na úplnom začiatku, ešte pred vlakom.**
Mini-hry (varenie na kuchynke, karty, beer pong, učenie pred skúškou…) – áno, postupne.

## 4. Kapitoly príbehu (kostra, príbeh ešte doladíme)
0. **Vlak** (tutoriál).
1. **Príchod** – zo stanice na intrák MHD (kúpiť lístok!) alebo pešo; fronta pri ubytovaní,
   kaucia, prvák dostane najrozbitejšiu izbu, holub na balkóne.
2. **Prvý týždeň** – spolubývajúci, zápis na fakulte, študentský preukaz, prvý večierok,
   „kto mi zjedol jedlo z chladničky?“.
3. **Peniaze dochádzajú** – prvá brigáda, prvý veľký výdavok (bicykel/kolobežka).
4. **Rozcestie** – hráč si volí smer (viď 5), mesto sa otvára.
5. **Skúškové** – skúšky, opravné termíny, mama volá.
6. **Ďalšie semestre** – dlhšie hranie, príbeh sa mení podľa rozhodnutí.
7. **Finále (rozhodnuté):** Ďoďo dokončí školu a **nájde si prácu**. Veľká záverečná časť
   gameplayu: pohovory, ponuky v Bratislave aj v Košiciach, tlak mamy, kamaráti, frajerka…
   a nakoniec rozhodnutie: **žiť v Košiciach, alebo v Bratislave?** (rôzne záverečné scény).
8. **Po príbehu:** hra pokračuje ako voľný open world po Bratislave – dá sa hrať ďalej,
   robiť brigády, jazdiť, robiť bordel.

## 5. Cesty hráča (hráč sa rozhoduje sám)
| Cesta | Čo robí | Plusy | Riziká |
|---|---|---|---|
| **Vzorný študent** | učí sa, chodí na prednášky | prospech, štipendium | nuda, nízka socializácia |
| **Brigádnik** | robí veľa brigád | peniaze, auto skôr | spánok, prospech |
| **Kráľ párty** | organizuje akcie na intráku | socializácia, atraktivita, peniaze | vrátnička, vyhodenie z intráku, polícia |
| **Pochybné kšefty** | krádeže spolubývajúcim, predaj „zeleného“ a iných drog | rýchle peniaze | polícia, zatknutie, vyhodenie, mama sa dozvie |

Rozhodnutia majú **následky**: povesť na intráku, hviezdičky polície, dôvera mamy, ponuky brigád.

## 6. Ukazovatele (HUD)
- **Peniaze** · **Spánok** (energia) · **Život** · **Inventár** · **Minimapa**
- **Socializácia** (koľko ľudí ho pozná/má rado) · **Atraktivita**
- **Prospech** (ako sa učí → ako zvláda skúšky)
- **Bratislavskosť** (vývoj reči)
- **Hviezdičky polície** (keď robí bordel)
- **Bez ukazovateľa hladu** – jesť sa dá, ale nič sa nestane, keď nebude jesť (viď 6a).

## 6a. Jedlo, pitie a „pochutiny“ (rozhodnuté)
Ďoďo môže jesť a piť, ale **hlad ani smäd sa nesleduje**. Veci majú len krátkodobé efekty:
| Vec | Efekt |
|---|---|
| Jedlo (mamine rezne, menza, bufet) | malé doplnenie života, vtipná hláška |
| Alkohol (pivo, borovička, „jedno na cestu“) | **opitá obrazovka** (rozmazanie, kývanie kamery, dvojité videnie, ťažšie ovládanie), vyššia socializácia; opitý za volantom = polícia |
| Cigareta | krátky „pokoj“ (napr. menej stresu pred skúškou), kašeľ |
| Energetický nápoj | dočasne doplní spánok, potom „pád“ (únava) |
| Sladkosť | malý krátky boost energie |
| Tráva („zelené“) | výrazný vizuálny efekt (farby, spomalenie), hlad na sladké 😄, riziko polície |
Všetky veci sú v inventári, efekty definované v JSON (`data/predmety/*.json`), štýl karikatúry.

## 6b. Mobil, peniaze, škola v mobile (rozhodnuté)
- **Mobil** s aplikáciami: správy, mapa, bankovníctvo, ponuky brigád, intráková skupina,
  telefonáty (mama), **eIndex so známkami**, rádio.
- **Peniaze:** mama dáva **30 € týždenne** a na začiatku platí intrák a ostatné veci;
  neskôr prestane → Ďoďo si musí zarábať.
- **Štipendium** za dobrý prospech.

## 6c. Ukladanie a „smrť“ (rozhodnuté)
- Hra sa **ukladá kedykoľvek**.
- Keď Ďoďo „zomrie“ (alebo omdlie), zobudí sa **v posteli na intráku alebo na stanici** a **stratí
  peňaženku** (peniaze, doklady, študentský preukaz) → misia „vybavovačky“: nový preukaz,
  doklady, karta… (úrady, fronty, formuláre – humor).

## 7. Čas
- Deň/noc, týždne, semestre, skúškové obdobie, **štyri ročné obdobia** (zima so snehom
  a vianočnými trhmi, jar, leto pri Dunaji, jeseň).
- Rozvrh: prednášky v určitom čase; vynechanie znižuje prospech.
- Noc: večierky, vrátnička po 22:00 nepustí (→ okno, kamarát, úplatok koláčom).

## 8. Škola a skúšky
- **Skúšku musí spraviť.** Neúspech nie je koniec hry: riadny termín → 1. opravný → 2. opravný
  → zvláštna misia „prosba na dekanáte“ (posledná šanca). Medzi tým volá mama.
- Skúška = mini-hra (otázky z JSON podľa fakulty; vyšší prospech = viac času/nápovedy).
- **Výber školy (rozhodnuté):** na začiatku hráč volí školu/odbor:
  1. **Stavebná fakulta STU** – Radlinského 11,
  2. **Fakulta chemickej a potravinárskej technológie STU** (chemická) – Radlinského 9, hneď vedľa stavebnej,
  3. **Filozofická fakulta UK** – Gondova 2 na nábreží; tu aj odbor **žurnalistika**,
  4. **Fakulta telesnej výchovy a športu UK** (telesná) – na nábreží pod hradom,
  5. **Pedagogická fakulta UK** – Račianska ulica,
  6. **Fakulta informatiky a informačných technológií STU** (ajťácka) – Ilkovičova, v Mlynskej doline pri Átriakoch,
  7. **Ekonomická univerzita** – Dolnozemská cesta v Petržalke (cesta do školy cez most).
  (Adresy over podľa OSM pri modelovaní.)
- **Hráč musí reálne prísť (pešo, MHD, vozidlom) k budove svojej školy** na mape.
- **Vnútro školy je jedna spoločná šablóna** (vstupná hala, chodby, učebne, posluchárne,
  študijné oddelenie, bufet), aby to nebolo náročné na modelovanie, **ale nie na chlp rovnaká:**
  každá škola má vlastné farby stien, podláh a lavíc, iné nástenky, plagáty a rekvizity
  (chemická – laboratórium a digestory, telesná – telocvičňa, ajťácka – počítačové učebne,
  stavebná – modely budov, žurnalistika – štúdio s mikrofónom…). Paleta a rekvizity v JSON.
  Líši sa aj **učivo** (predmety, otázky na skúškach, typy spolužiakov a učiteľov) – všetko v JSON
  (napr. `data/skoly/stavebna.json`, `filozoficka.json`, `ekonomicka.json`).
- Exteriér každej školy je vlastná budova na mape (modul ako ostatné významné stavby).

## 9. Internát
- **Internát (rozhodnuté): Átriaky** – Átriové domky v Mlynskej doline (areál Mlyny UK,
  architekt Vladimír Dedeček). Nízke bloky označené písmenami (napr. F, G, J, M) okolo átrií.
- **Modelovať podrobnejšie, aby sa tam dalo chodiť:** areál s blokmi a átriami, vchod s vrátnicou,
  chodby, izby (Ďoďova izba so spolubývajúcimi), spoločná kuchynka, sprchy/WC, práčovňa,
  študovňa; v okolí zastávka MHD, obchod, menza, bufet, ihrisko.
- Ostatné internáty (Mladosť, Družba…) môžu byť na mape len zvonka ako kulisa.
- Strasti (misie aj náhodné udalosti):
  - jedlo/hrnček zmizne z kuchynky → detektívna misia po chodbe,
  - nočný kľud po 22:00, vrátnička,
  - studená sprcha, fronta na práčku, šváby, holuby, padajúca wifi pri odovzdávaní zadania,
  - spolubývajúci: chrápajúci hráč počítačových hier, fitnesák s proteínmi, večne zamilovaný,
  - **balík z domu** – mama posiela jedlo autobusom; treba ho vyzdvihnúť, kým ho niekto „omylom“ nevezme,
  - intrákové „zoznamky“ a skupiny na sociálnych sieťach (vtipné správy v mobile).

## 10. Doprava – postup od pešo po auto
1. **Pešo** a **MHD** (električka, autobus, trolejbus) – treba si kúpiť lístok; čierna jazda =
   riziko **revízora** (minibos 😄).
2. **Lacné vozidlá** (postupne kúpiteľné, rôzne vlastnosti): kolobežka, elektrická kolobežka,
   bicykel, korčule, hoverboard, onewheel, skúter.
3. **Auto** – najprv ojazdená stará rodinná káčka (vymyslený model, žiadne značky), neskôr lepšie.
   Opitý Ďoďo nemá šoférovať → polícia.
- Polícia: hviezdičky za bordel, naháňačky, **zatknutie** (pokuta, noc na stanici, mama sa dozvie).

## 10a. Rádio
- V aute aj v mobile; **zosmiešnené názvy skutočných staníc** (paródia, bez ich log a znelkiek),
  vymyslení moderátori, syntetizovaná hudba/ruchy, vtipné reklamy a dopravné správy.

## 11. Brigády (prepojené s jazdou a mestom)
- **Kuriér rozvozu jedla** (vymyslená firma, napr. „Rozvoz Hladoš“) – bicykel/kolobežka/auto,
  časový limit, doručenie na hrad, do Eurovey, do Petržalky cez Most SNP.
- **Barista v kaviarni** – mini-hra na objednávky (Bratislavčania a ich „ovsené flat white“).
- **Predavač v obchode s oblečením** – Ďoďo radí zákazníkom v móde po východniarsky.
- **Čašník v bare** – nosenie podnosov, opití hostia.
- **Sťahovanie nábytku** do 4. poschodia bez výťahu.
- Šedé/čierne „brigády“ viď cesta *Pochybné kšefty*.

## 12. Mapa – čo pribudne oproti pôvodnému plánu
- Pôvodne: Staré Mesto, nábrežie, Most SNP, hrad, Eurovea.
- **Nové pre príbeh:** **Hlavná stanica** (príchod), **Mlynská dolina s Átriakmi** (domov),
  **3 školy** (Stavebná fakulta STU – Radlinského, Filozofická fakulta UK – Gondova,
  Ekonomická univerzita – Dolnozemská v Petržalke), menza, zastávky MHD a trasy
  električiek/autobusov.
- **Košice na záver príbehu – len scény** (rozhodnuté). Košice ako hrateľná mapa = možné pokračovanie hry v budúcnosti.
- ❓ Mapa sa zväčší – riešiť výkon (načítavanie po častiach).

## 13. Otvorené otázky (❓ súhrn)
Rozhodnuté: 3 školy so spoločným interiérom · internát Átriaky · bez hladu ·
finále = práca + Košice vs. Bratislava, potom voľná hra.

Rozhodnuté aj: 7 škôl/odborov · iné farby a rekvizity v školách · jedlo a pochutiny s efektmi · Košice len scény.
5. Ako ďaleko ísť s cestou „pochybných kšeftov“ (štýlom karikatúry, s následkami)?
6. Návšteva Košíc ako bonusová misia (vlak späť domov)?

## 14. Návrh poradia práce
1. Základ hry (chodenie, auto, mapa) – rozpracované vo `feature/zaklad-hry`.
2. Formát misií a dialógov s variantmi reči (`vychod`/`mix`/`blava`).
3. HUD s ukazovateľmi + čas (deň/noc, kalendár).
4. Úvodná scéna vo vlaku (samostatný „level“).
5. Hlavná stanica → MHD → Átriaky (kapitola 1), interiér internátu.
6. Budovy škôl + spoločný interiér školy s paletami a rekvizitami podľa školy.
7. Brigády (najprv kuriér, lebo využíva jazdu).
8. Skúšky (mini-hra + opravné termíny).
9. Polícia, revízor, zatknutie.
10. Ďalšie vozidlá a auto.
