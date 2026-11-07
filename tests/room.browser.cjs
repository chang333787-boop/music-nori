// 방 번호 다같이 브라우저 시험(진짜 DB · 네트워크) — 브라우저 하나에 페이지 둘(선생님 TV · 아이 기기 · 저장소가 섞이지 않게 창 둘)
//  선생님 방 열기 → 아이 들어가기(틀린 방 번호 → "다시 봐요" 먼저) → 선생님 높게·낮게 보기 → 아이 화면이 보기로(2.5초 안)
//  → 연습 → 확인 게임 → 아이 자동으로 게임 끝 → TV 모인 결과에 그 아이 번호 · 별 → 선생님 결과 뒤에도 띠가 남음 → 아이 나가기
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
    const kidDone = await until(() => K.evaluate(() => { if (window.__cellResult) return window.__cellResult; window.__cellAuto && window.__cellAuto(); return null; }), 150000, 160);
    check('아이 확인 게임 끝(별 셋)', kidDone && kidDone.stars === 3, kidDone && kidDone.stars);
    const sent = await until(() => K.evaluate(() => window.__roomSent), 8000);
    const sentAt = Date.now();
    check('아이 결과 보냄', sent && sent.ok && sent.cell === 'so4' && sent.s === 3 && sent.n > 0, sent);
    const kbar = await K.locator('.cbarslot').innerText().catch(() => '');
    check('아이 결과 아래 "선생님을 기다려요"(다음 놀이 X)', kbar.includes('선생님을 기다려요') && !kbar.includes('다음 놀이'), kbar);
    await shot(K, '5_kid_result');
    // TV 모인 결과 띠에 7번 · 별 셋
    const chipOk = await until(() => T.evaluate(() => { const c = document.querySelector('.rs-chip[data-no="7"]'); return c && c.dataset.s === '3' && document.querySelector('.rs-head').textContent; }), 8000);
    check(`TV 띠에 7번 · 별 3 (${((Date.now() - sentAt) / 1000).toFixed(1)}초) — "${chipOk}"`, !!chipOk && /끝낸 아이 1명/.test(chipOk), chipOk);
    check('TV 칸 화면 스크롤 0', (await scrollOf(T)) <= 1);
    await shot(T, '6_tv_strip_game');

    // ── 5. 선생님도 게임 끝 → 결과 카드 뒤에도 띠가 남음 · 아이는 결과 그대로 ──
    const tDone = await until(() => T.evaluate(() => { if (window.__cellResult) return true; window.__cellAuto && window.__cellAuto(); return false; }), 150000, 160);
    await until(() => T.evaluate(() => window.__roomPub && window.__roomPub.phase === 'done'), 8000);
    await T.waitForTimeout(2600);
    const after = await T.evaluate(() => ({ chip: !!document.querySelector('.rs-chip[data-no="7"]'), head: document.querySelector('.rs-head')?.textContent }));
    check('선생님 결과 카드 뒤에도 띠에 7번이 남음', tDone && after.chip, after);
    const kStill = await K.evaluate(() => window.__cellPhase && window.__cellPhase());
    check('선생님 결과(done) 뒤 아이는 결과 화면 그대로', kStill === 'result', kStill);
    await shot(T, '7_tv_strip_result');

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
