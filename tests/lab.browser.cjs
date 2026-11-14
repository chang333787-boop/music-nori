// 악보 판 · 찾아 쓰기 브라우저 시험(11-14 · docs/flow.md) — 진짜 누르기로(page.click) 본다
//  악보 판(#/lab): 기호를 고르고 악보를 누르면 들어가고(악보에 그려지고 수가 늘고) 한 번 더 누르면 빠진다 ·
//    곡 전체에 걸리는 기호(빠르기말 · 악기 · 박자표)는 누르면 바로 바뀐다 · 주소로 기호를 가리킨다 ·
//    [듣기] · [기호 빼고 듣기] · [다 빼기] · [다른 가락] · 글쇠(Esc · 스페이스 · Enter)
//  찾아 쓰기(#/find): 찾는 말 → 요소의 공부 차례 · 담기 / 빼기 / 목록 복사 · [열기] 주소가 모두 제 화면을 연다 · 선생님 칸에서 드나드는 길
//  규칙(글자 18px · 주황 하나 · 빈 칭찬 X)은 tests/rules.browser.cjs, 규칙 계산은 tests/marks.test.mjs · tests/flow.test.mjs
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
const SHOT = process.env.SHOT_DIR || '';            // 주면 그 폴더에 화면 그림을 남긴다(보고용 · 저장소에 넣지 않음)

server.listen(0, async () => {
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  let fail = 0, pass = 0;
  const T = (name, cond, info) => { if (cond) { pass++; console.log('✓ ' + name); } else { fail++; console.log('✗ ' + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); } };
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const noErr = name => { T(`${name} — 콘솔 오류 0`, !errs.length, errs.slice(0, 3)); errs.length = 0; };
    const go = async (hash, ms = 600) => { await page.evaluate(x => { location.hash = x; }, hash); await page.waitForTimeout(ms); };
    const shot = async name => { if (SHOT) await page.screenshot({ path: path.join(SHOT, name + '.png') }); };
    const click = (sel, k = 0) => page.locator(sel).nth(k).click({ timeout: 3000 });
    const st = () => page.evaluate(() => window.__labState());
    const ui = () => page.evaluate(() => {
      const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; };
      const on = b => b.getAttribute('aria-pressed') === 'true';
      const m = document.getElementById('main');
      return {
        tabs: qa('.sl-tabs [data-group]').map(b => b.dataset.group + (on(b) ? '*' : '')),
        chips: qa('.sl-chip').map(b => b.dataset.sign + (on(b) ? '*' : '') + (b.classList.contains('hint') ? '?' : '')),
        hits: qa('.sl-hit').length, can: qa('.sl-hit.can').length, inn: qa('.sl-hit.in').length,
        letters: qa('.sl-letter').map(e => e.textContent), hairs: qa('.sl-hair').length, ties: qa('.signlab .st-tie').length, ferm: qa('.sl-ferm').length,
        tempo: q('.sl-tempo') ? q('.sl-tempo').textContent : null, tch: q('.sl-tch') ? q('.sl-tch').textContent : null,
        play: q('.sl-play').textContent.trim(), bareOff: q('.sl-bare').disabled, clearOff: q('.sl-clear').disabled,
        inst: q('.sl-inst') ? q('.sl-inst').textContent.trim() : null, phname: q('.sl-phname').textContent.trim(), fact: q('.sl-fact').textContent.trim(),
        go: qa('.go').filter(vis).length,
        scroll: Math.max(document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth, m.scrollHeight - m.clientHeight),
        hash: decodeURIComponent(location.hash),
      };
    });

    await page.goto(base + '#/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    // ── 처음 화면에서 들어가는 길 ──
    await go('#/', 700);
    await click('a.acard[href="#/lab"]');
    await page.waitForTimeout(800);
    let s = await st(), u = await ui();
    T('처음 화면의 [악보 판] 카드 → #/lab', u.hash === '#/lab' && !!s);
    T('악보 판 처음 — 셈여림 묶음 · 기호 0개 · 고른 기호 없음', s.group === 'dyn' && s.phrase === 'ode' && s.count === 0 && s.sign === null && s.mode === null, s);
    T('묶음 단추 여덟 · 셈여림이 눌린 모양', u.tabs.join(' ') === 'dyn* tempo inst len repeat meter key chord', u.tabs);
    T('기호가 없으면 [기호 빼고 듣기] · [다 빼기]는 눌리지 않음', u.bareOff && u.clearOff);
    T('주황 단추는 [듣기] 하나 · 스크롤 0', u.go === 1 && u.play === '듣기' && u.scroll <= 1, { go: u.go, play: u.play, scroll: u.scroll });

    // ── 기호 없이 음을 누르면 그 음만 들린다(바뀌는 것 없음) ──
    await click('.sl-hit', 2);
    await page.waitForTimeout(200);
    s = await st();
    T('기호를 고르지 않고 음을 누르면 악보는 그대로', s.count === 0 && s.mode === null, s);

    // ── 넣기 · 빼기: 여리게 p ──
    await click('.sl-chip[data-sign="p"]');
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('[여리게 p]를 고르면 눌린 모양 · 놓을 자리 15곳', s.sign === 'p' && u.chips.includes('p*') && u.can === 15 && u.inn === 0, { sign: s.sign, can: u.can });
    await click('.sl-hit.can', 0);
    await page.waitForTimeout(120);
    s = await st(); u = await ui();
    T('악보의 음을 누르면 p가 들어감 — 악보에 글자 · 수 1 · 그 마디가 들림', s.count === 1 && s.marks.dyn[0] === 'p' && u.letters.join('') === 'p' && u.inn === 1 && s.mode === 'pre', { count: s.count, letters: u.letters, mode: s.mode });
    T('기호가 있으면 [기호 빼고 듣기] · [다 빼기]가 눌림', !u.bareOff && !u.clearOff);
    await page.waitForFunction(() => window.__labState().mode === null, null, { timeout: 9000 }).catch(() => {});
    s = await st();
    T('그 마디를 다 들려주면 멈춘 모습으로', s.mode === null && !s.playing, s.mode);
    await click('.sl-hit.in', 0);
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('같은 자리를 한 번 더 누르면 빠짐 — 글자 없음 · 수 0', s.count === 0 && u.letters.length === 0 && u.inn === 0 && u.clearOff, { count: s.count, letters: u.letters });

    // ── 마디에 넣는 기호: 점점 세게 ──
    await click('.sl-chip[data-sign="cresc"]');
    await page.waitForTimeout(150);
    u = await ui();
    T('[점점 세게]는 마디 넷에 놓음', u.can === 4, u.can);
    await click('.sl-hit.can', 1);
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('둘째 마디에 점점 세게 — 악보에 벌어지는 선', s.count === 1 && s.marks.hair[1] === 'cresc' && u.hairs === 1, { hair: s.marks.hair, hairs: u.hairs });
    await click('.sl-chip[data-sign="f"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can', 8);
    await page.waitForTimeout(150);
    await click('.sl-chip[data-sign="accent"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can', 4);
    await page.waitForTimeout(150);
    s = await st();
    T('세게 f · 악센트를 더 넣음 — 기호 3개', s.count === 3 && s.marks.dyn[8] === 'f' && s.marks.accent[4] === true, { count: s.count, dyn: s.marks.dyn, accent: s.marks.accent });
    await shot('lab_dyn');

    // ── 듣기 · 기호 빼고 듣기 ──
    await click('.sl-play');
    await page.waitForTimeout(400);
    s = await st(); u = await ui();
    T('[듣기] → 가락 전체가 들리고 단추는 [멈추기]', s.mode === 'full' && s.playing && u.play === '멈추기' && u.go === 1, { mode: s.mode, play: u.play });
    await click('.sl-play');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[멈추기] → 멈춤 · 단추는 [듣기]', s.mode === null && u.play === '듣기', { mode: s.mode, play: u.play });
    await click('.sl-bare');
    await page.waitForTimeout(400);
    s = await st(); u = await ui();
    T('[기호 빼고 듣기] → 들리는 동안 악보도 기호 없이 보임', s.mode === 'bare' && s.bare && u.hairs === 0 && u.letters.length === 0 && s.count === 3, { mode: s.mode, hairs: u.hairs, letters: u.letters });
    await click('.sl-bare');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    T('한 번 더 누르면 멈추고 기호가 돌아옴', s.mode === null && !s.bare && u.hairs === 1 && u.letters.join('') === 'f' && s.count === 3, { mode: s.mode, hairs: u.hairs, letters: u.letters });

    // ── 글쇠: Esc · Enter · 스페이스 ──
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    s = await st(); u = await ui();
    T('Esc → 고른 기호를 내려놓음(넣은 기호는 그대로)', s.sign === null && s.count === 3 && u.can === 0, { sign: s.sign, can: u.can });
    await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    s = await st();
    T('스페이스 → 듣기', s.mode === 'full', s.mode);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    s = await st();
    T('스페이스 한 번 더 → 멈춤', s.mode === null, s.mode);
    await click('.sl-chip[data-sign="pp"]');
    await page.waitForTimeout(120);
    await page.evaluate(() => document.querySelectorAll('.sl-hit.can')[12].focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    s = await st();
    T('글쇠로도 넣음 — 자리에 초점을 두고 Enter', s.count === 4 && s.marks.dyn[12] === 'pp', { count: s.count, dyn: s.marks.dyn });

    // ── 다른 가락: 가락마다 넣은 기호를 따로 기억 ──
    const name0 = (await ui()).phname;
    await click('.sl-next');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[다른 가락] → 가락이 바뀌고 그 가락은 기호 0개', s.phrase !== 'ode' && s.count === 0 && u.phname !== name0, { phrase: s.phrase, phname: u.phname });
    for (let i = 0; i < 20 && (await st()).phrase !== 'ode'; i++) { await click('.sl-next'); await page.waitForTimeout(150); }
    s = await st();
    T('가락을 한 바퀴 돌아 처음 가락으로 — 넣어 둔 기호 4개 그대로', s.phrase === 'ode' && s.count === 4, { phrase: s.phrase, count: s.count });

    // ── 다 빼기 ──
    await click('.sl-clear');
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('[다 빼기] → 기호 0개 · 다시 눌리지 않음', s.count === 0 && u.clearOff && u.bareOff && /모두 뺐어요/.test(u.fact), { count: s.count, fact: u.fact });
    noErr('악보 판 셈여림');

    // ── 빠르기: 곡 전체 기호는 누르면 바로 ──
    await click('.sl-tabs [data-group="tempo"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    T('[빠르기] 묶음 → 주소도 #/lab/tempo · 악보 위에 빠르기말', s.group === 'tempo' && u.hash === '#/lab/tempo' && u.tabs.includes('tempo*') && !!u.tempo, { hash: u.hash, tempo: u.tempo });
    const tempo0 = u.tempo;
    await click('.sl-chip[data-sign="fast"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[빠르게] → 바로 바뀜 — 악보의 빠르기말과 숫자가 달라지고 앞부분이 들림', s.marks.tempo === 'fast' && s.count === 1 && u.tempo !== tempo0 && u.chips.includes('fast*') && s.mode === 'pre', { tempo: u.tempo, was: tempo0, mode: s.mode });
    await click('.sl-chip[data-sign="rit"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can', 2);
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('[점점 느리게]를 셋째 마디부터 — 악보 위에 글', s.count === 2 && !!s.marks.tchange && s.marks.tchange.bar === 2 && !!u.tch, { tchange: s.marks.tchange, tch: u.tch });
    await shot('lab_tempo');
    await click('.sl-chip[data-sign="fast"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[빠르게]를 한 번 더 → 본래 빠르기로', s.marks.tempo === null && u.tempo === tempo0, { tempo: u.tempo });

    // ── 악기 소리 ──
    await click('.sl-tabs [data-group="inst"]');
    await page.waitForTimeout(250);
    const inst0 = (await ui()).inst;
    await click('.sl-chip[data-sign="violin"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[바이올린] → 악기 이름이 바뀜', s.marks.inst === 'violin' && /바이올린/.test(u.inst) && u.inst !== inst0, { inst: u.inst, was: inst0 });
    noErr('악보 판 빠르기 · 악기');

    // ── 음의 길이: 쉼표 · 붙임줄 · 늘임표 · 스타카토 ──
    await click('.sl-tabs [data-group="len"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    const ties0 = u.ties;
    T('[음의 길이] 묶음 → 가락이 바뀜(아 비뇽 다리 위에서 말고 달빛 아래서)', s.group === 'len' && s.phrase === 'auclair' && s.count === 0, { phrase: s.phrase });
    await click('.sl-chip[data-sign="tie"]');
    await page.waitForTimeout(120);
    u = await ui();
    T('[붙임줄]은 같은 높이로 이어지는 두 음 사이에만(3곳)', u.can === 3, u.can);
    await click('.sl-hit.can', 0);
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('붙임줄을 넣음 — 악보에 이음줄', s.count === 1 && u.ties === ties0 + 1, { count: s.count, ties: u.ties });
    await click('.sl-chip[data-sign="fermata"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can:not(.in)', 5);
    await page.waitForTimeout(150);
    await click('.sl-chip[data-sign="rest"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can:not(.in)', 3);
    await page.waitForTimeout(150);
    await click('.sl-chip[data-sign="stacc"]');
    await page.waitForTimeout(120);
    await click('.sl-hit.can:not(.in)', 6);
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('늘임표 · 쉼표 · 스타카토를 더 넣음 — 기호 4개 · 악보에 늘임표', s.count === 4 && u.ferm === 1 && Object.keys(s.marks.rest).length === 1 && Object.keys(s.marks.stacc).length === 1, { count: s.count, ferm: u.ferm, rest: s.marks.rest, stacc: s.marks.stacc });
    T('이 화면도 스크롤 0 · 주황 하나', u.scroll <= 1 && u.go === 1, { scroll: u.scroll, go: u.go });
    await shot('lab_len');
    noErr('악보 판 음의 길이');

    // ── 되풀이: 도돌이표 · 1 · 2번 괄호 · D.C. · Fine ──
    await click('.sl-tabs [data-group="repeat"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    T('[되풀이] 묶음 → 기호 넷(도돌이표 · 1 · 2번 괄호 · D.C. · Fine) · 고른 기호 없음', s.group === 'repeat' && s.sign === null && u.chips.join(' ') === 'repeat volta dc fine', { sign: s.sign, chips: u.chips });
    await click('.sl-chip[data-sign="repeat"]');
    await page.waitForTimeout(150);
    s = await st(); u = await ui();
    T('[도돌이표]를 고르면 마디 넷이 놓을 자리', s.sign === 'repeat' && u.can === 4, { sign: s.sign, can: u.can });
    await click('.sl-hit.can', 1);
    await page.waitForTimeout(200);
    s = await st();
    T('둘째 마디 끝에 도돌이표 — 저절로 들려주지 않음([듣기]로 처음부터)', s.marks.repeat !== null && s.count === 1 && s.mode === null, { repeat: s.marks.repeat, mode: s.mode });
    await click('.sl-play');
    await page.waitForTimeout(300);
    s = await st();
    T('[듣기] → 도돌이표가 있어도 들림', s.mode === 'full' && s.playing, s.mode);
    await click('.sl-play');
    await page.waitForTimeout(150);
    await shot('lab_repeat');
    noErr('악보 판 되풀이');

    // ── 박자: 박자표를 바꾸면 마디줄 자리가 달라짐 ──
    await click('.sl-tabs [data-group="meter"]');
    await page.waitForTimeout(250);
    s = await st();
    const bars0 = s.bars;
    T('[박자] 묶음 → 2/4박자 여섯 마디', s.group === 'meter' && s.phrase === 'frere' && s.meter[0] === 2 && bars0 === 6, { meter: s.meter, bars: bars0 });
    await click('.sl-chip[data-sign="m34"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[3/4] → 같은 가락이 네 마디로 — 마디줄 자리가 바뀜', s.meter[0] === 3 && s.bars === 4 && Array.isArray(s.marks.meter) && s.marks.meter[0] === 3 && u.chips.includes('m34*'), { meter: s.meter, bars: s.bars });
    await shot('lab_meter');
    await click('.sl-chip[data-sign="m44"]');
    await page.waitForTimeout(200);
    s = await st();
    T('[4/4] → 세 마디', s.meter[0] === 4 && s.bars === 3, { meter: s.meter, bars: s.bars });
    await click('.sl-next');
    await page.waitForTimeout(200);
    await click('.sl-chip[data-sign="m34"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('마디가 딱 나누어지지 않는 가락에서는 박자표가 바뀌지 않고 까닭을 알려 줌', s.phrase !== 'frere' && s.marks.meter === null && u.fact.length > 8, { phrase: s.phrase, meter: s.marks.meter, fact: u.fact });
    noErr('악보 판 박자');

    // ══ 묶음 D2 — 조 · 화음 · 1 · 2번 괄호 · D.C. · Fine · 북 반주 ══
    const d2 = () => page.evaluate(() => ({
      ksig: document.querySelectorAll('.signlab .st-ksig').length, acc: [...document.querySelectorAll('.signlab .st-acc:not(.st-ksig)')].map(e => e.textContent),
      staves: document.querySelectorAll('.signlab .st-staff').length, chd: [...document.querySelectorAll('.sl-chd')].map(e => e.textContent),
      low: [...document.querySelectorAll('.sl-low')].map(e => e.textContent), volta: document.querySelectorAll('.sl-volta').length, dc: [...document.querySelectorAll('.sl-dc')].map(e => e.textContent),
      sol: [...document.querySelectorAll('.signlab .st-staff[data-staff="m"] .st-sol')].map(e => e.textContent).join(''),
    }));
    await click('.sl-tabs [data-group="key"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    T('[조] 묶음 → 조 옮기기 · 올림표 · 내림표 · 환희의 송가', s.group === 'key' && s.phrase === 'ode' && u.chips.join(' ') === 'up sharp flat' && u.hash === '#/lab/key', { chips: u.chips, hash: u.hash });
    const c0 = s.count;                                          // 앞 묶음(빠르기 · 악기)에서 이 가락에 넣어 둔 기호
    await click('.sl-chip[data-sign="up"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui(); let x = await d2();
    T('[조 옮기기] → 바로 사장조 — 조표 ♯ 하나 · 계이름은 그대로 · 앞부분이 들림', s.marks.keyup === true && s.key === 7 && x.ksig === 1 && x.sol === '미미파솔솔파미레도도레미미레레' && u.chips.includes('up*') && s.mode === 'pre', { ksig: x.ksig, sol: x.sol, mode: s.mode });
    await click('.sl-chip[data-sign="up"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('한 번 더 → 다장조로(조표 없음 · 기호 수 처음대로)', s.marks.keyup === false && s.count === c0 && x.ksig === 0, { count: s.count, c0, ksig: x.ksig });
    await click('.sl-chip[data-sign="sharp"]');
    await page.waitForTimeout(150);
    u = await ui();
    T('[올림표] → 미가 아닌 음 열 곳에 놓을 수 있음', u.can === 10, u.can);
    await click('.sl-hit[data-at="8"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2(); u = await ui();
    T('도에 올림표 → 악보에 ♯ 하나 · 같은 마디의 다음 도도 도#(효력) · 사실 한 줄', s.marks.acc[8] === 'sharp' && x.acc.join('') === '♯' && /도#도#/.test(x.sol) && /같은 마디/.test(u.fact), { acc: x.acc, sol: x.sol });
    await click('.sl-hit[data-at="8"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('같은 자리를 또 누르면 빠짐 — 본래 계이름', s.count === c0 && x.acc.length === 0 && x.sol === '미미파솔솔파미레도도레미미레레', { count: s.count, c0, sol: x.sol });
    noErr('악보 판 조');

    await click('.sl-tabs [data-group="chord"]');
    await page.waitForTimeout(250);
    s = await st(); u = await ui();
    T('[화음] 묶음 → 둘째 줄 · Ⅰ · Ⅳ · Ⅴ · 작은 별 가락 여덟 마디', s.group === 'chord' && s.phrase === 'ahvous8' && u.chips.join(' ') === 'second I IV V' && s.bars === 8, { chips: u.chips, phrase: s.phrase });
    await click('.sl-chip[data-sign="second"]');
    await page.waitForTimeout(250);
    s = await st(); x = await d2(); u = await ui();
    T('[둘째 줄] → 오선 둘 · 아래 오선 이름 · 스크롤 0', s.marks.second === true && s.staves === 2 && x.staves === 2 && x.low.includes('둘째 줄') && u.scroll <= 1, { staves: s.staves, low: x.low, scroll: u.scroll });
    await click('.sl-chip[data-sign="IV"]');
    await page.waitForTimeout(150);
    u = await ui();
    T('[Ⅳ 파라도]는 마디 여덟에 놓음', u.can === 8, u.can);
    await click('.sl-hit[data-at="2"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('셋째 마디에 Ⅳ → 아래 오선에 화음 이름 · 그 마디는 화음이 들림', s.marks.chord[2] === 'IV' && x.chd.join() === 'Ⅳ 파라도' && s.mode === 'pre', { chord: s.marks.chord, chd: x.chd, mode: s.mode });
    await click('.sl-chip[data-sign="I"]');
    await page.waitForTimeout(120);
    await click('.sl-hit[data-at="2"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('같은 마디에 Ⅰ → 화음이 바뀜(마디마다 하나)', s.marks.chord[2] === 'I' && x.chd.join() === 'Ⅰ 도미솔', { chord: s.marks.chord, chd: x.chd });
    await shot('lab_chord');
    await click('.sl-hit[data-at="2"]');
    await page.waitForTimeout(150);
    await click('.sl-chip[data-sign="second"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('화음 · 둘째 줄을 빼면 오선 하나로', s.count === 0 && s.staves === 1 && x.chd.length === 0, { count: s.count, staves: s.staves });
    noErr('악보 판 화음');

    await go('#/lab/repeat/volta');
    s = await st(); u = await ui();
    T('#/lab/repeat/volta → 1 · 2번 괄호가 골라져 있고 괄호가 잘 들리는 가락(환희의 송가 다섯 마디)', s.sign === 'volta' && s.phrase === 'odev' && u.can === 3, { sign: s.sign, phrase: s.phrase, can: u.can });
    await click('.sl-hit[data-at="3"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2();
    T('넷째 마디에 괄호 → 도돌이표도 함께 · 연주 차례 1 2 3 4 1 2 3 5 · 저절로 들려주지 않음', s.marks.repeat && s.marks.repeat.to === 3 && s.order.join('') === '01230124' && x.volta === 2 && s.mode === null, { order: s.order, volta: x.volta, mode: s.mode });
    await click('.sl-hit[data-at="3"]');
    await page.waitForTimeout(150);
    s = await st();
    T('또 누르면 괄호와 도돌이표가 함께 빠짐', s.count === 0 && s.order.join('') === '01234', { count: s.count, order: s.order });
    await click('.sl-chip[data-sign="dc"]');
    await page.waitForTimeout(200);
    s = await st(); u = await ui();
    T('[D.C.]를 고르면 D.C.가 잘 들리는 가락(작은 별 열두 마디)으로 · 끝 마디 하나에 놓음', s.sign === 'dc' && s.phrase === 'ahvousdc' && u.can === 1, { phrase: s.phrase, can: u.can });
    await click('.sl-hit.can');
    await page.waitForTimeout(150);
    await click('.sl-chip[data-sign="fine"]');
    await page.waitForTimeout(120);
    await click('.sl-hit[data-at="7"]');
    await page.waitForTimeout(200);
    s = await st(); x = await d2(); u = await ui();
    T('D.C. + Fine → 악보에 글 둘 · 차례 a b a(열두 마디 → 여덟 마디)', x.dc.join() === 'Fine,D.C.' || x.dc.join() === 'D.C.,Fine' ? s.order.length === 20 && s.order.slice(12).join() === '0,1,2,3,4,5,6,7' : false, { dc: x.dc, order: s.order });
    T('Fine 사실 줄 — D.C.로 돌아온 뒤 여기서 마침', /여기서 마쳐요/.test(u.fact), u.fact);
    await click('.sl-play');
    await page.waitForTimeout(300);
    s = await st();
    T('[듣기] → 처음부터 들림', s.mode === 'full' && s.playing, s.mode);
    await click('.sl-play');
    await page.waitForTimeout(150);
    await shot('lab_dcfine');
    noErr('악보 판 괄호 · D.C. · Fine');

    await click('.sl-tabs [data-group="inst"]');
    await page.waitForTimeout(250);
    await click('.sl-chip[data-sign="drum"]');
    await page.waitForTimeout(250);
    s = await st(); x = await d2(); u = await ui();
    T('[북 반주] → 북 줄(쿵 · 짝)이 생기고 악기는 그대로 · 앞부분이 들림', s.marks.drum === true && s.staves === 2 && x.low.includes('북') && /피아노/.test(u.inst) && u.chips.includes('drum*') && u.chips.includes('piano*') && s.mode === 'pre', { staves: s.staves, low: x.low, chips: u.chips });
    await click('.sl-chip[data-sign="drum"]');
    await page.waitForTimeout(200);
    s = await st();
    T('한 번 더 → 북 반주가 빠짐', s.marks.drum === false && s.staves === 1, { drum: s.marks.drum, staves: s.staves });
    noErr('악보 판 북 반주');

    // ── 주소로 기호 가리키기(찾아 쓰기의 [열기]) ──
    await go('#/lab/dyn/cresc');
    s = await st(); u = await ui();
    T('#/lab/dyn/cresc → 점점 세게가 골라져 있음(넣지는 않음)', s.group === 'dyn' && s.sign === 'cresc' && s.count === 0 && u.chips.includes('cresc*') && u.can === 4, { sign: s.sign, can: u.can });
    await go('#/lab/tempo/fast');
    s = await st(); u = await ui();
    T('#/lab/tempo/fast → 저절로 바꾸지 않고 [빠르게] 단추만 가리킴', s.group === 'tempo' && s.sign === null && s.hint === 'fast' && s.count === 0 && u.chips.includes('fast?'), { hint: s.hint, chips: u.chips });
    await go('#/lab/zz');
    s = await st();
    T('없는 묶음 주소 → 셈여림으로', s.group === 'dyn' && s.sign === null, { group: s.group, sign: s.sign });
    await go('#/lab/len/p');
    s = await st();
    T('다른 묶음의 기호 주소 → 묶음만 열림', s.group === 'len' && s.sign === null && s.hint === null, { sign: s.sign, hint: s.hint });
    await go('#/');
    T('악보 판을 나가면 시험 손잡이도 사라짐', await page.evaluate(() => typeof window.__labState === 'undefined'));
    noErr('악보 판 주소');

    // ══ 찾아 쓰기 ══
    const fs_ = () => page.evaluate(() => window.__findState());
    const fu = () => page.evaluate(() => {
      const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
      const m = document.getElementById('main'), box = q('.fd-box');
      const hit = q('.fd-step.hit');
      return {
        intro: !!q('.fd-intro'), walk: qa('.fd-walk li').length, clu: qa('.fd-clu > li').length,
        secs: qa('.fd-sec').map(e => e.dataset.el), steps: qa('.fd-step').length, hits: qa('.fd-step.hit').map(e => e.dataset.step),
        found: q('.fd-found') ? q('.fd-found').textContent : null, none: q('.fd-none h2') ? q('.fd-none h2').textContent : null, cave: !!q('.fd-cave'),
        els: qa('.fd-el').filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.el), nEls: qa('.fd-el').length,
        adds: qa('.fd-add').map(b => b.dataset.act + (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + ':' + b.textContent),
        offs: qa('.fd-act.off').length,
        ptitle: q('.fd-ptitle').textContent, plist: qa('.fd-plist li').length, pemptyShown: !q('.fd-pempty').hidden,
        copyOff: q('.fd-copy').disabled, dropOff: q('.fd-drop').disabled, clearOff: q('.fd-clear').disabled,
        go: qa('.go').filter(vis).length,
        hitInView: hit ? (r => r.top >= box.getBoundingClientRect().top - 1 && r.top < box.getBoundingClientRect().bottom)(hit.getBoundingClientRect()) : null,
        scroll: Math.max(document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth, m.scrollHeight - m.clientHeight),
        hash: decodeURIComponent(location.hash), ls: localStorage.getItem('mn.find.pick'),
      };
    });

    // ── 선생님 칸에서 들어가는 길 ──
    await go('#/teacher', 800);
    let t = await page.evaluate(() => { const m = document.getElementById('main'); return { cards: document.querySelectorAll('.teacher > *').length, find: !!document.querySelector('.teacher a[href="#/find"]'), credits: !!document.querySelector('#barR a.barlink[href="#/credits"]'), scroll: Math.max(m.scrollHeight - m.clientHeight, document.documentElement.scrollHeight - innerHeight) }; });
    T('선생님 칸 — 카드 여덟 · [찾아 쓰기] 카드 · 머리띠에 [출처와 저작권] · 스크롤 0', t.cards === 8 && t.find && t.credits && t.scroll <= 1, t);
    await shot('teacher');
    await click('#barR a.barlink');
    await page.waitForTimeout(700);
    T('[출처와 저작권] → #/credits', (await page.evaluate(() => location.hash)) === '#/credits');
    await click('#back');
    await page.waitForTimeout(600);
    T('뒤로 → 선생님 칸', (await page.evaluate(() => location.hash)) === '#/teacher');
    await click('.teacher a[href="#/find"]');
    await page.waitForTimeout(800);
    let f = await fs_(), g = await fu();
    T('[찾아 쓰기] 카드 → #/find · 찾는 말이 없으면 흐름을 정리한 방법이 보임', g.hash === '#/find' && g.intro && g.walk === 5 && g.clu === 3 && f.q === '', { hash: g.hash, walk: g.walk, clu: g.clu });
    T('요소 단추 열 · 고른 것 0개 · [목록 복사] · [모두 빼기] · [지우기]는 눌리지 않음', g.nEls === 10 && g.ptitle === '고른 것 0개' && g.copyOff && g.dropOff && g.clearOff && g.pemptyShown, g);
    T('찾아 쓰기 — 스크롤 0 · 주황 하나', g.scroll <= 1 && g.go <= 1, { scroll: g.scroll, go: g.go });
    await shot('find_intro');

    // ── 찾기 ──
    await page.locator('.fd-in').fill('박자');
    await page.waitForTimeout(250);
    f = await fs_(); g = await fu();
    T("'박자' → 박·박자의 공부 차례 일곱 단계가 통째로 · 요소 단추가 눌린 모양 · 주소도 따라감", g.secs.join() === 'beat' && g.steps === 7 && g.els.join() === 'beat' && g.hash === '#/find/박자' && g.cave && !g.intro, { secs: g.secs, steps: g.steps, els: g.els, hash: g.hash });
    T('쓸 것마다 [담기] · 아직 없는 칸은 따로 표시', g.adds.length >= 5 && g.adds.every(a => a.endsWith(':담기')) && g.offs >= 1, { adds: g.adds.length, offs: g.offs });
    await shot('find_beat');
    await page.locator('.fd-sample', { hasText: '점점 세게' }).click();
    await page.waitForTimeout(250);
    g = await fu();
    T("예 [점점 세게] → 셈여림 흐름 안에서 그 단계만 '찾은 곳' · 그 자리로 밀어 올려 보임", g.secs.join() === 'dyn' && g.hits.join() === 'd4' && g.found === '찾은 곳 1단계' && g.hitInView === true && g.steps === 6, { secs: g.secs, hits: g.hits, found: g.found, inView: g.hitInView });
    await page.locator('.fd-in').fill('6학년');
    await page.waitForTimeout(250);
    g = await fu();
    T("'6학년' → 여러 요소에서 6학년에 걸친 단계만", g.secs.length >= 8 && g.steps < 62, { secs: g.secs.length, steps: g.steps });
    await page.locator('.fd-in').fill('없는말쿵');
    await page.waitForTimeout(250);
    g = await fu();
    T('없는 말 → 찾지 못했다고 알리고 찾는 법을 보여 줌', g.none === '「없는말쿵」 — 찾지 못했어요' && g.secs.length === 0, g.none);
    await click('.fd-clear');
    await page.waitForTimeout(250);
    g = await fu();
    T('[지우기] → 처음 모습 · 주소도 #/find', g.intro && g.hash === '#/find', g.hash);
    await click('.fd-el[data-el="beat"]');
    await page.waitForTimeout(250);
    g = await fu();
    T('요소 단추 [박·박자] → 그 요소의 흐름', g.secs.join() === 'beat' && g.els.join() === 'beat', g.secs);

    // ── 담기 · 빼기 ──
    const act = k => g.adds[k].split(/[*:]/)[0];
    const a0 = g.adds[0].split(':').slice(0, -1).join(':'), a2 = g.adds[2].split(':').slice(0, -1).join(':');
    await click('.fd-add', 2);
    await page.waitForTimeout(120);
    await click('.fd-add', 0);
    await page.waitForTimeout(150);
    f = await fs_(); g = await fu();
    T('[담기] 둘 → 단추는 [담음] · 고른 것 2개 · 누른 차례가 아니라 공부 차례로 늘어섬', f.picks.join() === [a0, a2].join() && g.adds[0].endsWith('*:담음') && g.adds[2].endsWith('*:담음') && g.ptitle === '고른 것 2개' && g.plist === 2 && !g.copyOff && !g.pemptyShown, { picks: f.picks, want: [a0, a2], ptitle: g.ptitle });
    T('담은 것은 이 기기에만 남음(mn.find.pick)', g.ls === JSON.stringify(f.picks), g.ls);
    await page.reload();
    await page.waitForTimeout(900);
    f = await fs_(); g = await fu();
    T('새로 고쳐도 찾는 말 · 담은 것이 그대로', f.q === '박자' || (g.secs.join() === 'beat' && f.picks.length === 2 && g.adds[0].endsWith('*:담음')), { q: f.q, picks: f.picks, secs: g.secs });
    T('새로 고친 뒤에도 고른 것 2개', f.picks.length === 2 && g.plist === 2, { picks: f.picks });
    // 다른 요소에서 하나 더 — 요소가 달라도 공부 흐름 차례대로
    await page.locator('.fd-in').fill('점점 세게');
    await page.waitForTimeout(250);
    await page.locator('.fd-step.hit .fd-add').first().click();
    await page.waitForTimeout(150);
    f = await fs_(); g = await fu();
    T('다른 요소(셈여림)에서 하나 더 담음 — 고른 것 3개 · 박·박자 것 뒤에', f.picks.length === 3 && f.picks[2] === 'lab:dyn:cresc' && g.plist === 3, f.picks);
    await shot('find_picks');

    // ── 목록 복사 ──
    await click('.fd-copy');
    await page.waitForTimeout(400);
    const clip = await page.evaluate(async () => { const m = document.querySelector('.copymodal textarea'); if (m) return { via: '글 상자', text: m.value }; try { return { via: '클립보드', text: await navigator.clipboard.readText() }; } catch (e) { return { via: '못 읽음', text: String(e) }; } });
    f = await fs_();
    const lines = f.text.split('\n');
    T(`[목록 복사] → 복사한 글이 고른 것과 같음(${clip.via})`, clip.text === f.text, clip);
    T('복사한 글 — 첫 줄 제목 + 고른 것마다 한 줄(이름 · 종류 · 바로 열리는 주소)', lines.length === 4 && lines[0] === '음악 놀이터 — 고른 활동' && lines.slice(1).every((l, i) => l.startsWith(`${i + 1}. `) && l.includes(base + '#/')) && lines[3].endsWith(base + '#/lab/dyn/cresc'), lines);
    await page.evaluate(() => { const b = document.querySelector('.copymodal button'); if (b) b.click(); });

    // ── 빼기 · 모두 빼기 ──
    await page.locator('.fd-out').first().click();
    await page.waitForTimeout(150);
    f = await fs_(); g = await fu();
    T('고른 것의 [빼기] → 2개', f.picks.length === 2 && !f.picks.includes(a0) && g.plist === 2, f.picks);
    await page.locator('.fd-add[aria-pressed="true"]').first().click();
    await page.waitForTimeout(150);
    f = await fs_();
    T('[담음]을 한 번 더 눌러도 빠짐 → 1개', f.picks.length === 1, f.picks);
    await click('.fd-drop');
    await page.waitForTimeout(150);
    f = await fs_(); g = await fu();
    T('[모두 빼기] → 0개 · [목록 복사]는 다시 눌리지 않음', f.picks.length === 0 && g.ls === '[]' && g.copyOff && g.dropOff && g.pemptyShown && g.adds.every(a => a.endsWith(':담기')), { picks: f.picks, ls: g.ls });
    await click('#back');
    await page.waitForTimeout(600);
    T('찾아 쓰기에서 뒤로 → 선생님 칸', (await page.evaluate(() => location.hash)) === '#/teacher');
    noErr('찾아 쓰기');

    // ── [열기] 주소가 모두 제 화면을 연다 ──
    const acts = await page.evaluate(async () => {
      const m = await import('/engine/flow.js');
      return [...new Set(m.ELEMENTS.flatMap(el => el.steps.flatMap(st => st.acts)))].map(m.actInfo).filter(i => i && i.built).map(i => ({ act: i.act, kind: i.kind, ref: i.ref, sign: i.sign, href: i.href, tv: i.tv, label: i.label }));
    });
    const mainSrc = fs.readFileSync(path.join(ROOT, 'app/js/main.js'), 'utf8');
    const routeOk = n => new RegExp(`(^|[\\s{,])${n}:\\s*\\{`).test(mainSrc);
    const wrong = [];
    for (const a of acts) {
      await go(a.href, a.kind === 'lab' ? 260 : 520);
      const r = await page.evaluate(() => ({ hash: decodeURIComponent(location.hash), kids: document.getElementById('main').children.length, lab: window.__labState ? window.__labState() : null, tap: !!document.querySelector('#main .tap, #main [class*="tap"]'), text: document.getElementById('main').innerText.length }));
      let good = r.kids > 0 && r.text > 0 && r.hash.startsWith(a.kind === 'lab' ? '#/lab' : a.href);
      if (a.kind === 'lab') good = good && !!r.lab && r.lab.group === a.ref && (!a.sign || r.lab.sign === a.sign || r.lab.hint === a.sign);
      if (a.tv && !routeOk(a.tv.replace(/^#\//, '').split('/')[0])) good = false;
      if (!good || errs.length) wrong.push({ act: a.act, href: a.href, hash: r.hash, lab: r.lab && { g: r.lab.group, s: r.lab.sign, h: r.lab.hint }, errs: errs.slice(0, 2) });
      errs.length = 0;
    }
    T(`[열기] 주소 ${acts.length}개가 모두 제 화면을 엶(칸 · 악보 판 · 곡 바꾸기) · [TV로] 주소는 있는 길`, acts.length >= 50 && !wrong.length, wrong.slice(0, 5));
    await go('#/');

    // ── 좁은 창(900px 아래)에서도 옆으로 밀리지 않음 ──
    await page.setViewportSize({ width: 820, height: 720 });
    for (const hsh of ['#/lab/dyn/p', '#/find/박자']) {
      await go(hsh, 600);
      const x = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      T(`좁은 창(820px) ${hsh} — 옆으로 밀리지 않음`, x <= 1, x);
    }
    await shot('narrow_find');
    await page.setViewportSize({ width: 1366, height: 768 });
    noErr('좁은 창');
  } catch (e) { fail++; console.log('✗ 시험이 멈춤: ' + (e && e.stack || e)); }
  await browser.close();
  server.close();
  console.log(fail ? `\n✗ 악보 판 · 찾아 쓰기 시험 ${fail}개 실패(${pass}개 통과)` : `\n✓ 악보 판 · 찾아 쓰기 브라우저 시험 통과 — ${pass}개`);
  process.exit(fail ? 1 : 0);
});
