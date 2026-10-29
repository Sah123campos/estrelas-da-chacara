// Tela de configurações (gráficos, áudio, câmera, dados salvos).
import { $, show, el, confirmDialog, toast } from './common.js';
import { settings, setSetting } from '../core/settings.js';
import { deleteAll } from '../save/storage.js';
import { audio } from '../core/audio.js';

export function initSettingsUI({ onClose, onDeleted }) {
  const grid = $('#settingsGrid');
  const row = (label, help, control) => el('div', { class: 'set-row' }, el('label', {}, label, help ? el('small', {}, help) : null), control);
  const seg = (key, options) => {
    const box = el('div', { class: 'seg' });
    for (const [v, txt] of options) {
      const b = el('button', { class: settings[key] === v ? 'on' : '' }, txt);
      b.onclick = () => { setSetting(key, v); [...box.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); audio.click(); };
      box.append(b);
    }
    return box;
  };
  const range = (key, min, max, step) => {
    const i = el('input', { type: 'range', min, max, step, value: settings[key] });
    i.oninput = () => setSetting(key, parseFloat(i.value));
    return i;
  };
  const check = key => {
    const i = el('input', { type: 'checkbox' }); i.checked = !!settings[key];
    i.onchange = () => setSetting(key, i.checked);
    return i;
  };
  const build = () => {
    grid.innerHTML = '';
    grid.append(
      row('Qualidade gráfica', 'Baixa é ideal para celulares mais simples', seg('quality', [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']])),
      row('Volume geral', null, range('volume', 0, 1, 0.05)),
      row('Sons do ambiente', 'Pássaros e vento', range('ambience', 0, 1, 0.05)),
      row('Sensibilidade da câmera', null, range('camSensitivity', 0.3, 2.5, 0.1)),
      row('Inverter eixo vertical', null, check('invertY')),
      row('Campo de visão', null, range('fov', 45, 85, 1)),
      row('Travar o mouse na câmera', 'Clique no jogo para travar; Esc libera', check('pointerLock')),
      row('Mostrar FPS', null, check('showFps')),
    );
  };
  build();
  $('#btnSettingsClose').onclick = () => { audio.click(); show('settings', false); onClose?.(); };
  $('#btnDeleteData').onclick = async () => {
    const ok = await confirmDialog('Excluir dados salvos?', 'Isso apaga o personagem, a foto do rosto, o progresso e as configurações deste aparelho.', 'Excluir tudo');
    if (!ok) return;
    await deleteAll();
    toast('Dados excluídos.', 'ok');
    onDeleted?.();
  };
  return { open() { build(); show('settings'); } };
}
