// Kontroly výkonu (#110): úrovne detailu zeme a drobností podrobných dlaždíc a zlučovanie sietí statických objektov.
// Keď sa pri zlučovaní vráti stará zem bez hrubších úrovní alebo pamiatky bez zlúčenia, kontrola zlyhá.

import * as THREE from 'three';
import { vytvorZemDlazdice } from '../../../js/mapa/teren/zem-dlazdica.js';
import { nastavLodDlazdice, HRANICE_LOD } from '../../../js/mapa/dlazdice/lod-zeme.js';
import { zlucPodlaMaterialu } from '../../../js/mapa/zluc-siete.js';

export const kontrolyVykonu = [
  {
    id: 'urovne-detailu-zeme',
    popis: 'Zem podrobnej dlaždice má tri úrovne detailu (2 m, 4 m, 10 m) nad tými istými vrcholmi a správca ich '
      + 'prepína podľa vzdialenosti; obrubníky chodníkov a hroby sa zďaleka nekreslia',
    oprava: 'feature/vykon-2 (#110) – js/mapa/teren/zem-dlazdica.js, js/mapa/dlazdice/lod-zeme.js',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      const D = ctx.index.dlazdica ?? 500;
      // prvá dlaždica s detailným terénom z lasera (sieť 2 m), inak hocijaká
      const zaznam = [...ctx.dlazdice].find(([, d]) => d._detailTerenu) ?? [...ctx.dlazdice][0];
      if (!zaznam) return { skontrolovane: 0, chyby: [{ text: 'žiadna načítaná dlaždica' }] };
      const [kluc, d] = zaznam;
      const [i, j] = kluc.split('_').map(Number);
      const rect = { minX: i * D, maxX: (i + 1) * D, minZ: j * D, maxZ: (j + 1) * D };
      const zem = vytvorZemDlazdice(d, rect, { vyskaTerenu: () => 0, jeVoVode: () => false }, []);
      try {
        const lod = zem.userData.lodIndexy;
        if (!lod || lod.length < 3) chyby.push({ dlazdica: kluc, text: `zem má ${lod?.length ?? 0} úrovní detailu namiesto 3` });
        else {
          const pocty = lod.map((a) => a.count);
          if (!(pocty[1] < pocty[0] / 2 && pocty[2] < pocty[1] / 2)) chyby.push({ dlazdica: kluc, text: `hrubšie úrovne nemajú menej trojuholníkov (${pocty.join(' / ')})` });
          const pocet = zem.geometry.attributes.position.count;
          if (lod.some((a) => a.array.some((k) => k >= pocet))) chyby.push({ dlazdica: kluc, text: 'index úrovne detailu mimo vrcholov' });
          // skupina dlaždice ako v hre: zem + obrubníky chodníkov
          const g = new THREE.Group();
          zem.name = 'zem';
          const obrubniky = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
          obrubniky.name = 'obrubniky-chodnikov';
          g.add(zem, obrubniky);
          for (const [vzd, u, vidno] of [[0, 0, true], [(HRANICE_LOD[0] + HRANICE_LOD[1]) / 2, 1, false], [HRANICE_LOD[1] + 100, 2, false], [0, 0, true]]) {
            nastavLodDlazdice(g, vzd);
            if (zem.geometry.index !== lod[u]) chyby.push({ dlazdica: kluc, text: `vo vzdialenosti ${vzd} m nie je úroveň ${u}` });
            if (obrubniky.visible !== vidno) chyby.push({ dlazdica: kluc, text: `obrubníky vo vzdialenosti ${vzd} m: viditeľné ${obrubniky.visible}` });
          }
          obrubniky.geometry.dispose();
          obrubniky.material.dispose();
        }
      } catch (e) {
        chyby.push({ text: `chyba kontroly: ${e.message}` });
      }
      zem.geometry.dispose();
      for (const m of [zem.material].flat()) { m.map?.dispose(); m.dispose(); }
      return { skontrolovane: 1, chyby };
    },
  },
  {
    id: 'zlucene-siete-pamiatok',
    popis: 'Statická pamiatka z kódu (a prístrešok zastávky) zložená z mnohých dielov má jednu sieť na materiál – '
      + 'pozícia dielov ostane rovnaká; diely označené nezlucovat ostávajú samostatne',
    oprava: 'feature/vykon-2 (#110) – js/mapa/zluc-siete.js, nacitaj-pamiatky.js, pristresok.js',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      const mat = new THREE.MeshBasicMaterial(), ina = new THREE.MeshBasicMaterial();
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const g = new THREE.Group();
      g.position.set(100, 0, 50);
      for (let k = 0; k < 6; k++) {
        const m = new THREE.Mesh(geo, k < 4 ? mat : ina);
        m.position.set(k * 3, k, 0);
        m.rotation.y = k * 0.3;
        g.add(m);
      }
      const sam = new THREE.Mesh(geo, mat);
      sam.userData.nezlucovat = true;
      sam.position.set(-5, 0, 0);
      g.add(sam);
      g.updateMatrixWorld(true);
      const pred = new THREE.Box3().setFromObject(g);
      zlucPodlaMaterialu(g);
      g.updateMatrixWorld(true);
      const siete = [];
      g.traverse((o) => { if (o.isMesh) siete.push(o); });
      // 4 diely s mat → 1, 2 diely s ina → 1, nezlucovat ostáva → spolu 3
      if (siete.length !== 3) chyby.push({ text: `po zlúčení ${siete.length} sietí namiesto 3` });
      if (!siete.includes(sam)) chyby.push({ text: 'diel s nezlucovat sa zlúčil' });
      const po = new THREE.Box3().setFromObject(g);
      if (pred.min.distanceTo(po.min) > 1e-3 || pred.max.distanceTo(po.max) > 1e-3) chyby.push({ text: 'zlúčené diely sa posunuli' });
      for (const o of siete) if (o.geometry !== geo) o.geometry.dispose();
      geo.dispose(); mat.dispose(); ina.dispose();
      return { skontrolovane: 1, chyby };
    },
  },
];
