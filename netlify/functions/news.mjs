// Notícias compartilhadas pelo botão "Compartilhar" do Radar.
// POST /api/n  {id, title, link, src, t}  → guarda a notícia (só de fontes conhecidas)
// GET  /api/n?id=xxxx                     → devolve a notícia, para o link radaralcantara.com.br/?n=xxxx continuar funcionando
import { getStore } from "@netlify/blobs";

const FONTES = ["livecoins.com.br", "portaldobitcoin.uol.com.br", "investing.com", "moneytimes.com.br", "infomoney.com.br", "seudinheiro.com", "beincrypto.com", "cointelegraph.com", "coindesk.com", "theblock.co", "decrypt.co", "reuters.com", "bloomberg.com", "bloomberglinea.com.br", "bloomberglinea.com", "cnbc.com", "ft.com", "wsj.com", "valor.globo.com", "cryptoslate.com", "dlnews.com", "blockworks.co", "bitcoinmagazine.com", "theguardian.com", "apnews.com", "exame.com", "estadao.com.br", "folha.uol.com.br", "g1.globo.com", "cnnbrasil.com.br", "investnews.com.br"];
const okLink = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /^https?:$/.test(new URL(u).protocol) && FONTES.some((f) => h === f || h.endsWith("." + f)); } catch { return false; } };
const txt = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

export default async (req) => {
  const store = getStore("radar-news");
  if (req.method === "POST") {
    let b = {};
    try { b = await req.json(); } catch {}
    const id = txt(b.id, 16);
    if (!/^[a-z0-9]{3,16}$/.test(id) || !okLink(b.link) || !txt(b.title, 300)) return new Response("inválido", { status: 400 });
    if (!(await store.get(id))) await store.setJSON(id, { title: txt(b.title, 300), link: String(b.link).slice(0, 600), src: txt(b.src, 40), t: Number(b.t) || Date.now() });
    return new Response("ok");
  }
  const id = new URL(req.url).searchParams.get("id") || "";
  const n = /^[a-z0-9]{3,16}$/.test(id) ? await store.get(id, { type: "json" }) : null;
  return n ? Response.json(n, { headers: { "cache-control": "public, max-age=3600" } }) : new Response("não encontrada", { status: 404 });
};

export const config = { path: "/api/n" };
