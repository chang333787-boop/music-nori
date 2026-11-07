// 느린 크롬북 흉내 성능 시험(브라우저 하나) — CDP로 화면 스레드 CPU를 느리게(맥 1× · 4× · 6×) · 1366×768 · dpr 1 · 크롬북 UA
//  잼: home  처음 화면 — 첫 그림(FCP) · 처음 화면 그림 다 뜸 · 첫 두드림 → 소리 예약 · 소리 길(AudioContext) 열림
//      tap   징검다리 1단계 한 판 — 프레임 간격(rAF) · 두드림 처리(pointerdown) · 긴 작업(longtask) · 동시 소리 수
//      cells 칸 몇 개(자동 진행 0.16초마다 window.__cellAuto) — 프레임 · 긴 작업(확인 게임 구간 따로)
//      play  놀이터 — 블록 고르기 · 높이 · 길이 · 빠르기 · 박자표 · 오선 보기를 누를 때 다시 그리는 시간 + 듣기 중 프레임
//      room  방 번호 아이 기기(1.7초마다 확인 · 가짜 서버 page.route — 진짜 DB에 쓰지 않음) 켠 채 징검다리 한 판
//      mem   처음 → 13칸(첫 판 12칸 + 징검다리) 다 돈 뒤 JS 힙(GC 뒤) · DOM 노드 · 소리 버퍼 캐시(이때 칸마다 프레임도)
//      prof  느린 곳 찾기(4×) — CDP Profiler(함수별 시간) + Tracing(작업 종류 · 50ms 넘는 작업 안쪽)
//      calib CDP rate가 이 맥에서 실제 몇 배인지(JS · DOM · 짧은 일) — 실효 4× · 6×가 되는 rate 고르기
//      audio 소리 스레드 어림 — 같은 소리를 OfflineAudioContext로 그려 '소리 1초당 ms'(맥 값 × 4~6 = 크롬북 어림)
//  기준(앱 약속): 노는 동안 50ms 넘는 프레임 1% 미만 · 두드림 처리 16ms 미만 · 첫 그림 2초 안(4×)
//  쓰는 법: node tests/perf.browser.cjs [--rate=1,4,6] [--only=home,tap,cells,play,room,mem,prof] [--cells=so3,ri4,ri6,ak1,ga1]
//           [--memrate=4] [--profrate=4] [--profcells=ri6] [--net=1(학교 망 흉내 RTT 40ms · 20Mbps)] [--base=배포 주소] [--fontdelay=3000] [--css='덧씌울 CSS'] [--out=결과.json]
//  주의: CPU 느리게는 화면(메인) 스레드만 — 오디오 스레드 · GPU는 맥 그대로라, 소리 노드 부담은 '동시에 걸린 소리 수'로만 본다.
//        구글 글꼴은 진짜 인터넷(학교 망과 다름). 소리는 --mute-audio로 끔. 다른 브라우저 시험과 동시에 돌리지 말 것(맥 열 · 숫자 흔들림).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { performance: nodePerf } = require('node:perf_hooks');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const RATES = arg('rate', '1,4,6').split(',').map(Number);
const ONLY = new Set(arg('only', 'home,tap,cells,play,room,mem,prof,audio').split(','));
const CELLS = arg('cells', 'so3,ri4,ri6,ak1,ga1').split(',');
const MEMRATE = Number(arg('memrate', 4)), PROFRATE = Number(arg('profrate', 4));
const PROFCELLS = arg('profcells', 'ri6').split(',').filter(Boolean);
const NET = arg('net', '0') === '1';
const CSS = arg('css', '');                          // 시험용 CSS 덧씌우기(예: --css='.tr-hills{mix-blend-mode:normal!important}') — 고치기 전 효과 어림
const FONTDELAY = Number(arg('fontdelay', 0));      // >0이면 처음 화면을 한 번 더: 구글 글꼴 응답을 이만큼 늦춘 뒤 끊음
const OUT = arg('out', '');
const SITE = arg('base', '');                      // 배포된 곳에서 재기(예: --base=https://chang333787-boop.github.io/music-nori/) — 진짜 망 · HTTP/2 · 캐시
const FIRST12 = ['so3', 'so4', 'so5', 'ga1', 'ga2', 'ga3', 'ri2', 'ri4', 'ri5', 'ri6', 'ak1', 'ak2'];
const UA = 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

// ── 페이지 안 계측(모든 문서 맨 앞에) ──
const INIT = `(() => {
  const P = window.__perf = { raf: [], long: [], ev: [], inp: [], rec: false, label: '', au: { made: 0, live: 0, peak: 0, made0: 0 } };
  try { new PerformanceObserver(l => { if (P.rec) for (const e of l.getEntries()) P.long.push([e.startTime, e.duration, P.label]); }).observe({ type: 'longtask' }); } catch (e) {}
  try { new PerformanceObserver(l => { if (P.rec) for (const e of l.getEntries()) if (/pointerdown|keydown|click/.test(e.name)) P.ev.push({ n: e.name, d: e.duration, wait: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart, label: P.label }); }).observe({ type: 'event', durationThreshold: 16 }); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  // 입력 처리 시간 — 창 맨 앞(잡기) ~ 창 맨 끝(거품) = 앱 손잡이 모두 · wait = 줄 서서 기다린 시간(메인 스레드가 바빴음)
  for (const t of ['pointerdown', 'keydown', 'click']) {
    let cur = null;
    window.addEventListener(t, e => { cur = { ts: e.timeStamp, s: performance.now() }; }, true);
    window.addEventListener(t, e => {
      if (!cur) return; const c = cur; cur = null; const end = performance.now();
      if (!P.rec) return;
      const r = { t, label: P.label, ts: c.ts, wait: c.s - c.ts, proc: end - c.s, total: end - c.ts, frame: null };
      P.inp.push(r);
      requestAnimationFrame(() => requestAnimationFrame(() => { r.frame = performance.now() - c.ts; }));
    }, false);
  }
  // 프레임 간격
  let last = 0;
  const loop = t => { if (P.rec) { if (last) P.raf.push([t, t - last]); last = t; } else last = 0; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // 처음 화면이 다 뜬 때(처음 화면 그릇 · 그 안 그림이 모두 받아짐)
  const homeWatch = () => {
    const m = document.getElementById('main');
    if (m && !P.mainAt && m.children.length) P.mainAt = performance.now();
    const home = document.querySelector('.home');
    if (home && !P.homeDomAt) P.homeDomAt = performance.now();
    if (home && !P.homeAt) { const im = [...document.querySelectorAll('img')]; if (im.length && im.every(i => i.complete)) { P.homeAt = performance.now(); P.homeImgs = im.length; P.homeImgsOk = im.filter(i => i.naturalWidth > 0).length; } }
    if (!P.homeAt) requestAnimationFrame(homeWatch);
  };
  requestAnimationFrame(homeWatch);
  // 소리 노드 — 만든 수 · 지금 걸려 있는(시작 예약 ~ 끝) 소스 수
  const AC = window.AudioContext;
  if (AC) {
    window.AudioContext = class extends AC {
      constructor(...a) {
        const t = performance.now(); super(...a); P.acNew = t; P.acNewDur = performance.now() - t;
        const mark = () => { if (this.state === 'running' && !P.acRun) P.acRun = performance.now(); };
        this.addEventListener('statechange', mark); mark();
      }
    };
  }
  const B = window.BaseAudioContext;
  if (B) {
    for (const name of ['createOscillator', 'createBufferSource', 'createConstantSource']) {
      const o = B.prototype[name]; if (!o) continue;
      B.prototype[name] = function (...a) {
        const n = o.apply(this, a); P.au.made++;
        const st = n.start; let on = false;
        n.start = function (...x) { if (!on) { on = true; P.au.live++; if (P.au.live > P.au.peak) P.au.peak = P.au.live; n.addEventListener('ended', () => { P.au.live--; }, { once: true }); } return st.apply(this, x); };
        return n;
      };
    }
    for (const name of ['createGain', 'createBiquadFilter', 'createConvolver', 'createDynamicsCompressor', 'createStereoPanner', 'createWaveShaper', 'createDelay', 'createBuffer']) {
      const o = B.prototype[name]; if (!o) continue;
      B.prototype[name] = function (...a) { P.au.made++; return o.apply(this, a); };
    }
  }
  // 캔버스 그림 붙이기 — 프레임마다 몇 장 · 화면 몇 배 넓이(약한 GPU에서 채우기 부담 어림)
  P.di = { n: 0, px: 0 };
  const CR = window.CanvasRenderingContext2D;
  if (CR) { const o = CR.prototype.drawImage; CR.prototype.drawImage = function (im, ...a) { if (P.rec) { P.di.n++; const w = a.length >= 4 ? a[a.length - 2] : (im.naturalWidth || im.width), hh = a.length >= 4 ? a[a.length - 1] : (im.naturalHeight || im.height); P.di.px += Math.abs(w * hh); } return o.call(this, im, ...a); }; }
  P.start = (label = '') => { P.di = { n: 0, px: 0 }; P.raf = []; P.long = []; P.ev = []; P.inp = []; P.label = label; P.au.peak = P.au.live; P.au.made0 = P.au.made; P.t0 = performance.now(); P.rec = true; };
  P.stop = () => { P.rec = false; return { raf: P.raf, long: P.long, ev: P.ev, inp: P.inp, au: { made: P.au.made - P.au.made0, peak: P.au.peak, live: P.au.live }, di: P.di, dur: performance.now() - P.t0, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }; };
})();`;

// ── 통계 ──
const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = x => Math.round(x * 10) / 10;
function frames(raf, from = -Infinity, to = Infinity) {
  const d = raf.filter(r => r[0] >= from && r[0] <= to).map(r => r[1]);
  const over = d.filter(x => x > 50).length;
  return { n: d.length, mean: r1(avg(d)), p95: r1(q(d, 0.95)), max: r1(Math.max(0, ...d)), over50: over, pct50: d.length ? r1((100 * over) / d.length) : 0, fps: d.length ? r1(1000 / avg(d)) : 0 };
}
function longs(long, from = -Infinity, to = Infinity) {
  const l = long.filter(x => x[0] >= from && x[0] <= to);
  return { n: l.length, total: Math.round(l.reduce((s, x) => s + x[1], 0)), max: Math.round(Math.max(0, ...l.map(x => x[1]))) };
}
function inputs(inp, pred = () => true) {
  const a = inp.filter(pred);
  return { n: a.length, procP95: r1(q(a.map(x => x.proc), 0.95)), procMax: r1(Math.max(0, ...a.map(x => x.proc))), waitP95: r1(q(a.map(x => x.wait), 0.95)), totalP95: r1(q(a.map(x => x.total), 0.95)), totalMax: r1(Math.max(0, ...a.map(x => x.total))), frameP95: r1(q(a.filter(x => x.frame != null).map(x => x.frame), 0.95)), over16: a.filter(x => x.total > 16).length };
}

// ── 브라우저 · 페이지 ──
let browser, base;
async function newPage(rate) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, userAgent: UA });
  await ctx.addInitScript(INIT);
  if (CSS) await ctx.addInitScript(css => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }); }, CSS);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  if (NET) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (20e6 / 8), uploadThroughput: (5e6 / 8) }); }
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|firebasedatabase/.test(m.text() + (m.location().url || ''))) errs.push(m.text().slice(0, 200)); });
  return { ctx, page, cdp, errs, rate };
}
async function gcHeap(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const h = await cdp.send('Runtime.getHeapUsage');
  let dom = null; try { dom = await cdp.send('Memory.getDOMCounters'); } catch { /* */ }
  return { heapMB: r1(h.usedSize / 1048576), dom };
}
async function clockOffset(page) {
  let best = null;
  for (let i = 0; i < 4; i++) {
    const a = nodePerf.now(); const pg = await page.evaluate(() => performance.now()); const b = nodePerf.now();
    if (!best || b - a < best.rt) best = { rt: b - a, off: pg - (a + b) / 2 };
  }
  return best.off;
}


// ⓪ 느리게 배율 맞추기 — CDP 'rate'가 이 맥에서 실제로 몇 배 느려지는지(같은 JS · DOM 일을 rate마다 재서 1×와 견줌)
//    맥이 빨라서 rate N이 N배가 안 될 수 있음 → 이 표로 '실제 4× · 6×'가 되는 rate를 고른다
async function runCalib(rates) {
  const P = await newPage(1);
  const { page, cdp } = P;
  await page.goto(base + '#/');
  await page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000 });
  const work = () => page.evaluate(() => {
    const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const js = [], dom = [], small = [];
    for (let k = 0; k < 5; k++) {
      let t = performance.now(), x = 0;
      for (let i = 0; i < 400000; i++) x += Math.random() * Math.pow(1 - i / 400000, 2.8);
      js.push(performance.now() - t + (x > 1e12 ? 1 : 0));
      t = performance.now();
      const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-9999px;top:0;width:900px';
      for (let i = 0; i < 600; i++) { const d = document.createElement('div'); d.className = 'pblk'; d.style.cssText = `position:absolute;left:${i}px;top:${i % 40}px;width:30px;height:20px`; d.textContent = '솔'; box.append(d); }
      document.body.append(box); void box.offsetHeight; box.remove();
      dom.push(performance.now() - t);
      // 작은 일 여러 번(2ms짜리 손잡이 같은) — 짧은 일도 느려지는지
      t = performance.now();
      for (let j = 0; j < 20; j++) { let y = 0; for (let i = 0; i < 20000; i++) y += Math.sqrt(i); if (y < 0) small.push(0); }
      small.push(performance.now() - t);
    }
    return { js: med(js), dom: med(dom), small: med(small.filter(v => v > 0)) };
  });
  const out = [];
  for (const r of rates) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
    await page.waitForTimeout(300);
    out.push({ rate: r, ...(await work()) });
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const b = out[0];
  for (const o of out) { o.jsX = r1(o.js / b.js); o.domX = r1(o.dom / b.dom); o.smallX = r1(o.small / b.small); }
  await P.ctx.close();
  return out;
}

// ① 처음 화면 — 새 기기처럼(캐시 · 저장 비움). fonts: 'real' 진짜 인터넷 · 'block' 구글 글꼴 막음(잘라서 보기)
async function runHome(rate, fonts = 'real') {
  const P = await newPage(rate);
  const { page } = P;
  if (fonts === 'block') await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (fonts === 'slow') await page.route(/fonts\.googleapis\.com/, r => setTimeout(() => r.abort().catch(() => {}), FONTDELAY));   // 학교 망이 구글 글꼴을 늦게 주거나 막을 때
  const t0 = Date.now();
  await page.goto(base + '#/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000, polling: 100 });
  const res = await page.evaluate(() => {
    const P = window.__perf, paint = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime]));
    const rs = performance.getEntriesByType('resource');
    const img = rs.filter(r => /\.webp/.test(r.name)), pre = rs.filter(r => r.initiatorType === 'fetch' && /\.(js|css)$/.test(r.name.split('?')[0]));
    const nav = performance.getEntriesByType('navigation')[0];
    const fontCss = rs.filter(r => /fonts\.googleapis/.test(r.name)).map(r => Math.round(r.responseEnd));
    return {
      fcp: Math.round(paint['first-contentful-paint'] || 0), lcp: Math.round(P.lcp || 0), domContent: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd),
      mainAt: Math.round(P.mainAt || 0), homeDom: Math.round(P.homeDomAt || 0), homeAll: Math.round(P.homeAt || 0), imgs: P.homeImgs, imgsOk: P.homeImgsOk,
      imgReq: img.length, imgKB: Math.round(img.reduce((s, r) => s + (r.encodedBodySize || 0), 0) / 1024), imgLastEnd: Math.round(Math.max(0, ...img.map(r => r.responseEnd))),
      prefetch: pre.length, prefetchEnd: Math.round(Math.max(0, ...pre.map(r => r.responseEnd))), fontCss,
    };
  });
  // 첫 두드림 — 처음 화면 고슴도치(진짜 마우스 입력) → 손잡이 끝(소리 예약) · AudioContext running
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__perf.start('firstTap'));
  const bb = await (await page.$('.stage .friend')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForFunction(() => window.__perf.acRun, null, { timeout: 20000, polling: 50 }).catch(() => null);
  await page.waitForTimeout(400);
  const tap = await page.evaluate(async () => {
    const P = window.__perf, s = P.stop();
    const pd = s.inp.find(x => x.t === 'pointerdown');
    const { engine } = await import(new URL('app/js/audio.js', document.baseURI).href);
    // ensure() 안쪽 나눠 재기(같은 일을 한 번 더)
    let t = performance.now(); engine._impulse(2.4, 2.8); const impulse = performance.now() - t;
    t = performance.now(); engine._noiseBuf(); const noise = performance.now() - t;
    const ev = s.ev.find(e => e.n === 'pointerdown');
    return { proc: pd && pd.proc, wait: pd && pd.wait, total: pd && pd.total, frame: pd && pd.frame, evDur: ev ? ev.d : '<16', acNewDur: P.acNewDur, acRunFromTap: P.acRun && pd ? P.acRun - pd.ts : null, acNewToRun: P.acRun - P.acNew, impulse, noise, sr: engine.ctx.sampleRate, longs: s.long.map(x => Math.round(x[1])), nodes: s.au.made };
  });
  // 두 번째 열기(같은 기기 · 버전 그대로 · 캐시 있음) — 버전 확인(version.json no-store) 한 번만 기다림
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000, polling: 100 });
  const warm = await page.evaluate(() => {
    const P = window.__perf, paint = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime]));
    const v = performance.getEntriesByType('resource').find(r => /version\.json/.test(r.name));
    return { fcp: Math.round(paint['first-contentful-paint'] || 0), mainAt: Math.round(P.mainAt || 0), homeAll: Math.round(P.homeAt || 0), verEnd: v ? Math.round(v.responseEnd) : null };
  });
  const out = { rate, fonts, net: NET, ...res, warm, tap: Object.fromEntries(Object.entries(tap).map(([k, v]) => [k, typeof v === 'number' ? r1(v) : v])), errs: P.errs.slice(0, 3), wallMs: Date.now() - t0 };
  await P.ctx.close();
  return out;
}

// ② 징검다리 한 판(1단계 · 박 점 있음) — 박마다 '톡!' 단추를 진짜 마우스로
async function runTap(P, label = 'tap') {
  const { page } = P;
  await page.evaluate(() => { localStorage.setItem('mn.tap.step', '1'); window.__tapResult = null; window.__tapPlan = null; });
  if (!/#\/tap$/.test(page.url())) await page.goto(base + '#/tap');
  await page.waitForSelector('.tapbar .go', { timeout: 30000 });
  await page.waitForTimeout(1000);
  const bb = await (await page.$('.tapbar .go')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.evaluate(l => window.__perf.start(l + ':start'), label);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForFunction(() => window.__tapPlan, null, { timeout: 20000, polling: 50 });
  await page.evaluate(l => { window.__perf.label = l; }, label);
  const off = await clockOffset(page);
  const beats = await page.evaluate(() => window.__tapPlan.beats());
  for (const b of beats) {
    await sleep(b - off - nodePerf.now() - 2);
    await page.mouse.down();
    await sleep(35);
    await page.mouse.up();
  }
  await page.waitForFunction(() => window.__tapResult, null, { timeout: 40000, polling: 100 });
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => window.__perf.stop());
  const res = await page.evaluate(() => ({ kept: window.__tapResult.kept, total: window.__tapResult.total, great: window.__tapResult.great, stars: window.__tapResult.stars }));
  const startInp = s.inp.find(x => x.label.endsWith(':start') && x.t === 'pointerdown');
  return {
    res, frames: frames(s.raf), longs: longs(s.long), longList: s.long.map(x => [Math.round(x[0]), Math.round(x[1]), x[2]]),
    taps: inputs(s.inp, x => x.t === 'pointerdown' && x.label === label), start: startInp ? { proc: r1(startInp.proc), total: r1(startInp.total) } : null,
    evOver16: s.ev.filter(e => e.n === 'pointerdown' && e.label === label).map(e => Math.round(e.d)), au: s.au, heapMB: r1(s.heap / 1048576),
    canvas: s.raf.length ? { perFrame: r1(s.di.n / s.raf.length), screens: r1(s.di.px / s.raf.length / (1366 * 768)) } : null,
  };
}

// ③ 칸 한 개 — 보기 → 연습 → 확인 게임 → 결과(자동)
async function runCell(P, id) {
  const { page } = P;
  await page.evaluate(() => { const keep = localStorage.getItem('mn.kroom'); localStorage.clear(); if (keep) localStorage.setItem('mn.kroom', keep); window.__cellResult = null; });
  await page.goto(base + '#/cell/' + id);
  await page.waitForTimeout(700);
  await page.evaluate(l => window.__perf.start(l), id);
  const ph = []; let last = null, done = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const st = await page.evaluate(() => { const p = window.__cellPhase ? window.__cellPhase() : null; if (window.__cellResult) return { done: 1, p, t: performance.now() }; if (window.__cellAuto) window.__cellAuto(); return { p, t: performance.now() }; });
    if (st.p !== last) { ph.push([st.t, st.p]); last = st.p; }
    if (st.done) { done = true; break; }
    await sleep(160);
  }
  await page.waitForTimeout(700);
  const s = await page.evaluate(() => window.__perf.stop());
  const g0 = (ph.find(x => x[1] === 'game') || [Infinity])[0], g1 = (ph.find(x => x[1] === 'result') || [Infinity])[0];
  return { id, done, sec: Math.round((Date.now() - t0) / 1000), frames: frames(s.raf), game: frames(s.raf, g0, g1), longs: longs(s.long), gameLongs: longs(s.long, g0, g1), longMax: s.long.map(x => Math.round(x[1])).sort((a, b) => b - a).slice(0, 5), au: s.au, heapMB: r1(s.heap / 1048576) };
}

// ④ 놀이터 — 누를 때마다 처리 시간 + 다음 그림까지
async function runPlay(P) {
  const { page } = P;
  await page.evaluate(() => { localStorage.setItem('mn.play.card', '0'); });
  await page.goto(base + '#/play');
  await page.waitForSelector('.pblk', { timeout: 30000 });
  await page.waitForTimeout(1500);
  const blocks = await page.evaluate(() => document.querySelectorAll('#main *').length);
  await page.evaluate(() => window.__perf.start('play'));
  const L = l => page.evaluate(x => { window.__perf.label = x; }, l);
  const key = async (l, k, n = 1, gap = 450) => { await L(l); for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(gap); } };
  const click = async (l, sel, gap = 700) => { await L(l); await page.click(sel); await sleep(gap); };
  await key('고르기(→)', 'ArrowRight', 6);
  await key('높게(↑)', 'ArrowUp', 3);
  await key('낮게(↓)', 'ArrowDown', 3);
  await key('길게(Shift→)', 'Shift+ArrowRight', 2, 700);
  await key('짧게(Shift←)', 'Shift+ArrowLeft', 2, 700);
  await click('빠르기', '.pseg button[data-k="fast"]');
  await click('빠르기', '.pseg button[data-k="mid"]');
  await click('박자표', '.pseg button[data-k="3/4"]', 900);
  await click('박자표', '.pseg button[data-k="4/4"]', 900);
  await click('오선 보기', '.pview button[data-k="staff"]', 900);
  await key('오선에서 높게', 'ArrowUp', 2, 600);
  await click('그림 악보로', '.pview button[data-k="roll"]', 900);
  await click('곡 바꾸기 창', '.bar-btns button:nth-child(2)', 900);
  await page.keyboard.press('Escape'); await sleep(400);
  const mid = await page.evaluate(() => window.__perf.stop());
  // 듣기 중 프레임(놓인 줄이 움직이고 지금 음 표시)
  await page.evaluate(() => window.__perf.start('듣기'));
  await page.keyboard.press('Space');
  await sleep(6000);
  await page.keyboard.press('Space');
  const pl = await page.evaluate(() => window.__perf.stop());
  const labels = [...new Set(mid.inp.map(x => x.label))];
  const per = {};
  for (const l of labels) {
    const a = mid.inp.filter(x => x.label === l && x.proc > 0.3);
    const ev = mid.ev.filter(e => e.label === l).map(e => Math.round(e.d));   // Event Timing — 누름 ~ 다음 그림(16ms 넘는 것만 옴)
    per[l] = { n: a.length, procMax: r1(Math.max(0, ...a.map(x => x.proc))), totalMax: r1(Math.max(0, ...a.map(x => x.total))), frameMax: r1(Math.max(0, ...a.filter(x => x.frame != null).map(x => x.frame))), evMax: ev.length ? Math.max(...ev) : '<16' };
  }
  const all = mid.inp.filter(x => x.proc > 0.3);
  return { domNodes: blocks, per, all: inputs(all), longs: longs(mid.long), longMax: mid.long.map(x => [Math.round(x[1]), x[2]]).sort((a, b) => b[0] - a[0]).slice(0, 6), listen: { frames: frames(pl.raf), longs: longs(pl.long), au: pl.au } };
}

// ⑤ 방 번호 아이 기기 — 가짜 방(선생님이 징검다리 '확인 게임'을 고른 채) · 1.7초마다 GET
async function runRoom(P) {
  const { page } = P;
  let n = 0;
  const at = Date.now();
  await page.route(/firebasedatabase\.app/, route => {
    n++;
    const rq = route.request();
    if (rq.method() === 'GET' && /\/t\/pub\.json/.test(rq.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cell: 'ri1', phase: 'game', at }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(base + '#/');
  await page.evaluate(() => localStorage.setItem('mn.kroom', JSON.stringify({ room: '0999', dev: 'zzperf', no: 1, a: 0, t: Date.now() })));
  await page.reload();
  await page.waitForFunction(() => location.hash === '#/tap', null, { timeout: 20000 });     // 선생님 칸으로 따라감
  const r = await runTap(P, 'roomtap');
  r.calls = n;
  await page.unroute(/firebasedatabase\.app/);
  await page.evaluate(() => localStorage.removeItem('mn.kroom'));
  return r;
}

// ⑥ 메모리 — 처음 → 13칸 → 처음으로
async function runMem(rate) {
  const P = await newPage(rate);
  const { page, cdp } = P;
  await page.goto(base + '#/');
  await page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => { const { engine } = await import(new URL('app/js/audio.js', document.baseURI).href); const o = engine.bus.bind(engine); window.__busN = 0; engine.bus = () => { window.__busN++; return o(); }; });   // 소리 출구를 몇 번 새로 만드나
  const h0 = await gcHeap(cdp);
  const steps = [], cells = [];
  for (const id of FIRST12) {
    const c = await runCell(P, id);
    cells.push(c);
    steps.push([id, (await gcHeap(cdp)).heapMB]);
    console.log(`  mem ${rate}× ${id}: ${c.done ? '끝' : '못 끝냄'} ${c.sec}초 · 50ms↑ ${c.frames.over50}/${c.frames.n} · 긴 작업 ${c.longs.n}(최대 ${c.longs.max}) · 힙 ${steps[steps.length - 1][1]}MB`);
  }
  const tap = await runTap(P, 'tap');
  steps.push(['ri1(징검다리)', (await gcHeap(cdp)).heapMB]);
  const h1 = await gcHeap(cdp);
  await page.goto(base + '#/');
  await page.waitForTimeout(1500);
  const h2 = await gcHeap(cdp);
  const audio = await page.evaluate(async () => {
    const { engine } = await import(new URL('app/js/audio.js', document.baseURI).href);
    const kb = m => [...m.values()].reduce((s, v) => { const b = v.buf || v; return s + (b && b.length ? b.length * b.numberOfChannels * 4 : 0); }, 0);
    return { ks: engine._ks.size, pk: engine._pk.size, cacheMB: Math.round((kb(engine._ks) + kb(engine._pk)) / 1048576 * 10) / 10, live: window.__perf.au.live, made: window.__perf.au.made, buses: window.__busN, links: document.head.querySelectorAll('link').length };
  });
  await P.ctx.close();
  return { rate, h0, h1, h2, steps, cells, tap, audio, errs: P.errs.slice(0, 5) };
}

// ⑦ 느린 곳 찾기 — Profiler(함수 자기 시간) + Tracing(작업 종류 · 긴 작업 안쪽)
function profSummary(profile, appBase) {
  const byId = new Map(), parent = new Map();
  for (const n of profile.nodes) { byId.set(n.id, n); for (const c of n.children || []) parent.set(c, n.id); }
  const short = u => (u || '').replace(appBase, '').replace(/^https?:\/\/[^/]+\//, '');
  const keyOf = n => `${n.callFrame.functionName || '(익명)'} ${short(n.callFrame.url)}${n.callFrame.url ? ':' + (n.callFrame.lineNumber + 1) : ''}`;
  const appOwner = id => { for (let x = id; x != null; x = parent.get(x)) { const n = byId.get(x); if (n.callFrame.url && n.callFrame.url.startsWith(appBase)) return keyOf(n); } return byId.get(id).callFrame.functionName || '(native)'; };
  const self = new Map(), owner = new Map();
  let busy = 0, total = 0;
  const runs = []; let run = null;
  for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i], dt = (profile.timeDeltas[i + 1] || 0) / 1000, n = byId.get(id), fn = n.callFrame.functionName;
    total += dt;
    if (fn === '(idle)') { if (run && run.ms > 50) runs.push(run); run = null; continue; }
    busy += dt;
    const k = keyOf(n), o = appOwner(id);
    self.set(k, (self.get(k) || 0) + dt);
    owner.set(o, (owner.get(o) || 0) + dt);
    if (!run) run = { ms: 0, own: new Map() };
    run.ms += dt; run.own.set(o, (run.own.get(o) || 0) + dt);
  }
  if (run && run.ms > 50) runs.push(run);
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([a, b]) => [a, r1(b)]);
  return { totalMs: Math.round(total), busyMs: Math.round(busy), self: top(self, 18), owner: top(owner, 14), longRuns: runs.sort((a, b) => b.ms - a.ms).slice(0, 8).map(r => ({ ms: Math.round(r.ms), top: top(r.own, 4) })) };
}
function traceSummary(buf) {
  const j = JSON.parse(buf.toString());
  const ev = j.traceEvents || j;
  const tname = new Map();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') tname.set(e.pid + ':' + e.tid, e.args.name);
  const cnt = new Map();
  for (const e of ev) if (e.ph === 'X' && tname.get(e.pid + ':' + e.tid) === 'CrRendererMain') cnt.set(e.pid + ':' + e.tid, (cnt.get(e.pid + ':' + e.tid) || 0) + 1);
  const main = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const xs = ev.filter(e => e.ph === 'X' && e.pid + ':' + e.tid === main && e.dur != null).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const nameOf = e => {
    const d = e.args && e.args.data;
    if (e.name === 'FunctionCall' && d) return `FunctionCall ${d.functionName || '(익명)'} ${(d.url || '').replace(/^https?:\/\/[^/]+\//, '')}:${d.lineNumber != null ? d.lineNumber + 1 : ''}`;
    if (e.name === 'EventDispatch' && d) return 'EventDispatch ' + d.type;
    if (e.name === 'TimerFire') return 'TimerFire';
    return e.name;
  };
  // 자기 시간(안쪽 일을 뺀 시간)
  const self = new Map(); const stack = [];
  const tasks = [];
  for (const e of xs) {
    while (stack.length && stack[stack.length - 1].end <= e.ts) stack.pop();
    const node = { e, end: e.ts + e.dur, child: 0, kids: new Map(), top: stack.length === 0 };
    if (stack.length) stack[stack.length - 1].child += e.dur;
    node.root = stack.length ? stack[0].root : node;
    stack.push(node);
    e._n = node;
    if (node.top) tasks.push(node);
  }
  for (const e of xs) {
    const n = e._n, s = Math.max(0, e.dur - n.child) / 1000, k = nameOf(e);
    self.set(k, (self.get(k) || 0) + s);
    n.root.kids.set(k, (n.root.kids.get(k) || 0) + s);
  }
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([a, b]) => [a, r1(b)]);
  const long = tasks.filter(t => t.e.dur > 50000).sort((a, b) => b.e.dur - a.e.dur);
  return { self: top(self, 20), longN: long.length, long: long.slice(0, 8).map(t => ({ ms: Math.round(t.e.dur / 1000), top: top(t.kids, 5) })) };
}
async function profiled(P, name, fn) {
  const { page, cdp } = P;
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'v8.execute', 'blink.user_timing'] });
  await cdp.send('Profiler.start');
  const extra = await fn();
  const { profile } = await cdp.send('Profiler.stop');
  const buf = await browser.stopTracing();
  await cdp.send('Profiler.disable');
  return { name, prof: profSummary(profile, base), trace: traceSummary(buf), extra };
}
async function runProf(rate) {
  const out = [];
  // 처음 열기 + 첫 두드림
  {
    const P = await newPage(rate);
    out.push(await profiled(P, '처음 열기 + 첫 두드림', async () => {
      await P.page.goto(base + '#/');
      await P.page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000 });
      await P.page.waitForTimeout(500);
      const bb = await (await P.page.$('.stage .friend')).boundingBox();
      await P.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await P.page.waitForTimeout(1200);
      return null;
    }));
    await P.page.goto(base + '#/tap');
    await P.page.waitForSelector('.tapbar .go');
    await P.page.waitForTimeout(800);
    out.push(await profiled(P, '징검다리 한 판', async () => { const r = await runTap(P, 'tap'); return { frames: r.frames, longs: r.longs, canvas: r.canvas, start: r.start }; }));
    out.push(await profiled(P, '놀이터 바꾸기', async () => { const r = await runPlay(P); return { all: r.all, longs: r.longs }; }));
    for (const id of PROFCELLS) out.push(await profiled(P, '칸 ' + id, async () => { const r = await runCell(P, id); return { frames: r.frames, longs: r.longs }; }));
    await P.ctx.close();
  }
  return out;
}


// ⑧ 소리 스레드 어림 — 오디오 스레드는 CPU 느리게가 안 걸리므로, 같은 소리를 OfflineAudioContext로 그려 '소리 1초 그리는 데 드는 ms'를 잼
//    (크롬북은 이 값 × 4~6으로 어림 · 실시간 소리 스레드는 1초에 1000ms가 한계, 넉넉히 300ms 안이면 안전)
async function runAudio(P) {
  const { page } = P;
  await page.goto(base + '#/');
  await page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000 });
  return page.evaluate(async () => {
    const { Engine } = await import(new URL('app/js/audio.js', document.baseURI).href);
    const SR = 48000;
    async function render(sec, fill, { reverb = true } = {}) {
      const off = new OfflineAudioContext(2, SR * sec, SR);
      const e = new Engine(); e._setup(off);
      if (!reverb) e.verb.disconnect();
      fill(e, off);
      const t = performance.now(); await off.startRendering();
      return Math.round(((performance.now() - t) / sec) * 10) / 10;       // 소리 1초당 ms
    }
    // 징검다리 한 판(100bpm) — 준비 박 · 북 · 마림바 반주 + 두드림마다 '덕'
    const tapGame = e => {
      const beat = 0.6, bus = e.bus(), t0 = 0.4;
      for (let i = 0; i < 4; i++) e.click(t0 + i * beat, i === 0, bus);
      const bass = [48, 53, 55, 48, 53, 55, 48];
      for (let i = 0; i < 26; i++) {
        const t = t0 + (4 + i) * beat, k = i - 2, down = k >= 0 ? k % 4 === 0 : i === 0;
        e.drum(down ? 'kick' : 'hat', t, down ? 0.75 : 0.45, bus);
        if (k >= 0 && k % 4 === 0) e.note('marimba', bass[(k / 4) % 7], t, beat * 1.8, 0.5, bus);
        if (k >= 0 && k % 4 === 2) e.note('marimba', bass[Math.floor(k / 4) % 7] + 16, t, beat * 0.9, 0.32, bus);
        e.drum('deok', t + 0.01, 0.7);
      }
    };
    // 합창 · 바이올린 · 리코더 긴 소리(소3 · 악1 같은 칸) — 음마다 노드가 가장 많은 악기
    const voices = e => { const bus = e.bus(); ['choir', 'violin', 'recorder', 'flute', 'choir', 'pizz', 'harp', 'choir'].forEach((inst, i) => e.note(inst, 64 + (i % 5) * 2, 0.2 + i * 1.4, 1.2, 0.6, bus, 'stacc')); };
    // 놀이터 '듣기' — 피아노 가락 + 북(빠르게)
    const tune = e => { const bus = e.bus(); for (let i = 0; i < 40; i++) { e.note('piano', 60 + [0, 2, 4, 5, 7, 9][i % 6], 0.2 + i * 0.25, 0.24, 0.75, bus); e.drum(i % 4 ? 'hat' : 'kick', 0.2 + i * 0.25, i % 4 ? 0.22 : 0.6, bus); } };
    return {
      silent: await render(10, () => {}),
      silentNoVerb: await render(10, () => {}, { reverb: false }),
      tap: await render(20, tapGame),
      tapNoVerb: await render(20, tapGame, { reverb: false }),
      voices: await render(12, voices),
      voicesNoVerb: await render(12, voices, { reverb: false }),
      tune: await render(11, tune),
      // 미리 예약만 해 둔 소리(아직 안 울림) · 끊은 출구에 남은 소리 — 소리 스레드가 그래도 일하나(피아노 150음 = 소스 750)
      pending150: await render(10, e => { const bus = e.bus(); for (let i = 0; i < 150; i++) e.note('piano', 60 + (i % 12), 30 + i * 0.002, 0.3, 0.5, bus); }),     // 그리는 10초 동안 한 번도 안 울림
      pending30: await render(10, e => { const bus = e.bus(); for (let i = 0; i < 30; i++) e.note('piano', 60 + (i % 12), 30 + i * 0.002, 0.3, 0.5, bus); }),
      orphan150: await render(10, e => { const bus = e.bus(); for (let i = 0; i < 150; i++) e.note('piano', 60 + (i % 12), 0.1 + i * 0.05, 8, 0.5, bus); bus.disconnect(); }),
      playing150: await render(10, e => { const bus = e.bus(); for (let i = 0; i < 150; i++) e.note('piano', 60 + (i % 12), 0.1 + i * 0.05, 8, 0.05, bus); }),
    };
  });
}

// ── 차례 ──
(async () => {
  await new Promise(r => server.listen(0, r));
  base = SITE || `http://localhost:${server.address().port}/`;
  browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--enable-precise-memory-info'] });
  const R = { at: new Date().toISOString(), base, rates: RATES, net: NET, home: [], homeBlock: [], tap: [], cells: [], play: [], room: [], mem: null, prof: null, audio: null };
  const save = () => { if (OUT) fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); };
  try {
    if (ONLY.has('calib')) {
      R.calib = await runCalib([1, 2, 4, 6, 8, 10, 12, 16, 20]);
      for (const c of R.calib) console.log(`calib rate ${c.rate}: JS ${r1(c.js)}ms(${c.jsX}×) · DOM ${r1(c.dom)}ms(${c.domX}×) · 짧은 일 ${r1(c.small)}ms(${c.smallX}×)`);
      save();
    }
    for (const rate of RATES) {
      if (!['home', 'tap', 'cells', 'play', 'room'].some(k => ONLY.has(k))) break;
      if (ONLY.has('home')) {
        const a = await runHome(rate, 'real'); R.home.push(a);
        console.log(`home ${rate}×: FCP ${a.fcp} · 처음 화면 그릇 ${a.homeDom} · 그림 다 뜸 ${a.homeAll}(그림 ${a.imgsOk}/${a.imgs} · 요청 ${a.imgReq} · ${a.imgKB}KB) · 미리 받기 ${a.prefetch}개 끝 ${a.prefetchEnd} · 첫 두드림 처리 ${a.tap.proc}ms(기다림 ${a.tap.wait}) · AudioContext 만들기 ${a.tap.acNewDur} → running ${a.tap.acNewToRun}ms · 잔향 ${a.tap.impulse} · 잡음 ${a.tap.noise} · 두 번째 열기 FCP ${a.warm.fcp} 그림 다 뜸 ${a.warm.homeAll}(버전 확인 끝 ${a.warm.verEnd})`);
        if (FONTDELAY) { const c = await runHome(rate, 'slow'); (R.homeSlow = R.homeSlow || []).push(c); console.log(`home ${rate}× 글꼴 ${FONTDELAY}ms 늦음: FCP ${c.fcp} · 그림 다 뜸 ${c.homeAll}`); }
        const b = await runHome(rate, 'block'); R.homeBlock.push(b);
        console.log(`home ${rate}× 글꼴 막음: FCP ${b.fcp} · 처음 화면 그릇 ${b.homeDom} · 그림 다 뜸 ${b.homeAll} · 첫 두드림 처리 ${b.tap.proc} · 두 번째 열기 그림 다 뜸 ${b.warm.homeAll}`);
        save();
      }
      if (ONLY.has('tap') || ONLY.has('cells') || ONLY.has('play') || ONLY.has('room')) {
        const P = await newPage(rate);
        await P.page.goto(base + '#/');
        await P.page.waitForFunction(() => window.__perf.homeAt, null, { timeout: 60000 });
        if (ONLY.has('tap')) {
          const t = await runTap(P, 'tap'); t.rate = rate; R.tap.push(t);
          console.log(`tap ${rate}×: ${t.res.kept}/${t.res.total} · 프레임 평균 ${t.frames.mean} p95 ${t.frames.p95} 최대 ${t.frames.max} · 50ms↑ ${t.frames.over50}/${t.frames.n}(${t.frames.pct50}%) · 긴 작업 ${t.longs.n}(최대 ${t.longs.max}) · 두드림 처리 p95 ${t.taps.procP95} 최대 ${t.taps.procMax} · 두드림→끝 p95 ${t.taps.totalP95} · 시작 단추 ${t.start && t.start.proc}ms · 소리 노드 ${t.au.made} 동시 ${t.au.peak}`);
          save();
        }
        if (ONLY.has('cells')) {
          for (const id of CELLS) {
            const c = await runCell(P, id); c.rate = rate; R.cells.push(c);
            console.log(`cell ${rate}× ${id}: ${c.done ? '끝' : '못 끝냄'} ${c.sec}초 · 프레임 p95 ${c.frames.p95} 최대 ${c.frames.max} · 50ms↑ ${c.frames.over50}/${c.frames.n}(${c.frames.pct50}%) · 게임 50ms↑ ${c.game.over50}/${c.game.n} · 긴 작업 ${c.longs.n}(최대 ${c.longs.max}) · 동시 소리 ${c.au.peak}`);
            save();
          }
        }
        if (ONLY.has('play')) {
          const p = await runPlay(P); p.rate = rate; R.play.push(p);
          console.log(`play ${rate}×: 누름 처리 p95 ${p.all.procP95} 최대 ${p.all.procMax} · 누름→그림 p95 ${p.all.frameP95} · 긴 작업 ${p.longs.n}(최대 ${p.longs.max}) · 듣기 50ms↑ ${p.listen.frames.over50}/${p.listen.frames.n}`);
          for (const [k, v] of Object.entries(p.per)) console.log(`   ${k}: 처리 최대 ${v.procMax} · 누름→다음 그림(Event Timing) 최대 ${v.evMax} · 두 프레임 뒤 ${v.frameMax}`);
          save();
        }
        if (ONLY.has('room')) {
          const r = await runRoom(P); r.rate = rate; R.room.push(r);
          console.log(`room ${rate}×: 확인 ${r.calls}번 · 프레임 p95 ${r.frames.p95} · 50ms↑ ${r.frames.over50}/${r.frames.n} · 긴 작업 ${r.longs.n}(최대 ${r.longs.max}) · 두드림 처리 p95 ${r.taps.procP95}`);
          save();
        }
        if (P.errs.length) console.log('  오류: ' + P.errs.slice(0, 3).join(' | '));
        await P.ctx.close();
      }
    }
    if (ONLY.has('audio')) {
      const P = await newPage(1);
      R.audio = await runAudio(P);
      console.log('audio(맥 오디오 스레드 · 소리 1초당 ms): ' + JSON.stringify(R.audio));
      await P.ctx.close(); save();
    }
    if (ONLY.has('mem')) {
      R.mem = await runMem(MEMRATE);
      console.log(`mem ${MEMRATE}×: 힙 처음 ${R.mem.h0.heapMB}MB → 13칸 뒤 ${R.mem.h1.heapMB}MB → 처음으로 ${R.mem.h2.heapMB}MB · DOM 노드 ${R.mem.h0.dom && R.mem.h0.dom.nodes} → ${R.mem.h2.dom && R.mem.h2.dom.nodes} · 이벤트 손잡이 ${R.mem.h0.dom && R.mem.h0.dom.jsEventListeners} → ${R.mem.h2.dom && R.mem.h2.dom.jsEventListeners} · 줄 버퍼 ${R.mem.audio.ks + R.mem.audio.pk}개 ${R.mem.audio.cacheMB}MB`);
      save();
    }
    if (ONLY.has('prof')) {
      R.prof = await runProf(PROFRATE);
      for (const p of R.prof) {
        console.log(`\nprof ${PROFRATE}× ${p.name} — 바쁨 ${p.prof.busyMs}/${p.prof.totalMs}ms · 50ms 넘는 작업(trace) ${p.trace.longN}`);
        console.log('  자기 시간(trace): ' + p.trace.self.slice(0, 10).map(x => `${x[0]} ${x[1]}`).join(' · '));
        console.log('  앱 함수(profiler): ' + p.prof.owner.slice(0, 8).map(x => `${x[0]} ${x[1]}`).join(' · '));
        for (const l of p.trace.long.slice(0, 4)) console.log(`  긴 작업 ${l.ms}ms: ` + l.top.map(x => `${x[0]} ${x[1]}`).join(' · '));
      }
      save();
    }
  } finally { await browser.close(); server.close(); }
  save();
  console.log('\n끝' + (OUT ? ' — ' + OUT : ''));
})().catch(e => { console.error(e); try { browser && browser.close(); } catch { /* */ } server.close(); process.exit(1); });
