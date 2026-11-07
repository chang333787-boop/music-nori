// 소4 높게·낮게 — 견본 칸(다른 칸이 이 모양을 따른다 · docs/cells.md)
//  높낮이는 늘 세로 위치로(계획서 '화면 약속'). 높낮이는 '비교'라서 늘 기준 소리(도5) 다음에 견줄 소리를 들려준다.
//  크롬북 작은 스피커에서 낮은 음이 '작은 소리'로 들리지 않게 가온 도(C4) 위 음역만 쓰고 세기는 같게(eq.js가 음높이별로 맞춤).
//  보기: 예시 넷(악기 넷 · 오르는 짝 · 내리는 짝) → 연습: 세 번 이어서 맞히면 지남 → 확인 게임: 12판(옥타브 → 5도 → 3도 · 악기 바꿈)
//  11-07 평가 2차: 소리 갈래 길잡이는 토끼 · 참새는 손님(소리를 따라 나는 새) · 나무 · 연못은 코덱스 그림 · 답은 오른쪽 답 묶음
//   연습 = "첫 번째보다 높아요, 낮아요?" + 고른 뒤 첫 소리 자리에 옅은 새 그림자(두 자리를 견주게)
import { exGroup, nowCard, pal, pose } from './_snd.js';

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
const SCENE = 'app/img/scene/';
const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

// 두 점 그림 — 첫 소리 점 → 둘째 소리 점(올라가요 / 내려가요). 예시 카드 · 답 단추 칩
const dots = up => `<svg viewBox="0 0 84 48" aria-hidden="true"><path d="M20 ${up ? 36 : 12} L64 ${up ? 12 : 36}" stroke="#3B2A1E" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/><circle cx="18" cy="${up ? 36 : 12}" r="9" fill="#FFFFFF" stroke="#3B2A1E" stroke-width="3.5"/><circle cx="66" cy="${up ? 12 : 36}" r="9" fill="#2F6DB5" stroke="#3B2A1E" stroke-width="3.5"/></svg>`;
const sceneImg = (kit, f, cls) => kit.h('img', { src: SCENE + f + '.webp', alt: '', draggable: 'false', class: cls });

// 세로 높이 길(나무 ↔ 연못) — 참새가 소리 높이를 따라 오르내린다 · ghost = 첫 소리 자리 그림자
function ladder(kit) {
  const { h } = kit;
  const bird = h('div', { class: 'lad-bird' }, pal(kit, 'bird'));
  const ghost = h('div', { class: 'lad-bird lad-ghost', hidden: true }, pal(kit, 'bird'));
  const el = h('div', { class: 'ladder' },
    h('div', { class: 'lad-top' }, h('span', {}, '높게'), sceneImg(kit, 'prop_tree', 'lad-tree')),
    h('div', { class: 'lad-mid' }),
    h('div', { class: 'lad-bot' }, h('span', {}, '낮게'), sceneImg(kit, 'prop_pond', 'lad-pond')),
    ghost, bird);
  // p(음높이) → 0(아래) ~ 1(위)
  const at = p => `calc(${((Math.max(0, Math.min(1, (p - 58) / (86 - 58)))) * 74 + 13).toFixed(1)}% - 50px)`;
  const move = (p, ps = 'play') => { bird.style.bottom = at(p); pose(kit, bird.firstChild, 'bird', ps); };
  const rest = () => { bird.style.bottom = 'calc(50% - 50px)'; pose(kit, bird.firstChild, 'bird', 'idle'); };
  const shadow = p => { if (p == null) { ghost.hidden = true; return; } ghost.style.bottom = at(p); ghost.hidden = false; };
  rest();
  return { el, move, rest, shadow, bird };
}

export default {
  // ── 보기: 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say('참새가 소리를 따라 날아요 — 높으면 위로, 낮으면 아래로');
    const lad = ladder(kit);
    const cards = EXAMPLES.map(ex => {
      const up = ex.b > ex.a;
      const btn = h('button', { type: 'button', class: 'excard so4-ex', 'aria-label': `${ex.name} — ${up ? '낮게에서 높게' : '높게에서 낮게'}` },
        h('b', {}, ex.name), h('span', { class: 'so4-dots', html: dots(up) }));
      onPress(btn, () => {
        T.clear(); nowCard(cards, btn);
        const s = kit.playSeq(engine, [{ p: ex.a, d: 0.55, gap: 0.25 }, { p: ex.b, d: 0.7 }], { inst: ex.inst });
        lad.move(ex.a); lad.shadow(null);
        T.after(kit.msUntil(s.ac, s.starts[1]), () => { lad.shadow(ex.a); lad.move(ex.b); });
        T.after(kit.msUntil(s.ac, s.end) + 500, () => { lad.rest(); lad.shadow(null); nowCard(cards, null); });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols so4-cols' }, lad.el, exGroup(kit, cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) press(cards[k++]); else kit.next(); });
    return () => T.clear();
  },

  // ── 연습: 첫 번째보다 높아요? 낮아요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), r = kit.rng();
    const ASK = '첫 번째보다 높아요, 낮아요?';
    ui.say(ASK);
    const lad = ladder(kit);
    let streak = 0, cur = null, busy = false;
    const A = kit.answers([
      { key: 'up', label: '높아요', chip: dots(true) },
      { key: 'down', label: '낮아요', chip: dots(false) },
    ], k => answer(k === 'up'));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.setBar(again);
    function ask(newOne = true) {
      if (newOne) { const iv = [12, 7, 5][Math.floor(r() * 3)] * (r() < 0.5 ? 1 : -1); cur = { b: REF + iv }; }
      busy = true; A.clear(); ui.say(ASK);
      const s = kit.playSeq(engine, [{ p: REF, d: 0.5, gap: 0.25 }, { p: cur.b, d: 0.6 }], { inst: 'xylo' });
      lad.move(REF, 'idle'); lad.shadow(null);
      T.after(kit.msUntil(s.ac, s.end), () => { busy = false; });
    }
    function answer(up) {
      if (busy || !cur) return;
      busy = true;
      const want = cur.b > REF, right = up === want;
      lad.shadow(REF);                                // 첫 소리 자리에 옅은 그림자 → 참새는 둘째 소리 자리로
      lad.move(cur.b, right ? 'happy' : 'oops');
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        A.mark(up ? 'up' : 'down', 'right'); ui.tell('맞아요', 'good');
        if (streak >= 3) { kit.pass(); return; }
        T.after(1100, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        A.mark(up ? 'up' : 'down', 'wrong'); A.btn(want ? 'up' : 'down').classList.add('right');
        ui.tell('다시 들어 봐요', 'oops', 1800);
        ui.say(`두 번째 소리가 더 ${want ? '높았어요' : '낮았어요'} — 참새 자리를 봐요`);
        T.after(1800, () => ask(false));
      }
    }
    onPress(again, () => { if (!busy && cur) ask(false); });
    ui.stage.append(h('div', { class: 'so4-follow' }, lad.el, A.el));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(cur.b > REF); });
    const onKey = e => { if (e.key === 'ArrowUp' || e.key === '1') { e.preventDefault(); answer(true); } else if (e.key === 'ArrowDown' || e.key === '2') { e.preventDefault(); answer(false); } };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 나무일까, 연못일까 — 12판 · 한 판 약 4초 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    const results = [];
    let i = -1, cur = null, open = false, gone = false;
    ui.say('높으면 나무, 낮으면 연못을 눌러요');
    const bird = h('div', { class: 'g-bird', 'data-at': 'mid' }, pal(kit, 'bird'));
    const tree = h('div', { class: 'g-zone g-tree' }, sceneImg(kit, 'prop_tree', 'g-tree-img'));
    const pond = h('div', { class: 'g-zone g-pond' }, sceneImg(kit, 'prop_pond', 'g-pond-img'));
    const scene = h('div', { class: 'g-scene' }, tree, pond, bird);
    const A = kit.answers([
      { key: 'up', label: '나무 — 높아요', chip: sceneImg(kit, 'prop_tree', '') },
      { key: 'down', label: '연못 — 낮아요', chip: sceneImg(kit, 'prop_pond', '') },
    ], k => answer(k === 'up'));
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '나무일까, 연못일까?'),
      h('p', { class: 'sub' }, '두 번째 소리가 첫 번째보다 높은지 낮은지 들어요'),
      h('p', { class: 'sub' }, '12번 · 키보드 ', h('span', { class: 'kbd' }, '↑'), ' ', h('span', { class: 'kbd' }, '↓'), ' 도 돼요')));
    ui.stage.append(h('div', { class: 'g-wrap' }, scene, A.el), start);
    const birdTo = (where, ps) => { bird.dataset.at = where; pose(kit, bird.firstChild, 'bird', ps); };
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(); next(); });
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) press(startBtn); else if (open) answer(cur.b > REF); });

    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const [iv, inst] = PLAN[i];
      cur = { b: REF + iv, inst };
      ui.count(i + 1, PLAN.length);
      birdTo('mid', 'idle'); A.clear();
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
      if (right) { kit.sfx.good(engine); birdTo(want ? 'top' : 'bot', 'happy'); A.mark(up ? 'up' : 'down', 'right'); ui.tell('맞아요', 'good'); }
      else {
        kit.sfx.oops(engine); birdTo(want ? 'top' : 'bot', 'oops');
        if (up != null) A.mark(up ? 'up' : 'down', 'wrong');
        A.btn(want ? 'up' : 'down').classList.add('right');
        ui.tell(up == null ? '놓쳤어요' : '삐끗', 'oops');
      }
      T.after(right ? 750 : 1150, next);
    }
    function end() {
      bird.hidden = true; ui.tell(null); ui.count(null); A.clear();   // 결과 옆 친구는 칸 화면이 붙임
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
    // 나무 · 연못을 직접 눌러도 됨
    onPress(tree, () => answer(true)); onPress(pond, () => answer(false));
    const onKey = e => { if (e.key === 'ArrowUp' || e.key === '1') { e.preventDefault(); answer(true); } else if (e.key === 'ArrowDown' || e.key === '2') { e.preventDefault(); answer(false); } };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); window.removeEventListener('keydown', onKey); };
  },
};
