// Feed de notícias do Radar, lido direto dos sites (sem serviço intermediário).
// GET /api/news?cat=cripto|acoes → [{title, link, src, t}] mais recentes primeiro.
// A resposta fica 2 minutos no cache do Netlify: muitos visitantes = poucas leituras dos sites.
const FEEDS = {
  cripto: [
    ["Livecoins", "https://livecoins.com.br/feed/"],
    ["Portal do Bitcoin", "https://portaldobitcoin.uol.com.br/feed/"],
    ["Investing Brasil", "https://br.investing.com/rss/news_301.rss"],
    ["BeInCrypto Brasil", "https://br.beincrypto.com/feed/"],
    ["Money Times", "https://www.moneytimes.com.br/criptomoedas/feed/"],
  ],
  acoes: [
    ["Money Times", "https://www.moneytimes.com.br/feed/"],
    ["InfoMoney", "https://www.infomoney.com.br/feed/"],
    ["Seu Dinheiro", "https://www.seudinheiro.com/feed/"],
    ["Investing Brasil", "https://br.investing.com/rss/news_25.rss"],
  ],
};

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
  .replace(/\s+/g, " ").trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? decode(m[1]) : ""; };

async function readFeed([src, url]) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (RadarAlcantara; +https://radaralcantara.com.br)", accept: "application/rss+xml, application/xml, text/xml" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return xml.split(/<item[\s>]/i).slice(1).slice(0, 25).map((it) => {
      const link = tag(it, "link") || tag(it, "guid");
      const t = Date.parse(tag(it, "pubDate") || tag(it, "dc:date"));
      return { title: tag(it, "title"), link, src, t };
    }).filter((i) => i.title && /^https?:\/\//.test(i.link) && !isNaN(i.t));
  } catch { return []; } finally { clearTimeout(timer); }
}

export default async (req) => {
  const cat = new URL(req.url).searchParams.get("cat") === "acoes" ? "acoes" : "cripto";
  const lists = await Promise.all(FEEDS[cat].map(readFeed));
  const seen = new Set();
  const now = Date.now() + 10 * 60e3;
  // Fora: resumos de fechamento de bolsas estrangeiras do Investing ("Polônia - Ações fecharam o pregão...").
  const RUIDO = /^[^-–]{2,40}\s[-–]\s(Ações|Acoes)\s(fecharam|encerraram|terminaram)/i;
  const items = lists.flat()
    .filter((i) => !RUIDO.test(i.title))
    .filter((i) => i.t <= now && !seen.has(i.title.toLowerCase()) && seen.add(i.title.toLowerCase()))
    .sort((a, b) => b.t - a.t).slice(0, 30);
  return Response.json({ cat, n: items.length, items }, {
    headers: {
      "cache-control": "public, max-age=60",
      "netlify-cdn-cache-control": items.length ? "public, durable, s-maxage=120, stale-while-revalidate=600" : "no-store",
    },
  });
};

export const config = { path: "/api/news" };
