// Nastavenie kvality grafiky v menu (nízka / stredná / vysoká). Ukladá sa do localStorage.

const KLUC = 'blavacik.grafika';
export const KVALITY = ['nizka', 'stredna', 'vysoka'];
const NAZVY = { nizka: 'nízka', stredna: 'stredná', vysoka: 'vysoká' };

export function nacitajKvalitu(predvolena = 'vysoka') {
  try {
    const k = localStorage.getItem(KLUC);
    if (KVALITY.includes(k)) return k;
  } catch { /* localStorage nemusí byť dostupný */ }
  return predvolena;
}

/** Vloží do menu riadok s výberom kvality; priZmene(kvalita) sa zavolá po zmene. */
export function vlozKvalituDoMenu(kvalita, priZmene) {
  const okno = document.querySelector('.menu-okno');
  if (!okno) return;
  const blok = document.createElement('div');
  blok.className = 'menu-grafika';
  blok.innerHTML = `<span>Grafika</span>${KVALITY.map((k) => `
    <label><input type="radio" name="menu-grafika" value="${k}"><span>${NAZVY[k]}</span></label>`).join('')}`;
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
}
