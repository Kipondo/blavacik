# Blavačík

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
| Mapa mesta (veľká) | M, koliesko myši = priblíženie | – |
| Vypísať polohu (pre misie) | P | – |

## Čo je hotové
- **Nadjazdy, lávky a nadchody** (`tools/mesto/nadjazdy.mjs` → `"nadjazdy"` v dlaždiciach, `js/mapa/mosty/nadjazdy.js`,
  modul `js/mapa/mosty/nadjazdy-modul.js`): ~1 100 mostov z OSM mimo Dunaja (cesty, lávky a cyklolávky, železničné
  a električkové mosty). Laserový terén most nemá, preto mostovka ide od terénu na jednom konci k druhému (násypy sú
  v teréne) a nad cestou, koľajou alebo potokom sa zdvihne na podjazdnú výšku (4,8 m, 6 m, 1,6 m) s rampami;
  keď koniec ostane vysoko, pokračuje rampou (cesta) alebo schodmi (lávka). Mostovka má boky a spodok, cesta betónový
  parapet, lávka kovové zábradlie, koľaj koľajnice; piliere stoja mimo podjazdov (s kolíziou), na koncoch opory.
  Mosty, ktoré sa napájajú na iný most (rampy križovatiek), majú „voľný“ koniec bez kotvy na teréne. Po mostoch
  sa dá chodiť aj jazdiť (`hra.mosty.vyska(x, z, y)` – na mostovke, ak je hráč alebo auto v jej výške, pod mostom terén).
  Cesty, chodníky a koľaje na moste sa už nekreslia na zem. Snímky: `docs/snimky/nadjazdy/`.
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
- **Označenia verejných služieb z OSM** (`tools/mesto/sluzby.mjs` → `data/mapa/sluzby.json`, modul
  `js/mapa/vybavenie/oznacenia-modul.js`): 611 miest – polícia, nemocnice a polikliniky, pošty, školy a univerzity,
  stanice, úrady, knižnice, hasiči, obchodné centrá. Tabuľa s ikonou a názvom visí na fasáde budovy (stena
  najbližšie k ulici alebo chodníku, nie stena susedného domu); keď je služba v OSM len bod, nájde sa budova, v ktorej
  leží (alebo do 12 m od vchodu), z načítaných dlaždíc. Veľké areály majú stojan pri okraji. Pri príchode sa ukáže
  názov miesta, blízke služby sú farebné značky na minimape. Snímky: `docs/snimky/sluzby/`.
- **Názov Blavačík a vizuálna identita v farbách Bratislavy** (issue #17): červená a biela, doplnkovo zlatá
  (CSS premenné v `css/style.css`, kontrast podľa WCAG AA). Vlastné štylizované logo `assets/ui/logo.svg` – červený štít,
  biela brána s dvoma vežami a namiesto strednej veže UFO z Mosta SNP; **nie je to oficiálny erb mesta** (ten je chránený).
  Logo je v menu (aj počas načítavania), v editore postavy a ako ikona stránky (`assets/ui/favicon.svg`), červeno-biele
  pruhy v menu a editore, štítok s bránou pred názvom miesta v HUD. Snímky: `docs/snimky/identita/`.
- **Zvuky a hlasy** (issue #18, `js/zvuk/`, modul `zvuk`): všetky zvuky sú syntetizované cez Web Audio
  (jeden zvuk = jeden súbor, žiadna cudzia hudba): kroky podľa povrchu (tráva / dlažba), skok a dopad, štart, motor
  auta podľa otáčok a prevodov, pískanie pneumatík, klaksón (**H**), dvere, nárazy, zvonček električky, siréna,
  gong pred hlásením, holuby v centre, hukot dopravy podľa dennej doby a vietor pri Dunaji, klik v menu.
  Priestorový zvuk podľa kamery, najviac 24 krátkych zvukov naraz. Hlasitosť zvukov, hlasov a hudby je v menu
  (ukladá sa). Prehliadač pustí zvuk po prvom kliknutí / klávese / dotyku. Ostatné moduly prehrajú zvuk udalosťou
  `hra.posli('zvuk', { meno: 'zvoncek', x, z })`, sirénu `hra.posli('sirena', { id, x, y, z, zapnuta })`.
- **Hlasy postáv cez Google Gemini TTS – automaticky:** workflow `.github/workflows/hlasy.yml` pri zmene
  `data/dialogy/**` alebo `data/misie/**` (aj ručne a raz denne) spustí `tools/hlasy/generuj.mjs`. Ten pre každú
  repliku bez nahrávky alebo so zmeneným textom vygeneruje `assets/zvuk/dialogy/<dialóg>/<index>_<variant>.ogg`
  (Opus, 32 kb/s) a commitne ich späť. Hlas a štýl reči každej postavy je v `data/dialogy/hlasy.json` (predpripravené
  hlasy Gemini, žiadne klonovanie ľudí). Pri vyčerpaní bezplatného limitu pokračuje ďalší deň; bez kľúča hra ostane
  s titulkami. **Jediný ručný krok:** na https://aistudio.google.com/apikey vytvoriť kľúč a v repozitári
  *Settings → Secrets and variables → Actions → New repository secret* ho uložiť ako `GEMINI_API_KEY`.
  **Pridať repliku = zmeniť JSON dialógu a pushnúť** – hlas sa dorobí sám. Hra prehrá hlas pri udalosti
  `hra.posli('dialog-replika', { dialog, index, variant })` (posiela ju zobrazovanie dialógov).
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
- **Pamiatky z Blendera** (issue #31, etapa G3): `tools/blender/` – generátory modelov v Blenderi cez Python
  (`pip install bpy`, bez okna), zapečené zatienenie (AO) do textúry, export `.glb` a zmenšenie cez gltfpack (meshopt).
  Hra ich načíta cez `js/mapa/pamiatky/model-glb.js` (pri chybe postaví starý model z telies). Zatiaľ Michalská brána
  (87 kB + 316 kB AO): `python3 tools/blender/michalska_brana.py <cesta k gltfpack>` (gltfpack: `npm i gltfpack`).
- **Výškové budovy z Blendera:** Nivy Tower, Eurovea Tower, Twin City Tower, Panorama City (2 veže), Sky Park
  (4 rezidencie + kancelárie), Tower 115 a Národná banka Slovenska. Pôdorysy a časti budov z OSM
  (`node tools/blender/osm_obrysy.mjs` → `tools/blender/data/obrysy.json`), fasády sa skladajú z panelov ako
  skutočné závesové steny: sklo v dvoch–troch odtieňoch s nepatrne natočenými tabuľami (odraz oblohy sa láme),
  stĺpiky a priečky, medené lamely (Twin City), biely exoskelet s „tečúcimi“ zvislicami (Sky Park), lodžie a tiara
  rebier (Eurovea), biela mriežka s balkónmi a pergolou (Panorama), kamenná podnož s pásovými oknami (NBS),
  technické podlažia za lamelami, antény a výstražné svetlá. Zatienenie (AO) je zapečené do farieb vrcholov,
  modely sú zbalené meshopt + gzip (`assets/pamiatky/<meno>.glb.gz`, spolu ~1 MB). Generovanie:
  `python3 tools/blender/vyskove_budovy.py [meno …]` (súbory v `tools/blender/vyskove/`).
  V hre ich stavia `js/mapa/pamiatky/vyskova-budova.js` (záznam `"model": "vyskova-budova", "subor": …` v `pamiatky.json`):
  kolízie z pôdorysov, z dlaždíc sa vynechajú bežné vysunuté budovy, ktoré model nahrádza
  (`js/mapa/pamiatky/nahradene-budovy.js`), z diaľky (> 260 m) sa nekreslia drobné prvky (menej moaré a trojuholníkov).
- **Pamiatky Starého Mesta z Blendera** (`python3 tools/blender/historicke_blender.py`, dáta
  `node tools/blender/osm_pamiatky.mjs`): 35 budov – Dóm sv. Martina (gotická loď s opornými piliermi, veža z OSM
  so zeleným ihlanom a pozlátenou korunou), Stará radnica (veža s barokovou helmicou), Primaciálny palác (portikus,
  tympanón, kardinálsky klobúk), Grasalkovičov a Letný arcibiskupský palác, historická budova SND, Reduta, Modrý
  kostolík, kostoly františkánov, klarisiek, jezuitov, kapucínov, trinitárov, evanjelický, paláce Pálffyho,
  Mirbachov, Esterházyho, Apponyiho, Kutscherfeldov, Erdődyho, Zichyho, Jesenákov, Keglevičov, Aspremontov,
  Academia Istropolitana, Dom U dobrého pastiera, Stará tržnica, Carlton, SNM a Slavín. Pôdorys s nádvoriami
  (relácie OSM sa spájajú z úsekov), podlažia a tvar strechy z OSM, farby a doplnky v `tools/blender/historicke/zoznam.py`.
  Strechy podľa vzdialenosti od okraja (`historicke/strechy.py`) – valby aj okolo nádvorí, mansardy, ihlany.
- **Pamiatky 2. dávka z Blendera** (`python3 tools/blender/pamiatky2_blender.py`, dáta `node tools/blender/osm_pamiatky2.mjs`):
  **hrad Devín** (zrúcaniny Horného a Stredného hradu a Paláca pánov z Gary s oknami, 40 úsekov hradieb a múrov
  s rozpadnutým vrchom, základy veľkomoravského kostola, Panenská veža na skalnom pilieri, hradná studňa – všetko
  kopíruje terén a má kolízie), **mestské hradby** v Starom Meste (cimburie, sokel), **bunkre** československého
  opevnenia (ťažké objekty B-S v Petržalke s oceľovými zvonmi a násypom, ľahké objekty, ~100 z OSM), **Antická
  Gerulata** (odkryté základy tábora, Dom s hypokaustom), **Maximiliánova (Rolandova) fontána** s balustrádou
  a rytierom, **Brána slobody** a Pamätník železnej opony pod Devínom; historickým generátorom aj Kostol sv. Kríža
  v Devíne, Rusovský kaštieľ, Mauzóleum Chatama Sofera, Uršulínsky kostol, Notre Dame, kostol na Blumentáli,
  Kostol Svätej rodiny, Ortodoxná synagóga, Galéria Nedbalka, gréckokatolícka katedrála a Vodárenské múzeum.
- **Pamiatky 3. dávka z Blendera** (`python3 tools/blender/vyskove_budovy.py kamzik rozhlas nr_sr nove_snd nivy sng
  stadion_tehelne_pole zimny_stadion istropolis`): **prerobené staré modely** – TV veža Kamzík (tri šikmé nohy, kabína
  s reštauráciou a vyhliadkou, červeno-biely stožiar so svetlami), Slovenský rozhlas (obrátená pyramída po podlažiach
  z OSM), Národná rada SR a Nové SND (časti, výšky a materiály z OSM); **nové** – Nivy (park na streche s bežeckou
  dráhou), Slovenská národná galéria (Vodné kasárne a premostenie), Národný futbalový štadión (tribúny okolo ihriska
  s čiarami a bránami, biela strecha s osvetlením, fasáda z lamiel), zimný štadión (klenutá strecha) a **stavenisko
  Istropolis** (oplotenie, výkop, rozostavaný skelet, dva vežové žeriavy, bunky).
- **Kameň na modeloch pamiatok** (`js/mapa/pamiatky/kamen-material.js`, `js/grafika/kamen-glsl.js`): materiály
  z Blendera s „kamen“ alebo „skala“ v mene majú namiesto jednej farby procedurálny kameň vo svetových súradniciach –
  hradby Bratislavského hradu, Devín, Gerulata a mestské hradby z lomového kameňa, brány, portály a sokle z kvádrov,
  skala pod Devínom s puklinami; odtiene kameňov, škáry, stekance a lišajník. Snímky: `docs/snimky/pamiatky-3/kamen-*.jpg`.
- **Sklenené fasády modelov v noci** (`js/mapa/pamiatky/sklo-noc.js`): materiály „sklo…“ (Nivy Tower, Eurovea…) v noci
  svietia po kanceláriách (moduly 3 × 3,6 m). Sila noci prichádza zo spoločného `js/grafika/noc.js`, ktorý nastavuje
  modul deň/noc (PR realistický vzhľad); bez neho modely nesvietia. Snímka: `docs/snimky/pamiatky-3/noc-nivy.jpg`.
- **Sochy a pamätníky v celom meste** (`js/mapa/vybavenie/sochy-modul.js`, dáta `node tools/mesto/sochy.mjs` →
  `data/mapa/sochy.json`): 853 sôch, búst a skulptúr z OSM (Hviezdoslav, Štúr, Čumil, Schöne Náci, Napoleonský
  vojak, svätci…). Postava je model chodca v pokojnej póze „odliaty“ do bronzu (aj s patinou) alebo vytesaný
  z kameňa, na podstavci; busta je horná časť postavy na stĺpe, Čumil vykúka z kanála, abstraktné diela sú
  organické tvary. Postavy sú vymyslené – socha len naznačuje pamätník.
- **Hroby na cintorínoch** (`js/mapa/vybavenie/hroby.js`): rady hrobov na všetkých cintorínoch z OSM – kamenný rám
  s doskou a náhrobok (stojatá doska, kríž, nízka doska, obelisk) z leštenej žuly či pieskovca, mimo chodníkov.
- **Bratislavský hrad z Blendera** (`python3 tools/blender/hrad_blender.py`, dáta `node tools/blender/osm_hrad.mjs`):
  Kráľovský palác podľa častí z OSM – štyri krídla s pravidelnými barokovými oknami (šambrány, parapety,
  kordónové a hlavná rímsa, sokel), strmá strecha s vikiermi a komínmi, rohové veže prečnievajúce nad strechu
  („obrátený stôl“, Korunná veža najvyššia, ~47 m), portál čestného vstupu, studňa na nádvorí; brány Viedenská,
  Leopoldova, Žigmundova a Mikulášska (prejazd s kamenným rámom); hradby a múry z OSM s krycou doskou a živé ploty
  barokovej záhrady pozdĺž chodníkov parteru s fontánou. Hradby a záhrada **kopírujú terén** (`"podlaTerenu": true`):
  každý vrchol sa položí na výšku terénu a po načítaní podrobného terénu z lasera sa výšky prepočítajú; aj pevné
  modely (palác, výškové budovy) si pri zmene terénu upravia výšku päty. Hradby majú kolízie.
- **Ďalšie výškové budovy z 3D tagov OSM** (`tools/blender/vyskove/z_osm.py`): City Business Center I, centrála VÚB,
  Glória, Millennium Tower I a II (myhive Vajnorská), Aupark Tower, Technopol I a II, Incheba, Matadorka, Centrál,
  Lakeside Park a Manderlák. Každá časť budovy (`building:part`) sa postaví od `min_height` po `height` a dostane
  fasádu podľa `building:material`, `building:colour` a druhu budovy: závesová stena, pásové okná s obkladom alebo
  okná s balkónmi; stĺpy (malé časti) sú valce, na najvyššej časti technika a výstražné svetlá. Konkrétnu budovu
  dolaďuje slovník štýlov (napr. Aupark: linka na každom druhom podlaží, Technopol: bronzové sklo a hnedé parapety).
- **Mosty z Blendera:** Most SNP (A-pylón sklonený k Petržalke, UFO s presklenou reštauráciou a vyhliadkou,
  laná v troch bodoch hlavného poľa a zadné kotvenie, komorový nosník s chodníkmi dolného podlažia pod konzolami),
  Starý most (priehradové nosníky so zakriveným horným pásom, zvislice, diagonály, horné kríže, kamenné piliere,
  zeleno-sivý náter), Most Apollo (dve sklonené oblúkové rebrá 231 m / 36 m, 66 závesov do vejára, tiahla),
  Prístavný most (dvojpodlažný, priehradový nosník Warren s železničnou doskou dole) a Most Lafranconi
  (betónový komorový nosník s náběhmi nad riečnymi piliermi). Os a šírka z OSM (`data/mapa/mesto/index.json`),
  úseky nad riekou určujú polohu pilierov. Generovanie: `python3 tools/blender/mosty_blender.py [most …]`
  (`tools/blender/mosty/`). V hre `js/mapa/pamiatky/most-glb.js` (záznam `"model": "most-glb", "nahradzaMost": …`):
  model sa položí na výšku mostovky, časti pri mostovke sa v nábehoch ohnú podľa výškového profilu, všeobecný
  model mosta (`js/mapa/mosty/mosty.js`) sa pre ne nestavia (`js/mapa/mesto.js`); ak sa model nenačíta, postaví sa on.
- **Odrazy okolia opravené:** mapa okolia (`js/grafika/prostredie.js`) predtým nezachytila oblohu (guľa oblohy bola
  za `far` kamery) – sklo, autá a voda odrážali len čiernu; teraz odrážajú bledšiu oblohu.
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
- **MHD – etapa b: vozidlá jazdia podľa poriadku** (`js/mhd/vozidla/`, modul `mhd-vozidla`): každý spoj z poriadku,
  ktorý je práve na ceste v okolí hráča (linky so zastávkou do 1,6 km), jazdí ako električka (3 články, zberač),
  trolejbus (kĺbový, tyče) alebo autobus (kĺbový / sólo). Poloha sa počíta priamo z poriadku: vozidlo sa rozbieha
  a brzdí, na zastávku príde o chvíľu skôr, otvorí dvere a **odíde presne v čase z cestovného poriadku**
  (aj po preskočení času). Články sa lámu v zákrutách, autobusy idú v pravom pruhu, vpredu, na boku a vzadu
  je displej s číslom linky a cieľom. Do chodca a áut sa nedá prejsť (odtlačí ich). Všetko je pár volaní
  kreslenia (InstancedMesh). Pre ostatné moduly: `hra.mhd.vozidla`.
- **Dialógy úvodnej scény vo vlaku** (`data/dialogy/vlak-*.json`) + návrh volieb v dialógoch
  ([napady/navrh-rozsirenie-dialogov.md](napady/navrh-rozsirenie-dialogov.md)).
- **Pohyb Ďoďa:** prirodzená chôdza (dopad na pätu, odraz zo špičky), klus a beh podľa biomechaniky,
  rýchlosti 2 m/s chôdza a 6 m/s beh (Shift). **Plávanie:** z nábrežia sa dá spadnúť do Dunaja, Ďoďo pláva prsia
  alebo šliape vodu, vyliezť sa dá len na nízky breh (`js/chodec/plavanie.js`). Ďoďo je mladší (~19 rokov, prvák).
- **Premávka áut** (`js/doprava/premavka/`, modul `premavka`): do ~380 m okolo hráča jazdia stovky áut (v centre ~200–250)
  po skutočných cestách z dlaždíc mesta, v pruhoch vpravo, hustota podľa typu cesty (hlavné cesty hustejšie).
  Držia odstup (model inteligentného vodiča – IDM), spomaľujú pred zákrutami, stoja na červenú (`hra.doprava.semafor`),
  na križovatkách bez semaforov sa striedajú, brzdia pred električkou, autobusom, chodcom aj autom hráča,
  stojace auto alebo autobus na zastávke obídu. Po náraze NPC šofér chvíľu stojí. **Klávesou E sa dá nastúpiť
  aj do idúceho NPC auta.** Kreslené cez InstancedMesh (12 volaní kreslenia pre všetky autá).
- **Hráč pešo:** chôdza, beh, skok, kolízie s budovami, stromami a autami.
- **Autá:** arkádová fyzika (plyn, brzda, cúvanie, drift ručnou brzdou), kolízie, nárazy medzi autami.
- **Kamera** za postavou/autom: na PC sa pohľad ovláda myšou bez držania tlačidla (Pointer Lock, `js/vstup/mys.js`),
  pešo postava chodí v smere kamery, v aute sa myšou rozhliadneš a kamera sa vráti za auto; pri rýchlosti sa rozšíri zorné pole.
- **Ovládanie** klávesnicou aj dotykom (joystick + tlačidlá).
- **HUD:** rýchlomer, nápoveda, krátke správy, názov miesta pri pamiatkach.
- **Minimapa** vľavo dole (`js/ui/minimapa/`): kreslí sa z dát dlaždíc (budovy, cesty, chodníky, námestia, zeleň,
  Dunaj, koľaje, zastávky MHD), otáča sa podľa kamery, v aute sa podľa rýchlosti oddiali; pod ňou názov ulice.
  **M** otvorí veľkú mapu so severom hore a názvami miest (koliesko myši = priblíženie).
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
- Cesty ako plochy podľa skutočného tvaru (OSM area:highway v Bratislave takmer chýba – zatiaľ len ostrovčeky), NPC autá po nadjazdoch.
- MHD: etapa b) vozidlá jazdia podľa poriadku, c) ľudia v MHD, d) jazda hráča (lístky a revízor neskôr).
- Cesty ako plochy podľa skutočného tvaru (námestia, pešie zóny, podchody, zastávky), mosty z lasera.
- MHD: c) ľudia v MHD, d) jazda hráča (lístky a revízor neskôr), trolejové vedenie nad traťami.
- Modul chodcov: vypustiť NPC z `js/chodec/npc/` na chodníky a námestia (pohyb po chodníkoch, vyhýbanie sa), `Dav` rieši LOD.
- Rýchlosť chôdze v `config.js` je arkádová (4,2 m/s, postava pri nej beží) – pre realistický model navrhujeme 1,6 m/s (pozri PR #15).
- NPC doprava (dáta sú pripravené v `data/mapa/graf-ciest.json`).
- Svetlomety áut v noci, dážď a hmla ako počasie.
- Deň a noc (svietiace lampy a okná).
- Engine misií a dialógov, polícia, minimapa.
- Deň a noc (svietiace lampy a okná).
- Engine misií a dialógov, polícia (značky na minimapu už idú cez udalosť `znacka-mapy`).

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

## Minimapa pre ďalšie moduly
- `hra.posli('znacka-mapy', { id, x, z, farba?, popis? })` – pridá alebo posunie značku (cieľ misie, polícia…);
  mimo minimapy sa ukáže ako šípka na okraji, na veľkej mape aj s popisom.
- `hra.posli('znacka-mapy-zrus', { id })` – odstráni značku. Zoznam značiek: `hra.minimapa.znacky`.

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
