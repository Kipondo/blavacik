# Generátor postavy Ďoďo
Spustenie: pozri hlavičku `postav.sh` (Python 3.13 + bpy, numpy, scipy, pillow; dáta z github.com/makehumancommunity/mpfb2, CC0).
- `telo.py` – parametre tela/tváre a morph targety editora (MakeHuman targety)
- `model.py` – geometria, kosti (game_engine rig), váhy, časti tela na skrývanie pod oblečením
- `koza.py`, `latky.py`, `textury.py` – procedurálne PBR textúry
- `odev.py`, `vlasy.py`, `doplnky.py` – oblečenie, vlasy, brada, retiazka, igelitka
- `animacie.py` – vlastné keyframe animácie
- `snimky.html` + `snimky.mjs` – snímky do PR (headless Chrome, `node snimky.mjs out.png "uhol=90&anim=chodza&cas=0.3"`)

## NPC postavy (chodci, davy)
Spustenie: `MPFB_DATA=/tmp/mpfb2/src/mpfb/data tools/postava/npc.sh [model …]` → `assets/postavy/npc/<model>.glb` (~2–3,5 MB, ~30 s na model).
- `data/postavy/npc.json` – **všetko je v dátach**: telá (`modely`: pohlavie, vek, svaly, váha, prsia, výška, extra targety MakeHumanu),
  `profily` (varianty oblečenia + účes, palety farieb, rozsahy tvaru tela, výška, rýchlosť, pravdepodobnosť opitosti),
  `latky` (neutrálne svetlé látky na prefarbenie), `morphy` (ktoré morph targety model dostane), `lod` (vzdialenosti, limity, počty trojuholníkov).
  Model obsahuje len oblečenie, účesy a brady, ktoré používajú jeho profily. Kusy oblečenia sú zo `satnik.json`.
- `npc.py` – generátor: telo z parametrov (`telo.nastav_zaklad`), šatník (`odev.vytvor_vsetko(objekty=…, latky=…, npc=True)`), LOD siete.
- `lod.py` – LOD1/LOD2: variant (telo bez skrytých častí + oblečenie + zjednodušené vlasy) zlúčený do jednej skinnutej siete,
  farby vo vrcholoch (r = svetlosť textúry, g = slot), redukcia na 3 500 / 700 trojuholníkov. Zoznam slotov je v extras uzla.
- `vlasy.py` – pre NPC navyše účesy mikádo, dlhé, drdol, venček (pásiky vlasov padajú dole a obtekajú hlavu a plecia).
- `telo_blender.py` – spoločná časť tela (koža, oči, zuby, kostra, váhy, morphy) pre Ďoďa aj NPC.
- `dav.html` – skúška a snímky: `?rezim=galeria&lod=0|1|2&anim=chodza&cas=0.3` (všetky profily vedľa seba)
  alebo `?rezim=dav&pocet=150&slucka=1` (dav s LOD, štatistika volaní a trojuholníkov).
