// Procedurálny kameň pre shadery (GLSL, bez textúr): múr z lomového kameňa, kvádre a skala.
// Používa ho zem na strmých zrezoch terénu (js/mapa/teren/material-zeme.js) a kamenné materiály
// modelov pamiatok z Blendera (js/mapa/pamiatky/kamen-material.js). Súradnice sú vo svete v metroch,
// takže sa vzor nikde viditeľne neopakuje. Funkcie vracajú vec2(odtieň kameňa 0–1, škára 0–1);
// farbu si volajúci zmieša sám (kameň zeme je sivý, hradby majú farbu materiálu z Blendera).

export const KAMEN_GLSL = `
float kHash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float kSum(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(kHash(i), kHash(i + vec2(1.0, 0.0)), f.x), mix(kHash(i + vec2(0.0, 1.0)), kHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float kFbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * kSum(p); p = p * 2.07 + 11.3; a *= 0.5; } return v / 0.9375; }

// Rady kameňov: uv = (vodorovne, výška) v metroch; vyskaRadu a dlzka sú priemerné rozmery kameňa.
vec2 kamenMur(vec2 uv, float vyskaRadu, float dlzka) {
  float vr = vyskaRadu * (0.75 + kHash(vec2(floor(uv.y / (vyskaRadu * 1.6)), 1.7)) * 0.5);
  float rad = floor(uv.y / vr);
  float dl = dlzka * (0.7 + kHash(vec2(rad, 7.7)) * 0.6);
  float u = (uv.x + kHash(vec2(rad, 3.1)) * 3.0) / dl;
  float kus = floor(u);
  vec2 f = vec2(fract(u) * dl, fract(uv.y / vr) * vr);
  float hrana = min(min(f.x, dl - f.x), min(f.y, vr - f.y)) + (kSum(uv * 7.0) - 0.5) * 0.05 * vyskaRadu / 0.4;
  float skara = 1.0 - smoothstep(0.008, 0.03, hrana);
  float odtien = kHash(vec2(kus, rad) + 0.37) * 0.6 + kFbm(uv * 2.3 + kus) * 0.4;
  return vec2(odtien, skara);
}

// Skala: lámaná plocha bez radov, tmavé pukliny.
vec2 kamenSkala(vec2 uv) {
  float v = kFbm(uv * 0.7);
  float puklina = 1.0 - smoothstep(0.0, 0.03, abs(kFbm(uv * 0.35 + 5.0) - 0.5));
  return vec2(v * 0.7 + kFbm(uv * 3.1) * 0.3, puklina * 0.8);
}

// Výber roviny podľa normály (vodorovná plocha → pôdorys, stena → vodorovne + výška, plynulý prechod).
vec2 kamenTriplanar(vec3 p, vec3 n, float vyskaRadu, float dlzka, float skala) {
  vec3 a = abs(n);
  vec2 sx = skala > 0.5 ? kamenSkala(vec2(p.z, p.y)) : kamenMur(vec2(p.z, p.y), vyskaRadu, dlzka);
  vec2 sz = skala > 0.5 ? kamenSkala(vec2(p.x, p.y)) : kamenMur(vec2(p.x, p.y), vyskaRadu, dlzka);
  vec2 sy = skala > 0.5 ? kamenSkala(p.xz) : kamenMur(p.xz, dlzka * 0.8, dlzka);
  float bx = smoothstep(0.35, 0.65, a.x / (a.x + a.z + 1e-4));
  vec2 stena = mix(sz, sx, bx);
  return mix(stena, sy, smoothstep(0.6, 0.85, a.y));
}

// Tmavé stekance a lišajník vo veľkej mierke (násobiteľ farby).
vec3 kamenSkvrny(vec3 p) {
  float s = smoothstep(0.55, 0.82, kFbm(vec2((p.x + p.z) * 0.3, p.y * 0.07)));
  float l = smoothstep(0.62, 0.86, kFbm(vec2(p.x - p.z, p.y) * 0.45 + 9.0));
  return mix(vec3(1.0), vec3(0.72), s) * mix(vec3(1.0), vec3(0.82, 0.9, 0.72), l * 0.6);
}
`;
