# Blavačík

Zábavná 3D hra v prehliadači, odohráva sa v Bratislave. Len pre srandu.
Hlavný hrdina je študent Ďoďo z Košíc, ktorý je prvýkrát v Bratislave – dizajn hry je v [napady/dizajn-hry.md](napady/dizajn-hry.md),
stav projektu a ako pokračovať v [napady/POKRACOVANIE.md](napady/POKRACOVANIE.md).

## Ako hru spustiť
- **Online:** GitHub Pages z vetvy `main` (Settings → Pages → Source: *Deploy from a branch*, vetva `main`, priečinok `/ (root)`).
  Hra potom beží na `https://kipondo.github.io/blavacik/`.
  Do repozitára nepatria symbolické odkazy (napr. `node_modules` → priečinok mimo repozitára) –
  zostavenie GitHub Pages na nich padá (*File removed before we read it*).
- **Bez inštalácie, hneď:** `https://raw.githack.com/Kipondo/blavacik/main/index.html` (servíruje priamo vetvu `main`).
- **Lokálne:** v priečinku projektu spusti `python3 -m http.server 8000` a otvor `http://localhost:8000`
  (cez dvojklik na `index.html` to nepôjde – prehliadač nedovolí načítať moduly a JSON zo súboru).
- **Editor postavy:** `editor-postavy.html` (odkaz je aj v menu hry) – vzhľad Ďoďa sa uloží a hra ho použije.
- **Meranie výkonu (trasa #60):** otvor hru s `?meranie` na konci adresy (napr. `http://localhost:8000/?meranie`)
  a stlač Hrať – hráč sa postupne prenesie na 16 miest testovacej trasy, na každom sa zmerajú snímky/s, čas snímky,
  kreslenia, trojuholníky, čas procesora a čas načítania dlaždíc; na konci sa ukáže tabuľka (tlačidlo ju skopíruje).
  Kvalitu zvoľ v menu pred meraním. Automaticky bez okna: `python3 tools/kontrola/meranie-trasy.py http://localhost:8000 vysoka`
  (Playwright + Chrome; bez grafickej karty sú snímky/s len na porovnanie pred/po). Snímky mesta z bodov trasy
  a porovnanie dvoch behov robí `tools/kontrola/trasa.py` – pozri „Kontrola mesta – testovacia trasa“ nižšie.

## Ovládanie
| | Klávesnica | Mobil |
|---|---|---|
| Chôdza / jazda | W A S D alebo šípky (pešo: W = tam, kam sa pozeráš, A/D = úkrok) | joystick vľavo |
| Beh / ručná brzda | Shift / Medzerník | ⚡ |
| Skok | Medzerník | ⤒ |
| Nastúpiť / vystúpiť | E | E |
| Kamera | klikni do hry a hýb myšou (kurzor sa zamkne); citlivosť a invertovaná os Y v menu → Nastavenia | ťahanie prstom |
| Kolobežka / bicykel: nasadnúť / zosadnúť | E pri nich (W jazda, S alebo Medzerník brzda, Shift šprint na bicykli) | E |
| Dvere (internát v Átriakoch) | E pri dverách | E |
| Pauza | Esc (uvoľní myš); späť do hry klikom | ❚❚ |
| Mapa mesta (veľká) | M; ťahanie myšou alebo WASD = posun, koliesko = priblíženie, C = späť na hráča (kým je otvorená, myš ani klávesy nehýbu hrou) | – |
| Vypísať polohu (pre misie) | P | – |
| Ukazovateľ výkonu (snímky/s, čas snímky, kreslenia, rozlíšenie, kvalita a dohľad) | F3 | – |
| Lietanie (dočasné, na prezeranie) | 2× Medzerník zapne/vypne; Medzerník hore, Shift dole | – |
| Presun na miesto (dočasné) | M → klik na veľkú mapu | – |

## Čo je v `main` (zlúčené PR)
Podrobný popis každej časti je nižšie v „Čo je hotové“.

### Átriaky – domy podľa fotiek a izba 314 priamo v meste (vetva `fix/atriaky-budovy`, #115)
- **Prieskum** budov a izieb z verejných zdrojov: [napady/atriaky-izba.md](napady/atriaky-izba.md).
- **Domy bez dier a blikania** (`tools/blender/atriaky/bloky.py`): na každom podlaží pavlač – panely vymývaného betónu
  so škárami, za nimi biela stena s oknami a dverami izieb, červenooranžové čelá a spodky dosiek; 4. podlažie
  ustúpené a presklené, strecha s presahom a mozaikovým čelom, atika so zábradlím, na streche výstup schodiska.
  Opravené: 1 m vysoká diera okolo domu pod strechou, diera medzi parapetom a zapusteným oknom, červený pás 2 cm
  pred betónom (blikal) a spodky parapetov v rovine s dlažbou terasy.
- **Izba 314 v meste** (`tools/blender/atriaky/izba.py`, `js/mapa/atriaky/internat.js`): trojlôžková izba
  (3 váľandy, stolíky, skriňa, umývadlo so zrkadlom, chladnička, radiátor, závesy, sušiak, pizza, fľaše, Ďoďova taška)
  a chodba s dverami susedných izieb, kuchynky, spŕch a WC. Izba je v ustúpenom podlaží bloku T – **ovládanie je
  rovnaké ako vonku** (tá istá postava, myš, prvá/tretia osoba, kamera pod stropom); balkónovými dverami sa pešo
  vyjde na terasu (ulička od dverí k balkónu je voľná), vchodom na prízemí sa príde na chodbu pri schodisku
  (dole späť E pri dverách schodiska).
- Kolízie: `kolizie.pridajVynimku` – v izbe sa ignoruje plný kolízny blok domu; kamera: háčik `hra.interier.kamera`.
- Blender skripty bežia aj na Windows (`atriaky_blender.py` zapisuje do dočasného priečinka systému).

### 22. 11. 2026 – nočná práca (issue #59)
Zlúčené v poradí #98 → #99 → #100 → #103 → #104 → #105 → #106 → #107 → #112 → #108 → #102 → #113, potom
opravy po zlúčení (vetva `fix/po-zluceni`):

- #98 Električky a kĺbové autobusy ako v Bratislave (#93)
- #99 Predvoľby kvality a dohľad: nízka / stredná / vysoká / ultra / auto, LOD podľa Taipei Rush, meranie `?meranie` (#58)
- #100 Átriaky: lávky a terasy na chôdzu, okolie z fotiek, internátna izba 314 cez teleport (#91)
- #103 LOD2 strechy, stromy a terén z lasera v centre, Mlynskej doline, na Nivách a v Petržalke – 96 dlaždíc (#53, #64)
- #104 Presné pamiatky – 1. dávka: Slavín, Modrý kostolík, Grasalkovičov palác + náhľad pamiatky
- #105 Typy áut, farby, taxíky Hladoš a Fičák, kuriéri a jazda podľa typu (#97, 1. časť)
- #106 Chôdza bez kĺzania nôh, nohy na teréne, hlava za kamerou, reálne výšky chodcov (#96)
- #107 Mikromobilita: kolobežky Fičák, bicykle, hoverboard a onewheel na jazdu, ľudia na cyklopruhoch (#97)
- #112 Domy na svahu: prízemie a dvere bližšie k chodníku (#111, 1. krok)
- #108 Testovacia trasa mesta: snímky zo 17 bodov jedným príkazom, galéria a porovnanie behov (#60)
- #102 Titulka Blaváčik v2 a načítavanie s vlakom Košice → Bratislava (#101) – vlak dôjde do Bratislavy, až keď sú
  postavené všetky detailné dlaždice okolia v okruhu zvolenej predvoľby kvality (#99)
- #113 Priebeh nočnej práce ([napady/noc-priebeh.md](napady/noc-priebeh.md))

### 21. 11. 2026 – integrácia (issue #51)
Integračná vetva `integracia/vsetko` spojila všetky otvorené PR k 21. 11. 2026 (konflikty a prepočítané dáta
dlaždíc sú vyriešené v nej); po zlúčení do `main` pribudli:

- #24 MHD etapa b: električky, trolejbusy a autobusy jazdia presne podľa cestovného poriadku
- #25 Ďoďo: prirodzená chôdza a beh, plávanie vo vode, mladšia tvár
- #26 Typy budov v celom meste: panelák, rodinný dom, hala, garáž
- #27 Premávka áut: stovky NPC áut v pruhoch, semafory, prednosť, odstupy
- #28 Porovnanie s realitou: zoznam opráv (etapy 1–5)
- #29 Chodci: stovky ľudí na chodníkoch a námestiach (1 na 5 m)
- #30 Opravy podľa porovnania so skutočnosťou (etapy 1–5): dosky, vikiere, radnica, fontány, SND, hrad, parky
- #32 Minimapa a veľká mapa mesta (M)
- #33 Grafika G1: AO, vzdušná perspektíva, farebné ladenie, MSAA, stabilné tiene, strechy so škridlou, kvalita v menu
- #34 Fasády 3D (G2): zapustené okná, parapety, rímsy, frontóny palácov, balkóny a štíty
- #35 Kamenné námestie: veža Kyjeva a vyvýšené časti budov v celom meste, betónové dlaždice, dlažba CC0 v celom meste
- #36 Podchody z OSM: podzemné chodby, schody a eskalátory, chôdza a kamera pod zemou
- #37 Pamiatky z Blendera (G3): generátor cez bpy so zapečeným AO, Michalská brána
- #38 Výškové budovy z Blendera: Nivy, Eurovea, Twin City, Panorama, Sky Park, Tower 115, NBS
- #39 Mosty z Blendera: SNP s UFO, Starý most, Apollo, Prístavný, Lafranconi
- #40 Ďalšie výškové budovy z 3D tagov OSM: CBC I, VÚB, Glória, Millennium Tower, Aupark, Technopol, Incheba, Matadorka, Centrál, Lakeside, Manderlák
- #41 Bratislavský hrad z Blendera: palác, brány, hradby a baroková záhrada podľa terénu
- #42 Pamiatky Starého Mesta z Blendera: Dóm, Stará radnica, Primaciálny palác, SND, Reduta, kostoly a paláce (35 budov)
- #43 Realistickejší vzhľad: zlatá hodinka, stromy po druhoch, opotrebované cesty, asfaltové chodníky s obrubníkmi, zámková dlažba
- #44 Pamiatky 2. dávka: hrad Devín, hradby, bunkre, Gerulata, Maximiliánova fontána, sochy v celom meste, hroby na cintorínoch
- #45 Pamiatky 3. dávka: nový Kamzík, Rozhlas, Národná rada, Nové SND; Nivy, SNG, Národný futbalový štadión, zimný štadión, stavenisko Istropolis
- #46 Označenia verejných služieb z OSM (tabule na fasádach, stojany, minimapa)
- #47 Nadjazdy, lávky a nadchody z OSM (mostovky, zábradlie, piliere, chôdza a jazda po moste)
- #48 Blavačík: názov, farby Bratislavy v UI a vlastné štylizované logo
- #49 Zvuky (Web Audio) a hlasy postáv cez Google Gemini TTS automaticky
- #50 Poškodenie áut pri náraze a kamera nevojde do budov
- #61 Plynulosť: dlaždice mesta po malých krokoch, automatické rozlíšenie, F3
- #66 Dočasné: lietanie (2× Medzerník) a presun klikom na veľkú mapu
- #76 Mladá garda a okolie: internát, kurty, supermarket, bistro, obytné veže (Blender)
- #77 Oprava: stĺpik neprechádza cez značky a tabule ulíc (#63)
- #78 Kamenné námestie: Hotel Kyjev, obchodný dom s hodinami, kostoly na Špitálskej, nový Manderlák
- #79 Átriaky: átriové domy na svahu, vstup s turniketmi a vrátnicou, ploty (Mlynská dolina)
- #80 Priechody pod budovami z OSM: Pasáž Liga, Luxor a 1000+ ďalších (#65)
- #81 Výšky budov v celom meste z lasera ÚGKK (63 tisíc budov) + LOD2 a stromy v Mlynskej doline
- #82 Terén pod cestami bez skokov, pod mostom po teréne (#54)
- #83 Cyklopruhy na cestách z OSM (#52)
- #84 Podniky v Mlynskej doline z OSM: kluby, bary, bistrá, obchody (#73)
- #85 Vonkajšie schody ako 3D stupne so zábradlím (#73)
- #86 Okná na ustúpených podlažiach a nadstavbách z LOD2 striech (#64)
- #87 Parkoviská asfaltové s ostrým okrajom v mape povrchov (#52, #73)
- #88 Povrchy podľa satelitu: športoviská, bazény, záhrady v obytnej zástavbe
- #89 Stanové strechy pre neobdĺžnikové rodinné domy (porovnanie so satelitom)
- #92 Cesty: autá a chodci na povrchu, terén nepresvitá, zákruty bez prekrútenia
- #95 Oprava GitHub Pages: preč symbolický odkaz `node_modules`

## Čo je hotové
- **Titulná obrazovka „Blaváčik“ a načítavanie s vlakom** (issue #101, `js/ui/menu.js`, `js/ui/nacitavanie/`,
  `css/titulka.css`): podľa návrhu majiteľa (v2) – večerné pozadie so siedmimi pamiatkami
  (`assets/ui/titulka/pozadie.webp`), Ďoďo máva (bez igelitky), erb, nápis BLAVÁČIK (biely s červeným tieňom) a ploché
  tlačidlá **Hrať · Upraviť Ďoďa · Nastavenia · Ovládanie** na tmavomodrom paneli so zlatou linkou. Návrh má plochu
  1600 × 900, v hre sa zmenší/zväčší podľa okna (pri 16 : 10 a 21 : 9 dopĺňa okraje rozmazané pozadie a panel).
  Posuvníky (grafika, myš, zvuky, hlasy, hudba) sú na obrazovke **Nastavenia**, klávesy na **Ovládanie** (obe so
  „Späť“, Esc ich zavrie). HUD za menu nie je vidieť a kým je menu otvorené, mesto sa nekreslí. Na displeji je názov
  „Blaváčik“ (menu, `<title>`); repozitár a tento README sa nepremenúvali.
  **Načítavanie:** hra sa načítava hneď po otvorení stránky; ak hráč klikne na Hrať skôr, ako je hotová, ukáže sa mapa
  Slovenska s reliéfom a vlak (lokomotíva + 5 vozňov, bez loga dopravcu) ide z Košíc cez Poprad, Žilinu, Trenčín
  a Trnavu do Bratislavy podľa skutočného priebehu (míľniky načítavania a počet postavených dlaždíc, plynulo,
  nikdy necúva) – prejdená trať je zlatá, zvyšok bodkovaný, nad lokomotívou štítok s percentami, žiadna lišta.
  Hra sa spustí, keď vlak zastane v Bratislave. Dole sa striedajú vtipné tipy (`js/ui/nacitavanie/tipy.js`).
  Reliéf: `python3 tools/ui/relief_slovenska.py` – **Copernicus DEM GLO-90** (© DLR e.V. 2010–2014 a © Airbus
  2017–2018, poskytnuté ESA v programe Copernicus), obrys Slovenska **Natural Earth** (public domain).
  **Písma** Anton, Barlow Condensed a Bricolage Grotesque (**SIL Open Font License 1.1**, Fontsource / Google Fonts)
  sú v `assets/fonts/` (`css/pisma.css`), žiadne CDN. Snímky: `docs/snimky/titulka/`.
- **Testovacia trasa mesta** (`tools/kontrola/trasa.py`, issue #60): snímky z 17 pevných bodov jedným príkazom
  a porovnanie dvoch behov (`docs/kontrola/porovnanie.html`) – návod nižšie v časti „Kontrola mesta“.
- **Typy áut, farby, taxíky a kuriéri** (issue #97, 1. časť; `js/auto/typy-aut.js`, `data/doprava/vozidla.json`,
  modul `js/doprava/vozidla-data.js`): 11 typov áut podľa jedného receptu (mestské, hatchback, sedan, kombi, SUV,
  luxusné SUV, osobná dodávka, dodávka so skriňou, pickup s korbou, športové, muscle) – vlastný bočný profil,
  rozmery a kolesá. V premávke aj zaparkované sa vyberajú **podľa váh** (najviac mestské, hatchbacky a kombi, športové
  a muscle vzácne), **farby podľa skutočného zastúpenia** (sivá, čierna, biela, strieborná, tmavomodrá…), dodávky
  prevažne biele. **Taxíky** (biele, čierne, strieborné, žlté, s lampou na streche) a vymyslené služby **Hladoš**
  (svetlomodrá) a **Fičák** (zelená) – taxi s pruhom a nápisom na boku, **kuriéri** v autách vo farbách firmy; v noci
  viac taxíkov a kuriérov, menej dodávok. Každý typ má vlastné **jazdné vlastnosti** (najvyššia rýchlosť, zrýchlenie,
  zatáčanie, priľnavosť, hmotnosť) – platia aj pre auto, ktoré si hráč vezme z premávky alebo z parkoviska. Všetko sa
  ladí v JSON bez zmeny kódu. Modely z balíkov CC0, kolobežky, bicykle a jazdci (#97 body 1–2) sú ďalšia časť.
  Snímky: `docs/snimky/vozidla/`.
- **Presné pamiatky – 1. dávka** (noc 22. 11.; `tools/blender/presne/`, `python3 tools/blender/presne_blender.py`):
  **Slavín** – terasa so schodmi, pietna sieň s lizénami, bronzovými dverami a reliéfnymi poľami, zužujúci sa pylón
  so žliabkami a bronzová socha vojaka so zástavou (~39,5 m); **Modrý kostolík** – okrúhla veža s pásmi, okienkami,
  modrou kupolou, lucernou a krížom, loď a krídla podľa častí z OSM so strechou z modrej majoliky, polkruhové okná
  s bielymi rámami, portál so zlatou mozaikou a oblým štítom; **Grasalkovičov palác** – stredný rizalit so stĺpovým
  portikom a tympanónom (`tools/blender/historicke/zoznam.py`). **Náhľad pamiatky bez mesta:**
  `nahlad-pamiatky.html?m=sm-slavin&az=200&el=14&d=1.6` (m = súbor v `assets/pamiatky/`, az/el = smer a výška
  kamery v stupňoch, d = vzdialenosť). Snímky: `docs/snimky/pamiatky-presne/`.
- **LOD2 strechy, stromy a detailný terén z lasera v širšom centre, v Mlynskej doline, na Nivách a v Petržalke**
  (#53, #64; noc 22. 11.): predtým len 11 dlaždíc (výrez Starého Mesta a Mlynská dolina), teraz **96** – Staré Mesto
  od Palisád po Landererovu a od Hlavnej stanice po Dunaj, Karlova Ves – Mlynská dolina – Družba, Mlynské nivy – Nivy –
  Trnavské mýto a stred Petržalky s Chorvátskym ramenom (`python3 tools/mesto/laser/… --sirsie-centrum`, postup
  v `data/lidar/README.md`). Strechy podľa skutočnosti (sedlové, valbové, ploché, ustúpené podlažia s oknami, vikiere,
  komíny, strojovne na panelákoch), výšky budov a dvory z lasera, stromy na skutočných miestach s výškou a šírkou
  koruny, terén 2 m zarovnaný pod cestami. Časti budov nad priechodmi a vyvýšené časti ostávajú ako predtým.
  Dáta: ≈ +14 MB (strechy 2 → 11 MB, terén +4 MB). Snímky: `docs/snimky/lod2-centrum/`.
- **Dočasné pomôcky na prezeranie mesta** (`js/ladenie/`): lietanie pešo (2× Medzerník, rýchlosť rastie s výškou,
  bez kolízií, pri pristátí sa vypne) a presun klikom na veľkú mapu (udalosť `mapa-klik` z minimapy, PR #32).
  Pred vydaním hry ich stačí odobrať z `js/moduly.js`.
- **Nadjazdy, lávky a nadchody** (`tools/mesto/nadjazdy.mjs` → `"nadjazdy"` v dlaždiciach, `js/mapa/mosty/nadjazdy.js`,
  modul `js/mapa/mosty/nadjazdy-modul.js`): ~1 100 mostov z OSM mimo Dunaja (cesty, lávky a cyklolávky, železničné
  a električkové mosty). Laserový terén most nemá, preto mostovka ide od terénu na jednom konci k druhému (násypy sú
  v teréne) a nad cestou, koľajou alebo potokom sa zdvihne na podjazdnú výšku (4,8 m, 6 m, 1,6 m) s rampami;
  keď koniec ostane vysoko, pokračuje rampou (cesta) alebo schodmi (lávka). Mostovka má boky a spodok, cesta betónový
  parapet, lávka kovové zábradlie, koľaj koľajnice; piliere stoja mimo podjazdov (s kolíziou), na koncoch opory.
  Mosty, ktoré sa napájajú na iný most (rampy križovatiek), majú „voľný“ koniec bez kotvy na teréne. Po mostoch
  sa dá chodiť aj jazdiť (`hra.mosty.vyska(x, z, y)` – na mostovke, ak je hráč alebo auto v jej výške, pod mostom terén).
  Cesty, chodníky a koľaje na moste sa už nekreslia na zem. Snímky: `docs/snimky/nadjazdy/`.
- **Domy na svahu** (`js/mapa/budovy/budovy.js`): prízemie fasády už nezačína v najvyššom bode terénu pod domom –
  pri miernom svahu je v strede (na Michalskej boli dvere a výklady 1,3 m nad chodníkom, teraz najviac ~0,65 m),
  pri strmom najviac 0,75 m pod najvyšším bodom (dolná strana má sokel ako suterén). Snímky: `docs/snimky/budovy-svah/`.
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
  názov miesta, blízke služby sú farebné značky na minimape. Tabule sa stavajú postupne (najviac ~3 ms za snímok),
  aby hra v centre pri príchode do novej štvrte nesekala. Snímky: `docs/snimky/sluzby/`.
- **Podniky v Mlynskej doline z OSM** (`tools/mesto/podniky.mjs` → `data/mapa/podniky.json`, issue #73): 37 klubov,
  barov, bistier, reštaurácií, obchodov, práčovní a posilňovní (UniK Mlyny, Klub 39, Študentka, Bistro Mladosť…).
  Menšia vývesná tabuľa nad vchodom na stene pri bode podniku: veľké meno z OSM, pod ním druh a ikona. Názvy len
  z OSM; reťazce majú len všeobecný nápis (POTRAVINY…), obchody v obchodnom centre sa vynechajú. Pri príchode
  sa ukáže meno podniku, kluby, bary a bistrá sú na minimape. Snímky: `docs/snimky/podniky/`.
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
- **Výšky budov v celom meste z lasera** (issue #53, `python3 tools/mesto/laser/vysky.py`, laser v `.cache/laser/`):
  pre 63 221 z 88 574 budov je výška z laserového skenovania ÚGKK (DMP − DMR), pre šikmé strechy
  aj odkvap a hrebeň (podľa sklonu povrchu strechy).
  - Odhad sa nahradí vždy. Výška z OSM sa nahradí, keď sa od lasera líši o viac ako 3 m.
  - Budovy, ktoré laser z roku 2023 nevidí (novostavby), ostávajú podľa OSM.
  - Šikmá strecha na neobdĺžnikovom pôdoryse (hrebeň hra postaví len na obdĺžniku) ostáva označená ako šikmá:
    rodinné domy tak majú farbu škridly, nie sivú plochú strechu (zistené porovnaním so satelitom – Rusovce,
    Záhorská Bystrica; predtým bolo ~70 % domov v predmestiach „plochých“).
  - Dlaždice narástli len o 3,6 MB (33,9 → 37,5 MB), lebo sa menia len čísla.
  - LOD2 strechy (`budovy.py`) ostávajú pre výrez Starého Mesta. Celé mesto by malo ~500 MB, preto čaká
    na schválenie. Skripty `teren.py`, `budovy.py` a `stromy.py` vedia spracovať aj vybrané dlaždice
    (`--dlazdice i_j,…`, `--mlynska-dolina`).
  - **Mlynská dolina** (miesto príbehu, #73) má navyše podrobný terén 2 m, LOD2 strechy a stromy z lasera
    ako Staré Mesto (`--mlynska-dolina`): 305 budov so strechou z lasera a 6369 stromov, spolu +0,7 MB.
  - Snímky pred a po: `docs/snimky/laser-vysky/`.
- **Terén pod cestami a pri mostoch** (issue #54):
  - `python3 tools/mesto/laser/cesty_teren.py` zarovná podrobný terén (2 m) pod cestami. Profil po osi cesty
    je pozdĺžne vyhladený, naprieč je cesta vodorovná a terén sa 3 m za okrajom plynulo zlieva s pôvodným
    (múry a svahy nad 2,5 m ostávajú). Na Staromestskej klesli skoky z 0,9 m na 0,07 m.
  - `hra.mapa.vyska(x, z, y)` berie výšku objektu: kto je pod mostovkou, ide po teréne a neskočí na most.
    Bočný okraj nájazdovej rampy sa plynulo zlieva s terénom.
- **Cesty bez prerastania a vnárania** (`js/mapa/cesty/povrch-modul.js`, `cesty.js`): `hra.mapa.vyska` pripočíta
  k terénu výšku vozovky (0,12 m) a chodníka s obrubníkom (0,28 m) z mapy povrchu dlaždice po 1 m – autá, autobusy aj chodci
  stoja na povrchu, nie 12 / 28 cm v ňom (terén bez ciest: `hra.mapa.vyskaZeme`). Pás cesty má 3 rady vrcholov a delenie
  po 2,5 m (terén cez vozovku presvital na 2 % plochy, teraz na 0,6 %), v zákrute pokos (cesta sa nezúži) a vnútorný
  okraj ostrej zákruty sa neprekrúti. Pod vozovkou a chodníkom nie je v mape povrchu trieda trávy (trsy trávy
  neprerastajú cez cestu).
- **Laserové skenovanie ÚGKK (etapa a2 z issue #8) – výrez Starého Mesta s Hradným kopcom** (1,5 × 1 km,
  od Michalskej brány po nábrežie a hrad, dlaždice −2…0 × −1…0), na ktorom sa postup ladí pred spustením na celé mesto:
  - terén celého mesta z DMR 6.0 (predtým Copernicus: Staré Mesto bolo o 6–10 m vyššie, hradná plošina o 10 m nižšie),
    vo výreze detailný terén po 2 m,
  - výšky budov z lasera (`zdrojVysky`: `lidar` / `osm` / `odhad`), strechy rozložené na roviny (LOD2) so škridlou
    a štrkom, štíty, ~5 800 komínov, vnútorné dvory (z OSM multipolygónov aj z lasera); ustúpené podlažia
    a nadstavby (stena medzi rovinami strechy tej istej budovy) majú okná po podlažiach, štítové steny medzi
    dvoma budovami ostávajú bez okien (issue #64, `js/mapa/budovy/okna-ustupenych.js`, snímky `docs/snimky/okna-ustupene/`),
  - mimo LOD2 dostane dom so šikmou strechou na neobdĺžnikovom pôdoryse (tvar L, výstupky) stanovú strechu
    s vrcholom vo vnútornom bode pôdorysu (`js/mapa/budovy/stanova-strecha.js`); predtým bol plochý
    (porovnanie so satelitom, Rusovce – snímka `docs/snimky/strechy-domov/`),
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
  ~780 pouličných lámp, červené cyklopruhy s bielou čiarou a piktogramom bicykla (316 úsekov, ~61 km z OSM
  `cycleway=lane`). Značka je pred stĺpikom na dvoch objímkach (stĺpik neprechádza symbolom), tabuľa ulice
  má stĺpik pri kraji, označník MHD je plechová skrinka okolo stĺpa. Vonkajšie schody (~3 900 schodísk z OSM
  `highway=steps`, modul `js/mapa/cesty/schody-modul.js`) sú 3D stupne po teréne (výška schodu 15 cm, na rovine podesta)
  s kovovým zábradlím pri dlhších schodiskách. Graf ciest pre NPC dopravu (`data/mapa/graf-ciest.json`, modul `hra.doprava`).
- **Grafika:** obloha so slnkom a pohyblivými oblakmi, odrazy okolia (sklo, autá, voda), Dunaj s vlnkami,
  7 typov fasád (staromestské okná s okenicami, obytné s balkónmi, kancelárie, jednoduché, panelák, rodinný dom, hala) a sklenené fasády,
  tmavší sokel budov, stromy (listnaté zo zhlukov, ihličnany) s tieňovaním koruny, zaoblené autá
  (sedan, hatchback, SUV) s lesklým lakom, diskami, svetlami a ŠPZ, postava s kĺbmi a animáciou chôdze/behu.
  Na mobile sa automaticky vypnú tiene a drahšie materiály.
- **Plynulosť (hra nesekala pri načítaní mesta):** dlaždica mesta sa stavia po malých krokoch (najviac ~7 ms za snímok):
  zem po krokoch (textúra, mapa tried, výšky po 30 riadkoch, normály – `js/mapa/teren/zem-dlazdica.js`), budovy po 30
  (`krokyBudov`), cesty, chodníky, koľaje, podchody, značky a lampy každé zvlášť (`js/mapa/dlazdice/postav-dlazdicu.js`).
  Mapa tried zeme sa skladá bez čítania pixelov (trieda do R, zatienenie a maska asfaltu sa prefarbia a pripočítajú),
  zatienenie pri domoch je jedno rozmazanie v 4× menšom plátne (predtým rozmazanie pri každom dome – v centre to trvalo
  aj sekundy), šum textúry je hotové plátno. Hotová dlaždica sa pred ukázaním pripraví pre grafickú kartu
  (`js/mapa/dlazdice/pripravit-dlazdicu.js`: shadery na pozadí cez `compileAsync`, veľké textúry zeme po jednej).
  3D fasády sa stavajú po podlažiach a do typovaných polí (menej odpadu v pamäti). **Automatické rozlíšenie**
  (`js/grafika/rozlisenie.js`): keď karta nestíha (~50 snímok/s), zníži sa rozlíšenie kreslenia po krokoch až na minimum predvoľby kvality,
  pri rezerve sa vráti; keď zníženie nepomôže (brzdí procesor), vráti sa späť. **F3** ukáže snímky/s, priemerný
  a najhorší čas snímky, počet kreslení, trojuholníky a rozlíšenie (`js/ui/vykon.js`).
- **Efekty a kvalita grafiky** (issue #31, etapa G1, `js/grafika/efekty/`): zatienenie kútov (AO z hĺbky – päty budov,
  kúty, dvory a ulice pri pohľade zhora), vzdušná perspektíva (vzdialené mestá a kopce blednú do farby oblohy),
  farebné ladenie, vyhladzovanie hrán (MSAA), jemná vineta; tiene slnka sú ostrejšie, stred tieňov je kúsok pred
  hráčom v smere pohľadu a je zarovnaný na texely (okraje neblikajú), na okraji tieňovej mapy sa tiene plynulo stratia.
  Strechy bez laserového modelu majú škridlu / štrk s normálovou mapou a drsnosťou (CC0, mapované zo svetových súradníc).
  V menu sa dá zvoliť **Grafika: nízka / stredná / vysoká / ultra / auto** (od #58 – pozri *Predvoľby kvality a dohľad*). Na RTX 2060 (1569 × 1266) trvá snímok 10,6 ms bez efektov, 11,0 ms stredná, 12,9 ms vysoká –
  hra drží 60 FPS. Snímky pred/po: `docs/snimky/grafika/`. Ladenie AO v konzole:
  `hra.moduly.find(m => m.nazov === 'efekty').vykreslovac.matVysledok.uniforms.ladenie.value = 1`.
- **Predvoľby kvality a dohľad** (issue #58, podľa Taipei Rush; `js/grafika/predvolby.js`, `js/grafika/kvalita.js`):
  zblízka ostáva grafika rovnaká, šetrí sa diaľka. **Hmla končí pri dohľade** a za ňou sa nič nestavia ani nekreslí
  (predtým jednoduché bloky budov do 3,2 km a pamiatky po celom meste). Plne podrobné dlaždice sú len v okruhu
  okolo hráča, ďalej po koniec hmly **stredný pás**: jednoduché bloky budov s oknami (shader, v noci časť okien
  svieti, z diaľky bez mihotania). **Drobnosti** (lavičky, značky, tabule ulíc) sa kreslia len zblízka, lampy do
  dvojnásobku (`js/mapa/vybavenie/dosah-drobnosti.js`); pamiatky a skupiny stromov za hmlou skryje `js/kamera/dohlad.js`.

  | | nízka | stredná | vysoká | ultra |
  |---|---|---|---|---|
  | dohľad (koniec hmly) | 420 m | 650 m | 900 m | 1300 m |
  | plný detail (okruh) | 250 m | 350 m | 450 m | 600 m |
  | drobnosti | 70 m | 105 m | 150 m | 220 m |
  | autá / chodci najviac | 40 / 120 | 90 / 250 | 200 / 450 | 200 / 450 |
  | tiene (mapa, dosah) | nie | 2048, 100 m | 4096, 120 m | 4096, 150 m |
  | efekty (AO, MSAA) | nie | stredné | plné | plné |
  | pomer pixelov min / max | 0,7 / 1,0 | 0,75 / 1,25 | 0,8 / 1,5 | 0,9 / 2,0 |

  **Auto** (predvolená voľba) začne podľa grafickej karty (integrovaná → stredná, samostatná → vysoká) a podľa
  plynulosti prejde o stupeň nižšie alebo vyššie. Keď hra dlhšie nestíha ani pri najnižšom automatickom rozlíšení,
  **dohľad sa skráti** o 15 % (najviac na 55 %), pri rezerve sa vráti. Aktuálny stav ukáže menu pod výberom a F3.
  Tiene, efekty a NPC na vysokej sú ako pred #58 (tabuľka Taipei Rush má na vysokej menej – zblízka by to bolo vidieť).
  **Meranie** na trase #60 (`docs/meranie/58-trasa-60.json`, bez grafickej karty, vysoká pred → po): kreslení o 24–44 %
  menej (napr. Hlavné nám. 1211 → 805, Eurovea 991 → 552), trojuholníkov o 14–32 % menej, jednoduchých dlaždíc
  ~130 → ~12, podrobných 16–21 → 4–10; okolie po presune sa dostavia o rád rýchlejšie (Eurovea 37 s → 7 s).
  Nízka: ~430 kreslení a ~1,9 mil. trojuholníkov. Snímky pred/po: `docs/snimky/kvalita/` (zblízka bez zmeny, diaľka v opare).
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
    Parkoviská z OSM sú asfaltové so záplatami a ostrým okrajom (predtým rozmazaná sivá plocha, snímky
    `docs/snimky/parkoviska/`).
    Podľa porovnania so satelitnou snímkou: **športoviská** majú povrch z OSM (antuka, tartan, umelá tráva,
    asfalt, piesok) s bielymi čiarami a bežecké dráhy so 6 dráhami (`tools/mesto/ihriska.mjs` → `data/mapa/ihriska.json`,
    `js/mapa/teren/ihriska.js`), ~800 vonkajších **bazénov** a fontán je tyrkysová voda s obrubou a v **obytnej
    zástavbe** (OSM `landuse=residential`, `tools/mesto/zastavba.mjs` → `data/mapa/zastavba.json`) je nespevnená zem
    trávnik / záhrada namiesto béžovej holej zeme – okrem hustej zástavby a historického jadra (`js/mapa/teren/zahrady.js`);
    kde OSM obytnú zástavbu nemá (celá Petržalka), dopĺňa ju odhad z okolia obytných budov (`tools/mesto/zastavba_odhad.py`, 19 km²).
    Snímky pred/po: `docs/snimky/povrchy/`.
  - **Tráva** menej do žlta, sýtejšie a suchšie miesta, štruktúra trávy aj v parkoch z mapy pokrývky.
  - **Tráva zblízka** (`js/mapa/zelen/trava-modul.js`, `trava.js`): trsy stebiel okolo kamery na trávnikoch, v parkoch
    a na zatrávnených svahoch (podľa mapy tried a pokrývky dlaždice), zblízka husto, ďalej redšie a menšie;
    stredná kvalita do 18 m, vysoká do 30 m, nízka bez nej. Na strmých zrezoch tráva nerastie.
  - **Stromy mimo ciest** (`js/mapa/zelen/miesto-stromu.js`): strom nesmie stáť na vozovke, koľajach, obslužnej
    ceste ani v dome. Stromy z lasera majú polohu podľa stredu koruny – keď koruna presahuje nad cestu, kmeň sa
    posunie kolmo na okraj (najviac o 4 m), inak sa strom vynechá.
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
  **Úzke časti overuje laser** (`tools/mesto/laser/casti.py`, issue #68): časť s kratšou stranou pod 12 m,
  nad ktorou laser nič nevidí, sa vyhodí, privysoká sa zníži na výšku z lasera. Odstránilo to falošné 75 m „veže“
  za Kyjevom (117 znížených, 15 vyhodených častí). Širšie časti ostávajú podľa OSM, lebo laser je z roku 2023.
- **Priechody pod budovami** (issue #65; `node --max-old-space-size=8000 tools/mesto/priechody-osm.mjs`,
  potom `python3 tools/mesto/priechody.py`): z OSM `tunnel=building_passage` a `covered=yes/arcade` (1958 ciest)
  a ručne doplnených v `data/mapa/priechody-rucne.json`. Budova sa rozdelí na prízemie bez priechodu (s kolíziou)
  a hornú časť nad ním (`minVyska` 3,8 m, s podhľadom, bez kolízie). V meste je tak 1028 priechodov, ktorými sa
  dá prejsť – napríklad Pasáž Liga (Dunajská – Grösslingova) alebo Pasáž Luxor.
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
- **Mladá garda a okolie (Račianska)** z Blendera (`python3 tools/blender/garda_blender.py internat obchody
  obytne_veze okolie`, dáta `cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_garda.mjs`):
  internát Mladá garda podľa častí z OSM – šesť krídel so 4 podlažiami, valbové strechy s vetracími vikiermi,
  rímsy, šambrány, lodžie na čelách krídiel, nárožné budovy, vstupná budova s presklenou fasádou, cimburím
  a hodinovou vežou (ciferníky, ručičky, kríž), jedáleň, spojovacie chodby, stožiare s vlajkami a socha s živým
  plotom pred vstupom; antukové tenisové kurty s čiarami, sieťami a oplotením. Oproti cez Račiansku **supermarket**
  (hala so šikmou strechou z OSM, plechové opláštenie, výklady s plagátmi, podlubie na stĺpoch, zádverie,
  prístrešok na vozíky, rampa), **bistro** (drevené lamely, presklená jedáleň, terasa so slnečníkmi, stojan)
  a **obytné veže** za supermarketom (17 a 20 podlaží + nižší blok, fasáda z posunutých rámov okien, zelené strechy).
  Obchody majú podľa pravidiel projektu **vlastné neutrálne nápisy** („POTRAVINY“, „BISTRO“) – žiadne značky firiem.
  Nápis je nový model `js/mapa/pamiatky/napis.js` (tabuľa s textom z plátna, záznam `"model": "napis"`).
- **Kamenné námestie, Špitálska a Manderlák** z Blendera (issues #62, #67, #69, #70; dáta
  `cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_kamenne.mjs` a `../blender/osm_pamiatky.mjs`,
  modely `python3 tools/blender/kamenne_blender.py kyjev prior doplnky`,
  `python3 tools/blender/historicke_blender.py kostol-alzbetinok kostol-sv-ladislava`,
  `python3 tools/blender/vyskove_budovy.py manderla`). Výšky sú z laserového skenovania ÚGKK (DMP − DMR).
  - **Hotel Kyjev**: doska 61 m nad podnožou 10,5 m. Na širších stenách sú sústredné obdĺžnikové rámy
    z bielych a tmavočervených pásov, vonku vodorovné pásy. Užšie steny sú béžové so škárami, hore tmavý veniec
    a ustúpená technika. Podnož má presklené prízemie za stĺpmi a travertín s pásom okien.
  - **Obchodný dom**: biely, takmer bezokenný klin na štíhlych stĺpoch, horná hrana stúpa z 19 na 23 m.
    Na fasáde sú veľké okrúhle hodiny, pod nimi štyri stĺpce tmavých lamiel a hore vetracie lamely.
    Má bielu vežu so štvorcovými oknami, ustúpeným podlažím a komínmi, nižšiu presklenú budovu s lávkou
    a nadstavbou a reliéf.
  - **Námestie**: okrúhly vyvýšený záhon s kvetmi a drevené truhlíky so stromčekmi (kopírujú terén).
  - **Kostol sv. Alžbety** (alžbetínky): priečelie do ulice s výklenkami a sochami, veža s hodinami
    a zelenou cibuľovou helmicou.
  - **Kostol sv. Ladislava**: biele klasicistické priečelie s pilastrami a štítom, zvonička na streche,
    oranžová strecha.
  - **Manderlák**: okrovo-hnedé murivo, tmavočervené piliere s hrotmi nad atikou, samostatné okná s bielymi
    rámami, tehlová nadstavba so stožiarom a obchody s červeným pásom.
  - Obchody majú neutrálne pásy bez nápisov a značiek.
  - Nový kľúč `nahradit` v `<subor>.json` modelu: pôdorysy, z ktorých sa len vyhodia budovy a stromy dlaždíc,
    bez kolízie – napríklad pod blokom obchodného domu sa dá prejsť medzi stĺpmi.
  - Snímky: `docs/snimky/kamenne/`.
- **Átriaky v Mlynskej doline** (issue #72; dáta `cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_atriaky.mjs`,
  laser `python3 tools/blender/laser_atriaky.py`, model `python3 tools/blender/atriaky_blender.py`).
  - **Domy**: 20 átriových domov AD-A … AD-U podľa pôdorysov z OSM, výšky a terén pod každým domom
    z laserového skenovania ÚGKK. Areál je na svahu s rozdielom 18 m, každý dom stojí na svojej výške.
  - **Vzhľad**: pohľadový betón, mohutné vodorovné parapetné pásy, tehlovočervené pásy pod oknami, zapustené pásy
    okien, presklené prízemie na stĺpoch, **ustúpené najvyššie podlažie s terasou** (biele zábradlie) a strecha.
  - **Átriá**: laser ukázal, že sú zastrešené, preto majú domy na streche svetlík. Otvorený dvor
    s prechodom má len AD-I.
  - **Vstup** podľa verejnej fotografie: tri celovýškové turnikety (poloha z OSM), sivá vrátnica
    s červeným pásom, dvojkrídlová brána so značkou zákazu státia, skriňa a betónový múr.
  - **Ploty a múry** okolo areálu sú z OSM a majú kolízie. Cez turnikety sa dá prejsť.
  - **Lávky a terasy, po ktorých sa dá chodiť** (issue #91, `js/mapa/atriaky/modul.js`): úzke prepojenia v OSM
    pôdorysoch sú lávky v dvoch podlažiach nad sebou (betónová doska, tehlovočervený pás, biele zábradlie), pod nimi
    je voľný prechod (predtým tam bola plná stena). Dolná lávka je prvé podlažie aspoň 3,1 m nad zemou, horná je
    zvyčajne v úrovni terasy – z nej sa prejde rovno na terasu. **Vonkajšie schody na lávky a terasy nie sú**
    (na fotkách ich niet) – na ochoz (terasu) bloku T sa ide z izby 314. Biele zábradlia lávok a terás kreslí hra
    a majú kolíziu s výškou (`js/mapa/kolizie.js`, `info.vyska`), takže sa nedá spadnúť a pod lávkou sa dá prejsť;
    dom bráni len po úroveň terasy, ustúpené podlažie po strechu. Domy sú v kolíziách „budova“ s výškou strechy,
    takže kamera na terase ani pri dome nevojde do steny. Pochôdzne plochy idú do modulu nadjazdov udalosťou
    `'pochodzne-plochy'`. Kolízie modulu sa pri prestavbe (načítanie laserového terénu) naraz odstránia a postavia znova.
  - **Okolie podľa fotiek majiteľa**: pri bloku T oranžová tabuľa „T“ so smerovkou „UKc →“, v dvore medzi R, O, S, T
    nízke betónové múriky, hranaté kvetináče, sivý kôš a vysoká lampa s bielou pätkou.
  - **Internát cez teleport** (`js/mapa/atriaky/internat.js`): nad vchodom do bloku T sa vznáša oranžová šípka
    (zďaleka väčšia), na minimape je oranžová značka „Internát – blok T“ (mimo minimapy šípka na okraji). Vchod
    je vo výklenku pod prvým poschodím (dom stojí na svahu, vchod je tam, kde je pod stropom aspoň 2,3 m).
    Pri dverách „E – Otvoriť dvere (internát)“ – dvere sa otvoria, obraz stmavne a hráč je v chodbe (sprchy, WC,
    kuchynka); vľavo na konci je trojlôžková izba 314 (postele, stolíky, stoličky, poličky, vešiaková skriňa,
    umývadlo so zrkadlom, chladnička, okno s výhľadom). Z izby vedú **balkónové dvere na ochoz** („E – Vyjsť
    na ochoz“) – hráč sa objaví na terase bloku T pred dverami v betónovom portáli a môže chodiť po terase
    a lávkach v jej úrovni; tými istými dverami („E – Do izby 314“) sa vráti. Mesto sa vnútri nekreslí, hráč
    v meste stojí. Vnútri WASD a myš, dvere na začiatku chodby vedú von pred vchod.
  - **Verejné fotky a odkiaľ sú fotené**: `data/atriaky-fotky.json` (Wikimedia Commons s GPS + fotky majiteľa).
    Snímky pred/po: `docs/snimky/atriaky/a91-*.jpg`.
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
- **MHD – etapa b: vozidlá jazdia podľa poriadku** (`js/mhd/vozidla/`, modul `mhd-vozidla`): každý spoj z poriadku,
  ktorý je práve na ceste v okolí hráča (linky so zastávkou do 1,6 km), jazdí ako električka (5 článkov, zberač),
  trolejbus (kĺbový, tyče) alebo autobus (kĺbový / sólo). Poloha sa počíta priamo z poriadku: vozidlo sa rozbieha
  a brzdí, na zastávku príde o chvíľu skôr, otvorí dvere a **odíde presne v čase z cestovného poriadku**
  (aj po preskočení času). Články sa lámu v zákrutách, autobusy idú v pravom pruhu, vpredu, na boku a vzadu
  je displej s číslom linky a cieľom. Do chodca a áut sa nedá prejsť (odtlačí ich). Všetko je pár volaní
  kreslenia (InstancedMesh). Pre ostatné moduly: `hra.mhd.vozidla`.
  Vozidlo nejde cez autá ani ľudí (`prekazky.js`): keď mu na trase do 30 m stojí auto, hráč alebo chodec, spomalí,
  zastaví, električka zazvoní a počká; potom pokračuje s meškaním (čas spoja sa posunie). Po 10 s čakania sa pohne,
  aby sa nezasekla s autom, ktoré čaká na ňu.
- **Vzhľad vozidiel MHD ako v Bratislave** (issue #93, `js/mhd/vozidla/geometria.js`): **električka** má 5 článkov
  (~32 m, obojsmerná – kabína na oboch koncoch), jasne červenú karosériu, **čierny pás okien** cez celú dĺžku,
  sivé kryty kĺbov, zaoblené čelo so šikmým čelným sklom v čiernom ráme, hranaté svetlomety so striebornou lištou,
  nízky spojler, malé biele číslo vozidla na nose (vymyslené), zrkadlá na tyči a zberač so žltou lištou.
  **Kĺbový autobus a trolejbus** („harmonika“): červená karoséria, čierny pás veľkých okien až po strechu,
  strieborné harmonikové mechy, veľké zaoblené čelné sklo, zahnuté spätné zrkadlá zhora, LED svetlá v čiernych
  rámoch, vymyslená tabuľka s číslom, kryt klimatizácie. Dvere sú čierne presklené s červeným spodkom a žltým
  tlačidlom; v noci svieti interiér cez okná modrobielo. **Displej s číslom linky a cieľom ostal bez zmeny.**
  Žiadne logá výrobcov. Prehliadka modelov bez hry: `tools/kontrola/vozidla-mhd.html#elektricka`
  (aj `#autobus`, `#bok`, `#zadok`, `#noc`; cez lokálny server).
- **Dialógy úvodnej scény vo vlaku** (`data/dialogy/vlak-*.json`) + návrh volieb v dialógoch
  ([napady/navrh-rozsirenie-dialogov.md](napady/navrh-rozsirenie-dialogov.md)).
- **Pohyb Ďoďa:** prirodzená chôdza (dopad na pätu, odraz zo špičky), klus a beh podľa biomechaniky,
  rýchlosti 2 m/s chôdza a 6 m/s beh (Shift).
  **Plynulá chôdza (issue #96, `js/chodec/postava/animacie.js`, `krok.js`):** klipy stoj, chôdza, klus a beh sa
  nemenia natvrdo podľa prahov, ale miešajú sa podľa rýchlosti (blend space) a majú spoločnú fázu kroku – pri
  zrýchľovaní z chôdze do behu ostane noha na zemi v tom istom okamihu kroku. Pri načítaní sa z klipu zmeria,
  akou rýchlosťou sa oporné chodidlo posúva dozadu (chôdza 1,39 m/s, klus 1,88, beh 3,02 pri Ďoďovi; NPC majú
  vlastné podľa kostry) a krok sa zrýchli presne tak, aby noha nekĺzala (pri behu najviac 1,3×, inak by nohy
  „kmitali“). Hráč sa rozbieha ~0,25 s a brzdí ~0,2 s (obrátka ide cez zastavenie), otáča sa najviac 540 °/s,
  v zákrute sa nakloní dovnútra (do 8°), pri rozbehu mierne dopredu (`js/chodec/pohyb-podla-kamery.js`). Pri
  stene sa kĺže popri nej a animácia ide podľa skutočného posunu (nebeží na mieste); skok sa dá aj 0,15 s po
  zídení z hrany. **Chodci** majú výšku z normálneho rozdelenia (muži 180 ± 7 cm v rozsahu 163–198, ženy
  167 ± 6 cm v 152–184, dôchodcovia o 4 cm nižší; `vyska` v profiloch `data/postavy/npc.json`), mení sa mierka celého
  modelu a vyšší chodí rýchlejšie dlhším krokom; dav (VAT) dostal rovnaké zladenie kroku s rýchlosťou.
  **Nohy na teréne a hlava** (`js/chodec/postava/telo-na-terene.js`, IK dvoch kostí `ik.js`): položené chodidlo
  hráča sa postaví na skutočnú výšku povrchu pod ním a natočí sa so svahom, telo sa zníži o nižšiu nohu (do 0,3 m) –
  na svahu 27 % sú špičky do 7 mm od zeme (predtým jedna 12 cm vo vzduchu, druhá 12 cm v zemi). Hlava sa natáča tam,
  kam sa pozerá kamera (do ~57°, nie za chrbát, pri behu menej); keď hráč 4 s stojí a nehýbe kamerou, pomaly sa rozhliada. Úpravy kostí sa pred ďalšou animáciou vrátia
  (mixér zapisuje kosť len pri zmene hodnoty – bez toho by sa hromadili). Cena ~0,08 ms na snímok.
  Snímky pred/po: `docs/snimky/chodza/` (GIF chôdza–beh–zastavenie–úkrok, nohy na svahu). **Plávanie:** z nábrežia sa dá spadnúť do Dunaja, Ďoďo pláva prsia
  alebo šliape vodu, vyliezť sa dá len na nízky breh (`js/chodec/plavanie.js`). Ďoďo je mladší (~19 rokov, prvák).
- **Zdieľané kolobežky „Fičák“ a mestské bicykle** (issue #97, `js/mikromobilita/`, modul `kolobezky`): na chodníkoch
  a v pešej zóne stoja odstavené elektrické kolobežky vymyslenej firmy Fičák (zelené, po 1–3 kusoch, šikmo na stojane)
  a mestské bicykle rôznych farieb (po 1–2, s košom/nosičom, blatníkmi a stojanom). Stanovištia sa vyberú z chodníkov
  detailných dlaždíc, vždy rovnako podľa polohy (v centre ~170 na km², tretina s bicyklami); každý typ sa kreslí jednou
  InstancedMesh do 170 m. **E pri vozidle = nasadnúť**, W plyn/šliapanie, S alebo Medzerník brzda, A/D zatáčanie,
  Shift šprint (bicykel), E = zosadnúť (do 14 km/h). Kolobežka: obmedzovač 25 km/h, rýchly rozbeh; bicykel 23 km/h,
  šprint 35 km/h, do kopca citeľne pomalší. Oba sa nešmýkajú do boku, v zákrute sa nakláňajú (v·ω/g), od stien
  a áut sa odrazia, chodca zrazia len tesne pred sebou. **Jazdec:** na kolobežke Ďoďo stojí na doske, na bicykli sedí
  s predklonom a šliape – ruky na riadidlách a nohy na doske/pedáloch drží IK dvoch kostí (`js/chodec/postava/ik.js`,
  `jazdec.js`); kľuky sa točia podľa rýchlosti (voľnobeh pri dobiehaní). Kamera je bližšie ako za autom. Vozidlo,
  z ktorého hráč zosadol, ostane stáť (najviac 8, ďalej ako 400 m sa odpracú). Modely sú v kóde (kolobežka 432,
  bicykel 1 676 trojuholníkov). Nápovedy iných modulov idú cez `hra.stav.napoveda` (HUD ich zobrazí, keď nie je
  nápoveda k autu). Zriedka (~5 % stanovíšť) leží na chodníku aj **hoverboard** (15 km/h, otáča sa na mieste) alebo
  **onewheel** (28 km/h, Ďoďo stojí bokom, ľavá noha vpredu). **Ľudia na kolobežkách a bicykloch** (`js/mikromobilita/npc-jazdci.js`, modul `jazdci-npc`):
  najviac 6 naraz jazdí po červených cyklopruhoch (pravý pruh v smere cesty, ľavý proti) a cyklochodníkoch 50–180 m
  od hráča, 14–25 km/h, v zákrutách sa nakláňajú, pred hráčom zabrzdia. Jazdec je plný model NPC (študent, kuriér,
  korporátnik…) s rovnakou pózou ako hráč; ďalej ako 25 m zlúčená sieť LOD1 (tá istá kostra, 1 volanie kreslenia) –
  6 jazdcov pridá ~3 volania kreslenia a ~0,2 ms CPU. Snímky: `docs/snimky/kolobezky/`.
- **Premávka áut** (`js/doprava/premavka/`, modul `premavka`): do ~380 m okolo hráča jazdia stovky áut (v centre ~200–250)
  po skutočných cestách z dlaždíc mesta, v pruhoch vpravo, hustota podľa typu cesty (hlavné cesty hustejšie), celkovo 3× redšia (`RIEDKOST`, najviac 200 áut).
  Držia odstup (model inteligentného vodiča – IDM), spomaľujú pred zákrutami, stoja na červenú (`hra.doprava.semafor`),
  na križovatkách bez semaforov sa striedajú, brzdia pred električkou, autobusom, chodcom aj autom hráča,
  stojace auto alebo autobus na zastávke obídu. Po náraze NPC šofér chvíľu stojí. **Klávesou E sa dá nastúpiť
  aj do idúceho NPC auta.** Kreslené cez InstancedMesh (12 volaní kreslenia pre všetky autá).
- **Chodci** (`js/chodec/chodci/`, modul `chodci`): do 120 m okolo hráča ~1 človek na 15 m chodníka (pešie zóny hustejšie,
  námestia 1 na 110 m²), ďalej do 230 m štvrtina – najviac 450 ľudí. Chodia **len** po chodníkoch, pešich zónach,
  cestičkách v parkoch, schodoch a prechodoch – úseky pozdĺž vozovky a cez domy sa zo siete vyhodia, na námestiach
  sa kontroluje, že bod nie je na vozovke ani v dome. Držia sa vpravo, obchádzajú sa, občas zastanú, uhýbajú hráčovi
  a pomalému autu. **Rýchle auto chodca zrazí** (`zrazenie.js`): odletí s rýchlosťou auta, prevráti sa, dopadne,
  pošmykne sa, chvíľu leží, vstane a vráti sa na chodník; auto dostane malý náraz (udalosť `'naraz'` s `chodec: true`).
  Najbližších 8 = plný model s kostrou a mimikou, ostatní sa kreslia cez InstancedMesh s **animáciou zapečenou
  do textúry** (VAT: chôdza a státie sa pri načítaní raz prehrajú na zlúčených LOD sieťach NPC, ~2 s) – každý má vlastné
  oblečenie a pleť (textúra paliet). Stovky ľudí za ~36 volaní kreslenia. Pre ostatné moduly: `hra.chodci.zoznam`.
- **Hráč pešo:** chôdza, beh, skok, kolízie s budovami, stromami a autami.
- **Autá:** arkádová fyzika (plyn, brzda, cúvanie, drift ručnou brzdou), kolízie, nárazy medzi autami.
- **Poškodenie áut** (`js/auto/poskodenie.js`, `poskodenie-modul.js`): pri náraze sa karoséria v mieste nárazu
  preliačí (plech sa krčí nerovnomerne, najviac ~40 cm), pri silnom náraze sa rozbijú svetlá a praskne sklo,
  vyletia iskry, zvíri sa prach a auto sa otrasie; doráňané auto sa dymí z kapoty (čím horšie, tým tmavší dym).
- **Kamera** za postavou/autom: na PC sa pohľad ovláda myšou bez držania tlačidla (Pointer Lock, `js/vstup/mys.js`),
  pešo postava chodí v smere kamery, v aute sa myšou rozhliadneš a kamera sa vráti za auto; pri rýchlosti sa rozšíri zorné pole.
  Budovy a pamiatky sú pre kameru plné bloky (`js/kamera/kolizia-kamery.js`): kamera sa zastaví pred stenou
  a nikdy nevidí dovnútra ani cez budovu; nad nízkym domom (podľa výšky strechy) prejde.
- **Ovládanie** klávesnicou aj dotykom (joystick + tlačidlá).
- **HUD:** rýchlomer, nápoveda, krátke správy, názov miesta pri pamiatkach.
- **Minimapa** vľavo dole (`js/ui/minimapa/`): kreslí sa z dát dlaždíc (budovy, cesty, chodníky, námestia, zeleň,
  Dunaj, koľaje, zastávky MHD), otáča sa podľa kamery, v aute sa podľa rýchlosti oddiali; pod ňou názov ulice.
  **M** otvorí veľkú mapu so severom hore a názvami miest (koliesko myši = priblíženie); na mape je zameriavač,
  klik naň pošle miesto vo svete (udalosť `mapa-klik`).
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
- Všetky nočné PR z 22. 11. sú v `main` (zoznam hore); priebeh noci a „ďalšie na rade“ sú
  v [napady/noc-priebeh.md](napady/noc-priebeh.md), súhrn v issue #59.
- **Výkon** (#110): najdrahší je prechod tieňov (na vysokej v centre ~2,5 mil. trojuholníkov len do tieňovej mapy –
  stromy, vikiere, sochy, LOD2 strechy) a ~2 000 volaní kreslenia; stromy a drobnosti do tieňa len zblízka,
  zlučovanie sietí po dlaždiciach, menej kaskád tieňa na nižších predvoľbách.
- **Laser na celé mesto** (#109, `--vsetko`): dnes 96 dlaždíc so strechami LOD2, stromami a terénom 2 m.
- **Domy na svahu** (#111): po 1. kroku (prízemie bližšie k chodníku) ešte schodovité prízemie dlhých domov na svahu
  a dvere len tam, kde je terén do ~0,3 m od prahu.
- Kvalita (#58): plynulé prelínanie podrobnej a jednoduchej dlaždice (dnes sa vymení celá naraz, v opare), vzdialené
  stromy ako billboardy, na nízkej Lambert namiesto PBR a textúry v polovičnom rozlíšení; zmerať na integrovanej
  grafike a RTX 2060 cez `?meranie` a doladiť hodnoty predvolieb.
- Átriaky (#91): chodby a terasy všetkých domov podľa fotiek, viac izieb a blokov s interiérom.
- Presné pamiatky: ďalšie dávky (SND, Reduta a ďalšie podľa `tools/blender/presne/`).
- Pri ďalšom pregenerovaní dlaždíc (`tools/mesto/`) pribudne `typOsm` – triedenie budov bude presnejšie (dnes ~60 % budov
  má v OSM len `building=yes` a typ sa háda z pôdorysu).
- Cesty ako plochy podľa skutočného tvaru (námestia, pešie zóny, podchody, zastávky; OSM `area:highway` v Bratislave
  takmer chýba – zatiaľ len ostrovčeky), mosty z lasera, NPC autá po nadjazdoch.
- MHD: c) ľudia v MHD, d) jazda hráča (lístky a revízor neskôr), trolejové vedenie nad traťami.
- Chodci: prechádzanie cez cesty na priechodoch (autá im dajú prednosť), čakanie na zastávkach MHD.
- Mikromobilita (#97): elektrobicykel, NPC jazdci aj po chodníkoch a ďalej od hráča (lacnejší model), cena jazdy
  na kolobežke (peniaze), zvuk elektromotora a zvonček bicykla.
- Chôdza (#96): nové klipy chôdze a behu s dlhším krokom (behový klip má krok ~1 m, pri 6 m/s nohy mierne kĺžu),
  nohy na teréne aj pre najbližších chodcov, striedanie kľudových animácií, oblečenie podľa ročného obdobia
  a počasia, vystúpenie na schod najviac ~0,35 m.
- Svetlomety áut v noci, dážď a hmla ako počasie.
- Engine misií a dialógov, polícia (značky na minimapu už idú cez udalosť `znacka-mapy`).

## Kontrola mesta – testovacia trasa (issue #60)
Skript odfotí mesto z pevných bodov (Hlavné nám., Michalská brána, Obchodná, Hodžovo a Šafárikovo nám., Most SNP
z oboch strán, nábrežie pri Eurovei, Nivy, Hlavná stanica, Jungmannova, Romanova, Aupark, Trnavské mýto,
Karlova Ves, Mlynská dolina, výhľad z Kamzíka) – vždy z rovnakých uhlov (z ulice a šikmo zhora) a o 13:00 herného
času. Hru spustí v prehliadači bez okna, kreslí sa z plátna (bez HUD a minimapy), na každom bode počká, kým sú
postavené všetky detailné dlaždice okolia.
```
pip install playwright && python3 -m playwright install chromium      # raz
python3 tools/kontrola/trasa.py                                        # všetky body → docs/kontrola/<dátum>/
python3 tools/kontrola/trasa.py --len hlavne-namestie,nivy --nazov po-pr-123
python3 tools/kontrola/trasa.py --gpu                                  # s oknom a grafickou kartou (rýchlejšie)
```
Body a uhly sú v `tools/kontrola/body.json` (súradnice hry, azimut, vlastná kamera). Výsledok: `docs/kontrola/<beh>/index.html`
(galéria) a **porovnanie dvoch behov** vedľa seba: `http://localhost:8000/docs/kontrola/porovnanie.html?a=<beh>&b=<beh>`.
Softvérové kreslenie (bez `--gpu`) trvá ~5 minút na bod (s laserovými dátami v centre aj viac – `--limit 360`).
Kamera sa na bod presunie hneď po presune hráča, takže moduly podľa polohy kamery (dohľad a pamiatky za hmlou,
drobnosti zblízka, 3D fasády, tráva) sa pripravia na ten bod; snímky sú vždy v plnom rozlíšení predvoľby.
Prvý beh (stav `main` 21. 11. večer) je v `docs/kontrola/2026-11-22/`, beh po zlúčení nočných PR (6 bodov)
v `docs/kontrola/2026-11-22-po-zluceni/` – porovnanie: `porovnanie.html?a=2026-11-22&b=2026-11-22-po-zluceni`.

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
- `hra.na('mapa-klik', ({ x, z }) => …)` – hráč klikol na veľkú mapu (súradnice vo svete); mapa sa zavrie.

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
- **Cyklopruhy:** `data/mapa/cyklopruhy.json` – vyrába ho `cd tools/mesto && node cyklopruhy.mjs` (z OSM extraktu v `.cache`).
- **Výškopis a štart:** `data/mapa/zakladna.json` (kopce, svahy, štart hráča, ulice pre zaparkované autá).
- **Záložná ručná mapa** (keď OSM chýba): `zakladna.json` + `budovy.json` (`node tools/generuj-mapu.mjs`).
- **Údaje o obchodoch a type budov z OSM** do hotových dlaždíc: `cd tools/mesto && node --max-old-space-size=8000 osm-doplnky.mjs`.
- **Podchody z OSM** do hotových dlaždíc: `node --max-old-space-size=8000 podchody.mjs`.
- **Vyvýšené časti budov z OSM** (veže nad podnožou, lávky) do hotových dlaždíc: `node --max-old-space-size=8000 casti-budov.mjs`,
  potom overenie úzkych častí laserom: `python3 tools/mesto/laser/casti.py` (potrebuje laser v `.cache/laser/`)
  a priechody pod budovami: `node --max-old-space-size=8000 priechody-osm.mjs && python3 priechody.py`.
- **Laserové skenovanie:** [data/lidar/README.md](data/lidar/README.md) – terén, budovy, strechy a stromy
  (`python3 tools/mesto/laser/*.py`). Zdroj: letecké laserové skenovanie ÚGKK SR (DMR 6.0, DMP 2.0), **© ÚGKK SR, CC BY 4.0**.
- **Textúry** (omietka, škridla, štrk, dlažba): ambientCG, CC0 – zoznam v [assets/textury/LICENSE.md](assets/textury/LICENSE.md).
- Mapové dáta © prispievatelia OpenStreetMap, licencia ODbL.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
