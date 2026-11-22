// Modul: príchod na Hlavnú stanicu – krátka úvodná scénka po načítaní (A4), bez systému cutscén.
// Po štarte hry (udalosť 'start') stojí Ďoďo na 1. nástupišti (data/mapa/zakladna.json → spawn.hrac):
//   1. kamera pomaly obíde Ďoďa od koľají k budove stanice (~5 s), zaznie gong a hlásenie rozhlasu,
//   2. zazvoní mobil – mama (data/dialogy/vlak-prichod.json), hráč počas toho stojí,
//   3. pokyn „Choď do haly…“ – pri staničnom filozofovi sa jeho rada spustí sama (js/mapa/stanica/postavy.js),
//   potom voľná hra. Scénka sa nespustí, ak hráč nie je pri stanici (napr. teleport na štarte).
// Enter / medzerník preskočí repliku titulkov.

const TRVANIE_KAMERY = 5.5;    // s

export default {
  nazov: 'stanica-prichod',
  poradie: 96,

  init(hra) {
    this.hra = hra;
    this.faza = null;
    hra.na('start', () => this.zacni());
  },

  async zacni() {
    const hra = this.hra, h = hra.hrac?.pozicia;
    const s = hra.mapa?.data?.spawn?.hrac;
    if (!h || !s || Math.hypot(h.x - s.x, h.z - s.z) > 30) return;
    // automatický test (testovacia trasa cez Playwright, ?meranie) ovláda kameru sám – scénku preskočíme
    if (navigator.webdriver || new URLSearchParams(location.search).has('meranie')) return;
    this.faza = 'kamera';
    this.t = 0;
    hra.vstup.blokovane = true;
    this.kamera = hra.moduly.find((m) => m.nazov === 'kamera');
    // modul kamery počas scénky nekreslí pohľad za hráčom (kamerou hýbe táto scénka)
    if (this.kamera) {
      this.povodne = { update: this.kamera.update, updateVzdy: this.kamera.updateVzdy };
      this.kamera.update = () => {};
      this.kamera.updateVzdy = () => {};
    }
    hra.posli('zvuk', { meno: 'gong', x: h.x, y: h.y + 6, z: h.z, sila: 1 });
  },

  updateVzdy(dt) {
    const hra = this.hra;
    if (this.faza === 'kamera') {
      this.t += dt;
      const h = hra.hrac.pozicia, u = hra.hrac.uhol ?? 0;
      const f = Math.min(1, this.t / TRVANIE_KAMERY), e = f * f * (3 - 2 * f);
      // oblúk okolo Ďoďa: z boku od koľají (sprava) za chrbát, výška 6 → 2,2 m
      const a = u + Math.PI * (0.45 + 0.55 * e), r = 9 - 5 * e;
      const k = hra.kamera;
      k.position.set(h.x + Math.sin(a) * r, h.y + 6 - 3.8 * e, h.z + Math.cos(a) * r);
      k.lookAt(h.x + Math.sin(u) * 6 * e, h.y + 1.5 + 2 * (1 - e), h.z + Math.cos(u) * 6 * e);
      hra.scena.getObjectByName('obloha')?.position.copy(k.position);
      if (f >= 1) this.telefon();
    } else if (this.faza === 'k-filozofovi') {
      const f = hra.stanica && hra.moduly.find((m) => m.nazov === 'stanica-postavy')?.postavy?.find((p) => p.druh === 'filozof');
      const h = hra.hrac?.pozicia;
      if (f && h && Math.hypot(f.x - h.x, f.z - h.z) < 6 && !hra.titulky?.bezi) {
        this.faza = null;
        hra.ui?.pokyn?.(null);
        hra.posli('stanica-filozof');
      }
    }
  },

  async telefon() {
    const hra = this.hra;
    this.faza = 'telefon';
    if (this.kamera && this.povodne) Object.assign(this.kamera, this.povodne);
    hra.posli('zvuk', { meno: 'zvoncek', sila: 0.6 });
    await hra.titulky?.prehraj('vlak-prichod', { blokuj: true });
    hra.vstup.blokovane = false;
    this.faza = 'k-filozofovi';
    hra.ui?.pokyn?.('Choď do haly – pri priechode z nástupišťa stojí staničný filozof');
    // pokyn zmizne aj sám, keď hráč odíde inam
    setTimeout(() => { if (this.faza === 'k-filozofovi') { this.faza = null; hra.ui?.pokyn?.(null); } }, 180000);
  },
};
