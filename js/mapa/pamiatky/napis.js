// Nápis – tabuľa s textom pri stavbe (nad vchodom obchodu, na stojane…), textúra z plátna.
// Pre obchody a podniky vždy vlastný neutrálny nápis – žiadne značky firiem (pravidlá projektu).
//
// Záznam v data/mapa/pamiatky.json:
//   { "model": "napis", "text": "POTRAVINY", "x": 1583.1, "z": -3779.0, "y": 5.2, "natocenie": 1.37,
//     "sirka": 2.4, "vyska": 1.0, "farba": "#ffffff", "pozadie": "#2f6b4f", "obojstranny": false }
//   y = výška stredu tabule nad terénom; natocenie = otočenie okolo zvislej osi (pri 0 je líce na juh, +z).
//   Druhý riadok textu: "podtext". Večer tabuľa jemne svieti (emissive).
//   "podlaBudovy": "<subor>" = y sa počíta od základne modelu z Blendera (assets/pamiatky/<subor>.json,
//   najnižší terén pod jeho pôdorysom – rovnako ako vo vyskova-budova.js), aby tabuľa sedela na stene.

const cache = new Map();

function textura(THREE, p) {
  const kluc = `${p.text}|${p.podtext ?? ''}|${p.farba}|${p.pozadie}|${p.sirka}|${p.vyska}`;
  if (cache.has(kluc)) return cache.get(kluc);
  const pomer = (p.sirka ?? 2) / (p.vyska ?? 1);
  const H = 128, W = Math.min(2048, Math.round(H * pomer / 4) * 4);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = p.pozadie ?? '#2b2b2b';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = p.farba ?? '#ffffff';
  g.lineWidth = 4;
  g.strokeRect(6, 6, W - 12, H - 12);
  g.fillStyle = p.farba ?? '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const riadky = p.podtext ? [p.text, p.podtext] : [p.text];
  const vel = p.podtext ? [H * 0.42, H * 0.22] : [H * 0.6];
  riadky.forEach((t, i) => {
    g.font = `bold ${Math.round(vel[i])}px system-ui, sans-serif`;
    const y = p.podtext ? (i === 0 ? H * 0.4 : H * 0.76) : H * 0.54;
    g.fillText(t, W / 2, y, W - 24);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(kluc, t);
  return t;
}

/** Základňa budovy z Blendera: najnižší terén pod jej pôdorysom (pôdorys je okolo info.stred). */
async function zakladnaBudovy(subor, vyskopis) {
  const info = await fetch(`assets/pamiatky/${subor}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info?.stred || !info.obrysy?.length) return null;
  const [sx, sz] = info.stred;
  return () => {
    let zem = Infinity;
    for (const w of info.obrysy) for (const [x, z] of w) zem = Math.min(zem, vyskopis.vyskaTerenu(sx + x, sz + z));
    return zem;
  };
}

export default async function postav(p, { THREE, vyskopis }) {
  const tex = textura(THREE, p);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.05,
    side: p.obojstranny ? THREE.DoubleSide : THREE.FrontSide,
  });
  const doska = new THREE.Mesh(new THREE.PlaneGeometry(p.sirka ?? 2, p.vyska ?? 1), mat);
  const g = new THREE.Group();
  g.add(doska);
  const zem = (p.podlaBudovy && await zakladnaBudovy(p.podlaBudovy, vyskopis)) || (() => vyskopis.vyskaTerenu(p.x, p.z));
  g.position.set(p.x, zem() + (p.y ?? 3), p.z);
  g.rotation.y = p.natocenie ?? 0;
  g.userData.bezTiena = true;
  // podrobný terén (laser) sa načítava postupne – výšku občas prepočítame
  let cakanie = 0;
  const update = () => {
    if (++cakanie < 30) return;
    cakanie = 0;
    g.position.y = zem() + (p.y ?? 3);
  };
  return { objekt: g, update };
}
