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
import chodci from './chodec/chodci/modul.js';
import riadenieHracom from './auto/riadenie-hracom.js';
import auta from './auto/sprava-aut.js';
import kamera from './kamera/kamera.js';
import dohlad from './kamera/dohlad.js';
import dlazdice from './mapa/dlazdice/modul.js';
import fasady3d from './mapa/budovy/fasady-3d-modul.js';
import podchody from './mapa/podchody/modul.js';
import nadjazdy from './mapa/mosty/nadjazdy-modul.js';
import trava from './mapa/zelen/trava-modul.js';
import schody from './mapa/cesty/schody-modul.js';
import povrch from './mapa/cesty/povrch-modul.js';
import hud from './ui/hud.js';
import lokality from './ui/lokality.js';
import poloha from './ui/poloha.js';
import hodiny from './cas/modul.js';
import mys from './vstup/mys.js';
import minimapa from './ui/minimapa/modul.js';
import sochy from './mapa/vybavenie/sochy-modul.js';
import oznacenia from './mapa/vybavenie/oznacenia-modul.js';
import poskodenieAut from './auto/poskodenie-modul.js';
import rozlisenie from './grafika/rozlisenie.js';
import vykon from './ui/vykon.js';
import cyklopruhy from './mapa/cesty/cyklopruhy-modul.js';
import kolobezky from './mikromobilita/modul.js';
import jazdciNpc from './mikromobilita/npc-jazdci.js';
import atriaky from './mapa/atriaky/modul.js';
import internat from './mapa/atriaky/internat.js';
import kvalita from './grafika/kvalita.js';
import drobnosti from './mapa/vybavenie/dosah-drobnosti.js';
import meranie from './ui/meranie-trasy.js';

// --- doprava ---
import grafCiest from './doprava/graf.js';
import semafory from './doprava/semafory.js';
import premavka from './doprava/premavka/modul.js';
import vozidlaData from './doprava/vozidla-data.js';
import mhd from './mhd/modul.js';
import mhdVozidla from './mhd/vozidla/modul.js';

// --- doplnkové moduly (polícia, misie, doprava, …) ---
// --- dočasné pomôcky na prezeranie mesta (lietanie 2× Medzerník, presun klikom na veľkú mapu) ---
import letLadenie from './ladenie/let.js';
import teleport from './ladenie/teleport.js';

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
  chodci,
  riadenieHracom,
  auta,
  kamera,
  dohlad,
  dlazdice,
  fasady3d,
  podchody,
  nadjazdy,
  trava,
  cyklopruhy,
  kolobezky,
  jazdciNpc,
  atriaky,
  internat,
  schody,
  povrch,
  hud,
  lokality,
  poloha,
  minimapa,
  sochy,
  oznacenia,
  poskodenieAut,
  rozlisenie,
  vykon,
  kvalita,
  drobnosti,
  meranie,
  grafCiest,
  semafory,
  premavka,
  vozidlaData,
  mhd,
  zvuk,
  mhdVozidla,
  letLadenie,
  teleport,
  // policia,
  // misie,
];
