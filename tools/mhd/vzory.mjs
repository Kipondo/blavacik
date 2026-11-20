// Z GTFS spojov vyrobí pre každú linku:
//   trasy  – jedinečné poradia zastávok (s príznakom „na znamenie“),
//   profily – jedinečné jazdné doby (posun odchodu od prvej zastávky v sekundách),
//   spoje  – [trasa, profil, odchod z prvej zastávky (s), služba, cieľ].
import { naSekundy } from './spolocne.mjs';

export function vyrobVzory(gtfs) {
  // Časy zoskupené podľa spoja
  const casy = new Map();
  for (const st of gtfs.stopTimes) {
    if (!casy.has(st.trip_id)) casy.set(st.trip_id, []);
    casy.get(st.trip_id).push(st);
  }
  const linky = new Map(); // route_id → dáta linky
  const sluzby = [...new Set(gtfs.calendar.map((c) => c.service_id))];

  for (const trip of gtfs.trips) {
    const zaznamy = casy.get(trip.trip_id);
    if (!zaznamy || zaznamy.length < 2) continue;
    zaznamy.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    if (!linky.has(trip.route_id)) linky.set(trip.route_id, { trasy: [], kluceTras: new Map(), profily: [], kluceProf: new Map(), ciele: [], spoje: [] });
    const L = linky.get(trip.route_id);

    const zastavky = zaznamy.map((z) => z.stop_id);
    const znamenie = zaznamy.map((z) => (z.pickup_type === '3' || z.drop_off_type === '3' ? 1 : 0));
    const klucT = `${trip.direction_id}|${zastavky.join(',')}|${znamenie.join('')}`;
    let t = L.kluceTras.get(klucT);
    if (t === undefined) {
      t = L.trasy.length;
      L.kluceTras.set(klucT, t);
      L.trasy.push({ smer: Number(trip.direction_id) || 0, zastavky, znamenie, tvar: trip.shape_id, pocet: 0 });
    }
    L.trasy[t].pocet++;

    const start = naSekundy(zaznamy[0].departure_time);
    const posuny = zaznamy.map((z) => naSekundy(z.departure_time) - start);
    const klucP = `${t}|${posuny.join(',')}`;
    let p = L.kluceProf.get(klucP);
    if (p === undefined) { p = L.profily.length; L.kluceProf.set(klucP, p); L.profily.push(posuny); }

    let c = L.ciele.indexOf(trip.trip_headsign);
    if (c < 0) { c = L.ciele.length; L.ciele.push(trip.trip_headsign); }

    L.spoje.push([t, p, start, sluzby.indexOf(trip.service_id), c]);
  }
  for (const L of linky.values()) {
    L.spoje.sort((a, b) => a[2] - b[2]);
    delete L.kluceTras; delete L.kluceProf;
  }
  return { linky, sluzby };
}

/** Kalendár služieb: dni v týždni (po…ne), platnosť a výnimky (+ jazdí navyše, − nejazdí). */
export function vyrobKalendar(gtfs) {
  const kal = {};
  for (const c of gtfs.calendar) {
    kal[c.service_id] = {
      dni: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => Number(c[d])),
      od: c.start_date, do: c.end_date, navyse: [], nejazdi: [],
    };
  }
  for (const v of gtfs.calendarDates) {
    const k = kal[v.service_id];
    if (!k) continue;
    (v.exception_type === '1' ? k.navyse : k.nejazdi).push(v.date);
  }
  return kal;
}
