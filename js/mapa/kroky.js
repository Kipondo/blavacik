// Pomôcky pre stavbu po krokoch (generátory): správca dlaždíc volá kroky postupne v rámci časového
// rozpočtu na snímok, aby hra pri načítaní mesta nesekala. Mimo streamovania sa generátor dokončí naraz.

/** Dokončí generátor naraz a vráti jeho výsledok. */
export function dokonci(gen) {
  let r = gen.next();
  while (!r.done) r = gen.next();
  return r.value;
}
