// Nastavenia myši v menu: citlivosť a invertovaná os Y. Ukladajú sa do localStorage.

const KLUC = 'blavacik.mys';
const PREDVOLENE = { citlivost: 1, invertovatY: false };

export function nacitajNastavenia() {
  try {
    const n = JSON.parse(localStorage.getItem(KLUC) ?? 'null');
    if (n && typeof n === 'object') {
      return {
        citlivost: Number.isFinite(n.citlivost) ? Math.min(3, Math.max(0.2, n.citlivost)) : PREDVOLENE.citlivost,
        invertovatY: !!n.invertovatY,
      };
    }
  } catch { /* localStorage nemusí byť dostupný */ }
  return { ...PREDVOLENE };
}

function uloz(n) {
  try { localStorage.setItem(KLUC, JSON.stringify(n)); } catch { /* nevadí */ }
}

/** Vloží do úvodného menu blok s nastaveniami; priZmene(n) sa zavolá po každej zmene. */
export function vlozNastaveniaDoMenu(nastavenia, priZmene) {
  const okno = document.querySelector('.menu-okno');
  if (!okno) return;
  const blok = document.createElement('div');
  blok.className = 'menu-mys';
  blok.innerHTML = `
    <label class="menu-mys-riadok">
      <span>Citlivosť myši</span>
      <input type="range" min="0.2" max="3" step="0.1" class="menu-mys-citlivost" aria-label="Citlivosť myši">
      <output class="menu-mys-hodnota"></output>
    </label>
    <label class="menu-mys-riadok">
      <input type="checkbox" class="menu-mys-invert">
      <span>Invertovať os Y</span>
    </label>`;
  const ovladanie = okno.querySelector('.menu-ovladanie');
  okno.insertBefore(blok, ovladanie ?? null);

  const posuvnik = blok.querySelector('.menu-mys-citlivost');
  const hodnota = blok.querySelector('.menu-mys-hodnota');
  const invert = blok.querySelector('.menu-mys-invert');
  const n = { ...nastavenia };
  posuvnik.value = String(n.citlivost);
  hodnota.textContent = n.citlivost.toFixed(1).replace('.', ',');
  invert.checked = n.invertovatY;

  posuvnik.addEventListener('input', () => {
    n.citlivost = Number(posuvnik.value);
    hodnota.textContent = n.citlivost.toFixed(1).replace('.', ',');
    uloz(n); priZmene({ ...n });
  });
  invert.addEventListener('change', () => {
    n.invertovatY = invert.checked;
    uloz(n); priZmene({ ...n });
  });
}
