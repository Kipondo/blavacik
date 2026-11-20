// Dotykové ovládanie pre mobily: joystick vľavo, tlačidlá vpravo,
// ťahanie prstom po pravej polovici obrazovky otáča kameru.

export function pripojDotyk(vstup, vrstva) {
  const koren = document.createElement('div');
  koren.className = 'dotyk';
  koren.innerHTML = `
    <div class="joystick"><div class="joystick-hlavicka"></div></div>
    <div class="dotyk-tlacidla">
      <button class="dotyk-tl" data-stlac="akcia">E</button>
      <button class="dotyk-tl" data-drz="beh,rucna">⚡</button>
      <button class="dotyk-tl" data-drz="skok">⤒</button>
      <button class="dotyk-tl maly" data-stlac="pauza">❚❚</button>
    </div>`;
  vrstva.appendChild(koren);

  // --- joystick ---
  const joy = koren.querySelector('.joystick');
  const hlavicka = koren.querySelector('.joystick-hlavicka');
  let joyId = null;
  let stredX = 0, stredY = 0;
  const POLOMER = 55;

  function pohybJoysticku(t) {
    let dx = t.clientX - stredX;
    let dy = t.clientY - stredY;
    const d = Math.hypot(dx, dy);
    if (d > POLOMER) { dx = (dx / d) * POLOMER; dy = (dy / d) * POLOMER; }
    hlavicka.style.transform = `translate(${dx}px, ${dy}px)`;
    vstup.joystick.x = dx / POLOMER;
    vstup.joystick.y = -dy / POLOMER;
  }

  joy.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    const r = joy.getBoundingClientRect();
    stredX = r.left + r.width / 2;
    stredY = r.top + r.height / 2;
    pohybJoysticku(t);
  }, { passive: false });

  // --- tlačidlá ---
  for (const tl of koren.querySelectorAll('.dotyk-tl')) {
    tl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      tl.classList.add('aktivne');
      if (tl.dataset.stlac) vstup.stlac(tl.dataset.stlac);
      if (tl.dataset.drz) for (const n of tl.dataset.drz.split(',')) vstup.drz(n, true);
      if (tl.dataset.drz === 'skok') vstup.stlac('dalej');
    }, { passive: false });
    const pusti = (e) => {
      e.preventDefault();
      tl.classList.remove('aktivne');
      if (tl.dataset.drz) for (const n of tl.dataset.drz.split(',')) vstup.drz(n, false);
    };
    tl.addEventListener('touchend', pusti, { passive: false });
    tl.addEventListener('touchcancel', pusti, { passive: false });
  }

  // --- kamera ťahaním (všetky dotyky mimo joysticku a tlačidiel) ---
  const kameraDotyky = new Map();
  window.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) continue;
      if (t.target.closest?.('.dotyk-tl, .joystick, .menu, .dialog')) continue;
      kameraDotyky.set(t.identifier, { x: t.clientX, y: t.clientY });
      vstup.stlac('dalej'); // ťuknutie posúva dialóg
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { pohybJoysticku(t); continue; }
      const p = kameraDotyky.get(t.identifier);
      if (p) {
        vstup.otocKameru((t.clientX - p.x) * 1.5, (t.clientY - p.y) * 1.5);
        p.x = t.clientX; p.y = t.clientY;
      }
    }
  }, { passive: true });

  const koniec = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        joyId = null;
        vstup.joystick.x = 0; vstup.joystick.y = 0;
        hlavicka.style.transform = '';
      }
      kameraDotyky.delete(t.identifier);
    }
  };
  window.addEventListener('touchend', koniec);
  window.addEventListener('touchcancel', koniec);

  return koren;
}
