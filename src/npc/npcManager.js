// Cria e anima os NPCs a partir de npcData.js.
import * as THREE from 'three';
import { Character } from '../character/character.js';
import { defaultAppearance } from '../character/wardrobe.js';
import { NPCS } from './npcData.js';

function nameTag(name) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.font = '600 52px "Manrope", system-ui, sans-serif';
  const w = Math.min(500, x.measureText(name).width + 70);
  x.fillStyle = 'rgba(12,14,22,0.72)';
  const r = 40, X = (512 - w) / 2, Y = 24, H = 80;
  x.beginPath(); x.roundRect(X, Y, w, H, r); x.fill();
  x.strokeStyle = 'rgba(233,196,106,0.9)'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(name, 256, Y + H / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(0.16, 0.04, 1); s.renderOrder = 10;
  return s;
}

export class NPCManager {
  constructor(scene, world, collision) {
    this.scene = scene; this.world = world; this.collision = collision;
    this.list = [];
    this.missing = [];
  }

  async spawnAll(yieldFn) {
    for (const def of NPCS) {
      try { this.spawn(def); } catch (e) { console.error('NPC falhou', def.id, e); }
      if (yieldFn) await yieldFn();
    }
  }

  spawn(def) {
    const ch = new Character();
    const app = { ...defaultAppearance(def.appearance?.gender || 'm'), ...def.appearance, name: def.name };
    ch.setAppearance(app);
    let pos;
    if (typeof def.location === 'string') {
      const p = this.world.ctx.points.get(def.location);
      if (!p) { this.missing.push(def.location); console.warn('Local não encontrado:', def.location, '— usando o pátio'); }
      pos = (p || this.world.ctx.points.get('patio') || new THREE.Vector3()).clone();
    } else pos = new THREE.Vector3(def.location.x, 0, def.location.z);
    pos.y = this.world.groundHeight(pos.x, pos.z);
    ch.root.position.copy(pos);
    ch.root.rotation.y = def.behavior?.faceAngle ?? Math.random() * Math.PI * 2;
    const tag = nameTag(def.name);
    tag.position.y = ch.height + 0.28;
    ch.root.add(tag);
    this.scene.add(ch.root);
    const npc = {
      def, ch, tag, home: pos.clone(), target: null, wait: 1 + Math.random() * 3, talking: false, patrolIdx: 0,
      collider: { type: 'circle', x: pos.x, z: pos.z, r: 0.35 }, speed: 0,
    };
    this.list.push(npc);
    return npc;
  }

  // NPC mais próximo do jogador dentro do alcance.
  nearest(pos, range = 2.6) {
    let best = null, bd = range;
    for (const n of this.list) {
      const d = Math.hypot(n.ch.root.position.x - pos.x, n.ch.root.position.z - pos.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  update(dt, playerPos, camera) {
    for (const n of this.list) {
      const b = n.def.behavior || { type: 'idle' };
      const r = n.ch.root;
      let speed = 0;
      let lookYaw = 0;
      const distP = Math.hypot(playerPos.x - r.position.x, playerPos.z - r.position.z);
      if (n.talking) {
        const target = Math.atan2(playerPos.x - r.position.x, playerPos.z - r.position.z);
        if (b.type === 'sit') lookYaw = clampAngle(angleDiff(target, r.rotation.y), 1.0);
        else r.rotation.y = lerpAngle(r.rotation.y, target, dt * 6);
      } else if (b.type === 'wander' || b.type === 'patrol') {
        if (!n.target) {
          n.wait -= dt;
          if (n.wait <= 0) {
            if (b.type === 'patrol' && b.points?.length) {
              const p = b.points[n.patrolIdx++ % b.points.length];
              n.target = new THREE.Vector3(p[0], 0, p[1]);
            } else {
              const a = Math.random() * Math.PI * 2, d = Math.random() * (b.radius || 3);
              n.target = n.home.clone().add(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d));
            }
          }
        } else {
          const dx = n.target.x - r.position.x, dz = n.target.z - r.position.z, d = Math.hypot(dx, dz);
          if (d < 0.4 || n.stuck > 2.5) { n.target = null; n.stuck = 0; n.wait = 2 + Math.random() * 4; }
          else {
            speed = b.type === 'patrol' ? 1.0 : 0.9;
            r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(dx, dz), dt * 5);
            const nx = r.position.x + Math.sin(r.rotation.y) * speed * dt, nz = r.position.z + Math.cos(r.rotation.y) * speed * dt;
            const res = this.collision.resolve(nx, nz, 0.35);
            const moved = Math.hypot(res.x - r.position.x, res.z - r.position.z);
            n.stuck = (n.stuck || 0) + (moved < speed * dt * 0.3 ? dt : 0);
            r.position.x = res.x; r.position.z = res.z;
          }
        }
        // olha para o jogador quando ele chega perto
        if (distP < 4 && !n.target) {
          const target = Math.atan2(playerPos.x - r.position.x, playerPos.z - r.position.z);
          lookYaw = clampAngle(angleDiff(target, r.rotation.y), 0.9);
        }
      } else if (distP < 4 && b.type !== 'sit') {
        const target = Math.atan2(playerPos.x - r.position.x, playerPos.z - r.position.z);
        lookYaw = clampAngle(angleDiff(target, r.rotation.y), 0.9);
      }
      r.position.y = this.world.groundHeight(r.position.x, r.position.z);
      n.collider.x = r.position.x; n.collider.z = r.position.z;
      n.ch.update(dt, {
        speed, talk: n.talking, sit: b.type === 'sit', seatHeight: b.seatHeight,
        dance: b.type === 'dance' && !n.talking || n.danceBoost > 0, wave: n.waveT > 0, lookYaw,
      });
      if (n.waveT > 0) n.waveT -= dt;
      if (n.danceBoost > 0) n.danceBoost -= dt;
      // etiqueta de nome: some de longe
      n.tag.visible = distP < 18;
      n.tag.material.opacity = Math.min(1, (18 - distP) / 4);
    }
  }
}

function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function clampAngle(a, m) { return Math.max(-m, Math.min(m, a)); }
export function lerpAngle(a, b, t) { return a + angleDiff(b, a) * Math.min(1, t); }
