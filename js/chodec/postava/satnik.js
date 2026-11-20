// Šatník: oblečenie ako samostatné siete v .glb, zapínajú sa podľa data/postavy/satnik.json.
// Kus oblečenia skryje časti tela, ktoré úplne zakrýva (aby koža neprešla cez látku).

let satnikData = null;

export async function nacitajSatnik(url = new URL('../../../data/postavy/satnik.json', import.meta.url)) {
  if (!satnikData) satnikData = fetch(url).then((r) => r.json());
  return satnikData;
}

/** Zoznam všetkých častí tela (materiály koza_*) – mení sa len pri novom modeli. */
const CASTI_TELA = ['hlava', 'hrud', 'brucho', 'panva_h', 'panva', 'stehno_h', 'stehno_d', 'lytko', 'clenok',
  'chodidlo', 'rameno_h', 'rameno_d', 'predlaktie', 'dlan'];

/**
 * Oblečie inštanciu postavy. kusy = zoznam id z satnik.kusy, farby = { idKusu: '#rrggbb' } (voliteľné).
 * Vráti zoznam efektov oblečenia (napr. bonus k atraktivite), ktoré môže použiť herná logika.
 */
export function oblec(instancia, satnik, kusy, farby = {}) {
  const zapnute = new Set();
  const skryte = new Set();
  const efekty = {};
  instancia.skryteVlasy = false;
  for (const id of kusy) {
    const kus = satnik.kusy[id];
    if (!kus) { console.warn('Neznámy kus oblečenia:', id); continue; }
    zapnute.add(kus.objekt);
    if (kus.skryvaVlasy) instancia.skryteVlasy = true;
    (kus.skryva || []).forEach((c) => skryte.add(c));
    for (const [k, v] of Object.entries(kus.efekt || {})) efekty[k] = (efekty[k] || 0) + v;
  }
  for (const s of instancia.siete) {
    const meno = s.userData.objekt;
    if (meno.startsWith('odev_')) {
      s.visible = zapnute.has(meno);
      const id = kusy.find((k) => satnik.kusy[k]?.objekt === meno);
      const farba = id && (farby[id] || satnik.kusy[id].farba);
      if (s.visible && farba) s.material.color.set(farba);
    } else if (meno === 'telo') {
      const cast = s.material.name.replace(/^koza_/, '');
      s.visible = !skryte.has(cast);
    } else if (meno.startsWith('vlasy_') && instancia.skryteVlasy) {
      s.visible = false;
    } else if (meno.startsWith('vlasy_') && instancia.ucet) {
      s.visible = meno === 'vlasy_' + instancia.ucet;
    }
  }
  return efekty;
}

export { CASTI_TELA };
