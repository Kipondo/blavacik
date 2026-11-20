// Polohy spojov MHD v danom čase – vypočítané priamo z cestovného poriadku (nič sa nesimuluje),
// takže po preskočení času sú spoje hneď tam, kde majú byť. Počíta sa len pre linky v okolí hráča.
import { aktivneSluzby, naKod } from '../kalendar.js';
import { sekundyDna } from '../cas.js';

/** Bod a smer na lomenej čiare vo vzdialenosti km (s vyrovnávacou pamäťou dĺžok). */
export function bodNaTrase(tr, km) {
  if (!tr._dlzky) {
    tr._dlzky = [0];
    for (let i = 1; i < tr.body.length; i++) {
      tr._dlzky.push(tr._dlzky[i - 1] + Math.hypot(tr.body[i][0] - tr.body[i - 1][0], tr.body[i][1] - tr.body[i - 1][1]));
    }
  }
  const d = tr._dlzky;
  let lo = 0, hi = d.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= km) lo = m; else hi = m; }
  const [ax, az] = tr.body[lo], [bx, bz] = tr.body[hi];
  const l = d[hi] - d[lo] || 1;
  const f = Math.min(1, Math.max(0, (km - d[lo]) / l));
  return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, dx: (bx - ax) / l, dz: (bz - az) / l };
}

export class PolohySpojov {
  constructor(data) {
    this.data = data;
    this.den = '';
    this.sluzby = null;
  }

  /** Služby pre dnešok a včerajšok (nočné spoje po polnoci). */
  _sluzby(teraz) {
    const kod = naKod(teraz);
    if (kod !== this.den) {
      this.den = kod;
      this.sluzby = {
        dnes: aktivneSluzby(this.data.index, teraz),
        vcera: aktivneSluzby(this.data.index, new Date(teraz.getTime() - 86400000)),
      };
    }
    return this.sluzby;
  }

  /**
   * Spoje, ktoré sú práve na ceste, pre dané linky.
   * Vráti [{ linka, typ, trasa, ciel, x, z, dx, dz, km, zastavka (index poslednej/aktuálnej), stoji }].
   * Linky, ktorých dáta sa ešte načítavajú, sa vynechajú (načítajú sa na pozadí).
   */
  naCeste(linky, teraz) {
    const { dnes, vcera } = this._sluzby(teraz);
    const sek = sekundyDna(teraz);
    const out = [];
    for (const linka of linky) {
      const t = this.data.nacitane(linka);
      if (!t) continue;
      const { trasy, poriadok } = t;
      for (const [ti, pi, start, sluzba, ciel] of poriadok.spoje) {
        const prof = poriadok.profily[pi];
        let cas;
        if (dnes.has(sluzba) && sek >= start && sek <= start + prof[prof.length - 1]) cas = sek - start;
        else if (vcera.has(sluzba) && sek + 86400 >= start && sek + 86400 <= start + prof[prof.length - 1]) cas = sek + 86400 - start;
        else continue;
        const tr = trasy.trasy[ti];
        let i = 0;
        while (i < prof.length - 2 && prof[i + 1] <= cas) i++;
        const usek = prof[i + 1] - prof[i];
        const f = usek > 0 ? Math.min(1, (cas - prof[i]) / usek) : 1;
        const km = tr.km[i] + (tr.km[i + 1] - tr.km[i]) * f;
        out.push({ linka, typ: trasy.typ, trasa: ti, ciel: poriadok.ciele[ciel], km, zastavka: i, stoji: f === 0 || f === 1, ...bodNaTrase(tr, km) });
      }
    }
    return out;
  }
}
