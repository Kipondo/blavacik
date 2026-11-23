# Automatické meranie výkonu na trase #60 v prehliadači bez okna (Playwright + Chrome so SwiftShader).
# Spúšťa meranie hry (js/ui/meranie-trasy.js) v ručnom režime a vypíše výsledok ako JSON (riadok na bod trasy).
# Použitie: python3 tools/kontrola/meranie-trasy.py http://localhost:8000 [kvalita|-] [body, napr. 0,2,5] > vysledok.jsonl
# SwiftShader kreslí procesorom – snímky/s sú len na porovnanie pred/po na tom istom stroji;
# kreslenia, trojuholníky a časy stavby dlaždíc sú porovnateľné priamo.
# Keď stránka spadne (málo pamäte pri veľa presunoch cez celé mesto), prehliadač sa spustí znova a pokračuje sa ďalším bodom.
import asyncio, json, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'
KVALITA = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
# body trasy (indexy do TRASA v js/ui/meranie-trasy.js), predvolene výber 8 bodov – celá trasa trvá v SwiftShader veľmi dlho
BODY = [int(i) for i in (sys.argv[3] if len(sys.argv) > 3 else '0,2,5,7,9,10,13,15').split(',')]
SIRKA, VYSKA = 640, 360
NA_PREHLIADAC = 3   # po koľkých bodoch sa prehliadač spustí nanovo (menej pamäte)

async def spusti(p):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--mute-audio', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = await b.new_page(viewport={'width': SIRKA, 'height': VYSKA})
    if KVALITA:
        await pg.add_init_script(f"try {{ localStorage.setItem('blavacik.grafika', '{KVALITA}'); }} catch (e) {{}}")
    await pg.goto(URL)
    await pg.wait_for_function("document.querySelector('.menu-hrat') && !document.querySelector('.menu-hrat').disabled", timeout=400000)
    await pg.evaluate("document.querySelector('.menu-hrat').click()")
    await pg.wait_for_timeout(2000)
    return b, pg

async def main():
    async with async_playwright() as p:
        b = pg = None
        hotovych = 0
        for i in BODY:
            for pokus in range(2):
                try:
                    if pg is None or hotovych >= NA_PREHLIADAC:
                        if b: await b.close()
                        b, pg = await spusti(p)
                        hotovych = 0
                    v = await pg.evaluate(f"(async () => {{ const m = await import('./js/ui/meranie-trasy.js'); return hra.merajTrasu({{ rucne: true, trasa: [m.TRASA[{i}]] }}); }})()")
                    r = v['trasa'][0]
                    r['kvalita'] = v.get('kvalita')
                    print(json.dumps(r, ensure_ascii=False), flush=True)
                    hotovych += 1
                    break
                except Exception as e:
                    print(f'bod {i}: {str(e)[:120]} – nové spustenie', file=sys.stderr, flush=True)
                    try: await b.close()
                    except Exception: pass
                    b = pg = None
        if b: await b.close()

asyncio.run(main())
