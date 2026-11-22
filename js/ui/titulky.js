// Modul: titulky – prehráva dialógy z data/dialogy/*.json ako titulky dole na obrazovke (bez nahratých hlasov).
//
// Zverejní:
//   hra.titulky.prehraj(dialog, { blokuj })  → Promise (po poslednej replike)
//       dialog = id súboru ('vlak-prichod') alebo objekt { postavy, repliky: [{ kto, text }] }
//       blokuj = true → hráč počas dialógu stojí (hra.vstup.blokovane)
//   hra.titulky.bezi                          → práve beží dialóg
// Replika ostane podľa dĺžky textu (2,2–7 s); Enter alebo medzerník preskočí na ďalšiu.
// Formát dialógov: data/dialogy/*.json (postavy { id: { meno, farba } }, repliky [{ kto, text }]).

const cache = new Map();

async function nacitaj(id) {
  if (!cache.has(id)) cache.set(id, fetch(`data/dialogy/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(id);
}

export default {
  nazov: 'titulky',
  poradie: 95,

  init(hra) {
    this.hra = hra;
    this.bezi = false;
    this.el = document.createElement('div');
    this.el.className = 'ui-titulky';
    this.el.hidden = true;
    (hra.ui?.vrstva ?? document.body).appendChild(this.el);
    this.dalsi = null;
    addEventListener('keydown', (e) => {
      if (!this.bezi || (e.code !== 'Enter' && e.code !== 'Space')) return;
      e.preventDefault();
      this.dalsi?.();
    });
    const M = this;
    hra.titulky = {
      prehraj: (d, o) => M.prehraj(d, o),
      get bezi() { return M.bezi; },
    };
  },

  async prehraj(dialog, { blokuj = false } = {}) {
    const d = typeof dialog === 'string' ? await nacitaj(dialog) : dialog;
    if (!d?.repliky?.length) return;
    // dialógy idú po sebe (napr. hlásenie rozhlasu počas telefonátu počká)
    while (this.bezi) await new Promise((r) => setTimeout(r, 200));
    this.bezi = true;
    const vstup = this.hra.vstup;
    if (blokuj && vstup) vstup.blokovane = true;
    try {
      for (const r of d.repliky) {
        const p = d.postavy?.[r.kto] ?? { meno: r.kto, farba: '#ffffff' };
        this.el.innerHTML = '';
        const meno = document.createElement('b');
        meno.textContent = p.meno;
        meno.style.color = p.farba ?? '#fff';
        const text = document.createElement('span');
        text.textContent = r.text;
        this.el.append(meno, text);
        this.el.hidden = false;
        const trvanie = Math.min(7, Math.max(2.2, r.text.length * 0.065));
        await new Promise((res) => {
          const t = setTimeout(res, trvanie * 1000);
          this.dalsi = () => { clearTimeout(t); res(); };
        });
      }
    } finally {
      this.dalsi = null;
      this.el.hidden = true;
      this.bezi = false;
      if (blokuj && vstup) vstup.blokovane = false;
    }
  },
};
