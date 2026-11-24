// Kontroly modelov pamiatok (assets/pamiatky/*.json): tvar a náhrady, ktoré pri prerábaní modelov vypadli.

const vnutri = (x, z, b) => {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    if ((b[i][1] > z) !== (b[j][1] > z) && x < (b[j][0] - b[i][0]) * (z - b[i][1]) / (b[j][1] - b[i][1]) + b[i][0]) c = !c;
  }
  return c;
};

export const kontrolyPamiatok = [
  {
    id: 'nivy-strieska-vstupu',
    popis: 'Západný vstup Nív: pod strieškou na stĺpoch Y je otvorené predpolie (hmota centra ju neprekrýva) a model '
      + 'tam aj tak nahrádza budovy dlaždíc (inak sa pod strieškou objavila všeobecná budova)',
    oprava: 'feature/nivy (#132) – tools/blender/vyskove/nivy.py: hmota = obrys bez striešky, „nahradit“ = celý obrys',
    tolerancia: 0,
    async spusti() {
      const chyby = [];
      const r = await fetch('assets/pamiatky/nivy.json');
      if (!r.ok) return { skontrolovane: 0, chyby: [{ text: 'chýba assets/pamiatky/nivy.json' }] };
      const info = await r.json();
      // stred striešky (OSM 989250478) v metroch hry → lokálne súradnice modelu
      const [x, z] = [1436.8 - info.stred[0], -334.4 - info.stred[1]];
      if ((info.obrysy ?? []).some((o) => vnutri(x, z, o))) chyby.push({ text: 'strieška je vnútri hmoty modelu (prekrytá)' });
      if (!(info.nahradit ?? []).some((o) => vnutri(x, z, o))) chyby.push({ text: 'pod strieškou sa nenahrádzajú budovy dlaždíc' });
      return { skontrolovane: 1, chyby };
    },
  },
  {
    id: 'pyramida-tvar',
    popis: 'Slovenský rozhlas: model je obrátený ihlan so súvislými šikmými stenami (horná hrana štvorec ~74,6 m so stredom '
      + 'v strede Pyramídy), nie schodovitá kopa krabíc z vrstiev OSM po podlažiach',
    oprava: 'feature/pyramida (#125) – tools/blender/vyskove/rozhlas.py podľa prieskumu',
    tolerancia: 0,
    async spusti() {
      const chyby = [];
      const r = await fetch('assets/pamiatky/rozhlas.json');
      if (!r.ok) return { skontrolovane: 0, chyby: [{ text: 'chýba assets/pamiatky/rozhlas.json' }] };
      const info = await r.json();
      const stred = [464.3 - info.stred[0], -1168.1 - info.stred[1]];
      const ihlan = (info.obrysy ?? []).find((o) => {
        if (o.length !== 4) return false;
        const cx = o.reduce((s, p) => s + p[0], 0) / 4, cz = o.reduce((s, p) => s + p[1], 0) / 4;
        const strana = Math.hypot(o[1][0] - o[0][0], o[1][1] - o[0][1]);
        return Math.hypot(cx - stred[0], cz - stred[1]) < 2 && Math.abs(strana - 74.6) < 1.5;
      });
      if (!ihlan) chyby.push({ text: 'v modeli nie je horná hrana ihlanu (štvorec ~74,6 m v strede Pyramídy)' });
      if ((info.obrysy ?? []).length > 4) chyby.push({ text: `model má ${info.obrysy.length} obrysov – vyzerá ako vrstvy OSM po podlažiach` });
      return { skontrolovane: 1, chyby };
    },
  },
];
