// Stromy jednej dlaždice presne tak, ako ich hra postaví – jedno miesto pre hru (js/mapa/dlazdice/postav-dlazdicu.js)
// aj pre regresné kontroly (tools/kontrola/regresie/kontroly.js), aby kontrola overovala to isté, čo hráč vidí.
//   mosty – mosty z mapy (vyskopis.mosty: { ax, az, bx, bz, sirka }), voda – vodné plochy mesta (index.voda)

import { stromyMimoCiest } from './miesto-stromu.js';

export function stromyDlazdice(d, { mosty = [], voda = [] } = {}) {
  return stromyMimoCiest(d.stromy, {
    cesty: d.cesty, kolajnice: d.kolajnice, budovy: d.budovy,
    sluzobne: (d.chodniky ?? []).filter((c) => c.typ === 'sluzobna'),
    mosty: [
      ...mosty.map((m) => ({ body: [[m.ax, m.az], [m.bx, m.bz]], sirka: m.sirka })),
      ...(d.nadjazdy ?? []).map((n) => ({ body: n.body, sirka: n.sirka })),
      // cesty a chodníky označené ako most (aj tie, ktoré nie sú v zozname mostov mapy – napr. pri Starom moste)
      ...[...(d.cesty ?? []), ...(d.chodniky ?? [])].filter((c) => c.most && c.body?.length > 1).map((c) => ({ body: c.body, sirka: c.sirka ?? 6 })),
    ],
    voda: [...voda.map((v) => v.body), ...(d.voda ?? []).map((v) => v.body)],
  }) ?? [];
}
