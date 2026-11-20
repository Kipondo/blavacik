// Opotrebenie asfaltu ciest (v shaderi, vo svetových súradniciach – nič sa neopakuje):
//   – veľké tmavšie záplaty a pásy opráv, svetlejší starý asfalt,
//   – tmavšie stopy kolies v strede pruhov a špina pri obrubníku (odtokový žľab),
//   – zaliate praskliny (tenké tmavé čiary),
//   – ošúchané vodorovné značenie (čiary nie sú dokonale biele ani celé),
//   – drsnosť: záplaty a stopy kolies sú hladšie (trochu sa lesknú proti slnku).
// Pridáva sa na materiál, ktorý už má pridajStrukturu() (vSvetS = svetové x, z).

import { SUM_GLSL } from '../../grafika/sum-glsl.js';

/** pruhy = počet pruhov (na stopy kolies a žľab pri kraji; 0 = plocha bez pruhov, napr. križovatka); vMapUv.x = poloha naprieč cestou (0..1). */
export function pridajOpotrebenie(mat, pruhy = 2) {
  const povodny = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    povodny?.(sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${SUM_GLSL}\nfloat opZaplata;\nfloat opStopa;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 w = vSvetS;
        // značenie = svetlé miesta pôvodnej textúry
        float jasT = dot(sampledDiffuseColor.rgb, vec3(0.333));
        float znacenie = smoothstep(0.45, 0.7, jasT);
        // veľká pestrosť: starší svetlejší a novší tmavší asfalt
        float velka = fbm2(w * 0.021);
        diffuseColor.rgb *= 0.86 + 0.34 * velka;
        // záplaty: obdĺžnikové opravy (šum v natočenej mriežke) – tmavší, hladší asfalt
        vec2 q = floor(w / vec2(7.0, 3.5));
        float zap = step(0.9, sumHash(q * 1.7 + 3.1)) * step(0.5, sum2(w * 0.35));
        opZaplata = max(zap, smoothstep(0.7, 0.74, fbm2(w * 0.045 + 5.0)));
        diffuseColor.rgb *= mix(1.0, 0.72, opZaplata);
        opStopa = 0.0;
        ${pruhy > 0 ? `// stopy kolies: dve tmavšie stopy v každom pruhu, špina pri krajoch (žľab)
        float vPruhu = fract(vMapUv.x * ${pruhy.toFixed(1)});
        opStopa = exp(-pow((vPruhu - 0.27) / 0.08, 2.0)) + exp(-pow((vPruhu - 0.73) / 0.08, 2.0));
        diffuseColor.rgb *= 1.0 - 0.14 * opStopa * (1.0 - znacenie);
        float kraj = min(vMapUv.x, 1.0 - vMapUv.x) * ${pruhy.toFixed(1)} * 3.5;
        diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 0.35, kraj) * (0.85 + 0.15 * sum2(w * 2.0)));` : ''}
        // zaliate praskliny: tenké tmavé čiary z hrán šumu
        float pr = abs(fbm2(w * 0.32 + 11.0) - 0.5);
        diffuseColor.rgb *= mix(1.0, 0.55, (1.0 - smoothstep(0.0, 0.012, pr)) * step(0.55, sum2(w * 0.06)));
        // ošúchané značenie: miestami prechádza do asfaltu, nie je čisto biele
        float ochod = smoothstep(0.38, 0.72, fbm2(w * 1.9) * 0.65 + sum2(w * 9.0) * 0.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.3, 0.3, 0.29), znacenie * ochod * 0.75);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.93, 0.92, 0.86), znacenie);
      }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor - 0.12 * opZaplata - 0.1 * opStopa, 0.55, 1.0);`);
  };
  const kluc = mat.customProgramCacheKey?.() ?? '';
  mat.customProgramCacheKey = () => `${kluc}-opotrebenie-${pruhy}`;
  return mat;
}
