#!/usr/bin/env python3
"""Testovacia trasa mesta (issue #60): hra sa spustí v prehliadači bez okna, hráč sa postupne presunie na pevné
body (tools/kontrola/body.json), počká sa na dlaždice mesta a z rovnakých uhlov a v rovnakom čase dňa sa odfotí
pohľad z ulice a zhora. Výstup: docs/kontrola/<názov>/ (JPEG + index.html) a porovnanie dvoch behov
v docs/kontrola/porovnanie.html.

Použitie (z koreňa repozitára):
    pip install playwright && python3 -m playwright install chromium     # raz
    python3 tools/kontrola/trasa.py                                       # všetky body → docs/kontrola/<dnešný dátum>/
    python3 tools/kontrola/trasa.py --len hlavne-namestie,nivy --nazov pred-pr-123
    python3 tools/kontrola/trasa.py --gpu                                 # s oknom a grafickou kartou (rýchlejšie)

Bez --gpu kreslí softvérovo (SwiftShader) – jeden bod trvá ~1 minútu, ale beží aj na serveri.
Nástroj je mimo hry (hra nemá žiadne závislosti); Playwright je len pomôcka na testovanie.
"""

import argparse
import asyncio
import base64
import datetime
import functools
import http.server
import json
import subprocess
import threading
from pathlib import Path

KOREN = Path(__file__).resolve().parents[2]
VYSTUP = KOREN / 'docs' / 'kontrola'

# JavaScript v stránke: presun hráča, čakanie na dlaždice, pevná kamera a snímka z plátna
JS_POMOCNIK = r"""
window.__kontrola = {
  zmrazKameru() {
    // kameru nastavuje nástroj, nie modul kamery (ten by ju každý snímok vrátil za hráča)
    const k = hra.moduly.find((m) => m.nazov === 'kamera');
    if (k && !k.__zmrazena) { k.__zmrazena = true; k.update = () => {}; k.updateVzdy = () => {}; }
  },
  plneRozlisenie() {
    // automatické rozlíšenie (#61, #99) pri softvérovom kreslení zníži rozlíšenie plátna – snímky rôznych
    // behov by mali rôznu veľkosť; na snímku plné rozlíšenie predvoľby (čakanie na dlaždice beží pri nižšom)
    const r = hra.moduly.find((m) => m.nazov === 'rozlisenie');
    if (!r) return;
    r.podiel = 1; r._nastav?.(hra);
  },
  nastavCas(hodina) {
    if (hodina === null || !hra.hodiny?.nastav) return;
    const d = new Date(hra.stav.datumCas ?? Date.now());
    d.setHours(Math.floor(hodina), Math.round((hodina % 1) * 60), 0, 0);
    hra.hodiny.nastav(d);
  },
  /** Pevná kamera na bode (y nad terénom). Moduly podľa polohy kamery (dohľad a pamiatky za hmlou #99,
   *  drobnosti zblízka, 3D fasády, tráva, stromy) sa tak počas čakania pripravia na tento bod,
   *  nie na pohľad z predošlého bodu (inak napr. chýbali Átriaky a lávky viseli vo vzduchu). */
  kamera(kamera, ciel) {
    this.zmrazKameru();
    const T = hra.THREE, k = hra.kamera;
    const v = (x, z) => hra.mapa.vyska(x, z);
    k.position.set(kamera[0], v(kamera[0], kamera[2]) + kamera[1], kamera[2]);
    k.lookAt(new T.Vector3(ciel[0], v(ciel[0], ciel[2]) + ciel[1], ciel[2]));
    k.updateMatrixWorld();
    hra.scena.getObjectByName('obloha')?.position.copy(k.position);
    const d = hra.moduly.find((m) => m.nazov === 'dohlad');
    if (d) { d.cas = 0; d.updateVzdy?.(0, hra); }   // viditeľnosť podľa novej polohy kamery hneď
  },
  async presun(x, z, limitMs, hodina, kamera, ciel) {
    this.nastavCas(hodina);   // svetlo a nálada sa prepočítajú počas čakania
    const h = hra.hrac;
    if (hra.stav.auto) hra.hrac.vystup?.();
    const y = hra.mapa.vyska(x, z);
    h.pozicia.set(x, y, z); h.vx = 0; h.vz = 0; h.vy = 0; h.rychlost = 0;
    hra.posli('teleport', { x, y, z });
    if (kamera) this.kamera(kamera, ciel);
    const s = hra.mapa.dlazdice, t0 = performance.now();
    const cakaj = (ms) => new Promise((r) => setTimeout(r, ms));
    // hotovo, keď sú postavené detailné dlaždice do ~450 m (tie je na snímkach vidieť zblízka);
    // vzdialenejšie (do 900 m) sa môžu ešte stavať – softvérové kreslenie ich nestíha
    let hotovo = false;
    while (performance.now() - t0 < limitMs) {
      await cakaj(400);
      if (!s) { hotovo = true; break; }
      hotovo = s.ziadane(x, z).filter((w) => w.uroven === 'detail' && w.d < 450).every((w) => s.aktivne.get(w.t.kluc)?.uroven === 'detail');
      if (hotovo) break;
    }
    await cakaj(2500);   // doplnky podľa vzdialenosti (3D fasády, stromy zblízka, chodci)
    return { ms: Math.round(performance.now() - t0), hotovo };
  },
  snimka(kamera, ciel) {
    this.kamera(kamera, ciel);
    this.plneRozlisenie();
    // vykreslí a hneď prečíta plátno (v tej istej úlohe – netreba preserveDrawingBuffer, bez HUD a minimapy)
    (hra.vykresli ?? (() => hra.renderer.render(hra.scena, hra.kamera)))();
    return hra.renderer.domElement.toDataURL('image/jpeg', 0.88);
  },
};
"""


def spusti_server(port):
    """Statický server nad koreňom repozitára (ako python3 -m http.server)."""
    class Tichy(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    obsluha = functools.partial(Tichy, directory=str(KOREN))

    class Server(http.server.ThreadingHTTPServer):
        # Windows dodržiava frontu spojení presne (predvolene 5) – hra naraz sťahuje desiatky dlaždíc a zvyšok by
        # dostal „connection refused“ (v hre „Failed to fetch“ a prázdne miesta na snímkach)
        request_queue_size = 256
    srv = Server(('127.0.0.1', port), obsluha)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def pohlady_bodu(b):
    """Kamery bodu: [(meno, kamera[x, y, z], ciel[x, y, z])] – y je výška nad terénom."""
    import math
    a = math.radians(b.get('azimut', 0))
    sx, sz = math.sin(a), -math.cos(a)            # smer pohľadu (x na východ, z na juh)
    out = []
    for p in b.get('pohlady', ['ulica', 'zhora']):
        if p == 'ulica':
            if 'kamera' in b:
                out.append(('ulica', b['kamera'], b['ciel']))
            else:
                out.append(('ulica', [b['x'], 1.7, b['z']], [b['x'] + sx * 60, 3.0, b['z'] + sz * 60]))
        elif p == 'zhora':
            d, v = b.get('vzdialenost', 110), b.get('vyska', 75)
            out.append(('zhora', [b['x'] - sx * d, v, b['z'] - sz * d], [b['x'], 0, b['z']]))
    return out


def zapis_galeriu(priecinok, manifest):
    riadky = []
    for b in manifest['body']:
        obr = ''.join(f'<figure><img src="{s}" loading="lazy"><figcaption>{p}</figcaption></figure>' for p, s in b['snimky'])
        pozor = '' if b.get('hotovo', True) else ' · <b>nie všetky dlaždice boli postavené</b>'
        riadky.append(f'<section><h2>{b["nazov"]} <small>{b["id"]} · x {b["x"]}, z {b["z"]} · {b["ms"] / 1000:.0f} s{pozor}</small></h2>{obr}</section>')
    html = f"""<!doctype html><html lang="sk"><meta charset="utf-8"><title>Kontrola mesta – {manifest['nazov']}</title>
<style>body{{font:14px system-ui;margin:20px;background:#1b2430;color:#e8e8e8}}figure{{display:inline-block;margin:0 8px 8px 0}}
img{{width:560px;display:block;border-radius:4px}}small{{color:#9aa}}a{{color:#9cf}}</style>
<h1>Kontrola mesta – {manifest['nazov']}</h1><p>commit {manifest['commit']} · {manifest['cas']} · <a href="../porovnanie.html">porovnanie behov</a></p>
{''.join(riadky)}</html>"""
    (priecinok / 'index.html').write_text(html, encoding='utf-8')


async def hlavna(arg):
    from playwright.async_api import async_playwright
    data = json.loads((KOREN / arg.body).read_text(encoding='utf-8'))
    body = data['body']
    if arg.len:
        chcene = set(arg.len.split(','))
        body = [b for b in body if b['id'] in chcene]
    nazov = arg.nazov or datetime.date.today().isoformat()
    priecinok = VYSTUP / nazov
    priecinok.mkdir(parents=True, exist_ok=True)
    try:
        commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=KOREN, capture_output=True, text=True).stdout.strip()
    except OSError:
        commit = '?'

    srv = spusti_server(arg.port)
    async with async_playwright() as p:
        volby = {'headless': not arg.gpu}
        if not arg.gpu:
            volby['args'] = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        if arg.chrome:
            volby['executable_path'] = arg.chrome
        prehliadac = await p.chromium.launch(**volby)
        strana = await prehliadac.new_page(viewport={'width': arg.sirka, 'height': arg.vyska})
        strana.on('pageerror', lambda e: print('  CHYBA v hre:', str(e)[:300]))
        await strana.add_init_script(f"try {{ localStorage.setItem('blavacik.grafika', '{arg.kvalita}'); }} catch (e) {{}}")

        # hráč začne priamo na prvom bode (nemusí sa načítavať okolie štartu)
        prvy = body[0]
        async def start_na_bode(route):
            r = await route.fetch()
            d = await r.json()
            d.setdefault('spawn', {})['hrac'] = {'x': prvy['x'], 'z': prvy['z'], 'uhol': 0}
            await route.fulfill(response=r, json=d)
        await strana.route('**/data/mapa/zakladna.json', start_na_bode)

        print(f'Načítavam hru (http://127.0.0.1:{arg.port}/)…')
        await strana.goto(f'http://127.0.0.1:{arg.port}/')
        await strana.wait_for_function("document.querySelector('.menu-hrat') && !document.querySelector('.menu-hrat').disabled", timeout=900_000)
        await strana.evaluate("document.querySelector('.menu-hrat').click()")
        await strana.wait_for_function("window.hra && hra.stav && !hra.stav.pauza", timeout=900_000)
        await strana.evaluate(JS_POMOCNIK)

        manifest = {'nazov': nazov, 'commit': commit, 'cas': datetime.datetime.now().isoformat(timespec='minutes'),
                    'hodina': arg.hodina, 'body': []}
        for b in body:
            print(f"{b['nazov']} ({b['x']}, {b['z']})…", flush=True)
            pohlady = pohlady_bodu(b)
            _, k0, c0 = pohlady[0]
            r = await strana.evaluate(f"__kontrola.presun({b['x']}, {b['z']}, {arg.limit * 1000}, {arg.hodina}, {json.dumps(k0)}, {json.dumps(c0)})")
            ms = r['ms']
            if not r['hotovo']:
                print(f'  pozor: za {arg.limit} s sa nepostavili všetky dlaždice okolia – snímka môže mať prázdne miesta')
            snimky = []
            for i, (meno, kamera, ciel) in enumerate(pohlady):
                if i > 0:
                    # ďalší pohľad (zhora): kamera vopred a pár snímok hry, nech sa moduly podľa kamery prepočítajú
                    await strana.evaluate(f"__kontrola.kamera({json.dumps(kamera)}, {json.dumps(ciel)})")
                    await strana.evaluate("new Promise((r) => { let n = 0; const f = () => (++n >= 4 ? setTimeout(r, 500) : requestAnimationFrame(f)); requestAnimationFrame(f); })")
                await strana.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
                url = await strana.evaluate(f"__kontrola.snimka({json.dumps(kamera)}, {json.dumps(ciel)})")
                subor = f"{b['id']}-{meno}.jpg"
                (priecinok / subor).write_bytes(base64.b64decode(url.split(',', 1)[1]))
                snimky.append((meno, subor))
                print(f'  {subor}')
            manifest['body'].append({'id': b['id'], 'nazov': b['nazov'], 'x': b['x'], 'z': b['z'], 'ms': ms, 'hotovo': r['hotovo'], 'snimky': snimky})
        await prehliadac.close()
    srv.shutdown()

    # opakovaný beh s --len do toho istého priečinka: ostatné body z predošlého behu ostanú
    stary = priecinok / 'manifest.json'
    if stary.exists():
        nove = {b['id'] for b in manifest['body']}
        predtym = [b for b in json.loads(stary.read_text(encoding='utf-8')).get('body', []) if b['id'] not in nove]
        poradie = {b['id']: i for i, b in enumerate(data['body'])}
        manifest['body'] = sorted(predtym + manifest['body'], key=lambda b: poradie.get(b['id'], 1e9))
    (priecinok / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    zapis_galeriu(priecinok, manifest)
    # zoznam behov pre porovnanie.html
    zoznam_cesta = VYSTUP / 'zoznam.json'
    zoznam = json.loads(zoznam_cesta.read_text(encoding='utf-8')) if zoznam_cesta.exists() else []
    if nazov not in zoznam:
        zoznam.append(nazov)
    zoznam_cesta.write_text(json.dumps(sorted(zoznam), ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Hotovo: {priecinok.relative_to(KOREN)}/index.html, porovnanie: docs/kontrola/porovnanie.html')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Testovacia trasa mesta – snímky z pevných bodov (issue #60).')
    ap.add_argument('--body', default='tools/kontrola/body.json', help='súbor s bodmi (cesta od koreňa repozitára)')
    ap.add_argument('--len', help='len vybrané body (id oddelené čiarkou)')
    ap.add_argument('--nazov', help='názov behu = priečinok v docs/kontrola/ (predvolene dnešný dátum)')
    ap.add_argument('--hodina', type=float, default=13.0, help='herný čas snímok (predvolene 13:00)')
    ap.add_argument('--kvalita', default='vysoka', choices=['nizka', 'stredna', 'vysoka'])
    ap.add_argument('--sirka', type=int, default=1280)
    ap.add_argument('--vyska', type=int, default=720)
    ap.add_argument('--limit', type=int, default=180, help='najdlhšie čakanie na dlaždice v jednom bode (s)')
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--gpu', action='store_true', help='okno prehliadača s grafickou kartou (rýchlejšie, nie na serveri)')
    ap.add_argument('--chrome', help='cesta k Chrome/Chromiu (inak prehliadač z Playwrightu)')
    asyncio.run(hlavna(ap.parse_args()))
