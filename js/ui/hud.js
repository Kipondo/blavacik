// HUD – rýchlomer, nápoveda, krátke správy.
//
// Rozhranie hra.ui (vytvorí main.js cez vytvorUI):
//   hra.ui.vrstva            – <div> nad hrou, sem môžu moduly pridávať vlastné prvky
//   hra.ui.sprava(text, sek) – krátka správa v strede obrazovky
//   hra.ui.napoveda(text)    – trvalá nápoveda dole (null = skryť)
//   hra.ui.pokyn(text)       – pokyn hore (napr. cieľ misie; null = skryť)

export function vytvorUI(koren) {
  const vrstva = document.createElement('div');
  vrstva.className = 'ui-vrstva';
  vrstva.innerHTML = `
    <div class="ui-pokyn" hidden></div>
    <div class="ui-sprava" hidden></div>
    <div class="ui-napoveda" hidden></div>
    <div class="ui-rychlomer" hidden><span class="ui-kmh">0</span><small>km/h</small></div>`;
  koren.appendChild(vrstva);

  const el = (s) => vrstva.querySelector(s);
  const sprava = el('.ui-sprava');
  let casovac = null;

  const nastavText = (prvok, text) => {
    if (text) { prvok.textContent = text; prvok.hidden = false; } else prvok.hidden = true;
  };

  return {
    vrstva,
    sprava(text, sekundy = 2.5) {
      nastavText(sprava, text);
      sprava.classList.remove('animuj');
      void sprava.offsetWidth; // reštart animácie
      sprava.classList.add('animuj');
      clearTimeout(casovac);
      casovac = setTimeout(() => { sprava.hidden = true; }, sekundy * 1000);
    },
    napoveda(text) { nastavText(el('.ui-napoveda'), text); },
    pokyn(text) { nastavText(el('.ui-pokyn'), text); },
    _rychlomer: el('.ui-rychlomer'),
    _kmh: el('.ui-kmh'),
  };
}

/** Modul HUD – každý snímok aktualizuje rýchlomer a nápovedu „E – nastúpiť“. */
export default {
  nazov: 'hud',
  poradie: 90,

  update(dt, hra) {
    const ui = hra.ui;
    const auto = hra.stav.auto;
    ui._rychlomer.hidden = !auto;
    if (auto) ui._kmh.textContent = Math.round(auto.rychlostKmh);

    const dotyk = hra.vstup.dotyk;
    if (auto) {
      ui.napoveda(auto.rychlostKmh < 25 ? (dotyk ? 'E – vystúpiť' : 'E – vystúpiť · Medzerník – ručná brzda') : null);
    } else if (hra.hrac?.najblizsieAuto()) {
      ui.napoveda('E – nastúpiť do auta');
    } else {
      ui.napoveda(null);
    }
  },
};
