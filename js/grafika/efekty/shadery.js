// Shadery efektov po vykreslení scény (vykreslovac.js):
//   AO     – zatienenie kútov z hĺbky (SAO: špirála vzoriek okolo bodu, normála z hĺbky), v polovičnom rozlíšení
//   ROZMAZ – rozmazanie AO, ktoré rešpektuje hĺbku (nerozmaže tieň cez hranu budovy)
//   VYSLEDOK – zloženie: AO, vzdušná perspektíva (opar do diaľky), farebné ladenie, tone mapping, vineta

const SPOLOCNE = /* glsl */`
  uniform sampler2D tHlbka;
  uniform float blizko, daleko;
  uniform vec2 projInv;          // 1 / projectionMatrix[0][0], 1 / projectionMatrix[1][1]
  float hlbkaZ(vec2 uv) {        // vzdialenosť od kamery pozdĺž osi pohľadu (kladná, metre)
    float d = texture2D(tHlbka, uv).x;
    return (blizko * daleko) / (daleko - (daleko - blizko) * d);
  }
  vec3 pozicia(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0) * projInv * z, -z); }
`;

export const VRCHOL = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const AO = /* glsl */`
  ${SPOLOCNE}
  uniform vec2 rozlisenie;       // rozlíšenie AO (polovičné)
  uniform float projMierka;      // pixely AO na meter vo vzdialenosti 1 m
  uniform float polomer, sila, koniec;
  varying vec2 vUv;

  vec3 bod(vec2 uv) { return pozicia(uv, hlbkaZ(uv)); }

  void main() {
    float d = texture2D(tHlbka, vUv).x;
    if (d >= 1.0) { gl_FragColor = vec4(1.0, 6e4, 0.0, 1.0); return; }
    float z = hlbkaZ(vUv);
    vec3 P = pozicia(vUv, z);
    vec2 t = 1.0 / rozlisenie;
    if (z > koniec) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }

    // normála z hĺbky – z bližšieho suseda, aby hrany budov nedávali chybné normály
    vec3 pr = bod(vUv + vec2(t.x, 0.0)), pl = bod(vUv - vec2(t.x, 0.0));
    vec3 ph = bod(vUv + vec2(0.0, t.y)), pd = bod(vUv - vec2(0.0, t.y));
    vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
    vec3 dy = abs(ph.z - P.z) < abs(P.z - pd.z) ? ph - P : P - pd;
    vec3 n = normalize(cross(dx, dy));

    float r = polomer * (1.0 + z / 160.0);   // ďalej väčší polomer: z diaľky tmavnú celé dvory a ulice
    float ssR = min(projMierka * r / z, 90.0);
    if (ssR < 1.5) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }

    // náhodné pootočenie špirály na pixel (interleaved gradient noise), rozmazanie ho potom vyhladí
    float nahoda = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float bias = 0.01 + 0.03 * r;
    float suma = 0.0;
    for (int i = 0; i < VZORKY; i++) {
      float a = (float(i) + 0.5) / float(VZORKY);
      float uhol = a * (7.0 * 6.2831853) + nahoda;
      vec2 posun = vec2(cos(uhol), sin(uhol)) * a * ssR;
      vec3 Q = bod(vUv + posun * t);
      vec3 v = Q - P;
      float vv = dot(v, v);
      float f = max(r * r - vv, 0.0);
      suma += f * f * f * max((dot(v, n) - bias) / (0.01 + vv), 0.0);
    }
    float r6 = r * r * r * r * r * r;
    float ao = max(0.0, 1.0 - suma * sila * 5.0 / (r6 * float(VZORKY)));
    ao = mix(ao, 1.0, smoothstep(koniec * 0.55, koniec, z));
    gl_FragColor = vec4(ao, z, 0.0, 1.0);
  }
`;

export const ROZMAZ = /* glsl */`
  uniform sampler2D tAo;
  uniform vec2 krok;             // posun o jeden texel v smere rozmazania
  varying vec2 vUv;
  void main() {
    vec2 s0 = texture2D(tAo, vUv).rg;
    float z = s0.g;
    float suma = s0.r, vahy = 1.0;
    for (int i = 1; i <= 4; i++) {
      float g = exp(-float(i * i) / 10.0);
      for (int k = -1; k <= 1; k += 2) {
        vec2 s = texture2D(tAo, vUv + krok * float(i * k)).rg;
        float w = g * max(0.0, 1.0 - abs(s.g - z) / (0.04 * z + 0.08));
        suma += s.r * w; vahy += w;
      }
    }
    gl_FragColor = vec4(suma / vahy, z, 0.0, 1.0);
  }
`;

export const VYSLEDOK = /* glsl */`
  ${SPOLOCNE}
  uniform sampler2D tScena, tAo;
  uniform vec2 rozlisenieAo;
  uniform float silaAo, pouziAo;
  uniform mat3 kameraOtocenie;   // z priestoru kamery do sveta (smer pohľadu pre opar)
  uniform vec3 farbaOparu, smerSlnka;
  uniform float hustotaOparu, maxOpar;
  uniform float saturacia, kontrast, vineta;
  uniform float ladenie;         // 1 = ukáž len AO (ladenie v konzole)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // AO z polovičného rozlíšenia: štyri susedné texely, váhy podľa zhody hĺbky (ostré hrany)
  float zisiAo(float z) {
    vec2 p = vUv * rozlisenieAo - 0.5;
    vec2 f = fract(p);
    vec2 zak = (floor(p) + 0.5) / rozlisenieAo;
    vec2 t = 1.0 / rozlisenieAo;
    vec2 a = texture2D(tAo, zak).rg, b = texture2D(tAo, zak + vec2(t.x, 0.0)).rg;
    vec2 c = texture2D(tAo, zak + vec2(0.0, t.y)).rg, d = texture2D(tAo, zak + t).rg;
    float tol = 0.03 * z + 0.05;
    vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
    w *= vec4(1.0) / (vec4(1e-3) + abs(vec4(a.g, b.g, c.g, d.g) - z) / tol);
    float s = w.x + w.y + w.z + w.w;
    return s > 0.0 ? dot(w, vec4(a.r, b.r, c.r, d.r)) / s : 1.0;
  }

  void main() {
    vec3 c = texture2D(tScena, vUv).rgb;
    float d = texture2D(tHlbka, vUv).x;
    if (d < 1.0) {
      float z = hlbkaZ(vUv);
      if (pouziAo > 0.5) c *= mix(1.0, zisiAo(z), silaAo);
      if (ladenie > 0.5) { gl_FragColor = vec4(vec3(zisiAo(z)), 1.0); return; }
      // vzdušná perspektíva: vzdialené veci blednú do farby oblohy, k slnku je opar svetlejší
      vec3 smer = normalize(kameraOtocenie * vec3((vUv * 2.0 - 1.0) * projInv, -1.0));
      float vzd = length(pozicia(vUv, z));
      float opar = maxOpar * (1.0 - exp(-vzd * hustotaOparu));
      float kSlnku = pow(max(dot(smer, smerSlnka), 0.0), 6.0);
      c = mix(c, farbaOparu * (1.0 + 0.35 * kSlnku), opar);
    }

    // farebné ladenie (v lineárnom priestore pred tone mappingom)
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = max(mix(vec3(l), c, saturacia), 0.0);
    c = 0.18 * pow(c / 0.18 + 1e-6, vec3(kontrast));
    c *= mix(vec3(0.975, 0.99, 1.025), vec3(1.02, 1.0, 0.975), smoothstep(0.03, 0.7, l));

    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    float v = length((vUv - 0.5) * vec2(1.0, 0.78)) * 1.35;
    gl_FragColor.rgb *= mix(1.0, 1.0 - vineta, smoothstep(0.45, 1.0, v));
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;   // proti pruhom v gradiente oblohy
  }
`;
