// 가3 도(뛰어가는 가락) — 솔-미-라 틀 아래로 넓혀 도(C4)를 더한다. 도-미-솔은 계단을 하나씩 건너뛰어 오른다(빈 계단 = 레 · 파)
//  높이는 늘 세로 위치 · 계이름 글자와 무지개 색(theory.js colorOf)을 함께 · 가온 도 위 음역 · 세기 같게.
//  보기: 예시 넷(도-미-솔 · 솔-미-도 · 도-솔-미 · 도-미-솔-미-도) + 「도에서 뛰어올라」 높이 그림 · 손 높이(도 배 · 미 가슴 · 솔 어깨 · 라 턱)
//  따라 하기: 세 음 가락을 듣고 같은 모양 그림 고르기(둘 중 하나)
//  확인 게임 '뛰는 가락 그림 고르기' 10판
//   소개(셋 중 하나 · 오르기 · 내리기) → 발전(오르내림이 섞임) → 비틀기(넷 중 하나 · 모양은 같고 높이만 다른 그림 미-솔-라 · 피아노 · 리코더) → 마무리(다섯 음)
import { DO, RE, MI, FA, SOL, LA, nameOf, heightBoard, heightPic, songNotes, voice, playBeats, startCard, press, sayWord } from './_mel.js';

const D = DO, M = MI, S = SOL, L = LA;
const EXAMPLES = [
  { inst: 'xylo', name: '실로폰', ps: [D, M, S] },
  { inst: 'piano', name: '피아노', ps: [S, M, D] },
  { inst: 'choir', name: '목소리', ps: [D, S, M] },
  { inst: 'recorder', name: '리코더', ps: [D, M, S, M, D] },
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
  { ps: [D, M, S, M, D], alt: [[D, M, S, L, S], [S, M, D, M, S]] },
];
const ROWS = [D, M, S, L], GHOSTS = [RE, FA];
const names = ps => ps.map(nameOf).join('-');
function shape(ps) {
  const up = ps.every((p, k) => !k || p > ps[k - 1]), down = ps.every((p, k) => !k || p < ps[k - 1]);
  if (up) return '건너뛰며 올라갔어요';
  if (down) return '건너뛰며 내려왔어요';
  return ps[1] > ps[0] ? '올라갔다가 내려왔어요' : '내려갔다가 올라왔어요';
}
// 그림 카드 — 같은 세로 자(도 · 미 · 솔 · 라 + 빈 계단 레 · 파)로 그려 높이를 견줄 수 있게
const picOf = (ps, height, r = 18, unit = ps.length > 3 ? 44 : 62) => heightPic(ps.map((p, t) => ({ p, t })), { rows: ROWS, ghosts: GHOSTS, height, unit, r, join: true });

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
      const pic = heightPic(ex.ps.map((p, t) => ({ p, t })), { rows: [D, M, S], height: 80, unit: ex.ps.length > 3 ? 34 : 44, join: true });
      const btn = h('button', { type: 'button', class: 'excard m-ex' }, h('b', {}, ex.name), pic.el);
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
    const spic = heightPic(song.notes, { rows: ROWS, height: 104, unit: 38, r: 14, pill: true });
    const sbtn = h('button', { type: 'button', class: 'excard m-song' }, h('b', {}, `노래 「${song.title}」`), spic.el);
    quiet.push(() => spic.lit(-1));
    onPress(sbtn, () => {
      stopAll();
      const s = playBeats(V, kit, song.notes, { tempo: song.tempo, inst: 'xylo' });
      song.notes.forEach((n, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(n.p); spic.lit(k); }));
      T.after(kit.msUntil(s.ac, s.end) + 300, stopAll);
      sbtn.classList.add('heard');
    });
    ui.stage.append(h('div', { class: 'cols ga-cols' }, board.el, h('div', { class: 'm-exgrid' }, ...cards, sbtn)));
    const all = [...cards, sbtn];
    let k = 0;
    kit.setAuto(() => { if (k < all.length) press(all[k++]); else kit.next(); });
    return () => { T.clear(); V.cut(); };
  },

  // ── 따라 하기: 들은 가락과 같은 그림(둘 중 하나) — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('들은 가락과 같은 그림을 골라요');
    const board = heightBoard(kit, { notes: [D, M, S, L], ghosts: GHOSTS, rh: 44 });
    const PERM = [[D, M, S], [S, M, D], [D, S, M], [M, D, S], [S, D, M], [M, S, D]];
    let streak = 0, cur = null, busy = false, prev = -1;
    const msg = h('p', { class: 'm-why' });
    const opts = h('div', { class: 'g3-opts' });
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    function ask(newOne = true) {
      if (newOne) {
        let a; do { a = Math.floor(r() * PERM.length); } while (a === prev);
        prev = a;
        const ps = PERM[a];
        // 다른 그림 = 모양이 다른 것(처음은 거꾸로 가는 것을 더 자주)
        const others = PERM.filter(q => q !== ps);
        const alt = r() < 0.5 ? [...ps].reverse() : others[Math.floor(r() * others.length)];
        const order = r() < 0.5 ? [ps, alt] : [alt, ps];
        cur = { ps, ans: order.indexOf(ps), cards: order.map((q, k) => {
          const pic = picOf(q, 160, 21, 84);
          const b = h('button', { type: 'button', class: 'g3-card small' }, h('span', { class: 'g3-num' }, String(k + 1)), pic.el);
          onPress(b, () => answer(k));
          return { b, pic };
        }) };
        opts.replaceChildren(...cur.cards.map(c => c.b));
      }
      cur.cards.forEach(c => { c.b.classList.remove('right', 'miss'); c.pic.lit(-1); });
      busy = true; V.cut(); T.clear(); board.rest();
      msg.className = 'm-why hint'; msg.textContent = '';
      const s = V.play(kit, cur.ps.map(p => ({ p, d: 0.5, gap: 0.2 })), { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; });
    }
    function walk(ps, card) {
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { board.move(p); card.pic.lit(k); }));
      return s;
    }
    function answer(k) {
      if (busy || !cur) return;
      busy = true;
      const right = k === cur.ans, card = cur.cards[cur.ans];
      card.b.classList.add('right');
      msg.className = 'm-why';
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = `맞아요 — ${names(cur.ps)}, ${shape(cur.ps)}`;
        board.move(cur.ps[cur.ps.length - 1], 'happy');
        if (streak >= 3) { kit.pass(); return; }
        T.after(1100, () => ask());
      } else {
        cur.cards[k].b.classList.add('miss');
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = `들은 가락은 ${names(cur.ps)}, ${shape(cur.ps)}`;
        const mine = cur;
        T.after(500, () => { if (cur !== mine) return; const s = walk(cur.ps, card); T.after(kit.msUntil(s.ac, s.end) + 700, () => ask(false)); });
      }
    }
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'cols ga-cols' }, board.el, h('div', { class: 'pickcol' }, opts, h('div', { class: 'row' }, again, dots), msg)));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.ans); });
    const onKey = e => { const k = '12'.indexOf(e.key); if (k >= 0) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 뛰는 가락 그림 고르기 — 10판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    const results = [];
    let i = -1, cur = null, gone = false;
    ui.say('');
    const bird = h('div', { class: 'g3-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const pose = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const row = h('div', { class: 'g3-row' });
    const counter = h('div', { class: 'm-count' }), word = h('div', { class: 'm-word' });
    const stairs = h('div', { class: 'g3-stairs', 'aria-hidden': 'true' }, ...[0, 1, 2, 3, 4].map(k => h('i', { style: { '--k': k } })));
    const scene = h('div', { class: 'g3-scene' }, stairs, bird, row, counter, word);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '뛰는 가락 그림 고르기',
      lines: ['참새 노래를 듣고 같은 모양 그림을 눌러요', '10번 · 키보드 1 2 3 4'],
      onStart: toneSet,
    });
    ui.stage.append(sc.card);
    // 시작 — 도-미-솔(기준) 한 번
    function toneSet() {
      sayWord(word, '도 · 미 · 솔', 'info'); pose('play');
      const s = V.play(kit, [D, M, S].map(p => ({ p, d: 0.42, gap: 0.16 })), { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.end) + 600, next);
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const pl = PLAN[i], inst = pl.inst || 'xylo';
      const order = kit.shuffle([pl.ps, ...pl.alt], r);
      const mine = cur = { ps: pl.ps, ans: order.indexOf(pl.ps), open: false, cards: [] };
      counter.textContent = `${i + 1} / ${PLAN.length}`; sayWord(word, '');
      row.className = 'g3-row n' + order.length;
      mine.cards = order.map((q, k) => {
        const pic = picOf(q, 250, 23, q.length > 3 ? 40 : 70);
        const b = h('button', { type: 'button', class: 'g3-card' }, h('span', { class: 'g3-num' }, String(k + 1)), pic.el);
        onPress(b, () => choose(k));
        return { b, pic };
      });
      row.replaceChildren(...mine.cards.map(c => c.b));
      pose('play'); V.cut(); row.classList.add('listen');
      const s = V.play(kit, pl.ps.map(p => ({ p, d: 0.42, gap: 0.18 })), { inst });
      T.after(kit.msUntil(s.ac, s.starts[pl.ps.length - 1]), () => { if (cur === mine) { mine.open = true; row.classList.remove('listen'); } });
      T.after(kit.msUntil(s.ac, s.end) + 100, () => { if (cur === mine) pose('idle'); });
      T.after(kit.msUntil(s.ac, s.end) + 3800, () => { if (cur === mine && mine.open) choose(null); });
    }
    function choose(k) {
      if (!cur || !cur.open) return;
      cur.open = false;
      const right = k === cur.ans, card = cur.cards[cur.ans];
      results.push(right);
      row.classList.add('done');
      card.b.classList.add('right');
      if (right) {
        kit.sfx.good(engine); sayWord(word, '좋아', 'good'); pose('happy');
        T.after(1000, next);
        return;
      }
      if (k != null) cur.cards[k].b.classList.add('miss');
      kit.sfx.oops(engine); sayWord(word, k == null ? '놓쳤어요' : '삐끗', 'oops'); pose('oops');
      const mine = cur;
      T.after(550, () => {
        if (cur !== mine || gone) return;
        const s = V.play(kit, mine.ps.map(p => ({ p, d: 0.38, gap: 0.16 })), { inst: 'xylo' });
        mine.ps.forEach((p, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => card.pic.lit(j)));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { card.pic.lit(-1); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const wrongAt = results.map((ok, k) => (ok ? -1 : k)).filter(k => k >= 0);
      const twist = wrongAt.filter(k => k >= 6 && k <= 8).length, mixed = wrongAt.filter(k => k >= 3 && k <= 5).length;
      let tip;
      if (!wrongAt.length) tip = '모양이 같고 높이만 다른 그림(미-솔-라)까지 모두 가려냈어요.';
      else if (twist >= wrongAt.length / 2) tip = '모양은 같고 높이만 다른 그림(7번째부터)에서 헷갈렸어요. 도는 가장 낮은 계단 — 첫 소리가 얼마나 낮은지 들어 봐요.';
      else if (mixed >= wrongAt.length / 2) tip = '올라갔다 내려오는 가락(4~6번째)에서 헷갈렸어요. 가장 낮은 도가 몇 번째에 나왔는지 먼저 찾아봐요.';
      else tip = '오르기 · 내리기에서 헷갈렸어요. 도-미-솔은 위로, 솔-미-도는 아래로 건너뛰어요.';
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open) choose(cur.ans); });
    const onKey = e => { const k = '1234'.indexOf(e.key); if (k >= 0 && cur && k < cur.cards.length) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
