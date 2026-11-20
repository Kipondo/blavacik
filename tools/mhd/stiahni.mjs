// Stiahne aktuálne GTFS cestovné poriadky MHD Bratislava do .cache/mhd/GTFS_latest.zip.
// Spustenie: node tools/mhd/stiahni.mjs
// (Ak sieť nepustí, stiahni súbor ručne z data.bratislava.sk a ulož ho na rovnaké miesto.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { CACHE, GTFS_ZIP, GTFS_URL } from './spolocne.mjs';

mkdirSync(CACHE, { recursive: true });
console.log('Sťahujem GTFS…', GTFS_URL);
const odpoved = await fetch(GTFS_URL);
if (!odpoved.ok) throw new Error(`Chyba ${odpoved.status} pri sťahovaní GTFS`);
const data = Buffer.from(await odpoved.arrayBuffer());
writeFileSync(GTFS_ZIP, data);
console.log(`Uložené: ${GTFS_ZIP} (${(data.length / 1e6).toFixed(1)} MB)`);
