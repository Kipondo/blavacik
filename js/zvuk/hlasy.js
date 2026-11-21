// Hlasy postáv: pri zobrazení repliky prehrá jej nahrávku (assets/zvuk/dialogy/<dialóg>/<index>_<variant>.ogg).
// Nahrávky robí automaticky Google Gemini TTS cez GitHub Actions (tools/hlasy/generuj.mjs, .github/workflows/hlasy.yml),
// zoznam je v assets/zvuk/dialogy/index.json. Keď nahrávka chýba, ostanú len titulky.
//
// Udalosti (posiela zobrazovanie dialógov, js/dialogy/):
//   'dialog-replika' { dialog: 'vlak-babka', index: 3, variant?: 'zaklad' | 'vychod' | 'mix' | 'blava' }
//   'dialog-koniec'  {}  – stíši hlas

export class Hlasy {
  constructor(z) {
    this.z = z;
    this.zoznam = null;
    this.cache = new Map();
    this.hra = null;
    fetch('assets/zvuk/dialogy/index.json')
      .then((r) => (r.ok ? r.json() : { repliky: {} }))
      .then((j) => { this.zoznam = j.repliky ?? {}; })
      .catch(() => { this.zoznam = {}; });
  }

  async prehraj({ dialog, index, variant = 'zaklad' }) {
    this.stop();
    if (!this.zoznam || !this.z.pripraveny) return;
    const kluc = `${dialog}/${index}_${variant}`;
    const zaznam = this.zoznam[kluc] ?? this.zoznam[`${dialog}/${index}_zaklad`];
    if (!zaznam) return;
    const cesta = `assets/zvuk/dialogy/${zaznam.subor}`;
    try {
      if (!this.cache.has(cesta)) {
        this.cache.set(cesta, fetch(cesta).then((r) => r.arrayBuffer()).then((b) => this.z.ctx.decodeAudioData(b)));
      }
      const buffer = await this.cache.get(cesta);
      const s = this.z.ctx.createBufferSource();
      s.buffer = buffer;
      s.connect(this.z.vystup(null, 'hlasy'));
      s.start();
      this.aktualny = s;
    } catch (e) {
      console.warn('Hlas sa nepodarilo prehrať:', kluc, e?.message ?? e);
    }
  }

  stop() {
    try { this.aktualny?.stop(); } catch { /* už dohral */ }
    this.aktualny = null;
  }
}
