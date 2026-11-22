// Nastavenie kvality grafiky v menu (nízka / stredná / vysoká / ultra / auto). Ukladá sa do localStorage.
// Čo ktorá kvalita mení, je v js/grafika/predvolby.js; použije ich modul js/grafika/kvalita.js.

const KLUC = 'blavacik.grafika';
export const KVALITY = ['nizka', 'stredna', 'vysoka', 'ultra', 'auto'];
const NAZVY = { nizka: 'nízka', stredna: 'stredná', vysoka: 'vysoká', ultra: 'ultra', auto: 'auto' };
const POPIS = {
  nizka: 'Krátky dohľad, bez tieňov a efektov – pre slabé notebooky.',
  stredna: 'Kratší dohľad a menej NPC – pre integrovanú grafiku.',
  vysoka: 'Plná grafika zblízka, dohľad 900 m.',
  ultra: 'Ako vysoká, ďalší dohľad (1,3 km) a širšie tiene – pre silné karty.',
  auto: 'Hra si kvalitu vyberie sama podľa plynulosti.',
};

export function nacitajKvalitu(predvolena = 'auto') {
  try {
    const k = localStorage.getItem(KLUC);
    if (KVALITY.includes(k)) return k;
  } catch { /* localStorage nemusí byť dostupný */ }
  return predvolena;
}

/** Vloží do menu riadok s výberom kvality; priZmene(kvalita) sa zavolá po zmene. Vráti funkciu na popis aktuálnej úrovne. */
export function vlozKvalituDoMenu(kvalita, priZmene) {
  const okno = document.querySelector('.menu-okno');
  if (!okno) return () => {};
  const blok = document.createElement('div');
  blok.className = 'menu-grafika';
  blok.innerHTML = `<span>Grafika</span>${KVALITY.map((k) => `
    <label title="${POPIS[k]}"><input type="radio" name="menu-grafika" value="${k}"><span>${NAZVY[k]}</span></label>`).join('')}
    <small class="menu-grafika-stav"></small>`;
  const ovladanie = okno.querySelector('.menu-ovladanie');
  okno.insertBefore(blok, ovladanie ?? null);
  for (const vstup of blok.querySelectorAll('input')) {
    vstup.checked = vstup.value === kvalita;
    vstup.addEventListener('change', () => {
      if (!vstup.checked) return;
      try { localStorage.setItem(KLUC, vstup.value); } catch { /* nevadí */ }
      priZmene(vstup.value);
    });
  }
  const stav = blok.querySelector('.menu-grafika-stav');
  return (text) => { stav.textContent = text; };
}

export const NAZOV_UROVNE = NAZVY;
