// Motor de diálogos: interpreta a estrutura de nós definida em npcData.js.
import { findItem } from '../character/wardrobe.js';

export class DialogueState {
  constructor(save) {
    this.flags = new Set(save?.flags || []);
    this.visits = { ...(save?.visits || {}) };
  }
  toJSON() { return { flags: [...this.flags], visits: this.visits }; }
}

function outfitTags(app) {
  const tags = new Set();
  for (const slot of ['top', 'outer', 'bottom', 'dress', 'neck', 'shoes']) {
    const it = findItem(slot, app[slot]);
    if (it && it.tags) it.tags.forEach(t => tags.add(t));
  }
  return tags;
}

export function checkCond(cond, ctx) {
  if (!cond) return true;
  if (cond.flag && !ctx.state.flags.has(cond.flag)) return false;
  if (cond.notFlag && ctx.state.flags.has(cond.notFlag)) return false;
  if (cond.visits && (ctx.state.visits[ctx.npcId] || 0) < cond.visits) return false;
  if (cond.outfitTag) {
    const tags = outfitTags(ctx.playerApp);
    const want = Array.isArray(cond.outfitTag) ? cond.outfitTag : [cond.outfitTag];
    if (!want.some(t => tags.has(t))) return false;
  }
  return true;
}

export class Conversation {
  constructor(npcDef, state, playerApp) {
    this.def = npcDef; this.state = state;
    this.ctx = { state, npcId: npcDef.id, playerApp };
    state.visits[npcDef.id] = (state.visits[npcDef.id] || 0) + 1;
    const entry = (npcDef.dialogue.entry || [{ node: 'start' }]).find(e => checkCond(e.if, this.ctx));
    this.nodeId = entry ? entry.node : 'start';
  }
  get node() { return this.def.dialogue.nodes[this.nodeId]; }
  text(playerName) {
    const t = this.node?.text;
    const s = Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : (t || '...');
    return s.replaceAll('{jogador}', playerName || 'visitante');
  }
  options() {
    const opts = (this.node?.options || []).filter(o => checkCond(o.if, this.ctx));
    return opts.length ? opts : [{ label: 'Tchau!', end: true }];
  }
  // Escolhe uma opção. Retorna { ended, action }.
  choose(opt) {
    if (opt.set) this.state.flags.add(opt.set);
    if (opt.end || !opt.next || !this.def.dialogue.nodes[opt.next]) return { ended: true, action: opt.action };
    this.nodeId = opt.next;
    return { ended: false, action: opt.action };
  }
}
