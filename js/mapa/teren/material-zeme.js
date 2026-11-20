// Materiál zeme: textúra pokrývky + jemný opakujúci sa detail zblízka.
// Kde má textúra alfa 0 (rieka), zem sa nevykreslí – vidno vodu a nábrežné múry.
// S mapou tried povrchu (detailné dlaždice) sa chodníky a pešie zóny kreslia CC0 dlažbou z ambientCG
// (assets/textury/kocky – žulové kocky, assets/textury/chodnik – kamenné dlaždice) a vlastnými procedurálnymi
// (assets/textury/dosky – kamenné dosky, assets/textury/beton – betónové dlaždice) aj s normálovou mapou.

import * as THREE from 'three';
import { texturaDetailu } from './textura-zeme.js';
import { SUM_GLSL } from '../../grafika/sum-glsl.js';

let detail = null;
let dlazby = null;

function texturyDlazby() {
  if (dlazby) return dlazby;
  const l = new THREE.TextureLoader();
  const t = (cesta, srgb) => {
    const x = l.load(cesta);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  dlazby = {
    kockyF: t('assets/textury/kocky/farba.jpg', true), kockyN: t('assets/textury/kocky/normal.jpg', false),
    // chodník pri domoch: sivá zámková dlažba 20 × 10 cm (tools/textury/zamkova.py, textúra = 2 × 2 m)
    chodF: t('assets/textury/zamkova/farba.jpg', true), chodN: t('assets/textury/zamkova/normal.jpg', false),
    doskyF: t('assets/textury/dosky/farba.jpg', true), doskyN: t('assets/textury/dosky/normal.jpg', false),
    betonF: t('assets/textury/beton/farba.jpg', true), betonN: t('assets/textury/beton/normal.jpg', false),
    travaF: t('assets/textury/trava/farba.jpg', true), travaN: t('assets/textury/trava/normal.jpg', false),
    asfaltF: t('assets/textury/asfalt/farba.jpg', true), asfaltN: t('assets/textury/asfalt/normal.jpg', false),
  };
  return dlazby;
}

export function materialZeme(mapa, triedy = null) {
  if (triedy) return materialZemeDlazba(mapa, triedy);
  detail ??= texturaDetailu();
  const mat = new THREE.MeshStandardMaterial({ map: mapa, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMapa = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDetailUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDetailUv = (modelMatrix * vec4(position, 1.0)).xz * 0.35;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMapa;\nvarying vec2 vDetailUv;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (sampledDiffuseColor.a < 0.5) discard;
        diffuseColor.a = 1.0;
        float trava = smoothstep(0.02, 0.12, diffuseColor.g - diffuseColor.r);
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.45 + trava * 0.4)
                          * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 2.7).rgb * 2.0, 0.25 + trava * 0.35);`);
  };
  mat.customProgramCacheKey = () => 'zem-detail';
  return mat;
}

/** Zem s dlažbou podľa mapy tried (R: 0 príroda, 0,25 tráva, 0,5 chodník, 0,75 kamenné dosky, 1 kocky). */
function materialZemeDlazba(mapa, triedy) {
  detail ??= texturaDetailu();
  const t = texturyDlazby();
  const mat = new THREE.MeshStandardMaterial({ map: mapa, normalMap: t.kockyN, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.userData.triedy = triedy;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      detailMapa: { value: detail }, triedy: { value: triedy },
      kockyF: { value: t.kockyF }, kockyN: { value: t.kockyN }, chodF: { value: t.chodF }, chodN: { value: t.chodN },
      travaF: { value: t.travaF }, travaN: { value: t.travaN }, doskyF: { value: t.doskyF }, doskyN: { value: t.doskyN },
      betonF: { value: t.betonF }, betonN: { value: t.betonN }, asfaltF: { value: t.asfaltF }, asfaltN: { value: t.asfaltN },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSvet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvet = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D detailMapa, triedy, kockyF, kockyN, chodF, chodN, travaF, travaN, doskyF, doskyN, betonF, betonN, asfaltF, asfaltN;
varying vec2 vSvet;
${SUM_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (sampledDiffuseColor.a < 0.5) discard;
        diffuseColor.a = 1.0;
        float trava = smoothstep(0.02, 0.12, diffuseColor.g - diffuseColor.r);
        vec2 vDetailUv = vSvet * 0.35;
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.45 + trava * 0.4)
                          * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 2.7).rgb * 2.0, 0.25 + trava * 0.35);
        vec3 tr2 = texture2D(triedy, vMapUv).rgb;
        float trieda = tr2.r;
        // triedy: 64 tráva, 128 chodník, 160 betónové dlaždice, 192 kamenné dosky, 255 kocky (textura-zeme.js)
        float wK = smoothstep(0.86, 0.95, trieda);
        float wD = smoothstep(0.7, 0.74, trieda) * (1.0 - wK);
        float wB = smoothstep(0.58, 0.61, trieda) * (1.0 - wK - wD);
        float wC = smoothstep(0.38, 0.46, trieda) * (1.0 - wK - wD - wB);
        float wT = smoothstep(0.12, 0.2, trieda) * (1.0 - smoothstep(0.3, 0.38, trieda));
        // jemná nerovnomernosť (špina, opotrebenie) z veľkého detailu
        float spina = texture2D(detailMapa, vSvet * 0.04).r * 2.0;
        vec3 kocky = texture2D(kockyF, vSvet / 2.4).rgb * mix(1.05, 1.35, spina * 0.5);
        // špina a nerovnomernosť dlažby vo veľkej mierke (fľaky, vyšliapané miesta) – nič sa neopakuje
        float fl = fbm2(vSvet * 0.06) * 0.6 + fbm2(vSvet * 0.45) * 0.4;
        float spinaD = 0.8 + 0.32 * fl;
        // chodník pri domoch: sivá zámková dlažba (tmavšia ako pôvodná textúra)
        vec3 chodnik = texture2D(chodF, vSvet / 2.0).rgb * mix(0.88, 1.08, spina * 0.5) * vec3(0.98, 0.98, 1.0) * spinaD;
        // chodník popri ceste mimo jadra: asfalt (svetlejší a hrubší ako vozovka), záplaty a praskliny
        float wA = wC * smoothstep(0.3, 0.7, tr2.b);
        vec3 asfaltCh = texture2D(asfaltF, vSvet / 3.3).rgb * 1.75 * (0.82 + 0.3 * fbm2(vSvet * 0.04));
        asfaltCh *= mix(1.0, 0.78, step(0.62, fbm2(vSvet * 0.09 + 7.0)));
        asfaltCh *= mix(1.0, 0.6, (1.0 - smoothstep(0.0, 0.015, abs(fbm2(vSvet * 0.25 + 3.0) - 0.5))) * step(0.5, sum2(vSvet * 0.05)));
        diffuseColor.rgb = mix(diffuseColor.rgb, kocky, wK);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(chodnik, asfaltCh, wA / max(wC, 1e-3)), wC);
        // veľké svetlé kamenné dosky v radoch (námestia, pešia zóna): textúra = 4 × 4 m (tools/textury/dosky.py)
        vec3 dosky = texture2D(doskyF, vSvet / 4.0).rgb * mix(0.9, 1.04, spina * 0.5) * 0.9 * spinaD;
        diffuseColor.rgb = mix(diffuseColor.rgb, dosky, wD);
        // veľké svetlosivé betónové dlaždice 50 × 50 cm (moderné námestia): textúra = 3 × 3 m (tools/textury/beton.py)
        vec3 beton = texture2D(betonF, vSvet / 3.0).rgb * mix(0.88, 1.05, spina * 0.5) * 0.8 * spinaD;
        diffuseColor.rgb = mix(diffuseColor.rgb, beton, wB);
        // tráva: CC0 textúra v dvoch mierkach (bez opakovania) a farba z mapy pokrývky (park vs. lúka)
        vec3 travnik = texture2D(travaF, vSvet / 3.1).rgb * 0.6 + texture2D(travaF, vSvet / 11.3).rgb * 0.4;
        // pestrosť trávnika: sýtejšie zelené a suchšie miesta, zošliapané okraje; celkovo menej do žlta
        float sviez = fbm2(vSvet * 0.035 + 2.0);
        travnik *= mix(vec3(0.82, 0.96, 0.85), vec3(0.6, 0.98, 1.1), smoothstep(0.3, 0.7, sviez));
        travnik *= 0.86 + 0.28 * fbm2(vSvet * 0.22);
        diffuseColor.rgb = mix(diffuseColor.rgb, travnik * mix(0.8, 1.15, spina * 0.5) * 1.12, wT);
        // trávnaté plochy bez triedy (parky, lúky z mapy pokrývky): tiež štruktúra trávy, odtieň z mapy pokrývky
        float wP = trava * (1.0 - smoothstep(0.05, 0.12, trieda));
        vec3 farbaPokr = diffuseColor.rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, travnik * clamp(farbaPokr / vec3(0.15, 0.27, 0.07), 0.5, 1.3) * vec3(0.92, 1.1, 1.1), wP * 0.85);
        // mäkké zatienenie pri päte budov (kanál G mapy tried)
        diffuseColor.rgb *= 1.0 - 0.38 * tr2.g;`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = vec3(0.0, 0.0, 1.0);
        mapN.xy += (texture2D(kockyN, vSvet / 2.4).xy * 2.0 - 1.0) * wK * 1.2;
        mapN.xy += (texture2D(chodN, vSvet / 2.0).xy * 2.0 - 1.0) * (wC - wA);
        mapN.xy += (texture2D(asfaltN, vSvet / 3.3).xy * 2.0 - 1.0) * wA * 0.9;
        mapN.xy += (texture2D(doskyN, vSvet / 4.0).xy * 2.0 - 1.0) * wD;
        mapN.xy += (texture2D(betonN, vSvet / 3.0).xy * 2.0 - 1.0) * wB;
        mapN.xy += (texture2D(travaN, vSvet / 3.1).xy * 2.0 - 1.0) * wT * 0.8;
        normal = normalize( tbn * mapN );`);
  };
  mat.customProgramCacheKey = () => 'zem-dlazba-3';
  return mat;
}
