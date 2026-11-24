// Kontroly ciest: pás vozovky sa v zákrutách neprekrúti (js/mapa/cesty/cesty.js), terén pod cestami
// v laserovom výreze je pozdĺžne vyhladený (tools/mesto/laser/cesty_teren.py → data/mapa/mesto/t/*.bin)
// susedné dlaždice podrobného terénu majú na spoločnej hrane rovnakú výšku (tools/mesto/laser/svy_terenu.py)
// a zvýšený chodník neleží na vozovke (js/mapa/cesty/chodniky.js, vozovky.js).

import { vytvorCesty, pridajPas, zjemni, rozsahyZnacenia, bezPrekryvu, prednostZnacenia } from '../../../js/mapa/cesty/cesty.js';
import { posunutaLinia } from '../../../js/mapa/cesty/cyklopruhy-modul.js';
import { najdiOstrovceky, ostrovcekyDlazdice, vOstrovceku } from '../../../js/mapa/cesty/ostrovceky.js';
import { vytvorObrubnikyChodnikov } from '../../../js/mapa/cesty/obrubniky-chodnikov.js';
import { vytvorChodniky } from '../../../js/mapa/cesty/chodniky.js';
import { najdiKrizovatky } from '../../../js/mapa/cesty/krizovatky.js';
import { tvarKrizovatky, tvarSpoja, spojeCiest } from '../../../js/mapa/cesty/krizovatky-tvar.js';
import { preruseniaChodnikov } from '../../../js/mapa/cesty/rohy-chodnikov.js';
import { mriezkaVozoviek } from '../../../js/mapa/cesty/vozovky.js';

const ROVINA = { vyska: () => 0, vyskaTerenu: () => 0 };

/** Podrobný terén dlaždice z data/mapa/mesto/t/<kluc>.bin (gzip, rozdiely po riadkoch, cm nad 100 m). */
export async function teren(kluc) {
  const r = await fetch(`data/mapa/mesto/t/${kluc}.bin`);
  if (!r.ok) return null;
  let buf = await r.arrayBuffer();
  const b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x1f && b[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const dl = new Uint16Array(buf);
  const n = Math.round(Math.sqrt(dl.length));
  const H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) { s = (s + dl[j * n + i]) & 0xffff; H[j * n + i] = s / 100 + 100; }
  }
  return { n, H };
}

/** Najkratšia vzdialenosť bodu od lomenej čiary. */
function vzdialenostOdOsi(x, z, body) {
  let m = Infinity;
  for (let i = 1; i < body.length; i++) {
    const [ax, az] = body[i - 1], [bx, bz] = body[i];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

export const kontrolyCiest = [
  {
    id: 'cesty-bez-prekrutenia',
    popis: 'Pás vozovky sa v ostrých zákrutách ani vo vlásenkách neprekrúti – žiadny otočený trojuholník '
      + '(23. 11. 2026: 0 – zaoblený spoj vo vlásenke a výber uhlopriečky; predtým 26 na milión, pôvodný kód ~300)',
    oprava: 'c6c47a7 Cesty: … pokos v zákrutách (vnútorný okraj ostrej zákruty sa nevracia späť) + test prevrátených trojuholníkov a zdvojených bodov (#136, časť 3)',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const g = vytvorCesty(cesty, ROVINA);
        g.traverse((o) => {
          if (!o.isMesh) return;
          // len asfalt (značenie je ten istý pás, len prerušený pri križovatkách – #136)
          if (o.name !== 'asfalt') { o.geometry.dispose(); return; }
          const p = o.geometry.getAttribute('position').array, idx = o.geometry.index.array;
          for (let t = 0; t < idx.length; t += 3) {
            const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
            const ux = p[b] - p[a], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vz = p[c + 2] - p[a + 2];
            const ny = uz * vx - ux * vz;          // y zložka (b − a) × (c − a): + = normála hore
            n++;
            if (ny < -0.1) chyby.push({ x: +p[a].toFixed(1), z: +p[a + 2].toFixed(1), dlazdica: kluc, text: `prekrútený pás cesty (${(-ny / 2).toFixed(1)} m²)` });
          }
          o.geometry.dispose();
          o.material.map?.dispose?.();
        });
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'teren-pod-cestami',
    popis: 'Podrobný terén pod osami ciest je pozdĺžne vyhladený (cesta „neschodí“ na obrubníkoch a múrikoch z lasera)',
    oprava: 'c932c37 Terén pod cestami vyhladený (#54) – po pregenerovaní lasera spustiť tools/mesto/laser/cesty_teren.py',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const kluc of ctx.index.terenDetail?.dlazdice ?? []) {
        const d = ctx.dlazdice.get(kluc), t = await teren(kluc);
        if (!d || !t) continue;
        const [i, j] = kluc.split('_').map(Number);
        const krok = ctx.index.dlazdica / (t.n - 1);
        const odch = [];
        for (const c of d.cesty ?? []) {
          if (c.most || c.nadjazd || !(c.body?.length > 1)) continue;
          // vzorka každé 2 m dĺžky osi (nezávisle od počtu bodov – zaoblené lomy osi pridali body, js/mapa/cesty/upravy-osi.js),
          // bez krajného radu uzlov dlaždice (cesta pozdĺž hranice z nej vychádza a vracia sa – profil by preskakoval)
          const prof = [];
          let dalsia = 0, s0 = 0;
          for (let k = 1; k < c.body.length; k++) {
            const [ax, az] = c.body[k - 1], [bx, bz] = c.body[k];
            const L = Math.hypot(bx - ax, bz - az);
            for (; dalsia < s0 + L; dalsia += 2) {
              const f = L > 0 ? (dalsia - s0) / L : 0;
              const u = (ax + (bx - ax) * f - i * ctx.index.dlazdica) / krok, v = (az + (bz - az) * f - j * ctx.index.dlazdica) / krok;
              if (u >= 1 && u <= t.n - 2 && v >= 1 && v <= t.n - 2) prof.push(t.H[Math.round(v) * t.n + Math.round(u)]);
            }
            s0 += L;
          }
          if (prof.length < 12) continue;
          let suma = 0;
          for (let k = 0; k < prof.length; k++) suma += Math.abs(prof[k] - median(prof.slice(Math.max(0, k - 3), k + 4)));
          odch.push(suma / prof.length);
        }
        if (!odch.length) continue;
        n++;
        const priemer = odch.reduce((a, b) => a + b, 0) / odch.length;
        if (priemer > 0.05) chyby.push({ dlazdica: kluc, text: `terén pod cestami nie je vyhladený (odchýlka ${priemer.toFixed(3)} m)` });
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'chodniky-mimo-vozovky',
    popis: 'Zvýšený chodník neleží na vozovke cesty (rozdelené cesty mali chodník v protismernom páse, ostré zákruty na vlastnej vozovke)',
    oprava: 'feature/chodniky-plochy (#146) a fix/cesty-zvysky – chodniky.js: prerušenie na vozovke (aj vlastnej), jednosmerka bez stredného pásu (#136); 23 150 → 0',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const { krizovatky } = najdiKrizovatky(cesty);
        const g = vytvorChodniky(cesty, krizovatky, ROVINA);
        const vozovky = mriezkaVozoviek(cesty);
        const videne = new Set();
        const p = g.children[0].geometry.getAttribute('position').array;
        for (let t = 0; t < p.length; t += 9) {
          n++;
          const x = (p[t] + p[t + 3] + p[t + 6]) / 3, z = (p[t + 2] + p[t + 5] + p[t + 8]) / 3;
          if (!vozovky.naVozovke(x, z, null, 0.5)) continue;
          const id = `${Math.round(x / 3)}|${Math.round(z / 3)}`;
          if (videne.has(id)) continue;
          videne.add(id);
          chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: 'chodník na vozovke' });
        }
        g.traverse((o) => o.geometry?.dispose());
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'rychle-cesty-bez-skokov',
    popis: 'Rýchle cesty mimo podrobného terénu (diaľnice, cesty I.–III. triedy) bez úsekov strmších ako 22 % na 10 m '
      + 'v hrubom teréne – najviac 30 (23. 11. 2026: 57 len na diaľniciach → 13)',
    oprava: 'fix/teren-mosty-dialnice – tools/mesto/laser/cesty_teren_hruby.py (prepady pri koncoch mostov, #54); spúšťať po teren.py',
    tolerancia: 30,
    async spusti(ctx) {
      const meta = await (await fetch('data/mapa/mesto/teren.json')).json();
      const v = new Int16Array(await (await fetch('data/mapa/mesto/teren.bin')).arrayBuffer());
      const { sirka: W, hlbka: D, krok: K, minX, minZ } = meta;
      const h = (x, z) => {
        const fx = Math.min(W - 1.0001, Math.max(0, (x - minX) / K)), fz = Math.min(D - 1.0001, Math.max(0, (z - minZ) / K));
        const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
        return ((v[j * W + i] * (1 - tx) + v[j * W + i + 1] * tx) * (1 - tz) + (v[(j + 1) * W + i] * (1 - tx) + v[(j + 1) * W + i + 1] * tx) * tz) / 10;
      };
      const RYCHLE = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link']);
      const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        if (detail.has(kluc)) continue;
        for (const c of d.cesty ?? []) {
          if (!RYCHLE.has(c.typ) || c.most || c.nadjazd || !(c.body?.length > 1)) continue;
          const body = [];
          for (let i = 1; i < c.body.length; i++) {
            const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
            const k = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 5));
            for (let q = 0; q < k; q++) body.push([ax + (bx - ax) * q / k, az + (bz - az) * q / k]);
          }
          body.push(c.body.at(-1));
          let posledny = -1e9;
          for (let i = 2; i < body.length; i++) {
            const [ax, az] = body[i - 2], [bx, bz] = body[i];
            const L = Math.hypot(bx - ax, bz - az);
            if (L < 8) continue;
            n++;
            if (Math.abs(h(bx, bz) - h(ax, az)) / L > 0.22 && i - posledny > 4) {
              posledny = i;
              chyby.push({ x: +body[i - 1][0].toFixed(1), z: +body[i - 1][1].toFixed(1), dlazdica: kluc, text: `${c.typ}: skok v hrubom teréne` });
            }
          }
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'teren-bez-svov',
    popis: 'Susedné dlaždice podrobného terénu sa na spoločnej hrane nelíšia o viac ako 0,3 m (schod v teréne a na ceste)',
    oprava: 'fix/teren-nabrezie – tools/mesto/laser/svy_terenu.py zošil 19 švov až do 6,9 m (#54); spúšťať po cesty_teren.py',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
      const cache = new Map();
      const daj = async (k) => { if (!cache.has(k)) cache.set(k, await teren(k)); return cache.get(k); };
      let n = 0;
      for (const kluc of detail) {
        const [i, j] = kluc.split('_').map(Number);
        const a = await daj(kluc);
        if (!a) continue;
        for (const [di, dj] of [[1, 0], [0, 1]]) {
          const sused = `${i + di}_${j + dj}`;
          if (!detail.has(sused)) continue;
          const b = await daj(sused);
          if (!b || b.n !== a.n) continue;
          n++;
          let max = 0;
          for (let s = 0; s < a.n; s++) {
            const ha = di ? a.H[s * a.n + a.n - 1] : a.H[(a.n - 1) * a.n + s];
            const hb = di ? b.H[s * b.n] : b.H[s];
            max = Math.max(max, Math.abs(ha - hb));
          }
          if (max > 0.3) chyby.push({ dlazdica: kluc, text: `šev ${kluc} | ${sused}: ${max.toFixed(2)} m` });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'krizovatky-oble-rohy',
    popis: 'Asfalt križovatky má tvar podľa ciest s oblými rohmi (nie kruh cez okraje) bez prekrížených obrysov '
      + '(„háčiky“ pri vidliciach) a spoj dvoch ciest so zlomom nemá na vonkajšej strane klin trávy (pravidlá ulice)',
    oprava: 'feature/pravidla-ulice – js/mapa/cesty/krizovatky-tvar.js, plochy-krizovatiek.js, upravy-osi.js',
    tolerancia: 10,
    spusti(ctx) {
      const chyby = [];
      const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
      const pretina = (a, b, c, d) => o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
      const jednoduchy = (P) => {
        for (let i = 0; i < P.length; i++) {
          for (let j = i + 2; j < P.length; j++) {
            if (i === 0 && j === P.length - 1) continue;
            if (pretina(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) return false;
          }
        }
        return true;
      };
      const vnutri = (x, z, P) => {
        let c = false;
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
          if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
        }
        return c;
      };
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = d.cesty ?? [];
        const { krizovatky } = najdiKrizovatky(cesty);
        for (const k of krizovatky.values()) {
          const t = tvarKrizovatky(k, cesty);
          if (!t) continue;
          n++;
          if (!jednoduchy(t.obrys)) chyby.push({ x: k.x, z: k.z, dlazdica: kluc, text: `prekrížený obrys križovatky (${t.ramena.length} ramien)` });
        }
        for (const k of spojeCiest(cesty, krizovatky)) {
          const t = tvarSpoja(k, cesty);
          if (!t) continue;
          n++;
          const m = t.obrys[Math.floor(t.obrys.length / 2)];
          if (!vnutri(k.x + (m[0] - k.x) * 0.8, k.z + (m[1] - k.z) * 0.8, t.obrys)) chyby.push({ x: k.x, z: k.z, dlazdica: kluc, text: 'klin na vonkajšej strane spoja ciest' });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'rohy-chodnikov',
    popis: 'Chodník s obrubníkom obíde oblý roh križovatky (spojí chodníky oboch ciest) a na rovnej strane priebežnej '
      + 'cesty pri T-križovatke sa neprerušuje (pravidlá ulice)',
    oprava: 'feature/pravidla-ulice-2 – js/mapa/cesty/rohy-chodnikov.js, chodniky.js',
    tolerancia: 0,
    spusti(ctx) {
      let postavene = 0, vhodne = 0, rovne = 0;
      for (const d of ctx.dlazdice.values()) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const { krizovatky } = najdiKrizovatky(cesty);
        const g = vytvorChodniky(cesty, krizovatky, ROVINA);
        postavene += g.userData.rohy?.postavene ?? 0;
        vhodne += g.userData.rohy?.vhodne ?? 0;
        for (const zoz of preruseniaChodnikov(cesty, krizovatky).values()) {
          for (const u of zoz) for (const smer of [1, -1]) for (const strana of [1, -1]) if (u.r[smer][strana] === 0) rovne++;
        }
        g.traverse((o) => o.geometry?.dispose());
      }
      const chyby = [];
      if (!vhodne || postavene < 0.5 * vhodne) chyby.push({ text: `postavených rohov chodníkov len ${postavene} z ${vhodne}` });
      if (!rovne) chyby.push({ text: 'chodník sa pri križovatke prerušuje aj na rovnej strane priebežnej cesty' });
      return { skontrolovane: vhodne, chyby };
    },
  },
  {
    id: 'pas-cesty-od-zaciatku',
    popis: 'Pás cesty (asfalt aj značenie) má plnú šírku už v prvom bode – predtým sa na začiatku každej cesty zúžil '
      + 'na ~40 % (nenormovaný smer v prvom bode) a čiary pruhov išli šikmo krížom; to isté pri cyklopruhoch, ktoré '
      + 'preto začínali v strede cesty a ľavý s pravým sa krížili do „X“ (Mýtna pri NBS)',
    oprava: 'feature/pravidla-ulice-3 – js/mapa/cesty/cesty.js pridajPas, cyklopruhy-modul.js posunutaLinia',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        for (const c of d.cesty ?? []) {
          if (!(c.body?.length > 1) || c.nadjazd) continue;
          const body = zjemni(c.body, 2.5);
          if (body.length < 2) continue;
          const s = { poz: [], uv: [], idx: [] };
          pridajPas(s, body, c.sirka / 2, 0, ROVINA, { po: 1 });
          n++;
          const sirka = Math.hypot(s.poz[0] - s.poz[6], s.poz[2] - s.poz[8]);
          if (Math.abs(sirka - c.sirka) > 0.05) chyby.push({ x: c.body[0][0], z: c.body[0][1], dlazdica: kluc, text: `začiatok pásu ${sirka.toFixed(1)} m namiesto ${c.sirka} m (${c.nazov || c.typ})` });
        }
      }
      // cyklopruhy: každý bod posunutej osi je od osi cesty aspoň 90 % posunu
      let pruhy = [];
      try { pruhy = (await (await fetch('data/mapa/cyklopruhy.json')).json()).pruhy ?? []; } catch { /* bez súboru */ }
      for (const p of pruhy) {
        const os = Math.max(0.5, p.s / 2 - 0.9);
        for (const strana of [p.p ? 1 : 0, p.l ? -1 : 0].filter(Boolean)) {
          const lin = posunutaLinia(p.body, strana * os);
          n++;
          const zle = lin.find(([x, z]) => vzdialenostOdOsi(x, z, p.body) < 0.9 * os);
          if (zle && chyby.length < 50) chyby.push({ x: +zle[0].toFixed(1), z: +zle[1].toFixed(1), text: `cyklopruh mimo okraja cesty (${vzdialenostOdOsi(zle[0], zle[1], p.body).toFixed(1)} m od osi namiesto ${os.toFixed(1)} m)` });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'znacenie-prednost',
    popis: 'Kde sa vozovky dvoch ciest prekrývajú (rozdvojenie, pripájací pruh), kreslí čiary len dôležitejšia cesta – '
      + 'čiary nejdú krížom cez seba (predtým napr. Bajkalská a diaľničné vetvy: dve sady čiar cez seba)',
    oprava: 'feature/pravidla-ulice-3 – js/mapa/cesty/cesty.js bezPrekryvu, prednostZnacenia; vozovky.js vsetky',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      // vidlica: hlavná cesta 14 m a odbočovacia vetva 7 m zo spoločného bodu pod malým uhlom
      const M = { typ: 'primary', sirka: 14, pruhy: 4, body: [[0, 0], [120, 0]] };
      const V = { typ: 'primary_link', sirka: 7, pruhy: 1, body: [[0, 0], [120, 12]] };
      const cesty = [V, M];
      const vozovky = mriezkaVozoviek(cesty);
      const poradie = new Map(cesty.map((c, i) => [c, prednostZnacenia(c) - i * 1e-9]));
      const rozsahy = (c) => {
        const j = zjemni(c.body, 2.5);
        return { j, r: bezPrekryvu(rozsahyZnacenia(c.body, j, null, c.typ), j, c, vozovky, poradie) };
      };
      const m = rozsahy(M), v = rozsahy(V);
      const dlzkaM = m.r.reduce((a, [od, po]) => a + po - od, 0);
      if (dlzkaM < m.j.length - 2) chyby.push({ text: `hlavná cesta prišla o značenie (${dlzkaM} z ${m.j.length - 1} úsekov)` });
      for (const [od, po] of v.r) {
        for (let i = od; i <= po; i++) {
          const [x, z] = v.j[i];
          if (Math.abs(z) < M.sirka / 2 - 0.3) { chyby.push({ x, z, text: 'čiary vetvy na vozovke hlavnej cesty' }); break; }
        }
      }
      if (!v.r.length) chyby.push({ text: 'vetva nemá značenie ani tam, kde je už mimo hlavnej cesty' });
      return { skontrolovane: 2, chyby };
    },
  },
  {
    id: 'ostrovceky-zelene',
    popis: 'Dopravné ostrovčeky a deliace pásy (malé plochy obkolesené cestami, bez budovy) sa nájdu a nemajú '
      + 'chodník okolitých ciest – len obrubník a trávu (pravidlá ulice)',
    oprava: 'feature/pravidla-ulice-3 – js/mapa/cesty/ostrovceky.js, chodniky.js, textura-zeme.js',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      // umelý trojuholník ciest: 1 ostrovček; s domom vnútri žiadny
      const troj = [
        { typ: 'secondary', sirka: 7, body: [[0, 0], [40, 0]] },
        { typ: 'secondary', sirka: 7, body: [[40, 0], [20, 30]] },
        { typ: 'secondary', sirka: 7, body: [[20, 30], [0, 0]] },
      ];
      if (najdiOstrovceky(troj).length !== 1) chyby.push({ text: 'trojuholník ciest nie je ostrovček' });
      if (najdiOstrovceky(troj, [{ body: [[18, 8], [22, 8], [22, 12], [18, 12]] }]).length) chyby.push({ text: 'ostrovček s budovou' });
      let n = 0, chodnikov = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const ostrovceky = ostrovcekyDlazdice(d);
        if (!ostrovceky.length) continue;
        n += ostrovceky.length;
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        const { krizovatky } = najdiKrizovatky(cesty);
        const g = vytvorChodniky(cesty, krizovatky, ROVINA, ostrovceky);
        const p = g.children[0].geometry.getAttribute('position').array;
        for (let t = 0; t < p.length; t += 9) {
          const x = (p[t] + p[t + 3] + p[t + 6]) / 3, z = (p[t + 2] + p[t + 5] + p[t + 8]) / 3;
          if (!vOstrovceku(ostrovceky, x, z)) continue;
          chodnikov++;
          if (chodnikov <= 20) chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: 'chodník v ostrovčeku' });
        }
        g.traverse((o) => o.geometry?.dispose());
      }
      if (ctx.dlazdice.size > 4 && !n) chyby.push({ text: 'v načítaných dlaždiciach sa nenašiel žiadny ostrovček' });
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'obrubniky-chodnikov',
    popis: 'Samostatné chodníky v zeleni majú obrubníky a žiadny obrubník neleží na vozovke cesty (pravidlá ulice)',
    oprava: 'feature/pravidla-ulice-3 – js/mapa/cesty/obrubniky-chodnikov.js',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let trojuholnikov = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const g = vytvorObrubnikyChodnikov(d, ROVINA);
        const vozovky = mriezkaVozoviek((d.cesty ?? []).filter((c) => !c.nadjazd));
        g.traverse((o) => {
          if (!o.isMesh) return;
          const p = o.geometry.getAttribute('position').array;
          for (let t = 0; t < p.length; t += 9) {
            trojuholnikov++;
            const x = (p[t] + p[t + 3] + p[t + 6]) / 3, z = (p[t + 2] + p[t + 5] + p[t + 8]) / 3;
            if (vozovky.naVozovke(x, z, null, 0.3) && chyby.length < 30) chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: 'obrubník chodníka na vozovke' });
          }
          o.geometry.dispose();
        });
      }
      if (ctx.dlazdice.size > 4 && !trojuholnikov) chyby.push({ text: 'žiadne obrubníky chodníkov' });
      return { skontrolovane: trojuholnikov, chyby };
    },
  },
  {
    id: 'tunely-zasypane',
    popis: 'Pred cestnými tunelmi pod rovnou ulicou a pred vjazdmi do podzemných garáží (hra ich nekreslí) nie je '
      + 'v teréne slepá jama zo zárezu – napr. Staromestská pod Hodžovým námestím pri Prezidentskom paláci (jama 7 m '
      + 's oporným múrom), Žabotova pod traťou, 12 vjazdov do garáží pod rovnou ulicou',
    oprava: 'fix/tunel-hodzovo, fix/zasyp-garaze – tools/mesto/laser/zasyp_tunely.py (zoznam tunely.json); spúšťať po teren.py, pred cesty_teren.py',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      const r = await fetch('tools/mesto/laser/tunely.json');
      if (!r.ok) return { skontrolovane: 0, chyby: [{ text: 'chýba tools/mesto/laser/tunely.json' }] };
      const D = ctx.index.dlazdica;
      const cache = new Map();
      const daj = async (k) => { if (!cache.has(k)) cache.set(k, await teren(k)); return cache.get(k); };
      const vyska = async (x, z) => {
        const i = Math.floor(x / D), j = Math.floor(z / D), t = await daj(`${i}_${j}`);
        if (!t) return NaN;
        const krok = D / (t.n - 1);
        return t.H[Math.round((z - j * D) / krok) * t.n + Math.round((x - i * D) / krok)];
      };
      let n = 0;
      for (const tunel of (await r.json()).tunely ?? []) {
        for (const [px0, pz0] of tunel.portaly) {
          // ako zasyp_tunely.py: uzol do 5 m od portálu proti mediánu okna 42 m okolo neho (svah nevadí, len jama)
          const px = Math.round(px0 / 2) * 2, pz = Math.round(pz0 / 2) * 2;
          let jama = 0;
          for (let dx = -4; dx <= 4; dx += 2) {
            for (let dz = -4; dz <= 4; dz += 2) {
              if (dx * dx + dz * dz > 25) continue;
              const h = await vyska(px + dx, pz + dz);
              if (!Number.isFinite(h)) continue;
              const okno = [];
              for (let a = -20; a <= 20; a += 2) {
                for (let b = -20; b <= 20; b += 2) {
                  const v = await vyska(px + dx + a, pz + dz + b);
                  if (Number.isFinite(v)) okno.push(v);
                }
              }
              jama = Math.max(jama, median(okno) - h);
            }
          }
          n++;
          if (jama > 1.5) chyby.push({ x: px0, z: pz0, text: `${tunel.nazov}: jama pri portáli ${jama.toFixed(1)} m` });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
];
