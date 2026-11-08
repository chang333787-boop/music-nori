// 가3 도 · 건너뛰는 가락 — 솔-미-라 틀 아래로 넓혀 도(C4)를 더한다. 도-미-솔은 계단을 하나씩 건너뛰어 오른다(빈 계단 = 레 · 파)
//  높이는 늘 세로 위치 · 계이름 글자와 색(theory.js colorOf — 도 자주)을 함께 · 가온 도 위 음역 · 세기 같게.
//  그림의 가로 줄은 오선처럼 보이지 않게 사다리 띠로만(평가 2차 — 다섯 줄이 아닌 점선은 오선과 헷갈림)
//  보기: 예시 둘(실로폰 도-미-솔 · 피아노 솔-미-도) + 「도에서 뛰어올라」 높이 그림 · 손 높이(도 배 · 미 가슴 · 솔 어깨 · 라 턱)
//  연습: 세 음 가락을 듣고 같은 모양 그림 고르기(둘 중 하나 · 오른쪽 답 단추)
//  확인 게임 '건너뛰는 가락 그림 고르기' 10판 — 오른쪽 답 단추 넷 자리는 처음부터(셋 고르는 판에서는 넷째를 잠가 둠)
//   소개(셋 중 하나 · 오르기 · 내리기) → 발전(오르내림이 섞임) → 비틀기(넷 중 하나 · 비슷해 보이는 그림 미-솔-라처럼 마지막이 바로 위 계단 · 피아노 · 리코더) → 마무리(다섯 음)
//   고른 뒤에는 왼쪽 높이 판에서 참새가 들은 가락대로 계단을 밟는다(맞는 그림도 함께 반짝)
//  11-07 평가 3차: 왼쪽 높이 판 40% · 오른쪽 그림 답을 크게 · 셋 고르는 판은 넷째를 빼고 셋을 세로 가운데 · 듣는 동안 A.busy('잘 들어요')
//   · 게임 아래 띠 '다시 듣기'(다시 들으면 기다리는 시간도 새로) · 노래 그림 동전 26px
import { DO, RE, MI, FA, SOL, LA, nameOf, heightBoard, heightPic, songNotes, voice, playBeats, startCard, press, exCard, hearHead, markPick, judge } from './_mel.js';

const D = DO, M = MI, S = SOL, L = LA;
const EXAMPLES = [
  { inst: 'xylo', name: '실로폰', ps: [D, M, S] },
  { inst: 'piano', name: '피아노', ps: [S, M, D] },
];
const PLAN = [
  { ps: [D, M, S], alt: [[S, M, D], [M, D, S]] },
  { ps: [S, M, D], alt: [[D, M, S], [D, S, M]] },
  { ps: [D, S, M], alt: [[D, M, S], [S, M, D]] },
  { ps: [M, D, S], alt: [[M, S, D], [D, M, S]] },
  { ps: [S, D, M], alt: [[S, M, D], [M, D, S]] },
  { ps: [M, S, D], alt: [[M, D, S], [S, M, D]] },
  { ps: [D, M, S], alt: [[M, S, L], [S, M, D], [D, S, M]], inst: 'piano' },
  { ps: [S, M, D], alt: [[L, S, M], [D, M, S], [S, D, M]], inst: 'recorder' },
  { ps: [D, S, M], alt: [[M, L, S], [D, M, S], [S, M, D]], inst: 'piano' },
  { ps: [D, M, S, M, D], alt: [[D, M, S, L, S], [S, M, D, M, S], [M, S, L, S, M]] },
];
const ROWS = [D, M, S, L], GHOSTS = [RE, FA];
const names = ps => ps.map(nameOf).join('-');
function shape(ps) {
  const up = ps.every((p, k) => !k || p > ps[k - 1]), down = ps.every((p, k) => !k || p < ps[k - 1]);
  if (up) return '건너뛰며 올라갔어요';
  if (down) return '건너뛰며 내려왔어요';
  return ps[1] > ps[0] ? '올라갔다가 내려왔어요' : '내려갔다가 올라왔어요';
}
// 그림 — 같은 세로 자(도 · 미 · 솔 · 라)로 그려 높이를 견줄 수 있게
const picOf = (ps, o) => heightPic(ps.map((p, t) => ({ p, t })), { rows: ROWS, join: true, ...o });

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('도-미-솔은 계단을 하나씩 건너뛰어 올라가요');
    const board = heightBoard(kit, { notes: [D, M, S, L], ghosts: GHOSTS, hands: true, rh: 44 });
    const quiet = [];
    const stopAll = () => { T.clear(); V.cut(); board.rest(); quiet.forEach(f => f()); };
    const cards = EXAMPLES.map(ex => {
      const pic = picOf(ex.ps, { ghosts: GHOSTS, height: 128, unit: 56, r: 17 });
      const btn = exCard(kit, { name: ex.name, pic: pic.el });
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
    const song = songNotes('ga3-jump');
    const spic = heightPic(song.notes, { rows: ROWS, ghosts: GHOSTS, height: 128, unit: 40, r: 13, pill: true });
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

  // ── 연습: 들은 가락과 같은 그림(둘 중 하나) — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('들은 가락과 같은 모양 그림을 골라요');
    const board = heightBoard(kit, { notes: [D, M, S, L], ghosts: GHOSTS, rh: 44 });
    const PERM = [[D, M, S], [S, M, D], [D, S, M], [M, D, S], [S, D, M], [M, S, D]];
    let streak = 0, cur = null, busy = false, prev = -1;
    const msg = h('p', { class: 'm-why' });
    const A = kit.answers([0, 1].map(k => ({ key: k, label: '' })), k => answer(k), { cls: 'g3-ans two m-busy' });
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function ask(newOne = true) {
      if (newOne) {
        let a; do { a = Math.floor(r() * PERM.length); } while (a === prev);
        prev = a;
        const ps = PERM[a];
        // 다른 그림 = 모양이 다른 것(처음은 거꾸로 가는 것을 더 자주)
        const others = PERM.filter(q => q !== ps);
        const alt = r() < 0.5 ? [...ps].reverse() : others[Math.floor(r() * others.length)];
        const order = r() < 0.5 ? [ps, alt] : [alt, ps];
        cur = { ps, ans: order.indexOf(ps), pics: order.map(q => picOf(q, { height: 132, unit: 140, r: 18 })) };
        cur.pics.forEach((pic, k) => A.btn(k).querySelector('.lab').replaceChildren(pic.el));
      }
      cur.pics.forEach(pic => pic.lit(-1));
      busy = true; V.cut(); T.clear(); board.rest(); A.clear(); A.busy(true);
      msg.textContent = '';
      const s = V.play(kit, cur.ps.map(p => ({ p, d: 0.5, gap: 0.2 })), { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; A.busy(false); });
    }
    function walk(ps, pic) {
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(p); pic.lit(k); }));
      return s;
    }
    function answer(k) {
      if (busy || !cur) return;
      busy = true;
      const right = k === cur.ans;
      markPick(A, cur.ans, k); judge(ui, right);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        msg.textContent = `${names(cur.ps)} — ${shape(cur.ps)}`;
        board.move(cur.ps[cur.ps.length - 1], 'happy');
        if (streak >= 3) { kit.pass(); return; }
        T.after(1100, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        msg.textContent = `들은 가락은 ${names(cur.ps)} — ${shape(cur.ps)}`;
        const mine = cur;
        T.after(500, () => { if (cur !== mine) return; A.busy(true); const s = walk(cur.ps, cur.pics[cur.ans]); T.after(kit.msUntil(s.ac, s.end) + 700, () => ask(false)); });
      }
    }
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'm-play g3-play' }, h('div', { class: 'm-left' }, board.el, msg), A.el));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.ans); });
    const onKey = e => { const k = '12'.indexOf(e.key); if (k >= 0) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 건너뛰는 가락 그림 고르기 — 10판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    const results = [];
    let i = -1, cur = null, gone = false;
    ui.say('참새 노래와 같은 모양 그림을 골라요');
    const board = heightBoard(kit, { notes: [D, M, S, L], ghosts: GHOSTS, rh: 44 });
    // 답 자리 넷 — 처음부터 깔고, 셋 고르는 판에서는 넷째를 잠가 둠(잠근 단추는 빼고 남은 셋을 세로 가운데 · 그림이 판마다 바뀌니 자리를 지킬 까닭이 없음)
    const A = kit.answers([0, 1, 2, 3].map(k => ({ key: k, label: '', locked: k === 3 })), k => choose(k), { cls: 'g3-ans four m-busy' });
    const again = h('button', { type: 'button' }, '다시 듣기');
    const scene = h('div', { class: 'g3-scene' }, board.el, A.el);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '건너뛰는 가락 그림 고르기',
      lines: ['참새 노래를 듣고 같은 모양 그림을 눌러요', '10번'],
      onStart: () => { ui.setBar(again); toneSet(); },
    });
    ui.stage.append(sc.card);
    // 시작 — 도-미-솔(기준) 한 번 · 참새가 계단을 밟음
    function toneSet() {
      const ps = [D, M, S];
      A.busy(true);
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => board.move(p)));
      T.after(kit.msUntil(s.ac, s.end) + 200, () => board.rest());
      T.after(kit.msUntil(s.ac, s.end) + 700, next);
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const pl = PLAN[i];
      const order = kit.shuffle([pl.ps, ...pl.alt], r);
      const mine = cur = { ps: pl.ps, inst: pl.inst || 'xylo', ans: order.indexOf(pl.ps), open: false, done: false, tok: 0 };
      mine.pics = order.map(q => picOf(q, { height: 76, unit: q.length > 3 ? 85 : 170, r: 12, pad: 2, label: false }));
      [0, 1, 2, 3].forEach(k => {
        A.btn(k).querySelector('.lab').replaceChildren(...(mine.pics[k] ? [mine.pics[k].el] : []));
        A.lock(k, k >= order.length);
      });
      ui.count(i + 1, PLAN.length);
      A.clear();
      hear(mine);
    }
    // 참새 노래(처음 · '다시 듣기') — 마지막 음이 나기 시작하면 누를 수 있음 · 다시 들으면 기다리는 시간도 새로(앞 타이머는 tok로 무름)
    function hear(mine) {
      const tok = ++mine.tok, live = () => cur === mine && mine.tok === tok && !mine.done && !gone;
      mine.open = false; A.busy(true); board.rest(); board.pose('play'); V.cut();
      const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.42, gap: 0.18 })), { inst: mine.inst });
      T.after(kit.msUntil(s.ac, s.starts[mine.ps.length - 1]), () => { if (live()) { mine.open = true; A.busy(false); } });
      T.after(kit.msUntil(s.ac, s.end) + 100, () => { if (live()) board.pose('idle'); });
      T.after(kit.msUntil(s.ac, s.end) + 3800, () => { if (live() && mine.open) choose(null); });
    }
    onPress(again, () => { if (cur && cur.open && !cur.done) hear(cur); });
    function choose(k) {
      if (!cur || !cur.open) return;
      cur.open = false; cur.done = true;
      const right = k === cur.ans, pic = cur.pics[cur.ans];
      results.push(right);
      markPick(A, cur.ans, k); A.busy(false);
      judge(ui, right, { missed: k == null });
      if (right) { kit.sfx.good(engine); board.move(cur.ps[cur.ps.length - 1], 'happy'); T.after(1000, next); return; }
      kit.sfx.oops(engine); board.pose('oops');
      const mine = cur;
      T.after(550, () => {
        if (cur !== mine || gone) return;
        A.busy(true);
        const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.38, gap: 0.16 })), { inst: 'xylo' });
        mine.ps.forEach((p, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => { board.move(p); pic.lit(j); }));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { pic.lit(-1); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5, { chance: PLAN.map(p => 1 / (1 + p.alt.length)) });   // 찍기 바닥 — 그림 수만큼
      const wrongAt = results.map((ok, k) => (ok ? -1 : k)).filter(k => k >= 0);
      const twist = wrongAt.filter(k => k >= 6 && k <= 8).length, mixed = wrongAt.filter(k => k >= 3 && k <= 5).length;
      let tip;
      if (!wrongAt.length) tip = '마지막에 바로 위 계단으로 가는 비슷한 그림(미-솔-라)까지 모두 가려냈어요.';
      else if (twist >= wrongAt.length / 2) tip = '비슷해 보이는 그림(7번째부터)에서 헷갈렸어요. 미-솔-라는 솔에서 라로 바로 위 계단, 도-미-솔은 끝까지 한 칸씩 건너뛰어요.';
      else if (mixed >= wrongAt.length / 2) tip = '올라갔다 내려오는 가락(4~6번째)에서 헷갈렸어요. 가장 낮은 도가 몇 번째에 나왔는지 먼저 찾아봐요.';
      else tip = '오르기·내리기에서 헷갈렸어요. 도-미-솔은 위로, 솔-미-도는 아래로 건너뛰어요.';
      board.el.hidden = true; A.el.hidden = true; ui.count(null);   /* 결과 뒤에는 빈 무대(친구 그림은 칸 화면이 붙임) */
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open) choose(cur.ans); });
    const onKey = e => { const k = '1234'.indexOf(e.key); if (k >= 0 && cur && cur.pics[k]) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
