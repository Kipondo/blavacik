// Úprava tieňov pre všetky materiály (vrátane vlastných shaderov): tieň slnka sa na okraji
// tieňovej mapy plynulo stratí, takže pri pohybe nevidno ostrú hranicu, kde tiene končia.
// Mení sa spoločný kúsok shadera Three.js, preto musí bežať pred prvým vykreslením (pri importe modulu).

import * as THREE from 'three';

const POVODNE = '\t\treturn mix( 1.0, shadow, shadowIntensity );';
const NOVE = `
		vec2 okrajTiena = min( shadowCoord.xy, 1.0 - shadowCoord.xy );
		float vyblednutieTiena = smoothstep( 0.0, 0.1, min( okrajTiena.x, okrajTiena.y ) );
		return mix( 1.0, shadow, shadowIntensity * vyblednutieTiena );`;

const kod = THREE.ShaderChunk.shadowmap_pars_fragment;
if (kod.includes(POVODNE) && !kod.includes('vyblednutieTiena')) {
  // len prvý výskyt = smerové svetlo (slnko); bodové svetlá ostávajú bez zmeny
  THREE.ShaderChunk.shadowmap_pars_fragment = kod.replace(POVODNE, NOVE);
} else if (!kod.includes('vyblednutieTiena')) {
  console.warn('Tiene: nepodarilo sa upraviť shader (iná verzia Three.js?) – okraj tieňov ostane ostrý.');
}
