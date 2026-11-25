// Mosty ponad rieky podľa skutočnosti:
//   – data/mapa/mosty-dunaj.json (tools/mesto/mosty-dunaj.mjs): päť mostov cez Dunaj z prieskumu – celá dĺžka
//     s estakádami, výškový profil, os v oblúku, lávky, násypy; prepíšu záznamy s rovnakým menom z index.json,
//   – data/mapa/mosty-rieky.json (tools/mesto/mosty-rieky.mjs): všetky ostatné mosty ponad rieky (Malý Dunaj,
//     Chorvátske rameno, prístav, D4, Čunovo, železnica) priamo z ciest a koľají; nahradia ostatné mosty z index.json
//     (tie mali os vedľa cesty a nevideli nepomenované mosty – autá išli do vody).
// Spoločné pre hru (js/mapa/nacitaj-mapu.js) aj kontroly (tools/kontrola/regresie/data.js).

async function nacitaj(cesta) {
  try {
    const r = await fetch(cesta);
    return r.ok ? (await r.json()).mosty ?? [] : [];
  } catch {
    return [];
  }
}

/** { dunaj, rieky } – presné záznamy mostov (prázdne polia, keď súbor chýba). */
export async function nacitajMostyDunaja() {
  const [dunaj, rieky] = await Promise.all([nacitaj('data/mapa/mosty-dunaj.json'), nacitaj('data/mapa/mosty-rieky.json')]);
  return { dunaj, rieky };
}

/** Zoznam mostov hry: mosty cez Dunaj z index.json nahradené presnými, ostatné nahradené mostami z mosty-rieky.json. */
export function zlucMosty(mosty, presne) {
  const { dunaj = [], rieky = [] } = Array.isArray(presne) ? { dunaj: presne } : presne ?? {};
  const podlaMena = new Map(dunaj.map((m) => [m.nazov, m]));
  const zIndexu = (mosty ?? [])
    .filter((m) => podlaMena.has(m.nazov) || !rieky.length)
    .map((m) => (podlaMena.has(m.nazov) ? { ...m, ...podlaMena.get(m.nazov) } : m));
  return [...zIndexu, ...rieky];
}
