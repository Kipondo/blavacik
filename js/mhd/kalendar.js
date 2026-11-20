// Kalendár MHD: ktoré služby (pracovný deň, prázdniny, sobota, nedeľa+sviatky…) jazdia v daný deň.
// Pracuje s kalendárom z GTFS (index.kalendar) – dni v týždni, platnosť a výnimky.

/** Date → "RRRRMMDD" (miestny čas). */
export const naKod = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** Množina indexov služieb (podľa index.sluzby), ktoré jazdia v daný deň. */
export function aktivneSluzby(index, datum) {
  const kod = naKod(datum);
  const den = (datum.getDay() + 6) % 7; // 0 = pondelok
  const out = new Set();
  index.sluzby.forEach((id, i) => {
    const k = index.kalendar[id];
    if (!k) return;
    if (k.navyse.includes(kod)) { out.add(i); return; }
    if (k.nejazdi.includes(kod)) return;
    if (kod < k.od || kod > k.do) return;
    if (k.dni[den]) out.add(i);
  });
  return out;
}

/** Typ dňa pre hru: 'pracovny' | 'prazdniny' | 'sobota' | 'nedela' (podľa služieb, ktoré jazdia). */
export function typDna(index, datum) {
  const aktivne = aktivneSluzby(index, datum);
  const ma = (meno) => index.sluzby.some((id, i) => id.startsWith(meno) && aktivne.has(i));
  if (ma('Prac')) return 'pracovny';
  if (ma('Leto')) return 'prazdniny';
  if (ma('Soboty')) return 'sobota';
  return 'nedela';
}
