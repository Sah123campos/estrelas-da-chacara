// Estúdio 3D da criação de personagem: palco iluminado, câmera com zoom e giro.
import * as THREE from 'three';

export class Studio {
  constructor() {
    this.scene = new THREE.Scene();
    const c = document.createElement('canvas'); c.width = 16; c.height = 512;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1b1e33'); g.addColorStop(0.55, '#2b2338'); g.addColorStop(1, '#120f18');
    x.fillStyle = g; x.fillRect(0, 0, 16, 512);
    const bg = new THREE.CanvasTexture(c); bg.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bg;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    this.scene.add(new THREE.HemisphereLight('#fff4e6', '#3a2a40', 1.3));
    const key = new THREE.DirectionalLight('#fff1dd', 2.6); key.position.set(2.5, 4, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: 0.5, far: 15 });
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#b9c8ff', 0.9); fill.position.set(-3, 2, 2); this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#ffd9a0', 2.0); rim.position.set(-1, 3, -4); this.scene.add(rim);
    // palco: tapete vermelho redondo com borda dourada
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: '#7d0f1a', roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 80), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.9, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; this.scene.add(ring);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.36, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#141018', roughness: 0.6 }));
    base.position.y = -0.061; this.scene.add(base);
    // holofotes de fundo
    const spotMat = new THREE.MeshBasicMaterial({ color: '#ffe6b0', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const s of [-1, 1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 32, 1, true), spotMat);
      cone.position.set(s * 2.4, 3, -3); cone.rotation.z = s * 0.35; this.scene.add(cone);
    }
    this.charRot = 0.35; this.targetRot = 0.35;
    this.zoom = 0; this.targetZoom = 0; // 0 corpo, 1 rosto
    this.spin = false;
    this.height = 1.75;
    this.offsetX = 0;
  }

  setAspect(w, h, panelFraction = 0, portrait = false) {
    this.camera.aspect = w / h;
    // desloca a câmera para o personagem ficar na área livre (fora do painel)
    this.camera.clearViewOffset();
    this.distMul = portrait ? 1.45 : 1;
    if (panelFraction > 0) {
      if (portrait) this.camera.setViewOffset(w, h, 0, h * panelFraction * 0.5, w, h);
      else this.camera.setViewOffset(w, h, w * panelFraction * 0.5, 0, w, h);
    }
    this.camera.updateProjectionMatrix();
  }

  update(dt, character, look, zoomDelta) {
    if (look) this.targetRot += look.dx * 0.01;
    if (zoomDelta) this.targetZoom = Math.min(1, Math.max(0, this.targetZoom - zoomDelta * 0.15));
    if (this.spin) this.targetRot += dt * 0.8;
    this.charRot += (this.targetRot - this.charRot) * Math.min(1, dt * 8);
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 5);
    if (character) { character.root.rotation.y = this.charRot; character.root.position.set(0, 0, 0); }
    const H = this.height;
    const z = this.zoom;
    const tgtY = H * (0.52 + 0.43 * z);
    const dist = (5.6 * (1 - z) + 1.05 * z) * (this.distMul || 1);
    this.camera.position.set(0, tgtY + 0.15 * (1 - z), dist);
    this.camera.lookAt(0, tgtY, 0);
  }
}
