// 가2 라 — 아는 두 음(솔 · 미) 위에 새 음 하나만 더한다. 라 = 솔 바로 위(A4) — 계단으로는 솔에 딱 붙은 한 칸
//  높이는 늘 세로 위치 · 계이름 글자와 색(theory.js colorOf — 라 청록 · 솔 파랑 · 미 겨자)을 함께 · 가온 도 위 음역 · 세기 같게.
//  솔-미 사이에 건너뛴 자리는 점선 빈 계단(파 자리)으로 둔다 — 라는 바로 위 한 칸, 미는 한 칸 건너 아래인 것이 보이게(가3과 같은 말)
//  보기: 예시 둘(목소리 솔-라-솔 · 리코더 미-솔-라) + 「라가 왔어요」 높이 그림 · 손 높이(라 턱 · 솔 어깨 · 미 가슴)
//  연습: 솔(지시 줄에 이름) 다음 소리가 라 · 솔 · 미 중 무엇인지 — 라는 솔보다 '살짝' 위
//  확인 게임 '물음표 소리'(나무 = 코덱스 장면 그림 prop_tree · 오른쪽 가지에 참새): 솔 · 미 · 라 가락에서 ? 자리 소리를 오른쪽 답(라 · 솔 · 미)으로 12판
//   칸은 처음부터 넷(첫 번째 ~ 네 번째) — 세 음 판에서는 네 번째 칸이 비어 있음(판마다 자리가 밀리지 않게)
//   소개(세 음 · ?가 끝) → 발전(?가 맨 앞 · 솔 옆 · 답이 솔 · 미인 판 섞음) → 비틀기(네 음 · 리코더 · 피아노) → 마무리(네 음 · ?가 맨 앞)
//  11-07 평가 2차: 예전 '라는 몇 번째?'(칸을 누름)는 누를 곳이 안 보이고 칸이 3 → 4개로 늘며 자리가 밀렸음 → 답 단추 셋 고정으로 바꿈
import { SOL, MI, LA, FA, nameOf, colorOf, posOf, heightBoard, heightPic, songNotes, voice, playBeats, badge, startCard, press, exCard, hearHead, noteAnswers, markPick, judge } from './_mel.js';

const S = SOL, M = MI, L = LA;
const EXAMPLES = [
  { inst: 'choir', name: '목소리', ps: [S, L, S] },
  { inst: 'recorder', name: '리코더', ps: [M, S, L] },
];
// q = 물음표 자리(0부터)
const PLAN = [
  { ps: [M, S, L], q: 2 }, { ps: [S, L, S], q: 1 }, { ps: [L, S, M], q: 2 }, { ps: [M, L, S], q: 1 },
  { ps: [L, M, S], q: 0 }, { ps: [S, S, L], q: 1 }, { ps: [S, L, M], q: 1 }, { ps: [L, S, M], q: 1 },
  { ps: [S, M, S, L], q: 3, inst: 'recorder' }, { ps: [M, S, L, S], q: 1, inst: 'piano' }, { ps: [S, L, S, M], q: 3, inst: 'recorder' },
  { ps: [L, S, M, S], q: 0 },
];
const ORD = ['첫 번째', '두 번째', '세 번째', '네 번째'];
const why = b => (b === S ? '솔과 같은 높이, 솔이에요' : b === L ? '솔보다 살짝 높은 소리, 라예요' : '솔보다 낮은 소리, 미예요');
// 칸 안 높이(위에서 %) — 음 자리(미 0 · 파 1 · 솔 2 · 라 3)를 그대로
const topOf = p => 16 + (3 - posOf(p)) / 3 * 68;

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('라는 솔 바로 위 — 살짝 올라간 소리예요');
    const board = heightBoard(kit, { notes: [M, S, L], ghosts: [FA], hands: true, rh: 58 });
    const quiet = [];
    const stopAll = () => { T.clear(); V.cut(); board.rest(); quiet.forEach(f => f()); };
    const cards = EXAMPLES.map(ex => {
      const pic = heightPic(ex.ps.map((p, t) => ({ p, t })), { rows: [M, S, L], ghosts: [FA], height: 112, unit: 54, r: 18 });
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
    const song = songNotes('ga2-ra');
    const spic = heightPic(song.notes, { rows: [M, S, L], ghosts: [FA], height: 112, unit: 38, r: 18, pill: true });
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

  // ── 연습: 솔 다음 소리는 라? 솔? 미? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('처음은 솔. 두 번째 소리는 라, 솔, 미 중 무엇일까요?');
    const board = heightBoard(kit, { notes: [M, S, L], ghosts: [FA], rh: 58 });
    let streak = 0, cur = null, busy = false, prev = 0;
    const msg = h('p', { class: 'm-why' });
    const A = noteAnswers(kit, [L, S, M], p => answer(p));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function ask(newOne = true) {
      if (newOne) {
        let b;
        do { const x = r(); b = x < 0.5 ? L : x < 0.75 ? M : S; } while (b === prev && b !== L);
        prev = b; cur = { a: S, b };
      }
      busy = true; V.cut(); T.clear(); A.clear();
      msg.textContent = '';
      const s = V.play(kit, [{ p: cur.a, d: 0.55, gap: 0.3 }, { p: cur.b, d: 0.6 }], { inst: 'xylo' });
      board.move(cur.a, 'idle');
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; });
    }
    function answer(p) {
      if (busy || !cur) return;
      busy = true;
      const right = p === cur.b;
      board.move(cur.b, right ? 'happy' : 'oops');
      markPick(A, cur.b, p); judge(ui, right);
      msg.textContent = why(cur.b);
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
    const onKey = e => { const k = { ArrowUp: L, ArrowRight: S, ArrowLeft: S, ArrowDown: M, 1: L, 2: S, 3: M }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 물음표 소리 — 12판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [], picks = [];
    let i = -1, cur = null, gone = false;
    ui.say('참새 노래에서 ? 자리 소리를 골라요');
    const bird = h('div', { class: 'e2-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const pose = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const tree = h('div', { class: 'e2-tree' }, h('img', { src: 'app/img/scene/prop_tree.webp', alt: '', draggable: 'false' }), bird);
    // 칸 넷 — 처음부터 깔아 둠(세 음 판은 네 번째 칸을 비움)
    const slots = ORD.map(t => {
      const track = h('div', { class: 'e2-track' }, ...[L, S, M].map(q => h('i', { class: 'e2-band', style: { top: topOf(q) + '%', '--c': colorOf(q) } })),
        h('i', { class: 'e2-band ghost', style: { top: topOf(FA) + '%' } }));
      const el = h('div', { class: 'e2-slot off' }, h('span', { class: 'e2-ord' }, t), track);
      return { el, track };
    });
    const axis = h('div', { class: 'e2-axis', 'aria-hidden': 'true' }, ...[L, S, M].map(p => { const b = badge(h, p); b.style.top = topOf(p) + '%'; return b; }));
    const A = noteAnswers(kit, [L, S, M], p => choose(p), 'e2-ans wait');
    const scene = h('div', { class: 'e2-scene' }, tree, h('div', { class: 'e2-mid' }, axis, h('div', { class: 'e2-row' }, ...slots.map(x => x.el))), A.el);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '물음표 소리',
      lines: ['참새 노래를 듣고 ? 자리에서 난 소리를 라, 솔, 미 중에서 골라요', '12번'],
      onStart: toneSet,
    });
    ui.stage.append(sc.card);
    const listen = on => A.el.classList.toggle('wait', on);
    // 시작 — 라 · 솔 · 미(기준 소리) 한 번
    function toneSet() {
      const ps = [L, S, M];
      const s = V.play(kit, ps.map(p => ({ p, d: 0.45, gap: 0.2 })), { inst: 'xylo' });
      const glow = p => ps.forEach(q => A.btn(q).classList.toggle('glow', q === p));
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => glow(p)));
      T.after(kit.msUntil(s.ac, s.end) + 150, () => glow(null));
      T.after(kit.msUntil(s.ac, s.end) + 700, next);
    }
    const note = (p, cls = '') => h('span', { class: 'e2-note ' + cls, style: { '--c': colorOf(p), top: topOf(p) + '%' } }, badge(h, p));
    const nowSlot = k => slots.forEach((x, j) => x.el.classList.toggle('now', j === k));
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const pl = PLAN[i], inst = pl.inst || 'xylo';
      const mine = cur = { ...pl, ans: pl.ps[pl.q], open: false };
      ui.count(i + 1, PLAN.length);
      A.clear(); listen(true);
      slots.forEach((x, k) => {
        x.track.querySelectorAll('.e2-note,.e2-q').forEach(e => e.remove());
        x.el.classList.toggle('off', k >= pl.ps.length);
        x.el.classList.remove('ask');
        if (k >= pl.ps.length) return;
        if (k === pl.q) { x.el.classList.add('ask'); x.track.append(h('span', { class: 'e2-q' }, '?')); }
        else x.track.append(note(pl.ps[k]));
      });
      pose('play'); V.cut();
      const s = V.play(kit, pl.ps.map(p => ({ p, d: 0.42, gap: 0.2 })), { inst });
      pl.ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => { if (cur === mine) nowSlot(k); }));
      T.after(kit.msUntil(s.ac, s.starts[pl.q]), () => { if (cur === mine && !mine.done) { mine.open = true; listen(false); } });
      T.after(kit.msUntil(s.ac, s.end) + 100, () => { if (cur !== mine) return; pose('idle'); nowSlot(-1); });
      T.after(kit.msUntil(s.ac, s.end) + 3600, () => { if (cur === mine && mine.open) choose(null); });
    }
    function choose(p) {
      if (!cur || !cur.open) return;
      cur.open = false; cur.done = true;
      const right = p === cur.ans;
      results.push(right); picks.push(p);
      markPick(A, cur.ans, p); listen(false);
      const box = slots[cur.q];
      box.track.querySelector('.e2-q')?.remove();
      box.track.append(note(cur.ans, 'pop'));
      box.el.classList.remove('ask');
      judge(ui, right, { missed: p == null });
      if (right) {
        kit.sfx.good(engine); pose('happy');
        T.after(1100, next);
        return;
      }
      kit.sfx.oops(engine); pose('oops');
      const mine = cur;
      T.after(600, () => {
        if (cur !== mine || gone) return;
        const s = V.play(kit, mine.ps.map(q => ({ p: q, d: 0.36, gap: 0.16 })), { inst: 'xylo' });
        mine.ps.forEach((q, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => nowSlot(j)));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { nowSlot(-1); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const bad = PLAN.map((pl, k) => (results[k] ? null : { ...pl, pick: picks[k] })).filter(Boolean);
      const ls = bad.filter(b => (b.ps[b.q] === L && b.pick === S) || (b.ps[b.q] === S && b.pick === L)).length;
      const front = bad.filter(b => b.q === 0).length;
      const four = bad.filter(b => b.ps.length === 4).length;
      let tip;
      if (!bad.length) tip = '물음표가 맨 앞에 와도, 라와 솔이 붙어 나와도 모두 가려냈어요.';
      else if (ls >= bad.length / 2) tip = '라와 솔을 헷갈렸어요. 라는 솔보다 한 계단 살짝 높아요 — 손을 어깨에서 턱으로 올려 봐요.';
      else if (front >= bad.length / 2) tip = '물음표가 맨 앞일 때 헷갈렸어요. 뒤에 오는 소리보다 높은지 낮은지 견줘 봐요.';
      else if (four >= bad.length / 2) tip = '네 음일 때(9번째부터) 헷갈렸어요. 첫 번째, 두 번째… 손가락으로 세며 들어 봐요.';
      else tip = '미는 솔보다 한 계단 건너 아래, 라는 솔 바로 위예요.';
      bird.hidden = true; A.el.hidden = true; scene.querySelector('.e2-mid').hidden = true; ui.count(null);   /* 결과 뒤에는 나무만(친구 그림은 칸 화면이 붙임) */
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open) choose(cur.ans); });
    const onKey = e => { const k = { ArrowUp: L, ArrowRight: S, ArrowLeft: S, ArrowDown: M, 1: L, 2: S, 3: M }[e.key]; if (k) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
