// Hlasitosť v menu: zvuky, hlasy, hudba (0–100 %). Ukladá sa do localStorage (js/zvuk/zvuk.js).

const POLOZKY = [['zvuky', 'Zvuky'], ['hlasy', 'Hlasy'], ['hudba', 'Hudba']];

export function vlozHlasitostDoMenu(hlasitost, priZmene) {
  const okno = document.querySelector('.menu-okno');
  if (!okno) return;
  const blok = document.createElement('div');
  blok.className = 'menu-mys menu-zvuk';
  blok.innerHTML = POLOZKY.map(([k, nazov]) => `
    <label class="menu-mys-riadok">
      <span>${nazov}</span>
      <input type="range" min="0" max="100" step="5" class="menu-mys-citlivost" data-k="${k}" aria-label="Hlasitosť – ${nazov.toLowerCase()}">
      <output class="menu-mys-hodnota"></output>
    </label>`).join('');
  const ovladanie = okno.querySelector('.menu-ovladanie');
  okno.insertBefore(blok, ovladanie ?? null);
  for (const vstup of blok.querySelectorAll('input')) {
    const k = vstup.dataset.k, vystup = vstup.nextElementSibling;
    vstup.value = String(Math.round(hlasitost[k] * 100));
    vystup.textContent = `${vstup.value} %`;
    vstup.addEventListener('input', () => {
      vystup.textContent = `${vstup.value} %`;
      priZmene(k, Number(vstup.value) / 100);
    });
  }
}
