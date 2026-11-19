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
| **Pochybné kšefty** | krádeže spolubývajúcim, predaj „pochybného tovaru“ | rýchle peniaze | polícia, zatknutie, vyhodenie, mama sa dozvie |

Rozhodnutia majú **následky**: povesť na intráku, hviezdičky polície, dôvera mamy, ponuky brigád.

## 6. Ukazovatele (HUD)
- **Peniaze** · **Spánok** (energia) · **Život** · **Inventár** · **Minimapa**
- **Socializácia** (koľko ľudí ho pozná/má rado) · **Atraktivita**
- **Prospech** (ako sa učí → ako zvláda skúšky)
- **Bratislavskosť** (vývoj reči)
- **Hviezdičky polície** (keď robí bordel)
- **Hlad sa nerieši** (rozhodnuté – bez ukazovateľa hladu).

## 7. Čas
- Deň/noc, týždne, semestre, skúškové obdobie.
- Rozvrh: prednášky v určitom čase; vynechanie znižuje prospech.
- Noc: večierky, vrátnička po 22:00 nepustí (→ okno, kamarát, úplatok koláčom).

## 8. Škola a skúšky
- **Skúšku musí spraviť.** Neúspech nie je koniec hry: riadny termín → 1. opravný → 2. opravný
  → zvláštna misia „prosba na dekanáte“ (posledná šanca). Medzi tým volá mama.
- Skúška = mini-hra (otázky z JSON podľa fakulty; vyšší prospech = viac času/nápovedy).
- **Výber školy (rozhodnuté):** na začiatku hráč volí z 3 škôl:
  1. **Stavebná fakulta STU** (Radlinského ulica),
  2. **Filozofická fakulta UK** (Gondova ulica na nábreží – priamo v pôvodnej mape),
  3. **Ekonomická univerzita** (Dolnozemská cesta v Petržalke – cesta do školy cez most).
  Tretia voľba je návrh, dá sa vymeniť.
- **Hráč musí reálne prísť (pešo, MHD, vozidlom) k budove svojej školy** na mape.
- **Vnútro školy je jedna spoločná šablóna** (vstupná hala, chodby, učebne, posluchárne,
  študijné oddelenie, bufet) – rovnaká pre všetky školy, aby to nebolo náročné na modelovanie.
  Líši sa len **učivo** (predmety, otázky na skúškach, typy spolužiakov a učiteľov) – všetko v JSON
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
- ❓ Košice na záver príbehu – stačí menšia mapa (napr. Hlavná ulica a okolie), alebo len scény.
- ❓ Mapa sa zväčší – riešiť výkon (načítavanie po častiach).

## 13. Otvorené otázky (❓ súhrn)
Rozhodnuté: 3 školy so spoločným interiérom · internát Átriaky · bez hladu ·
finále = práca + Košice vs. Bratislava, potom voľná hra.

1. Je tretia škola (Ekonomická univerzita) v poriadku?
2. Košice v závere – malá mapa, alebo len scény?
5. Ako ďaleko ísť s cestou „pochybných kšeftov“ (štýlom karikatúry, s následkami)?
6. Návšteva Košíc ako bonusová misia (vlak späť domov)?

## 14. Návrh poradia práce
1. Základ hry (chodenie, auto, mapa) – rozpracované vo `feature/zaklad-hry`.
2. Formát misií a dialógov s variantmi reči (`vychod`/`mix`/`blava`).
3. HUD s ukazovateľmi + čas (deň/noc, kalendár).
4. Úvodná scéna vo vlaku (samostatný „level“).
5. Hlavná stanica → MHD → Átriaky (kapitola 1), interiér internátu.
6. Budovy 3 škôl + spoločný interiér školy.
7. Brigády (najprv kuriér, lebo využíva jazdu).
8. Skúšky (mini-hra + opravné termíny).
9. Polícia, revízor, zatknutie.
10. Ďalšie vozidlá a auto.
