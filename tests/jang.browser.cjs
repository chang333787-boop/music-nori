// 장단 판 자동 시험(브라우저 하나 · 11-14 묶음 D4) — #/jang
//  ① 부탁 카드 셋을 끝까지(window.__jangAuto = 지금 부탁을 푸는 맞는 행동 하나) · 카드마다 1366×768 스크롤 0 · 보이는 글 18px↑ · 주황 하나
//  ② 손으로: 구음 단추 → 칸 누르기 = 넣기 · 같은 구음 한 번 더 = 빼기 · 쉼 = 빼기 · 손뼉(스페이스) · 듣기 = 되풀이(도는 칸 표시) · 돌다 바꾼 칸은 다음 바퀴
//  ③ 부탁 점 = 단추(잠금 X) · 진행은 끝낸 부탁 목록 · 저장은 기기에만 · 2초 간격 상한 · 장단 넷이 장부 표와 같음 · 주소로 부탁 · 장단 열기
//  ④ 콘솔 오류 0
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
// 페이지 안에서 — 지금 화면의 규칙 위반(rules.browser.cjs audit과 같은 잣대) + 스크롤
function audit() {
  const out = [];
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || e.hidden) return false; } return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('[aria-hidden="true"]') || !vis(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < 17.5) out.push(`글자 ${px}px "${n.textContent.trim().slice(0, 14)}"`);
    const r = el.getBoundingClientRect();
    if (el.closest('.jang-board') && (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'hidden' && !/ellipsis/.test(getComputedStyle(el).textOverflow))) out.push(`잘린 글 "${n.textContent.trim().slice(0, 14)}"`);
    if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1) out.push(`화면 밖 글 "${n.textContent.trim().slice(0, 14)}"`);
  }
  const gos = [...document.querySelectorAll('.go')].filter(vis);
  if (gos.length !== 1) out.push(`주황 단추 ${gos.length}개`);
  const small = [...document.querySelectorAll('.jang-board button')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return !b.closest('.jg-dots') && r.height < 63.5; });
  if (small.length) out.push(`64px보다 낮은 단추 ${small.length}개: ${small.slice(0, 3).map(b => b.textContent.trim().slice(0, 6)).join(' · ')}`);
  const m = document.getElementById('main');
  const sc = Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth);
  if (sc > 1) out.push('스크롤 ' + sc);
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  let fail = 0;
  const bad = m => { fail++; console.log('✗ ' + m); }, ok = m => console.log('✓ ' + m);
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const st = () => page.evaluate(() => window.__jangState());
    const check = async where => { const a = await page.evaluate(audit); if (a.length) bad(`${where} 화면 규칙: ${[...new Set(a)].slice(0, 5).join(' | ')}`); return !a.length; };
    const open = async hash => { await page.evaluate(x => { location.hash = '#/'; setTimeout(() => { location.hash = x; }, 50); }, hash); await sleep(1100); };
    const solve = async (limit = 120) => {        // 지금 부탁을 끝낼 때까지(다음 부탁으로 넘기지 않음)
      for (let i = 0; i < limit; i++) { const s = await st(); if (s.ok) return true; await page.evaluate(() => window.__jangAuto()); await sleep(220); }
      return false;
    };

    // ── ① 부탁 셋을 끝까지 ──
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '#/jang');
    await sleep(1000);
    let s = await st();
    if (s.card !== 1 || s.key !== 'copy' || s.pick !== 'sm' || s.ref !== 'D..D.TKT.' || s.pat !== '.........') bad('처음 — 부탁 1(보기대로) · 세마치 보기 · 빈 장단보여야: ' + JSON.stringify(s));
    const t0 = Date.now(), rules = [];
    for (const [k, key] of [[1, 'copy'], [2, 'one'], [3, 'free']]) {
      s = await st();
      if (s.card !== k || s.key !== key) { bad(`부탁 ${k}(${key})가 안 열림: ${JSON.stringify(s)}`); break; }
      rules.push(await check(`부탁 ${k} 처음`));
      await page.evaluate(() => { window.__jangAuto(); window.__jangAuto(); });
      await sleep(250);
      rules.push(await check(`부탁 ${k} 놓는 중`));
      if (!(await solve())) { bad(`부탁 ${k} — 끝내지 못함 ${JSON.stringify(await st())}`); break; }
      s = await st();
      if (key === 'copy' && s.pat !== s.ref) bad('부탁 1 — 보기와 같아야 끝: ' + JSON.stringify(s));
      if (key === 'one' && s.diff !== 1) bad('부탁 2 — 한 칸만 달라야 끝: ' + JSON.stringify(s));
      if (key === 'free' && (s.pat.replace(/\./g, '').length < 3)) bad('부탁 3 — 소리 셋 이상이어야 끝: ' + JSON.stringify(s));
      if (s.playing !== 'mine') bad(`부탁 ${k} — 끝난 뒤에도 내 장단이 계속 돌아야(손뼉 치며 듣기): ${s.playing}`);
      const hint = await page.evaluate(() => document.querySelector('.jg-hint')?.textContent || '');
      if (key === 'one' && !/번째 칸\(\d박 .+ 소박\): .+ → .+/.test(hint)) bad('부탁 2 — 끝 글에 바뀐 칸이 사실로 적혀야: ' + hint);
      rules.push(await check(`부탁 ${k} 끝`));
      await page.evaluate(() => window.__jangAuto());   // 다음 부탁
      await sleep(400);
    }
    s = await st();
    const sec = Math.round((Date.now() - t0) / 1000);
    if (!s.all || s.done !== 3) bad('부탁 셋을 다 끝냈어야: ' + JSON.stringify(s));
    else ok(`부탁 셋 끝까지 · ${sec}초${rules.every(Boolean) ? ' · 카드마다 스크롤 0 · 글자 18px↑ · 주황 하나 · 단추 64px↑' : ''}`);
    rules.push(await check('부탁 다 한 뒤'));
    await sleep(2200);                                 // 2초 간격 상한 — 미뤄 둔 저장이 들어갈 때까지
    let ls = await page.evaluate(() => JSON.parse(localStorage.getItem('mn.jang') || 'null'));
    if (!ls || JSON.stringify(ls.done) !== '[0,1,2]' || !ls.free || !/^[DKTGR.]{12}$/.test(ls.free.b4 || '') || ls.free.b4.replace(/\./g, '').length < 3) bad('저장 — 끝낸 부탁 [0,1,2] · 내 장단(네 박) 저장: ' + JSON.stringify(ls));
    else ok('저장 — 기기에만 · 끝낸 부탁 [0,1,2] · 내 장단 ' + ls.free.b4);

    // ── ② 손으로 ──
    {
      const f0 = fail;
      await open('#/jang/copy/sm');
      await page.click('.jg-pal button[data-k="kung"]');
      let pressed = await page.evaluate(() => document.querySelector('.jg-pal button[aria-pressed="true"]')?.dataset.k);
      if (pressed !== 'kung') bad('구음 단추 — 고른 것이 잉크로 채워져야(aria-pressed): ' + pressed);
      const cell = i => `.mine .jg-cell[data-i="${i}"]`;
      await page.click(cell(1));
      s = await st();
      if (s.pat[1] !== 'K') bad('칸 누르기 — 쿵이 들어가야: ' + s.pat);
      const txt = await page.evaluate(sel => document.querySelector(sel).textContent, cell(1));
      if (txt !== '쿵') bad('칸 글 — 한글 구음 「쿵」이어야: ' + txt);
      await page.click(cell(1));
      s = await st();
      if (s.pat[1] !== '.') bad('같은 구음 한 번 더 = 빼기: ' + s.pat);
      await page.click('.jg-pal button[data-k="durr"]'); await page.click(cell(2));
      await page.click('.jg-pal button[data-k="rest"]'); await page.click(cell(2));
      s = await st();
      if (s.pat[2] !== '.') bad('쉼 = 빼기: ' + s.pat);
      const line = await page.evaluate(() => document.querySelector('.jg-line').textContent);
      if (!/3번째 칸\(1박 셋째 소박\): 더러러러 → 쉼/.test(line)) bad('사실 한 줄 — 바꾼 칸과 구음: ' + line);
      // 손뼉(스페이스) — 누르면 그 자리에서(판정 없음)
      await page.keyboard.press('Space');
      await sleep(30);
      const hit = await page.evaluate(() => document.querySelector('.jg-clap').classList.contains('hit'));
      if (!hit) bad('스페이스 = 손뼉 — 손뼉 단추가 반짝여야');
      await page.keyboard.press('Digit3');
      pressed = await page.evaluate(() => document.querySelector('.jg-pal button[aria-pressed="true"]')?.dataset.k);
      if (pressed !== 'deok') bad('숫자 3 = 덕 고르기: ' + pressed);
      // 듣기 = 되풀이 · 도는 칸 표시 · 돌다 바꾼 칸은 다음 바퀴에
      await page.click('.jg-pal button[data-k="deong"]'); await page.click(cell(0));
      await page.click('.jg-play');
      const seen = new Set();
      for (let k = 0; k < 30; k++) { const i = await page.evaluate(() => document.querySelector('.mine .jg-cell.now')?.dataset.i); if (i != null) seen.add(Number(i)); await sleep(70); }
      s = await st();
      if (s.playing !== 'mine' || seen.size < 4) bad(`듣기 — 내 장단이 돌고 도는 칸이 옮겨 가야(본 칸 ${[...seen]}) · ${s.playing}`);
      await sleep(2300);                               // 세마치 한 바퀴(2초) 넘게 — 그래도 계속 돎
      s = await st();
      if (s.playing !== 'mine') bad('듣기 — 한 바퀴 뒤에도 멈출 때까지 되풀이해야');
      await page.click('.jg-pal button[data-k="kung"]'); await page.click(cell(4));
      s = await st();
      if (s.playing !== 'mine' || s.pat[4] !== 'K') bad('돌다가 바꾸기 — 멈추지 않고 칸이 바뀌어야: ' + JSON.stringify(s));
      const label = await page.evaluate(() => document.querySelector('.jg-play').textContent);
      if (label !== '멈추기') bad('도는 동안 주황 단추 = 멈추기: ' + label);
      await page.click('.jg-play');
      s = await st();
      if (s.playing) bad('멈추기를 누르면 멈춰야');
      await page.click('.jg-refplay');
      await sleep(400);
      const refNow = await page.evaluate(() => !!document.querySelector('.ref .jg-cell.now'));
      if (!refNow || (await st()).playing !== 'ref') bad('보기 듣기 — 보기 장단보에서 칸이 돌아야');
      await sleep(4300);
      if ((await st()).playing) bad('보기 듣기 — 두 바퀴 뒤 저절로 멈춰야');
      // 한 칸 바꾸기 — '번갈아 듣기' = 보기 한 바퀴 → 내 것 한 바퀴 · 내 것 바퀴를 들으면 부탁 끝 · 장단을 바꾸면 그 부탁을 다시(진행 점은 그대로)
      await open('#/jang/one/sm');
      await page.click('.jg-pal button[data-k="kung"]'); await page.click(cell(0));
      const word = await page.evaluate(() => document.querySelector('.jg-refplay').textContent);
      if (word !== '번갈아 듣기') bad('한 칸 바꾸기 — 보기 단추 = 번갈아 듣기: ' + word);
      const chg = await page.evaluate(() => [...document.querySelectorAll('.jg-cell.chg')].map(c => c.closest('.jg-board').classList.contains('ref') ? 'ref' : 'mine'));
      if (JSON.stringify(chg) !== '["ref","mine"]') bad('한 칸 바꾸기 — 바뀐 칸이 두 장단보 같은 자리에 표시: ' + JSON.stringify(chg));
      await page.click('.jg-refplay');
      const rows = [];
      for (let k = 0; k < 60; k++) {
        const r = await page.evaluate(() => (document.querySelector('.ref .jg-cell.now') ? 'ref' : document.querySelector('.mine .jg-cell.now') ? 'mine' : ''));
        if (r && rows[rows.length - 1] !== r) rows.push(r);
        if (!(await st()).playing) break;
        await sleep(90);
      }
      s = await st();
      if (rows.join() !== 'ref,mine' || !s.ok || s.playing) bad(`번갈아 듣기 — 보기 → 내 것 한 바퀴씩 · 끝나면 멈추고 부탁 끝: ${rows} · ${JSON.stringify(s)}`);
      await page.click('.jg-pickgrid button[data-k="gg"]');
      await sleep(150);
      s = await st();
      const dot2 = await page.evaluate(() => document.querySelectorAll('.jg-dots button')[1].className);
      if (s.ok || s.key !== 'one' || s.pat !== s.ref || !/\bon\b/.test(dot2) || !/now/.test(dot2)) bad('끝낸 부탁에서 장단을 바꾸면 그 부탁을 다시(점은 채운 채): ' + JSON.stringify({ s, dot2 }));
      if (fail === f0) ok('손으로 — 구음 고르기(잉크 채움 · 숫자 키) · 넣기 · 빼기 · 쉼 · 사실 한 줄 · 손뼉(스페이스) · 듣기 되풀이(도는 칸) · 돌다 바꾸기 · 보기 듣기 두 바퀴 · 번갈아 듣기(보기 → 내 것) · 끝낸 부탁 다시');
    }

    // ── ③ 장단 넷 · 주소 · 부탁 점(잠금 X) · 저장 간격 ──
    {
      const f0 = fail;
      const TABLE = { sm: 'D..D.TKT.', jj: 'D..K..K.TK..', gg: 'D.GKR.K.GKR.', jjm: 'D.TK.TK.TK.K' };
      for (const [k, code] of Object.entries(TABLE)) {
        await page.click(`.jg-pickgrid button[data-k="${k}"]`);
        await sleep(150);
        s = await st();
        const view = await page.evaluate(() => [...document.querySelectorAll('.ref .jg-cell')].map(c => c.textContent).join('|'));
        if (s.pick !== k || s.ref !== code) bad(`장단 ${k} — 보기가 장부 표와 같아야: ${s.ref} ≠ ${code}`);
        if (/[A-Za-z·]/.test(view)) bad(`장단 ${k} — 칸 글은 한글 구음만(쉼은 빈칸): ${view}`);
        await check(`보기 장단 ${k}`);
      }
      await open('#/jang/one/jjm');
      s = await st();
      if (s.key !== 'one' || s.pick !== 'jjm' || s.pat !== s.ref) bad('주소 #/jang/one/jjm — 한 칸 바꾸기 · 중중모리 · 보기와 같은 장단에서 시작: ' + JSON.stringify(s));
      // 부탁 점 — 빈 저장소에서 셋째 점을 바로
      await page.evaluate(() => localStorage.clear());
      await open('#/jang');
      const dots = await page.evaluate(() => [...document.querySelectorAll('.jg-dots button')].map(b => { const r = b.getBoundingClientRect(); return { l: b.getAttribute('aria-label'), w: r.width, h: r.height }; }));
      if (dots.length !== 3 || !dots.every((d, k) => d.l === `부탁 ${k + 1}` && d.w >= 44 && d.h >= 44)) bad('부탁 점 — 단추 셋 · \'부탁 n\' · 44px↑: ' + JSON.stringify(dots));
      await page.click('.jg-dots button[aria-label="부탁 3"]');
      await sleep(200);
      s = await st();
      if (s.key !== 'free' || s.card !== 3) bad('부탁 점 — 셋째 점을 누르면 내 장단 짓기가 바로(잠금 X): ' + JSON.stringify(s));
      // 저장 간격 — 빠르게 여러 칸을 놓아도 기기 쓰기는 2초에 한 번까지
      await page.evaluate(() => { window.__w = []; const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'mn.jang') window.__w.push(performance.now()); return o.call(this, k, v); }; });
      await page.click('.jg-pal button[data-k="deok"]');
      for (let i = 0; i < 12; i++) { await page.click(`.mine .jg-cell[data-i="${i}"]`); await sleep(120); }
      for (let i = 0; i < 6; i++) { await page.click(`.mine .jg-cell[data-i="${i}"]`); await sleep(120); }
      await sleep(2300);
      const w = await page.evaluate(() => window.__w);
      const gaps = w.slice(1).map((t, k) => t - w[k]);
      if (!w.length || gaps.some(g => g < 1990)) bad('저장 간격 — 2초에 한 번까지: ' + JSON.stringify(gaps.map(Math.round)));
      ls = await page.evaluate(() => JSON.parse(localStorage.getItem('mn.jang') || 'null'));
      if (!ls || ls.free.b4 !== '......TTTTTT') bad('저장 — 마지막 칸 줄이 들어가야: ' + JSON.stringify(ls));
      if (!(await solve())) bad('부탁 점 — 바로 연 부탁 3을 못 끝냄');
      await sleep(2200);
      ls = await page.evaluate(() => JSON.parse(localStorage.getItem('mn.jang') || 'null'));
      if (!ls || JSON.stringify(ls.done) !== '[2]') bad('부탁 점 — 부탁 3만 끝냈으면 진행 [2]: ' + JSON.stringify(ls && ls.done));
      const cls = await page.evaluate(() => [...document.querySelectorAll('.jg-dots button')].map(b => b.className));
      if (!/on/.test(cls[2]) || /\bon\b/.test(cls[0]) || /\bon\b/.test(cls[1])) bad('부탁 점 — 셋째 점만 채움: ' + JSON.stringify(cls));
      await page.reload();
      await sleep(1000);
      s = await st();
      if (s.card !== 1 || s.done !== 1) bad('다시 열면 안 끝낸 첫 부탁(1)에서: ' + JSON.stringify(s));
      await page.click('.jg-dots button[aria-label="부탁 3"]');
      await sleep(200);
      s = await st();
      if (s.pat !== '......TTTTTT') bad('내 장단 — 다시 열어도 저장한 칸 줄 그대로: ' + s.pat);
      if (fail === f0) ok('장단 넷이 장부 표와 같음(한글 구음만) · 주소로 부탁 · 장단 · 부탁 점 셋(잠금 X · 끝낸 것만 채움) · 저장 2초 간격 · 다시 열어도 내 장단 그대로');
    }
    if (errs.length) bad('콘솔 오류: ' + errs.slice(0, 3).join(' | '));
    else ok('콘솔 오류 0');
  } finally { await browser.close(); server.close(); }
  console.log(fail ? `✗ 장단 판 시험 실패 ${fail}` : '✓ 장단 판 시험 통과');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
