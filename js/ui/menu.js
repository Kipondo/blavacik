// Titulná obrazovka „Blaváčik“, obrazovky Nastavenia a Ovládanie, načítavanie s vlakom a pauza (issue #101).
//
// Vzhľad podľa návrhu majiteľa (titulka-v2.html na vetve hlasenia): večerné pozadie s pamiatkami, Ďoďo máva,
// erb, nápis BLAVÁČIK a ploché tlačidlá na tmavomodrom paneli so zlatou linkou. Návrh má pevnú plochu
// 1600 × 900 – tu sa celá zmenší/zväčší podľa okna (CSS premenná --m), panel a pozadie siahajú cez celú šírku.
//
// Hra sa načítava hneď po otvorení stránky (moduly pri tom vkladajú svoje nastavenia do obrazovky Nastavenia).
// Po kliknutí na Hrať: ak ešte nie je načítaná, ukáže sa načítavanie – vlak ide z Košíc do Bratislavy podľa
// skutočného priebehu a hra sa spustí, keď vlak zastane v Bratislave. Ak je už načítaná, spustí sa hneď.
//
// Rozhranie pre main.js: priebeh(text), chyba(text), pripravene(priStarte), ukaz(), skry(), viditelne, zakryva.
// Moduly s nastaveniami vkladajú bloky do „.menu-okno“ pred „.menu-ovladanie“ (js/ui/nastavenia-*.js,
// js/zvuk/nastavenia-zvuku.js) – v obrazovke Nastavenia sú preto tieto dva prvky.

import { vytvorNacitavanie } from './nacitavanie/obrazovka.js';

const SIRKA = 1600, VYSKA = 900;

export function vytvorMenu(koren, { dotyk }) {
  const menu = document.createElement('div');
  menu.className = 'menu titulka';
  menu.innerHTML = `
    <div class="titulka-za" aria-hidden="true"></div>
    <div class="titulka-panel" aria-hidden="true"></div>
    <div class="titulka-scena">
      <img class="titulka-pozadie" src="assets/ui/titulka/pozadie.webp" alt="Večerná Bratislava: hrad, dóm, Michalská brána, Modrý kostolík, UFO, Eurovea Tower, Slavín">
      <div class="titulka-zakryt" aria-hidden="true"></div>
      <img class="titulka-dodo" src="assets/ui/titulka/dodo-mava.webp" alt="Ďoďo máva">
      <div class="titulka-stred">
        <img class="titulka-erb" src="assets/ui/logo.svg" alt="Znak Blaváčika">
        <h1 class="titulka-nazov"><span class="tien" aria-hidden="true">Blaváčik</span><span class="text">Blaváčik</span></h1>
        <nav class="titulka-menu" aria-label="Hlavné menu">
          <button type="button" class="menu-hrat">Hrať</button>
          <a href="editor-postavy.html">Upraviť Ďoďa</a>
          <button type="button" data-okno="nastavenia">Nastavenia</button>
          <button type="button" data-okno="ovladanie">Ovládanie</button>
        </nav>
      </div>
      <p class="titulka-pata">Hra pre srandu. Postavy a príbehy sú vymyslené. Mapa © prispievatelia OpenStreetMap (ODbL),
        terén Copernicus DEM, laser © ÚGKK SR (CC BY 4.0).</p>
    </div>
    <section class="titulka-okno" data-okno="nastavenia" hidden aria-label="Nastavenia">
      <h2>Nastavenia</h2>
      <div class="menu-okno">
        <p class="titulka-okno-prazdne">Nastavenia sa ešte načítavajú…</p>
        <div class="menu-ovladanie" hidden></div>
      </div>
      <button type="button" class="titulka-spat">Späť</button>
    </section>
    <section class="titulka-okno" data-okno="ovladanie" hidden aria-label="Ovládanie">
      <h2>Ovládanie</h2>
      <div class="menu-klavesy">${dotyk ? `
        <p><b>Joystick</b> chôdza / jazda</p>
        <p><b>E</b> nastúpiť / vystúpiť · <b>⚡</b> beh / ručná brzda · <b>⤒</b> skok</p>
        <p>Ťahaním prsta po obrazovke otáčaš kamerou.</p>` : `
        <p><b>W A S D / šípky</b> <span>chôdza a jazda</span></p>
        <p><b>Shift</b> <span>beh</span></p>
        <p><b>Medzerník</b> <span>skok / ručná brzda</span></p>
        <p><b>E</b> <span>nastúpiť / vystúpiť, otvoriť dvere</span></p>
        <p><b>M</b> <span>mapa mesta</span></p>
        <p><b>Myš</b> <span>pohľad (klikni do hry)</span></p>
        <p><b>Esc</b> <span>pauza</span></p>
        <p><b>P</b> <span>vypíše polohu</span></p>`}
      </div>
      <p class="titulka-okno-pata">Znak je vlastná štylizácia, nie erb mesta. Textúry ambientCG (CC0).
        Písma Anton, Barlow Condensed, Bricolage Grotesque (SIL OFL).</p>
      <button type="button" class="titulka-spat">Späť</button>
    </section>`;
  koren.appendChild(menu);

  const nacitavanie = vytvorNacitavanie(menu);
  const tlacidlo = menu.querySelector('.menu-hrat');
  const scena = menu.querySelector('.titulka-scena');
  const okna = [...menu.querySelectorAll('.titulka-okno')];
  const nastaveniaObsah = menu.querySelector('.menu-okno');

  // mierka návrhu 1600 × 900 podľa okna
  const prisposob = () => menu.style.setProperty('--m', String(Math.min(innerWidth / SIRKA, innerHeight / VYSKA)));
  prisposob();
  addEventListener('resize', prisposob);

  // HUD (minimapa, čas…) za menu nie je vidieť
  const nastavOtvorene = (ano) => document.body.classList.toggle('menu-otvorene', ano);
  nastavOtvorene(true);

  // obrazovky Nastavenia a Ovládanie
  const otvorOkno = (meno) => {
    for (const o of okna) o.hidden = o.dataset.okno !== meno;
    scena.classList.toggle('stlmena', !!meno);
    if (meno === 'nastavenia') {
      // keď už moduly vložili nastavenia, zmizne text „načítavajú sa“
      const prazdne = nastaveniaObsah.querySelector('.titulka-okno-prazdne');
      if (prazdne) prazdne.hidden = nastaveniaObsah.children.length > 2;
    }
    (meno ? menu.querySelector(`.titulka-okno[data-okno="${meno}"] .titulka-spat`) : menu.querySelector(`[data-okno="${posledne}"]`) ?? tlacidlo)?.focus();
    if (meno) posledne = meno;
  };
  let posledne = null;
  for (const b of menu.querySelectorAll('.titulka-menu [data-okno]')) b.addEventListener('click', () => otvorOkno(b.dataset.okno));
  for (const b of menu.querySelectorAll('.titulka-spat')) b.addEventListener('click', () => otvorOkno(null));
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && okna.some((o) => !o.hidden)) { e.stopPropagation(); otvorOkno(null); }
  });

  let priStarte = null;       // nastaví pripravene()
  let hotovo = false;         // hra je načítaná
  let ziada = false;          // hráč klikol na Hrať počas načítavania
  let bezi = false;           // hra už bola spustená (Esc = pauza)

  const spusti = () => {
    menu.hidden = true;
    nastavOtvorene(false);
    nacitavanie.skry();
    tlacidlo.textContent = 'Pokračovať';
    bezi = true;
    priStarte?.();
  };

  tlacidlo.addEventListener('click', () => {
    if (hotovo && !nacitavanie.viditelne) { spusti(); return; }
    if (ziada) return;
    ziada = true;
    nacitavanie.ukaz();
  });
  // vlak dorazil do Bratislavy a hra je pripravená
  nacitavanie.priPrichode(() => { if (ziada && hotovo) spusti(); });

  return {
    priebeh(text) { nacitavanie.priebeh(text); },
    chyba(text) { nacitavanie.chyba(text); if (!ziada) { ziada = true; nacitavanie.ukaz(); } },
    pripravene(fn) {
      priStarte = fn;
      hotovo = true;
      nacitavanie.hotovo();
      if (!ziada) tlacidlo.focus();
    },
    ukaz() {
      menu.hidden = false;
      nastavOtvorene(true);
      otvorOkno(null);
      tlacidlo.focus();
    },
    skry() { if (bezi) spusti(); },
    get viditelne() { return !menu.hidden; },
    /** Menu zakrýva celú obrazovku – mesto netreba kresliť. */
    get zakryva() { return !menu.hidden; },
  };
}
