// 리5 마디·박자표 — 박을 몇 개씩 묶는지가 박자다(2/4 = 센·여 · 3/4 = 센·여·여 · 4/4 = 센·여·중·여)
//  빠르기와 헷갈리지 않게: 보기 · 확인 게임 앞 판은 같은 빠르기로 2박 · 3박을 짝 지어 들려주고, 비틀기에서 빠른 왈츠 · 느린 행진
//  보기: 예시 넷(행진 2/4 · 왈츠 3/4 · 4/4 · 빠르기는 그대로 묶음만 다른 짝) — 박 점(센박 = 큰 점) · 세로줄 · 박자표가 소리와 함께
//  연습: 반주를 듣고 '두 박씩' / '세 박씩' — 고르면 점들이 묶이며 박자표가 나온다 · 세 번 이어서 맞히면 지남
//  확인 게임: 고르기 8판(소개 같은 빠르기 → 발전 → 비틀기 빠르기 바꿈) → 마무리: 센박에만 톡(2/4 네 마디 → 3/4 네 마디)
//  곡: engine/songs/index.js 대장의 ri5-march · ri5-waltz(가락만)
//  11-07 평가 2차: 박 세기 숫자 · 맞음/틀림은 말풍선(ui.tell) · 박자표 설명은 박자표 옆 · 번호는 ui.count(1/16 = 고르기 8 + 센박 마디 8)
//   고르기 답은 kit.answers(오른쪽 세로 한 줄) · 확인 게임 지시 "① 고르고 ② 센박에만 톡" · '마디줄' → 교과서 말 '세로줄' · '지금' 점 = 잉크 고리
//  11-07 평가 3차: 반주는 한 마디씩 0.3초 앞에만 예약(예전 4마디 덩어리 → 동시 소리 노드 523개) · 듣는 동안 답 단추는 busy(70% · '잘 들어요')
//   고슴도치는 박 판 안 왼쪽 · 예시 카드는 박자표 그림 하나만(‘2/4’ 글자 X) · 마디 그림 끝은 끝세로줄 · 준비 박 숫자는 판 가운데 · 고르는 동안 아래 띠 '다시 듣기'
import { judgeEcho, classifyTap, strongPattern, newBus, killBus, heardNow, perfOf, autoScheduler, pressInput, fireDown, startCard, meterSVG, exampleGroup, countTeller, barPump } from './_beat.js';
import { windows } from '../../../engine/judge.js';
import { accents } from '../../../engine/theory.js';
import { songById } from '../../../engine/songs/index.js';
import { makeSong, sounding } from '../../../engine/song.js';

const COUNT = 4;
const NAME = { 2: '행진', 3: '왈츠', 4: '네 박' };
const WORD = { 2: '쿵 짝', 3: '쿵 짝 짝', 4: '쿵 짝 쿵 짝' };
const acc = m => accents([m, 4]);
const melodyOf = id => { const s = makeSong(songById(id)); return { ev: sounding(s), ticks: s.total }; };
const SONG = { 2: melodyOf('ri5-march'), 3: melodyOf('ri5-waltz') };
const EXAMPLES = [
  { segs: [{ m: 2, bars: 4 }], bpm: 108, song: true, title: '행진', sub: '쿵 짝·두 박씩' },
  { segs: [{ m: 3, bars: 4 }], bpm: 108, song: true, title: '왈츠', sub: '쿵 짝 짝·세 박씩' },
  { segs: [{ m: 4, bars: 2 }], bpm: 108, title: '네 박', sub: '쿵 짝 쿵 짝·네 박씩' },
  { segs: [{ m: 2, bars: 3 }, { m: 3, bars: 2 }], bpm: 108, title: '빠르기는 그대로', sub: '묶음만 달라요' },
];
const TOTAL = 16;                                            // 확인 게임 번호 = 고르기 8 + 센박 마디 8
const SAY_PICK = '① 몇 박씩 묶였는지 골라요', SAY_TAP = '② 큰 점(센박)에만 톡! 작은 점에선 쉬어요';
// 확인 게임 고르기 8판 — 소개(같은 빠르기 · 곡) → 발전 → 비틀기(빠른 왈츠 · 느린 행진)
const PLAN = [
  { m: 2, bpm: 108, inst: 'xylo', song: true }, { m: 3, bpm: 108, inst: 'xylo', song: true },
  { m: 3, bpm: 108, inst: 'piano' }, { m: 2, bpm: 108, inst: 'piano' },
  { m: 2, bpm: 96, inst: 'marimba' }, { m: 3, bpm: 96, inst: 'marimba' },
  { m: 3, bpm: 138, inst: 'piano', twist: true }, { m: 2, bpm: 80, inst: 'marimba', twist: true },
];
const FINAL = { bpm: 100, segs: [{ m: 2, bars: 4 }, { m: 3, bars: 4 }] };
const LISTEN_BARS = 16;                                      // 고르기 한 판 반주는 가장 길게 16마디(그 안에 고르면 그때 멈춤)
const HOGW = 128;                                            // 박 판 안 왼쪽 고슴도치 자리(px)
let RUN = 0;

// 한 박 소리 — 센박 = 낮은 소리 + 북(쿵) · 중간 = 조금 약하게 · 여린박 = 가벼운 화음(짝)
function beatSound(engine, bus, t, a, beat, inst = 'piano') {
  if (a >= 1) { engine.drum('kung', t, 0.9, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 48, t, beat * 0.9, 0.75, bus); }
  else if (a > 0) { engine.drum('kung', t, 0.45, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 55, t, beat * 0.7, 0.42, bus); }
  else { engine.drum('hat', t, 0.3, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 64, t, beat * 0.35, 0.26, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 67, t, beat * 0.35, 0.26, bus); }
}
// 한 마디 소리(박마다 beatSound)
function barSound(engine, bus, m, tb, beat, inst) { for (let k = 0; k < m; k++) beatSound(engine, bus, tb + k * beat, acc(m)[k], beat, inst); }
// 곡 가락 한 마디(그 곡의 b번째 마디 — 곡이 짧으면 되풀이) — 대장 곡의 음 그대로
function melodyBar(engine, bus, m, tb, beat, b, inst = 'xylo') {
  const s = SONG[m], perTick = beat / 12, L = s.ticks, a = b * m * 12, z = a + m * 12;
  for (let base = Math.floor(a / L) * L; base < z; base += L)
    for (const n of s.ev) { const tt = base + n.t; if (tt >= a && tt < z) engine.note(inst, n.p + 12, tb + (tt - a) * perTick, n.d * perTick * 0.9, 0.55, bus); }
}
// 묶음들 → 마디 목록 [{ m, b(그 묶음 안 마디 번호), x(첫 박 번호) }]
function barList(segs) { const out = []; let x = 0; for (const s of segs) for (let b = 0; b < s.bars; b++) { out.push({ m: s.m, b, x }); x += s.m; } return out; }
// 부드럽게 끄기(고르면 반주가 0.6초에 걸쳐 작아짐)
function fadeBus(engine, b, sec = 0.6) {
  if (!b || !engine.ctx) return;
  const now = engine.ctx.currentTime;
  try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + sec); } catch { /* */ }
  setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, sec * 1000 + 300);
}
// 고슴도치가 북을 칠 때 살짝 눌림(강제 레이아웃 X — el.animate)
const bumpEl = el => { if (el.animate) el.animate([{ transform: 'none' }, { transform: 'translateY(5px) scaleY(.93)', offset: 0.35 }, { transform: 'none' }], { duration: 200, easing: 'ease-out' }); };

// ── 박 판 — 왼쪽 안 고슴도치 · 박 점(센박 큰 점) · 세로줄 · 박자표. 묶지 않은 줄(flow)로 시작했다가 group()으로 묶을 수 있다 ──
function boardView(kit, { labels = false } = {}) {
  const { h } = kit;
  const hog = kit.friendImg(kit.friend, 'idle', { label: false });
  const hogBox = h('div', { class: 'r5-hog' }, hog);
  const el = h('div', { class: 'r5-board' + (labels ? ' labeled' : '') }, hogBox);
  const LM = HOGW + (labels ? 176 : 0);                     // 왼쪽 = 고슴도치 + 박자표 설명 자리(보기)
  let dots = [], W = 1200;
  const SIZE = a => (a >= 1 ? 34 : a > 0 ? 25 : 17);
  // 묶음 자리 계산 — segs = [{ m, bars }] → 점마다 x · 크기 · 세로줄(마디 끝마다 · 맨 끝은 끝세로줄) · 박자표 x
  function layout(segs) {
    const beats = segs.reduce((n, s) => n + s.m * s.bars, 0), bars = segs.reduce((n, s) => n + s.bars, 0);
    const TS = 64, gapRatio = 0.5;
    const sp = Math.min(84, (W - 40 - LM - TS * segs.length) / (beats + bars * gapRatio));
    const gap = sp * gapRatio;
    const out = { dots: [], lines: [], ts: [] };
    let x = 20 + LM, i = 0;
    segs.forEach((s, si) => {
      out.ts.push({ x: x + TS / 2, m: s.m }); x += TS;
      for (let b = 0; b < s.bars; b++) {
        for (let k = 0; k < s.m; k++) { out.dots.push({ x: x + sp / 2, a: acc(s.m)[k], seg: si, bar: b, k, i: i++ }); x += sp; }
        out.lines.push({ x: x + gap / 2, end: b === s.bars - 1 && si === segs.length - 1 });
        x += gap;
      }
    });
    return out;
  }
  function draw(segs, { lit = -1 } = {}) {
    W = el.clientWidth || W;
    el.replaceChildren(hogBox); dots = [];
    const L = layout(segs);
    for (const t of L.ts) el.append(h('span', { class: 'r5-ts', style: { left: `${t.x}px` }, html: meterSVG(t.m, 92) }));
    for (const ln of L.lines) el.append(h('i', { class: 'r5-line' + (ln.end ? ' end' : ''), style: { left: `${ln.x}px` } }));
    for (const d of L.dots) {
      const e = h('i', { class: 'r5-dot' + (d.a >= 1 ? ' strong' : d.a > 0 ? ' mid' : ''), style: { left: `${d.x}px`, '--s': `${SIZE(d.a)}px` } });
      el.append(e); dots.push({ ...d, el: e });
    }
    if (labels && L.dots.length) {
      const first = L.dots.filter(d => d.seg === 0 && d.bar === 0), x0 = first[0].x - 30, x1 = first[first.length - 1].x + 30;
      const low = kit.band === 'low';                         // 1~2학년 판: 마디 → 묶음 · 센박 → 쿵 · 박자표 → 묶음 표시(용어 X)
      el.append(h('span', { class: 'r5-brace', style: { left: `${x0}px`, width: `${x1 - x0}px` } }, h('b', {}, low ? '한 묶음' : '한 마디')));
      el.append(h('span', { class: 'r5-lab line', style: { left: `${L.lines[0].x}px` } }, '세로줄'));
      el.append(h('span', { class: 'r5-lab strong', style: { left: `${first[0].x}px` } }, low ? '쿵 = 큰 점' : '센박(쿵) = 큰 점'));
      // 박자표 설명은 박자표 바로 옆(위 숫자를 가리킴) — 고슴도치 오른쪽부터
      el.append(h('span', { class: 'r5-call', style: { left: `${HOGW + 4}px`, width: `${L.ts[0].x - 32 - (HOGW + 4)}px` } }, h('b', {}, low ? '묶음 표시' : '박자표'), h('span', {}, '위 숫자는'), h('span', {}, low ? '한 묶음의 박 수' : '한 마디의 박 수')));
    }
    light(lit);
    return dots;
  }
  function light(i) { dots.forEach((d, k) => { d.el.classList.toggle('now', k === i); if (k <= i) d.el.classList.add('on'); }); }
  // 묶지 않은 줄 — 모든 점 같은 크기 · 같은 사이(박자를 그림으로 들키지 않게)
  function flow(n) {
    W = el.clientWidth || W;
    el.replaceChildren(hogBox); dots = [];
    const sp = Math.min(84, (W - HOGW - 90) / 12);
    for (let i = 0; i < n; i++) { const e = h('i', { class: 'r5-dot flow', style: { left: `${HOGW + 40 + i * sp}px`, '--s': '22px' } }); el.append(e); dots.push({ el: e }); }
  }
  // 묶기 — 이미 나온 점들을 m박씩 묶어 센박을 키우고 세로줄 · 박자표를 보인다(다 찬 마디 끝에만 세로줄)
  function group(m) {
    const n = dots.filter(d => d.el.classList.contains('on')).length || dots.length;
    const bars = Math.max(1, Math.ceil(n / m));
    const L = layout([{ m, bars }]);
    dots.forEach((d, k) => {
      const t = L.dots[k];
      if (!t || k >= n) { d.el.remove(); return; }
      d.el.classList.remove('flow', 'now'); d.el.classList.add('on');
      if (t.a >= 1) d.el.classList.add('strong');
      // 새 자리로 바로 놓고, 옛 자리에서 미끄러져 오는 것은 transform으로(left · 너비 움직임 X — 평가 3차 성능)
      const ox = parseFloat(d.el.style.left) || t.x, os = parseFloat(d.el.style.getPropertyValue('--s')) || 22, ns = SIZE(t.a);
      d.el.style.left = `${t.x}px`; d.el.style.setProperty('--s', `${ns}px`);
      if (d.el.animate) d.el.animate([{ transform: `translateX(${(ox - t.x).toFixed(1)}px) scale(${(os / ns).toFixed(3)})` }, { transform: 'none' }], { duration: 450, easing: 'ease-out' });
    });
    el.append(h('span', { class: 'r5-ts pop', style: { left: `${L.ts[0].x}px` }, html: meterSVG(m, 92) }));
    const lastX = L.dots[Math.min(n, L.dots.length) - 1].x, sp = L.dots.length > 1 ? L.dots[1].x - L.dots[0].x : 84;
    for (const ln of L.lines) if (ln.x < lastX + sp) el.append(h('i', { class: 'r5-line pop', style: { left: `${ln.x}px` } }));
  }
  const mark = (i, cls) => { const d = dots[i]; if (d) d.el.classList.add(cls); };
  return { el, hog, draw, light, flow, group, mark, bump: () => bumpEl(hogBox), get dots() { return dots; } };
}

// ── 고르기 한 판(연습 · 확인 게임이 같이 씀) — 반주가 한 마디씩 이어지고(0.3초 앞에만 예약), 4박 뒤부터 고를 수 있다 ──
function listenRound(kit, view, { m, bpm, inst = 'piano', song = false, onReady }) {
  const { engine } = kit;
  const ac = engine.ensure();
  const bus = newBus(engine);
  const beat = 60 / bpm, T = kit.timers();
  const t0 = ac.currentTime + 0.4;
  let answered = false, raf = 0, last = -9, ready = false, gone = false;
  const pump = barPump(ac, T, LISTEN_BARS, i => t0 + i * m * beat, i => {
    const tb = t0 + i * m * beat;
    barSound(engine, bus, m, tb, beat, inst);
    if (song) melodyBar(engine, bus, m, tb, beat, i);
  });
  view.board.flow(12);
  const loop = () => {
    if (gone) return;
    const bi = Math.floor((heardNow(ac) - t0) / beat + 0.08);
    if (bi !== last && bi >= 0 && !answered) {
      last = bi;
      if (bi < LISTEN_BARS * m) {
        // 12박마다 줄을 새로(12 = 2와 3의 공배수 — 새 줄이 늘 센박에서 시작해 박자를 들키지 않음)
        const k = bi % 12;
        if (k === 0 && bi > 0) view.board.flow(12);
        view.board.light(k);
        view.bump();
      }
      if (bi >= 4 && !ready) { ready = true; onReady && onReady(); }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return {
    get ready() { return ready; },
    answer() { answered = true; pump.stop(); fadeBus(engine, bus); view.board.group(m); },
    stop() { gone = true; answered = true; cancelAnimationFrame(raf); pump.stop(); T.clear(); killBus(engine, bus); },
  };
}

// 화면 — 왼쪽: 까닭 한 줄 · 박 판(고슴도치는 판 안) / 오른쪽: 답 묶음 자리(kit.answers)
function sceneView(kit) {
  const { h } = kit;
  const board = boardView(kit);
  const msg = h('p', { class: 'fmsg r5-msg' });
  const side = h('div', { class: 'r5-side' });
  const el = h('div', { class: 'r5 r5-scene' }, h('div', { class: 'r5-main' }, msg, board.el), side);
  return { el, hog: board.hog, board, msg, side, bump: board.bump };
}
// 고르기 답 둘(오른쪽 세로 한 줄 · kit.answers) — 두 박씩(행진) · 세 박씩(왈츠) · 키보드 ← → 또는 2 3
//  듣는 동안(4박이 지나기 전)은 busy — 단추 70% · 위에 '잘 들어요'(평가 3차: 회색으로 꺼 두지 않음)
function choiceAnswers(kit, onPick) {
  const { h } = kit;
  const chip = m => h('span', { class: 'r5-pdots' }, ...Array.from({ length: m }, (_, k) => h('i', { class: k ? '' : 'strong' })));
  const lab = m => h('span', { class: 'r5-ptxt' }, h('b', {}, m === 2 ? '두 박씩' : '세 박씩'), h('small', {}, `${NAME[m]}·${WORD[m]}`));
  const a = kit.answers([2, 3].map(m => ({ key: m, label: lab(m), chip: chip(m) })), k => onPick(Number(k)), { cls: 'r5-ans' });
  a.busy(true);
  const onKey = e => { if (e.repeat) return; if (e.key === 'ArrowLeft' || e.key === '2') onPick(2); else if (e.key === 'ArrowRight' || e.key === '3') onPick(3); };
  window.addEventListener('keydown', onKey);
  return {
    el: a.el, mark: a.mark, btn: k => a.btn(k),
    listen() { a.clear(); a.busy(true); },                     // 새 판 — 앞 판 표시(✓ · 눌림)를 지우고 듣기
    ready() { a.busy(false); },
    off: () => window.removeEventListener('keydown', onKey),
  };
}
// 아래 띠 '다시 듣기'(고르는 동안 — 지금 판 반주를 처음부터)
function replayButton(kit, fn) { const b = kit.h('button', { type: 'button' }, '다시 듣기'); kit.onPress(b, fn); return b; }

export default {
  // ── 보기: 박을 몇 개씩 묶나 — 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say(kit.band === 'low' ? '박을 몇 개씩 묶는지 들어 봐요 — 쿵에서 새 묶음이 시작돼요' : '박을 몇 개씩 묶는지가 박자예요 — 한 묶음이 한 마디');
    const board = boardView(kit, { labels: true });
    const counter = countTeller(board.el);
    let bus = null, raf = 0, pump = null;
    const stop = () => { cancelAnimationFrame(raf); pump && pump.stop(); T.clear(); killBus(engine, bus); bus = null; counter(0); kit.setPose(board.hog, kit.friend, 'idle'); };
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard r5-ex', 'aria-label': `${ex.segs.map(s => `${s.m}/4`).join('·')} ${ex.title} 들어 보기` },
        h('span', { class: 'r5-exts', html: ex.segs.map(s => meterSVG(s.m, 56)).join('') }),
        h('span', { class: 'r5-extx' }, h('b', {}, ex.title), h('span', {}, ex.sub)));
      onPress(btn, () => {
        stop();
        board.draw(ex.segs);
        const ac = engine.ensure(), b = newBus(engine);
        bus = b;
        const beat = 60 / ex.bpm, t0 = ac.currentTime + 0.35 + COUNT * beat;
        for (let i = 0; i < COUNT; i++) engine.click(t0 + (i - COUNT) * beat, i === 0, b);
        const bars = barList(ex.segs), x = bars.reduce((n, br) => n + br.m, 0);
        pump = barPump(ac, T, bars.length, i => t0 + bars[i].x * beat, i => {
          const br = bars[i], tb = t0 + br.x * beat;
          barSound(engine, b, br.m, tb, beat, 'piano');
          if (ex.song) melodyBar(engine, b, br.m, tb, beat, br.b);
        });
        let last = -9;
        const loop = () => {
          const bi = Math.floor((heardNow(ac) - t0) / beat + 0.08);
          counter(bi < 0 && bi >= -COUNT ? bi + COUNT + 1 : 0);    // 준비 박 세기 = 판 가운데 숫자(세는 동안만)
          if (bi !== last) { last = bi; if (bi >= 0 && bi < x) { board.light(bi); const d = board.dots[bi]; kit.setPose(board.hog, kit.friend, d && d.a >= 1 ? 'play' : 'idle'); if (d && d.a > 0) board.bump(); } }
          if (bi > x + 1) { stop(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r5 r5-show' }, board.el, exampleGroup(kit, cards)));
    requestAnimationFrame(() => board.draw(EXAMPLES[0].segs));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => stop();
  },

  // ── 연습: 두 박씩일까, 세 박씩일까 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const T = kit.timers(), r = kit.rng();
    ui.say('반주를 듣고, 박이 몇 개씩 묶였는지 골라요');
    const view = sceneView(kit);
    ui.stage.append(view.el);
    let streak = 0, round = null, cur = null, n = 0, passed = false, open = false, answered = true;
    const pick = choiceAnswers(kit, m => {
      if (!open || !round) return;
      open = false; answered = true;
      round.answer();
      const right = m === cur.m;
      pick.mark(m, right ? 'right' : 'wrong');
      if (right) {
        kit.sfx.good(kit.engine); streak++; ui.practice(streak); kit.setPose(view.hog, kit.friend, 'happy');
        ui.tell('맞아요', 'good');
        view.msg.textContent = `${cur.m === 2 ? '두' : '세'} 박씩 묶였어요 — ${kit.band === 'low' ? '' : cur.m + '/4·'}${WORD[cur.m]}`;
        if (streak >= 3) { passed = true; T.after(700, () => { round.stop(); pick.off(); kit.pass('세 번 이어서 묶음을 맞혔어요'); }); return; }
      } else {
        kit.sfx.oops(kit.engine); streak = 0; ui.practice(0); kit.setPose(view.hog, kit.friend, 'oops');
        ui.tell('다시 들어 봐요', 'oops', 1800);
        view.msg.textContent = `${cur.m === 2 ? '두' : '세'} 박씩이었어요 — ${WORD[cur.m]}, 큰 점에서 다시 시작해요`;
      }
      T.after(right ? 1500 : 2300, next);
    });
    view.side.append(pick.el);
    // 지금 판 반주를 처음부터(새 판 · 다시 듣기 같은 길)
    const start = () => {
      round && round.stop();
      open = false; answered = false; pick.listen();
      round = listenRound(kit, view, { ...cur, onReady: () => { open = true; pick.ready(); } });
    };
    function next() {
      if (passed) return;
      cur = n === 0 ? { m: 2, bpm: 104, inst: 'piano' } : { m: r() < 0.5 ? 2 : 3, bpm: [96, 104, 112][Math.floor(r() * 3)], inst: ['piano', 'marimba'][Math.floor(r() * 2)] };
      n++;
      view.msg.textContent = ''; kit.setPose(view.hog, kit.friend, 'idle');
      start();
    }
    ui.setBar(replayButton(kit, () => { if (cur && !answered && !passed) start(); }));
    T.after(400, next);
    kit.setAuto(() => { if (open && cur) pick.btn(cur.m).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    return () => { T.clear(); round && round.stop(); pick.off(); };
  },

  // ── 확인 게임: ① 행진일까 왈츠일까 8판 → ② 센박에만 톡 ──
  game(ui, kit) {
    const { engine } = kit;
    const T = kit.timers();
    ui.say('① 몇 박씩 묶였는지 고르고 ② 센박에만 톡');
    const view = sceneView(kit);
    ui.stage.append(view.el);
    const results = [], wrongs = [];
    let i = -1, round = null, open = false, answered = true, tapRun = null, input = null, gone = false;
    const pick = choiceAnswers(kit, m => {
      if (!open || !round) return;
      open = false; answered = true;
      round.answer();
      const want = PLAN[i].m, right = m === want;
      pick.mark(m, right ? 'right' : 'wrong');
      results.push(right);
      if (!right) wrongs.push(PLAN[i]);
      view.msg.textContent = `${kit.band === 'low' ? '' : want + '/4 '}${NAME[want]} — ${WORD[want]}`;
      if (right) { kit.sfx.good(engine); kit.setPose(view.hog, kit.friend, 'happy'); ui.tell('맞아요', 'good'); }
      else { kit.sfx.oops(engine); kit.setPose(view.hog, kit.friend, 'oops'); ui.tell(`${want === 2 ? '두' : '세'} 박씩이었어요`, 'oops', 1800); }
      T.after(right ? 1300 : 2000, next);
    });
    view.side.append(pick.el);
    const start = () => {
      round && round.stop();
      open = false; answered = false; pick.listen();
      round = listenRound(kit, view, { ...PLAN[i], onReady: () => { open = true; pick.ready(); } });
    };
    const card = startCard(ui, kit, {
      title: '행진일까 왈츠일까?',
      sub: [`① 반주를 듣고 몇 박씩 묶였는지 골라요·${PLAN.length}번`, `② 마지막엔 센박(큰 점)에만 톡!·${FINAL.segs.reduce((n, s) => n + s.bars, 0)}${kit.band === 'low' ? '묶음' : '마디'}`],
      onStart: () => { ui.setBar(replayButton(kit, () => { if (i >= 0 && i < PLAN.length && !answered && !gone) start(); })); next(); },
    });
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) { round && round.stop(); return finalRound(); }
      const p = PLAN[i];
      ui.count(i + 1, TOTAL);
      ui.say(p.twist ? (p.bpm > 110 ? '빨라졌어요 — 그래도 몇 박씩 묶였나요?' : '느려졌어요 — 그래도 몇 박씩 묶였나요?') : SAY_PICK);
      view.msg.textContent = '';
      kit.setPose(view.hog, kit.friend, 'idle');
      start();
    }
    // 마무리: 센박에만 톡 — 준비 박 넷 → 2/4 네 마디 → 3/4 네 마디(쉼 없이) · 반주는 한 마디씩 예약
    function finalRound() {
      pick.off();
      view.side.replaceChildren(); view.el.classList.add('solo');   // 고를 것이 없으니 답 묶음을 치우고 박 판을 넓게
      view.msg.textContent = ''; kit.setPose(view.hog, kit.friend, 'idle');
      ui.say(SAY_TAP);
      ui.count(PLAN.length + 1, TOTAL);
      input = pressInput(ui, kit, { onDown: e => tapRun && tapRun.tap(e) });
      ui.setBar(...input.nodes);
      const segs = FINAL.segs;
      view.board.draw(segs);
      const ac = engine.ensure(), bus = newBus(engine);
      const beat = 60 / FINAL.bpm, beatMs = beat * 1000, lat = kit.device.latencyMs, band = kit.band;
      const t0 = ac.currentTime + 0.5 + COUNT * beat;
      const pat = [], meters = [], barOf = [];
      for (const s of segs) { pat.push(...strongPattern(s.m, s.bars)); for (let b = 0; b < s.bars; b++) { meters.push(s.m); for (let k = 0; k < s.m; k++) barOf.push(meters.length - 1); } }
      for (let k = 0; k < COUNT; k++) engine.click(t0 + (k - COUNT) * beat, k === 0, bus);
      const bars = barList(segs), nb = bars.length;
      const pump = barPump(ac, T, nb + 1, k => t0 + (k < nb ? bars[k].x : pat.length) * beat, k => {
        if (k === nb) { engine.note('marimba', 72, t0 + pat.length * beat, beat * 2, 0.5, bus); return; }
        barSound(engine, bus, bars[k].m, t0 + bars[k].x * beat, beat, 'piano');
      });
      const w = windows(band, beatMs), taps = [], marks = new Array(pat.length).fill(null), runId = ++RUN;
      const msOf = k => perfOf(ac, t0 + k * beat);
      const counter = countTeller(view.board.el);
      let raf = 0, last = -9, ended = false;
      tapRun = {
        tap(e) {
          engine.drum('deok', ac.currentTime, 0.7);
          const ms = e && e.timeStamp ? e.timeStamp : performance.now();
          taps.push(ms);
          const all = pat.map((_, k) => msOf(k));
          const c = classifyTap(ms - lat, all, pat, w, beatMs);
          if (!c) return;
          if (c.kind === 'resthit') { marks[c.k] = 'resthit'; view.board.mark(c.k, 'rh'); ui.tell('작은 점에선 쉬어요', 'oops', 900); return; }
          if (marks[c.k]) return;
          marks[c.k] = c.kind; view.board.mark(c.k, c.kind === 'great' ? 'g' : 'k'); ui.tell(c.kind === 'great' ? '딱!' : '좋아', 'good', 700);
          kit.setPose(view.hog, kit.friend, 'play');
        },
        targets: () => pat.map((p, k) => (p === 'ta' ? { id: `${runId}:${k}`, ms: msOf(k) + lat } : null)).filter(Boolean),
        stop() { cancelAnimationFrame(raf); pump.stop(); killBus(engine, bus); counter(0); },
      };
      const loop = () => {
        if (gone) return;
        const now = heardNow(ac), bi = Math.floor((now - t0) / beat + 0.1);
        if (bi !== last) {
          last = bi;
          counter(bi < 0 && bi >= -COUNT ? bi + COUNT + 1 : 0);
          if (bi >= 0 && bi < pat.length) { view.board.light(bi); view.bump(); ui.count(PLAN.length + 1 + barOf[bi], TOTAL); }
        }
        pat.forEach((p, k) => {
          if (marks[k]) return;
          const pass = now - (t0 + k * beat) - lat / 1000;
          if (p === 'ta' && pass > w.late / 1000) { marks[k] = 'miss'; view.board.mark(k, 'm'); kit.setPose(view.hog, kit.friend, 'oops'); }
          if (p === 'rest' && pass > beat * 0.36) marks[k] = 'rest';
        });
        if (!ended && now > t0 + (pat.length - 1) * beat + beat * 0.5 + lat / 1000) {
          ended = true;
          const j = judgeEcho(pat, pat.map((_, k) => msOf(k)), taps, { band, latency: lat, beatMs });
          T.after(900, () => end(j, meters));
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    function end(j, meters) {
      tapRun && tapRun.stop(); input && input.off();
      // 센박 판정 → 마디마다 맞음(센박에 톡 + 여린박에 안 침)
      const barRes = []; let k = 0;
      for (const m of meters) { barRes.push(j.beats.slice(k, k + m).every(b => b.got === 'great' || b.got === 'ok' || b.got === 'rest')); k += m; }
      const all = [...results, ...barRes];
      const s = kit.scoreChoices(all, 5);
      const pickOk = results.filter(Boolean).length, barOk = barRes.filter(Boolean).length;
      const twistWrong = wrongs.filter(p => p.twist).length;
      let tip;
      if (s.kept === s.total) tip = '빠르기가 바뀌어도 묶음을 가려냈고, 센박에만 톡 했어요.';
      else if (twistWrong && twistWrong === wrongs.length) tip = '빠르기가 바뀐 판(7·8번째)에서 헷갈렸어요. 빠르기가 아니라 큰 소리(쿵)가 몇 박마다 오는지 세어 봐요.';
      else if (wrongs.length > meters.length - barOk) tip = `고르기에서 ${wrongs.length}번 헷갈렸어요. ‘쿵’에서 하나, 둘, (셋)을 세어 봐요.`;
      else if (j.restHits) tip = `여린박(작은 점)에 친 적이 ${j.restHits}번 있었어요. 큰 점에서만 톡!`;
      else tip = kit.band === 'low' ? `쿵을 놓친 묶음이 ${meters.length - barOk}개 있었어요. 쿵 소리에 맞춰 톡!` : `센박을 놓친 마디가 ${meters.length - barOk}개 있었어요. 쿵 소리에 맞춰 톡!`;
      ui.stage.replaceChildren(); ui.count(null);                // 결과 뒤에는 칸 그림 · 번호를 남기지 않음(친구 그림은 칸 화면이 붙임)
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: all, group: [results.length, meters.length],
        facts: [`① 묶음 고르기 ${results.length}번 중 ${pickOk}번을 맞혔어요`, kit.band === 'low' ? `② 쿵에만 톡 ${meters.length}묶음 중 ${barOk}묶음을 맞혔어요` : `② 센박 마디 ${meters.length}개 중 ${barOk}개를 맞혔어요`],
        starOn: s.starOn, rules: s.rules, tip,
      });
    }
    const auto = autoScheduler(T);
    kit.setAuto(() => {
      if (card.open()) card.press();
      else if (tapRun) auto(tapRun.targets(), () => fireDown(input.btn));
      else if (open && PLAN[i]) pick.btn(PLAN[i].m).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    return () => { gone = true; T.clear(); round && round.stop(); tapRun && tapRun.stop(); input && input.off(); pick.off(); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임 · 한 마디씩 건 가락을 확인)
export { PLAN, FINAL, TOTAL, melodyBar, barList };
