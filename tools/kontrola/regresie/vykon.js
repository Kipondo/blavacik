// Kontroly výkonu (#110): úrovne detailu zeme a drobností podrobných dlaždíc a zlučovanie sietí statických objektov.
// Keď sa pri zlučovaní vráti stará zem bez hrubších úrovní alebo pamiatky bez zlúčenia, kontrola zlyhá.

import * as THREE from 'three';
import { vytvorZemDlazdice } from '../../../js/mapa/teren/zem-dlazdica.js';
import { nastavLodDlazdice, HRANICE_LOD } from '../../../js/mapa/dlazdice/lod-zeme.js';
import { zlucPodlaMaterialu } from '../../../js/mapa/zluc-siete.js';
import { vzdialenaUroven } from '../../../js/mapa/pamiatky/vzdialena-uroven.js';
import { rozdelVikiere } from '../../../js/mapa/budovy/vikiere.js';

export const kontrolyVykonu = [
  {
    id: 'urovne-detailu-zeme',
    popis: 'Zem podrobnej dlaždice má úrovne detailu po blokoch (sieť 2 / 4 / 10 m) nad tými istými vrcholmi: blízko hráča '
      + 'plná sieť, ďalej hrubšia, na hranici blokov s rôznou úrovňou závesy proti škáram; obrubníky chodníkov a hroby '
      + 'sa zďaleka nekreslia',
    oprava: 'feature/vykon-2, feature/vykon-3 (#110) – js/mapa/teren/zem-dlazdica.js, js/mapa/dlazdice/lod-zeme.js',
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
        const lb = zem.userData.lodBloky;
        if (!lb || lb.nb < 2) chyby.push({ dlazdica: kluc, text: `zem nemá úrovne detailu po blokoch (${lb?.nb ?? 0} blokov)` });
        else {
          const pocet = zem.geometry.attributes.position.count;
          const platny = (text) => {
            const I = zem.geometry.index.array;
            for (let k = 0; k < lb.dlzka; k++) if (I[k] >= pocet) { chyby.push({ dlazdica: kluc, text: `${text}: index mimo vrcholov` }); return; }
            if (zem.geometry.drawRange.count !== lb.dlzka) chyby.push({ dlazdica: kluc, text: `${text}: rozsah kreslenia ${zem.geometry.drawRange.count} ≠ ${lb.dlzka}` });
          };
          lb.urovne.fill(0); const plna = lb.zostav(); platny('všetko 2 m');
          lb.urovne.fill(2); const hruba = lb.zostav(); platny('všetko 10 m');
          if (!(hruba < plna / 5)) chyby.push({ dlazdica: kluc, text: `hrubá úroveň nemá menej trojuholníkov (${plna} → ${hruba} indexov)` });
          // vrcholy závesov sú na konci poľa (za sieťou v × v a sukňou 4 × v): v² + (2·nb + 2)·v = počet vrcholov
          const v = Math.round((-(2 * lb.nb + 2) + Math.sqrt((2 * lb.nb + 2) ** 2 + 4 * pocet)) / 2);
          const zavesov = () => { let z = 0; const I = zem.geometry.index.array; for (let k = 0; k < lb.dlzka; k++) if (I[k] >= v * v + 4 * v) z++; return z; };
          if (zavesov()) chyby.push({ dlazdica: kluc, text: 'závesy aj pri rovnakej úrovni všetkých blokov' });
          // šachovnica úrovní: medzi každými dvoma blokmi musia byť závesy
          for (let b = 0; b < lb.urovne.length; b++) lb.urovne[b] = ((b % lb.nb) + Math.floor(b / lb.nb)) % 2 ? 2 : 0;
          lb.zostav(); platny('šachovnica');
          if (!zavesov()) chyby.push({ dlazdica: kluc, text: 'pri rôznych úrovniach blokov chýbajú závesy (škáry)' });
          lb.urovne.fill(0); lb.zostav();
          // skupina dlaždice ako v hre: zem + obrubníky chodníkov; hráč v strede dlaždice a ďaleko od nej
          const g = new THREE.Group();
          zem.name = 'zem';
          const obrubniky = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
          obrubniky.name = 'obrubniky-chodnikov';
          g.add(zem, obrubniky);
          const sx = (rect.minX + rect.maxX) / 2, sz = (rect.minZ + rect.maxZ) / 2;
          nastavLodDlazdice(g, 0, sx, sz);
          const stred = lb.urovne[Math.floor(lb.nb / 2) * lb.nb + Math.floor(lb.nb / 2)];
          if (stred !== 0) chyby.push({ dlazdica: kluc, text: `blok pod hráčom má úroveň ${stred} namiesto 0` });
          if (!obrubniky.visible) chyby.push({ dlazdica: kluc, text: 'obrubníky pri hráčovi nie sú viditeľné' });
          nastavLodDlazdice(g, HRANICE_LOD[1] + 300, sx + D + HRANICE_LOD[1] + 300, sz);
          if ([...lb.urovne].some((u) => u !== 2)) chyby.push({ dlazdica: kluc, text: 'ďaleko od hráča nie sú všetky bloky v najhrubšej úrovni' });
          if (obrubniky.visible) chyby.push({ dlazdica: kluc, text: 'obrubníky ďaleko od hráča sa kreslia' });
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
  {
    id: 'pamiatky-zdialky',
    popis: 'Model z Blendera má zďaleka spojené siete so zapečenou farbou (pár volaní namiesto jedného na materiál); '
      + 'drobné prvky „detail…“ chýbajú, sklo má nočné okná, svetlá a priehľadné materiály ostávajú samostatné',
    oprava: 'feature/vykon-3 (#110) – js/mapa/pamiatky/vzdialena-uroven.js',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      const model = new THREE.Group();
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const mat = (name, o = {}) => new THREE.MeshStandardMaterial({ name, color: '#a08070', roughness: 0.8, metalness: 0, ...o });
      const diely = [
        mat('omietka-a'), mat('omietka-b', { color: '#ccbbaa' }), mat('strecha', { color: '#553322' }),
        mat('sklo-fasada', { roughness: 0.1, metalness: 0.6 }), mat('sklo-fasada-2', { roughness: 0.1, metalness: 0.6 }),
        mat('detail-zabradlie'), mat('svetlo-cervene', { emissive: '#ff0000' }), mat('sklo-zabradlie', { transparent: true, opacity: 0.4 }),
      ];
      diely.forEach((m, k) => { const o = new THREE.Mesh(geo, m); o.position.set(k * 3, 0, 0); model.add(o); });
      const d = vzdialenaUroven(model);
      const siete = [];
      d.traverse((o) => { if (o.isMesh) siete.push(o); });
      const mena = siete.map((o) => o.material.name);
      // omietky + strecha → 1 sieť, 2 sklá → 1 sieť, svetlo a priehľadné sklo samostatne, detail vynechaný → 4
      if (siete.length !== 4) chyby.push({ text: `zďaleka ${siete.length} sietí namiesto 4 (${mena.join(', ')})` });
      if (mena.includes('detail-zabradlie')) chyby.push({ text: 'drobný prvok „detail…“ je aj zďaleka' });
      if (!mena.includes('svetlo-cervene')) chyby.push({ text: 'svetlo (emisívny materiál) zďaleka chýba' });
      const sklo = siete.find((o) => o.material.name === 'sklo-zdiaľky');
      if (!sklo?.material.userData.noc) chyby.push({ text: 'spojené sklo nemá nočné okná' });
      const spojena = siete.find((o) => o.material.name === 'zdiaľky');
      if (!spojena?.material.vertexColors || !spojena.geometry.getAttribute('color')) chyby.push({ text: 'spojená sieť nemá farbu vo vrcholoch' });
      // poloha dielov sa zachová
      const pred = new THREE.Box3().setFromObject(model), po = new THREE.Box3().setFromObject(d);
      if (pred.min.distanceTo(po.min) > 1e-3 || pred.max.distanceTo(po.max) > 1e-3) chyby.push({ text: 'diely sa zďaleka posunuli' });
      for (const o of siete) if (o.geometry !== geo) o.geometry.dispose();
      geo.dispose();
      return { skontrolovane: 1, chyby };
    },
  },
  {
    id: 'vikiere-zdialky',
    popis: 'Vikiere bližšie ako ~90 m od hráča sú podrobné, ďalšie v jednoduchej sieti vedľa (13 trojuholníkov '
      + 'namiesto 109); po presune hráča sa rozdelia znova',
    oprava: 'feature/vykon-3 (#110) – js/mapa/budovy/vikiere.js, js/mapa/dlazdice/lod-zeme.js',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      const g = new THREE.Group();
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 10);
      const m = new THREE.Matrix4();
      for (let k = 0; k < 10; k++) im.setMatrixAt(k, m.makeTranslation(k * 100, 0, 0));
      g.add(im);
      rozdelVikiere(im, 0, 0);
      const daleko = im.userData.daleko;
      if (!daleko || daleko.parent !== g) chyby.push({ text: 'jednoduché vikiere sa nevytvorili vedľa podrobných' });
      else {
        if (im.count !== 1 || daleko.count !== 9) chyby.push({ text: `pri hráčovi v (0, 0): podrobných ${im.count}, jednoduchých ${daleko.count} (čaká sa 1 a 9)` });
        const t = (daleko.geometry.index ? daleko.geometry.index.count : daleko.geometry.attributes.position.count) / 3;
        if (t > 20) chyby.push({ text: `jednoduchý vikier má ${t} trojuholníkov` });
        if (daleko.name !== 'vikiere') chyby.push({ text: 'jednoduché vikiere nemajú meno „vikiere“ (dosah 300 m v lod-zeme.js)' });
        rozdelVikiere(im, 450, 0);
        if (im.count !== 2 || daleko.count !== 8) chyby.push({ text: `po presune do (450, 0): podrobných ${im.count}, jednoduchých ${daleko.count} (čaká sa 2 a 8)` });
      }
      im.geometry.dispose(); im.material.dispose();
      return { skontrolovane: 1, chyby };
    },
  },
];
