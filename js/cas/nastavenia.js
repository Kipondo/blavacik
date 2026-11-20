// Nastavenia herných hodín (issue #20).

export const NASTAVENIA_CASU = {
  // Štart hry: dnešný dátum, 8:00 ráno
  START_HODINA: 8,
  START_MINUTA: 0,
  // Rýchlosť času podľa vzdialenosti k najbližšej veci, ktorá potrebuje skutočný čas (napr. spoj MHD)
  BLIZKO: 150,        // m – do tejto vzdialenosti beží čas 1:1
  DALEKO: 400,        // m – od tejto vzdialenosti beží čas najrýchlejšie
  MAX_RYCHLOST: 10,   // ×
  PLYNULOST: 1.5,     // s – ako rýchlo sa rýchlosť času prispôsobí (časová konštanta)
};
