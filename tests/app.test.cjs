// 앱 시험(브라우저 하나) — 화면마다 콘솔 오류 0 · 크롬북 가로 1366×768에서 스크롤 0 · 징검다리 자동 연주가 별 셋
//  playwright는 이 저장소에 없으면 school-metaverse 것을 빌려 쓴다(설치 X). 브라우저는 하나만 띄우고 끝나면 닫는다.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  const bad = (m) => { fail++; console.log('✗ ' + m); };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    for (const name of ['', 'map', 'tap', 'songs', 'play', 'lab', 'lab/len', 'lab/meter', 'form', 'jang', 'teacher', 'find', 'find/박자', 'records', 'tv', 'calib', 'speaker', 'credits']) {
      errs.length = 0;
      await page.goto(base + '#/' + name);
      await page.waitForTimeout(900);
      const scroll = await page.evaluate(() => {
        const m = document.getElementById('main');
        return { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight, x: document.documentElement.scrollWidth - innerWidth };
      });
      const scrolled = scroll.page > 1 || scroll.x > 1 || (name !== 'credits' && scroll.main > 1);
      if (errs.length) bad(`#/${name} 콘솔 오류: ${errs.join(' | ')}`);
      if (scrolled) bad(`#/${name} 스크롤 생김 ${JSON.stringify(scroll)}`);
      if (!errs.length && !scrolled) console.log(`✓ #/${name || '(처음)'} 오류 0 · 스크롤 0`);
    }
    // TV로 다같이 — 높게·낮게를 시범 → 몸으로 → 반 전체 게임 → 예측까지(아이 기록에는 안 남음)
    {
      errs.length = 0;
      await page.evaluate(() => { localStorage.clear(); window.__cellResult = null; });
      await page.goto(base + '#/tvcell/so4');
      await page.waitForTimeout(700);
      let done = null;
      for (let k = 0; k < 700 && !done; k++) {
        done = await page.evaluate(() => { if (window.__cellResult) return { r: window.__cellResult, g: document.querySelector('.tvg-text')?.textContent || '', prog: localStorage.getItem('mn.prog') }; window.__cellAuto && window.__cellAuto(); return null; });
        if (!done) await page.waitForTimeout(160);
      }
      if (!done || done.r.stars !== 3 || !done.g.includes('높이면') || done.prog) bad('TV 높게·낮게: ' + JSON.stringify(done && { stars: done.r.stars, g: done.g, prog: done.prog }));
      else if (errs.length) bad('TV 콘솔 오류: ' + errs.join(' | '));
      else console.log('✓ TV로 다같이 높게·낮게 — 끝까지 · 예측 발문 · 아이 기록 안 남김');
    }
    // 징검다리 자동 연주 — 박마다 ±15ms 흔들어 두드림 → 별 셋이어야
    await page.goto(base + '#/tap');
    await page.waitForTimeout(500);
    await page.click('button.go.huge');
    const r = await page.evaluate(async () => {
      const plan = window.__tapPlan, river = document.querySelector('.river'), bs = plan.beats();
      bs.forEach((t, i) => setTimeout(() => river.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })), Math.max(0, t - performance.now() + (i % 3 - 1) * 15)));
      const end = bs[bs.length - 1] + 2600;
      while (performance.now() < end) await new Promise(z => setTimeout(z, 200));
      const x = window.__tapResult;
      return x && { kept: x.kept, total: x.total, great: x.great, stars: x.stars };
    });
    if (!r || r.stars !== 3 || r.kept !== r.total) bad('징검다리 자동 연주: ' + JSON.stringify(r));
    else console.log(`✓ 징검다리 자동 연주 ${r.kept}/${r.total} · 딱 ${r.great} · 별 ${r.stars}`);
  } finally {
    await browser.close();
    server.close();
  }
  if (fail) { console.log(`✗ 앱 시험 실패 ${fail}`); process.exit(1); }
  console.log('✓ 앱 시험 통과');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
