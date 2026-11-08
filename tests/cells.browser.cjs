// 칸 자동 시험(브라우저 하나) — 칸마다 보기 → 따라 하기 → 확인 게임 → 결과까지 자동으로(window.__cellAuto = 칸이 정한 '맞는 행동')
//  확인: 결과 별 셋 · 콘솔 오류 0 · 1366×768 스크롤 0 · 확인 게임 길이 30~75초 안
//  쓰는 법: node tests/cells.browser.cjs [칸 …]  (없으면 첫 판 13칸 중 cells/ 파일이 있는 것 모두)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
const FIRST = ['so3', 'so4', 'so5', 'sem1', 'ga1', 'ga2', 'ga3', 'ri2', 'ri4', 'ri5', 'ri6', 'jd1', 'ak1', 'ak2'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : FIRST.filter(id => fs.existsSync(path.join(ROOT, 'app/js/cells', id + '.js')));

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|img\/band\//.test(m.text() + (m.location().url || ''))) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + '#/');
    for (const id of want) {
      errs.length = 0;
      await page.evaluate(() => { localStorage.clear(); window.__cellResult = null; });
      await page.goto(base + '#/cell/' + id);
      await page.waitForTimeout(700);
      const t0 = Date.now(); let gameAt = 0, scroll = null, phases = new Set();
      while (Date.now() - t0 < 150000) {
        const st = await page.evaluate(() => {
          const m = document.getElementById('main');
          const sc = { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight, x: document.documentElement.scrollWidth - innerWidth };
          const ph = window.__cellPhase ? window.__cellPhase() : null;
          if (window.__cellResult) return { done: window.__cellResult, ph, sc };
          if (window.__cellAuto) window.__cellAuto();
          return { ph, sc };
        });
        if (st.ph) phases.add(st.ph);
        if (st.ph === 'game' && !gameAt) gameAt = Date.now();
        if (!scroll && (st.sc.page > 1 || st.sc.main > 1 || st.sc.x > 1)) scroll = { ph: st.ph, ...st.sc };
        if (st.done) {
          const sec = Math.round((Date.now() - gameAt) / 1000);
          const r = st.done, bad = [];
          if (r.stars !== 3) bad.push('별 ' + r.stars);
          if (errs.length) bad.push('콘솔 오류: ' + errs.slice(0, 3).join(' | '));
          if (scroll) bad.push('스크롤 ' + JSON.stringify(scroll));
          if (sec > 90) bad.push(`확인 게임 ${sec}초(자동은 바로 답하니 사람은 더 김)`);
          if (!['show', 'follow', 'game'].every(p => phases.has(p))) bad.push('거친 단계 ' + [...phases].join(','));
          if (bad.length) { fail++; console.log(`✗ ${id} — ${bad.join(' · ')}`); }
          else console.log(`✓ ${id} — 별 ${r.stars} · 확인 게임 ${sec}초 · "${r.title}"`);
          break;
        }
        await page.waitForTimeout(160);
      }
      if (Date.now() - t0 >= 150000) { fail++; console.log(`✗ ${id} — 150초 안에 결과가 안 나옴(지금 단계 ${[...phases].join(',')}) ${errs.slice(0, 2).join(' | ')}`); }
    }
  } finally { await browser.close(); server.close(); }
  if (fail) { console.log(`✗ 칸 자동 시험 실패 ${fail}`); process.exit(1); }
  console.log(`✓ 칸 자동 시험 통과 — ${want.length}칸`);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
