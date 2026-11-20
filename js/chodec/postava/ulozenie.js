// Uloženie vzhľadu a oblečenia Ďoďa z editora postavy (localStorage). Hra si ho prečíta pri štarte.

const KLUC = 'blava.postava';

/** Vráti { oblecenie, vzhlad } pre vytvorRealistickuPostavu – alebo predvolené hodnoty. */
export function nacitajUlozenyVzhlad() {
  try {
    const d = JSON.parse(localStorage.getItem(KLUC));
    if (d && typeof d === 'object') return { oblecenie: d.oblecenie || 'klasicky', vzhlad: d.vzhlad || null };
  } catch (e) { /* súkromný režim prehliadača alebo poškodené dáta */ }
  return { oblecenie: 'klasicky', vzhlad: null };
}

export function ulozVzhlad(oblecenie, vzhlad) {
  try {
    localStorage.setItem(KLUC, JSON.stringify({ oblecenie, vzhlad }));
    return true;
  } catch (e) {
    return false;
  }
}

export function zmazUlozenyVzhlad() {
  try { localStorage.removeItem(KLUC); } catch (e) { /* nič */ }
}
