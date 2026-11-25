"""Strážca veľkosti repozitára (#137): žiadny súbor v gite nad 25 MB a prehľad, čo zaberá najviac miesta.

GitHub odporúča repozitár do 1 GB a súbor nad 50 MB odmietne s varovaním, nad 100 MB vôbec. Veľké modely,
textúry a interiéry patria na úložisko mimo gitu (plán: napady/velke-subory-r2.md).

Použitie (z koreňa repozitára):
  python tools/kontrola/velke-subory.py            # skontroluje súbory v gite, pri súbore nad limit skončí chybou
  python tools/kontrola/velke-subory.py --prehlad  # navyše priečinky a najväčšie súbory
Beží v GitHub Actions pri každom PR (.github/workflows/regresie.yml).
"""
import os
import subprocess
import sys
from collections import Counter

LIMIT_MB = 25


def subory_v_gite():
    vystup = subprocess.run(['git', 'ls-files', '-z'], capture_output=True, check=True).stdout
    for cesta in vystup.decode('utf-8').split('\0'):
        if cesta and os.path.isfile(cesta):
            yield cesta, os.path.getsize(cesta)


def main():
    subory = list(subory_v_gite())
    velke = [(c, s) for c, s in subory if s > LIMIT_MB * 1024 * 1024]
    spolu = sum(s for _, s in subory)
    print(f'súborov v gite: {len(subory)}, spolu {spolu / 1048576:.1f} MB (limit súboru {LIMIT_MB} MB)')
    if '--prehlad' in sys.argv:
        priecinky = Counter()
        for c, s in subory:
            casti = c.split('/')
            priecinky['/'.join(casti[:2]) if len(casti) > 2 else casti[0]] += s
        print('najväčšie priečinky:')
        for p, s in priecinky.most_common(12):
            print(f'  {s / 1048576:8.1f} MB  {p}')
        print('najväčšie súbory:')
        for c, s in sorted(subory, key=lambda x: -x[1])[:12]:
            print(f'  {s / 1048576:8.1f} MB  {c}')
    for c, s in velke:
        print(f'CHYBA: {c} má {s / 1048576:.1f} MB (viac ako {LIMIT_MB} MB) – patrí na úložisko mimo gitu (#137)')
    sys.exit(1 if velke else 0)


if __name__ == '__main__':
    main()
