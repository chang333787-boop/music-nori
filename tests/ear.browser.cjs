// 기계 귀(1단계 — 재고 적기만 · docs/ear.md) — 소리를 OfflineAudioContext로 그려 숫자로 잰다(tests/ear.lab.js).
//  실패(종료 코드 1) = 음 높이 ±10센트 밖 · 깨짐(피크 > 0.99) · 소리가 안 남(RMS < −60dBFS). 나머지는 경고로 찍기만.
//  잰 값 전부 → tests/ear.report.json(다음 단계가 고친 뒤 견줄 기준)
//  npm run test:ear   (npm test · test:browser에는 넣지 않음 — 1~2분 걸림)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser, R;
  const errs = [];
  try {
    browser = await pw.chromium.launch();
    const page = await browser.newPage();
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource/.test(t)) errs.push(t); else if (t.startsWith('[ear]')) console.log('  … ' + t.slice(6)); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/app/test/blank.html`);
    page.setDefaultTimeout(600000);
    R = await page.evaluate(async () => { const L = await import('/tests/ear.lab.js'); return L.run(m => console.log('[ear] ' + m)); });
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(__dirname, 'ear.report.json'), JSON.stringify(R, null, 1) + '\n');

  const sgn = v => (v > 0 ? '+' : '') + v;
  const pitched = R.pitch.filter(p => p.cents != null), worst = pitched.reduce((a, b) => (Math.abs(b.cents) > Math.abs(a.cents) ? b : a), pitched[0]);
  console.log(`기계 귀 · ${R.meta.sr}Hz · 악기 ${R.meta.insts} · ${R.meta.sec}초`);
  console.log(`1 음 높이 ${R.pitch.length}음 · 가장 큰 차 ${worst.inst} ${worst.name} ${sgn(worst.cents)}센트 · 잴 수 없음 ${R.pitch.length - pitched.length}`);
  const ls = R.levelSpread;
  console.log(`2 악기 사이 크기(솔4 · vel 0.6 · A 가중) 전체 ${ls.dB}dB(${ls.loudest} ↔ ${ls.softest}) · 칸이 쓰는 악기 ${ls.cellsDB}dB(${ls.cellsLoudest} ↔ ${ls.cellsSoftest}) · 6dB 넘는 짝 ${ls.pairs6.length}(칸 악기끼리 ${ls.pairs6.filter(p => p.bothInCells).length})`);
  console.log('3 세기 짝(큰 − 작은 · dB(A) · 압축기 지난 뒤 / 앞): ' + R.velPairs.map(v => `${v.cell} ${v.inst} ${v.dB}/${v.dBnoComp}`).join(' · '));
  const low = R.speaker.filter(s => s.used && s.above250 < 0.5).sort((a, b) => a.above250 - b.above250);
  console.log(`4 250Hz 위 비율 50% 밑(칸 악기): ${low.length ? low.map(s => `${s.inst} ${s.name} ${Math.round(s.above250 * 100)}%`).join(' · ') : '없음'}`);
  console.log(`5 음색 거리 so6 가까운 짝 평균 ${R.dist.so6CloseAvg} · 뚜렷한 짝 평균 ${R.dist.so6ClearAvg} · ` + R.dist.so6.map(p => `${p.a}-${p.b}${p.close ? '(가까움)' : ''} ${p.d}·${p.rank}위`).join(' · '));
  console.log('6 피크: ' + R.clip.map(c => `${c.name} ${c.peak}`).join(' · '));
  console.log('7 때(첫 소리 최대 어긋남 ms · 피크 절반까지 ms): ' + R.timing.map(t => `${t.inst} ${t.firstMs}/${t.reachMs}`).join(' · '));
  console.log('8 칸: sem1 ' + R.cells.sem1.map(r => `${r.kind} ${r.inst} ${r.dB}`).join(' · '));
  console.log('   ppa1 간격 ' + ['slow', 'mid', 'fast'].map(t => `${t} ${R.cells.ppa1[t].heard}/${R.cells.ppa1[t].planned}`).join(' · ') + ` · 비 ${R.cells.ppa1.slowOverMid} · ${R.cells.ppa1.midOverFast}`);
  console.log('   hwa1 soft ' + R.cells.hwa1soft.map(r => `${r.low} ${r.lowP}: 위보다 ${r.belowDbA}dB(A) 작음 · 250Hz 위 ${Math.round(r.lowAbove250 * 100)}%`).join(' · '));
  console.log('   so6 · hy1 ' + R.cells.so6hy1.map(r => `${r.cell} ${r.kind} ${r.a}→${r.second} ${sgn(r.dDbA)}dB(A)`).join(' · '));
  if (R.warns.length) { console.log(`⚠ 경고 ${R.warns.length}`); for (const w of R.warns) console.log(`   [${w.k}] ${w.m}`); }
  if (errs.length) console.log('콘솔 오류: ' + errs.join(' | '));
  if (R.fails.length || errs.length) { console.log(`✗ 실패 ${R.fails.length}`); for (const f of R.fails) console.log(`   [${f.k}] ${f.m}`); process.exit(1); }
  console.log('✓ 기계 귀 — 실패 0 (경고는 docs/ear.md)');
})().catch(e => { console.error(e); server.close(); process.exit(1); });
