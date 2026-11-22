# Átriaky – prieskum budov a izby (issue #115)

Prieskum z verejných zdrojov a fotiek (len na porovnanie, do hry sa nič nekopíruje), 22. 11. 2026.
Istota: **[V]** vysoká (oficiálny zdroj, OSM), **[S]** stredná (viac neoficiálnych zdrojov, jasne na fotkách), **[N]** odhad.

## Areál
- Átriové domky, VM Ľ. Štúra – Mlyny UK, arch. Vladimír Dedeček, dokončené ~1975–1977 [S].
- 18 domov (A–T bez I a Q), každý ~27 × 27 m, **4 podlažia, 4. ustúpené** s terasou okolo [V].
  V OSM je navyše AD-I (pravdepodobne nízky pavilón v átriu) a AD-U (jedáleň) [N].
- Domy sú pootočené (osi ~74° a 344°), v 10 radoch so šachovnicovým posunom ~16 m; v „reťaziach“ sú spojené
  ~11 m spoločnej hrany, medzi reťazami **rohové spojky** ~5,6 × 2,7 m (lávky), pod nimi priechod [V].
- Átriá sú **medzi domami** (voľné „políčka šachovnice“ ~22 × 22 m), nie uprostred domu; v strede podlažia je jadro [S].
- Terén klesá od bloku B k T o ~15–23 m, svah vyrovnávajú oporné múriky a schody [S].
- Svetlá výška 2,70 m (výkaz výmer jadra bloku C) [V], konštrukčná výška ~3,0–3,4 m [N].

## Fasády (čo je typické)
- Na každom podlaží **obvodová pavlač** (vonkajší ochoz): parapety z **prefabrikovaných panelov vymývaného betónu**
  (béžovosivé, škáry ~1,2 m), navrchu rúrkové madlo [S/V].
- Za pavlačou biela/svetlosivá omietka s **pásovými oknami s tmavými rámami**; izby majú okno + presklené dvere na pavlač [V].
- **Červenooranžové čelá a spodky dosiek** pavlačí – najvýraznejší znak Átriakov [V].
- 4. podlažie: takmer celé presklené, strecha nad ním s presahom a **mozaikovým čelom** [S].
- Plochá strecha, svetlá betónová atika so zábradlím (staré hrdzavohnedé / nové biele), na streche výstup schodiska
  (~2,5 m kocka) a vetracie boxy [S].
- Zábradlia: pôvodné betónové panely s bielou rúrkou; po sanácii 2020–2023 časť nových bielych oceľových [V/S].
- Paleta (odhad z fotiek): betón #B9B5AC, omietka #E9E9E6, akcent #C0472B, rámy #2B2B2B, strecha #8E8E8A [N].

## Podlažie a izba
- Typické podlažie (oficiálny schematický pôdorys): **dve rovnobežné chodby**, po vonkajších stranách 2 × 8
  trojlôžkových izieb s oknom a dverami na pavlač; v jadre jednolôžkové izby, 2 sociálne bloky, kuchynka,
  upratovačka, dvojramenné schodisko [V].
- Izby 1-, 2-, 3-lôžkové **s umývadlom, bez bunkového systému**; sprchy, WC a kuchynka spoločné na poschodí [V].
- **Trojlôžková izba** ~2,8–3,1 × 5,8–6,6 m (16–20 m²) [N]; dve postele za sebou pri jednej stene, pri druhej
  posteľ a stolíky; pri dverách skriňa a umývadlo, na konci okno a dvere na pavlač [S].
- Vybavenie (oficiálne): vešiaková skriňa s policami, pre každého polička, posteľ, písací stolík a stolička;
  umývadlo so zrkadlom a poličkou, chladnička spoločné [V].
- Nezrekonštruované bloky (aj **T**): váľandy s hnedým/oranžovým čalúnením, dyhový nábytok, drevený obklad za
  posteľou, nástenné police, biela chladnička, rebrový radiátor pod oknom, oranžové závesy, hnedé dvere,
  béžové linoleum alebo koberec [S].
- Chodba ~1,6–1,8 m, svetlo cez dvere na pavlač na konci [N/S]. Kuchynka: dvojplatnička, nerezový drez [V/S].
- Intrákový neporiadok (doložený len čiastočne): plné chladničky, neustlané postele, zvyšky jedla, holuby
  na balkónoch, ošúchané linoleum [S].

## Ako je to v hre
- `tools/blender/atriaky/bloky.py` – domy s pavlačami podľa bodov vyššie (všetky plochy uzavreté, žiadne prekrývanie
  v jednej rovine – bez dier a blikania).
- `tools/blender/atriaky/izba.py` – izba 314 (3,2 × 6 m, 3 váľandy, stolíky, skriňa, umývadlo, chladnička,
  radiátor, závesy, sušiak, krabica od pizze, fľaše, Ďoďova taška) a chodba s dverami susedných izieb a jadra.
  Izba je **v meste** v ustúpenom podlaží bloku T, chodí sa do nej ako všade inde.

## Zdroje
- https://mlyny.uniba.sk/o-internatoch/atriove-domky/ · https://mlyny.uniba.sk/uploads/pics/AD_floor_01.PNG
- https://mlyny.uniba.sk/o-internatoch/galeria/ · cenník 2023/24 (mlyny.uniba.sk) · plán modernizácií (mlyny.uniba.sk)
- https://uniba.sk/detail-aktuality/back_to_page/spravodajsky-portal/article/dedicstvo-vladimira-dedecka/
- sk.wikipedia.org – Vysokoškolské mesto Ľudovíta Štúra – Mlyny; Internáty Mlynská dolina
- teraz.sk (Ulicami Bratislavy – internáty), archiweb.cz (Vladimír Dedeček)
- crz.gov.sk – výkaz výmer opravy jadra bloku C (2018), oprava oporných múrikov
- OpenStreetMap – relácia 13678034 a bloky AD-A … AD-T (© prispievatelia OpenStreetMap, ODbL)
- Wikimedia Commons – Staré grunty, Bratislava (fotky z roku 2018), startitup.sk, modrykonik.sk

## Čo sa nezistilo
Presné rozmery izieb a chodieb, výšky podlaží a domov (v OSM chýba `height`), nosný systém, rozmery okien a kódy farieb,
výškové napojenie susedných domov na svahu, funkcia nízkych pavilónov v átriách, fotky chodieb a schodiska.
