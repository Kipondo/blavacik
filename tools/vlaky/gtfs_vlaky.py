# Cestovný poriadok vlakov cez Bratislava hl. st. z GTFS ŽSR → data/vlaky/poriadok.json (úloha A3).
#
#   python3 tools/vlaky/gtfs_vlaky.py                 – stiahne najnovší GTFS z Národného katalógu otvorených dát
#   python3 tools/vlaky/gtfs_vlaky.py cesta/gtfs.zip  – použije stiahnutý súbor
#
# Zdroj: ŽSR – „Grafikon vlakovej dopravy vo formáte GTFS“ (data.slovensko.sk, licencia CC0). Poriadok sa mení
# v decembri – po zmene stačí nástroj spustiť znova. Odkaz www.zsr.sk/files/…/gtfs.zip vedie len na stránku
# s odkazom do katalógu, preto sťahujeme priamo z katalógu.
#
# Do JSON idú len vlaky, ktoré v Bratislava hl. st. stoja, začínajú alebo končia: kategória, číslo, názov (presne
# podľa poriadku; názvy produktov dopravcov ako „railjet“ či „RegioJet“ vynechávame – sú to značky), východisková
# a cieľová stanica, príchod a odchod v minútach od polnoci dňa služby (môže byť > 1440), predchádzajúca
# a nasledujúca zastávka, strana stanice (západ = Lamač / tunel, východ = Vinohrady / Nové Mesto), typ súpravy
# pre hru (671 = dvojpodlažná jednotka, 361 = lokomotíva s vozňami, reg = regionálna jednotka) a deň služby
# ako bitová maska dní od začiatku platnosti.

import csv
import io
import json
import os
import re
import sys
import urllib.request
import zipfile
from datetime import date, timedelta

TU = os.path.dirname(os.path.abspath(__file__))
KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
VYSTUP = os.path.join(KOREN, 'data', 'vlaky', 'poriadok.json')
URL = 'https://data.slovensko.sk/download?id=556da5af-9e8a-4674-95f8-d0005299fe90'
STANICA = 'Bratislava hl.st.'
# susedné zastávky na západnej strane (tunel → Lamač, Železná studienka, Devínska Nová Ves, Záhorie, Morava)
ZAPAD_LON, ZAPAD_LAT = 17.095, 48.165
ZNACKY = re.compile(r'railjet|regiojet|leo ?express|nightjet', re.I)
DIALKOVE = {'Ex', 'IC', 'EC', 'EN', 'R', 'rj', 'rjx', 'RJ', 'LE', 'SC'}


def citaj(z, meno):
    with z.open(meno) as f:
        return list(csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig', newline='')))


def minuty(t):
    h, m, s = (int(x) for x in t.split(':'))
    return h * 60 + m + (1 if s >= 30 else 0)


def kod(d):
    return date(int(d[:4]), int(d[4:6]), int(d[6:]))


def main():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        obsah = open(sys.argv[1], 'rb').read()
    else:
        req = urllib.request.Request(URL, headers={'User-Agent': 'blavacik-poriadok/1.0'})
        obsah = urllib.request.urlopen(req, timeout=120).read()
    z = zipfile.ZipFile(io.BytesIO(obsah))
    info = citaj(z, 'feed_info.txt')[0]
    stops = {s['stop_id']: s for s in citaj(z, 'stops.txt')}
    routes = {r['route_id']: r for r in citaj(z, 'routes.txt')}
    trips = {t['trip_id']: t for t in citaj(z, 'trips.txt')}
    hl = {k for k, s in stops.items() if s['stop_name'] == STANICA}
    casy = {}
    for r in citaj(z, 'stop_times.txt'):
        casy.setdefault(r['trip_id'], []).append(r)

    # kalendár: bitová maska dní od začiatku platnosti
    od, do = kod(info['feed_start_date']), kod(info['feed_end_date'])
    dni = (do - od).days + 1
    kal = {}
    for c in citaj(z, 'calendar.txt'):
        tyz = [c[d] == '1' for d in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')]
        a, b = max(od, kod(c['start_date'])), min(do, kod(c['end_date']))
        bity = [False] * dni
        d = a
        while d <= b:
            if tyz[d.weekday()]:
                bity[(d - od).days] = True
            d += timedelta(days=1)
        kal[c['service_id']] = bity
    for c in citaj(z, 'calendar_dates.txt'):
        bity = kal.setdefault(c['service_id'], [False] * dni)
        i = (kod(c['date']) - od).days
        if 0 <= i < dni:
            bity[i] = c['exception_type'] == '1'

    def maska(bity):
        n = 0
        for i, b in enumerate(bity):
            if b:
                n |= 1 << i
        return format(n, 'x')

    def strana(stop_id):
        s = stops[stop_id]
        return 'zapad' if float(s['stop_lon']) < ZAPAD_LON and float(s['stop_lat']) > ZAPAD_LAT else 'vychod'

    def meno(stop_id):
        return stops[stop_id]['stop_name']

    vlaky, sluzby, idx_sluzby = [], [], {}
    for tid, rr in casy.items():
        rr.sort(key=lambda r: int(r['stop_sequence']))
        i = next((i for i, r in enumerate(rr) if r['stop_id'] in hl), None)
        if i is None:
            continue
        t = trips[tid]
        r = routes[t['route_id']]
        kat, _, cislo = r['route_short_name'].partition(' ')
        nazov = r['route_long_name'].strip()
        if ZNACKY.search(nazov) or nazov.lower() == cislo.lower():
            nazov = ''
        st = rr[i]
        pred = rr[i - 1]['stop_id'] if i > 0 else None
        nasl = rr[i + 1]['stop_id'] if i + 1 < len(rr) else None
        vsetky = [meno(x['stop_id']) for x in rr]
        if 'považ' in nazov.lower():
            typ = '671'
        elif any(m.startswith('Košice') for m in vsetky) or kat in DIALKOVE:
            typ = '361'
        else:
            typ = 'reg'
        sid = t['service_id']
        if sid not in idx_sluzby:
            idx_sluzby[sid] = len(sluzby)
            sluzby.append(maska(kal.get(sid, [])))
        v = {
            'kat': kat, 'cislo': cislo, 'nazov': nazov.title() if nazov.isupper() else nazov,
            'z': meno(rr[0]['stop_id']), 'do': t['trip_headsign'] or meno(rr[-1]['stop_id']),
            'pri': minuty(st['arrival_time']) if pred else None,
            'odch': minuty(st['departure_time']) if nasl else None,
            'zo': strana(pred) if pred else None,
            'na': strana(nasl) if nasl else None,
            'typ': typ, 's': idx_sluzby[sid],
        }
        if pred:
            v['pred'] = meno(pred)
        if nasl:
            v['nasl'] = meno(nasl)
        vlaky.append(v)
    vlaky.sort(key=lambda v: (v['pri'] if v['pri'] is not None else v['odch'], v['cislo']))

    data = {
        'popis': 'Vlaky cez Bratislava hl. st. (tools/vlaky/gtfs_vlaky.py). Časy v minútach od polnoci dňa služby; '
                 's = index služby, sluzby = bitové masky dní (hex, bit 0 = deň „od“).',
        'zdroj': 'ŽSR – Grafikon vlakovej dopravy vo formáte GTFS, data.slovensko.sk (CC0)',
        'verzia': info.get('feed_version', ''), 'od': info['feed_start_date'], 'do': info['feed_end_date'],
        'sluzby': sluzby,
        'vlaky': vlaky,
    }
    os.makedirs(os.path.dirname(VYSTUP), exist_ok=True)
    json.dump(data, open(VYSTUP, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('vlakov', len(vlaky), 'služieb', len(sluzby), 'veľkosť', os.path.getsize(VYSTUP), 'B')
    from collections import Counter
    print(Counter(v['typ'] for v in vlaky), Counter((v['zo'], v['na']) for v in vlaky))
    print(sorted({v['nazov'] for v in vlaky if v['nazov']}))


if __name__ == '__main__':
    main()
