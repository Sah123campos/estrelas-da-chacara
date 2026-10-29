// Geometrias procedurais do personagem (corpo, cabeça, cabelos).
import * as THREE from 'three';

export const HEAD = { rx: 0.118, ry: 0.14, rz: 0.13 };

const g2 = (x, s) => Math.exp(-(x * x) / (s * s));

// Deformação da cabeça no espaço da esfera unitária (frente = +z).
function deformUnit(x, y, z) {
  if (y < 0) {
    const t = -y;
    x *= 1 - 0.2 * Math.pow(t, 1.6);
    z *= 1 - 0.06 * t * t;
    if (z > 0) z += 0.05 * Math.pow(t, 3) * Math.max(0, 1 - Math.abs(x) * 3); // queixo
  }
  if (z < 0 && y > -0.3) z *= 1.07;                 // nuca
  if (z > 0) {
    z += 0.1 * g2(x, 0.12) * g2(y + 0.25, 0.17);    // nariz
    z += 0.025 * g2(y - 0.2, 0.08) * g2(Math.abs(x) - 0.3, 0.25); // arco da sobrancelha
    z -= 0.035 * g2(Math.abs(x) - 0.33, 0.13) * g2(y - 0.07, 0.1); // órbitas
    z += 0.02 * g2(Math.abs(x) - 0.45, 0.2) * g2(y + 0.35, 0.18);  // maçãs do rosto
  }
  return [x, y, z];
}

export function headPoint(theta, phi, offset = 0) {
  // theta: 0 = topo; phi: 0 = frente (+z)
  const ux = Math.sin(theta) * Math.sin(phi), uy = Math.cos(theta), uz = Math.sin(theta) * Math.cos(phi);
  const [x, y, z] = deformUnit(ux, uy, uz);
  const len = Math.hypot(ux, uy, uz) || 1;
  return new THREE.Vector3(
    x * HEAD.rx + (ux / len) * offset,
    y * HEAD.ry + (uy / len) * offset,
    z * HEAD.rz + (uz / len) * offset);
}

// Superfície paramétrica genérica: fn(u,v) -> Vector3, u em [0,1] (volta), v em [0,1].
export function paramGeo(fn, nu, nv, closedU = false) {
  const pos = [], uv = [], idx = [];
  const cols = nu + 1;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    const p = fn(u, v);
    pos.push(p.x, p.y, p.z); uv.push(u, 1 - v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (closedU) fixSeamNormals(g, nu, nv);
  return g;
}

function fixSeamNormals(g, nu, nv) {
  const n = g.attributes.normal; const cols = nu + 1;
  for (let j = 0; j <= nv; j++) {
    const a = j * cols, b = j * cols + nu;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}

export function headGeometry(seg = 48) {
  // u em volta (phi), v de cima (0) para baixo (pi)
  // costura atrás da cabeça (phi = ±pi), frente em u = 0.5
  return paramGeo((u, v) => headPoint(Math.max(0.0001, v * Math.PI), (u - 0.5) * Math.PI * 2), seg, Math.round(seg * 0.75), true);
}

// Membro afunilado com pontas arredondadas, pendurado para baixo (topo em y=0).
export function limbGeometry(rTop, rBot, length, seg = 14) {
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * rTop, Math.cos(a) * rTop)); }
  const mid = 6;
  for (let i = 1; i < mid; i++) { const t = i / mid; pts.push(new THREE.Vector2(rTop + (rBot - rTop) * t, -length * t)); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * rBot, -length - Math.sin(a) * rBot)); }
  pts.reverse();
  return new THREE.LatheGeometry(pts, seg, Math.PI);
}

// Lathe a partir de perfil [y, r], reamostrado uniformemente em y; frente (+z) em u = 0.5.
export function profileLathe(profile, samples = 24, seg = 32, depth = 0.64, deform = null) {
  const y0 = profile[0][0], y1 = profile[profile.length - 1][0];
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const y = y0 + (y1 - y0) * (i / samples);
    let k = 0;
    while (k < profile.length - 2 && profile[k + 1][0] < y) k++;
    const [ya, ra] = profile[k], [yb, rb] = profile[k + 1];
    const t = Math.min(1, Math.max(0, (y - ya) / ((yb - ya) || 1)));
    const s = t * t * (3 - 2 * t);
    pts.push(new THREE.Vector2(Math.max(0.0005, ra + (rb - ra) * s), y));
  }
  const g = new THREE.LatheGeometry(pts, seg, Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i) * depth;
    if (deform) [x, y, z] = deform(x, y, z);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Raio do perfil em uma altura (para posicionar gravatas etc.).
export function profileRadius(profile, y) {
  for (let k = 0; k < profile.length - 1; k++) {
    const [ya, ra] = profile[k], [yb, rb] = profile[k + 1];
    if (y >= ya && y <= yb) { const t = (y - ya) / ((yb - ya) || 1); const s = t * t * (3 - 2 * t); return ra + (rb - ra) * s; }
  }
  return profile[profile.length - 1][1];
}

// Calota de cabelo seguindo a forma da cabeça.
// hairline(phi) -> theta máximo; puff(phi, t, theta) -> espessura extra.
export function hairCap(hairline, puff, nu = 40, nv = 16) {
  return paramGeo((u, v) => {
    const phi = (u - 0.5) * Math.PI * 2;
    const tMax = hairline(phi);
    const theta = Math.max(0.001, v * tMax);
    const edge = 1 - 0.85 * Math.min(1, Math.max(0, (v - 0.72) / 0.28)) ** 2;
    return headPoint(theta, phi, puff(phi, v, theta) * edge + 0.0025);
  }, nu, nv, true);
}

// Pequeno ruído determinístico.
export function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// ---------- utilidades para o upgrade visual ----------

// Escala as UVs para METROS (u ao redor, v ao longo), para os materiais compartilhados
// terem a mesma densidade de textura em qualquer peça.
export function metricUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

// Membro com perfil anatômico. rFn(t) -> raio (t = 0 no topo, 1 embaixo).
// opts: folds [{t, amp, n, width}] dobras radiais; crease: vinco frontal (calças);
//       flatten: achata em z; cap: arredonda as pontas; seg/rings: resolução.
export function shapedLimb(rFn, length, opts = {}) {
  const seg = opts.seg || 18, rings = opts.rings || 22;
  const r0 = rFn(0), r1 = rFn(1);
  const pts = [];
  const capN = opts.cap === false ? 0 : 5;
  for (let i = 0; i <= capN; i++) { const a = (i / Math.max(1, capN)) * Math.PI / 2; if (capN) pts.push([Math.sin(a) * r0, Math.cos(a) * r0 * 0.7, -1]); }
  for (let i = 1; i < rings; i++) { const t = i / rings; pts.push([rFn(t), -length * t, t]); }
  for (let i = 0; i <= capN; i++) { const a = (i / Math.max(1, capN)) * Math.PI / 2; if (capN) pts.push([Math.cos(a) * r1, -length - Math.sin(a) * r1 * 0.7, 2]); }
  if (!capN) { pts.unshift([r0, 0, 0]); pts.push([r1, -length, 1]); }
  pts.reverse();
  const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), seg, Math.PI);
  const pos = geo.attributes.position;
  const folds = opts.folds || [];
  for (let k = 0; k < pos.count; k++) {
    let x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    const t = Math.min(1, Math.max(0, -y / length));
    const ang = Math.atan2(x, z);           // 0 = frente (+z)
    let s = 1;
    for (const f of folds) {
      const d = (t - f.t) / (f.width || 0.12);
      if (Math.abs(d) < 1.5) {
        const fall = Math.exp(-d * d * 2);
        // dobras concentradas na parte interna da articulação (frente para cotovelo/joelho atrás)
        const side = f.side === 'back' ? Math.max(0, -Math.cos(ang)) : (f.side === 'front' ? Math.max(0, Math.cos(ang)) : 1);
        s += f.amp * fall * side * Math.sin(d * Math.PI * (f.n || 3) + ang * (f.twist || 2));
      }
    }
    if (opts.crease) s += opts.crease * Math.exp(-(ang * ang) / 0.02) * (t > 0.05 && t < 0.97 ? 1 : 0);
    x *= s; z *= s * (opts.flatten || 1);
    pos.setXYZ(k, x, y, z);
  }
  geo.computeVertexNormals();
  const avgR = (r0 + r1 + rFn(0.5) * 2) / 4;
  return metricUV(geo, Math.PI * 2 * avgR, length + (r0 + r1) * 0.7);
}

// Barra/acabamento: anel com espessura (evita bordas "infinitamente finas").
export function hemRing(radius, thick, depthScale = 1, seg = 28) {
  const g = new THREE.TorusGeometry(radius, thick, 6, seg);
  g.rotateX(Math.PI / 2);
  if (depthScale !== 1) g.scale(1, 1, depthScale);
  return metricUV(g, Math.PI * 2 * radius, thick * Math.PI * 2);
}

// Profundidade (z) da superfície frontal da cabeça num ponto (x, y) — usada para óculos e brincos.
let frontLUT = null;
export function headFrontZ(x, y) {
  if (!frontLUT) {
    frontLUT = [];
    for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
      const th = (0.2 + 0.65 * i / 60) * Math.PI, ph = (-1.4 + 2.8 * j / 60);
      frontLUT.push(headPoint(th, ph));
    }
  }
  let best = null, bd = 1e9;
  for (const p of frontLUT) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd && p.z > 0) { bd = d; best = p; } }
  return best ? best.z : HEAD.rz;
}
