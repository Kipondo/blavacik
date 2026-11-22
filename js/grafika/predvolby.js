// Predvoľby kvality grafiky (#58): čo sa mení medzi nízkou, strednou, vysokou a ultra kvalitou.
// Zblízka ostáva grafika rovnaká (vysoká = dnešný vzhľad), predvoľby šetria hlavne diaľku:
//   dohlad      – m, kde končí hmla; za ňou sa nič nestavia ani nekreslí (okrem oblohy a obrysu kopcov)
//   hmlaOd      – podiel dohľadu, kde hmla začína (bližšie je obraz čistý ako doteraz)
//   detail      – m, okruh plne podrobných dlaždíc okolo hráča; ďalej po dohľad len jednoduché bloky budov
//   drobnosti   – m, do akej vzdialenosti sa kreslia lavičky, značky, tabule ulíc, hroby (lampy 2×)
//   aut, chodcov – najviac NPC áut a chodcov naraz (jazdia/chodia len v okolí hráča)
//   tiene       – veľkosť mapy tieňov (0 = bez tieňov), dosahTienov – m okolo hráča
//   efekty      – úroveň obrazových efektov v js/grafika/efekty/ (nizka = bez efektov)
//   trava       – m, dosah trsov trávy (0 = bez trávy)
//   pixel       – [najmenší, najväčší] pomer pixelov pre automatické rozlíšenie (js/grafika/rozlisenie.js)
// Východisko sú hodnoty z Taipei Rush (komentár v #58), upravené meraním na trase #60 tak,
// aby sa zblízka nič nezhoršilo (mapa tieňov, efekty a NPC na vysokej sú ako pred #58).

export const PREDVOLBY = {
  nizka: {
    dohlad: 420, hmlaOd: 0.3, detail: 250, drobnosti: 70, aut: 40, chodcov: 120,
    tiene: 0, dosahTienov: 0, efekty: 'nizka', trava: 0, pixel: [0.7, 1.0],
  },
  stredna: {
    dohlad: 650, hmlaOd: 0.35, detail: 350, drobnosti: 105, aut: 90, chodcov: 250,
    tiene: 2048, dosahTienov: 100, efekty: 'stredna', trava: 18, pixel: [0.75, 1.25],
  },
  vysoka: {
    dohlad: 900, hmlaOd: 0.35, detail: 450, drobnosti: 150, aut: 200, chodcov: 450,
    tiene: 4096, dosahTienov: 120, efekty: 'vysoka', trava: 30, pixel: [0.8, 1.5],
  },
  ultra: {
    dohlad: 1300, hmlaOd: 0.35, detail: 600, drobnosti: 220, aut: 200, chodcov: 450,
    tiene: 4096, dosahTienov: 150, efekty: 'vysoka', trava: 30, pixel: [0.9, 2.0],
  },
};

export const UROVNE = ['nizka', 'stredna', 'vysoka', 'ultra'];

/** Názov grafickej karty (WebGL). Pri automatickej voľbe rozhoduje o prvom odhade kvality. */
export function nazovKarty(gl) {
  try {
    if (!gl) gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { return ''; }
}

/** Prvý odhad pri voľbe „auto“: integrovaná grafika → stredná, bez karty (softvérové kreslenie) → nízka, inak vysoká. */
export function odhadUrovne(gl) {
  const n = nazovKarty(gl);
  if (/swiftshader|llvmpipe|software|microsoft basic/i.test(n)) return 'nizka';
  if (/intel|iris|uhd|radeon\(tm\) graphics|vega|mali|adreno/i.test(n)) return 'stredna';
  return 'vysoka';
}

/** Úroveň pre uloženú voľbu (auto → odhad podľa karty). */
export function urovenPreVolbu(volba, gl) {
  return UROVNE.includes(volba) ? volba : odhadUrovne(gl);
}
