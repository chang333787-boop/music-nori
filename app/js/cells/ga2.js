// 가2 라 — 아는 두 음(솔 · 미) 위에 새 음 하나만 더한다. 라 = 솔 바로 위(A4) — 계단으로는 솔에 딱 붙은 한 칸
//  높이는 늘 세로 위치 · 계이름 글자와 무지개 색(theory.js colorOf)을 함께 · 가온 도 위 음역 · 세기 같게.
//  보기: 예시 넷(솔-라-솔-미 · 솔-라-솔 · 미-솔-라 · 라-솔-미) + 「라가 왔어요」 높이 그림 · 손 높이(라 턱 · 솔 어깨 · 미 가슴)
//  따라 하기: 솔(이름을 보여 줌) 다음 소리가 라 · 솔 · 미 중 무엇인지 — 라는 솔보다 '살짝' 위
//  확인 게임 '라는 몇 번째?': 솔 · 미 · 라로 된 가락(라는 한 번)에서 라가 나온 자리 고르기 12판
//   소개(세 음 · 라가 크게 뛰어 나옴) → 발전(라가 맨 앞 · 솔 옆) → 비틀기(네 음 · 리코더 · 피아노) → 마무리(네 음 · 라가 맨 앞)
import { SOL, MI, LA, nameOf, colorOf, posOf, heightBoard, heightPic, songNotes, voice, playBeats, badge, startCard, press, sayWord } from './_mel.js';

const S = SOL, M = MI, L = LA;
const EXAMPLES = [
  { inst: 'choir', name: '목소리', ps: [S, L, S, M] },
  { inst: 'xylo', name: '실로폰', ps: [S, L, S] },
  { inst: 'recorder', name: '리코더', ps: [M, S, L] },
  { inst: 'piano', name: '피아노', ps: [L, S, M] },
];
const PLAN = [
  [[S, L, S], 'xylo'], [[M, S, L], 'xylo'], [[S, M, L], 'xylo'], [[L, S, M], 'xylo'],
  [[M, L, S], 'xylo'], [[S, S, L], 'xylo'], [[L, M, S], 'xylo'], [[S, L, M], 'xylo'],
  [[S, M, S, L], 'recorder'], [[M, S, L, S], 'piano'], [[S, L, S, M], 'recorder'],
  [[L, S, M, S], 'xylo'],
];
const ORD = ['첫째', '둘째', '셋째', '넷째'];
const why = b => (b === S ? '솔과 같은 높이, 솔이에요' : b === L ? '솔보다 살짝 높은 소리, 라예요' : '솔보다 낮은 소리, 미예요');
// 슬롯 안 높이(위에서 %) — 음 자리(미 0 · 솔 2 · 라 3)를 그대로
const topOf = p => 18 + (3 - posOf(p)) / 3 * 64;

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('라는 솔 바로 위 — 살짝 올라간 소리예요');
    const board = heightBoard(kit, { notes: [M, S, L], hands: true, rh: 62 });
    const quiet = [];
    const stopAll = () => { T.clear(); V.cut(); board.rest(); quiet.forEach(f => f()); };
    const cards = EXAMPLES.map(ex => {
      const pic = heightPic(ex.ps.map((p, t) => ({ p, t })), { rows: [M, S, L], height: 78, unit: 40 });
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
    const song = songNotes('ga2-ra');
    const spic = heightPic(song.notes, { rows: [M, S, L], height: 100, unit: 38, r: 15, pill: true });
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

  // ── 따라 하기: 솔 다음 소리는 라? 솔? 미? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('솔 다음 소리는 라, 솔, 미 중 무엇일까요?');
    const board = heightBoard(kit, { notes: [M, S, L], rh: 62 });
    let streak = 0, cur = null, busy = false, prev = 0;
    const msg = h('p', { class: 'm-why' });
    const pick = p => h('button', { type: 'button', class: 'pick m-pick three', style: { '--c': colorOf(p) }, 'aria-label': nameOf(p) }, badge(h, p));
    const btns = [[L, pick(L)], [S, pick(S)], [M, pick(M)]];
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    function ask(newOne = true) {
      if (newOne) {
        let b;
        do { const x = r(); b = x < 0.5 ? L : x < 0.75 ? M : S; } while (b === prev && b !== L);
        prev = b; cur = { a: S, b };
      }
      busy = true; V.cut(); T.clear();
      msg.className = 'm-why hint'; msg.textContent = '처음 소리는 솔이에요';
      const s = V.play(kit, [{ p: cur.a, d: 0.55, gap: 0.3 }, { p: cur.b, d: 0.6 }], { inst: 'xylo' });
      board.move(cur.a, 'idle');
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; });
    }
    function answer(p) {
      if (busy || !cur) return;
      busy = true;
      const right = p === cur.b;
      board.move(cur.b, right ? 'happy' : 'oops');
      msg.className = 'm-why';
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = '맞아요 — ' + why(cur.b);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1000, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = why(cur.b) + '. 다시 들어 봐요';
        T.after(1500, () => ask(false));
      }
    }
    for (const [p, b] of btns) onPress(b, () => answer(p));
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'cols ga-cols' }, board.el, h('div', { class: 'pickcol' }, ...btns.map(x => x[1]), h('div', { class: 'row' }, again, dots), msg)));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.b); });
    const onKey = e => { const k = { ArrowUp: L, ArrowRight: S, ArrowLeft: S, ArrowDown: M, 1: L, 2: S, 3: M }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 라는 몇 번째? — 12판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, gone = false;
    ui.say('');
    const bird = h('div', { class: 'e2-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const pose = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const row = h('div', { class: 'e2-row' });
    const axis = h('div', { class: 'e2-axis', 'aria-hidden': 'true', hidden: true }, ...[L, S, M].map(p => { const b = badge(h, p, 'sm'); b.style.top = topOf(p) + '%'; return b; }));
    const counter = h('div', { class: 'm-count' }), word = h('div', { class: 'm-word' });
    const scene = h('div', { class: 'e2-scene' }, h('div', { class: 'e2-trunk' }), h('div', { class: 'e2-branch' }), bird,
      h('div', { class: 'e2-mid' }, axis, row), counter, word);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '라는 몇 번째?',
      lines: ['참새 노래에서 라가 나온 자리를 눌러요', '12번 · 키보드 1 2 3 4'],
      onStart: () => T.after(300, next),
    });
    ui.stage.append(sc.card);
    const slots = () => [...row.children];
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const [ps, inst] = PLAN[i];
      const mine = cur = { ps, inst, ans: ps.indexOf(L), heard: -1, open: false };
      counter.textContent = `${i + 1} / ${PLAN.length}`; sayWord(word, '');
      row.classList.remove('done'); axis.hidden = false;
      row.replaceChildren(...ps.map((p, k) => {
        const track = h('span', { class: 'e2-track' }, ...[L, S, M].map(q => h('i', { style: { top: topOf(q) + '%' } })));
        const b = h('button', { type: 'button', class: 'e2-slot' }, h('span', { class: 'e2-ord' }, ORD[k]), track);
        onPress(b, () => choose(k));
        return b;
      }));
      pose('play'); V.cut();
      const s = V.play(kit, ps.map(p => ({ p, d: 0.4, gap: 0.2 })), { inst });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => {
        if (cur !== mine || mine.done) return;          // 이미 고른 판은 다시 열지 않음
        mine.heard = k; mine.open = true;
        slots().forEach((x, j) => x.classList.toggle('sung', j === k));
      }));
      T.after(kit.msUntil(s.ac, s.end) + 100, () => { if (cur !== mine || mine.done) return; pose('idle'); slots().forEach(x => x.classList.remove('sung')); });
      T.after(kit.msUntil(s.ac, s.end) + 3200, () => { if (cur === mine && mine.open) choose(null); });
    }
    // 높이 보여 주기 — 칸마다 그 음의 배지를 제 높이에
    function reveal() {
      cur.ps.forEach((p, k) => {
        const st = h('span', { class: 'e2-note', style: { '--c': colorOf(p), top: topOf(p) + '%' } }, badge(h, p));
        slots()[k].querySelector('.e2-track').append(st);
      });
    }
    function choose(k) {
      if (!cur || !cur.open) return;
      if (k != null && k > cur.heard) return;            // 아직 안 들린 자리는 못 고름
      cur.open = false; cur.done = true;
      const right = k === cur.ans;
      results.push(right);
      reveal();
      slots().forEach(x => x.classList.remove('sung'));
      row.classList.add('done');
      slots()[cur.ans].classList.add('right');
      if (right) {
        kit.sfx.good(engine); sayWord(word, '좋아', 'good'); pose('happy');
        T.after(1100, next);
        return;
      }
      if (k != null) slots()[k].classList.add('miss');
      kit.sfx.oops(engine); sayWord(word, k == null ? '놓쳤어요' : '삐끗', 'oops'); pose('oops');
      const ps = cur.ps, mine = cur;
      T.after(600, () => {
        if (cur !== mine || gone) return;
        const s = V.play(kit, ps.map(p => ({ p, d: 0.36, gap: 0.16 })), { inst: 'xylo' });
        ps.forEach((p, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => slots().forEach((x, q) => x.classList.toggle('sung', q === j))));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { slots().forEach(x => x.classList.remove('sung')); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const bad = PLAN.map((p, k) => (results[k] ? null : p[0])).filter(Boolean);
      const first = bad.filter(ps => ps[0] === L).length;
      const four = bad.filter(ps => ps.length === 4).length;
      const near = bad.filter(ps => { const k = ps.indexOf(L); return ps[k - 1] === S || ps[k + 1] === S; }).length;
      let tip;
      if (!bad.length) tip = '라가 맨 앞에 나와도, 솔 바로 옆에 붙어 나와도 모두 찾았어요.';
      else if (first >= bad.length / 2) tip = '라가 맨 처음 나올 때 헷갈렸어요. 뒤의 소리가 모두 더 낮으면 처음 소리가 라예요.';
      else if (four >= bad.length / 2) tip = '네 음일 때(9번째부터) 헷갈렸어요. 손가락으로 하나, 둘, 셋, 넷 세며 들어 봐요.';
      else if (near >= bad.length / 2) tip = '라가 솔 바로 옆에 올 때 헷갈렸어요. 라는 솔보다 살짝 높아요.';
      else tip = '라는 가락에서 가장 높은 소리였어요. 가장 높이 올라간 곳을 찾아봐요.';
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open && cur.heard >= cur.ans) choose(cur.ans); });
    const onKey = e => { const k = '1234'.indexOf(e.key); if (k >= 0 && cur && k < cur.ps.length) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
