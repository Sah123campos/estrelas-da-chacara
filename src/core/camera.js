// Câmera em terceira pessoa com órbita livre (dá para girar e ver o rosto do personagem).
import * as THREE from 'three';
import { settings } from './settings.js';

export class ThirdPersonCamera {
  constructor(camera, groundHeight) {
    this.camera = camera;
    this.groundHeight = groundHeight;
    this.yaw = Math.PI;      // câmera atrás do personagem
    this.pitch = 0.22;
    this.distance = 4.2;
    this.targetDistance = 4.2;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.occluders = [];
    this.ray = new THREE.Raycaster();
    this._first = true;
  }

  applyInput(look, zoom) {
    const s = 0.0042 * settings.camSensitivity;
    this.yaw -= look.dx * s;
    this.pitch += look.dy * s * (settings.invertY ? -1 : 1);
    this.pitch = Math.max(-0.45, Math.min(1.25, this.pitch));
    if (zoom) this.targetDistance = Math.max(1.4, Math.min(9, this.targetDistance + zoom * 0.45));
  }

  // Direção "para frente" no plano, para movimento relativo à câmera.
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  update(dt, focus, height = 1.6) {
    this.target.set(focus.x, focus.y + height * 0.88, focus.z);
    if (this._first) { this.smoothTarget.copy(this.target); this._first = false; }
    this.smoothTarget.lerp(this.target, Math.min(1, dt * 10));
    this.distance += (this.targetDistance - this.distance) * Math.min(1, dt * 6);
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    let dist = this.distance;
    // evita que paredes fiquem entre a câmera e o personagem
    if (this.occluders.length) {
      this.ray.set(this.smoothTarget, dir); this.ray.far = dist;
      const hit = this.ray.intersectObjects(this.occluders, true)[0];
      if (hit) dist = Math.max(0.8, hit.distance - 0.25);
    }
    const pos = this.smoothTarget.clone().addScaledVector(dir, dist);
    const gh = this.groundHeight(pos.x, pos.z) + 0.3;
    if (pos.y < gh) pos.y = gh;
    this.camera.position.copy(pos);
    this.camera.lookAt(this.smoothTarget);
  }

  snapBehind(rotY) { this.yaw = rotY + Math.PI; this._first = true; }
}
