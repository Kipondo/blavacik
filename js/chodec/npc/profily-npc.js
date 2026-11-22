// Profily NPC (data/postavy/npc.json): náhodné poskladanie konkrétneho chodca –
// profil podľa početnosti, variant oblečenia a účesu, farby z paliet, tvar tela z rozsahov, výška a rýchlosť chôdze.
// Rovnaké semienko = rovnaký chodec (napr. stály predavač na rohu).

import { nacitajSatnik } from '../postava/satnik.js';

let data = null;

/** Stiahne npc.json a satnik.json (raz). Vráti Promise<{ npc, satnik }>. */
export function nacitajNpcData(url = new URL('../../../data/postavy/npc.json', import.meta.url)) {
  if (!data) data = Promise.all([fetch(url).then((r) => r.json()), nacitajSatnik()]).then(([npc, satnik]) => ({ npc, satnik }));
  return data;
}

/** Generátor náhodných čísel 0..1 so semienkom (xorshift32). */
export function nahoda(semienko = Math.floor(Math.random() * 2 ** 32)) {
  let s = (semienko >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const vyber = (r, pole) => pole[Math.floor(r() * pole.length) % pole.length];
const rozsah = (r, [a, b]) => a + (b - a) * r();

/** Normálne rozdelenie (Box–Muller) orezané na [od, do] – mimo rozsahu sa losuje znova. */
function normalne(r, priemer, odchylka, od, po) {
  for (let i = 0; i < 8; i++) {
    const u = Math.max(1e-9, r()), v = r();
    const x = priemer + odchylka * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    if (x >= od && x <= po) return x;
  }
  return priemer;
}

/**
 * Výška chodca (m) podľa profilu: 'vyska' = { priemer, odchylka, od, do } (issue #96 – reálne rozdelenie,
 * muži ~180 ± 7 cm, ženy ~167 ± 6 cm, dôchodcovia o pár cm nižší). Vlastný generátor zo semienka,
 * aby sa ostatné vlastnosti chodca so semienkom nezmenili.
 */
function vyskaChodca(p, model, semienko) {
  const v = p.vyska;
  if (!v || !model?.vyska) return null;
  const r = nahoda(((semienko ?? Math.floor(Math.random() * 2 ** 32)) ^ 0x68e31da4) >>> 0);
  return normalne(r, v.priemer, v.odchylka, v.od, v.do);
}

/** Profil podľa početnosti (pole 'pocetnost' v npc.json). */
export function nahodnyProfil(npc, r = Math.random) {
  const ids = Object.keys(npc.profily);
  const spolu = ids.reduce((s, id) => s + (npc.profily[id].pocetnost ?? 1), 0);
  let x = r() * spolu;
  for (const id of ids) {
    x -= npc.profily[id].pocetnost ?? 1;
    if (x < 0) return id;
  }
  return ids[ids.length - 1];
}

/**
 * Poskladá chodca. Vráti popis pre vytvorNpc():
 * { profil, nazov, model, url, variant, kusy, farby, vzhlad, vyska, mierka, rychlost, opity }
 */
export function poskladajChodca({ npc }, { profil = null, semienko } = {}) {
  const r = nahoda(semienko);
  const pid = profil ?? nahodnyProfil(npc, r);
  const p = npc.profily[pid];
  if (!p) throw new Error(`Neznámy profil NPC: ${pid}`);
  const vi = Math.floor(r() * p.varianty.length);
  const v = p.varianty[vi];
  const paleta = (meno) => npc.palety[meno] ?? [meno];
  const farby = {};
  for (const k of v.kusy) if (p.farby?.[k]) farby[k] = vyber(r, paleta(p.farby[k]));
  const tvar = {};
  for (const [m, rr] of Object.entries(p.tvar ?? {})) tvar[m] = rozsah(r, rr);
  const model = npc.modely[p.model];
  const vyska = vyskaChodca(p, model, semienko);
  const rMierka = rozsah(r, p.mierka ?? [1, 1]);
  const rRychlost = rozsah(r, p.rychlost ?? [1.3, 1.5]);
  return {
    profil: pid,
    nazov: p.nazov,
    model: p.model,
    url: npc.modely[p.model].subor,
    variant: `${pid}_${vi}`,
    kusy: v.kusy,
    farby,
    vzhlad: {
      tvar,
      ucet: v.ucet ?? 'ziadny',
      brada: p.brady ? vyber(r, p.brady) : 'ziadna',
      plet: vyber(r, paleta(p.plet ?? 'plet')),
      vlasy: vyber(r, paleta(p.vlasy ?? 'vlasy')),
    },
    usmev: r() * 0.5,
    // výška celým modelom (nie len nohami); vyšší chodí rýchlejšie a dlhším krokom (~ odmocnina z výšky)
    vyska: vyska ?? (model?.vyska ?? 1.75) * rMierka,
    mierka: vyska ? vyska / model.vyska : rMierka,
    rychlost: vyska ? rRychlost * Math.sqrt(vyska / p.vyska.priemer) : rRychlost,
    opity: r() < (p.opity ?? 0),
  };
}
