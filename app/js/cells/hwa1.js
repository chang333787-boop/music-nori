// 화1 하나씩·함께 — 화음의 첫 칸(11-14 · 흐름 h1 '소리의 어울림 — 돌림노래 · 2중주')
//  화음 = 여러 음이 함께 나는 소리. 3화음(도미솔 · 파라도 · 솔시레)을 배우기 전에 먼저 **소리가 한 번에 하나씩 나는지, 여럿이 함께 나는지**를
//   귀로 가려낸다 — 이름도 기호도 없이 단추 둘(귀 + 한꺼번에 나는 소리에 귀 기울이기 → 난이도 2).
//  차례: 한 악기 혼자 ↔ 두 악기가 함께 · 음을 하나씩 펼친 소리 ↔ 한꺼번에 낸 소리 → 한 악기가 두 음을 함께
//   → 비틀기 '악기가 둘이어도 번갈아 나면 하나씩' + '작게 깔린 낮은 소리가 있으면 함께' → 돌림노래(뒤에서 들어오는 둘째 악기)
//  '어울린다 · 안 어울린다'는 묻지 않는다(느낌이라 맞고 틀림을 가리기 어렵다). 가락은 이 칸에서 만든 짧은 것(있는 노래를 쓰지 않음).
//  같은 꼴이면 '하나씩'과 '함께'의 길이가 같다(열리는 때로 답이 새지 않음).
//  ⚠ 낮은 소리(soft)는 작은 스피커에서 잘 안 들릴 수 있어 너무 낮지 않은 음(낮은 솔 · 가운데 도)으로 골랐다 — 귀로 확인하지는 못했다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const Q = (ps, o) => line(ps.map(p => [p, 1]), o);            // 한 박씩
const ONE = 0.6, TWO = 0.52, LOUD = 0.85, UNDER = 0.45;

// 꼴마다 쓰는 음(가락 · 3도 아래 줄)
const PLAIN = [
  { up: [64, 67, 65, 62], dn: [60, 64, 62, 59] },             // 미 솔 파 레 · 도 미 레 시
  { up: [67, 69, 67, 64], dn: [64, 65, 64, 60] },             // 솔 라 솔 미 · 미 파 미 도
  { up: [72, 71, 69, 67], dn: [69, 67, 65, 64] },             // 높은 도 시 라 솔 · 라 솔 파 미
];
const CHORD = [[60, 64, 67], [65, 69, 72]];                   // 도 미 솔 · 파 라 높은 도
const SELF = [
  { inst: 'piano', dn: [60, 62, 64, 62], up: [64, 65, 67, 65] },
  { inst: 'xylo', dn: [67, 65, 64, 62], up: [71, 69, 67, 65] },
];
const TURN = [
  { a: 'recorder', b: 'piano', up: [67, 64, 65, 67], dn: [64, 60, 62, 64] },
  { a: 'violin', b: 'xylo', up: [72, 69, 67, 69], dn: [69, 65, 64, 65] },
];
const SOFT = [
  { inst: 'trumpet', up: [67, 71, 74, 71], low: 55 },         // 솔 시 높은 레 시 · 아래에 낮은 솔
  { inst: 'violin', up: [72, 69, 67, 64], low: 60 },          // 높은 도 라 솔 미 · 아래에 가운데 도
];
const ROUND = [60, 64, 62, 64, 64, 67, 65, 67];               // 여덟 박 — 둘째 악기는 넷째 박 뒤에 처음부터 들어옴

// 꼴 → 한 도막의 줄들(many = 함께)
const KIND = {
  // 한 악기 혼자 ↔ 두 악기가 3도로 함께
  plain: (m, many) => (many ? [Q(PLAIN[m].up, { inst: 'recorder', vel: TWO }), Q(PLAIN[m].dn, { inst: 'piano', vel: TWO })] : [Q(PLAIN[m].up, { inst: 'recorder', vel: ONE })]),
  // 세 음을 하나씩 펼침 ↔ 세 음을 한꺼번에(두 번)
  chord: (m, many) => (many ? CHORD[m].map(p => line([[p, 2], [p, 2]], { inst: 'piano', vel: TWO })) : [Q([CHORD[m][0], CHORD[m][1], CHORD[m][2], CHORD[m][1]], { inst: 'piano', vel: ONE })]),
  // 한 악기가 한 줄 ↔ 같은 악기가 두 줄
  self: (m, many) => (many ? [Q(SELF[m].dn, { inst: SELF[m].inst, vel: TWO }), Q(SELF[m].up, { inst: SELF[m].inst, vel: TWO })] : [Q(SELF[m].dn, { inst: SELF[m].inst, vel: ONE })]),
  // 두 악기가 번갈아(앞 두 박 · 뒤 두 박) ↔ 두 악기가 네 박 내내 함께
  turn: (m, many) => {
    const x = TURN[m];
    return many
      ? [Q(x.up, { inst: x.a, vel: TWO }), Q(x.dn, { inst: x.b, vel: TWO })]
      : [line([[x.up[0], 1], [x.up[1], 1], [null, 2]], { inst: x.a, vel: ONE }), line([[null, 2], [x.dn[2], 1], [x.dn[3], 1]], { inst: x.b, vel: ONE })];
  },
  // 큰 가락 혼자 ↔ 큰 가락 아래에 작고 긴 낮은 소리
  soft: (m, many) => {
    const x = SOFT[m], top = Q(x.up, { inst: x.inst, vel: LOUD });
    return many ? [top, line([[x.low, 4]], { inst: 'cello', vel: UNDER })] : [top];
  },
  // 돌림노래 — 첫째 악기 혼자 ↔ 넷째 박 뒤에 둘째 악기가 같은 가락으로 들어옴
  round: (m, many) => {
    const v1 = Q(ROUND, { inst: 'recorder', vel: many ? TWO : ONE });
    return many ? [v1, line([[null, 4], ...ROUND.slice(0, 4).map(p => [p, 1])], { inst: 'xylo', vel: TWO })] : [v1];
  },
};

// 판 — kind 꼴 · m 그 꼴의 몇째 음 묶음 · ans = one | many(섞을 때 뒤집힘)
export const PLAN = [
  { stage: 'intro', kind: 'plain', m: 0, ans: 'many' },
  { stage: 'intro', kind: 'plain', m: 1, ans: 'one' },
  { stage: 'intro', kind: 'chord', m: 0, ans: 'many' },
  { stage: 'grow', kind: 'chord', m: 1, ans: 'one' },
  { stage: 'grow', kind: 'self', m: 0, ans: 'many' },
  { stage: 'grow', kind: 'self', m: 1, ans: 'one' },
  { stage: 'twist', kind: 'turn', m: 0, ans: 'one' },
  { stage: 'twist', kind: 'soft', m: 0, ans: 'many' },
  { stage: 'twist', kind: 'turn', m: 1, ans: 'many' },
  { stage: 'twist', kind: 'soft', m: 1, ans: 'one' },
  { stage: 'end', kind: 'round', m: 0, ans: 'many' },
  { stage: 'end', kind: 'plain', m: 2, ans: 'one' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'one' ? 'many' : 'one' }), answerOf: p => p.ans };

const build = row => [{ lines: KIND[row.kind](row.m, row.ans === 'many'), cap: row.ans === 'many' ? '함께' : '하나씩' }];
const wrong = row => (row.ans === 'one'
  ? (row.kind === 'turn' ? '두 악기가 번갈아 났어요 · 하나씩' : '한 번에 한 음씩 났어요')
  : row.kind === 'soft' ? '아래에 낮은 소리가 길게 났어요'
    : row.kind === 'round' ? '뒤에서 둘째 악기가 들어왔어요'
      : row.kind === 'self' || row.kind === 'chord' ? '한 악기가 여러 음을 함께 냈어요' : '두 악기가 함께 났어요');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['번갈아 나는 두 악기', '작게 깔린 낮은 소리', '한 악기의 여러 음'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'turn' && p.ans === 'one'), text: '두 악기가 번갈아 나는 소리를 함께로 고른 적이 있어요. 악기가 둘이어도 차례로 나면 하나씩이에요.' },
    { n: miss(p => p.kind === 'soft' && p.ans === 'many'), text: '작게 깔린 낮은 소리가 있는 소리를 하나씩으로 고른 적이 있어요. 가락 아래에 길게 이어지는 소리가 있는지 들어 봐요.' },
    { n: miss(p => (p.kind === 'self' || p.kind === 'chord') && p.ans === 'many'), text: '한 악기가 여러 음을 함께 낸 소리를 하나씩으로 고른 적이 있어요. 악기가 하나여도 여러 음이 함께 날 수 있어요.' },
  ], '악기 수와 상관없이 소리가 함께 나는지 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 두 악기(리코더 · 피아노)가 번갈아 ↔ 함께
export const NEAR = [
  { label: '번갈아 나는 두 악기', low: null, play: nearSegs(build({ kind: 'turn', m: 0, ans: 'one' })) },
  { label: '함께 나는 두 악기', low: null, play: nearSegs(build({ kind: 'turn', m: 0, ans: 'many' })) },
];

// 단추 그림 — 하나씩 = 옆으로 차례로 놓인 음 셋 · 함께 = 위아래로 쌓인 음 셋
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.6"/>`;
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${k === 'one' ? DOT(12, 44) + DOT(32, 32) + DOT(52, 20) : DOT(32, 13) + DOT(32, 32) + DOT(32, 51)}</svg>`;

const ASK = '잘 들어요 — 소리가 하나씩 나나요, 함께 나나요?';
const cell = pickCell({
  friend: 'turtle',
  keys: ['one', 'many'],
  label: k => (k === 'one' ? '하나씩' : '함께'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '소리는 하나씩 나기도 하고 함께 나기도 해요. 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 하나씩인지 함께인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '하나씩', sub: '한 악기 · 한 음씩', row: { kind: 'plain', m: 0, ans: 'one' } },
    { title: '함께', sub: '두 악기가 같이', row: { kind: 'plain', m: 0, ans: 'many' } },
    { title: '번갈아', sub: '두 악기 · 하나씩이에요', row: { kind: 'turn', m: 0, ans: 'one' } },
    { title: '한 악기 · 함께', sub: '한 악기가 두 음을', row: { kind: 'self', m: 0, ans: 'many' } },
  ],
  pool: [
    { kind: 'plain', m: 0, ans: 'one' },
    { kind: 'plain', m: 1, ans: 'many' },
    { kind: 'chord', m: 0, ans: 'one' },
    { kind: 'self', m: 0, ans: 'many' },
    { kind: 'turn', m: 0, ans: 'one' },
    { kind: 'turn', m: 1, ans: 'many' },
  ],
  passText: '세 번 이어서 함께 나는 소리를 가려냈어요',
  game: { title: '하나씩일까 함께일까', sub: () => '소리를 들려줘요. 한 번에 한 음씩 나는지, 여러 음이 함께 나는지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
