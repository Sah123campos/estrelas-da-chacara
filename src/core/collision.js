// Colisões 2D no plano XZ: caixas giradas, círculos, elipses (lago) e limites do mapa.
// Usa uma grade espacial simples para não testar todos os obstáculos a cada quadro.

export class Collision {
  constructor(colliders, cell = 8) {
    this.cell = cell;
    this.grid = new Map();
    this.global = [];
    for (const c of colliders) this.add(c);
  }
  _key(i, j) { return i * 73856093 ^ j * 19349663; }
  add(c) {
    if (c.type === 'bounds' || c.type === 'ellipse') { this.global.push(c); return; }
    const r = c.type === 'circle' ? c.r : Math.hypot(c.hw, c.hd);
    const i0 = Math.floor((c.x - r) / this.cell), i1 = Math.floor((c.x + r) / this.cell);
    const j0 = Math.floor((c.z - r) / this.cell), j1 = Math.floor((c.z + r) / this.cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = this._key(i, j);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(c);
    }
  }
  _near(x, z) {
    const i = Math.floor(x / this.cell), j = Math.floor(z / this.cell);
    const set = new Set();
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = this.grid.get(this._key(i + a, j + b));
      if (l) for (const c of l) set.add(c);
    }
    return set;
  }

  // Resolve a posição (x,z) de um corpo de raio r. Retorna {x, z}.
  resolve(x, z, r, ignore = null) {
    for (let iter = 0; iter < 3; iter++) {
      for (const c of this._near(x, z)) {
        if (c === ignore) continue;
        if (c.type === 'circle') {
          const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
          if (d < min && d > 1e-6) { x = c.x + dx / d * min; z = c.z + dz / d * min; }
        } else if (c.type === 'box') {
          const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
          // para o espaço local da caixa (rotação em Y)
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz));
          let ox = lx - px, oz = lz - pz;
          let d = Math.hypot(ox, oz);
          if (d < r) {
            let nx, nz, push;
            if (d > 1e-6) { nx = ox / d; nz = oz / d; push = r - d; }
            else {
              // centro dentro da caixa: empurra pelo lado mais próximo
              const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz);
              if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; push = ex + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = ez + r; }
            }
            const nlx = lx + nx * push, nlz = lz + nz * push;
            x = c.x + nlx * cs + nlz * sn; z = c.z - nlx * sn + nlz * cs;
          }
        }
      }
      for (const c of this.global) {
        if (c.type === 'bounds') { x = Math.max(c.min, Math.min(c.max, x)); z = Math.max(c.min, Math.min(c.max, z)); }
        else if (c.type === 'ellipse') {
          const ex = (x - c.x) / (c.rx + r), ez = (z - c.z) / (c.rz + r), d = Math.hypot(ex, ez);
          if (d < 1 && d > 1e-6) { x = c.x + ex / d * (c.rx + r); z = c.z + ez / d * (c.rz + r); }
        }
      }
    }
    return { x, z };
  }
}
