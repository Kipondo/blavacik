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
];
