// 리5 마디·박자표 — 박을 몇 개씩 묶는지가 박자다(2/4 = 센·여 · 3/4 = 센·여·여 · 4/4 = 센·여·중·여)
//  빠르기와 헷갈리지 않게: 보기 · 확인 게임 앞 판은 같은 빠르기로 2박 · 3박을 짝 지어 들려주고, 비틀기에서 빠른 왈츠 · 느린 행진
//  보기: 예시 넷(행진 2/4 · 왈츠 3/4 · 4/4 · 같은 빠르기 짝) — 박 점(센박 = 큰 점) · 마디줄 · 박자표가 소리와 함께
//  따라 하기: 반주를 듣고 '두 박씩' / '세 박씩' — 고르면 점들이 묶이며 박자표가 나온다 · 세 번 이어서 맞히면 지남
//  확인 게임: 고르기 8판(소개 같은 빠르기 → 발전 → 비틀기 빠르기 바꿈) → 마무리: 센박에만 톡(2/4 네 마디 → 3/4 네 마디)
//  곡: engine/songs/index.js 대장의 ri5-march · ri5-waltz(가락만)
import { judgeEcho, classifyTap, strongPattern, newBus, killBus, heardNow, perfOf, autoScheduler, pressInput, fireDown, startCard, meterSVG } from './_beat.js';
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
  { segs: [{ m: 2, bars: 4 }], bpm: 108, song: true, title: '2/4 행진', sub: '쿵 짝 · 두 박씩' },
  { segs: [{ m: 3, bars: 4 }], bpm: 108, song: true, title: '3/4 왈츠', sub: '쿵 짝 짝 · 세 박씩' },
  { segs: [{ m: 4, bars: 2 }], bpm: 108, title: '4/4', sub: '쿵 짝 쿵 짝 · 네 박씩' },
  { segs: [{ m: 2, bars: 3 }, { m: 3, bars: 2 }], bpm: 108, title: '같은 빠르기 짝', sub: '두 박씩 → 세 박씩' },
];
// 확인 게임 고르기 8판 — 소개(같은 빠르기 · 곡) → 발전 → 비틀기(빠른 왈츠 · 느린 행진)
const PLAN = [
  { m: 2, bpm: 108, inst: 'xylo', song: true }, { m: 3, bpm: 108, inst: 'xylo', song: true },
  { m: 3, bpm: 108, inst: 'piano' }, { m: 2, bpm: 108, inst: 'piano' },
  { m: 2, bpm: 96, inst: 'marimba' }, { m: 3, bpm: 96, inst: 'marimba' },
  { m: 3, bpm: 138, inst: 'piano', twist: true }, { m: 2, bpm: 80, inst: 'marimba', twist: true },
];
const FINAL = { bpm: 100, segs: [{ m: 2, bars: 4 }, { m: 3, bars: 4 }] };
let RUN = 0;

// 한 박 소리 — 센박 = 낮은 소리 + 북(쿵) · 중간 = 조금 약하게 · 여린박 = 가벼운 화음(짝)
function beatSound(engine, bus, t, a, beat, inst = 'piano') {
  if (a >= 1) { engine.drum('kung', t, 0.9, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 48, t, beat * 0.9, 0.75, bus); }
  else if (a > 0) { engine.drum('kung', t, 0.45, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 55, t, beat * 0.7, 0.42, bus); }
  else { engine.drum('hat', t, 0.3, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 64, t, beat * 0.35, 0.26, bus); engine.note(inst === 'xylo' ? 'marimba' : inst, 67, t, beat * 0.35, 0.26, bus); }
}
// 곡 가락(마디 bars개만큼 되풀이) — 대장 곡의 음 그대로
function playMelody(engine, bus, m, t0, beat, bars, inst = 'xylo') {
  const s = SONG[m], perTick = beat / 12, loopTicks = s.ticks;
  for (let base = 0; base < bars * m * 12; base += loopTicks)
    for (const n of s.ev) if (base + n.t < bars * m * 12) engine.note(inst, n.p + 12, t0 + (base + n.t) * perTick, n.d * perTick * 0.9, 0.55, bus);
}
// 부드럽게 끄기(고르면 반주가 0.6초에 걸쳐 작아짐)
function fadeBus(engine, b, sec = 0.6) {
  if (!b || !engine.ctx) return;
  const now = engine.ctx.currentTime;
  try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + sec); } catch { /* */ }
  setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, sec * 1000 + 300);
}

// ── 박 판 — 박 점(센박 큰 점) · 마디줄 · 박자표. 묶지 않은 줄(flow)로 시작했다가 group()으로 묶을 수 있다 ──
function boardView(kit, { labels = false } = {}) {
  const { h } = kit;
  const el = h('div', { class: 'r5-board' });
  let dots = [], extra = [], W = 1200;
  const SIZE = a => (a >= 1 ? 34 : a > 0 ? 25 : 17);
  // 묶음 자리 계산 — segs = [{ m, bars }] → 점마다 x · 크기 · 마디줄 x · 박자표 x
  function layout(segs) {
    const beats = segs.reduce((n, s) => n + s.m * s.bars, 0), bars = segs.reduce((n, s) => n + s.bars, 0);
    const TS = 64, gapRatio = 0.5;
    const sp = Math.min(84, (W - 40 - TS * segs.length) / (beats + bars * gapRatio));
    const gap = sp * gapRatio;
    const out = { dots: [], lines: [], ts: [] };
    let x = 20, i = 0;
    segs.forEach((s, si) => {
      out.ts.push({ x: x + TS / 2, m: s.m }); x += TS;
      for (let b = 0; b < s.bars; b++) {
        for (let k = 0; k < s.m; k++) { out.dots.push({ x: x + sp / 2, a: acc(s.m)[k], seg: si, bar: b, k, i: i++ }); x += sp; }
        if (b < s.bars - 1 || si < segs.length - 1) out.lines.push(x + gap / 2);   /* 마디줄 = 마디와 마디 사이 */
        x += gap;
      }
    });
    return out;
  }
  function draw(segs, { lit = -1 } = {}) {
    W = el.clientWidth || W;
    el.replaceChildren(); dots = []; extra = [];
    const L = layout(segs);
    for (const t of L.ts) { const e = h('span', { class: 'r5-ts', style: { left: `${t.x}px` }, html: meterSVG(t.m, 92) }); el.append(e); extra.push(e); }
    for (const x of L.lines) { const e = h('i', { class: 'r5-line', style: { left: `${x}px` } }); el.append(e); extra.push(e); }
    for (const d of L.dots) {
      const e = h('i', { class: 'r5-dot' + (d.a >= 1 ? ' strong' : d.a > 0 ? ' mid' : ''), style: { left: `${d.x}px`, '--s': `${SIZE(d.a)}px` } });
      el.append(e); dots.push({ ...d, el: e });
    }
    if (labels && L.dots.length) {
      const first = L.dots.filter(d => d.seg === 0 && d.bar === 0), x0 = first[0].x - 30, x1 = first[first.length - 1].x + 30;
      el.append(h('span', { class: 'r5-brace', style: { left: `${x0}px`, width: `${x1 - x0}px` } }, h('b', {}, '한 마디')));
      if (L.lines.length) el.append(h('span', { class: 'r5-lab line', style: { left: `${L.lines[0]}px` } }, '마디줄'));
      el.append(h('span', { class: 'r5-lab strong', style: { left: `${first[0].x}px` } }, '센박'));
      el.append(h('span', { class: 'r5-lab ts', style: { left: `${L.ts[0].x}px` } }, '박자표'));
    }
    light(lit);
    return dots;
  }
  function light(i) { dots.forEach((d, k) => { d.el.classList.toggle('now', k === i); if (k <= i) d.el.classList.add('on'); }); }
  // 묶지 않은 줄 — 모든 점 같은 크기 · 같은 사이(박자를 그림으로 들키지 않게)
  function flow(n) {
    W = el.clientWidth || W;
    el.replaceChildren(); dots = []; extra = [];
    const sp = Math.min(84, (W - 120) / 12);
    for (let i = 0; i < n; i++) { const e = h('i', { class: 'r5-dot flow', style: { left: `${84 + i * sp}px`, '--s': '22px' } }); el.append(e); dots.push({ el: e }); }
  }
  // 묶기 — 이미 나온 점들을 m박씩 묶어 센박을 키우고 마디줄 · 박자표를 보인다
  function group(m) {
    const n = dots.filter(d => d.el.classList.contains('on')).length || dots.length;
    const bars = Math.max(1, Math.ceil(n / m));
    const L = layout([{ m, bars }]);
    dots.forEach((d, k) => {
      const t = L.dots[k];
      if (!t || k >= n) { d.el.remove(); return; }
      d.el.classList.remove('flow', 'now'); d.el.classList.add('on');
      if (t.a >= 1) d.el.classList.add('strong');
      d.el.style.left = `${t.x}px`; d.el.style.setProperty('--s', `${SIZE(t.a)}px`);
    });
    const ts = h('span', { class: 'r5-ts pop', style: { left: `${L.ts[0].x}px` }, html: meterSVG(m, 92) });
    el.append(ts);
    for (const x of L.lines) if (x < L.dots[Math.min(n, L.dots.length) - 1].x) el.append(h('i', { class: 'r5-line pop', style: { left: `${x}px` } }));
  }
  const mark = (i, cls) => { const d = dots[i]; if (d) d.el.classList.add(cls); };
  return { el, draw, light, flow, group, mark, get dots() { return dots; } };
}

// ── 고르기 한 판(따라 하기 · 확인 게임이 같이 씀) — 반주가 4마디씩 이어지고, 4박 뒤부터 고를 수 있다 ──
function listenRound(kit, view, { m, bpm, inst = 'piano', song = false, onReady }) {
  const { engine } = kit;
  const ac = engine.ensure();
  const bus = newBus(engine);
  const beat = 60 / bpm, T = kit.timers();
  const t0 = ac.currentTime + 0.4;
  const CH = 4;                                              // 한 번에 예약하는 마디 수
  let chunk = 0, answered = false, raf = 0, last = -9, ready = false, gone = false;
  const sched = c => {
    const c0 = t0 + c * CH * m * beat;
    for (let b = 0; b < CH; b++) for (let k = 0; k < m; k++) beatSound(engine, bus, c0 + (b * m + k) * beat, acc(m)[k], beat, inst);
    if (song) playMelody(engine, bus, m, c0, beat, CH);
    if (c < 3) T.after(kit.msUntil(ac, c0 + CH * m * beat) - 400, () => { if (!answered && !gone) sched(++chunk); });
  };
  sched(0);
  view.board.flow(12);
  const loop = () => {
    if (gone) return;
    const bi = Math.floor((heardNow(ac) - t0) / beat + 0.08);
    if (bi !== last && bi >= 0 && !answered) {
      last = bi;
      if (bi < CH * 4 * m) {
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
    answer() { answered = true; fadeBus(engine, bus); view.board.group(m); },
    stop() { gone = true; answered = true; cancelAnimationFrame(raf); T.clear(); killBus(engine, bus); },
  };
}

// 화면 — 고슴도치 · 박 판 · 판정 말 · 셈
function sceneView(kit) {
  const { h } = kit;
  const hog = kit.friendImg(kit.friend, 'idle', { label: false });
  const hogBox = h('div', { class: 'r5-hog' }, hog);
  const board = boardView(kit);
  const word = h('div', { class: 'r5-word' });
  const counter = h('div', { class: 'r5-counter' });
  const el = h('div', { class: 'r5 r5-scene' }, h('div', { class: 'r5-top' }, hogBox, word, counter), board.el);
  return {
    el, hog, board, word, counter,
    bump() { hogBox.classList.remove('bump'); void hogBox.offsetWidth; hogBox.classList.add('bump'); },
    say(t, k) { word.textContent = t; word.dataset.k = k || ''; },
  };
}
// 고르기 단추 둘(아래 띠) — 두 박씩(행진) · 세 박씩(왈츠)
function choiceButtons(kit, onPick) {
  const { h, onPress } = kit;
  const mk = m => {
    const b = h('button', { type: 'button', class: 'r5-pick', 'aria-label': m === 2 ? '두 박씩 — 행진' : '세 박씩 — 왈츠' },
      h('span', { class: 'r5-pdots' }, ...Array.from({ length: m }, (_, k) => h('i', { class: k ? '' : 'strong' }))),
      h('span', { class: 'r5-ptxt' }, h('b', {}, m === 2 ? '두 박씩' : '세 박씩'), h('small', {}, `${NAME[m]} · ${WORD[m]}`)));
    onPress(b, () => onPick(m));
    return b;
  };
  const two = mk(2), three = mk(3);
  const set = on => { two.disabled = !on; three.disabled = !on; };
  const onKey = e => { if (e.repeat) return; if (e.key === 'ArrowLeft' || e.key === '2') onPick(2); else if (e.key === 'ArrowRight' || e.key === '3') onPick(3); };
  window.addEventListener('keydown', onKey);
  return { two, three, set, off: () => window.removeEventListener('keydown', onKey) };
}

export default {
  // ── 보기: 박을 몇 개씩 묶나 — 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    ui.say('박을 몇 개씩 묶는지가 박자예요 — 한 묶음이 한 마디');
    const hog = kit.friendImg(kit.friend, 'idle', { label: false });
    const hogBox = h('div', { class: 'r5-hog' }, hog);
    const board = boardView(kit, { labels: true });
    const count = h('b', { class: 'r5-cnum' });
    let bus = null, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); killBus(engine, bus); bus = null; count.textContent = ''; kit.setPose(hog, kit.friend, 'idle'); };
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard r5-ex' },
        h('span', { class: 'r5-exts', html: ex.segs.map(s => meterSVG(s.m, 56)).join('') }),
        h('span', { class: 'r5-extx' }, h('b', {}, ex.title), h('span', {}, ex.sub)));
      onPress(btn, () => {
        stop();
        board.draw(ex.segs);
        const ac = engine.ensure();
        bus = newBus(engine);
        const beat = 60 / ex.bpm, t0 = ac.currentTime + 0.35 + COUNT * beat;
        for (let i = 0; i < COUNT; i++) engine.click(t0 + (i - COUNT) * beat, i === 0, bus);
        let x = 0;
        for (const s of ex.segs) {
          for (let b = 0; b < s.bars; b++) for (let k = 0; k < s.m; k++) beatSound(engine, bus, t0 + (x + b * s.m + k) * beat, acc(s.m)[k], beat, 'piano');
          if (ex.song) playMelody(engine, bus, s.m, t0 + x * beat, beat, s.bars);
          x += s.m * s.bars;
        }
        let last = -9;
        const loop = () => {
          const bi = Math.floor((heardNow(ac) - t0) / beat + 0.08);
          count.textContent = bi < 0 && bi >= -COUNT ? String(bi + COUNT + 1) : '';
          if (bi !== last) { last = bi; if (bi >= 0 && bi < x) { board.light(bi); const d = board.dots[bi]; kit.setPose(hog, kit.friend, d && d.a >= 1 ? 'play' : 'idle'); hogBox.classList.remove('bump'); void hogBox.offsetWidth; if (d && d.a > 0) hogBox.classList.add('bump'); } }
          if (bi > x + 1) { stop(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r5 r5-show' },
      h('div', { class: 'r5-top' }, hogBox, count, h('p', { class: 'r5-note' }, '위 숫자 = 한 마디의 박 수 · 큰 점 = 센박(쿵)')),
      board.el, h('div', { class: 'r5-exgrid' }, ...cards)));
    requestAnimationFrame(() => board.draw(EXAMPLES[0].segs));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => stop();
  },

  // ── 따라 하기: 두 박씩일까, 세 박씩일까 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('반주를 듣고, 박이 몇 개씩 묶였는지 골라요');
    const view = sceneView(kit);
    const msg = h('p', { class: 'fmsg' });
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    ui.stage.append(h('div', { class: 'r5-wrap' }, view.el, h('div', { class: 'r5-info' }, dots, msg)));
    let streak = 0, round = null, cur = null, n = 0, passed = false, open = false;
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    const pick = choiceButtons(kit, m => {
      if (!open || !round) return;
      open = false; pick.set(false);
      round.answer();
      const right = m === cur.m;
      if (right) {
        kit.sfx.good(kit.engine); streak++; paint(); kit.setPose(view.hog, kit.friend, 'happy');
        msg.textContent = `맞아요 — ${cur.m === 2 ? '두' : '세'} 박씩 묶였어요(${cur.m}/4 · ${WORD[cur.m]})`;
        if (streak >= 3) { passed = true; T.after(700, () => { round.stop(); pick.off(); kit.pass('세 번 이어서 묶음을 맞혔어요'); }); return; }
      } else {
        kit.sfx.oops(kit.engine); streak = 0; paint(); kit.setPose(view.hog, kit.friend, 'oops');
        msg.textContent = `${cur.m === 2 ? '두' : '세'} 박씩이었어요 — ${WORD[cur.m]}, 큰 점에서 다시 시작해요`;
      }
      T.after(right ? 1500 : 2300, next);
    });
    pick.set(false);
    const skip = h('button', { type: 'button' }, '넘어가기');
    kit.onPress(skip, () => kit.next());
    ui.setBar(skip, pick.two, pick.three);
    function next() {
      if (passed) return;
      round && round.stop();
      cur = n === 0 ? { m: 2, bpm: 104, inst: 'piano' } : { m: r() < 0.5 ? 2 : 3, bpm: [96, 104, 112][Math.floor(r() * 3)], inst: ['piano', 'marimba'][Math.floor(r() * 2)] };
      n++;
      msg.textContent = ''; kit.setPose(view.hog, kit.friend, 'idle');
      round = listenRound(kit, view, { ...cur, onReady: () => { open = true; pick.set(true); } });
    }
    T.after(400, next);
    kit.setAuto(() => { if (open && cur) (cur.m === 2 ? pick.two : pick.three).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    return () => { T.clear(); round && round.stop(); pick.off(); };
  },

  // ── 확인 게임: 행진일까 왈츠일까 8판 → 센박에만 톡 ──
  game(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers();
    ui.say('');
    const view = sceneView(kit);
    ui.stage.append(h('div', { class: 'r5-wrap game' }, view.el));
    const results = [], wrongs = [];
    let i = -1, round = null, open = false, tapRun = null, input = null, gone = false;
    const pick = choiceButtons(kit, m => {
      if (!open || !round) return;
      open = false; pick.set(false);
      round.answer();
      const want = PLAN[i].m, right = m === want;
      results.push(right);
      if (!right) wrongs.push(PLAN[i]);
      if (right) { kit.sfx.good(engine); kit.setPose(view.hog, kit.friend, 'happy'); view.say(`맞아요 — ${want}/4 ${NAME[want]}`, 'good'); }
      else { kit.sfx.oops(engine); kit.setPose(view.hog, kit.friend, 'oops'); view.say(`${want === 2 ? '두' : '세'} 박씩이었어요(${want}/4)`, 'oops'); }
      T.after(right ? 1300 : 2000, next);
    });
    const card = startCard(ui, kit, {
      title: '행진일까 왈츠일까?',
      sub: ['반주를 듣고 박이 두 개씩인지, 세 개씩인지 골라요', '8번 고르고, 마지막엔 센박에만 톡! · 키보드 ← →'],
      onStart: () => { ui.setBar(pick.two, pick.three); next(); },
    });
    function next() {
      if (gone) return;
      round && round.stop();
      i++;
      if (i >= PLAN.length) return finalRound();
      const p = PLAN[i];
      view.counter.textContent = `${i + 1} / ${PLAN.length}`;
      view.say(p.twist ? (p.bpm > 110 ? '빨라졌어요 — 그래도 몇 박씩?' : '느려졌어요 — 그래도 몇 박씩?') : '', 'info');
      kit.setPose(view.hog, kit.friend, 'idle');
      pick.set(false);
      round = listenRound(kit, view, { ...p, onReady: () => { open = true; pick.set(true); } });
    }
    // 마무리: 센박에만 톡 — 준비 박 넷 → 2/4 네 마디 → 3/4 네 마디(쉼 없이)
    function finalRound() {
      pick.set(false); pick.off();
      view.counter.textContent = '센박에만 톡';
      view.say('큰 점(센박)에만 톡! 작은 점에선 쉬어요', 'info');
      input = pressInput(ui, kit, { onDown: e => tapRun && tapRun.tap(e) });
      ui.setBar(...input.nodes);
      const segs = FINAL.segs;
      view.board.draw(segs);
      const ac = engine.ensure(), bus = newBus(engine);
      const beat = 60 / FINAL.bpm, beatMs = beat * 1000, lat = kit.device.latencyMs, band = kit.band;
      const t0 = ac.currentTime + 0.5 + COUNT * beat;
      const pat = [], meters = [];
      for (const s of segs) { pat.push(...strongPattern(s.m, s.bars)); for (let b = 0; b < s.bars; b++) meters.push(s.m); }
      for (let k = 0; k < COUNT; k++) engine.click(t0 + (k - COUNT) * beat, k === 0, bus);
      let x = 0;
      for (const s of segs) { for (let b = 0; b < s.bars; b++) for (let k = 0; k < s.m; k++) beatSound(engine, bus, t0 + (x + b * s.m + k) * beat, acc(s.m)[k], beat, 'piano'); x += s.m * s.bars; }
      engine.note('marimba', 72, t0 + pat.length * beat, beat * 2, 0.5, bus);
      const w = windows(band, beatMs), taps = [], marks = new Array(pat.length).fill(null), runId = ++RUN;
      const msOf = k => perfOf(ac, t0 + k * beat);
      let raf = 0, last = -9, ended = false;
      tapRun = {
        tap(e) {
          engine.drum('deok', ac.currentTime, 0.7);
          const ms = e && e.timeStamp ? e.timeStamp : performance.now();
          taps.push(ms);
          const all = pat.map((_, k) => msOf(k));
          const c = classifyTap(ms - lat, all, pat, w, beatMs);
          if (!c) return;
          if (c.kind === 'resthit') { marks[c.k] = 'resthit'; view.board.mark(c.k, 'rh'); view.say('작은 점에선 쉬어요', 'oops'); return; }
          if (marks[c.k]) return;
          marks[c.k] = c.kind; view.board.mark(c.k, c.kind === 'great' ? 'g' : 'k'); view.say(c.kind === 'great' ? '딱!' : '좋아', c.kind === 'great' ? 'great' : 'good');
          kit.setPose(view.hog, kit.friend, 'play');
        },
        targets: () => pat.map((p, k) => (p === 'ta' ? { id: `${runId}:${k}`, ms: msOf(k) + lat } : null)).filter(Boolean),
        stop() { cancelAnimationFrame(raf); killBus(engine, bus); },
      };
      const loop = () => {
        if (gone) return;
        const now = heardNow(ac), bi = Math.floor((now - t0) / beat + 0.1);
        if (bi !== last) {
          last = bi;
          if (bi < 0 && bi >= -COUNT) view.say(String(bi + COUNT + 1), 'count');
          else if (bi === 0) view.say('', '');
          if (bi >= 0 && bi < pat.length) { view.board.light(bi); view.bump(); }
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
      else if (wrongs.length > meters.length - barOk) tip = `고르기에서 ${wrongs.length}번 헷갈렸어요. '쿵'에서 하나, 둘, (셋)을 세어 봐요.`;
      else if (j.restHits) tip = `여린박(작은 점)에 친 적이 ${j.restHits}번 있었어요. 큰 점에서만 톡!`;
      else tip = `센박을 놓친 마디가 ${meters.length - barOk}개 있었어요. 쿵 소리에 맞춰 톡!`;
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: all,
        facts: [`묶음 고르기 ${results.length}번 중 ${pickOk}번`, `센박 마디 ${meters.length}개 중 ${barOk}개`],
        starOn: s.starOn, rules: s.rules, tip,
      });
    }
    const auto = autoScheduler(T);
    kit.setAuto(() => {
      if (card.open()) card.press();
      else if (tapRun) auto(tapRun.targets(), () => fireDown(input.btn));
      else if (open && PLAN[i]) (PLAN[i].m === 2 ? pick.two : pick.three).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    return () => { gone = true; T.clear(); round && round.stop(); tapRun && tapRun.stop(); input && input.off(); pick.off(); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임을 확인)
export { PLAN };
