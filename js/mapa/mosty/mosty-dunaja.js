// Mosty cez Dunaj podľa skutočnosti (data/mapa/mosty-dunaj.json, tools/mesto/mosty-dunaj.mjs): celá dĺžka s estakádami,
// výškový profil, os v oblúku, lávky, násypy. Prepíšu záznamy s rovnakým menom z data/mapa/mesto/index.json.
// Spoločné pre hru (js/mapa/nacitaj-mapu.js) aj kontroly (tools/kontrola/regresie/data.js).

export async function nacitajMostyDunaja() {
  try {
    const r = await fetch('data/mapa/mosty-dunaj.json');
    return r.ok ? (await r.json()).mosty ?? [] : [];
  } catch {
    return [];
  }
}

/** Zoznam mostov z index.json, v ktorom sú mosty cez Dunaj nahradené presnými záznamami. */
export function zlucMosty(mosty, dunaj) {
  const presne = new Map((dunaj ?? []).map((m) => [m.nazov, m]));
  return (mosty ?? []).map((m) => (presne.has(m.nazov) ? { ...m, ...presne.get(m.nazov) } : m));
}
