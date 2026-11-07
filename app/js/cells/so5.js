// 소5 한 가지만 바뀌는 짝 — 두 소리 가운데 정확히 하나(높이 · 길이 · 크기)만 다르다. 무엇이 바뀌었는지 이름 붙이기.
//  근거: '높낮이 ↔ 길이' 구분과 '크게 = 높게' 오개념은 하나만 바뀌는 짝을 견줘야 갈린다(계획서 칸 표 · so5 까닭).
//  소리 그림(세 성질을 한 그림에): 세로 자리 = 높이 · 가로 길이 = 길이 · 굵기 = 크기(계획서 '화면 약속').
//  보기: 세 성질을 한 번씩 + '낮아져도 크기는 그대로'(앞 칸 so1~so4를 건너뛴 아이도 여기서 세 이름을 만난다)
//  따라 하기: 높이 ↔ 길이 둘만(가장 헷갈리는 짝) · 세 번 이어서 맞히면 지남
//  확인 게임: 12판 — 소개(높이 ↔ 길이 · 차이 크게) → 발전(차이 작게 · 악기 바꿈) → 비틀기(7판째에 크기 카드가 옴 · '크게 = 높게' 함정) → 마무리
//  따라 하기 · 확인 게임에서는 고르기 전에 그림을 숨긴다(소리마다 시작할 때 '?'만 잠깐 반짝 — 반짝이는 시간이 길이를 알려 주지 않게 늘 같은 길이)
import { voice } from './_snd.js';

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
  { title: '높이가 바뀌어요', sub: '플루트 · 낮게 → 높게', ...mk('pitch', { p: 62 }, { p: 74 }) },
  { title: '길이가 바뀌어요', sub: '리코더 · 짧게 → 길게', ...mk('len', { d: 0.3 }, { d: 1.1 }, 'recorder') },
  { title: '크기가 바뀌어요', sub: '바이올린 · 작게 → 크게', ...mk('vol', { v: SOFT }, { v: LOUD }, 'violin') },
  { title: '낮아져도 크기는 그대로', sub: '플루트 · 높게 → 낮게', ...mk('pitch', { p: 79 }, { p: 65 }) },
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

// 무엇이 바뀌었는지 한 줄(둘째 소리 기준)
function say(x) {
  if (x.k === 'pitch') return `높이가 바뀌었어요 — 둘째 소리가 더 ${x.b.p > x.a.p ? '높아요' : '낮아요'}`;
  if (x.k === 'len') return `길이가 바뀌었어요 — 둘째 소리가 더 ${x.b.d > x.a.d ? '길어요' : '짧아요'}`;
  return `크기가 바뀌었어요 — 둘째 소리가 더 ${x.b.v > x.a.v ? '커요' : '작아요'}`;
}

// 소리 그림 — 두 소리를 나란히. 세로 자리 = 높이 · 가로 길이 = 길이 · 굵기 = 크기
function pic(kit) {
  const { h } = kit;
  const half = k => {
    const pill = h('div', { class: 'sp-pill off' });
    const ghost = h('div', { class: 'sp-ghost', hidden: true });
    const ask = h('span', { class: 'sp-ask', hidden: true }, '?');
    const field = h('div', { class: 'sp-field' }, ghost, pill, ask);
    return { el: h('div', { class: 'sp-half' }, field, h('span', { class: 'sp-num' }, `${k === 1 ? '첫째 소리' : '둘째 소리'}`)), pill, ghost, ask };
  };
  const A = half(1), B = half(2);
  const note = h('div', { class: 'sp-note', hidden: true });
  const lines = h('div', { class: 'sp-lines', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const el = h('div', { class: 'spic' }, lines, h('span', { class: 'sp-hi' }, '높게'), h('span', { class: 'sp-lo' }, '낮게'), h('div', { class: 'sp-halves' }, A.el, B.el), note);
  const geo = (node, s) => {
    const pos = Math.max(0, Math.min(1, (s.p - 58) / (86 - 58))), hh = Math.round(16 + s.v * 60);
    node.style.bottom = `calc(${(12 + pos * 72).toFixed(1)}% - ${hh / 2}px)`;
    node.style.height = hh + 'px';
  };
  const W = d => `${Math.min(92, (d / 1.2) * 88).toFixed(1)}%`;
  return {
    el,
    reset() {
      for (const x of [A, B]) { x.pill.style.transition = 'none'; x.pill.style.width = '0'; x.pill.classList.add('off'); x.ghost.hidden = true; x.ask.hidden = true; x.ask.classList.remove('live'); }
      note.hidden = true; el.classList.remove('mk-pitch', 'mk-len', 'mk-vol');
    },
    ask() { for (const x of [A, B]) x.ask.hidden = false; },
    // n번째 소리가 시작함 — '?'를 잠깐 반짝(늘 같은 길이)
    blink(n, T) { const x = n ? B : A; x.ask.classList.add('live'); T.after(260, () => x.ask.classList.remove('live')); },
    // 소리와 함께 자라기(sec = 소리 길이) · sec 0 = 바로 그림
    grow(n, s, sec) {
      const x = n ? B : A;
      x.ask.hidden = true;
      geo(x.pill, s);
      x.pill.style.transition = 'none'; x.pill.style.width = '0'; x.pill.classList.remove('off');
      void x.pill.offsetWidth;
      x.pill.style.transition = `width ${sec}s linear`;
      x.pill.style.width = W(s.d);
    },
    // 바뀐 것 — 둘째 칸에 첫째 소리 모양을 점선으로 겹쳐 보여 주고 이름 띠
    mark(x, withNote = true) {
      geo(B.ghost, x.a); B.ghost.style.width = W(x.a.d); B.ghost.hidden = false;
      note.replaceChildren(h('span', { class: 'sp-ic', html: ICON[x.k] }), say(x));
      note.hidden = !withNote;
      el.classList.add('mk-' + x.k);
    },
  };
}
const card = (kit, k, big) => kit.h('button', { type: 'button', class: 'sp-card' + (big ? ' g5' : ''), 'data-k': k },
  kit.h('span', { class: 'sp-ic', html: ICON[k] }), NAME[k]);

// 짝 틀기(둘째 소리 시작 · 끝 시각을 돌려줌)
const playPair = (V, x) => V.play([{ p: x.a.p, d: x.a.d, vel: x.a.v, gap: 0.4 }, { p: x.b.p, d: x.b.d, vel: x.b.v }], { inst: x.inst });

export default {
  // ── 보기: 세 성질을 한 번씩 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('소리 그림에서 높이 · 길이 · 크기가 따로 보여요');
    const P = pic(kit);
    const legend = h('div', { class: 'sp-legend' },
      ...[['pitch', '높이 = 위아래'], ['len', '길이 = 가로'], ['vol', '크기 = 굵기']].map(([k, t]) => h('span', {}, h('span', { class: 'sp-ic', html: ICON[k] }), t)));
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard sp-ex' }, h('b', {}, ex.title), h('span', {}, ex.sub));
      onPress(btn, () => {
        T.clear(); V.hush(); P.reset();
        const s = playPair(V, ex);
        T.after(kit.msUntil(s.ac, s.starts[0]), () => P.grow(0, ex.a, ex.a.d));
        T.after(kit.msUntil(s.ac, s.starts[1]), () => P.grow(1, ex.b, ex.b.d));
        T.after(kit.msUntil(s.ac, s.end) + 150, () => P.mark(ex));
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols sp-cols' }, h('div', { class: 'sp-left' }, P.el, legend), h('div', { class: 'exgrid' }, ...cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 따라 하기: 높이가 바뀌었나, 길이가 바뀌었나 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('무엇이 바뀌었나요? 높이일까요, 길이일까요?');
    const P = pic(kit);
    let streak = 0, cur = null, busy = true, last = null;
    const msg = h('p', { class: 'fmsg' });
    const pitchBtn = card(kit, 'pitch'), lenBtn = card(kit, 'len');
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    function play(show) {
      busy = true; T.clear(); V.hush(); P.reset();
      if (!show) P.ask();
      const s = playPair(V, cur);
      if (show) { T.after(kit.msUntil(s.ac, s.starts[0]), () => P.grow(0, cur.a, cur.a.d)); T.after(kit.msUntil(s.ac, s.starts[1]), () => P.grow(1, cur.b, cur.b.d)); T.after(kit.msUntil(s.ac, s.end), () => P.mark(cur, false)); }
      else { T.after(kit.msUntil(s.ac, s.starts[0]), () => P.blink(0, T)); T.after(kit.msUntil(s.ac, s.starts[1]), () => P.blink(1, T)); }
      return s;
    }
    function ask() {
      let k = r() < 0.5 ? 'pitch' : 'len';
      if (last && last.n >= 2 && last.k === k) k = k === 'pitch' ? 'len' : 'pitch';
      last = last && last.k === k ? { k, n: last.n + 1 } : { k, n: 1 };
      if (k === 'pitch') { const iv = [12, 7, 9][Math.floor(r() * 3)], up = r() < 0.5; cur = up ? mk('pitch', { p: 64 }, { p: 64 + iv }) : mk('pitch', { p: 64 + iv }, { p: 64 }); }
      else { const up = r() < 0.5; cur = up ? mk('len', { d: 0.3 }, { d: 1.0 }) : mk('len', { d: 1.0 }, { d: 0.3 }); }
      msg.textContent = '';
      const s = play(false);
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; });
    }
    function answer(k) {
      if (busy || !cur) return;
      busy = true;
      const right = k === cur.k;
      P.grow(0, cur.a, 0.3); P.grow(1, cur.b, 0.3); P.mark(cur, false);   // 글은 아래 한 줄(fmsg)에
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = '맞아요. ' + say(cur);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1500, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = say(cur).split(' — ')[0] + '. 그림을 보며 다시 들어 봐요';
        T.after(1600, () => { const s = play(true); T.after(kit.msUntil(s.ac, s.end) + 1200, ask); });
      }
    }
    onPress(pitchBtn, () => answer('pitch')); onPress(lenBtn, () => answer('len'));
    onPress(again, () => { if (!busy && cur) { const s = play(false); T.after(kit.msUntil(s.ac, s.end), () => { busy = false; }); } });
    ui.stage.append(h('div', { class: 'cols sp-cols' }, h('div', { class: 'sp-left' }, P.el), h('div', { class: 'pickcol' }, pitchBtn, lenBtn, h('div', { class: 'row' }, again, dots), msg)));
    T.after(450, ask);
    kit.setAuto(() => { if (!busy && cur) answer(cur.k); });
    const onKey = e => { if (e.repeat) return; if (e.key === '1') answer('pitch'); else if (e.key === '2') answer('len'); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 무엇이 바뀌었나 — 12판 · 7판째부터 크기 카드 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [], picks = [];
    let i = -1, cur = null, open = false, gone = false;
    ui.say('');
    const P = pic(kit);
    const bunny = h('div', { class: 'g5-bunny' }, kit.friendImg('bunny', 'idle', { label: false }));
    const cards = { pitch: card(kit, 'pitch', true), len: card(kit, 'len', true), vol: card(kit, 'vol', true) };
    cards.vol.hidden = true;
    const row = h('div', { class: 'g5-cards' }, cards.pitch, cards.len, cards.vol);
    const counter = h('div', { class: 'g5-count' });
    const word = h('div', { class: 'g5-word' });
    const banner = h('div', { class: 'g5-banner', hidden: true }, h('span', { class: 'sp-ic', html: ICON.vol }), '새 카드 — 크기');
    const scene = h('div', { class: 'g5-scene' }, h('div', { class: 'g5-mid' }, bunny, P.el), row, counter, word, banner);
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '무엇이 바뀌었나?'),
      h('p', { class: 'sub' }, '두 소리를 듣고, 바뀐 것 하나를 골라요'),
      h('p', { class: 'sub' }, '12번 · 중간에 새 카드가 하나 와요 · 키보드 1 2 3 도 돼요')));
    ui.stage.append(scene, start);
    const pose = p => kit.setPose(bunny.firstChild, 'bunny', p);
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(); T.after(300, next); });
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) startBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else if (open) answer(cur.k); });

    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      cur = PLAN[i];
      counter.textContent = `${i + 1} / ${PLAN.length}`;
      word.textContent = ''; pose('idle');
      P.reset(); P.ask();
      open = false;
      let wait = 350;
      if (i === VOL_AT) {                             // 비틀기 — 크기 카드가 옴
        cards.vol.hidden = false; cards.vol.classList.add('new');
        banner.hidden = false;
        T.after(1700, () => { banner.hidden = true; });
        wait = 1900;
      }
      T.after(wait, () => {
        if (gone) return;
        const s = playPair(V, cur);
        T.after(kit.msUntil(s.ac, s.starts[0]), () => P.blink(0, T));
        T.after(kit.msUntil(s.ac, s.starts[1]), () => { P.blink(1, T); open = true; });
        T.after(kit.msUntil(s.ac, s.end) + 3500, () => { if (open) answer(null); });   // 3.5초 넘게 고르지 않으면 놓침
      });
    }
    function answer(k) {
      if (!open) return;
      if (k === 'vol' && cards.vol.hidden) return;
      open = false;
      const right = k === cur.k;
      results.push(right); picks.push(k);
      cards.vol.classList.remove('new');
      P.grow(0, cur.a, 0.3); P.grow(1, cur.b, 0.3); P.mark(cur);
      if (right) { kit.sfx.good(engine); pose('happy'); word.textContent = '좋아'; word.dataset.k = 'good'; T.after(1150, next); }
      else {
        kit.sfx.oops(engine); pose('oops'); word.textContent = k == null ? '놓쳤어요' : '삐끗'; word.dataset.k = 'oops';
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
      open = false; word.textContent = ''; pose('happy');
      const s = kit.scoreChoices(results, 5);
      const count = (want, got) => PLAN.filter((x, k) => x.k === want && picks[k] === got).length;
      const volAsPitch = count('vol', 'pitch'), pitchAsVol = count('pitch', 'vol'), mixPL = count('pitch', 'len') + count('len', 'pitch');
      const skipped = picks.filter(p => p == null).length, wrong = results.filter(x => !x).length;
      let tip;
      if (!wrong) tip = '높이 · 길이 · 크기 가운데 바뀐 하나를 모두 찾았어요. 크게 바뀐 소리를 높이로 헷갈리지 않았어요.';
      else if (volAsPitch && volAsPitch >= pitchAsVol && volAsPitch >= mixPL) tip = `크기만 바뀐 소리를 '높이'로 고른 적이 ${volAsPitch}번 있었어요. 크게 내도 높아지지는 않아요.`;
      else if (pitchAsVol && pitchAsVol >= mixPL) tip = `높이만 바뀐 소리를 '크기'로 고른 적이 ${pitchAsVol}번 있었어요. 낮아져도 작아지지는 않아요.`;
      else if (mixPL) tip = `높이와 길이를 바꿔 고른 적이 ${mixPL}번 있었어요. 소리 그림에서 위아래는 높이, 가로는 길이예요.`;
      else if (skipped) tip = `고르지 않고 지나간 판이 ${skipped}번 있었어요. 둘째 소리가 끝나면 바로 골라 봐요.`;
      else tip = '크기 카드가 온 뒤(7번째부터) 헷갈렸어요. 소리 그림의 굵기를 떠올려 봐요.';
      T.after(600, () => kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip }));
    }
    for (const k of Object.keys(cards)) onPress(cards[k], () => answer(k));
    const onKey = e => { if (e.repeat) return; const k = { 1: 'pitch', 2: 'len', 3: 'vol' }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};
