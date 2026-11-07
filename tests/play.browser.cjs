// 놀이터 자동 시험(브라우저 하나) — 부탁 카드 8장을 처음부터 끝까지(window.__playAuto = 지금 카드를 푸는 맞는 행동 하나)
//  확인: 8장 다 끝남 · 콘솔 오류 0 · 1366×768 스크롤 0
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + '#/');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.play.card', '0'); });
    await page.goto(base + '#/play');
    await page.waitForTimeout(900);
    const t0 = Date.now(); let st = null, scroll = null;
    while (Date.now() - t0 < 150000) {
      st = await page.evaluate(() => {
        const m = document.getElementById('main');
        const sc = { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight, x: document.documentElement.scrollWidth - innerWidth };
        const s = window.__playState ? window.__playState() : null;
        if (s && !s.all && window.__playAuto) window.__playAuto();
        return { s, sc };
      });
      if (!scroll && (st.sc.page > 1 || st.sc.main > 1 || st.sc.x > 1)) scroll = st.sc;
      if (st.s && st.s.all) break;
      await page.waitForTimeout(200);
    }
    const sec = Math.round((Date.now() - t0) / 1000);
    if (!st.s || !st.s.all) { fail++; console.log(`✗ 놀이터 — ${sec}초 안에 8장을 못 끝냄(지금 ${JSON.stringify(st.s)})`); }
    if (errs.length) { fail++; console.log('✗ 놀이터 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (scroll) { fail++; console.log('✗ 놀이터 스크롤 ' + JSON.stringify(scroll)); }
    if (!fail) console.log(`✓ 놀이터 — 부탁 카드 8장 끝까지 · ${sec}초 · 오류 0 · 스크롤 0`);
  } finally { await browser.close(); server.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
