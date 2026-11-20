// Modul: načíta graf ciest (data/mapa/graf-ciest.json) pre NPC dopravu a navigáciu.
//
//   hra.doprava.graf               – { uzly, hrany, semafory } (formát v js/doprava/graf-ciest.js)
//   hra.doprava.najblizsiUzol(x,z) – index najbližšieho uzla
//   hra.doprava.hranyZUzla(i)      – hrany, po ktorých sa dá z uzla i odísť ({ hrana, smer: 1 | -1 })

export default {
  nazov: 'graf-ciest',
  poradie: 5,

  async init(hra) {
    hra.doprava ??= {};
    try {
      const r = await fetch('data/mapa/graf-ciest.json');
      if (!r.ok) throw new Error(r.status);
      const graf = await r.json();
      const odchody = graf.uzly.map(() => []);
      graf.hrany.forEach((h) => {
        odchody[h.a].push({ hrana: h, smer: 1 });
        if (!h.jednosmerka) odchody[h.b].push({ hrana: h, smer: -1 });
      });
      hra.doprava.graf = graf;
      hra.doprava.hranyZUzla = (i) => odchody[i] ?? [];
      hra.doprava.najblizsiUzol = (x, z) => {
        let naj = -1, min = Infinity;
        graf.uzly.forEach(([ux, uz], i) => {
          const d = (ux - x) ** 2 + (uz - z) ** 2;
          if (d < min) { min = d; naj = i; }
        });
        return naj;
      };
    } catch {
      console.info('Graf ciest nie je k dispozícii (data/mapa/graf-ciest.json).');
    }
  },
};
