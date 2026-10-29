import { loadSettings, writeSettings } from '../save/storage.js';

export const isTouch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export const QUALITY_PRESETS = {
  baixa: { shadows: false, shadowSize: 1024, pixelRatio: 1.0, grass: 0, drawDistance: 120, physical: false, antialias: false },
  media: { shadows: true, shadowSize: 1024, pixelRatio: 1.5, grass: 0.5, drawDistance: 180, physical: false, antialias: true },
  alta:  { shadows: true, shadowSize: 2048, pixelRatio: 2.0, grass: 1.0, drawDistance: 260, physical: true, antialias: true },
};

const defaults = {
  quality: isMobileUA ? 'media' : 'alta',
  volume: 0.7,
  ambience: 0.6,
  camSensitivity: 1.0,
  invertY: false,
  fov: 60,
  pointerLock: false,
  showFps: false,
};

const listeners = new Set();
export const settings = { ...defaults, ...(loadSettings() || {}) };

export function quality() {
  return QUALITY_PRESETS[settings.quality] || QUALITY_PRESETS.media;
}

export function setSetting(key, value) {
  settings[key] = value;
  writeSettings(settings);
  listeners.forEach(fn => fn(key, value));
}

export function onSettingsChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function resetSettings() {
  Object.assign(settings, defaults);
  writeSettings(settings);
  listeners.forEach(fn => fn('*'));
}
