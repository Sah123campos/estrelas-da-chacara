// Montagem do mundo a partir de mapData (terreno, lago, construções, vegetação, céu e luz).
import * as THREE from 'three';
import { MAP } from './mapData.js';
import { heightAt, buildTerrain, buildDistantHills, buildPath } from './terrain.js';
import { BUILDERS, buildPoles, buildLakeBench } from './builders.js';
import { buildVegetation } from './vegetation.js';
import { tex } from './textures.js';
import { buildHollywoodSign } from './hollywoodSign.js';

const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#2f7fe0') }, mid: { value: new THREE.Color('#8fc4f2') }, bottom: { value: new THREE.Color('#e9f1f5') }, sunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0),0.7)) : bottom;
      c = mix(bottom, c, smoothstep(-0.05, 0.12, h));
      float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0,0.95,0.8) * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.18);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(geo, mat); sky.name = 'sky';
  scene.add(sky);
  // nuvens (como nas fotos: cúmulos brancos)
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const cx = 50 + Math.random() * 156, cy = 110 + Math.random() * 60 - (Math.abs(cx - 128) < 60 ? 30 : 0), r = 20 + Math.random() * 38;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(250,252,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
  const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
  const cm = new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, fog: false });
  const clouds = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Sprite(cm);
    const a = Math.random() * Math.PI * 2, d = 300 + Math.random() * 350;
    s.position.set(Math.cos(a) * d, 90 + Math.random() * 120, Math.sin(a) * d);
    s.scale.set(160 + Math.random() * 120, 80 + Math.random() * 50, 1);
    clouds.add(s);
  }
  scene.add(clouds);
  return { sky, clouds };
}

export async function buildWorld(scene, renderer, quality, onProgress = () => {}) {
  const group = new THREE.Group(); group.name = 'world';
  scene.add(group);
  const ctx = { group, colliders: [], points: new Map(), updaters: [], holes: [], ramps: [], occluders: [], heightAt, quality };

  // luz
  scene.background = new THREE.Color('#9cc9f0');
  scene.fog = new THREE.Fog('#b9d6ee', quality.drawDistance * 0.6, quality.drawDistance * 1.15);
  const hemi = new THREE.HemisphereLight('#cfe6ff', '#5d7a3a', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dc', 3.0);
  sun.position.set(40, 70, 30);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  const sc = sun.shadow.camera; sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 220;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const skyObj = buildSky(scene);
  onProgress(0.15, 'Céu e iluminação');
  await nextFrame();

  // mapa de ambiente para reflexos (água, metais, tecidos acetinados)
  try {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(skyObj.sky.clone());
    const ground = new THREE.Mesh(new THREE.CircleGeometry(800, 16), new THREE.MeshBasicMaterial({ color: '#5d7a3a' }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -5; envScene.add(ground);
    scene.environment = pm.fromScene(envScene, 0.02, 0.1, 2000).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
  } catch (e) { console.warn('Sem mapa de ambiente', e); }

  // construções (antes do terreno, para registrar os furos)
  for (const def of MAP.structures) {
    const fn = BUILDERS[def.type];
    if (!fn) { console.warn('Estrutura desconhecida', def.type); continue; }
    try { fn(def, ctx); } catch (e) { console.error('Falha ao construir', def.type, e); }
  }
  buildPoles(ctx, MAP.poles);
  buildLakeBench(ctx);
  onProgress(0.4, 'Construções');
  await nextFrame();

  const terrain = buildTerrain(quality, ctx.holes);
  group.add(terrain);
  group.add(buildDistantHills());
  for (const p of MAP.paths) group.add(buildPath(p));
  onProgress(0.55, 'Terreno');
  await nextFrame();

  // lago
  const L = MAP.lake;
  const lakeGeo = new THREE.CircleGeometry(1, 48); lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, new THREE.MeshStandardMaterial({ color: '#34452a', roughness: 0.1, metalness: 0.65, bumpMap: tex.water().bump, bumpScale: 0.25, envMapIntensity: 2.2 }));
  lake.scale.set(L.rx * 1.2, 1, L.rz * 1.25); lake.position.set(L.x, L.level, L.z);
  lake.material.bumpMap.repeat.set(6, 6);
  group.add(lake);
  ctx.updaters.push((dt, t) => { lake.material.bumpMap.offset.set(t * 0.006, t * 0.004); });
  ctx.colliders.push({ type: 'ellipse', x: L.x, z: L.z, rx: L.rx * 0.93, rz: L.rz * 0.93 });
  // limite do mapa
  const B = MAP.size / 2 - 22;
  ctx.colliders.push({ type: 'bounds', min: -B, max: B });

  buildVegetation(scene, ctx.colliders, quality);
  onProgress(0.8, 'Vegetação');
  await nextFrame();

  const sign = buildHollywoodSign(ctx);

  for (const it of MAP.interactables) ctx.points.set('int_' + it.id, new THREE.Vector3(it.x, heightAt(it.x, it.z), it.z));

  group.traverse(o => { if (o.isMesh && o.receiveShadow === false && o.name !== 'sky') o.receiveShadow = true; });

  function groundHeight(x, z) {
    let h = heightAt(x, z);
    for (const r of ctx.ramps) {
      if (x >= r.x0 && x <= r.x1 && Math.abs(z - r.z) <= r.hw) h = Math.max(h, r.y0 + (r.y1 - r.y0) * ((x - r.x0) / (r.x1 - r.x0)));
    }
    return h;
  }

  const focus = new THREE.Vector3();
  return {
    ctx, sun, hemi, terrain, groundHeight, sign,
    update(dt, t, target) {
      for (const u of ctx.updaters) u(dt, t);
      sign.update(dt, t);
      if (target) {
        focus.copy(target);
        sun.position.set(focus.x + 40, focus.y + 70, focus.z + 30);
        sun.target.position.copy(focus);
      }
      skyObj.clouds.rotation.y += dt * 0.002;
    },
    setShadows(on, size) {
      sun.castShadow = on;
      if (size && sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    },
  };
}
