// Most SNP – šikmý pylón (dve nohy), na vrchu reštaurácia UFO, laná nesúce mostovku.
// Pylón stojí na petržalskom brehu (p.x, p.z), mostovka je v p.most (od/do).

import * as THREE from 'three';
import { tramy, valec, material } from './pomocne.js';

const OCEL = '#cfd4d8';

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const [ax, az] = p.most.od, [bx, bz] = p.most.do;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L;      // smer mosta (na juh, k Petržalke)
  const nx = -uz, nz = ux;                            // naprieč
  const y0 = vyskopis.vyskaTerenu(p.x, p.z);
  const VYSKA = 84, ROZPON = 14, NAKLON = 12;

  // vrchol pylónu je naklonený od rieky (smer +u)
  const vrch = [p.x + ux * NAKLON, y0 + VYSKA, p.z + uz * NAKLON];
  const nohy = [1, -1].map((s) => [p.x + nx * s * ROZPON, y0, p.z + nz * s * ROZPON]);
  const useky = [];
  for (const n of nohy) {
    // noha zložená z niekoľkých hrubších trámov (zúženie nahor)
    useky.push([n, [vrch[0] + nx * Math.sign(n[0] - p.x || 1) * 1.5, vrch[1] - 4, vrch[2]]]);
  }
  g.add(tramy(useky, 3.2, OCEL, { kov: 0.5, lesk: 0.4 }));
  // priečka medzi nohami nad mostovkou
  const priecka = tramy([[
    [p.x + nx * 11 + ux * 2, y0 + 16, p.z + nz * 11 + uz * 2],
    [p.x - nx * 11 + ux * 2, y0 + 16, p.z - nz * 11 + uz * 2],
  ]], 2, OCEL, { kov: 0.5 });
  g.add(priecka);

  // UFO – disk s presklenou reštauráciou
  const ufo = new THREE.Group();
  const spodok = new THREE.Mesh(new THREE.SphereGeometry(13, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material('#d9dde0', { kov: 0.6, lesk: 0.5 }));
  spodok.scale.y = 0.35;
  const okna = valec(13, 13, 3.2, '#2a3a46', 28, { kov: 0.4, lesk: 0.9 });
  okna.position.y = 0;
  const vrchUfo = new THREE.Mesh(new THREE.SphereGeometry(13, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), material('#e4e7e9', { kov: 0.6, lesk: 0.5 }));
  vrchUfo.scale.y = 0.28;
  vrchUfo.position.y = 3.2;
  const veza = valec(0.3, 1, 10, '#e4e7e9', 8);
  veza.position.y = 5;
  ufo.add(spodok, okna, vrchUfo, veza);
  ufo.position.set(...vrch);
  ufo.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(ufo);

  // laná: z pylónu na mostovku smerom k Starému Mestu (dve roviny – po krajoch mosta)
  const lana = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const vysLana = VYSKA - 18 - i * 6;
      const t = 60 + i * 42; // vzdialenosť na mostovke od pylónu (proti smeru u)
      const x = p.x - ux * t + nx * s * 10, z = p.z - uz * t + nz * s * 10;
      const h = vyskopis.vyska(x, z);
      const kotva = [p.x + ux * (NAKLON * vysLana / VYSKA) + nx * s * (ROZPON * (1 - vysLana / VYSKA) + 1), y0 + vysLana, p.z + uz * (NAKLON * vysLana / VYSKA) + nz * s * (ROZPON * (1 - vysLana / VYSKA) + 1)];
      lana.push([kotva, [x, h + 0.5, z]]);
    }
    // zadné kotvenie do zeme za pylónom
    lana.push([[vrch[0] + nx * s * 1.5, vrch[1] - 6, vrch[2]], [p.x + ux * 70 + nx * s * 12, vyskopis.vyskaTerenu(p.x + ux * 70, p.z + uz * 70), p.z + uz * 70 + nz * s * 12]]);
  }
  g.add(tramy(lana, 0.35, '#e9ecee', { kov: 0.7 }));

  for (const n of nohy) kolizie.pridajObdlznik(n[0], n[2], 4, 6, Math.atan2(ux, uz), { typ: 'pamiatka', nazov: 'pylón' });
  return { objekt: g };
}
