# Kontrolór mapy celého mesta (#134) – nájde chyby mapy v celej Bratislave naraz (stromy na mostoch a vo vode,
# objekty na cestách a v budovách, cesty cez budovy a cez seba, strmé úseky, zlomy pásu, budovy v Dunaji, švy terénu).
#
#   python3 tools/kontrola/kontrola-mapy.py                  – všetky kategórie, výstup do .cache/kontrola-mapy/
#   python3 tools/kontrola/kontrola-mapy.py --len cesta-strma,strom-na-moste
#   python3 tools/kontrola/kontrola-mapy.py --uloz-zaklad    – súčasné počty zapíše ako základ (po oprave chýb)
#
# Výstup: .cache/kontrola-mapy/chyby.json (zoznam s polohou x, z) a .cache/kontrola-mapy/index.html (mapa mesta
# s bodkami podľa kategórie – otvor v prehliadači). Počty sa porovnajú so základom tools/kontrola/mapa-zaklad.json:
# **viac chýb než v základe = návratový kód 1** (v GitHub Actions PR neprejde, .github/workflows/regresie.yml).
# Keď chyby opravíš a počet klesne, zníž základ (--uloz-zaklad) v tom istom PR.
# Kategórie: tools/kontrola/mapa/kontroly-mapy.js. Potrebuje Playwright (ako tools/kontrola/regresie.py).

import argparse
import asyncio
import functools
import json
import os
import sys
import threading

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TU)
from regresie import Server, Obsluha, spusti, KOREN  # noqa: E402

ZAKLAD = os.path.join(TU, 'mapa-zaklad.json')
VYSTUP = os.path.join(KOREN, '.cache', 'kontrola-mapy')
FARBY = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#17becf', '#8c564b', '#e377c2', '#bcbd22', '#7f7f7f', '#000000', '#ff1493', '#00a86b']

HTML = r"""<!doctype html>
<html lang="sk"><head><meta charset="utf-8"><title>Kontrolór mapy – chyby</title>
<style>
 body { margin: 0; font: 13px system-ui, sans-serif; display: flex; height: 100vh; }
 #panel { width: 340px; overflow: auto; padding: 10px; border-right: 1px solid #ccc; }
 #mapa { flex: 1; position: relative; } canvas { width: 100%; height: 100%; display: block; cursor: grab; }
 label { display: block; margin: 3px 0; } .bod { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
 #info { position: absolute; left: 8px; bottom: 8px; background: #fffd; padding: 4px 8px; border-radius: 4px; }
</style></head><body>
<div id="panel"><h3>Chyby mapy</h3><p id="sucet"></p><div id="kat"></div>
<p><small>Koliesko = priblíženie, ťahanie = posun. Klik na bodku vypíše polohu (súradnice hry x, z a dlaždicu).</small></p></div>
<div id="mapa"><canvas id="c"></canvas><div id="info"></div></div>
<script>
const D = __DATA__;
const c = document.getElementById('c'), g = c.getContext('2d'), info = document.getElementById('info');
const zapnute = new Set(D.kategorie.map((k) => k.id));
let s = 0.035, ox = 0, oz = 0;
function velkost() { c.width = c.clientWidth * devicePixelRatio; c.height = c.clientHeight * devicePixelRatio; kresli(); }
const X = (x) => c.width / 2 + (x - ox) * s * devicePixelRatio, Z = (z) => c.height / 2 + (z - oz) * s * devicePixelRatio;
function poly(b) { g.beginPath(); b.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); }
function kresli() {
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, c.width, c.height);
  if (D.hranica?.length) { poly(D.hranica); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#999'; g.stroke(); }
  g.fillStyle = '#a9cbe8'; for (const v of D.voda) { poly(v); g.fill(); }
  for (const k of D.kategorie) {
    if (!zapnute.has(k.id)) continue;
    g.fillStyle = k.farba;
    for (const b of k.body) { g.beginPath(); g.arc(X(b[0]), Z(b[1]), 3 * devicePixelRatio, 0, 7); g.fill(); }
  }
}
const kat = document.getElementById('kat');
document.getElementById('sucet').textContent = `Spolu ${D.kategorie.reduce((a, k) => a + k.pocet, 0)} miest (${D.kedy}).`;
for (const k of D.kategorie) {
  const l = document.createElement('label');
  l.innerHTML = `<input type="checkbox" checked> <span class="bod" style="background:${k.farba}"></span><b>${k.pocet}</b> ${k.id}<br><small>${k.popis}</small>`;
  l.querySelector('input').onchange = (e) => { e.target.checked ? zapnute.add(k.id) : zapnute.delete(k.id); kresli(); };
  kat.appendChild(l);
}
c.onwheel = (e) => { e.preventDefault(); s *= e.deltaY < 0 ? 1.25 : 0.8; kresli(); };
let tah = null;
c.onmousedown = (e) => { tah = { x: e.clientX, z: e.clientY, ox, oz, pohyb: false }; };
onmousemove = (e) => { if (!tah) return; ox = tah.ox - (e.clientX - tah.x) / s; oz = tah.oz - (e.clientY - tah.z) / s; tah.pohyb = true; kresli(); };
onmouseup = (e) => {
  if (tah && !tah.pohyb) {
    const r = c.getBoundingClientRect(), x = ox + (e.clientX - r.left - r.width / 2) / s, z = oz + (e.clientY - r.top - r.height / 2) / s;
    let naj = null, nd = 12 / s;
    for (const k of D.kategorie) if (zapnute.has(k.id)) for (const b of k.body) { const d = Math.hypot(b[0] - x, b[1] - z); if (d < nd) { nd = d; naj = [k, b]; } }
    info.textContent = naj ? `${naj[0].id}: ${naj[1][3]} – x ${naj[1][0]}, z ${naj[1][1]}, dlaždica ${naj[1][2]}` : `x ${x.toFixed(0)}, z ${z.toFixed(0)}`;
  }
  tah = null;
};
onresize = velkost; velkost();
</script></body></html>
"""


def zapis_mapu(vysledok, index, kedy):
    os.makedirs(VYSTUP, exist_ok=True)
    kategorie = []
    for i, v in enumerate(vysledok):
        body = [[b.get('x', 0), b.get('z', 0), b.get('dlazdica', ''), b.get('text', '')] for b in v.get('body', [])]
        kategorie.append({'id': v['id'], 'popis': v.get('popis', ''), 'pocet': v.get('pocet', 0), 'farba': FARBY[i % len(FARBY)], 'body': body})
    data = {'kedy': kedy, 'hranica': index.get('hranica', []), 'voda': [w['body'] for w in index.get('voda', [])], 'kategorie': kategorie}
    with open(os.path.join(VYSTUP, 'chyby.json'), 'w', encoding='utf-8') as f:
        json.dump(kategorie, f, ensure_ascii=False)
    with open(os.path.join(VYSTUP, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(HTML.replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':'))))


def main():
    ap = argparse.ArgumentParser(description='Kontrolór mapy celého mesta')
    ap.add_argument('--len', default='', help='len vybrané kategórie (id oddelené čiarkou)')
    ap.add_argument('--uloz-zaklad', action='store_true', help='súčasné počty zapísať ako základ')
    ap.add_argument('--limit', type=int, default=1800, help='časový limit v sekundách')
    a = ap.parse_args()

    srv = Server(('127.0.0.1', 0), functools.partial(Obsluha, directory=KOREN))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/tools/kontrola/kontrola-mapy.html' + (f'?len={a.len}' if a.len else '')
    vysledok = asyncio.run(spusti(url, a.limit))
    srv.shutdown()

    chyby_behu = [v for v in vysledok if v['id'] in ('beh', 'chyby-stranky')]
    vysledok = [v for v in vysledok if v['id'] not in ('beh', 'chyby-stranky')]
    index = json.load(open(os.path.join(KOREN, 'data', 'mapa', 'mesto', 'index.json'), encoding='utf-8'))
    from datetime import datetime
    zapis_mapu(vysledok, index, datetime.now().strftime('%d. %m. %Y %H:%M'))

    zaklad = json.load(open(ZAKLAD, encoding='utf-8')) if os.path.exists(ZAKLAD) else {}
    horsie = []
    print(f"{'kategória':<22} {'teraz':>7} {'základ':>7}")
    for v in vysledok:
        z = zaklad.get(v['id'])
        znak = ''
        if z is not None and v['pocet'] > z:
            znak = '  ← VIAC CHÝB'
            horsie.append(v)
        elif z is not None and v['pocet'] < z:
            znak = '  (menej – zníž základ: --uloz-zaklad)'
        print(f"{v['id']:<22} {v['pocet']:>7} {'' if z is None else z:>7}  ({v.get('sekundy', '-')} s){znak}")
        if znak.startswith('  ←'):
            for b in v.get('body', [])[:5]:
                print(f"      - {b.get('text')} [{b.get('dlazdica', '')}] x={b.get('x')} z={b.get('z')}")
    for v in chyby_behu:
        print('CHYBA BEHU:', v.get('body') or v.get('priklady'))
    print(f"Mapa: {os.path.join(VYSTUP, 'index.html')}")
    if a.uloz_zaklad:
        novy = dict(zaklad)
        novy.update({v['id']: v['pocet'] for v in vysledok})
        with open(ZAKLAD, 'w', encoding='utf-8') as f:
            json.dump(novy, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print(f'Základ uložený: {ZAKLAD}')
        sys.exit(1 if chyby_behu else 0)
    if horsie or chyby_behu:
        print(f'Pribudli chyby v {len(horsie)} kategóriách – oprav ich alebo v PR vysvetli a zvýš základ (--uloz-zaklad).')
        sys.exit(1)
    print('Žiadne nové chyby oproti základu.')


if __name__ == '__main__':
    main()
