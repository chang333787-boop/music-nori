// 소3 길게·짧게 — 길이는 늘 가로 길이로(계획서 '화면 약속'). 소리가 나는 동안 막대가 가로로 자란다.
//  길이만 바꾼다: 한 짝 안에서 높이 · 세기 · 악기 · 연주법(들어가고 끝나는 모양 — _snd.js stacc)을 같게.
//  실로폰 · 피아노처럼 저절로 사라지는 소리는 길이가 안 들려 쓰지 않는다 — 플루트 · 리코더 · 목소리 · 바이올린(이어지는 소리)만.
//  근거: 아이는 소리를 못 듣는 게 아니라 이름을 못 붙인다. 길이는 높낮이와 함께 가장 약한 성질이라(Taebel 1974)
//  몸으로 늘이기(긴 소리 = 팔을 쭉 · 짧은 소리 = 톡)를 그림 옆에 붙여 보여 준다.
//  보기: 예시 넷(악기 넷 · 짧게→길게 / 길게→짧게) → 연습: 세 번 이어서 맞히면 지남 → 확인 게임 '다람쥐 기차' 12판
//  연습 · 확인 게임에서는 소리가 나는 동안 길이를 그림으로 보여 주지 않는다(막대가 자라면 귀 대신 눈으로 풀게 됨) — 고른 뒤에 막대로 보여 줌.
//  11-07 평가 2차: 연습 판 = 보기와 같은 길이 줄(들은 소리가 한 줄씩 쌓여 견줄 수 있게) · 답은 오른쪽 답 묶음 · 길잡이 토끼는 판 밖
//   게임 = 코덱스 그림 기차(기관차 · 긴 칸 창 6 · 짧은 칸 창 2 + 지붕 자리 4) · 다람쥐는 손님
//  11-07 평가 3차: 다람쥐는 땅 위 승강장에서 기다림(하늘에 뜨지 않게) · 듣는 동안 답 묶음 '잘 들어요'(A.busy) · 게임 아래 띠에도 '다시 듣기'
//   게임도 연습처럼 소리를 들어야 고를 수 있음(짧은 소리는 끝까지 · 긴 소리는 0.65초) · 막대는 transform으로 자람(_snd.js growBar)
import { voice, exGroup, nowCard, pal, pose, growBar, slide, pop } from './_snd.js';
import { factTip, stageCuts } from '../cellkit.js';
import { tvsGame } from './_tvs.js';

const MAXD = 1.5;                                     // 줄 끝까지 = 1.5초
const LONG = 0.6;                                     // 이보다 길면 '긴 소리'
const isLong = d => d >= LONG;
const EXAMPLES = [
  { inst: 'flute', name: '플루트', p: 72, a: 0.25, b: 1.2 },
  { inst: 'recorder', name: '리코더', p: 67, a: 1.2, b: 0.25 },
  { inst: 'choir', name: '목소리', p: 64, a: 0.3, b: 1.2 },
  { inst: 'violin', name: '바이올린', p: 69, a: 1.2, b: 0.3 },
];
// 확인 게임 문항 표(X2 · 단계 꼬리표) — 줄 하나 = { stage, d(길이 초), inst, p(높이), right('long' | 'short') } · 긴 소리 여섯 · 짧은 소리 여섯(칸마다 자리 여섯)
//  길이는 단계마다 정한 짝(LEN)에서만 — 뒤집으면 같은 단계의 반대 길이(차이 크기 · 악기 · 높이는 그대로)
const LEN = { intro: [1.2, 0.25], grow: [0.8, 0.35], twist: [0.9, 0.3], end: [1.0, 0.3] };
const row = (stage, long, inst, p) => { const d = LEN[stage][long ? 0 : 1]; return { stage, d, inst, p, right: isLong(d) ? 'long' : 'short' }; };
export const PLAN = [
  // 소개 — 아주 긴 소리 ↔ 아주 짧은 소리(플루트 · 같은 솔)
  row('intro', true, 'flute', 67), row('intro', false, 'flute', 67), row('intro', false, 'flute', 67), row('intro', true, 'flute', 67),
  // 발전 — 차이를 줄임(0.8초 ↔ 0.35초) · 리코더
  row('grow', false, 'flute', 67), row('grow', true, 'flute', 67), row('grow', true, 'recorder', 67), row('grow', false, 'recorder', 67),
  // 비틀기 — 악기 · 높이가 바뀌어도 길이만(높고 긴 · 낮고 짧은 · 높고 짧은)
  row('twist', true, 'violin', 79), row('twist', false, 'choir', 60), row('twist', false, 'violin', 81),
  // 마무리 — 낮고 긴 소리
  row('end', true, 'recorder', 60),
];
export const CUTS = stageCuts(PLAN);             // 단계 경계 [4, 8, 11] — 섞어도 '9번째부터' 말이 그대로 맞게
// 단계 안 섞기(N2) — 뒤집기 = 같은 단계 짝의 반대 길이(높고 긴 ↔ 높고 짧은) · 답 = 긴 소리인가
export const SHUF = { flip: p => row(p.stage, p.right !== 'long', p.inst, p.p), answerOf: p => p.right };
export const GUESS = plan => plan.map(() => 1 / 2);   // 찍기 바닥 — 긴 · 짧은 둘 중 하나
// 답 단추는 짧은 소리든 긴 소리든 소리 시작 0.65초 뒤에 똑같이 열림 — 화면만 보고 길이를 알 수 없게(N2 · 소리 끈 봇이 찾은 틈)
// 결과 한 줄 — 사실만(N1): 갈래 말은 그 갈래가 틀린 판(시간 지남 뺌)의 2/3를 넘고 3번 이상일 때만
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.stage === 'twist' || p.stage === 'end'), text: '악기와 높이가 바뀐 소리(9번째부터)에서 헷갈렸어요. 높이 말고 소리가 이어지는 동안만 들어 봐요.' },
    { n: miss(p => p.stage === 'grow'), text: '길이 차이가 줄었을 때(5~8번째) 헷갈렸어요. 소리가 나는 동안 팔을 쭉 펴 보면 잘 느껴져요.' },
    { n: miss(p => p.right === 'long'), text: '긴 소리를 짧은 칸에 더 많이 넣었어요. 소리가 끝날 때까지 기다렸다가 골라요.' },
    { n: miss(p => p.right === 'short'), text: '짧은 소리를 긴 칸에 더 많이 넣었어요. 톡 하고 바로 끝나면 짧은 소리예요.' },
  ], '악기와 높이가 바뀌어도 길이만 듣고 골랐어요.');
}
const pct = d => Math.min(100, (d / MAXD) * 100);
const SCENE = 'app/img/scene/';

// 몸 동작 말 — 막대 위에 붙인다
const BODY = d => (isLong(d) ? '길게 — 쭈욱' : '짧게 — 톡');
// 막대 아이콘(답 단추 · 예시 카드) — 짧은 막대 / 긴 막대
const barIcon = (kit, long) => kit.h('span', { class: 'ln-icon ' + (long ? 'l' : 's'), 'aria-hidden': 'true' }, kit.h('i'));
const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
const keyPick = e => ({ ArrowLeft: 'long', ArrowUp: 'long', 1: 'long', ArrowRight: 'short', ArrowDown: 'short', 2: 'short' })[e.key];

// 가로 길이 줄 — 줄마다 막대 하나 · 막대 위에 몸 동작 말 · 고르기 전에는 막대 시작 자리에 '?'
function lanes(kit, n, { nums = false } = {}) {
  const { h } = kit;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const { el: bar, fill } = growBar(h, 'ln-bar off');
    const tag = h('span', { class: 'ln-tag' });
    const ask = h('span', { class: 'ln-ask', hidden: true }, '?');
    const track = h('div', { class: 'ln-track' }, bar, tag, ask);
    rows.push({ el: h('div', { class: 'ln-row' }, nums ? h('span', { class: 'ln-num' }, `${i + 1}`) : null, track), bar, fill, tag, ask, track });
  }
  const el = h('div', { class: 'lanes n' + n + (nums ? ' nums' : '') }, ...rows.map(r => r.el));
  const clearRow = r => { slide(r.fill, 0); r.bar.style.width = '0'; r.bar.classList.add('off'); r.tag.textContent = ''; r.tag.classList.remove('on'); r.ask.hidden = true; r.ask.classList.remove('live'); r.el.classList.remove('cur'); };
  const tagOn = (r, d) => { r.tag.textContent = BODY(d); r.tag.classList.add('on'); };
  return {
    el,
    reset() { rows.forEach(clearRow); },
    clear(i) { clearRow(rows[i]); },
    // 소리와 함께 자라기(sec = 자라는 시간) — 다 자라면 몸 동작 말
    grow(i, d, sec = d, T = null) {
      const r = rows[i];
      r.ask.hidden = true; r.ask.classList.remove('live');
      r.bar.style.width = pct(d) + '%'; r.bar.classList.remove('off');
      slide(r.fill, sec);                             // 다 자란 길이 상자 안에서 막대가 소리와 함께 밀려 나옴
      r.tag.classList.remove('on');
      if (T) T.after(sec * 1000 + 60, () => tagOn(r, d)); else tagOn(r, d);
    },
    // 바로 그림(지난 소리)
    set(i, d) { const r = rows[i]; clearRow(r); r.bar.classList.remove('off'); r.bar.style.width = pct(d) + '%'; tagOn(r, d); },   // 바로 그림
    ask(i) { const r = rows[i]; clearRow(r); r.ask.hidden = false; r.el.classList.add('cur'); },
    // 소리가 나는 동안 '?'가 또렷해짐(늘 같은 모양 — 길이를 알려 주지 않음)
    live(i, on) { rows[i].ask.classList.toggle('live', on); },
    rows,
  };
}

// ── 소리는 TV 하나 · 답은 각자(_tvs.js) — 판마다 소리 하나(0.3초 뒤) · 답은 소리 시작 0.65초 뒤 · 가장 긴 소리(1.2초) 끝 + 3.5초에 닫힘
//  긴 소리든 짧은 소리든 같은 시간표(답 열림 · 닫힘으로 길이가 새지 않게) · 소리가 나는 동안 TV 화면에도 길이를 그리지 않음(고른 뒤 막대로)
export const TVS = true;
const TVS_OPEN = 300 + (LONG + 0.05) * 1000, TVS_CLOSE = 300 + Math.max(...Object.values(LEN).flat()) * 1000 + 3500;
export const tvsSpec = (ui, kit) => ({
  plan: sd => kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF),
  P: TVS_CLOSE + 800, OPEN: TVS_OPEN, CLOSE: TVS_CLOSE,
  say: { kid: 'TV 소리를 듣고 — 긴 소리일까요, 짧은 소리일까요?', tv: '소리는 TV에서 — 아이들은 각자 기기로 골라요' },
  items: [
    { key: 'long', label: '긴 소리', chip: barIcon(kit, true) },
    { key: 'short', label: '짧은 소리', chip: barIcon(kit, false) },
  ],
  rightOf: p => p.right,
  view({ V, T, side }) {
    const { h } = kit;
    const ln = lanes(kit, 1);
    const sq = h('div', { class: 'ln-pal' }, h('img', { src: SCENE + 'prop_squirrel.webp', alt: '', draggable: 'false' }));
    return {
      el: h('div', { class: 'ln-follow tvs3' }, sq, ln.el, side),
      item: () => ln.ask(0),
      play: (p, at) => V.play([{ p: p.p, d: p.d }], { inst: p.inst, at }),
      close: p => ln.grow(0, p.d, 0.35, T),
      done: () => { sq.hidden = true; },
    };
  },
  tip: tipOf, chance: GUESS,
});

export default {
  // ── 보기: 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('소리가 길면 막대가 길게, 짧으면 짧게 자라요');
    const ln = lanes(kit, 2, { nums: true });
    const bunny = h('div', { class: 'ln-pal' }, pal(kit, 'bunny'));
    const setP = p => pose(kit, bunny.firstChild, 'bunny', p);
    const cards = EXAMPLES.map(ex => {
      const up = ex.b > ex.a;
      const btn = h('button', { type: 'button', class: 'excard' },
        h('b', {}, ex.name),
        h('span', { class: 'ln-pair' }, barIcon(kit, !up), up ? '짧게 → 길게' : '길게 → 짧게', barIcon(kit, up)));
      onPress(btn, () => {
        T.clear(); V.hush();
        ln.reset(); nowCard(cards, btn);
        const s = V.play([{ p: ex.p, d: ex.a, gap: 0.5 }, { p: ex.p, d: ex.b }], { inst: ex.inst });
        T.after(kit.msUntil(s.ac, s.starts[0]), () => { ln.grow(0, ex.a, ex.a, T); setP('play'); });
        T.after(kit.msUntil(s.ac, s.starts[1]), () => ln.grow(1, ex.b, ex.b, T));
        T.after(kit.msUntil(s.ac, s.end) + 200, () => { setP('happy'); nowCard(cards, null); });
        btn.classList.add('heard');
      });
      return btn;
    });
    const hint = h('p', { class: 'ln-hint' }, '몸으로 따라 해요: 긴 소리는 팔을 쭉, 짧은 소리는 손뼉 톡');
    ui.stage.append(h('div', { class: 'ln-show' }, hint, h('div', { class: 'ln-main' }, bunny, ln.el, exGroup(kit, cards))));
    ln.set(0, EXAMPLES[0].a); ln.set(1, EXAMPLES[0].b);   // 처음엔 첫 예시(짧게 → 길게)를 그림으로
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) press(cards[k++]); else kit.next(); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 연습: 이 소리는 길어요? 짧아요? — 들은 소리가 한 줄씩 쌓인다 · 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    const ASK = '이 소리는 길어요, 짧아요?';
    ui.say(ASK);
    const N = 3, ln = lanes(kit, N);
    const bunny = h('div', { class: 'ln-pal' }, pal(kit, 'bunny'));
    const setP = p => pose(kit, bunny.firstChild, 'bunny', p);
    let streak = 0, cur = null, busy = true, last = null;
    const hist = [];                                  // 지난 소리 길이(위에서부터)
    const A = kit.answers([
      { key: 'long', label: '길어요', chip: barIcon(kit, true) },
      { key: 'short', label: '짧아요', chip: barIcon(kit, false) },
    ], k => answer(k === 'long'));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    const row = () => hist.length - 1;
    // 소리 하나 — show = 막대를 보며 듣기(틀린 뒤 다시 들려줄 때)
    function play(show) {
      busy = true; T.clear(); V.hush();
      if (!show) ln.ask(row());
      const s = V.play([{ p: cur.p, d: cur.d }], { inst: 'flute' });
      if (show) T.after(kit.msUntil(s.ac, s.starts[0]), () => ln.grow(row(), cur.d, cur.d, T));
      else { T.after(kit.msUntil(s.ac, s.starts[0]), () => { ln.live(row(), true); setP('play'); }); T.after(kit.msUntil(s.ac, s.ends[0]), () => { ln.live(row(), false); setP('idle'); }); }
      return s;
    }
    function ask() {
      // 같은 길이가 세 번 넘게 이어지지 않게
      let long = r() < 0.5;
      if (last && last.n >= 2 && last.long === long) long = !long;
      last = last && last.long === long ? { long, n: last.n + 1 } : { long, n: 1 };
      cur = { d: long ? [1.2, 1.0, 0.9][Math.floor(r() * 3)] : [0.25, 0.3][Math.floor(r() * 2)], p: [67, 72, 64][Math.floor(r() * 3)] };
      // 판이 차면 맨 위 줄을 밀어 올림(바로 앞 소리들과 견줄 수 있게)
      if (hist.length >= N) { hist.shift(); hist.forEach((d, k) => ln.set(k, d)); }
      hist.push(cur.d);
      A.clear(); ui.say(ASK); setP('idle'); A.busy(true);
      const s = play(false);
      // 긴 소리는 다 듣기 전에도 길다는 게 들리니 0.65초가 지나면 고를 수 있게(짧은 소리는 끝난 뒤)
      T.after(kit.msUntil(s.ac, s.starts[0] + (LONG + 0.05)), () => { busy = false; A.busy(false); });
    }
    function answer(long) {
      if (busy || !cur) return;
      busy = true;
      const want = isLong(cur.d), right = long === want;
      ln.live(row(), false);
      ln.grow(row(), cur.d, 0.35, T);                // 고른 뒤에 길이를 막대로
      setP(right ? 'happy' : 'oops');
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        A.mark(long ? 'long' : 'short', 'right');
        ui.tell('맞아요', 'good');
        if (streak >= 3) { kit.pass(); return; }
        T.after(1100, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        A.mark(long ? 'long' : 'short', 'wrong'); A.btn(want ? 'long' : 'short').classList.add('right');
        ui.tell('다시 들어 봐요', 'oops', 2400);
        ui.say(want ? '길게 이어진 소리였어요 — 막대를 보며 다시 들어요' : '톡 짧게 끝난 소리였어요 — 막대를 보며 다시 들어요');
        // 막대가 자라는 것을 보며 한 번 더 듣고 → 새 소리
        T.after(1300, () => { const s = play(true); T.after(kit.msUntil(s.ac, s.end) + 900, ask); });
      }
    }
    onPress(again, () => { if (!busy && cur) { A.busy(true); const s = play(false); T.after(kit.msUntil(s.ac, s.starts[0] + (LONG + 0.05)), () => { busy = false; A.busy(false); }); } });
    ui.stage.append(h('div', { class: 'ln-follow' }, bunny, ln.el, A.el));
    T.after(450, ask);
    kit.setAuto(() => { if (!busy && cur) answer(isLong(cur.d)); });
    const onKey = e => { if (e.repeat) return; const k = keyPick(e); if (k) { e.preventDefault(); answer(k === 'long'); } };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 다람쥐 기차 — 긴 소리 손님은 긴 칸, 짧은 소리 손님은 짧은 칸 · 12판 ──
  game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));   // 방이 열린 TV 수업: 소리는 TV 하나 · 답은 각자(_tvs.js)
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [], picks = [];
    let i = -1, cur = null, open = false, gone = false, listen = 0, laneX = null, pps = 0, plan = PLAN, sd = null;
    ui.say('들은 소리를 맞는 기차에 태워요');
    const img = (f, cls) => h('img', { src: SCENE + f + '.webp', alt: '', draggable: 'false', class: cls });
    // 자리 — 그림 속 창 자리(%) · 짧은 칸은 창 둘 + 지붕 위 넷
    const seat = (l, t, w, hh) => h('i', { class: 'tr-seat', style: { left: l + '%', top: t + '%', width: w + '%', height: hh + '%' } });
    const longSeats = [65, 200, 335, 468, 602, 735].map(x => seat(x / 9, 29.5, 11.1, 27.9));
    const shortSeats = [175, 501].map(x => seat(x / 8.82, 26.9, 23.4, 33.7));
    const roof = Array.from({ length: 4 }, () => h('i', { class: 'tr-roofseat' }));
    shortSeats.push(...roof);
    const longCar = h('div', { class: 'tr-car long' }, img('prop_train_long', 'tr-img'), ...longSeats, h('span', { class: 'tr-name' }, '긴 소리'));
    const shortCar = h('div', { class: 'tr-car short' }, img('prop_train_short', 'tr-img'), ...shortSeats.slice(0, 2), h('div', { class: 'tr-roof' }, ...roof), h('span', { class: 'tr-name' }, '짧은 소리'));
    const loco = h('div', { class: 'tr-car loco' }, img('prop_train_engine', 'tr-img'));
    const train = h('div', { class: 'tr-train' }, longCar, h('i', { class: 'tr-link' }), shortCar, h('i', { class: 'tr-link' }), loco);
    const bunny = h('div', { class: 'tr-bunny' }, pal(kit, 'bunny'));
    const sq = h('div', { class: 'tr-sq' }, img('prop_squirrel', ''));
    const { el: laneBar, fill: laneFill } = growBar(h, 'tr-lbar');
    const laneTag = h('span', { class: 'tr-ltag' });
    const lane = h('div', { class: 'tr-lane' }, laneBar, laneTag);
    // 승강장 — 길잡이 토끼와 손님 다람쥐가 땅 위에 서서 기다림(평가 3차: 하늘에 뜬 다람쥐 X)
    const plat = h('div', { class: 'tr-plat' }, h('i', { class: 'tr-plat-top' }));
    const scene = h('div', { class: 'tr-scene' }, h('div', { class: 'tr-hills' }), h('div', { class: 'tr-ground' }), h('div', { class: 'tr-rail' }), plat, train, lane, bunny, sq);
    const A = kit.answers([
      { key: 'long', label: '긴 소리', chip: barIcon(kit, true) },
      { key: 'short', label: '짧은 소리', chip: barIcon(kit, false) },
    ], k => answer(k === 'long'));
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '다람쥐 기차'),
      h('p', { class: 'sub' }, '다람쥐 손님 12명이 소리를 하나씩 들려줘요'),
      h('p', { class: 'sub' }, '키보드 ', h('span', { class: 'kbd' }, '1'), ' ', h('span', { class: 'kbd' }, '2'), ' 도 돼요')));
    ui.stage.append(h('div', { class: 'tr-wrap' }, scene, A.el), start);
    const setP = p => pose(kit, bunny.firstChild, 'bunny', p);
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    const again = h('button', { type: 'button' }, '다시 듣기');
    // 시작할 때 판 차례를 정함 — 단계(소개 0~3 · 발전 4~7 · 비틀기 8~10 · 마무리 11) 안에서만 섞고 반쯤 길이를 뒤집음(N2 · 씨앗은 기록에)
    onPress(startBtn, () => { sd = kit.seed ? kit.seed() : 1; plan = kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF); start.remove(); ui.setBar(again); T.after(300, next); });
    onPress(again, () => { if (open) hear(); });       // 고르기 전이면 언제든 한 번 더(놓침 시계도 다시)
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) press(startBtn); else if (open) answer(isLong(cur.d)); });

    // 긴 칸 너비 = 1.2초 막대(소리 막대와 기차 칸 길이가 같은 자로 보이게) · 막대는 긴 칸 왼쪽 끝에서 시작
    //  자리 · 자는 첫 판에 한 번만 잼(판마다 레이아웃을 강제로 다시 계산하지 않게)
    // 지금 손님 소리 듣기(처음 · 다시 듣기) — 짧은 소리는 끝까지, 긴 소리는 0.65초 들어야 고를 수 있음(연습과 같게)
    function hear() {
      const my = ++listen;
      open = false; A.busy(true); V.hush();            // 앞 소리가 아직 울려도 겹치지 않게
      const s = V.play([{ p: cur.p, d: cur.d }], { inst: cur.inst });
      T.after(kit.msUntil(s.ac, s.starts[0] + (LONG + 0.05)), () => { if (my !== listen || gone) return; open = true; A.busy(false); A.timer((kit.msUntil(s.ac, s.end) + 3000) / 1000); });
      T.after(kit.msUntil(s.ac, s.end) + 3000, () => { if (my === listen && open) answer(null); });   // 3초 넘게 고르지 않으면 시간 지남(보이는 시계 = 답 단추 아래 줄)
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      const { d, inst, p } = plan[i];
      cur = { d, inst, p };
      ui.count(i + 1, plan.length);
      A.clear(); A.busy(true);
      lane.classList.remove('on');                    // 이름 글은 사라지는 동안 그대로(빈 말풍선이 비치지 않게)
      if (laneX == null) { laneX = train.offsetLeft + longCar.offsetLeft; pps = longCar.offsetWidth / 1.2; lane.style.transform = `translateX(${laneX}px)`; }
      sq.className = 'tr-sq'; sq.style.transform = '';
      pop(sq);                                        // 다음 다람쥐가 승강장에 톡 나타남
      setP('idle');
      open = false;
      T.after(550, () => { if (!gone) hear(); });
    }
    function answer(long) {
      if (!open) return;
      open = false; listen++; A.timer(0);
      const want = isLong(cur.d), right = long === want;
      results.push(long == null ? null : right); picks.push(long);   // 시간 지남은 틀림과 따로(N1)
      // 소리 길이를 막대로(긴 칸과 같은 자) + 이름
      lane.classList.add('on');
      laneBar.style.width = `${Math.round(cur.d * pps)}px`;
      slide(laneFill, 0.32, 'ease-out');
      laneTag.textContent = want ? '긴 소리' : '짧은 소리';
      if (right) { kit.sfx.good(engine); setP('happy'); A.mark(want ? 'long' : 'short', 'right'); ui.tell('맞아요', 'good'); }
      else {
        kit.sfx.oops(engine); setP('oops');
        if (long != null) A.mark(long ? 'long' : 'short', 'wrong');
        A.btn(want ? 'long' : 'short').classList.add('right');
        ui.tell(long == null ? '놓쳤어요' : '삐끗', 'oops');
      }
      // 다람쥐는 맞는 칸으로 폴짝
      const st = (want ? longSeats : shortSeats).find(s => !s.classList.contains('on'));
      T.after(right ? 250 : 650, () => {
        if (gone || !st) return;
        const a = sq.getBoundingClientRect(), b = st.getBoundingClientRect();
        sq.classList.add('hop');
        const k = Math.min(b.width / a.width, b.height / a.height);
        sq.style.transform = `translate(${(b.left + b.width / 2 - (a.left + a.width / 2)).toFixed(0)}px, ${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(0)}px) scale(${k.toFixed(2)})`;
        T.after(380, () => { st.classList.add('on'); st.replaceChildren(img('prop_squirrel', '')); sq.className = 'tr-sq gone'; });
      });
      T.after(right ? 1100 : 1700, next);
    }
    function end() {
      open = false; listen++;
      lane.classList.remove('on'); ui.tell(null); A.clear(); A.busy(false); ui.setBar();
      setP('happy');
      train.classList.add('leave');                   // 다람쥐를 다 태우고 떠남 → 결과
      T.after(1500, () => {
        bunny.hidden = true; ui.count(null);          // 결과 옆 친구는 칸 화면이 붙임
        const s = kit.scoreChoices(results, 5, { chance: GUESS(plan) }), tip = tipOf(plan, results);
        kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
      });
    }
    // 기차 칸을 직접 눌러도 됨
    onPress(longCar, () => answer(true)); onPress(shortCar, () => answer(false));
    const onKey = e => { if (e.repeat) return; const k = keyPick(e); if (k) { e.preventDefault(); answer(k === 'long'); } };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};
