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
  4 typy fasád (staromestské okná s okenicami, obytné s balkónmi, kancelárie, jednoduché) a sklenené fasády,
  tmavší sokel budov, stromy (listnaté zo zhlukov, ihličnany) s tieňovaním koruny, zaoblené autá
  (sedan, hatchback, SUV) s lesklým lakom, diskami, svetlami a ŠPZ, postava s kĺbmi a animáciou chôdze/behu.
  Na mobile sa automaticky vypnú tiene a drahšie materiály.
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
  s doskou a náhrobok (stojatá doska, kríž, nízka doska, obelisk) z leštenej žuly či pieskovca. Ako na skutočnom
  cintoríne (issue #75): sektory ≈ 8 radov × 12 hrobov oddelené alejami, 7 m pás zelene pri obvode, voľno okolo
  ciest, chodníkov, budov a stromov, parkové sektory bez hrobov a náhodné medzery; najviac 5000 hrobov na dlaždicu.
- **Stromy z lasera v budovách modelov** (issue #71): stromy, ktoré laser „našiel“ na streche výškovej budovy
  s vlastným modelom (Manderlák mal v sebe 44 a 49 m stromy), sa pri načítaní dlaždice vyhodia
  (`bezStromovVNahradenych` v `js/mapa/pamiatky/nahradene-budovy.js`), rovnako stromy vyššie ako 30 m.
  `tools/mesto/laser/stromy.py` pri ďalšom behu maskuje aj pôdorysy modelov a takéto stromy nezapíše.
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
- Hrad Devín, fontány a pomníky (Rolandova, Ganymedova, Hviezdoslav, Štúr, SNP), ďalšie kostoly a paláce zo zoznamu,
  veže kostolov bez údajov v OSM (františkáni, klarisky).
- TV veža Kamzík ostáva zatiaľ pôvodný model z telies (tvar päty veže treba overiť podľa fotografií).
- Chodníky dolného podlažia Mosta SNP sú zatiaľ len na pohľad (nedá sa po nich chodiť).
- Laser na celé mesto (`--vsetko`), keď sa výrez odobrí (strechy sú už v binárnom formáte, ~250–500 kB na dlaždicu centra).
- Cesty ako plochy podľa skutočného tvaru (námestia, pešie zóny, podchody, zastávky), mosty z lasera.
- MHD: etapa b) vozidlá jazdia podľa poriadku, c) ľudia v MHD, d) jazda hráča (lístky a revízor neskôr).
- Modul chodcov: vypustiť NPC z `js/chodec/npc/` na chodníky a námestia (pohyb po chodníkoch, vyhýbanie sa), `Dav` rieši LOD.
- Rýchlosť chôdze v `config.js` je arkádová (4,2 m/s, postava pri nej beží) – pre realistický model navrhujeme 1,6 m/s (pozri PR #15).
- NPC doprava (dáta sú pripravené v `data/mapa/graf-ciest.json`).
- Deň a noc (svietiace lampy a okná).
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
- **Laserové skenovanie:** [data/lidar/README.md](data/lidar/README.md) – terén, budovy, strechy a stromy
  (`python3 tools/mesto/laser/*.py`). Zdroj: letecké laserové skenovanie ÚGKK SR (DMR 6.0, DMP 2.0), **© ÚGKK SR, CC BY 4.0**.
- **Textúry** (omietka, škridla, štrk, dlažba): ambientCG, CC0 – zoznam v [assets/textury/LICENSE.md](assets/textury/LICENSE.md).
- Mapové dáta © prispievatelia OpenStreetMap, licencia ODbL.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
