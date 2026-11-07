// 스피커 점검(#/speaker) — 크롬북 작은 스피커는 낮은 음이 작게 들린다. 높낮이 판에서 낮은 음이 '작은 소리'로 들리지 않게
//  음높이마다 크기를 맞춘다. 결과 device.speaker = { gains: { 60: x, 67: y, …, 69: 1 }, at, method, inst } → eq.js 가 모든 음에 곱한다.
//  화면 = 한 번에 할 일 하나. 단계 ① 설명 → ② 맞추기 → ③ 결과(저장). 맞춘 값이 있으면 ③ 결과로 바로 연다.
//   귀로 맞추기(기본): 기준 소리(라4 · A4)와 맞출 소리를 번갈아 들으며 '같은 크기'가 되게 밀대를 움직인다. 음 다섯 + 참고 하나(C3).
//   마이크로 재기(선생님 기기 · 고르면): 같은 음들을 틀고 마이크 크기(RMS)를 재서 맞출 값을 제안한다. 소리는 기기 안에서만 처리.
//  이 화면에 있는 동안은 저장된 맞춤을 끈다(맞추는 소리에 옛 값이 또 곱해지지 않게) · 떠날 때 다시 켠다.
import { h, onPress } from '../util.js';
import { pitchGain, refreshEq, gainAt, clampGain, GAIN_MAX } from '../eq.js';
import { solfege, letter } from '../../../engine/theory.js';

const REF = 69;                              // 기준 = 라4(A4 · 440Hz)
const ORDER = [60, 67, 72, 79, 84, 48];      // 맞추는 차례 — 48(C3)은 참고(손대지 않으면 저장하지 않는다)
const CHART = [48, 60, 67, 72, 79, 84];      // 결과 그림은 낮은 음 → 높은 음
const EXTRA = 48;
const INSTS = [['piano', '피아노'], ['xylo', '실로폰']];
const NOTE = 0.5, STEP = 0.8, PAIR_GAP = 0.45, VEL = 0.6;   // 번갈아 듣기: 기준 → 0.8초 → 맞출 소리 → 1.25초 → 기준 …
const MSTEP = 0.9, MVEL = 0.6, ROUNDS = 2;                  // 마이크로 재기: 음마다 0.9초 · 두 바퀴
const DB = 6;                                               // 밀대 = −6dB ~ +6dB(배수 0.5 ~ 2)
const MIC_WAIT = 10000;                                     // 마이크 허락을 기다리는 가장 긴 시간(ms)

const gOf = db => clampGain(Math.pow(10, db / 20));
const dbOf = g => 20 * Math.log10(g);
const fmt = g => '×' + g.toFixed(2);
const dayText = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${d.getMonth() + 1}월 ${d.getDate()}일` : ''; };

function stepper(names) {
  const items = names.map((name, i) => h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 't' }, name)));
  const el = h('ol', { class: 'ms-steps', 'aria-label': '단계' }, items);
  return { el, set(k) { items.forEach((li, i) => { li.className = i < k ? 'done' : i === k ? 'now' : ''; li.toggleAttribute('aria-current', i === k); }); } };
}

export default function mount(root, ctx) {
  const { engine, device, toast } = ctx;
  const saved = device.speaker;
  const draft = {}, touched = new Set();
  for (const p of ORDER) draft[p] = 1;
  if (saved && saved.gains) for (const [k, v] of Object.entries(saved.gains)) {
    const p = Number(k);
    if (ORDER.includes(p) && Number.isFinite(Number(v))) { draft[p] = clampGain(Number(v)); touched.add(p); }
  }
  let inst = saved && INSTS.some(([k]) => k === saved.inst) ? saved.inst : 'piano';
  let method = (saved && saved.method) || '귀';
  let cur = ORDER[0], alive = true, dirty = false;
  let loop = null, loopTimer = 0, raf = 0, bus = null, mic = null;
  let ui = {};                                // 지금 단계의 그릇들
  engine.pitchGain = null;                    // 이 화면에서는 날 소리 그대로

  const steps = stepper(['설명', '맞추기', '결과']);
  const topR = h('div', { class: 'ms-top-r' });
  const stage = h('div', { class: 'ms-stage' });
  root.append(h('div', { class: 'ms ms-spk' }, h('div', { class: 'ms-top' }, h('h2', {}, '스피커 점검'), steps.el, topR), stage));

  const instSeg = () => {
    const seg = h('div', { class: 'ms-pick', role: 'group', 'aria-label': '소리' },
      INSTS.map(([k, name]) => onPress(h('button', { type: 'button', 'data-k': k, 'aria-pressed': String(k === inst) }, name), () => {
        inst = k; for (const b of seg.children) b.setAttribute('aria-pressed', String(b.dataset.k === k));
      })));
    return h('div', { class: 'ms-pickrow' }, h('span', { class: 'ms-band-l' }, '소리'), seg);
  };

  // ── ① 설명 ──
  function showIntro() {
    stopAll(); steps.set(0); topR.replaceChildren(); ui = {};
    stage.replaceChildren(h('div', { class: 'ms-intro' },
      h('div', { class: 'ms-art', 'data-art': 'speaker', 'aria-hidden': 'true' }),
      h('h3', {}, '낮은 음도 높은 음도 같은 크기로'),
      h('p', { class: 'ms-lead' }, `기준 소리 '라'와 다른 음을 번갈아 듣고, 같은 크기로 들리게 맞춰요. 음 ${ORDER.length}개, 2분쯤 걸려요.`),
      h('div', { class: 'ms-seq', 'aria-hidden': 'true' },
        h('span', { class: 'ms-seq-g' }, h('b', { class: 'ms-seq-n' }, solfege(REF)), h('small', {}, '기준 소리')),
        h('span', { class: 'ms-seq-arrow both' }),
        h('span', { class: 'ms-seq-g' }, h('b', { class: 'ms-seq-n' }, solfege(ORDER[0])), h('small', {}, '맞출 소리')),
        h('span', { class: 'ms-seq-eq' }, '같은 크기로')),
      instSeg(),
      h('div', { class: 'ms-actions' },
        onPress(h('button', { type: 'button', class: 'pri big ms-go' }, '귀로 맞추기 시작'), () => showEar(0)),
        onPress(h('button', { type: 'button', class: 'leaf big' }, '마이크로 재기 · 선생님'), () => showMic())),
      h('p', { class: 'ms-note' }, '한 번 맞추면 이 기기의 모든 놀이에 적용돼요.')));
  }

  // ── ② 맞추기(귀) ──
  function showEar(i) {
    stopMic(); steps.set(1);
    cur = ORDER[Math.max(0, Math.min(ORDER.length - 1, i))];
    topR.replaceChildren(onPress(h('button', { type: 'button', class: 'ms-quit' }, '처음으로'), () => showIntro()));
    const chips = ORDER.map(p => onPress(h('button', { type: 'button', class: 'ms-chip', 'data-p': String(p) },
      h('b', {}, solfege(p)), h('small', {}, letter(p) + (p === EXTRA ? ' · 참고' : ''))), () => select(p)));
    const refCard = h('div', { class: 'ms-snd' }, h('small', {}, '기준 소리'), h('b', {}, solfege(REF)), h('span', {}, letter(REF)));
    const testName = h('b'), testSub = h('span');
    const testCard = h('div', { class: 'ms-snd test' }, h('small', {}, '맞출 소리'), testName, testSub);
    const range = h('input', { type: 'range', class: 'ms-range', min: String(-DB), max: String(DB), step: '0.5', value: '0', 'aria-label': '맞출 소리 크기' });
    range.addEventListener('input', () => setGain(gOf(Number(range.value))));
    const val = h('b', { class: 'ms-val' });
    const playBtn = onPress(h('button', { type: 'button', class: 'leaf big' }), () => (loop ? stopLoop() : startLoop()));
    const nextBtn = onPress(h('button', { type: 'button', class: 'pri big ms-go' }), () => {
      const k = ORDER.indexOf(cur);
      if (k < ORDER.length - 1) select(ORDER[k + 1]); else showResult();
    });
    ui = { chips, testName, testSub, testCard, refCard, range, val, playBtn, nextBtn };
    stage.replaceChildren(h('div', { class: 'ms-ear' },
      h('div', { class: 'ms-chips', role: 'group', 'aria-label': '맞출 음' }, chips),
      h('div', { class: 'ms-ab' }, refCard, testCard),
      h('div', { class: 'ms-slide' },
        onPress(h('button', { type: 'button', 'aria-label': '작게' }, '−'), () => nudge(-1)),
        h('div', { class: 'ms-slide-mid' }, range, h('div', { class: 'ms-scale' }, h('span', {}, '작게'), val, h('span', {}, '크게'))),
        onPress(h('button', { type: 'button', 'aria-label': '크게' }, '+'), () => nudge(1))),
      h('div', { class: 'ms-actions' }, playBtn, nextBtn),
      h('p', { class: 'ms-hint' }, '두 소리가 같은 크기로 들리면 다음 음으로 가요.')));
    paintEar();
    if (!loop) startLoop(); else paintPlay();
  }
  function paintEar() {
    if (!ui.chips) return;
    const k = ORDER.indexOf(cur);
    ui.chips.forEach(c => {
      const p = Number(c.dataset.p);
      c.classList.toggle('now', p === cur); c.classList.toggle('set', touched.has(p) && p !== cur);
      c.setAttribute('aria-pressed', String(p === cur));
    });
    ui.testName.textContent = solfege(cur);
    ui.testSub.textContent = letter(cur) + (cur === EXTRA ? ' · 참고' : '');
    ui.range.value = String(Math.round(dbOf(draft[cur]) * 2) / 2);
    ui.val.textContent = fmt(draft[cur]);
    ui.nextBtn.textContent = k < ORDER.length - 1 ? '다음 음 →' : '다 했어요 →';
  }
  function paintPlay() { if (ui.playBtn) ui.playBtn.textContent = loop ? '멈추기' : '번갈아 듣기'; }
  function select(p) { cur = p; paintEar(); }
  function setGain(g) {
    draft[cur] = clampGain(g); touched.add(cur); dirty = true;
    if (method === '마이크') method = '마이크+귀';
    if (ui.val) ui.val.textContent = fmt(draft[cur]);
  }
  function nudge(dir) {
    const db = Math.max(-DB, Math.min(DB, Math.round(dbOf(draft[cur]) * 2) / 2 + dir));
    if (ui.range) ui.range.value = String(db);
    setGain(gOf(db));
  }

  // ── 소리 ──
  function ensureBus() {
    const ac = engine.ensure();
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    if (!bus) bus = engine.bus();
    return ac;
  }
  function dropBus() {
    if (!bus) return;
    const b = bus; bus = null;
    try { const now = engine.now; b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.05); } catch { /* 끊김 */ }
    setTimeout(() => { try { b.disconnect(); } catch { /* 끊김 */ } }, 120);
  }
  // 번갈아 듣기 — 오디오 시계로 0.15초 앞서 한 음씩 예약(밀대를 움직이면 다음 '맞출 소리'부터 바로 바뀜)
  function startLoop() {
    let ac;
    try { ac = ensureBus(); } catch { toast('이 기기에서는 소리를 낼 수 없어요'); return; }
    loop = { k: 0, next: ac.currentTime + 0.12, tRef: -9, tTest: -9 };
    loopTick();
    loopTimer = setInterval(loopTick, 30);
    raf = requestAnimationFrame(frame);
    paintPlay();
  }
  function loopTick() {
    const ac = engine.ctx;
    if (!loop || !ac) return;
    while (loop.next < ac.currentTime + 0.15) {
      const test = loop.k % 2 === 1, p = test ? cur : REF;
      engine.note(inst, p, loop.next, NOTE, VEL * (test ? draft[cur] : 1), bus);
      if (test) loop.tTest = loop.next; else loop.tRef = loop.next;
      loop.next += test ? STEP + PAIR_GAP : STEP;
      loop.k++;
    }
  }
  function frame() {
    if (!loop || !engine.ctx) return;
    const now = engine.ctx.currentTime;
    if (ui.refCard) {
      ui.refCard.classList.toggle('on', now >= loop.tRef && now < loop.tRef + NOTE);
      ui.testCard.classList.toggle('on', now >= loop.tTest && now < loop.tTest + NOTE);
    }
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    clearInterval(loopTimer); loopTimer = 0;
    cancelAnimationFrame(raf); raf = 0;
    loop = null;
    if (ui.refCard) { ui.refCard.classList.remove('on'); ui.testCard.classList.remove('on'); }
    paintPlay();
    dropBus();
  }
  function stopAll() { stopLoop(); stopMic(); }

  // ── ③ 결과 ── 음높이마다 맞춘 크기(가운데 줄 = 그대로 · 위 = 크게 · 아래 = 작게) · 저장
  function showResult(msg) {
    stopAll(); steps.set(2); topR.replaceChildren(); ui = {};
    const any = touched.size > 0, s = device.speaker;
    const verdict = msg || (dirty ? (any ? '다 맞췄어요!' : '모두 그대로예요') : s && s.gains ? '이 기기는 맞춰져 있어요' : '아직 맞추지 않았어요');
    const line = dirty || msg ? '저장하면 이 기기의 모든 놀이에 이 크기가 적용돼요.'
      : s && s.gains ? `${dayText(s.at)}에 ${s.method || '귀'}로 맞췄어요.` : '설명부터 시작해 볼까요?';
    const cols = CHART.map(p => {
      const g = draft[p], db = dbOf(g), on = touched.has(p);
      const bar = h('i', { class: db >= 0 ? 'up' : 'down', style: { height: `${(Math.min(DB, Math.abs(db)) / DB * 50).toFixed(1)}%` } });
      return h('div', { class: 'ms-col' + (on ? '' : ' off') },
        h('span', { class: 'ms-col-v' }, on ? fmt(g) : '그대로'),
        h('div', { class: 'ms-col-track' }, bar),
        h('b', {}, solfege(p)), h('small', {}, letter(p) + (p === EXTRA ? ' · 참고' : '')));
    });
    const saveBtn = onPress(h('button', { type: 'button', class: 'pri big ms-go' }, '저장'), () => {
      const gains = draftGains();
      device.speaker = Object.keys(gains).length ? { gains, at: new Date().toISOString(), method, inst } : null;
      refreshEq(); dirty = false;
      toast('저장했어요');
      showResult('저장했어요!');
    });
    stage.replaceChildren(h('div', { class: 'ms-result ms-spk-result' },
      h('h3', { class: 'ms-verdict' }, verdict),
      h('p', { class: 'ms-lead' }, line),
      h('div', { class: 'ms-chart', role: 'img', 'aria-label': '음높이마다 맞춘 크기' }, cols),
      h('div', { class: 'ms-actions' },
        dirty ? saveBtn : null,
        any ? onPress(h('button', { type: 'button', class: 'leaf big' }, '고친 대로 들어 보기'), () => preview()) : null,
        onPress(h('button', { type: 'button', class: dirty || any ? 'big' : 'pri big' }, any ? '다시 맞추기' : '맞추기 시작'), () => (any ? showEar(0) : showIntro()))),
      h('div', { class: 'ms-foot' }, instSeg(),
        any || (s && s.gains) ? onPress(h('button', { type: 'button', class: 'ms-quit' }, '맞춤 지우기'), () => reset()) : null)));
  }

  // 고친 대로 들어 보기 — 도에서 아주 높은 도까지(낮은 도를 맞췄으면 거기서부터)
  function preview() {
    stopAll();
    let ac;
    try { ac = ensureBus(); } catch { return; }
    const gains = draftGains(), ps = [...(touched.has(EXTRA) ? [48, 55] : []), 60, 64, 67, 72, 76, 79, 84];
    const t0 = ac.currentTime + 0.08;
    ps.forEach((p, i) => engine.note(inst, p, t0 + i * 0.34, 0.3, VEL * gainAt(gains, p), bus));
  }
  function draftGains() {
    const g = {};
    for (const p of ORDER) if (touched.has(p)) g[p] = Math.round(draft[p] * 1000) / 1000;
    if (Object.keys(g).length) g[REF] = 1;
    return g;
  }
  function reset() {
    stopAll();
    device.speaker = null; refreshEq();
    for (const p of ORDER) draft[p] = 1;
    touched.clear(); method = '귀'; dirty = false;
    toast('맞춤을 지웠어요');
    showIntro();
  }

  // ── ② 맞추기(마이크) ──
  //  음마다 '스피커에서 나온 크기(마이크) ÷ 보낸 크기(디지털)'를 잰다 → 라4 와 견준 비율의 제곱근이 맞출 배수.
  //  같은 음을 두 바퀴 틀고, 처음 0.8초 조용할 때의 잡음 크기를 뺀다. 압축기 · 울림을 거치지 않는 길로 튼다(재는 값이 흔들리지 않게).
  const buf = new Float32Array(2048);
  const meanSq = an => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return s / buf.length; };

  function showMic() {
    stopLoop(); steps.set(1);
    topR.replaceChildren(onPress(h('button', { type: 'button', class: 'ms-quit' }, '처음으로'), () => showIntro()));
    const level = h('i'), status = h('p', { class: 'ms-lead', role: 'status', 'aria-live': 'polite' }, '조용한 곳에서, 기기를 책상에 두고 재요.');
    const prog = h('span', { class: 'ms-seq-dots' }, Array.from({ length: (ORDER.length + 1) * ROUNDS }, () => h('i', { class: 'tap' })));
    const btn = onPress(h('button', { type: 'button', class: 'pri big ms-go' }, '재기 시작'), () => (mic ? (stopMic(), status.textContent = '멈췄어요.', btn.textContent = '재기 시작') : startMic()));
    ui = { level, status, btn, prog };
    stage.replaceChildren(h('div', { class: 'ms-intro ms-mic' },
      h('h3', {}, '마이크로 재기'),
      h('p', { class: 'ms-lead' }, '같은 음들을 틀고 마이크로 크기를 재서, 맞출 값을 알려 줘요. 15초쯤 걸려요.'),
      h('p', { class: 'ms-privacy' }, '소리는 이 기기 안에서 크기만 재요. 녹음하거나 저장하거나 보내지 않아요.'),
      h('div', { class: 'ms-level', 'aria-hidden': 'true' }, level),
      prog, btn, status));
  }
  async function startMic() {
    const say = t => { if (ui.status) ui.status.textContent = t; };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('이 브라우저에서는 마이크를 쓸 수 없어요. 귀로 맞춰 주세요.'); return; }
    let ac;
    try { ac = engine.ensure(); if (ac.state !== 'running') await ac.resume(); } catch { say('소리를 켜지 못했어요.'); return; }
    ui.btn.disabled = true; say('마이크를 켜는 중이에요. 허락 창이 뜨면 허락해 주세요.');
    let stream, timer = 0;
    try {
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }),
        new Promise((_, no) => { timer = setTimeout(() => no(new Error('wait')), MIC_WAIT); })]);
    } catch (e) {
      clearTimeout(timer);
      if (ui.btn) ui.btn.disabled = false;
      say(e && e.message === 'wait' ? '마이크가 대답하지 않아요. 귀로 맞춰 주세요.' : '마이크를 켜지 못했어요. 주소창 옆에서 마이크를 허락해 주세요.');
      return;
    }
    clearTimeout(timer);
    if (!alive || !ui.btn) { stream.getTracks().forEach(t => t.stop()); return; }
    ui.btn.disabled = false;
    try {
      const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(), dig = ac.createAnalyser(), direct = ac.createGain();
      an.fftSize = dig.fftSize = 2048;
      src.connect(an); direct.connect(ac.destination); direct.connect(dig);
      const t0 = ac.currentTime + 0.3, wins = [{ p: null, a: t0, b: t0 + 0.8, m: 0, d: 0, n: 0 }];
      let t = t0 + 1.0;
      for (let r = 0; r < ROUNDS; r++) for (const p of [REF, ...ORDER]) {
        engine.note(inst, p, t, 0.45, MVEL, direct);
        wins.push({ p, a: t, b: t + MSTEP - 0.02, m: 0, d: 0, n: 0 });
        t += MSTEP;
      }
      mic = { stream, src, an, dig, direct, wins, wi: 0, timer: 0, raf: 0 };
      ui.btn.textContent = '멈추기';
      mic.timer = setInterval(micTick, 20);
      mic.raf = requestAnimationFrame(micFrame);
    } catch (e) {
      stream.getTracks().forEach(tr => tr.stop());
      say('이 기기에서는 마이크로 잴 수 없어요. 귀로 맞춰 주세요.');
      console.warn('마이크 재기 실패', e);
    }
  }
  function micTick() {
    const ac = engine.ctx;
    if (!mic || !ac) return;
    const now = ac.currentTime, wins = mic.wins;
    while (mic.wi < wins.length && now > wins[mic.wi].b) {
      if (mic.wi > 0 && ui.prog) ui.prog.children[mic.wi - 1].classList.add('on');
      mic.wi++;
    }
    if (mic.wi >= wins.length) { micFinish(); return; }
    const w = wins[mic.wi];
    if (now < w.a) return;
    w.m += meanSq(mic.an); w.d += meanSq(mic.dig); w.n++;
    const txt = w.p == null ? '조용히 기다려요(잡음 재기)…' : `재는 중 · ${solfege(w.p)}`;
    if (ui.status && ui.status.textContent !== txt) ui.status.textContent = txt;
  }
  function micFrame() {
    if (!mic) return;
    const rms = Math.sqrt(meanSq(mic.an));
    if (ui.level) ui.level.style.transform = `scaleX(${Math.min(1, rms * 6).toFixed(3)})`;
    mic.raf = requestAnimationFrame(micFrame);
  }
  function micFinish() {
    const wins = mic.wins, noise = wins[0].n ? wins[0].m / wins[0].n : 0;
    const sum = {};
    for (const w of wins.slice(1)) { const s = sum[w.p] || (sum[w.p] = { m: 0, d: 0, n: 0 }); s.m += w.m; s.d += w.d; s.n += w.n; }
    const ratio = p => { const s = sum[p]; if (!s || !s.n) return null; const m = s.m / s.n - noise, d = s.d / s.n; return { r: d > 0 ? Math.max(0, m) / d : 0, weak: m < noise || m <= 1e-9 }; };
    const ref = ratio(REF);
    stopMic();
    if (!ref || ref.weak || !ref.r) {
      if (ui.status) ui.status.textContent = '소리가 마이크에 잘 안 들어왔어요. 소리를 키우고 다시 재 봐요.';
      if (ui.btn) ui.btn.textContent = '다시 재기';
      return;
    }
    let weak = 0;
    for (const p of ORDER) {
      const q = ratio(p);
      if (!q || q.weak || !q.r) weak++;
      draft[p] = Math.round((!q || q.weak || !q.r ? GAIN_MAX : clampGain(Math.sqrt(ref.r / q.r))) * 100) / 100;
      touched.add(p);
    }
    method = '마이크'; dirty = true;
    showResult(weak ? `마이크가 제안한 값이에요(잘 안 들린 음 ${weak}개)` : '마이크가 제안한 값이에요');
  }
  function stopMic() {
    if (!mic) return;
    clearInterval(mic.timer); cancelAnimationFrame(mic.raf);
    try { mic.stream.getTracks().forEach(t => t.stop()); } catch { /* 이미 멈춤 */ }
    for (const n of [mic.src, mic.an, mic.dig, mic.direct]) { try { n.disconnect(); } catch { /* 끊김 */ } }
    mic = null;
    if (ui.level) ui.level.style.transform = 'scaleX(0)';
  }

  if (saved && saved.gains) showResult(); else showIntro();

  return () => {
    alive = false;
    stopAll();
    dropBus();
    engine.pitchGain = pitchGain;            // 저장된 맞춤 다시 켜기
  };
}
