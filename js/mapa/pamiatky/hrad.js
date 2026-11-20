// Bratislavský hrad – štvorkrídlový palác okolo nádvoria, biela fasáda,
// červené strechy a štyri rohové veže (juhozápadná Korunná veža je najvyššia).
// Porovnanie so skutočnosťou (etapa 4): čisto biela fasáda s pravidelnými oknami so svetlými rámami
// (bez výkladov a ríms), na strechách krídel dlhé rady vikierov.
// Rozmery podľa OSM: ~92 × 78 m, krídla 22 m, veže 31 m.

import * as THREE from 'three';
import { fasada, kvader, ihlan, valbovaStrecha, rimsa, naMiesto, vikier } from './pomocne.js';

const BIELA = '#f3efe6';
const STRECHA = '#a5472f';
const KAMEN = '#cbc3b1';

export default function postav(p, { vyskopis, kolizie }) {
  const SIRKA = 88, HLBKA = 72, KRIDLO = 16, VYSKA = 22, VEZA = 12, VYSKA_VEZE = 31;
  const g = new THREE.Group();

  // kamenná terasa (opevnenie) pod palácom
  const terasa = kvader(SIRKA + 34, 5, HLBKA + 30, KAMEN);
  terasa.position.y = 0.5;
  g.add(terasa);

  const y0 = 3;
  const kridla = [
    [0, -(HLBKA - KRIDLO) / 2, SIRKA, KRIDLO],
    [0, (HLBKA - KRIDLO) / 2, SIRKA, KRIDLO],
    [-(SIRKA - KRIDLO) / 2, 0, KRIDLO, HLBKA - 2 * KRIDLO],
    [(SIRKA - KRIDLO) / 2, 0, KRIDLO, HLBKA - 2 * KRIDLO],
  ];
  for (const [x, z, w, d] of kridla) {
    const k = fasada(w, VYSKA, d, BIELA, { druh: 'okna', okno: [3.4, 6.6] });
    k.position.set(x, y0 + VYSKA / 2, z);
    g.add(k);
    // rady vikierov na oboch dlhých stranách krídla (von aj do nádvoria)
    const pozdlzX = w >= d, dlzka = pozdlzX ? w : d, kratka = pozdlzX ? d : w;
    const sklon = 9 / ((kratka + 1.2) / 2);
    const pocet = Math.floor((dlzka - 2 * KRIDLO) / 6.8);
    for (let i = 0; i < pocet; i++) {
      const t = (i - (pocet - 1) / 2) * 6.8;
      for (const s_ of [-1, 1]) {
        const v = vikier({ stena: BIELA, strecha: STRECHA, sirka: 1.8, vyska: 1.9 });
        const odSteny = kratka / 2 - 0.7;
        v.position.set(x + (pozdlzX ? t : s_ * odSteny), y0 + VYSKA + sklon * 1.3 - 0.2, z + (pozdlzX ? s_ * odSteny : t));
        v.rotation.y = pozdlzX ? (s_ > 0 ? 0 : Math.PI) : (s_ > 0 ? Math.PI / 2 : -Math.PI / 2);
        g.add(v);
      }
    }
    const r = rimsa(w, d, y0 + VYSKA - 0.3, '#ffffff', 0.25, 0.35);
    r.position.x = x; r.position.z = z;
    g.add(r);
    const s = valbovaStrecha(w + 1.2, 9, d + 1.2, STRECHA);
    s.position.set(x, y0 + VYSKA, z);
    g.add(s);
  }
  // nádvorie
  const nadvorie = kvader(SIRKA - 2 * KRIDLO, 0.3, HLBKA - 2 * KRIDLO, '#d9d2c2');
  nadvorie.position.y = y0;
  g.add(nadvorie);

  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const korunna = sx === -1 && sz === 1;
    const vyska = VYSKA_VEZE + (korunna ? 6 : 0);
    const x = sx * (SIRKA / 2 - VEZA / 2 + 1.5), z = sz * (HLBKA / 2 - VEZA / 2 + 1.5);
    const veza = fasada(VEZA, vyska, VEZA, BIELA, { okno: [3, 5.2] });
    veza.position.set(x, y0 + vyska / 2, z);
    g.add(veza);
    const r = rimsa(VEZA, VEZA, y0 + vyska - 0.3, '#ffffff', 0.35);
    r.position.x = x; r.position.z = z;
    g.add(r);
    const strecha = ihlan(VEZA + 1.6, korunna ? 14 : 10, VEZA + 1.6, STRECHA);
    strecha.position.set(x, y0 + vyska, z);
    g.add(strecha);
  }

  // brána na nádvorie (východná strana)
  const brana = kvader(1, 8, 6, '#3d3127');
  brana.position.set(SIRKA / 2 + 0.05, y0 + 4, 0);
  g.add(brana);

  naMiesto(g, p, vyskopis, SIRKA, HLBKA);
  kolizie.pridajObdlznik(p.x, p.z, SIRKA + 2, HLBKA + 2, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
