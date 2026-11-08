// 소리 들어 보기 파일 만들기(docs/sound.md) — 주제곡을 오프라인으로 그려 WAV로 · 크기(최고 · RMS)도 잰다
//  node tools/render_sound.cjs <내보낼 폴더>  → theme_grow.wav(계단 0 → 13) · theme_full.wav(다섯 다 함께) · echo_mix.wav(따라 치기 반주 + 고슴도치 북 + 내 두드림) · stars.wav(별 셋 + 팡파르)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/Users/dobuk/Projects/school-metaverse/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || path.join(ROOT, 'out');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('page error', e));
  await page.goto(`http://127.0.0.1:${server.address().port}/app/test/blank.html`).catch(() => {});
  const out = await page.evaluate(async () => {
    const { Engine } = await import('/app/js/audio.js');
    const T = await import('/engine/theme.js');
    const SR = 44100;
    const wav = (buf) => {                                 // 16비트 WAV → base64
      const ch = buf.numberOfChannels, n = buf.length, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
      const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
      data.setUint32(24, SR, true); data.setUint32(28, SR * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
      const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
      let o = 44;
      for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v * 32767, true); o += 2; }
      let s = ''; const u8 = new Uint8Array(data.buffer);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const stats = (buf, a = 0, z = buf.duration) => {      // 구간 최고 · RMS(dBFS)
      const d = buf.getChannelData(0), i0 = Math.floor(a * SR), i1 = Math.min(d.length, Math.floor(z * SR));
      let pk = 0, ss = 0;
      for (let i = i0; i < i1; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; ss += v * v; }
      const db = x => (x > 0 ? 20 * Math.log10(x) : -99).toFixed(1);
      return { peak: db(pk), rms: db(Math.sqrt(ss / Math.max(1, i1 - i0))) };
    };
    async function render(sec, build) {
      const oc = new OfflineAudioContext(2, Math.ceil(SR * sec), SR);
      const e = new Engine(); e._setup(oc);
      const play = (ev, tb, beat, out) => { const t = tb + ev.b * beat; if (ev.kind === 'note') e.note(ev.inst, ev.p, t, ev.d * beat, ev.vel, out); else e.drum(ev.drum, t, ev.vel, out, ev.span); };
      build(e, oc, play);
      return oc.startRendering();
    }
    const beat = 60 / T.THEME.bpm, bar = beat * 4, res = {};
    const ALL = { bear: 1, bunny: 3, bird: 3, hog: 5, turtle: 2 };
    // 1. 계단이 오르는 모습 — 4마디마다: 곰만 → 토끼·참새 조금 → 북·베이스 더 → 다섯 다 함께
    const STAGES = [{ bear: 1, bunny: 0, bird: 0, hog: 0, turtle: 0 }, { bear: 1, bunny: 2, bird: 1, hog: 0, turtle: 0 }, { bear: 1, bunny: 3, bird: 2, hog: 3, turtle: 1 }, ALL];
    let buf = await render(17 * bar + 3, (e, oc, play) => {
      const m = e.bus(); m.gain.value = 0.38;
      for (let i = 0; i < 16; i++) for (const ev of T.themeBar(i, STAGES[i >> 2])) play(ev, 0.1 + i * bar, beat, m);
      for (const ev of T.cadence(ALL)) play(ev, 0.1 + 16 * bar, beat, m);
    });
    res.grow = { wav: wav(buf), sec: buf.duration, stages: STAGES.map((_, k) => stats(buf, 0.1 + k * 4 * bar, 0.1 + (k + 1) * 4 * bar)) };
    // 2. 다섯 다 함께 16마디
    buf = await render(17 * bar + 3, (e, oc, play) => {
      const m = e.bus(); m.gain.value = 0.38;
      for (let i = 0; i < 16; i++) for (const ev of T.themeBar(i, ALL)) play(ev, 0.1 + i * bar, beat, m);
      for (const ev of T.cadence(ALL)) play(ev, 0.1 + 16 * bar, beat, m);
    });
    res.full = { wav: wav(buf), sec: buf.duration, all: stats(buf) };
    // 3. 따라 치기 섞임 — 반주만(2마디) → 반주 + 고슴도치 북 + 내 두드림(4마디) · 빠르기 100
    const b2 = 0.6, pat = [['ta', 'ta', 'ta', 'rest'], ['ta', 'rest', 'ta', 'ta']];
    buf = await render(6 * 4 * b2 + 2, (e, oc, play) => {
      const m = e.bus();
      for (let i = 0; i < 6; i++) {
        const tb = 0.1 + i * 4 * b2;
        for (const ev of T.accompBar(i, { sal: 'pulse' })) play(ev, tb, b2, m);
        if (i >= 2) { const p = pat[(i - 2) >> 1]; p.forEach((k, j) => { if (k !== 'ta') return; if ((i - 2) % 2 === 0) e.drum('deong', tb + j * b2, 0.85, m); else e.drum('deok', tb + j * b2 + 0.01, 0.7, m); }); }
      }
    });
    res.echo = { wav: wav(buf), sec: buf.duration, accompOnly: stats(buf, 0.1, 0.1 + 8 * b2), withCall: stats(buf, 0.1 + 8 * b2, 0.1 + 24 * b2) };
    // 4. 별 셋 + 팡파르
    buf = await render(6, (e, oc, play) => {
      const m = e.bus(); m.gain.value = 0.9;
      T.STAR_NOTES.forEach((p, j) => e.note('glock', p, 0.3 + j * 0.45, 0.5, 0.6, m));
      for (const ev of T.fanfare()) play(ev, 0.3 + 3 * 0.45 + 0.1, 60 / T.FANFARE_BPM, m);
    });
    res.stars = { wav: wav(buf), sec: buf.duration, all: stats(buf) };
    return res;
  });
  for (const [k, v] of Object.entries(out)) {
    const name = { grow: 'theme_grow', full: 'theme_full', echo: 'echo_mix', stars: 'stars' }[k] + '.wav';
    fs.writeFileSync(path.join(OUT, name), Buffer.from(v.wav, 'base64'));
    delete v.wav;
    console.log(name, JSON.stringify(v));
  }
  await browser.close(); server.close();
})();
