// node shot.mjs out.png "query" w h
import puppeteer from 'puppeteer-core';
const [out, q = '', w = 600, h = 800] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
await p.setViewport({ width: +w, height: +h });
p.on('console', (m) => console.log('[konzola]', m.text()));
p.on('pageerror', (e) => console.log('[chyba]', e.message));
await p.goto(`http://localhost:8765/${process.env.STRANKA || 'tools/postava/snimky.html'}?w=${w}&h=${h}&${q}`);
try { await p.waitForFunction('window.HOTOVO === true', { timeout: 120000 }); } catch (e) { console.log('timeout'); }
await p.screenshot({ path: out });
await b.close();
