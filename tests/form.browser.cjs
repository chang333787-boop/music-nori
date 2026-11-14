// 도막 짜기 판(#/form) 자동 시험(브라우저 하나) — 부탁 카드 넷을 처음부터 끝까지(window.__formAuto = 지금 부탁을 푸는 맞는 행동 하나)
//  확인: 넷 다 끝남 · 콘솔 오류 0 · 1366×768 스크롤 0 · 아이 글 18px↑ · 단추 64px↑(부탁 점은 44) · 주황은 하나 · 손으로 누르기 · 부탁 점 = 단추(잠금 X)
//   · 1~2학년 판(band low)은 '도막' 대신 '조각' · 메기고 받기 부탁도 끝까지
//  사진: FORM_SHOTS=<폴더>를 주면 부탁마다 d5_<키>.png(듣는 중) · d5_start · d5_end · d5_low
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.FORM_SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
// 화면 검사 — 스크롤 · 글자 크기 · 단추 높이 · 주황 수(보이는 것만)
const LOOK = () => {
  const m = document.getElementById('main');
  const scroll = Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth);
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const small = [];
  for (const el of document.querySelectorAll('header.bar *, #main *')) {
    if (!vis(el) || el.closest('svg')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && parseFloat(getComputedStyle(el).fontSize) < 18) small.push(el.className + ':' + el.textContent.trim().slice(0, 12) + ':' + getComputedStyle(el).fontSize);
  }
  // 머리띠 단추(뒤로 · 모두 비우기)는 앱 전체 머리띠 규칙(52px · app.css .bar-btns · .icon-btn)을 따름 — 판 안의 단추만 64px
  const lowBtn = [...document.querySelectorAll('#main button')].filter(b => vis(b) && !b.closest('.pc-dots') && b.getBoundingClientRect().height < 63.5).map(b => b.className + ':' + Math.round(b.getBoundingClientRect().height));
  const orange = [...document.querySelectorAll('header.bar *, #main *')].filter(el => vis(el) && getComputedStyle(el).backgroundColor === 'rgb(196, 81, 26)').map(el => el.className || el.tagName);
  return { scroll, small, lowBtn, orange };
};
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  const bad = m => { fail++; console.log('✗ ' + m); };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `d5_${name}.png`) }); };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const state = () => page.evaluate(() => window.__formState && window.__formState());
    const checkLook = async (where) => {
      const v = await page.evaluate(LOOK);
      if (v.scroll > 1) bad(`${where} 스크롤 ${v.scroll}`);
      if (v.small.length) bad(`${where} 18px 아래 글: ${v.small.slice(0, 4).join(' | ')}`);
      if (v.lowBtn.length) bad(`${where} 64px 아래 단추: ${v.lowBtn.slice(0, 4).join(' | ')}`);
      if (v.orange.length !== 1) bad(`${where} 주황이 하나가 아님: ${v.orange.join(' | ')}`);
      return v;
    };

    // ── 1. 부탁 넷 끝까지 ──
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '#/form');
    await page.waitForTimeout(900);
    await checkLook('처음');
    await shot(page, 'start');
    const t0 = Date.now(); let st = null; const seen = new Set(), shotDone = new Set();
    while (Date.now() - t0 < 120000) {
      st = await page.evaluate(() => { const s = window.__formState(); if (!s.all) window.__formAuto(); return window.__formState(); });
      if (st.all) break;
      if (!seen.has(st.key + st.st)) { seen.add(st.key + st.st); await checkLook(`부탁 ${st.card}(${st.key} · ${st.st})`); }
      if (st.st === 'ready' && st.playing && !shotDone.has(st.key)) { shotDone.add(st.key); await page.waitForTimeout(st.key === 'slowfast' ? 3000 : 1300); await shot(page, st.key); }
      await page.waitForTimeout(200);
    }
    const sec = Math.round((Date.now() - t0) / 1000);
    if (!st || !st.all || st.done !== 4) bad(`부탁 넷 — ${sec}초 안에 못 끝냄(지금 ${JSON.stringify(st)})`);
    else console.log(`✓ 부탁 넷 끝까지(가나가 · 메기고 받기 · 느리게 다음 빠르게 · 내 짜임) · ${sec}초`);
    const endTxt = await page.evaluate(() => document.querySelector('.fm-card').innerText);
    if (!/부탁 4개를 다 했어요/.test(endTxt)) bad('끝 화면 글: ' + endTxt);
    const mine = await page.evaluate(() => localStorage.getItem('mn.form.mine'));
    if (!mine || JSON.parse(mine).filter(s => s.piece).length < 4) bad('내 짜임 저장(기기): ' + mine);
    await checkLook('끝');
    await shot(page, 'end');

    // ── 2. 손으로 누르기 — 도막을 고르고 칸을 누름 · 같은 도막을 다시 누르면 빠짐 · 혼자/여럿 · 빠르기 단추 ──
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); location.hash = '#/form'; });
    await page.waitForTimeout(900);
    await page.click('.fm-piece[data-id="na"]');
    await page.click('.fm-slot[data-k="0"]');
    await page.click('.fm-piece[data-id="ga"]');
    await page.click('.fm-slot[data-k="1"]');
    let s = await state();
    if (s.name !== '나가') bad('손으로 놓기: ' + JSON.stringify(s));
    await page.click('.fm-tg[data-k="1"][data-t="voice"]');
    await page.click('.fm-tg[data-k="1"][data-t="speed"]');
    s = await state();
    if (!/ga\.many\.fast/.test(s.board)) bad('혼자 · 빠르기 단추: ' + s.board);
    await page.click('.fm-slot[data-k="1"]');          // 고른 도막(가)과 같은 칸 → 빠짐
    s = await state();
    if (s.name !== '나' || !/^na\.one\.slow -/.test(s.board)) bad('같은 도막을 다시 눌러 빼기: ' + s.board);
    const off = await page.evaluate(() => [...document.querySelectorAll('.fm-tg[data-k="1"]')].every(b => b.disabled));
    if (!off) bad('빈 칸의 혼자 · 빠르기 단추는 닫힘(점선 자리)');
    await page.click('.fm-play');
    await page.waitForTimeout(400);
    s = await state();
    if (!s.playing) bad('듣기 단추');
    await page.click('.fm-play');
    if (!errs.length && !fail) console.log('✓ 손으로 — 도막 고르고 칸 누르기 · 다시 누르면 빠짐 · 혼자/여럿 · 느리게/빠르게 · 빈 칸 단추 닫힘 · 듣기/멈추기');

    // ── 3. 부탁 점 = 단추(잠금 X) ──
    const failBefore = fail;
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); location.hash = '#/form'; });
    await page.waitForTimeout(900);
    const dots = await page.evaluate(() => [...document.querySelectorAll('.fm-card .pc-dots button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), w: r.width, h: r.height }; }));
    if (dots.length !== 4 || !dots.every((d, k) => d.label === `부탁 ${k + 1}` && d.w >= 44 && d.h >= 44)) bad('부탁 점 — 단추 넷 · \'부탁 n\' · 44px: ' + JSON.stringify(dots));
    await page.click('.fm-card .pc-dots button[aria-label="부탁 4"]');
    await page.waitForTimeout(300);
    s = await state();
    if (s.key !== 'mine' || s.card !== 4) bad('부탁 점 — 빈 저장소에서 넷째 점 → 내 짜임: ' + JSON.stringify(s));
    for (let i = 0; i < 200 && !(s = await state()).ok; i++) { await page.evaluate(() => window.__formAuto()); await page.waitForTimeout(200); }
    const ls = await page.evaluate(() => localStorage.getItem('mn.form.done'));
    if (ls !== '[3]') bad('부탁 점 — 내 짜임만 끝냈으면 [3]: ' + ls);
    await page.reload();
    await page.waitForTimeout(900);
    s = await state();
    if (s.card !== 1 || s.done !== 1) bad('부탁 점 — 새로 열면 안 끝낸 첫 부탁(1): ' + JSON.stringify(s));
    await page.evaluate(() => { location.hash = '#/form/slowfast'; });
    await page.waitForTimeout(900);
    s = await state();
    if (s.key !== 'slowfast') bad('주소로 바로(#/form/slowfast): ' + JSON.stringify(s));
    if (fail === failBefore) console.log('✓ 부탁 점 — 단추 넷(44px) · 넷째 바로 열기 · 끝낸 것만 저장 · 새로 열면 안 끝낸 첫 부탁 · 주소로 바로');

    // ── 4. 1~2학년 판 ──
    const failLow = fail;
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('mn.band', '"low"'); location.hash = '#/form/call'; });
    await page.waitForTimeout(900);
    for (let i = 0; i < 300 && !(s = await state()).ok; i++) {
      await page.evaluate(() => window.__formAuto());
      if (s.st === 'ready' && s.playing && i % 5 === 0) {
        const txt = await page.evaluate(() => document.body.innerText);
        if (/도막|메기/.test(txt)) { bad('1~2학년 판에 「도막 · 메기」 낱말: ' + (txt.match(/.{0,12}(도막|메기).{0,12}/) || [''])[0]); break; }
        if (!/조각/.test(txt)) { bad('1~2학년 판에 「조각」이 없음'); break; }
      }
      await page.waitForTimeout(200);
    }
    if (!s.ok || s.key !== 'call') bad('1~2학년 판 메기고 받기 부탁을 못 끝냄: ' + JSON.stringify(s));
    await checkLook('1~2학년 판');
    await shot(page, 'low');
    if (fail === failLow) console.log('✓ 1~2학년 판 — 「조각」 · 「메기」 낱말 X · 혼자 부르고 여럿이 받기 끝까지');

    if (errs.length) bad('콘솔 오류: ' + errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); server.close(); }
  if (fail) { console.log(`✗ 도막 짜기 판 시험 실패 ${fail}`); process.exit(1); }
  console.log('✓ 도막 짜기 판 — 부탁 넷 · 손으로 · 부탁 점 · 1~2학년 판 · 스크롤 0 · 글 18px↑ · 단추 64px↑ · 주황 하나 · 오류 0');
  process.exit(0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
