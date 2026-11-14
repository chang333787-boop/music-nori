// 놀이터 자동 시험(브라우저 하나) — 부탁 카드 13장을 처음부터 끝까지(window.__playAuto = 지금 카드를 푸는 맞는 행동 하나)
//  확인: 13장 다 끝남 · 콘솔 오류 0 · 1366×768 스크롤 0 · 카드 글이 카드 밖으로 잘리지 않음
//  부탁 점 = 단추(잠금 X · 11-08): 저장소를 비운 채 8번째 점을 누르면 그 카드가 바로 열림 · 진행(play.done)은 끝낸 부탁 목록 — 끝낸 것만 채움
//  묶음 D3(11-14): 부탁 9 · 10 · 11 = 리듬 지어 보기(rmake) · 내 곡 꾸며 보기(dress) · 반주 화음 붙여 보기(chord) — 주소로 바로 · 예전 저장(여덟 장 시절 [0..7])이 그대로 맞음
//  묶음 D8(11-14): 부탁 12 · 13 = 오선 보고 놓기(staff) · 음이름 보고 놓기(name) — 주소로 바로 · 예전 저장([0..10])이 그대로 맞음 · 다른 자리는 사실만 · 끝내면 다음 보기
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
    const t0 = Date.now(); let st = null, scroll = null, clip = null;
    const seen = new Set();
    while (Date.now() - t0 < 260000) {
      st = await page.evaluate(() => {
        const m = document.getElementById('main'), c = document.querySelector('.pcard');
        const sc = { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight, x: document.documentElement.scrollWidth - innerWidth };
        const s = window.__playState ? window.__playState() : null;
        const cut = c ? c.scrollHeight - c.clientHeight : 0;
        if (s && !s.all && window.__playAuto) window.__playAuto();
        return { s, sc, cut };
      });
      if (st.s) seen.add(st.s.key);
      if (!scroll && (st.sc.page > 1 || st.sc.main > 1 || st.sc.x > 1)) scroll = st.sc;
      if (!clip && st.cut > 1) clip = { key: st.s && st.s.key, cut: st.cut };
      if (st.s && st.s.all) break;
      await page.waitForTimeout(200);
    }
    const sec = Math.round((Date.now() - t0) / 1000);
    if (!st.s || !st.s.all) { fail++; console.log(`✗ 놀이터 — ${sec}초 안에 13장을 못 끝냄(지금 ${JSON.stringify(st.s)})`); }
    if (st.s && st.s.all && st.s.done !== 13) { fail++; console.log('✗ 놀이터 — 끝까지 갔는데 끝낸 부탁이 13이 아님: ' + JSON.stringify(st.s)); }
    for (const k of ['rmake', 'dress', 'chord', 'staff', 'name']) if (!seen.has(k)) { fail++; console.log('✗ 놀이터 — 차례대로 가는 길에 ' + k + ' 부탁이 없음'); }
    if (errs.length) { fail++; console.log('✗ 놀이터 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (scroll) { fail++; console.log('✗ 놀이터 스크롤 ' + JSON.stringify(scroll)); }
    if (clip) { fail++; console.log('✗ 놀이터 카드 글이 잘림 ' + JSON.stringify(clip)); }
    if (!fail) console.log(`✓ 놀이터 — 부탁 카드 13장 끝까지(짓고 꾸미기 셋 · 보고 놓기 둘 포함) · ${sec}초 · 오류 0 · 스크롤 0 · 카드 글 잘림 0`);

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
      return { s: window.__playState(), ls: localStorage.getItem('mn.play.done'),
        dots: [...document.querySelectorAll('.pc-dots button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), w: r.width, h: r.height, cls: b.className, cur: b.getAttribute('aria-current') }; }),
        scroll: Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth) };
    });
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '#/play');
    await page.waitForTimeout(900);
    let v = await look();
    if (v.dots.length !== 13 || !v.dots.every((d, k) => d.label === `부탁 ${k + 1}` && d.w >= 44 && d.h >= 44)) { fail++; console.log('✗ 부탁 점 — 단추 열세 개 · aria-label \'부탁 n\' · 44px 이상이어야 함: ' + JSON.stringify(v.dots)); }
    if (v.s.card !== 1 || v.ls !== null) { fail++; console.log('✗ 부탁 점 — 빈 저장소면 부탁 1에서 시작 · 진행 저장 없음: ' + JSON.stringify({ s: v.s, ls: v.ls })); }
    await page.click('.pc-dots button[aria-label="부탁 8"]');
    await page.waitForTimeout(300);
    v = await look();
    if (v.s.card !== 8 || v.s.key !== 'make' || v.dots[7].cur !== 'step' || !/now/.test(v.dots[7].cls)) { fail++; console.log('✗ 부탁 점 — 8번째 점을 눌러도 부탁 8이 안 열림: ' + JSON.stringify({ s: v.s, dot8: v.dots[7] })); }
    if (v.ls !== null && Number(v.ls) !== 0) { fail++; console.log('✗ 부탁 점 — 열기만 했는데 진행이 바뀜: ' + v.ls); }
    if (v.scroll > 1) { fail++; console.log('✗ 부탁 점 — 부탁 8을 연 화면에 스크롤 ' + v.scroll); }
    if (!(await solve())) { fail++; console.log('✗ 부탁 점 — 바로 연 부탁 8을 못 끝냄 ' + JSON.stringify((await look()).s)); }
    v = await look();
    if (v.ls !== '[7]' || v.s.done !== 1 || !/on/.test(v.dots[7].cls) || v.dots.slice(0, 7).some(d => /\bon\b/.test(d.cls))) { fail++; console.log('✗ 부탁 점 — 부탁 8만 끝냈으면 8번 점만 채움: ' + JSON.stringify({ ls: v.ls, s: v.s, dots: v.dots.map(d => d.cls) })); }
    await page.click('.pc-dots button[aria-label="부탁 1"]');
    await page.waitForTimeout(300);
    v = await look();
    if (v.s.card !== 1 || v.s.key !== 'pitch' || v.ls !== '[7]') { fail++; console.log('✗ 부탁 점 — 부탁 1을 골랐더니 진행이 바뀌었거나 안 열림: ' + JSON.stringify({ ls: v.ls, s: v.s })); }
    if (!(await solve())) { fail++; console.log('✗ 부탁 점 — 다시 연 부탁 1을 못 끝냄'); }
    v = await look();
    if (v.ls !== '[0,7]') { fail++; console.log('✗ 부탁 점 — 부탁 1을 끝냈으면 진행 = [0,7]: ' + v.ls); }
    await page.reload();
    await page.waitForTimeout(900);
    v = await look();
    if (v.ls !== '[0,7]' || v.s.card !== 2) { fail++; console.log('✗ 부탁 점 — 새로 열었더니 진행이 [0,7]이 아니거나 안 끝낸 첫 부탁(2)에서 시작 안 함: ' + JSON.stringify({ ls: v.ls, s: v.s })); }
    // 칸 결과에서 바로(11-10): #/play/dyn → 셈여림 부탁이 열림 · 진행은 그대로 · 곡 주소와 같이 써도 됨
    for (const [hash, key] of [['#/play/dyn', 'dyn'], ['#/play/frere/meter', 'meter']]) {
      await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, hash);
      await page.waitForTimeout(1100);
      const w = await look();
      if (w.s.key !== key || w.ls !== '[0,7]') { fail++; console.log('✗ 칸에서 바로 — ' + hash + ' 이 ' + key + ' 부탁을 안 열거나 진행이 바뀜: ' + JSON.stringify({ s: w.s, ls: w.ls })); }
      else console.log('✓ 칸에서 바로 — ' + hash + ' → ' + key + ' 부탁');
    }
    await page.evaluate(() => { location.hash = '#/'; setTimeout(() => { location.hash = '#/play'; }, 50); });
    await page.waitForTimeout(1100);
    // 예전 저장(play.card = 3)은 [0,1,2]로 옮겨 읽음
    await page.evaluate(() => { localStorage.removeItem('mn.play.done'); localStorage.setItem('mn.play.card', '3'); });
    await page.reload();
    await page.waitForTimeout(900);
    v = await look();
    if (v.s.card !== 4 || v.s.done !== 3) { fail++; console.log('✗ 부탁 점 — 예전 진행(3) 옮겨 읽기: ' + JSON.stringify(v.s)); }
    if (errs.length && fail === failBefore) { fail++; console.log('✗ 부탁 점 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (fail === failBefore) console.log('✓ 부탁 점 — 단추 열셋(44px · \'부탁 n\') · 빈 저장소에서 8번째 점 → 부탁 8 · 끝내면 8번 점만 채움 · 부탁 1까지 끝내면 [1 · 8] · 새로 열면 안 끝낸 첫 부탁 · 예전 진행 옮김 · 스크롤 0');

    // ── 짓고 꾸미기 카드 셋(묶음 D3) ──
    const failD3 = fail;
    // 예전 저장 — 여덟 장 시절에 다 끝낸 아이([0..7])는 번호가 그대로 맞고, 새로 열면 부탁 9(리듬 지어 보기)부터
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.play.done', '[0,1,2,3,4,5,6,7]'); });
    await page.reload();
    await page.waitForTimeout(900);
    v = await look();
    if (v.s.card !== 9 || v.s.key !== 'rmake' || v.s.done !== 8 || v.dots.slice(0, 8).some(d => !/\bon\b/.test(d.cls)) || v.dots.slice(8).some(d => /\bon\b/.test(d.cls))) { fail++; console.log('✗ D3 — 예전 저장 [0..7]을 읽으면 앞 여덟 점이 채워지고 부탁 9에서 시작해야 함: ' + JSON.stringify({ s: v.s, dots: v.dots.map(d => d.cls) })); }
    // 둘째 줄 점이 카드 안에(스크롤 0) · 주소로 바로 열고 끝까지 · 끝낸 번호가 그 카드 번호
    for (const [key, no] of [['rmake', 9], ['dress', 10], ['chord', 11]]) {
      await page.evaluate(() => localStorage.clear());
      await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, '#/play/' + key);
      await page.waitForTimeout(1100);
      const w = await look();
      const geo = await page.evaluate(() => {
        const c = document.querySelector('.pcard').getBoundingClientRect(), d = [...document.querySelectorAll('.pc-dots button')].map(b => b.getBoundingClientRect());
        const btns = [...document.querySelectorAll('#main button')].filter(b => b.getClientRects().length && !b.closest('.pc-dots') && !b.closest('.pseg') && !b.closest('.pview')).map(b => [b.textContent.trim().slice(0, 10), Math.round(b.getBoundingClientRect().height)]);
        return { inCard: d.every(r => r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1), rows: new Set(d.map(r => Math.round(r.top))).size, low: btns.filter(b => b[1] < 64), go: document.querySelectorAll('#main button.go:not([hidden])').length };
      });
      if (w.s.key !== key || w.s.card !== no) { fail++; console.log(`✗ D3 — #/play/${key} 이 그 부탁(${no})을 안 엶: ` + JSON.stringify(w.s)); continue; }
      if (w.scroll > 1 || !geo.inCard || geo.rows !== 2) { fail++; console.log(`✗ D3 — ${key} 화면 스크롤 · 점 자리: ` + JSON.stringify({ scroll: w.scroll, geo })); }
      if (geo.low.length) { fail++; console.log(`✗ D3 — ${key} 64px 아래 단추: ` + JSON.stringify(geo.low)); }
      if (geo.go !== 1) { fail++; console.log(`✗ D3 — ${key} 주황 단추가 하나가 아님: ${geo.go}`); }
      if (!(await solve())) { fail++; console.log(`✗ D3 — ${key} 부탁을 못 끝냄 ` + JSON.stringify((await look()).s)); continue; }
      const z = await look();
      if (z.ls !== `[${no - 1}]`) { fail++; console.log(`✗ D3 — ${key}를 끝내면 진행 = [${no - 1}]: ` + z.ls); }
      else console.log(`✓ D3 — #/play/${key} → 부탁 ${no} 바로 열림 · 끝까지 · 진행 [${no - 1}] · 점 두 줄 · 스크롤 0`);
    }
    // 리듬 판에서 앞 부탁으로 돌아가면 곡이 돌아옴(부탁 1을 끝낼 수 있음) · 꾸미기는 지은 곡을 엶
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, '#/play/rmake');
    await page.waitForTimeout(1100);
    for (const d of [12, 12, 24]) { await page.click(`.ppal-b[data-d="${d}"][data-rest="false"]`); await page.waitForTimeout(120); }
    const rh = await page.evaluate(() => ({ blocks: document.querySelectorAll('.pcanvas .pblk').length, line: document.querySelector('.pline1').textContent }));
    if (rh.blocks !== 3) { fail++; console.log('✗ D3 — 음표 단추 셋을 눌렀는데 블록이 셋이 아님: ' + JSON.stringify(rh)); }
    await page.click('.pc-dots button[aria-label="부탁 1"]');
    await page.waitForTimeout(300);
    v = await look();
    if (v.s.key !== 'pitch' || !(await solve())) { fail++; console.log('✗ D3 — 리듬 판에서 부탁 1로 돌아가 끝내지 못함 ' + JSON.stringify(v.s)); }
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.play.saved', JSON.stringify([{ id: 'my-zz', title: '내가 지은 곡 1', short: '내가 지은 곡 1', mel: 'C4q E4q G4q E4q | C4h G4h | E4q E4q G4q G4q | C4w', meter: [4, 4], tempo: 100 }])); });
    await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, '#/play/dress');
    await page.waitForTimeout(1100);
    const ttl = await page.evaluate(() => document.querySelector('.ptitle').textContent);
    if (ttl !== '내가 지은 곡 1') { fail++; console.log('✗ D3 — 꾸미기가 지은 곡을 안 엶: ' + ttl); }
    if (errs.length && fail === failD3) { fail++; console.log('✗ D3 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (fail === failD3) console.log('✓ D3 — 예전 저장 [0..7] 그대로 · 부탁 9부터 · 리듬 단추로 블록 · 리듬 판 → 부탁 1 곡 돌아옴 · 꾸미기는 지은 곡을 엶');

    // ── 보고 놓기 카드 둘(묶음 D8) ──
    const failD8 = fail;
    const go = async hash => { await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, hash); await page.waitForTimeout(1100); };
    // 화면 규칙 — 스크롤 0 · 점 두 줄 카드 안 · 64px 아래 단추 0(점 · 고르기 묶음 빼고) · 주황 하나 · 아이 글 18px 아래 0 · 카드 글 잘림 0
    const rules = () => page.evaluate(() => {
      const m = document.getElementById('main'), c = document.querySelector('.pcard'), cr = c.getBoundingClientRect();
      const d = [...document.querySelectorAll('.pc-dots button')].map(b => b.getBoundingClientRect());
      const vis = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
      const btns = [...document.querySelectorAll('#main button')].filter(b => vis(b) && !b.closest('.pc-dots') && !b.closest('.pseg') && !b.closest('.pview')).map(b => [b.textContent.trim().slice(0, 10), Math.round(b.getBoundingClientRect().height)]);
      const small = [...document.querySelectorAll('#main *')].filter(el => vis(el) && !el.closest('svg') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 18).map(el => el.className + ':' + el.textContent.trim().slice(0, 12));
      return { scroll: Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth),
        inCard: d.every(r => r.left >= cr.left - 1 && r.right <= cr.right + 1 && r.top >= cr.top - 1), rows: new Set(d.map(r => Math.round(r.top))).size,
        low: btns.filter(b => b[1] < 64), go: document.querySelectorAll('#main button.go:not([hidden])').length, small, cut: c.scrollHeight - c.clientHeight };
    });
    const bad = (g, tag) => {
      const out = [];
      if (g.scroll > 1) out.push('스크롤 ' + g.scroll);
      if (!g.inCard || g.rows !== 2) out.push('점 자리 ' + JSON.stringify({ inCard: g.inCard, rows: g.rows }));
      if (g.low.length) out.push('64px 아래 단추 ' + JSON.stringify(g.low));
      if (g.go !== 1) out.push('주황 단추 ' + g.go);
      if (g.small.length) out.push('18px 아래 글 ' + JSON.stringify(g.small.slice(0, 4)));
      if (g.cut > 1) out.push('카드 글 잘림 ' + g.cut);
      if (out.length) { fail++; console.log(`✗ D8 — ${tag}: ` + out.join(' · ')); }
    };
    // 예전 저장 — 열한 장 시절에 다 끝낸 아이([0..10])는 번호가 그대로 맞고, 새로 열면 부탁 12(오선 보고 놓기)부터
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.play.done', '[0,1,2,3,4,5,6,7,8,9,10]'); });
    await go('#/play');   // 앞 시험이 #/play/dress에 있으므로 주소 없이 새로 엶
    v = await look();
    if (v.s.card !== 12 || v.s.key !== 'staff' || v.s.done !== 11 || v.dots.length !== 13 || v.dots.slice(0, 11).some(d => !/\bon\b/.test(d.cls)) || v.dots.slice(11).some(d => /\bon\b/.test(d.cls))) { fail++; console.log('✗ D8 — 예전 저장 [0..10]을 읽으면 앞 열한 점이 채워지고 부탁 12에서 시작해야 함: ' + JSON.stringify({ s: v.s, dots: v.dots.map(d => d.cls) })); }
    // 주소로 바로 열고 끝까지(자동) · 끝낸 번호 = 그 카드 번호 · 화면 규칙(시작 · 다 맞은 뒤)
    for (const [key, no] of [['staff', 12], ['name', 13]]) {
      await page.evaluate(() => localStorage.clear());
      await go('#/play/' + key);
      const w = await look();
      if (w.s.key !== key || w.s.card !== no) { fail++; console.log(`✗ D8 — #/play/${key} 이 그 부탁(${no})을 안 엶: ` + JSON.stringify(w.s)); continue; }
      bad(await rules(), key + ' 시작');
      if (!(await solve())) { fail++; console.log(`✗ D8 — ${key} 부탁을 못 끝냄 ` + JSON.stringify((await look()).s)); continue; }
      bad(await rules(), key + ' 끝');
      const z = await page.evaluate(() => ({ ls: localStorage.getItem('mn.play.done'), no: JSON.parse(localStorage.getItem('mn.play.readNo') || '{}') }));
      if (z.ls !== `[${no - 1}]` || z.no[key] !== 1) { fail++; console.log(`✗ D8 — ${key}를 끝내면 진행 = [${no - 1}] · 다음 보기 번호 1: ` + JSON.stringify(z)); }
      else console.log(`✓ D8 — #/play/${key} → 부탁 ${no} 바로 열림 · 끝까지 · 진행 [${no - 1}] · 스크롤 0 · 64px · 18px · 주황 하나`);
    }
    // 손으로(누르기) — 첫 보기 = 솔 라 시 도. 둘째 칸만 솔에 놓으면 다 놓은 뒤 '한 칸 위' 사실만 · 고치면 저절로 들려주고 끝 · 다시 열면 다음 보기(세 음)
    await page.evaluate(() => localStorage.clear());
    await go('#/play/staff');
    const tap = (k, p) => page.evaluate(([k, p]) => {
      const s = document.querySelector(`.pslot[data-slot="${k}"]`).getBoundingClientRect(), r = document.querySelector(`.prow[data-p="${p}"]`).getBoundingClientRect();
      return [s.left + s.width / 2, r.top + r.height / 2];
    }, [k, p]).then(([x, y]) => page.mouse.click(x, y)).then(() => page.waitForTimeout(150));
    const card = () => page.evaluate(() => ({ s: window.__playState(), hint: document.querySelector('.pc-hint').textContent, k: document.querySelector('.pc-hint').dataset.k,
      blocks: [...document.querySelectorAll('.pcanvas .pblk')].map(b => b.textContent), chips: [...document.querySelectorAll('.plab .chip')].map(c => c.textContent),
      items: document.querySelectorAll('.pcard .prd-item').length, staff: document.querySelectorAll('.prd-staff .prd-item').length, cur: [...document.querySelectorAll('.prd-item')].findIndex(e => e.classList.contains('cur')),
      red: [...document.querySelectorAll('.pcard *')].some(e => /rgb\(2[0-5]\d, [0-6]?\d, [0-6]?\d\)/.test(getComputedStyle(e).color)) }));
    let q = await card();
    if (q.staff !== 4 || q.chips[0] !== '미' || q.chips[q.chips.length - 1] !== '도' || q.chips.length !== 10 || q.cur !== 0) { fail++; console.log('✗ D8 — 오선 판: 보기 음 넷 · 줄 열(높은 미 ~ 가온 도 · 계이름) · 첫 음 표시: ' + JSON.stringify(q)); }
    await tap(0, 67); await tap(1, 67); await tap(2, 71);
    q = await card();
    if (q.k !== 'idle' || !/네 번째 음/.test(q.hint) || q.cur !== 3 || q.blocks.join() !== '솔,솔,시') { fail++; console.log('✗ D8 — 놓는 중에는 다음 차례만(맞고 틀림 X): ' + JSON.stringify(q)); }
    await tap(3, 72);
    q = await card();
    if (q.k !== 'diff' || !/4개 가운데 3개/.test(q.hint) || !/두 번째 음은 한 칸 위예요/.test(q.hint) || /틀|아니|X/.test(q.hint) || q.red || q.cur !== 1) { fail++; console.log('✗ D8 — 다 놓으면 다른 자리를 사실로만: ' + JSON.stringify(q)); }
    await tap(3, 72);
    q = await card();
    if (q.blocks.length !== 3 || !/네 번째 음/.test(q.hint)) { fail++; console.log('✗ D8 — 같은 자리를 또 누르면 빠져야 함: ' + JSON.stringify(q)); }
    await tap(3, 72); await tap(1, 69);
    await page.waitForTimeout(300);
    const lit = await page.evaluate(() => document.querySelectorAll('.prd-item.now').length + document.querySelectorAll('.pblk.now').length);
    let fin = null;
    for (let i = 0; i < 40 && !fin; i++) { await page.waitForTimeout(250); const s = await page.evaluate(() => window.__playState()); if (s.ok) fin = s; }
    q = await card();
    if (!fin || q.k !== 'done' || !/계이름 솔 · 라 · 시 · 도 = 음이름 사 · 가 · 나 · 다/.test(q.hint.replace(/\u00A0/g, ' '))) { fail++; console.log('✗ D8 — 고치면 저절로 들려주고 끝(계이름 = 음이름 사실): ' + JSON.stringify(q)); }
    if (lit < 2) { fail++; console.log('✗ D8 — 들을 때 카드 오선 음과 판 블록이 함께 반짝여야 함: ' + lit); }
    await page.click('.pc-dots button[aria-label="부탁 1"]'); await page.waitForTimeout(300);
    await page.click('.pc-dots button[aria-label="부탁 12"]'); await page.waitForTimeout(300);
    q = await card();
    if (q.staff !== 3 || q.s.ok) { fail++; console.log('✗ D8 — 끝낸 뒤 다시 열면 다음 보기(세 음): ' + JSON.stringify(q)); }
    // 음이름 판 — 줄 이름 = 음이름(다 ~ 높은 다) · 계이름 단추로 바꿈 · 다른 이름은 '○번째 음은 사예요(지금은 바)'
    await page.click('.pc-dots button[aria-label="부탁 13"]'); await page.waitForTimeout(300);
    q = await card();
    if (q.s.key !== 'name' || q.chips.join(' ') !== '다 나 가 사 바 마 라 다' || q.items !== 4 || q.staff !== 0) { fail++; console.log('✗ D8 — 음이름 판 줄 이름: ' + JSON.stringify(q)); }
    await tap(0, 60); await tap(1, 64); await tap(2, 65); await tap(3, 64);   // 보기 = 다 마 사 마 · 셋째에 바
    q = await card();
    if (q.k !== 'diff' || !/세 번째 음은 '사'예요\(지금은 '바'\)/.test(q.hint) || q.blocks.join() !== '다,마,바,마') { fail++; console.log('✗ D8 — 음이름 판 다른 이름 사실: ' + JSON.stringify(q)); }
    await page.click('.ptool.pname[data-v="false"]'); await page.waitForTimeout(200);
    q = await card();
    if (q.chips.join(' ') !== '도 시 라 솔 파 미 레 도' || q.blocks.join() !== '도,미,파,미') { fail++; console.log('✗ D8 — 계이름 단추를 누르면 줄 이름 · 블록 글자가 계이름: ' + JSON.stringify(q)); }
    await tap(2, 67);
    fin = null;
    for (let i = 0; i < 40 && !fin; i++) { await page.waitForTimeout(250); const s = await page.evaluate(() => window.__playState()); if (s.ok) fin = s; }
    q = await card();
    if (!fin || !/음이름 다 · 마 · 사 · 마 = 계이름 도 · 미 · 솔 · 미/.test(q.hint.replace(/\u00A0/g, ' '))) { fail++; console.log('✗ D8 — 음이름 판 끝: ' + JSON.stringify(q)); }
    if (errs.length && fail === failD8) { fail++; console.log('✗ D8 콘솔 오류: ' + errs.slice(0, 3).join(' | ')); }
    if (fail === failD8) console.log('✓ D8 — 예전 저장 [0..10] 그대로 · 부탁 12부터 · 놓는 중엔 차례만 · 다 놓으면 \'한 칸 위\' 사실만(빨강 X) · 또 누르면 빠짐 · 고치면 저절로 들려주며 오선 음도 반짝 · 다시 열면 다음 보기 · 음이름 판 줄 이름 · 계이름 단추');
  } finally { await browser.close(); server.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
