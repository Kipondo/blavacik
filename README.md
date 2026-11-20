# Blava City

Zábavná 3D hra v prehliadači, odohráva sa v Bratislave. Len pre srandu.

## Ako hru spustiť
- Online: GitHub Pages (odkaz doplníme po zapnutí Pages).
- Lokálne: v priečinku projektu spusti `python3 -m http.server 8000` a otvor `http://localhost:8000`.

## Čo je hotové
- Pravidlá projektu (`CLAUDE.md`).
- Formát misií a dialógov: [data/misie/FORMAT.md](data/misie/FORMAT.md)
  - príklad misie `data/misie/halusky-pre-stryka.json`
  - príklady dialógov v `data/dialogy/`
  - pomenované miesta pre misie v `data/mapa/miesta.json`

## Čo ďalej
- Základ hry (vetva `feature/zaklad-hry`): mapa, chodenie, autá, kamera, ovládanie, menu.
- Terén a presný polohopis, pamiatky, doprava a značky (samostatné vetvy).
- Engine misií a dialógov, polícia, minimapa.

## Ako pridať misiu
Postup je v [data/misie/FORMAT.md](data/misie/FORMAT.md) – stačí pridať JSON súbory, kód netreba.

Pravidlá spolupráce sú v [CLAUDE.md](CLAUDE.md).
