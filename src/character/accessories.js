// Acessórios com geometria própria: chapéus, óculos, joias, gravatas, sapatos e mãos.
// Cada função recebe o personagem (ch) para registrar geometrias e liberar recursos ao trocar de roupa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { HEAD, headFrontZ, metricUV, paramGeo, profileRadius } from './geo.js';
import { shared, surfaceMaterial } from './materials.js';
import { quality } from '../core/settings.js';

const PI = Math.PI;
const g2 = (x, s) => Math.exp(-(x * x) / (s * s));
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- utilidades ----------
function bake(geo, pos, rot, scale) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...(pos || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(scale || [1, 1, 1])));
  return geo.applyMatrix4(m);
}
function clean(g) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.index) g = g; return g; }
function merge(list) {
  const idx = list.every(g => g.index), norm = list.map(g => clean(idx ? g : (g.index ? g.toNonIndexed() : g)));
  const out = mergeGeometries(norm, false);
  list.forEach(g => g.dispose());
  return out;
}

// Lathe de um contorno fechado (aba com espessura e borda arredondada).
function brimGeometry(rIn, rOut, thick, { curl = 0, dipFront = 0, dipBack = 0, seg = 64, oval = 1.08 } = {}) {
  const t = thick / 2, e = thick * 0.9;
  const pts = [new THREE.Vector2(rIn, -t), new THREE.Vector2(rOut - e, -t)];
  for (let i = 1; i < 6; i++) { const a = -PI / 2 + (i / 6) * PI; pts.push(new THREE.Vector2(rOut - e + Math.cos(a) * e, Math.sin(a) * t)); }
  pts.push(new THREE.Vector2(rOut - e, t), new THREE.Vector2(rIn, t), new THREE.Vector2(rIn, -t));
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i) * oval;
    const r = Math.hypot(x, z / oval) || 1, k = sm(rIn, rOut, r);
    const side = Math.pow(x / r, 2), fr = Math.max(0, z / (r * oval)), bk = Math.max(0, -z / (r * oval));
    p.setXYZ(i, x, y + curl * side * k * k - dipFront * fr * fr * k - dipBack * bk * bk * k, z);
  }
  g.computeVertexNormals();
  return metricUV(g, 2 * PI * rOut, (rOut - rIn) * 2);
}

// Copa a partir de perfil [y, r] (topo fechado), ovalizada em z, com deformação opcional.
function crownGeometry(profile, { oval = 1.1, deform = null, seg = 48 } = {}) {
  const pts = profile.map(([y, r]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const g = new THREE.LatheGeometry(pts, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i) * oval;
    if (deform) [x, y, z] = deform(x, y, z);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return metricUV(g, 2 * PI * profile[0][1], profile[profile.length - 1][0] + profile[0][1]);
}

function bandGeometry(r, h, oval = 1.1, thick = 0.003) {
  const pts = [new THREE.Vector2(r, 0), new THREE.Vector2(r + thick, 0.001), new THREE.Vector2(r + thick, h - 0.001), new THREE.Vector2(r, h)];
  const g = new THREE.LatheGeometry(pts, 48);
  g.scale(1, 1, oval);
  return metricUV(g, 2 * PI * r, h);
}

// Brilhante lapidado simples (coroa + pavilhão facetados).
let brilliantGeo = null;
function brilliant() {
  if (!brilliantGeo) {
    const pts = [new THREE.Vector2(0.0001, -0.9), new THREE.Vector2(1, 0), new THREE.Vector2(0.62, 0.38), new THREE.Vector2(0.0001, 0.38)];
    brilliantGeo = new THREE.LatheGeometry(pts, 8);
    brilliantGeo = brilliantGeo.toNonIndexed(); brilliantGeo.computeVertexNormals();
  }
  return brilliantGeo;
}

// Estrela de 5 pontas (tema Hollywood) extrudada.
function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  s.closePath();
  return s;
}

// ---------- CHAPÉUS ----------
export function buildHat(ch, parent, app, it) {
  if (!it || it.id === 'nenhum') return;
  const volume = app.hair === 'black' ? 1.33 : (['cacheado', 'coque', 'topete'].includes(app.hair) ? 1.1 : 1);
  const sink = { cowboy: -0.018, tophat: -0.006, straw: -0.008 }[it.kind] || 0;
  const g = new THREE.Group(); g.position.set(0, 0.078 + sink + (volume - 1) * 0.1, -0.006); g.scale.setScalar(volume); g.rotation.x = -0.1; parent.add(g);
  const DS = THREE.DoubleSide;
  switch (it.kind) {
    case 'fedora': {
      const felt = shared.felt(it.color, DS);
      ch._mesh(crownGeometry([[0, 0.118], [0.04, 0.115], [0.085, 0.106], [0.112, 0.098], [0.124, 0.086], [0.13, 0.05], [0.132, 0.0]], {
        deform: (x, y, z) => {
          // vinco central e pinças frontais típicos do fedora
          y -= 0.028 * g2(x, 0.03) * sm(0.09, 0.13, y) * (0.6 + 0.4 * sm(-0.1, 0.05, z));
          if (z > 0) x *= 1 - 0.14 * g2(y - 0.1, 0.03) * sm(0.02, 0.1, z);
          return [x, y, z];
        },
      }), felt, g);
      ch._mesh(brimGeometry(0.112, 0.2, 0.007, { curl: 0.028, dipFront: 0.022 }), felt, g);
      ch._mesh(bandGeometry(0.117, 0.026), shared.grosgrain(it.band), g, [0, 0.004, 0]);
      ch._mesh(new RoundedBoxGeometry(0.012, 0.02, 0.026, 2, 0.004), shared.grosgrain(it.band), g, [0.12, 0.017, -0.02], [0, 0.3, 0]);
      break;
    }
    case 'tophat': {
      const silk = shared.satin(it.color, DS);
      ch._mesh(crownGeometry([[0, 0.11], [0.06, 0.103], [0.14, 0.104], [0.2, 0.113], [0.212, 0.11], [0.216, 0.09], [0.217, 0.0]], { oval: 1.12 }), silk, g);
      ch._mesh(brimGeometry(0.106, 0.17, 0.008, { curl: 0.04, dipFront: 0.008, dipBack: 0.008, oval: 1.15 }), silk, g);
      ch._mesh(bandGeometry(0.111, 0.034, 1.12), shared.grosgrain(it.band), g, [0, 0.004, 0]);
      break;
    }
    case 'straw': {
      const straw = shared.straw(it.color, DS);
      ch._mesh(crownGeometry([[0, 0.121], [0.05, 0.116], [0.09, 0.112], [0.1, 0.105], [0.104, 0.06], [0.105, 0.0]], { oval: 1.06 }), straw, g);
      ch._mesh(brimGeometry(0.115, 0.26, 0.006, { curl: 0.0, dipFront: 0.012, dipBack: 0.006, oval: 1.04 }), straw, g);
      ch._mesh(bandGeometry(0.121, 0.024, 1.06), shared.grosgrain(it.band), g, [0, 0.004, 0]);
      // acabamento da borda da aba
      const edge = new THREE.TorusGeometry(0.258, 0.0035, 6, 64); edge.rotateX(PI / 2); edge.scale(1, 1, 1.04);
      ch._mesh(metricUV(edge, 1.6, 0.02), shared.grosgrain(it.band), g, [0, -0.002, 0]);
      break;
    }
    case 'cowboy': {
      const felt = shared.felt(it.color, DS);
      ch._mesh(crownGeometry([[0, 0.118], [0.06, 0.112], [0.11, 0.1], [0.135, 0.088], [0.145, 0.05], [0.148, 0]], {
        oval: 1.16,
        deform: (x, y, z) => { y -= 0.03 * g2(x, 0.035) * sm(0.1, 0.148, y); x *= 1 - 0.1 * sm(0.09, 0.14, y) * sm(0.03, 0.12, Math.abs(z)); return [x, y, z]; },
      }), felt, g);
      ch._mesh(brimGeometry(0.11, 0.24, 0.007, { curl: 0.11, dipFront: 0.03, dipBack: 0.012, oval: 1.12 }), felt, g);
      ch._mesh(bandGeometry(0.118, 0.016, 1.16), shared.leather(it.band), g, [0, 0.006, 0]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; ch._mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12), shared.metal('#cfd3d8'), g, [Math.sin(a) * 0.122, 0.014, Math.cos(a) * 0.122 * 1.16], [PI / 2, 0, -a]); }
      break;
    }
    case 'cap': {
      const cloth = surfaceMaterial({ kind: 'canvas', color: it.color, tag: 'cap', side: DS });
      const crown = crownGeometry([[0, 0.126], [0.04, 0.12], [0.075, 0.1], [0.1, 0.07], [0.115, 0.035], [0.12, 0.0]], { oval: 1.08 });
      ch._mesh(crown, cloth, g, [0, -0.012, 0]);
      // costuras dos gomos (6 faixas finas em relevo)
      const seamMat = surfaceMaterial({ kind: 'canvas', color: new THREE.Color(it.color).multiplyScalar(0.8).getStyle(), tag: 'seam' });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * PI * 2 + PI / 6;
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 8 }, (_, k) => {
          const t = k / 7, y = 0.12 * Math.sin(t * PI / 2) - 0.012, r = 0.127 * Math.cos(t * PI / 2) + 0.001;
          return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 1.08);
        }));
        ch._mesh(metricUV(new THREE.TubeGeometry(curve, 16, 0.0016, 4, false), 0.01, 0.2), seamMat, g);
      }
      // aba curva com espessura
      const vs = new THREE.Shape(); vs.absarc(0, 0, 0.115, PI * 0.08, PI * 0.92, false); vs.absarc(0, -0.02, 0.085, PI * 0.88, PI * 0.12, true);
      const visor = new THREE.ExtrudeGeometry(vs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 24 });
      visor.rotateX(PI / 2);
      const vp = visor.attributes.position;
      for (let i = 0; i < vp.count; i++) { const x = vp.getX(i); vp.setY(i, vp.getY(i) - 0.9 * x * x); }
      visor.computeVertexNormals();
      ch._mesh(metricUV(visor, 1, 1), surfaceMaterial({ kind: 'canvas', color: it.band, tag: 'visor', side: DS }), g, [0, -0.008, 0.035], [0.12, 0, 0]);
      ch._mesh(new THREE.SphereGeometry(0.009, 12, 8), cloth, g, [0, 0.112, 0]);
      // estrela bordada na frente
      const star = new THREE.ExtrudeGeometry(starShape(0.022, 0.009), { depth: 0.002, bevelEnabled: false });
      ch._mesh(star, shared.metal('#e9c46a', 'brushed'), g, [0, 0.045, 0.122], [-0.42, 0, 0]);
      break;
    }
    case 'crown': {
      const gold = shared.metal(it.color);
      const geo = new THREE.CylinderGeometry(0.105, 0.1, 0.1, 64, 4, true);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0.02) { const a = Math.atan2(p.getX(i), p.getZ(i)); const peak = Math.pow(Math.abs(Math.cos(a * 4)), 3); p.setY(i, 0.015 + (p.getY(i) - 0.015) * (0.35 + 0.65 * peak)); } }
      geo.computeVertexNormals();
      ch._mesh(metricUV(geo, 0.66, 0.1), surfaceMaterial({ kind: 'polished', color: it.color, side: DS, clearcoat: 0.6, envIntensity: 1.3, tag: 'crown' }), g, [0, 0.03, 0]);
      for (const y of [-0.018, 0.012]) { const t = new THREE.TorusGeometry(0.103 + (y < 0 ? 0 : -0.002), 0.004, 8, 64); t.rotateX(PI / 2); ch._mesh(metricUV(t, 0.6, 0.02), gold, g, [0, y, 0]); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; ch._mesh(new THREE.SphereGeometry(0.008, 12, 10), shared.pearl(), g, [Math.sin(a) * 0.105, 0.08, Math.cos(a) * 0.105]); }
      const gems = new THREE.InstancedMesh(brilliant(), shared.gem('#ffffff'), 16);
      const d = new THREE.Object3D(), cols = ['#d1122a', '#2a6fdb', '#13a35a', '#ffffff'];
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * PI * 2;
        d.position.set(Math.sin(a) * 0.108, 0.0, Math.cos(a) * 0.108); d.lookAt(Math.sin(a), 0, Math.cos(a)); d.rotateX(PI / 2); d.scale.setScalar(i % 2 ? 0.006 : 0.009); d.updateMatrix();
        gems.setMatrixAt(i, d.matrix); gems.setColorAt(i, new THREE.Color(cols[i % 4]));
      }
      gems.castShadow = true; g.add(gems); ch.owned.push({ dispose: () => gems.dispose() });
      break;
    }
  }
}

// ---------- ÓCULOS ----------
function lensShapePoints(shape, k) {
  const s = new THREE.Shape();
  switch (shape) {
    case 'round': s.absarc(0, 0, k * 0.92, 0, PI * 2); break;
    case 'aviator': s.moveTo(-k * 1.02, k * 0.6); s.quadraticCurveTo(0, k * 0.78, k * 1.02, k * 0.62); s.bezierCurveTo(k * 1.2, -k * 0.1, k * 0.55, -k * 1.0, 0.0, -k * 0.95); s.bezierCurveTo(-k * 0.75, -k * 0.9, -k * 1.15, -k * 0.2, -k * 1.02, k * 0.6); break;
    case 'cat': s.moveTo(-k * 0.95, k * 0.32); s.quadraticCurveTo(-k * 0.2, k * 0.62, k * 1.15, k * 0.8); s.quadraticCurveTo(k * 1.05, -k * 0.75, 0, -k * 0.72); s.quadraticCurveTo(-k * 1.0, -k * 0.62, -k * 0.95, k * 0.32); break;
    case 'heart': s.moveTo(0, -k); s.bezierCurveTo(k * 1.6, -k * 0.05, k * 0.65, k * 1.2, 0, k * 0.42); s.bezierCurveTo(-k * 0.65, k * 1.2, -k * 1.6, -k * 0.05, 0, -k); break;
    case 'star': for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, r = i % 2 ? k * 0.52 : k * 1.15; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); break;
    default: { const w = k * 1.05, h = k * 0.74, r = 0.009; s.moveTo(-w + r, h); s.lineTo(w - r, h); s.quadraticCurveTo(w, h, w, h - r); s.lineTo(w * 0.93, -h + r); s.quadraticCurveTo(w * 0.9, -h, w * 0.88 - r, -h); s.lineTo(-w * 0.88 + r, -h); s.quadraticCurveTo(-w * 0.9, -h, -w * 0.93, -h + r); s.lineTo(-w, h - r); s.quadraticCurveTo(-w, h, -w + r, h); }
  }
  return s.getPoints(40).map(p => new THREE.Vector2(p.x, p.y));
}

export function buildGlasses(ch, parent, it) {
  if (!it || it.id === 'nenhum') return;
  const metalFrame = it.shape === 'aviator' || it.shape === 'round';
  const frameMat = metalFrame ? shared.metal(it.frame) : shared.acetate(it.frame);
  const lensMat = it.lens ? shared.lens(it.lens, 0.8) : shared.lens('#dcecff', 0.16);
  const ex = 0.041, ey = 0.012, k = 0.027;
  const zEye = headFrontZ(ex, ey), zBridge = headFrontZ(0, ey);
  const z0 = Math.max(zEye + 0.016, zBridge + 0.007);
  const g = new THREE.Group(); g.position.set(0, ey, z0); parent.add(g);
  const rim = metalFrame ? 1.1 : 1.24;
  let outerHalf = 0;
  for (const s of [-1, 1]) {
    let inner = lensShapePoints(it.shape, k);
    if (it.shape === 'cat' && s < 0) inner = inner.map(p => new THREE.Vector2(-p.x, p.y)).reverse();
    const cx = inner.reduce((a, p) => a + p.x, 0) / inner.length, cy = inner.reduce((a, p) => a + p.y, 0) / inner.length;
    const outer = inner.map(p => new THREE.Vector2(cx + (p.x - cx) * rim, cy + (p.y - cy) * rim));
    outerHalf = Math.max(outerHalf, ...outer.map(p => Math.abs(p.x)));
    const frame = new THREE.Shape(outer); frame.holes.push(new THREE.Path([...inner].reverse()));
    const fg = new THREE.ExtrudeGeometry(frame, { depth: metalFrame ? 0.002 : 0.004, bevelEnabled: true, bevelThickness: 0.0009, bevelSize: 0.0009, bevelSegments: 2, curveSegments: 6 });
    fg.translate(0, 0, -0.002);
    ch._mesh(metricUV(fg, 1, 1), frameMat, g, [s * ex, 0, 0]);
    const lg = new THREE.ShapeGeometry(new THREE.Shape(inner), 6);
    const lp = lg.attributes.position;
    for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, -3 * (x * x + y * y)); }
    lg.computeVertexNormals();
    ch._mesh(lg, lensMat, g, [s * ex, 0, 0.0005]);
    // dobradiça + haste curvando atrás da orelha
    const hx = s * (ex + outerHalf);
    ch._mesh(new THREE.BoxGeometry(0.004, 0.006, 0.007), frameMat, g, [hx, 0.004, -0.003]);
    const earX = s * (HEAD.rx + 0.006);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, 0.004, -0.006), new THREE.Vector3(s * (HEAD.rx + 0.004), 0.005, -z0 * 0.35),
      new THREE.Vector3(earX, 0.0, -z0 - 0.01), new THREE.Vector3(earX - s * 0.006, -0.022, -z0 - 0.03)].map(v => v));
    const tg = new THREE.TubeGeometry(curve, 20, metalFrame ? 0.0014 : 0.0024, 5, false);
    ch._mesh(metricUV(tg, 0.01, 0.15), frameMat, g);
    // plaquetas do nariz
    ch._mesh(new THREE.SphereGeometry(0.0032, 8, 6), shared.lens('#e8f0f8', 0.5), g, [s * 0.011, -0.012, -0.008], null, [0.6, 1, 0.4]);
  }
  // ponte
  const bridge = new THREE.TorusGeometry(0.011, metalFrame ? 0.0013 : 0.0024, 6, 16, PI);
  ch._mesh(bridge, frameMat, g, [0, 0.005, 0]);
  if (metalFrame) ch._mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.034, 6), frameMat, g, [0, 0.019, 0], [0, 0, PI / 2]);
}

// ---------- GRAVATAS ----------
export function buildNeckwear(ch, B, it, zFront, spine) {
  if (!it || it.id === 'nenhum') return;
  const mat = it.pattern === 'satin' ? shared.satin(it.color) : surfaceMaterial({ kind: it.id.includes('veludo') ? 'velvet' : 'satin', color: it.color, sheen: 0.8, sheenRoughness: 0.35, tag: 'neck' });
  const yK = B.neckY - 0.006;
  if (it.kind === 'bowtie') {
    const g = new THREE.Group(); g.position.set(0, yK, zFront(yK - 0.01) + 0.022); spine.add(g);
    for (const s of [-1, 1]) {
      const w = new RoundedBoxGeometry(0.044, 0.034, 0.013, 3, 0.006);
      const p = w.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) + 0.022, y = p.getY(i), t = x / 0.044;
        p.setXYZ(i, s * x, y * (0.45 + 0.55 * Math.pow(t, 0.7)) * (1 + 0.15 * Math.sin(t * PI)), p.getZ(i) * (0.7 + 0.3 * t) - 0.004 * Math.abs(y) / 0.017);
      }
      w.computeVertexNormals();
      ch._mesh(metricUV(w, 1, 1), mat, g);
    }
    ch._mesh(metricUV(new RoundedBoxGeometry(0.014, 0.02, 0.014, 2, 0.004), 1, 1), mat, g, [0, 0, 0.002]);
  } else {
    const y1 = 0.13, H = yK - y1;
    const sh = new THREE.Shape();
    sh.moveTo(-0.009, 0); sh.lineTo(0.009, 0); sh.lineTo(0.02, -H * 0.85); sh.lineTo(0, -H); sh.lineTo(-0.02, -H * 0.85); sh.closePath();
    const blade = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0012, bevelSegments: 2 });
    const p = blade.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), zz = p.getZ(i), Y = yK - 0.012 + yy;
      p.setXYZ(i, x, Y, Math.max(zFront(Y), 0.02) + 0.007 + zz);
    }
    blade.computeVertexNormals();
    ch._mesh(metricUV(blade, 1, 1), mat, spine);
    const knot = new RoundedBoxGeometry(0.026, 0.024, 0.016, 3, 0.006);
    const kp = knot.attributes.position;
    for (let i = 0; i < kp.count; i++) { const y = kp.getY(i); kp.setX(i, kp.getX(i) * (0.75 + (y + 0.012) * 12)); }
    knot.computeVertexNormals();
    ch._mesh(metricUV(knot, 1, 1), mat, spine, [0, yK, zFront(yK) + 0.016], [-0.2, 0, 0]);
  }
}

// ---------- JOIAS ----------
let dialTex = null;
function watchDial() {
  if (dialTex) return dialTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, '#1d2b45'); g.addColorStop(1, '#0a1020');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#e9d39a'; x.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; x.lineWidth = i % 3 ? 3 : 6; x.beginPath(); x.moveTo(64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46); x.lineTo(64 + Math.sin(a) * 56, 64 - Math.cos(a) * 56); x.stroke(); }
  x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + 26, 64 - 18); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 - 8, 64 - 44); x.stroke();
  x.fillStyle = '#e9d39a'; x.font = 'bold 13px Georgia, serif'; x.textAlign = 'center'; x.fillText('★ ESTRELA', 64, 92);
  dialTex = new THREE.CanvasTexture(c); dialTex.colorSpace = THREE.SRGBColorSpace; dialTex.anisotropy = 4;
  return dialTex;
}
let dialMat = null;

export function buildJewelry(ch, B, it, j, zAt) {
  if (!it || it.id === 'nenhum') return;
  const d = new THREE.Object3D();
  const neckBase = B.neckY - 0.012;
  switch (it.kind) {
    case 'watch': {
      const metal = shared.metal(it.color, 'polished'), brushed = shared.metal(it.color, 'brushed');
      const w = new THREE.Group(); w.position.y = -B.foreArm * 0.9; j.elL.add(w);
      // pulseira de elos em volta do pulso
      const n = 22, links = new THREE.InstancedMesh(new RoundedBoxGeometry(0.009, 0.012, 0.004, 2, 0.0015), brushed, n);
      for (let i = 0; i < n; i++) {
        const a = i / n * PI * 2, rr = B.wristR + 0.004;
        d.position.set(Math.sin(a) * rr, (i % 2) * 0.0005, Math.cos(a) * rr); d.rotation.set(0, a, 0); d.scale.set(1, 1, 1); d.updateMatrix(); links.setMatrixAt(i, d.matrix);
      }
      links.castShadow = true; w.add(links); ch.owned.push({ dispose: () => { links.dispose(); links.geometry.dispose(); } });
      // caixa, luneta, mostrador e vidro (voltados para fora do pulso)
      const face = new THREE.Group(); face.position.x = B.wristR + 0.006; face.rotation.z = -PI / 2; w.add(face);
      const casePts = [[0.0001, -0.002], [0.016, -0.002], [0.018, 0.0], [0.018, 0.004], [0.0165, 0.006], [0.0001, 0.006]].map(([r, y]) => new THREE.Vector2(r, y));
      ch._mesh(new THREE.LatheGeometry(casePts, 32), metal, face);
      const bez = new THREE.TorusGeometry(0.0155, 0.0018, 8, 32); bez.rotateX(PI / 2);
      ch._mesh(bez, metal, face, [0, 0.0065, 0]);
      dialMat ||= Object.assign(new THREE.MeshStandardMaterial({ map: watchDial(), roughness: 0.3, metalness: 0.2 }), { userData: { shared: true } });
      const dial = new THREE.CircleGeometry(0.0145, 32); dial.rotateX(-PI / 2);
      ch._mesh(dial, dialMat, face, [0, 0.0062, 0]);
      const glass = new THREE.CircleGeometry(0.015, 32); glass.rotateX(-PI / 2);
      ch._mesh(glass, shared.lens('#ffffff', 0.12), face, [0, 0.0075, 0]);
      ch._mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.004, 10), metal, face, [0.019, 0.002, 0], [0, 0, PI / 2]);
      break;
    }
    case 'pearls': case 'choker': case 'lei': case 'chain': {
      // caminho apoiado no colo
      const pathPts = (drop, rx, rz, n) => Array.from({ length: n }, (_, i) => {
        const a = (i / n) * PI * 2, f = Math.max(0, Math.cos(a));
        const y = neckBase - Math.pow(f, 1.4) * drop;
        const x = Math.sin(a) * (rx + f * 0.01);
        let z = Math.cos(a) * rz;
        if (z > 0) z = Math.max(z, zAt(y) + 0.006);
        return new THREE.Vector3(x, y, z);
      });
      if (it.kind === 'pearls') {
        const n = 44, pts = pathPts(0.085, B.neckR + 0.04, B.neckR + 0.03, n);
        const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), shared.pearl(), n);
        const rr = (i => () => ((i = (i * 16807) % 2147483647) / 2147483647))(7);
        pts.forEach((p, i) => {
          d.position.copy(p); d.rotation.set(rr() * 3, rr() * 3, 0); d.scale.setScalar(0.0072 + rr() * 0.0014); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          im.setColorAt(i, new THREE.Color().setHSL(0.08 + rr() * 0.06, 0.25 + rr() * 0.2, 0.9 + rr() * 0.06));
        });
        im.castShadow = true; j.spine.add(im); ch.owned.push({ dispose: () => { im.dispose(); im.geometry.dispose(); } });
      } else if (it.kind === 'choker') {
        const ribbon = new THREE.TorusGeometry(B.neckR + 0.004, 0.006, 6, 40); ribbon.rotateX(PI / 2); ribbon.scale(1, 1.8, 1);
        ch._mesh(metricUV(ribbon, 0.3, 0.03), surfaceMaterial({ kind: 'velvet', color: '#0d0d12', sheen: 1, sheenRoughness: 0.4, tag: 'choker' }), j.neck, [0, 0.01, 0]);
        const n = 15, im = new THREE.InstancedMesh(brilliant(), shared.gem(it.color), n + 1);
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * PI * 1.1, rr = B.neckR + 0.011;
          d.position.set(Math.sin(a) * rr, 0.01, Math.cos(a) * rr); d.lookAt(Math.sin(a) * 2, 0.01, Math.cos(a) * 2); d.rotateX(PI / 2); d.scale.setScalar(0.0045); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
        }
        d.position.set(0, -0.012, B.neckR + 0.013); d.rotation.set(PI / 2, 0, 0); d.scale.setScalar(0.008); d.updateMatrix(); im.setMatrixAt(n, d.matrix);
        im.castShadow = true; j.neck.add(im); ch.owned.push({ dispose: () => im.dispose() });
      } else if (it.kind === 'chain') {
        const curve = new THREE.CatmullRomCurve3(pathPts(0.13, 0.065, B.neckR + 0.02, 24), true);
        const n = 90, im = new THREE.InstancedMesh(new THREE.TorusGeometry(0.0042, 0.0013, 6, 10), shared.metal(it.color), n);
        const T = new THREE.Vector3();
        for (let i = 0; i < n; i++) {
          const t = i / n; curve.getPointAt(t, d.position); curve.getTangentAt(t, T);
          d.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), T); d.rotateX(i % 2 ? PI / 2 : 0); d.scale.setScalar(1); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
        }
        im.castShadow = true; j.spine.add(im); ch.owned.push({ dispose: () => { im.dispose(); im.geometry.dispose(); } });
        // pingente de estrela (Hollywood)
        const low = new THREE.Vector3(); curve.getPointAt(0, low);
        const star = new THREE.ExtrudeGeometry(starShape(0.018, 0.0075), { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2 });
        ch._mesh(metricUV(star, 1, 1), shared.metal(it.color), j.spine, [0, low.y - 0.022, zAt(low.y - 0.022) + 0.009]);
        const bail = new THREE.TorusGeometry(0.004, 0.0013, 6, 12);
        ch._mesh(bail, shared.metal(it.color), j.spine, [0, low.y - 0.004, zAt(low.y) + 0.008], [0, PI / 2, 0]);
      } else {
        // colar havaiano: flores com pétalas
        const n = 26, pts = pathPts(0.15, B.neckR + 0.07, B.neckR + 0.04, n);
        const petals = [];
        for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; petals.push(bake(new THREE.SphereGeometry(1, 8, 6), [Math.cos(a) * 0.012, Math.sin(a) * 0.012, 0], [0, 0, a], [0.012, 0.007, 0.004])); }
        petals.push(bake(new THREE.SphereGeometry(1, 8, 6), [0, 0, 0.003], null, [0.005, 0.005, 0.004]));
        const flower = merge(petals);
        const im = new THREE.InstancedMesh(flower, surfaceMaterial({ kind: 'satin', color: '#ffffff', tag: 'petal' }), n);
        const cols = ['#ff6f59', '#ffd23f', '#f7a1c4', '#ffffff', '#ff9f1c'];
        pts.forEach((p, i) => {
          d.position.copy(p); d.lookAt(p.clone().multiplyScalar(2).setY(p.y + 0.05)); d.rotateZ(i * 1.3); d.scale.setScalar(1 + (i % 3) * 0.1); d.updateMatrix();
          im.setMatrixAt(i, d.matrix); im.setColorAt(i, new THREE.Color(cols[i % cols.length]));
        });
        im.castShadow = true; j.spine.add(im); ch.owned.push({ dispose: () => { im.dispose(); flower.dispose(); } });
      }
      break;
    }
    case 'earrings': {
      const gem = shared.gem(it.color), metal = shared.metal('#e8e2d0');
      for (const s of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(s * (HEAD.rx + 0.002), -0.044, -0.004); j.headMesh.add(g);
        const stud = new THREE.Mesh(brilliant(), gem); stud.scale.setScalar(0.004); stud.rotation.z = s * PI / 2; g.add(stud);
        ch._mesh(new THREE.TorusGeometry(0.0028, 0.0007, 6, 10), metal, g, [0, -0.006, 0], [0, PI / 2, 0]);
        const drop = new THREE.LatheGeometry([[0.0001, -0.013], [0.004, -0.008], [0.005, -0.004], [0.0035, -0.001], [0.0001, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 8);
        ch._mesh(drop, gem, g, [0, -0.009, 0]);
      }
      break;
    }
  }
}

// ---------- SAPATOS ----------
function footprint(L, W, toe = 'round') {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const zN = s;                                   // -1 calcanhar ... +1 ponta
    let half = W / 2 * Math.pow(Math.abs(c), 0.75) * Math.sign(c);
    half *= zN < 0 ? 0.78 + 0.22 * (1 + zN) : 1 - (toe === 'point' ? 0.55 : 0.25) * Math.pow(Math.max(0, zN - 0.3) / 0.7, 2);
    // arco interno levemente côncavo
    pts.push(new THREE.Vector2(half, zN * L / 2));
  }
  return pts;
}

export function buildShoe(ch, ankle, app, it, s, B) {
  const fem = app.gender === 'f';
  const floor = -(B.hipY - B.thigh - B.shin);
  const L = fem ? 0.235 : 0.27, W = fem ? 0.082 : 0.098;
  const zc = L * 0.27;                              // centro do pé à frente do tornozelo
  const foot = new THREE.Group(); ankle.add(foot);
  const heel = it.kind === 'heel' ? 0.07 : (it.kind === 'boot' ? 0.035 : (it.kind === 'dress' ? 0.022 : 0));
  const toe = it.kind === 'heel' || it.kind === 'boot' ? 'point' : 'round';
  const fp = footprint(L, W, toe);
  // altura extra do salto: o calcanhar sobe, a ponta fica no chão
  const lift = z => heel * sm(L * 0.12, -L * 0.3, z - zc);
  // ---- sola ----
  const soleT = it.kind === 'sneaker' ? 0.026 : (it.kind === 'flipflop' ? 0.016 : 0.012);
  const soleShape = new THREE.Shape(fp.map(p => new THREE.Vector2(p.x * 1.03, p.y * 1.02)));
  const sole = new THREE.ExtrudeGeometry(soleShape, { depth: soleT, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 4 });
  sole.rotateX(PI / 2);
  { const p = sole.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) + zc; p.setXYZ(i, p.getX(i), floor + soleT + p.getY(i) + lift(z), z); } sole.computeVertexNormals(); }
  const soleMat = it.kind === 'sneaker' ? shared.rubber(it.sole || '#ffffff') : it.kind === 'flipflop' ? shared.rubber(it.color) : shared.leather('#1d140e');
  ch._mesh(metricUV(sole, 1, 1), soleMat, foot);
  if (heel > 0.01) {
    const hz = zc - L * 0.42;
    if (it.kind === 'heel') ch._mesh(new THREE.CylinderGeometry(0.008, 0.004, heel + 0.01, 10), shared.leather(it.color, 'patent'), foot, [0, floor + heel / 2, hz + 0.01]);
    else ch._mesh(new RoundedBoxGeometry(W * 0.62, heel, L * 0.2, 2, 0.003), shared.leather('#1d140e'), foot, [0, floor + heel / 2, hz + 0.02]);
  }
  // ---- cabedal ----
  const upperMat = it.kind === 'sneaker' ? (it.accent ? shared.leather(it.color) : shared.canvasCloth(it.color))
    : it.kind === 'flipflop' ? ch.skinMat
    : shared.leather(it.color, it.gloss && !it.metal ? 'patent' : 'matte');
  const height = z => {
    const t = (z - (zc - L / 2)) / L; // 0 calcanhar, 1 ponta
    if (it.kind === 'flipflop') return 0.03 + 0.01 * (1 - t);
    if (it.kind === 'heel') return t > 0.55 ? 0.03 * (1 - (t - 0.55) / 0.45 * 0.6) : 0.045;
    return t > 0.65 ? 0.05 - (t - 0.65) / 0.35 * 0.024 : 0.06 + 0.012 * Math.sin(t * PI);
  };
  // cabedal fechado: o contorno da sola sobe e se fecha numa crista sobre o peito do pé
  const upper = paramGeo((u, v) => {
    const p = fp[Math.round(u * fp.length) % fp.length];
    const z0 = p.y + zc;
    const zz = zc + p.y * (1 - 0.1 * v * v);
    const bulge = Math.sin(v * PI) * 0.08;
    const shrink = Math.cos(v * PI / 2) * (1 + bulge);
    const y = floor + soleT + lift(z0) + height(z0) * Math.pow(Math.sin(v * PI / 2), 0.8);
    return new THREE.Vector3(p.x * shrink, y, zz);
  }, 48, 10, true);
  ch._mesh(metricUV(upper, 0.6, 0.12), upperMat, foot);
  // ---- detalhes ----
  if (it.kind === 'sneaker' || it.kind === 'dress') {
    // cadarços
    const lace = shared.canvasCloth(it.kind === 'sneaker' ? '#f4f4f4' : '#141414');
    for (let i = 0; i < 5; i++) {
      const z = zc + L * (-0.02 + i * 0.05), y = floor + soleT + lift(z) + height(z) + 0.001;
      ch._mesh(new THREE.BoxGeometry(W * 0.32, 0.003, 0.005), lace, foot, [0, y, z], [-0.35, 0, (i % 2 ? 1 : -1) * 0.25]);
    }
  }
  if (it.kind === 'sneaker' && it.accent) {
    const swoosh = new THREE.TorusGeometry(0.05, 0.004, 6, 20, PI * 0.7);
    ch._mesh(swoosh, shared.leather(it.accent), foot, [s === 'L' ? W * 0.5 : -W * 0.5, floor + soleT + 0.025, zc], [0, PI / 2, PI * 0.95]);
  }
  if (it.kind === 'dress' && it.id === 'mocassim') {
    const seam = new THREE.TorusGeometry(W * 0.28, 0.0025, 6, 24, PI);
    ch._mesh(seam, shared.leather(new THREE.Color(it.color).multiplyScalar(0.7).getStyle()), foot, [0, floor + soleT + 0.035, zc + L * 0.18], [-PI / 2 + 0.25, 0, 0]);
  }
  if (it.kind === 'boot') {
    const shaft = new THREE.LatheGeometry([[B.ankleR * 1.35, 0.2], [B.ankleR * 1.5, 0.12], [B.ankleR * 1.45, 0.02], [B.ankleR * 1.5, -0.02]].reverse().map(([r, y]) => new THREE.Vector2(r, y)), 24);
    ch._mesh(metricUV(shaft, 0.3, 0.25), upperMat, foot);
    const pants = app.dress === 'nenhum' && /calca|jeans|couro_calca|pantalona/.test(app.bottom || '');
    if (!pants) { const st = new THREE.TorusGeometry(B.ankleR * 1.36, 0.0018, 4, 32); st.rotateX(PI / 2); ch._mesh(st, shared.rubber('#d7b27a'), foot, [0, 0.19, 0]); }
  }
  if (it.kind === 'heel' && it.metal) {
    const strap = new THREE.TorusGeometry(B.ankleR + 0.006, 0.0025, 6, 24); strap.rotateX(PI / 2);
    ch._mesh(strap, shared.metal(it.color), foot, [0, 0.01, 0]);
  }
  if (it.kind === 'flipflop') {
    const strap = shared.rubber('#f4f4f4');
    for (const sx of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, floor + soleT, zc + L * 0.3), new THREE.Vector3(sx * W * 0.25, floor + soleT + 0.028, zc + L * 0.05), new THREE.Vector3(sx * W * 0.46, floor + soleT + 0.004, zc - L * 0.08)]);
      ch._mesh(new THREE.TubeGeometry(c, 12, 0.0035, 5, false), strap, foot);
    }
    for (let i = 0; i < 5; i++) ch._mesh(new THREE.SphereGeometry(0.008 - i * 0.0006, 8, 6), ch.skinMat, foot, [(-0.03 + i * 0.015) * (s === 'L' ? 1 : -1) * (W / 0.1), floor + soleT + 0.008, zc + L * (0.47 - Math.abs(i - 1) * 0.02)], null, [1, 0.7, 1.2]);
  }
}

// ---------- MÃOS ----------
const handCache = new Map();
export function handGeometry(fem, side) {
  const key = (fem ? 'f' : 'm') + side;
  if (handCache.has(key)) return handCache.get(key).clone();
  const k = fem ? 0.88 : 1, sx = side === 'L' ? 1 : -1;   // sx: lado de fora do corpo
  const parts = [];
  // palma voltada para a coxa: fina em x, larga em z
  parts.push(bake(new RoundedBoxGeometry(0.027 * k, 0.078 * k, 0.07 * k, 3, 0.011 * k), [0, -0.04 * k, 0]));
  const fl = [0.064, 0.076, 0.08, 0.072].map(v => v * k);  // mindinho (trás) ... indicador (frente)
  for (let i = 0; i < 4; i++) {
    const z = (-0.025 + i * 0.0165) * k, len = fl[i];
    const curl = 0.2 + i * 0.04;
    parts.push(bake(new THREE.CapsuleGeometry(0.0072 * k, len * 0.42, 3, 8), [-sx * 0.002, -0.082 * k - len * 0.21, z], [0, 0, sx * curl * 0.5]));
    parts.push(bake(new THREE.CapsuleGeometry(0.0065 * k, len * 0.36, 3, 8), [-sx * (0.006 + curl * 0.02), -0.082 * k - len * 0.6, z], [0, 0, sx * curl * 1.4]));
  }
  // polegar na frente, apontando para baixo e para dentro
  parts.push(bake(new THREE.CapsuleGeometry(0.0092 * k, 0.03 * k, 3, 8), [-sx * 0.009 * k, -0.05 * k, 0.04 * k], [-0.45, 0, sx * 0.35]));
  parts.push(bake(new THREE.SphereGeometry(0.016 * k, 10, 8), [-sx * 0.004, -0.035 * k, 0.026 * k], null, [0.8, 1.2, 1]));
  const g = merge(parts.map(p => { p.deleteAttribute('uv'); return p; }));
  g.computeVertexNormals();
  const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) + pos.getZ(i); uv[i * 2 + 1] = pos.getY(i); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  handCache.set(key, g);
  return g.clone();
}
