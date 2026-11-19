// Modul: klávesa P vypíše polohu hráča (pomôcka pri písaní misií a úprave mapy).

export default {
  nazov: 'poloha',
  poradie: 99,

  updateVzdy(dt, hra) {
    if (!hra.vstup.stlacil('poloha')) return;
    const { x, z } = hra.stav.pozicia;
    const text = `{ "x": ${Math.round(x)}, "z": ${Math.round(z)} }`;
    console.log('Poloha hráča:', text, 'uhol:', hra.stav.uhol.toFixed(2));
    hra.ui.sprava(`Poloha: ${text}`, 4);
    navigator.clipboard?.writeText(text).catch(() => {});
  },
};
