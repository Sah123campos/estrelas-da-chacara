// Relevo do terreno: gramado em declive, baixada do lago, colina da casa e terraço da piscina.
import * as THREE from 'three';
import { MAP } from './mapData.js';
import { tex, rep } from './textures.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function baseHeight(x, z) {
  let h = 0;
  // baixada do lago (vista nas fotos: o gramado desce em direção ao lago)
  h -= 3.4 * Math.exp(-(((x + 46) / 44) ** 2 + ((z + 42) / 22) ** 2));
  // colina ao norte, onde fica a casa amarela
  h += 8.5 * ss(-56, -114, z) * (1 - 0.35 * ss(-20, 60, x));
  // subida leve a leste (terraço da piscina)
  h += 1.4 * ss(5, 45, x) * ss(15, -25, z);
  // ondulações suaves
  h += 0.45 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038) + 0.22 * Math.sin(x * 0.11 + z * 0.07);
  for (const m of MAP.mounds || []) {
    const d = Math.hypot(x - m.x, z - m.z) / m.r;
    if (d < 1) h += m.h * (1 - d * d) * (1 - d * d);
  }
  // morros nas bordas (escondem o limite do mapa)
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h += 14 * ss(105, 135, edge);
  return h;
}

export function heightAt(x, z) {
  let h = baseHeight(x, z);
  // leito do lago
  const L = MAP.lake;
  const d = Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz);
  if (d < 1.25) {
    const bed = L.level - 0.9 * (1 - Math.min(1, d) ** 2) - 0.15;
    const w = 1 - ss(0.85, 1.25, d);
    h = Math.min(h, h + (bed - h) * w);
  }
  for (const p of MAP.pads) {
    const dx = Math.max(0, Math.abs(x - p.x) - p.w / 2), dz = Math.max(0, Math.abs(z - p.z) - p.d / 2);
    const dist = Math.hypot(dx, dz);
    const w = 1 - ss(0, p.blend, dist);
    if (w > 0) h += (p.h - h) * w;
  }
  return h;
}

export function buildTerrain(quality, holes = []) {
  const S = MAP.size, seg = quality.drawDistance > 150 ? 160 : 110;
  const geo = new THREE.PlaneGeometry(S, S, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = heightAt(x, z);
    p.setY(i, h);
    // cor: grama mais seca nos topos, mais escura/úmida perto do lago
    const L = MAP.lake;
    const dl = Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz);
    const wet = 1 - ss(0.9, 1.5, dl);
    const dry = ss(2, 9, h) * 0.3 + 0.12 * Math.sin(x * 0.07) * Math.sin(z * 0.05);
    c.setRGB(1 - dry * 0.15 - wet * 0.25, 1 - wet * 0.18 - dry * 0.05, 1 - dry * 0.35 - wet * 0.3);
    if (dl < 1.02) c.setRGB(0.55, 0.45, 0.32);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // furos (ex.: interior da piscina)
  if (holes.length) {
    const idx = geo.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      let cx = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(idx[i + k]); cz += p.getZ(idx[i + k]); }
      cx /= 3; cz /= 3;
      if (holes.some(h => Math.abs(cx - h.x) < h.w / 2 + 0.6 && Math.abs(cz - h.z) < h.d / 2 + 0.6)) continue;
      keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(keep);
  }
  geo.computeVertexNormals();
  const grass = tex.grass();
  const mat = new THREE.MeshStandardMaterial({ map: rep(grass.map, S / 6, S / 6), vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Morros distantes (horizonte verde visto nas fotos).
export function buildDistantHills() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(420, 460, 1, 96, 6, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const a = Math.atan2(x, z);
    const hgt = 28 + 18 * Math.sin(a * 3 + 1) + 10 * Math.sin(a * 7 + 2) + 6 * Math.sin(a * 13);
    p.setY(i, y > 0 ? hgt : -20);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#5f8a4a', roughness: 1, side: THREE.BackSide, fog: true }));
  g.add(m);
  const geo2 = new THREE.CylinderGeometry(300, 330, 1, 80, 4, true);
  const p2 = geo2.attributes.position;
  for (let i = 0; i < p2.count; i++) {
    const a = Math.atan2(p2.getX(i), p2.getZ(i));
    p2.setY(i, p2.getY(i) > 0 ? 14 + 9 * Math.sin(a * 5 + 4) + 5 * Math.sin(a * 11) : -20);
  }
  geo2.computeVertexNormals();
  g.add(new THREE.Mesh(geo2, new THREE.MeshStandardMaterial({ color: '#4a7a3a', roughness: 1, side: THREE.BackSide })));
  return g;
}

// Faixa de caminho que acompanha o relevo.
export function buildPath(path) {
  const pts = path.pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
  const n = Math.max(8, Math.round(curve.getLength() / 1.2));
  const pos = [], uv = [], idx = [];
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  let acc = 0, last = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    curve.getPointAt(t, tmp); curve.getTangentAt(t, tan);
    if (last) acc += tmp.distanceTo(last);
    last = tmp.clone();
    const nx = -tan.z, nz = tan.x;
    for (const s of [-1, 1]) {
      const x = tmp.x + nx * s * path.width / 2, z = tmp.z + nz * s * path.width / 2;
      pos.push(x, heightAt(x, z) + 0.04, z);
      uv.push(s < 0 ? 0 : 1, acc / path.width);
    }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const t = path.kind === 'gravel' ? tex.gravel() : tex.dirt();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t.map, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}
