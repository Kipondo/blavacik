// Záhrady a trávniky v obytnej zástavbe (data/mapa/zastavba.json z tools/mesto/zastavba.mjs).
// Porovnanie so satelitnou snímkou: medzi rodinnými domami aj medzi panelákmi je prevažne tráva,
// v hre bola všade, kde OSM nemá pokrývku, béžová holá zem. V obytnej zástavbe sa preto nespevnená
// zem kreslí ako trávnik – okrem hustej zástavby (vnútrobloky v centre bývajú vydláždené): hustota
// budov sa počíta v okolí ~15 m z rozmazaného pôdorysu budov. Cesty, chodníky, parkoviská
// a ostatná pokrývka sa kreslia až potom, takže zostávajú.

let zastavba = [];
fetch('data/mapa/zastavba.json')
  .then((r) => (r.ok ? r.json() : { zastavba: [] }))
  .then((d) => {
    zastavba = (d.zastavba ?? []).map((b) => {
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of b) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      return { b, ohr: { minX, maxX, minZ, maxZ } };
    });
  })
  .catch(() => {});

const N = 128;             // rozlíšenie masky na dlaždicu (500 m → ~3,9 m)
const ZAHRADA = [108, 148, 70];
const masky = new WeakMap();

/** Maska záhrad dlaždice: plátno N × N s farbou trávy a priehľadnosťou (alebo null). */
function maskaZahrad(d, rect, vJadre) {
  if (masky.has(d)) return masky.get(d);
  const plochy = zastavba.filter(({ ohr: o }) => !(o.maxX < rect.minX || o.minX > rect.maxX || o.maxZ < rect.minZ || o.minZ > rect.maxZ));
  if (!plochy.length) { masky.set(d, null); return null; }
  const m = N / (rect.maxX - rect.minX);
  const platno = () => { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d', { willReadFrequently: true })]; };
  const kresli = (g, body) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo((x - rect.minX) * m, (z - rect.minZ) * m) : g.moveTo((x - rect.minX) * m, (z - rect.minZ) * m)));
    g.closePath();
    g.fill();
  };
  const [cz, gz] = platno();
  gz.fillStyle = '#fff';
  for (const p of plochy) kresli(gz, p.b);
  const [cb, gb] = platno();
  gb.fillStyle = '#fff';
  for (const b of d.budovy ?? []) kresli(gb, b.body);
  const [ch, gh] = platno();
  gh.filter = 'blur(3px)';
  gh.drawImage(cb, 0, 0);
  const z = gz.getImageData(0, 0, N, N).data, h = gh.getImageData(0, 0, N, N).data;
  const [cv, gv] = platno();
  const out = gv.createImageData(N, N);
  let nieco = false;
  for (let i = 0, p = 0; i < z.length; i += 4, p++) {
    // (priehľadné plátno: hustota aj plocha sú v kanáli alfa)
    const hustota = h[i + 3] / 255;
    let a = (z[i + 3] / 255) * (1 - Math.min(1, Math.max(0, (hustota - 0.3) / 0.2)));
    if (a > 0 && vJadre) {
      const x = rect.minX + ((p % N) + 0.5) / m, zz = rect.minZ + (Math.floor(p / N) + 0.5) / m;
      if (vJadre(x, zz)) a = 0;
    }
    out.data[i] = ZAHRADA[0]; out.data[i + 1] = ZAHRADA[1]; out.data[i + 2] = ZAHRADA[2];
    out.data[i + 3] = Math.round(a * 255);
    if (a > 0) nieco = true;
  }
  gv.putImageData(out, 0, 0);
  const vysledok = nieco ? cv : null;
  masky.set(d, vysledok);
  return vysledok;
}

/** Farebná textúra: trávnik záhrad (pred pokrývkou, cestami a chodníkmi). */
export function kresliZahrady(g, d, rect, px, vJadre) {
  const maska = maskaZahrad(d, rect, vJadre);
  if (!maska) return;
  g.save();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(maska, 0, 0, px, px);
  g.restore();
}

/** Mapa tried povrchu: záhrady = tráva (trieda 64) – prekryje pás dlažby okolo domov. */
export function triedyZahrad(g, d, rect, px, vJadre) {
  const maska = maskaZahrad(d, rect, vJadre);
  if (!maska) return;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const gc = c.getContext('2d');
  gc.drawImage(maska, 0, 0);
  gc.globalCompositeOperation = 'source-in';
  gc.fillStyle = 'rgb(64,64,64)';
  gc.fillRect(0, 0, N, N);
  g.save();
  g.imageSmoothingEnabled = true;
  g.drawImage(c, 0, 0, px, px);
  g.restore();
}
