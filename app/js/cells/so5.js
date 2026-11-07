// 소5 한 가지만 바뀌는 짝 — 두 소리 가운데 정확히 하나(높이 · 길이 · 크기)만 다르다. 무엇이 바뀌었는지 이름 붙이기.
//  근거: '높낮이 ↔ 길이' 구분과 '크게 = 높게' 오개념은 하나만 바뀌는 짝을 견줘야 갈린다(계획서 칸 표 · so5 까닭).
//  소리 그림(세 성질을 한 그림에): 세로 자리 = 높이 · 가로 길이 = 길이 · 굵기 = 크기(계획서 '화면 약속').
//  보기: 세 성질을 한 번씩 + '낮아져도 크기는 그대로'(앞 칸 so1~so4를 건너뛴 아이도 여기서 세 이름을 만난다)
//  따라 하기: 높이 ↔ 길이 둘만(가장 헷갈리는 짝) · 세 번 이어서 맞히면 지남
//  확인 게임: 12판 — 소개(높이 ↔ 길이 · 차이 크게) → 발전(차이 작게 · 악기 바꿈) → 비틀기(7판째에 크기 단추가 열림 · '크게 = 높게' 함정) → 마무리
//  연습 · 확인 게임에서는 고르기 전에 그림을 숨긴다(소리마다 시작할 때 '?'만 잠깐 반짝 — 반짝이는 시간이 길이를 알려 주지 않게 늘 같은 길이)
//  11-07 평가 2차: 두 번째 소리 자리에 첫 소리와 같은 점선 윤곽을 먼저 그리고 그 위에 채움(바뀐 것 하나만 윤곽에서 벗어나 보이게)
//   답 = 오른쪽 답 묶음에 높이 · 길이 · 크기 셋을 처음부터(크기는 잠가 두었다가 7판째에 엶 — 자리가 밀리지 않게)
//  11-07 평가 3차: 연습은 높이 · 길이 단추 둘만(쓰지 않는 크기 단추 X) · 게임의 크기 단추는 비틀기 판 전까지 보이지 않음(locked)
//   넷째 카드 '높이만 바뀌어요' / 아랫줄 '크기는 그대로' · 듣는 동안 '잘 들어요'(A.busy) · 게임 아래 띠에도 '다시 듣기' · 소리 그림 막대는 transform으로 자람
import { voice, exGroup, nowCard, pal, pose, growBar, slide } from './_snd.js';

const BASE = { p: 67, d: 0.6, v: 0.55 };
const SOFT = 0.16, LOUD = 0.8;                       // 크기 짝 — 압축기에 눌리지 않게 크게도 0.8까지만
const NAME = { pitch: '높이', len: '길이', vol: '크기' };
const ICON = {
  pitch: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8v48M20 20L32 8l12 12M20 44l12 12 12-12" fill="none" stroke="#3B2A1E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  len: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="14" width="18" height="14" rx="7" fill="#C8557A" stroke="#3B2A1E" stroke-width="3.5"/><rect x="6" y="38" width="52" height="14" rx="7" fill="#C8557A" stroke="#3B2A1E" stroke-width="3.5"/></svg>',
  vol: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="13" cy="32" r="7" fill="#C8557A" stroke="#3B2A1E" stroke-width="3.5"/><path d="M24 32h6" stroke="#3B2A1E" stroke-width="3.5" stroke-linecap="round"/><circle cx="46" cy="32" r="15" fill="#C8557A" stroke="#3B2A1E" stroke-width="3.5"/></svg>',
};
const mk = (k, a = {}, b = {}, inst = 'flute') => ({ k, inst, a: { ...BASE, ...a }, b: { ...BASE, ...b } });
const EXAMPLES = [
  { title: '높이가 바뀌어요', sub: '플루트·낮게 → 높게', ...mk('pitch', { p: 62 }, { p: 74 }) },
  { title: '길이가 바뀌어요', sub: '리코더·짧게 → 길게', ...mk('len', { d: 0.3 }, { d: 1.1 }, 'recorder') },
  { title: '크기가 바뀌어요', sub: '바이올린·작게 → 크게', ...mk('vol', { v: SOFT }, { v: LOUD }, 'violin') },
  { title: '높이만 바뀌어요', sub: '크기는 그대로', ...mk('pitch', { p: 79 }, { p: 65 }) },
];
// 확인 게임 판 — 높이 다섯 · 길이 넷 · 크기 셋
const PLAN = [
  // 소개 — 높이 ↔ 길이 · 차이 크게(옥타브 · 0.3 ↔ 1.1초)
  mk('pitch', { p: 60 }, { p: 72 }), mk('len', { d: 0.3 }, { d: 1.1 }), mk('pitch', { p: 76 }, { p: 64 }), mk('len', { d: 1.1 }, { d: 0.3 }),
  // 발전 — 차이를 줄이고 리코더로
  mk('pitch', { p: 67 }, { p: 72 }, 'recorder'), mk('len', { d: 0.4 }, { d: 0.9 }, 'recorder'),
  // 비틀기 — 크기 카드가 옴. 같은 높이인데 크게만(크게 = 높게 함정) → 낮아지는데 크기는 그대로 → 높이 그대로 작게만 …
  mk('vol', { v: SOFT }, { v: LOUD }), mk('pitch', { p: 74 }, { p: 67 }, 'violin'), mk('vol', { p: 72, v: LOUD }, { p: 72, v: SOFT }, 'violin'),
  mk('len', { d: 1.0 }, { d: 0.35 }, 'violin'), mk('pitch', { p: 62 }, { p: 69 }),
  // 마무리 — 낮은 소리가 크게만
  mk('vol', { p: 64, v: SOFT }, { p: 64, v: LOUD }, 'recorder'),
];
const VOL_AT = PLAN.findIndex(x => x.k === 'vol');

// 무엇이 바뀌었는지 한 줄(두 번째 소리 기준)
function say(x) {
  if (x.k === 'pitch') return `높이가 바뀌었어요 — 두 번째 소리가 더 ${x.b.p > x.a.p ? '높아요' : '낮아요'}`;
  if (x.k === 'len') return `길이가 바뀌었어요 — 두 번째 소리가 더 ${x.b.d > x.a.d ? '길어요' : '짧아요'}`;
  return `크기가 바뀌었어요 — 두 번째 소리가 더 ${x.b.v > x.a.v ? '커요' : '작아요'}`;
}

// 소리 그림 — 두 소리를 나란히. 세로 자리 = 높이 · 가로 길이 = 길이 · 굵기 = 크기
function pic(kit) {
  const { h } = kit;
  const half = k => {
    const { el: pill, fill } = growBar(h, 'sp-pill off');
    const ghost = h('div', { class: 'sp-ghost', hidden: true });
    const ask = h('span', { class: 'sp-ask', hidden: true }, '?');
    const field = h('div', { class: 'sp-field' }, ghost, pill, ask);
    return { el: h('div', { class: 'sp-half' }, field, h('span', { class: 'sp-num' }, `${k === 1 ? '첫 번째 소리' : '두 번째 소리'}`)), pill, fill, ghost, ask };
  };
  const A = half(1), B = half(2);
  const note = h('div', { class: 'sp-note', hidden: true });
  const lines = h('div', { class: 'sp-lines', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const el = h('div', { class: 'spic' }, lines, h('span', { class: 'sp-hi' }, '높게'), h('span', { class: 'sp-lo' }, '낮게'), h('div', { class: 'sp-halves' }, A.el, B.el), note);
  const geo = (node, s) => {
    const pos = Math.max(0, Math.min(1, (s.p - 58) / (86 - 58))), hh = Math.round(16 + s.v * 60);
    node.style.bottom = `calc(${(12 + pos * 72).toFixed(1)}% - ${hh / 2}px)`;
    node.style.height = hh + 'px';
    node.style.setProperty('--cap', hh / 2 + 'px');
  };
  const W = d => `${Math.min(92, (d / 1.2) * 88).toFixed(1)}%`;
  return {
    el,
    reset() {
      for (const x of [A, B]) { slide(x.fill, 0); x.pill.style.width = '0'; x.pill.classList.add('off'); x.ghost.hidden = true; x.ask.hidden = true; x.ask.classList.remove('live'); }
      note.hidden = true; el.classList.remove('mk-pitch', 'mk-len', 'mk-vol');
    },
    ask() { for (const x of [A, B]) x.ask.hidden = false; },
    // n번째 소리가 시작함 — '?'를 잠깐 반짝(늘 같은 길이)
    blink(n, T) { const x = n ? B : A; x.ask.classList.add('live'); T.after(260, () => x.ask.classList.remove('live')); },
    // 소리와 함께 자라기(sec = 소리 길이) · sec 0 = 바로 그림 — 상자는 다 자란 길이로 두고 막대가 transform으로 밀려 나옴
    grow(n, s, sec) {
      const x = n ? B : A;
      x.ask.hidden = true;
      geo(x.pill, s);
      x.pill.style.width = W(s.d); x.pill.classList.remove('off');
      slide(x.fill, sec);
    },
    // 두 번째 소리가 나기 전에 그 자리에 첫 소리와 같은 점선 윤곽(같은 높이 · 길이 · 굵기)
    pre(x) { geo(B.ghost, x.a); B.ghost.style.width = W(x.a.d); B.ghost.hidden = false; },
    // 바뀐 것 — 두 번째 칸에 첫 소리 모양을 점선으로 겹쳐 보여 주고 이름 띠
    mark(x, withNote = true) {
      geo(B.ghost, x.a); B.ghost.style.width = W(x.a.d); B.ghost.hidden = false;
      note.replaceChildren(h('span', { class: 'sp-ic', html: ICON[x.k] }), say(x));
      note.hidden = !withNote;
      el.classList.add('mk-' + x.k);
    },
  };
}
// 답 묶음 — 높이 · 길이 · 크기(크기는 잠가 둠)
//  연습 = 높이 · 길이 둘만 · 게임 = 셋(크기는 비틀기 판까지 locked = 보이지 않지만 자리는 지킴)
const answerSet = (kit, onPick, keys = ['pitch', 'len', 'vol']) => kit.answers(keys.map(k => ({ key: k, label: NAME[k], chip: ICON[k], locked: k === 'vol' })), onPick);
const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

// 짝 틀기(둘째 소리 시작 · 끝 시각을 돌려줌)
const playPair = (V, x) => V.play([{ p: x.a.p, d: x.a.d, vel: x.a.v, gap: 0.4 }, { p: x.b.p, d: x.b.d, vel: x.b.v }], { inst: x.inst });


export default {
  // ── 보기: 세 성질을 한 번씩 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('소리 그림에서 높이·길이·크기가 따로 보여요');
    const P = pic(kit);
    const legend = h('div', { class: 'sp-legend' },
      ...[['pitch', '높이 = 위아래'], ['len', '길이 = 가로'], ['vol', '크기 = 굵기']].map(([k, t]) => h('span', {}, h('span', { class: 'sp-ic', html: ICON[k] }), t)));
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard sp-ex' }, h('b', {}, ex.title), h('span', {}, ex.sub));
      onPress(btn, () => {
        T.clear(); V.hush(); P.reset(); nowCard(cards, btn);
        const s = playPair(V, ex);
        T.after(kit.msUntil(s.ac, s.starts[0]), () => P.grow(0, ex.a, ex.a.d));
        T.after(kit.msUntil(s.ac, s.starts[0] + ex.a.d + 0.1), () => P.pre(ex));   // 첫 소리가 끝나면 두 번째 자리에 같은 윤곽
        T.after(kit.msUntil(s.ac, s.starts[1]), () => P.grow(1, ex.b, ex.b.d));
        T.after(kit.msUntil(s.ac, s.end) + 150, () => { P.mark(ex); nowCard(cards, null); });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols sp-cols' }, h('div', { class: 'sp-left' }, P.el, legend), exGroup(kit, cards)));
    requestAnimationFrame(() => { const ex = EXAMPLES[0]; P.grow(0, ex.a, 0); P.pre(ex); P.grow(1, ex.b, 0); P.mark(ex); });   // 처음엔 첫 예시를 그림으로
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) press(cards[k++]); else kit.next(); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 연습: 높이가 바뀌었나, 길이가 바뀌었나 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    const ASK = '무엇이 바뀌었나요? 높이일까요, 길이일까요?';
    ui.say(ASK);
    const P = pic(kit);
    let streak = 0, cur = null, busy = true, last = null;
    const A = answerSet(kit, k => answer(k), ['pitch', 'len']);
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function play(show) {
      busy = true; T.clear(); V.hush(); P.reset();
      if (!show) P.ask();
      const s = playPair(V, cur);
      if (show) {
        T.after(kit.msUntil(s.ac, s.starts[0]), () => P.grow(0, cur.a, cur.a.d));
        T.after(kit.msUntil(s.ac, s.starts[0] + cur.a.d + 0.1), () => P.pre(cur));
        T.after(kit.msUntil(s.ac, s.starts[1]), () => P.grow(1, cur.b, cur.b.d));
        T.after(kit.msUntil(s.ac, s.end), () => P.mark(cur, false));
      } else { T.after(kit.msUntil(s.ac, s.starts[0]), () => P.blink(0, T)); T.after(kit.msUntil(s.ac, s.starts[1]), () => P.blink(1, T)); }
      return s;
    }
    function ask() {
      let k = r() < 0.5 ? 'pitch' : 'len';
      if (last && last.n >= 2 && last.k === k) k = k === 'pitch' ? 'len' : 'pitch';
      last = last && last.k === k ? { k, n: last.n + 1 } : { k, n: 1 };
      if (k === 'pitch') { const iv = [12, 7, 9][Math.floor(r() * 3)], up = r() < 0.5; cur = up ? mk('pitch', { p: 64 }, { p: 64 + iv }) : mk('pitch', { p: 64 + iv }, { p: 64 }); }
      else { const up = r() < 0.5; cur = up ? mk('len', { d: 0.3 }, { d: 1.0 }) : mk('len', { d: 1.0 }, { d: 0.3 }); }
      A.clear(); A.busy(true); ui.say(ASK);
      const s = play(false);
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; A.busy(false); });
    }
    function answer(k) {
      if (busy || !cur) return;
      busy = true;
      const right = k === cur.k;
      P.grow(0, cur.a, 0.3); P.grow(1, cur.b, 0.3); P.mark(cur, false);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        A.mark(k, 'right'); ui.tell('맞아요', 'good');
        ui.say(say(cur));
        if (streak >= 3) { kit.pass(); return; }
        T.after(1600, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        A.mark(k, 'wrong'); A.btn(cur.k).classList.add('right');
        ui.tell('다시 들어 봐요', 'oops', 2400);
        ui.say(say(cur).split(' — ')[0] + ' — 그림을 보며 다시 들어요');
        T.after(1600, () => { const s = play(true); T.after(kit.msUntil(s.ac, s.end) + 1200, ask); });
      }
    }
    onPress(again, () => { if (!busy && cur) { A.busy(true); const s = play(false); T.after(kit.msUntil(s.ac, s.end), () => { busy = false; A.busy(false); }); } });
    ui.stage.append(h('div', { class: 'sp-follow' }, P.el, A.el));
    T.after(450, ask);
    kit.setAuto(() => { if (!busy && cur) answer(cur.k); });
    const onKey = e => { if (e.repeat) return; const k = { 1: 'pitch', 2: 'len' }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 무엇이 바뀌었나 — 12판 · 7판째부터 크기 단추 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [], picks = [];
    let i = -1, cur = null, open = false, gone = false, volOpen = false, listen = 0;
    ui.say('두 소리를 듣고, 바뀐 것 하나를 골라요');
    const P = pic(kit);
    const bunny = h('div', { class: 'g5-bunny' }, pal(kit, 'bunny'));
    const A = answerSet(kit, k => answer(k));
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '무엇이 바뀌었나?'),
      h('p', { class: 'sub' }, '높이·길이·크기 가운데 바뀐 것 하나를 12번 골라요', h('br'), '크기 단추는 중간에 나와요'),
      h('p', { class: 'sub' }, '키보드 ', h('span', { class: 'kbd' }, '1'), ' ', h('span', { class: 'kbd' }, '2'), ' ', h('span', { class: 'kbd' }, '3'), ' 도 돼요')));
    ui.stage.append(h('div', { class: 'g5-wrap' }, bunny, P.el, A.el), start);
    const setP = p => pose(kit, bunny.firstChild, 'bunny', p);
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    const again = h('button', { type: 'button' }, '다시 듣기');
    onPress(startBtn, () => { start.remove(); ui.setBar(again); T.after(300, next); });
    onPress(again, () => { if (open) hear(); });       // 고르기 전이면 언제든 한 번 더(놓침 시계도 다시)
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) press(startBtn); else if (open) answer(cur.k); });

    // 두 소리 듣기(처음 · 다시 듣기) — 두 번째 소리가 나오면 고를 수 있음 · 그림은 고른 뒤에만
    function hear() {
      const my = ++listen;
      open = false; A.busy(true); V.hush();            // 앞 소리가 아직 울려도 겹치지 않게
      P.reset(); P.ask();
      const s = playPair(V, cur);
      T.after(kit.msUntil(s.ac, s.starts[0]), () => { if (my === listen) P.blink(0, T); });
      T.after(kit.msUntil(s.ac, s.starts[1]), () => { if (my !== listen || gone) return; P.blink(1, T); open = true; A.busy(false); });
      T.after(kit.msUntil(s.ac, s.end) + 3500, () => { if (my === listen && open) answer(null); });   // 3.5초 넘게 고르지 않으면 놓침
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      cur = PLAN[i];
      ui.count(i + 1, PLAN.length);
      A.clear(); setP('idle');
      P.reset(); P.ask();
      open = false; A.busy(true);
      let wait = 350;
      if (i === VOL_AT) {                             // 비틀기 — 크기 단추가 나타남(자리는 처음부터 있었음)
        volOpen = true; A.lock('vol', false);
        A.btn('vol').animate([{ transform: 'scale(.7)' }, { transform: 'scale(1.05)', offset: 0.7 }, { transform: 'none' }], { duration: 360, easing: 'ease-out' });
        ui.tell('크기 단추가 나왔어요', 'info', 1800);
        wait = 1900;
      }
      T.after(wait, () => { if (!gone) hear(); });
    }
    function answer(k) {
      if (!open) return;
      if (k === 'vol' && !volOpen) return;
      open = false; listen++;
      const right = k === cur.k;
      results.push(right); picks.push(k);
      P.grow(0, cur.a, 0.3); P.grow(1, cur.b, 0.3); P.mark(cur);
      if (right) { kit.sfx.good(engine); setP('happy'); A.mark(k, 'right'); ui.tell('맞아요', 'good'); T.after(1150, next); }
      else {
        kit.sfx.oops(engine); setP('oops');
        if (k != null) A.mark(k, 'wrong');
        A.btn(cur.k).classList.add('right');
        ui.tell(k == null ? '놓쳤어요' : '삐끗', 'oops', 2000);
        // 그림을 보며 한 번 더 듣고 다음 판
        T.after(1300, () => {
          if (gone) return;
          const x = cur, s = playPair(V, x);
          T.after(kit.msUntil(s.ac, s.starts[0]), () => P.grow(0, x.a, x.a.d));
          T.after(kit.msUntil(s.ac, s.starts[1]), () => P.grow(1, x.b, x.b.d));
          T.after(kit.msUntil(s.ac, s.end) + 700, next);
        });
      }
    }
    function end() {
      open = false; listen++; ui.tell(null); A.clear(); A.busy(false); ui.setBar(); setP('happy');
      const s = kit.scoreChoices(results, 5);
      const count = (want, got) => PLAN.filter((x, k) => x.k === want && picks[k] === got).length;
      const volAsPitch = count('vol', 'pitch'), pitchAsVol = count('pitch', 'vol'), mixPL = count('pitch', 'len') + count('len', 'pitch');
      const skipped = picks.filter(p => p == null).length, wrong = results.filter(x => !x).length;
      let tip;
      if (!wrong) tip = '높이·길이·크기 가운데 바뀐 하나를 모두 찾았어요. 크게 바뀐 소리를 높이로 헷갈리지 않았어요.';
      else if (volAsPitch && volAsPitch >= pitchAsVol && volAsPitch >= mixPL) tip = `크기만 바뀐 소리를 ‘높이’로 고른 적이 ${volAsPitch}번 있었어요. 크게 내도 높아지지는 않아요.`;
      else if (pitchAsVol && pitchAsVol >= mixPL) tip = `높이만 바뀐 소리를 ‘크기’로 고른 적이 ${pitchAsVol}번 있었어요. 낮아져도 작아지지는 않아요.`;
      else if (mixPL) tip = `높이와 길이를 바꿔 고른 적이 ${mixPL}번 있었어요. 소리 그림에서 위아래는 높이, 가로는 길이예요.`;
      else if (skipped) tip = `고르지 않고 지나간 판이 ${skipped}번 있었어요. 두 번째 소리가 끝나면 바로 골라 봐요.`;
      else tip = '크기 단추가 나온 뒤(7번째부터) 헷갈렸어요. 소리 그림의 굵기를 떠올려 봐요.';
      T.after(600, () => { bunny.style.visibility = 'hidden'; ui.count(null); kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip }); });
    }
    const onKey = e => { if (e.repeat) return; const k = { 1: 'pitch', 2: 'len', 3: 'vol' }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};
