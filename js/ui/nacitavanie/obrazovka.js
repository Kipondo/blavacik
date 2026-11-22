// Obrazovka načítavania (issue #101): mapa Slovenska s reliéfom, vlak ide z Košíc do Bratislavy podľa
// skutočného priebehu načítavania (js/ui/nacitavanie/priebeh.js), prejdená časť trate zlatá, zvyšok bodkovaný,
// štítok s percentami nad lokomotívou, žiadna lišta. Dole sa striedajú vtipné tipy.
//
// Reliéf je predrenderovaný obrázok (tools/ui/relief_slovenska.py z Copernicus DEM GLO-90) v rovnakých
// súradniciach 1600 × 900 ako celé SVG; trasa a mestá sú v projekcii x = 217,5·(lon − 17,1077) + 228,4,
// y = −329,0·(lat − 48,1486) + 645,0.

import { PriebehNacitavania } from './priebeh.js';
import { vytvorVlak } from './vlak.js';
import { TIPY } from './tipy.js';

const NS = 'http://www.w3.org/2000/svg';

// trať Košice – Kysak – Spišská Nová Ves – Poprad – Liptovský Mikuláš – Ružomberok – Vrútky – Žilina – Trenčín –
// Piešťany – Trnava – Bratislava (body z návrhu majiteľa)
const TRAT = [
  [1131.8, 458.2], [1123.6, 414.0], [1071.3, 404.1], [979.8, 384.3], [923.2, 346.3], [868.7, 331.5], [775.1, 338.1],
  [705.4, 338.1], [650.9, 321.6], [622.6, 328.2], [583.4, 291.9], [496.5, 324.0], [431.0, 400.8], [385.2, 447.0],
  [387.4, 499.8], [333.0, 569.1], [228.4, 645.0],
];
// za Košicami (na východ) stoja pri štarte vozne – táto časť trate sa nekreslí, len po nej idú vozne
const ZA_KOSICAMI = [[1520, 562], [1312, 539], [1215, 500]];   // smer Čierna nad Tisou
const MESTA = [['Poprad', 923.2, 346.3], ['Žilina', 583.4, 291.9], ['Trenčín', 431.0, 400.8], ['Trnava', 333.0, 569.1]];

/** Hladká krivka cez body trate (Catmull-Rom → kubické Bézierove úseky). */
function krivka(b) {
  let d = `M${b[0][0]},${b[0][1]}`;
  for (let i = 0; i < b.length - 1; i++) {
    const p0 = b[Math.max(0, i - 1)], p1 = b[i], p2 = b[i + 1], p3 = b[Math.min(b.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Špendlík (hrot dole v 0, 0). */
const spendlik = (trieda) => `<g class="${trieda}"><path d="M0 0 C-4 -9 -15 -18 -15 -30 A15 15 0 1 1 15 -30 C15 -18 4 -9 0 0 Z"/><circle cx="0" cy="-30" r="6" class="spendlik-stred"/></g>`;

export function vytvorNacitavanie(rodic) {
  const obr = document.createElement('div');
  obr.className = 'nacitavanie';
  obr.hidden = true;
  const trat = krivka(TRAT);
  obr.innerHTML = `
    <svg class="nacitavanie-mapa" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="img"
      aria-label="Mapa Slovenska, vlak ide z Košíc do Bratislavy">
      <defs>
        <filter id="nac-ziara" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id="nac-tien" x="-20%" y="-40%" width="140%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#050a1a" flood-opacity=".7"/></filter>
      </defs>
      <image class="nacitavanie-relief" href="assets/ui/nacitavanie/slovensko.webp" x="124" y="120" width="1333" height="723"/>
      <g class="nacitavanie-tatry" transform="translate(895,288)">
        <path d="M-78 22 L-60 2 L-50 10 L-34 -12 L-18 8 L-6 -6 L10 22 Z" class="hora"/>
        <path d="M-34 -12 L-28 -4 L-33 -1 L-38 -5 Z M-60 2 L-56 7 L-61 8 Z" class="snieh"/>
        <path d="M-8 26 L14 -6 L24 4 L42 -30 L60 -2 L70 -10 L92 26 Z" class="hora"/>
        <path d="M42 -30 L50 -16 L44 -12 L38 -18 L33 -14 Z M14 -6 L19 1 L12 3 Z M70 -10 L76 -2 L69 -1 Z" class="snieh"/>
        <text x="10" y="-44" class="nacitavanie-tatry-nazov">Vysoké Tatry</text>
      </g>
      <path d="${trat}" class="trasa-zvysok"/>
      <path d="${trat}" class="trasa-hotova"/>
      <path d="${krivka([...ZA_KOSICAMI, ...TRAT])}" class="trasa-vlaku"/>
      ${MESTA.map(([n, x, y]) => `<circle cx="${x}" cy="${y}" r="5" class="nacitavanie-bod"/><text x="${x + 10}" y="${y - 10}" class="nacitavanie-mesto">${n}</text>`).join('')}
      <circle cx="228.4" cy="645" r="22" class="ciel-ziara" filter="url(#nac-ziara)"/>
      <g transform="translate(1131.8,458.2)">${spendlik('spendlik spendlik-start')}</g>
      <g transform="translate(228.4,645)">${spendlik('spendlik spendlik-ciel')}</g>
      <text x="1131.8" y="512" class="nacitavanie-velke" text-anchor="middle">Košice</text>
      <text x="250" y="696" class="nacitavanie-velke">Bratislava</text>
      <g class="nacitavanie-vlak" filter="url(#nac-tien)"></g>
      <g class="nacitavanie-stitok"><rect x="-44" y="-60" width="88" height="40" rx="3"/><text x="0" y="-29" text-anchor="middle">0 %</text></g>
      <text x="800" y="118" class="nacitavanie-nazov-tien" text-anchor="middle">Blaváčik</text>
      <text x="800" y="114" class="nacitavanie-nazov" text-anchor="middle">Blaváčik</text>
      <text x="800" y="842" class="nacitavanie-tip" text-anchor="middle"></text>
    </svg>
    <p class="menu-stav" aria-live="polite"></p>`;
  rodic.appendChild(obr);

  const svg = obr.querySelector('svg');
  const hotova = svg.querySelector('.trasa-hotova');
  const trasaVlaku = svg.querySelector('.trasa-vlaku');
  const L = hotova.getTotalLength();
  const E = trasaVlaku.getTotalLength() - L;       // dĺžka schovanej časti pred Košicami
  hotova.style.strokeDasharray = `0 ${L + 10}`;
  const umiestni = vytvorVlak(svg.querySelector('.nacitavanie-vlak'));
  const stitok = svg.querySelector('.nacitavanie-stitok');
  const stitokText = stitok.querySelector('text');
  const tip = svg.querySelector('.nacitavanie-tip');
  const stav = obr.querySelector('.menu-stav');
  const priebeh = new PriebehNacitavania();

  let priPrichode = () => {};
  let dorazil = false;
  let poslednyCas = performance.now();
  let tipIndex = Math.floor(Math.random() * TIPY.length);
  let tipCas = 0;

  const vykresli = (p) => {
    // pri p = 0 stojí lokomotíva v Košiciach (vozne za ňou), pri p = 1 je v Bratislave
    const s = L * p;
    hotova.style.strokeDasharray = `${s.toFixed(1)} ${L + 10}`;
    const bod = umiestni(trasaVlaku, E + s);
    stitok.setAttribute('transform', `translate(${bod.x.toFixed(1)},${(bod.y - 8).toFixed(1)})`);
    stitokText.textContent = `${Math.round(p * 100)} %`;
  };
  const ukazTip = () => {
    tip.classList.remove('viditelny');
    setTimeout(() => { tip.textContent = TIPY[tipIndex % TIPY.length]; tip.classList.add('viditelny'); }, 250);
    tipIndex++;
  };
  vykresli(0);
  ukazTip();

  // priebeh sa počíta stále (aj keď je obrazovka skrytá), kreslí sa len keď je vidieť
  const slucka = () => {
    const t = performance.now();
    const dt = Math.min(0.1, (t - poslednyCas) / 1000);
    poslednyCas = t;
    const p = priebeh.krok(dt);
    if (!obr.hidden) {
      vykresli(p);
      tipCas += dt;
      if (tipCas > 4.5) { tipCas = 0; ukazTip(); }
    }
    if (p >= 1 && !dorazil) {
      dorazil = true;
      // chvíľka v stanici, potom hra
      setTimeout(() => priPrichode(), obr.hidden ? 0 : 450);
    }
    if (!dorazil || !obr.hidden) requestAnimationFrame(slucka);
  };
  requestAnimationFrame(slucka);

  return {
    priebeh(text) { priebeh.text(text); stav.textContent = text; },
    chyba(text) { stav.textContent = text; stav.classList.add('chyba'); },
    hotovo() { priebeh.koniec(); },
    ukaz() {
      obr.hidden = false;
      if (dorazil) setTimeout(() => priPrichode(), 300);
    },
    skry() { obr.hidden = true; },
    priPrichode(fn) { priPrichode = fn; },
    get viditelne() { return !obr.hidden; },
  };
}
