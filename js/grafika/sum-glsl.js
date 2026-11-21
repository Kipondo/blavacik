// Spoločné funkcie šumu pre shadery (GLSL): hodnotový šum 2D a súčet oktáv (fbm).
// Používa sa na opotrebenie asfaltu, špinu na dlažbe a pestrosť trávy – v svetových súradniciach,
// takže sa nič viditeľne neopakuje.

export const SUM_GLSL = `
float sumHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sum2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sumHash(i), sumHash(i + vec2(1.0, 0.0)), f.x), mix(sumHash(i + vec2(0.0, 1.0)), sumHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm2(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * sum2(p); p = p * 2.03 + 17.1; a *= 0.5; } return v / 0.9375; }
`;
