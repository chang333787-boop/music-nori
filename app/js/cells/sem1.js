// 셈1 여리게·세게 — 곰 갈래 첫 칸(11-08 교사 "셈여림은 언제 해?" · 토론 C2 반박을 막는 꼴로)
//  셈여림 = 소리의 세기(여리게 p ↔ 세게 f). 소리 크기를 그대로 맞히게 하지 않고 **같은 기기에서 두 번 들려주고 견주게** 한다
//   → 크롬북 스피커 크기 · 교실 소음과 상관없이(토론 '교실 소음에 가장 약하다' 반박) · 소5 '크기' 단추보다 한 걸음 더:
//   비틀기 = '세게 ≠ 높게'(높고 여린 소리 · 낮고 센 소리) · '세게 ≠ 센박'(쿵이 또렷한 여린 왈츠 · 쿵 없는 센 왈츠)
//  소리 그림: 세기 = 막대 굵기(소5 약속 · 높이는 세로 · 길이는 가로) — 고르기 전에는 굵기를 숨김(화면으로 답이 새지 않게)
//  보기(예시 다섯) → 연습(어느 쪽이 세게? 세 번 이어서) → 확인 게임 '곰 깨우기' 12판(견주기 · 갑자기 세게 · 비틀기 · p/f 고르기)
import { voice, exGroup, nowCard, pal, pose } from './_snd.js';
import { factTip, nearSeq } from '../cellkit.js';
import { tvsGame } from './_tvs.js';

const BEAT = 0.42;                                  // 한 박(초) — 견주는 가락은 한 마디씩(확인 게임 1분 안쪽)
const P = 0.2, F = 0.9;                             // 여리게 · 세게 세기(압축기를 지나도 귀로 또렷하게 차이)
// 가락 — 주제곡 「숲속 음악대」 첫 마디 · 다섯째 마디(솔미 인사 동기)
const M1 = [[67, 1], [64, 1], [67, 1], [64, 1]];
const M2 = [[67, 1], [64, 1], [67, 0.5], [67, 0.5], [72, 1]];
const notes = (mel, vel, inst, shift = 0) => mel.map(([p, b]) => ({ p: p + shift, d: b * BEAT * 0.92, gap: b * BEAT * 0.08, vel, inst }));
// 왈츠(쿵 짝 짝) 두 마디 — accent = 쿵만 세게(여린 왈츠) · flat = 모두 같은 세기(센 왈츠)
function waltz(level, accentOnly) {
  const out = [];
  for (let b = 0; b < 6; b++) {
    const one = b % 3 === 0, v = accentOnly ? (one ? level * 2.2 : level * 0.7) : level;
    out.push({ p: one ? 48 : 64, d: BEAT * 0.8, gap: BEAT * 0.2, vel: Math.min(1, v), inst: 'piano' });
  }
  return out;
}
// 판 — kind: pair(두 번 · 어느 쪽이 세게) · half(한 번 안에서 앞 · 뒤) · pitch(높고 여린 ↔ 낮고 센) · accent(쿵 또렷한 여린 왈츠 ↔ 센 왈츠) · sym(p · f 고르기)
//  ans = 'A'(첫째 · 앞 · p) | 'B'(둘째 · 뒤 · f) — 섞을 때 뒤집으면 차례와 답이 함께 바뀜
export const PLAN = [
  { kind: 'pair', mel: 'M1', inst: 'piano', ans: 'A' }, { kind: 'pair', mel: 'M2', inst: 'marimba', ans: 'B' },
  { kind: 'pair', mel: 'M1', inst: 'flute', ans: 'B' }, { kind: 'pair', mel: 'M2', inst: 'piano', ans: 'A' },
  { kind: 'half', inst: 'piano', ans: 'B' }, { kind: 'half', inst: 'marimba', ans: 'A' },
  { kind: 'half', inst: 'flute', ans: 'B' }, { kind: 'half', inst: 'strings', ans: 'A' },
  { kind: 'pitch', inst: 'piano', ans: 'B' }, { kind: 'accent', ans: 'B' }, { kind: 'pitch', inst: 'flute', ans: 'A' },
  { kind: 'sym', mel: 'M2', inst: 'piano', ans: 'B' },
];
export const CUTS = [4, 8, 11];
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'A' ? 'B' : 'A' }), answerOf: p => p.ans, chance: plan => plan.map(() => 1 / 2) };   // chance = 앞 판 기억 봇 검사(F5)
const MEL = { M1, M2 };
// 판 → 들려줄 조각들(segs: 화면 칸 하나씩) · 각 조각의 세기(굵기 공개용)
function build(it) {
  const strongA = it.ans === 'A';
  if (it.kind === 'pair') return [{ notes: notes(MEL[it.mel], strongA ? F : P, it.inst), f: strongA }, { notes: notes(MEL[it.mel], strongA ? P : F, it.inst), f: !strongA }];
  if (it.kind === 'half') return [{ notes: notes(M1, strongA ? F : P, it.inst), f: strongA, join: true }, { notes: notes(M2, strongA ? P : F, it.inst), f: !strongA }];
  if (it.kind === 'pitch') {                         // 센 쪽은 낮게 · 여린 쪽은 한 옥타브 높게 — 높다고 세지 않아요
    const hiSoft = notes(M1, P, it.inst, 12), loStrong = notes(M1, F, it.inst, 0);
    return strongA ? [{ notes: loStrong, f: true }, { notes: hiSoft, f: false }] : [{ notes: hiSoft, f: false }, { notes: loStrong, f: true }];
  }
  if (it.kind === 'accent') {                        // 쿵이 또렷한 여린 왈츠 ↔ 쿵 없이 고르게 센 왈츠 — 센박과 셈여림은 달라요
    const softAcc = waltz(0.16, true), loudFlat = waltz(0.8, false);
    return strongA ? [{ notes: loudFlat, f: true }, { notes: softAcc, f: false }] : [{ notes: softAcc, f: false }, { notes: loudFlat, f: true }];
  }
  return [{ notes: notes(MEL[it.mel], strongA ? P : F, it.inst), f: !strongA }];   // sym: A = p(여리게) · B = f(세게)
}
const LABELS = { pair: ['첫째가 세게', '둘째가 세게'], pitch: ['첫째가 세게', '둘째가 세게'], accent: ['첫째가 세게', '둘째가 세게'], half: ['앞이 세게', '뒤가 세게'], sym: ['p 여리게', 'f 세게'] };
const SAY = { pair: '두 번 들어요 — 어느 쪽이 세게였나요?', half: '한 번 안에서 세기가 바뀌어요 — 앞이 세게일까요, 뒤가 세게일까요?', pitch: '높이도 달라요 — 그래도 세기만 견줘요', accent: '쿵(센박)이 들려도 — 전체가 세게인 쪽은?', sym: '이번 소리는 여리게(p)일까요, 세게(f)일까요?' };

// 소리 그림 — 조각마다 음 막대 줄(세로 = 높이 · 가로 = 길이 · 굵기 = 세기, 굵기는 reveal 때만)
function strip(kit) {
  const { h } = kit;
  const el = h('div', { class: 'sm-strip' });
  let segs = [];
  return {
    el,
    set(list, names) {
      segs = list.map((sg, k) => {
        const lo = Math.min(...sg.notes.map(n => n.p)), hi = Math.max(...sg.notes.map(n => n.p));
        const bars = sg.notes.map(n => h('i', { class: 'sm-note', style: { flexGrow: String(n.d + n.gap), '--y': hi === lo ? 0.5 : (n.p - lo) / (hi - lo) } }));
        const box = h('div', { class: 'sm-seg' + (sg.join ? ' join' : '') }, h('b', { class: 'sm-name' }, names[k] || ''), h('div', { class: 'sm-bars' }, ...bars), h('span', { class: 'sm-mark' }, ''));
        return { box, bars, f: sg.f };
      });
      el.replaceChildren(...segs.map(s => s.box));
    },
    now(k, j) { segs.forEach((s, a) => { s.box.classList.toggle('now', a === k); s.bars.forEach((b, c) => b.classList.toggle('on', a === k && c === j)); }); },
    reveal(lowBand) { for (const s of segs) { s.box.classList.add(s.f ? 'f' : 'p'); s.box.querySelector('.sm-mark').textContent = lowBand ? (s.f ? '크게' : '작게') : (s.f ? 'f 세게' : 'p 여리게'); } },
  };
}
// 조각들을 차례로 틀고 그림을 맞춤 → 끝 ms
function playSegs(kit, V, T, S, segs, at0 = 0.1) {
  const { engine } = kit;
  let at = at0;
  const ac = engine.ensure();
  segs.forEach((sg, k) => {
    const s = V.play(sg.notes, { at, art: null });
    s.starts.forEach((t, j) => T.after(kit.msUntil(ac, t), () => S.now(k, j)));
    at = s.end - ac.currentTime + (sg.join ? 0 : 0.5);
  });
  const endMs = at * 1000;
  T.after(endMs, () => S.now(-1, -1));
  return endMs;
}

// TV '틀린 갈래' 막대 이름(X6 둘째) — 아래 tipOf 갈래와 같은 차례 · 짧게(선생님이 다시 짚을 곳)
export const TIPS_TV = ['높은 소리를 세게로', '센박을 세게로', '한 번 안에서 바뀌는 세기'];
// 헷갈리는 두 소리(X11) — 별 0일 때 결과 화면에서 번갈아 듣기(점수 없음) · 높이와 세기를 헷갈리는 짝(같은 가락 · 높지만 여리게 ↔ 낮지만 세게)
export const NEAR = [
  { label: '높지만 여리게', low: '높지만 작게', play: nearSeq(notes(M1, P, 'piano', 12)) },
  { label: '낮지만 세게', low: '낮지만 크게', play: nearSeq(notes(M1, F, 'piano', 0)) },
];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'pitch'), text: '높은 소리를 세게로 고른 적이 있어요. 높이와 세기는 달라요 — 높아도 여릴 수 있어요.' },
    { n: miss(p => p.kind === 'accent'), text: '쿵(센박)이 또렷하다고 세게가 아니에요. 소리 전체의 세기를 견줘요.' },
    { n: miss(p => p.kind === 'half'), text: '한 번 안에서 세기가 바뀌는 곳을 놓쳤어요. 앞과 뒤를 따로 떠올려 견줘 봐요.' },
  ], '높이 · 센박이 달라도 세기만 듣고 골랐어요.');
}

// 판마다 단추 이름 · 지시 · 조각 이름(1~2학년 판은 크게 · 작게)
const labelOf = (kind, j, low) => (low ? LABELS[kind][j].replace('세게', '크게').replace('p 여리게', '작게').replace('f 크게', '크게') : LABELS[kind][j]);
const sayOf = (kind, low) => (low ? SAY[kind].replace(/세게/g, '크게').replace(/여리게/g, '작게').replace(/\(p\)|\(f\)/g, '') : SAY[kind]);
const namesOf = kind => (kind === 'half' ? ['앞', '뒤'] : kind === 'sym' ? ['이번 소리'] : ['첫째', '둘째']);

// ── 소리는 TV 하나 · 답은 각자(_tvs.js) — 조각들(사이 0.5초)을 TV에서 다 들은 뒤 고를 수 있음 · 3초 뒤 닫힘(견주는 소리가 길어 한 판이 90초를 넘지 않게)
//  판 꼴마다 소리 길이가 달라(왈츠 두 마디가 가장 김) 판마다 P가 다름 — 같은 씨앗이면 같은 차례라 시간표도 같음 · 같은 꼴 안에서는 답과 상관없이 길이가 같음(열리는 때로 답이 새지 않음)
export const TVS = true;
const segSec = segs => segs.reduce((t, sg, k) => t + sg.notes.reduce((a, n) => a + n.d + (n.gap ?? 0.12), 0) + (sg.join || k === segs.length - 1 ? 0 : 0.5), 0);
export const tvsSpec = (ui, kit) => {
  const low = kit.band === 'low', open = it => 300 + segSec(build(it)) * 1000;
  return {
    plan: sd => kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF),
    OPEN: open, CLOSE: it => open(it) + 3000, P: it => open(it) + 3000 + 800,
    say: { kid: low ? 'TV 소리를 듣고 — 어느 쪽이 크게였나요?' : 'TV 소리를 듣고 — 세게인 쪽을 골라요', tv: '소리는 TV에서 — 아이들은 각자 기기로 골라요' },
    items: [{ key: 'A', label: '' }, { key: 'B', label: '' }],
    setup: (it, A) => { ['A', 'B'].forEach((k, j) => { A.btn(k).querySelector('.lab').textContent = labelOf(it.kind, j, low); }); ui.say(sayOf(it.kind, low)); },
    side: (it, k) => ({ label: labelOf(it.kind, k === 'A' ? 0 : 1, low) }),
    rightOf: it => it.ans,
    wrongText: () => (low ? '굵은 쪽이 크게예요' : '굵은 막대 쪽이 세게예요'),
    view({ kidSide, V, T, side }) {
      const { h } = kit;
      const S = strip(kit);
      const bear = h('div', { class: 'sm-bear' }, pal(kit, 'bear'), h('span', { class: 'sm-zz' }, '쿨쿨'));
      return {
        el: h('div', { class: 'sm sm-play' }, h('div', { class: 'sm-left' }, S.el, bear), side),
        item: it => { S.set(build(it), namesOf(it.kind)); pose(kit, bear.firstChild, 'bear', 'idle'); bear.classList.remove('awake'); },
        play: (it, at) => playSegs(kit, V, T, S, build(it), at),
        close: (it, r) => { S.reveal(low); if (!kidSide || r) { pose(kit, bear.firstChild, 'bear', 'happy'); bear.classList.add('awake'); } else pose(kit, bear.firstChild, 'bear', r === false ? 'oops' : 'idle'); },
        done: () => { bear.hidden = true; },
      };
    },
    tip: tipOf, chance: plan => plan.map(() => 1 / 2),
  };
};

export default {
  // ── 보기: 예시 다섯 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), low = kit.band === 'low';
    ui.say(low ? '작게 · 크게 — 소리의 세기를 들어 봐요' : '셈여림 — 소리의 세기. p(여리게) · f(세게)');
    const S = strip(kit);
    const bear = h('div', { class: 'sm-bear' }, pal(kit, 'bear'), h('span', { class: 'sm-zz' }, '쿨쿨'));
    const EX = [
      { title: low ? '작게 → 크게' : '여리게 → 세게', sub: '같은 가락 · 피아노', it: { kind: 'pair', mel: 'M1', inst: 'piano', ans: 'B' }, names: ['첫째', '둘째'] },
      { title: low ? '크게 → 작게' : '세게 → 여리게', sub: '같은 가락 · 플루트', it: { kind: 'pair', mel: 'M2', inst: 'flute', ans: 'A' }, names: ['첫째', '둘째'] },
      { title: low ? '갑자기 크게' : '갑자기 세게', sub: '한 번 안에서 앞 · 뒤', it: { kind: 'half', inst: 'marimba', ans: 'B' }, names: ['앞', '뒤'] },
      { title: '높다고 세지 않아요', sub: '높고 여린 ↔ 낮고 센', it: { kind: 'pitch', inst: 'piano', ans: 'B' }, names: ['첫째', '둘째'] },
      { title: '쿵(센박)과 세기는 달라요', sub: '쿵 또렷한 여린 왈츠 ↔ 고르게 센 왈츠', it: { kind: 'accent', ans: 'B' }, names: ['첫째', '둘째'] },
    ];
    const cards = EX.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard sm-ex' }, h('b', {}, ex.title), h('span', {}, ex.sub));
      onPress(btn, () => {
        T.clear(); V.hush(); nowCard(cards, btn);
        const segs = build(ex.it);
        S.set(segs, ex.names); S.reveal(low);       // 보기에서는 굵기를 처음부터 보여 줌(배우는 단계)
        const end = playSegs(kit, V, T, S, segs);
        pose(kit, bear.firstChild, 'bear', 'idle');
        T.after(end + 100, () => nowCard(cards, null));
        btn.classList.add('heard');
      });
      return btn;
    });
    S.set(build({ kind: 'pair', mel: 'M1', inst: 'piano', ans: 'B' }), ['첫째', '둘째']); S.reveal(low);
    ui.stage.append(h('div', { class: 'sm sm-show' }, h('div', { class: 'sm-top' }, S.el, bear), exGroup(kit, cards, 'exgrid sm-exgrid')));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 연습: 두 번 들려주고 어느 쪽이 세게? — 세 번 이어서 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng(), low = kit.band === 'low';
    ui.say(low ? '두 번 들어요 — 어느 쪽이 크게였나요?' : SAY.pair);
    const S = strip(kit);
    const A = kit.answers([{ key: 'A', label: low ? '첫째가 크게' : LABELS.pair[0] }, { key: 'B', label: low ? '둘째가 크게' : LABELS.pair[1] }], k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(h('div', { class: 'sm sm-play' }, S.el, A.el));
    ui.setBar(again);
    let streak = 0, cur = null, open = false, passed = false, tok = 0, segs = null;
    function hear() {
      const my = ++tok; open = false; A.busy(true); V.hush();
      const end = playSegs(kit, V, T, S, segs);
      T.after(end, () => { if (my === tok && !passed) { open = true; A.busy(false); } });
    }
    function ask() {
      if (passed) return;
      cur = { kind: 'pair', mel: r() < 0.5 ? 'M1' : 'M2', inst: ['piano', 'marimba', 'flute'][Math.floor(r() * 3)], ans: r() < 0.5 ? 'A' : 'B' };
      segs = build(cur); S.set(segs, ['첫째', '둘째']); A.clear();
      hear();
    }
    function answer(k) {
      if (!open) return;
      open = false; tok++;
      const right = k === cur.ans;
      A.mark(k, right ? 'right' : 'wrong'); if (!right) A.reveal(cur.ans);
      S.reveal(low);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak); ui.tell('맞아요', 'good');
        if (streak >= 3) { passed = true; kit.pass('세 번 이어서 세기를 견줬어요'); return; }
        T.after(1300, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0); ui.tell(low ? '굵은 쪽이 크게예요' : '굵은 막대 쪽이 세게(f)예요', 'oops', 2000);
        T.after(2200, ask);
      }
    }
    onPress(again, () => { if (cur && !passed) hear(); });
    T.after(300, ask);
    kit.setAuto(() => { if (open) answer(cur.ans); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 확인 게임: 곰 깨우기 — 12판 ──
  game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));   // 방이 열린 TV 수업: 소리는 TV 하나 · 답은 각자(_tvs.js)
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), low = kit.band === 'low';
    ui.say(low ? '어느 쪽이 크게였나요?' : '세기만 듣고 골라요 — 높이 · 센박에 속지 않게');
    const S = strip(kit);
    const bear = h('div', { class: 'sm-bear' }, pal(kit, 'bear'), h('span', { class: 'sm-zz' }, '쿨쿨'));
    const A = kit.answers([{ key: 'A', label: '' }, { key: 'B', label: '' }], k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(h('div', { class: 'sm sm-play' }, h('div', { class: 'sm-left' }, S.el, bear), A.el));
    const results = [];
    let plan = PLAN, sd = null, i = -1, cur = null, segs = null, open = false, tok = 0, gone = false;
    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '곰 깨우기'),
      h('p', { class: 'sub' }, low ? '소리를 견주고 크게인 쪽을 골라요' : '두 소리를 견주고 세게(f)인 쪽을 골라요 — 높이 · 센박에 속지 않게'),
      h('p', { class: 'sub' }, `${PLAN.length}판 · 다시 듣기는 몇 번이든 돼요`)));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, () => { sd = kit.seed ? kit.seed() : 1; plan = kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF); card.remove(); ui.setBar(again); next(); });
    ui.setBar(go);
    const relabel = kind => ['A', 'B'].forEach((k, j) => { A.btn(k).querySelector('.lab').textContent = labelOf(kind, j, low); });
    function hear() {
      const my = ++tok; open = false; A.busy(true); V.hush();
      const end = playSegs(kit, V, T, S, segs);
      T.after(end, () => { if (my === tok && !gone) { open = true; A.busy(false); } });
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      cur = plan[i]; segs = build(cur);
      ui.count(i + 1, plan.length); ui.say(sayOf(cur.kind, low));
      S.set(segs, namesOf(cur.kind));
      relabel(cur.kind); A.clear();
      pose(kit, bear.firstChild, 'bear', 'idle'); bear.classList.remove('awake');
      T.after(250, hear);
    }
    function answer(k) {
      if (!open || !cur) return;
      open = false; tok++;
      const right = k === cur.ans;
      results.push(right);
      A.mark(k, right ? 'right' : 'wrong'); if (!right) A.reveal(cur.ans);
      S.reveal(low);
      if (right) { kit.sfx.good(engine); ui.tell('맞아요', 'good', 900); pose(kit, bear.firstChild, 'bear', 'happy'); bear.classList.add('awake'); }
      else { kit.sfx.oops(engine); ui.tell(low ? '굵은 쪽이 크게예요' : '굵은 막대 쪽이 세게예요', 'oops', 1500); pose(kit, bear.firstChild, 'bear', 'oops'); }
      T.after(right ? 900 : 1500, next);
    }
    function end() {
      ui.tell(null); ui.count(null); A.clear(); A.busy(false); ui.setBar(); bear.hidden = true;
      const s = kit.scoreChoices(results, 5, { chance: results.map(() => 1 / 2) }), tip = tipOf(plan, results);
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
    }
    onPress(again, () => { if (cur && !gone && i < plan.length) hear(); });
    kit.setAuto(() => { if (card.isConnected) go.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else if (open && cur) answer(cur.ans); });
    return () => { gone = true; T.clear(); V.hush(); };
  },
};
