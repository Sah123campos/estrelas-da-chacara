// Personagem 3D estilizado: esqueleto hierárquico, roupas, cabelo, acessórios e animação procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { HEAD, headGeometry, headPoint, limbGeometry, profileLathe, profileRadius, paramGeo, hash3, metricUV, shapedLimb, hemRing } from './geo.js';
import { FaceTexture, applyFaceShader, DEFAULT_ADJUST } from './face.js';
import { findItem } from './wardrobe.js';
import { paintTop, paintJacket, newTorsoCanvas, lapelEdges, jacketButtons, torsoRelief, weaveColor, fabricTexture, TORSO_W, TORSO_H, JACKET_VBOTTOM } from './garments.js';
import { shared, clothMaterial, fabricKind, fabricProps, kindMaps, kindTile, surfaceMaterial } from './materials.js';
import { buildHairGeometry, beardColorize } from './hair.js';
import { buildHat, buildGlasses, buildNeckwear, buildJewelry, buildShoe, handGeometry } from './accessories.js';
import { quality } from '../core/settings.js';

const PI = Math.PI;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const g2 = (x, s) => Math.exp(-(x * x) / (s * s));

const BODY = {
  m: {
    hipY: 0.93, hipX: 0.092, thigh: 0.45, shin: 0.43, shoulderX: 0.205, shoulderY: 0.425, upperArm: 0.29, foreArm: 0.25,
    neckY: 0.5, neckR: 0.052, armR: 0.052, foreR: 0.043, wristR: 0.034, thighR: 0.094, kneeR: 0.066, ankleR: 0.047, headScale: 1.1, depth: 0.64,
    profile: [[-0.13, 0.02], [-0.12, 0.1], [-0.06, 0.162], [0.02, 0.172], [0.12, 0.16], [0.2, 0.168], [0.3, 0.192], [0.38, 0.206], [0.44, 0.2], [0.48, 0.165], [0.51, 0.1], [0.535, 0.055]],
  },
  f: {
    hipY: 0.9, hipX: 0.09, thigh: 0.44, shin: 0.42, shoulderX: 0.172, shoulderY: 0.41, upperArm: 0.27, foreArm: 0.235,
    neckY: 0.485, neckR: 0.043, armR: 0.041, foreR: 0.034, wristR: 0.027, thighR: 0.092, kneeR: 0.06, ankleR: 0.04, headScale: 1.04, depth: 0.66,
    profile: [[-0.13, 0.02], [-0.12, 0.11], [-0.05, 0.182], [0.03, 0.178], [0.12, 0.136], [0.2, 0.14], [0.28, 0.158], [0.35, 0.163], [0.41, 0.158], [0.46, 0.13], [0.495, 0.08], [0.52, 0.048]],
  },
};

function sliceProfile(profile, y0, y1) {
  const out = [[y0, profileRadius(profile, y0)]];
  for (const p of profile) if (p[0] > y0 && p[0] < y1) out.push(p);
  out.push([y1, profileRadius(profile, y1)]);
  return out;
}

export class Character {
  constructor({ isPlayer = false } = {}) {
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.face = new FaceTexture();
    this.isPlayer = isPlayer;
    this.owned = [];
    this.j = {};
    this.app = null;
    this.legAmp = 1;
    this.a = { phase: 0, walk: 0, run: 0, talk: 0, sit: 0, dance: 0, wave: 0, t: Math.random() * 10, blinkT: 2 + Math.random() * 3, blinking: 0, lookYaw: 0 };
    this.onStep = null;
    this._lastStepSign = 0;
    this.height = 1.75;
  }

  // ---------- helpers ----------
  _mesh(geo, mat, parent, pos, rot, scale) {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    this.owned.push(geo);
    return m;
  }
  // Materiais compartilhados (userData.shared) não são descartados ao trocar de roupa.
  _mat(m) { if (!m.userData.shared) { this.owned.push(m); if (m.userData.ownedTexture) this.owned.push(m.userData.ownedTexture); } return m; }
  _std(color, rough = 0.6, metal = 0, extra = {}) { return this._mat(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })); }
  _cloth(spec, slot, side) { return clothMaterial(spec, slot, { side, patternTexture: fabricTexture(spec) }); }

  dispose() {
    for (const o of this.owned) o.dispose?.();
    this.owned = [];
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }

  // ---------- montagem ----------
  setAppearance(app) {
    this.app = JSON.parse(JSON.stringify(app));
    this.dispose();
    const B = BODY[app.gender] || BODY.m;
    this.B = B;
    const j = this.j = {};
    const hi = quality().physical;
    const skinCol = new THREE.Color(app.skin);
    const skinStr = '#' + skinCol.getHexString();
    const skin = shared.skin(skinStr);
    this.skinMat = skin;

    const dress = app.dress && app.dress !== 'nenhum' ? findItem('dress', app.dress) : null;
    const top = findItem('top', app.top) || findItem('top', 'camisa_branca');
    const outer = app.outer && app.outer !== 'nenhum' ? findItem('outer', app.outer) : null;
    const bottom = dress ? null : (findItem('bottom', app.bottom) || findItem('bottom', 'calca_preta'));
    const upperSpec = dress || top;
    const gloves = findItem('gloves', app.gloves);
    const legwear = findItem('legwear', app.legwear);

    // juntas (inalteradas: compatíveis com as animações)
    j.hips = new THREE.Group(); j.hips.position.y = B.hipY; this.root.add(j.hips);
    j.spine = new THREE.Group(); j.hips.add(j.spine);
    j.neck = new THREE.Group(); j.neck.position.y = B.neckY; j.spine.add(j.neck);
    j.head = new THREE.Group(); j.head.position.y = 0.06; j.neck.add(j.head);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const sh = j['sh' + s] = new THREE.Group(); sh.position.set(sx * B.shoulderX, B.shoulderY, 0); j.spine.add(sh);
      const el = j['el' + s] = new THREE.Group(); el.position.y = -B.upperArm; sh.add(el);
      const hd = j['hd' + s] = new THREE.Group(); hd.position.y = -B.foreArm; el.add(hd);
      const th = j['th' + s] = new THREE.Group(); th.position.set(sx * B.hipX, -0.04, 0); j.hips.add(th);
      const kn = j['kn' + s] = new THREE.Group(); kn.position.y = -B.thigh; th.add(kn);
      const an = j['an' + s] = new THREE.Group(); an.position.y = -B.shin; kn.add(an);
    }

    // ----- tronco: forma anatômica + alfaiataria -----
    const fem = app.gender === 'f';
    const tailored = !!(outer && outer.lapel !== 'none');
    const shape = (x, y, z) => {
      if (z < 0) z *= 0.9 - 0.04 * g2(Math.abs(x) - 0.08, 0.06) * g2(y - 0.33, 0.08); // costas e escápulas
      const sh = sm(0.34, 0.45, y) * (1 - sm(0.47, 0.53, y));
      x *= 1 + (tailored ? 0.075 : 0.045) * sh;                                        // ombros mais definidos (ombreira no paletó)
      z *= 1 - 0.1 * sh;
      if (!fem && z > 0) z += 0.012 * g2(Math.abs(x) - 0.07, 0.06) * g2(y - 0.34, 0.06);  // peitoral
      if (fem && z > 0) z += 0.042 * (g2(x - 0.068, 0.058) + g2(x + 0.068, 0.058)) * g2(y - 0.305, 0.06);
      if (tailored) { const w = g2(y - 0.16, 0.09); x *= 1 - 0.035 * w; }               // cintura marcada
      return [x, y, z];
    };
    this.torsoShape = shape;
    const yTop = B.profile[B.profile.length - 1][0], ySplit = 0.04;
    const upperProf = sliceProfile(B.profile, ySplit, yTop);
    const lowerProf = sliceProfile(B.profile, B.profile[0][0], ySplit);
    // ponto na superfície do tronco a partir de coordenadas do canvas pintado
    const torsoPoint = (cx, cy, off = 0) => {
      const y = yTop - (cy / TORSO_H) * (yTop - ySplit);
      const phi = Math.PI + (cx / TORSO_W) * Math.PI * 2;
      const r = profileRadius(B.profile, y);
      let [x, yy, z] = shape(Math.sin(phi) * r, y, Math.cos(phi) * r * B.depth);
      const n = new THREE.Vector3(x, 0, z / (B.depth * B.depth)).normalize();
      return new THREE.Vector3(x + n.x * off, yy, z + n.z * off);
    };
    this.torsoPoint = torsoPoint;
    const zAt = y => { let [, , z] = shape(0, y, profileRadius(B.profile, y) * B.depth); return z; };

    const torsoSpec = outer || upperSpec;
    const torsoKind = fabricKind(torsoSpec, outer ? 'outer' : (dress ? 'dress' : 'top'));
    const torsoCanvas = newTorsoCanvas();
    const tctx = torsoCanvas.getContext('2d', { willReadFrequently: true });
    if (outer) paintJacket(tctx, outer, upperSpec, skinStr, outer.length);
    else paintTop(tctx, upperSpec, skinStr);
    weaveColor(tctx, torsoKind);
    const torsoTex = new THREE.CanvasTexture(torsoCanvas); torsoTex.colorSpace = THREE.SRGBColorSpace; torsoTex.anisotropy = 8;
    const kmap = kindMaps(torsoKind);
    let rsum = 0; for (let i = 0; i < kmap.N * kmap.N; i += 97) rsum += kmap.def ? 1 : 0;
    const relief = torsoRelief({ kind: torsoKind, jacket: outer, top: outer ? null : upperSpec, skinNeck: outer ? null : upperSpec.neck, res: hi ? 1 : 0.5,
      roughBase: { satin: 0.32, sequin: 0.25, lame: 0.22, leather: 0.45, velvet: 0.88, poplin: 0.62, jersey: 0.85, denim: 0.9, linen: 0.86, knit: 0.92, felt: 0.95 }[torsoKind] ?? 0.78,
      lapelRough: outer && outer.lapelSatin ? 0.26 : 0.7 });
    this.owned.push(torsoTex, relief.normal, relief.rough);
    const tProps = fabricProps(torsoKind);
    const TM = hi && (tProps.sheen || tProps.clearcoat) ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const torsoMat = this._mat(new TM({ map: torsoTex, normalMap: relief.normal, normalScale: new THREE.Vector2(1, 1), roughnessMap: relief.rough, roughness: 1, metalness: { sequin: 0.75, lame: 0.85 }[torsoKind] || 0.02 }));
    if (TM === THREE.MeshPhysicalMaterial) {
      if (tProps.sheen) { torsoMat.sheen = tProps.sheen; torsoMat.sheenRoughness = tProps.sheenRoughness ?? 0.5; torsoMat.sheenColor = new THREE.Color(torsoSpec.color).lerp(new THREE.Color('#ffffff'), 0.35); }
      if (tProps.clearcoat) { torsoMat.clearcoat = tProps.clearcoat; torsoMat.clearcoatRoughness = tProps.clearcoatRoughness ?? 0.3; }
    }
    this._mesh(profileLathe(upperProf, hi ? 30 : 24, hi ? 48 : 36, B.depth, shape), torsoMat, j.spine);

    const lowerSpec = dress || bottom;
    const lowerG = metricUV(profileLathe(lowerProf, 10, 36, B.depth, shape), 0.98, 0.17);
    this._mesh(lowerG, this._cloth(lowerSpec, dress ? 'dress' : 'bottom'), j.spine);
    // cós / cinto nas calças e saias
    if (!dress && bottom) {
      const belt = bottom.kind === 'pants' && !bottom.wide && fabricKind(bottom, 'bottom') !== 'satin';
      const wy = 0.035, wr = profileRadius(B.profile, wy);
      const band = hemRing(wr * (1 + B.depth) / 2 + 0.002, belt ? 0.012 : 0.009, 1, 40);
      band.scale(1 / ((1 + B.depth) / 2), 1, B.depth / ((1 + B.depth) / 2));
      this._mesh(band, belt && !outer ? shared.leather('#1b130d', bottom.color === '#121214' || bottom.color === '#0e0e10' ? 'patent' : 'matte') : this._cloth(bottom, 'bottom'), j.spine, [0, wy, 0]);
      if (belt && !outer) this._mesh(new RoundedBoxGeometry(0.03, 0.022, 0.006, 2, 0.003), shared.metal('#c9a14a'), j.spine, [0, wy, zAt(wy) + 0.012]);
    }

    // ----- casaco: lapelas 3D, gola, botões, lenço, barra -----
    if (outer) {
      const jm = this._cloth(outer, 'outer', THREE.DoubleSide);
      if (outer.lapel !== 'none') {
        const vb = JACKET_VBOTTOM[outer.length] || 360;
        const lapelSpec = { ...outer, color: outer.lapelColor || outer.color, pattern: outer.lapelSatin ? 'satin' : outer.pattern };
        const lm = outer.lapelSatin ? shared.satin(lapelSpec.color, THREE.DoubleSide) : this._cloth(lapelSpec, 'outer', THREE.DoubleSide);
        for (const side of [-1, 1]) this._mesh(this._lapelGeometry(side, outer.lapel, vb, torsoPoint), lm, j.spine);
        for (const [bx, by] of jacketButtons(outer)) this._button(j.spine, torsoPoint, bx, by, outer.lapelSatin ? '#111114' : new THREE.Color(outer.color).multiplyScalar(0.55).getStyle(), 0.012);
        this._pocketSquare(j.spine, torsoPoint);
      }
      // gola atrás do pescoço
      const collar = hemRing(B.neckR * 1.45, 0.016, 0.85, 32);
      this._mesh(collar, jm, j.spine, [0, yTop - 0.025, -0.012], [0.35, 0, 0]);
      if (outer.length !== 'waist') {
        const long = outer.length === 'knee';
        const y0 = 0.06, y1 = long ? -0.62 : -0.17;
        const prof = [];
        for (let i = 0; i <= 10; i++) {
          const y = y0 + (y1 - y0) * (i / 10);
          const base = profileRadius(B.profile, Math.max(B.profile[0][0] + 0.02, y));
          const r = y > -0.1 ? base + 0.014 : (long ? 0.19 + (-0.1 - y) * 0.16 : base + 0.02);
          prof.push([y, Math.max(r, long ? 0.19 : 0.1)]);
        }
        prof.reverse();
        const tail = metricUV(profileLathe(prof, 14, 40, B.depth + 0.08, (x, y, z) => {
          const a = Math.atan2(x, z);
          const k = 1 + 0.015 * Math.sin(a * 9) * sm(-0.02, y1, y);       // caimento com leves ondas
          return [x * k, y, z * k];
        }), 0.98, y0 - y1);
        this._mesh(tail, jm, j.spine);
        const hr = profileRadius(prof, y1 + 0.001) || prof[0][1];
        const hem = hemRing(prof[0][1], 0.006, (B.depth + 0.08), 40);
        this._mesh(hem, jm, j.spine, [0, y1, 0]);
        this.legAmp = long ? 0.75 : 1;
      } else {
        const band = hemRing(profileRadius(B.profile, 0.045) * 0.82 + 0.02, 0.012, B.depth * 1.22, 40);
        this._mesh(band, outer.pattern === 'satin' ? surfaceMaterial({ kind: 'knit', color: new THREE.Color(outer.color).multiplyScalar(0.7).getStyle(), tag: 'rib' }) : jm, j.spine, [0, 0.045, 0]);
        if (outer.lapel === 'none') this._mesh(new RoundedBoxGeometry(0.01, 0.024, 0.005, 2, 0.002), shared.metal('#bfc3c8'), j.spine, [0, 0.33, zAt(0.33) + 0.008]);
        this.legAmp = 1;
      }
    } else this.legAmp = 1;

    // ----- camisa: gola 3D -----
    if (!dress && top && top.neck === 'collar') {
      const cm = this._cloth(top, 'top', THREE.DoubleSide);
      this._mesh(hemRing(B.neckR * 1.18, 0.012, 0.95, 28), cm, j.neck, [0, -0.01, 0.002]);
      for (const side of [-1, 1]) this._mesh(this._collarWing(side, B), cm, j.neck);
      if (!outer) for (let y = 0.4; y > 0.08; y -= 0.075) this._button(j.spine, torsoPoint, TORSO_W / 2, (yTop - y) / (yTop - ySplit) * TORSO_H, '#f2f0ea', 0.0055);
    }

    // ----- saia / vestido -----
    let skirtSpec = null, skirtLen = 0, skirtShape = 'aline', skirtFlare = 0;
    if (dress && dress.shape !== 'jumpsuit') { skirtSpec = dress; skirtLen = 0.94 * dress.length; skirtShape = dress.shape; }
    else if (bottom && bottom.kind === 'skirt') { skirtSpec = bottom; skirtLen = bottom.length; skirtShape = 'custom'; skirtFlare = bottom.flare; }
    if (skirtSpec) {
      const y0 = 0.02, prof = [];
      const N = 16;
      for (let i = 0; i <= N; i++) {
        const t = i / N, y = y0 - skirtLen * t;
        let r;
        switch (skirtShape) {
          case 'mermaid': r = t < 0.62 ? 0.19 - 0.004 * Math.sin(t / 0.62 * PI * 0.5) : 0.186 + Math.pow((t - 0.62) / 0.38, 1.6) * 0.16; break;
          case 'ballgown': r = 0.185 + 0.33 * (1 - Math.pow(1 - t, 2.2)); break;
          case 'column': r = 0.19 + 0.05 * t; break;
          case 'aline': r = 0.188 + 0.2 * t; break;
          default: r = 0.19 + skirtFlare * t + 0.01 * t;
        }
        prof.push([y, r]);
      }
      const hemR = prof[prof.length - 1][1];
      prof.reverse();
      const seed = hash3(skirtLen * 10, skirtFlare * 10, 4) * 10;
      const skirtGeo = profileLathe(prof, N, hi ? 72 : 48, B.depth + 0.12, (x, y, z) => {
        // pregas irregulares que aumentam na barra, mais fundas atrás
        const a = Math.atan2(x, z), d = Math.min(1, (y0 - y) / skirtLen);
        const k = 1 + d * (0.03 * Math.sin(a * 11 + seed) + 0.018 * Math.sin(a * 23 + seed * 2) + 0.012 * Math.sin(a * 5));
        return [x * k, y, z * k];
      });
      metricUV(skirtGeo, 2 * PI * (0.19 + hemR) / 2, skirtLen);
      const skirtMat = this._cloth(skirtSpec, dress ? 'dress' : 'bottom', THREE.DoubleSide);
      j.skirt = this._mesh(skirtGeo, skirtMat, j.hips);
      // barra com espessura acompanhando as pregas
      const hem = paramGeo((u, v) => {
        const a = PI + u * PI * 2, d = 1;
        const k = 1 + d * (0.03 * Math.sin(a * 11 + seed) + 0.018 * Math.sin(a * 23 + seed * 2) + 0.012 * Math.sin(a * 5));
        const rr = hemR * k + Math.cos(v * PI * 2) * 0.004;
        return new THREE.Vector3(Math.sin(a) * rr, y0 - skirtLen + Math.sin(v * PI * 2) * 0.004, Math.cos(a) * rr * (B.depth + 0.12));
      }, hi ? 72 : 48, 6, true);
      j.skirt.add(new THREE.Mesh(metricUV(hem, 2 * PI * hemR, 0.03), skirtMat));
      this.owned.push(hem);
      if (skirtLen > 0.7) this.legAmp = Math.min(this.legAmp, skirtShape === 'mermaid' ? 0.4 : 0.55);
    }

    // ----- pescoço e cabeça -----
    const turtle = !outer && upperSpec && upperSpec.neck === 'turtle';
    const neckGeo = shapedLimb(t => B.neckR * (1 + 0.16 * t * t), 0.15, { cap: false, seg: 20, rings: 6 });
    this._mesh(neckGeo, turtle ? this._cloth(upperSpec, 'top') : skin, j.neck, [0, 0.11, 0.0]);
    if (turtle) {
      const roll = hemRing(B.neckR * 1.14, 0.016, 1, 28);
      this._mesh(roll, this._cloth(upperSpec, 'top'), j.neck, [0, 0.085, 0]);
      this._mesh(hemRing(B.neckR * 1.22, 0.014, 1, 28), this._cloth(upperSpec, 'top'), j.neck, [0, 0.0, 0]);
    }

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.1 + 0.14 * (B.headScale - 1); headGroup.scale.setScalar(B.headScale);
    j.head.add(headGroup); j.headMesh = headGroup;
    const sk = kindMaps('skin');
    const HM = hi ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const nrm = sk.normal.clone(); nrm.repeat.set(16, 9); nrm.needsUpdate = true;
    const rgh = sk.rough.clone(); rgh.repeat.set(16, 9); rgh.needsUpdate = true;
    this.owned.push(nrm, rgh);
    const headMat = this._mat(new HM({ color: skinCol, roughness: 1, roughnessMap: rgh, normalMap: nrm, normalScale: new THREE.Vector2(0.25, 0.25), metalness: 0, envMapIntensity: 0.2 }));
    if (hi) { headMat.sheen = 0.08; headMat.sheenRoughness = 0.7; headMat.sheenColor = skinCol.clone(); }
    applyFaceShader(headMat, this.face.texture);
    this.headMat = headMat;
    this._mesh(headGeometry(hi ? 56 : 44), headMat, headGroup);
    for (const s of [-1, 1]) this._mesh(this._earGeometry(s), skin, headGroup, [s * 0.114, -0.008, -0.014], [0, s * 0.28, s * -0.06]);
    this.refreshFace();
    this._buildHair(headGroup, app);
    this._buildBeard(headGroup, app);
    buildGlasses(this, headGroup, findItem('glasses', app.glasses));
    buildHat(this, headGroup, app, findItem('hat', app.hat));

    // ----- braços -----
    const sleeveSpec = outer || upperSpec;
    const sleeves = outer ? 'long' : (upperSpec.sleeves || 'long');
    const sleeveMat = this._cloth(sleeveSpec, outer ? 'outer' : (dress ? 'dress' : 'top'));
    const bareShoulder = !outer && ['strapless', 'off', 'halter'].includes(upperSpec.neck);
    const muscle = fem ? 0.55 : 1;
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const sh = j['sh' + s], el = j['el' + s], hd = j['hd' + s];
      const shoulderMat = bareShoulder || sleeves === 'none' ? skin : sleeveMat;
      this._mesh(new THREE.SphereGeometry(B.armR * (outer ? 1.12 : 1.04), 18, 14), shoulderMat, sh, [0, -0.012, 0], null, [1, 0.9, 1]);
      // braço com deltoide e bíceps
      const armR = t => B.armR * (1 + 0.1 * muscle * g2(t - 0.12, 0.12) + 0.07 * muscle * g2(t - 0.5, 0.18)) * (1 - 0.18 * t) + (B.foreR * 1.05 - B.armR * 0.82) * t;
      const upLong = sleeves !== 'none' && sleeves !== 'short';
      const pad = outer ? 0.008 : 0.004;
      this._mesh(shapedLimb(armR, B.upperArm, { seg: 18, rings: 16 }), upLong ? skin : skin, sh);
      if (upLong) this._mesh(shapedLimb(t => armR(t) + pad + 0.004 * t, B.upperArm, { seg: 18, rings: 18, folds: [{ t: 0.92, amp: 0.05, n: 3, side: 'front', width: 0.1 }, { t: 0.3, amp: 0.02, n: 2, width: 0.2 }] }), sleeveMat, sh);
      if (sleeves === 'short') {
        this._mesh(shapedLimb(t => armR(t) + 0.009 + 0.004 * t, B.upperArm * 0.5, { seg: 18, rings: 8, cap: true }), sleeveMat, sh);
        this._mesh(hemRing(armR(0.5) + 0.012, 0.004, 1, 20), sleeveMat, sh, [0, -B.upperArm * 0.5, 0]);
      }
      const foreR = t => B.foreR * (1 + 0.12 * muscle * g2(t - 0.22, 0.2)) * (1 - t) + B.wristR * t;
      const glove = gloves && gloves.id !== 'nenhum' ? gloves : null;
      const gloveMat = glove ? (glove.fabric === 'leather' ? shared.leather(glove.color) : shared.satin(glove.color)) : null;
      const opera = glove && glove.kind === 'opera';
      this._mesh(shapedLimb(foreR, B.foreArm, { seg: 18, rings: 14 }), opera && sleeves !== 'long' ? gloveMat : skin, el);
      if (sleeves === 'long') {
        this._mesh(shapedLimb(t => foreR(t) + pad + 0.002 + 0.006 * t * t, B.foreArm, { seg: 18, rings: 18, folds: [{ t: 0.06, amp: 0.06, n: 3, side: 'front', width: 0.12 }, { t: 0.9, amp: 0.025, n: 4, width: 0.1 }] }), sleeveMat, el);
        this._mesh(hemRing(B.wristR + pad + 0.008, 0.0045, 1, 20), sleeveMat, el, [0, -B.foreArm * 0.97, 0]);
        if (outer) for (let b = 0; b < 3; b++) this._sleeveButton(el, B, sx, b, outer);
      }
      if (opera && sleeves !== 'long') this._mesh(hemRing(foreR(0) + 0.002, 0.003, 1, 20), gloveMat, el, [0, -0.01, 0]);
      if (outer && top && top.neck === 'collar' && !dress) this._mesh(shapedLimb(() => B.wristR + 0.006, 0.03, { cap: false, seg: 16, rings: 3 }), this._cloth(top, 'top'), hd, [0, 0.03, 0]);
      // mão com dedos
      const hand = new THREE.Mesh(handGeometry(fem, s), glove ? gloveMat : skin);
      hand.castShadow = true; hand.position.y = -0.004; hd.add(hand); this.owned.push(hand.geometry);
    }

    // ----- pernas -----
    const jumpsuit = dress && dress.shape === 'jumpsuit';
    const legSpec = jumpsuit ? dress : (bottom && bottom.kind !== 'skirt' ? bottom : null);
    const legMat = legSpec ? this._cloth(legSpec, jumpsuit ? 'dress' : 'bottom') : null;
    const legKind = legSpec ? fabricKind(legSpec, 'bottom') : '';
    const tailoredPants = legSpec && ['wool', 'linen'].includes(legKind) && !legSpec.wide;
    const sheer = legwear && legwear.id !== 'nenhum' ? shared.sheer(legwear.color, !!legwear.fishnet) : null;
    for (const s of ['L', 'R']) {
      const pants = legSpec && legSpec.kind !== 'shorts';
      const wide = jumpsuit || (legSpec && legSpec.wide);
      const thighR = t => B.thighR * (1 - 0.32 * t) + B.kneeR * 0.32 * t / 0.32 * 0 + (B.kneeR - B.thighR * 0.68) * t;
      const shinR = t => B.kneeR * (1 - t) + B.ankleR * t + 0.012 * (fem ? 0.7 : 1) * g2(t - 0.28, 0.16);
      this._mesh(shapedLimb(thighR, B.thigh, { seg: 20, rings: 14 }), skin, j['th' + s]);
      this._mesh(shapedLimb(shinR, B.shin, { seg: 20, rings: 14 }), skin, j['kn' + s]);
      if (sheer && !pants) {
        this._mesh(shapedLimb(t => thighR(t) + 0.0025, B.thigh, { seg: 20, rings: 10 }), sheer, j['th' + s]);
        this._mesh(shapedLimb(t => shinR(t) + 0.0025, B.shin, { seg: 20, rings: 10 }), sheer, j['kn' + s]);
      }
      if (legSpec) {
        const ease = wide ? 0.012 : 0.008;
        const legLen = legSpec.kind === 'shorts' ? B.thigh * 0.62 : B.thigh;
        this._mesh(shapedLimb(t => thighR(t * legLen / B.thigh) + ease + (legSpec.kind === 'shorts' ? 0.008 * t : 0), legLen, { seg: 22, rings: 16, crease: tailoredPants ? 0.03 : 0, folds: [{ t: 0.08, amp: 0.025, n: 2, side: 'front', width: 0.1 }, ...(legSpec.kind === 'shorts' ? [] : [{ t: 0.96, amp: 0.04, n: 3, side: 'back', width: 0.08 }])] }), legMat, j['th' + s]);
        if (legSpec.kind === 'shorts') this._mesh(hemRing(thighR(0.62) + ease + 0.009, 0.005, 1, 22), legMat, j['th' + s], [0, -legLen, 0]);
        if (pants) {
          const bot = wide ? 0.105 : B.ankleR * 1.32 + 0.012;
          const pr = t => (shinR(t) + ease) * (1 - t) + bot * t + (wide ? 0.03 * t * t : 0);
          const folds = legKind === 'denim'
            ? [{ t: 0.04, amp: 0.05, n: 3, side: 'back', width: 0.08 }, { t: 0.86, amp: 0.045, n: 4, width: 0.1 }, { t: 0.95, amp: 0.05, n: 3, width: 0.06 }]
            : [{ t: 0.04, amp: 0.04, n: 2, side: 'back', width: 0.08 }, { t: 0.93, amp: 0.035, n: 2, side: 'front', width: 0.08 }];
          this._mesh(shapedLimb(pr, B.shin * 1.02, { seg: 22, rings: 18, crease: tailoredPants ? 0.03 : 0, folds }), legMat, j['kn' + s]);
          this._mesh(hemRing(bot, 0.0045, 1, 22), legMat, j['kn' + s], [0, -B.shin * 1.02 + 0.003, 0]);
        }
        if (legSpec.stripe) {
          const sx = s === 'L' ? 1 : -1;
          const st = shared.satin(legSpec.stripe);
          this._mesh(new THREE.BoxGeometry(0.006, B.thigh * 0.95, 0.014), st, j['th' + s], [sx * (B.thighR * 0.86 + ease), -B.thigh / 2, 0], [0, 0, sx * 0.045]);
          this._mesh(new THREE.BoxGeometry(0.006, B.shin, 0.014), st, j['kn' + s], [sx * ((B.kneeR + B.ankleR * 1.32) / 2 + ease + 0.004), -B.shin / 2, 0], [0, 0, -sx * 0.03]);
        }
      }
      buildShoe(this, j['an' + s], app, findItem('shoes', app.shoes) || findItem('shoes', 'oxford'), s, B);
    }

    if (!dress) buildNeckwear(this, B, findItem('neck', app.neck), zAt, j.spine);
    buildJewelry(this, B, findItem('jewelry', app.jewelry), j, zAt);

    // sombra de contato sob os pés
    this.root.add(contactShadow());

    this.height = B.hipY + B.neckY + 0.06 + 0.1 + 0.14 * (B.headScale - 1) + HEAD.ry * B.headScale;
    this.root.traverse(o => { if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; } });
    this._mergeStatic();
  }

  // Une peças da mesma junta com o mesmo material numa só malha (menos chamadas de desenho).
  _mergeStatic() {
    const groups = [];
    this.root.traverse(o => { if (o.isGroup || o === this.root) groups.push(o); });
    for (const parent of groups) {
      const buckets = new Map();
      for (const m of parent.children) {
        if (!m.isMesh || m.isInstancedMesh || m.children.length || m === this.j.skirt || m.userData.noShadow || m.userData.hair) continue;
        if (m.material === this.headMat) continue;
        const k = m.material.uuid;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(m);
      }
      for (const list of buckets.values()) {
        if (list.length < 2) continue;
        const geos = list.map(m => {
          m.updateMatrix();
          let g = m.geometry.clone().applyMatrix4(m.matrix);
          for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
          if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
          return g;
        });
        const allIdx = geos.every(g => g.index);
        const merged = mergeGeometries(allIdx ? geos : geos.map(g => g.index ? g.toNonIndexed() : g), false);
        geos.forEach(g => g.dispose());
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, list[0].material);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh); this.owned.push(merged);
        for (const m of list) parent.remove(m);
      }
    }
  }

  // Lapela 3D enrolada, com espessura na borda.
  _lapelGeometry(side, style, vb, torsoPoint) {
    const { inner, outer } = lapelEdges(side, style, vb);
    const pos = [], uv = [], idx = [];
    const cols = 4, rows = inner.length;
    for (let i = 0; i < rows; i++) {
      const [ix, iy] = inner[i], [ox, oy] = outer[i];
      for (let c = 0; c <= cols; c++) {
        const t = c / cols;
        const cx = ix + (ox - ix) * t, cy = iy + (oy - iy) * t;
        const roll = Math.sin(t * PI) * 0.004 + 0.004 - (c === cols ? 0.003 : 0);
        const p = torsoPoint(cx, cy, roll + 0.002 * (1 - i / rows));
        pos.push(p.x, p.y, p.z); uv.push(cx / TORSO_W * 0.98, 0.5 - cy / TORSO_H * 0.5);
      }
      // parede da borda externa
      const p = torsoPoint(ox, oy, 0.0005); pos.push(p.x, p.y, p.z); uv.push(ox / TORSO_W * 0.98 + 0.005, 0.5 - oy / TORSO_H * 0.5);
    }
    const W = cols + 2;
    for (let i = 0; i < rows - 1; i++) for (let c = 0; c < W - 1; c++) {
      const a = i * W + c, b = a + 1, d = a + W, e = d + 1;
      if (side > 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  _collarWing(side, B) {
    // ponta da gola da camisa saindo do pescoço para a frente
    return metricUV(paramGeo((u, v) => {
      const a = (0.15 + u * 0.55) * side;
      const r = B.neckR * (1.2 + 0.55 * v);
      const y = 0.018 - v * 0.045 - Math.abs(u - 0.2) * 0.01;
      return new THREE.Vector3(Math.sin(a) * r + side * v * 0.004, y, Math.cos(a) * r * 0.95 + 0.004);
    }, 6, 4), 0.06, 0.05);
  }

  _button(parent, torsoPoint, cx, cy, color, R) {
    const p = torsoPoint(cx, cy, 0.0015), n = torsoPoint(cx, cy, 0.02).sub(p).normalize();
    const geo = new THREE.LatheGeometry([[0.0001, 0], [R, 0], [R * 1.05, R * 0.25], [R * 0.85, R * 0.4], [R * 0.6, R * 0.25], [0.0001, R * 0.3]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    const m = this._mesh(geo, R > 0.008 ? shared.acetate(color) : shared.pearl(), parent);
    m.position.copy(p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  }

  _sleeveButton(el, B, sx, i, outer) {
    const geo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.002, 12);
    const m = this._mesh(geo, shared.acetate(outer.lapelSatin ? '#111114' : new THREE.Color(outer.color).multiplyScalar(0.55).getStyle()), el);
    const a = sx > 0 ? PI * 0.75 : -PI * 0.75, r = B.wristR + 0.017;
    m.position.set(Math.sin(a) * r, -B.foreArm * (0.88 - i * 0.035), Math.cos(a) * r);
    m.rotation.set(PI / 2, 0, -a);
  }

  _pocketSquare(parent, torsoPoint) {
    const base = torsoPoint(TORSO_W / 2 + 178, 172, 0.004);
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const t = new THREE.ConeGeometry(0.012, 0.024, 3, 1);
      t.translate(0, 0.012, 0); t.scale(1, 1, 0.25); t.rotateZ((k - 1) * 0.35);
      t.translate((k - 1) * 0.012, 0, 0.002 * (k % 2));
      parts.push(t);
    }
    const g = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const m = this._mesh(metricUV(g, 1, 1), shared.satin('#f7f5ef'), parent);
    m.position.copy(base); m.rotation.y = -0.45;
  }

  _earGeometry(s) {
    const parts = [];
    const rim = new THREE.TorusGeometry(0.019, 0.0055, 8, 18, PI * 1.35); rim.rotateZ(-PI * 0.45); rim.scale(0.75, 1.15, 1); rim.rotateY(PI / 2);
    const bowl = new THREE.SphereGeometry(0.017, 12, 10); bowl.scale(0.45, 1.05, 0.85);
    const lobe = new THREE.SphereGeometry(0.0085, 10, 8); lobe.translate(0.001, -0.02, 0.002);
    parts.push(rim, bowl, lobe);
    const g = mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return p; }));
    parts.forEach(p => p.dispose());
    const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getZ(i); uv[i * 2 + 1] = pos.getY(i); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (s < 0) g.scale(-1, 1, 1);
    g.computeVertexNormals();
    return g;
  }

  // Atualiza a textura do rosto (padrão ou foto).
  refreshFace(blink = 0) {
    const app = this.app; if (!app) return;
    if (app.faceMode === 'photo' && this.face.photo) {
      const adj = { ...DEFAULT_ADJUST, ...(app.faceAdjust || {}) };
      const sampled = this.face.drawPhoto(adj);
      if (sampled && adj.autoSkin && this._lastSampled !== sampled.getHexString()) {
        this._lastSampled = sampled.getHexString();
        this.onSkinSampled?.('#' + sampled.getHexString());
      }
    } else {
      this.face.drawDefault({
        skin: app.skin, variant: app.faceVariant, gender: app.gender,
        eyeColor: app.eyeColor, browColor: darker(app.hairColor),
      }, blink);
    }
  }

  // ---------- cabelo (mechas) ----------
  _buildHair(parent, app) {
    const style = app.hair;
    if (!style || style === 'careca') return;
    const geo = buildHairGeometry(style, (app.name || 'x').length + 3);
    const m = this._mesh(geo, shared.hair(app.hairColor), parent);
    m.userData.hair = true;
  }

  _buildBeard(parent, app) {
    const b = app.beard;
    if (!b || b === 'nenhuma') return;
    const mat = shared.hair(app.hairColor);
    const mustache = () => this._mesh(beardColorize(metricUV(paramGeo((u, v) => {
      const phi = (u - 0.5) * 0.95; const th = (0.625 + 0.045 * v) * PI;
      return headPoint(th, phi, 0.006 + 0.005 * Math.sin(u * PI) * (1 - 0.5 * v));
    }, 18, 5), 0.1, 0.02), 0.8), mat, parent);
    if (b === 'bigode') { mustache(); return; }
    const range = b === 'cheia' ? 1.5 : 0.4;
    this._mesh(beardColorize(metricUV(paramGeo((u, v) => {
      const phi = (u - 0.5) * 2 * range;
      const top = b === 'cheia' ? (0.715 - 0.22 * sm(0.45, 1.15, Math.abs(phi))) : 0.715;
      const th = (top + (0.96 - top) * v) * PI;
      const edge = Math.min(1, u * 6, (1 - u) * 6, v * 5 + 0.3);
      return headPoint(th, phi, (0.004 + 0.006 * hash3(u * 30 | 0, v * 10 | 0, 3) + (b === 'cheia' ? 0.007 * v : 0)) * edge + 0.002);
    }, 36, 12), 0.25, 0.12), 0.78), mat, parent);
    mustache();
  }

  // ---------- animação ----------
  update(dt, s = {}) {
    const a = this.a, j = this.j;
    if (!j.hips) return;
    a.t += dt;
    const speed = s.speed || 0;
    const lerp = (cur, target, k) => cur + (target - cur) * Math.min(1, dt * k);
    a.walk = lerp(a.walk, Math.min(1, speed / 1.2), 8);
    a.run = lerp(a.run, speed > 3 ? 1 : 0, 5);
    a.talk = lerp(a.talk, s.talk ? 1 : 0, 6);
    a.sit = lerp(a.sit, s.sit ? 1 : 0, 4);
    a.dance = lerp(a.dance, s.dance ? 1 : 0, 3);
    a.wave = lerp(a.wave, s.wave ? 1 : 0, 6);
    a.lookYaw = lerp(a.lookYaw, s.lookYaw || 0, 4);
    const freq = 0.55 + Math.min(speed, 6) * 0.34;
    if (speed > 0.05) a.phase += dt * PI * 2 * freq;
    const p = a.phase, t = a.t, w = a.walk, r = a.run;
    const L = this.legAmp;

    // passos (sons)
    const sg = Math.sign(Math.sin(p));
    if (speed > 0.3 && sg !== this._lastStepSign) { this._lastStepSign = sg; this.onStep?.(r > 0.5); }

    const amp = (0.48 + 0.32 * r) * L;
    const thL = -Math.sin(p) * amp * w, thR = Math.sin(p) * amp * w;
    const knee = ph => w * (0.08 + (0.65 + 0.5 * r) * Math.pow(Math.max(0, Math.cos(ph)), 1.5)) * L;
    const knL = knee(p), knR = knee(p + PI);
    const breathe = Math.sin(t * 1.6) * 0.012;

    let P = {
      hipsY: this.B.hipY + (Math.abs(Math.cos(p)) * 0.03 - 0.02) * w * (1 + r), hipsX: 0, hipsRy: Math.sin(p) * 0.07 * w,
      spineX: 0.03 * w + 0.16 * r + breathe, spineY: -Math.sin(p) * 0.1 * w, spineZ: Math.sin(t * 0.7) * 0.012 * (1 - w),
      headX: -0.03 * w - 0.12 * r, headY: Math.sin(t * 0.33) * 0.22 * (1 - w) + a.lookYaw, headZ: 0,
      uaLx: Math.sin(p) * (0.42 + 0.4 * r) * w, uaRx: -Math.sin(p) * (0.42 + 0.4 * r) * w,
      uaLz: 0.09 + Math.sin(t * 1.1) * 0.015, uaRz: -0.09 - Math.sin(t * 1.1) * 0.015,
      elLx: -0.15 - (0.25 + 0.9 * r) * w, elRx: -0.15 - (0.25 + 0.9 * r) * w, faRz: 0,
      thLx: thL, thRx: thR, knLx: knL, knRx: knR,
      anLx: -(thL + knL) * 0.5 + 0.05 * w, anRx: -(thR + knR) * 0.5 + 0.05 * w, thLz: 0, thRz: 0,
    };
    if (a.talk > 0.01) {
      const k = a.talk;
      P.uaRx += (-0.45 - 0.25 * Math.sin(t * 2.7)) * k;
      P.elRx += (-0.9 + 0.35 * Math.sin(t * 4.3)) * k;
      P.uaLx += (-0.15 - 0.1 * Math.sin(t * 2.1 + 1)) * k;
      P.elLx += (-0.4 + 0.2 * Math.sin(t * 3.1)) * k;
      P.headX += Math.sin(t * 3.7) * 0.05 * k;
      P.headZ += Math.sin(t * 1.9) * 0.05 * k;
    }
    if (a.dance > 0.01) {
      const k = a.dance, b = t * 4.2;
      const D = {
        hipsY: this.B.hipY - 0.04 - Math.abs(Math.sin(b)) * 0.05, hipsX: Math.sin(b * 0.5) * 0.06, hipsRy: Math.sin(b * 0.5) * 0.3,
        spineX: 0.05, spineY: -Math.sin(b * 0.5) * 0.25, spineZ: Math.sin(b * 0.5) * 0.12,
        headX: Math.sin(b) * 0.1, headY: Math.sin(b * 0.5) * 0.3, headZ: -Math.sin(b * 0.5) * 0.1,
        uaLx: -1.2 + Math.sin(b) * 0.6, uaRx: -1.2 - Math.sin(b) * 0.6, uaLz: 0.5, uaRz: -0.5,
        elLx: -1.2, elRx: -1.2, faRz: 0,
        thLx: -0.2 + Math.sin(b) * 0.2, thRx: -0.2 - Math.sin(b) * 0.2, knLx: 0.4 + Math.sin(b) * 0.2, knRx: 0.4 - Math.sin(b) * 0.2,
        anLx: -0.15, anRx: -0.15, thLz: 0.05, thRz: -0.05,
      };
      P = mixPose(P, D, k);
    }
    if (a.sit > 0.01) {
      const k = a.sit;
      const S = {
        ...P, hipsY: (s.seatHeight ?? 0.47) + 0.06, hipsX: 0, hipsRy: 0, spineX: -0.05 + breathe, spineY: 0,
        thLx: -PI / 2 + 0.05, thRx: -PI / 2 + 0.05, knLx: PI / 2 - 0.1, knRx: PI / 2 - 0.1, anLx: 0, anRx: 0, thLz: 0.06, thRz: -0.06,
        uaLx: -0.55, uaRx: -0.55, elLx: -0.7, elRx: -0.7, uaLz: 0.12, uaRz: -0.12,
      };
      if (a.talk > 0.01) { S.uaRx += -0.3 * a.talk; S.elRx += -0.5 * a.talk; }
      P = mixPose(P, S, k);
    }
    if (a.wave > 0.01) {
      const k = a.wave;
      P.uaRz = P.uaRz * (1 - k) + (-2.5) * k;
      P.uaRx = P.uaRx * (1 - k) + (-0.2) * k;
      P.elRx = P.elRx * (1 - k) + (-0.3) * k;
      P.faRz = Math.sin(t * 9) * 0.45 * k;
    }

    j.hips.position.y = P.hipsY; j.hips.position.x = P.hipsX; j.hips.rotation.y = P.hipsRy;
    j.spine.rotation.set(P.spineX, P.spineY, P.spineZ);
    j.head.rotation.set(P.headX, P.headY - P.spineY * 0.8, P.headZ);
    j.shL.rotation.set(P.uaLx, 0, P.uaLz); j.shR.rotation.set(P.uaRx, 0, P.uaRz);
    j.elL.rotation.set(P.elLx, 0, 0); j.elR.rotation.set(P.elRx, 0, P.faRz);
    j.thL.rotation.set(P.thLx, 0, P.thLz); j.thR.rotation.set(P.thRx, 0, P.thRz);
    j.knL.rotation.x = P.knLx; j.knR.rotation.x = P.knRx;
    j.anL.rotation.x = P.anLx; j.anR.rotation.x = P.anRx;
    if (j.skirt) {
      j.skirt.rotation.x = -Math.sin(p * 2) * 0.02 * w - P.hipsRy * 0.1 - 0.04 * a.sit;
      j.skirt.rotation.z = Math.sin(p) * 0.025 * w;
      j.skirt.scale.y = 1 - 0.3 * a.sit;
    }

    // piscar (rosto padrão)
    if (this.app && this.app.faceMode !== 'photo') {
      a.blinkT -= dt;
      if (a.blinkT <= 0 && !a.blinking) { a.blinking = 0.13; this.refreshFace(1); }
      if (a.blinking) { a.blinking -= dt; if (a.blinking <= 0) { a.blinking = 0; a.blinkT = 2.5 + Math.random() * 4; this.refreshFace(0); } }
    }
  }

  // Posição mundial do topo da cabeça (para etiquetas de nome).
  headWorldPosition(target = new THREE.Vector3()) {
    if (!this.j.headMesh) return target.copy(this.root.position).setY(1.8);
    return this.j.headMesh.getWorldPosition(target);
  }
}

function mixPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = a[key] + ((b[key] ?? a[key]) - a[key]) * k;
  return o;
}

function darker(hex) { return '#' + new THREE.Color(hex).multiplyScalar(0.8).getHexString(); }


// Sombra de contato (mancha suave sob os pés) compartilhada por todos os personagens.
let shadowMat = null, shadowGeo = null;
function contactShadow() {
  if (!shadowMat) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.5, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    shadowMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    shadowGeo = new THREE.PlaneGeometry(0.75, 0.6).rotateX(-PI / 2);
  }
  const m = new THREE.Mesh(shadowGeo, shadowMat);
  m.position.y = 0.006; m.renderOrder = 1; m.userData.noShadow = true; m.castShadow = false; m.receiveShadow = false;
  return m;
}
