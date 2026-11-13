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
          so4: { stars: 1, at: 7, hist: [{ at: 5, s: 1, k: 7, n: 12, l: 0, tip: 'a', r: 'solo' }, { at: 6, s: 0, k: 3, n: 12, l: 0, tip: 'b', r: 'solo' }, { at: 7, s: 0, k: 2, n: 12, l: 1, tip: 'c', r: 'solo' }] },   // 별 0이 두 번 이어짐(X11) · ri2는 한 번뿐
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
      // 별 0이 두 번 넘게 이어진 칸에만 표시(X11 · 솜씨 판 X — 그 칸 줄에 글 한 줄)
      const zero = await page.evaluate(() => [...document.querySelectorAll('.rec-zero')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent, row: (e.closest('tr') || e.parentElement).textContent.replace(/\s+/g, ' ').slice(0, 40), fit: r.width > 1 && r.right <= innerWidth && r.bottom <= innerHeight, px: parseFloat(getComputedStyle(e).fontSize) }; }));
      if (zero.length !== 1 || zero[0].t !== '별 0이 2번 이어졌어요' || !zero[0].fit || zero[0].px < 17.5 || perr.length) bad('기록 화면 별 0 이어짐 표시: ' + JSON.stringify({ zero, perr }));
      else ok(`기록 화면 — 별 0이 이어진 칸에만 "${zero[0].t}" 한 줄(${zero[0].row.slice(0, 18)}…) · 한 번뿐인 칸엔 없음`);
      page.off('pageerror', onErr);
      await page.evaluate(() => localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 } })));
    }
    // 별 0 결과(X11) — 듣는 칸(so4)엔 흰 단추 '헷갈리는 두 소리 듣기' · 소리 카드 둘 · 결과 보기로 돌아옴 / 듣는 칸이 아닌 ak2엔 그 단추 없음
    {
      const perr = [];
      const onErr = e => perr.push(String(e));
      const onCon = m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) perr.push(m.text()); };
      page.on('pageerror', onErr); page.on('console', onCon);
      const lose = async id => {                       // 확인 게임을 일부러 다 틀림(window.__cellAuto(true))
        await page.evaluate(i => { window.__cellResult = null; location.hash = `#/cell/${i}/game`; }, id);
        await page.waitForTimeout(800);
        let res = null;
        for (let k = 0; k < 700 && !res; k++) {
          res = await page.evaluate(() => (window.__cellResult ? { stars: window.__cellResult.stars, k: (window.__cellResult.replay || []).filter(Boolean).length } : (window.__cellAuto && window.__cellAuto(true), null)));
          if (!res) await page.waitForTimeout(160);
        }
        await page.waitForTimeout(1500);
        return res;
      };
      const barOf = () => page.evaluate(() => {
        const bs = [...document.querySelectorAll('.cbarslot button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
        return {
          t: bs.map(b => b.textContent.trim()), go: bs.filter(b => b.classList.contains('go')).map(b => b.textContent.trim()),
          fit: bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }),
          rows: new Set(bs.map(b => { const r = b.getBoundingClientRect(); return Math.round((r.top + r.height / 2) / 10); })).size,   // 줄 = 세로 가운데(주황 단추가 더 커서 위 끝은 다름)
          gap: bs.slice(1).every((b, i) => b.getBoundingClientRect().left >= bs[i].getBoundingClientRect().right + 4),
          scroll: Math.max(document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth),
          card: !!document.querySelector('.overlay:not([hidden]) .resultcard'), panel: !!document.querySelector('.overlay:not([hidden]) .nearpanel'),
        };
      });
      const press = sel => page.evaluate(q => { const b = typeof q === 'string' ? document.querySelector(q) : [...document.querySelectorAll(q[0])][q[1]]; if (!b) return false; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); return true; }, sel);

      await page.evaluate(() => localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 } })));
      const r4 = await lose('so4');
      const b0 = await barOf();
      if (!r4 || r4.stars !== 0 || r4.k !== 0) bad('so4 일부러 틀리기가 별 0이 아님: ' + JSON.stringify(r4));
      else if (b0.t.length !== 3 || b0.t[1] !== '헷갈리는 두 소리 듣기' || b0.t[2] !== '한 번 더' || b0.go.join() !== '한 번 더' || !b0.fit || b0.rows !== 1 || !b0.gap || b0.scroll > 1 || !b0.card) bad('so4 별 0 아래 띠: ' + JSON.stringify(b0));
      else ok(`so4 별 0 — 아래 띠 [${b0.t.join('] [')}] 한 줄 · 주황은 '한 번 더' 하나 · 스크롤 0`);
      await check('so4 별 0 결과');

      await press('.cbarslot .nearbtn');
      await page.waitForTimeout(300);
      const p0 = await page.evaluate(() => {
        const p = document.querySelector('.overlay:not([hidden]) .nearpanel'); if (!p) return null;
        const r = p.getBoundingClientRect();
        return { h: p.querySelector('h2').textContent, n: [...p.querySelectorAll('.nearcard')].map(c => c.querySelector('.near-n').textContent + '/' + c.querySelector('.near-l').textContent + '/' + c.querySelector('.near-s').textContent),
          fit: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, txt: p.innerText, card: !!document.querySelector('.overlay:not([hidden]) .resultcard') };
      });
      const b1 = await barOf();
      const two = p0 && p0.n.length === 2 && p0.n[0].split('/')[1] !== p0.n[1].split('/')[1] && p0.n.every(x => x.endsWith('/눌러서 듣기'));
      if (!p0 || !two || !p0.fit || p0.card || /별|점수|틀렸|연습/.test(p0.txt) || b1.t.join('|') !== '결과 보기|한 번 더' || b1.go.join() !== '한 번 더' || b1.scroll > 1) bad('so4 두 소리 카드: ' + JSON.stringify({ p0, b1 }));
      else ok(`so4 '헷갈리는 두 소리 듣기' — "${p0.h}" · ${p0.n.map(x => x.split('/').slice(0, 2).join(' ')).join(' / ')} · 점수 · 연습 말 없음 · 아래 띠 [${b1.t.join('] [')}]`);
      await check('so4 두 소리 카드');

      // 카드를 누르면 그 소리(소리 길 하나 더) + '듣는 중' → 끝나면 되돌아옴 · 다른 카드를 누르면 옮겨 감
      const nowOf = () => page.evaluate(() => [...document.querySelectorAll('.nearcard')].map(c => (c.classList.contains('now') ? 'now:' : '') + c.querySelector('.near-s').textContent));
      await press(['.nearcard', 0]);
      await page.waitForTimeout(250);
      const n1 = await nowOf();
      await press(['.nearcard', 1]);
      await page.waitForTimeout(250);
      const n2 = await nowOf();
      await page.waitForTimeout(3200);
      const n3 = await nowOf();
      if (n1.join('|') !== 'now:듣는 중|눌러서 듣기' || n2.join('|') !== '눌러서 듣기|now:듣는 중' || n3.join('|') !== '눌러서 듣기|눌러서 듣기') bad('so4 두 소리 카드 누르기: ' + JSON.stringify({ n1, n2, n3 }));
      else ok("so4 소리 카드 — 누른 카드만 '듣는 중' · 다른 카드를 누르면 옮겨 감 · 끝나면 '눌러서 듣기'");

      // 결과 보기 → 결과 카드와 아래 띠 셋이 그대로 · 한 번 더 → 확인 게임
      await press('.cbarslot button');
      await page.waitForTimeout(300);
      const b2 = await barOf();
      const pop = await page.evaluate(() => document.querySelectorAll('.resultcard .star.pop').length);
      if (!b2.card || b2.panel || b2.t.join('|') !== b0.t.join('|') || b2.go.join() !== '한 번 더') bad('so4 결과 보기로 돌아옴: ' + JSON.stringify({ b2, pop }));
      else ok(`so4 '결과 보기' — 결과 카드와 단추 셋이 그대로(별 소리 · 팡 다시 X: ${pop})`);
      await press(['.cbarslot button', 2]);
      await page.waitForTimeout(700);
      const ph = await page.evaluate(() => ({ p: window.__cellPhase && window.__cellPhase(), start: !!document.querySelector('.startcard') }));
      if (ph.p !== 'game' || !ph.start) bad('so4 별 0에서 한 번 더: ' + JSON.stringify(ph)); else ok("so4 별 0 '한 번 더' → 확인 게임 시작 카드");

      // 별 0이 두 번 이어지면 기록에 남음(hist) — 한 번 더 틀려 봄
      const r4b = await lose('so4');
      const hist = await page.evaluate(() => (JSON.parse(localStorage.getItem('mn.prog') || '{}').so4 || {}).hist || []);
      const b3 = await barOf();
      if (!r4b || r4b.stars !== 0 || hist.length < 2 || hist.slice(-2).some(x => x.s !== 0) || !b3.t.includes('헷갈리는 두 소리 듣기')) bad('so4 별 0 두 번: ' + JSON.stringify({ r4b, hist: hist.slice(-2), b3 }));
      else ok(`so4 별 0 두 번 — 기록 ${hist.length}줄(끝 두 줄 별 0) · 흰 단추 그대로`);

      // 듣는 칸이 아닌 ak2 — 단추 둘(다음 놀이 · 한 번 더)
      const r2 = await lose('ak2');
      const b4 = await barOf();
      if (!r2 || r2.stars !== 0 || b4.t.length !== 2 || b4.t[1] !== '한 번 더' || b4.t.includes('헷갈리는 두 소리 듣기') || b4.go.join() !== '한 번 더' || !b4.fit) bad('ak2 별 0 아래 띠: ' + JSON.stringify({ r2, b4 }));
      else ok(`ak2 별 0 — 듣는 칸이 아니라 단추 둘 [${b4.t.join('] [')}]`);
      if (perr.length) bad('별 0 화면 오류: ' + perr.slice(0, 3).join(' | ')); else ok('별 0 화면 — 콘솔 오류 0');
      page.off('pageerror', onErr); page.off('console', onCon);
      await page.evaluate(() => localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 } })));
    }
    // 칸마다 보기 · 연습 · 확인 게임 첫 판 · 결과
    for (const id of ['so3', 'so4', 'so5', 'sem1', 'ppa1', 'ga1', 'ga2', 'ga3', 'ga4', 'ri2', 'ri3', 'ri4', 'ri5', 'ri6', 'jd1', 'ak1', 'ak2']) {
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
