# Generátor postavy Ďoďo
Spustenie: pozri hlavičku `postav.sh` (Python 3.13 + bpy, numpy, scipy, pillow; dáta z github.com/makehumancommunity/mpfb2, CC0).
- `telo.py` – parametre tela/tváre a morph targety editora (MakeHuman targety)
- `model.py` – geometria, kosti (game_engine rig), váhy, časti tela na skrývanie pod oblečením
- `koza.py`, `latky.py`, `textury.py` – procedurálne PBR textúry
- `odev.py`, `vlasy.py`, `doplnky.py` – oblečenie, vlasy, brada, retiazka, igelitka
- `animacie.py` – vlastné keyframe animácie
- `snimky.html` + `snimky.mjs` – snímky do PR (headless Chrome, `node snimky.mjs out.png "uhol=90&anim=chodza&cas=0.3"`)
