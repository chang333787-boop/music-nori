// 소4 높게·낮게 — 견본 칸(다른 칸이 이 모양을 따른다 · docs/cells.md)
//  높낮이는 늘 세로 위치로(계획서 '화면 약속'). 높낮이는 '비교'라서 늘 기준 소리(도5) 다음에 견줄 소리를 들려준다.
//  크롬북 작은 스피커에서 낮은 음이 '작은 소리'로 들리지 않게 가온 도(C4) 위 음역만 쓰고 세기는 같게(eq.js가 음높이별로 맞춤).
//  보기: 예시 넷(악기 넷 · 오르는 짝 · 내리는 짝) → 따라 하기: 세 번 이어서 맞히면 지남 → 확인 게임: 12판(옥타브 → 5도 → 3도 · 악기 바꿈)
const REF = 72;                                       // 기준 = 높은 도(C5)
const EXAMPLES = [
  { inst: 'xylo', name: '실로폰', a: 60, b: 72 },
  { inst: 'flute', name: '플루트', a: 79, b: 67 },
  { inst: 'piano', name: '피아노', a: 64, b: 76 },
  { inst: 'choir', name: '목소리', a: 74, b: 62 },
];
// 확인 게임 판 — 소개(옥타브) → 발전(5도) → 비틀기(3도 · 악기 바꿈) → 마무리(섞음)
const PLAN = [
  [12, 'xylo'], [-12, 'xylo'], [12, 'xylo'], [-12, 'xylo'],
  [7, 'xylo'], [-7, 'xylo'], [-7, 'xylo'], [7, 'xylo'],
  [4, 'flute'], [-3, 'piano'], [4, 'piano'],
  [-5, 'flute'],
];

// 세로 높이 길(나무 위 ↔ 연못) — 새가 소리 높이를 따라 오르내린다
function ladder(kit) {
  const { h } = kit;
  const bird = h('div', { class: 'lad-bird' }, kit.friendImg('bird', 'idle', { label: false }));
  const el = h('div', { class: 'ladder' },
    h('div', { class: 'lad-top' }, h('span', {}, '높게')),
    h('div', { class: 'lad-mid' }),
    h('div', { class: 'lad-bot' }, h('span', {}, '낮게')),
    bird);
  // p(음높이) → 0(아래) ~ 1(위)
  const pos = p => Math.max(0, Math.min(1, (p - 58) / (86 - 58)));
  const move = (p, pose = 'play') => { bird.style.bottom = `calc(${(pos(p) * 74 + 13).toFixed(1)}% - 60px)`; kit.setPose(bird.firstChild, 'bird', pose); };
  const rest = () => { bird.style.bottom = 'calc(50% - 60px)'; kit.setPose(bird.firstChild, 'bird', 'idle'); };
  rest();
  return { el, move, rest, bird };
}

export default {
  // ── 보기: 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('소리가 높으면 새가 위로, 낮으면 아래로 가요');
    const lad = ladder(kit);
    const heard = new Set();
    const cards = EXAMPLES.map((ex, i) => {
      const up = ex.b > ex.a;
      const btn = h('button', { type: 'button', class: 'excard' },
        h('b', {}, ex.name),
        h('span', { class: 'exarrow ' + (up ? 'up' : 'down') }, up ? '낮게 → 높게' : '높게 → 낮게'));
      onPress(btn, () => {
        T.clear();
        const s = kit.playSeq(engine, [{ p: ex.a, d: 0.55, gap: 0.25 }, { p: ex.b, d: 0.7 }], { inst: ex.inst });
        lad.move(ex.a);
        T.after(kit.msUntil(s.ac, s.starts[1]), () => lad.move(ex.b));
        T.after(kit.msUntil(s.ac, s.end) + 300, () => lad.rest());
        heard.add(i);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols' }, lad.el, h('div', { class: 'exgrid' }, ...cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => T.clear();
  },

  // ── 따라 하기: 두 번째 소리가 높아요? 낮아요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('두 번째 소리는 높아요, 낮아요?');
    const lad = ladder(kit);
    let streak = 0, cur = null, busy = false;
    const msg = h('p', { class: 'fmsg' });
    const upBtn = h('button', { type: 'button', class: 'pick up' }, '높아요');
    const dnBtn = h('button', { type: 'button', class: 'pick down' }, '낮아요');
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    function ask(newOne = true) {
      if (newOne) { const iv = [12, 7, 5][Math.floor(r() * 3)] * (r() < 0.5 ? 1 : -1); cur = { b: REF + iv }; }
      busy = true; msg.textContent = '';
      const s = kit.playSeq(engine, [{ p: REF, d: 0.5, gap: 0.25 }, { p: cur.b, d: 0.6 }], { inst: 'xylo' });
      lad.move(REF, 'idle');
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; lad.rest(); });
    }
    function answer(up) {
      if (busy || !cur) return;
      const right = up === cur.b > REF;
      lad.move(cur.b, right ? 'happy' : 'oops');
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = `맞아요 — 두 번째 소리가 더 ${up ? '높았어요' : '낮았어요'}`;
        if (streak >= 3) { kit.pass(); return; }
        T.after(900, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = `두 번째 소리가 더 ${up ? '낮았어요' : '높았어요'}. 다시 들어 봐요`;
        T.after(1100, () => ask(false));
      }
    }
    onPress(upBtn, () => answer(true)); onPress(dnBtn, () => answer(false)); onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'cols' }, lad.el, h('div', { class: 'pickcol' }, upBtn, dnBtn, h('div', { class: 'row' }, again, dots), msg)));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.b > REF); });
    const onKey = e => { if (e.key === 'ArrowUp') answer(true); else if (e.key === 'ArrowDown') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 나무 위일까, 연못일까 — 12판 · 한 판 약 4초 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    const results = [];
    let i = -1, cur = null, open = false, gone = false;
    ui.say('');
    const bird = h('div', { class: 'g-bird' }, kit.friendImg('bird', 'idle', { label: false }));
    const tree = h('button', { type: 'button', class: 'g-zone g-tree', 'aria-label': '나무 위 — 높아요' }, h('span', {}, '나무 위'));
    const pond = h('button', { type: 'button', class: 'g-zone g-pond', 'aria-label': '연못 — 낮아요' }, h('span', {}, '연못'));
    const counter = h('div', { class: 'g-count' });
    const word = h('div', { class: 'g-word' });
    const scene = h('div', { class: 'g-scene' }, tree, pond, bird, counter, word);
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '나무 위일까, 연못일까?'),
      h('p', { class: 'sub' }, '기준 소리 다음 소리가 높으면 나무 위, 낮으면 연못을 눌러요'),
      h('p', { class: 'sub' }, '12번 · 키보드 ↑ ↓ 도 돼요')));
    ui.stage.append(scene, start);
    const birdTo = (where, pose) => { bird.dataset.at = where; kit.setPose(bird.firstChild, 'bird', pose); };
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(); next(); });
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) startBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else if (open) answer(cur.b > REF); });

    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const [iv, inst] = PLAN[i];
      cur = { b: REF + iv, inst };
      counter.textContent = `${i + 1} / ${PLAN.length}`;
      birdTo('mid', 'idle'); word.textContent = '';
      const s = kit.playSeq(engine, [{ p: REF, d: 0.42, gap: 0.2 }, { p: cur.b, d: 0.5 }], { inst });
      open = false;
      T.after(kit.msUntil(s.ac, s.starts[1]), () => { open = true; });
      T.after(kit.msUntil(s.ac, s.end) + 2600, () => { if (open) answer(null); });   // 3초 넘게 고르지 않으면 놓침
    }
    function answer(up) {
      if (!open) return;
      open = false;
      const want = cur.b > REF, right = up === want;
      results.push(right);
      if (right) { kit.sfx.good(engine); birdTo(want ? 'top' : 'bot', 'happy'); word.textContent = '좋아'; word.dataset.k = 'good'; }
      else { kit.sfx.oops(engine); birdTo(want ? 'top' : 'bot', 'oops'); word.textContent = up == null ? '놓쳤어요' : '삐끗'; word.dataset.k = 'oops'; }
      T.after(right ? 750 : 1150, next);
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const wrongSmall = PLAN.map((p, k) => !results[k] && Math.abs(p[0]) <= 5).filter(Boolean).length;
      const wrongDown = PLAN.map((p, k) => !results[k] && p[0] < 0).filter(Boolean).length;
      const wrong = results.filter(x => !x).length;
      let tip = '';
      if (!wrong) tip = '높이 차이가 작은 소리까지 모두 가려냈어요.';
      else if (wrongSmall >= Math.ceil(wrong / 2)) tip = '높이 차이가 작을 때(9번째부터) 헷갈렸어요. 두 소리를 따라 불러 보면 잘 들려요.';
      else if (wrongDown > wrong / 2) tip = '낮아지는 소리를 더 많이 놓쳤어요.';
      else tip = '높아지는 소리를 더 많이 놓쳤어요.';
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    onPress(tree, () => answer(true)); onPress(pond, () => answer(false));
    const onKey = e => { if (e.key === 'ArrowUp') answer(true); else if (e.key === 'ArrowDown') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); window.removeEventListener('keydown', onKey); };
  },
};
