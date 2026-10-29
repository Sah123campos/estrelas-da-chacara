// Construções da chácara. Cada função recebe a definição de mapData e um contexto
// { group, colliders, points, interactables, updaters, heightAt, quality }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { tex, rep, signTexture } from './textures.js';

const PI = Math.PI;
const matCache = new Map();
function M(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }

const mats = {
  white: () => M('white', () => new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.7 })),
  plaster: (tint = '#f2ede2', rx = 2, ry = 1) => M('pl' + tint + rx + ry, () => new THREE.MeshStandardMaterial({ map: rep(tex.plaster(tint).map, rx, ry), roughness: 0.9 })),
  brickRed: () => M('brickred', () => new THREE.MeshStandardMaterial({ color: '#a2372a', roughness: 0.75 })),
  bricks: (rx = 1, ry = 1) => M('bricks' + rx + ry, () => { const t = tex.bricks(); return new THREE.MeshStandardMaterial({ map: rep(t.map, rx, ry), bumpMap: rep(t.bump, rx, ry), bumpScale: 1.5, roughness: 0.85 }); }),
  roof: (rx = 3, ry = 3) => M('roof' + rx + ry, () => { const t = tex.roofTiles(); return new THREE.MeshStandardMaterial({ map: rep(t.map, rx, ry), bumpMap: rep(t.bump, rx, ry), bumpScale: 2, roughness: 0.8, side: THREE.DoubleSide }); }),
  roofDark: (rx = 3, ry = 3) => M('roofd' + rx + ry, () => { const t = tex.roofTiles(); return new THREE.MeshStandardMaterial({ color: '#5a4636', map: rep(t.map, rx, ry), bumpMap: rep(t.bump, rx, ry), bumpScale: 2, roughness: 0.85, side: THREE.DoubleSide }); }),
  wood: (tone = '#8b5a2b', rx = 1, ry = 1) => M('wood' + tone + rx + ry, () => new THREE.MeshStandardMaterial({ map: rep(tex.wood(tone).map, rx, ry), roughness: 0.8 })),
  concrete: (rx = 4, ry = 4) => M('conc' + rx + ry, () => new THREE.MeshStandardMaterial({ map: rep(tex.concrete().map, rx, ry), roughness: 0.9 })),
  blueConcrete: (rx = 3, ry = 3) => M('blueconc' + rx + ry, () => new THREE.MeshStandardMaterial({ color: '#3f78c4', map: rep(tex.concrete().map, rx, ry), roughness: 0.85 })),
  glass: () => M('glass', () => new THREE.MeshStandardMaterial({ color: '#27323a', roughness: 0.08, metalness: 0.7 })),
  metal: () => M('metal', () => new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.35, metalness: 0.85 })),
  dark: () => M('dark', () => new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.6 })),
  yellowWall: () => M('yellow', () => new THREE.MeshStandardMaterial({ map: rep(tex.plaster('#d8b45f').map, 3, 1), roughness: 0.9 })),
  brownFrame: () => M('brownf', () => new THREE.MeshStandardMaterial({ color: '#4b3020', roughness: 0.7 })),
  stone: () => M('stone', () => new THREE.MeshStandardMaterial({ color: '#8d8a83', map: rep(tex.gravel().map, 1, 1), roughness: 1 })),
};

// ---------- utilidades ----------
function box(ctx, w, h, d, mat, x, y, z, rotY = 0, collide = false, parent = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.y = rotY;
  m.castShadow = true; m.receiveShadow = true;
  (parent || ctx.group).add(m);
  if (collide) { ctx.colliders.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: rotY, top: y + h / 2 }); if (h > 1.5 && ctx.occluders) ctx.occluders.push(m); }
  return m;
}
function collBox(ctx, x, z, w, d, rot = 0) { ctx.colliders.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot }); }

// Transforma ponto local (lx, lz) de uma estrutura girada.
function local(def, lx, lz) {
  const r = def.rotY || 0, c = Math.cos(r), s = Math.sin(r);
  return [def.x + lx * c + lz * s, def.z - lx * s + lz * c];
}

export function hipRoofGeo(w, d, h, over = 0.6) {
  const W = w / 2 + over, D = d / 2 + over, ridge = Math.max(0, W - D);
  const v = [
    [-W, 0, -D], [W, 0, -D], [W, 0, D], [-W, 0, D], [-ridge, h, 0], [ridge, h, 0],
  ];
  const faces = [[0, 4, 5, 1], [2, 5, 4, 3], [1, 5, 2], [3, 4, 0]];
  const pos = [], uv = [];
  for (const f of faces) {
    const tri = f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [f];
    for (const t of tri) for (const i of t) { pos.push(...v[i]); uv.push(v[i][0] * 0.5 + v[i][2] * 0.0, (v[i][2] + v[i][1]) * 0.5 + v[i][0] * 0.0); }
  }
  // UV por face para as telhas correrem no sentido da água
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uvs = [];
  for (let i = 0; i < pos.length; i += 9) {
    const a = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
    const b = new THREE.Vector3(pos[i + 3], pos[i + 4], pos[i + 5]);
    const c = new THREE.Vector3(pos[i + 6], pos[i + 7], pos[i + 8]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const p of [a, b, c]) {
      if (Math.abs(n.x) > Math.abs(n.z)) uvs.push(p.z * 0.5, (p.y - Math.abs(p.x)) * 0.5);
      else uvs.push(p.x * 0.5, (p.y - Math.abs(p.z)) * 0.5);
    }
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

export function gableRoofGeo(w, d, h, over = 0.6) {
  const W = w / 2 + over, D = d / 2 + over;
  const pos = [
    -W, 0, -D, W, 0, -D, W, h, 0, -W, 0, -D, W, h, 0, -W, h, 0,
    -W, 0, D, -W, h, 0, W, h, 0, -W, 0, D, W, h, 0, W, 0, D,
  ];
  const uv = [0, 0, w / 2, 0, w / 2, D, 0, 0, w / 2, D, 0, D, 0, 0, 0, D, w / 2, D, 0, 0, w / 2, D, w / 2, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function gableEnds(ctx, w, d, h, mat, x, y, z, rotY) {
  const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
    m.material.side = THREE.DoubleSide;
    const [px, pz] = [x + Math.cos(rotY) * s * w / 2, z - Math.sin(rotY) * s * w / 2];
    m.position.set(px, y, pz); m.rotation.y = rotY + PI / 2;
    ctx.group.add(m);
  }
}

function windowAt(ctx, parent, x, y, z, w, h, rotY, frameMat, shutters = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.glass()); gl.position.z = 0.01; g.add(gl);
  const t = 0.07;
  for (const [fw, fh, fx, fy] of [[w + t, t, 0, h / 2], [w + t, t, 0, -h / 2], [t, h, -w / 2, 0], [t, h, w / 2, 0], [t * 0.6, h, 0, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.06), frameMat); f.position.set(fx, fy, 0.03); g.add(f);
  }
  if (shutters) for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(w / 2, h, 0.04), frameMat); sh.position.set(s * (w * 0.75 + 0.05), 0, 0.03); g.add(sh);
  }
  return g;
}

// ---------- estruturas vistas nas fotos ----------

// Pátio de concreto pintado de azul com mureta (fotos DJI_0336..0339).
function bluePlatform(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  box(ctx, def.w, 0.2, def.d, mats.blueConcrete(3, 2), def.x, y - 0.02, def.z);
  // mureta azul no lado do gramado (norte), interrompida no meio para passagem
  const zc = def.z - def.d / 2 + 0.2;
  const segW = def.w * 0.38;
  for (const s of [-1, 1]) box(ctx, segW, 0.55, 0.4, mats.blueConcrete(2, 0.5), def.x + s * (def.w / 2 - segW / 2), y + 0.28, zc, 0, true);
  // monte de palha de pinheiro ao lado (visto nas fotos)
  const straw = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: 1 }));
  straw.scale.set(1.4, 0.25, 1.0); straw.position.set(def.x - def.w / 2 - 0.6, ctx.heightAt(def.x - def.w / 2 - 0.6, zc - 1) , zc - 1.2);
  ctx.group.add(straw);
  ctx.points.set('patio', new THREE.Vector3(def.x, y, def.z));
}

// Balaústre branco com pilares vermelhos (foto DJI_0336, à direita).
function balustrade(ctx, x1, z1, x2, z2, y, gaps = []) {
  const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
  const dir = new THREE.Vector2((x2 - x1) / len, (z2 - z1) / len);
  const vasePts = [[0.05, 0], [0.07, 0.05], [0.04, 0.12], [0.075, 0.35], [0.05, 0.55], [0.035, 0.62], [0.06, 0.66], [0.06, 0.7]].map(([r, h]) => new THREE.Vector2(r, h));
  const vase = new THREE.LatheGeometry(vasePts, 8);
  const posts = [];
  const pillarEvery = 3.2;
  const inGap = t => gaps.some(([a, b]) => t >= a && t <= b);
  for (let t = 0.2; t < len; t += 0.19) { if (!inGap(t) && (t % pillarEvery) > 0.35) posts.push(t); }
  const im = new THREE.InstancedMesh(vase, mats.white(), posts.length);
  const d = new THREE.Object3D();
  posts.forEach((t, i) => { d.position.set(x1 + dir.x * t, y + 0.12, z1 + dir.y * t); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
  im.castShadow = true; ctx.group.add(im);
  // corrimões e pilares
  let segStart = 0;
  const cuts = [...gaps, [len, len]];
  for (const [a, b] of cuts) {
    const s0 = segStart, s1 = a;
    if (s1 - s0 > 0.2) {
      const mid = (s0 + s1) / 2, L = s1 - s0;
      const cx = x1 + dir.x * mid, cz = z1 + dir.y * mid;
      box(ctx, 0.22, 0.1, L, mats.white(), cx, y + 0.85, cz, ang);
      box(ctx, 0.26, 0.14, L, mats.white(), cx, y + 0.07, cz, ang);
      collBox(ctx, cx, cz, 0.4, L, ang);
    }
    segStart = b;
  }
  for (let t = 0; t <= len + 0.01; t += pillarEvery) {
    if (inGap(t) && !inGap(t - 0.3) && !inGap(t + 0.3)) continue;
    box(ctx, 0.45, 1.1, 0.45, mats.brickRed(), x1 + dir.x * t, y + 0.55, z1 + dir.y * t, ang);
  }
}

// Terraço elevado da piscina: deque, piscina, balaústre e escada.
function poolTerrace(def, ctx) {
  const y = def.h ?? ctx.heightAt(def.x, def.z);
  const P = def.pool, px = def.x + P.dx, pz = def.z + P.dz;
  // deque de pedra em volta da piscina
  const deckW = P.w + 6, deckD = P.d + 6;
  const deckMat = M('deck', () => new THREE.MeshStandardMaterial({ color: '#d9cdb6', map: rep(tex.concrete().map, 6, 4), roughness: 0.85 }));
  const ring = [
    [deckW, 3, 0, -(P.d / 2 + 1.5)], [deckW, 3, 0, P.d / 2 + 1.5], [3, P.d, -(P.w / 2 + 1.5), 0], [3, P.d, P.w / 2 + 1.5, 0],
  ];
  for (const [w, d, dx, dz] of ring) box(ctx, w, 0.12, d, deckMat, px + dx, y + 0.04, pz + dz);
  // borda (pedra branca)
  for (const [w, d, dx, dz] of [[P.w + 0.6, 0.3, 0, -P.d / 2 - 0.15], [P.w + 0.6, 0.3, 0, P.d / 2 + 0.15], [0.3, P.d, -P.w / 2 - 0.15, 0], [0.3, P.d, P.w / 2 + 0.15, 0]]) box(ctx, w, 0.1, d, mats.white(), px + dx, y + 0.13, pz + dz);
  // interior azulejado
  const depth = 1.4;
  const tileMat = M('pooltile', () => new THREE.MeshStandardMaterial({ map: rep(tex.poolTiles().map, 4, 1), roughness: 0.3, side: THREE.DoubleSide }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d), M('poolfloor', () => new THREE.MeshStandardMaterial({ map: rep(tex.poolTiles().map, 8, 4), roughness: 0.3 })));
  floor.rotation.x = -PI / 2; floor.position.set(px, y - depth, pz); ctx.group.add(floor);
  for (const [w, rot, dx, dz] of [[P.w, 0, 0, -P.d / 2], [P.w, PI, 0, P.d / 2], [P.d, PI / 2, -P.w / 2, 0], [P.d, -PI / 2, P.w / 2, 0]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, depth + 0.1), tileMat);
    wall.position.set(px + dx, y - depth / 2 + 0.05, pz + dz); wall.rotation.y = rot; ctx.group.add(wall);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d, 1, 1), new THREE.MeshPhysicalMaterial({
    color: '#38c4d8', roughness: 0.05, metalness: 0.0, transmission: 0, transparent: true, opacity: 0.68, bumpMap: tex.water().bump, bumpScale: 0.6,
  }));
  water.rotation.x = -PI / 2; water.position.set(px, y - 0.12, pz); ctx.group.add(water);
  ctx.updaters.push((dt, t) => { water.material.bumpMap.offset.set(t * 0.02, t * 0.013); });
  collBox(ctx, px, pz, P.w, P.d);
  ctx.holes.push({ x: px, z: pz, w: P.w, d: P.d });
  // balaústre no lado oeste e sul (voltado para o gramado), com abertura para a escada
  const x0 = def.x - def.w / 2 + 0.5, z0 = def.z + def.d / 2 - 0.5, z1 = def.z - def.d / 2 + 0.5, x1 = def.x + def.w / 2 - 0.5;
  balustrade(ctx, x0, z1, x0, z0, y, [[def.d - 7, def.d - 4]]);
  balustrade(ctx, x0, z0, x1, z0, y, []);
  // escada no lado oeste
  const sx = x0 - 0.2, sz = z1 + (def.d - 5.5);
  const ground = ctx.heightAt(sx - 6, sz);
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    box(ctx, 0.6, 0.12 + (y - ground) * t, 3, mats.concrete(1, 1), sx - 5.4 + i * 0.6, ground + ((y - ground) * t) / 2, sz);
  }
  ctx.ramps.push({ x0: sx - 5.7, x1: sx + 0.3, z: sz, hw: 1.5, y0: ground, y1: y });
  // espreguiçadeiras
  for (let i = 0; i < 4; i++) {
    const lx = px - P.w / 2 + 2 + i * 3.6, lz = pz + P.d / 2 + 2.2;
    box(ctx, 0.7, 0.3, 1.9, M('lounger', () => new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.5 })), lx, y + 0.3, lz, 0, true);
    box(ctx, 0.7, 0.6, 0.1, M('lounger', () => new THREE.MeshStandardMaterial({ color: '#f4f4f4' })), lx, y + 0.55, lz + 0.9, 0);
  }
  ctx.points.set('piscina', new THREE.Vector3(px - P.w / 2 - 1.5, y, pz));
  ctx.points.set('piscina_borda', new THREE.Vector3(px + 1, y, pz + P.d / 2 + 1.2));
}

// Toboágua branco com interior azul e torre metálica (foto DJI_0336).
function waterSlide(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  const top = 5.5;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, 0.15, top + 1.1, 0.15, mats.metal(), def.x + dx * 1.2, y + (top + 1.1) / 2, def.z + dz * 1.2, 0, true);
  box(ctx, 2.8, 0.15, 2.8, mats.white(), def.x, y + top, def.z);
  for (const [w, d, dx, dz] of [[2.8, 0.05, 0, -1.4], [0.05, 2.8, -1.4, 0], [0.05, 2.8, 1.4, 0]]) box(ctx, w, 0.05, d, mats.metal(), def.x + dx, y + top + 1.0, def.z + dz);
  // escada de acesso
  for (let i = 0; i < 14; i++) box(ctx, 0.9, 0.06, 0.3, mats.metal(), def.x + 1.9, y + 0.4 * i + 0.2, def.z + 1.4 - i * 0.2);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * PI * 1.25;
    pts.push(new THREE.Vector3(def.x - Math.sin(a) * 5 * t - 1.2 * t, y + top - top * t * 0.92 + 0.2, def.z + Math.cos(a) * 3 - 3 + t * 7));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const outer = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.55, 14, false), M('slide', () => new THREE.MeshStandardMaterial({ color: '#f5f4ef', roughness: 0.3, side: THREE.DoubleSide })));
  outer.castShadow = true; ctx.group.add(outer);
  const inner = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.5, 14, false), M('slidein', () => new THREE.MeshStandardMaterial({ color: '#2f7fd6', roughness: 0.25, side: THREE.BackSide })));
  ctx.group.add(inner);
  // pilares de apoio
  for (let i = 8; i < 40; i += 8) { const p = pts[i]; box(ctx, 0.12, p.y - y, 0.12, mats.metal(), p.x, y + (p.y - y) / 2, p.z, 0, true); }
}

// Quiosque com telhado de telha vermelha ao lado da piscina (foto DJI_0336).
function kiosk(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  box(ctx, def.w + 0.6, 0.2, def.d + 0.6, mats.concrete(2, 2), def.x, y, def.z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, 0.3, 2.6, 0.3, mats.white(), def.x + dx * (def.w / 2 - 0.2), y + 1.4, def.z + dz * (def.d / 2 - 0.2), 0, true);
  box(ctx, def.w, 0.9, 0.25, mats.brickRed(), def.x, y + 0.55, def.z + def.d / 2 - 0.2, 0, true);
  const roof = new THREE.Mesh(hipRoofGeo(def.w, def.d, 1.6, 0.6), mats.roof(2, 2));
  roof.position.set(def.x, y + 2.7, def.z); roof.castShadow = true; ctx.group.add(roof);
  // balcão e churrasqueira
  box(ctx, def.w - 1, 0.95, 0.6, mats.bricks(2, 0.5), def.x, y + 0.57, def.z - def.d / 2 + 0.6, 0, true);
  box(ctx, 1.2, 2.2, 0.7, mats.bricks(0.6, 1), def.x + def.w / 2 - 1.2, y + 1.2, def.z - def.d / 2 + 0.55);
  ctx.points.set('quiosque', new THREE.Vector3(def.x, y + 0.1, def.z + 0.5));
}

// Casa amarela de dois andares na colina (foto DJI_0336, ao fundo).
function yellowHouse(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  const g = new THREE.Group(); g.position.set(def.x, y, def.z); g.rotation.y = def.rotY || 0; ctx.group.add(g);
  ctx.occluders?.push(g);
  const W = def.w, D = def.d;
  const add = (w, h, d, mat, x, yy, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, yy, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  add(W, 3.1, D, mats.yellowWall(), 0, 1.55, 0);
  add(W * 0.72, 2.8, D * 0.78, mats.yellowWall(), -W * 0.08, 3.1 + 1.4, -D * 0.06);
  add(W + 0.3, 0.25, D + 0.3, mats.brownFrame(), 0, 3.1, 0);
  const roof = new THREE.Mesh(hipRoofGeo(W * 0.72, D * 0.78, 2.4, 0.9), mats.roofDark(4, 3)); roof.position.set(-W * 0.08, 5.9, -D * 0.06); roof.castShadow = true; g.add(roof);
  // varanda frontal com pilares de madeira
  const verD = 2.6;
  add(W, 0.18, verD, mats.concrete(4, 1), 0, 0.09, D / 2 + verD / 2);
  for (let i = 0; i <= 6; i++) add(0.22, 3.0, 0.22, mats.wood('#5a3a22'), -W / 2 + 0.3 + i * (W - 0.6) / 6, 1.5, D / 2 + verD - 0.2);
  const vr = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.6, verD + 0.6), mats.roofDark(5, 1)); vr.rotation.x = -PI / 2 + 0.22; vr.position.set(0, 3.05, D / 2 + verD / 2); g.add(vr);
  // janelas e portas
  for (let i = 0; i < 5; i++) windowAt(ctx, g, -W / 2 + 2 + i * (W - 4) / 4, 1.6, D / 2 + 0.01, 1.4, 1.3, 0, mats.brownFrame());
  for (let i = 0; i < 4; i++) windowAt(ctx, g, -W * 0.08 - W * 0.36 + 1.6 + i * (W * 0.72 - 3.2) / 3, 4.5, -D * 0.06 + D * 0.39 + 0.01, 1.2, 1.1, 0, mats.brownFrame());
  // sacada de madeira no andar de cima
  add(W * 0.6, 0.12, 1.2, mats.wood('#5a3a22'), -W * 0.08, 3.25, -D * 0.06 + D * 0.39 + 0.6);
  add(W * 0.6, 0.9, 0.08, mats.wood('#5a3a22', 3, 1), -W * 0.08, 3.75, -D * 0.06 + D * 0.39 + 1.2);
  collBox(ctx, def.x, def.z, W, D, def.rotY || 0);
  ctx.points.set('casa_varanda', new THREE.Vector3(...[def.x, y + 0.2, def.z + D / 2 + 1.4]));
}

// ---------- estruturas provisórias (sem referência acessível) ----------

function diningHall(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  const W = def.w, D = def.d;
  box(ctx, W + 1, 0.25, D + 1, mats.concrete(4, 3), def.x, y + 0.02, def.z);
  for (let i = 0; i <= 5; i++) for (const s of [-1, 1]) box(ctx, 0.4, 3.2, 0.4, mats.bricks(0.3, 1.2), def.x - W / 2 + i * W / 5, y + 1.7, def.z + s * D / 2, 0, true);
  // parede do fundo com cozinha
  box(ctx, W, 3.2, 0.25, mats.plaster('#efe7d6', 4, 1), def.x, y + 1.7, def.z - D / 2 - 0.1, 0, true);
  const roof = new THREE.Mesh(gableRoofGeo(W, D, 2.2, 0.8), mats.roof(5, 2));
  roof.position.set(def.x, y + 3.3, def.z); roof.castShadow = true; ctx.group.add(roof); ctx.occluders?.push(roof);
  // mesas compridas com toalha xadrez e bancos
  const cloth = M('cloth', () => new THREE.MeshStandardMaterial({ map: rep(tex.tablecloth().map, 6, 1), roughness: 0.9 }));
  for (let r = 0; r < 3; r++) {
    const tz = def.z - 2.5 + r * 2.8;
    box(ctx, W - 4, 0.08, 1.0, cloth, def.x + 0.5, y + 0.95, tz, 0, true);
    for (const s of [-1, 1]) box(ctx, W - 4, 0.08, 0.35, mats.wood('#7a4a24', 4, 1), def.x + 0.5, y + 0.55, tz + s * 0.75);
    for (const lx of [-W / 2 + 3, W / 2 - 2]) box(ctx, 0.1, 0.9, 0.8, mats.wood('#5a3a22'), def.x + lx, y + 0.5, tz);
    if (r === 1) ctx.points.set('refeitorio_banco', new THREE.Vector3(def.x - 2, y + 0.15, tz + 0.75));
  }
  // fogão a lenha + balcão
  box(ctx, 3, 0.9, 0.9, mats.bricks(1.5, 0.5), def.x - 4, y + 0.55, def.z - D / 2 + 0.6, 0, true);
  box(ctx, 3, 0.1, 0.95, mats.dark(), def.x - 4, y + 1.03, def.z - D / 2 + 0.6);
  box(ctx, 0.4, 2.6, 0.4, mats.bricks(0.3, 1), def.x - 5.2, y + 2.3, def.z - D / 2 + 0.4);
  box(ctx, 4, 0.95, 0.8, mats.white(), def.x + 3, y + 0.57, def.z - D / 2 + 0.6, 0, true);
  // panelas
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.3, 14), mats.metal()); p.position.set(def.x - 5 + i * 0.9, y + 1.25, def.z - D / 2 + 0.6); ctx.group.add(p); }
  ctx.points.set('cozinha', new THREE.Vector3(def.x - 3, y + 0.15, def.z - D / 2 + 1.6));
  // sino
  const bx = def.x + W / 2 + 1.5, bz = def.z;
  box(ctx, 0.15, 2.6, 0.15, mats.wood('#5a3a22'), bx, y + 1.3, bz, 0, true);
  box(ctx, 0.9, 0.12, 0.12, mats.wood('#5a3a22'), bx, y + 2.6, bz);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.32, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#b8862b', metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }));
  bell.position.set(bx + 0.3, y + 2.35, bz); ctx.group.add(bell);
  ctx.bell = bell;
  addSign(ctx, def.x, y + 3.6, def.z + D / 2 + 0.5, 0, ['REFEITÓRIO'], 5, 1.2);
}

function addSign(ctx, x, y, z, rotY, lines, w = 4, h = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture(lines), roughness: 0.8, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY; ctx.group.add(m);
  return m;
}

function court(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  const W = def.w, D = def.d;
  box(ctx, W + 4, 0.12, D + 4, mats.concrete(6, 4), def.x, y, def.z);
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: rep(tex.courtPaint().map, 3, 2), roughness: 0.8 }));
  paint.rotation.x = -PI / 2; paint.position.set(def.x, y + 0.07, def.z); paint.receiveShadow = true; ctx.group.add(paint);
  // linhas
  const c = document.createElement('canvas'); c.width = 1024; c.height = 600; const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(8, 8, 1008, 584);
  x.beginPath(); x.moveTo(512, 8); x.lineTo(512, 592); x.stroke();
  x.beginPath(); x.arc(512, 300, 80, 0, PI * 2); x.stroke();
  x.beginPath(); x.arc(8, 300, 160, -PI / 2, PI / 2); x.stroke(); x.beginPath(); x.arc(1016, 300, 160, PI / 2, PI * 1.5); x.stroke();
  x.strokeStyle = '#f4c542'; x.beginPath(); x.arc(8, 300, 240, -PI / 2, PI / 2); x.stroke(); x.beginPath(); x.arc(1016, 300, 240, PI / 2, PI * 1.5); x.stroke();
  const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace;
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: 0.8 }));
  lines.rotation.x = -PI / 2; lines.position.set(def.x, y + 0.08, def.z); ctx.group.add(lines);
  // traves e tabelas
  for (const s of [-1, 1]) {
    const gx = def.x + s * W / 2;
    const gm = mats.white();
    box(ctx, 0.1, 2, 0.1, gm, gx, y + 1, def.z - 1.5, 0, true); box(ctx, 0.1, 2, 0.1, gm, gx, y + 1, def.z + 1.5, 0, true);
    box(ctx, 0.1, 0.1, 3.1, gm, gx, y + 2, def.z);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshStandardMaterial({ map: tex.chainFence().map, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    net.position.set(gx + s * 0.8, y + 1, def.z); net.rotation.y = PI / 2; ctx.group.add(net);
    box(ctx, 0.15, 3.6, 0.15, mats.metal(), gx + s * 1.6, y + 1.8, def.z + 4, 0, true);
    box(ctx, 0.08, 1.05, 1.8, mats.white(), gx + s * 1.3, y + 3.4, def.z + 4);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), new THREE.MeshStandardMaterial({ color: '#e85d04', metalness: 0.5 }));
    hoop.rotation.x = PI / 2; hoop.position.set(gx + s * 1.0, y + 3.05, def.z + 4); ctx.group.add(hoop);
  }
  // alambrado com aberturas
  const fenceMat = M('fence', () => new THREE.MeshStandardMaterial({ map: rep(tex.chainFence().map, 10, 2), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }));
  const FW = W + 4, FD = D + 4, fh = 3.5;
  const fence = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, fh), fenceMat);
    m.position.set((x1 + x2) / 2, y + fh / 2, (z1 + z2) / 2); m.rotation.y = Math.atan2(z1 - z2, x2 - x1); ctx.group.add(m);
    collBox(ctx, (x1 + x2) / 2, (z1 + z2) / 2, Math.abs(x2 - x1) + 0.2, Math.abs(z2 - z1) + 0.2);
    for (let t = 0; t <= len; t += 3) box(ctx, 0.08, fh, 0.08, mats.metal(), x1 + (x2 - x1) * t / len, y + fh / 2, z1 + (z2 - z1) * t / len);
  };
  const L = def.x - FW / 2, R = def.x + FW / 2, T = def.z - FD / 2, B = def.z + FD / 2;
  fence(L, T, def.x - 2, T); fence(def.x + 2, T, R, T); fence(L, B, R, B); fence(L, T, L, B); fence(R, T, R, def.z - 2); fence(R, def.z + 2, R, B);
  ctx.points.set('quadra', new THREE.Vector3(def.x - 4, y + 0.1, def.z + 2));
  ctx.points.set('quadra_meio', new THREE.Vector3(def.x, y + 0.1, def.z));
  // bola
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.5 }));
  ball.position.set(def.x + 3, y + 0.2, def.z - 1); ball.castShadow = true; ctx.group.add(ball);
}

function campfire(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mats.stone());
    s.position.set(def.x + Math.cos(a) * 0.9, y + 0.1, def.z + Math.sin(a) * 0.9); s.rotation.set(a, a * 2, 0); ctx.group.add(s);
  }
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 7), mats.wood('#4a2e1a')); l.rotation.set(PI / 2 - 0.4, (i / 5) * PI * 2, 0); l.position.set(def.x, y + 0.25, def.z); ctx.group.add(l); }
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 - i * 0.03, 0.9 - i * 0.08, 8), flameMat); f.position.set(def.x + (i - 2) * 0.08, y + 0.6, def.z + ((i % 2) - 0.5) * 0.1); ctx.group.add(f); flames.push(f); }
  const light = new THREE.PointLight('#ff9a3c', 6, 10, 2); light.position.set(def.x, y + 1.2, def.z); ctx.group.add(light);
  ctx.updaters.push((dt, t) => {
    flames.forEach((f, i) => { f.scale.y = 0.8 + 0.3 * Math.sin(t * 9 + i * 1.7) + 0.1 * Math.sin(t * 23 + i); f.rotation.y = t * (1 + i * 0.3); });
    light.intensity = 5 + Math.sin(t * 13) * 1.2 + Math.sin(t * 7.3) * 0.8;
  });
  collBox(ctx, def.x, def.z, 2, 2);
  // troncos-banco em volta
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + 0.4;
    const lx = def.x + Math.cos(a) * 3.2, lz = def.z + Math.sin(a) * 3.2;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.2, 10), mats.wood('#5a3a22'));
    log.rotation.set(0, -a, PI / 2); log.position.set(lx, y + 0.25, lz); log.castShadow = true; ctx.group.add(log);
    ctx.colliders.push({ type: 'box', x: lx, z: lz, hw: 0.3, hd: 1.1, rot: -a + PI / 2 });
    ctx.points.set('fogueira_' + i, new THREE.Vector3(def.x + Math.cos(a) * 3.8, y, def.z + Math.sin(a) * 3.8));
  }
}

function dorm(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  const W = def.w, D = def.d;
  box(ctx, W, 3, D, mats.plaster('#f4efe4', 6, 1), def.x, y + 1.5, def.z, 0, true);
  box(ctx, W, 0.3, 0.12, mats.bricks(6, 0.2), def.x, y + 0.15, def.z - D / 2 - 0.02);
  const roof = new THREE.Mesh(gableRoofGeo(W, D + 3, 1.8, 0.5), mats.roof(6, 2));
  roof.position.set(def.x, y + 3.0, def.z - 1.5); roof.castShadow = true; ctx.group.add(roof);
  box(ctx, W, 0.15, 3, mats.concrete(6, 1), def.x, y + 0.08, def.z - D / 2 - 1.5);
  for (let i = 0; i <= 8; i++) box(ctx, 0.2, 3, 0.2, mats.wood('#6b4226'), def.x - W / 2 + 0.2 + i * (W - 0.4) / 8, y + 1.5, def.z - D / 2 - 2.8, 0, true);
  for (let i = 0; i < 6; i++) {
    const dx = def.x - W / 2 + 2.2 + i * (W - 4.4) / 5;
    box(ctx, 0.95, 2.1, 0.08, mats.wood('#7a4a24'), dx, y + 1.05, def.z - D / 2 - 0.03);
    windowAt(ctx, ctx.group, dx + 1.4, 1.7, def.z - D / 2 - 0.01, 0.9, 0.9, PI, mats.wood('#6b4226'), false);
  }
  addSign(ctx, def.x, y + 2.6, def.z - D / 2 - 0.05, PI, ['ALOJAMENTOS'], 4, 0.8);
  // espelho/guarda-roupa (interativo)
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), new THREE.MeshStandardMaterial({ color: '#cfe6f5', metalness: 1, roughness: 0.05 }));
  mirror.position.set(-2 + def.x + 2, y + 1.2, def.z - D / 2 - 0.06); mirror.rotation.y = PI; ctx.group.add(mirror);
  box(ctx, 1.1, 1.9, 0.06, mats.wood('#c9a14a'), def.x, y + 1.2, def.z - D / 2 - 0.03);
  ctx.points.set('alojamento_varanda', new THREE.Vector3(def.x + 6, y + 0.15, def.z - D / 2 - 1.5));
  // bancos na varanda
  box(ctx, 2, 0.45, 0.5, mats.wood('#7a4a24'), def.x + 6, y + 0.3, def.z - D / 2 - 0.5, 0, true);
}

function gate(def, ctx) {
  const y = ctx.heightAt(def.x, def.z);
  for (const s of [-1, 1]) box(ctx, 1, 3.4, 1, mats.bricks(0.5, 1.8), def.x + s * 3.2, y + 1.7, def.z, 0, true);
  box(ctx, 7.6, 0.35, 0.35, mats.wood('#5a3a22'), def.x, y + 3.6, def.z);
  addSign(ctx, def.x, y + 4.3, def.z + 0.05, 0, ['ACAMPAMENTO', 'bem-vindos à chácara'], 5, 1.25);
  addSign(ctx, def.x, y + 4.3, def.z - 0.05, PI, ['ACAMPAMENTO', 'bem-vindos à chácara'], 5, 1.25);
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(def.x + s * 2.7, y, def.z); leaf.rotation.y = s * 1.2; ctx.group.add(leaf);
    for (let i = 0; i < 7; i++) box(ctx, 0.06, 1.8, 0.06, mats.dark(), s * -(0.2 + i * 0.35), 1, 0, 0, false, leaf);
    box(ctx, 2.5, 0.08, 0.08, mats.dark(), s * -1.25, 1.85, 0, 0, false, leaf);
    box(ctx, 2.5, 0.08, 0.08, mats.dark(), s * -1.25, 0.2, 0, 0, false, leaf);
  }
  // cerca de madeira lateral
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const fx = def.x + s * (4 + i * 2.5);
    box(ctx, 0.15, 1.3, 0.15, mats.wood('#6b4226'), fx, ctx.heightAt(fx, def.z) + 0.65, def.z);
    box(ctx, 2.5, 0.1, 0.06, mats.wood('#6b4226'), fx + s * 1.25, ctx.heightAt(fx, def.z) + 1.1, def.z);
    box(ctx, 2.5, 0.1, 0.06, mats.wood('#6b4226'), fx + s * 1.25, ctx.heightAt(fx, def.z) + 0.6, def.z);
  }
  collBox(ctx, def.x - 19, def.z, 30, 0.4); collBox(ctx, def.x + 19, def.z, 30, 0.4);
  collBox(ctx, def.x, def.z + 3, 60, 0.4); // limite: não sair pela estrada
  ctx.points.set('entrada', new THREE.Vector3(def.x + 2, y, def.z - 3));
}

export function buildPoles(ctx, poles) {
  const tops = [];
  for (const p of poles) {
    const y = ctx.heightAt(p.x, p.z);
    box(ctx, 0.22, 8, 0.22, mats.wood('#6b5a48'), p.x, y + 4, p.z, 0, true);
    box(ctx, 0.12, 0.12, 1.6, mats.wood('#6b5a48'), p.x, y + 7.4, p.z);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), mats.metal());
    lamp.position.set(p.x + 0.4, y + 7, p.z); ctx.group.add(lamp);
    tops.push(new THREE.Vector3(p.x, y + 7.4, p.z));
  }
  // fios entre postes vizinhos
  const lineMat = new THREE.LineBasicMaterial({ color: '#222' });
  for (let i = 0; i < tops.length; i++) {
    let best = null, bd = 1e9;
    for (let k = 0; k < tops.length; k++) { if (k === i) continue; const d = tops[i].distanceTo(tops[k]); if (d < bd && d < 50) { bd = d; best = k; } }
    if (best === null || best < i) continue;
    const a = tops[i], b = tops[best], pts = [];
    for (let t = 0; t <= 16; t++) { const u = t / 16; pts.push(new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * PI) * 0.8, 0))); }
    ctx.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
}

export function buildLakeBench(ctx) {
  // banco voltado para o lago (rotY = 0.5; frente do banco aponta para -z local)
  const def = { x: -30, z: -32.5, rotY: 0.5 };
  const y = ctx.heightAt(def.x, def.z);
  const at = (lx, lz) => local(def, lx, lz);
  let [x, z] = at(0, 0);
  box(ctx, 2, 0.08, 0.5, mats.wood('#7a4a24'), x, y + 0.45, z, def.rotY, true);
  [x, z] = at(0, 0.24); box(ctx, 2, 0.45, 0.06, mats.wood('#7a4a24'), x, y + 0.75, z, def.rotY);
  for (const s of [-1, 1]) { [x, z] = at(s * 0.9, 0); box(ctx, 0.08, 0.45, 0.45, mats.dark(), x, y + 0.22, z, def.rotY); }
  const [sx, sz] = at(0, -0.05);
  ctx.points.set('banco_lago', new THREE.Vector3(sx, y, sz));
}

// Cachoeira: paredão de pedra, queda d'água animada, espuma e riacho até o lago.
function waterfall(def, ctx) {
  const top = ctx.heightAt(def.x - 6, def.z) + 0.5;      // alto do morro (atrás)
  const base = ctx.heightAt(def.x + 4, def.z);
  const g = new THREE.Group(); g.position.set(def.x, 0, def.z); g.rotation.y = def.rotY || 0; ctx.group.add(g);
  const rockMat = M('rock', () => new THREE.MeshStandardMaterial({ color: '#b5b0a6', map: rep(tex.gravel().map, 2, 2), roughness: 0.9, flatShading: true }));
  const rnd = (i) => { const v = Math.sin(i * 91.7) * 43758.5; return v - Math.floor(v); };
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const r = 0.6 + rnd(i) * 0.9;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    const lx = side * (2.0 + rnd(i + 3) * 2.6), lz = -3.2 + rnd(i + 7) * 2.2;
    rock.position.set(lx, base + (top - base) * rnd(i + 11), lz);
    rock.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, 0); rock.scale.y = 1.3;
    rock.castShadow = rock.receiveShadow = true; g.add(rock);
  }
  // paredão atrás da queda
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5, top - base + 1, 2), rockMat);
  wall.position.set(0, (top + base) / 2, -3); g.add(wall);
  // água caindo (textura com listras que desce)
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(220,240,255,0.55)'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; x.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 3, 20 + Math.random() * 60); }
  const wt = new THREE.CanvasTexture(c); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2, 2); wt.colorSpace = THREE.SRGBColorSpace;
  const fallMat = new THREE.MeshStandardMaterial({ map: wt, transparent: true, opacity: 0.85, roughness: 0.1, emissive: '#9fb8c8', emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const H = top - base;
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, H, 1, 8), fallMat);
  const fp = fall.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i); const t = 0.5 - y / H; fp.setZ(i, 0.6 * t * t); }
  fall.geometry.computeVertexNormals();
  fall.position.set(0, base + H / 2, -1.6); g.add(fall);
  // poço e espuma
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshStandardMaterial({ color: '#3d5a4a', roughness: 0.08, metalness: 0.5, envMapIntensity: 2 }));
  pool.rotation.x = -PI / 2; pool.position.set(0, base + 0.08, 1); g.add(pool);
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.4, 2.2, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
  foam.rotation.x = -PI / 2; foam.position.set(0, base + 0.12, -0.6); g.add(foam);
  // riacho até o lago
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14), new THREE.MeshStandardMaterial({ color: '#40604f', roughness: 0.1, metalness: 0.5, map: wt, transparent: true, opacity: 0.9 }));
  stream.rotation.x = -PI / 2; stream.position.set(0, ctx.heightAt(def.x + 10, def.z) + 0.1, 10); g.add(stream);
  ctx.updaters.push((dt, t) => { wt.offset.y = t * 1.4; foam.scale.setScalar(1 + Math.sin(t * 5) * 0.06); });
  ctx.colliders.push({ type: 'circle', x: def.x, z: def.z, r: 3.8 });
  ctx.points.set('cachoeira', new THREE.Vector3(def.x + 6, base, def.z + 2));
}

export const BUILDERS = { waterfall, bluePlatform, poolTerrace, waterSlide, kiosk, yellowHouse, diningHall, court, campfire, dorm, gate };
