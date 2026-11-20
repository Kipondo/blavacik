// Zastávky: nástupištia z GTFS zoskupené podľa kódu zastávky + porovnanie so zastávkami v mape (OSM).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORADIE = { elektricka: 0, trolejbus: 1, autobus: 2, nocny: 3 };
const zoradLinky = (a, b) => {
  const n = (s) => (s.startsWith('N') ? 1000 + parseInt(s.slice(1)) : parseInt(s) || 900);
  return n(a) - n(b);
};

/** Vráti pole zastávok { id, nazov, pasmo, nastupistia: [{ id, oznacenie, x, z, bod, smer, linky, typy }] }. */
export function vyrobZastavky(nastupistia, naNastupisti) {
  const podlaKodu = new Map();
  for (const n of nastupistia.values()) {
    const info = naNastupisti.get(n.id);
    if (!info) continue; // nástupište, kde nič nezastavuje
    if (!podlaKodu.has(n.kod)) podlaKodu.set(n.kod, { id: n.kod, nazov: n.nazov, pasmo: n.pasmo, nastupistia: [] });
    podlaKodu.get(n.kod).nastupistia.push({
      id: n.id, oznacenie: n.oznacenie, x: n.x, z: n.z,
      bod: info.bod, smer: info.smer,
      linky: [...info.linky].sort(zoradLinky),
      typy: [...info.typy].sort((a, b) => PORADIE[a] - PORADIE[b]),
    });
  }
  const out = [...podlaKodu.values()];
  for (const z of out) z.nastupistia.sort((a, b) => a.oznacenie.localeCompare(b.oznacenie));
  return out.sort((a, b) => a.nazov.localeCompare(b.nazov, 'sk'));
}

/** Koľko zastávok z mapy (OSM) má do 30 m nástupište z GTFS a naopak. */
export function porovnajSOsm(nastupistia, naNastupisti, koren) {
  const gtfs = [...nastupistia.values()].filter((n) => naNastupisti.has(n.id));
  const blizko = (x, z) => gtfs.some((n) => Math.abs(n.x - x) < 30 && Math.abs(n.z - z) < 30 && Math.hypot(n.x - x, n.z - z) < 30);
  const vysledok = {};
  const osmJson = join(koren, 'data/mapa/osm.json');
  if (existsSync(osmJson)) {
    const z = JSON.parse(readFileSync(osmJson, 'utf8')).prvky?.zastavky ?? [];
    vysledok.osmJson = { zastavok: z.length, sGtfsDo30m: z.filter((p) => blizko(p.x, p.z)).length };
  }
  const dir = join(koren, 'data/mapa/mesto/d');
  if (existsSync(dir)) {
    const body = [];
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) body.push(...(JSON.parse(readFileSync(join(dir, f), 'utf8')).prvky?.zastavky ?? []));
    }
    vysledok.dlazdice = { zastavok: body.length, sGtfsDo30m: body.filter((p) => blizko(p.x, p.z)).length };
    const osmBlizko = (x, z) => body.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.z - z) < 30 && Math.hypot(p.x - x, p.z - z) < 30);
    vysledok.gtfsSOsmDo30m = gtfs.filter((n) => osmBlizko(n.x, n.z)).length;
    vysledok.gtfsNastupisti = gtfs.length;
  }
  return vysledok;
}
