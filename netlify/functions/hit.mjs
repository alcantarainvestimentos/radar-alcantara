// Contador de visitas do Radar (sem cookies e sem guardar IP).
// A página manda um "ping" por visualização; aqui somamos por dia (horário de Brasília).
import { getStore } from "@netlify/blobs";

const dia = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const limpa = (s, n = 60) => String(s || "").toLowerCase().replace(/[^a-z0-9.\-_/]/g, "").slice(0, n);
const soma = (obj, k) => { if (k) obj[k] = (obj[k] || 0) + 1; };

export default async (req, context) => {
  if (req.method !== "POST") return new Response("ok");
  let b = {};
  try { b = await req.json(); } catch {}
  const store = getStore("radar-stats");
  const key = dia();
  const d = (await store.get(key, { type: "json" })) || { views: 0, visitors: 0, refs: {}, countries: {}, devices: {}, hours: {} };
  d.views++;
  if (b.n === 1) d.visitors++;
  soma(d.refs, limpa(b.r) || "direto");
  soma(d.countries, limpa(context.geo?.country?.code, 4) || "??");
  soma(d.devices, b.m === 1 ? "celular" : "computador");
  soma(d.hours, String(new Date(Date.now() - 3 * 3600e3).getUTCHours()).padStart(2, "0"));
  await store.setJSON(key, d);
  return new Response("ok");
};

export const config = { path: "/api/hit" };
