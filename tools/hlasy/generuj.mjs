// Hlasy postáv cez Google Gemini TTS: pre každú repliku dialógu (data/dialogy/*.json), ktorá ešte nemá nahrávku
// alebo sa jej zmenil text, vygeneruje assets/zvuk/dialogy/<dialóg>/<index>_<variant>.ogg (Opus, mono, 32 kb/s).
// Hlas a štýl reči každej postavy je v data/dialogy/hlasy.json. Zmena sa pozná podľa hashu (model, hlas, štýl, text)
// v assets/zvuk/dialogy/index.json.
//
// Spúšťa ho GitHub Actions (.github/workflows/hlasy.yml). Kľúč je v GitHub secrets ako GEMINI_API_KEY – nikdy
// nie v repozitári ani v logoch. Bez kľúča skript len upozorní a skončí bez chyby (hra má titulky).
// Pri vyčerpaní bezplatného limitu (HTTP 429) skončí bez chyby a zvyšok dorobí ďalšie spustenie.
// Potrebuje Node 20+ a ffmpeg (PCM 24 kHz → Opus).
//
// Ručne: GEMINI_API_KEY=… node tools/hlasy/generuj.mjs   (MAX=5 – najviac 5 nahrávok, SUCHO=1 – len vypíše plán)

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIALOGY = join(KOREN, 'data/dialogy');
const VYSTUP = join(KOREN, 'assets/zvuk/dialogy');
const INDEX = join(VYSTUP, 'index.json');
const KLUC = process.env.GEMINI_API_KEY;
const SUCHO = !!process.env.SUCHO;

const nastavenia = JSON.parse(readFileSync(join(DIALOGY, 'hlasy.json'), 'utf8'));
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { repliky: {} };
index.popis = 'Vygenerované nástrojom tools/hlasy/generuj.mjs (Google Gemini TTS). Neupravovať ručne.';
index.repliky ??= {};

// 1. čo treba nahrať
const ulohy = [];
const platne = new Set();
for (const subor of readdirSync(DIALOGY).sort()) {
  if (!subor.endsWith('.json') || subor === 'hlasy.json') continue;
  const d = JSON.parse(readFileSync(join(DIALOGY, subor), 'utf8'));
  const id = d.id ?? subor.replace('.json', '');
  // len dialógy (pole replík); sady náhodných viet podľa postavy (objekt, napr. stanica-postavy.json) sú bez hlasu
  if (!Array.isArray(d.repliky)) continue;
  d.repliky.forEach((r, i) => {
    const kto = nastavenia.aliasy?.[r.kto] ?? r.kto;
    const postava = nastavenia.postavy?.[kto];
    if (!postava || postava.bezHlasu) return;
    const varianty = r.varianty && typeof r.varianty === 'object' ? Object.entries(r.varianty) : [['zaklad', r.text]];
    for (const [variant, text] of varianty) {
      if (!text?.trim()) continue;
      const kluc = `${id}/${i}_${variant}`;
      platne.add(kluc);
      const styl = [postava.styl, nastavenia.varianty?.[variant] ?? ''].filter(Boolean).join(' ');
      const hash = createHash('sha1').update(JSON.stringify([nastavenia.model, postava.hlas, styl, text])).digest('hex').slice(0, 16);
      const zaznam = index.repliky[kluc];
      if (zaznam?.hash === hash && existsSync(join(VYSTUP, zaznam.subor))) continue;
      ulohy.push({ kluc, id, i, variant, text, styl, hlas: postava.hlas, hash });
    }
  });
}
// repliky, ktoré už v dialógoch nie sú – zmazať nahrávky
for (const [kluc, z] of Object.entries(index.repliky)) {
  if (platne.has(kluc)) continue;
  if (!SUCHO) rmSync(join(VYSTUP, z.subor), { force: true });
  delete index.repliky[kluc];
}
console.log(`Replík s hlasom: ${platne.size}, treba nahrať: ${ulohy.length}`);
if (SUCHO) { for (const u of ulohy) console.log(`  ${u.kluc} (${u.hlas}): ${u.text}`); process.exit(0); }
if (!ulohy.length) { ulozIndex(); process.exit(0); }
if (!KLUC) {
  console.log('::warning::GEMINI_API_KEY chýba (Settings → Secrets and variables → Actions) – hlasy sa negenerujú, hra funguje s titulkami.');
  ulozIndex();
  process.exit(0);
}

function ulozIndex() {
  mkdirSync(VYSTUP, { recursive: true });
  const zoradene = Object.fromEntries(Object.entries(index.repliky).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(INDEX, JSON.stringify({ popis: index.popis, repliky: zoradene }, null, 1) + '\n');
}

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms));

/** Požiadavka na Gemini TTS; vracia PCM (Buffer) alebo hodí chybu s .status. */
async function tts(model, hlas, styl, text) {
  const telo = {
    contents: [{ parts: [{ text: `${styl}\n${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: hlas } } },
    },
  };
  if (nastavenia.jazyk) telo.generationConfig.speechConfig.languageCode = nastavenia.jazyk;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KLUC },
    body: JSON.stringify(telo),
  });
  if (!r.ok) {
    const e = new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    e.status = r.status;
    throw e;
  }
  const j = await r.json();
  const data = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!data) throw Object.assign(new Error('odpoveď bez zvuku'), { status: 500 });
  return Buffer.from(data, 'base64');
}

/** PCM 16 bit, 24 kHz, mono → Opus .ogg (najprv do dočasného súboru – pri chybe sa existujúci neprepíše). */
function naOgg(pcm, ciel) {
  const tmpPcm = join(tmpdir(), `hlas-${process.pid}.pcm`), tmpOgg = join(tmpdir(), `hlas-${process.pid}.ogg`);
  writeFileSync(tmpPcm, pcm);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmpPcm,
    '-c:a', 'libopus', '-b:a', '32k', '-ac', '1', tmpOgg]);
  mkdirSync(dirname(ciel), { recursive: true });
  renameSync(tmpOgg, ciel);
  rmSync(tmpPcm, { force: true });
}

// 2. nahrávanie
const max = Number(process.env.MAX) || nastavenia.maxNaBeh || 60;
const modely = [nastavenia.model, ...(nastavenia.zalozneModely ?? [])];
let model = modely.shift();
let hotovo = 0;
for (const u of ulohy.slice(0, max)) {
  let pcm = null;
  for (let pokus = 0; pokus < 4 && !pcm; pokus++) {
    try {
      pcm = await tts(model, u.hlas, u.styl, u.text);
    } catch (e) {
      if (e.status === 429) {
        console.log(`Limit Gemini vyčerpaný (429) – hotových ${hotovo}, zvyšok dorobí ďalšie spustenie.`);
        ulozIndex();
        process.exit(0);
      }
      if ((e.status === 404 || e.status === 400) && modely.length) {
        console.log(`Model ${model} nefunguje (${e.status}), skúšam ${modely[0]}.`);
        model = modely.shift();
        pokus--;
        continue;
      }
      console.log(`  ${u.kluc}: ${e.message}`);
      if (e.status && e.status < 500) break;
      await cakaj(4000 * (pokus + 1));
    }
  }
  if (!pcm) continue;
  const subor = `${u.id}/${u.i}_${u.variant}.ogg`;
  try {
    naOgg(pcm, join(VYSTUP, subor));
  } catch (e) {
    console.log(`  ${u.kluc}: ffmpeg zlyhal – ${e.message}`);
    continue;
  }
  index.repliky[u.kluc] = { subor, hash: u.hash, hlas: u.hlas };
  ulozIndex();
  hotovo++;
  console.log(`  ✓ ${u.kluc}`);
  await cakaj(nastavenia.pauzaMs ?? 6500);
}
ulozIndex();
console.log(`Hotovo: ${hotovo} nových nahrávok, zostáva ${Math.max(0, ulohy.length - hotovo)}.`);
