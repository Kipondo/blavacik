// Načíta pamiatky z data/mapa/pamiatky.json.
// Každá pamiatka s poľom "model" sa postaví modulom js/mapa/pamiatky/<model>.js.
//
// Novú stavbu pridáš takto (žiadny iný súbor netreba meniť):
//   1. vytvor js/mapa/pamiatky/moja-stavba.js:
//        export default function postav(p, kontext) {
//          // p = záznam z JSON (x, z, natocenie, nazov, ...vlastné parametre)
//          // kontext = { THREE, vyskopis, kolizie, KONFIG }
//          const objekt = new THREE.Group(); ...
//          kontext.kolizie.pridajObdlznik(p.x, p.z, 20, 10, p.natocenie);
//          return { objekt, update(cas) {} };   // update je nepovinný
//        }
//   2. pridaj záznam do data/mapa/pamiatky.json:
//        { "model": "moja-stavba", "nazov": "Moja stavba", "x": 0, "z": 0, "natocenie": 0,
//          "zaber": { "kruh": 20 }, "dosah": 40 }
//
// "zaber" = kde generátor mapy nesmie postaviť bežné budovy ({ "kruh": r } alebo { "obdlznik": [w, d] }).
// "dosah" = v akej vzdialenosti sa hráčovi zobrazí názov miesta.
// Záznam bez "model" je len pomenovaná oblasť (napr. park, námestie).

import * as THREE from 'three';

export async function nacitajPamiatky(pamiatky, kontext) {
  const skupina = new THREE.Group();
  skupina.name = 'pamiatky';
  const aktualizacie = [];

  const vysledky = await Promise.allSettled(
    pamiatky.filter((p) => p.model).map(async (p) => {
      const modul = await import(`./${p.model}.js`);
      const vysledok = await modul.default(p, { THREE, ...kontext });
      return { p, vysledok };
    }),
  );

  for (const r of vysledky) {
    if (r.status === 'rejected') {
      console.warn('Pamiatku sa nepodarilo postaviť:', r.reason);
      continue;
    }
    const { p, vysledok } = r.value;
    if (!vysledok?.objekt) continue;
    vysledok.objekt.name = p.nazov ?? p.model;
    if (!vysledok.objekt.userData.bezTiena) {
      vysledok.objekt.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    // za hmlou sa pamiatka nekreslí (js/kamera/dohlad.js): stred a polomer celej stavby
    const gula = new THREE.Box3().setFromObject(vysledok.objekt).getBoundingSphere(new THREE.Sphere());
    if (Number.isFinite(gula.radius) && gula.radius > 0 && !vysledok.objekt.userData.dohlad) {
      vysledok.objekt.userData.dohlad = { x: gula.center.x, z: gula.center.z, max: Infinity, r: gula.radius };
    } else if (!vysledok.objekt.userData.dohlad) {
      // model podľa terénu sa načíta až neskôr (pri stavbe je skupina prázdna) – stred záznamu a polomer z dosahu
      vysledok.objekt.userData.dohlad = { x: p.x, z: p.z, max: Infinity, r: p.dosah ?? 200 };
    }
    skupina.add(vysledok.objekt);
    if (vysledok.update) aktualizacie.push(vysledok.update);
  }

  skupina.userData.update = (cas) => { for (const u of aktualizacie) u(cas); };
  return skupina;
}
