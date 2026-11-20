// Ovládanie klávesnicou a myšou.

const SMERY = {
  KeyW: 'hore', ArrowUp: 'hore',
  KeyS: 'dole', ArrowDown: 'dole',
  KeyA: 'vlavo', ArrowLeft: 'vlavo',
  KeyD: 'vpravo', ArrowRight: 'vpravo',
};

const DRZANE = {
  ShiftLeft: 'beh', ShiftRight: 'beh',
  Space: 'skok',
};

const STLACENE = {
  KeyE: 'akcia', KeyF: 'akcia',
  Escape: 'pauza',
  KeyP: 'poloha',
  KeyM: 'mapa',
  Space: 'dalej', Enter: 'dalej',
};

export function pripojKlavesnicu(vstup, platno) {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (SMERY[e.code]) vstup.klavesy[SMERY[e.code]] = true;
    if (DRZANE[e.code]) vstup.drz(DRZANE[e.code], true);
    if (e.code === 'Space') vstup.drz('rucna', true);
    // Esc, ktorý práve uvoľnil zámok myši (mys.js), už pauzu spustil – neprepínať ju späť
    const poZamku = e.code === 'Escape' && performance.now() - (vstup.zamokSkoncil ?? -1e9) < 300;
    if (STLACENE[e.code] && !e.repeat && !poZamku) vstup.stlac(STLACENE[e.code]);
    if (SMERY[e.code] || e.code === 'Space') e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    if (SMERY[e.code]) vstup.klavesy[SMERY[e.code]] = false;
    if (DRZANE[e.code]) vstup.drz(DRZANE[e.code], false);
    if (e.code === 'Space') vstup.drz('rucna', false);
  });

  // pri prepnutí okna pustíme všetky klávesy
  window.addEventListener('blur', () => {
    for (const k of Object.keys(vstup.klavesy)) vstup.klavesy[k] = false;
    vstup.drzane.clear();
  });

  // otáčanie kamery ťahaním myšou – len keď myš nie je zamknutá (zamknutú rieši mys.js)
  let tahame = false;
  platno.addEventListener('mousedown', () => { tahame = true; });
  window.addEventListener('mouseup', () => { tahame = false; });
  window.addEventListener('mousemove', (e) => {
    if (tahame && !document.pointerLockElement) vstup.otocKameru(e.movementX, e.movementY);
  });
}
