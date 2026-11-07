// 리6 4/4 마디 채우기 — '음표 몇 개'가 아니라 '몇 박이 찼나'(계획서 '가장 어려운 곳')
//  빈 마디 = 박 칸 넷. 음표 블록은 길이만큼 칸을 차지한다(4분 = 한 칸 · 2분 = 두 칸 · 온 = 네 칸 · 4분쉼표 = 한 칸 · 8분 둘 = 한 칸)
//  · 블록을 넣을 때마다 박이 울리며 찬 칸이 빛나고, 다 차면 상자가 닫히는 소리 + 그 마디 리듬
//  · 넘치면 넘친 칸이 상자 밖으로 삐져나온다(빨강 대신 주황 빗금) · 모자라면 빈 칸이 쉬는 소리(박자기만)로 울린다
//  보기: 예시 여섯(넷 · 둘 · 하나 · 섞음 · 넘치면 · 모자라면) → 따라 하기: '상자에 몇 박이 찼어요?'(블록 수 ≠ 박 수) 세 번 이어서
//  확인 게임: 택배 8상자 — 아무렇게나 4박 둘 → 2분음표를 꼭 넣어 둘 → 남은 칸에 맞는 블록 하나 셋 → 마무리: 블록 셋으로 4박
//  끌어 놓기(블록 높이 80px 넘게) + 블록을 누르면 상자 끝에 들어감(크롬북 터치) · 상자 안 블록을 누르면 뺌 · 분수 보기는 리7(여기선 끔)
//  셈은 engine/measure.js fillBar
import { fillBar } from '../../../engine/measure.js';
import { DUR } from '../../../engine/theory.js';
import { newBus, killBus, noteSVG, NAME, SYL } from './_beat.js';

const C = 160, CT = 120;                                      // 상자 안 박 칸 하나 · 블록 판의 박 칸 하나(px)
const LEN = { q: 1, h: 2, w: 4, qr: 1, ee: 1 };
const TICK = { q: DUR.q, h: DUR.h, w: DUR.w, qr: DUR.q, ee: DUR.e * 2 };
const ALL = ['q', 'h', 'w', 'qr', 'ee'];
const EXAMPLES = [
  { blocks: ['q', 'q', 'q', 'q'], title: '4분음표 넷', sub: '한 칸씩 네 번' },
  { blocks: ['h', 'h'], title: '2분음표 둘', sub: '두 칸씩 두 번' },
  { blocks: ['w'], title: '온음표 하나', sub: '네 칸을 혼자' },
  { blocks: ['ee', 'q', 'h'], title: '섞어서', sub: '8분음표 둘도 한 칸' },
  { blocks: ['h', 'h', 'q'], title: '넘치면?', sub: '상자 밖으로 나와요' },
  { blocks: ['h', 'q'], title: '모자라면?', sub: '빈 칸은 쉬어요' },
];
const FOLLOW = [['h', 'q'], ['w'], ['ee', 'ee'], ['qr', 'h'], ['h'], ['q', 'q', 'q'], ['ee', 'h'], ['h', 'h'], ['ee', 'q', 'q'], ['q', 'h', 'q']];
const has = k => b => b.includes(k);
// 확인 게임 8상자 — 소개(아무렇게나) → 발전(2분음표를 꼭) → 비틀기(남은 칸에 맞는 블록 하나) → 마무리(블록 셋으로)
const PLAN = [
  { task: '블록을 넣어 4박을 채워요', tray: ['q', 'h', 'w'], auto: ['q', 'q', 'h'] },
  { task: '블록을 넣어 4박을 채워요', tray: ALL, auto: ['ee', 'q', 'h'] },
  { task: '2분음표를 꼭 넣어서 4박을 채워요', tray: ALL, need: has('h'), needMsg: () => '4박이 찼지만 2분음표가 없어요 — 블록을 빼고 2분음표를 넣어요', auto: ['h', 'q', 'qr'] },
  { task: '2분음표를 꼭 넣어서 4박을 채워요', tray: ALL, need: has('h'), needMsg: () => '4박이 찼지만 2분음표가 없어요 — 블록을 빼고 2분음표를 넣어요', auto: ['q', 'h', 'ee'] },
  { task: '남은 칸에 꼭 맞는 블록 하나를 골라요', pre: ['q', 'q'], tray: ['q', 'h', 'w'], one: true, auto: ['h'] },
  { task: '남은 칸에 꼭 맞는 블록 하나를 골라요', pre: ['h', 'q'], tray: ['h', 'qr', 'w'], one: true, auto: ['qr'] },
  { task: '남은 칸에 꼭 맞는 블록 하나를 골라요', pre: ['ee', 'q'], tray: ['w', 'q', 'h'], one: true, auto: ['h'] },
  { task: '블록 세 개로 4박을 채워요', tray: ALL, need: b => b.length === 3, needMsg: b => `4박이 찼지만 블록이 ${b.length}개예요 — 세 개로 채워 봐요`, auto: ['h', 'q', 'q'] },
];

// ── 블록 하나(길이만큼 가로로 긴 판 · 음표 · 음절 · 박 점) ──
function blockEl(kit, kind, cw, { tag = 'div', cls = '' } = {}) {
  const { h } = kit;
  const stick = kit.band === 'low' && (kind === 'q' || kind === 'ee');
  const sz = cw >= C ? 50 : 42;
  return h(tag, { class: `r6-blk k-${kind} ${cls}`.trim(), style: { width: `${LEN[kind] * cw - 8}px` }, ...(tag === 'button' ? { type: 'button' } : {}) },
    h('span', { class: 'nt', html: noteSVG(kind, { stick, size: sz }) }),
    h('b', { class: 'sy' }, SYL[kind]),
    h('span', { class: 'bd' }, ...Array.from({ length: LEN[kind] }, () => h('i'))));
}

// ── 상자(박 칸 넷 + 넘침 자리 셋) ──
function boxView(kit) {
  const { h } = kit;
  const cells = [0, 1, 2, 3].map(i => h('i', { class: 'r6-cell', style: { left: `${i * C}px` } }));
  const inner = h('div', { class: 'r6-inner' }, ...cells);
  const over = h('i', { class: 'r6-over' });
  const flapL = h('i', { class: 'r6-flap l' }), flapR = h('i', { class: 'r6-flap r' }), tape = h('i', { class: 'r6-tape' });
  const body = h('div', { class: 'r6-body' }, inner);
  const beatDots = [0, 1, 2, 3].map(i => h('span', { class: 'r6-bdot', style: { left: `${8 + i * C + C / 2}px` } }, h('i'), h('b', {}, String(i + 1))));
  const count = h('p', { class: 'r6-count' });
  const box = h('div', { class: 'r6-box' }, flapL, flapR, body, tape, over, ...beatDots);
  const el = h('div', { class: 'r6-boxzone' }, box, count);
  let blocks = [], locked = 0, onRemove = null;
  // 그리기 — popAt = 새로 들어온 블록 자리(튀어 오름)
  function render(popAt = -1) {
    inner.querySelectorAll('.r6-blk').forEach(e => e.remove());
    const f = fillBar(blocks.map(k => TICK[k]));
    let t = 0;
    blocks.forEach((k, i) => {
      const lock = i < locked;
      const e = blockEl(kit, k, C, { tag: lock ? 'div' : 'button', cls: (lock ? 'lock' : 'in') + (i === popAt ? ' pop' : '') });
      e.style.left = `${(t / DUR.q) * C + 4}px`;
      if (!lock) { e.setAttribute('aria-label', `${NAME[k]} 빼기`); kit.onPress(e, () => onRemove && onRemove(i)); }
      inner.append(e);
      t += TICK[k];
    });
    // 넘친 자리 — 상자 오른쪽 벽 밖으로 주황 빗금
    over.style.width = f.over ? `${(f.over / DUR.q) * C}px` : '0';
    box.classList.toggle('overflow', f.over > 0);
    beatDots.forEach((d, i) => d.classList.toggle('on', f.cells[i] >= 1));
    cells.forEach((c, i) => c.classList.toggle('full', f.cells[i] >= 1));
    const usedBeats = f.used / DUR.q;
    count.textContent = !blocks.length ? '빈 상자 — 박 칸 넷' : f.over ? `${usedBeats}박 — ${f.over / DUR.q}박이 넘쳤어요` : f.full ? '4박이 다 찼어요' : `${usedBeats}박 찼어요 · ${f.left / DUR.q}박 남았어요`;
    count.dataset.k = f.over ? 'over' : f.full ? 'full' : '';
    return f;
  }
  return {
    el, box,
    get blocks() { return blocks; },
    set(list, lockN = 0) { blocks = [...list]; locked = lockN; box.classList.remove('closed', 'gone', 'enter'); return render(); },
    add(k) { blocks.push(k); return render(blocks.length - 1); },
    removeAt(i) { if (i < locked) return null; blocks.splice(i, 1); return render(); },
    onRemove(fn) { onRemove = fn; },
    state: () => fillBar(blocks.map(k => TICK[k])),
    lightCell(i, on) { if (cells[i]) cells[i].classList.toggle('lit', on); },
    blinkEmpty(i) { if (!cells[i]) return; cells[i].classList.remove('rest'); void cells[i].offsetWidth; cells[i].classList.add('rest'); },
    close() { box.classList.add('closed'); },
    leave() { box.classList.add('gone'); },
    enter() { box.classList.remove('gone'); box.classList.add('enter'); setTimeout(() => box.classList.remove('enter'), 450); },
    render,
  };
}

// ── 소리 ──
// 블록을 넣을 때: 새로 찬 박마다 딸깍(0.12초 간격) + 블록 소리
function insertSound(engine, bus, kind, fromBeat) {
  const ac = engine.ensure(), t = ac.currentTime + 0.02;
  for (let j = 0; j < LEN[kind]; j++) if (fromBeat + j < 4) engine.click(t + j * 0.12, false, bus);
  if (kind === 'qr') engine.drum('gi', t, 0.25, bus);
  else if (kind === 'ee') { engine.note('marimba', 67, t, 0.12, 0.5, bus); engine.note('marimba', 67, t + 0.13, 0.12, 0.5, bus); }
  else engine.note('marimba', 67, t, 0.12 * LEN[kind] + 0.1, 0.55, bus);
}
// 상자 리듬 틀기 — 박자기(4박) + 블록 소리(길이 그대로) · 빈 칸은 박자기만(쉬는 소리) · onBeat(박 번호)로 그림 맞춤
function playBox(kit, bus, blocks, { bpm = 112, onBeat, onEnd, T }) {
  const { engine } = kit;
  const ac = engine.ensure(), beat = 60 / bpm, t0 = ac.currentTime + 0.12;
  for (let i = 0; i < 4; i++) engine.drum('hat', t0 + i * beat, i === 0 ? 0.42 : 0.3, bus);
  let b = 0;
  for (const k of blocks) {
    const t = t0 + b * beat;
    if (b < 4) {
      if (k === 'ee') { engine.note('recorder', 67, t, beat * 0.42, 0.7, bus); engine.note('recorder', 67, t + beat / 2, beat * 0.42, 0.7, bus); }
      else if (k !== 'qr') engine.note('recorder', 67, t, Math.min(LEN[k], 4 - b) * beat - 0.07, 0.7, bus);
    }
    b += LEN[k];
  }
  for (let i = 0; i < 4; i++) T.after(Math.max(0, (t0 + i * beat - ac.currentTime) * 1000), () => onBeat && onBeat(i));
  T.after(Math.max(0, (t0 + 4 * beat - ac.currentTime) * 1000) + 80, () => onEnd && onEnd());
}
// 닫히는 소리(상자 닫힘 · 테이프)
const closeSound = (engine, bus) => { const t = engine.ensure().currentTime + 0.02; engine.drum('kung', t, 0.7, bus); engine.drum('deok', t + 0.16, 0.5, bus); engine.note('marimba', 72, t + 0.16, 0.3, 0.5, bus); engine.note('marimba', 79, t + 0.26, 0.4, 0.5, bus); };

export default {
  // ── 보기: 블록은 길이만큼 칸을 차지해요 — 예시 여섯 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('블록은 길이만큼 칸을 차지해요 — 박 칸 넷이 차면 상자가 닫혀요');
    const box = boxView(kit);
    const msg = h('p', { class: 'fmsg r6-msg' });
    box.set([]);
    let bus = null;
    const stop = () => { T.clear(); killBus(engine, bus); bus = newBus(engine); [0, 1, 2, 3].forEach(i => box.lightCell(i, false)); };
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard r6-ex' }, h('b', {}, ex.title),
        h('span', { class: 'r6-exmini' }, ...ex.blocks.map(k => h('i', { class: `k-${k}`, style: { width: `${LEN[k] * 22 - 3}px` } }))),
        h('span', {}, ex.sub));
      onPress(btn, () => {
        stop();
        box.set([]); msg.textContent = '';
        let at = 0;
        ex.blocks.forEach((k, n) => T.after(150 + n * 520, () => { const from = at; box.add(k); insertSound(engine, bus, k, from); at += LEN[k]; }));
        T.after(150 + ex.blocks.length * 520 + 200, () => {
          const f = box.state();
          if (f.over) { msg.textContent = `넘쳤어요 — 블록 ${ex.blocks.length}개가 ${f.used / DUR.q}박이라 상자에 안 들어가요`; return; }
          if (f.full) { box.close(); closeSound(engine, bus); msg.textContent = `블록 ${ex.blocks.length}개 · 4박 — 상자가 닫혔어요`; }
          else msg.textContent = `빈 칸 ${f.left / DUR.q}개는 쉬는 소리 — 아직 ${f.left / DUR.q}박이 비었어요`;
          T.after(f.full ? 450 : 100, () => playBox(kit, bus, ex.blocks, { T, onBeat: i => { [0, 1, 2, 3].forEach(j => box.lightCell(j, j === i)); if (f.cells[i] < 1) box.blinkEmpty(i); }, onEnd: () => [0, 1, 2, 3].forEach(j => box.lightCell(j, false)) }));
        });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r6 r6-show' }, box.el, msg, h('div', { class: 'r6-exgrid' }, ...cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); killBus(engine, bus); };
  },

  // ── 따라 하기: 상자에 몇 박이 찼어요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('상자에 몇 박이 찼어요? 블록 수가 아니라 칸을 세요');
    const box = boxView(kit);
    const msg = h('p', { class: 'fmsg' });
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const bus = newBus(engine);
    let streak = 0, cur = null, busy = false, n = 0, passed = false;
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    const btns = [1, 2, 3, 4].map(v => { const b = h('button', { type: 'button', class: 'pick r6-num' }, `${v}박`); onPress(b, () => answer(v)); return b; });
    ui.stage.append(h('div', { class: 'r6 r6-follow' }, box.el, h('div', { class: 'r6-nums' }, ...btns), h('div', { class: 'row r6-frow' }, dots, msg)));
    const beatsOf = list => list.reduce((a, k) => a + LEN[k], 0);
    function ask() {
      if (passed) return;
      let list;
      do { list = n === 0 ? FOLLOW[0] : FOLLOW[Math.floor(r() * FOLLOW.length)]; } while (n > 0 && cur && list === cur);
      n++; cur = list; busy = false; msg.textContent = '';
      box.set(list);
      [0, 1, 2, 3].forEach(i => box.lightCell(i, false));
    }
    function answer(v) {
      if (busy || !cur) return;
      busy = true;
      const want = beatsOf(cur), right = v === want, nb = cur.length;
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = nb === want ? `맞아요 — ${want}박이 찼어요` : `맞아요 — 블록은 ${nb}개, 박은 ${want}개`;
        if (streak >= 3) { passed = true; kit.pass('세 번 이어서 박을 셌어요'); return; }
        T.after(1100, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        const why = cur.includes('w') ? '온음표는 네 칸' : cur.includes('h') ? '2분음표는 두 칸' : cur.includes('ee') ? '8분음표 둘은 한 칸' : '한 블록이 한 칸';
        msg.textContent = `${want}박이에요 — ${why}을 차지해요`;
        // 칸을 하나씩 세며 보여 줌(박자기)
        playBox(kit, bus, cur, { bpm: 100, T, onBeat: i => [0, 1, 2, 3].forEach(j => box.lightCell(j, j === i && i < want)) , onEnd: () => { [0, 1, 2, 3].forEach(j => box.lightCell(j, false)); T.after(500, ask); } });
      }
    }
    const onKey = e => { const v = Number(e.key); if (v >= 1 && v <= 4) answer(v); };
    window.addEventListener('keydown', onKey);
    T.after(300, ask);
    kit.setAuto(() => { if (!busy && cur) btns[beatsOf(cur) - 1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    return () => { T.clear(); killBus(engine, bus); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 택배 상자 채우기 8상자 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('');
    const box = boxView(kit);
    const msg = h('p', { class: 'fmsg r6-msg' });
    const tray = h('div', { class: 'r6-tray', role: 'group', 'aria-label': '음표 블록' });
    const counter = h('div', { class: 'r6-counter' });
    const listen = h('button', { type: 'button', class: 'r6-listen' }, '들어 보기');
    const hog = kit.friendImg(kit.friend, 'idle', { label: false });
    const scene = h('div', { class: 'r6 r6-game' },
      h('div', { class: 'r6-head' }, h('div', { class: 'r6-hog' }, hog), msg, listen, counter),
      box.el, h('div', { class: 'r6-traywrap' }, h('span', { class: 'r6-traylab' }, '블록'), tray));
    ui.stage.append(scene);
    const bus = newBus(engine);
    const results = [], kinds = { over: 0, need: 0, pick: 0 };
    let i = -1, plan = null, first = true, busy = true, step = 0, gone = false, drag = null;
    box.set([]);
    tray.replaceChildren(...PLAN[0].tray.map(k => trayBlock(k)));     // 시작 전에도 블록 판이 비어 보이지 않게(누르면 아무 일 없음)

    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '택배 상자 채우기'),
      h('p', { class: 'sub' }, '음표 블록을 상자에 넣어 박 칸 넷을 채워요'),
      h('p', { class: 'sub' }, '블록을 끌어 넣거나 눌러요 · 8상자')));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, () => { card.remove(); ui.setBar(); next(); });
    ui.setBar(go);

    // ── 판 ──
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      plan = PLAN[i]; first = true; step = 0;
      counter.textContent = `상자 ${i + 1} / ${PLAN.length}`;
      ui.say(plan.task);
      msg.textContent = ''; kit.setPose(hog, kit.friend, 'idle');
      box.set(plan.pre || [], (plan.pre || []).length);
      box.enter();
      tray.replaceChildren(...plan.tray.map(k => trayBlock(k)));
      busy = false;
    }
    function trayBlock(k) {
      const b = blockEl(kit, k, CT, { tag: 'button', cls: 'tr' });
      b.setAttribute('aria-label', `${NAME[k]} — ${LEN[k]}칸 · 넣기`);
      b.dataset.k = k;
      b.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        drag = { k, el: b, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, ghost: null, ox: e.offsetX, oy: e.offsetY };
        try { b.setPointerCapture(e.pointerId); } catch { /* 자동 시험의 합성 이벤트 */ }
        b.classList.add('press');
      });
      b.addEventListener('pointermove', e => {
        if (!drag || drag.el !== b) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) {
          drag.moved = true;
          drag.ghost = blockEl(kit, k, C, { cls: 'ghost' });
          document.body.append(drag.ghost);
        }
        if (drag.ghost) { drag.ghost.style.left = `${e.clientX - 40}px`; drag.ghost.style.top = `${e.clientY - 48}px`; }
      });
      const fin = e => {
        if (!drag || drag.el !== b) return;
        b.classList.remove('press');
        const d = drag; drag = null;
        if (d.ghost) {
          d.ghost.remove();
          const r = box.box.getBoundingClientRect();
          if (e.type === 'pointerup' && e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 60 && e.clientY < r.bottom + 60) put(k);
        } else if (e.type === 'pointerup') put(k);
      };
      b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin);
      b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); put(k); } });
      return b;
    }
    // 블록 넣기 — 상자 끝에
    function put(k) {
      if (busy || gone) return;
      const before = box.state();
      if (before.over) { msg.textContent = '넘쳤어요 — 상자 안 블록을 눌러 먼저 빼요'; nudge(); return; }
      const fromBeat = before.used / DUR.q;
      const f = box.add(k);
      insertSound(engine, bus, k, fromBeat);
      check(f, k);
    }
    function nudge() { box.box.classList.remove('shake'); void box.box.offsetWidth; box.box.classList.add('shake'); }
    box.onRemove(idx => {
      if (busy || gone) return;
      const f = box.removeAt(idx);
      if (!f) return;
      engine.drum('gi', engine.ensure().currentTime, 0.4, bus);
      msg.textContent = f.over ? '아직 넘쳐요 — 하나 더 빼요' : '';
      if (!f.over && f.used) check(f, null);
    });
    function check(f, k) {
      const mine = box.blocks.slice((plan.pre || []).length);
      if (f.over) {
        first = false; kinds.over++;
        kit.setPose(hog, kit.friend, 'oops');
        msg.textContent = `넘쳤어요 — ${f.over / DUR.q}박이 상자 밖으로 나왔어요`;
        if (plan.one) { busy = true; T.after(1300, () => { box.removeAt(box.blocks.length - 1); msg.textContent = `남은 칸은 ${(f.cap - (f.used - TICK[k])) / DUR.q}칸이에요`; busy = false; }); }
        else msg.textContent += ' · 상자 안 블록을 눌러 빼요';
        return;
      }
      if (f.full) {
        if (plan.need && !plan.need(mine)) { first = false; kinds.need++; kit.setPose(hog, kit.friend, 'oops'); msg.textContent = plan.needMsg(mine); nudge(); return; }
        return closeBox(mine);
      }
      if (plan.one && k) {                                     // 한 블록으로 채워야 하는데 모자람 — 빈 칸이 쉬는 소리로 울림
        first = false; kinds.pick++; busy = true;
        msg.textContent = `아직 ${f.left / DUR.q}칸이 비었어요 — 들어 봐요`;
        playBox(kit, bus, box.blocks, { T, onBeat: j => { [0, 1, 2, 3].forEach(x => box.lightCell(x, x === j)); if (f.cells[j] < 1) box.blinkEmpty(j); },
          onEnd: () => { [0, 1, 2, 3].forEach(x => box.lightCell(x, false)); box.removeAt(box.blocks.length - 1); msg.textContent = '한 블록으로 남은 칸을 꼭 맞게 채워요'; busy = false; } });
        return;
      }
      msg.textContent = '';
    }
    function closeBox(mine) {
      busy = true;
      results[i] = first;
      kit.setPose(hog, kit.friend, 'happy');
      box.close(); closeSound(engine, bus);
      msg.textContent = first ? `딱 맞아요 — 블록 ${mine.length + (plan.pre || []).length}개로 4박` : `4박이 찼어요 — 블록 ${mine.length + (plan.pre || []).length}개`;
      T.after(500, () => playBox(kit, bus, box.blocks, { T,
        onBeat: j => [0, 1, 2, 3].forEach(x => box.lightCell(x, x === j)),
        onEnd: () => { [0, 1, 2, 3].forEach(x => box.lightCell(x, false)); box.leave(); T.after(480, next); } }));
    }
    function playNow() {
      if (busy || gone) return;
      const f = box.state();
      busy = true;
      playBox(kit, bus, box.blocks, { T, onBeat: j => { [0, 1, 2, 3].forEach(x => box.lightCell(x, x === j)); if (f.cells[j] < 1) box.blinkEmpty(j); },
        onEnd: () => { [0, 1, 2, 3].forEach(x => box.lightCell(x, false)); busy = false; } });
    }
    onPress(listen, playNow);
    function end() {
      const res = PLAN.map((_, k) => !!results[k]);
      const s = kit.scoreChoices(res, 4);
      let tip;
      if (s.kept === s.total) tip = '블록 수가 아니라 박 칸으로 세어서, 모든 상자를 한 번에 채웠어요.';
      else if (kinds.over >= Math.max(kinds.need, kinds.pick)) tip = `넘친 적이 ${kinds.over}번 있었어요. 2분음표는 두 칸, 온음표는 네 칸 — 남은 칸 수를 먼저 세어 봐요.`;
      else if (kinds.pick >= kinds.need) tip = `남은 칸 고르기에서 ${kinds.pick}번 모자랐어요. 빈 칸이 몇 개인지 세면 필요한 박 수가 보여요.`;
      else tip = `조건을 놓친 상자가 ${kinds.need}번 있었어요. 블록 수와 박 수는 달라요 — 블록 셋으로도 4박이 돼요.`;
      kit.finish({
        title: `${s.total}상자 중 ${s.kept}상자를 한 번에 채웠어요`, replay: res,
        facts: [`가장 길게 이어서 ${s.streak}상자`, `넘친 적 ${kinds.over}번`],
        starOn: s.starOn, rules: s.rules, tip,
      });
    }
    // 자동 시험: 판마다 정해 둔 답 블록을 하나씩 누름
    kit.setAuto(() => {
      if (card.isConnected) { go.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; }
      if (busy || !plan) return;
      const k = plan.auto[step];
      const b = k && tray.querySelector(`[data-k="${k}"]`);
      if (!b) return;
      step++;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    });
    return () => { gone = true; T.clear(); killBus(engine, bus); if (drag && drag.ghost) drag.ghost.remove(); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임을 확인)
export { PLAN };
