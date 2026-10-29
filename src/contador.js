// Contador de acessos: conta quantas vezes o jogo foi aberto e quantas pessoas
// (aparelhos) diferentes jogaram. Envia só um "+1" para um serviço público de
// contagem — nenhum dado pessoal, nome ou foto sai do aparelho.
// Para ver os números: abra os Créditos no jogo, ou os endereços de LEITURA no README.
const ESPACO = "estrelas-da-chacara-sah123campos";
const CHAVE_PESSOA = "chacara.contado.v1";

const SERVICOS = [
  {
    nome: "abacus",
    url: (acao, chave) => `https://abacus.jasoncameron.dev/${acao === "mais" ? "hit" : "get"}/${ESPACO}/${chave}`,
    valor: (j) => j.value,
  },
  {
    nome: "counterapi",
    url: (acao, chave) => `https://api.counterapi.dev/v1/${ESPACO}/${chave}${acao === "mais" ? "/up" : ""}`,
    valor: (j) => j.count,
  },
];

async function pedir(acao, chave) {
  for (const s of SERVICOS) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(s.url(acao, chave), { signal: ctl.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      clearTimeout(t);
      if (!r.ok) continue;
      const v = s.valor(await r.json());
      if (typeof v === "number") return v;
    } catch { /* tenta o próximo serviço */ }
  }
  return null;
}

let resultado = null;

// Conta esta visita (uma vez por carregamento) e devolve { acessos, pessoas }.
export function contarVisita() {
  if (resultado) return resultado;
  resultado = (async () => {
    if (location.protocol === "file:" || /^(localhost|127\.)/.test(location.hostname)) return null; // testes locais não contam
    let nova = false;
    try { nova = !localStorage.getItem(CHAVE_PESSOA); } catch { /* sem armazenamento */ }
    const [acessos, pessoas] = await Promise.all([pedir("mais", "acessos"), pedir(nova ? "mais" : "ler", "pessoas")]);
    if (nova && pessoas !== null) { try { localStorage.setItem(CHAVE_PESSOA, String(Date.now())); } catch { /* ok */ } }
    if (acessos === null && pessoas === null) return null;
    return { acessos, pessoas };
  })();
  return resultado;
}

export const ENDERECOS_LEITURA = {
  acessos: `https://abacus.jasoncameron.dev/get/${ESPACO}/acessos`,
  pessoas: `https://abacus.jasoncameron.dev/get/${ESPACO}/pessoas`,
};

// Envia o NOME do jogador e a SITUAÇÃO ("Entrou" ou "Finalizou") para o Formulário Google
// do organizador. Cada envio = uma linha com data e hora na planilha.
// "Entrou": toda vez que a pessoa começa a jogar (espera 5 min para não contar recarga rápida).
// "Finalizou": quando descobre o tema (uma vez por nome em cada aparelho).
const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSeCihUJv2HxXsUFlpRNNkiwDaSXlPKDjP3hjLRiTB-cJkZ0Fg/formResponse";
const CAMPO_NOME = "entry.1125356489";
const CAMPO_SITUACAO = "entry.1024219460";
const CHAVE_NOME = "chacara.nomeEnviado.v3";

export function enviarNome(nome, situacao = "Entrou") {
  nome = (nome || "").trim();
  if (!nome || location.protocol === "file:" || /^(localhost|127\.)/.test(location.hostname)) return;
  let reg = {};
  try { reg = JSON.parse(localStorage.getItem(CHAVE_NOME) || "{}"); } catch { /* segue */ }
  const k = `${situacao}:${nome}`;
  if (situacao === "Finalizou" && reg[k]) return;
  if (situacao === "Entrou" && Date.now() - (reg[k] || 0) < 5 * 60 * 1000) return;
  const dados = new URLSearchParams({ [CAMPO_NOME]: nome.slice(0, 60), [CAMPO_SITUACAO]: situacao });
  fetch(FORM, { method: "POST", mode: "no-cors", body: dados, credentials: "omit", referrerPolicy: "no-referrer" })
    .then(() => { reg[k] = Date.now(); try { localStorage.setItem(CHAVE_NOME, JSON.stringify(reg)); } catch { /* ok */ } })
    .catch(() => { /* sem internet: tenta na próxima vez */ });
}
