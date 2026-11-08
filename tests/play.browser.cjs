// 놀이터 자동 시험(브라우저 하나) — 부탁 카드 8장을 처음부터 끝까지(window.__playAuto = 지금 카드를 푸는 맞는 행동 하나)
//  확인: 8장 다 끝남 · 콘솔 오류 0 · 1366×768 스크롤 0
//  부탁 점 = 단추(잠금 X · 11-08): 저장소를 비운 채 8번째 점을 누르면 그 카드가 바로 열림 · 진행(play.card)은 끝낸 가장 큰 번호만 — 앞 부탁을 골라도 줄지 않음
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

    // ── 부탁 점 단추(잠금 X) ──
    const failBefore = fail;
    const solve = async () => {   // 지금 카드를 끝냄까지(끝나면 멈춤 — 다음 카드로 넘기지 않음)
      for (let i = 0; i < 150; i++) {
        const s = await page.evaluate(() => { const s = window.__playState(); if (!s.ok) window.__playAuto(); return s; });
        if (s.ok) return true;
        await page.waitForTimeout(200);
      }
      return false;
    };
    const look = () => page.evaluate(() => {
      const m = document.getElementById('main');
      return { s: window.__playState(), ls: localStorage.getItem('mn.play.card'),
        dots: [...document.querySelectorAll('.pc-dots button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), w: r.width, h: r.height, cls: b.className, cur: b.getAttribute('aria-current') }; }),
        scroll: Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth) };
    });
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '#/play');
    await page.waitForTimeout(900);
    let v = await look();
    if (v.dots.length !== 8 || !v.dots.every((d, k) => d.label === `부탁 ${k + 1}` && d.w >= 44 && d.h >= 44)) { fail++; console.log('✗ 부탁 점 — 단추 여덟 개 · aria-label \'부탁 n\' · 44px 이상이어야 함: ' + JSON.stringify(v.dots)); }
    if (v.s.card !== 1 || v.ls !== null) { fail++; console.log('✗ 부탁 점 — 빈 저장소면 부탁 1에서 시작 · 진행 저장 없음: ' + JSON.stringify({ s: v.s, ls: v.ls })); }
    await page.click('.pc-dots button[aria-label="부탁 8"]');
    await page.waitForTimeout(300);
    v = await look();
    if (v.s.card !== 8 || v.s.key !== 'make' || v.dots[7].cur !== 'step' || !/now/.test(v.dots[7].cls)) { fail++; console.log('✗ 부탁 점 — 8번째 점을 눌러도 부탁 8이 안 열림: ' + JSON.stringify({ s: v.s, dot8: v.dots[7] })); }
    if (v.ls !== null && Number(v.ls) !== 0) { fail++; console.log('✗ 부탁 점 — 열기만 했는데 진행이 바뀜: ' + v.ls); }
    if (v.scroll > 1) { fail++; console.log('✗ 부탁 점 — 부탁 8을 연 화면에 스크롤 ' + v.scroll); }
    if (!(await solve())) { fail++; console.log('✗ 부탁 점 — 바로 연 부탁 8을 못 끝냄 ' + JSON.stringify((await look()).s)); }
    v = await look();
    if (Number(v.ls) !== 8 || v.s.done !== 8) { fail++; console.log('✗ 부탁 점 — 부탁 8을 끝냈으면 진행 = 8: ' + JSON.stringify({ ls: v.ls, s: v.s })); }
    await page.click('.pc-dots button[aria-label="부탁 1"]');
    await page.waitForTimeout(300);
    v = await look();
    if (v.s.card !== 1 || v.s.key !== 'pitch' || Number(v.ls) !== 8) { fail++; console.log('✗ 부탁 점 — 부탁 1을 골랐더니 진행이 줄었거나 안 열림: ' + JSON.stringify({ ls: v.ls, s: v.s })); }
    if (!(await solve())) { fail++; console.log('✗ 부탁 점 — 다시 연 부탁 1을 못 끝냄'); }
    v = await look();
    if (Number(v.ls) !== 8) { fail++; console.log('✗ 부탁 점 — 부탁 1을 끝냈더니 진행이 8에서 줄어듦: ' + v.ls); }
    await page.reload();
    await page.waitForTimeout(900);
    v = await look();
    if (Number(v.ls) !== 8) { fail++; console.log('✗ 부탁 점 — 새로 열었더니 진행이 8이 아님: ' + v.ls); }
    if (errs.length && fail === failBefore) { fail++; console.log('✗ 부탁 점 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (fail === failBefore) console.log('✓ 부탁 점 — 단추 여덟(44px · \'부탁 n\') · 빈 저장소에서 8번째 점 → 부탁 8 · 끝내면 진행 8 · 부탁 1을 골라 끝내도 진행 8 그대로 · 스크롤 0');
  } finally { await browser.close(); server.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
