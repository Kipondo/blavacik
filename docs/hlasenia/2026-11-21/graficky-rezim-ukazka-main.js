// Referenčná ukážka jednoduchého grafického režimu (three.js r170, dáta Blavačíka).
// Vzor pre issue „Nápad: jednoduchý grafický režim“, nie je to kód hry.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

window.LOGM = new URLSearchParams(location.search).has('logm');
const D = JSON.parse(document.getElementById('data').textContent);
const MODELY = JSON.parse(document.getElementById('modely').textContent);
const Q = new URLSearchParams(location.search);

// ---------- paleta štýlu A ----------
const STENY = ['#F3E9D2', '#F2D0A4', '#E9C46A', '#E59A7A', '#9CC5D9', '#BFD8B8', '#ECE6DC', '#D9CBB5', '#C9D3DC', '#F4C9A8'];
const STRECHY_CERVENE = ['#C9574A', '#B04A3F', '#BF6A4A'];
const STRECHY_SIVE = ['#7D8790', '#8E979E'];
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL = STENY.map(hexRgb);
function najblizsia(hex, pal = PAL, zoznam = STENY) {
  const [r, g, b] = hexRgb(hex);
  let best = 0, bd = 1e9;
  pal.forEach(([R, G, B], i) => { const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = i; } });
  return zoznam[best];
}
function strechaFarba(hex, i) {
  const [r, g, b] = hexRgb(hex);
  return r > g + 25 ? STRECHY_CERVENE[i % 3] : STRECHY_SIVE[i % 2];
}

// ---------- terén ----------
const T = D.teren;
function vyska(x, z) {
  const fx = Math.min(Math.max((x - T.x0) / T.k, 0), T.nx - 1.001);
  const fz = Math.min(Math.max((z - T.z0) / T.k, 0), T.nz - 1.001);
  const c = Math.floor(fx), r = Math.floor(fz), tx = fx - c, tz = fz - r;
  const v = (rr, cc) => T.v[rr * T.nx + cc] / 10;
  return (v(r, c) * (1 - tx) + v(r, c + 1) * tx) * (1 - tz) + (v(r + 1, c) * (1 - tx) + v(r + 1, c + 1) * tx) * tz;
}

// ---------- renderer, scéna ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('snimka') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scena = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 2, 4000);
const ovladanie = new OrbitControls(kamera, renderer.domElement);
ovladanie.enableDamping = true;
ovladanie.maxPolarAngle = Math.PI * 0.495;

const CASY = {
  den: { voda: '#4E8EA8', vrch: '#6FA6D6', horizont: '#D7E6EE', slnkoF: '#FFF1DA', slnko: 2.9, hemi: 0.8, hemiSky: '#DDEBFA', hemiZem: '#9AA88A', smer: [-0.5, 0.9, 0.45], noc: 0, mrak: '#FFFFFF', exp: 1.0 },
  zapad: { voda: '#3D5F78', vrch: '#5D6FA8', horizont: '#F2B48A', slnkoF: '#FFB070', slnko: 2.2, hemi: 0.75, hemiSky: '#B7A6C8', hemiZem: '#7A6A5A', smer: [-0.9, 0.22, 0.35], noc: 0.35, mrak: '#F7C6B0', exp: 1.05 },
  hracka: { voda: '#5FA8C4', vrch: '#8EC5EA', horizont: '#E4F1F7', slnkoF: '#FFFFFF', slnko: 1.3, hemi: 1.45, hemiSky: '#F2F8FF', hemiZem: '#C8D6B4', smer: [-0.5, 0.9, 0.45], noc: 0, mrak: '#FFFFFF', exp: 1.0 },
  retro: { voda: '#5C8090', vrch: '#8FA8C0', horizont: '#DCCBA6', slnkoF: '#FFE2B4', slnko: 2.7, hemi: 0.7, hemiSky: '#D8D2C0', hemiZem: '#8A7E66', smer: [-0.6, 0.6, 0.4], noc: 0, mrak: '#EFE2C8', exp: 0.95 },
  modra: { voda: '#2C4766', vrch: '#28366E', horizont: '#7E86B8', slnkoF: '#C8B8FF', slnko: 0.9, hemi: 0.8, hemiSky: '#8C96D0', hemiZem: '#3E4260', smer: [-0.9, 0.12, 0.3], noc: 0.8, mrak: '#6A6E9E', exp: 1.1 },
  noc: { voda: '#1A2A44', vrch: '#141A3A', horizont: '#3A3F6E', slnkoF: '#9FB2FF', slnko: 0.35, hemi: 0.55, hemiSky: '#7A88C8', hemiZem: '#33384F', smer: [0.3, 0.8, -0.4], noc: 1, mrak: '#4A4F78', exp: 1.1 },
};
scena.fog = new THREE.Fog('#D7E6EE', 300, 1700);
const hemi = new THREE.HemisphereLight('#DDEBFA', '#9AA88A', 1);
const slnko = new THREE.DirectionalLight('#FFF1DA', 2.4);
slnko.castShadow = true;
slnko.shadow.mapSize.set(2048, 2048);
Object.assign(slnko.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1600 });
slnko.shadow.bias = -0.0006; slnko.shadow.normalBias = 0.6;
scena.add(hemi, slnko, slnko.target);
const oblohaU = { uVrch: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uMrak: { value: new THREE.Color() }, uSlnko: { value: new THREE.Vector3() }, uSlnkoF: { value: new THREE.Color() } };
const obloha = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: oblohaU,
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uVrch, uHor, uMrak, uSlnkoF; uniform vec3 uSlnko; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      float y = max(vD.y, 0.0);
      vec3 c = mix(uHor, uVrch, pow(y, 0.55));
      float s = max(dot(normalize(vD), normalize(uSlnko)), 0.0);
      c += uSlnkoF * (pow(s, 300.0) * 1.5 + pow(s, 8.0) * 0.25);
      vec2 uv = vD.xz / max(vD.y + 0.12, 0.05) * 1.6;
      float m = smoothstep(0.52, 0.78, fbm(uv + vec2(3.0, 1.0)));
      c = mix(c, uMrak, m * 0.55 * smoothstep(0.02, 0.25, vD.y));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
scena.add(obloha);
const U = { uNoc: { value: 0 }, uPix: { value: 0 }, uOkno: { value: new THREE.Vector4(3.4, 3.0, 0.5, 0.4) }, uOknoF: { value: new THREE.Color('#2A3540') }, uRam: { value: 0 }, uSat: { value: 1 } };

// ---------- zem: jedna textúra pre celú plochu (žiadne prekrývanie vrstiev) ----------
const [X0, , Z0] = [T.x0, 0, T.z0];
const SIR = (T.nx - 1) * T.k, HLB = (T.nz - 1) * T.k;
const PX = 2.2;
const cv = document.createElement('canvas');
cv.width = Math.round(SIR * PX); cv.height = Math.round(HLB * PX);
const g2 = cv.getContext('2d');
const px = ([x, z]) => [(x - X0) * PX, (z - Z0) * PX];
function poly(b, farba) { g2.beginPath(); b.forEach((p, i) => { const [a, c] = px(p); i ? g2.lineTo(a, c) : g2.moveTo(a, c); }); g2.closePath(); g2.fillStyle = farba; g2.fill(); }
function ciara(b, sirka, farba, dash) { g2.beginPath(); b.forEach((p, i) => { const [a, c] = px(p); i ? g2.lineTo(a, c) : g2.moveTo(a, c); }); g2.lineWidth = sirka * PX; g2.strokeStyle = farba; g2.lineCap = 'round'; g2.lineJoin = 'round'; g2.setLineDash(dash || []); g2.stroke(); g2.setLineDash([]); }
g2.fillStyle = '#B4CE92'; g2.fillRect(0, 0, cv.width, cv.height);
function vzor(zaklad, ciary, krok, sum) {
  const t = document.createElement('canvas'); t.width = t.height = 32; const c = t.getContext('2d');
  c.fillStyle = zaklad; c.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${sum * Math.random()})`; c.fillRect(Math.random() * 32, Math.random() * 32, 2, 2); }
  if (ciary) { c.strokeStyle = ciary; c.lineWidth = 1; for (let k = 0; k <= 32; k += krok) { c.beginPath(); c.moveTo(k + 0.5, 0); c.lineTo(k + 0.5, 32); c.moveTo(0, k + 0.5); c.lineTo(32, k + 0.5); c.stroke(); } }
  return g2.createPattern(t, 'repeat');
}
const VZ = { trava: vzor('#A9C98A', null, 0, 0.10), dlazba: vzor('#E2D7C2', null, 0, 0.06), chodnik: vzor('#DCD3C3', null, 0, 0.05), cesta: vzor('#868C93', null, 0, 0.08), les: vzor('#7FAE6C', null, 0, 0.12) };
g2.fillStyle = VZ.trava; g2.fillRect(0, 0, cv.width, cv.height);
const POKR = { trava: VZ.trava, les: VZ.les, parkovisko: VZ.cesta, dlazba: VZ.dlazba, ihrisko: '#C5DD9C', stavenisko: '#D9C9A8', cintorin: '#A3C38E' };
for (const p of D.pokryvka) poly(p.b, POKR[p.k] || VZ.trava);
for (const v of D.voda) poly(v, '#6FB1C9');
for (const c of D.chodniky) ciara(c.b, Math.max(c.w, 1.6), VZ.chodnik);
for (const c of D.cesty) ciara(c.b, c.w + 1.2, '#B9B4AA');
for (const c of D.cesty) ciara(c.b, c.w, VZ.cesta);
for (const c of D.cesty) if (['secondary', 'tertiary', 'nadjazd'].includes(c.t)) ciara(c.b, 0.25, '#EEF0F2', [3 * PX, 4 * PX]);
for (const k of D.kolaje) { ciara(k, 2.6, '#7C7A76'); ciara(k, 0.3, '#B8B6B0'); }
const texZem = new THREE.CanvasTexture(cv);
texZem.colorSpace = THREE.SRGBColorSpace;
texZem.anisotropy = 8;
const geoZem = new THREE.PlaneGeometry(SIR, HLB, T.nx - 1, T.nz - 1);
geoZem.rotateX(-Math.PI / 2);
geoZem.translate(X0 + SIR / 2, 0, Z0 + HLB / 2);
const pz = geoZem.getAttribute('position');
for (let i = 0; i < pz.count; i++) pz.setY(i, T.v[i] / 10);
geoZem.computeVertexNormals();
const matZem = new THREE.MeshLambertMaterial({ map: texZem });
matZem.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWZ;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvWZ = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWZ;').replace('#include <map_fragment>', `#include <map_fragment>
    float dlz = smoothstep(0.55, 0.7, dot(diffuseColor.rgb, vec3(0.333)));
    float blizko = 1.0 - smoothstep(25.0, 90.0, distance(vWZ, cameraPosition));
    vec2 q = vWZ.xz / vec2(0.9, 0.6); q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 f = fract(q);
    float spara = 1.0 - step(0.06, f.x) * step(0.08, f.y);
    float sum = fract(sin(dot(floor(q), vec2(12.9898, 78.233))) * 43758.5453);
    diffuseColor.rgb *= 1.0 - blizko * (dlz * (spara * 0.18 + sum * 0.06) + (1.0 - dlz) * sum * 0.08);`);
};
const zem = new THREE.Mesh(geoZem, matZem);
zem.receiveShadow = true;
scena.add(zem);

// ---------- budovy: všetky v jednej geometrii = 1 kreslenie ----------
const pos = [], col = [], zak = [], vrch = [], okn = [], typy = [], smery = [];
let TYP = 0, SMER = [0, 0];
const c3 = new THREE.Color();
function trojuholnik(a, b, c, farba, zaklad, top, okna) {
  pos.push(...a, ...b, ...c);
  c3.set(farba);
  for (let i = 0; i < 3; i++) { col.push(c3.r, c3.g, c3.b); zak.push(zaklad); vrch.push(top); okn.push(okna); typy.push(TYP); smery.push(SMER[0], SMER[1]); }
}
D.budovy.forEach((b, idx) => {
  let body = b.b;
  if (body.length > 2 && body[0][0] === body[body.length - 1][0] && body[0][1] === body[body.length - 1][1]) body = body.slice(0, -1);
  if (body.length < 3) return;
  let zaklad = Infinity;
  for (const [x, z] of body) zaklad = Math.min(zaklad, vyska(x, z));
  const h = Math.max(b.h, 3), top = zaklad + h;
  const stena = '#' + new THREE.Color(najblizsia(b.f)).multiplyScalar(0.93 + ((idx * 37) % 11) / 100).getHexString();
  const okna = h > 5 ? 1 : 0;
  TYP = b.s ? 0 : h > 42 ? 2 : h >= 14 ? 1 : 0;
  for (let i = 0; i < body.length; i++) {
    const [x1, z1] = body[i], [x2, z2] = body[(i + 1) % body.length];
    const L = Math.hypot(x2 - x1, z2 - z1) || 1; SMER = [(x2 - x1) / L, (z2 - z1) / L];
    if (SMER[0] < -1e-4 || (Math.abs(SMER[0]) <= 1e-4 && SMER[1] < 0)) SMER = [-SMER[0], -SMER[1]];
    const a = [x1, zaklad - 2, z1], bb = [x2, zaklad - 2, z2], c = [x2, top, z2], d = [x1, top, z1];
    trojuholnik(a, bb, c, stena, zaklad, top, okna);
    trojuholnik(a, c, d, stena, zaklad, top, okna);
  }
  SMER = [0, 0];
  const v2 = body.map(([x, z]) => new THREE.Vector2(x, z));
  if (b.s) {
    const sf = strechaFarba(b.r, idx);
    let cx = 0, cz = 0; body.forEach(([x, z]) => { cx += x; cz += z; }); cx /= body.length; cz /= body.length;
    let plocha = Math.abs(THREE.ShapeUtils.area(v2));
    const hr = Math.min(b.hr > 0 ? b.hr + 1.2 : 3.5, Math.sqrt(plocha) * 0.45);
    const k = 0.42;
    const vnut = body.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
    for (let i = 0; i < body.length; i++) {
      const j = (i + 1) % body.length;
      const a = [body[i][0], top, body[i][1]], bb = [body[j][0], top, body[j][1]];
      const c = [vnut[j][0], top + hr, vnut[j][1]], d = [vnut[i][0], top + hr, vnut[i][1]];
      trojuholnik(a, bb, c, sf, zaklad, top, 2);
      trojuholnik(a, c, d, sf, zaklad, top, 2);
    }
    const tr = THREE.ShapeUtils.triangulateShape(vnut.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [p, q, r] of tr) trojuholnik([vnut[p][0], top + hr, vnut[p][1]], [vnut[q][0], top + hr, vnut[q][1]], [vnut[r][0], top + hr, vnut[r][1]], sf, zaklad, top, 0);
  } else {
    const tr = THREE.ShapeUtils.triangulateShape(v2, []);
    for (const [p, q, r] of tr) trojuholnik([body[p][0], top, body[p][1]], [body[q][0], top, body[q][1]], [body[r][0], top, body[r][1]], '#BDB9B0', zaklad, top, 0);
  }
});
const geoB = new THREE.BufferGeometry();
geoB.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
geoB.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
geoB.setAttribute('aZaklad', new THREE.Float32BufferAttribute(zak, 1));
geoB.setAttribute('aVrch', new THREE.Float32BufferAttribute(vrch, 1));
geoB.setAttribute('aOkna', new THREE.Float32BufferAttribute(okn, 1));
geoB.setAttribute('aTyp', new THREE.Float32BufferAttribute(typy, 1));
geoB.setAttribute('aSmer', new THREE.Float32BufferAttribute(smery, 2));
geoB.computeVertexNormals();

const matB = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
matB.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aZaklad; attribute float aVrch; attribute float aOkna; attribute float aTyp; attribute vec2 aSmer;\nvarying vec2 vSmer; varying vec3 vWP; varying float vZaklad; varying float vVrch; varying float vOkna; varying float vTyp;')
    .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vZaklad = aZaklad; vVrch = aVrch; vOkna = aOkna; vTyp = aTyp; vSmer = aSmer;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uNoc; uniform float uPix; uniform vec4 uOkno; uniform vec3 uOknoF; uniform float uRam; uniform float uSat; varying vec2 vSmer; varying vec3 vWP; varying float vZaklad; varying float vVrch; varying float vOkna; varying float vTyp;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 wn = normalize(cross(dFdx(vWP), dFdy(vWP)));
      float stena = 1.0 - step(0.5, abs(wn.y));
      float yy = vWP.y - vZaklad; float vys = vVrch - vZaklad;
      vec2 tg = normalize(vec2(-wn.z, wn.x) + 1e-5);
      float uu = dot(vWP.xz, vSmer);
      vec2 tex = vec2(0.0);
      if (uPix > 0.0) { tex = floor(vec2(uu, yy) / uPix); uu = (tex.x + 0.5) * uPix; yy = (tex.y + 0.5) * uPix; }
      float okno = 0.0, ram = 0.0, linka = 0.0, parapet = 0.0, fyW = 0.0, hyW = 0.0; vec2 bunka = vec2(0.0);
      if (vOkna > 0.5 && vOkna < 1.5) {
        float vp = vTyp > 0.5 ? uOkno.x * 0.82 : uOkno.x;
        float ya = uPix > 0.0 ? (floor(vWP.y / uPix) + 0.5) * uPix : vWP.y;
        float fy = fract(ya / vp), fu = fract(uu / uOkno.y);
        float hy = uOkno.z * 0.5, hw = uOkno.w * 0.5;
        float ok = step(abs(fy - 0.55), hy) * step(abs(fu - 0.5), hw);
        float rm = step(abs(fy - 0.55), hy + 0.07) * step(abs(fu - 0.5), hw + 0.07) - ok;
        float pas = step(1.6, yy) * step(yy, vys - 0.8);
        okno = ok * pas; ram = rm * pas * uRam;
        parapet = step(abs(fy - (0.55 - hy - 0.05)), 0.035) * step(abs(fu - 0.5), hw + 0.1) * pas;
        fyW = fy; hyW = hy;
        bunka = vec2(floor(uu / uOkno.y), floor(ya / vp));
      }
      bunka += vec2(7.0, 3.0);
      float nah = fract(sin(dot(bunka, vec2(12.9898, 78.233))) * 43758.5453);
      float svieti = okno * step(0.45, nah) * uNoc;
      vec3 sklo = mix(uOknoF, vec3(0.07, 0.09, 0.15), uNoc);
      float sed = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      diffuseColor.rgb = mix(vec3(sed), diffuseColor.rgb, uSat);
      diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb * 1.15 + 0.06, vec3(1.0)), ram);
      diffuseColor.rgb *= 1.0 - linka * 0.2;
      if (uPix > 0.0) {
        float zr = fract(sin(dot(tex, vec2(41.3, 289.1))) * 15731.743);
        diffuseColor.rgb *= 0.92 + 0.11 * zr;
        sklo *= 0.7 + 0.6 * fract(nah * 7.13);
        float zaves = step(0.55, fract(nah * 3.7)) * step(0.55 + hyW * 0.25, fyW);
        sklo = mix(sklo, vec3(0.80, 0.76, 0.68) * (1.0 - uNoc * 0.6), zaves * 0.75);
        diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb * 1.18 + 0.05, vec3(1.0)), parapet);
      }
      diffuseColor.rgb = mix(diffuseColor.rgb, sklo, okno);
      if (vOkna > 1.5) {
        float ry = uPix > 0.0 ? floor(vWP.y / (uPix * 0.8)) * uPix * 0.8 : vWP.y;
        diffuseColor.rgb *= 1.0 - step(0.8, fract(ry * 3.0)) * 0.16;
        if (uPix > 0.0) diffuseColor.rgb *= 0.92 + 0.1 * fract(sin(dot(floor(vWP.xz / uPix), vec2(12.7, 78.3))) * 4375.5);
      }`)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += svieti * mix(vec3(1.0, 0.80, 0.45), vec3(1.0, 0.93, 0.75), step(0.8, nah));');
};
const budovyMesh = new THREE.Mesh(geoB, matB);
budovyMesh.castShadow = budovyMesh.receiveShadow = true;
scena.add(budovyMesh);

// ---------- stromy: koruna z 3 gúľ + kmeň, instancovanie = 2 kreslenia ----------
const korunaGeo = mergeGeometries([[0, 0, 0, 1], [0.55, -0.25, 0.2, 0.75], [-0.45, -0.2, -0.3, 0.8]].map(([x, y, z, r]) => {
  const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); return g.toNonIndexed();
}));
const kmenGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 5); kmenGeo.translate(0, 0.5, 0);
const koruny = new THREE.InstancedMesh(korunaGeo, new THREE.MeshLambertMaterial({ flatShading: true }), D.stromy.length);
const kmene = new THREE.InstancedMesh(kmenGeo, new THREE.MeshLambertMaterial({ color: '#6B5340' }), D.stromy.length);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
const ZELENE = ['#5F9A4E', '#548C46', '#6CA657', '#4F8545', '#77AE5C'];
D.stromy.forEach(([x, z, h, r], i) => {
  const hh = Math.max(h, 5), rr = Math.max(Math.min(r, 6), 2), y0 = vyska(x, z);
  q.setFromEuler(new THREE.Euler(0, (i * 1.7) % 6.28, 0));
  ps.set(x, y0 + hh * 0.62, z); sc.set(rr, hh * 0.38, rr);
  koruny.setMatrixAt(i, m4.compose(ps, q, sc));
  koruny.setColorAt(i, c3.set(ZELENE[i % 5]));
  ps.set(x, y0, z); sc.set(1, hh * 0.5, 1);
  kmene.setMatrixAt(i, m4.compose(ps, q, sc));
});
koruny.castShadow = kmene.castShadow = true; koruny.receiveShadow = true;
scena.add(koruny, kmene);

// ---------- pouličné lampy + kruhy svetla v noci ----------
const lampGeo = mergeGeometries([new THREE.CylinderGeometry(0.09, 0.14, 5, 6).translate(0, 2.5, 0), new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4).rotateZ(Math.PI / 2).translate(0.5, 4.9, 0)]);
const hlavaGeo = new THREE.BoxGeometry(0.55, 0.22, 0.32).translate(1.05, 4.85, 0);
const lampy = new THREE.InstancedMesh(lampGeo, new THREE.MeshLambertMaterial({ color: '#2F4A3E' }), D.lampy.length);
const matHlava = new THREE.MeshLambertMaterial({ color: '#E8E4D8' });
const hlavy = new THREE.InstancedMesh(hlavaGeo, matHlava, D.lampy.length);
const kcv = document.createElement('canvas'); kcv.width = kcv.height = 64;
const kg = kcv.getContext('2d'); const gr = kg.createRadialGradient(32, 32, 0, 32, 32, 32);
gr.addColorStop(0, 'rgba(255,214,150,0.85)'); gr.addColorStop(0.5, 'rgba(255,190,110,0.35)'); gr.addColorStop(1, 'rgba(255,180,100,0)');
kg.fillStyle = gr; kg.fillRect(0, 0, 64, 64);
const matKruh = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(kcv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: true, polygonOffset: true, polygonOffsetFactor: -4 });
const kruhy = new THREE.InstancedMesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), matKruh, D.lampy.length);
D.lampy.forEach(([x, z], i) => {
  const y0 = vyska(x, z); q.setFromEuler(new THREE.Euler(0, (i * 2.3) % 6.28, 0)); sc.set(1, 1, 1);
  ps.set(x, y0, z); lampy.setMatrixAt(i, m4.compose(ps, q, sc)); hlavy.setMatrixAt(i, m4);
  ps.set(x, y0 + 0.15, z); kruhy.setMatrixAt(i, m4.compose(ps, q, sc));
});
scena.add(lampy, hlavy, kruhy);

// ---------- Dunaj: lesklá hladina ----------
const matVoda = new THREE.MeshPhongMaterial({ color: '#4E8EA8', specular: '#FFFFFF', shininess: 90, transparent: true, opacity: 0.92 });
for (const v of D.voda) {
  if (v.length < 3) continue;
  const tvar = new THREE.Shape(v.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(tvar); g.rotateX(Math.PI / 2);
  let hmin = Infinity; for (const [x, z] of v) hmin = Math.min(hmin, vyska(x, z));
  const vod = new THREE.Mesh(g, matVoda); vod.position.y = Math.min(hmin, -1) + 0.6; vod.receiveShadow = true;
  scena.add(vod);
}

// ---------- to, čo nás odlíši: život na Dunaji (vyhliadkové lode) ----------
function lod(farba, dlzka) {
  const g = new THREE.Group(), mt = (f) => new THREE.MeshLambertMaterial({ color: f, flatShading: true });
  const trup = new THREE.Mesh(new THREE.BoxGeometry(dlzka, 2.2, 7), mt('#F2F2EE')); trup.position.y = 1.1;
  const pruh = new THREE.Mesh(new THREE.BoxGeometry(dlzka + 0.1, 0.6, 7.1), mt(farba)); pruh.position.y = 0.4;
  const paluba = new THREE.Mesh(new THREE.BoxGeometry(dlzka * 0.7, 2.4, 5.8), mt('#E6EEF2')); paluba.position.set(-dlzka * 0.05, 3.4, 0);
  const okna = new THREE.Mesh(new THREE.BoxGeometry(dlzka * 0.68, 0.9, 5.9), mt('#3E5866')); okna.position.set(-dlzka * 0.05, 3.6, 0);
  const strecha = new THREE.Mesh(new THREE.BoxGeometry(dlzka * 0.74, 0.3, 6.2), mt(farba)); strecha.position.set(-dlzka * 0.05, 4.75, 0);
  g.add(trup, pruh, paluba, okna, strecha);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const LODE = [[lod('#C8102E', 34), 0, 470, 1], [lod('#1F5FAD', 26), 0.4, 640, -1], [lod('#2E8B57', 40), 0.75, 560, 1]];
for (const [l] of LODE) scena.add(l);
function pohniLode(t) {
  for (const [l, f, z, smer] of LODE) {
    const p = ((t * 0.012 + f) % 1);
    const x = -950 + (smer > 0 ? p : 1 - p) * 1400;
    l.position.set(x, -5.4 + Math.sin(t * 1.3 + f * 9) * 0.15, z);
    l.rotation.y = smer > 0 ? 0 : Math.PI;
  }
}

// ---------- dominanty: modely z hry, prefarbené do štýlu A ----------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
async function nacitaj(meno) {
  const bin = Uint8Array.from(atob(MODELY[meno]), (c) => c.charCodeAt(0));
  const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return new Promise((ok, chyba) => loader.parse(buf, '', (g) => ok(g.scene), chyba));
}
const cacheMat = new Map();
let aktualny = '';
function stylA(farba, nazov) {
  const hsl = {}; farba.getHSL(hsl, THREE.SRGBColorSpace); let pevne = false;
  let f;
  const MENA = [[/^strecha-veze/, '#5E9A82'], [/^strecha-5/, '#6E7A80'], [/^strecha$|skridla/, '#C9574A'], [/sklo-ufo/, '#5E7F8F'], [/sklo/, '#8DB6CC'],
    [/ufo-plech/, '#E6E9EC'], [/zlato/, '#E8B23A'], [/zivy-plot/, '#6FA35E'], [/voda/, '#6FB1C9'], [/svetlo-cerv/, '#E24B4A'], [/svetlo/, '#FFF2D0'],
    [/ocel|lana|zabradlie|hlinik|lampa/, '#C9CFD3'], [/chodnik|dlazba|beton/, '#CFC8BA'], [/dvere/, '#6B5240'], [/vankus/, '#9B2335'],
    [/omietka|obklad-[ef]|rimsy|sambrany|kominy/, '#F4F0E6'], [/kamen|sokel|kryt|portal/, '#D9CBB5']];
  for (const [re, ff] of MENA) if (re.test(nazov)) { f = ff; break; }
  if (aktualny === 'hrad-palac' && /^strecha/.test(nazov)) f = '#C9574A';
  if (f) pevne = true;
  else if (hsl.l > 0.62) f = '#F4F0E6';
  else if (hsl.h < 0.08 || hsl.h > 0.92) f = hsl.s > 0.25 ? '#C9574A' : '#D9CBB5';
  else if (hsl.h < 0.17) f = hsl.l > 0.45 ? '#E9D3A6' : '#B98E5A';
  else if (hsl.h < 0.45) f = '#7FAF6E';
  else if (hsl.h < 0.7) f = hsl.s > 0.2 ? '#6FA0B8' : '#8E979E';
  else f = '#9A93B5';
  if (!pevne && hsl.l < 0.2) f = '#5D6670';
  if (!cacheMat.has(f)) cacheMat.set(f, new THREE.MeshLambertMaterial({ color: f, flatShading: true, side: THREE.DoubleSide }));
  return cacheMat.get(f);
}
function zlucPrefarbene(model, posun) {
  model.updateMatrixWorld(true);
  const podlaMat = new Map();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const g = new THREE.BufferGeometry();
    for (const n of ['position', 'normal']) {
      const a = o.geometry.getAttribute(n); if (!a) continue;
      const arr = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
      g.setAttribute(n, new THREE.BufferAttribute(arr, a.itemSize));
    }
    if (o.geometry.index) g.setIndex(Array.from(o.geometry.index.array));
    for (const gr of o.geometry.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.applyMatrix4(o.matrixWorld);
    const geos = mats.length > 1 && g.groups.length ? g.groups.map((gr) => {
      const idx = g.index ? g.index.array.slice(gr.start, gr.start + gr.count) : null;
      const sub = g.clone(); if (idx) sub.setIndex(Array.from(idx)); sub.clearGroups(); return [sub, mats[gr.materialIndex]];
    }) : [[g, mats[0]]];
    for (const [sub, m] of geos) {
      const mat = stylA(m.color || new THREE.Color('#dddddd'), m.name || ''); if (window.LOGM) console.log('MAT', aktualny, m.name, m.color && m.color.getHexString());
      const ng = (sub.index ? sub.toNonIndexed() : sub);
      for (const n of Object.keys(ng.attributes)) if (n !== 'position' && n !== 'normal') ng.deleteAttribute(n);
      if (!ng.attributes.normal) ng.computeVertexNormals();
      if (posun) posun(ng);
      if (!podlaMat.has(mat)) podlaMat.set(mat, []);
      podlaMat.get(mat).push(ng);
    }
  });
  const g = new THREE.Group();
  for (const [mat, geos] of podlaMat) { const me = new THREE.Mesh(mergeGeometries(geos), mat); me.castShadow = me.receiveShadow = true; g.add(me); }
  return g;
}
const minVyska = (obrysy) => Math.min(...obrysy.flat().map(([x, z]) => vyska(x, z)));
const UM = D.umiestnenie;
async function dominanty() {
  for (const meno of ['hrad-palac', 'sm-dom-sv-martina', 'nr-sr']) {
    const p = UM[meno];
    aktualny = meno;
    const g = zlucPrefarbene(await nacitaj(meno));
    aktualny = '';
    g.position.set(p.x, minVyska(D.zabery[meno]), p.z);
    g.rotation.y = p.natocenie || 0;
    scena.add(g); loguj(meno, g);
  }
  const ok = UM['hrad-okolie'];
  const okolie = zlucPrefarbene(await nacitaj('hrad-okolie'), (geo) => {
    const a = geo.getAttribute('position');
    for (let i = 0; i < a.count; i++) a.setY(i, a.getY(i) + vyska(ok.x + a.getX(i), ok.z + a.getZ(i)));
  });
  okolie.position.set(ok.x, 0, ok.z);
  scena.add(okolie); loguj('okolie', okolie);
  const m = UM.most;
  const L = Math.hypot(m.do[0] - m.od[0], m.do[1] - m.od[1]);
  const ux = (m.do[0] - m.od[0]) / L, uz = (m.do[1] - m.od[1]) / L;
  const most = zlucPrefarbene(await nacitaj('most-snp'));
  most.position.set(m.od[0], m.vrch ?? m.vyska, m.od[1]);
  most.rotation.y = Math.atan2(-uz, ux);
  scena.add(most); loguj('most', most);
  await postava().catch(() => panacik());
  nastavVariant(variant); if (Q.get('cas')) nastavCas(Q.get('cas'));
  hotovo();
}

// hráč Ďoďo – model z hry, stojí na Hlavnom námestí
const HRAC = [32, 16];
function panacik() {
  const g = new THREE.Group(), mt = (f) => new THREE.MeshLambertMaterial({ color: f, flatShading: true });
  const add = (geo, f, x, y, z) => { const m = new THREE.Mesh(geo, mt(f)); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
  add(new THREE.BoxGeometry(0.16, 0.85, 0.2), '#2B3A5A', -0.11, 0.43, 0); add(new THREE.BoxGeometry(0.16, 0.85, 0.2), '#2B3A5A', 0.11, 0.43, 0);
  add(new THREE.BoxGeometry(0.5, 0.62, 0.28), '#2F3B2C', 0, 1.17, 0);
  add(new THREE.BoxGeometry(0.12, 0.6, 0.14), '#2F3B2C', -0.32, 1.15, 0); add(new THREE.BoxGeometry(0.12, 0.6, 0.14), '#2F3B2C', 0.32, 1.15, 0);
  add(new THREE.BoxGeometry(0.26, 0.28, 0.26), '#E2B79A', 0, 1.62, 0); add(new THREE.BoxGeometry(0.28, 0.1, 0.28), '#8A2A22', 0, 1.79, 0);
  g.position.set(HRAC[0], vyska(...HRAC), HRAC[1]); scena.add(g);
}
async function postava() {
  const buf = await (await fetch('dodo.glb')).arrayBuffer();
  const g = await new Promise((ok, chyba) => loader.parse(buf, '', ok, chyba));
  const m = g.scene;
  const box = new THREE.Box3().setFromObject(m), vel = box.getSize(new THREE.Vector3());
  m.scale.multiplyScalar(1.78 / vel.y);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const y0 = vyska(...HRAC);
  m.position.set(HRAC[0], y0, HRAC[1]);
  m.rotation.y = Math.PI;
  scena.add(m);
  const klip = g.animations.find((a) => a.name === 'chodza') || g.animations[0];
  if (klip) { const mx = new THREE.AnimationMixer(m); mx.clipAction(klip).play(); mx.update(0.35); }
  m.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(m);
  m.position.y += y0 - b2.min.y;
}

// Michalská brána – jednoduchý low-poly model
(function michalska() {
  const g = new THREE.Group();
  const mt = (f) => new THREE.MeshLambertMaterial({ color: f, flatShading: true });
  const veza = new THREE.Mesh(new THREE.BoxGeometry(8, 24, 8), mt('#F3E9D2')); veza.position.y = 12;
  const horna = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), mt('#ECE2CC')); horna.position.y = 27.5;
  const cib = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), mt('#5E9A82')); cib.scale.set(1, 1.1, 1); cib.position.y = 34;
  const luc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 3, 8), mt('#5E9A82')); luc.position.y = 39;
  const ihla = new THREE.Mesh(new THREE.ConeGeometry(0.8, 5, 8), mt('#5E9A82')); ihla.position.y = 43;
  const gula = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mt('#E8B23A')); gula.position.y = 45.8;
  const strecha = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3, 4), mt('#5E9A82')); strecha.position.y = 31.3; strecha.rotation.y = Math.PI / 4;
  g.add(veza, horna, strecha, cib, luc, ihla, gula);
  g.position.set(-70, vyska(-70, -181), -181);
  g.rotation.y = -0.06;
  scena.add(g);
})();

// ---------- pohľady ----------
const POHLADY = {
  1: { n: 'Hrad a Most SNP', k: [-60, 85, 830], c: [-430, 40, 280] },
  2: { n: 'Staré Mesto', k: [230, 75, 280], c: [-100, 15, -40] },
  3: { n: 'Z výšky', k: [280, 620, 760], c: [-260, 0, 160] },
  4: { n: 'Michalská brána', k: [-5, 32, -105], c: [-70, 20, -185] },
  5: { n: 'Hrad zblízka', k: [-330, 110, 330], c: [-560, 70, 140] },
  6: { n: 'Dunaj a lode', k: [-150, 20, 585], c: [-235, 0, 645] },
  7: { n: 'Hlavné námestie', k: [95, 14, 55], c: [20, 9, -5] },
  8: { n: 'Ako v hre (s hráčom)', k: [32, 2.5, 20.8], c: [32, 1.5, 8], rel: true },
};
function chod(v) { const p = POHLADY[v]; const dy = p.rel ? vyska(...HRAC) : 0; kamera.position.set(p.k[0], p.k[1] + dy, p.k[2]); ovladanie.target.set(p.c[0], p.c[1] + dy, p.c[2]); ovladanie.update(); }
window.chod = chod;
const VARIANTY = {
  taipei: { n: '1 · Taipei západ', cas: 'zapad', okno: [3.4, 3.0, 0.5, 0.4], f: '#2A3540', ram: 0, sat: 1, tiene: true },
  pohladnica: { n: '2 · Pohľadnica', cas: 'den', okno: [3.3, 2.8, 0.48, 0.36], f: '#34505F', ram: 1, sat: 1.12, tiene: true },
  hracka: { n: '3 · Hračkové mesto', cas: 'hracka', okno: [3.3, 3.0, 0.42, 0.42], f: '#5D7E92', ram: 0, sat: 0.92, tiene: false },
  retro: { n: '4 · Retro 2000', cas: 'retro', okno: [3.6, 3.2, 0.56, 0.46], f: '#20262C', ram: 0, sat: 0.72, tiene: true },
  modra: { n: '5 · Modrá hodinka', cas: 'modra', okno: [3.4, 3.0, 0.5, 0.4], f: '#232B40', ram: 0, sat: 0.95, tiene: false },
  pix1: { n: '6 · Pixel jemný', cas: 'den', okno: [3.4, 2.9, 0.5, 0.38], f: '#2E4452', ram: 1, sat: 1.05, tiene: true, pix: 0.22, obraz: 1 },
  pix2: { n: '7 · Pixel stredný', cas: 'den', okno: [3.4, 2.9, 0.5, 0.38], f: '#2E4452', ram: 1, sat: 1.05, tiene: true, pix: 0.38, obraz: 2 },
  pix3: { n: '8 · Pixel hrubší', cas: 'den', okno: [3.4, 2.9, 0.5, 0.38], f: '#2E4452', ram: 1, sat: 1.05, tiene: true, pix: 0.6, obraz: 3 },
  pix4: { n: '9 · Pixel západ', cas: 'zapad', okno: [3.4, 2.9, 0.5, 0.38], f: '#2A3540', ram: 1, sat: 1, tiene: true, pix: 0.3, obraz: 2 },
};
window.nastavVariant = (k) => nastavVariant(k);
function nastavVariant(k) {
  const V = VARIANTY[k]; variant = k;
  U.uOkno.value.set(...V.okno); U.uOknoF.value.set(V.f); U.uRam.value = V.ram; U.uSat.value = V.sat;
  slnko.castShadow = V.tiene;
  U.uPix.value = V.pix || 0;
  const ob = V.obraz || 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) / ob); renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.style.imageRendering = ob > 1 ? 'pixelated' : 'auto';
  texZem.magFilter = V.pix ? THREE.NearestFilter : THREE.LinearFilter; texZem.needsUpdate = true;
  nastavCas(V.cas);
  document.querySelectorAll('[data-var]').forEach((b) => b.classList.toggle('akt', b.dataset.var === k));
}
function nastavCas(meno) {
  const C = CASY[meno]; cas = meno;
  U.uNoc.value = C.noc;
  oblohaU.uVrch.value.set(C.vrch); oblohaU.uHor.value.set(C.horizont); oblohaU.uMrak.value.set(C.mrak); oblohaU.uSlnkoF.value.set(C.slnkoF);
  oblohaU.uSlnko.value.set(...C.smer).normalize();
  scena.fog.color.set(C.horizont);
  hemi.intensity = C.hemi; hemi.color.set(C.hemiSky); hemi.groundColor.set(C.hemiZem);
  slnko.intensity = C.slnko; slnko.color.set(C.slnkoF);
  renderer.toneMappingExposure = C.exp;
  matVoda.color.set(C.voda); matVoda.specular.set(C.noc > 0.9 ? '#556080' : '#FFFFFF');
  matKruh.opacity = C.noc > 0.9 ? 1 : C.noc > 0.3 ? 0.35 : 0;
  matHlava.emissive.set(C.noc > 0.3 ? '#FFD9A0' : '#000000');
  const n = C.noc > 0.9;
  for (const [f, e] of [['#5E7F8F', '#7FD3FF'], ['#FFF2D0', '#FFE2A0'], ['#E24B4A', '#FF3020']]) {
    const m = cacheMat.get(f); if (m) m.emissive.set(n ? e : '#000000');
  }
  document.querySelectorAll('[data-cas]').forEach((b) => b.classList.toggle('akt', b.dataset.cas === meno));
}
let cas = Q.get('cas') || 'zapad';
let variant = Q.get('var') || 'taipei';
chod(Q.get('v') || 1);
const ui = document.getElementById('ui');
for (const [k, p] of Object.entries(POHLADY)) {
  const b = document.createElement('button'); b.textContent = p.n; b.onclick = () => chod(k); ui.appendChild(b);
}
const ui2 = document.getElementById('ui2');
for (const [k, V] of Object.entries(VARIANTY)) {
  const b = document.createElement('button'); b.textContent = V.n; b.dataset.var = k; b.onclick = () => nastavVariant(k); ui2.appendChild(b);
}
for (const [k, n] of [['den', 'Deň'], ['zapad', 'Západ'], ['noc', 'Noc']]) {
  const b = document.createElement('button'); b.textContent = n; b.dataset.cas = k; b.onclick = () => nastavCas(k); ui2.appendChild(b);
}
nastavVariant(variant);
if (Q.get('cas')) nastavCas(Q.get('cas'));
if (Q.get('ui') === '0') { ui.style.display = 'none'; ui2.style.display = 'none'; document.getElementById('stat').style.display = 'none'; document.getElementById('info').style.display = 'none'; }

// ---------- výkon ----------
const stat = document.getElementById('stat');
let t0 = performance.now(), snimky = 0, fps = 0;
function loguj(n, o) { const b = new THREE.Box3().setFromObject(o); console.log('BOX', n, b.min.toArray().map(Math.round).join(','), '|', b.max.toArray().map(Math.round).join(',')); }
function hotovo() { document.body.dataset.hotovo = '1'; }
function slucka() {
  requestAnimationFrame(slucka);
  ovladanie.update();
  scena.fog.near = 300 + kamera.position.y * 0.8; scena.fog.far = 1700 + kamera.position.y * 2;
  const tt = performance.now() / 1000; pohniLode(Q.has('snimka') ? 7 : tt);
  const C = CASY[cas], ciel = ovladanie.target;
  slnko.position.set(ciel.x + C.smer[0] * 600, ciel.y + C.smer[1] * 600, ciel.z + C.smer[2] * 600); slnko.target.position.copy(ciel);
  obloha.position.copy(kamera.position);
  renderer.render(scena, kamera);
  snimky++;
  const t = performance.now();
  if (t - t0 > 500) {
    fps = Math.round(snimky * 1000 / (t - t0)); snimky = 0; t0 = t;
    const i = renderer.info.render;
    stat.textContent = `${fps} FPS · ${i.calls} kreslení · ${(i.triangles / 1000).toFixed(0)} tis. trojuholníkov`;
  }
}
slucka();
dominanty().catch((e) => { console.error(e); hotovo(); });
addEventListener('resize', () => { kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
