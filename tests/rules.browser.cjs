// 화면 규칙 검사기(11-08 토론 X1 · docs/ui.md) — 아이 화면마다:
//  ① 보이는 글자 18px 이상(SVG 글은 화면 배율을 곱함) ② 답 단추가 다른 것에 덮이지 않음(가운데를 누르면 그 단추)
//  ③ 보이는 주황(.go) 단추 하나 이하(지금 누를 것 하나) ④ 빈 칭찬 낱말 X(AI 슬롭 X)
//  선생님 화면(#/teacher · records · calib · speaker · credits · tv)은 글이 많아 ①을 보지 않음
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
const PRAISE = /대단해|최고야|최고예요|천재|완벽해|훌륭해|짱이|굉장해/;

// 페이지 안에서 — 지금 화면의 규칙 위반 목록
function audit() {
  const out = [];
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || e.hidden) return false; } return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const label = el => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase());
  // ① 글자 크기
  const tw = document.createTreeWalker(document.getElementById('main') || document.body, NodeFilter.SHOW_TEXT);
  const small = new Map();
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('[aria-hidden="true"]') || !vis(el)) continue;
    let px = parseFloat(getComputedStyle(el).fontSize);
    const svgT = el.closest('svg');
    if (svgT && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) px *= Math.hypot(m.a, m.b); }
    if (px < 17.5) { const k = label(el) + ' ' + px.toFixed(1) + 'px'; if (!small.has(k)) small.set(k, n.textContent.trim().slice(0, 16)); }
  }
  for (const [k, t] of small) out.push(`글자 ${k} "${t}"`);
  // ② 덮인 답 단추
  for (const b of document.querySelectorAll('.ans')) {
    if (!vis(b) || b.closest('.busy') || b.classList.contains('locked')) continue;
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (hit && !b.contains(hit) && !hit.closest('.overlay')) out.push(`덮인 답 단추 "${b.textContent.trim().slice(0, 12)}" ← ${label(hit)}`);   // 시작 카드 · 결과 같은 덮개는 일부러 덮음
  }
  // ③ 주황 단추
  const gos = [...document.querySelectorAll('.go')].filter(vis);
  if (gos.length > 1) out.push(`주황 단추 ${gos.length}개: ${gos.map(g => g.textContent.trim().slice(0, 8)).join(' · ')}`);
  return out;
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  let fail = 0;
  const bad = m => { fail++; console.log('✗ ' + m); }, ok = m => console.log('✓ ' + m);
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(base + '#/');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 } })); });
    const check = async (name, opts = {}) => {
      const v = await page.evaluate(audit);
      const txt = await page.evaluate(() => (document.getElementById('main') || document.body).innerText);
      if (PRAISE.test(txt)) v.push('빈 칭찬 낱말: ' + txt.match(PRAISE)[0]);
      const keep = opts.noFont ? v.filter(x => !x.startsWith('글자')) : v;
      if (keep.length) bad(`${name}: ${keep.join(' | ')}`); else ok(`${name} 규칙 지킴`);
    };
    for (const name of ['', 'map', 'tap', 'songs', 'play']) { await page.evaluate(n => { location.hash = '#/' + n; }, name); await page.waitForTimeout(900); await check('#/' + (name || '(처음)')); }
    // 이 기기 기록(선생님 화면 · 글자 크기 X) — 접힌 '자세히'를 열면 '두드림' 열(X4) · 예전 줄(t 없음)도 오류 없이 · 스크롤 0
    {
      const perr = [];
      const onErr = e => perr.push(String(e));
      page.on('pageerror', onErr);
      await page.evaluate(() => {
        localStorage.setItem('mn.prog', JSON.stringify({
          so3: { stars: 2 },
          ri2: { stars: 2, at: 3, hist: [{ at: 1, s: 1, k: 5, n: 8, tip: '예전 줄' }, { at: 2, s: 2, k: 6, n: 8, l: 0, tip: 'x', r: 'solo', t: { o: 12, sp: 40, m: 1, lat: 35, band: 'mid', bpm: 100 } }, { at: 3, s: 0, k: 0, n: 8, l: 0, tip: 'y', r: 'room', t: { o: null, sp: null, m: 12, lat: 0, band: 'low', bpm: 92 } }] },
          ri1: { stars: 1, at: 4, hist: [{ at: 4, s: 1, k: 13, n: 24, l: null, tip: 'z', r: 'solo', t: { o: -8, sp: 22, m: 11, lat: 0, band: 'mid', bpm: 84 } }] },
        }));
        location.hash = '#/records';
      });
      await page.waitForTimeout(700);
      const hid = await page.evaluate(() => getComputedStyle(document.querySelector('.rec-table td.rec-tap')).display);
      await page.click('.rec-more summary');
      await page.waitForTimeout(200);
      const rec = await page.evaluate(() => ({
        shown: getComputedStyle(document.querySelector('.rec-table th.rec-tap')).display !== 'none',
        head: document.querySelector('.rec-table th.rec-tap').textContent,
        cells: [...document.querySelectorAll('.rec-table td.rec-tap')].map(e => e.textContent).filter(x => x !== '—'),
        scroll: Math.max(document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth, (m => m.scrollHeight - m.clientHeight)(document.getElementById('main'))),
      }));
      const want = ['-8ms · 퍼짐 22 · 놓침 11', '맞힌 두드림 없음 · 놓침 12', '+12ms · 퍼짐 40 · 놓침 1'];
      if (hid !== 'none' || !rec.shown || rec.head !== '두드림' || rec.cells.join('|') !== want.join('|') || rec.scroll > 1 || perr.length) bad('기록 화면 두드림 열: ' + JSON.stringify({ hid, ...rec, perr }));
      else ok(`기록 화면 — 자세히를 열면 '두드림' 열(${rec.cells.join(' · ')}) · 스크롤 0`);
      await check('#/records 자세히', { noFont: true });
      page.off('pageerror', onErr);
      await page.evaluate(() => localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 } })));
    }
    // 칸마다 보기 · 연습 · 확인 게임 첫 판 · 결과
    for (const id of ['so3', 'so4', 'so5', 'sem1', 'ga1', 'ga2', 'ga3', 'ri2', 'ri4', 'ri5', 'ri6', 'jd1', 'ak1', 'ak2']) {
      await page.evaluate(i => { window.__cellResult = null; location.hash = '#/cell/' + i; }, id);
      await page.waitForTimeout(800);
      await check(`${id} 보기`);
      await page.evaluate(i => { location.hash = `#/cell/${i}/follow`; }, id);
      await page.waitForTimeout(1500);
      await check(`${id} 연습`);
      await page.evaluate(i => { location.hash = `#/cell/${i}/game`; }, id);
      await page.waitForTimeout(800);
      await check(`${id} 시작 카드`);
      let res = null;
      for (let k = 0; k < 700 && !res; k++) {
        res = await page.evaluate(() => (window.__cellResult ? 1 : (window.__cellAuto && window.__cellAuto(), null)));
        if (!res) await page.waitForTimeout(160);
      }
      await page.waitForTimeout(1800);
      await check(`${id} 결과`);
    }
  } catch (e) { bad(String(e && e.stack || e)); }
  await browser.close(); server.close();
  console.log(fail ? `✗ 화면 규칙 실패 ${fail}` : '✓ 화면 규칙 통과');
  process.exit(fail ? 1 : 0);
})();
