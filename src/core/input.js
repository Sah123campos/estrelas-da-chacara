// Entrada unificada: teclado, mouse, toque (joystick virtual + arraste de câmera).
import { settings } from './settings.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.move = { x: 0, y: 0 };      // joystick virtual (-1..1)
    this.look = { dx: 0, dy: 0 };    // delta acumulado de câmera
    this.zoom = 0;                   // delta acumulado de zoom
    this.runToggle = false;
    this.enabled = true;             // falso durante menus/diálogos
    this.handlers = {};              // callbacks: interact, menu, wardrobe
    this._pressed = new Set();
    this._dragging = null;
    this._touches = new Map();
    this._pinch = null;

    addEventListener('keydown', e => this._onKey(e, true));
    addEventListener('keyup', e => this._onKey(e, false));
    addEventListener('blur', () => { this.keys.clear(); this.move.x = this.move.y = 0; });

    canvas.addEventListener('mousedown', e => {
      if (!this.enabled) return;
      if (settings.pointerLock && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
      this._dragging = { x: e.clientX, y: e.clientY };
    });
    addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas) {
        this.look.dx += e.movementX; this.look.dy += e.movementY; return;
      }
      if (!this._dragging) return;
      this.look.dx += e.clientX - this._dragging.x;
      this.look.dy += e.clientY - this._dragging.y;
      this._dragging.x = e.clientX; this._dragging.y = e.clientY;
    });
    addEventListener('mouseup', () => { this._dragging = null; });
    canvas.addEventListener('wheel', e => {
      if (!this.enabled) return;
      e.preventDefault();
      this.zoom += Math.sign(e.deltaY);
    }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Toque na área do canvas: arrastar gira a câmera, pinça dá zoom.
    canvas.addEventListener('touchstart', e => this._touchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this._touchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this._touchEnd(e));
    canvas.addEventListener('touchcancel', e => this._touchEnd(e));
  }

  on(name, fn) { this.handlers[name] = fn; }
  _emit(name) { this.handlers[name]?.(); }

  _onKey(e, down) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.code;
    if (down) {
      if (!this.keys.has(k)) this._pressed.add(k);
      this.keys.add(k);
      if (k === 'Escape') this._emit('menu');
      if (k === 'KeyE' || (k === 'Enter' && this.enabled)) this._emit('interact');
      if (k === 'KeyR' && this.enabled) this._emit('wardrobe');
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(k) && this.enabled) e.preventDefault();
    } else {
      this.keys.delete(k);
    }
  }

  _touchStart(e) {
    if (!this.enabled) return;
    e.preventDefault();
    for (const t of e.changedTouches) this._touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    if (this._touches.size === 2) {
      const [a, b] = [...this._touches.values()];
      this._pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  _touchMove(e) {
    if (!this.enabled) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = this._touches.get(t.identifier);
      if (!p) continue;
      if (this._touches.size === 1) {
        this.look.dx += (t.clientX - p.x) * 1.4;
        this.look.dy += (t.clientY - p.y) * 1.4;
      }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (this._touches.size === 2 && this._pinch) {
      const [a, b] = [...this._touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoom += (this._pinch - d) / 40;
      this._pinch = d;
    }
  }
  _touchEnd(e) {
    for (const t of e.changedTouches) this._touches.delete(t.identifier);
    if (this._touches.size < 2) this._pinch = null;
  }

  // Liga o joystick virtual (elemento base + alça).
  bindJoystick(base, knob) {
    let id = null, cx = 0, cy = 0;
    const R = () => base.clientWidth / 2;
    const set = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const r = R(), len = Math.hypot(dx, dy);
      if (len > r) { dx *= r / len; dy *= r / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / r; this.move.y = dy / r;
    };
    const start = e => {
      e.preventDefault();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      id = e.changedTouches ? t.identifier : 'mouse';
      const rect = base.getBoundingClientRect();
      cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2;
      set(t.clientX, t.clientY);
    };
    const move = e => {
      if (id === null) return;
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      const t = list.find(t => (e.changedTouches ? t.identifier : 'mouse') === id);
      if (!t) return;
      e.preventDefault();
      set(t.clientX, t.clientY);
    };
    const end = e => {
      if (id === null) return;
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      if (!list.some(t => (e.changedTouches ? t.identifier : 'mouse') === id)) return;
      id = null; knob.style.transform = ''; this.move.x = this.move.y = 0;
    };
    base.addEventListener('touchstart', start, { passive: false });
    addEventListener('touchmove', move, { passive: false });
    addEventListener('touchend', end);
    addEventListener('touchcancel', end);
    base.addEventListener('mousedown', start);
    addEventListener('mousemove', move);
    addEventListener('mouseup', end);
  }

  // Vetor de movimento no espaço local (x: direita, y: frente).
  getMoveVector() {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    let x = 0, y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    x += this.move.x; y -= this.move.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    const joyStrong = Math.hypot(this.move.x, this.move.y) > 0.92;
    const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.runToggle || joyStrong;
    return { x, y, run };
  }

  consumeLook() { const l = { ...this.look }; this.look.dx = this.look.dy = 0; return l; }
  consumeZoom() { const z = this.zoom; this.zoom = 0; return z; }
  releaseAll() { this.keys.clear(); this._dragging = null; this.move.x = this.move.y = 0; this.look.dx = this.look.dy = 0; }
}
