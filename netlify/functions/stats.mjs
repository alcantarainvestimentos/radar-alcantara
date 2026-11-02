// Painel de visitas do Radar: /api/stats?key=SENHA (a senha fica na variável de ambiente STATS_KEY do Netlify).
import { getStore } from "@netlify/blobs";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const top = (o, n = 6) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(" · ") || "—";

export default async (req) => {
  const url = new URL(req.url);
  if (!process.env.STATS_KEY || url.searchParams.get("key") !== process.env.STATS_KEY)
    return new Response("Acesso negado", { status: 401 });
  const store = getStore("radar-stats");
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 30);
  const dias = await Promise.all(keys.map(async (k) => [k, await store.get(k, { type: "json" })]));
  if (url.searchParams.get("format") === "json") return Response.json(Object.fromEntries(dias));
  const tot = dias.reduce((a, [, d]) => ({ v: a.v + d.views, u: a.u + d.visitors }), { v: 0, u: 0 });
  const linhas = dias.map(([k, d]) => `<tr><td>${k.split("-").reverse().join("/")}</td><td>${d.visitors}</td><td>${d.views}</td><td>${top(d.refs)}</td><td>${top(d.devices)}</td><td>${top(d.countries, 4)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Visitas · Radar Alcantara</title><link rel="icon" href="/favicon.png">
<style>body{margin:0;padding:24px 16px;background:#0b0a08;color:#ece4d2;font:15px/1.5 system-ui,sans-serif}h1{font:400 30px Georgia,serif;color:#c9a54a;margin:0 0 4px}p{color:#8f8571;margin:0 0 20px}.k{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}.k div{border:1px solid #3a3222;padding:12px 16px;min-width:140px}.k b{display:block;font-size:26px;color:#c9a54a}.w{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:640px}td,th{border-bottom:1px solid #2a251b;padding:8px;text-align:left;vertical-align:top}th{color:#8f8571;font-weight:500}td b{color:#c9a54a}</style></head><body>
<h1>Visitas do Radar</h1><p>Últimos ${dias.length} dias · contagem própria, sem cookies e sem guardar IP · visitante = navegador diferente no dia</p>
<div class="k"><div>Visitantes<b>${tot.u}</b></div><div>Visualizações<b>${tot.v}</b></div><div>Hoje<b>${dias[0]?.[1]?.visitors ?? 0}</b></div></div>
<div class="w"><table><tr><th>Dia</th><th>Visitantes</th><th>Visualizações</th><th>De onde vieram</th><th>Aparelho</th><th>País</th></tr>${linhas || '<tr><td colspan="6">Ainda sem visitas registradas.</td></tr>'}</table></div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/api/stats" };
