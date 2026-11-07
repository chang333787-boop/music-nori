// 징검다리 박 놀이 — 리1 일정박 확인 게임(11-07 처음 보는 눈 평가로 다시 짬)
//  · 시작 전: 가운데 카드 하나(무엇을 하는지 · 단계) + 아래 '시작' 하나
//  · 노는 중: 신호(다음 돌의 줄어드는 고리) · 판정 말 · 고슴도치를 한 자리에 · 아래 '톡!'은 '시작' 자리 그대로 · 멈춤은 무대 오른쪽 위
//  · 끝: 고슴도치가 건너편 둑에 닿은 뒤 결과 카드(몇 번 중 몇 번 · 돌 줄 다시 보기 · 기준 있는 별 · 사실 한 줄)
//  준비 박 넷 → 연습 박 둘(채점 X · 돌은 저절로 놓임) → 채점 박 24(4개씩 묶음 = 마디). 놓쳐도 음악은 끝까지 흐른다.
//  판정 창 = engine/judge.js BANDS · 기기 지연은 지연 맞추기 값 · 소리가 들린 때는 clock.js audioToPerf
import { h, onPress, lsGet, lsSet } from '../util.js';
import { friendImg, setPose, preload, IMG_DIR } from '../band.js';
import { audioToPerf } from '../clock.js';
import { windows, judgeTaps, BANDS, STAR_RULES } from '../../../engine/judge.js';
import { saveStars } from '../cellkit.js';

const TEMPI = { low: [100, 110, 120], mid: [84, 100, 116], high: [76, 96, 120] };
const STEPS = [
  { name: '박 점을 보며', speed: 1, helper: true },
  { name: '박 점 없이', speed: 1, helper: false },
  { name: '조금 빠르게', speed: 2, helper: true },
  { name: '빠르게, 박 점 없이', speed: 2, helper: false },
];
const COUNT = 4, WARM = 2, SCORED = 24, BEATS = WARM + SCORED;
// 세상(가로로 긴 강) 크기 — 화면은 고슴도치를 따라 옮겨 간다
const SP = 92, GROUP_GAP = 34, BANK_L = 230, BANK_R = 260, WARM_X = 300;
const stoneWX = i => (i < WARM ? WARM_X + i * SP : WARM_X + WARM * SP + GROUP_GAP + (i - WARM) * SP + Math.floor((i - WARM) / 4) * GROUP_GAP);
const WORLD_W = stoneWX(BEATS - 1) + 90 + BANK_R;
const STAR = on => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1.4-9 8.2 2.6 11.9L20 29.6 9.4 35.5 12 23.6 3 15.4 15 14z" fill="${on ? '#E0A100' : '#FFFFFF'}" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/></svg>`;

export default function mount(root, ctx) {
  const { engine, device, bar } = ctx;
  const band = BANDS[device.band] ? device.band : 'mid';
  const best = lsGet('tap.best', {});
  let step = Math.min(4, Math.max(1, Number(lsGet('tap.step', 1)) || 1));
  let mode = 'ready', run = null, raf = 0, oopsAt = -9;
  preload(['jump', 'oops', 'happy', 'idle'].map(p => ['hog', p]));
  const stoneImg = new Image(); stoneImg.src = IMG_DIR + 'stone.webp';

  // ── 그릇 ──
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const hogPic = friendImg('hog', 'idle', { label: false });
  const hogBox = h('div', { class: 'hogpos' }, hogPic);
  const pauseBtn = h('button', { type: 'button', class: 'icon-btn pausebtn', 'aria-label': '멈추기', hidden: true,
    html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>' });
  const overlay = h('div', { class: 'overlay clear' });
  const river = h('div', { class: 'river', role: 'application', 'aria-label': '징검다리 — 박에 맞춰 두드리기' }, canvas, hogBox, pauseBtn, overlay);
  const tapbar = h('div', { class: 'tapbar' });
  root.append(h('div', { class: 'tapgame' }, river, tapbar));

  const stepsUI = () => h('span', { class: 'steps', 'aria-label': `${step}단계` },
    ...[1, 2, 3, 4].map(s => h('span', { class: 'd' + (best[s] >= 1 ? ' done' : '') + (s === step ? ' now' : '') })),
    h('span', { class: 'lab' }, `${step}단계`));

  // ── 그리기 상태 ──
  const g = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, camX = 0, hogWX = BANK_L - 70, hogFromX = hogWX, hogToX = hogWX, hopAt = -9, hopDur = 0.22;
  const resetHog = () => { camX = 0; hogWX = hogFromX = hogToX = BANK_L - 70; hopAt = -9; };
  function hopTo(x, dur = 0.22) { hogFromX = hogWX; hogToX = x; hopAt = engine.ctx ? engine.ctx.currentTime : 0; hopDur = dur; if (mode === 'play') setPose(hogPic, 'hog', 'jump'); }

  // ── 화면 상태 ──
  function showReady() {
    stopAudio();
    mode = 'ready'; run = null;
    bar.mid(stepsUI());
    pauseBtn.hidden = true;
    setPose(hogPic, 'hog', 'idle');
    resetHog();
    const st = STEPS[step - 1];
    const stepBtns = h('span', { class: 'stepbtns', role: 'group', 'aria-label': '단계 고르기' },
      ...[1, 2, 3, 4].map(s => h('button', { type: 'button', 'aria-pressed': String(s === step), 'aria-label': `${s}단계 · ${STEPS[s - 1].name}`,
        onclick: () => { step = s; lsSet('tap.step', s); showReady(); } }, String(s))));
    overlay.className = 'overlay clear';
    overlay.replaceChildren(h('div', { class: 'panelcard startcard' },
      h('h2', {}, '박에 맞춰 톡!'),
      h('p', { class: 'sub' }, '넷 세고, 박마다 톡! 하면 돌이 놓여요'),
      h('div', { class: 'row' }, stepBtns, h('span', { style: { fontFamily: 'var(--head)', fontSize: '24px' } }, st.name))));
    overlay.hidden = false;
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, start);
    tapbar.replaceChildren(go);
  }
  function showPlaying() {
    mode = 'play';
    overlay.hidden = true;
    pauseBtn.hidden = false;
    const tapBtn = h('button', { type: 'button', class: 'go huge', 'aria-label': '톡 — 두드리기' }, '톡!');
    onPress(tapBtn, e => tap(e));
    tapbar.replaceChildren(tapBtn, h('span', { class: 'key' }, h('span', { class: 'kbd' }, '스페이스'), ' 키도 돼요'));
  }
  function showPaused() {
    stopAudio();
    mode = 'paused'; run = null;
    pauseBtn.hidden = true;
    overlay.className = 'overlay';
    const again = h('button', { type: 'button', class: 'go' }, '처음부터 다시');
    const pick = h('button', { type: 'button' }, '단계 고르기');
    onPress(again, start); onPress(pick, showReady);
    overlay.replaceChildren(h('div', { class: 'panelcard startcard' }, h('h2', {}, '멈췄어요'), h('div', { class: 'row' }, pick, again)));
    overlay.hidden = false;
    tapbar.replaceChildren();
  }
  function showResult(r, st) {
    mode = 'done';
    pauseBtn.hidden = true;
    // 돌 줄 다시 보기 — 가장 길게 이어진 구간에 밑줄
    let runStart = 0, runLen = 0, bs = -1, bl = 0;
    for (let i = WARM; i < BEATS; i++) {
      if (st[i] === 'miss') { runLen = 0; continue; }
      if (runLen === 0) runStart = i;
      runLen++;
      if (runLen > bl) { bl = runLen; bs = runStart; }
    }
    const replay = h('div', { class: 'replay', 'aria-label': '돌 줄 다시 보기' });
    for (let i = WARM; i < BEATS; i++) {
      if (i > WARM && (i - WARM) % 4 === 0) replay.append(h('span', { class: 'gap' }));
      const c = st[i] === 'great' ? 'g' : st[i] === 'miss' ? 'm' : '';
      replay.append(h('i', { class: (c + (bs >= 0 && i >= bs && i < bs + bl ? ' run' : '')).trim() }));
    }
    const misses = [];
    for (let i = WARM; i < BEATS; i++) if (st[i] === 'miss') misses.push(i - WARM + 1);
    const hits = r.offs.filter((o, i) => o != null && i >= WARM);
    const mean = hits.length ? hits.reduce((a, b) => a + b, 0) / hits.length : 0;
    let tip = '';
    if (misses.length) tip = `놓친 박: ${misses.slice(0, 4).map(n => n + '째').join(', ')}${misses.length > 4 ? ` 외 ${misses.length - 4}번` : ''}.`;
    if (hits.length >= 4) tip += (tip ? ' ' : '') + (mean < -35 ? '박보다 조금 먼저 누르는 편이에요. 소리를 듣고 눌러요.' : mean > 35 ? '박보다 조금 늦게 누르는 편이에요. 다음 박을 미리 느껴 봐요.' : '박과 거의 같은 때에 눌렀어요.');
    if (!hits.length) tip = '톡!을 박마다 한 번씩 눌러요. 화면 아무 곳이나 눌러도 돼요.';
    if (r.stars > (best[step] || 0)) { best[step] = r.stars; lsSet('tap.best', best); }
    saveStars('ri1', r.stars);                  // 마을 지도 '일정박' 칸 별
    bar.mid(stepsUI());
    overlay.className = 'overlay';
    overlay.replaceChildren(h('div', { class: 'panelcard resultcard', role: 'dialog', 'aria-label': '결과' },
      h('h2', {}, `${r.total}번 중 ${r.kept}번 맞았어요`),
      replay,
      h('div', { class: 'facts' }, `가장 길게 이어서 ${r.streak}번`, h('br'), `딱 맞은 박 ${r.great}번`),
      h('div', { class: 'stars' }, ...STAR_RULES.map((t, k) => h('div', { class: 'star' + (r.starOn[k] ? ' on' : ''), html: STAR(r.starOn[k]) + `<span>${t}</span>` }))),
      tip ? h('div', { class: 'tip' }, tip) : null));
    overlay.hidden = false;
    const again = h('button', { type: 'button' }, '다시');
    onPress(again, start);
    if (step < 4) {
      const next = h('button', { type: 'button', class: 'go huge' }, '다음 단계');
      onPress(next, () => { step++; lsSet('tap.step', step); showReady(); });
      tapbar.replaceChildren(again, next);
    } else {
      tapbar.replaceChildren(again, h('a', { class: 'btn go huge', href: '#/' }, '처음 화면'));
    }
    window.__tapResult = { ...r, mean: Math.round(mean), band, step };
  }

  // ── 한 판 ──
  function start() {
    const ac = engine.ensure();
    stopAudio();
    const st = STEPS[step - 1], bpm = TEMPI[band][st.speed], beat = 60 / bpm;
    const bus = engine.bus();
    const t0 = ac.currentTime + 0.4;
    for (let i = 0; i < COUNT; i++) engine.click(t0 + i * beat, i === 0, bus);
    const bass = [48, 53, 55, 48, 53, 55, 48];
    for (let i = 0; i < BEATS; i++) {
      const t = t0 + (COUNT + i) * beat, k = i - WARM, down = k >= 0 ? k % 4 === 0 : i === 0;
      engine.drum(down ? 'kick' : 'hat', t, down ? 0.75 : 0.45, bus);
      if (k >= 0 && k % 4 === 0) engine.note('marimba', bass[(k / 4) % bass.length], t, beat * 1.8, 0.5, bus);
      if (k >= 0 && k % 4 === 2) engine.note('marimba', bass[Math.floor(k / 4) % bass.length] + 16, t, beat * 0.9, 0.32, bus);
    }
    engine.note('marimba', 72, t0 + (COUNT + BEATS) * beat, beat * 2, 0.6, bus);   // 마무리 소리
    run = {
      t0, beat, bpm, bus, helper: st.helper, win: windows(band, beat * 1000), lat: device.latencyMs,
      outLat: ac.outputLatency || ac.baseLatency || 0, end: t0 + (COUNT + BEATS) * beat + 0.3,
      state: new Array(BEATS).fill(null), at: new Array(BEATS).fill(-9), taps: [], ac,
    };
    // 자동 시험이 읽는 값(박이 들리는 화면 시각 ms) — 화면에는 쓰지 않음
    window.__tapPlan = { beats: () => Array.from({ length: BEATS }, (_, i) => audioToPerf(ac, t0 + (COUNT + i) * beat)), skip: WARM, band };
    resetHog();
    setPose(hogPic, 'hog', 'idle');
    showPlaying();
  }
  function stopAudio() {
    if (!run || !run.bus) return;
    const b = run.bus, now = engine.ctx.currentTime;
    run.bus = null;
    try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.06); } catch { /* */ }
    setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, 300);
  }
  function tap(e) {
    // 손맛: 판정과 상관없이 그 순간 소리(50ms 안)
    engine.drum('deok', engine.ensure().currentTime, 0.7);
    if (mode !== 'play' || !run) return;
    const ms = e && e.timeStamp ? e.timeStamp : performance.now();
    run.taps.push(ms);
    const adj = ms - run.lat;
    let bi = -1, bestAbs = Infinity;
    for (let i = 0; i < BEATS; i++) {
      if (run.state[i]) continue;
      const d = adj - audioToPerf(run.ac, run.t0 + (COUNT + i) * run.beat);
      if (d < -run.win.early || d > run.win.late) continue;
      if (Math.abs(d) < bestAbs) { bi = i; bestAbs = Math.abs(d); }
    }
    if (bi < 0) return;
    run.state[bi] = bi < WARM ? 'warm' : bestAbs <= run.win.great ? 'great' : 'ok';
    run.at[bi] = run.ac.currentTime - run.outLat;
    hopTo(stoneWX(bi));
  }
  function finish() {
    const ac = run.ac, st = run.state.slice();
    const expected = Array.from({ length: BEATS }, (_, i) => audioToPerf(ac, run.t0 + (COUNT + i) * run.beat));
    const r = judgeTaps(expected, run.taps, { band, latency: run.lat, skip: WARM, minIOI: run.beat * 1000 });
    mode = 'arrive';
    pauseBtn.hidden = true;
    tapbar.replaceChildren();
    hopTo(WORLD_W - BANK_R + 70, 0.7);
    setPose(hogPic, 'hog', 'happy');
    setTimeout(() => { if (mode === 'arrive') showResult(r, st); }, 1300);
  }

  // ── 그리기 ──
  const fit = () => {
    const r = river.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width - 6); H = Math.max(1, r.height - 6);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(river);
  const skyH = () => H * 0.30, pathY = () => H * 0.60, rx = 34, ry = 19;

  function drawStone(x, y, kind) {
    if (kind !== 'outline') {
      if (stoneImg.complete && stoneImg.naturalWidth) {
        const w = rx * 2.3, hh = w * stoneImg.naturalHeight / stoneImg.naturalWidth;
        g.drawImage(stoneImg, x - w / 2, y - hh * 0.55, w, hh);
      } else {
        g.fillStyle = '#A9A39A'; g.strokeStyle = '#3B2A1E'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#C9C3B8'; g.beginPath(); g.ellipse(x - 4, y - 5, rx * 0.62, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
      }
    } else {
      g.setLineDash([8, 7]); g.strokeStyle = 'rgba(59,42,30,.45)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
    if (kind === 'great') { g.strokeStyle = '#E0A100'; g.lineWidth = 5; g.beginPath(); g.ellipse(x, y, rx + 6, ry + 5, 0, 0, Math.PI * 2); g.stroke(); }
  }
  function draw(now) {
    const sky = skyH(), py = pathY();
    g.clearRect(0, 0, W, H);
    // 하늘 · 먼 언덕(느리게 지나감) · 물
    g.fillStyle = '#F4EBD3'; g.fillRect(0, 0, W, sky);
    g.fillStyle = '#B9D3A0'; g.strokeStyle = '#3B2A1E'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, sky);
    for (let x = 0; x <= W + 40; x += 40) { const wx = x + camX * 0.3; g.lineTo(x, sky - 26 - Math.sin(wx / 160) * 18 - Math.sin(wx / 63) * 6); }
    g.lineTo(W, sky); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#7FB7DA'; g.fillRect(0, sky, W, H - sky);
    g.beginPath(); g.moveTo(0, sky); g.lineTo(W, sky); g.stroke();
    // 짧은 물결
    g.strokeStyle = '#B6D8EC'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 30; k++) {
      const wx = (k * 157) % (WORLD_W + 400) - 200, x = wx - camX, y = sky + 26 + ((k * 61) % Math.max(1, H - sky - 44));
      if (x < -30 || x > W + 30 || Math.abs(y - py) < 40) continue;
      g.beginPath(); g.moveTo(x - 12, y); g.quadraticCurveTo(x - 6, y - 5, x, y); g.quadraticCurveTo(x + 6, y + 5, x + 12, y); g.stroke();
    }
    // 둑(왼쪽 · 오른쪽) — 풀 가장자리 + 잉크 외곽선
    const bank = (x0, x1) => {
      const top = py - 30;
      g.fillStyle = '#C99A5B'; g.strokeStyle = '#3B2A1E'; g.lineWidth = 3;
      g.beginPath(); g.rect(x0, top, x1 - x0, H - top + 4); g.fill(); g.stroke();
      g.fillStyle = '#5E9B4F'; g.beginPath(); g.rect(x0, top - 4, x1 - x0, 22); g.fill(); g.stroke();
    };
    bank(-10 - camX, BANK_L - camX);
    bank(WORLD_W - BANK_R - camX, WORLD_W + 10 - camX);
    // 도착 깃발
    const fx = WORLD_W - BANK_R + 150 - camX;
    if (fx > -40 && fx < W + 80) {
      g.strokeStyle = '#3B2A1E'; g.lineWidth = 4; g.beginPath(); g.moveTo(fx, py - 34); g.lineTo(fx, py - 150); g.stroke();
      g.fillStyle = '#C4511A'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, py - 150); g.lineTo(fx + 56, py - 132); g.lineTo(fx, py - 114); g.closePath(); g.fill(); g.stroke();
    }
    // 돌 자리 · 놓인 돌 · 물 튀김
    for (let i = 0; i < BEATS; i++) {
      const x = stoneWX(i) - camX;
      if (x < -60 || x > W + 60) continue;
      const s = run ? run.state[i] : null;
      if (s === 'great' || s === 'ok' || s === 'warm') drawStone(x, py, s === 'great' ? 'great' : 'stone');
      else if (s === 'miss') {
        const age = Math.max(0, Math.min(1, (now - run.at[i]) / 0.5));
        g.strokeStyle = `rgba(255,255,255,${1 - age})`; g.lineWidth = 4;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 10, py - 4); g.lineTo(x + k * (16 + age * 14), py - 18 - age * 16); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x, py + 4, 16 + age * 20, 6 + age * 6, 0, 0, Math.PI * 2); g.stroke();
      } else drawStone(x, py, 'outline');
    }
    if (run && mode === 'play') {
      const beatS = run.beat;
      if (run.helper) {
        // 박 점(돌 밑, 4개씩 묶음)
        for (let i = 0; i < BEATS; i++) {
          const x = stoneWX(i) - camX;
          if (x < -30 || x > W + 30) continue;
          const t = run.t0 + (COUNT + i) * beatS, d = now - t;
          const near = Math.max(0, 1 - Math.abs(d) / (beatS * 0.45));
          g.fillStyle = i < WARM ? '#FFFFFF' : d > beatS * 0.45 ? 'rgba(59,42,30,.25)' : '#3B2A1E';
          g.beginPath(); g.arc(x, py + 48, 9 + near * 7, 0, Math.PI * 2); g.fill();
          if (near > 0) { g.strokeStyle = '#C4511A'; g.lineWidth = 4; g.beginPath(); g.arc(x, py + 48, 16 + near * 6, 0, Math.PI * 2); g.stroke(); }
        }
        // 다음 돌의 줄어드는 고리 — 한 박 앞에서 두 배 → 박에 맞춰 닫힘
        for (let i = 0; i < BEATS; i++) {
          if (run.state[i]) continue;
          const t = run.t0 + (COUNT + i) * beatS, left = (t - now) / beatS;
          if (left > 1 || left < -0.15) continue;
          const k = 1 + Math.max(0, left), x = stoneWX(i) - camX;
          g.strokeStyle = '#C4511A'; g.lineWidth = 5;
          g.beginPath(); g.ellipse(x, py, rx * k + 4, ry * k + 4, 0, 0, Math.PI * 2); g.stroke();
          break;
        }
      }
      // 준비 박 숫자
      const ci = Math.floor((now - run.t0) / beatS);
      if (ci >= 0 && ci < COUNT) {
        const ph = (now - run.t0) / beatS - ci;
        g.fillStyle = '#3B2A1E'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `${Math.round(96 * (1.12 - ph * 0.12))}px Jua, "Noto Sans KR", sans-serif`;
        g.fillText(String(ci + 1), W / 2, sky * 0.62);
      }
      // 판정 말 — 고슴도치 머리 위(놓친 박은 그 돌 자리), 0.45초 떠올랐다 사라짐
      for (let i = 0; i < BEATS; i++) {
        const s = run.state[i];
        if (!(s === 'great' || s === 'ok' || s === 'miss')) continue;
        const age = now - run.at[i];
        if (age < 0 || age > 0.45) continue;
        const word = s === 'great' ? '딱!' : s === 'ok' ? '좋아' : '삐끗';
        g.globalAlpha = 1 - age / 0.45;
        g.font = '36px Jua, "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 7; g.strokeStyle = '#FFFFFF'; g.lineJoin = 'round';
        const x = (s === 'miss' ? stoneWX(i) : hogWX) - camX, y = py - Math.min(170, H * 0.36) - 20 - age * 50;
        g.strokeText(word, x, y);
        g.fillStyle = s === 'great' ? '#9A6E00' : s === 'ok' ? '#2F6F4E' : '#6B5A4A';
        g.fillText(word, x, y);
        g.globalAlpha = 1;
      }
    }
  }
  function loop() {
    const ac = engine.ctx;
    const tNow = ac ? ac.currentTime : 0;
    const now = tNow - (run ? run.outLat : 0);             // 지금 '들리는' 오디오 시각 — 그림은 소리에 맞춘다
    if (run && mode === 'play') {
      // 창이 지나도록 두드림이 없던 박 = 놓침(연습 박은 저절로 돌이 놓임)
      const lateS = (run.win.late + run.lat) / 1000;
      for (let i = 0; i < BEATS; i++) {
        if (run.state[i]) continue;
        const t = run.t0 + (COUNT + i) * run.beat;
        if (now > t + lateS) {
          run.at[i] = now;
          if (i < WARM) { run.state[i] = 'warm'; hopTo(stoneWX(i)); }
          else { run.state[i] = 'miss'; setPose(hogPic, 'hog', 'oops'); oopsAt = tNow; }
        }
      }
      if (now > run.end) finish();
    }
    // 고슴도치: 뛰기(호) · 박마다 끄덕 · 삐끗 뒤 0.4초면 다시 서기
    const hp = Math.min(1, (tNow - hopAt) / hopDur);
    hogWX = hogFromX + (hogToX - hogFromX) * hp;
    if (hp >= 1 && mode === 'play' && tNow - oopsAt > 0.4) setPose(hogPic, 'hog', 'idle');
    camX = Math.max(0, Math.min(WORLD_W - W, hogWX - W * 0.32));
    let nod = 0;
    if (run && mode === 'play' && now > run.t0) { const ph = ((now - run.t0) / run.beat) % 1; nod = ph < 0.18 ? 1 - ph / 0.18 : 0; }
    const lift = hp < 1 ? Math.sin(hp * Math.PI) * 46 : 0;
    const size = Math.min(170, H * 0.36);
    hogBox.style.width = size + 'px'; hogBox.style.height = size + 'px';
    hogBox.style.transform = `translate(${(hogWX - camX - size / 2 + 3).toFixed(1)}px, ${(pathY() - size * 0.93 - lift + 3).toFixed(1)}px) scaleY(${(1 - nod * 0.05).toFixed(3)})`;
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  // ── 입력 ──
  river.addEventListener('pointerdown', e => {
    if (e.button > 0 || mode !== 'play' || e.target.closest('button')) return;
    e.preventDefault(); tap(e);
  });
  onPress(pauseBtn, () => { if (mode === 'play') showPaused(); });
  const onKey = e => {
    if (e.repeat || e.defaultPrevented) return;
    if (e.key === 'Escape' && mode === 'play') { showPaused(); return; }
    if (e.target.closest && e.target.closest('button,a')) return;
    if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyF') { e.preventDefault(); if (mode === 'play') tap(e); }
  };
  window.addEventListener('keydown', onKey);
  fit();
  showReady();
  raf = requestAnimationFrame(loop);

  return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey); stopAudio(); run = null; mode = 'gone'; };
}
