// Jednoduchý parser OSM XML (výstup z api.openstreetmap.org/api/0.6/map).
// Bez závislostí – stačí na naše účely (uzly, cesty, relácie a ich značky).

const reAttr = /(\w+)="([^"]*)"/g;
const reTag = /<tag k="([^"]*)" v="([^"]*)"\s*\/>/g;
const dekoduj = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function atributy(s) {
  const a = {};
  for (const m of s.matchAll(reAttr)) a[m[1]] = m[2];
  return a;
}

function znacky(telo) {
  const t = {};
  for (const m of telo.matchAll(reTag)) t[dekoduj(m[1])] = dekoduj(m[2]);
  return t;
}

/** Pridá obsah jedného OSM XML do databázy { uzly, cesty, relacie } */
export function parsujOsm(xml, db = { uzly: new Map(), cesty: new Map(), relacie: new Map() }) {
  // uzly (samozatvárajúce aj s tagmi)
  for (const m of xml.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
    const a = atributy(m[1]);
    if (a.visible === 'false') continue;
    db.uzly.set(a.id, { lat: +a.lat, lon: +a.lon, t: m[3] ? znacky(m[3]) : null });
  }
  for (const m of xml.matchAll(/<way ([^>]*?)>([\s\S]*?)<\/way>/g)) {
    const a = atributy(m[1]);
    const nd = [...m[2].matchAll(/<nd ref="(\d+)"\s*\/>/g)].map((x) => x[1]);
    db.cesty.set(a.id, { nd, t: znacky(m[2]) });
  }
  for (const m of xml.matchAll(/<relation ([^>]*?)>([\s\S]*?)<\/relation>/g)) {
    const a = atributy(m[1]);
    const cleny = [...m[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"\s*\/>/g)]
      .map((x) => ({ typ: x[1], ref: x[2], rola: x[3] }));
    db.relacie.set(a.id, { cleny, t: znacky(m[2]) });
  }
  return db;
}
