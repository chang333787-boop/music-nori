// 결과가 사실만 말하는지(N1 · 11-08 토론) — 고르기 시계 · 시간 지남 따로 · TV 징검다리는 아이 기록 X · 기록 화면 '늦게'
//  + 듣지 않고 별 받기 막기(N2)는 아래에 이어 붙임
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
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());

    // 1. 소4 확인 게임 — 첫 판은 가만히(시간 지남) · 나머지는 자동으로 맞힘
    await page.evaluate(() => { window.__cellResult = null; location.hash = '#/cell/so4/game'; });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__cellAuto && window.__cellAuto());   // 시작 단추
    let ring = null;
    for (let k = 0; k < 40 && !ring; k++) {
      await page.waitForTimeout(100);
      ring = await page.evaluate(() => { const t = document.querySelector('.answers .anstimer.run'); return t && !t.hidden ? parseFloat(getComputedStyle(t).animationDuration) : null; });
    }
    if (!(ring >= 2.6 && ring <= 3.9)) bad('고르기 시계 줄이 안 보이거나 길이가 이상함: ' + ring); else ok(`고르기 시계 줄 — ${ring}초`);
    await page.waitForTimeout(4200);                                         // 첫 판 시간 지남
    let res = null;
    for (let k = 0; k < 500 && !res; k++) {
      res = await page.evaluate(() => (window.__cellResult ? { late: document.querySelectorAll('.resultcard .replay i.l').length, tip: document.querySelector('.resultcard .tip')?.textContent || '', hist: JSON.parse(localStorage.getItem('mn.prog') || '{}').so4?.hist?.slice(-1)[0] } : (window.__cellAuto && window.__cellAuto(), null)));
      if (!res) await page.waitForTimeout(160);
    }
    if (!res || res.late !== 1 || !/시간이 지난 판이 1번/.test(res.tip) || /더 많이 놓쳤어요/.test(res.tip) || !res.hist || res.hist.l !== 1) bad('시간 지남 따로 세기: ' + JSON.stringify(res));
    else ok(`시간 지남 따로 — 다시 보기 점선 ${res.late} · "${res.tip}" · 기록 l=${res.hist.l}`);

    // 2. TV 징검다리 — #/tvcell/ri1 → #/tvtap · 끝까지 해도 아이 기록 X · 뒤로 = TV
    await page.evaluate(() => { localStorage.removeItem('mn.prog'); location.hash = '#/tvcell/ri1'; });
    await page.waitForTimeout(900);
    const at = await page.evaluate(() => ({ hash: location.hash, guide: !!document.querySelector('.tapgame.tvmode .tvguide') }));
    if (at.hash !== '#/tvtap' || !at.guide) bad('TV 징검다리로 안 감: ' + JSON.stringify(at)); else ok('TV에서 징검다리 → #/tvtap(안내 줄 있음)');
    await page.click('.tapbar button.go.huge');
    const r = await page.evaluate(async () => {
      const plan = window.__tapPlan, river = document.querySelector('.river'), bs = plan.beats();
      bs.forEach(t => setTimeout(() => river.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })), Math.max(0, t - performance.now())));
      const end = bs[bs.length - 1] + 2600;
      while (performance.now() < end) await new Promise(z => setTimeout(z, 200));
      return { res: window.__tapResult && window.__tapResult.stars, prog: localStorage.getItem('mn.prog'), best: localStorage.getItem('mn.tap.best') };
    });
    if (r.res == null || r.prog || r.best) bad('TV 징검다리가 아이 기록에 남음: ' + JSON.stringify(r)); else ok('TV 징검다리 끝 — 아이 기록 · 단계 최고 안 남음');
    await page.click('#back');
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => location.hash);
    if (back !== '#/tv') bad('TV 징검다리 뒤로 = ' + back); else ok('뒤로 → TV 놀이 고르기');

    // 3. 기록 화면 '늦게' 열
    await page.evaluate(() => { localStorage.setItem('mn.prog', JSON.stringify({ so4: { stars: 1, at: 1, hist: [{ at: 1, s: 1, k: 8, n: 12, l: 2, tip: 'x' }, { at: 2, s: 2, k: 9, n: 12, tip: '예전 줄(l 없음)' }] } })); location.hash = '#/records'; });
    await page.waitForTimeout(600);
    const rec = await page.evaluate(() => ({ head: [...document.querySelectorAll('.rec-table thead th')].map(e => e.textContent).join('|'), late: [...document.querySelectorAll('.rec-late')].map(e => e.textContent) }));
    if (!rec.head.includes('늦게') || rec.late.join() !== '—,2') bad('기록 화면 늦게: ' + JSON.stringify(rec)); else ok(`기록 화면 '늦게' 열 — ${rec.late.join(' · ')}`);

    // ── N2: 듣지 않고 별 받기 막기 ──
    // 4. 소3 — 긴 소리(1.2초)와 짧은 소리(0.25초)에서 답 단추가 열리는 때가 같아야(화면으로 길이가 새지 않게)
    //  판 차례가 씨앗으로 섞이므로(X2) 첫 두 판이 긴 · 짧은 소리로 갈리는 씨앗을 골라 엶
    const sd3 = await page.evaluate(async () => {
      const K = await import('./app/js/cellkit.js'), M = await import('./app/js/cells/so3.js');
      for (let n = 1; n < 200; n++) { const p = K.stageShuffle(M.PLAN, M.CUTS, K.rng(K.seedOf('seed', String(n), 'so3')), M.SHUF); if (p[0].right !== p[1].right) return n; }
      return 0;
    });
    await page.goto(base + `?seed=${sd3}#/cell/so3/game`);
    await page.evaluate(() => { localStorage.removeItem('mn.prog'); window.__cellResult = null; });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      window.__t3 = { count: {}, open: {} };
      const cnt = document.querySelector('.ccount'), ans = document.querySelector('.answers');
      let cur = 0;
      new MutationObserver(() => { const m = /^(\d+) \//.exec(cnt.textContent); if (m && +m[1] !== cur) { cur = +m[1]; window.__t3.count[cur] = performance.now(); } }).observe(cnt, { childList: true, characterData: true, subtree: true });
      new MutationObserver(() => { if (cur && !ans.classList.contains('busy') && !window.__t3.open[cur]) window.__t3.open[cur] = performance.now(); }).observe(ans, { attributes: true, attributeFilter: ['class'] });
      window.__cellAuto();                                   // 시작
    });
    for (let k = 0; k < 80; k++) {
      const st = await page.evaluate(() => { const t = window.__t3; if (t.open[1] && !t.done1) { t.done1 = 1; window.__cellAuto(); } if (t.open[2] && !t.done2) { t.done2 = 1; window.__cellAuto(); } return t.open[2] ? t : null; });
      if (st) break;
      await page.waitForTimeout(100);
    }
    const t3 = await page.evaluate(() => window.__t3);
    const d1 = t3.open[1] - t3.count[1], d2 = t3.open[2] - t3.count[2];
    if (!(Math.abs(d1 - d2) <= 50)) bad(`소3 답 단추 열림 — 긴 소리 ${Math.round(d1)}ms · 짧은 소리 ${Math.round(d2)}ms`); else ok(`소3 답 단추 열림이 길이와 상관없이 같음(${Math.round(d1)} · ${Math.round(d2)}ms · 씨앗 ${sd3})`);
    // 4b. '아까' 별(X2) — 같은 화면에서 결과 '한 번 더'로 다시 하면 결과 별 옆에 앞 판 별이 점선 빈 별로(첫 결과엔 없음)
    const toResult = async () => { for (let k = 0; k < 700; k++) { const d = await page.evaluate(() => (window.__cellResult ? 1 : (window.__cellAuto && window.__cellAuto(), 0))); if (d) return true; await page.waitForTimeout(160); } return false; };
    await toResult();
    await page.waitForTimeout(600);
    const r1 = await page.evaluate(() => ({ before: document.querySelectorAll('.resultcard .beforestar').length, stars: window.__cellResult.stars }));
    await page.evaluate(() => { window.__cellResult = null; });
    await page.locator('.cbar button.again', { hasText: '한 번 더' }).click();
    await page.waitForTimeout(500);
    await toResult();
    await page.waitForTimeout(600);
    const r2 = await page.evaluate(() => ({ before: document.querySelectorAll('.resultcard .beforestar').length, label: document.querySelector('.resultcard .beforestar em')?.textContent, px: parseFloat(getComputedStyle(document.querySelector('.resultcard .beforestar em') || document.body).fontSize), sd: JSON.parse(localStorage.getItem('mn.prog') || '{}').so3?.hist?.map(x => x.sd) }));
    if (r1.before !== 0 || r2.before !== r1.stars || r2.label !== '아까' || r2.px < 18) bad(`'아까' 별: ` + JSON.stringify({ r1, r2 }));
    else ok(`'아까' 별 — 첫 결과 0 · '한 번 더' 뒤 ${r2.before}개(점선 빈 별 · ${r2.px}px) · 기록 sd ${r2.sd.join(' · ')}`);
    // 5. 씨앗 — ?seed=1 · 2로 소4 · 가1을 끝까지(완벽 봇 = 별 셋) · 기록에 sd · 같은 씨앗이면 같은 sd
    const sds = {};
    let run = 0;                                             // 주소가 # 뒤만 다르면 새로 읽지 않아 앞 판 결과(__cellResult)가 남음 → 판마다 run을 붙여 새로 읽음
    for (const [id, sdq] of [['so4', 1], ['so4', 2], ['ga1', 1], ['ga1', 1], ['ga3', 1], ['ga3', 1]]) {
      await page.goto(base + `?seed=${sdq}&run=${++run}#/cell/${id}/game`);
      await page.waitForTimeout(800);
      let rr = null;
      for (let k = 0; k < 700 && !rr; k++) {
        rr = await page.evaluate(i => (window.__cellResult ? { stars: window.__cellResult.stars, sd: JSON.parse(localStorage.getItem('mn.prog') || '{}')[i]?.hist?.slice(-1)[0]?.sd, rule: document.querySelector('.resultcard .star span')?.textContent } : (window.__cellAuto && window.__cellAuto(), null)), id);
        if (!rr) await page.waitForTimeout(160);
      }
      if (!rr || rr.stars !== 3 || rr.sd == null) bad(`${id} ?seed=${sdq}: ` + JSON.stringify(rr));
      else { ok(`${id} ?seed=${sdq} — 별 셋 · 기록 sd ${rr.sd} · 별 ① "${rr.rule}"`); (sds[id + sdq] = sds[id + sdq] || []).push(rr.sd); }
    }
    for (const k of ['ga11', 'ga31']) if (sds[k] && (sds[k].length !== 2 || sds[k][0] !== sds[k][1])) bad('같은 씨앗인데 sd가 다름 ' + k + JSON.stringify(sds[k])); else ok(`같은 씨앗 = 같은 판(${k.slice(0, 3)} sd 같음)`);
    if (sds.so41 && sds.so42 && sds.so41[0] === sds.so42[0]) bad('다른 씨앗인데 sd가 같음');
    // 6. 보기 — '연습해 볼래요'는 예시 두 번 뒤 주황(X10) · 흰 단추일 때도 누르면 연습으로
    await page.goto(base + '#/cell/so4');
    await page.waitForTimeout(800);
    const b0 = await page.evaluate(() => { const b = [...document.querySelectorAll('.cbar button')].find(x => x.textContent.includes('연습해')); return b && b.className; });
    const cards = page.locator('.excard');
    await cards.nth(0).click(); await page.waitForTimeout(300);
    const b1 = await page.evaluate(() => { const b = [...document.querySelectorAll('.cbar button')].find(x => x.textContent.includes('연습해')); return b && b.className; });
    await cards.nth(1).click(); await page.waitForTimeout(300);
    const b2 = await page.evaluate(() => { const b = [...document.querySelectorAll('.cbar button')].find(x => x.textContent.includes('연습해')); return b && b.className; });
    if (!/soon/.test(b0) || /\bgo\b/.test(b0) || /\bgo\b/.test(b1) || !/\bgo\b/.test(b2)) bad('보기 주 단추: ' + JSON.stringify([b0, b1, b2])); else ok('보기 — 예시 두 번 들은 뒤 \'연습해 볼래요\'가 주황');
    await page.goto(base + '#/cell/so3');
    await page.waitForTimeout(700);
    await page.locator('.cbar button', { hasText: '연습해' }).click();   // 진짜 누름(onPress = pointerdown)
    await page.waitForTimeout(400);
    if ((await page.evaluate(() => window.__cellPhase())) !== 'follow') bad('흰 단추일 때 눌러도 연습으로 가야 함'); else ok('흰 단추일 때도 누르면 연습(잠금 X)');
    // 7. X3 — 저장이 막히면 톱니에 주황 점 · 앱이 새로 올라왔는지 확인
    await page.goto(base + '#/');
    await page.waitForTimeout(600);
    const x3 = await page.evaluate(async () => {
      const K = await import('./app/js/cellkit.js'), R = await import('./app/js/room.js');
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'mn.prog') throw new Error('꽉 참'); return orig.call(this, k, v); };
      K.saveResult('so4', { stars: 1, kept: 9, total: 12 });
      Storage.prototype.setItem = orig;
      await new Promise(z => setTimeout(z, 50));
      const dot = document.body.dataset.savefail === '1' && getComputedStyle(document.querySelector('.icon-btn[href="#/teacher"]'), '::after').content !== 'none';
      const same = await R.codeChanged();
      const real = localStorage.getItem('mn.ver'); localStorage.setItem('mn.ver', 'old'); const changed = await R.codeChanged(); localStorage.setItem('mn.ver', real);
      return { dot, same, changed };
    });
    if (!x3.dot || x3.same || !x3.changed) bad('X3: ' + JSON.stringify(x3)); else ok('저장이 막히면 톱니에 주황 점 · 앱이 새로 올라오면 알아챔');
    if (errs.length) bad('콘솔 오류: ' + errs.join(' | ')); else ok('콘솔 오류 0');
  } catch (e) { bad(String(e && e.stack || e)); }
  await browser.close(); server.close();
  console.log(fail ? `✗ 사실 시험 실패 ${fail}` : '✓ 사실 시험 통과');
  process.exit(fail ? 1 : 0);
})();
