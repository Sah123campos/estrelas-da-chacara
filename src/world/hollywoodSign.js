// Letreiro "HOLLYWOOD" na colina + fogos + holofotes: a revelação do tema do acampamento.
import * as THREE from 'three';

// Letras em blocos (grade 5x7, '#' = tábua).
const GLYPHS = {
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
};

export function buildHollywoodSign(ctx, { x = -6, z = -110, rotY = 0.04, letterH = 7 } = {}) {
  const group = new THREE.Group(); group.name = 'hollywood';
  const cell = letterH / 7;
  const white = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.75, emissive: '#fff4d8', emissiveIntensity: 0 });
  const post = new THREE.MeshStandardMaterial({ color: '#6b5a48', roughness: 0.9 });
  const letters = [];
  const word = 'HOLLYWOOD', spacing = cell * 6.2;
  const total = spacing * (word.length - 1);
  const cs = Math.cos(rotY), sn = Math.sin(rotY);
  [...word].forEach((ch, i) => {
    const g = new THREE.Group();
    const lx = -total / 2 + i * spacing;
    const wx = x + lx * cs, wz = z - lx * sn;
    g.position.set(wx, ctx.heightAt(wx, wz) - 0.2, wz); g.rotation.y = rotY;
    const rows = GLYPHS[ch];
    rows.forEach((row, r) => [...row].forEach((c, k) => {
      if (c !== '#') return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(cell * 1.02, cell * 1.02, 0.12), white);
      m.position.set((k - 2) * cell, (6 - r) * cell + cell / 2 + 0.6, 0); m.castShadow = true;
      g.add(m);
    }));
    for (const px of [-1.5, 1.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, letterH + 0.8, 0.12), post); p.position.set(px * cell, (letterH + 0.8) / 2, -0.15); g.add(p); }
    g.scale.y = 0.001; g.visible = false;
    group.add(g); letters.push(g);
  });
  ctx.group.add(group);

  // holofotes de estreia
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = [-1, 1].map(s => {
    const b = new THREE.Mesh(new THREE.ConeGeometry(3.2, 60, 24, 1, true), beamMat);
    b.geometry.translate(0, -30, 0);
    const bx = x + s * (total / 2 + 6) * cs, bz = z - s * (total / 2 + 6) * sn;
    b.position.set(bx, ctx.heightAt(bx, bz) + 1, bz + 4);
    ctx.group.add(b); return b;
  });

  // fogos de artifício (pontos)
  const N = 900, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3).fill(-9999), col = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const fw = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fw.frustumCulled = false; fw.visible = false; ctx.group.add(fw);
  const vel = new Float32Array(N * 3), life = new Float32Array(N);
  const palette = ['#ffd23f', '#ff6f59', '#ffffff', '#e05a9c', '#7fd1ff'].map(c => new THREE.Color(c));
  let nextBurst = 0, burstIdx = 0;
  const burst = () => {
    const cx = x + (Math.random() - 0.5) * total, cz = z + 4, cy = ctx.heightAt(cx, cz) + 16 + Math.random() * 10;
    const c = palette[Math.floor(Math.random() * palette.length)];
    for (let k = 0; k < 150; k++) {
      const i = (burstIdx + k) % N;
      const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random() * 2 - 1), sp = 5 + Math.random() * 3;
      pos.set([cx, cy, cz], i * 3);
      vel.set([Math.sin(e) * Math.cos(a) * sp, Math.cos(e) * sp, Math.sin(e) * Math.sin(a) * sp], i * 3);
      col.set([c.r, c.g, c.b], i * 3); life[i] = 1.6 + Math.random() * 0.6;
    }
    burstIdx = (burstIdx + 150) % N;
  };

  let t = -1, done = false;
  const api = {
    group,
    get revealed() { return done; },
    // mostra o letreiro já de pé (jogo salvo após a revelação)
    showInstant() { letters.forEach(l => { l.visible = true; l.scale.y = 1; }); done = true; white.emissiveIntensity = 0.12; },
    start() { t = 0; letters.forEach(l => { l.visible = true; }); fw.visible = true; },
    focusPoint: new THREE.Vector3(x, ctx.heightAt(x, z) + letterH * 0.7, z),
    // ponto de vista cinematográfico: do gramado, do outro lado do lago
    viewPoint: new THREE.Vector3(x + 6, ctx.heightAt(x + 6, z + 62) + 7, z + 62),
    update(dt, time) {
      if (t >= 0) {
        t += dt;
        letters.forEach((l, i) => { const k = Math.min(1, Math.max(0, (t - 0.5 - i * 0.28) / 0.7)); l.scale.y = 0.001 + (1 - Math.pow(1 - k, 3)) * 0.999; });
        white.emissiveIntensity = 0.5 * Math.min(1, t / 3);
        beamMat.opacity = Math.min(0.18, t * 0.06) * (t > 14 ? Math.max(0, 1 - (t - 14) / 3) : 1);
        if (t < 13 && time > nextBurst) { burst(); nextBurst = time + 0.35 + Math.random() * 0.4; }
        if (t > 17) { t = -1; done = true; fw.visible = false; white.emissiveIntensity = 0.12; }
      }
      beams.forEach((b, i) => { b.rotation.z = Math.sin(time * 0.7 + i * 2) * 0.45; b.rotation.x = 0.25 + Math.cos(time * 0.5 + i) * 0.15; });
      if (fw.visible) {
        for (let i = 0; i < N; i++) {
          if (life[i] <= 0) continue;
          life[i] -= dt;
          vel[i * 3 + 1] -= 4.5 * dt;
          pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
          if (life[i] <= 0) pos[i * 3 + 1] = -999;
          const f = Math.max(0, life[i] / 2);
          col[i * 3] *= 0.995; col[i * 3 + 1] *= 0.995; col[i * 3 + 2] *= 0.995 * (f > 0 ? 1 : 0);
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      }
    },
  };
  return api;
}
