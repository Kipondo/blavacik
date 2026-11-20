# Ako pokračovať (stav projektu k 20. 11. 2026)

> **Nový chat / nový Claude: začni tu.** Prečítaj si `CLAUDE.md`, potom `napady/dizajn-hry.md`
> (celý dizajn hry) a tento súbor. Pozri otvorené pull requesty a issues na GitHube.

## Kto čo robí
- **Kipondo (vlastník, 20 € plán):** dizajn, príbeh, dialógy, misie, menšie moduly, testovanie, mergovanie PR.
- **Kamoš (100 € plán):** ťažký kód – mapa, model mesta, postava, engine, polícia.
- Úlohy pre kamoša sa zadávajú cez **GitHub issues** (plánované štítky `pre-kamosa` / `pre-mna`).

## Stav na GitHube
| Čo | Kde | Stav |
|---|---|---|
| Formát misií a dialógov | PR #1 | otvorený (kamoš) |
| Základ hry (jadro, mapa, hráč, autá, kamera) | PR #2 | otvorený (kamoš) |
| Dizajn hry + tento súbor | PR #3, vetva `feature/dizajn-pribeh` | otvorený – **zmergovať** |
| Terén a polohopis z OSM | PR #4 | otvorený (kamoš) |
| Dialógy úvodnej scény vo vlaku | PR #5, vetva `feature/dialogy-vlak` | otvorený – **zmergovať** |
| Pamiatky (hrad, Most SNP s UFO…) | PR #6 | otvorený (kamoš) |
| Zadanie: model celej Bratislavy | issue #8 | pre kamoša |
| Zadanie: realistická 3D postava Ďoďa | issue #10 | pre kamoša (alebo Kipondo v novom chate) |

Hrateľná verzia: GitHub Pages (Settings → Pages → vetva `feature/pamiatky`, neskôr `main`)
→ https://kipondo.github.io/blavacik/

## Hlavné rozhodnutia (podrobne v `dizajn-hry.md`)
- Hrdina **Jozef „Ďoďo“ Hudák** z Košíc, prvák na vysokej v Bratislave; východniarčina → „pobratislavčenie“.
- Úvod: interaktívny **vlak Košice → Bratislava** (meškanie 120 min, babka, ujo, baba, Fero, revízor).
- **7 škôl** (výber + editor postavy pred vlakom), internát **Átriaky** v Mlynskej doline.
- Open world v štýle mestských akčných hier: študentský život, brigády, MHD → kolobežky → auto, polícia,
  „pochybné kšefty“ podľa voľby hráča. Finále: práca a voľba **Košice vs. Bratislava**, potom voľná hra.
- **Celá Bratislava** z OSM, realistické budovy a textúry (CC0), **hra len pre PC**, bez Google 3D Tiles.
- Politika len cez vymyslené typy a situácie, žiadne skutočné osoby ani značky.

## Čo ďalej (návrh)
1. **Zmergovať PR #3 a #5** (a PR kamoša po vyskúšaní).
2. **Systém úloh:** štítky `pre-kamosa` / `pre-mna` + pravidlo v `CLAUDE.md`.
3. **MHD Bratislavy** podľa skutočných cestovných poriadkov (vetva `feature/mhd`, len `data/mhd/`,
   `js/mhd/`, `tools/mhd/` – mapu nemeniť): linky, zastávky, vozidlá podľa poriadku, ľudia v MHD,
   jazda hráča; po etapách s PR.
4. **Podrobný scenár príbehu** kapitolu po kapitole (`napady/pribeh/kapitola-0X.md`) → z neho misie a dialógy.
5. Otvorené otázky: sekcia 13 v `dizajn-hry.md`.

## Úvodná veta do nového chatu
> Pracujeme na hre Blava City v repozitári Kipondo/blavacik. Prečítaj si CLAUDE.md,
> napady/POKRACOVANIE.md a napady/dizajn-hry.md (vetva feature/dizajn-pribeh, ak ešte nie je
> zmergovaná do main) a pozri otvorené PR a issues. Pokračujeme.
