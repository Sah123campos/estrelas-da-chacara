// Controle do jogador: movimento relativo à câmera, corrida, colisões e altura do terreno.
import * as THREE from 'three';
import { lerpAngle } from '../npc/npcManager.js';

export class Player {
  constructor(character, world, collision) {
    this.ch = character; this.world = world; this.collision = collision;
    this.vel = new THREE.Vector3();
    this.radius = 0.33;
    this.speed = 0;
  }
  get pos() { return this.ch.root.position; }

  place(x, z, rotY = 0) {
    this.pos.set(x, this.world.groundHeight(x, z), z);
    this.ch.root.rotation.y = rotY;
    this.vel.set(0, 0, 0);
  }

  update(dt, move, cam, npcs = []) {
    const fwd = cam.forward(new THREE.Vector3());
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3().addScaledVector(fwd, move.y).addScaledVector(right, move.x);
    const mag = Math.min(1, wish.length());
    const maxSpeed = move.run ? 5.6 : 2.2;
    if (mag > 0.05) wish.normalize().multiplyScalar(maxSpeed * mag);
    else wish.set(0, 0, 0);
    // aceleração suave
    const k = mag > 0.05 ? 10 : 12;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * k);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * k);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    // NPCs como obstáculos
    for (const n of npcs) {
      const dx = nx - n.collider.x, dz = nz - n.collider.z, d = Math.hypot(dx, dz), min = n.collider.r + this.radius;
      if (d < min && d > 1e-5) { nx = n.collider.x + dx / d * min; nz = n.collider.z + dz / d * min; }
    }
    const res = this.collision.resolve(nx, nz, this.radius);
    // impede subir rampas muito íngremes sem escada (taludes viram barreira suave)
    const h0 = this.world.groundHeight(this.pos.x, this.pos.z);
    const h1 = this.world.groundHeight(res.x, res.z);
    const step = Math.hypot(res.x - this.pos.x, res.z - this.pos.z);
    if (step > 1e-4 && (h1 - h0) / step > 1.6) { res.x = this.pos.x; res.z = this.pos.z; }
    this.pos.x = res.x; this.pos.z = res.z;
    const gh = this.world.groundHeight(this.pos.x, this.pos.z);
    this.pos.y += (gh - this.pos.y) * Math.min(1, dt * 18);
    if (this.speed > 0.25) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      this.ch.root.rotation.y = lerpAngle(this.ch.root.rotation.y, target, dt * 12);
    }
  }
}
