// Minimálne čítanie ZIP archívu (bez npm závislostí) – stačí na GTFS.
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/** Vráti Map(názov súboru → Buffer) so všetkými súbormi v archíve. */
export function rozbalZip(cesta) {
  const buf = readFileSync(cesta);
  // Koniec centrálneho adresára (EOCD) – hľadá sa odzadu
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`${cesta} nie je ZIP archív`);
  const pocet = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const subory = new Map();
  for (let n = 0; n < pocet; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Poškodený centrálny adresár ZIP');
    const metoda = buf.readUInt16LE(p + 10);
    const velkost = buf.readUInt32LE(p + 20);
    const dlzkaMena = buf.readUInt16LE(p + 28);
    const dlzkaExtra = buf.readUInt16LE(p + 30);
    const dlzkaKom = buf.readUInt16LE(p + 32);
    const lokalna = buf.readUInt32LE(p + 42);
    const meno = buf.toString('utf8', p + 46, p + 46 + dlzkaMena);
    // Lokálna hlavička má vlastné dĺžky mena a extra poľa
    const zac = lokalna + 30 + buf.readUInt16LE(lokalna + 26) + buf.readUInt16LE(lokalna + 28);
    const data = buf.subarray(zac, zac + velkost);
    subory.set(meno, metoda === 0 ? data : inflateRawSync(data));
    p += 46 + dlzkaMena + dlzkaExtra + dlzkaKom;
  }
  return subory;
}
