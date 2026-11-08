// 소리 시험(docs/sound.md §6) — 배경 음악이 처음 화면 · 지도에서만 · 칸에 들어가면 꺼짐 · 끄기 스위치 · 새 줄 알림 · 친구 줄 크게
//  박 놀이 반주가 울림 · 결과 별 소리(하나씩 · 셋이면 팡파르) · 콘솔 오류 0
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let fail = 0;
  const bad = m => { fail++; console.log('✗ ' + m); }, ok = m => console.log('✓ ' + m);
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const M = () => page.evaluate(() => window.__music || { playing: false });
    const tapStage = async () => { const b = await page.locator('.stage').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + 20); };
    await page.goto(base + '#/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1200);
    // 1. 첫 두드림 전에는 조용
    if ((await M()).playing) bad('두드리기 전에 배경 음악이 남'); else ok('두드리기 전에는 조용');
    // 2. 무대를 누르면 배경 음악
    await tapStage();
    await page.waitForTimeout(1500);
    let m = await M();
    if (!m.playing || !(m.events > 0)) bad('처음 화면 배경 음악 안 남 ' + JSON.stringify(m)); else ok(`처음 화면 배경 음악 — 사건 ${m.events}`);
    if (!(await page.evaluate(() => document.querySelector('.stage').classList.contains('playing')))) bad('무대 끄덕임 꼬리표 없음');
    // 3. 지도에서 이어 틂(처음부터 다시 X)
    const bar0 = m.bar;
    await page.evaluate(() => { location.hash = '#/map'; });
    await page.waitForTimeout(2600);
    m = await M();
    if (!m.playing || !(m.bar > bar0)) bad('지도에서 이어 틀지 않음 ' + JSON.stringify({ bar0, m })); else ok(`지도에서 이어 틂(마디 ${bar0} → ${m.bar})`);
    // 4. 칸에 들어가면 0.6초 안에 꺼짐
    await page.evaluate(() => { location.hash = '#/cell/so4'; });
    await page.waitForTimeout(600);
    if ((await M()).playing) bad('소리 칸에서 배경 음악이 안 꺼짐'); else ok('칸에 들어가면 꺼짐');
    // 5. 처음 화면으로 돌아오면 다시
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(1200);
    if (!(await M()).playing) bad('처음 화면으로 돌아와도 안 켜짐'); else ok('돌아오면 다시 켜짐');
    // 6. 끄기 스위치(선생님 칸 '이 기기')
    await page.evaluate(() => { location.hash = '#/teacher'; });
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '배경 음악 켜짐' }).click();
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(400);
    await tapStage();
    await page.waitForTimeout(1200);
    if ((await M()).playing) bad('끄기 스위치를 꺼도 배경 음악이 남'); else ok('끄기 스위치 — 안 남');
    // 7. 새 줄 알림 + 새 줄 먼저 크게 + 친구 누르면 그 줄만 크게
    await page.evaluate(() => { localStorage.setItem('mn.bgm', 'true'); localStorage.setItem('mn.prog', JSON.stringify({ so3: { stars: 2 }, ga1: { stars: 1 } })); localStorage.setItem('mn.bgm.heard', JSON.stringify({ bear: 1, bunny: 0, bird: 0, hog: 0, turtle: 0 })); location.hash = '#/map'; });
    await page.waitForTimeout(400);
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(500);
    await tapStage();
    await page.waitForTimeout(1200);
    const banner = await page.evaluate(() => document.querySelector('.freshbanner')?.textContent || '');
    m = await M();
    const joined = await page.evaluate(() => [...document.querySelectorAll('.friend.joined .tag')].map(e => e.textContent));
    if (!/토끼 · 참새가 새 소리/.test(banner) || !m.playing || String(m.fresh) !== 'bunny,bird' || joined.join() !== '참새,토끼,곰') bad('새 줄: ' + JSON.stringify({ banner, m, joined }));
    else ok(`새 줄 알림 "${banner}" · 먼저 크게 ${m.fresh} · 연주 중 ${joined.join('·')}`);
    await page.getByRole('button', { name: /^참새/ }).click();
    await page.waitForTimeout(300);
    m = await M();
    if (String(m.spot) !== 'bird') bad('친구 누르기 — 그 줄 크게 안 됨 ' + JSON.stringify(m)); else ok('참새를 누르면 가락 줄만 크게');
    // 다음에 새로 틀 때는 알림 X(들었음) — 칸에 갔다 와서 처음부터 다시 틀 때
    await page.evaluate(() => { document.querySelectorAll('.freshbanner').forEach(e => e.remove()); location.hash = '#/cell/so3'; });
    await page.waitForTimeout(500);
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(1200);
    m = await M();
    if (!m.playing || (m.fresh && m.fresh.length) || await page.evaluate(() => !!document.querySelector('.freshbanner'))) bad('들은 줄 알림이 또 뜸 ' + JSON.stringify(m)); else ok('들은 뒤에는 알림 X');
    // 8. 박 놀이 반주 — 징검다리
    await page.evaluate(() => { window.__accomp = 0; location.hash = '#/tap'; });
    await page.waitForTimeout(600);
    await page.click('button.go.huge');
    await page.waitForTimeout(4500);
    const acc = await page.evaluate(() => window.__accomp || 0);
    if (!(acc > 10)) bad('징검다리 반주 안 울림 ' + acc); else ok(`징검다리 주제곡 반주 사건 ${acc}`);
    // 9. 결과 별 소리 — 높게·낮게 확인 게임을 자동으로 끝까지
    await page.evaluate(() => { window.__cellResult = null; window.__starSounds = null; location.hash = '#/cell/so4/game'; });
    await page.waitForTimeout(700);
    let res = null;
    for (let k = 0; k < 600 && !res; k++) {
      res = await page.evaluate(() => (window.__cellResult ? { r: window.__cellResult.stars, s: window.__starSounds, pop: document.querySelectorAll('.star.pop').length, nw: document.querySelectorAll('.newstar').length } : (window.__cellAuto && window.__cellAuto(), null)));
      if (!res) await page.waitForTimeout(160);
    }
    if (!res || res.r !== 3 || !res.s || res.s.lit !== 3 || res.s.delays.length !== 3 || res.pop !== 3 || res.nw !== 3) bad('결과 별 소리: ' + JSON.stringify(res));
    else ok(`결과 별 셋 — 소리 ${res.s.delays.join('·')}ms · 톡 ${res.pop} · 새 별 ${res.nw}`);
    const fl = await page.evaluate(() => document.querySelector('.freshline')?.textContent || '');
    if (!/트라이앵글|글로켄|첼레스타/.test(fl)) bad('결과에 새 줄 한 줄 없음: ' + fl); else ok(`결과 새 줄: "${fl}"`);
    const sc = await page.evaluate(() => { const mm = document.getElementById('main'); return document.documentElement.scrollHeight - innerHeight + (mm.scrollHeight - mm.clientHeight); });
    if (sc > 1) bad('결과 화면 스크롤 ' + sc); else ok('결과 화면 스크롤 0');
    if (errs.length) bad('콘솔 오류: ' + errs.join(' | ')); else ok('콘솔 오류 0');
  } catch (e) { bad(String(e && e.stack || e)); }
  await browser.close(); server.close();
  console.log(fail ? `✗ 소리 시험 실패 ${fail}` : '✓ 소리 시험 통과');
  process.exit(fail ? 1 : 0);
})();
