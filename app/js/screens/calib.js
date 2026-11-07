// 지연 맞추기(#/calib) — 딸깍 소리에 맞춰 8번 두드려 이 기기의 '두드림 → 들린 소리' 지연을 잰다.
//  잰 값(ms)은 모든 박 판정에서 뺀다(engine/judge.js judgeTaps 의 latency). 1~2학년 기기는 선생님이 대신 잰다.
//  시계: 딸깍은 오디오 시계로 예약하고, 들린 시각은 clock.js audioToPerf 로 바꾼다(박 놀이 tap.js 와 같은 길).
//   두드림은 pointerdown/keydown 의 event.timeStamp(performance.now 기준) 그대로. 둘의 차이의 가운데 값 = 이 기기 지연.
//  화면 = 한 번에 할 일 하나. 단계 ① 설명 → ② 두드리기(준비 딸깍 4번 · 센박 소리 → 딸깍 8번 · 90 BPM) → ③ 결과(ok면 저장)
//   잰 값이 있으면 ③ 결과로 바로 연다(판정 너그러움 · 기록 한 줄도 거기). 기술 값은 접힌 '자세히' 안.
import { h, onPress } from '../util.js';
import { deviceInfo } from '../device.js';
import { audioToPerf, clockMethod } from '../clock.js';
import { estimateLatency, BANDS } from '../../../engine/judge.js';

const BPM = 90, IOI = 60 / BPM, COUNT = 4, N = 8;
const LEAD = 0.6;                         // 시작을 누르고 첫 딸깍까지(초)
const OFF_CAP = 512;                      // 시계 짝 표본 자리(40ms마다 · 9초면 230개쯤)
const BAND_UI = [['low', '넉넉하게'], ['mid', '보통'], ['high', '촘촘하게']];   // 작은 글 = BANDS[키].name(선생님용 학년)

const pad2 = n => String(n).padStart(2, '0');
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// 두드린 시각 — event.timeStamp가 performance.now 기준이 아닌 옛 브라우저는 지금 시각으로
const stamp = e => { const now = performance.now(), t = e && e.timeStamp; return t > 0 && t <= now + 50 && now - t < 1000 ? t : now; };
const msText = v => (v < 0 ? '−' : '') + Math.abs(v);
const dayText = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${d.getMonth() + 1}월 ${d.getDate()}일` : ''; };

// 기록 한 줄 — 날짜 · OS · 화면 · 표본율 · baseLatency · outputLatency · 두드림 지연 ms ± 흔들림 · 방법
export function recordLine(rec, info = (rec && rec.info) || deviceInfo()) {
  const d = rec && rec.at ? new Date(rec.at) : new Date();
  const ms = v => (v == null ? '?' : v + 'ms');
  const lat = rec && Number.isFinite(rec.ms)
    ? `두드림 지연 ${rec.ms}ms ± ${rec.spread == null ? '?' : rec.spread + 'ms'}(${rec.n}개)${rec.ok === false ? ' 다시 재야 함' : ''}`
    : '두드림 지연 아직 안 잼';
  return [
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    info.os, `화면 ${info.screen}`, info.sampleRate ? `${info.sampleRate}Hz` : '표본율 ?',
    `baseLatency ${ms(info.baseLatency)}`, `outputLatency ${ms(info.outputLatency)}`,
    lat, (rec && rec.method) || '방법 ?',
  ].join(' · ');
}

// 단계 표시 — ① ② ③ 동그라미 + 이름. set(i) = 지금 단계
function stepper(names) {
  const items = names.map((name, i) => h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 't' }, name)));
  const el = h('ol', { class: 'ms-steps', 'aria-label': '단계' }, items);
  return { el, set(k) { items.forEach((li, i) => { li.className = i < k ? 'done' : i === k ? 'now' : ''; li.toggleAttribute('aria-current', i === k); }); } };
}

export default function mount(root, ctx) {
  const { engine, device, toast, go } = ctx;
  let phase = 'intro', run = null, last = null;
  let raf = 0, sampler = 0, endTimer = 0, bus = null, alive = true, hitFlip = false, shown = '';
  let padEl = null, countEl = null, sayEl = null, dotEls = [];

  const steps = stepper(['설명', '두드리기', '결과']);
  const topR = h('div', { class: 'ms-top-r' });
  const stage = h('div', { class: 'ms-stage' });
  const live = h('p', { class: 'ms-sr', role: 'status', 'aria-live': 'polite' });
  root.append(h('div', { class: 'ms ms-calib' },
    h('div', { class: 'ms-top' }, h('h2', {}, '지연 맞추기'), steps.el, topR), stage, live));

  // ── ① 설명 ──
  function showIntro() {
    phase = 'intro'; steps.set(0); topR.replaceChildren();
    const dotsRow = (n, cls) => h('span', { class: 'ms-seq-dots' }, Array.from({ length: n }, () => h('i', { class: cls })));
    stage.replaceChildren(h('div', { class: 'ms-intro' },
      h('div', { class: 'ms-art', 'data-art': 'calib', 'aria-hidden': 'true' }),     // 그림 자리(app/img/band/ · 비어 있으면 안 보임)
      h('h3', {}, '딸깍 소리에 맞춰 8번 두드려요'),
      h('p', { class: 'ms-lead' }, '준비 소리 4번이 지나면 시작해요. 화면 아무 곳이나 톡, 스페이스도 돼요.'),
      h('div', { class: 'ms-seq', 'aria-hidden': 'true' },
        h('span', { class: 'ms-seq-g' }, dotsRow(COUNT, 'prep'), h('small', {}, '준비 4번')),
        h('span', { class: 'ms-seq-arrow' }),
        h('span', { class: 'ms-seq-g' }, dotsRow(N, 'tap'), h('small', {}, '두드리기 8번'))),
      onPress(h('button', { type: 'button', class: 'pri big ms-go' }, '시작'), () => start()),
      h('p', { class: 'ms-note' }, '1~2학년 기기는 선생님이 대신 재요.')));
  }

  // ── ② 두드리기 ──
  function showRun() {
    phase = 'run'; steps.set(1); shown = '';
    topR.replaceChildren(onPress(h('button', { type: 'button', class: 'ms-quit' }, '그만하기'), () => { cancelRun(); showIntro(); }));
    sayEl = h('p', { class: 'ms-pad-say' }, '딸깍 소리가 날 때마다 톡!');
    countEl = h('div', { class: 'ms-count' }, h('small', {}, '준비'), h('b', {}, ''));
    dotEls = Array.from({ length: N }, () => h('span', { class: 'ms-dot' }));
    padEl = h('div', { class: 'ms-pad', tabindex: '-1', role: 'application', 'aria-label': '두드리는 곳 — 딸깍 소리에 맞춰 누르기' },
      sayEl, countEl, h('div', { class: 'ms-dots', 'aria-hidden': 'true' }, dotEls),
      h('p', { class: 'ms-pad-hint' }, '화면 아무 곳이나 · 스페이스'));
    stage.replaceChildren(padEl);
    padEl.focus({ preventScroll: true });
  }

  async function start() {
    if (phase === 'run') return;
    let ac;
    try { ac = engine.ensure(); } catch { toast('이 기기에서는 소리를 낼 수 없어요'); return; }
    if (ac.state !== 'running') { try { await ac.resume(); } catch { /* 아래에서 다시 본다 */ } }
    if (!alive) return;
    if (ac.state !== 'running') { toast('소리가 아직 안 켜졌어요. 한 번 더 눌러 주세요'); return; }
    stopSound();
    bus = engine.bus();
    const t0 = ac.currentTime + LEAD, clicksA = new Float64Array(N);
    for (let i = 0; i < COUNT + N; i++) {
      const t = t0 + i * IOI;
      engine.click(t, i < COUNT, bus);           // 준비 4번 = 센박 소리(높은 딸깍)
      if (i >= COUNT) clicksA[i - COUNT] = t;
    }
    run = { t0, clicksA, offs: new Float64Array(OFF_CAP), nOff: 0, guess: new Float64Array(OFF_CAP), nGuess: 0, taps: [], lit: 0, end: t0 + (COUNT + N) * IOI + 0.45 };
    // 시험용 — 들릴 시각(ms)을 읽어 자동으로 두드려 볼 수 있게(tap.js __tapPlan 과 같은 꼴)
    window.__calibPlan = { clicks: () => Array.from(clicksA, t => audioToPerf(ac, t)), count: COUNT, n: N, ioi: IOI * 1000 };
    showRun();
    sampleClock();
    sampler = setInterval(sampleClock, 40);
    endTimer = setTimeout(finish, (run.end - ac.currentTime) * 1000 + 30);
    raf = requestAnimationFrame(frame);
  }

  // 오디오 시각 0 이 들리는 화면 시각 = 바꾸기 값. 재는 동안 여러 번 받아 가운데 값을 쓴다(한 번 받은 값의 흔들림을 줄임)
  //  소리 길을 막 연 뒤 잠깐은 getOutputTimestamp가 0을 줘서 clock.js가 어림(latencyGuess)으로 바뀐다 → 두 방법의 값을 따로 모아 섞지 않는다
  function sampleClock() {
    if (!run || !engine.ctx) return;
    const ac = engine.ctx;
    if (clockMethod(ac) === 'outputTimestamp') { run.offs[run.nOff % OFF_CAP] = audioToPerf(ac, 0); run.nOff++; }
    else { run.guess[run.nGuess % OFF_CAP] = audioToPerf(ac, 0); run.nGuess++; }
  }

  // 준비 숫자(4 · 3 · 2 · 1) — 재는 8번 동안은 박에 맞춰 바뀌는 그림을 두지 않는다(눈이 아니라 귀로 맞추게)
  function frame() {
    if (!run || !engine.ctx || !countEl) return;
    const k = Math.floor((engine.ctx.currentTime - run.t0) / IOI);
    const label = k < 0 ? '' : k < COUNT ? String(COUNT - k) : 'go';
    if (label !== shown) {
      shown = label;
      const now = label === 'go';
      countEl.classList.toggle('go', now);
      countEl.firstChild.textContent = now ? '지금부터' : '준비';
      countEl.lastChild.textContent = now ? '톡!' : label;
    }
    if (k < COUNT + N) raf = requestAnimationFrame(frame);
  }

  function onTap(e) {
    if (phase !== 'run' || !run) return;
    if (e.type === 'keydown') {
      if (e.key !== ' ' && e.code !== 'Space') return;
      e.preventDefault();
      if (e.repeat) return;
    } else {
      if (e.button > 0) return;
      if (e.target && e.target.closest && e.target.closest('button, a, input, textarea, summary, .bar')) return;
    }
    const ts = stamp(e);
    run.taps.push(ts);
    // 손맛 — 큰 면이 턱까지 눌렸다 올라온다(애니메이션 둘을 번갈아 써서 빨리 두드려도 매번 다시 움직임)
    hitFlip = !hitFlip;
    padEl.classList.remove(hitFlip ? 'hit-b' : 'hit-a');
    padEl.classList.add(hitFlip ? 'hit-a' : 'hit-b');
    const first = audioToPerf(engine.ctx, run.clicksA[0]) - IOI * 500;
    if (ts < first) { sayEl.textContent = '지금은 준비 소리예요. 조금만 기다려요'; sayEl.classList.add('warn'); return; }
    sayEl.textContent = '딸깍 소리가 날 때마다 톡!'; sayEl.classList.remove('warn');
    if (run.lit < N) dotEls[run.lit++].classList.add('on');
  }
  window.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', onTap);

  function finish() {
    if (!run || !alive) return;
    clearInterval(sampler); sampler = 0;
    cancelAnimationFrame(raf); raf = 0;
    const ac = engine.ctx;
    sampleClock();
    const useTs = run.nOff >= 3;                 // 오디오 출력 시각 표본이 셋 이상이면 그것만, 아니면 어림 값
    const n = Math.min(useTs ? run.nOff : run.nGuess, OFF_CAP);
    const off = n ? median(Array.from((useTs ? run.offs : run.guess).subarray(0, n))) : audioToPerf(ac, 0);
    const clicks = Array.from(run.clicksA, t => off + t * 1000);
    const lo = clicks[0] - IOI * 500, hi = clicks[N - 1] + IOI * 500;
    const taps = run.taps.filter(t => t >= lo && t <= hi);
    const r = estimateLatency(clicks, taps);
    const method = useTs ? 'outputTimestamp' : n ? 'latencyGuess' : clockMethod(ac);
    const rec = { ms: r.ms, spread: r.spread, n: r.n, at: new Date().toISOString(), method, info: deviceInfo() };
    last = { ...rec, ok: r.ok };
    window.__calibLast = { ...r, method, clicks, taps, clockSamples: n };
    run = null;
    if (r.ok) device.latency = rec;
    showResult(last, true);
  }

  function cancelRun() {
    clearInterval(sampler); sampler = 0; clearTimeout(endTimer); cancelAnimationFrame(raf); raf = 0;
    run = null; stopSound();
  }

  // ── ③ 결과 ── 숫자 하나 크게 + 쉬운 한 줄. fresh = 방금 잰 것(아니면 저장된 값)
  function showResult(rec, fresh) {
    phase = 'result'; steps.set(2); topR.replaceChildren();
    const ok = rec && rec.ok !== false && Number.isFinite(rec.ms);
    const verdict = !ok ? '다시 해 볼까요?' : fresh ? '좋아요! 이 기기를 맞췄어요' : '이 기기는 맞춰져 있어요';
    const line = !ok
      ? (rec && rec.n < 5 ? `소리에 맞춘 두드림이 ${rec.n}번이에요. 딸깍마다 한 번씩 톡 두드려요.` : '두드림이 고르지 않았어요. 딸깍마다 한 번씩 톡 두드려요.')
      : Math.abs(rec.ms) > 300 ? '값이 커요. 블루투스 스피커라면 한 번 더 재 보세요.'
      : fresh ? '앞으로 박 놀이에서 이만큼 빼고 판정해요.' : `${dayText(rec.at)}에 잰 값이에요. 박 놀이에서 이만큼 빼고 판정해요.`;
    const again = onPress(h('button', { type: 'button', class: ok ? 'leaf big' : 'pri big' }, ok ? '다시 재기' : '다시 하기'), () => start());
    const done = ok ? onPress(h('button', { type: 'button', class: 'pri big' }, '다 했어요'), () => go('teacher')) : null;
    stage.replaceChildren(h('div', { class: 'ms-result' + (ok ? '' : ' retry') },
      h('h3', { class: 'ms-verdict' }, verdict),
      ok ? h('div', { class: 'ms-num' }, h('b', {}, msText(rec.ms)), h('span', {}, 'ms')) : h('div', { class: 'ms-num off' }, h('b', {}, `${rec ? rec.n : 0} / ${N}`)),
      h('p', { class: 'ms-lead' }, line),
      h('div', { class: 'ms-actions' }, done, again),
      h('div', { class: 'ms-foot' }, bandGroup(), more(rec))));
    live.textContent = ok ? `지연 ${rec.ms}밀리초.` : '다시 재야 해요.';
  }

  // 판정 너그러움 — 아이 화면처럼 큰 단추 셋(작은 글씨 = 선생님용 학년)
  function bandGroup() {
    const cur = BANDS[device.band] ? device.band : 'mid';
    const btns = BAND_UI.map(([key, name]) => onPress(h('button', { type: 'button', 'data-band': key, 'aria-pressed': String(key === cur) },
      h('b', {}, name), h('small', {}, BANDS[key].name)), () => {
      device.band = key;
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.band === key));
    }));
    return h('div', { class: 'ms-band' }, h('span', { class: 'ms-band-l' }, '판정 너그러움'), h('div', { class: 'ms-band-g', role: 'group', 'aria-label': '판정 너그러움' }, btns));
  }

  // 자세히(접힘) — 기술 값 · 기록 한 줄 복사(0단계 관문 '기기별 두드림→소리 지연 기록')
  function more(rec) {
    const info = (rec && rec.info) || deviceInfo();
    const row = (k, v) => h('div', {}, h('dt', {}, k), h('dd', {}, v));
    const ms = v => (v == null ? '모름' : v + 'ms');
    const box = h('textarea', { class: 'ms-copy', readonly: true, hidden: true, rows: '3', 'aria-label': '기록 한 줄' });
    const copy = onPress(h('button', { type: 'button', class: 'leaf' }, '기록 한 줄 복사'), async () => {
      const text = recordLine(rec);
      let ok = false;
      try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch { /* 아래 글 상자로 */ }
      if (!alive) return;
      if (ok) { box.hidden = true; toast('기록 한 줄을 복사했어요'); return; }
      box.value = text; box.hidden = false; box.focus(); box.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      toast(ok ? '기록 한 줄을 복사했어요' : '글 상자에서 직접 복사해 주세요');
    });
    return h('details', { class: 'ms-more' }, h('summary', {}, '자세히'),
      h('div', { class: 'ms-more-body' },
        h('dl', {},
          row('흔들림', rec && rec.spread != null ? `±${rec.spread}ms` : '모름'),
          row('쓴 두드림', rec && rec.n != null ? `${rec.n} / ${N}` : '모름'),
          row('시계 맞추기', (rec && rec.method) || '모름'),
          row('표본율', info.sampleRate ? `${info.sampleRate}Hz` : '모름'),
          row('baseLatency', ms(info.baseLatency)),
          row('outputLatency', ms(info.outputLatency)),
          row('기기 · 화면', `${info.os} · ${info.screen}`)),
        copy, box));
  }

  function stopSound() {
    if (!bus) return;
    const b = bus; bus = null;
    try { const now = engine.now; b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(0, now); b.disconnect(); } catch { /* 이미 끊김 */ }
  }

  const saved = device.latency;
  if (saved && Number.isFinite(saved.ms)) showResult(saved, false); else showIntro();

  return () => {
    alive = false;
    cancelRun();
    window.removeEventListener('pointerdown', onTap);
    window.removeEventListener('keydown', onTap);
    delete window.__calibPlan;
  };
}
