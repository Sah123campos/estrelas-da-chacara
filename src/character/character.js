// Personagem 3D estilizado: esqueleto hierárquico, roupas, cabelo, acessórios e animação procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { HEAD, headGeometry, headPoint, limbGeometry, profileLathe, profileRadius, hairCap, paramGeo, hash3 } from './geo.js';
import { FaceTexture, applyFaceShader, DEFAULT_ADJUST } from './face.js';
import { findItem } from './wardrobe.js';
import { fabricMaterial, paintTop, paintJacket, newTorsoCanvas } from './garments.js';

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
    m.castShadow = true; m.receiveShadow = false;
    parent.add(m);
    this.owned.push(geo);
    return m;
  }
  _mat(m) { this.owned.push(m); if (m.userData.ownedTexture) this.owned.push(m.userData.ownedTexture); return m; }
  _std(color, rough = 0.6, metal = 0, extra = {}) { return this._mat(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })); }

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
    const skinCol = new THREE.Color(app.skin);
    const skinStr = '#' + skinCol.getHexString();
    const skin = this._std(skinCol, 0.55);
    this.skinMat = skin;

    const dress = app.dress && app.dress !== 'nenhum' ? findItem('dress', app.dress) : null;
    const top = findItem('top', app.top) || findItem('top', 'camisa_branca');
    const outer = app.outer && app.outer !== 'nenhum' ? findItem('outer', app.outer) : null;
    const bottom = dress ? null : (findItem('bottom', app.bottom) || findItem('bottom', 'calca_preta'));
    const upperSpec = dress || top;

    // juntas
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

    // ----- tronco -----
    const fem = app.gender === 'f';
    const bust = fem ? (x, y, z) => {
      if (z > 0) z += 0.042 * (g2(x - 0.068, 0.058) + g2(x + 0.068, 0.058)) * g2(y - 0.305, 0.06);
      return [x, y, z];
    } : null;
    const upperProf = sliceProfile(B.profile, 0.04, B.profile[B.profile.length - 1][0]);
    const lowerProf = sliceProfile(B.profile, B.profile[0][0], 0.04);
    const torsoCanvas = newTorsoCanvas();
    const tctx = torsoCanvas.getContext('2d');
    if (outer) paintJacket(tctx, outer, upperSpec, skinStr, outer.length);
    else paintTop(tctx, upperSpec, skinStr);
    const torsoTex = new THREE.CanvasTexture(torsoCanvas); torsoTex.colorSpace = THREE.SRGBColorSpace; torsoTex.anisotropy = 4;
    this.owned.push(torsoTex);
    const torsoSpec = outer || upperSpec;
    const torsoMat = this._mat(fabricMaterial(torsoSpec, { map: torsoTex }));
    this._mesh(profileLathe(upperProf, 26, 40, B.depth, bust), torsoMat, j.spine);

    const lowerSpec = dress || bottom;
    const lowerMat = this._mat(fabricMaterial(lowerSpec, { repeat: 1.5 }));
    this._mesh(profileLathe(lowerProf, 10, 32, B.depth), lowerMat, j.spine);

    // barra do casaco
    if (outer && outer.length !== 'waist') {
      const long = outer.length === 'knee';
      const y0 = 0.06, y1 = long ? -0.62 : -0.17;
      const prof = [];
      for (let i = 0; i <= 8; i++) {
        const y = y0 + (y1 - y0) * (i / 8);
        const base = profileRadius(B.profile, Math.max(B.profile[0][0] + 0.02, y));
        const r = y > -0.1 ? base + 0.014 : (long ? 0.19 + (-0.1 - y) * 0.16 : base + 0.02);
        prof.push([y, Math.max(r, long ? 0.19 : 0.1)]);
      }
      prof.reverse();
      const tailMat = this._mat(fabricMaterial(outer, { repeat: 2, side: THREE.DoubleSide }));
      this._mesh(profileLathe(prof, 12, 36, B.depth + 0.08), tailMat, j.spine);
      this.legAmp = long ? 0.75 : 1;
    } else this.legAmp = 1;

    // saia / vestido
    let skirtSpec = null, skirtLen = 0, skirtShape = 'aline', skirtFlare = 0;
    if (dress && dress.shape !== 'jumpsuit') { skirtSpec = dress; skirtLen = 0.94 * dress.length; skirtShape = dress.shape; }
    else if (bottom && bottom.kind === 'skirt') { skirtSpec = bottom; skirtLen = bottom.length; skirtShape = 'custom'; skirtFlare = bottom.flare; }
    if (skirtSpec) {
      const y0 = 0.02, prof = [];
      const N = 14;
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
      prof.reverse();
      const skirtMat = this._mat(fabricMaterial(skirtSpec, { repeat: 2.5, side: THREE.DoubleSide }));
      j.skirt = this._mesh(profileLathe(prof, N, 48, B.depth + 0.12), skirtMat, j.hips);
      // pequenas dobras
      const p = j.skirt.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const ang = Math.atan2(x, z), d = Math.min(1, (y0 - y) / skirtLen);
        const k = 1 + 0.035 * d * Math.sin(ang * 14);
        p.setXYZ(i, x * k, y, z * k);
      }
      j.skirt.geometry.computeVertexNormals();
      if (skirtLen > 0.7) this.legAmp = Math.min(this.legAmp, skirtShape === 'mermaid' ? 0.4 : 0.55);
    }

    // ----- pescoço e cabeça -----
    const turtle = !outer && upperSpec && upperSpec.neck === 'turtle';
    const neckMat = turtle ? this._mat(fabricMaterial(upperSpec, { repeat: 1 })) : skin;
    this._mesh(new THREE.CylinderGeometry(B.neckR, B.neckR * 1.12, 0.14, 18), neckMat, j.neck, [0, 0.04, 0.0]);
    if (turtle) this._mesh(new THREE.TorusGeometry(B.neckR * 1.1, 0.014, 8, 20), neckMat, j.neck, [0, 0.105, 0], [PI / 2, 0, 0]);
    if ((top && top.neck === 'collar' && !dress) || (outer && top && top.neck === 'collar' && !dress)) {
      const collarMat = this._std(top.color, 0.6);
      this._mesh(new THREE.CylinderGeometry(B.neckR * 1.12, B.neckR * 1.3, 0.05, 20, 1, true), collarMat, j.neck, [0, -0.005, 0]);
    }

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.1 + 0.14 * (B.headScale - 1); headGroup.scale.setScalar(B.headScale);
    j.head.add(headGroup); j.headMesh = headGroup;
    const headMat = this._std(skinCol, 0.5);
    applyFaceShader(headMat, this.face.texture);
    this.headMat = headMat;
    this._mesh(headGeometry(48), headMat, headGroup);
    for (const s of [-1, 1]) {
      this._mesh(new THREE.SphereGeometry(1, 12, 10), skin, headGroup, [s * 0.116, -0.008, -0.012], [0, s * 0.3, 0], [0.016, 0.034, 0.024]);
    }
    this.refreshFace();
    this._buildHair(headGroup, app);
    this._buildBeard(headGroup, app);
    this._buildGlasses(headGroup, app);
    this._buildHat(headGroup, app);

    // ----- braços -----
    const sleeveSpec = outer || upperSpec;
    const sleeves = outer ? 'long' : (upperSpec.sleeves || 'long');
    const sleeveMat = this._mat(fabricMaterial(sleeveSpec, { repeat: 1.2 }));
    for (const s of ['L', 'R']) {
      const capMat = sleeves === 'none' && (upperSpec.neck === 'strapless' || upperSpec.neck === 'off' || upperSpec.neck === 'halter') ? skin : (sleeves === 'none' ? skin : sleeveMat);
      const shoulderMat = (upperSpec.neck === 'strapless' || upperSpec.neck === 'off' || upperSpec.neck === 'halter') && !outer ? skin : (sleeves === 'none' ? (upperSpec.neck === 'scoop' ? torsoMatPlain(this, upperSpec) : skin) : sleeveMat);
      this._mesh(new THREE.SphereGeometry(B.armR * 1.04, 16, 12), shoulderMat, j['sh' + s], [0, -0.012, 0]);
      const upMat = sleeves === 'none' ? skin : (sleeves === 'short' ? skin : sleeveMat);
      this._mesh(limbGeometry(B.armR, B.foreR * 1.05, B.upperArm), upMat, j['sh' + s]);
      if (sleeves === 'short') this._mesh(limbGeometry(B.armR + 0.01, B.armR + 0.006, B.upperArm * 0.5), capMat, j['sh' + s]);
      const foreMat = sleeves === 'long' ? sleeveMat : skin;
      this._mesh(limbGeometry(B.foreR, B.wristR, B.foreArm), foreMat, j['el' + s]);
      if (outer && top && top.neck === 'collar') {
        this._mesh(new THREE.CylinderGeometry(B.wristR + 0.006, B.wristR + 0.006, 0.025, 14), this._std(top.color, 0.6), j['hd' + s], [0, 0.0, 0]);
      }
      // mão
      const hand = new THREE.Group(); hand.position.y = -0.045; j['hd' + s].add(hand);
      const sx = s === 'L' ? 1 : -1;
      const hs = app.gender === 'f' ? 0.88 : 1;
      this._mesh(new THREE.SphereGeometry(1, 14, 12), skin, hand, [0, -0.01, 0.0], null, [0.03 * hs, 0.052 * hs, 0.018 * hs]);
      this._mesh(new THREE.CapsuleGeometry(0.011 * hs, 0.03 * hs, 4, 8), skin, hand, [-sx * 0.005, 0.005, 0.022 * hs], [0.5, 0, 0]);
    }

    // ----- pernas -----
    const jumpsuit = dress && dress.shape === 'jumpsuit';
    const legSpec = jumpsuit ? dress : (bottom && bottom.kind !== 'skirt' ? bottom : null);
    const legMat = legSpec ? this._mat(fabricMaterial(legSpec, { repeat: 1.2 })) : null;
    for (const s of ['L', 'R']) {
      const pants = legSpec && legSpec.kind !== 'shorts';
      const wide = jumpsuit || (legSpec && legSpec.wide);
      this._mesh(limbGeometry(B.thighR, B.kneeR, B.thigh), pants ? legMat : skin, j['th' + s]);
      if (legSpec && legSpec.kind === 'shorts') this._mesh(limbGeometry(B.thighR + 0.008, B.kneeR + 0.014, B.thigh * 0.6), legMat, j['th' + s]);
      this._mesh(limbGeometry(B.kneeR, wide ? 0.1 : (pants ? B.ankleR * 1.25 : B.ankleR), B.shin), pants ? legMat : skin, j['kn' + s]);
      if (legSpec && legSpec.stripe) {
        const sx = s === 'L' ? 1 : -1;
        const st = this._std(legSpec.stripe, 0.3, 0.1);
        this._mesh(new THREE.BoxGeometry(0.008, B.thigh, 0.016), st, j['th' + s], [sx * (B.thighR * 0.92), -B.thigh / 2, 0], [0, 0, sx * 0.05]);
        this._mesh(new THREE.BoxGeometry(0.008, B.shin, 0.016), st, j['kn' + s], [sx * (B.kneeR * 1.0), -B.shin / 2, 0]);
      }
      this._buildShoe(j['an' + s], app, s);
    }

    this._buildNeckwear(app, B);
    this._buildJewelry(app, B);

    this.height = B.hipY + B.neckY + 0.06 + 0.1 + 0.14 * (B.headScale - 1) + HEAD.ry * B.headScale;
    this.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
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

  // ---------- cabelo ----------
  _hairMat(color) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 120 + Math.random() * 135 | 0;
      x.strokeStyle = `rgba(${v},${v},${v},0.5)`; x.lineWidth = 0.8 + Math.random() * 1.5;
      const px = Math.random() * 256; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 6, 80, px - 6, 170, px + 3, 256); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); t.colorSpace = THREE.SRGBColorSpace;
    this.owned.push(t);
    return this._std(new THREE.Color(color).multiplyScalar(1.25), 0.48, 0.05, { map: t, side: THREE.DoubleSide });
  }

  _buildHair(parent, app) {
    const style = app.hair;
    if (!style || style === 'careca') return;
    const mat = this._hairMat(app.hairColor);
    const hl = (f, b, side = 0, exp = 1) => phi => {
      const w = Math.pow((1 - Math.cos(phi)) / 2, exp);
      return (f + (b - f) * w + side * Math.pow(Math.sin(phi), 2)) * PI;
    };
    const add = (geo) => this._mesh(geo, mat, parent);
    switch (style) {
      case 'curto': add(hairCap(hl(0.33, 0.72, 0.05), (phi, v) => 0.012 + 0.008 * (1 - v) + 0.006 * g2(phi, 0.8) * (1 - v))); break;
      case 'topete': add(hairCap(hl(0.33, 0.72, 0.05), (phi, v) => 0.01 + 0.006 * (1 - v) + 0.05 * g2(phi, 0.55) * g2(v - 0.55, 0.3))); break;
      case 'lateral': add(hairCap(hl(0.32, 0.72, 0.05), (phi, v) => 0.012 + 0.016 * g2(phi + 0.6, 0.9) * (1 - v * 0.6) + 0.006 * (1 - v))); break;
      case 'raspado': add(hairCap(hl(0.33, 0.7, 0.05), () => 0.004)); break;
      case 'cacheado': add(hairCap(hl(0.31, 0.74, 0.04), (phi, v, th) => 0.024 + 0.014 * hash3(Math.round(phi * 9), Math.round(th * 9), 1) + 0.01 * (1 - v), 56, 22)); break;
      case 'black': add(hairCap(hl(0.3, 0.78, 0.02), (phi, v, th) => 0.055 + 0.02 * (1 - v) + 0.012 * hash3(Math.round(phi * 12), Math.round(th * 12), 2), 60, 24)); break;
      case 'coque_m':
        add(hairCap(hl(0.31, 0.72, 0.04), (phi, v) => 0.012 + 0.004 * (1 - v)));
        this._mesh(new THREE.SphereGeometry(0.042, 16, 12), mat, parent, [0, 0.13, -0.08]); break;
      case 'coque':
        add(hairCap(hl(0.32, 0.72, 0.03), (phi, v) => 0.01 + 0.004 * (1 - v)));
        this._mesh(new THREE.SphereGeometry(0.06, 18, 14), mat, parent, [0, 0.165, -0.035], null, [1, 0.85, 1]);
        this._mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), mat, parent, [0, 0.13, -0.03], [PI / 2 + 0.3, 0, 0]); break;
      case 'rabo':
        add(hairCap(hl(0.31, 0.72, 0.03), (phi, v) => 0.01 + 0.004 * (1 - v)));
        { const g = new THREE.Group(); g.position.set(0, 0.07, -0.13); g.rotation.x = 0.35; parent.add(g); j_add(this, g, mat); }
        break;
      case 'chanel':
        add(hairCap(hl(0.4, 0.82, 0.08, 0.55), (phi, v) => 0.014 + 0.028 * Math.pow(v, 2) * (0.4 + 0.6 * (1 - Math.cos(phi)) / 2) + 0.008 * (1 - v), 48, 20)); break;
      case 'longo': case 'ondas': {
        const waves = style === 'ondas';
        add(hairCap(hl(waves ? 0.31 : 0.33, 0.66, 0.06, 0.8), (phi, v) => 0.014 + (waves ? 0.016 * g2(phi + 0.7, 0.9) : 0.004) + 0.006 * (1 - v), 48, 18));
        // painel de fios caindo atrás e nas laterais
        const panel = paramGeo((u, v) => {
          const phi = PI + (u - 0.5) * 2 * 1.85;
          const y = 0.03 - v * (waves ? 0.4 : 0.42);
          const rx = HEAD.rx + 0.018 + 0.1 * v * v, rz = HEAD.rz + 0.022 + 0.035 * v;
          const wv = waves ? 0.012 * Math.sin(v * 18 + u * 6) : 0.003 * Math.sin(u * 40);
          return new THREE.Vector3((rx + wv) * Math.sin(phi), y, (rz + wv) * Math.cos(phi) - 0.012 - 0.05 * v);
        }, 40, 16);
        add(panel);
        break;
      }
      default: add(hairCap(hl(0.33, 0.72, 0.05), () => 0.012));
    }
  }

  _buildBeard(parent, app) {
    const b = app.beard;
    if (!b || b === 'nenhuma') return;
    const mat = this._std(new THREE.Color(app.hairColor).multiplyScalar(1.1), 0.85, 0, { side: THREE.DoubleSide });
    const mustache = () => this._mesh(paramGeo((u, v) => {
      const phi = (u - 0.5) * 0.95; const th = (0.625 + 0.045 * v) * PI;
      return headPoint(th, phi, 0.008 + 0.004 * Math.sin(u * PI));
    }, 16, 4), mat, parent);
    if (b === 'bigode') { mustache(); return; }
    const range = b === 'cheia' ? 1.5 : 0.4;
    this._mesh(paramGeo((u, v) => {
      const phi = (u - 0.5) * 2 * range;
      const top = b === 'cheia' ? (0.715 - 0.22 * sm(0.45, 1.15, Math.abs(phi))) : 0.715;
      const th = (top + (0.96 - top) * v) * PI;
      return headPoint(th, phi, 0.008 + 0.006 * hash3(u * 30 | 0, v * 10 | 0, 3) + (b === 'cheia' ? 0.006 * v : 0));
    }, 30, 10), mat, parent);
    mustache();
  }

  _buildGlasses(parent, app) {
    const it = findItem('glasses', app.glasses);
    if (!it || it.id === 'nenhum') return;
    const frameMat = this._std(it.frame, 0.25, it.frame === '#c9a14a' ? 0.9 : 0.2);
    const lensMat = it.lens ? this._mat(new THREE.MeshStandardMaterial({ color: it.lens, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.82 })) : this._mat(new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, transparent: true, opacity: 0.18 }));
    const g = new THREE.Group(); g.position.set(0, 0.012, 0.139); parent.add(g);
    const shape = s => {
      const sh = new THREE.Shape();
      const k = 0.028;
      switch (it.shape) {
        case 'round': sh.absarc(0, 0, k * 0.9, 0, PI * 2); break;
        case 'aviator': sh.moveTo(-k, k * 0.6); sh.quadraticCurveTo(0, k * 0.8, k, k * 0.6); sh.quadraticCurveTo(k * 1.15, -k * 0.6, 0, -k * 0.95); sh.quadraticCurveTo(-k * 1.1, -k * 0.6, -k, k * 0.6); break;
        case 'cat': sh.moveTo(-k, k * 0.2); sh.lineTo(s * 0 + k * 1.15, k * 0.75); sh.quadraticCurveTo(k * 1.05, -k * 0.7, 0, -k * 0.7); sh.quadraticCurveTo(-k * 1.0, -k * 0.6, -k, k * 0.2); break;
        case 'heart': sh.moveTo(0, -k); sh.bezierCurveTo(k * 1.6, 0, k * 0.6, k * 1.2, 0, k * 0.4); sh.bezierCurveTo(-k * 0.6, k * 1.2, -k * 1.6, 0, 0, -k); break;
        case 'star': for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, r = i % 2 ? k * 0.5 : k * 1.15; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } break;
        default: { const w = k * 1.05, h = k * 0.75, r = 0.008; sh.moveTo(-w + r, h); sh.lineTo(w - r, h); sh.quadraticCurveTo(w, h, w, h - r); sh.lineTo(w * 0.92, -h + r); sh.quadraticCurveTo(w * 0.9, -h, w * 0.9 - r, -h); sh.lineTo(-w * 0.9 + r, -h); sh.quadraticCurveTo(-w * 0.9, -h, -w * 0.92, -h + r); sh.lineTo(-w, h - r); sh.quadraticCurveTo(-w, h, -w + r, h); }
      }
      return sh;
    };
    for (const s of [-1, 1]) {
      const sh = shape(s);
      const lens = new THREE.ShapeGeometry(sh, 16);
      const m = this._mesh(lens, lensMat, g, [s * 0.042, 0, 0.001]);
      if (it.shape === 'cat' && s < 0) m.scale.x = -1;
      // armação: contorno extrudado
      const pts = sh.getPoints(32);
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)), true);
      const tube = this._mesh(new THREE.TubeGeometry(curve, 48, 0.0025, 6, true), frameMat, g, [s * 0.042, 0, 0.001]);
      if (it.shape === 'cat' && s < 0) tube.scale.x = -1;
      // haste
      this._mesh(new THREE.BoxGeometry(0.004, 0.005, 0.13), frameMat, g, [s * 0.075, 0.008, -0.065], [0, s * -0.12, 0]);
    }
    this._mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 12, PI), frameMat, g, [0, 0.004, 0.002]);
  }

  _buildHat(parent, app) {
    const it = findItem('hat', app.hat);
    if (!it || it.id === 'nenhum') return;
    const mat = this._std(it.color, it.kind === 'crown' ? 0.25 : 0.8, it.kind === 'crown' ? 0.9 : 0, { side: THREE.DoubleSide });
    const band = it.band ? this._std(it.band, 0.6) : null;
    const volume = app.hair === 'black' ? 1.35 : (['cacheado', 'coque', 'topete'].includes(app.hair) ? 1.12 : 1);
    const g = new THREE.Group(); g.position.set(0, 0.085 + (volume - 1) * 0.1, -0.005); g.scale.setScalar(volume); g.rotation.x = -0.08; parent.add(g);
    const brim = (r, curl = 0) => {
      const geo = new THREE.RingGeometry(0.1, r, 40, 3);
      geo.rotateX(-PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, curl * Math.pow(x / r, 2) * 1.0 - 0.01 * (z / r)); }
      geo.computeVertexNormals();
      return geo;
    };
    switch (it.kind) {
      case 'fedora':
        this._mesh(new THREE.CylinderGeometry(0.098, 0.12, 0.11, 28, 1, true), mat, g, [0, 0.055, 0]);
        this._mesh(new THREE.SphereGeometry(0.098, 24, 10, 0, PI * 2, 0, PI / 2), mat, g, [0, 0.105, 0], null, [1, 0.25, 1]);
        this._mesh(brim(0.19, 0.03), mat, g);
        this._mesh(new THREE.CylinderGeometry(0.121, 0.123, 0.025, 28, 1, true), band, g, [0, 0.016, 0]); break;
      case 'tophat':
        this._mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.21, 28), mat, g, [0, 0.105, 0]);
        this._mesh(brim(0.165, 0.025), mat, g);
        this._mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 28, 1, true), band, g, [0, 0.02, 0]); break;
      case 'straw':
        this._mesh(new THREE.CylinderGeometry(0.1, 0.122, 0.1, 24), mat, g, [0, 0.05, 0]);
        this._mesh(brim(0.25, 0.0), mat, g);
        this._mesh(new THREE.CylinderGeometry(0.123, 0.124, 0.022, 24, 1, true), band, g, [0, 0.015, 0]); break;
      case 'cowboy':
        this._mesh(new THREE.CylinderGeometry(0.095, 0.12, 0.13, 24), mat, g, [0, 0.065, 0], null, [1, 1, 1.15]);
        this._mesh(brim(0.23, 0.09), mat, g);
        this._mesh(new THREE.CylinderGeometry(0.121, 0.122, 0.02, 24, 1, true), band, g, [0, 0.014, 0]); break;
      case 'cap': {
        this._mesh(new THREE.SphereGeometry(0.128, 28, 14, 0, PI * 2, 0, PI / 2), mat, g, [0, -0.01, 0], null, [1, 0.75, 1.05]);
        const visor = new THREE.CircleGeometry(0.11, 24, -PI * 0.15, PI * 1.3 - PI);
        visor.rotateX(-PI / 2 + 0.15);
        this._mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 24, 1, false, -PI * 0.5, PI), band, g, [0, -0.005, 0.12], [0.12, 0, 0], [1, 1, 0.75]);
        this._mesh(new THREE.SphereGeometry(0.012, 8, 6), band, g, [0, 0.085, 0]);
        visor.dispose(); break;
      }
      case 'crown': {
        const geo = new THREE.CylinderGeometry(0.105, 0.1, 0.09, 40, 2, true);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0.04) { const a = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, 0.045 + 0.04 * Math.abs(Math.sin(a * 4))); } }
        geo.computeVertexNormals();
        this._mesh(geo, mat, g, [0, 0.03, 0]);
        const gem = this._std('#c1121f', 0.1, 0.3, { emissive: '#400', emissiveIntensity: 0.5 });
        const gem2 = this._std('#2a6fdb', 0.1, 0.3);
        for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; this._mesh(new THREE.OctahedronGeometry(0.011), i % 2 ? gem : gem2, g, [Math.sin(a) * 0.105, 0.02, Math.cos(a) * 0.105]); }
        break;
      }
    }
  }

  _buildShoe(ankle, app, s) {
    const it = findItem('shoes', app.shoes) || findItem('shoes', 'oxford');
    const fem = app.gender === 'f';
    const w = fem ? 0.085 : 0.1, L = fem ? 0.24 : 0.27;
    const mat = this._std(it.color, it.gloss ? 0.18 : 0.6, it.metal ? 0.8 : 0.05);
    const foot = new THREE.Group(); ankle.add(foot);
    switch (it.kind) {
      case 'sneaker': {
        this._mesh(new RoundedBoxGeometry(w, 0.075, L, 3, 0.03), mat, foot, [0, -0.012, 0.045]);
        this._mesh(new RoundedBoxGeometry(w * 1.06, 0.025, L * 1.03, 2, 0.01), this._std(it.sole, 0.7), foot, [0, -0.045, 0.045]);
        if (it.accent) this._mesh(new THREE.BoxGeometry(w * 1.02, 0.02, L * 0.4), this._std(it.accent, 0.5), foot, [0, -0.005, 0.03]);
        break;
      }
      case 'heel': {
        const body = this._mesh(new RoundedBoxGeometry(w * 0.9, 0.045, L * 0.92, 3, 0.02), mat, foot, [0, -0.01, 0.06], [-0.28, 0, 0]);
        body.position.y = 0.0;
        this._mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.075, 8), mat, foot, [0, -0.025, -0.05]);
        if (it.metal) this._mesh(new THREE.TorusGeometry(0.035, 0.004, 6, 16), mat, foot, [0, 0.03, -0.005], [PI / 2, 0, 0]);
        break;
      }
      case 'boot': {
        this._mesh(new RoundedBoxGeometry(w, 0.08, L * 1.05, 3, 0.03), mat, foot, [0, -0.012, 0.05]);
        this._mesh(new THREE.CylinderGeometry(this.B.ankleR * 1.5, this.B.ankleR * 1.35, 0.22, 16), mat, foot, [0, 0.1, 0]);
        this._mesh(new THREE.BoxGeometry(w * 0.7, 0.035, 0.05), this._std('#2a180b', 0.6), foot, [0, -0.04, -0.06]);
        break;
      }
      case 'flipflop': {
        this._mesh(new RoundedBoxGeometry(w * 0.95, 0.06, L * 0.95, 3, 0.025), this.skinMat, foot, [0, -0.01, 0.045]);
        this._mesh(new RoundedBoxGeometry(w * 1.1, 0.018, L * 1.05, 2, 0.008), mat, foot, [0, -0.045, 0.045]);
        this._mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 16, PI), this._std('#f4f4f4', 0.6), foot, [0, -0.02, 0.07], [0, 0, 0]);
        break;
      }
      default:
        this._mesh(new RoundedBoxGeometry(w, 0.07, L, 3, 0.03), mat, foot, [0, -0.015, 0.045]);
        this._mesh(new RoundedBoxGeometry(w * 1.04, 0.018, L * 1.02, 2, 0.008), this._std('#1b120c', 0.8), foot, [0, -0.048, 0.045]);
    }
  }

  _buildNeckwear(app, B) {
    const it = findItem('neck', app.neck);
    if (!it || it.id === 'nenhum') return;
    const dress = app.dress && app.dress !== 'nenhum';
    if (dress) return;
    const mat = this._mat(fabricMaterial({ ...it, pattern: it.pattern || 'satin' }, {}));
    const zFront = y => profileRadius(B.profile, y) * B.depth;
    if (it.kind === 'bowtie') {
      const g = new THREE.Group(); g.position.set(0, B.neckY - 0.005, zFront(B.neckY - 0.01) + 0.03); this.j.spine.add(g);
      for (const s of [-1, 1]) this._mesh(new THREE.ConeGeometry(0.022, 0.05, 4), mat, g, [s * 0.025, 0, 0], [0, 0, s * PI / 2], [1, 1, 0.5]);
      this._mesh(new THREE.SphereGeometry(0.012, 10, 8), mat, g);
    } else {
      // gravata: tira acompanhando o peito
      const y0 = B.neckY - 0.01, y1 = 0.12;
      const geo = paramGeo((u, v) => {
        const y = y0 + (y1 - y0) * v;
        const w = v < 0.06 ? 0.014 : 0.012 + 0.024 * v;
        const z = Math.max(zFront(y), 0.02) + 0.012 + (v < 0.1 ? 0.02 * (1 - v / 0.1) : 0);
        const x = (u - 0.5) * 2 * w;
        const tip = v > 0.92 ? (1 - Math.abs(u - 0.5) * 2) * (v - 0.92) * 0.6 : 0;
        return new THREE.Vector3(x, y - tip, z);
      }, 4, 20);
      this._mesh(geo, this._mat(fabricMaterial({ ...it, pattern: it.pattern || 'satin' }, { side: THREE.DoubleSide })), this.j.spine);
      mat.dispose();
    }
  }

  _buildJewelry(app, B) {
    const it = findItem('jewelry', app.jewelry);
    if (!it || it.id === 'nenhum') return;
    const metal = this._std(it.color, 0.2, 0.95);
    const zF = profileRadius(B.profile, B.neckY - 0.06) * B.depth;
    switch (it.kind) {
      case 'watch': {
        const w = new THREE.Group(); w.position.y = -B.foreArm * 0.92; this.j.elL.add(w);
        this._mesh(new THREE.TorusGeometry(B.wristR + 0.006, 0.006, 6, 18), metal, w, null, [PI / 2, 0, 0]);
        this._mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 18), metal, w, [B.wristR + 0.006, 0, 0], [0, 0, PI / 2]);
        this._mesh(new THREE.CircleGeometry(0.012, 18), this._std('#0d1b2a', 0.1, 0.2), w, [B.wristR + 0.011, 0, 0], [0, PI / 2, 0]);
        break;
      }
      case 'pearls': case 'lei': case 'choker': {
        const n = it.kind === 'lei' ? 22 : (it.kind === 'choker' ? 30 : 34);
        const pearl = it.kind === 'lei' ? null : this._std(it.color, it.kind === 'choker' ? 0.05 : 0.25, it.kind === 'choker' ? 0.3 : 0.1, it.kind === 'choker' ? { emissive: '#8ab4ff', emissiveIntensity: 0.25 } : {});
        const flowers = ['#ff6f59', '#ffd23f', '#f7a1c4', '#ffffff'].map(c => this._std(c, 0.7));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * PI * 2;
          let x, y, z, r;
          if (it.kind === 'choker') { x = Math.sin(a) * (B.neckR + 0.006); z = Math.cos(a) * (B.neckR + 0.006); y = B.neckY + 0.02; r = 0.006; }
          else { const drop = Math.max(0, Math.cos(a)); x = Math.sin(a) * (B.neckR + 0.05); z = Math.cos(a) * (B.neckR + 0.03) + drop * 0.035; y = B.neckY - 0.01 - drop * (it.kind === 'lei' ? 0.12 : 0.08); r = it.kind === 'lei' ? 0.022 : 0.009; if (z > 0) z = Math.max(z, profileRadius(B.profile, y) * B.depth + r * 0.6); }
          this._mesh(new THREE.SphereGeometry(r, 10, 8), pearl || flowers[i % 4], this.j.spine, [x, y, z]);
        }
        break;
      }
      case 'chain': {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.06, B.neckY + 0.005, -0.01), new THREE.Vector3(-0.07, B.neckY - 0.05, zF * 0.8),
          new THREE.Vector3(0, B.neckY - 0.13, profileRadius(B.profile, B.neckY - 0.13) * B.depth + 0.012),
          new THREE.Vector3(0.07, B.neckY - 0.05, zF * 0.8), new THREE.Vector3(0.06, B.neckY + 0.005, -0.01)]);
        this._mesh(new THREE.TubeGeometry(curve, 40, 0.004, 6, false), metal, this.j.spine);
        this._mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), metal, this.j.spine, [0, B.neckY - 0.145, profileRadius(B.profile, B.neckY - 0.145) * B.depth + 0.014], [PI / 2, 0, 0]);
        break;
      }
      case 'earrings': {
        const gem = this._std(it.color, 0.02, 0.4, { emissive: '#9fc3ff', emissiveIntensity: 0.35 });
        for (const s of [-1, 1]) {
          this._mesh(new THREE.OctahedronGeometry(0.009), gem, this.j.headMesh, [s * 0.118, -0.045, 0.0]);
          this._mesh(new THREE.OctahedronGeometry(0.006), gem, this.j.headMesh, [s * 0.118, -0.065, 0.0]);
        }
        break;
      }
    }
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

function torsoMatPlain(ch, spec) { return ch._mat(fabricMaterial(spec, {})); }

function j_add(ch, g, mat) {
  // rabo de cavalo: cone afunilado
  ch._mesh(new THREE.SphereGeometry(0.025, 10, 8), mat, g);
  const geo = limbGeometry(0.045, 0.015, 0.3, 14);
  ch._mesh(geo, mat, g, [0, -0.01, -0.01], [0.15, 0, 0]);
}
