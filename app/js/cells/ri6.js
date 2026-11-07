// 리6 4/4 마디 채우기 — '음표 몇 개'가 아니라 '몇 박이 찼나'(계획서 '가장 어려운 곳')
//  빈 마디 = 박 자리 넷. 음표 블록은 길이만큼 자리를 차지한다(4분 = 한 자리 · 2분 = 두 자리 · 온 = 네 자리 · 4분쉼표 = 한 자리 · 8분 둘 = 한 자리)
//  · 블록을 넣을 때마다 박이 울리며 찬 자리가 빛나고, 다 차면 상자가 닫히는 소리 + 그 마디 리듬
//  · 넘치면 넘친 자리가 상자 밖으로 삐져나온다(회갈 빗금) · 모자라면 빈 자리가 쉬는 소리(박자기만)로 울린다
//  보기: 예시 여섯(넷 · 둘 · 온음표 소개 · 8분음표 둘 소개 · 넘치면 · 모자라면) → 연습: '상자에 몇 박이 찼어요?'(블록 수 ≠ 박 수) 세 번 이어서
//  확인 게임: 택배 8상자 — 아무렇게나 4박 둘 → 2분음표를 꼭 넣어 둘 → 남은 자리에 맞는 블록 하나 셋 → 마무리: 블록 셋으로 4박
//  11-07 평가 2차: 상자 = 코덱스 그림(prop_box_open · prop_box_closed — 무늬 없는 세로 띠만 가로로 늘림) · 박 자리 넷은 코드로 겹쳐 그림
//   블록 판 = 오른쪽 세로 한 줄(kit.answers · 다섯 블록을 처음부터 깔고 판마다 잠금) · 번호는 ui.count · 맞음/틀림 말은 말풍선(ui.tell)
//   연습에서는 고르기 전에 '몇 박 찼나' 글과 박 점을 숨김 · 블록 색 = 나무 빛(계이름 색과 다른 계열) · '박 칸' → '박 자리'
//  셈은 engine/measure.js fillBar · 분수 보기는 리7(여기선 끔)
import { fillBar } from '../../../engine/measure.js';
import { DUR } from '../../../engine/theory.js';
import { newBus, killBus, noteSVG, NAME, SYL, exampleGroup } from './_beat.js';

const C = 132, HB = 340, PAD = 8;                             // 상자 안 박 자리 하나(px) · 상자 그림 높이 · 앞면 안쪽 여백
const CT = 50;                                                // 블록 판(오른쪽 답 묶음) 박 하나(px)
const LEN = { q: 1, h: 2, w: 4, qr: 1, ee: 1 };
const TICK = { q: DUR.q, h: DUR.h, w: DUR.w, qr: DUR.q, ee: DUR.e * 2 };
const ALL = ['q', 'h', 'w', 'qr', 'ee'];
const SHORT = { q: '4분음표', h: '2분음표', w: '온음표', qr: '4분쉼표', ee: '8분음표' };
const EXAMPLES = [
  { blocks: ['q', 'q', 'q', 'q'], title: '4분음표 넷', sub: '한 자리씩 네 번', msg: "4분음표 '따' 하나 = 한 박 · 네 개로 4박" },
  { blocks: ['h', 'h'], title: '2분음표 둘', sub: '두 자리씩 두 번', msg: "2분음표 '따아' 하나 = 두 박 · 두 개로 4박" },
  { blocks: ['w'], title: '온음표', sub: '혼자 네 자리', isNew: true, msg: "온음표 '따아아아' = 네 박 · 혼자서 상자를 채워요" },
  { blocks: ['ee', 'ee', 'h'], title: '8분음표 둘', sub: '둘이 합쳐 한 자리', isNew: true, msg: "8분음표 둘 '띠띠' = 한 박 · 짧은 소리 둘이 한 자리" },
  { blocks: ['h', 'h', 'q'], title: '넘치면?', sub: '상자 밖으로 나와요' },
  { blocks: ['h', 'q'], title: '모자라면?', sub: '빈 자리는 쉬어요' },
];
const FOLLOW = [['h', 'q'], ['w'], ['ee', 'ee'], ['qr', 'h'], ['h'], ['q', 'q', 'q'], ['ee', 'h'], ['h', 'h'], ['ee', 'q', 'q'], ['q', 'h', 'q']];
const has = k => b => b.includes(k);
// 확인 게임 8상자 — 소개(아무렇게나) → 발전(2분음표를 꼭) → 비틀기(남은 자리에 맞는 블록 하나) → 마무리(블록 셋으로)
const PLAN = [
  { task: '블록을 넣어 4박을 채워요', tray: ['q', 'h', 'w'], auto: ['q', 'q', 'h'] },
  { task: '블록을 넣어 4박을 채워요', tray: ALL, auto: ['ee', 'q', 'h'] },
  { task: '2분음표를 꼭 넣어서 4박을 채워요', tray: ALL, need: has('h'), needTell: '2분음표가 없어요', needMsg: () => '4박이 찼지만 2분음표가 없어요 — 블록을 눌러 빼고 2분음표를 넣어요', auto: ['h', 'q', 'qr'] },
  { task: '2분음표를 꼭 넣어서 4박을 채워요', tray: ALL, need: has('h'), needTell: '2분음표가 없어요', needMsg: () => '4박이 찼지만 2분음표가 없어요 — 블록을 눌러 빼고 2분음표를 넣어요', auto: ['q', 'h', 'ee'] },
  { task: '남은 자리에 꼭 맞는 블록 하나를 골라요', pre: ['q', 'q'], tray: ['q', 'h', 'w'], one: true, auto: ['h'] },
  { task: '남은 자리에 꼭 맞는 블록 하나를 골라요', pre: ['h', 'q'], tray: ['h', 'qr', 'w'], one: true, auto: ['qr'] },
  { task: '남은 자리에 꼭 맞는 블록 하나를 골라요', pre: ['ee', 'q'], tray: ['w', 'q', 'h'], one: true, auto: ['h'] },
  { task: '블록 세 개로 4박을 채워요', tray: ALL, need: b => b.length === 3, needTell: '블록이 셋이 아니에요', needMsg: b => `4박이 찼지만 블록이 ${b.length}개예요 — 세 개로 채워 봐요`, auto: ['h', 'q', 'q'] },
];

// ── 상자 그림(코덱스) — 무늬 없는 세로 띠 둘만 가로로 늘려 원하는 너비로(선 굵기 · 테이프 · 리본은 그대로) ──
const SCENE = 'app/img/scene/';
const BOX = {
  open: { src: SCENE + 'prop_box_open.webp', w: 900, h: 703, cols: [[249, 389], [511, 651]], face: [172, 427, 728, 675], lip: [310, 408] },
  closed: { src: SCENE + 'prop_box_closed.webp', w: 714, h: 680, cols: [[130, 247], [464, 582]] },
};
const imgs = {};
const loadImg = src => { if (!imgs[src]) { const im = new Image(); im.src = src; imgs[src] = im; } return imgs[src]; };
function paintStretched(canvas, spec, W, H) {
  const im = loadImg(spec.src);
  const draw = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const s = H / spec.h, add = Math.max(0, W - spec.w * s) / spec.cols.length;
    let sx = 0, dx = 0;
    const seg = (a, b, grow) => { if (b <= a) return; const dw = (b - a) * s + grow; g.drawImage(im, a, 0, b - a, spec.h, dx, 0, dw + 0.6, H); dx += dw; };
    for (const [a, b] of spec.cols) { seg(sx, a, 0); seg(a, b, add); sx = b; }
    seg(sx, spec.w, 0);
  };
  if (im.complete && im.naturalWidth) draw(); else im.addEventListener('load', draw, { once: true });
}

// ── 블록 하나(길이만큼 가로로 긴 판 · 음표 · 음절 · 박 점) ──
function blockEl(kit, kind, cw, { tag = 'div', cls = '', syl = true, h: hh = 0 } = {}) {
  const { h } = kit;
  const stick = kit.band === 'low' && (kind === 'q' || kind === 'ee');
  const sz = cw >= C ? 50 : 30;
  return h(tag, { class: `r6-blk k-${kind} ${cls}`.trim(), style: { width: `${LEN[kind] * cw - (cw >= C ? 8 : 6)}px`, ...(hh ? { height: `${hh}px` } : {}) }, ...(tag === 'button' ? { type: 'button' } : {}) },
    h('span', { class: 'nt', html: noteSVG(kind, { stick, size: sz }) }),
    syl ? h('b', { class: 'sy' }, SYL[kind]) : null,
    h('span', { class: 'bd' }, ...Array.from({ length: LEN[kind] }, () => h('i'))));
}

// ── 상자(그림 + 박 자리 넷 + 넘침 자리) ──
function boxView(kit) {
  const { h } = kit;
  const sp = BOX.open, s = HB / sp.h;
  const [fx0, fy0, fx1, fy1] = sp.face;
  const W = Math.round(sp.w * s + (4 * C + 2 * PAD - (fx1 - fx0) * s));
  const panelL = Math.round(fx0 * s + PAD), panelT = Math.round(fy0 * s), panelH = Math.round((fy1 - fy0) * s);   /* 앞면 안쪽을 위아래 꽉(테이프가 비치지 않게) */
  const lipY = Math.round((sp.lip[0] + sp.lip[1]) / 2 * s);
  const cvOpen = h('canvas', { class: 'r6-cv open', 'aria-hidden': 'true' }), cvClosed = h('canvas', { class: 'r6-cv closed', 'aria-hidden': 'true' });
  paintStretched(cvOpen, BOX.open, W, HB); paintStretched(cvClosed, BOX.closed, W, HB);
  const cells = [0, 1, 2, 3].map(i => h('i', { class: 'r6-cell', style: { left: `${i * C}px`, width: `${C}px` } }));
  const over = h('i', { class: 'r6-over' });
  const inner = h('div', { class: 'r6-inner', style: { left: `${panelL}px`, top: `${panelT}px`, width: `${4 * C}px`, height: `${panelH}px` } }, ...cells, over);
  // 박 점(앞 날개 위) — 찬 자리 = 진한 점 · 빈 자리 = 빈 동그라미
  const beatDots = [0, 1, 2, 3].map(i => h('span', { class: 'r6-bdot', style: { left: `${panelL + i * C + C / 2}px`, top: `${lipY}px` } }, h('i'), h('b', {}, String(i + 1))));
  const box = h('div', { class: 'r6-box', style: { width: `${W}px`, height: `${HB}px` } }, cvOpen, cvClosed, inner, ...beatDots);
  const count = h('span', { class: 'r6-count' });
  const msg = h('span', { class: 'r6-msg' });
  const line = h('p', { class: 'r6-line', style: { width: `${W}px` } }, msg, count);
  const el = h('div', { class: 'r6-boxzone' }, box, line);
  let blocks = [], locked = 0, onRemove = null;
  const BH = panelH - 10;
  // 그리기 — popAt = 새로 들어온 블록 자리(튀어 오름)
  function render(popAt = -1) {
    inner.querySelectorAll('.r6-blk').forEach(e => e.remove());
    const f = fillBar(blocks.map(k => TICK[k]));
    let t = 0;
    blocks.forEach((k, i) => {
      const lock = i < locked;
      const e = blockEl(kit, k, C, { tag: lock ? 'div' : 'button', cls: (lock ? 'lock' : 'in') + (i === popAt ? ' pop' : ''), h: BH });
      e.style.left = `${(t / DUR.q) * C + 4}px`;
      if (!lock) { e.setAttribute('aria-label', `${NAME[k]} 빼기`); kit.onPress(e, () => onRemove && onRemove(i)); }
      inner.append(e);
      t += TICK[k];
    });
    // 넘친 자리 — 상자 오른쪽 벽 밖으로 회갈 빗금
    over.style.width = f.over ? `${(f.over / DUR.q) * C}px` : '0';
    box.classList.toggle('overflow', f.over > 0);
    beatDots.forEach((d, i) => d.classList.toggle('on', f.cells[i] >= 1));
    const usedBeats = f.used / DUR.q;
    count.textContent = !blocks.length ? '빈 상자 — 박 자리 넷' : f.over ? `${usedBeats}박 — ${f.over / DUR.q}박이 넘쳤어요` : f.full ? '4박이 다 찼어요' : `${usedBeats}박 찼어요 · ${f.left / DUR.q}박 남았어요`;
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
    say(t) { msg.textContent = t || ''; },                     // 아래 한 줄 — 까닭이 있으면 '몇 박 찼나' 대신 보임
    quiz(on) { el.classList.toggle('quiz', on); },              // 연습: 고르기 전에는 '몇 박 찼나' 글 · 박 점을 숨김
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
// 상자 리듬 틀기 — 박자기(4박) + 블록 소리(길이 그대로) · 빈 자리는 박자기만(쉬는 소리) · onBeat(박 번호)로 그림 맞춤
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
// 닫히는 소리(상자 닫힘 · 리본)
const closeSound = (engine, bus) => { const t = engine.ensure().currentTime + 0.02; engine.drum('kung', t, 0.7, bus); engine.drum('deok', t + 0.16, 0.5, bus); engine.note('marimba', 72, t + 0.16, 0.3, 0.5, bus); engine.note('marimba', 79, t + 0.26, 0.4, 0.5, bus); };
const lightOnly = (box, j) => [0, 1, 2, 3].forEach(x => box.lightCell(x, x === j));

export default {
  // ── 보기: 블록은 길이만큼 박 자리를 차지해요 — 예시 여섯 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('블록은 길이만큼 박 자리를 차지해요 — 네 자리가 차면 상자가 닫혀요');
    const box = boxView(kit);
    box.set([]);
    let bus = newBus(engine);
    const stop = () => { T.clear(); killBus(engine, bus); bus = newBus(engine); lightOnly(box, -1); };
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard r6-ex', 'aria-label': `${ex.title} — ${ex.sub} 들어 보기` },
        h('b', {}, ex.title),
        h('span', { class: 'r6-exmini' }, ...ex.blocks.map(k => h('i', { class: `k-${k}`, style: { width: `${LEN[k] * 22 - 3}px` } })), ex.isNew ? h('em', { class: 'r6-new' }, '새 음표') : null),
        h('span', {}, ex.sub));
      onPress(btn, () => {
        stop();
        box.set([]); box.say('');
        let at = 0;
        ex.blocks.forEach((k, n) => T.after(150 + n * 520, () => { const from = at; box.add(k); insertSound(engine, bus, k, from); at += LEN[k]; }));
        T.after(150 + ex.blocks.length * 520 + 200, () => {
          const f = box.state();
          if (f.over) { box.say(`넘쳤어요 — 블록 ${ex.blocks.length}개가 ${f.used / DUR.q}박이라 상자에 안 들어가요`); return; }
          if (f.full) { box.close(); closeSound(engine, bus); box.say(ex.msg || `블록 ${ex.blocks.length}개 · 4박 — 상자가 닫혔어요`); }
          else box.say(`빈 자리 ${f.left / DUR.q}개는 쉬는 소리 — 아직 ${f.left / DUR.q}박이 비었어요`);
          T.after(f.full ? 450 : 100, () => playBox(kit, bus, ex.blocks, { T, onBeat: i => { lightOnly(box, i); if (f.cells[i] < 1) box.blinkEmpty(i); }, onEnd: () => lightOnly(box, -1) }));
        });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r6 r6-show' }, box.el, exampleGroup(kit, cards, 'r6-exgroup')));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); killBus(engine, bus); };
  },

  // ── 연습: 상자에 몇 박이 찼어요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('상자에 몇 박이 찼어요? 블록 수가 아니라 박 자리를 세요');
    const box = boxView(kit);
    const bus = newBus(engine);
    let streak = 0, cur = null, busy = false, n = 0, passed = false;
    const ans = kit.answers([1, 2, 3, 4].map(v => ({ key: v, label: `${v}박` })), v => answer(Number(v)), { cls: 'r6-ans r6-nums' });
    ui.stage.append(h('div', { class: 'r6 r6-play' }, box.el, ans.el));
    const beatsOf = list => list.reduce((a, k) => a + LEN[k], 0);
    function ask() {
      if (passed) return;
      let list;
      do { list = n === 0 ? FOLLOW[0] : FOLLOW[Math.floor(r() * FOLLOW.length)]; } while (n > 0 && cur && list === cur);
      n++; cur = list; busy = false;
      box.quiz(true); box.say('');
      box.set(list);
      ans.clear();
      lightOnly(box, -1);
    }
    function answer(v) {
      if (busy || !cur) return;
      busy = true;
      const want = beatsOf(cur), right = v === want, nb = cur.length;
      box.quiz(false);
      ans.mark(v, right ? 'right' : 'wrong');
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        ui.tell('맞아요', 'good');
        box.say(nb === want ? `${want}박이 찼어요` : `블록은 ${nb}개, 박은 ${want}개`);
        if (streak >= 3) { passed = true; kit.pass('세 번 이어서 박을 셌어요'); return; }
        T.after(1300, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        ui.tell('다시 세어 봐요', 'oops', 1800);
        const why = cur.includes('w') ? '온음표는 네 자리' : cur.includes('h') ? '2분음표는 두 자리' : cur.includes('ee') ? '8분음표 둘은 한 자리' : '블록 하나가 한 자리';
        box.say(`${want}박이에요 — ${why}를 차지해요`);
        // 자리를 하나씩 세며 보여 줌(박자기)
        playBox(kit, bus, cur, { bpm: 100, T, onBeat: i => [0, 1, 2, 3].forEach(j => box.lightCell(j, j === i && i < want)), onEnd: () => { lightOnly(box, -1); T.after(700, ask); } });
      }
    }
    const onKey = e => { const v = Number(e.key); if (v >= 1 && v <= 4) answer(v); };
    window.addEventListener('keydown', onKey);
    T.after(300, ask);
    kit.setAuto(() => { if (!busy && cur) ans.btn(beatsOf(cur)).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    return () => { T.clear(); killBus(engine, bus); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 택배 상자 채우기 8상자 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('음표 블록을 상자에 넣어 4박을 채워요');
    const box = boxView(kit);
    // 블록 판 — 다섯 블록을 처음부터 깔고, 판마다 쓰지 않는 블록은 잠금(자리가 밀리지 않게)
    const tray = kit.answers(ALL.map(k => ({ key: k, label: SHORT[k], chip: blockEl(kit, k, CT, { syl: false }), locked: true })), k => put(k), { cls: 'r6-ans r6-tray' });
    ALL.forEach(k => tray.btn(k).setAttribute('aria-label', `${NAME[k]} 넣기`));
    ui.stage.append(h('div', { class: 'r6 r6-play' }, box.el, tray.el));
    const listen = h('button', { type: 'button' }, '들어 보기');
    const bus = newBus(engine);
    const results = [], kinds = { over: 0, need: 0, pick: 0 };
    let i = -1, plan = null, first = true, busy = true, step = 0, gone = false;
    box.set([]);

    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '택배 상자 채우기'),
      h('p', { class: 'sub' }, '음표 블록을 상자에 넣어 박 자리 넷을 채워요'),
      h('p', { class: 'sub' }, `블록을 누르면 상자에 들어가요 · 상자 ${PLAN.length}개`)));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, () => { card.remove(); ui.setBar(listen); next(); });
    ui.setBar(go);

    // ── 판 ──
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      plan = PLAN[i]; first = true; step = 0;
      ui.count(i + 1, PLAN.length);
      ui.say(plan.task);
      box.say(''); box.quiz(!!plan.one);                       // 고르기 판은 '몇 박 남았나'를 숨김(빈 자리를 세게)
      box.set(plan.pre || [], (plan.pre || []).length);
      box.enter();
      ALL.forEach(k => tray.lock(k, !plan.tray.includes(k)));
      tray.clear();
      busy = false;
    }
    // 블록 넣기 — 상자 끝에
    function put(k) {
      if (busy || gone) return;
      const before = box.state();
      if (before.over) { box.say('넘쳤어요 — 상자 안 블록을 눌러 먼저 빼요'); nudge(); return; }
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
      box.say(f.over ? '아직 넘쳐요 — 하나 더 빼요' : '');
      if (!f.over && f.used) check(f, null);
    });
    function check(f, k) {
      const mine = box.blocks.slice((plan.pre || []).length);
      if (f.over) {
        first = false; kinds.over++;
        ui.tell('넘쳤어요', 'oops', 1300);
        if (plan.one) {
          busy = true;
          box.say(`${f.over / DUR.q}박이 상자 밖으로 나왔어요`);
          T.after(1300, () => { box.removeAt(box.blocks.length - 1); box.say(`남은 자리는 ${(f.cap - (f.used - TICK[k])) / DUR.q}자리예요`); busy = false; });
        } else box.say(`${f.over / DUR.q}박이 상자 밖으로 나왔어요 — 상자 안 블록을 눌러 빼요`);
        return;
      }
      if (f.full) {
        if (plan.need && !plan.need(mine)) { first = false; kinds.need++; ui.tell(plan.needTell, 'oops', 1500); box.say(plan.needMsg(mine)); nudge(); return; }
        return closeBox(mine);
      }
      if (plan.one && k) {                                     // 한 블록으로 채워야 하는데 모자람 — 빈 자리가 쉬는 소리로 울림
        first = false; kinds.pick++; busy = true;
        ui.tell('모자라요', 'oops', 1500);
        box.quiz(false);
        box.say(`아직 ${f.left / DUR.q}자리가 비었어요 — 들어 봐요`);
        playBox(kit, bus, box.blocks, { T, onBeat: j => { lightOnly(box, j); if (f.cells[j] < 1) box.blinkEmpty(j); },
          onEnd: () => { lightOnly(box, -1); box.removeAt(box.blocks.length - 1); box.quiz(true); box.say('블록 하나로 남은 자리를 꼭 맞게 채워요'); busy = false; } });
        return;
      }
      box.say('');
    }
    function closeBox(mine) {
      busy = true;
      results[i] = first;
      box.quiz(false);
      ui.tell(first ? '딱 맞아요' : '4박이 찼어요', 'good');
      box.close(); closeSound(engine, bus);
      box.say(`블록 ${mine.length + (plan.pre || []).length}개로 4박`);
      T.after(500, () => playBox(kit, bus, box.blocks, { T,
        onBeat: j => lightOnly(box, j),
        onEnd: () => { lightOnly(box, -1); box.leave(); T.after(480, next); } }));
    }
    function playNow() {
      if (busy || gone) return;
      const f = box.state();
      busy = true;
      playBox(kit, bus, box.blocks, { T, onBeat: j => { lightOnly(box, j); if (f.cells[j] < 1) box.blinkEmpty(j); },
        onEnd: () => { lightOnly(box, -1); busy = false; } });
    }
    onPress(listen, playNow);
    function end() {
      const res = PLAN.map((_, k) => !!results[k]);
      const s = kit.scoreChoices(res, 4);
      let tip;
      if (s.kept === s.total) tip = '블록 수가 아니라 박 자리로 세어서, 모든 상자를 한 번에 채웠어요.';
      else if (kinds.over >= Math.max(kinds.need, kinds.pick)) tip = `넘친 적이 ${kinds.over}번 있었어요. 2분음표는 두 자리, 온음표는 네 자리 — 남은 자리 수를 먼저 세어 봐요.`;
      else if (kinds.pick >= kinds.need) tip = `남은 자리 고르기에서 ${kinds.pick}번 모자랐어요. 빈 자리가 몇 개인지 세면 필요한 박 수가 보여요.`;
      else tip = `조건을 놓친 상자가 ${kinds.need}번 있었어요. 블록 수와 박 수는 달라요 — 블록 셋으로도 4박이 돼요.`;
      ui.stage.replaceChildren(); ui.count(null);                // 결과 뒤에는 칸 그림 · 번호를 남기지 않음(친구 그림은 칸 화면이 붙임)
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: res,
        facts: [`상자 ${s.total}개 중 ${s.kept}개를 한 번에 채웠어요`, `가장 길게 이어서 ${s.streak}개 · 넘친 적 ${kinds.over}번`],
        starOn: s.starOn, rules: s.rules, tip,
      });
    }
    // 자동 시험: 판마다 정해 둔 답 블록을 하나씩 누름
    kit.setAuto(() => {
      if (card.isConnected) { go.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; }
      if (busy || !plan) return;
      const k = plan.auto[step];
      const b = k && tray.btn(k);
      if (!b || b.classList.contains('locked')) return;
      step++;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    });
    return () => { gone = true; T.clear(); killBus(engine, bus); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임을 확인)
export { PLAN };
