// Modul: meranie výkonu na testovacej trase (#60, #58).
// Hráča postupne prenesie na body trasy, počká, kým sa okolie dostaví, a v štyroch smeroch pohľadu zmeria
// snímky za sekundu, čas snímky, počet kreslení a trojuholníkov; zapíše aj čas načítania dlaždíc.
//
// Spustenie: otvor hru s adresou …/index.html?meranie a stlač Hrať (po skončení sa ukáže tabuľka,
// tlačidlo ju skopíruje). Z konzoly: await hra.merajTrasu().
// Bez grafickej karty (automatický test, SwiftShader) sa volá s { rucne: true }: herná slučka sa zastaví,
// mesto sa stavia bez kreslenia a čas snímky sa meria pri každom snímku zvlášť (len na porovnanie pred/po).
// Výsledok: hra.vysledkyMerania (a návratová hodnota merajTrasu).

/** Body trasy #60 (súradnice hry: x na východ, z na juh, metre od Hlavného námestia). */
export const TRASA = [
  ['Hlavné námestie', 34, 11], ['Michalská brána', -70, -181], ['Obchodná', 134, -278], ['Hodžovo nám.', -59, -445],
  ['Šafárikovo nám.', 579, 133], ['Most SNP – sever', -240, 340], ['Most SNP – juh', -280, 800], ['Eurovea', 1114, 377],
  ['Nivy', 1693, -333], ['Hlavná stanica', -89, -1667], ['Hlavná stanica – hala', -118, -1662],
  ['Hlavná stanica – 1. nástupište', -140, -1727], ['Petržalka – Jungmannova', -52, 2723],
  ['Petržalka – Romanova', 134, 3445], ['Aupark', -155, 1049], ['Trnavské mýto', 1582, -1667],
  ['Karlova Ves', -3468, -1056], ['Kamzík', -965, -4479],
];

const SMERY = 4;
const pockaj = (ms) => new Promise((r) => setTimeout(r, ms));
const snimok = () => new Promise((r) => requestAnimationFrame(r));
const median = (a) => { const z = [...a].sort((x, y) => x - y); return z.length ? z[z.length >> 1] : 0; };
const percentil = (a, p) => { const z = [...a].sort((x, y) => x - y); return z.length ? z[Math.min(z.length - 1, Math.floor(z.length * p))] : 0; };

export default {
  nazov: 'meranie',
  poradie: 998,

  init(hra) {
    hra.merajTrasu = (volby) => merajTrasu(hra, volby);
    if (new URLSearchParams(location.search).has('meranie')) {
      hra.na('start', () => setTimeout(() => merajTrasu(hra, { tabulka: true }), 3000));
    }
  },
};

/** Sleduje stavbu dlaždíc: čas od začiatku (vrátane stiahnutia dát) po ukázanie a čistý čas výpočtu. */
function sledujDlazdice(sprava) {
  const zaznamy = [];
  const uloha = new Map();
  const zacni = sprava._zacni.bind(sprava), pridaj = sprava._pridaj.bind(sprava);
  sprava._zacni = async (t, u) => {
    const z = { t0: performance.now(), cpu: 0 };
    uloha.set(t.kluc + u, z);
    await zacni(t, u);
    const g = sprava.uloha?.kluc === t.kluc ? sprava.uloha.gen : null;
    if (g) {
      const dalsi = g.next.bind(g);
      g.next = (...a) => { const s = performance.now(); const r = dalsi(...a); z.cpu += performance.now() - s; return r; };
    }
  };
  sprava._pridaj = (k, u, o, d) => {
    const z = uloha.get(k + u);
    if (z) { uloha.delete(k + u); zaznamy.push({ uroven: u, ms: performance.now() - z.t0, cpu: z.cpu }); }
    return pridaj(k, u, o, d);
  };
  return { zaznamy, koniec() { sprava._zacni = zacni; sprava._pridaj = pridaj; } };
}

/** Čas procesora: aktualizácia jednotlivých modulov a príprava kreslenia (hra.vykresli bez čakania na kartu). */
function sledujProcesor(hra) {
  const casy = new Map();
  const povodne = [];
  const obal = (obj, kluc, meno) => {
    const f = obj[kluc];
    if (typeof f !== 'function') return;
    povodne.push([obj, kluc, f]);
    obj[kluc] = function (...a) {
      const s = performance.now();
      const r = f.apply(this, a);
      casy.set(meno, (casy.get(meno) ?? 0) + performance.now() - s);
      return r;
    };
  };
  for (const m of hra.moduly) { obal(m, 'update', m.nazov); obal(m, 'updateVzdy', m.nazov); }
  if (hra.vykresli) obal(hra, 'vykresli', '(kreslenie)');
  obal(hra.mapa, 'update', '(mapa)');
  return {
    vynuluj() { casy.clear(); },
    koniec() { for (const [o, k, f] of povodne.reverse()) o[k] = f; },
    vysledok(n) {
      const z = [...casy].map(([k, v]) => [k, v / Math.max(1, n)]).sort((a, b) => b[1] - a[1]);
      const kreslenie = z.find(([k]) => k === '(kreslenie)')?.[1] ?? 0;
      const moduly = z.filter(([k]) => k !== '(kreslenie)');
      return {
        procesorHraMs: +moduly.reduce((a, [, v]) => a + v, 0).toFixed(2),
        procesorKreslenieMs: +kreslenie.toFixed(2),
        najnarocnejsie: moduly.slice(0, 5).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '),
      };
    },
  };
}

/** Je okolie hráča dostavané (žiadna rozostavaná dlaždica a všetky požadované úrovne sú v scéne)? */
function hotovo(sprava, x, z) {
  if (sprava.uloha) return false;
  return sprava.ziadane(x, z).every((w) => {
    const a = sprava.aktivne.get(w.t.kluc);
    return a?.uroven === w.uroven || (w.uroven === 'lod' && a?.uroven === 'detail');
  });
}

function presun(hra, x, z, uhol) {
  const y = hra.mapa.vyska(x, z);
  const h = hra.hrac;
  h.pozicia.set(x, y, z);
  h.vy = 0; h.rychlost = 0;
  h.uhol = uhol;
  hra.stav.pozicia.set(x, y, z);
  hra.posli('teleport', { x, y, z });
}

/** Jeden krok hernej slučky bez main.js (ručný režim). */
function krok(hra, dt, kresli) {
  hra.stav.cas += dt;
  hra.aktualizuj(dt);
  if (hra.hrac) hra.stav.pozicia.copy(hra.hrac.pozicia);
  hra.mapa.update(hra.stav.cas);
  // obloha a slnko idú za hráčom (ako svet.update v main.js)
  const obloha = hra.scena.getObjectByName('obloha');
  if (obloha) obloha.position.copy(hra.kamera.position);
  hra.scena.traverse((o) => {
    if (o.isDirectionalLight && o.userData.smer) {
      o.target.position.copy(hra.stav.pozicia);
      o.position.copy(hra.stav.pozicia).addScaledVector(o.userData.smer, 250);
    }
  });
  if (kresli) (hra.vykresli ?? (() => hra.renderer.render(hra.scena, hra.kamera)))();
}

export async function merajTrasu(hra, { trasa = TRASA, sekundy = 1.5, rucne = false, tabulka = false } = {}) {
  const sprava = hra.mapa.dlazdice;
  const info = hra.renderer.info;
  const gl = hra.renderer.getContext();
  const pixel = new Uint8Array(4);
  const sledovanie = sledujDlazdice(sprava);
  if (rucne) hra.renderer.setAnimationLoop(null);
  const vysledky = [];
  const premavka = hra.moduly.find((m) => m.nazov === 'premavka');
  const chodci = hra.moduly.find((m) => m.nazov === 'chodci');

  for (const [miesto, x, z] of trasa) {
    hra.ui?.sprava?.(`Meranie: ${miesto}`, 2);
    sledovanie.zaznamy.length = 0;
    presun(hra, x, z, 0);
    const t0 = performance.now();
    // počkáme, kým sa okolie dostaví (najviac 90 s)
    while (!hotovo(sprava, x, z) && performance.now() - t0 < 90000) {
      if (rucne) { krok(hra, 0.033, false); await pockaj(0); } else await pockaj(200);
    }
    const okolie = (performance.now() - t0) / 1000;
    // chvíľu necháme dobehnúť NPC a pripraviť shadery
    if (rucne) for (let i = 0; i < 40; i++) { krok(hra, 0.033, i === 39); await pockaj(0); }
    else await pockaj(1500);

    const casy = [];
    let kreslenia = 0, trojuholniky = 0, n = 0;
    const procesor = sledujProcesor(hra);
    const auto = info.autoReset;
    info.autoReset = false; // s efektmi sa kreslí viac prechodov za snímok – rátame všetky
    for (let s = 0; s < SMERY; s++) {
      presun(hra, x, z, (s * 2 * Math.PI) / SMERY);
      if (rucne) {
        for (let i = 0; i < 3; i++) {
          info.reset();
          const a = performance.now();
          krok(hra, 0.033, true);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); // počká na dokreslenie
          if (i < 1) continue; // prvý snímok po otočení (príprava) sa neráta
          casy.push(performance.now() - a);
          kreslenia += info.render.calls; trojuholniky += info.render.triangles; n++;
        }
      } else {
        await snimok(); await snimok();
        const koniec = performance.now() + sekundy * 1000;
        let pred = performance.now();
        info.reset();
        while (performance.now() < koniec) {
          await snimok();
          const t = performance.now();
          casy.push(t - pred); pred = t;
          kreslenia += info.render.calls; trojuholniky += info.render.triangles; n++;
          info.reset();
        }
      }
    }
    info.autoReset = auto;
    const cpu = procesor.vysledok(casy.length);
    procesor.koniec();
    const det = sledovanie.zaznamy.filter((d) => d.uroven === 'detail');
    const lod = sledovanie.zaznamy.filter((d) => d.uroven === 'lod');
    const aktivne = [...sprava.aktivne.values()];
    const r = {
      miesto,
      fps: +(1000 / median(casy)).toFixed(1),
      snimokMs: +median(casy).toFixed(1),
      najhorsiMs: +percentil(casy, 0.95).toFixed(1),
      kreslenia: Math.round(kreslenia / Math.max(1, n)),
      trojuholnikyTis: Math.round(trojuholniky / Math.max(1, n) / 1000),
      okolieS: +okolie.toFixed(1),
      dlazdicDetail: det.length,
      dlazdicaDetailMs: Math.round(median(det.map((d) => d.ms))),
      dlazdicaDetailVypocetMs: Math.round(median(det.map((d) => d.cpu))),
      dlazdicLod: lod.length,
      aktivneDetail: aktivne.filter((a) => a.uroven === 'detail').length,
      aktivneLod: aktivne.filter((a) => a.uroven === 'lod').length,
      aut: premavka?.auta?.length ?? null,
      chodcov: chodci?.chodci?.length ?? null,
      rozlisenie: Math.round((hra.stav.rozlisenie ?? 1) * 100),
      dohlad: Math.round(hra.scena.fog?.far ?? 0),
      ...cpu,
    };
    vysledky.push(r);
    console.log('[meranie]', JSON.stringify(r));
  }
  sledovanie.koniec();
  const vysledok = {
    kvalita: hra.stav.kvalita ?? null,
    prehliadac: navigator.userAgent,
    grafika: nazovGrafiky(gl),
    okno: `${innerWidth}×${innerHeight} @ ${hra.renderer.getPixelRatio().toFixed(2)}`,
    trasa: vysledky,
    suhrn: suhrn(vysledky),
  };
  hra.vysledkyMerania = vysledok;
  if (tabulka) ukazTabulku(vysledok);
  return vysledok;
}

function nazovGrafiky(gl) {
  try {
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { return ''; }
}

function suhrn(v) {
  const s = (k) => median(v.map((r) => r[k]).filter((x) => Number.isFinite(x)));
  return {
    fps: s('fps'), snimokMs: s('snimokMs'), najhorsiMs: s('najhorsiMs'), kreslenia: s('kreslenia'),
    trojuholnikyTis: s('trojuholnikyTis'), dlazdicaDetailMs: s('dlazdicaDetailMs'), dlazdicaDetailVypocetMs: s('dlazdicaDetailVypocetMs'),
    okolieS: s('okolieS'), procesorHraMs: s('procesorHraMs'), procesorKreslenieMs: s('procesorKreslenieMs'),
  };
}

function ukazTabulku(v) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '40px', zIndex: 200, overflow: 'auto', background: 'rgba(10,14,12,0.92)', color: '#e8f0e8',
    font: '12px/1.45 ui-monospace, monospace', padding: '14px 18px', borderRadius: '8px',
  });
  const stlpce = ['miesto', 'fps', 'snimokMs', 'najhorsiMs', 'kreslenia', 'trojuholnikyTis', 'procesorHraMs', 'procesorKreslenieMs', 'dlazdicaDetailMs', 'okolieS', 'aut', 'chodcov'];
  const hlavicka = ['miesto', 'snímky/s', 'ms', '95 % ms', 'kreslenia', 'tis. troj.', 'CPU hra ms', 'CPU kresl. ms', 'dlaždica ms', 'okolie s', 'autá', 'chodci'];
  const riadok = (b) => `<tr>${b.map((x) => `<td style="padding:2px 10px">${x ?? ''}</td>`).join('')}</tr>`;
  el.innerHTML = `<b>Meranie trasy #60</b> – kvalita ${v.kvalita ?? '?'}, ${v.grafika}, ${v.okno}
    <table style="border-collapse:collapse;margin:8px 0">${riadok(hlavicka)}${v.trasa.map((r) => riadok(stlpce.map((k) => r[k]))).join('')}
    ${riadok(['medián', ...stlpce.slice(1).map((k) => v.suhrn[k])])}</table>
    <button class="kopiruj">Kopírovať výsledok</button> <button class="zavri">Zavrieť</button>`;
  el.querySelector('.kopiruj').onclick = () => navigator.clipboard?.writeText(JSON.stringify(v, null, 1));
  el.querySelector('.zavri').onclick = () => el.remove();
  document.body.appendChild(el);
}
