// 가1 솔·미 — 노래 길의 첫 두 음(코다이 전통은 솔-미부터 시작한다 · 따라 부르기 쉬운 음정이라는 실험이 있으나 근거는 중~약)
//  높이는 늘 세로 위치: 솔 = 위 계단 · 미 = 아래 계단. 계이름 글자와 무지개 색(theory.js colorOf)을 함께 · 가온 도 위 음역 · 세기 같게.
//  보기: 예시 넷(목소리 · 실로폰 · 리코더 · 피아노) + 「솔미 인사」 높이 그림 · 손 높이(솔 어깨 · 미 가슴)
//  따라 하기: 처음 소리(이름을 보여 줌) 다음 소리가 솔인지 미인지 — 같은 높이면 같은 이름, 솔보다 낮으면 미
//  확인 게임 메아리 언덕: 참새가 부른 차례대로 솔 돌 · 미 돌 놓기 12판
//   소개(솔-미 · 미-솔: 오르내림만 들어도 됨) → 발전(솔-솔 · 미-미 섞임) → 비틀기(세 음 · 리코더 · 피아노) → 마무리(세 음)
import { SOL, MI, nameOf, josa, colorOf, heightBoard, heightPic, songNotes, voice, playBeats, badge, startCard, press, sayWord } from './_mel.js';

const S = SOL, M = MI;
const EXAMPLES = [
  { inst: 'choir', name: '목소리', ps: [S, M] },
  { inst: 'xylo', name: '실로폰', ps: [M, S] },
  { inst: 'recorder', name: '리코더', ps: [S, S, M] },
  { inst: 'piano', name: '피아노', ps: [M, M, S] },
];
const PLAN = [
  [[S, M], 'xylo'], [[M, S], 'xylo'], [[S, M], 'xylo'], [[M, S], 'xylo'],
  [[S, S], 'xylo'], [[M, S], 'xylo'], [[M, M], 'xylo'], [[S, M], 'xylo'],
  [[S, S, M], 'recorder'], [[M, S, M], 'recorder'], [[S, M, S], 'piano'],
  [[M, M, S], 'xylo'],
];
// 두 번째 소리를 처음 소리에 견줘 말하기(까닭)
const why = (a, b) => (a === b ? `처음과 같은 높이, ${josa(nameOf(b), '이에요/예요')}`
  : `${nameOf(a)}보다 ${b > a ? '높은' : '낮은'} 소리, ${josa(nameOf(b), '이에요/예요')}`);

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
      const pic = heightPic(ex.ps.map((p, t) => ({ p, t })), { rows: [M, S], height: 76, unit: 48 });
      const btn = h('button', { type: 'button', class: 'excard m-ex' }, h('b', {}, ex.name), pic.el);
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
    const spic = heightPic(song.notes, { rows: [M, S], height: 96, unit: 38, r: 16, pill: true });
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

  // ── 따라 하기: 처음 소리 다음 소리는 솔? 미? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('두 번째 소리는 솔일까요, 미일까요?');
    const board = heightBoard(kit, { notes: [M, S], rh: 68 });
    let streak = 0, cur = null, busy = false, prev = '';
    const msg = h('p', { class: 'm-why' });
    const pick = p => h('button', { type: 'button', class: 'pick m-pick', style: { '--c': colorOf(p) }, 'aria-label': nameOf(p) }, badge(h, p));
    const solBtn = pick(S), miBtn = pick(M);
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    function ask(newOne = true) {
      if (newOne) {
        let a, b;
        do { a = r() < 0.5 ? S : M; b = r() < 0.5 ? S : M; } while (`${a}${b}` === prev);
        prev = `${a}${b}`; cur = { a, b };
      }
      busy = true; V.cut(); T.clear();
      msg.className = 'm-why hint'; msg.textContent = `처음 소리는 ${josa(nameOf(cur.a), '이에요/예요')}`;
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
        msg.textContent = '맞아요 — ' + why(cur.a, cur.b);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1000, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = why(cur.a, cur.b) + '. 다시 들어 봐요';
        T.after(1500, () => ask(false));
      }
    }
    onPress(solBtn, () => answer(S)); onPress(miBtn, () => answer(M));
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'cols ga-cols' }, board.el, h('div', { class: 'pickcol' }, solBtn, miBtn, h('div', { class: 'row' }, again, dots), msg)));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.b); });
    const onKey = e => { if (e.key === 'ArrowUp') answer(S); else if (e.key === 'ArrowDown') answer(M); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 메아리 언덕 — 12판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, open = false, gone = false;
    ui.say('');
    const bird = h('div', { class: 'e1-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const pose = ps => kit.setPose(bird.firstChild, 'bird', ps);
    const stone = p => h('button', { type: 'button', class: 'e1-stone ' + (p === S ? 'hi' : 'lo'), style: { '--c': colorOf(p) }, 'aria-label': nameOf(p) + ' 돌' }, badge(h, p));
    const solBtn = stone(S), miBtn = stone(M);
    const path = h('div', { class: 'e1-path' });
    const axis = h('div', { class: 'e1-axis', 'aria-hidden': 'true', hidden: true }, badge(h, S, 'sm hi'), badge(h, M, 'sm lo'));
    const counter = h('div', { class: 'm-count' }), word = h('div', { class: 'm-word' });
    const scene = h('div', { class: 'e1-scene' }, h('div', { class: 'e1-hill' }), bird,
      h('div', { class: 'e1-mid' }, axis, path), h('div', { class: 'e1-stones' }, solBtn, miBtn), counter, word);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '메아리 언덕',
      lines: ['참새가 부른 차례대로 솔 돌, 미 돌을 눌러 메아리를 돌려줘요', '12번 · 키보드 ↑ 솔 · ↓ 미'],
      onStart: toneSet,
    });
    ui.stage.append(sc.card);

    // 시작 — '이게 솔, 이게 미'(기준 소리) 한 번 들려준 뒤 첫 판
    function toneSet() {
      const s = V.play(kit, [{ p: S, d: 0.5, gap: 0.25 }, { p: M, d: 0.5 }], { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.starts[0]), () => solBtn.classList.add('glow'));
      T.after(kit.msUntil(s.ac, s.starts[1]), () => { solBtn.classList.remove('glow'); miBtn.classList.add('glow'); });
      T.after(kit.msUntil(s.ac, s.end) + 150, () => miBtn.classList.remove('glow'));
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
      if (i >= PLAN.length) return end();
      const [ps, inst] = PLAN[i];
      const mine = cur = { ps, inst, k: 0 };
      counter.textContent = `${i + 1} / ${PLAN.length}`; sayWord(word, '');
      path.replaceChildren(...ps.map(() => h('div', { class: 'e1-slot' }))); axis.hidden = false;
      pose('play'); open = false; V.cut(); scene.classList.add('listen');
      const s = V.play(kit, ps.map(p => ({ p, d: 0.42, gap: 0.2 })), { inst });
      ps.forEach((p, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => slots()[k].classList.add('sung')));
      T.after(kit.msUntil(s.ac, s.starts[ps.length - 1]), () => { if (cur === mine) { open = true; scene.classList.remove('listen'); } });
      T.after(kit.msUntil(s.ac, s.end) + 120, () => { if (cur !== mine) return; pose('idle'); slots().forEach(x => x.classList.remove('sung')); if (open) nowSlot(mine.k); });
      T.after(kit.msUntil(s.ac, s.end) + 1800 + ps.length * 800, () => { if (cur === mine && open) fail(mine.k, true); });
    }
    function tap(p) {
      if (!open || !cur) return;
      const k = cur.k;
      engine.note('marimba', p, engine.ensure().currentTime + 0.01, 0.32, 0.8);
      if (p !== cur.ps[k]) { put(k, p, 'miss'); fail(k, false); return; }
      put(k, p);
      cur.k++;
      if (cur.k < cur.ps.length) { nowSlot(cur.k); return; }
      open = false; nowSlot(-1);
      results.push(true);
      T.after(260, () => kit.sfx.good(engine));
      sayWord(word, '좋아', 'good'); pose('happy');
      T.after(1000, next);
    }
    // 삐끗 · 놓침 — 맞는 돌을 점선으로 보여 주고 바른 메아리를 한 번 더
    function fail(k, missed) {
      open = false; nowSlot(-1);
      results.push(false);
      kit.sfx.oops(engine);
      sayWord(word, missed ? '놓쳤어요' : '삐끗', 'oops'); pose('oops');
      const ps = cur.ps;
      for (let j = k; j < ps.length; j++) put(j, ps[j], 'ghost');
      T.after(700, () => {
        if (gone) return;
        const s = V.play(kit, ps.map(p => ({ p, d: 0.38, gap: 0.16 })), { inst: 'marimba' });
        ps.forEach((p, j) => T.after(kit.msUntil(s.ac, s.starts[j]), () => nowSlot(j)));
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { nowSlot(-1); next(); });
      });
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const bad = PLAN.map((p, k) => (results[k] ? null : p[0])).filter(Boolean);
      const same = bad.filter(ps => ps.length === 2 && ps[0] === ps[1]).length;
      const three = bad.filter(ps => ps.length === 3).length;
      let tip;
      if (!bad.length) tip = '같은 음이 이어질 때도, 세 음일 때도 모두 메아리로 돌려줬어요.';
      else if (same >= three && same >= bad.length / 2) tip = '같은 음이 두 번(솔-솔 · 미-미) 나올 때 헷갈렸어요. 첫 소리가 높은 솔인지 낮은 미인지 먼저 떠올려 봐요.';
      else if (three >= bad.length / 2) tip = '세 음일 때(9번째부터) 헷갈렸어요. 따라 부르며 손을 올리고 내리면 차례가 잘 남아요.';
      else tip = '솔-미, 미-솔에서 헷갈렸어요. 내려가면 솔 → 미, 올라가면 미 → 솔이에요.';
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    onPress(solBtn, () => tap(S)); onPress(miBtn, () => tap(M));
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (open && cur) tap(cur.ps[cur.k]); });
    const onKey = e => { if (e.key === 'ArrowUp') tap(S); else if (e.key === 'ArrowDown') tap(M); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
