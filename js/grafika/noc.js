// Spoločný stav noci pre materiály (nastavuje ho modul js/grafika/den-noc.js každý snímok):
//   NOC.value         0 = deň … 1 = hlboká noc (lampy, svetlo na zemi pod lampami, okná)
//   OKNA.value        podiel rozsvietených okien (večer viac, nadránom málo)
// Materiály si tieto objekty pripoja ako uniformy (rovnaký objekt → zmena sa prejaví bez prepisovania materiálov).
// Svietidlá (lampy, lucerny) sa zaregistrujú cez svietidlo(mat, sila) – den-noc im nastaví emissiveIntensity.

export const NOC = { value: 0 };
export const OKNA = { value: 0.3 };
export const SVIETIDLA = new Map();

export function svietidlo(mat, sila = 1) {
  SVIETIDLA.set(mat, sila);
  mat.emissiveIntensity = sila * NOC.value;
  return mat;
}
