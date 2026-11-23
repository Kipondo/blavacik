// Kontroly vygenerovaných dlaždíc (data/mapa/mesto/d/*.json): opravy, ktoré robia doplnkové skripty po
// `npm run dlazdice`. Keď sa dlaždice pregenerujú bez nich (alebo sa pri zlučovaní vezme stará verzia súborov),
// počty klesnú a kontrola zlyhá. Minimum je ~90 % stavu z 22. 11. 2026 (rast miest je v poriadku).

const POLE = [
  { id: 'dlazdice-obchody', popis: 'Výklady len pri obchodoch – budovy s `obchod` z OSM', min: 4500,
    oprava: 'tools/mesto/osm-doplnky.mjs (porovnanie, etapa 4: výklady na hrade)', pocitaj: (d) => (d.budovy ?? []).filter((b) => b.obchod).length },
  { id: 'dlazdice-vyvysene-casti', popis: 'Vyvýšené časti budov (veža Kyjeva nad podnožou, horné poschodia) – `minVyska`', min: 1400,
    oprava: '6077b6a tools/mesto/casti-budov.mjs', pocitaj: (d) => (d.budovy ?? []).filter((b) => b.minVyska).length },
  { id: 'dlazdice-priechody', popis: 'Priechody pod budovami (Pasáž Liga…)', min: 2600,
    oprava: '4356a11 tools/mesto/priechody-osm.mjs + priechody.py', pocitaj: (d) => (d.budovy ?? []).filter((b) => b.priechod || b.priechody).length },
  { id: 'dlazdice-podchody', popis: 'Podchody z OSM (schody, chodby)', min: 250,
    oprava: '3d4c831 tools/mesto/podchody.mjs', pocitaj: (d) => (d.podchody ?? []).length },
  { id: 'dlazdice-nadjazdy', popis: 'Nadjazdy, lávky a nadchody (mostovky nad cestou)', min: 1000,
    oprava: '5bf6806 tools/mesto/nadjazdy.mjs', pocitaj: (d) => (d.nadjazdy ?? []).length },
  { id: 'dlazdice-vysky-z-lasera', popis: 'Výšky budov z lasera ÚGKK v celom meste', min: 60000,
    oprava: 'a3ba525 tools/mesto/laser/vysky.py', pocitaj: (d) => (d.budovy ?? []).filter((b) => b.zdrojVysky === 'lidar').length },
  { id: 'dlazdice-sikme-strechy', popis: 'Šikmé strechy neobdĺžnikových domov ostávajú šikmé', min: 26000,
    oprava: 'b326935 vysky.py (stratilo sa pri zlúčení 9449d45, neskôr pregenerované)', pocitaj: (d) => (d.budovy ?? []).filter((b) => b.tvarStrechy === 'sikma').length },
  { id: 'dlazdice-stromy-z-lasera', popis: 'Stromy z lasera v širšom centre, Mlynskej doline, Nivách a Petržalke (dlaždice)', min: 96,
    oprava: 'fb0f221 / fa8c4e5 tools/mesto/laser/stromy.py', pocitaj: (d) => (d.stromyZLasera ? 1 : 0) },
];

export const kontrolyDlazdic = POLE.map((p) => ({
  id: p.id,
  popis: `${p.popis} – aspoň ${p.min}`,
  oprava: p.oprava,
  tolerancia: 0,
  spusti(ctx) {
    let n = 0;
    for (const d of ctx.dlazdice.values()) n += p.pocitaj(d);
    return { skontrolovane: n, chyby: n < p.min ? [{ text: `v dlaždiciach je len ${n} (minimum ${p.min}) – dlaždice sa asi pregenerovali bez skriptu ${p.oprava}` }] : [] };
  },
}));
