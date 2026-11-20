// Z databázy OSM (uzly, cesty, relácie) zostaví geometriu v metroch:
//   ciary    – otvorené aj uzavreté cesty { id, t, body }
//   polygony – plochy (uzavreté cesty a multipolygóny) { id, t, body }
//   body     – uzly so značkami { id, t, x, z }

const PLOCHOVE_ZNACKY = ['building', 'building:part', 'landuse', 'leisure', 'amenity', 'place', 'area', 'natural', 'water', 'man_made', 'area:highway'];

export function vytvorProjekciu(stred) {
  const kx = 111320 * Math.cos((stred.lat * Math.PI) / 180);
  const kz = 111132;
  return (lon, lat) => [
    Math.round((lon - stred.lon) * kx * 10) / 10,
    Math.round(-(lat - stred.lat) * kz * 10) / 10,
  ];
}

function jePlocha(t, uzavreta) {
  if (!uzavreta) return false;
  if (t.area === 'no') return false;
  if (t.highway && t.area !== 'yes') return false;
  if (t.natural === 'tree_row' || t.natural === 'cliff' || t.barrier) return false;
  return PLOCHOVE_ZNACKY.some((k) => t[k] !== undefined);
}

function vnutriPolygonu(x, z, body) {
  let dnu = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, zi] = body[i], [xj, zj] = body[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dnu = !dnu;
  }
  return dnu;
}

/** Pospája cesty (zoznamy bodov) do reťazcov podľa spoločných koncov. */
export function spojRetazce(useky) {
  const zostava = useky.map((u) => [...u]);
  const retazce = [];
  const kluc = (b) => `${b[0]},${b[1]}`;
  while (zostava.length) {
    let r = zostava.pop();
    let zmena = true;
    while (zmena) {
      zmena = false;
      for (let i = 0; i < zostava.length; i++) {
        const u = zostava[i];
        const z0 = kluc(r[0]), z1 = kluc(r[r.length - 1]);
        const u0 = kluc(u[0]), u1 = kluc(u[u.length - 1]);
        if (z1 === u0) r = r.concat(u.slice(1));
        else if (z1 === u1) r = r.concat([...u].reverse().slice(1));
        else if (z0 === u1) r = u.concat(r.slice(1));
        else if (z0 === u0) r = [...u].reverse().concat(r.slice(1));
        else continue;
        zostava.splice(i, 1);
        zmena = true;
        break;
      }
    }
    retazce.push(r);
  }
  return retazce;
}

export function zostavGeometriu(db, stred) {
  const proj = vytvorProjekciu(stred);
  const bod = (id) => {
    const u = db.uzly.get(id);
    return u ? proj(u.lon, u.lat) : null;
  };

  const ciary = [], polygony = [], body = [];
  const bodyCesty = new Map();

  for (const [id, w] of db.cesty) {
    const pts = w.nd.map(bod);
    if (pts.some((p) => !p) || pts.length < 2) continue;
    bodyCesty.set(id, pts);
    const uzavreta = w.nd.length > 3 && w.nd[0] === w.nd[w.nd.length - 1];
    if (jePlocha(w.t, uzavreta)) polygony.push({ id, t: w.t, body: pts.slice(0, -1) });
    else ciary.push({ id, t: w.t, body: pts, nd: w.nd, uzavreta });
  }

  // multipolygóny – vonkajšie obrysy pospájame z členov
  for (const [id, r] of db.relacie) {
    if (r.t.type !== 'multipolygon' && r.t.type !== 'building') continue;
    const vonkajsie = r.cleny.filter((c) => c.typ === 'way' && (c.rola === 'outer' || c.rola === '') && bodyCesty.has(c.ref));
    if (!vonkajsie.length) continue;
    // vnútorné obrysy (dvory budov, ostrovčeky) – priradia sa k vonkajšiemu obrysu, v ktorom ležia
    const vnutorne = [];
    for (const ret of spojRetazce(r.cleny.filter((c) => c.typ === 'way' && c.rola === 'inner' && bodyCesty.has(c.ref)).map((c) => bodyCesty.get(c.ref)))) {
      const a = ret[0], b = ret[ret.length - 1];
      if (ret.length >= 4 && a[0] === b[0] && a[1] === b[1]) vnutorne.push(ret.slice(0, -1));
    }
    for (const ret of spojRetazce(vonkajsie.map((c) => bodyCesty.get(c.ref)))) {
      if (ret.length < 4) continue;
      const a = ret[0], b = ret[ret.length - 1];
      const uzavrety = a[0] === b[0] && a[1] === b[1];
      // nedokončené obrysy (časť je mimo stiahnutej oblasti) uzavrieme priamkou
      const body = uzavrety ? ret.slice(0, -1) : ret;
      const p = { id: `r${id}`, t: r.t, body, neuplny: !uzavrety };
      const diery = vnutorne.filter((v) => vnutriPolygonu(v[0][0], v[0][1], body));
      if (diery.length) p.diery = diery;
      polygony.push(p);
    }
  }

  for (const [id, u] of db.uzly) {
    if (!u.t) continue;
    const [x, z] = proj(u.lon, u.lat);
    body.push({ id, t: u.t, x, z });
  }

  return { ciary, polygony, body };
}
