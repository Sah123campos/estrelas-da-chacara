// Sistema de textura facial.
// A foto (ou o rosto padrão desenhado) vira uma textura projetada na frente da
// cabeça 3D por um shader. Como a projeção é feita no espaço da própria cabeça,
// o rosto acompanha qualquer giro de cabeça ou de câmera.
import * as THREE from 'three';

export const FACE_TEX = 512;

// Região do rosto no espaço local da cabeça (metros).
export const FACE_FRAME = { width: 0.22, height: 0.26, centerY: -0.02 };

// Pontos canônicos no canvas do rosto (0..1, origem no topo-esquerdo).
export const CANON = {
  eyeL: { x: 0.318, y: 0.385 },  // olho à esquerda da imagem
  eyeR: { x: 0.682, y: 0.385 },
  nose: { x: 0.5, y: 0.565 },
  mouth: { x: 0.5, y: 0.705 },
  chin: { x: 0.5, y: 0.915 },
};

export const DEFAULT_ADJUST = {
  // marcadores na foto (0..1 relativos à imagem recortada)
  eyeL: { x: 0.36, y: 0.42 }, eyeR: { x: 0.64, y: 0.42 }, mouth: { x: 0.5, y: 0.72 },
  offsetX: 0, offsetY: 0, scale: 1, rotation: 0,
  maskW: 1, maskH: 1, feather: 0.5,
  brightness: 1, contrast: 1, warmth: 0,
  autoSkin: true,
};

// Afim exato que leva 3 pontos src -> dst. Retorna [a,b,c,d,e,f] para setTransform.
export function affineFrom3(src, dst) {
  const [p0, p1, p2] = src, [q0, q1, q2] = dst;
  const det = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  const solve = (v0, v1, v2) => {
    const A = ((v1 - v0) * (p2.y - p0.y) - (v2 - v0) * (p1.y - p0.y)) * inv;
    const B = ((v2 - v0) * (p1.x - p0.x) - (v1 - v0) * (p2.x - p0.x)) * inv;
    return [A, B, v0 - A * p0.x - B * p0.y];
  };
  const [a, c, e] = solve(q0.x, q1.x, q2.x);
  const [b, d, f] = solve(q0.y, q1.y, q2.y);
  return [a, b, c, d, e, f];
}

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

export class FaceTexture {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = FACE_TEX;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.photo = null;        // HTMLImageElement/ImageBitmap
    this.mode = 'default';
    this.variant = 0;
    this.opts = {};
    this.sampledSkin = null;
    this._blink = 0;
    this._tmp = document.createElement('canvas');
  }

  setPhoto(img) { this.photo = img; }

  // ---------- Rosto padrão (desenhado) ----------
  drawDefault(opts, blink = 0) {
    this.mode = 'default';
    this.opts = opts;
    const { ctx } = this; const S = FACE_TEX;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const skin = new THREE.Color(opts.skin || '#e0ac83');
    const v = FACE_VARIANTS[opts.variant ?? 0] || FACE_VARIANTS[0];
    const fem = opts.gender === 'f';
    const P = p => [p.x * S, p.y * S];

    // sombreamento suave (bochechas / órbitas) para dar volume
    const shade = (x, y, rx, ry, col, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
      ctx.save(); ctx.translate(x, y); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const dark = skin.clone().multiplyScalar(0.72);
    const darkStr = `rgba(${dark.r * 255 | 0},${dark.g * 255 | 0},${dark.b * 255 | 0},A)`;
    for (const e of [CANON.eyeL, CANON.eyeR]) shade(e.x * S, e.y * S + 4, 46, 30, darkStr, 0.35);
    shade(CANON.nose.x * S, CANON.nose.y * S + 8, 28, 16, darkStr, 0.5);
    shade(0.5 * S, 0.81 * S, 50, 18, darkStr, 0.25);
    // blush
    const blush = fem ? 'rgba(230,110,120,A)' : 'rgba(210,120,110,A)';
    shade(0.27 * S, 0.6 * S, 44, 30, blush, fem ? 0.35 : 0.16);
    shade(0.73 * S, 0.6 * S, 44, 30, blush, fem ? 0.35 : 0.16);

    // olhos
    const eyeW = 34 * v.eyeW, eyeH = 18 * v.eyeH * (1 - blink);
    for (const [i, e] of [CANON.eyeL, CANON.eyeR].entries()) {
      const [x, y] = P(e);
      const side = i === 0 ? -1 : 1;
      if (eyeH > 1.5) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, eyeW, eyeH, side * v.tilt, 0, Math.PI * 2);
        ctx.fillStyle = '#fbfaf7'; ctx.fill();
        ctx.clip();
        const iris = opts.eyeColor || '#5a3b22';
        const g = ctx.createRadialGradient(x, y, 2, x, y, 17);
        g.addColorStop(0, '#000'); g.addColorStop(0.35, '#111');
        g.addColorStop(0.4, iris); g.addColorStop(0.95, new THREE.Color(iris).multiplyScalar(0.55).getStyle());
        g.addColorStop(1, '#111');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 1, 16.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(x + 5, y - 5, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 5, y + 5, 2, 0, Math.PI * 2); ctx.fill();
        // sombra da pálpebra superior
        const lg = ctx.createLinearGradient(0, y - eyeH, 0, y);
        lg.addColorStop(0, 'rgba(0,0,0,0.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.fillRect(x - eyeW, y - eyeH, eyeW * 2, eyeH);
        ctx.restore();
      }
      // contorno / cílios
      ctx.save();
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = fem ? 5 : 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(x, y, eyeW, Math.max(eyeH, 1), side * v.tilt, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      if (fem) {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + side * eyeW * 0.92, y - eyeH * 0.4); ctx.lineTo(x + side * (eyeW + 9), y - eyeH * 0.9 - 4); ctx.stroke();
      }
      ctx.restore();
      // sobrancelhas
      ctx.save();
      ctx.strokeStyle = opts.browColor || '#3b2416'; ctx.lineCap = 'round';
      ctx.lineWidth = fem ? 6 : 9 * v.brow;
      ctx.beginPath();
      const by = y - 36 - v.browLift;
      ctx.moveTo(x - side * 30, by + 6);
      ctx.quadraticCurveTo(x + side * 4, by - 8 - v.browArch, x + side * 36, by + 4);
      ctx.stroke(); ctx.restore();
    }

    // nariz
    ctx.save();
    const [nx, ny] = P(CANON.nose);
    ctx.strokeStyle = 'rgba(90,50,30,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(nx - 13 * v.nose, ny + 4); ctx.quadraticCurveTo(nx, ny + 13, nx + 13 * v.nose, ny + 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(nx, ny - 18, 6, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // boca
    ctx.save();
    const [mx, my] = P(CANON.mouth);
    const lip = opts.lipColor || (fem ? '#c2455a' : skin.clone().lerp(new THREE.Color('#b0524a'), 0.55).getStyle());
    const mw = 34 * v.mouth;
    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.moveTo(mx - mw, my);
    ctx.quadraticCurveTo(mx - mw * 0.5, my - 12, mx, my - 6);
    ctx.quadraticCurveTo(mx + mw * 0.5, my - 12, mx + mw, my);
    ctx.quadraticCurveTo(mx, my + 18 * v.smile + 8, mx - mw, my);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,20,20,0.75)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.quadraticCurveTo(mx, my + 7 * v.smile + 3, mx + mw, my); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(mx, my + 7, mw * 0.4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (opts.freckles) {
      ctx.fillStyle = 'rgba(120,70,40,0.35)';
      for (let i = 0; i < 40; i++) {
        const sx = (i % 2 ? 0.28 : 0.72) + (Math.sin(i * 12.9) * 0.08);
        ctx.beginPath(); ctx.arc(sx * S, (0.55 + Math.cos(i * 7.7) * 0.04) * S, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.texture.needsUpdate = true;
  }

  // ---------- Foto real ----------
  // adjust: ver DEFAULT_ADJUST. Retorna a cor de pele amostrada (THREE.Color) ou null.
  drawPhoto(adjust) {
    this.mode = 'photo';
    const img = this.photo;
    const { ctx } = this; const S = FACE_TEX;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    if (!img) { this.texture.needsUpdate = true; return null; }
    const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;

    // 1) foto alinhada pelos 3 marcadores -> camada temporária
    const tmp = this._tmp; tmp.width = tmp.height = S;
    const t = tmp.getContext('2d', { willReadFrequently: true });
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, S, S);
    const src = [adjust.eyeL, adjust.eyeR, adjust.mouth].map(p => ({ x: p.x * iw, y: p.y * ih }));
    const dst = [CANON.eyeL, CANON.eyeR, CANON.mouth].map(p => ({ x: p.x * S, y: p.y * S }));
    const A = affineFrom3(src, dst);
    // ajuste fino do usuário em torno do centro do rosto
    const cx = S / 2, cy = S * 0.55;
    t.translate(cx + adjust.offsetX * S, cy + adjust.offsetY * S);
    t.rotate(adjust.rotation * Math.PI / 180);
    t.scale(adjust.scale, adjust.scale);
    t.translate(-cx, -cy);
    if (A) t.transform(...A);
    const b = adjust.brightness, c = adjust.contrast;
    t.filter = `brightness(${b}) contrast(${c}) sepia(${Math.max(0, adjust.warmth) * 0.5}) hue-rotate(${Math.min(0, adjust.warmth) * 25}deg)`;
    t.drawImage(img, 0, 0, iw, ih);
    t.filter = 'none';
    t.setTransform(1, 0, 0, 1, 0, 0);

    // 2) cor de pele amostrada nas bochechas e testa
    let skin = null;
    try {
      const pts = [[0.27, 0.58], [0.73, 0.58], [0.5, 0.22], [0.5, 0.82]];
      let r = 0, g = 0, bl = 0, n = 0;
      for (const [px, py] of pts) {
        const d = t.getImageData(px * S - 10, py * S - 10, 20, 20).data;
        for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
      }
      if (n > 50) skin = new THREE.Color().setRGB(r / n / 255, g / n / 255, bl / n / 255, THREE.SRGBColorSpace);
    } catch (e) { /* canvas pode ficar "tainted" — ignora */ }
    this.sampledSkin = skin;

    // 3) máscara elíptica com borda suave
    const rx = S * 0.4 * adjust.maskW, ry = S * 0.47 * adjust.maskH;
    const feather = clamp01(adjust.feather);
    ctx.save();
    ctx.drawImage(tmp, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.translate(S / 2, S * 0.54); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * (1 - 0.45 * feather - 0.05), 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this.texture.needsUpdate = true;
    return skin;
  }

  dispose() { this.texture.dispose(); }
}

// Variações do rosto padrão.
export const FACE_VARIANTS = [
  { name: 'Clássico', eyeW: 1, eyeH: 1, tilt: 0.05, brow: 1, browLift: 0, browArch: 4, nose: 1, mouth: 1, smile: 0.6 },
  { name: 'Sorridente', eyeW: 1.05, eyeH: 0.85, tilt: 0.12, brow: 0.9, browLift: 3, browArch: 8, nose: 0.9, mouth: 1.15, smile: 1.2 },
  { name: 'Marcante', eyeW: 0.95, eyeH: 0.95, tilt: -0.05, brow: 1.3, browLift: -3, browArch: 2, nose: 1.15, mouth: 0.95, smile: 0.3 },
  { name: 'Doce', eyeW: 1.1, eyeH: 1.2, tilt: 0.0, brow: 0.8, browLift: 6, browArch: 10, nose: 0.8, mouth: 0.85, smile: 0.8 },
];

// Injeta a projeção do rosto num MeshStandardMaterial.
export function applyFaceShader(material, faceTex) {
  material.userData.faceUniforms = {
    uFaceMap: { value: faceTex },
    uFaceSize: { value: new THREE.Vector2(FACE_FRAME.width, FACE_FRAME.height) },
    uFaceCY: { value: FACE_FRAME.centerY },
  };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, material.userData.faceUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFacePos;\nvarying vec3 vFaceNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFacePos = position;\nvFaceNrm = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uFaceMap;\nuniform vec2 uFaceSize;\nuniform float uFaceCY;\nvarying vec3 vFacePos;\nvarying vec3 vFaceNrm;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 fuv = vec2(vFacePos.x / uFaceSize.x + 0.5, (vFacePos.y - uFaceCY) / uFaceSize.y + 0.5);
        float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
        float front = smoothstep(0.0, 0.42, normalize(vFaceNrm).z) * step(0.0, vFacePos.z);
        vec4 fc = texture2D(uFaceMap, clamp(fuv, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, fc.rgb, fc.a * front * inside);
      }`);
  };
  material.customProgramCacheKey = () => 'faceproj';
  material.needsUpdate = true;
}
