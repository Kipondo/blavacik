// Náhľad: zjednotený nízkopolygónový štýl áut (typy z oboch voľných balíkov), klasické taxíky
// a náhodné farby podľa skutočného zastúpenia. Referencia pre issue #97, nie kód hry.
import * as THREE from 'three';

const POHLAD = new URLSearchParams(location.search).get('p') || '1';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(innerWidth, innerHeight); r.toneMapping = THREE.ACESFilmicToneMapping;
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color('#E9EEF1');
sc.add(new THREE.HemisphereLight('#FFFFFF', '#AEB5A8', 1.25));
const sun = new THREE.DirectionalLight('#FFF3DE', 2.3); sun.position.set(-8, 14, 9); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 22, bottom: -22, far: 80 }); sc.add(sun);

// --- zjednotený štýl: rovnaké koleso, rovnaké sklo, rovnaké svetlá, jeden materiál laku ---
const matCache = new Map();
const M = (c) => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return matCache.get(c); };
const SKLO = '#26343D', GUMA = '#1C1D1F', DISK = '#A7ADB3', PLAST = '#2B2E31';
const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };

/** Bočný profil (pole [z, y] od zadku dopredu) vysunutý na šírku w – auto ide v smere +z. */
function profil(body, w, c) {
  const sh = new THREE.Shape(); body.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2); // tvar x→z, hĺbka → x
  return new THREE.Mesh(g, M(c));
}
function koleso(rad, sir, x, y, z) {
  const g = new THREE.Group();
  const k = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, sir, 14), M(GUMA)); k.rotation.z = Math.PI / 2; g.add(k);
  const d = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.55, rad * 0.55, sir + 0.02, 10), M(DISK)); d.rotation.z = Math.PI / 2; g.add(d);
  g.position.set(x, y, z); return g;
}
function napis(text, bg, fg, w, h) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w); const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = fg; c.font = `bold ${Math.round(cv.height * 0.7)}px sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cv.width / 2, cv.height * 0.54);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshLambertMaterial({ map: t });
}

// Typy: L dĺžka, W šírka, H strecha, P pás (spodok okien), kapota/kufor, skleník [zadok-spodok, zadok-hore, predok-hore, predok-spodok] v podiele dĺžky
const TYPY = {
  mestske:  { nazov: 'Mestské',      L: 3.6, W: 1.65, H: 1.5,  P: 0.95, kap: 0.82, kuf: 0.9,  sk: [0.03, 0.08, 0.62, 0.78], kr: 0.29 },
  hatchback:{ nazov: 'Hatchback',    L: 4.1, W: 1.78, H: 1.47, P: 0.95, kap: 0.82, kuf: 0.92, sk: [0.03, 0.1, 0.6, 0.76],  kr: 0.31 },
  sedan:    { nazov: 'Sedan',        L: 4.65,W: 1.8,  H: 1.44, P: 0.93, kap: 0.8,  kuf: 0.9,  sk: [0.2, 0.3, 0.62, 0.76],  kr: 0.32 },
  kombi:    { nazov: 'Kombi',        L: 4.7, W: 1.8,  H: 1.48, P: 0.93, kap: 0.8,  kuf: 0.93, sk: [0.02, 0.05, 0.64, 0.77], kr: 0.32 },
  suv:      { nazov: 'SUV',          L: 4.5, W: 1.86, H: 1.66, P: 1.1,  kap: 0.98, kuf: 1.08, sk: [0.03, 0.08, 0.62, 0.76], kr: 0.36 },
  mpv:      { nazov: 'Dodávka osobná', L: 4.9, W: 1.9, H: 1.92, P: 1.08, kap: 0.98, kuf: 1.05, sk: [0.02, 0.03, 0.72, 0.84], kr: 0.33 },
  dodavka:  { nazov: 'Dodávka',      L: 5.9, W: 2.0,  H: 2.5,  P: 1.25, kap: 1.05, kuf: 2.45, sk: [0.72, 0.72, 0.8, 0.88],  kr: 0.36, skrina: true },
  pickup:   { nazov: 'Pickup',       L: 5.3, W: 1.9,  H: 1.82, P: 1.12, kap: 1.08, kuf: 1.08, sk: [0.36, 0.38, 0.66, 0.78], kr: 0.38, korba: true },
  muscle:   { nazov: 'Muscle',       L: 4.85,W: 1.9,  H: 1.32, P: 0.88, kap: 0.86, kuf: 0.84, sk: [0.18, 0.3, 0.54, 0.66], kr: 0.34 },
  suvlux:   { nazov: 'Luxusné SUV',  L: 4.95,W: 1.95, H: 1.74, P: 1.14, kap: 1.04, kuf: 1.1,  sk: [0.03, 0.07, 0.63, 0.76], kr: 0.39 },
  zachranka:{ nazov: 'Záchranka',    L: 5.9, W: 2.0,  H: 2.6,  P: 1.25, kap: 1.05, kuf: 2.55, sk: [0.72, 0.72, 0.8, 0.88],  kr: 0.36, skrina: true },
  pretek:   { nazov: 'Pretekárske',  L: 4.5, W: 1.95, H: 1.1,  P: 0.74, kap: 0.55, kuf: 0.78, sk: [0.3, 0.4, 0.56, 0.7],   kr: 0.34 },
  sport:    { nazov: 'Športové',     L: 4.4, W: 1.88, H: 1.22, P: 0.82, kap: 0.7,  kuf: 0.8,  sk: [0.18, 0.32, 0.56, 0.74], kr: 0.33 },
};

function auto(typ, lak, opt = {}) {
  const taxi = opt.taxi || null;
  const T = TYPY[typ], { L, W, H, P, kr } = T, g = new THREE.Group();
  const z = (f) => -L / 2 + f * L, dno = 0.22;
  // spodok karosérie (po pás)
  const telo = [[z(0), dno], [z(0), T.kuf], [z(T.sk[0]), P], [z(T.sk[3]), P], [z(0.97), T.kap], [z(1), T.kap - 0.12], [z(1), dno]];
  if (T.skrina) telo.splice(1, 2, [z(0), H - 0.05], [z(T.sk[0]), H - 0.05], [z(T.sk[0]), P]);
  g.add(profil(telo, W, lak));
  // skleník: sklo trochu užšie, strecha v laku
  const s = T.sk, hs = T.skrina ? H - 0.12 : H - 0.06;
  g.add(profil([[z(s[0]) + 0.04, P - 0.01], [z(s[1]) + 0.04, hs], [z(s[2]) - 0.04, hs], [z(s[3]) - 0.04, P - 0.01]], W - 0.1, SKLO));
  g.add(profil([[z(s[1]), hs - 0.01], [z(s[1]) + 0.03, H], [z(s[2]) - 0.03, H], [z(s[2]), hs - 0.01]], W - 0.06, lak));
  // B stĺpik
  if (!T.skrina) g.add(box(W - 0.08, hs - P, 0.08, lak, 0, (hs + P) / 2, z((s[1] + s[2]) / 2)));
  if (T.korba) g.add(box(W - 0.2, 0.05, z(s[0]) - z(0.03), PLAST, 0, P - 0.02, (z(0.03) + z(s[0])) / 2));
  // svetlá, nárazníky
  for (const x of [-1, 1]) {
    g.add(box(0.34, 0.1, 0.04, '#F2F1E6', x * (W / 2 - 0.25), T.kap - 0.2, L / 2 + 0.01));
    g.add(box(0.3, 0.12, 0.04, '#B3141B', x * (W / 2 - 0.22), T.kuf - 0.18, -L / 2 - 0.01));
  }
  g.add(box(W + 0.02, 0.14, 0.12, PLAST, 0, dno + 0.1, L / 2 - 0.04)); g.add(box(W + 0.02, 0.14, 0.12, PLAST, 0, dno + 0.1, -L / 2 + 0.04));
  // kolesá
  const zp = L / 2 - Math.max(0.78, L * 0.19), zz = -L / 2 + Math.max(0.72, L * 0.18);
  for (const x of [-1, 1]) for (const zk of [zp, zz]) g.add(koleso(kr, 0.24, x * (W / 2 - 0.1), kr, zk));
  // taxík: svetlo na streche + pruh / nálepky
  if (taxi) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.24), [M(taxi.farba), M(taxi.farba), M(taxi.farba), M(taxi.farba), napis(taxi.text, taxi.farba, taxi.pismo, 0.62, 0.2), napis(taxi.text, taxi.farba, taxi.pismo, 0.62, 0.2)]);
    lamp.position.set(0, H + 0.1, z((s[1] + s[2]) / 2)); g.add(lamp);
    if (taxi.pruh) for (const x of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.55, 0.16), napis(taxi.pruhText || '', taxi.pruh, '#FFFFFF', L * 0.55, 0.16));
      p.position.set(x * (W / 2 + 0.006), P - 0.22, 0.1); p.rotation.y = x * Math.PI / 2; g.add(p);
    }
  }
  const zs = z((s[1] + s[2]) / 2);
  if (opt.pruh) for (const x of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.62, opt.pruhV || 0.22), napis(opt.text || '', opt.pruh, opt.pismo || '#FFF', L * 0.62, opt.pruhV || 0.22));
    p.position.set(x * (W / 2 + 0.006), P - 0.25, 0.05); p.rotation.y = x * Math.PI / 2; g.add(p);
  }
  if (opt.majak) { g.add(box(1.1, 0.12, 0.26, opt.majak, 0, H + 0.06, T.skrina ? z(s[1]) + 0.3 : zs)); if (T.skrina) g.add(box(0.5, 0.1, 0.12, opt.majak, 0, H + 0.05, -L / 2 + 0.2)); }
  if (opt.spojler) { g.add(box(W - 0.1, 0.05, 0.36, opt.spojler, 0, T.kuf + 0.3, -L / 2 + 0.25)); for (const x of [-0.6, 0.6]) g.add(box(0.05, 0.3, 0.1, opt.spojler, x, T.kuf + 0.14, -L / 2 + 0.25)); }
  if (opt.cislo) for (const x of [-1, 1]) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), napis(opt.cislo, '#FFFFFF', '#111', 0.56, 0.56)); p.position.set(x * (W / 2 + 0.006), (P + 0.3) / 2 + 0.1, 0.2); p.rotation.y = x * Math.PI / 2; g.add(p); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// nákladné, traktory, monster truck – rovnaký štýl (kabína + nadstavba)
function nakladne(druh, lak) {
  const g = new THREE.Group(), W = 2.4, kr = 0.52;
  const kab = (z0, d, h, c) => { g.add(box(W, h - 0.5, d, c, 0, 0.5 + (h - 0.5) / 2, z0)); g.add(box(W - 0.1, 0.55, 0.06, SKLO, 0, h - 0.45, z0 + d / 2 + 0.01)); for (const x of [-1, 1]) g.add(box(0.06, 0.5, d * 0.5, SKLO, x * (W / 2 + 0.005), h - 0.45, z0 + d * 0.12)); };
  const kolesa = (zs, r = kr, w = W, s = 0.38) => { for (const x of [-1, 1]) for (const zk of zs) g.add(koleso(r, s, x * (w / 2 - 0.12), r, zk)); };
  if (druh === 'nakladiak' || druh === 'hasici' || druh === 'smetiari' || druh === 'valnik' || druh === 'valnikMaly') {
    const maly = druh === 'valnikMaly', L = maly ? 6.0 : 8.4, Wk = maly ? 2.0 : W;
    const zk = L / 2 - 1.0; kab(zk, maly ? 1.6 : 2.0, maly ? 2.3 : 3.0, druh === 'hasici' ? '#C4161C' : lak);
    g.add(box(Wk, 0.25, L - (maly ? 1.7 : 2.1), PLAST, 0, 0.75, -0.95));
    const zn = -0.95 - (maly ? 0 : 0.05), Ln = L - (maly ? 1.8 : 2.2);
    if (druh === 'nakladiak') g.add(box(W, 2.6, Ln, '#E9ECEC', 0, 0.9 + 1.3, zn));
    if (druh === 'hasici') { g.add(box(W, 2.0, Ln, '#C4161C', 0, 0.9 + 1.0, zn)); g.add(box(W + 0.02, 0.18, Ln, '#F2F2F2', 0, 1.5, zn)); g.add(box(0.5, 0.12, Ln + 1.2, '#B9BEC3', 0.4, 3.0, zn + 0.6)); g.add(box(1.1, 0.12, 0.26, '#1E5BFF', 0, 3.06, zk + 0.6)); }
    if (druh === 'smetiari') { g.add(box(W, 2.5, Ln, lak, 0, 0.9 + 1.25, zn)); g.add(box(W + 0.02, 0.2, Ln, '#F2F2F2', 0, 1.6, zn)); g.add(box(W - 0.2, 1.8, 0.6, PLAST, 0, 1.8, zn - Ln / 2 - 0.25)); g.add(box(0.8, 0.12, 0.24, '#F5A300', 0, 3.06, zk + 0.6)); }
    if (druh === 'valnik' || maly) { g.add(box(Wk, 0.1, Ln, '#8A8F93', 0, 0.95, zn)); for (const x of [-1, 1]) g.add(box(0.06, 0.45, Ln, lak, x * Wk / 2, 1.2, zn)); g.add(box(Wk, 0.45, 0.06, lak, 0, 1.2, zn - Ln / 2)); }
    kolesa(maly ? [zk, -L / 2 + 1.2] : [zk, -L / 2 + 1.9, -L / 2 + 0.85], maly ? 0.38 : kr, Wk);
  } else if (druh === 'traktor' || druh === 'nakladac' || druh === 'traktorPol') {
    const c = druh === 'traktorPol' ? '#EDEFEF' : lak;
    g.add(box(1.1, 0.9, 1.7, c, 0, 1.15, 0.7)); g.add(box(0.9, 0.12, 0.06, '#F2F1E6', 0, 1.25, 1.56));
    g.add(box(1.6, 0.1, 1.5, c, 0, 2.75, -0.6)); g.add(box(1.5, 1.15, 1.4, SKLO, 0, 2.15, -0.6)); g.add(box(1.4, 0.7, 1.4, c, 0, 1.2, -0.6));
    for (const x of [-1, 1]) { g.add(koleso(0.78, 0.5, x * 1.05, 0.78, -0.7)); g.add(koleso(0.45, 0.32, x * 0.78, 0.45, 1.1)); }
    if (druh === 'nakladac') { g.add(box(2.1, 0.7, 0.5, '#5A5F64', 0, 0.55, 2.3)); for (const x of [-0.55, 0.55]) g.add(box(0.12, 0.12, 1.3, '#5A5F64', x, 1.0, 1.7)); }
    if (druh === 'traktorPol') { g.add(box(1.0, 0.12, 0.26, '#1E5BFF', 0, 2.86, -0.6)); g.add(box(1.42, 0.2, 1.42, '#1E5BFF', 0, 1.3, -0.6)); }
  } else if (druh === 'monster') {
    const a = auto('pickup', lak); a.position.y = 0.95; a.scale.setScalar(1.05); a.traverse((o) => { if (o.geometry?.type === 'CylinderGeometry') o.visible = false; }); g.add(a);
    for (const x of [-1, 1]) for (const zk of [1.7, -1.7]) g.add(koleso(0.95, 0.75, x * 1.25, 0.95, zk));
    g.add(box(0.2, 0.9, 3.0, '#5A5F64', 0, 0.95, 0));
  } else if (druh === 'futur') {
    g.add(profil([[-2.2, 0.2], [-2.2, 0.7], [-0.6, 0.85], [0.1, 1.05], [0.7, 0.8], [2.3, 0.35], [2.3, 0.2]], 1.95, lak));
    g.add(profil([[-0.55, 0.84], [0.05, 1.02], [0.65, 0.79]], 1.3, SKLO)); g.add(box(1.9, 0.05, 0.45, PLAST, 0, 1.1, -2.0));
    for (const x of [-1, 1]) for (const zk of [1.45, -1.4]) g.add(koleso(0.36, 0.34, x * 0.92, 0.36, zk));
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// --- farby podľa reality (Európa 2025 + staršie autá v uliciach majú viac striebornej) ---
export const FARBY = [
  { meno: 'Sivá', podiel: 23, odtiene: ['#6B7075', '#4D5257', '#8A8F93'] },
  { meno: 'Biela', podiel: 22, odtiene: ['#EDEFEF', '#E2E4E1'] },
  { meno: 'Čierna', podiel: 20, odtiene: ['#17191C', '#22252A'] },
  { meno: 'Strieborná', podiel: 12, odtiene: ['#B7BCC1', '#A4AAB0'] },
  { meno: 'Modrá', podiel: 10, odtiene: ['#1F3B6E', '#35609A', '#14233F'] },
  { meno: 'Červená', podiel: 7, odtiene: ['#A11B20', '#7A1A22'] },
  { meno: 'Zelená', podiel: 2, odtiene: ['#2F5640', '#5E7A4E'] },
  { meno: 'Hnedá / béžová', podiel: 2, odtiene: ['#6B5542', '#B8A685'] },
  { meno: 'Žltá / oranžová', podiel: 1, odtiene: ['#E0A21B', '#D9631E'] },
  { meno: 'Iná (bordová, fialová)', podiel: 1, odtiene: ['#5A1B2C', '#4B3762'] },
];
// zastúpenie typov v doprave (ako v tabuľke #97)
const VAHY_TYPOV = { hatchback: 26, kombi: 18, suv: 20, sedan: 13, mestske: 9, mpv: 7, dodavka: 4, pickup: 1, sport: 1 };
let semienko = 20261121; const rnd = () => ((semienko = (semienko * 1664525 + 1013904223) >>> 0) / 4294967296);
const vazeny = (pary) => { const sum = pary.reduce((a, [, w]) => a + w, 0); let x = rnd() * sum; for (const [k, w] of pary) if ((x -= w) < 0) return k; return pary[0][0]; };
const nahodnaFarba = (typ) => {
  if (typ === 'dodavka' && rnd() < 0.6) return '#EDEFEF'; // dodávky sú väčšinou biele
  const f = vazeny(FARBY.map((f) => [f, f.podiel])); return f.odtiene[Math.floor(rnd() * f.odtiene.length)];
};

// --- scéna ---
const zem = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), M('#CFD3CC')); zem.rotation.x = -Math.PI / 2; zem.receiveShadow = true; sc.add(zem);
const kam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 300);
const TAXI = {
  klasik1: { farba: '#F5C400', pismo: '#111', text: 'TAXI' },
  klasik2: { farba: '#F5C400', pismo: '#111', text: 'TAXI', pruh: '#F5C400', pruhText: '' },
  klasik3: { farba: '#FFFFFF', pismo: '#C01818', text: 'TAXI' },
  hlados: { farba: '#009DE0', pismo: '#FFF', text: 'HLADOŠ', pruh: '#009DE0', pruhText: 'HLADOŠ' },
  ficak: { farba: '#2DBE6C', pismo: '#FFF', text: 'FIČÁK', pruh: '#2DBE6C', pruhText: 'FIČÁK' },
};
function stitok(text, x, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.15), napis(text, '#CFD3CC', '#2B2F33', 8, 1.15));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); sc.add(m);
}

if (POHLAD === '3') {
  const POL = { pruh: '#1E4FA8', text: 'POLÍCIA', majak: '#1E5BFF' };
  const zoznam = [
    ['Mestské', () => auto('mestske', '#35609A')], ['Hatchback', () => auto('hatchback', '#EDEFEF')], ['Sedan', () => auto('sedan', '#6B7075')],
    ['Kombi', () => auto('kombi', '#B7BCC1')], ['SUV', () => auto('suv', '#17191C')], ['Luxusné SUV', () => auto('suvlux', '#22252A')],
    ['Osobná dodávka', () => auto('mpv', '#4D5257')], ['Dodávka', () => auto('dodavka', '#EDEFEF')], ['Pickup', () => auto('pickup', '#A11B20')],
    ['Športové', () => auto('sport', '#E0A21B')], ['Muscle', () => auto('muscle', '#14233F', { pruh: '#EDEFEF', pruhV: 0.12 })], ['Taxi', () => auto('sedan', '#EDEFEF', { taxi: TAXI.klasik1 })],
    ['Polícia sedan', () => auto('sedan', '#EDEFEF', POL)], ['Polícia SUV', () => auto('suv', '#EDEFEF', POL)], ['Polícia športové', () => auto('sport', '#EDEFEF', POL)],
    ['Polícia muscle', () => auto('muscle', '#14233F', { ...POL, pruh: '#EDEFEF', pismo: '#14233F' })], ['Záchranka', () => auto('zachranka', '#F2C500', { pruh: '#C8102E', text: 'ZÁCHRANKA', majak: '#1E5BFF' })], ['Hasiči', () => nakladne('hasici')],
    ['Nákladiak', () => nakladne('nakladiak', '#35609A')], ['Valník', () => nakladne('valnik', '#6B7075')], ['Malý valník', () => nakladne('valnikMaly', '#EDEFEF')],
    ['Smetiari', () => nakladne('smetiari', '#E36B12')], ['Traktor', () => nakladne('traktor', '#2F7A3A')], ['Nakladač', () => nakladne('nakladac', '#E0A21B')],
    ['Policajný traktor', () => nakladne('traktorPol')], ['Pretekárske', () => auto('pretek', '#C8102E', { spojler: '#17191C', cislo: '7' })], ['Futuristické', () => nakladne('futur', '#6E3FB8')],
    ['Monster truck', () => nakladne('monster', '#2D6BD8')],
  ];
  const STLP = 7, DX = 9.2, DZ = 12;
  zoznam.forEach(([n, f], i) => {
    const c = i % STLP, rr = Math.floor(i / STLP), x = (c - (STLP - 1) / 2) * DX, zz = (rr - 1.5) * DZ;
    const a = f(); a.position.set(x, 0, zz); a.rotation.y = -0.6; sc.add(a); stitok(n, x, zz + 3.6);
  });
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 35, bottom: -35 }); sun.shadow.camera.updateProjectionMatrix();
  kam.fov = 17; kam.updateProjectionMatrix(); kam.position.set(0, 95, 118); kam.lookAt(0, 0, 2.5);
} else if (POHLAD === '1') {
  // katalóg typov (rad vzadu) + taxíky (rad vpredu)
  const typy = Object.keys(TYPY), lak = ['#35609A', '#EDEFEF', '#6B7075', '#B7BCC1', '#A11B20', '#17191C', '#EDEFEF', '#4D5257', '#E0A21B'];
  typy.forEach((t, i) => { const a = auto(t, lak[i]); a.position.set(-19 + i * 4.75, 0, -4); a.rotation.y = -0.55; sc.add(a); stitok(TYPY[t].nazov, -19 + i * 4.75, -1.0); });
  const tx = [['sedan', '#EDEFEF', 'klasik1', 'Taxi – sedan'], ['kombi', '#17191C', 'klasik1', 'Taxi – kombi'], ['kombi', '#B7BCC1', 'klasik3', 'Taxi – kombi'], ['mpv', '#17191C', 'klasik1', 'Taxi – van'],
    ['sedan', '#F5C400', 'klasik2', 'Taxi – žltý'], ['hatchback', '#EDEFEF', 'hlados', 'Hladoš taxi'], ['kombi', '#EDEFEF', 'ficak', 'Fičák taxi']];
  tx.forEach(([t, l, k, n], i) => { const a = auto(t, l, { taxi: TAXI[k] }); a.position.set(-15 + i * 5, 0, 3.6); a.rotation.y = -0.55; sc.add(a); stitok(n, -15 + i * 5, 6.6); });
  kam.position.set(0, 21, 47); kam.lookAt(0, 0, 0.8);
} else {
  // ulica: dva pruhy parkujúcich áut s náhodným typom a farbou
  const cesta = new THREE.Mesh(new THREE.PlaneGeometry(200, 9), M('#5B5F63')); cesta.rotation.x = -Math.PI / 2; cesta.position.y = 0.005; cesta.receiveShadow = true; sc.add(cesta);
  for (let x = -60; x < 60; x += 4) { const c = box(2, 0.01, 0.15, '#E8E8E8', x, 0.012, 0); c.castShadow = false; sc.add(c); }
  const pocet = {}; let n = 0;
  for (const [zr, rot] of [[-3.1, Math.PI / 2], [3.1, -Math.PI / 2]]) {
    let x = -52;
    while (x < 52) {
      const t = rnd() < 0.03 ? 'sedan' : vazeny(Object.entries(VAHY_TYPOV));
      const jeTaxi = rnd() < 0.03;
      const lak = nahodnaFarba(t);
      const a = auto(t, lak, jeTaxi ? { taxi: TAXI.klasik1 } : {});
      const L = TYPY[t].L; x += L / 2;
      a.position.set(x, 0, zr); a.rotation.y = rot; sc.add(a); x += L / 2 + 0.7 + rnd() * 0.8;
      const fm = FARBY.find((f) => f.odtiene.includes(lak))?.meno || 'Biela'; pocet[fm] = (pocet[fm] || 0) + 1; n++;
    }
  }
  console.log('pocet', n, JSON.stringify(pocet));
  kam.position.set(-4, 30, 40); kam.lookAt(2, 0, 0);
  // legenda
  const lg = document.createElement('div');
  lg.style.cssText = 'position:fixed;left:18px;top:16px;background:rgba(255,255,255,.92);padding:12px 16px;border-radius:10px;font:14px/1.5 system-ui,sans-serif;color:#222';
  lg.innerHTML = '<b>Farby áut (podiel v hre)</b><br>' + FARBY.map((f) => `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${f.odtiene[0]};border:1px solid #999;margin-right:6px;vertical-align:-1px"></span>${f.meno} – ${f.podiel} %`).join('<br>');
  document.body.appendChild(lg);
}
r.render(sc, kam); document.body.dataset.hotovo = '1';
