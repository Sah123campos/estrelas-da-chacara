// Pintura procedural das roupas no tronco (decotes, lapelas, golas, botões)
// e criação dos materiais de tecido.
import * as THREE from 'three';
import { fabric } from '../world/textures.js';
import { quality } from '../core/settings.js';

export const TORSO_W = 1024, TORSO_H = 512;
const CX = TORSO_W / 2;

export function fabricTexture(spec) {
  if (!spec) return null;
  const c = spec.color || '#888';
  switch (spec.pattern) {
    case 'pinstripe': return fabric.pinstripe(c, spec.patternColor);
    case 'sequin': return fabric.sequin(c);
    case 'velvet': return fabric.velvet(c);
    case 'denim': return fabric.denim(c);
    case 'plaid': return fabric.plaid(c, spec.patternColor);
    case 'floral': return fabric.floral(c);
    case 'knit': return fabric.knit(c);
    case 'houndstooth': return fabric.houndstooth('#151515', c);
    case 'stripes': return fabric.stripes(c, spec.patternColor);
    case 'leopard': return fabric.leopard();
    default: return null;
  }
}

export function surfaceProps(pattern) {
  switch (pattern) {
    case 'satin': return { roughness: 0.3, metalness: 0.05, sheen: 0.6, clearcoat: 0.2 };
    case 'velvet': return { roughness: 0.9, metalness: 0, sheen: 1.0, sheenRough: 0.35 };
    case 'sequin': return { roughness: 0.22, metalness: 0.75 };
    case 'metallic': return { roughness: 0.18, metalness: 0.95 };
    case 'leather': return { roughness: 0.38, metalness: 0.02, clearcoat: 0.5 };
    case 'denim': case 'knit': case 'plaid': return { roughness: 0.95, metalness: 0 };
    default: return { roughness: 0.72, metalness: 0.02 };
  }
}

// Cria material de tecido; map opcional (canvas pintado) substitui o padrão.
export function fabricMaterial(spec, { map = null, repeat = 1, side = THREE.FrontSide } = {}) {
  const props = surfaceProps(spec && spec.pattern);
  const useMap = map || fabricTexture(spec);
  let tex = useMap;
  if (!map && useMap) { tex = useMap.clone(); tex.repeat.set(useMap.repeat.x * repeat, useMap.repeat.y * repeat); tex.needsUpdate = true; }
  const color = map || useMap ? 0xffffff : (spec ? spec.color : '#888');
  const physical = quality().physical && (props.sheen || props.clearcoat);
  const M = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new M({ color, map: tex || null, roughness: props.roughness, metalness: props.metalness, side });
  if (physical) {
    if (props.sheen) { m.sheen = props.sheen; m.sheenRoughness = props.sheenRough ?? 0.5; m.sheenColor = new THREE.Color(spec.color).lerp(new THREE.Color('#ffffff'), 0.4); }
    if (props.clearcoat) { m.clearcoat = props.clearcoat; m.clearcoatRoughness = 0.3; }
  }
  if (tex && tex !== map) m.userData.ownedTexture = tex;
  return m;
}

function fillFabric(ctx, spec, x = 0, y = 0, w = TORSO_W, h = TORSO_H) {
  const tex = fabricTexture(spec);
  ctx.save();
  if (tex && tex.image) {
    const pat = ctx.createPattern(tex.image, 'repeat');
    const m = new DOMMatrix(); m.scaleSelf(0.5, 0.5);
    pat.setTransform?.(m);
    ctx.fillStyle = pat;
  } else ctx.fillStyle = spec.color;
  ctx.fillRect(x, y, w, h);
  // brilho de tecido
  if (spec.pattern === 'satin' || spec.pattern === 'leather' || spec.pattern === 'metallic') {
    for (const cx of [CX - 150, CX + 150, 60, TORSO_W - 60]) {
      const g = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 90, y, 180, h);
    }
  }
  if (spec.pattern === 'velvet') {
    const g = ctx.createLinearGradient(0, 0, TORSO_W, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  // costuras laterais
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
  for (const sx of [TORSO_W * 0.25, TORSO_W * 0.75]) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); ctx.stroke(); }
  ctx.restore();
}

function skinFill(ctx, skin) { ctx.fillStyle = skin; }

// Decote: pinta pele na parte de cima conforme o tipo.
function paintNeckline(ctx, neck, skin) {
  ctx.save();
  skinFill(ctx, skin);
  switch (neck) {
    case 'v':
      ctx.beginPath(); ctx.moveTo(CX - 80, 0); ctx.lineTo(CX + 80, 0); ctx.lineTo(CX, 140); ctx.closePath(); ctx.fill(); break;
    case 'deepv':
      ctx.beginPath(); ctx.moveTo(CX - 95, 0); ctx.lineTo(CX + 95, 0); ctx.lineTo(CX, 250); ctx.closePath(); ctx.fill(); break;
    case 'scoop':
      ctx.beginPath(); ctx.ellipse(CX, 0, 125, 95, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 90, 40, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(TORSO_W, 0, 90, 40, 0, 0, Math.PI); ctx.fill(); break;
    case 'strapless': {
      ctx.fillRect(0, 0, TORSO_W, 150);
      ctx.beginPath(); ctx.moveTo(CX - 200, 150);
      ctx.quadraticCurveTo(CX - 100, 110, CX, 160); ctx.quadraticCurveTo(CX + 100, 110, CX + 200, 150);
      ctx.lineTo(CX + 200, 140); ctx.lineTo(CX - 200, 140); ctx.fill(); break;
    }
    case 'off':
      ctx.fillRect(0, 0, TORSO_W, 120);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 120, TORSO_W, 6); break;
    case 'halter':
      ctx.fillRect(0, 0, TORSO_W, 190);
      ctx.fillStyle = '#0000'; break;
    case 'crew':
      ctx.beginPath(); ctx.ellipse(CX, 0, 70, 26, 0, 0, Math.PI); ctx.fill(); break;
    default: break;
  }
  ctx.restore();
}

function paintHalterFront(ctx, spec) {
  // triângulo de tecido subindo até o pescoço
  ctx.save();
  ctx.beginPath(); ctx.moveTo(CX - 170, 200); ctx.lineTo(CX - 40, 0); ctx.lineTo(CX + 40, 0); ctx.lineTo(CX + 170, 200); ctx.closePath();
  ctx.clip(); fillFabric(ctx, spec, 0, 0, TORSO_W, 210); ctx.restore();
}

function paintShirtCollar(ctx, color) {
  ctx.save();
  const c = new THREE.Color(color);
  const dark = c.clone().multiplyScalar(0.78).getStyle();
  ctx.fillStyle = c.clone().multiplyScalar(1.02).getStyle();
  ctx.strokeStyle = dark; ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(CX + s * 4, 4); ctx.lineTo(CX + s * 70, 0); ctx.lineTo(CX + s * 58, 62); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // carcela de botões
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(CX - 10, 20); ctx.lineTo(CX - 10, TORSO_H); ctx.stroke();
  ctx.fillStyle = c.clone().multiplyScalar(0.85).getStyle();
  for (let y = 80; y < TORSO_H; y += 75) { ctx.beginPath(); ctx.arc(CX, y, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function paintPrint(ctx, print) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,30,0.9)'; ctx.font = 'bold 150px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(print, CX, 230);
  ctx.font = 'bold 34px sans-serif'; ctx.fillText('ESTRELA DA CHÁCARA', CX, 330);
  ctx.restore();
}

// Parte de cima (camisa/blusa/vestido) no canvas do tronco.
export function paintTop(ctx, spec, skin) {
  fillFabric(ctx, spec);
  if (spec.neck === 'collar') paintShirtCollar(ctx, spec.color);
  if (spec.neck === 'turtle') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 0, TORSO_W, 18);
  }
  if (spec.neck === 'halter') { paintNeckline(ctx, 'halter', skin); paintHalterFront(ctx, spec); }
  else paintNeckline(ctx, spec.neck, skin);
  if (spec.print) paintPrint(ctx, spec.print);
  if (spec.pattern === 'sequin' || spec.pattern === 'metallic') {
    // borda de acabamento no decote
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4;
  }
}

function lapelPath(ctx, side, style, vBottom) {
  // side: -1 esquerda da imagem, 1 direita
  const topX = CX + side * 70, botX = CX, botY = vBottom;
  const pts = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = topX + (botX - topX) * t, y = 0 + botY * t;
    pts.push([x, y]);
  }
  const outer = [];
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    let w = 70 * Math.pow(1 - t, 0.7) + 6;
    let dy = 0;
    if (style === 'notch' && t > 0.3 && t < 0.4) w *= 0.55;
    if (style === 'peak' && t > 0.25 && t < 0.4) { w *= 1.35; dy = -(0.4 - t) * 60; }
    if (style === 'shawl') w = 62 * Math.pow(1 - t, 0.9) + 6;
    const [x, y] = pts[i];
    outer.push([x + side * w, y + dy]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  for (const [x, y] of outer) ctx.lineTo(x, y);
  ctx.lineTo(topX + side * 80, 0);
  ctx.closePath();
}

// Casaco/paletó com abertura em V mostrando a peça de baixo.
export function paintJacket(ctx, jacket, topSpec, skin, length) {
  fillFabric(ctx, jacket);
  if (jacket.lapel === 'none') {
    // jaqueta fechada: zíper + gola
    if (jacket.pattern === 'satin') { // bomber: punho canelado na barra
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, TORSO_H - 60, TORSO_W, 60);
      for (let x = 0; x < TORSO_W; x += 8) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, TORSO_H - 60, 3, 60); }
    }
    ctx.strokeStyle = 'rgba(210,210,210,0.8)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, TORSO_H); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, TORSO_W, 30);
    if (jacket.pattern === 'denim') {
      ctx.strokeStyle = '#d69a3c'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      for (const s of [-1, 1]) { ctx.strokeRect(CX + s * 150 - 60, 120, 120, 90); }
      ctx.setLineDash([]);
    }
    return;
  }
  const vBottom = length === 'waist' ? 300 : 360;
  // abertura em V: pinta a peça de baixo
  ctx.save();
  ctx.beginPath(); ctx.moveTo(CX - 72, 0); ctx.lineTo(CX + 72, 0); ctx.lineTo(CX, vBottom); ctx.closePath(); ctx.clip();
  if (topSpec) paintTop(ctx, topSpec, skin); else { ctx.fillStyle = skin; ctx.fillRect(0, 0, TORSO_W, TORSO_H); }
  // sombra interna
  const g = ctx.createLinearGradient(CX - 72, 0, CX + 72, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(CX - 72, 0, 144, vBottom);
  ctx.restore();
  // lapelas
  const lapelSpec = { ...jacket, color: jacket.lapelColor || jacket.color, pattern: jacket.lapelSatin ? 'satin' : jacket.pattern };
  for (const side of [-1, 1]) {
    ctx.save();
    lapelPath(ctx, side, jacket.lapel, vBottom);
    ctx.clip();
    fillFabric(ctx, lapelSpec);
    if (jacket.lapelSatin) {
      const lg = ctx.createLinearGradient(CX + side * 20, 0, CX + side * 140, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0.28)'); lg.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, TORSO_W, TORSO_H);
    }
    ctx.restore();
    ctx.save();
    lapelPath(ctx, side, jacket.lapel, vBottom);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // botões
  const btn = new THREE.Color(jacket.lapelSatin ? '#111' : jacket.color).multiplyScalar(0.7).getStyle();
  ctx.fillStyle = btn;
  for (const y of [vBottom + 30, vBottom + 100]) { if (y < TORSO_H - 10) { ctx.beginPath(); ctx.arc(CX + 6, y, 9, 0, Math.PI * 2); ctx.fill(); } }
  // lenço de bolso
  ctx.fillStyle = '#f7f5ef';
  ctx.beginPath(); ctx.moveTo(CX + 150, 175); ctx.lineTo(CX + 165, 150); ctx.lineTo(CX + 180, 165); ctx.lineTo(CX + 195, 148); ctx.lineTo(CX + 205, 175); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CX + 140, 175); ctx.lineTo(CX + 215, 175); ctx.stroke();
  // linha central abaixo do V
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(CX, vBottom); ctx.lineTo(CX - 4, TORSO_H); ctx.stroke();
}

export function newTorsoCanvas() {
  const c = document.createElement('canvas'); c.width = TORSO_W; c.height = TORSO_H;
  return c;
}
