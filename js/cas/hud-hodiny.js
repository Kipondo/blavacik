// Hodiny v HUD (vpravo hore): deň v týždni, čas a pri zrýchlení ⏩ ×N.

const DNI = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];

export class HudHodiny {
  constructor(hra) {
    const el = document.createElement('div');
    el.className = 'ui-hodiny';
    Object.assign(el.style, {
      position: 'absolute', top: '16px', right: '22px', padding: '6px 12px', borderRadius: '10px',
      background: 'rgba(0,0,0,.45)', color: '#fff', font: '700 22px Arial, sans-serif',
      textShadow: '0 1px 2px #000', pointerEvents: 'none', fontVariantNumeric: 'tabular-nums',
    });
    (hra.ui?.vrstva ?? document.body).appendChild(el);
    this.el = el;
    this.text = '';
  }

  update(datum, rychlost) {
    const h = datum.getHours(), m = String(datum.getMinutes()).padStart(2, '0');
    const zrychlenie = rychlost >= 1.5 ? ` <span style="color:#ffcf4a;font-size:16px">⏩ ×${Math.round(rychlost)}</span>` : '';
    const text = `${DNI[datum.getDay()]} ${h}:${m}${zrychlenie}`;
    if (text !== this.text) { this.el.innerHTML = text; this.text = text; }
  }
}
