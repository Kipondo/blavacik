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
  {
    id: 'gloria-tvar',
    popis: 'Glória: veža podľa prieskumu – podnož, ustúpené 4. NP, veža do 69 m so zaoblenou SZ stenou, horná hmota do 96 m '
      + 'a kocka 29. NP do 100 m (nie obrysy OSM s presklenými hornými časťami a náhodnými balkónmi)',
    oprava: 'feature/gloria (#128) – tools/blender/vyskove/gloria.py podľa prieskumu',
    tolerancia: 0,
    async spusti() {
      const chyby = [];
      const r = await fetch('assets/pamiatky/gloria.json');
      if (!r.ok) return { skontrolovane: 0, chyby: [{ text: 'chýba assets/pamiatky/gloria.json' }] };
      const info = await r.json();
      const vysky = info.vysky ?? [];
      for (const [h, nazov] of [[69, 'strecha veže (20. NP)'], [100, 'kocka 29. NP']]) {
        if (!vysky.some((v) => Math.abs(v - h) < 0.6)) chyby.push({ text: `v modeli chýba ${nazov} ${h} m` });
      }
      // veža (obrys so strechou 69 m) má zaoblenú SZ stenu – oblúk z viacerých bodov
      const i = vysky.findIndex((v) => Math.abs(v - 69) < 0.6);
      if (i >= 0 && (info.obrysy?.[i]?.length ?? 0) < 12) chyby.push({ text: 'obrys veže nemá zaoblenú SZ stenu' });
      if (Math.abs((info.vyska ?? 0) - 100) > 0.5) chyby.push({ text: `výška ${info.vyska} m namiesto 100 m` });
      // časti OSM 1462633086/087 (86 m) sú na fotkách otvorené rámy na terase, nie plné hmoty
      if (vysky.some((v) => Math.abs(v - 86) < 0.6)) chyby.push({ text: 'rámy na terase 20. NP sú plné hmoty do 86 m' });
      return { skontrolovane: 1, chyby };
    },
  },
  {
    id: 'nbs-strieska',
    popis: 'Národná banka Slovenska: veľká strieška pred vstupom (OSM 411828074, building:part=roof) je doska na stĺpoch – '
      + 'pod ňou sa dá prejsť (nie plná kamenná krabica), budovy dlaždíc sú tam vyhodené a socha Biatec je súčasťou modelu',
    oprava: 'feature/nbs (#126) – tools/blender/vyskove/nbs.py podľa prieskumu',
    tolerancia: 0,
    async spusti() {
      const chyby = [];
      const r = await fetch('assets/pamiatky/nbs.json');
      if (!r.ok) return { skontrolovane: 0, chyby: [{ text: 'chýba assets/pamiatky/nbs.json' }] };
      const info = await r.json();
      const lok = ([x, z]) => [x - info.stred[0], z - info.stred[1]];
      // body pod klinom striešky (medzi pylónmi zástav a stenou podnože) a pri soche Biatec
      const podStrieskou = [[500.0, -1066.0], [503.0, -1058.0], [498.5, -1072.0]].map(lok);
      const biatec = lok([481.7, -1049.4]);
      if (!info.bezKoliziiObrysov) chyby.push({ text: 'obrysy modelu robia kolízie – strieška by bola plný blok' });
      const kolizie = info.bezKoliziiObrysov ? (info.kolizie ?? []) : (info.obrysy ?? []);
      for (const [x, z] of podStrieskou) {
        if (kolizie.some((k) => vnutri(x, z, k))) chyby.push({ text: `bod pod strieškou (${x.toFixed(1)}, ${z.toFixed(1)}) je v kolízii` });
        if (!(info.nahradit ?? []).some((k) => vnutri(x, z, k))) chyby.push({ text: `pod strieškou (${x.toFixed(1)}, ${z.toFixed(1)}) ostávajú budovy dlaždíc` });
      }
      if (!(info.nahraditSochy ?? []).some((k) => vnutri(biatec[0], biatec[1], k))) chyby.push({ text: 'socha Biatec z OSM sa stavia navyše k modelu' });
      return { skontrolovane: podStrieskou.length + 1, chyby };
    },
  },
];
