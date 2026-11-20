// Textúry z plátna (canvas): označník zastávky a tabuľa odchodov. Bez log dopravcu.
import { naHodiny } from '../cas.js';

export const FARBA_TYPU = { elektricka: '#c8261c', trolejbus: '#1d7f3a', autobus: '#1e5bb8', nocny: '#1b1b1b' };
const PISMO = 'Arial, Helvetica, sans-serif';

/** Vytvorí CanvasTexture danej veľkosti; kresli(ctx, w, h). */
export function texturaZPlatna(THREE, w, h, kresli) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  kresli(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Štítok s číslom linky (farba z cestovného poriadku). */
function stitok(ctx, x, y, s, linka, farba, text) {
  ctx.fillStyle = farba;
  ctx.beginPath(); ctx.roundRect(x, y, s * 1.6, s, s * 0.18); ctx.fill();
  ctx.fillStyle = text;
  ctx.font = `bold ${Math.round(s * 0.62)}px ${PISMO}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(linka, x + s * 0.8, y + s * 0.54);
}

/** Tabuľa označníka: písmeno „Z“ (zastávka), názov, nástupište a čísla liniek. */
export function texturaOznacnika(THREE, zastavka, nast, linky) {
  return texturaZPlatna(THREE, 256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = FARBA_TYPU[nast.typy[0]] ?? '#1e5bb8'; ctx.fillRect(0, 0, w, 92);
    ctx.fillStyle = '#fff'; ctx.font = `bold 70px ${PISMO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Z', w / 2, 50);
    ctx.fillStyle = '#111'; ctx.font = `bold 26px ${PISMO}`;
    const meno = zastavka.nazov.length > 18 ? zastavka.nazov.slice(0, 17) + '…' : zastavka.nazov;
    ctx.fillText(meno, w / 2, 120);
    if (nast.oznacenie) { ctx.font = `20px ${PISMO}`; ctx.fillStyle = '#555'; ctx.fillText(`nástupište ${nast.oznacenie}`, w / 2, 148); }
    const s = 40, sx = 14, sy = 170;
    nast.linky.slice(0, 15).forEach((l, i) => {
      const info = linky.get(l);
      stitok(ctx, sx + (i % 3) * 78, sy + Math.floor(i / 3) * 48, s, l, info?.farba ?? '#555', info?.text ?? '#fff');
    });
  });
}

/** Tabuľa odchodov (prekreslí sa do existujúceho plátna). */
export function kresliOdchody(ctx, w, h, zastavka, odchody, terazSek, linky) {
  ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffb000'; ctx.font = `bold 28px ${PISMO}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(zastavka.nazov, 16, 26);
  ctx.font = `22px ${PISMO}`;
  if (!odchody.length) { ctx.fillText('Žiadne spoje v najbližších 3 hodinách', 16, 80); return; }
  odchody.forEach((o, i) => {
    const y = 74 + i * 40;
    const info = linky.get(o.linka);
    stitok(ctx, 14, y - 16, 32, o.linka, info?.farba ?? '#555', info?.text ?? '#fff');
    ctx.fillStyle = '#ffb000'; ctx.font = `24px ${PISMO}`; ctx.textAlign = 'left';
    const ciel = o.ciel.length > 22 ? o.ciel.slice(0, 21) + '…' : o.ciel;
    ctx.fillText(ciel, 74, y);
    const min = Math.floor((o.cas - terazSek) / 60);
    ctx.textAlign = 'right';
    ctx.fillText(min <= 0 ? 'teraz' : min <= 30 ? `${min} min` : naHodiny(o.cas), w - 16, y);
  });
}
