// Vegetação instanciada: palmeiras-reais, touceira de palmeiras finas, árvores, pinheiros e grama.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';
import { tex } from './textures.js';
import { MAP } from './mapData.js';

function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

let frondMat = null, barkMat = null;
function frondTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 512);
  x.strokeStyle = '#6d7f3a'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 512); x.stroke();
  for (let i = 0; i < 70; i++) {
    const y = 8 + i * 7.2;
    const len = 58 * Math.sin(Math.min(1, (i + 4) / 74) * Math.PI) + 6;
    for (const s of [-1, 1]) {
      const g = 90 + Math.random() * 60;
      x.strokeStyle = `rgb(${40 + Math.random() * 30},${g},${30 + Math.random() * 20})`;
      x.lineWidth = 4.5;
      x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 + s * len * 0.6, y + 8, 64 + s * len, y + 22); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function getFrondMat() {
  if (!frondMat) frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), color: '#c8e0a0', alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  return frondMat;
}
function getBarkMat(tone) {
  if (!barkMat) barkMat = new THREE.MeshStandardMaterial({ map: tex.bark().map, roughness: 0.95 });
  return barkMat;
}

// Folha de palmeira arqueada.
function frondGeo(len, width, droop, seg = 8) {
  const g = new THREE.PlaneGeometry(width, len, 1, seg);
  g.translate(0, len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / len, x = p.getX(i);
    // arco: sobe e cai
    const fwd = y * 0.9;
    const up = Math.sin(t * Math.PI * 0.55) * len * 0.35 - droop * t * t * len;
    p.setXYZ(i, x * (1 - t * 0.5), up, fwd);
    // dobra em V
    p.setY(i, p.getY(i) - Math.abs(x) * 0.25);
  }
  g.computeVertexNormals();
  return g;
}

function crown(nFronds, len, rnd_, droop = 0.55, y = 0) {
  const parts = [];
  for (let i = 0; i < nFronds; i++) {
    const f = frondGeo(len * (0.85 + rnd_() * 0.3), len * 0.42, droop + rnd_() * 0.3);
    const tilt = (i % 3 === 0 ? -0.6 : 0.15) + rnd_() * 0.3;
    f.rotateX(-tilt);
    f.rotateY((i / nFronds) * Math.PI * 2 + rnd_() * 0.3);
    f.translate(0, y, 0);
    parts.push(f);
  }
  return mergeGeometries(parts);
}

function royalPalmTemplate(seed) {
  const r = rnd(seed);
  const H = 12;
  const trunkPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const rad = 0.34 - 0.12 * t + 0.06 * Math.exp(-(((t - 0.08) / 0.08) ** 2)) + 0.03 * Math.exp(-(((t - 0.55) / 0.2) ** 2));
    trunkPts.push(new THREE.Vector2(rad, t * H * 0.86));
  }
  const trunk = new THREE.LatheGeometry(trunkPts, 10);
  const lean = (r() - 0.5) * 0.08;
  trunk.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, lean, 0, 0, 0));
  const shaft = new THREE.CylinderGeometry(0.2, 0.24, H * 0.14, 10);
  shaft.translate(lean * H * 0.86, H * 0.86 + H * 0.07, 0);
  const fr = crown(15, 3.8, r, 0.5, 0);
  fr.translate(lean * H, H, 0);
  return { trunk, extra: shaft, fronds: fr, collR: 0.4 };
}

function clusterPalmTemplate(seed) {
  const r = rnd(seed);
  const trunks = [], fronds = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    const len = 5.5 + r() * 3.5, tilt = 0.18 + r() * 0.25;
    const c = new THREE.CylinderGeometry(0.055, 0.08, len, 6);
    c.translate(0, len / 2, 0);
    c.rotateZ(tilt); c.rotateY(a);
    trunks.push(c);
    const tip = new THREE.Vector3(0, len, 0).applyEuler(new THREE.Euler(0, 0, tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const f = crown(7, 1.8, r, 0.6);
    f.translate(tip.x, tip.y, tip.z);
    fronds.push(f);
  }
  return { trunk: mergeGeometries(trunks), extra: null, fronds: mergeGeometries(fronds), collR: 0.7, trunkColor: '#8d8a72' };
}

function blobCanopy(r, count, spread, size, yBase, stretchY = 1) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.IcosahedronGeometry(size * (0.7 + r() * 0.5), 2);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const n = 1 + 0.18 * Math.sin(x * 3.1 + y * 2.3) * Math.cos(z * 2.7 + x);
      p.setXYZ(k, x * n, y * n * stretchY, z * n);
    }
    const a = r() * Math.PI * 2, d = r() * spread;
    g.translate(Math.cos(a) * d, yBase + r() * size * 0.9, Math.sin(a) * d);
    parts.push(g);
  }
  const m = mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g; }));
  m.computeVertexNormals();
  return m;
}

function treeTemplate(kind, seed) {
  const r = rnd(seed);
  switch (kind) {
    case 'mango': {
      const trunk = new THREE.CylinderGeometry(0.28, 0.45, 3.2, 8); trunk.translate(0, 1.6, 0);
      return { trunk, canopy: blobCanopy(r, 8, 2.6, 2.6, 4.2), color: '#4f8a35', collR: 0.6 };
    }
    case 'roundTree': {
      const trunk = new THREE.CylinderGeometry(0.14, 0.22, 2.2, 7); trunk.translate(0, 1.1, 0);
      return { trunk, canopy: blobCanopy(r, 6, 1.3, 1.5, 2.6), color: '#5f9a3c', collR: 0.35 };
    }
    case 'smallTree': {
      const trunk = new THREE.CylinderGeometry(0.06, 0.1, 2.6, 6); trunk.translate(0, 1.3, 0);
      return { trunk, canopy: blobCanopy(r, 4, 0.6, 0.9, 2.8), color: '#6fa544', collR: 0.2 };
    }
    case 'flowerTree': {
      const trunk = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 7); trunk.translate(0, 1.2, 0);
      return { trunk, canopy: blobCanopy(r, 7, 1.6, 1.3, 2.8), color: '#ee86c0', collR: 0.3 };
    }
    case 'pine': {
      const trunk = new THREE.CylinderGeometry(0.16, 0.3, 14, 7); trunk.translate(0, 7, 0);
      const parts = [];
      for (let i = 0; i < 5; i++) { const c = new THREE.ConeGeometry(3.2 - i * 0.5, 4, 9); c.translate(0, 5 + i * 2.6, 0); parts.push(c); }
      return { trunk, canopy: mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g; })), color: '#2f5a30', collR: 0.4 };
    }
    case 'eucalyptus': {
      const trunk = new THREE.CylinderGeometry(0.16, 0.3, 18, 7); trunk.translate(0, 9, 0);
      return { trunk, canopy: blobCanopy(r, 6, 2.2, 2.0, 14, 1.4), color: '#5a8a50', collR: 0.4, trunkColor: '#cfc6b4' };
    }
    case 'deadTrunk': {
      const parts = [];
      const t = new THREE.CylinderGeometry(0.12, 0.22, 11, 6); t.translate(0, 5.5, 0); parts.push(t);
      for (let i = 0; i < 9; i++) { const b = new THREE.CylinderGeometry(0.02, 0.04, 0.8 + r(), 4); b.translate(0, 0.5, 0); b.rotateZ(1.2); b.rotateY(r() * 6.28); b.translate(0, 3 + i * 0.8, 0); parts.push(b); }
      return { trunk: mergeGeometries(parts), canopy: null, color: '#000', collR: 0.25 };
    }
  }
  return null;
}

export function buildVegetation(scene, colliders, quality) {
  const group = new THREE.Group(); group.name = 'vegetation';
  const byKind = new Map();
  for (const t of MAP.trees) { if (!byKind.has(t.kind)) byKind.set(t.kind, []); byKind.get(t.kind).push(t); }
  const dummy = new THREE.Object3D();
  const leafTex = tex.leaves(0).map;

  for (const [kind, list] of byKind) {
    // 2 variações por tipo
    const variants = [0, 1].map(v => {
      if (kind === 'royalPalm') return royalPalmTemplate(11 + v * 7);
      if (kind === 'clusterPalm') return clusterPalmTemplate(5 + v * 3);
      return treeTemplate(kind, 3 + v * 13);
    });
    variants.forEach((tpl, vi) => {
      const items = list.filter((_, i) => i % 2 === vi);
      if (!items.length || !tpl) return;
      const mats = [];
      const trunkMat = tpl.trunkColor ? new THREE.MeshStandardMaterial({ color: tpl.trunkColor, roughness: 0.9 }) : (kind === 'royalPalm' ? new THREE.MeshStandardMaterial({ color: '#b9b3a6', roughness: 0.85 }) : getBarkMat());
      mats.push([tpl.trunk, trunkMat]);
      if (tpl.extra) mats.push([tpl.extra, new THREE.MeshStandardMaterial({ color: '#6f8a3e', roughness: 0.7 })]);
      if (tpl.fronds) mats.push([tpl.fronds, getFrondMat()]);
      if (tpl.canopy) mats.push([tpl.canopy, new THREE.MeshStandardMaterial({ color: tpl.color, map: leafTex, roughness: 0.85 })]);
      for (const [geo, mat] of mats) {
        if (!geo.attributes.uv) {
          // UV esférico simples para a textura de folhas
          const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
          for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.atan2(p.getX(i), p.getZ(i)) / 6.28 * 3; uv[i * 2 + 1] = p.getY(i) * 0.4; }
          geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        }
        const im = new THREE.InstancedMesh(geo, mat, items.length);
        items.forEach((t, i) => {
          dummy.position.set(t.x, heightAt(t.x, t.z) - 0.05, t.z);
          dummy.rotation.set(0, (t.x * 13.7 + t.z * 7.1) % 6.28, 0);
          dummy.scale.setScalar(t.s || 1);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        });
        im.castShadow = true; im.receiveShadow = kind !== 'royalPalm';
        im.frustumCulled = false;
        group.add(im);
      }
      for (const t of items) colliders.push({ type: 'circle', x: t.x, z: t.z, r: tpl.collR * (t.s || 1) });
    });
  }

  // Grama e flores (decorativas).
  const density = quality.grass;
  if (density > 0) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = `rgb(${60 + Math.random() * 40},${110 + Math.random() * 60},${40 + Math.random() * 20})`; x.lineWidth = 2;
      const bx = 6 + Math.random() * 52; x.beginPath(); x.moveTo(bx, 64); x.quadraticCurveTo(bx + (Math.random() - 0.5) * 20, 30, bx + (Math.random() - 0.5) * 24, 6 + Math.random() * 20); x.stroke();
    }
    const gt = new THREE.CanvasTexture(c); gt.colorSpace = THREE.SRGBColorSpace;
    const q1 = new THREE.PlaneGeometry(0.6, 0.38); q1.translate(0, 0.19, 0);
    const q2 = q1.clone(); q2.rotateY(Math.PI / 2);
    const tuft = mergeGeometries([q1, q2]);
    const count = Math.round(9000 * density);
    const im = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ map: gt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }), count);
    const r = rnd(77);
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const px = (r() - 0.5) * 200, pz = (r() - 0.5) * 220 + 5;
      const L = MAP.lake;
      if (Math.hypot((px - L.x) / L.rx, (pz - L.z) / L.rz) < 1.05) continue;
      if (Math.abs(px - 40) < 18 && Math.abs(pz + 30) < 13) continue;
      if (Math.abs(px) < 7 && Math.abs(pz - 6) < 4) continue;
      dummy.position.set(px, heightAt(px, pz), pz);
      dummy.rotation.set(0, r() * 6.28, 0);
      dummy.scale.setScalar(0.7 + r() * 0.8);
      dummy.updateMatrix(); im.setMatrixAt(n++, dummy.matrix);
    }
    im.count = n;
    group.add(im);
  }
  scene.add(group);
  return group;
}
