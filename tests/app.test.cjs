// 앱 시험(브라우저 하나) — 화면마다 콘솔 오류 0 · 크롬북 가로 1366×768에서 스크롤 0 · 징검다리 자동 연주가 별 셋
//  playwright는 이 저장소에 없으면 school-metaverse 것을 빌려 쓴다(설치 X). 브라우저는 하나만 띄우고 끝나면 닫는다.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  const bad = (m) => { fail++; console.log('✗ ' + m); };
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    for (const name of ['', 'map', 'tap', 'songs', 'play', 'lab', 'lab/len', 'lab/meter', 'teacher', 'find', 'find/박자', 'records', 'tv', 'calib', 'speaker', 'credits']) {
      errs.length = 0;
      await page.goto(base + '#/' + name);
      await page.waitForTimeout(900);
      const scroll = await page.evaluate(() => {
        const m = document.getElementById('main');
        return { page: document.documentElement.scrollHeight - innerHeight, main: m.scrollHeight - m.clientHeight, x: document.documentElement.scrollWidth - innerWidth };
      });
      const scrolled = scroll.page > 1 || scroll.x > 1 || (name !== 'credits' && scroll.main > 1);
      if (errs.length) bad(`#/${name} 콘솔 오류: ${errs.join(' | ')}`);
      if (scrolled) bad(`#/${name} 스크롤 생김 ${JSON.stringify(scroll)}`);
      if (!errs.length && !scrolled) console.log(`✓ #/${name || '(처음)'} 오류 0 · 스크롤 0`);
    }
    // 지도 · TV 고르기 — 칸이 몇 개가 되든 한 화면(D7 · 11-14): 지금 만든 칸 / 장부 끝 모습(?allcells=1 = ORDER_ALL을 모두 만든 칸처럼) × 판정 학년군 셋 × 갈래 띠마다
    //  스크롤 0 · 글자 18px↑ · 단추 64px↑ · 단추 안 글 넘침 0 · 판 밖 잘림 0 · 겹침 0 · 모든 칸이 꼭 한 번 · 주황 '다음'은 하나(다음 칸 또는 그 갈래 띠)
    {
      const MEASURE = (minBtn) => {
        const main = document.getElementById('main'), vw = innerWidth, vh = innerHeight;
        const lab = el => String(el.dataset.cell || el.dataset.lane || el.className || el.tagName).slice(0, 30);
        const out = { scroll: { page: document.documentElement.scrollHeight - vh, main: main.scrollHeight - main.clientHeight, x: document.documentElement.scrollWidth - vw }, small: [], short: [], over: [], clip: [], overlap: [] };
        const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) {
          const t = tw.currentNode, el = t.parentElement, s = t.textContent.trim();
          if (!s || !el.getClientRects().length || el.closest('[hidden]')) continue;
          if (/^(null|undefined|NaN)$/.test(s)) out.small.push(`${lab(el)} 글 "${s}"`);
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 18) out.small.push(`${lab(el)} "${s.slice(0, 14)}" ${fs}px`);
        }
        const panel = main.querySelector('.mpanel, .tvpanel'), pr = panel && panel.getBoundingClientRect();
        const btns = [...main.querySelectorAll('.mnode, .mtab, .tvcell, .tvtab')].filter(b => b.getClientRects().length);
        const inside = (r, o, m = 0) => r.left >= o.left + m - 0.5 && r.right <= o.right - m + 0.5 && r.top >= o.top + m - 0.5 && r.bottom <= o.bottom - m + 0.5;
        for (const b of btns) {
          const r = b.getBoundingClientRect();
          if (r.height < minBtn - 0.5) out.short.push(`${lab(b)} ${Math.round(r.height)}px`);
          for (const k of b.querySelectorAll('.mname, .tvname, .tvstd, .mtab-t, .mstars, .mdot, .tvno, .tvtab-n, b')) {
            const kr = k.getBoundingClientRect();
            if (kr.width && !inside(kr, r, 3)) out.over.push(`${lab(b)} ▸ ${k.className || k.tagName}`);
          }
          if (!inside(r, { left: 0, top: 0, right: vw, bottom: vh })) out.clip.push(`${lab(b)} 화면 밖`);
          if (pr && panel.contains(b) && !inside(r, pr, 3)) out.clip.push(`${lab(b)} 판 밖`);
        }
        for (const t of main.querySelectorAll('.mtag')) if (pr && panel.contains(t) && !inside(t.getBoundingClientRect(), pr, 3)) out.clip.push('다음 꼬리표 판 밖');
        const boxes = [...btns, ...main.querySelectorAll('.mtag, .mfriend, .mmore-t')].map(e => [e, e.getBoundingClientRect()]);
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const [a, ra] = boxes[i], [b, rb] = boxes[j];
          if (a.contains(b) || b.contains(a)) continue;
          if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 0.5 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 0.5) out.overlap.push(`${lab(a)} × ${lab(b)}`);
        }
        out.cells = [...main.querySelectorAll('.mnode[data-cell], .tvcell[data-cell]')].map(b => b.dataset.cell);
        out.go = [...main.querySelectorAll('.mtag')].filter(t => t.getClientRects().length).length;
        out.next = !!main.querySelector('.mnode.next');
        return out;
      };
      const counts = await page.evaluate(async () => { const m = await import('/engine/cells.js'); return { now: m.ORDER.length, all: m.ORDER_ALL.length, allIds: m.ORDER_ALL }; });
      const few = { so3: { stars: 3 }, so4: { stars: 2 }, sem1: { stars: 1 }, ri1: { stars: 3 }, ppa1: { stars: 1 } };
      const many = Object.fromEntries(counts.allIds.filter((_, i) => i % 2 === 0).map((id, i) => [id, { stars: 1 + (i % 3) }]));   // 칸 절반에 별 — 큰 칸이 늘어 '모두 큰 칸'으로 바뀌는 길
      const cases = [];
      for (const all of [false, true]) for (const band of ['low', 'mid', 'high']) for (const scr of ['map', 'tv']) cases.push({ all, band, scr, prog: few });
      for (const band of ['low', 'mid', 'high']) cases.push({ all: true, band, scr: 'map', prog: many, tag: '별 절반' });
      let okN = 0;
      for (const cs of cases) {
        errs.length = 0;
        const name = `${cs.scr === 'map' ? '지도' : 'TV 고르기'} ${cs.all ? `${counts.all}칸` : `지금 ${counts.now}칸`} · ${cs.band}${cs.tag ? ' · ' + cs.tag : ''}`;
        await page.evaluate(([b, p]) => { localStorage.clear(); localStorage.setItem('mn.band', JSON.stringify(b)); localStorage.setItem('mn.prog', JSON.stringify(p)); localStorage.setItem('mn.map.seen', JSON.stringify(['so3', 'so4', 'sem1', 'ri1'])); }, [cs.band, cs.prog]);
        await page.goto(base + (cs.all ? '?allcells=1' : '') + '#/' + cs.scr);
        await page.reload();
        await page.waitForTimeout(900);
        const first = await page.evaluate(MEASURE, 64);
        const lanes = await page.$$eval('[role=tab]', ts => ts.map(t => t.dataset.lane));
        const probs = [], seen = [];
        if (cs.scr === 'map' && !first.next) probs.push('처음 열었을 때 다음 칸이 안 보임');
        for (const lane of lanes) {
          await page.click(`[role=tab][data-lane="${lane}"]`);
          await page.waitForTimeout(150);
          const m = await page.evaluate(MEASURE, 64);
          seen.push(...m.cells);
          const sc = m.scroll.page > 1 || m.scroll.main > 1 || m.scroll.x > 1;
          if (sc) probs.push(`${lane} 스크롤 ${JSON.stringify(m.scroll)}`);
          for (const k of ['small', 'short', 'over', 'clip', 'overlap']) if (m[k].length) probs.push(`${lane} ${k}: ${m[k].slice(0, 3).join(' | ')}${m[k].length > 3 ? ` …+${m[k].length - 3}` : ''}`);
          if (cs.scr === 'map' && m.go !== 1) probs.push(`${lane} 주황 '다음' ${m.go}개`);
        }
        const want = cs.all ? counts.all : counts.now;
        if (seen.length !== want || new Set(seen).size !== want) probs.push(`칸 ${new Set(seen).size}/${want}(겹친 칸 ${seen.length - new Set(seen).size})`);
        if (errs.length) probs.push('콘솔 오류: ' + errs.join(' | '));
        if (probs.length) bad(`${name}: ${probs.join(' ;; ')}`); else okN++;
      }
      if (okN === cases.length) console.log(`✓ 지도 · TV 고르기 ${cases.length}판(지금 ${counts.now}칸 · ${counts.all}칸 × low·mid·high · 갈래마다) — 스크롤 0 · 글자 18px↑ · 단추 64px↑ · 넘침 · 잘림 · 겹침 0 · 모든 칸 한 번 · 주황 하나`);
    }
    // TV로 다같이 — 높게·낮게를 시범 → 몸으로 → 반 전체 게임 → 예측까지(아이 기록에는 안 남음)
    {
      errs.length = 0;
      await page.evaluate(() => { localStorage.clear(); window.__cellResult = null; });
      await page.goto(base + '#/tvcell/so4');
      await page.waitForTimeout(700);
      let done = null;
      for (let k = 0; k < 700 && !done; k++) {
        done = await page.evaluate(() => { if (window.__cellResult) return { r: window.__cellResult, g: document.querySelector('.tvg-text')?.textContent || '', prog: localStorage.getItem('mn.prog') }; window.__cellAuto && window.__cellAuto(); return null; });
        if (!done) await page.waitForTimeout(160);
      }
      if (!done || done.r.stars !== 3 || !done.g.includes('높이면') || done.prog) bad('TV 높게·낮게: ' + JSON.stringify(done && { stars: done.r.stars, g: done.g, prog: done.prog }));
      else if (errs.length) bad('TV 콘솔 오류: ' + errs.join(' | '));
      else console.log('✓ TV로 다같이 높게·낮게 — 끝까지 · 예측 발문 · 아이 기록 안 남김');
    }
    // 징검다리 자동 연주 — 박마다 ±15ms 흔들어 두드림 → 별 셋이어야
    await page.goto(base + '#/tap');
    await page.waitForTimeout(500);
    await page.click('button.go.huge');
    const r = await page.evaluate(async () => {
      const plan = window.__tapPlan, river = document.querySelector('.river'), bs = plan.beats();
      bs.forEach((t, i) => setTimeout(() => river.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })), Math.max(0, t - performance.now() + (i % 3 - 1) * 15)));
      const end = bs[bs.length - 1] + 2600;
      while (performance.now() < end) await new Promise(z => setTimeout(z, 200));
      const x = window.__tapResult;
      return x && { kept: x.kept, total: x.total, great: x.great, stars: x.stars };
    });
    if (!r || r.stars !== 3 || r.kept !== r.total) bad('징검다리 자동 연주: ' + JSON.stringify(r));
    else console.log(`✓ 징검다리 자동 연주 ${r.kept}/${r.total} · 딱 ${r.great} · 별 ${r.stars}`);
  } finally {
    await browser.close();
    server.close();
  }
  if (fail) { console.log(`✗ 앱 시험 실패 ${fail}`); process.exit(1); }
  console.log('✓ 앱 시험 통과');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
