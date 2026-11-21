// Úvodné menu, načítavanie a pauza.

export function vytvorMenu(koren, { dotyk }) {
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = `
    <div class="menu-okno">
      <img class="menu-logo" src="assets/ui/logo.svg" alt="">
      <div class="menu-pruhy" aria-hidden="true"></div>
      <h1>Blava<span>čík</span></h1>
      <p class="menu-podtitul">Bratislava. Bez zákazu vjazdu.</p>
      <p class="menu-stav">Načítavam…</p>
      <button class="menu-hrat" disabled>Hrať</button>
      <p class="menu-editor"><a href="editor-postavy.html">Upraviť Ďoďa – editor postavy</a></p>
      <div class="menu-ovladanie">
        ${dotyk ? `
          <p><b>Joystick</b> – chôdza / jazda</p>
          <p><b>E</b> – nastúpiť / vystúpiť · <b>⚡</b> – beh / ručná brzda · <b>⤒</b> – skok</p>
          <p>Ťahaním prsta po obrazovke otáčaš kamerou.</p>` : `
          <p><b>W A S D</b> / šípky – chôdza a jazda</p>
          <p><b>Shift</b> – beh · <b>Medzerník</b> – skok / ručná brzda</p>
          <p><b>E</b> – nastúpiť / vystúpiť z auta · <b>M</b> – mapa mesta</p>
          <p><b>Klikni do hry</b> – myš ovláda pohľad, <b>Esc</b> = pauza · <b>P</b> – vypíše polohu</p>`}
      </div>
      <p class="menu-pata">Hra pre srandu. Všetky postavy a príbehy sú vymyslené. Znak je vlastná štylizácia, nie erb mesta.<br>Mapa © prispievatelia OpenStreetMap (ODbL).<br>Terén a budovy: laserové skenovanie © ÚGKK SR (CC BY 4.0), Copernicus DEM. Textúry: ambientCG (CC0).</p>
    </div>`;
  koren.appendChild(menu);

  const stav = menu.querySelector('.menu-stav');
  const tlacidlo = menu.querySelector('.menu-hrat');

  return {
    priebeh(text) { stav.textContent = text; },
    chyba(text) { stav.textContent = text; stav.classList.add('chyba'); },
    pripravene(priStarte) {
      stav.textContent = 'Pripravené.';
      tlacidlo.disabled = false;
      tlacidlo.focus();
      tlacidlo.onclick = () => {
        menu.hidden = true;
        tlacidlo.textContent = 'Pokračovať';
        priStarte();
      };
    },
    ukaz() { stav.textContent = 'Pauza'; menu.hidden = false; tlacidlo.focus(); },
    skry() { menu.hidden = true; },
    get viditelne() { return !menu.hidden; },
  };
}
