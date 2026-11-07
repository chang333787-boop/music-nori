// 합성음 높이 시험(0단계 관문) — app/test/pitch.html 을 브라우저 하나로 열어 악기마다 잰 센트를 받는다. |센트| ≤ 6 이 아니면 종료 코드 1.
//  playwright는 이 저장소에 없으면 school-metaverse 것을 빌려 쓴다(설치 X). 정적 서버는 이 안에서 띄운다(포트 자동).
//  브라우저는 하나만 띄우고 끝나면 꼭 닫는다. 표본율은 PITCH_SR=48000,44100 (기본 둘 다) · 악기만 PITCH_INST=piano,harp
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

const pad = (s, n) => { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); };
const sc = c => (Number.isFinite(c) ? (c > 0 ? '+' : c < 0 ? '−' : ' ') + Math.abs(c).toFixed(1) : '  —');

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const q = new URLSearchParams();
  if (process.env.PITCH_SR) q.set('sr', process.env.PITCH_SR);
  if (process.env.PITCH_INST) q.set('inst', process.env.PITCH_INST);
  const url = `http://127.0.0.1:${server.address().port}/app/test/pitch.html${q.toString() ? '?' + q : ''}`;
  let browser, r, errs = [];
  try {
    browser = await pw.chromium.launch();
    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(url);
    await page.waitForFunction(() => window.__result, null, { timeout: 300000, polling: 500 });
    r = await page.evaluate(() => window.__result);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  if (r.error) { console.log('✗ 시험 쪽이 멈춤: ' + r.error); process.exit(1); }

  // 표 — 악기 · 표본율 한 줄에 음마다 센트
  console.log(`합성음 높이 시험 · 관문 |센트| ≤ ${r.limit} · ${r.rows.length}음 · ${r.sec.toFixed(1)}초`);
  const groups = new Map();
  for (const row of r.rows) {
    const k = row.inst + '|' + row.sr;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(row);
  }
  for (const rows of groups.values()) {
    const w = rows.reduce((a, b) => (!Number.isFinite(b.cents) || Math.abs(b.cents) > Math.abs(a.cents) ? b : a), rows[0]);
    console.log(`${rows.some(x => !x.ok) ? '✗' : '✓'} ${pad(rows[0].inst, 11)}${pad(rows[0].sr, 6)} ` +
      rows.map(x => `${pad(x.name, 4)}${pad(sc(x.cents), 6)}`).join(' ') + `  최대 ${sc(w.cents)}`);
  }
  // 재는 법 자가 점검 — 아는 만큼 어긋나게 그린 사인 · 톱니 · 네모를 0.3센트 안으로 돌려줘야 위 표를 믿는다
  const ce = r.checkErr;
  console.log(`${ce <= 0.3 ? '✓' : '✗'} 재는 법 자가 점검 ${r.check.length}개 · 최대 오차 ${Number.isFinite(ce) ? ce.toFixed(2) : '—'}센트 (` +
    r.check.map(c => `${c.type} ${c.p} ${c.sr} ${c.off > 0 ? '+' : ''}${c.off}→${Number.isFinite(c.got) ? c.got : '—'}`).join(' · ') + ')');
  const bad = r.rows.filter(x => !x.ok);
  if (errs.length) console.log('콘솔 오류: ' + errs.join(' | '));
  const w = r.worst;
  console.log(`가장 큰 차이: ${w.inst} ${w.name}(${w.p}) ${w.sr}Hz ${sc(w.cents)}센트 · 구간 ${w.seg}`);
  if (!(ce <= 0.3)) { console.log('✗ 재는 법을 믿을 수 없어요(자가 점검 실패)'); process.exit(1); }
  if (bad.length || errs.length) {
    console.log(`✗ 넘은 음 ${bad.length}개:`);
    for (const x of bad) console.log(`   ${pad(x.inst, 11)}${pad(x.name + '(' + x.p + ')', 9)}${pad(x.sr, 6)} 기대 ${x.fExp.toFixed(2)}Hz · 잰 ${Number.isFinite(x.f) ? x.f.toFixed(2) : '—'}Hz · ${sc(x.cents)}센트 · ${x.seg}`);
    process.exit(1);
  }
  console.log('✓ 합성음 높이 시험 통과');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
