// 가4 레 · 차례가기 — 도-미 사이에 레(D4)를 메운다. 도-레-미는 한 계단씩(차례가기) · 도-미는 한 계단 건너뜀(뛰어가기)
//  높이는 늘 세로 위치 · 계이름 글자와 색(theory.js colorOf — 레 살구) · 가온 도 위 음역 · 세기 같게.
//  계단 판 = 도 · 레 · 미 · (파 점선 빈 계단) · 솔 · 라 — 가3의 빈 계단(레)이 채워짐 · 미-솔 사이 파는 아직 비어 있어 미-솔도 뛰어가기(가1 솔-미)
//  보기: 차례가기 둘(실로폰 도-레-미 · 목소리 미-레-도) · 뛰어가기 둘(실로폰 도-미-솔 · 피아노 솔-미-도) + 노래(프랑스 민요 앞 도막 — 거의 차례가기 · 도→미 한 번 뛰어감)
//  연습: 들은 가락이 차례가기일까 뛰어가기일까 — 높낮이 모양이 같은 그림 둘 중 하나(오른쪽 답 단추)
//  확인 게임 '레 계단' 12판 — 왼쪽 계단 판은 처음부터 끝까지 그대로(고른 뒤 참새가 들은 가락대로 계단을 밟음)
//   소개 1~4(? 자리 소리 · 미 · 레 · 도) → 발전 5~8(차례가기 · 뛰어가기 그림 둘 · 도 레 미 솔) → 비틀기 9~11(솔-라 · 솔-미 · 레-솔 · 네 음 · 피아노 · 리코더) → 마무리 12(다섯 음)
//   화면 틈 막기: ? 판 넷은 화면이 같은 짝 둘(도-?-미 = 레 / 도 · 미-?-도 = 레 / 미) — 보이는 것만으로는 넷 중 둘까지(안 보이는 음 · 사이 음 고르기 = 둘)
//    그림 판은 두 그림의 높낮이 모양이 늘 같고(오르기 · 오르기) 어느 쪽을 들려줄지는 씨앗이 정함(뒤집기) · 그림 자리도 씨앗으로 섞음 — 모양 · 레가 든 그림 · 자리로는 반
import { DO, RE, MI, FA, SOL, LA, nameOf, colorOf, posOf, heightBoard, heightPic, songNotes, voice, playBeats, badge, startCard, press, exCard, hearHead, markPick, judge, dot } from './_mel.js';
import { tvsGame } from './_tvs.js';
import { factTip, stageCuts, shuffle } from '../cellkit.js';

const D = DO, R = RE, M = MI, S = SOL, L = LA;
const ROWS = [D, R, M, S, L], GHOSTS = [FA];
const QK = [M, R, D];                              // ? 판 답 단추 자리 — 위에서 아래 = 높은 음에서 낮은 음
const WORD = { step: '차례가기', skip: '뛰어가기' }, HOW = { step: '한 계단씩', skip: '계단을 건너뛰어' };
// 가락 갈래 — 이웃 계단으로만 가면 차례가기 · 늘 한 계단 넘게 건너뛰면 뛰어가기(파 빈 계단도 계단 — 미-솔은 뛰어가기) · 섞이면 mix
export function kindOf(ps) {
  const d = ps.slice(1).map((p, k) => Math.abs(posOf(p) - posOf(ps[k])));
  return d.every(x => x === 1) ? 'step' : d.every(x => x >= 2) ? 'skip' : 'mix';
}
const names = ps => ps.map(nameOf).join('-');
const whyOf = ps => (kindOf(ps) === 'step' ? `${names(ps)} — 한 계단씩 이어졌어요(차례가기)` : `${names(ps)} — 계단을 건너뛰었어요(뛰어가기)`);

const EXAMPLES = [
  { ps: [D, R, M], inst: 'xylo', sub: '실로폰' }, { ps: [D, M, S], inst: 'xylo', sub: '실로폰' },
  { ps: [M, R, D], inst: 'choir', sub: '목소리' }, { ps: [S, M, D], inst: 'piano', sub: '피아노' },
];

// 확인 게임 문항 표(X2 · 단계 꼬리표)
//  ? 판 = { fmt:'q', ps, q(물음표 자리), right(= QK 자리) } · 그림 판 = { fmt:'pic', ps(들려줄 가락), alt(높낮이 모양이 같은 다른 갈래 가락), kind }
//  그림 판의 답(그림 자리 0 · 1)은 arrange가 같은 씨앗으로 정함 → opts · right
const ask = (ps, q, inst = 'xylo') => ({ stage: 'intro', fmt: 'q', ps, q, inst, right: QK.indexOf(ps[q]) });
const pair = (stage, ps, alt, inst = 'xylo') => ({ stage, fmt: 'pic', ps, alt, inst, kind: kindOf(ps) });
export const PLAN = [
  // 소개 — ?는 늘 가운데(쉬운 자리) · 도-?-미가 레인 판과 도인 판, 미-?-도가 레인 판과 미인 판(화면이 같은 짝 — 소리로만 갈림)
  ask([D, R, M], 1), ask([M, R, D], 1), ask([D, D, M], 1), ask([M, M, D], 1),
  // 발전 — 오르기 · 내리기 · 오르내리기 · 내리오르기(두 그림 모양 같음)
  pair('grow', [D, R, M], [D, M, S]), pair('grow', [S, M, D], [M, R, D]), pair('grow', [D, R, D], [D, M, D]), pair('grow', [M, D, M], [M, R, M]),
  // 비틀기 — 다른 음 자리에서도 같은 원리: 솔-라(가2)는 차례가기 · 솔-미(가1)와 레-솔은 뛰어가기 · 네 음 · 피아노 · 리코더
  pair('twist', [S, L, S], [R, S, R], 'piano'), pair('twist', [S, M, S], [L, S, L], 'recorder'), pair('twist', [D, R, M, R], [D, M, S, M]),
  // 마무리 — 다섯 음
  pair('end', [D, M, S, M, D], [D, R, M, R, D]),
];
export const CUTS = stageCuts(PLAN);              // 단계 경계 [4, 8, 11] — 섞어도 '1~4번째 ? 판 · 9번째부터 솔 · 라' 말이 그대로 맞게
// 단계 안 섞기(N2) — 그림 판만 뒤집기(짝의 다른 가락을 들려줌 = 뜻 그대로 · 답 갈래만 바뀜) · ? 판은 차례만(레 ↔ 도를 바꾸면 화면 짝이 깨짐)
//  답 수는 ? 판(레 2 · 도 1 · 미 1) 때문에 같게 못 맞춤(balance X) — 그림 판 갈래는 판마다 반반
const flipRow = p => (p.fmt === 'pic' ? { ...p, ps: p.alt, alt: p.ps, kind: kindOf(p.alt) } : p);
export const SHUF = { flip: flipRow, answerOf: p => (p.fmt === 'q' ? 'q' + p.right : p.kind), balance: false };
export const arrange = (plan, r) => plan.map(p => { if (p.fmt !== 'pic') return p; const opts = shuffle([p.ps, p.alt], r); return { ...p, opts, right: opts.indexOf(p.ps) }; });
// 찍기 바닥 확률 — ? 판 = 셋 중 하나와 '늘 레'(넷 중 둘) 중 큰 것 · 그림 판 = 둘 중 하나 → 별 ① = 9/12
const QN = PLAN.filter(p => p.fmt === 'q'), QTOP = Math.max(...[0, 1, 2].map(k => QN.filter(p => p.right === k).length)) / QN.length;
export const GUESS = plan => plan.map(p => (p.fmt === 'q' ? Math.max(1 / 3, QTOP) : 1 / 2));
// 결과 한 줄 — 사실만(N1): 갈래 말은 그 갈래가 틀린 판(시간 지남 뺌)의 2/3를 넘고 3번 이상일 때만
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.fmt === 'q'), text: '? 자리 소리(1~4번째)에서 헷갈렸어요. 레는 도보다 한 계단 위, 미보다 한 계단 아래예요.' },
    { n: miss(p => p.stage === 'twist'), text: '솔 · 라가 든 가락과 네 음 가락(9~11번째)에서 헷갈렸어요. 솔-라도 한 계단(차례가기), 솔-미 · 레-솔은 계단을 건너뛰어요(뛰어가기).' },
    { n: miss(p => p.fmt === 'pic' && p.kind === 'step'), text: '차례가기 가락을 뛰어가기로 골랐어요. 바로 옆 계단으로 이어지면 소리 차이가 작아요.' },
    { n: miss(p => p.fmt === 'pic' && p.kind === 'skip'), text: '뛰어가기 가락을 차례가기로 골랐어요. 계단을 건너뛰면 소리 차이가 더 커요.' },
  ], '레가 ? 자리에 숨어도, 솔 · 라 자리에서도 차례가기와 뛰어가기를 모두 가려냈어요.');
}

// 그림 — 같은 세로 자(도 레 미 [파] 솔 라)로 그려 높이와 계단 수를 견줄 수 있게
const picOf = (ps, o) => heightPic(ps.map((p, t) => ({ p, t })), { rows: ROWS, ghosts: GHOSTS, join: true, ...o });
const bigPic = ps => picOf(ps, { height: 158, unit: ps.length > 3 ? 92 : 150, r: 18, pad: 4 });
// 그림 답 이름 — 갈래 이름(30px) + 무엇인지 한 줄(18px)
const capOf = (kit, ps) => { const ez = kit.ez || (t => t), k = kindOf(ps); return kit.h('span', { class: 'g4-cap' }, ez(WORD[k]), kit.h('small', {}, ez(HOW[k]))); };
// ? 판 칸 안 높이(위에서 %) — 미 0 · 레 -1 · 도 -2
const topOf = p => 16 + (0 - posOf(p)) / 2 * 68;
const ORD = ['첫 번째', '두 번째', '세 번째'];
const SAY = { q: '참새 노래에서 ? 자리 소리를 골라요', pic: '들은 가락은 차례가기일까, 뛰어가기일까요?' };

// ── 답 단추 셋(자리 0 · 1 · 2)을 판마다 꾸밈 — ? 판 = 미 · 레 · 도 / 그림 판 = 그림 둘(셋째는 잠금) ──
function dressAnswers(kit, A, row) {
  const { h } = kit, pic = row.fmt === 'pic', out = [];
  A.el.classList.toggle('pic', pic);
  for (const k of [0, 1, 2]) {
    const b = A.btn(k), chip = b.querySelector('.chip'), lab = b.querySelector('.lab');
    if (!pic) { chip.replaceChildren(dot(h, QK[k])); lab.replaceChildren(nameOf(QK[k])); A.lock(k, false); continue; }
    chip.replaceChildren();
    if (k < row.opts.length) {
      const P = bigPic(row.opts[k]);
      out.push(P);
      lab.replaceChildren(capOf(kit, row.opts[k]), P.el);
      A.lock(k, false);
    } else { lab.replaceChildren(); A.lock(k, true); }
  }
  return out;
}
const answerItems = h => [0, 1, 2].map(k => ({ key: k, label: nameOf(QK[k]), chip: dot(h, QK[k]) }));

// ── 무대 — 왼쪽 계단 판(늘 그대로) · 가운데 ? 판 칸 셋(그림 판에서는 숨김) · 오른쪽 답(side) ──
function makeScene(kit, side) {
  const { h } = kit;
  const board = heightBoard(kit, { notes: ROWS, ghosts: GHOSTS, rh: 44 });
  const slots = ORD.map(t => {
    const track = h('div', { class: 'g4-track' }, ...[M, R, D].map(q => h('i', { class: 'g4-band', style: { top: topOf(q) + '%', '--c': colorOf(q) } })));
    return { el: h('div', { class: 'g4-slot' }, h('span', { class: 'g4-ord' }, t), track), track };
  });
  const axis = h('div', { class: 'g4-axis', 'aria-hidden': 'true' }, ...[M, R, D].map(p => { const b = badge(h, p); b.style.top = topOf(p) + '%'; return b; }));
  const mid = h('div', { class: 'g4-mid' }, axis, h('div', { class: 'g4-row' }, ...slots.map(x => x.el)));
  const el = h('div', { class: 'g4-scene' }, board.el, mid, side);
  const note = (p, cls = '') => h('span', { class: 'g4-note ' + cls, style: { '--c': colorOf(p), top: topOf(p) + '%' } }, badge(h, p));
  return {
    el, board, mid,
    nowSlot: k => slots.forEach((x, j) => x.el.classList.toggle('now', j === k)),
    set(row) {
      const pic = row.fmt === 'pic';
      el.classList.toggle('pic', pic);
      board.rest(); board.pose('idle');
      slots.forEach((x, k) => {
        x.el.classList.remove('now', 'ask');
        x.track.querySelectorAll('.g4-note,.g4-q').forEach(e => e.remove());
        if (pic) return;
        if (k === row.q) { x.el.classList.add('ask'); x.track.append(h('span', { class: 'g4-q' }, '?')); } else x.track.append(note(row.ps[k]));
      });
    },
    reveal(row) {
      if (row.fmt !== 'q') return;
      const box = slots[row.q];
      box.track.querySelector('.g4-q')?.remove(); box.track.append(note(row.ps[row.q], 'pop')); box.el.classList.remove('ask');
    },
  };
}

// ── 소리는 TV 하나 · 답은 각자(_tvs.js) — 참새 노래(음 0.42초 + 틈 0.18초)를 TV에서
//  ? 판은 ? 자리 소리가 나기 시작하면 · 그림 판은 마지막 음이 나기 시작하면 고를 수 있음(? 자리 · 음 수는 화면에 이미 보임)
//  가장 긴 다섯 음 끝 + 3.5초에 닫힘 · 그림 차례도 씨앗으로 정해 모든 기기가 같음 · TV 막대 = 답 단추마다 한 줄
export const TVS = true;
const T4_NOTE = 600, T4_CLOSE = 300 + 5 * T4_NOTE - 180 + 3500;
export const tvsSpec = (ui, kit) => ({
  plan: sd => { const r = kit.rng(sd); return arrange(kit.stageShuffle(PLAN, CUTS, r, SHUF), r); },
  P: T4_CLOSE + 700, OPEN: p => 300 + (p.fmt === 'q' ? p.q : p.ps.length - 1) * T4_NOTE, CLOSE: T4_CLOSE,
  say: { kid: 'TV 참새 노래를 듣고 골라요 — ? 자리 소리 · 차례가기와 뛰어가기', tv: '소리는 TV에서 — 아이들은 각자 기기로 골라요' },
  items: answerItems(kit.h),
  answersOpt: { cls: 'g4-ans m-busy' },
  setup: (p, A) => { dressAnswers(kit, A, p); },
  side: (p, k) => (p.fmt === 'q' ? { label: nameOf(QK[k]), chip: dot(kit.h, QK[k]) }
    : { label: WORD[kindOf(p.opts[k])], chip: picOf(p.opts[k], { height: 56, unit: p.opts[k].length > 3 ? 26 : 44, r: 8, pad: 2, label: false }).el }),
  rightOf: p => p.right,
  intro: V => kit.playSeq(kit.engine, [D, R, M].map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo', out: V.out }),
  view({ kidSide, V, T, side }) {
    const sc = makeScene(kit, side);
    let fmt = null;
    return {
      el: sc.el,
      item(p) {
        if (p.fmt !== fmt) { fmt = p.fmt; if (kidSide) ui.say(SAY[fmt]); }
        sc.set(p);
      },
      play(p, at) {
        sc.board.pose('play');
        const s = kit.playSeq(kit.engine, p.ps.map(q => ({ p: q, d: 0.42, gap: 0.18 })), { inst: p.inst, out: V.out, at });
        if (p.fmt === 'q') p.ps.forEach((_, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => sc.nowSlot(j)));
        T.after(kit.msUntil(s.ac, s.end) + 100, () => { sc.board.pose('idle'); sc.nowSlot(-1); });
      },
      close(p, r) {
        sc.reveal(p);
        if (!kidSide || r) p.ps.forEach((q, j) => T.after(j * 240, () => sc.board.move(q, j === p.ps.length - 1 ? 'happy' : 'play')));
        else sc.board.pose(r === false ? 'oops' : 'idle');
      },
      done: () => { sc.board.el.hidden = true; sc.mid.hidden = true; },
    };
  },
  tip: tipOf, chance: GUESS,
});

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('레는 도와 미 사이 · 한 계단씩 가면 차례가기, 건너뛰면 뛰어가기');
    const board = heightBoard(kit, { notes: ROWS, ghosts: GHOSTS, rh: 44 });
    board.rungs.get(R).append(h('span', { class: 'm-hand' }, kit.ez('새 계단')));
    const quiet = [];
    const stopAll = () => { T.clear(); V.cut(); board.rest(); quiet.forEach(f => f()); };
    const cards = EXAMPLES.map(ex => {
      const pic = picOf(ex.ps, { height: 92, unit: 46, r: 15, pad: 3 });
      const btn = exCard(kit, { name: kit.ez(WORD[kindOf(ex.ps)]), sub: ex.sub, pic: pic.el });
      quiet.push(() => pic.lit(-1));
      onPress(btn, () => {
        stopAll();
        const s = V.play(kit, ex.ps.map(p => ({ p, d: 0.5, gap: 0.18 })), { inst: ex.inst });
        ex.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(p); pic.lit(k); }));
        T.after(kit.msUntil(s.ac, s.end) + 250, stopAll);
        btn.classList.add('heard');
      });
      return btn;
    });
    // 노래 — 프랑스 민요 앞 도막(대장 곡 auclair · 도 · 레 · 미만): 거의 한 계단씩 가다가 셋째 마디 도 → 미에서 한 번 뛰어감
    const song = songNotes('auclair');
    const spic = heightPic(song.notes, { rows: [D, R, M], height: 92, unit: 38, r: 13, pill: true });
    const sbtn = exCard(kit, { name: '노래 「Au clair de la lune」', sub: '프랑스 민요', pic: spic.el, wide: true });
    quiet.push(() => spic.lit(-1));
    onPress(sbtn, () => {
      stopAll();
      const s = playBeats(V, kit, song.notes, { tempo: song.tempo, inst: 'xylo' });
      song.notes.forEach((n, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(n.p); spic.lit(k); }));
      T.after(kit.msUntil(s.ac, s.end) + 300, stopAll);
      sbtn.classList.add('heard');
    });
    ui.stage.append(h('div', { class: 'cols g4-cols' }, board.el, h('div', { class: 'm-excol' }, hearHead(h), h('div', { class: 'm-exgrid g4-exgrid' }, ...cards, sbtn))));
    const all = [...cards, sbtn];
    let k = 0;
    kit.setAuto(() => { if (k < all.length) press(all[k++]); else kit.next(); });
    return () => { T.clear(); V.cut(); };
  },

  // ── 연습: 들은 가락은 차례가기? 뛰어가기? — 높낮이 모양이 같은 그림 둘 · 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('들은 가락은 차례가기일까, 뛰어가기일까요?');
    const board = heightBoard(kit, { notes: ROWS, ghosts: GHOSTS, rh: 44 });
    // 짝 — [차례가기, 뛰어가기] · 높낮이 모양이 같음(도 · 레 · 미 둘레가 많게)
    const PAIRS = [[[D, R, M], [D, M, S]], [[M, R, D], [S, M, D]], [[D, R, D], [D, M, D]], [[M, R, M], [M, D, M]], [[R, M, R], [R, S, R]], [[S, L, S], [M, S, M]]];
    let streak = 0, cur = null, busy = false, prev = -1;
    const msg = h('p', { class: 'm-why' });
    const A = kit.answers([0, 1].map(k => ({ key: k, label: '' })), k => answer(k), { cls: 'g4-ans pic two m-busy' });
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function ask(newOne = true) {
      if (newOne) {
        let a; do { a = Math.floor(r() * (streak < 2 ? 4 : PAIRS.length)); } while (a === prev);
        prev = a;
        const ps = PAIRS[a][r() < 0.5 ? 0 : 1], order = shuffle(PAIRS[a], r);
        cur = { ps, ans: order.indexOf(ps), pics: order.map(bigPic) };
        cur.pics.forEach((pic, k) => A.btn(k).querySelector('.lab').replaceChildren(capOf(kit, order[k]), pic.el));
      }
      cur.pics.forEach(pic => pic.lit(-1));
      busy = true; V.cut(); T.clear(); board.rest(); A.clear(); A.busy(true);
      msg.textContent = '';
      const s = V.play(kit, cur.ps.map(p => ({ p, d: 0.5, gap: 0.2 })), { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; A.busy(false); });
    }
    function walk(ps, pic, sound) {
      if (!sound) { ps.forEach((p, k) => T.after(k * 240, () => { board.move(p, k === ps.length - 1 ? 'happy' : 'play'); pic.lit(k); })); return ps.length * 240; }
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(p); pic.lit(k); }));
      return kit.msUntil(s.ac, s.end);
    }
    function answer(k) {
      if (busy || !cur) return;
      busy = true;
      const right = k === cur.ans;
      markPick(A, cur.ans, k); judge(ui, right);
      msg.textContent = whyOf(cur.ps);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        walk(cur.ps, cur.pics[cur.ans], false);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1500, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        const mine = cur;
        T.after(500, () => { if (cur !== mine) return; A.busy(true); const ms = walk(cur.ps, cur.pics[cur.ans], true); T.after(ms + 700, () => ask(false)); });
      }
    }
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'm-play g4-play' }, h('div', { class: 'm-left' }, board.el, msg), A.el));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.ans); });
    const onKey = e => { const k = '12'.indexOf(e.key); if (k >= 0) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 레 계단 — 12판(? 판 넷 → 그림 판 여덟) ──
  game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));   // 방이 열린 TV 수업: 소리는 TV 하나 · 답은 각자(_tvs.js)
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, gone = false, plan = PLAN, sd = null, fmt = null;
    ui.say(SAY.q);
    const A = kit.answers(answerItems(h), k => choose(k), { cls: 'g4-ans m-busy' });
    const again = h('button', { type: 'button' }, '다시 듣기');
    const sc = makeScene(kit, A.el), board = sc.board;
    ui.stage.append(sc.el);
    const start = startCard(ui, kit, {
      title: '레 계단',
      lines: ['1~4번: ? 자리에서 난 소리를 미, 레, 도 중에서 골라요', '5~12번: 들은 가락이 차례가기인지 뛰어가기인지 골라요', '12번'],
      // 시작할 때 판 차례를 정함 — 단계(? 판 0~3 · 발전 4~7 · 비틀기 8~10 · 마무리 11) 안에서만 섞고, 그림 판은 들려줄 가락 · 그림 자리도 같은 씨앗으로(N2)
      onStart: () => { sd = kit.seed ? kit.seed() : 1; const r = kit.rng(sd); plan = arrange(kit.stageShuffle(PLAN, CUTS, r, SHUF), r); ui.setBar(again); toneSet(); },
    });
    ui.stage.append(start.card);
    // 시작 — 도-레-미(기준) 한 번 · 참새가 한 계단씩 밟음
    function toneSet() {
      const ps = [D, R, M];
      A.busy(true);
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => board.move(p)));
      T.after(kit.msUntil(s.ac, s.end) + 200, () => board.rest());
      T.after(kit.msUntil(s.ac, s.end) + 700, next);
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      const pl = plan[i];
      if (pl.fmt !== fmt) { fmt = pl.fmt; ui.say(SAY[fmt]); }
      const mine = cur = { ...pl, ans: pl.right, open: false, done: false, tok: 0 };
      sc.set(pl);
      mine.pics = dressAnswers(kit, A, pl);
      ui.count(i + 1, plan.length);
      A.clear();
      hear(mine);
    }
    // 참새 노래(처음 · '다시 듣기') — ? 판은 ? 자리 소리가 · 그림 판은 마지막 음이 나기 시작하면 누를 수 있음 · 다시 들으면 기다리는 시간도 새로(앞 타이머는 tok로 무름)
    //  듣는 동안 참새는 계단 위에서 노래만(높이를 미리 밟지 않음 — 화면으로 답이 새지 않게)
    function hear(mine) {
      const tok = ++mine.tok, live = () => cur === mine && mine.tok === tok && !mine.done && !gone;
      mine.open = false; A.busy(true); board.rest(); board.pose('play'); V.cut();
      const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.42, gap: 0.18 })), { inst: mine.inst });
      if (mine.fmt === 'q') mine.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { if (live()) sc.nowSlot(k); }));
      T.after(kit.msUntil(s.ac, s.starts[mine.fmt === 'q' ? mine.q : mine.ps.length - 1]), () => { if (live()) { mine.open = true; A.busy(false); } });
      T.after(kit.msUntil(s.ac, s.end) + 100, () => { if (live()) { board.pose('idle'); sc.nowSlot(-1); } });
      T.after(kit.msUntil(s.ac, s.end) + 3600, () => { if (live() && mine.open) choose(null); });
    }
    onPress(again, () => { if (cur && cur.open && !cur.done) hear(cur); });
    // 참새가 들은 가락대로 계단을 밟음 — 맞으면 소리 없이 빠르게 · 틀리면 소리와 함께 천천히
    function walk(mine, sound, then) {
      const pic = mine.pics[mine.ans], lit = k => { if (pic) pic.lit(k); if (mine.fmt === 'q') sc.nowSlot(k); };
      if (!sound) {
        mine.ps.forEach((p, k) => T.after(k * 220, () => { if (cur === mine) { board.move(p, k === mine.ps.length - 1 ? 'happy' : 'play'); lit(k); } }));
        T.after(mine.ps.length * 220 + 260, () => { if (cur === mine) lit(-1); then(); });
        return;
      }
      const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.36, gap: 0.16 })), { inst: 'xylo' });
      mine.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { if (cur === mine) { board.move(p); lit(k); } }));
      T.after(kit.msUntil(s.ac, s.end) + 450, () => { if (cur === mine) lit(-1); then(); });
    }
    function choose(k) {
      if (!cur || !cur.open) return;
      cur.open = false; cur.done = true;
      const right = k === cur.ans, mine = cur;
      results.push(k == null ? null : right);   // 시간 지남은 틀림과 따로(N1)
      markPick(A, cur.ans, k); A.busy(false);
      sc.reveal(cur); sc.nowSlot(-1);
      judge(ui, right, { missed: k == null });
      if (right) { kit.sfx.good(engine); T.after(150, () => walk(mine, false, () => T.after(250, next))); return; }
      kit.sfx.oops(engine); board.pose('oops');
      T.after(550, () => { if (cur !== mine || gone) return; A.busy(true); walk(mine, true, next); });
    }
    function end() {
      const s = kit.scoreChoices(results, 5, { chance: GUESS(plan) }), tip = tipOf(plan, results);
      sc.el.hidden = true; ui.count(null);   /* 결과 뒤에는 빈 무대(친구 그림은 칸 화면이 붙임) */
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
    }
    kit.setAuto(() => { if (start.waiting()) press(start.btn); else if (cur && cur.open) choose(cur.ans); });
    const onKey = e => {
      if (!cur) return;
      const k = cur.fmt === 'q' ? { 1: 0, 2: 1, 3: 2, ArrowUp: 0, ArrowDown: 2 }[e.key] : { 1: 0, 2: 1 }[e.key];
      if (k != null) choose(k);
    };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
