# Regresné kontroly – opravené chyby sa nesmú vrátiť (napr. pri zlučovaní vetiev).
#
#   python3 tools/kontrola/regresie.py                 – všetky kontroly
#   python3 tools/kontrola/regresie.py --len stromy-na-mostoch,trava-na-cestach
#   python3 tools/kontrola/regresie.py --rychlo        – kontroly trávy len na 12 dlaždiciach (ladenie)
#   python3 tools/kontrola/regresie.py --json vysledok.json
#
# Potrebuje: pip install playwright && python3 -m playwright install chromium (ako tools/kontrola/trasa.py).
# Spustí malý server z koreňa repozitára, otvorí tools/kontrola/regresie.html v Chromiu bez okna (WebGL netreba)
# a vypíše výsledok. Návratový kód 1 = niektorá kontrola zlyhala (GitHub Actions: .github/workflows/regresie.yml).
# Zoznam kontrol: tools/kontrola/regresie/kontroly.js – každá nová oprava = nová kontrola (CLAUDE.md, „Zlučovanie“).

import argparse
import asyncio
import functools
import http.server
import json
import os
import sys
import threading

KOREN = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256      # veľa dlaždíc naraz (Windows inak odmieta spojenia)
    daemon_threads = True


class Obsluha(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


async def spusti(url, casovy_limit):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        s = await b.new_page()
        chyby = []
        s.on('pageerror', lambda e: chyby.append(str(e)))
        await s.goto(url)
        try:
            await s.wait_for_function('window.vysledok', timeout=casovy_limit * 1000)
        except Exception:
            stav = await s.evaluate("document.getElementById('stav')?.textContent")
            await b.close()
            return [{'id': 'beh', 'ok': False, 'pocetChyb': 1, 'priklady': [{'text': f'kontroly nedobehli: {stav}; {chyby[:3]}'}]}]
        v = await s.evaluate('window.vysledok')
        await b.close()
        if chyby:
            v.append({'id': 'chyby-stranky', 'ok': False, 'pocetChyb': len(chyby), 'priklady': [{'text': c} for c in chyby[:5]], 'popis': 'chyby JavaScriptu'})
        return v


def main():
    ap = argparse.ArgumentParser(description='Regresné kontroly hry Blavačík')
    ap.add_argument('--len', default='', help='len vybrané kontroly (id oddelené čiarkou)')
    ap.add_argument('--rychlo', action='store_true', help='menej dlaždíc pri kontrolách trávy')
    ap.add_argument('--json', default='', help='uložiť výsledok do súboru')
    ap.add_argument('--limit', type=int, default=1500, help='časový limit v sekundách')
    a = ap.parse_args()

    srv = Server(('127.0.0.1', 0), functools.partial(Obsluha, directory=KOREN))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    q = []
    if a.len:
        q.append('len=' + a.len)
    if a.rychlo:
        q.append('rychlo')
    url = f'http://127.0.0.1:{srv.server_address[1]}/tools/kontrola/regresie.html' + ('?' + '&'.join(q) if q else '')
    vysledok = asyncio.run(spusti(url, a.limit))
    srv.shutdown()

    zle = [v for v in vysledok if not v.get('ok')]
    for v in vysledok:
        znak = 'OK   ' if v.get('ok') else 'CHYBA'
        print(f"{znak} {v['id']:<22} skontrolované {v.get('skontrolovane', '-'):>7}  chýb {v.get('pocetChyb', 0):>5}  ({v.get('sekundy', '-')} s)")
        if not v.get('ok'):
            print(f"      {v.get('popis', '')}")
            print(f"      oprava: {v.get('oprava', '')}")
            for p in v.get('priklady', []):
                print(f"      - {p.get('text')} [{p.get('dlazdica', '')}] x={p.get('x', '')} z={p.get('z', '')}")
    if a.json:
        json.dump(vysledok, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Všetky kontroly prešli.' if not zle else f'Zlyhalo kontrol: {len(zle)}')
    sys.exit(1 if zle else 0)


if __name__ == '__main__':
    main()
