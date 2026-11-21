// Zoznam modulov hry. Nový modul = nový súbor + jeden import a jedna položka tu.
//
// Pri súbežnej práci pridávaj svoj riadok na koniec príslušnej sekcie –
// konflikt v tomto súbore sa vtedy vyrieši jednoducho (ponechať oba riadky).
//
// Ako napísať modul: pozri komentár v js/jadro/hra.js.

// --- základ hry ---
import prostredie from './grafika/prostredie.js';
import efekty from './grafika/efekty/modul.js';
import denNoc from './grafika/den-noc.js';
import hrac from './chodec/hrac.js';
import riadenieHracom from './auto/riadenie-hracom.js';
import auta from './auto/sprava-aut.js';
import kamera from './kamera/kamera.js';
import dohlad from './kamera/dohlad.js';
import dlazdice from './mapa/dlazdice/modul.js';
import fasady3d from './mapa/budovy/fasady-3d-modul.js';
import podchody from './mapa/podchody/modul.js';
import nadjazdy from './mapa/mosty/nadjazdy-modul.js';
import trava from './mapa/zelen/trava-modul.js';
import hud from './ui/hud.js';
import lokality from './ui/lokality.js';
import poloha from './ui/poloha.js';
import hodiny from './cas/modul.js';
import mys from './vstup/mys.js';
import minimapa from './ui/minimapa/modul.js';
import sochy from './mapa/vybavenie/sochy-modul.js';
import oznacenia from './mapa/vybavenie/oznacenia-modul.js';

// --- doprava ---
import grafCiest from './doprava/graf.js';
import semafory from './doprava/semafory.js';
import mhd from './mhd/modul.js';

// --- doplnkové moduly (polícia, misie, doprava, …) ---
// --- doplnkové moduly (polícia, misie, minimapa, doprava, …) ---
import zvuk from './zvuk/modul.js';
// import policia from './policia/policia.js';
// import misie from './misie/misie.js';

export default [
  hodiny,
  mys,
  prostredie,
  efekty,
  denNoc,
  hrac,
  riadenieHracom,
  auta,
  kamera,
  dohlad,
  dlazdice,
  fasady3d,
  podchody,
  nadjazdy,
  trava,
  hud,
  lokality,
  poloha,
  minimapa,
  sochy,
  oznacenia,
  grafCiest,
  semafory,
  mhd,
  zvuk,
  // policia,
  // misie,
];
