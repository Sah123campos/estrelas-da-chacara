// Motor de diálogos: interpreta a estrutura de nós definida em src/dados/npcs.js.
import { pecaDe } from "../dados/guardaroupa.js";

export class EstadoHistoria {
  constructor(salvo) {
    this.flags = new Set(salvo?.flags || []);
    this.visitas = { ...(salvo?.visitas || {}) };
  }
  toJSON() {
    return { flags: [...this.flags], visitas: this.visitas };
  }
}

function gruposVestidos(ap) {
  const g = new Set();
  for (const slot of ["cima", "casaco", "baixo", "vestido", "pescoco", "calcado", "chapeu", "oculos", "mao"]) {
    const p = pecaDe(ap, slot);
    if (p?.grupo) g.add(p.grupo);
  }
  return g;
}

export function condicao(c, ctx) {
  if (!c) return true;
  if (c.flag && !ctx.estado.flags.has(c.flag)) return false;
  if (c.notFlag && ctx.estado.flags.has(c.notFlag)) return false;
  if (c.visits && (ctx.estado.visitas[ctx.npcId] || 0) < c.visits) return false;
  if (c.outfitTag) {
    const g = gruposVestidos(ctx.ap);
    const quer = Array.isArray(c.outfitTag) ? c.outfitTag : [c.outfitTag];
    if (!quer.some((t) => g.has(t))) return false;
  }
  return true;
}

export class Conversa {
  constructor(npc, estado, ap) {
    this.def = npc;
    this.estado = estado;
    this.ctx = { estado, npcId: npc.id, ap };
    estado.visitas[npc.id] = (estado.visitas[npc.id] || 0) + 1;
    const ent = (npc.dialogo.entry || [{ node: "start" }]).find((e) => condicao(e.if, this.ctx));
    this.no = ent ? ent.node : "start";
  }
  get node() {
    return this.def.dialogo.nodes[this.no];
  }
  texto(nome) {
    const t = this.node?.text;
    const s = Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : t || "...";
    return s.replaceAll("{jogador}", nome || "visitante");
  }
  opcoes() {
    const o = (this.node?.options || []).filter((op) => condicao(op.if, this.ctx));
    return o.length ? o : [{ label: "Tchau!", end: true }];
  }
  escolher(op) {
    if (op.set) this.estado.flags.add(op.set);
    if (op.end || !op.next || !this.def.dialogo.nodes[op.next]) return { fim: true, acao: op.action, set: op.set };
    this.no = op.next;
    return { fim: false, acao: op.action, set: op.set };
  }
}
