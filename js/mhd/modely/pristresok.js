// Modely zastávky: prístrešok s lavičkou, označník (stĺp s tabuľou), tabuľa odchodov.
// Lokálne osi: +z smeruje k ceste (otvorená strana prístrešku), +x pozdĺž cesty.
// Geometrie a materiály sú spoločné pre všetky zastávky (šetrí pamäť a čas).

let spolocne = null;

function pripravSpolocne(THREE) {
  if (spolocne) return spolocne;
  const kov = new THREE.MeshStandardMaterial({ color: 0x5c636b, metalness: 0.6, roughness: 0.45 });
  spolocne = {
    kov,
    sklo: new THREE.MeshStandardMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    strecha: new THREE.MeshStandardMaterial({ color: 0x2e3338, roughness: 0.6, metalness: 0.3 }),
    drevo: new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: 0.8 }),
    stlp: new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    kvader: new THREE.BoxGeometry(1, 1, 1),
  };
  return spolocne;
}

function kvader(THREE, S, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(S.kvader, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Prístrešok 4 × 1,6 m so zadnou a bočnými sklenenými stenami, strechou a lavičkou. */
export function vytvorPristresok(THREE, dlzka = 4) {
  const S = pripravSpolocne(THREE);
  const g = new THREE.Group();
  const h = 2.5, hl = 1.6;
  // stĺpy
  for (const sx of [-dlzka / 2, dlzka / 2]) for (const sz of [-hl / 2, hl / 2 - 0.1]) {
    const s = new THREE.Mesh(S.stlp, S.kov);
    s.scale.y = h; s.position.set(sx, h / 2, sz);
    g.add(s);
  }
  g.add(kvader(THREE, S, S.strecha, dlzka + 0.3, 0.08, hl + 0.3, 0, h, 0.05));      // strecha
  g.add(kvader(THREE, S, S.sklo, dlzka, h - 0.3, 0.03, 0, h / 2 + 0.05, -hl / 2));  // zadné sklo
  for (const sx of [-dlzka / 2, dlzka / 2]) g.add(kvader(THREE, S, S.sklo, 0.03, h - 0.3, hl * 0.6, sx, h / 2 + 0.05, -hl * 0.2)); // bočné sklá
  g.add(kvader(THREE, S, S.drevo, dlzka * 0.7, 0.05, 0.4, -0.2, 0.48, -hl / 2 + 0.3)); // sedák lavičky
  g.add(kvader(THREE, S, S.kov, dlzka * 0.7, 0.45, 0.06, -0.2, 0.24, -hl / 2 + 0.12)); // podstavec lavičky
  g.userData.miestaNaSedenie = [-1.2, -0.6, 0, 0.6].map((x) => new THREE.Vector3(x - 0.2, 0.5, -hl / 2 + 0.35));
  return g;
}

/** Stĺp označníka s tabuľou (textúra z plátna). */
export function vytvorOznacnik(THREE, textura) {
  const S = pripravSpolocne(THREE);
  const g = new THREE.Group();
  const s = new THREE.Mesh(S.stlp, S.kov);
  s.scale.set(1.2, 3.1, 1.2); s.position.y = 1.55;
  g.add(s);
  const mat = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.6 });
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), mat);
  tab.position.set(0, 2.55, 0.06);
  const zad = tab.clone(); zad.rotation.y = Math.PI; zad.position.z = -0.06;
  g.add(tab, zad);
  g.userData.uvolni = () => { tab.geometry.dispose(); mat.dispose(); textura.dispose(); };
  return g;
}

/** Tabuľa odchodov na stojane (plátno sa prekresľuje). */
export function vytvorTabulu(THREE) {
  const S = pripravSpolocne(THREE);
  const platno = document.createElement('canvas');
  platno.width = 512; platno.height = 300;
  const tex = new THREE.CanvasTexture(platno);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), mat);
  panel.position.set(0, 1.9, 0.04);
  g.add(kvader(THREE, S, S.kov, 1.3, 0.8, 0.06, 0, 1.9, 0));
  const s = new THREE.Mesh(S.stlp, S.kov); s.scale.y = 1.5; s.position.y = 0.75;
  g.add(panel, s);
  g.userData = { platno, ctx: platno.getContext('2d'), tex, uvolni: () => { panel.geometry.dispose(); mat.dispose(); tex.dispose(); } };
  return g;
}
