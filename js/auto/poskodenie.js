// Poškodenie auta pri náraze: karoséria, nárazníky a svetlá sa v mieste nárazu preliačia (posun vrcholov
// dovnútra, so šumom – plech sa krčí nerovnomerne), pri silnom náraze praskne sklo a rozbijú sa svetlá.
// Geometria sa pri prvom poškodení skopíruje (modely áut ju inak zdieľajú), pôvodný tvar si pamätá,
// aby preliačina nikde nebola hlbšia ako MAX_HLBKA.

import * as THREE from 'three';

const MAX_HLBKA = 0.42;     // m – najväčšia preliačina v jednom mieste
const POL_SIRKA = 0.9;

const matRozbiteSvetlo = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.2 });
let matRozbiteSklo = null;

/** Popraskané sklo: „pavučina“ prasklín nakreslená do plátna (UV skla sú v metroch). */
function rozbiteSklo() {
  if (matRozbiteSklo) return matRozbiteSklo;
  const N = 512, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#16202a'; g.fillRect(0, 0, N, N);
  g.strokeStyle = 'rgba(200,215,225,0.55)'; g.lineWidth = 1.6;
  const cx = N * 0.45, cy = N * 0.5;
  // lúče od miesta nárazu
  for (let i = 0; i < 9; i++) {
    const u = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    let x = cx, y = cy;
    g.beginPath(); g.moveTo(x, y);
    const dlzka = N * (0.25 + Math.random() * 0.25);
    for (let d = 0; d < dlzka; d += N * 0.04) {
      x += Math.cos(u + (Math.random() - 0.5) * 0.5) * N * 0.04;
      y += Math.sin(u + (Math.random() - 0.5) * 0.5) * N * 0.04;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // pár sústredných prasklín blízko stredu
  for (const r of [N * 0.05, N * 0.11, N * 0.19]) {
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const u = (i / 18) * Math.PI * 2, rr = r * (0.8 + Math.random() * 0.4);
      if (i === 0) g.moveTo(cx + Math.cos(u) * rr, cy + Math.sin(u) * rr); else g.lineTo(cx + Math.cos(u) * rr, cy + Math.sin(u) * rr);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.4, 0.4);
  t.offset.set(0.1, 0.25);
  matRozbiteSklo = new THREE.MeshStandardMaterial({ map: t, roughness: 0.2, metalness: 0.5 });
  return matRozbiteSklo;
}

/** Smer od stredu auta k prekážke v súradniciach auta (x = doprava, z = dopredu). */
function lokalnySmer(auto, { nx, nz }) {
  const u = auto.uhol, c = Math.cos(u), s = Math.sin(u);
  let wx, wz;
  if (Number.isFinite(nx) && Number.isFinite(nz)) { wx = -nx; wz = -nz; }
  else { const v = auto.rychlostDopredu ?? 1; wx = Math.sin(u) * Math.sign(v || 1); wz = Math.cos(u) * Math.sign(v || 1); }
  const lx = wx * c - wz * s, lz = wx * s + wz * c;
  const l = Math.hypot(lx, lz) || 1;
  return { x: lx / l, z: lz / l };
}

/** Hash pre šum preliačiny (rovnaké miesto = rovnaký „zmačkaný“ tvar). */
const hs = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Poškodí auto. Vracia { bod (svet), smer (svet, k prekážke), hlbka } – pre iskry a otras.
 * udalost: { sila (m/s), nx, nz (normála od prekážky k autu), chodec }
 */
export function poskod(auto, udalost) {
  const telo = auto.mesh?.userData?.telo;
  if (!telo) return null;
  const sila = udalost.sila ?? 5;
  const dl = lokalnySmer(auto, udalost);
  const ud = auto.mesh.userData;
  const polDlzka = dl.z >= 0 ? (ud.predok ?? 2.2) : -(ud.zadok ?? -2.2);
  // bod nárazu na obryse auta
  const t = Math.min(POL_SIRKA / Math.max(1e-3, Math.abs(dl.x)), polDlzka / Math.max(1e-3, Math.abs(dl.z)));
  const px = dl.x * t, pz = dl.z * t, py = udalost.chodec ? 0.8 : 0.55;
  const hlbka = Math.min(0.36, sila * (udalost.chodec ? 0.01 : 0.02));
  const R = 0.5 + Math.min(0.65, sila * 0.03);

  telo.updateMatrix();
  for (const m of telo.children) {
    if (!m.isMesh || m.geometry.type === 'PlaneGeometry') continue;
    const g0 = m.geometry;
    if (!m.userData.vlastnaGeo) {
      m.geometry = g0.clone();
      m.userData.vlastnaGeo = true;
      m.userData.povodne = Float32Array.from(m.geometry.attributes.position.array);
    }
    const pos = m.geometry.attributes.position, a = pos.array, orig = m.userData.povodne;
    const ox = m.position.x, oy = m.position.y, oz = m.position.z;
    let zmena = false;
    for (let i = 0; i < a.length; i += 3) {
      const x = a[i] + ox, y = a[i + 1] + oy, z = a[i + 2] + oz;
      const d = Math.hypot(x - px, (y - py) * 0.75, z - pz);
      if (d >= R) continue;
      const f = (1 - d / R) ** 2 * (0.7 + 0.6 * hs(orig[i], orig[i + 1], orig[i + 2]));
      let nxv = a[i] - dl.x * hlbka * f, nyv = a[i + 1] - hlbka * f * 0.25, nzv = a[i + 2] - dl.z * hlbka * f;
      // nie hlbšie ako MAX_HLBKA od pôvodného tvaru
      const ddx = nxv - orig[i], ddy = nyv - orig[i + 1], ddz = nzv - orig[i + 2];
      const dd = Math.hypot(ddx, ddy, ddz);
      if (dd > MAX_HLBKA) { const k = MAX_HLBKA / dd; nxv = orig[i] + ddx * k; nyv = orig[i + 1] + ddy * k; nzv = orig[i + 2] + ddz * k; }
      a[i] = nxv; a[i + 1] = nyv; a[i + 2] = nzv;
      zmena = true;
    }
    if (zmena) {
      pos.needsUpdate = true;
      m.geometry.computeVertexNormals();
      m.geometry.computeBoundingSphere();
    }
    // svetlá a sklo pri silnom náraze z tej strany
    const blizko = Math.hypot(ox - px, oz - pz) < R + 0.4;
    if (blizko && sila > 8 && m.material?.emissive?.getHex() > 0) m.material = matRozbiteSvetlo;
  }
  if (sila > 13) {
    const sklo = telo.children.find((m) => m.isMesh && m.material?.roughness < 0.1 && m.material?.metalness > 0.4);
    if (sklo) sklo.material = rozbiteSklo();
  }
  auto.poskodenie = (auto.poskodenie ?? 0) + hlbka;

  // bod a smer vo svete
  const u = auto.uhol, c = Math.cos(u), s = Math.sin(u);
  const wx = px * c + pz * s, wz = -px * s + pz * c;
  return {
    bod: new THREE.Vector3(auto.pozicia.x + wx, auto.pozicia.y + py, auto.pozicia.z + wz),
    smer: new THREE.Vector3(dl.x * c + dl.z * s, 0, -dl.x * s + dl.z * c),
    hlbka,
  };
}
