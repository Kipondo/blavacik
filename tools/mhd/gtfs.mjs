// Načítanie GTFS súborov (CSV) z archívu do polí objektov.
import { rozbalZip } from './zip.mjs';

/** Rozdelí jeden riadok CSV (podporuje úvodzovky). */
function riadok(s) {
  if (!s.includes('"')) return s.split(',');
  const out = [];
  let pole = '', vUvodz = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (vUvodz) {
      if (c === '"' && s[i + 1] === '"') { pole += '"'; i++; }
      else if (c === '"') vUvodz = false;
      else pole += c;
    } else if (c === '"') vUvodz = true;
    else if (c === ',') { out.push(pole); pole = ''; }
    else pole += c;
  }
  out.push(pole);
  return out;
}

/** CSV text → pole objektov podľa hlavičky. */
export function citajCsv(text) {
  const riadky = text.replace(/^﻿/, '').split(/\r?\n/);
  const hlavicka = riadok(riadky[0]);
  const out = [];
  for (let i = 1; i < riadky.length; i++) {
    if (!riadky[i]) continue;
    const h = riadok(riadky[i]);
    const o = {};
    for (let k = 0; k < hlavicka.length; k++) o[hlavicka[k]] = h[k] ?? '';
    out.push(o);
  }
  return out;
}

/** Načíta všetky potrebné tabuľky GTFS. */
export function nacitajGtfs(cestaZip) {
  const subory = rozbalZip(cestaZip);
  const t = (meno) => {
    const b = subory.get(meno);
    return b ? citajCsv(b.toString('utf8')) : [];
  };
  return {
    agency: t('agency.txt'),
    feed: t('feed_info.txt')[0] ?? {},
    routes: t('routes.txt'),
    stops: t('stops.txt'),
    trips: t('trips.txt'),
    stopTimes: t('stop_times.txt'),
    calendar: t('calendar.txt'),
    calendarDates: t('calendar_dates.txt'),
    shapes: t('shapes.txt'),
  };
}
