// 장1 장단보 채우기 — 국악 첫걸음(11-08 토론 X12 · 교사 '추천으로' · 표기 대장 docs/gugak.md)
//  장구 소리 셋(⦶ 덩 · ○ 쿵 · | 덕)을 듣고, 장단보(가로 한 줄 · 소박 하나가 한 칸 · 박은 실선 · 소박은 점선) 빈칸에 들어갈 부호를 고른다.
//  타이밍 판정 X(크롬북 지연이 아니라 귀를 잼 · 토론 C1 원안 버림) · 다시 듣기 제한 X · 쉼은 빈칸(화면에 '·'를 그리지 않음)
//  보기: 덩 · 쿵 · 덕 · 자진모리 · 세마치 → 연습: 자진모리 빈칸 하나, 세 번 이어서 맞히면 지남 → 확인 게임: 자진모리 → 세마치 → 자진모리 B꼴 → 세마치 맺는 꼴
//  TV(선생님과 다같이): 왼 무릎 = 쿵 · 오른 무릎 = 덕 · 두 무릎 = 덩(무릎 장구) — engine/tvscript.js
import { newBus, killBus, exampleGroup } from './_beat.js';
import { factTip } from '../cellkit.js';

// 장단 — pat = 소박마다 'deong' | 'kung' | 'deok' | null(쉼) · acc = 센 소박(칸 위 '>')
const JJ = { key: 'jj', name: '자진모리', beats: 4, sub: 3, bpm: 100, acc: [0, 8], pat: ['deong', null, null, 'kung', null, null, 'kung', null, 'deok', 'kung', null, null] };
const JJB = { ...JJ, key: 'jjb', name: '자진모리(다른 꼴)', pat: ['deong', null, 'deok', 'kung', 'deok', null, 'kung', null, 'deok', 'kung', 'deok', null] };
const SM = { key: 'sm', name: '세마치', beats: 3, sub: 3, bpm: 90, acc: [0], pat: ['deong', null, null, 'deong', null, 'deok', 'kung', 'deok', null] };
const SME = { ...SM, key: 'sme', name: '세마치(맺는 꼴)', pat: ['deong', null, null, 'kung', null, 'deok', null, null, null] };
export const JANGDAN = { JJ, JJB, SM, SME };
const SYL = { deong: '덩', kung: '쿵', deok: '덕' };
const HAND = { deong: '두 손 함께', kung: '왼손 — 궁편', deok: '오른손 — 채편' };
const VEL = { deong: 0.85, kung: 0.8, deok: 0.7 };
// 확인 게임 10판 · 빈칸 11개 — 소개(자진모리) → 발전(세마치) → 비틀기(자진모리 다른 꼴 · 첫 칸도 빈칸) → 마무리(세마치 맺는 꼴 빈칸 둘 · 교과서 4 · 6번 칸)
export const PLAN = [
  { def: JJ, blank: [3] }, { def: JJ, blank: [8] }, { def: JJ, blank: [6] },
  { def: SM, blank: [3] }, { def: SM, blank: [5] }, { def: SM, blank: [0] },
  { def: JJB, blank: [4] }, { def: JJB, blank: [9] }, { def: JJB, blank: [0] },
  { def: SME, blank: [3, 5] },
];
export const GROUP = [3, 3, 3, 2];
const FOLLOW_BLANKS = [3, 6, 8, 9];

// 장구 부호(SVG) — ⦶ 덩(원 + 가로줄) · ○ 쿵(원) · | 덕(세로줄) · 굵은 먹선(글꼴에 기대지 않음)
const INK = '#3B2A1E';
export function symSVG(hit, size = 40) {
  const S = `stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"`;
  const body = hit === 'deong' ? `<circle cx="20" cy="20" r="13" ${S}/><line x1="4" y1="20" x2="36" y2="20" ${S}/>`
    : hit === 'kung' ? `<circle cx="20" cy="20" r="13" ${S}/>`
      : hit === 'deok' ? `<line x1="20" y1="5" x2="20" y2="35" ${S}/>` : '';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

// 장단보 — '>' 줄 · 칸 줄(박 = 실선 · 소박 = 점선) · 구음 줄
function boardView(kit) {
  const { h } = kit;
  const el = h('div', { class: 'jd-board' });
  let cells = [], def = null;
  return {
    el,
    set(d, blanks = []) {
      def = d;
      const B = new Set(blanks);
      el.style.setProperty('--n', d.pat.length);
      cells = d.pat.map((hit, i) => {
        const c = h('div', { class: 'jd-cell' + (i % d.sub === 0 ? ' head' : '') + (B.has(i) ? ' blank' : ''), 'data-i': i },
          h('span', { class: 'jd-acc' }, d.acc.includes(i) ? '>' : ''),
          h('span', { class: 'jd-sym', html: B.has(i) ? '<b class="q">?</b>' : symSVG(hit) }),
          h('span', { class: 'jd-syl' }, B.has(i) || !hit ? '' : SYL[hit]));
        return c;
      });
      el.replaceChildren(h('div', { class: 'jd-name' }, kit.ez(d.name), h('small', {}, `${d.beats}박 · 박마다 소박 셋`)), h('div', { class: 'jd-row' }, ...cells));
    },
    now(i) { cells.forEach((c, j) => c.classList.toggle('now', j === i)); },
    target(i) { cells.forEach((c, j) => c.classList.toggle('target', j === i)); },
    fill(i, cls = '') {
      const c = cells[i]; if (!c) return;
      c.classList.remove('blank', 'target'); if (cls) c.classList.add(cls);
      c.querySelector('.jd-sym').innerHTML = symSVG(def.pat[i]);
      c.querySelector('.jd-syl').textContent = SYL[def.pat[i]] || '';
    },
  };
}
// 장단 틀기 — cycles바퀴 · onSub(i) = 소박이 울릴 때(그림 맞추기) · 끝나는 ms를 돌려줌
function playJang(kit, bus, def, { cycles = 2, T, onSub = null } = {}) {
  const { engine } = kit;
  const ac = engine.ensure(), sub = 60 / def.bpm / 3, t0 = ac.currentTime + 0.25, n = def.pat.length;
  for (let c = 0; c < cycles; c++) for (let i = 0; i < n; i++) {
    const hit = def.pat[i], t = t0 + (c * n + i) * sub;
    if (hit) engine.drum(hit, t, Math.min(1, VEL[hit] * (def.acc.includes(i) ? 1.12 : 1)), bus);
    if (onSub) T.after(kit.msUntil(ac, t), () => onSub(i, c));
  }
  const endMs = kit.msUntil(ac, t0 + cycles * n * sub);
  if (onSub) T.after(endMs, () => onSub(-1, cycles));
  return { firstEnd: kit.msUntil(ac, t0 + n * sub), end: endMs };
}
const hitAnswers = (kit, onPick) => kit.answers(['deong', 'kung', 'deok'].map(k => ({ key: k, label: SYL[k], chip: symSVG(k, 44) })), onPick, { cls: 'jd-ans' });

// 결과 한 줄 — 사실만(N1): 갈래 말은 그 갈래가 틀린 칸의 2/3를 넘고 3번 이상일 때만
export function tipOf(plan, results) {
  const flat = plan.flatMap(p => p.blank.map(i => ({ def: p.def, hit: p.def.pat[i], head: i % p.def.sub === 0 })));
  const miss = f => flat.filter((x, k) => results[k] === false && f(x)).length;
  return factTip(results, [
    { n: miss(x => x.hit === 'deok'), text: '덕(채편) 자리를 헷갈렸어요. 덕은 오른손으로 치는 짧고 높은 소리예요.' },
    { n: miss(x => x.hit !== 'deok'), text: '덩과 쿵을 헷갈렸어요. 덩은 두 손을 함께 쳐서 쿵보다 꽉 차게 울려요.' },
    { n: miss(x => x.def.key.startsWith('s')), text: '세마치(세 박 장단)에서 헷갈렸어요. 첫 박 덩을 크게 느끼며 세어 봐요.' },
  ], '덩 · 쿵 · 덕을 듣고 장단보 빈칸을 모두 채웠어요.');
}

export default {
  // ── 보기: 장구 소리 셋과 장단 둘 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say(kit.ez('장구 소리 셋 — 덩 · 쿵 · 덕. 장단보를 보며 들어 봐요'));
    const board = boardView(kit);
    board.set(JJ);
    let bus = newBus(engine);
    const stop = () => { T.clear(); killBus(engine, bus); bus = newBus(engine); board.now(-1); };
    const one = hit => h('button', { type: 'button', class: 'excard jd-ex' }, h('b', {}, h('span', { class: 'jd-exsym', html: symSVG(hit, 34) }), SYL[hit]), h('span', {}, HAND[hit]));
    const whole = (def, sub) => h('button', { type: 'button', class: 'excard jd-ex' }, h('b', {}, kit.ez(def.name)), h('span', {}, sub));
    const cards = [one('deong'), one('kung'), one('deok'), whole(JJ, '네 박 · 첫 박과 셋째 박 끝이 세요'), whole(SM, '세 박 · 첫 박이 세요')];
    ['deong', 'kung', 'deok'].forEach((hit, k) => onPress(cards[k], () => {
      stop();
      const ac = engine.ensure();
      for (let j = 0; j < 3; j++) engine.drum(hit, ac.currentTime + 0.1 + j * 0.55, VEL[hit], bus);
      cards[k].classList.add('heard');
    }));
    [[3, JJ], [4, SM]].forEach(([k, def]) => onPress(cards[k], () => {
      stop(); board.set(def);
      playJang(kit, bus, def, { cycles: 2, T, onSub: i => board.now(i) });
      cards[k].classList.add('heard');
    }));
    ui.stage.append(h('div', { class: 'jang jang-show' }, board.el, exampleGroup(kit, cards, 'jd-exgroup')));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); killBus(engine, bus); };
  },

  // ── 연습: 자진모리 빈칸 하나 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say(kit.ez('장단을 듣고, 물음표 칸에 들어갈 장구 소리를 골라요'));
    const board = boardView(kit), bus = newBus(engine);
    const A = hitAnswers(kit, k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(h('div', { class: 'jang jang-play' }, board.el, A.el));
    ui.setBar(again);
    let streak = 0, cur = -1, open = false, passed = false, prev = -1, tok = 0;
    function hear() {
      const my = ++tok;
      open = false; A.busy(true);
      const p = playJang(kit, bus, JJ, { cycles: 2, T, onSub: i => { if (my === tok) board.now(i); } });
      T.after(p.firstEnd, () => { if (my === tok && !passed) { open = true; A.busy(false); } });
    }
    function ask() {
      if (passed) return;
      do { cur = FOLLOW_BLANKS[Math.floor(r() * FOLLOW_BLANKS.length)]; } while (cur === prev);
      prev = cur;
      board.set(JJ, [cur]); board.target(cur); A.clear();
      hear();
    }
    function answer(k) {
      if (!open) return;
      open = false; tok++; board.now(-1);
      const want = JJ.pat[cur], right = k === want;
      A.mark(k, right ? 'right' : 'wrong');
      board.fill(cur, right ? 'ok' : 'miss');
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak); ui.tell('맞아요', 'good');
        if (streak >= 3) { passed = true; kit.pass('세 번 이어서 장구 소리를 맞혔어요'); return; }
        T.after(1100, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0); A.reveal(want);
        ui.tell(`${SYL[want]}이었어요 — ${HAND[want]}`, 'oops', 2200);
        const ac = engine.ensure();
        for (let j = 0; j < 2; j++) engine.drum(want, ac.currentTime + 0.35 + j * 0.5, VEL[want], bus);
        T.after(2200, ask);
      }
    }
    onPress(again, () => { if (!passed && cur >= 0) hear(); });
    T.after(300, ask);
    kit.setAuto(() => { if (open) answer(JJ.pat[cur]); });
    return () => { T.clear(); killBus(engine, bus); };
  },

  // ── 확인 게임: 장단보 채우기 — 10판(빈칸 11) ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    ui.say(kit.ez('장단을 듣고 물음표 칸을 채워요'));
    const board = boardView(kit), bus = newBus(engine);
    const A = hitAnswers(kit, k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(h('div', { class: 'jang jang-play' }, board.el, A.el));
    const results = [];
    let i = -1, b = 0, cur = null, open = false, tok = 0, gone = false;
    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, kit.ez('장단보 채우기')),
      h('p', { class: 'sub' }, kit.ez('자진모리 · 세마치를 듣고 빈칸에 덩 · 쿵 · 덕을 넣어요')),
      h('p', { class: 'sub' }, `장단 ${PLAN.length}개 · 다시 듣기는 몇 번이든 돼요`)));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, () => { card.remove(); ui.setBar(again); next(); });
    ui.setBar(go);
    function hear() {
      const my = ++tok;
      open = false; A.busy(true);
      const p = playJang(kit, bus, cur.def, { cycles: 2, T, onSub: k => { if (my === tok) board.now(k); } });
      T.after(p.firstEnd, () => { if (my === tok && !gone) { open = true; A.busy(false); } });
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      cur = PLAN[i]; b = 0;
      ui.count(i + 1, PLAN.length);
      board.set(cur.def, cur.blank); board.target(cur.blank[0]); A.clear();
      T.after(250, hear);
    }
    function answer(k) {
      if (!open || !cur) return;
      const at = cur.blank[b], want = cur.def.pat[at], right = k === want;
      results.push(right);
      board.fill(at, right ? 'ok' : 'miss');
      if (right) { kit.sfx.good(engine); ui.tell('맞아요', 'good', 900); }
      else { kit.sfx.oops(engine); ui.tell(`${SYL[want]}이었어요`, 'oops', 1400); }
      A.mark(k, right ? 'right' : 'wrong'); if (!right) A.reveal(want);
      b++;
      if (b < cur.blank.length) { board.target(cur.blank[b]); T.after(700, () => A.clear()); return; }   // 빈칸이 하나 더 — 소리는 그대로 이어서 고름
      open = false; tok++; board.now(-1);
      T.after(right ? 1000 : 1500, next);
    }
    function end() {
      ui.tell(null); ui.count(null); A.clear(); A.busy(false); ui.setBar();
      const s = kit.scoreChoices(results, 5, { chance: results.map(() => 1 / 3) }), tip = tipOf(PLAN, results);
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, group: GROUP, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`, '자진모리 · 세마치 장단보를 채웠어요'], starOn: s.starOn, rules: s.rules, tip });
    }
    onPress(again, () => { if (cur && !gone && i < PLAN.length) hear(); });
    kit.setAuto(() => { if (card.isConnected) go.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else if (open && cur) answer(cur.def.pat[cur.blank[b]]); });
    return () => { gone = true; T.clear(); killBus(engine, bus); };
  },
};
