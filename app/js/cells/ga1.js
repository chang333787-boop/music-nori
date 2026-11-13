// 가1 솔·미 — 노래 길의 첫 두 음(코다이 전통은 솔-미부터 시작한다 · 따라 부르기 쉬운 음정이라는 실험이 있으나 근거는 중~약)
//  높이는 늘 세로 위치: 솔 = 위 계단 · 미 = 아래 계단. 계이름 글자와 색(theory.js colorOf)을 함께 · 가온 도 위 음역 · 세기 같게.
//  보기: 예시 둘(목소리 · 실로폰 — 그림은 1:1 크기로 크게) + 「솔미 인사」 높이 그림 · 손 높이(솔 어깨 · 미 가슴)
//  연습: 처음 소리(지시 줄에 이름) 다음 소리가 솔인지 미인지 — 같은 높이면 같은 이름, 솔보다 낮으면 미
//  확인 게임 메아리 언덕(언덕 = 코덱스 장면 그림 prop_hill): 참새가 부른 차례대로 솔 · 미 답 단추 누르기 12판
//   소개(솔-미 · 미-솔: 오르내림만 들어도 됨) → 발전(솔-솔 · 미-미 섞임) → 비틀기(세 음 · 리코더 · 피아노) → 마무리(세 음)
//  11-07 평가 2차: 지시 한 줄 · 번호 ui.count · 맞음 말 ui.tell · 연습 점 ui.practice · 답 단추 kit.answers(솔 위 · 미 아래 = 메아리 길 높이와 같은 줄)
//  11-07 평가 3차: 듣는 동안 A.busy('잘 들어요') · 게임 아래 띠 '다시 듣기'(다시 들으면 기다리는 시간도 새로) · 틀린 판은 맞는 음을 초록 테두리 + ✓로(점선 X) · 노래 그림 동전 26px
import { SOL, MI, nameOf, josa, colorOf, heightBoard, heightPic, songNotes, voice, playBeats, badge, startCard, press, exCard, hearHead, noteAnswers, markPick, judge, dot } from './_mel.js';
import { tvsGame } from './_tvs.js';
import { tipPick, nearSeq } from '../cellkit.js';

const S = SOL, M = MI;
const EXAMPLES = [
  { inst: 'choir', name: '목소리', ps: [S, M] },
  { inst: 'xylo', name: '실로폰', ps: [M, S] },
];
export const PLAN = [
  [[S, M], 'xylo'], [[M, S], 'xylo'], [[S, M], 'xylo'], [[M, S], 'xylo'],
  [[S, S], 'xylo'], [[M, S], 'xylo'], [[M, M], 'xylo'], [[S, M], 'xylo'],
  [[S, S, M], 'recorder'], [[M, S, M], 'recorder'], [[S, M, S], 'piano'],
  [[M, M, S], 'xylo'],
];
export const CUTS = [4, 8, 11];                   // 단계 경계(섞어도 '9번째부터 세 음' 말이 그대로 맞게)
// 찍기 바닥 확률 — 그냥 찍기(두 음 1/4 · 세 음 1/8)가 아니라 '솔미 · 미솔 번갈아 누르기'처럼 문항 꼴을 아는 찍기까지 막게 넉넉히(두 음 1/2 · 세 음 1/4)
//  11-08 시험: 그냥 찍기 확률로 바닥을 정하면 번갈아 누르기 봇이 씨앗 31%에서 별을 받았음
export const GUESS = plan => plan.map(p => (p[0].length === 2 ? 1 / 2 : 1 / 4));
export const SHUF = { flip: ([ps, inst]) => [ps.map(p => (p === S ? M : S)), inst], answerOf: p => p[0][0] };   // 뒤집기 = 솔↔미 · 답 = 첫 음
// 두 번째 소리를 처음 소리에 견줘 말하기(까닭)
const why = (a, b) => (a === b ? `처음과 같은 높이, ${josa(nameOf(b), '이에요/예요')}`
  : `${nameOf(a)}보다 ${b > a ? '높은' : '낮은'} 소리, ${josa(nameOf(b), '이에요/예요')}`);

// TV '틀린 갈래' 막대 이름(X6 둘째) — 아래 tipOf 갈래와 같은 차례 · 짧게(선생님이 다시 짚을 곳)
export const TIPS_TV = ['같은 음 두 번(솔-솔 · 미-미)', '세 음 메아리', '솔-미 · 미-솔'];
// 헷갈리는 두 소리(X11) — 별 0일 때 결과 화면에서 번갈아 듣기(점수 없음) · 둘째 음이 내려가나, 그대로인가
const nearMel = ps => nearSeq(ps.map(p => ({ p, d: 0.42, gap: 0.2 })), { inst: 'xylo' });
export const NEAR = [
  { label: '솔-미', play: nearMel([S, M]) },
  { label: '솔-솔', play: nearMel([S, S]) },
];
// 결과 한 줄 — 틀린 메아리 갈래(같은 음 두 번 · 세 음 · 솔미 오르내림) · 고른 갈래의 차례는 tipPick에(TV 막대)
export function tipOf(plan, results) {
  const bad = plan.map((p, k) => (results[k] ? null : p[0])).filter(Boolean);
  const same = bad.filter(ps => ps.length === 2 && ps[0] === ps[1]).length;
  const three = bad.filter(ps => ps.length === 3).length;
  tipPick.n = TIPS_TV.length; tipPick.b = -1;
  if (!bad.length) return '같은 음이 이어질 때도, 세 음일 때도 모두 메아리로 돌려줬어요.';
  if (same >= three && same >= bad.length / 2) { tipPick.b = 0; return '같은 음이 두 번(솔-솔·미-미) 나올 때 헷갈렸어요. 첫 소리가 높은 솔인지 낮은 미인지 먼저 떠올려 봐요.'; }
  if (three >= bad.length / 2) { tipPick.b = 1; return '세 음 메아리(9번째부터)에서 헷갈렸어요. 따라 부르며 손을 올리고 내리면 차례가 잘 남아요.'; }
  tipPick.b = 2;
  return '솔-미, 미-솔 메아리에서 헷갈렸어요. 내려가면 솔 → 미, 올라가면 미 → 솔이에요.';
}

// ── 소리는 TV 하나 · 답은 각자(_tvs.js) — 참새가 부른 차례대로 솔 · 미를 각자 누름(다 누르면 '답했어요' · 누른 칸엔 회색 점만 — 옆 친구가 따라 하지 않게)
//  판마다 음 0.42초 + 틈 0.2초 · 마지막 음이 나기 시작하면 누를 수 있음(음 수는 칸 수로 이미 보임) · 가장 긴 세 음 끝 + 3.8초에 닫힘
//  답 글자 = 누른 차례 하나(두 음 4~7 · 세 음 8~f — 솔 = 1 비트) · TV 막대는 '같게 · 다르게' 둘
export const TVS = true;
const T1_NOTE = 620, T1_CLOSE = 300 + 3 * T1_NOTE - 200 + 3800;
export const tvsSpec = (ui, kit) => ({
  plan: sd => kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF),
  P: T1_CLOSE + 700, OPEN: ([ps]) => 300 + (ps.length - 1) * T1_NOTE, CLOSE: T1_CLOSE,
  say: { kid: 'TV 참새가 부른 차례대로 솔, 미를 눌러요', tv: '소리는 TV에서 — 아이들은 각자 기기로 메아리를 눌러요' },
  items: [S, M].map(p => ({ key: p, label: nameOf(p), chip: dot(kit.h, p) })),
  answersOpt: { cls: 'm-ans e1-ans' },
  rightOf: p => p[0],
  seq: { code: ps => '0123456789abcdef'[(1 << ps.length) | ps.reduce((a, p, j) => a | (p === S ? 1 << j : 0), 0)], text: ps => ps.map(nameOf).join('-') },
  intro: V => kit.playSeq(kit.engine, [{ p: S, d: 0.5, gap: 0.25 }, { p: M, d: 0.5 }], { inst: 'xylo', out: V.out }),
  view({ kidSide, V, T, side }) {
    const { h } = kit;
    const bird = h('div', { class: 'e1-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const poseB = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const slot = () => h('div', { class: 'e1-slot' }, h('i', { class: 'e1-row hi', style: { '--c': colorOf(S) } }), h('i', { class: 'e1-row lo', style: { '--c': colorOf(M) } }));
    const path = h('div', { class: 'e1-path' });
    const axis = h('div', { class: 'e1-axis', 'aria-hidden': 'true' }, badge(h, S, 'hi'), badge(h, M, 'lo'));
    const nowSlot = k => [...path.children].forEach((s, j) => s.classList.toggle('now', j === k));
    return {
      el: h('div', { class: 'e1-scene' }, h('img', { class: 'e1-hill', src: 'app/img/scene/prop_hill.webp', alt: '', draggable: 'false' }), bird, h('div', { class: 'e1-mid' }, axis, path), side),
      item: ([ps]) => { path.replaceChildren(...ps.map(slot)); nowSlot(kidSide ? 0 : -1); poseB('idle'); },
      play([ps, inst], at) {
        poseB('play');
        const s = kit.playSeq(kit.engine, ps.map(p => ({ p, d: 0.42, gap: 0.2 })), { inst, out: V.out, at });
        ps.forEach((_, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => nowSlot(k)));
        T.after(kit.msUntil(s.ac, s.end) + 120, () => { nowSlot(-1); poseB('idle'); });
      },
      tap: k => { path.children[k].append(h('span', { class: 'e1-put hid' })); nowSlot(k + 1); },
      close([ps], r) {
        nowSlot(-1); path.querySelectorAll('.e1-put').forEach(e => e.remove());
        ps.forEach((p, k) => path.children[k].append(h('span', { class: 'e1-put ' + (p === S ? 'hi' : 'lo') + (kidSide && !r ? ' fix' : ''), style: { '--c': colorOf(p) } }, badge(h, p))));
        poseB(!kidSide || r ? 'happy' : r === false ? 'oops' : 'idle');
      },
      done: () => { bird.hidden = true; path.hidden = true; axis.hidden = true; },
    };
  },
  tip: tipOf, chance: GUESS,
});

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('솔은 위, 미는 아래 — 손도 같이 올리고 내려요');
    const board = heightBoard(kit, { notes: [M, S], hands: true, rh: 68 });
    const quiet = [];
    const stopAll = () => { T.clear(); V.cut(); board.rest(); quiet.forEach(f => f()); };
    const cards = EXAMPLES.map(ex => {
      const pic = heightPic(ex.ps.map((p, t) => ({ p, t })), { rows: [M, S], height: 104, unit: 70, r: 18 });
      const btn = exCard(kit, { name: ex.name, pic: pic.el });
      quiet.push(() => pic.lit(-1));
      onPress(btn, () => {
        stopAll();
        const s = V.play(kit, ex.ps.map(p => ({ p, d: 0.55, gap: 0.2 })), { inst: ex.inst });
        ex.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(p); pic.lit(k); }));
        T.after(kit.msUntil(s.ac, s.end) + 250, stopAll);
        btn.classList.add('heard');
      });
      return btn;
    });
    const song = songNotes('ga1-insa');
    const spic = heightPic(song.notes, { rows: [M, S], height: 104, unit: 40, r: 13, pill: true });
    const sbtn = exCard(kit, { name: `노래 「${song.title}」`, pic: spic.el, wide: true });
    quiet.push(() => spic.lit(-1));
    onPress(sbtn, () => {
      stopAll();
      const s = playBeats(V, kit, song.notes, { tempo: song.tempo, inst: 'xylo' });
      song.notes.forEach((n, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(n.p); spic.lit(k); }));
      T.after(kit.msUntil(s.ac, s.end) + 300, stopAll);
      sbtn.classList.add('heard');
    });
    ui.stage.append(h('div', { class: 'cols ga-cols' }, board.el, h('div', { class: 'm-excol' }, hearHead(h), h('div', { class: 'm-exgrid' }, ...cards, sbtn))));
    const all = [...cards, sbtn];
    let k = 0;
    kit.setAuto(() => { if (k < all.length) press(all[k++]); else kit.next(); });
    return () => { T.clear(); V.cut(); };
  },

  // ── 연습: 처음 소리 다음 소리는 솔? 미? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    const board = heightBoard(kit, { notes: [M, S], rh: 68 });
    let streak = 0, cur = null, busy = false, prev = '';
    const msg = h('p', { class: 'm-why' });
    const A = noteAnswers(kit, [S, M], p => answer(p), 'm-busy');
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function ask(newOne = true) {
      if (newOne) {
        let a, b;
        do { a = r() < 0.5 ? S : M; b = r() < 0.5 ? S : M; } while (`${a}${b}` === prev);
        prev = `${a}${b}`; cur = { a, b };
      }
      busy = true; V.cut(); T.clear(); A.clear(); A.busy(true);
      ui.say(`처음은 ${nameOf(cur.a)}. 두 번째 소리는 솔일까요, 미일까요?`);
      msg.textContent = '';
      const s = V.play(kit, [{ p: cur.a, d: 0.55, gap: 0.3 }, { p: cur.b, d: 0.6 }], { inst: 'xylo' });
      board.move(cur.a, 'idle');
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; A.busy(false); });
    }
    function answer(p) {
      if (busy || !cur) return;
      busy = true;
      const right = p === cur.b;
      board.move(cur.b, right ? 'happy' : 'oops');
      markPick(A, cur.b, p); judge(ui, right);
      msg.textContent = why(cur.a, cur.b);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1100, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        T.after(1700, () => ask(false));
      }
    }
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'm-play' }, h('div', { class: 'm-left' }, board.el, msg), A.el));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.b); });
    const onKey = e => { if (e.key === 'ArrowUp') answer(S); else if (e.key === 'ArrowDown') answer(M); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 메아리 언덕 — 12판 ──
  game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));   // 방이 열린 TV 수업: 소리는 TV 하나 · 답은 각자(_tvs.js)
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, open = false, gone = false, plan = PLAN, sd = null;
    ui.say('참새가 부른 대로 메아리처럼 따라 눌러요');
    const bird = h('div', { class: 'e1-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const pose = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const hill = h('img', { class: 'e1-hill', src: 'app/img/scene/prop_hill.webp', alt: '', draggable: 'false' });
    const slot = () => h('div', { class: 'e1-slot' }, h('i', { class: 'e1-row hi', style: { '--c': colorOf(S) } }), h('i', { class: 'e1-row lo', style: { '--c': colorOf(M) } }));
    const path = h('div', { class: 'e1-path' }, slot(), slot());
    const axis = h('div', { class: 'e1-axis', 'aria-hidden': 'true' }, badge(h, S, 'hi'), badge(h, M, 'lo'));
    const A = noteAnswers(kit, [S, M], p => tap(p), 'e1-ans');
    const again = h('button', { type: 'button' }, '다시 듣기');
    const scene = h('div', { class: 'e1-scene' }, hill, bird, h('div', { class: 'e1-mid' }, axis, path), A.el);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '메아리 언덕',
      lines: ['참새가 부른 차례대로 솔, 미를 눌러 메아리를 돌려줘요', '12번'],
      // 시작할 때 판 차례를 정함 — 단계(두 음 0~3 · 4~7 · 세 음 8~10 · 마무리 11) 안에서만 섞고 반쯤 솔↔미를 뒤집음(N2 · 번갈아 누르기로 못 맞히게)
      onStart: () => { sd = kit.seed ? kit.seed() : 1; plan = kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF); ui.setBar(again); toneSet(); },
    });
    ui.stage.append(sc.card);

    // 시작 — '이게 솔, 이게 미'(기준 소리) 한 번 들려준 뒤 첫 판
    function toneSet() {
      A.busy(true);
      const s = V.play(kit, [{ p: S, d: 0.5, gap: 0.25 }, { p: M, d: 0.5 }], { inst: 'xylo' });
      const glow = p => [S, M].forEach(q => A.btn(q).classList.toggle('glow', q === p));
      T.after(kit.msUntil(s.ac, s.starts[0]), () => glow(S));
      T.after(kit.msUntil(s.ac, s.starts[1]), () => glow(M));
      T.after(kit.msUntil(s.ac, s.end) + 150, () => glow(null));
      T.after(kit.msUntil(s.ac, s.end) + 700, next);
    }
    const slots = () => [...path.children];
    function put(k, p, cls = '') {
      const st = h('span', { class: 'e1-put ' + (p === S ? 'hi ' : 'lo ') + cls, style: { '--c': colorOf(p) } }, badge(h, p));
      slots()[k].append(st);
      return st;
    }
    const nowSlot = k => slots().forEach((s, j) => s.classList.toggle('now', j === k));
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      const [ps, inst] = plan[i];
      cur = { ps, inst, k: 0, tok: 0, done: false };
      ui.count(i + 1, plan.length);
      path.replaceChildren(...ps.map(slot));
      A.clear();
      hear(cur);
    }
    // 참새 노래(처음 · '다시 듣기') — 마지막 음이 나기 시작하면 누를 수 있음 · 다시 들으면 기다리는 시간도 새로(앞 타이머는 tok로 무름)
    function hear(mine) {
      const tok = ++mine.tok, live = () => cur === mine && mine.tok === tok && !mine.done && !gone;
      open = false; A.busy(true); pose('play'); V.cut();
      const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.42, gap: 0.2 })), { inst: mine.inst });
      mine.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { if (live()) nowSlot(k); }));
      T.after(kit.msUntil(s.ac, s.starts[mine.ps.length - 1]), () => { if (live()) { open = true; A.busy(false); } });
      T.after(kit.msUntil(s.ac, s.end) + 120, () => { if (live()) { pose('idle'); nowSlot(mine.k); } });
      T.after(kit.msUntil(s.ac, s.end) + 1800 + mine.ps.length * 800, () => { if (live() && open) fail(mine.k, true); });
    }
    onPress(again, () => { if (open && cur && !cur.done) hear(cur); });
    function tap(p) {
      if (!open || !cur) return;
      const k = cur.k;
      engine.note('marimba', p, engine.ensure().currentTime + 0.01, 0.32, 0.8);
      if (p !== cur.ps[k]) { put(k, p, 'miss'); markPick(A, cur.ps[k], p); fail(k, false); return; }
      put(k, p);
      cur.k++;
      if (cur.k < cur.ps.length) { nowSlot(cur.k); return; }
      open = false; cur.done = true; nowSlot(-1);
      results.push(true);
      T.after(260, () => kit.sfx.good(engine));
      judge(ui, true); pose('happy');
      T.after(1000, next);
    }
    // 틀림 · 놓침 — 맞는 음을 초록 테두리 + ✓로 보여 주고(잘못 누른 음은 회색) 바른 메아리를 한 번 더
    function fail(k, missed) {
      open = false; cur.done = true; nowSlot(-1);
      results.push(false);
      kit.sfx.oops(engine);
      judge(ui, false, { missed }); pose('oops');
      const ps = cur.ps;
      for (let j = k; j < ps.length; j++) put(j, ps[j], 'fix');
      T.after(700, () => {
        if (gone) return;
        A.busy(true);
        const s = V.play(kit, ps.map(p => ({ p, d: 0.38, gap: 0.16 })), { inst: 'marimba' });
        ps.forEach((p, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => nowSlot(j)));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { nowSlot(-1); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5, { chance: GUESS(plan) }), tip = tipOf(plan, results);
      bird.hidden = true; A.el.hidden = true; path.hidden = true; axis.hidden = true; ui.count(null);   /* 결과 뒤에는 언덕만(친구 그림은 칸 화면이 붙임) */
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (open && cur) tap(cur.ps[cur.k]); });
    const onKey = e => { if (e.key === 'ArrowUp') tap(S); else if (e.key === 'ArrowDown') tap(M); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
