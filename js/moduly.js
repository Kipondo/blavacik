// Zoznam modulov hry. Nový modul = nový súbor + jeden import a jedna položka tu.
//
// Pri súbežnej práci pridávaj svoj riadok na koniec príslušnej sekcie –
// konflikt v tomto súbore sa vtedy vyrieši jednoducho (ponechať oba riadky).
//
// Ako napísať modul: pozri komentár v js/jadro/hra.js.

// --- základ hry ---
import hrac from './chodec/hrac.js';
import riadenieHracom from './auto/riadenie-hracom.js';
import auta from './auto/sprava-aut.js';
import kamera from './kamera/kamera.js';
import hud from './ui/hud.js';
import lokality from './ui/lokality.js';
import poloha from './ui/poloha.js';

// --- doplnkové moduly (polícia, misie, minimapa, doprava, …) ---
// import policia from './policia/policia.js';
// import misie from './misie/misie.js';
// import minimapa from './ui/minimapa.js';

export default [
  hrac,
  riadenieHracom,
  auta,
  kamera,
  hud,
  lokality,
  poloha,
  // policia,
  // misie,
  // minimapa,
];
