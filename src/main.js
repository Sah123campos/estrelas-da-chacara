// Inicialização e laço principal do jogo.
import * as THREE from 'three';
import { settings, quality, onSettingsChange, isTouch } from './core/settings.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { Collision } from './core/collision.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Player } from './core/player.js';
import { buildWorld } from './world/world.js';
import { MAP } from './world/mapData.js';
import { setMaxAnisotropy } from './world/textures.js';
import { Character } from './character/character.js';
import { defaultAppearance } from './character/wardrobe.js';
import { DEFAULT_ADJUST } from './character/face.js';
import { detectLandmarks, canvasToBlob, blobToCanvas } from './character/photo.js';
import { NPCManager } from './npc/npcManager.js';
import { DialogueState } from './npc/dialogue.js';
import { loadSave, writeSave, savePhoto, loadPhoto, deletePhoto } from './save/storage.js';
import { $, $$, show, toast, confirmDialog, toggleFullscreen } from './ui/common.js';
import { Studio } from './ui/studio.js';
import { Creator } from './ui/creator.js';
import { DialogUI } from './ui/dialogUI.js';
import { HUD } from './ui/hud.js';
import { initSettingsUI } from './ui/settingsUI.js';

const loadBar = $('#loadBar'), loadText = $('#loadText');
function progress(p, txt) { loadBar.style.width = Math.round(p * 100) + '%'; if (txt) loadText.textContent = txt; }
const frame = () => new Promise(r => requestAnimationFrame(() => r()));

class Game {
  async init() {
    if (isTouch) document.body.classList.add('touch');
    progress(0.03, 'Iniciando o motor 3D…');
    const canvas = $('#game');
    this.canvas = canvas;
    const q = quality();
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q.antialias, powerPreference: 'high-performance' });
    } catch (e) {
      loadText.textContent = 'Seu navegador não conseguiu iniciar o WebGL (3D). Tente atualizar o navegador ou ativar a aceleração de hardware.';
      throw e;
    }
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    setMaxAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); toast('O 3D foi interrompido pelo aparelho. Recarregue a página para continuar — seu personagem está salvo.', 'err', 8000); });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, q.drawDistance + 400);
    this.input = new Input(canvas);
    this.studio = new Studio();
    this.save = loadSave();
    this.dlgState = new DialogueState(this.save?.dialogue);
    this.app = this.save?.appearance ? { ...defaultAppearance(this.save.appearance.gender), ...this.save.appearance } : defaultAppearance('m');
    this.photoCanvas = null;

    progress(0.08, 'Montando a chácara…');
    this.world = await buildWorld(this.scene, r, q, (p, t) => progress(0.08 + p * 0.62, t));
    this.collision = new Collision(this.world.ctx.colliders);
    this.cam = new ThirdPersonCamera(this.camera, (x, z) => this.world.groundHeight(x, z));
    this.cam.occluders = this.world.ctx.occluders;

    progress(0.74, 'Vestindo os personagens…');
    if (this.app.faceMode === 'photo') {
      const blob = await loadPhoto();
      if (blob) { try { this.photoCanvas = await blobToCanvas(blob); } catch { this.photoCanvas = null; } }
      if (!this.photoCanvas) { this.app.faceMode = 'default'; toast('A foto salva não foi encontrada; usando o rosto padrão.'); }
    }
    this.player = new Character({ isPlayer: true });
    if (this.photoCanvas) this.player.face.setPhoto(this.photoCanvas);
    this.player.setAppearance(this.app);
    this.player.onStep = run => audio.step(run);
    this.scene.add(this.player.root);
    this.controller = new Player(this.player, this.world, this.collision);
    const sp = this.save?.position;
    if (sp && Number.isFinite(sp.x)) this.controller.place(sp.x, sp.z, sp.rotY || 0);
    else this.controller.place(MAP.spawn.x, MAP.spawn.z, MAP.spawn.rotY);
    this.cam.snapBehind(this.player.root.rotation.y);

    this.npcs = new NPCManager(this.scene, this.world, this.collision);
    await this.npcs.spawnAll(frame);
    progress(0.92, 'Ajustando as luzes do tapete vermelho…');

    this.hud = new HUD();
    this.dialog = new DialogUI();
    this.creator = new Creator(this);
    this.settingsUI = initSettingsUI({
      onClose: () => { if (this._settingsReturn) this._settingsReturn(); },
      onDeleted: () => setTimeout(() => location.reload(), 600),
    });
    this._bindUI();
    onSettingsChange(k => this._applySettings(k));

    addEventListener('resize', () => this._resize());
    addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250));
    this._resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this._persist(); if (this.state === 'play') this.pause(); } });
    addEventListener('pagehide', () => this._persist());
    setInterval(() => { if (this.state === 'play') this._persist(); }, 10000);

    // compila os shaders antes de mostrar
    try { r.compile(this.scene, this.camera); } catch { /* não crítico */ }
    progress(1, 'Pronto!');
    await frame();
    this.clock = new THREE.Clock();
    this.t = 0;
    this._loop();
    show('loading', false);
    if (this.save?.appearance) this.toMenu();
    else this.openCreator('new');   // primeiro acesso: direto para a criação
  }

  // ---------- estados ----------
  setState(s) {
    this.state = s;
    show('hud', s === 'play' || s === 'dialog');
    show('menu', s === 'menu');
    this.input.enabled = s === 'play' || s === 'creator';
    if (s !== 'play') this.input.releaseAll();
  }

  toMenu() {
    this._attachPlayerToWorld();
    $('#btnContinue').disabled = !this.save?.appearance;
    $('#btnContinue').style.display = this.save?.appearance ? '' : 'none';
    show('pause', false); show('creator', false);
    this.setState('menu');
  }

  openCreator(mode) {
    this._returnState = this.state;
    this._attachPlayerToStudio();
    this.setState('creator');
    this.creator.open(mode, {
      onDone: async () => {
        await this.saveGame(true);
        this.creator.close();
        this._attachPlayerToWorld();
        if (mode === 'new') { this.controller.place(MAP.spawn.x, MAP.spawn.z, MAP.spawn.rotY); this.cam.snapBehind(MAP.spawn.rotY); this.dlgState = new DialogueState(); }
        this.play();
        if (mode === 'new') setTimeout(() => toast(isTouch ? 'Use o joystick para andar e arraste a tela para girar a câmera.' : 'WASD para andar · arraste o mouse para girar a câmera · E para conversar.', '', 6000), 600);
      },
      onBack: () => {
        this.creator.close();
        if (mode === 'wardrobe') { this._restoreApp(); this._attachPlayerToWorld(); this.play(); }
        else { this._restoreApp(); this.toMenu(); }
      },
    });
    this._appBackup = JSON.parse(JSON.stringify(this.app));
  }

  _restoreApp() {
    if (!this._appBackup) return;
    this.app = this._appBackup; this._appBackup = null;
    this.rebuildPlayer();
  }

  play() {
    show('pause', false);
    this.setState('play');
    audio.unlock();
  }

  pause() { if (this.state !== 'play') return; this.setState('pause'); show('pause'); if (document.pointerLockElement) document.exitPointerLock(); }

  _attachPlayerToStudio() {
    this.studio.scene.add(this.player.root);
    this.player.root.position.set(0, 0, 0);
    this._savedPos = { x: this.controller.pos.x, z: this.controller.pos.z, rotY: this.player.root.rotation.y };
    this.studio.height = this.player.height;
  }
  _attachPlayerToWorld() {
    this.scene.add(this.player.root);
    if (this._savedPos) { this.controller.place(this._savedPos.x, this._savedPos.z, this._savedPos.rotY); this._savedPos = null; }
  }

  rebuildPlayer() {
    try { this.player.setAppearance(this.app); }
    catch (e) { console.error(e); toast('Essa combinação de roupa deu erro; voltando ao visual anterior.', 'err'); }
    this.studio.height = this.player.height;
  }

  async setPhoto(canvas, detect) {
    this.photoCanvas = canvas;
    this.player.face.setPhoto(canvas);
    let lm = null;
    if (detect) lm = await detectLandmarks(canvas);
    this.app.faceMode = 'photo';
    this.app.faceAdjust = { ...DEFAULT_ADJUST, ...(lm ? { eyeL: lm.eyeL, eyeR: lm.eyeR, mouth: lm.mouth } : {}) };
    this.app.beard = 'nenhuma';
    this.rebuildPlayer();
    const s = this.player.face.sampledSkin;
    if (s) { this.app.skin = '#' + s.getHexString(); this.rebuildPlayer(); }
    this._photoDirty = true;
  }

  async removePhoto() {
    this.photoCanvas = null; this.player.face.setPhoto(null);
    this.app.faceMode = 'default'; this.app.faceAdjust = null;
    await deletePhoto();
    this.rebuildPlayer();
  }

  async saveGame(withToast = false) {
    if (this._photoDirty && this.photoCanvas) {
      const blob = await canvasToBlob(this.photoCanvas);
      const ok = blob && await savePhoto(blob);
      if (!ok) toast('Não foi possível salvar a foto neste navegador (modo privado?). Ela vale só até fechar a página.', 'err', 6000);
      this._photoDirty = false;
    }
    this._persist();
    this.save = loadSave();
    if (withToast) toast('Personagem salvo neste aparelho.', 'ok');
  }

  _persist() {
    if (!this.app || !this.controller) return;
    const p = this.state === 'creator' && this._savedPos ? this._savedPos : { x: this.controller.pos.x, z: this.controller.pos.z, rotY: this.player.root.rotation.y };
    const ok = writeSave({ appearance: this.app, dialogue: this.dlgState.toJSON(), position: { x: +p.x.toFixed(2), z: +p.z.toFixed(2), rotY: +p.rotY.toFixed(3) } });
    if (!ok && !this._warnedSave) { this._warnedSave = true; toast('O navegador bloqueou o salvamento local. O progresso não será guardado.', 'err', 6000); }
  }

  // ---------- interface ----------
  _bindUI() {
    $$('#menu [data-act]').forEach(b => b.addEventListener('click', async () => {
      audio.unlock(); audio.click();
      const act = b.dataset.act;
      if (act === 'continue') this.play();
      if (act === 'new') {
        if (this.save?.appearance && !(await confirmDialog('Começar um novo jogo?', 'O personagem atual será substituído quando você salvar o novo.', 'Novo jogo'))) return;
        const keepPhoto = this.photoCanvas;
        this.app = defaultAppearance('m');
        if (keepPhoto) { this.photoCanvas = null; this.player.face.setPhoto(null); }
        this.rebuildPlayer();
        this.openCreator('new');
      }
      if (act === 'customize') this.openCreator('edit');
      if (act === 'settings') { this._settingsReturn = null; this.settingsUI.open(); }
      if (act === 'credits') show('credits');
    }));
    $$('#credits [data-close]').forEach(b => b.onclick = () => show('credits', false));
    $$('#pause [data-act]').forEach(b => b.addEventListener('click', async () => {
      audio.click();
      const act = b.dataset.act;
      if (act === 'resume') this.play();
      if (act === 'wardrobe') { show('pause', false); this.openCreator('wardrobe'); }
      if (act === 'settings') { show('pause', false); this._settingsReturn = () => show('pause'); this.settingsUI.open(); }
      if (act === 'save') { await this.saveGame(true); }
      if (act === 'fullscreen') toggleFullscreen();
      if (act === 'mainmenu') { await this.saveGame(); this.toMenu(); }
    }));
    $('#hudMenu').onclick = () => { audio.click(); this.pause(); };
    $('#hudWardrobe').onclick = () => { audio.click(); if (this.state === 'play') this.openCreator('wardrobe'); };
    $('#hudFull').onclick = () => toggleFullscreen();
    this.input.bindJoystick($('#joy'), $('#joyKnob'));
    $('#tRun').onclick = () => { this.input.runToggle = !this.input.runToggle; $('#tRun').classList.toggle('on', this.input.runToggle); };
    $('#tInteract').onclick = () => this._interact();
    this.hud.onPromptClick = () => this._interact();
    this.input.on('interact', () => this._interact());
    this.input.on('wardrobe', () => { if (this.state === 'play') this.openCreator('wardrobe'); });
    this.input.on('menu', () => {
      if (this.dialog.open) return;
      if (this.state === 'play') this.pause();
      else if (this.state === 'pause') this.play();
    });
    this.dialog.onClose = def => {
      const n = this.npcs.list.find(x => x.def === def);
      if (n) n.talking = false;
      this._talkingNpc = null;
      this._interactCooldown = 0.35;
      if (this.state === 'dialog') this.setState('play');
      this._persist();
    };
    this.dialog.onAction = (action) => {
      const n = this._talkingNpc;
      if (action === 'wave' && n) n.waveT = 2.2;
      if (action === 'dance' && n) { n.danceBoost = 5; this._playerDance = 5; }
      if (action === 'wardrobe') setTimeout(() => this.openCreator('wardrobe'), 50);
      if (action === 'bell') this._ringBell();
    };
    addEventListener('error', e => { if (!this._errShown) { this._errShown = true; console.error(e.error || e); toast('Ocorreu um erro, mas o jogo continua. Se algo parar, recarregue a página.', 'err', 5000); } });
  }

  _ringBell() {
    audio.bell();
    const b = this.world.ctx.bell;
    if (b) { this._bellT = 2; }
    toast('🔔 Blém-blém! A fila do almoço se formou em 3 segundos.');
  }

  _findInteraction() {
    const p = this.controller.pos;
    const npc = this.npcs.nearest(p, 2.6);
    let obj = null, bd = 1e9;
    for (const it of MAP.interactables) {
      const d = Math.hypot(p.x - it.x, p.z - it.z);
      if (d < it.r && d < bd) { bd = d; obj = it; }
    }
    if (npc) {
      const dn = Math.hypot(p.x - npc.ch.root.position.x, p.z - npc.ch.root.position.z);
      if (!obj || dn < bd) return { npc };
    }
    return obj ? { obj } : null;
  }

  _interact() {
    if (this.state !== 'play' || this.dialog.open || this._interactCooldown > 0) return;
    const f = this._findInteraction();
    if (!f) return;
    audio.unlock();
    if (f.npc) {
      const n = f.npc;
      n.talking = true; this._talkingNpc = n;
      // jogador vira para o NPC
      const p = this.controller.pos;
      this.player.root.rotation.y = Math.atan2(n.ch.root.position.x - p.x, n.ch.root.position.z - p.z);
      this.setState('dialog');
      this.dialog.start(n.def, this.dlgState, this.app, this.app.name);
    } else if (f.obj) {
      const o = f.obj;
      if (o.action === 'wardrobe') { this.openCreator('wardrobe'); return; }
      if (o.action === 'bell') { this._ringBell(); return; }
      this.setState('dialog');
      this.dialog.message(o.label, o.text);
    }
  }

  _applySettings(key) {
    const q = quality();
    if (key === 'fov' || key === '*') { this.camera.fov = settings.fov; this.camera.updateProjectionMatrix(); }
    if (key === 'quality' || key === '*') {
      this.world.setShadows(q.shadows, q.shadowSize);
      this.scene.fog.near = q.drawDistance * 0.6; this.scene.fog.far = q.drawDistance * 1.15;
      this._resize();
      toast('Qualidade aplicada. Grama e detalhes do mapa mudam ao recarregar a página.');
    }
  }

  _resize() {
    const w = innerWidth, h = innerHeight;
    const q = quality();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const portrait = h > w && w <= 820;
    let frac = 0;
    if (portrait) frac = 0.52;
    else if (h <= 520) frac = 0.5;
    else frac = Math.min(460, w * 0.42) / w;
    this.studio.setAspect(w, h, frac, portrait);
  }

  // ---------- laço ----------
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    try { this._update(dt); } catch (e) { if (!this._loopErr) { this._loopErr = true; console.error(e); } }
    try {
      if (this.state === 'creator') this.renderer.render(this.studio.scene, this.studio.camera);
      else this.renderer.render(this.scene, this.camera);
    } catch (e) { if (!this._renderErr) { this._renderErr = true; console.error(e); toast('Falha ao desenhar a cena.', 'err'); } }
  }

  _update(dt) {
    audio.update(dt);
    if (this._interactCooldown > 0) this._interactCooldown -= dt;
    if (this.state === 'creator') {
      const look = this.input.consumeLook(), zoom = this.input.consumeZoom();
      this.studio.update(dt, this.player, look, zoom);
      this.player.update(dt, { speed: 0 });
      return;
    }
    const pos = this.controller.pos;
    this.world.update(dt, this.t, pos);
    this.npcs.update(dt, pos, this.camera);
    if (this._bellT > 0 && this.world.ctx.bell) { this._bellT -= dt; this.world.ctx.bell.rotation.z = Math.sin(this._bellT * 14) * 0.4 * this._bellT; }

    if (this.state === 'menu') {
      // câmera cinematográfica lenta ao redor do personagem
      const a = this.t * 0.06;
      const c = pos;
      this.camera.position.set(c.x + Math.sin(a) * 7, c.y + 2.2 + Math.sin(this.t * 0.2) * 0.3, c.z + Math.cos(a) * 7);
      this.camera.lookAt(c.x, c.y + 1.2, c.z);
      this.player.update(dt, { speed: 0, wave: Math.sin(this.t * 0.25) > 0.93 });
      return;
    }

    if (this.state === 'play' || this.state === 'dialog' || this.state === 'pause') {
      const playing = this.state === 'play';
      const look = this.input.consumeLook(), zoom = this.input.consumeZoom();
      if (playing || this.state === 'dialog') this.cam.applyInput(look, zoom);
      const mv = playing ? this.input.getMoveVector() : { x: 0, y: 0, run: false };
      if (this.state !== 'pause') this.controller.update(dt, mv, this.cam, this.npcs.list);
      if (this._playerDance > 0) this._playerDance -= dt;
      this.player.update(dt, { speed: this.controller.speed, talk: this.state === 'dialog' && !!this._talkingNpc, dance: this._playerDance > 0 && this.controller.speed < 0.3 });
      this.cam.update(dt, pos, this.player.height);
      if (playing) {
        const f = this._findInteraction();
        this.hud.setPrompt(f ? (f.npc ? `Conversar com ${f.npc.def.name}` : f.obj.label) : null);
      } else this.hud.setPrompt(null);
      this.hud.update(dt, pos, this.player.root.rotation.y, this.cam.yaw, this.npcs.list, settings.showFps);
    }
  }
}

const game = new Game();
window.__game = game; // útil para depuração
game.init().catch(e => {
  console.error(e);
  show('loading', true);
  $('#loadText').textContent = 'Não foi possível iniciar o jogo: ' + (e.message || e) + '. Recarregue a página.';
});
