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
6. **Ďalšie semestre** – dlhšie hranie, príbeh sa mení podľa rozhodnutí; ❓ finále (štátnice?).

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
- ❓ **Hlad** – mamine rezne a menza by mali zmysel; zvážiť.

## 7. Čas
- Deň/noc, týždne, semestre, skúškové obdobie.
- Rozvrh: prednášky v určitom čase; vynechanie znižuje prospech.
- Noc: večierky, vrátnička po 22:00 nepustí (→ okno, kamarát, úplatok koláčom).

## 8. Škola a skúšky
- **Skúšku musí spraviť.** Neúspech nie je koniec hry: riadny termín → 1. opravný → 2. opravný
  → zvláštna misia „prosba na dekanáte“ (posledná šanca). Medzi tým volá mama.
- Skúška = mini-hra (otázky z JSON podľa fakulty; vyšší prospech = viac času/nápovedy).
- **❓ Výber školy:** odporúčanie – na začiatku výber z 3 fakúlt (napr. technika, ekonomika,
  filozofia), ktorý mení len predmety, otázky na skúškach a typy spolužiakov (všetko dáta).
  Hru to nezahltí a pridá znovuhrateľnosť.

## 9. Internát
- **❓ Výber internátu:** odporúčanie – zatiaľ **jeden** internát inšpirovaný Mlynmi v Mlynskej
  doline (najznámejší bratislavský intrák, 6000+ študentov, každý ho pozná). Výber viacerých
  internátov až neskôr, ak bude chuť.
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
- **Nové pre príbeh:** **Hlavná stanica** (príchod), **Mlynská dolina / internát** (domov),
  **fakulta(y)**, menza, zastávky MHD a trasy električiek/autobusov.
- ❓ Mapa sa zväčší – riešiť výkon (načítavanie po častiach).

## 13. Otvorené otázky (❓ súhrn)
1. Výber školy na začiatku – áno (3 fakulty, len dáta), alebo jedna pevná?
2. Jeden internát, alebo výber?
3. Ukazovateľ hladu – áno/nie?
4. Finále príbehu – štátnice, koniec 1. ročníka, alebo nekonečno?
5. Ako ďaleko ísť s cestou „pochybných kšeftov“ (štýlom karikatúry, s následkami)?
6. Návšteva Košíc ako bonusová misia (vlak späť domov)?

## 14. Návrh poradia práce
1. Základ hry (chodenie, auto, mapa) – rozpracované vo `feature/zaklad-hry`.
2. Formát misií a dialógov s variantmi reči (`vychod`/`mix`/`blava`).
3. HUD s ukazovateľmi + čas (deň/noc, kalendár).
4. Úvodná scéna vo vlaku (samostatný „level“).
5. Hlavná stanica → MHD → internát (kapitola 1).
6. Brigády (najprv kuriér, lebo využíva jazdu).
7. Skúšky (mini-hra + opravné termíny).
8. Polícia, revízor, zatknutie.
9. Ďalšie vozidlá a auto.
