# Blava City

Zábavná 3D hra v prehliadači, odohráva sa v Bratislave. Len pre srandu.
Hlavný hrdina je študent Ďoďo z Košíc, ktorý je prvýkrát v Bratislave – dizajn hry je v [napady/dizajn-hry.md](napady/dizajn-hry.md),
stav projektu a ako pokračovať v [napady/POKRACOVANIE.md](napady/POKRACOVANIE.md).

## Ako hru spustiť
- **Online:** GitHub Pages z vetvy `main` (Settings → Pages → Source: *Deploy from a branch*, vetva `main`, priečinok `/ (root)`).
  Hra potom beží na `https://kipondo.github.io/blavacik/`.
- **Bez inštalácie, hneď:** `https://raw.githack.com/Kipondo/blavacik/main/index.html` (servíruje priamo vetvu `main`).
- **Lokálne:** v priečinku projektu spusti `python3 -m http.server 8000` a otvor `http://localhost:8000`
  (cez dvojklik na `index.html` to nepôjde – prehliadač nedovolí načítať moduly a JSON zo súboru).
- **Editor postavy:** `editor-postavy.html` (odkaz je aj v menu hry) – vzhľad Ďoďa sa uloží a hra ho použije.

## Ovládanie
| | Klávesnica | Mobil |
|---|---|---|
| Chôdza / jazda | W A S D alebo šípky (pešo: W = tam, kam sa pozeráš, A/D = úkrok) | joystick vľavo |
| Beh / ručná brzda | Shift / Medzerník | ⚡ |
| Skok | Medzerník | ⤒ |
| Nastúpiť / vystúpiť | E | E |
| Kamera | klikni do hry a hýb myšou (kurzor sa zamkne); citlivosť a invertovaná os Y v menu | ťahanie prstom |
| Pauza | Esc (uvoľní myš); späť do hry klikom | ❚❚ |
| Vypísať polohu (pre misie) | P | – |

## Čo je hotové
- **Typy budov v celom meste** (`js/mapa/budovy/typ-budovy.js`): každá budova dostane typ – panelák, rodinný dom,
  meštiansky dom, bytovka, hala, garáž/kôlňa, obchod, kancelárie, historická – podľa OSM typu (prezradeného odhadnutou
  výškou, neskôr `typOsm`), tvaru pôdorysu (plocha, šírka, doska/bod), strechy a štvrte. Podľa typu sa vyberie fasáda,
  počet podlaží (z OSM `building:levels`), opraví sa vymyslená výška (~46 000 kôlní a domov už nie je 12 m vysokých)
  a farba z palety typu; rodinné domy majú väčšinou šikmú strechu.
  - Nové fasády: **panelák** (škáry panelov, plastové okná, lodžie v zvislých pásoch, vchody so strieškou),
    **rodinný dom** (okná s roletovým boxom alebo okenicami, drevené dvere, sokel), **hala** (trapézový plech,
    pásové okná, sekcionálne brány); garáže a kôlne sú bez okien.
  - Rozdelenie: ~44 % rodinné domy, ~31 % garáže a kôlne, ~10 % bytovky, ~6 % meštianske domy, ~5 % paneláky, ~3 % haly
    (`node tools/mesto/typy-budov.mjs [minX,minZ,maxX,maxZ]`).
  - **Náhľad fasád bez hry:** `http://localhost:8000/tools/budovy/nahlad.html?x=250&z=1750` (Petržalka),
    `&typ=1` zafarbí budovy podľa typu. Snímky: `docs/snimky/typy-budov/`.
- **Laserové skenovanie ÚGKK (etapa a2 z issue #8) – výrez Starého Mesta s Hradným kopcom** (1,5 × 1 km,
  od Michalskej brány po nábrežie a hrad, dlaždice −2…0 × −1…0), na ktorom sa postup ladí pred spustením na celé mesto:
  - terén celého mesta z DMR 6.0 (predtým Copernicus: Staré Mesto bolo o 6–10 m vyššie, hradná plošina o 10 m nižšie),
    vo výreze detailný terén po 2 m,
  - výšky budov z lasera (`zdrojVysky`: `lidar` / `osm` / `odhad`), strechy rozložené na roviny (LOD2) so škridlou
    a štrkom, štíty, ~5 800 komínov, vnútorné dvory (z OSM multipolygónov aj z lasera),
  - fasády: okná s rámom, priečkami, sklom s odrazom oblohy, záclony, parapety, šambrány, rímsy, výklady a dvere
    na prízemí, kamenný sokel, okná zarovnané na celé podlažia a osi; omietka CC0,
  - dlažba z CC0 textúr: žulové kocky v historickom jadre a pešej zóne, kamenné dlaždice na chodníkoch, tráva v parkoch,
  - ~3 000 stromov na skutočných miestach so skutočnou výškou a šírkou koruny (z lasera), zblízka s listami,
  - lavičky z OSM natočené k chodníku, v historickom jadre lucerny (na stĺpe alebo na konzole na stene),
  - asfalt ciest a dlažba chodníkov s CC0 štruktúrou, mäkké zatienenie zeme pri päte budov.
  - Postup a zdroje: [data/lidar/README.md](data/lidar/README.md), snímky pred/po: `docs/snimky/etapa-a2/`.
- **Opravy podľa porovnania so skutočnosťou** ([docs/porovnanie/opravy.md](docs/porovnanie/opravy.md), etapy 1–5, druhý Claude
  porovnáva hru so Street View len okom): námestia a pešia zóna z veľkých svetlých kamenných dosiek, vikiere na
  historických strechách (`js/mapa/budovy/vikiere.js`), výklady len v budovách s obchodom z OSM (`tools/mesto/osm-doplnky.mjs`),
  okenice len kde naozaj sú, vyššie 1. poschodie historických budov, ručné opravy budov
  ([data/mapa/opravy-budov.json](data/mapa/opravy-budov.json) – farba, okenice, vikiere podľa bodu a mena),
  nová Stará radnica, Rolandova fontána, portikus Primaciálneho paláca, priečelie SND, Ganymedova fontána, vikiere hradu,
  kamenný okraj fontán, zatrávnené svahy, hustý Sad Janka Kráľa ([data/mapa/husta-zelen.json](data/mapa/husta-zelen.json)),
  odkvapy a záhrady z lasera, bez škár medzi dlaždicami terénu. Snímky PRED/PO: `docs/snimky/porovnanie/opravy-*.jpg`.
- **Celá Bratislava (etapa a z issue #8):** 367 km², ~117 000 budov, ~23 000 úsekov ciest, 72 000 chodníkov,
  ~200 000 stromov, parky, lesy, voda – rozdelené do 1 791 dlaždíc 500 × 500 m. Okolo hráča sa do 900 m
  stavajú podrobné dlaždice (fasády, cesty, značky, kolízie), do 3,2 km jednoduché bloky budov,
  ďalej vzdialený terén (Malé Karpaty, Kamzík s vežou, Devínska Kobyla). Stavba dlaždíc je rozložená do snímok.
- **Výškový model** celej Bratislavy (laserové skenovanie ÚGKK DMR 6.0, na okraji Copernicus DEM), hladina Dunaja podľa toku,
  koryto s nábrežnými múrmi v centre a prírodnými brehmi mimo neho, 17 mostov s nájazdmi.
- **Základ hry:** úvodné menu, pauza, herná slučka, modulárne jadro (`hra.pridajModul`).
- **Mapa zo skutočnej Bratislavy (OpenStreetMap):** ~5 800 budov s reálnymi pôdorysmi a výškami,
  ~2 000 ulíc s názvami, šírkami a jednosmerkami, chodníky, cyklotrasy, električkové trate,
  parky, trávniky, námestia, ~14 000 stromov, Dunaj, Most SNP, Starý most, Most Apollo.
  Oblasť: Staré Mesto, Hradný kopec, Palisády, nábrežie, Eurovea, Nivy, Petržalka po Aupark.
- **Terén:** Hradný kopec (~50 m nad nábrežím), Palisády a Slavín, mierne stúpanie Starého Mesta,
  Dunaj v koryte 5 m pod nábrežím s kamennými nábrežnými múrmi a zábradlím, nájazdy na mosty.
  Auto aj chodec idú po teréne (auto sa nakláňa).
- **Pamiatky (low-poly modely na skutočných miestach):** Bratislavský hrad, Národná rada, Katedrála sv. Martina
  so zlatou korunou, Michalská brána, Stará radnica, Maximiliánova fontána, Primaciálny palác, historická SND,
  Reduta, Prezidentský palác, Modrý kostolík, Most SNP s pylónom, UFO a lanami, Starý most (priehradový),
  Most Apollo (oblúk), Nová SND, mrakodrap pri Eurovei, Slovenský rozhlas (obrátená pyramída),
  Kamzík s televíznou vežou na horizonte. Sklenené fasády pre Eurovea, Aupark, Tower 115, Nivy…
- **Doprava a značky:** cesty s jazdnými pruhmi a značením (prerušovaná/dvojitá plná, krajnice), čisté plochy
  križovatiek, chodníky s obrubníkmi, zebry (~900 z OSM), električkové koľaje, ~215 semaforov so striedaním fáz,
  značky STOP, daj prednosť, zákaz vjazdu, jednosmerka, obmedzenie rýchlosti, modré tabule s názvami ulíc,
  ~780 pouličných lámp. Graf ciest pre NPC dopravu (`data/mapa/graf-ciest.json`, modul `hra.doprava`).
- **Grafika:** obloha so slnkom a pohyblivými oblakmi, odrazy okolia (sklo, autá, voda), Dunaj s vlnkami,
  7 typov fasád (staromestské okná s okenicami, obytné s balkónmi, kancelárie, jednoduché, panelák, rodinný dom, hala) a sklenené fasády,
  tmavší sokel budov, stromy (listnaté zo zhlukov, ihličnany) s tieňovaním koruny, zaoblené autá
  (sedan, hatchback, SUV) s lesklým lakom, diskami, svetlami a ŠPZ, postava s kĺbmi a animáciou chôdze/behu.
  Na mobile sa automaticky vypnú tiene a drahšie materiály.
- **Efekty a kvalita grafiky** (issue #31, etapa G1, `js/grafika/efekty/`): zatienenie kútov (AO z hĺbky – päty budov,
  kúty, dvory a ulice pri pohľade zhora), vzdušná perspektíva (vzdialené mestá a kopce blednú do farby oblohy),
  farebné ladenie, vyhladzovanie hrán (MSAA), jemná vineta; tiene slnka sú ostrejšie, stred tieňov je kúsok pred
  hráčom v smere pohľadu a je zarovnaný na texely (okraje neblikajú), na okraji tieňovej mapy sa tiene plynulo stratia.
  Strechy bez laserového modelu majú škridlu / štrk s normálovou mapou a drsnosťou (CC0, mapované zo svetových súradníc).
  V menu sa dá zvoliť **Grafika: nízka / stredná / vysoká** (nízka = bez efektov, ako predtým; integrovaná grafika
  začne na strednej). Na RTX 2060 (1569 × 1266) trvá snímok 10,6 ms bez efektov, 11,0 ms stredná, 12,9 ms vysoká –
  hra drží 60 FPS. Snímky pred/po: `docs/snimky/grafika/`. Ladenie AO v konzole:
  `hra.moduly.find(m => m.nazov === 'efekty').vykreslovac.matVysledok.uniforms.ladenie.value = 1`.
- **Realistickejší vzhľad – zlatá hodinka** (`js/grafika/nalada.js`): nízke teplé slnko (~12° nad obzorom), dlhé tiene,
  chladnejšie modrasté tiene, teplá žiara okolo slnka a nasvietené oblaky, teplý opar do diaľky; všetky farby
  osvetlenia sú na jednom mieste (neskôr sa podľa herného času dá prepínať deň/noc).
  - **Stromy po druhoch** (`js/mapa/zelen/model-stromu.js`): lipa, javor, platan, breza, topoľ a smrek – kmeň a konáre
    s kôrou (vlastné procedurálne textúry kôry: brázdy, škvrnitý platan, biela breza), koruna z kariet so zhlukmi listov
    (CC0) alebo vetvičkami smreka. Do 125 m od kamery podrobný model (vyberá sa po stromoch), ďalej jednoduchá koruna
    v rovnakom tóne. Listy majú obalené svetlo a proti slnku presvitajú.
  - **Cesty s opotrebením** (`js/mapa/cesty/opotrebenie.js`): pestrý asfalt, záplaty, zaliate praskliny, tmavšie stopy
    kolies v pruhoch, špina v žľabe pri obrubníku, ošúchané značenie; záplaty a stopy sa trochu lesknú.
  - **Chodníky:** popri cestách mimo jadra asfaltové (svetlejšie ako vozovka) s obrubníkom (stena, vrch obrubníka aj
    zadná hrana), pri domoch sivá zámková dlažba 20 × 10 cm (vlastná textúra `tools/textury/zamkova.py`),
    na námestiach tmavšie betónové dlaždice, všade špina a nerovnomernosť vo veľkej mierke; mapa povrchu má 0,5 m.
  - **Tráva** menej do žlta, sýtejšie a suchšie miesta, štruktúra trávy aj v parkoch z mapy pokrývky.
  - **Tráva zblízka** (`js/mapa/zelen/trava-modul.js`, `trava.js`): trsy stebiel okolo kamery na trávnikoch, v parkoch
    a na zatrávnených svahoch (podľa mapy tried a pokrývky dlaždice), zblízka husto, ďalej redšie a menšie;
    stredná kvalita do 18 m, vysoká do 30 m, nízka bez nej. Na strmých zrezoch tráva nerastie.
  - **Vietor:** koruny stromov sa kolíšu (viac hore, kmeň stojí), listy sa trasú, trávou prechádzajú vlny;
    nárazy vetra sa striedajú s bezvetrím (spoločný čas `vietor` v `js/mapa/zelen/materialy-stromov.js`).
  - **Strmé zrezy terénu** (oporné múry Hradného kopca, svahy z lasera): namiesto natiahnutej textúry zhora
    procedurálny kameň (`js/grafika/kamen-glsl.js`) – v Starom Meste a na Hradnom kopci múr z lomového kameňa,
    inde holá skala s puklinami.
  - **Dunaj** (`js/mapa/voda/material-reky.js`): odraz podľa Fresnela (pri pohľade dolu zelenosivá voda, do diaľky
    obloha), vlny zo šumu v troch mierkach tečúce po prúde (bez opakujúcej sa mriežky), pásy kalnejšej vody,
    čeriny, drobné vlnky sa do diaľky strácajú.
  - **Zvetrané fasády** (`js/mapa/budovy/fasady.js`): fľaky na omietke, zvislé stekance, šmuhy pod parapetmi,
    špina pri zemi (odstrek z chodníka) – historické domy viac, paneláky a haly menej; paneláky majú škáry medzi
    panelmi (3,6 m × podlažie) a jemne iný odtieň každého panelu. Všetko procedurálne vo svetových metroch.
  Snímky pred/po: `docs/snimky/realisticky-vzhlad/`.
- **Deň a noc podľa herného času** (`js/grafika/den-noc.js`): slnko je tam, kde nad Bratislavou naozaj je v daný
  deň a hodinu (`js/grafika/poloha-slnka.js`), nálada sa plynulo mení podľa výšky slnka – noc, súmrak, zlatá hodinka,
  deň (`js/grafika/nalady.js`: obloha, farba a sila svetla, svetlo z oblohy, hmla, opar, expozícia), odrazy oblohy sa
  prepočítajú pri väčšej zmene. V noci svieti mesiac (aj vrhá tiene), na oblohe sú hviezdy a mesiac, oblaky stmavnú;
  lampy a lucerny svietia a pod nimi je na zemi kruh svetla, v domoch svieti časť okien (večer viac, nadránom málo,
  výklady obchodov takmer všetky, občas modrastý televízor), sklenené budovy svietia po kanceláriách.
  Spoločný stav pre materiály je v `js/grafika/noc.js` (NOC, OKNA, svietidlá), modulom chodí udalosť `nalada`
  a `hra.stav.svetlo = { vyskaSlnka, noc }`. Čas sa dá posunúť v konzole: `hra.hodiny.nastav(new Date(2026, 10, 20, 21, 30))`.
  Snímky: `docs/snimky/realisticky-vzhlad/den-*.jpg`, `sumrak-*.jpg`, `noc-*.jpg`.
- **3D fasády historických budov** (issue #31, etapa G2, `js/mapa/budovy/fasady-3d.js`): okná sú naozaj zapustené
  20 cm v murive (pred stenou s oknami z atlasu stojí „plášť“ s otvormi, rovnaké rozloženie ako atlas), kamenné
  parapety, nadokenné rímsy a trojuholníkové frontóny, podlažné rímsy a dvojstupňová hlavná rímsa pod strechou;
  paláce majú v 1. poschodí striedavo trojuholníkové a oblúkové frontóny, budovy s `balkony` / `stity`
  v `data/mapa/opravy-budov.json` balkóny s kovaným zábradlím a zvlnený štít. Zatienenie ostení a spodkov ríms je
  zapečené vo farbe vrcholov. Len obvodové steny (nie spoločné so susedom); diely 64 × 64 m stavia modul
  `fasady3d` podľa vzdialenosti od kamery (do ~250 m, najviac 3 ms za snímok), ďalej stačia okná z atlasu.
  Na RTX 2060 v Michalskej ~650 000 vrcholov plášťov navyše bez merateľného spomalenia. Snímky: `docs/snimky/fasady-3d/`.
- **Vyvýšené časti budov** (`tools/mesto/casti-budov.mjs`): veže nad podnožou, horné poschodia nad presklenými
  prízemiami a lávky medzi budovami (OSM `building:part` s `min_height`) – predtým chýbali, napr. 65 m veža hotela
  Kyjev. V dátach `minVyska`, hra ich kreslí od tejto výšky s podhľadom a dá sa pod nimi prejsť.
- **Dlažba v celom meste:** chodníky a námestia mimo historického jadra sú zo svetlých betónových dlaždíc 50 × 50 cm
  (`assets/textury/beton`, procedurálna CC0), v jadre kamenné dosky a kocky; dlažba a tráva z CC0 materiálov sú vo
  všetkých podrobných dlaždiciach (mimo laserového výrezu s mapou tried 512 px).
- **Podchody** (`js/mapa/podchody/`, dáta z `tools/mesto/podchody.mjs`): pešie chodby pod zemou z OSM (`tunnel=yes`,
  `layer`/`level` < 0) so schodmi a eskalátormi, ktoré do nich vedú – len siete, do ktorých vedú schody (priechod
  pod násypom ostáva na povrchu). Chodby majú obklad, strop a svietidlá, podlaha je 3,8 m pod najnižším terénom
  nad sieťou; schody sú v jame so zábradlím, parapetom a obrubou (terén sa v jame vyreže). Hráč nimi prejde
  (`hra.podchody` – výška podlahy, steny chodby, kamera pod stropom), chodníky na povrchu nad chodbami sa odstránia.
  131 chodieb a 166 schodov (Hlavná stanica, Hodžovo nám., Trnavské mýto, Patrónka…).
- **Realistická postava Ďoďo** (`assets/postavy/dodo.glb`, kód `js/chodec/postava/`): rigovaný 3D človek
  z MakeHuman (CC0), 53 kostí, morph targety tela a tváre, PBR koža, oblečenie ako samostatné siete,
  šatník v `data/postavy/satnik.json` (klasický, oblek, kuriér, párty, zimné, letné, bratislavský),
  účesy a brady, vlastné animácie (stoj, chôdza, beh, skok, opitá chôdza, sedenie, nastup/vystup z auta, mávanie).
  **Editor postavy:** `editor-postavy.html`. Generátor: `tools/postava/` (Blender bpy).
  **Nastupovanie do auta s animáciou** (`js/chodec/nastupovanie.js`): Ďoďo po E dôjde k dverám vodiča (aj okolo auta),
  sadne si dnu; pri vystupovaní auto najprv zabrzdí. Ďalšie E počas cesty k autu to zruší. Keď pri dverách nie je miesto, nastúpi/vystúpi hneď.
  Licencie: MakeHuman/MPFB2 dáta CC0, animácie a textúry vlastné (procedurálne), písmo nápisu DejaVu (len zapečené v textúre).
- **NPC postavy a davy** (`data/postavy/npc.json`, `assets/postavy/npc/*.glb`, kód `js/chodec/npc/`): z rovnakého generátora
  ako Ďoďo – 4 telá (muž, žena, dôchodca, dôchodkyňa) a 8 profilov (študent, korporátnik z Twin City, turista na rozlúčke so slobodou,
  kuriér, študentka, manažérka z Eurovey, dôchodca, babka s fialovým melírom). Z profilu sa náhodne poskladá chodec
  (variant oblečenia a účesu, farby z paliet, tvar tela, výška, rýchlosť; turista býva opitý). Animácie sa berú z Ďoďa.
  **LOD pre davy** (`js/chodec/npc/dav.js`): plný model do 14 m (max. 8), zlúčená sieť 3 500 trojuholníkov do 45 m (max. 40),
  hrubá sieť 700 trojuholníkov do 140 m, ďalej a mimo pohľadu nič. 150 chodcov = ~250 volaní kreslenia.
  Skúška a snímky: `tools/postava/dav.html` (návod v `tools/postava/README.md`). Do hry ich zatiaľ nikto nevypúšťa – to je ďalší krok.
- **MHD – etapa a:** všetky linky DPB podľa oficiálneho cestovného poriadku (GTFS): 90 liniek
  (4 električkové, 15 trolejbusových, 54 denných autobusových, 17 nočných), 582 zastávok s 1 370 nástupišťami,
  35 932 spojov, kalendár (pracovný deň, prázdniny, sobota, nedeľa a sviatky). Trasy idú po skutočných cestách
  a koľajach mapy. V hre: prístrešky s lavičkou, označníky s číslami liniek a tabule s najbližšími odchodmi.
- **Dialógy úvodnej scény vo vlaku** (`data/dialogy/vlak-*.json`) + návrh volieb v dialógoch
  ([napady/navrh-rozsirenie-dialogov.md](napady/navrh-rozsirenie-dialogov.md)).
- **Hráč pešo:** chôdza, beh, skok, kolízie s budovami, stromami a autami.
- **Autá:** arkádová fyzika (plyn, brzda, cúvanie, drift ručnou brzdou), kolízie, nárazy medzi autami.
- **Kamera** za postavou/autom: na PC sa pohľad ovláda myšou bez držania tlačidla (Pointer Lock, `js/vstup/mys.js`),
  pešo postava chodí v smere kamery, v aute sa myšou rozhliadneš a kamera sa vráti za auto; pri rýchlosti sa rozšíri zorné pole.
- **Ovládanie** klávesnicou aj dotykom (joystick + tlačidlá).
- **HUD:** rýchlomer, nápoveda, krátke správy, názov miesta pri pamiatkach.
- **Formát misií a dialógov:** [data/misie/FORMAT.md](data/misie/FORMAT.md) (PR #1) – príklad misie
  `data/misie/halusky-pre-stryka.json`, dialógy v `data/dialogy/`, pomenované miesta pre misie v `data/mapa/miesta.json`.

## Herný čas
- Jeden spoločný čas pre celú hru: `hra.stav.datumCas` (Date), modul `js/cas/` (#20). Hodiny sú v HUD vpravo hore.
- **Pri MHD beží čas 1:1** (električky a autobusy jazdia presne podľa poriadku skutočnou rýchlosťou).
  Keď najbližší spoj je ďalej ako 150 m, čas sa plynulo zrýchľuje, od 400 m beží **10×** (v HUD ⏩ ×10).
- Jeden herný deň pri chodení trvá podľa miesta asi **2,5 – 8 hodín** (odhad z cestovného poriadku:
  Kamzík/Devín ~2,4 h, Petržalka ~3 h, Hlavné nám. ~4 h, Hviezdoslavovo nám./Eurovea ~8 h). Spánok a preskakovanie to skrátia.
- Pre moduly: `hra.hodiny.blizko(kto, metre)` (každý snímok – „nablízku je niečo, čo potrebuje skutočný čas“),
  `hra.hodiny.preskoc(sekundy | { hodina, minuta })`, `hra.hodiny.nastav(datum)`, udalosť `casPreskoceny`.
  Nastavenia v [js/cas/nastavenia.js](js/cas/nastavenia.js).

## Čo ďalej
- Pri ďalšom pregenerovaní dlaždíc (`tools/mesto/`) pribudne `typOsm` – triedenie budov bude presnejšie (dnes ~60 % budov
  má v OSM len `building=yes` a typ sa háda z pôdorysu).
- Laser na celé mesto (`--vsetko`), keď sa výrez odobrí (strechy sú už v binárnom formáte, ~250–500 kB na dlaždicu centra).
- Cesty ako plochy podľa skutočného tvaru (námestia, pešie zóny, podchody, zastávky), mosty z lasera.
- MHD: etapa b) vozidlá jazdia podľa poriadku, c) ľudia v MHD, d) jazda hráča (lístky a revízor neskôr).
- Modul chodcov: vypustiť NPC z `js/chodec/npc/` na chodníky a námestia (pohyb po chodníkoch, vyhýbanie sa), `Dav` rieši LOD.
- Rýchlosť chôdze v `config.js` je arkádová (4,2 m/s, postava pri nej beží) – pre realistický model navrhujeme 1,6 m/s (pozri PR #15).
- NPC doprava (dáta sú pripravené v `data/mapa/graf-ciest.json`).
- Deň a noc (svietiace lampy a okná) – nálada v `js/grafika/nalada.js` podľa herného času; vietor v korunách stromov.
- Engine misií a dialógov, polícia, minimapa.

## Ako pridať misiu
Postup je v [data/misie/FORMAT.md](data/misie/FORMAT.md) – stačí pridať JSON súbory, kód netreba.

## MHD
- Dáta: `data/mhd/` (formát v [data/mhd/README.md](data/mhd/README.md)), kód hry: `js/mhd/` (modul `mhd`).
- Zdroj: *Cestovné poriadky MHD vo formáte GTFS* – Dopravný podnik Bratislava, a. s. / hl. m. SR Bratislava
  ([data.bratislava.sk](https://data.bratislava.sk/datasets/aba12fd2cbac4843bc7406151bc66106/about)), licencia **CC BY 4.0**.
  Trasy po cestách a koľajach sú vypočítané z mapy (© prispievatelia OpenStreetMap, ODbL).
- Obnovenie dát: `node tools/mhd/stiahni.mjs && node --max-old-space-size=4000 tools/mhd/spracuj.mjs` (bez npm balíkov).
- Prehľad siete (2D, na kontrolu): `http://localhost:8000/tools/mhd/prehlad.html`.
- Pre ostatné moduly: `hra.mhd.data`, `hra.mhd.teraz()`, `hra.mhd.najblizsiaZastavka(x, z)`, `hra.mhd.odchody(id)`,
  `hra.mhd.typDna()` (popis v [js/mhd/modul.js](js/mhd/modul.js)). MHD sa riadi herným časom `hra.stav.datumCas`.

## Ako pridať vlastný modul
1. Vytvor súbor, napr. `js/policia/policia.js`:
   ```js
   export default {
     nazov: 'policia',
     init(hra) { /* raz po načítaní mapy */ },
     update(dt, hra) {
       // hra.stav.pozicia, hra.stav.auto, hra.stav.rychlostKmh, hra.auta, hra.mapa …
     },
   };
   ```
2. Pridaj ho do `js/moduly.js` (jeden import + jedna položka v zozname).

Všetko, čo modul môže použiť (`hra.stav`, `hra.mapa`, `hra.ui`, `hra.pridajAuto`, udalosti…),
je popísané v komentári na začiatku [js/jadro/hra.js](js/jadro/hra.js).

## Doprava pre ďalšie moduly
- `hra.doprava.graf` – uzly a hrany ciest (pruhy, jednosmerky, max. rýchlosť), `hra.doprava.hranyZUzla(i)`, `hra.doprava.najblizsiUzol(x, z)`
- `hra.doprava.semafor(x, z, smerX, smerZ)` → `'zelena' | 'oranzova' | 'cervena' | null` pre vozidlo, ktoré sa blíži ku križovatke

## Ako pridať stavbu (pamiatku)
Nový súbor `js/mapa/pamiatky/<nazov>.js` + záznam v `data/mapa/pamiatky.json`.
Návod je v [js/mapa/pamiatky/nacitaj-pamiatky.js](js/mapa/pamiatky/nacitaj-pamiatky.js), príklad je `hrad.js`.

## Mapa
- **Porovnanie so skutočnosťou:** [docs/porovnanie/opravy.md](docs/porovnanie/opravy.md) – zoznam chýb po etapách
  (Hlavné námestie, Michalská, Ventúrska, Primaciálne, Hviezdoslavovo námestie…) s prioritami a odkazmi na pozretie v Street View.
- **Prehľad mapy (2D, na kontrolu):** `nastroje/prehlad/` – otvor `http://localhost:8000/nastroje/prehlad/`.
  Vrstvy budov, ciest, zelene a vody celého mesta, klik na budovu ukáže výšku a farbu, pripomienky sa dajú skopírovať do issue.
- **Celé mesto:** `cd tools/mesto && npm install && npm run vsetko` (stiahne OSM a výškový model,
  vyrobí `data/mapa/mesto/`). Zdroje: OSM extrakt Bratislavského kraja (openstreetmap.fr),
  Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 a © Airbus Defence and Space GmbH 2014-2018,
  poskytnuté v rámci programu COPERNICUS Európskou úniou a ESA).
- **OpenStreetMap (len centrum, záloha):** `data/mapa/osm.json` – vyrába ho `node tools/osm/stiahni.mjs && node tools/osm/prevod.mjs`.
  Návod (aj ručný export cez overpass-turbo) je v [data/osm/README.md](data/osm/README.md).
- **Výškopis a štart:** `data/mapa/zakladna.json` (kopce, svahy, štart hráča, ulice pre zaparkované autá).
- **Záložná ručná mapa** (keď OSM chýba): `zakladna.json` + `budovy.json` (`node tools/generuj-mapu.mjs`).
- **Údaje o obchodoch a type budov z OSM** do hotových dlaždíc: `cd tools/mesto && node --max-old-space-size=8000 osm-doplnky.mjs`.
- **Vyvýšené časti budov z OSM** (veže nad podnožou, lávky) do hotových dlaždíc: `node --max-old-space-size=8000 casti-budov.mjs`.
- **Podchody z OSM** do hotových dlaždíc: `node --max-old-space-size=8000 podchody.mjs`.
- **Laserové skenovanie:** [data/lidar/README.md](data/lidar/README.md) – terén, budovy, strechy a stromy
  (`python3 tools/mesto/laser/*.py`). Zdroj: letecké laserové skenovanie ÚGKK SR (DMR 6.0, DMP 2.0), **© ÚGKK SR, CC BY 4.0**.
- **Textúry** (omietka, škridla, štrk, dlažba): ambientCG, CC0 – zoznam v [assets/textury/LICENSE.md](assets/textury/LICENSE.md).
- Mapové dáta © prispievatelia OpenStreetMap, licencia ODbL.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
