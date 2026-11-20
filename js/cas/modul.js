// Modul herných hodín (issue #20).
//
// Pre ostatné moduly:
//   hra.stav.datumCas                 – aktuálny herný dátum a čas (Date), zapisuje sa každý snímok
//   hra.stav.rychlostCasu             – aktuálne zrýchlenie času (1 = skutočný čas)
//   hra.hodiny.teraz()                – to isté ako hra.stav.datumCas
//   hra.hodiny.blizko(kto, metre)     – hlásenie „nablízku je niečo, čo potrebuje skutočný čas“ (každý snímok)
//   hra.hodiny.preskoc(sekundy | { hodina, minuta })  – preskočenie času (spánok, čakanie, jazda)
//   hra.hodiny.nastav(datum)          – presný dátum a čas (napr. začiatok kapitoly)
// Udalosť 'casPreskoceny' { od, do } – po skoku v čase.
// Počas pauzy čas stojí.
import { Hodiny } from './hodiny.js';
import { HudHodiny } from './hud-hodiny.js';

export default {
  nazov: 'hodiny',
  poradie: 5, // skoro ako prvý, aby ostatné moduly v tom istom snímku videli aktuálny čas

  init(hra) {
    this.hodiny = new Hodiny(hra);
    hra.hodiny = this.hodiny;
  },

  update(dt, hra) {
    this.hodiny.update(dt);
    // HUD vrstvu vytvára modul hud – hodiny sa do nej pridajú, keď existuje
    if (!this.hud && hra.ui?.vrstva) this.hud = new HudHodiny(hra);
    this.hud?.update(hra.stav.datumCas, hra.stav.rychlostCasu);
  },
};
