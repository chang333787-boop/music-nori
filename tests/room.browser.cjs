// 방 번호 다같이 브라우저 시험(진짜 DB · 네트워크) — 브라우저 하나에 페이지 둘(선생님 TV · 아이 기기 · 저장소가 섞이지 않게 창 둘)
//  선생님 방 열기 → 아이 들어가기(틀린 방 번호 → "다시 봐요" 먼저) → 선생님 높게·낮게 보기 → 아이 화면이 보기로(2.5초 안)
//  → 연습 → 확인 게임 → 아이 자동으로 게임 끝 → TV 띠에 '끝낸 아이 1 / 1' 반 막대(번호 · 별 X · X6) · 아이 카드 'TV에 갔어요'
//  → 선생님 결과 뒤에도 띠가 남음 · 크게 보기도 번호 X(별 분포 1~3명 = '조금') → 아이 나가기
//  → 가1 솔·미도 TV 소리 모드(여러 번 누르는 답 · 같은 씨앗 · 막대)
//  → 가짜 기기 여덟(두 글자 t) → 크게 보기 '많이 틀린 갈래' 막대 · '별 0이 이어진 아이 n명'(번호 X) · 복사한 표에만 번호(X6 둘째 · X11) → 아이 나가기
//  시험 방은 0000~0999(?testroom=1 시험 고리 · 아이들 방 1000~9999와 안 섞임). npm run test:db
//  사진: SHOTS=<폴더> node tests/room.browser.cjs
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const DB = 'https://music-nori-class-default-rtdb.asia-southeast1.firebasedatabase.app';
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const check = (name, cond, info) => { if (cond) console.log('✓ ' + name); else { fail++; console.log('✗ ' + name, info === undefined ? '' : JSON.stringify(info)); } };
const shot = async (page, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const scrollOf = page => page.evaluate(() => { const m = document.getElementById('main'); return Math.max(document.documentElement.scrollHeight - innerHeight, m.scrollHeight - m.clientHeight, document.documentElement.scrollWidth - innerWidth); });
async function until(fn, ms, step = 80) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; }
const tap = (page, sel) => page.locator(sel).first().click();
let kd2 = 0;                                       // 가1 TV 소리 모드 가운데 사진 한 번만

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = { T: [], K: [] };
  const watch = (page, who) => {
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|img\/band\//.test(m.text() + (m.location().url || ''))) errs[who].push(m.text()); });
    page.on('pageerror', e => errs[who].push(String(e)));
  };
  try {
    const T = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    const K = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    watch(T, 'T'); watch(K, 'K');

    // ── 1. 선생님 방 열기 ──
    await T.goto(base + '?testroom=1#/tv');
    await T.waitForSelector('.roomopen');
    await tap(T, '.roomopen');
    const chip = await T.waitForSelector('.troomchip', { timeout: 15000 }).catch(() => null);
    const room = chip ? (await chip.innerText()).match(/방 (\d{4})/)?.[1] : null;
    check('선생님 방 열림(시험 방 0000~0999)', room && room[0] === '0', room);
    if (!room) throw new Error('방을 못 열어 멈춤');
    const bigNo = await T.locator('.rbig-no').innerText().catch(() => '');
    check('TV에 방 번호가 크게', bigNo.replace(/\s/g, '') === room, bigNo);
    check('TV 방 열림 화면 스크롤 0', (await scrollOf(T)) <= 1);
    await shot(T, '1_tv_room_open');
    await tap(T, '.rbig .go');

    // ── 2. 아이 들어가기 — 틀린 방 번호 먼저 ──
    let wrong = null;
    for (let i = 0; i < 10 && !wrong; i++) {
      const r = '0' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const j = await (await fetch(`${DB}/rooms/${r}/t/pub.json`)).json().catch(() => 'x');
      if (j === null) wrong = r;
    }
    await K.goto(base + '#/');
    await K.waitForSelector('.roombtn');
    await tap(K, '.roombtn');
    await K.waitForSelector('.jpad');
    const type = async digits => { for (const d of digits) await tap(K, `.jkey[data-d="${d}"]`); };
    const pick = async () => { await tap(K, '.jnext'); await K.waitForSelector('.jnogrid'); await K.locator('.jnum', { hasText: /^7$/ }).click(); await K.waitForSelector('.jpals'); await K.locator('.jfr').nth(2).click(); await tap(K, '.jenter'); };
    if (wrong) {
      await type(wrong);
      await pick();
      const m = await K.waitForSelector('.jpad .jkey', { timeout: 10000 }).then(() => K.locator('.jmsg').innerText()).catch(() => '');
      check('없는 방 번호 → "방 번호를 다시 봐요"', m.includes('방 번호를 다시 봐요'), m);
      for (let i = 0; i < 4; i++) await tap(K, '.jdel');
    }
    await type(room.slice(0, 2));
    check('숫자 판 화면 스크롤 0', (await scrollOf(K)) <= 1);
    await type(room.slice(2));
    await shot(K, '2_kid_numpad');
    await tap(K, '.jnext');
    await K.waitForSelector('.jnogrid');
    check('내 번호 화면 스크롤 0', (await scrollOf(K)) <= 1);
    await shot(K, '2b_kid_number');
    await K.locator('.jnum', { hasText: /^7$/ }).click();
    await K.waitForSelector('.jpals');
    await K.locator('.jfr').nth(2).click();
    check('짝꿍 화면 스크롤 0', (await scrollOf(K)) <= 1);
    await shot(K, '2c_kid_pal');
    await tap(K, '.jenter');
    const waitTxt = await K.waitForSelector('.jwait', { timeout: 10000 }).then(e => e.innerText()).catch(() => '');
    check('아이 대기 화면', waitTxt.includes('선생님이 놀이를 고르면 바로 열려요') && waitTxt.includes(room), waitTxt.slice(0, 80));
    check('대기 화면 스크롤 0', (await scrollOf(K)) <= 1);
    await shot(K, '3_kid_wait');
    const cnt = await until(async () => /들어온 기기 1대/.test(await T.locator('.troomchip').innerText()), 8000);
    check('TV에 들어온 기기 1대', !!cnt, await T.locator('.troomchip').innerText());

    // ── 3. 선생님이 높게·낮게 보기 → 아이 화면이 보기로 ──
    const pubAt = async (phase) => until(() => T.evaluate(p => window.__roomPub && window.__roomPub.phase === p && window.__roomPub.t, phase), 10000, 30);
    const kidAt = async (phase) => until(() => K.evaluate(p => location.hash.includes('cell/so4') && window.__cellPhase && window.__cellPhase() === p && Date.now(), phase), 6000, 50);
    const times = {};
    await T.locator('.tvcell', { hasText: '높게·낮게' }).click();
    {
      const t0 = await pubAt('show'), t1 = await kidAt('show');
      times.show = t0 && t1 ? (t1 - t0) / 1000 : null;
      check(`아이 화면이 높게·낮게 보기로 ${times.show}초`, times.show != null && times.show <= 2.5, times.show);
    }
    await K.waitForTimeout(400);
    await shot(K, '4_kid_cell_show');
    await shot(T, '4b_tv_show');
    // 선생님 연습 → 확인 게임(선생님 페이지만 자동으로 누름)
    for (const ph of ['follow', 'game']) {
      const tp = await until(() => T.evaluate(p => { if (window.__cellPhase && window.__cellPhase() === p) return true; window.__cellAuto && window.__cellAuto(); return false; }, ph), 60000, 160);
      if (!tp) { check(`선생님 ${ph} 단계`, false); break; }
      const t0 = await pubAt(ph), t1 = await kidAt(ph);
      times[ph] = t0 && t1 ? (t1 - t0) / 1000 : null;
      check(`아이 화면이 ${ph === 'follow' ? '연습' : '확인 게임'}으로 ${times[ph]}초`, times[ph] != null && times[ph] <= 2.5, times[ph]);
    }
    await shot(K, '4c_kid_cell_game');

    // ── 4. 아이 자동으로 게임 끝 → 결과 보냄 ──
    const kidDoneP = until(() => K.evaluate(() => { if (window.__cellResult) return window.__cellResult; window.__cellAuto && window.__cellAuto(); return null; }), 150000, 160);
    if (SHOTS) { await T.waitForTimeout(16000); await shot(T, '4d_tv_tvs_mid'); await shot(K, '4e_kid_tvs_mid'); }   // TV 소리 모드 한가운데(비율 막대)
    const kidDone = await kidDoneP;
    check('아이 확인 게임 끝(별 셋)', kidDone && kidDone.stars === 3, kidDone && kidDone.stars);
    // 소리는 TV 하나 · 답은 각자(11-08 T1) — 두 기기가 같은 판 시간표 · 아이 기기엔 비율 막대 X · TV엔 막대 · 아이 기록 r = 'tvs'
    {
      const kt = await K.evaluate(() => window.__tvs && { role: window.__tvs.role, sd: window.__tvs.sd, wall: performance.timeOrigin + window.__tvs.start, clock: window.__roomClock });
      const tt = await T.evaluate(() => window.__tvs && { role: window.__tvs.role, sd: window.__tvs.sd, wall: performance.timeOrigin + window.__tvs.start, ratio: window.__tvsRatio, bar: !!document.querySelector('.tvs-ratio') });
      const skew = kt && tt ? Math.abs(kt.wall - tt.wall) : null;
      check(`TV 소리 모드 — 같은 씨앗 · 시간표 어긋남 ${skew == null ? '?' : Math.round(skew)}ms(서버 왕복 ${kt && kt.clock ? Math.round(kt.clock.rtt) : '?'}ms)`, kt && tt && kt.role === 'kid' && tt.role === 'tv' && kt.sd === tt.sd && skew < 400, { kt, tt });
      const seen = await until(() => T.evaluate(() => window.__tvsSeen || 0), 5000);
      check(`TV에 비율 막대(아이 답이 모임 · 최고 ${seen})`, tt && tt.bar && seen >= 1, { ratio: tt && tt.ratio, seen });
      const kr = await K.evaluate(() => ({ bar: !!document.querySelector('.tvs-ratio'), r: JSON.parse(localStorage.getItem('mn.prog') || '{}').so4?.hist?.slice(-1)[0]?.r }));
      check('아이 기기엔 비율 막대 X · 기록 r = tvs', !kr.bar && kr.r === 'tvs', kr);
    }
    const sent = await until(() => K.evaluate(() => window.__roomSent), 8000);
    const sentAt = Date.now();
    check('아이 결과 보냄', sent && sent.ok && sent.cell === 'so4' && sent.s === 3 && sent.n > 0, sent);
    check('아이 결과에 두 글자 t — 틀린 갈래 없음(x) · 별 0 이어짐 0', sent && sent.t === 'x0', sent && sent.t);
    const kbar = await K.locator('.cbarslot').innerText().catch(() => '');
    check('아이 결과 아래 "선생님을 기다려요"(다음 놀이 X)', kbar.includes('선생님을 기다려요') && !kbar.includes('다음 놀이'), kbar);
    const kcard = await until(() => K.evaluate(() => document.querySelector('.resultcard .rsent')?.textContent), 4000);
    check('아이 결과 카드에 "TV에 갔어요" 한 줄', kcard === 'TV에 갔어요', kcard);
    check('아이 결과 화면 스크롤 0', (await scrollOf(K)) <= 1 && await K.evaluate(() => { const c = document.querySelector('.resultcard'), o = c && c.closest('.overlay'); return !!c && c.getBoundingClientRect().bottom <= (o ? o.getBoundingClientRect().bottom : innerHeight) + 1; }));
    await shot(K, '5_kid_result');
    // TV 모인 결과 띠 — '끝낸 아이 1 / 1' 반 막대 · 번호 · 별 · 친구 칩 X(X6 · 9살 공격 채택)
    const stripOf = () => T.evaluate(() => {
      const s = document.querySelector('.rstrip'), b = s && s.querySelector('.rs-bar i');
      return s && { head: s.querySelector('.rs-head').textContent, txt: s.innerText.replace(/방 \d{4}/, ''), chips: s.querySelectorAll('.rs-chip,[data-no]').length, svgs: s.querySelectorAll('svg').length, w: b ? b.style.width : null };
    });
    const st1 = await until(async () => { const v = await stripOf(); return v && /끝낸 아이 1 \/ 1/.test(v.head) && v; }, 8000);
    check(`TV 띠 '끝낸 아이 1 / 1' 반 막대 (${((Date.now() - sentAt) / 1000).toFixed(1)}초) — "${st1 && st1.head}"`, !!st1 && st1.w === '100%', st1);
    check('TV 띠에 아이 번호 · 별 · 친구 칩 없음', !!st1 && !/(^|\D)7(\D|$)/.test(st1.txt) && !/null|undefined/.test(st1.txt) && !st1.chips && !st1.svgs, st1);
    check('TV 칸 화면 스크롤 0', (await scrollOf(T)) <= 1);
    await shot(T, '6_tv_strip_game');

    // ── 5. 선생님도 게임 끝 → 결과 카드 뒤에도 띠가 남음 · 아이는 결과 그대로 ──
    const tDone = await until(() => T.evaluate(() => { if (window.__cellResult) return true; window.__cellAuto && window.__cellAuto(); return false; }), 150000, 160);
    await until(() => T.evaluate(() => window.__roomPub && window.__roomPub.phase === 'done'), 8000);
    await T.waitForTimeout(2600);
    const after = await stripOf();
    check('선생님 결과 카드 뒤에도 띠에 끝낸 아이 1 / 1이 남음', tDone && after && /끝낸 아이 1 \/ 1/.test(after.head) && after.w === '100%', after);
    const kStill = await K.evaluate(() => window.__cellPhase && window.__cellPhase());
    check('선생님 결과(done) 뒤 아이는 결과 화면 그대로', kStill === 'result', kStill);
    await shot(T, '7_tv_strip_result');
    // 크게 보기 — 같은 규칙(번호 · 아이별 별 X) · 별 분포는 1~3명인 칸을 '조금'으로
    //  잘림 잣대: 줄마다 카드 안쪽 상자 안인지(카드가 화면 안인 것만으로는 아래 줄이 카드 밖으로 밀린 것을 못 봄 — 11-13)
    const clipOf = () => T.evaluate(() => {
      const a = document.querySelector('.rsall:not([hidden]) .rsall-card');
      if (!a) return null;
      const r = a.getBoundingClientRect(), cs = getComputedStyle(a), px = k => parseFloat(cs[k]) || 0;
      const box = { t: r.top + px('paddingTop') - 1, b: r.bottom - px('paddingBottom') + 1, l: r.left + px('paddingLeft') - 1, rr: r.right - px('paddingRight') + 1 };
      const out = [...a.querySelectorAll('.rsall-top > *, .rsd-row, .rsb-h, .rsb-row, .rsb-zero > *, .rsall-none')].filter(e => { const q = e.getBoundingClientRect(); return q.height < 1 || q.top < box.t || q.bottom > box.b || q.left < box.l || q.right > box.rr; }).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().bottom) + '>' + Math.round(box.b));
      const c = a.querySelector('.rsall-cols');
      return { out, over: c ? c.scrollHeight - c.clientHeight : 0, free: c ? Math.round(c.clientHeight - Math.max(...[...c.children].map(x => [...x.children].reduce((m, y) => Math.max(m, y.getBoundingClientRect().bottom), 0) - [...x.children].reduce((m, y) => Math.min(m, y.getBoundingClientRect().top), 1e9)))) : null };
    });
    await tap(T, '.rstrip');
    const big = await until(() => T.evaluate(() => {
      const a = document.querySelector('.rsall:not([hidden]) .rsall-card');
      if (!a) return null;
      const rows = [...a.querySelectorAll('.rsd-row')].map(r => r.querySelector('b').textContent);
      return { head: a.querySelector('h2').textContent, txt: a.innerText, chips: a.querySelectorAll('.rs-chip,[data-no]').length, rows, bar: a.querySelector('.rs-bar i')?.style.width };
    }), 3000);
    check(`크게 보기 — 번호 X · 별 분포 ${big && big.rows.join(' · ')}`, !!big && /끝낸 아이 1 \/ 1/.test(big.head) && big.bar === '100%' && !big.chips && !/(^|\D)7(\D|$)/.test(big.txt.replace(/방 \d{4}/, '')) && big.rows.join('|') === '조금|0명|0명|0명' && !/null|undefined/.test(big.txt), big);
    check('크게 보기 화면 스크롤 0', (await scrollOf(T)) <= 1);
    const clip1 = await clipOf();
    check('크게 보기 — 머리 줄 · 별 분포 네 줄이 카드 안(잘림 0)', !!clip1 && !clip1.out.length, clip1);
    await shot(T, '7b_tv_strip_big');
    await T.locator('.rsall-btns button', { hasText: '닫기' }).click();

    // ── 5b. 다른 TVS 칸 — 가1 솔·미(여러 번 누르는 답)도 소리는 TV 하나 · 답은 각자(X2 · 칸 모듈의 TVS = true) ──
    {
      await K.evaluate(() => { window.__cellResult = null; window.__tvs = null; window.__roomSent = null; });
      await T.evaluate(() => { window.__cellResult = null; window.__tvs = null; window.__tvsSeen = 0; location.hash = '#/tvcell/ga1'; });
      const kidOn = await until(() => K.evaluate(() => location.hash.includes('cell/ga1') && window.__cellPhase && window.__cellPhase() === 'show'), 8000, 80);
      check('아이 화면이 솔·미 보기로', !!kidOn);
      for (const ph of ['follow', 'game']) {
        const tp = await until(() => T.evaluate(p => { if (window.__cellPhase && window.__cellPhase() === p) return true; window.__cellAuto && window.__cellAuto(); return false; }, ph), 60000, 160);
        if (!tp) { check(`선생님 가1 ${ph} 단계`, false); break; }
      }
      const guideTxt = await T.locator('.tvg-text').innerText().catch(() => '');
      check('TV 안내 줄 = 가1 TV 소리 발문', guideTxt.includes('소리는 TV에서만'), guideTxt.slice(0, 40));
      const kd = await until(async () => {
        if (SHOTS && !kd2) { const mid = await K.evaluate(() => window.__tvs && performance.now() - window.__tvs.start > 20000); if (mid) { kd2 = 1; await shot(T, '7b_tv_tvs_ga1'); await shot(K, '7c_kid_tvs_ga1'); } }
        return K.evaluate(() => { if (window.__cellResult && window.__cellResult.id === 'ga1') return window.__cellResult; window.__cellAuto && window.__cellAuto(); return null; });
      }, 150000, 160);
      check('아이 가1 끝(TV 소리 모드 · 별 셋)', kd && kd.stars === 3, kd && { stars: kd.stars, title: kd.title });
      const kt = await K.evaluate(() => window.__tvs && { role: window.__tvs.role, cell: window.__tvs.cell, sd: window.__tvs.sd, wall: performance.timeOrigin + window.__tvs.start });
      const tt = await T.evaluate(() => window.__tvs && { role: window.__tvs.role, cell: window.__tvs.cell, sd: window.__tvs.sd, wall: performance.timeOrigin + window.__tvs.start, bar: !!document.querySelector('.tvs-ratio') });
      const skew = kt && tt ? Math.abs(kt.wall - tt.wall) : null;
      check(`가1 TV 소리 모드 — 같은 씨앗 · 시간표 어긋남 ${skew == null ? '?' : Math.round(skew)}ms`, kt && tt && kt.cell === 'ga1' && tt.cell === 'ga1' && kt.role === 'kid' && tt.role === 'tv' && kt.sd === tt.sd && skew < 400, { kt, tt });
      const seen = await until(() => T.evaluate(() => window.__tvsSeen || 0), 5000);
      check(`가1 TV에 '같게 · 다르게' 막대(최고 ${seen})`, tt && tt.bar && seen >= 1, seen);
      const kr = await K.evaluate(() => ({ bar: !!document.querySelector('.tvs-ratio'), r: JSON.parse(localStorage.getItem('mn.prog') || '{}').ga1?.hist?.slice(-1)[0]?.r }));
      check('가1 아이 기기엔 막대 X · 기록 r = tvs', !kr.bar && kr.r === 'tvs', kr);
      const sent2 = await until(() => K.evaluate(() => window.__roomSent), 8000);
      check('가1 아이 결과 보냄(t = x0)', sent2 && sent2.ok && sent2.cell === 'ga1' && sent2.s === 3 && sent2.t === 'x0', sent2);
      const tEnd = await until(() => T.evaluate(() => window.__cellResult && window.__cellResult.title), 30000);
      check('가1 TV 결과 = 반 전체', /반 전체/.test(tEnd || ''), tEnd);
      check('가1 TV · 아이 화면 스크롤 0', (await scrollOf(T)) <= 1 && (await scrollOf(K)) <= 1);
      await shot(T, '7d_tv_ga1_result');
    }

    // ── 5c. 틀린 갈래 막대 · 별 0이 이어진 아이(X6 둘째 · X11) — 가짜 기기 여덟이 가1 결과를 두 글자 t와 함께 보냄 ──
    //  TV에는 갈래 이름과 몇 명만(번호 X · 1~3명은 '조금') · 누구인지는 '복사'한 표에만
    {
      const TS = { '.sv': 'timestamp' };
      const put = (dev, body) => fetch(`${DB}/rooms/${room}/res/${dev}.json`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 1, c: 'ga1', n: 8, at: TS, ...body }) }).then(r => r.ok).catch(() => false);
      const fakes = [
        ...[31, 32, 33, 34, 35].map(no => ['zzfake' + no, { no, s: 0, k: 2, t: '12' }]),   // 갈래 1(세 음 메아리) · 오늘 별 0이 두 번 이어짐
        ['zzfake36', { no: 36, s: 1, k: 4, t: '00' }],                                     // 갈래 0(같은 음 두 번)
        ['zzfake37', { no: 37, s: 1, k: 4, t: '20' }],                                     // 갈래 2(솔-미 · 미-솔) — 갈래 세 줄 + 별 0 줄 = 가장 높은 꼴
        ['zzfake38', { no: 38, s: 0, k: 3, t: 'x1' }],                                     // 갈래 말 없음 · 별 0은 처음
      ];
      const oks = await Promise.all(fakes.map(([d, b]) => put(d, b)));
      check('가짜 기기 여덟의 결과(두 글자 t)가 서버에 닿음', oks.every(Boolean), oks);
      const bad = await fetch(`${DB}/rooms/${room}/res/zzfake39.json`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ a: 1, no: 39, c: 'ga1', s: 0, k: 1, n: 8, at: TS, t: '세 음' }) }).then(r => r.ok).catch(() => null);
      check('t에 글(갈래 이름)을 넣은 결과는 서버가 막음', bad === false, bad);
      await T.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); });
      const st9 = await until(async () => { const v = await stripOf(); return v && /끝낸 아이 9 \/ 9/.test(v.head) && v; }, 9000);
      check(`TV 띠 '끝낸 아이 9 / 9' — 띠에는 번호 · 갈래 X`, !!st9 && !/3[1-8]/.test(st9.txt) && !/메아리|같은 음/.test(st9.txt) && !st9.chips, st9);
      await tap(T, '.rstrip');
      const side = await until(() => T.evaluate(() => {
        const a = document.querySelector('.rsall:not([hidden]) .rsall-card'), s = a && a.querySelector('.rsall-side');
        if (!s || !/9 \/ 9/.test(a.querySelector('h2').textContent)) return null;
        const r = a.getBoundingClientRect(), small = [...s.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 17.5).map(e => e.className + ' ' + getComputedStyle(e).fontSize);
        const names = [...s.querySelectorAll('.rsb-name')];
        return {
          head: a.querySelector('h2').textContent, h3: s.querySelector('.rsb-h')?.textContent, txt: a.innerText.replace(/방 \d{4}/, ''),
          stars: [...a.querySelectorAll('.rsd-row')].map(x => x.querySelector('b').textContent),
          rows: [...s.querySelectorAll('.rsb-row')].map(x => x.querySelector('.rsb-name').textContent + '=' + x.querySelector('b').textContent),
          bars: [...s.querySelectorAll('.rsb-row .rsd-bar i')].map(i => i.className || i.style.width),
          zero: s.querySelector('.rsb-zero b')?.textContent, zs: s.querySelector('.rsb-zero span')?.textContent,
          chips: a.querySelectorAll('.rs-chip,[data-no]').length, small,
          fit: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          cut: names.some(e => e.scrollWidth > e.clientWidth + 1),
        };
      }), 8000);
      check(`크게 보기 — 많이 틀린 갈래 ${side && side.rows.join(' · ')}`, !!side && side.h3 === '많이 틀린 갈래' && side.rows.join('|') === '세 음 메아리=5명|같은 음 두 번(솔-솔 · 미-미)=조금|솔-미 · 미-솔=조금' && side.bars.join('|') === '56%|few|few', side);
      check(`크게 보기 — "${side && side.zero}" · 별 분포 ${side && side.stars.join(' · ')}`, !!side && side.zero === '별 0이 이어진 아이 5명' && /복사/.test(side.zs || '') && side.stars.join('|') === '조금|0명|조금|6명', side);
      check('크게 보기 — 아이 번호 · 짝꿍 이름 X · 화면 안 · 글자 17.5px 넘음 · 갈래 이름 안 잘림', !!side && !side.chips && !/(^|\D)(7|3[1-8])(\D|$)/.test(side.txt) && !/null|undefined/.test(side.txt) && side.fit && !side.small.length && !side.cut, side);
      check('크게 보기(갈래 막대) 화면 스크롤 0', (await scrollOf(T)) <= 1);
      const clip2 = await clipOf();
      check(`크게 보기 — 갈래 세 줄 + 별 0 줄이 카드 안(잘림 0 · 굴림 0 · 남는 높이 ${clip2 && clip2.free}px)`, !!clip2 && !clip2.out.length && clip2.over <= 1, clip2);
      await shot(T, '7e_tv_branch_big');
      // 복사 — 번호와 함께 갈래 · 별 0 연속(이 표에만)
      await T.locator('.rsall-btns button', { hasText: '복사' }).click();
      const copied = await until(() => T.evaluate(() => window.__copied), 3000);
      const lines = (copied || '').split('\n');
      check('복사한 표 — 머리 줄 · 번호 차례 열 줄', lines[1] === '번호\t짝꿍\t별\t맞힌 수/전체\t틀린 갈래\t별 0 연속' && lines.length === 11 && lines.slice(2).map(l => +l.split('\t')[0]).join() === '7,31,32,33,34,35,36,37,38', lines.slice(0, 4));
      check('복사한 표 — 31번 = 세 음 메아리 · 별 0 연속 2 / 36번 = 같은 음 두 번 / 38번 = 빈칸',
        lines.some(l => /^31\t[^\t]+\t0\t2\/8\t세 음 메아리\t2$/.test(l)) && lines.some(l => /^36\t[^\t]+\t1\t4\/8\t같은 음 두 번\(솔-솔 · 미-미\)\t$/.test(l)) && lines.some(l => /^38\t[^\t]+\t0\t3\/8\t\t$/.test(l)) && lines.some(l => /^7\t[^\t]+\t3\t\d+\/\d+\t\t$/.test(l)), lines.slice(2));
      check('복사 뒤 TV에 글 상자가 뜨지 않음', await T.evaluate(() => !document.querySelector('.copymodal')));
      await T.locator('.rsall-btns button', { hasText: '닫기' }).click();
      // 가짜 기기 치우기 — 띠가 다시 1 / 1
      const dels = await Promise.all(fakes.map(([d]) => fetch(`${DB}/rooms/${room}/res/${d}.json`, { method: 'DELETE' }).then(r => r.ok).catch(() => false)));
      const st1b = await until(async () => { const v = await stripOf(); return v && /끝낸 아이 1 \/ 1/.test(v.head) && v; }, 9000);
      check('가짜 기기 치움 — 띠가 다시 끝낸 아이 1 / 1', dels.every(Boolean) && !!st1b, { dels, st1b });
    }

    // ── 6. 아이 나가기 ──
    await tap(K, '.roomchip');
    await K.locator('.rmodal button', { hasText: '나가기' }).click();
    const left = await until(() => K.evaluate(() => !localStorage.getItem('mn.kroom') || localStorage.getItem('mn.kroom') === 'null'), 3000);
    const dev = await K.evaluate(() => JSON.parse(localStorage.getItem('mn.kdev') || 'null'));
    const gone = await until(async () => (await (await fetch(`${DB}/rooms/${room}/res/${dev}.json`)).json()) === null, 6000, 300);
    check('아이 나가기 → 기기에서 잊고 결과 칸 지움', !!left && !!gone, { left, gone });
    check('콘솔 오류 0(선생님)', !errs.T.length, errs.T.slice(0, 3));
    check('콘솔 오류 0(아이)', !errs.K.length, errs.K.slice(0, 3));
    console.log(`  아이 화면이 바뀌는 데 걸린 초 — 보기 ${times.show} · 연습 ${times.follow} · 확인 게임 ${times.game}`);
  } catch (e) { fail++; console.log('✗ 시험이 멈춤', e && e.message); }
  finally { await browser.close(); server.close(); }
  console.log(fail ? `✗ 방 브라우저 시험 실패 ${fail}` : '✓ 방 브라우저 시험 통과');
  process.exit(fail ? 1 : 0);
})();
