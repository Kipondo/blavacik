// Nálada osvetlenia: farby oblohy, slnka, hmly a farebné ladenie na jednom mieste.
// Predvolená je „zlatá hodinka“ – nízke teplé slnko, dlhé tiene, modrasté tiene a teplý opar.
// Čítajú ju svet.js (obloha, slnko, hmla), prostredie.js (odrazy) a modul efektov (opar, ladenie).
// Neskôr sa sem dá pridať deň/noc – stačí meniť tieto hodnoty podľa herného času.

export const NALADA = {
  nazov: 'zlatá hodinka',
  // smer K slnku (x = východ, y = hore, z = juh); y 0,2 ≈ 12° nad obzorom, slnko na západe-juhozápade
  slnko: { smer: [-0.86, 0.2, 0.3], farba: '#ffb470', sila: 3.5 },
  // obloha: zenit, obzor a žiara okolo slnka
  obloha: { vrch: '#5579b0', horizont: '#efc6a2', ziara: '#ffc58f' },
  // svetlo z oblohy do tieňov: tiene sú chladnejšie (modrasté) ako teplé slnko – to robí zlatú hodinku
  hemi: { nebo: '#c9d0e0', zem: '#55473a', sila: 0.5 },
  odrazy: { sila: 0.42, zem: '#4f4237' },
  hmla: { farba: '#e6cbb2', od: 0.4 },
  tonovanie: { typ: 'AgX', expozicia: 1.2 },
  // modul efektov (vzdušná perspektíva a farebné ladenie)
  efekty: { opar: '#e5c5a8', hustotaOparu: 1 / 1700, maxOpar: 0.45, saturacia: 1.06, kontrast: 1.1, vineta: 0.2, silaAo: 0.85 },
};
