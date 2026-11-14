// 리9 리듬 카드 찾기 ② — 점음표 · 당김음(11-14 · 묶음 C · 흐름 r6 점음표 · r8 당김음)
//  점음표는 음표에 그 반을 더한 길이 · 당김음은 여린 자리(박 사이)에서 시작한 음이 박을 넘어 이어진다.
//   '하나 둘' 두 박을 센 뒤 네 박 리듬이 나오고, 판마다 다른 리듬 카드 셋 가운데 들은 리듬과 같은 카드를 고른다(박을 넘는 긴 음을 귀로 가려냄).
//  차례: 소개 점4분음표(♩.♪) → 발전 점2분음표 → 비틀기 당김음(♪♩♪) → 마무리 섞어서
//  한 판의 카드 셋은 소리가 모두 다르다(tests/pick/ri9.mjs · 리8과 같은 검사). 카드 꼴 봇(새 꼴 · 기호 많은 · 홀로 다른 카드)이 별을 못 받게
//   카드 자리를 맞춤 — 새 꼴이 든 다른 카드가 답 카드 바로 앞(뒤집으면 답이 다음 카드로 가므로 그 카드는 어느 쪽에서도 답이 아님).
//  리듬은 이 칸에서 만든 것(있는 노래를 쓰지 않음) · 소리는 컴퓨터로 만든 실로폰 · 하이햇. 6/8은 리13이 맡는다.
//  ⚠ std는 리5 것을 그대로 옮김(설계서 §C) — 원문으로 다시 판정하지 못함.
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { glyph } from './_glyph.js';
import { beatsOf, buildCard, flipCard, ansKey, KEYS, NTH } from './_rcard.js';

// 판 — kind: dot(점4분음표) · dh(점2분음표) · syn(당김음) · mix(섞어서 — grp가 tip 갈래)
export const PLAN = [
  { stage: 'intro', kind: 'dot', set: ['q dqe q', 'dqe q q', 'q q q q'], ans: 1 },
  { stage: 'intro', kind: 'dot', set: ['dqe dqe', 'dqe q e2', 'q e2 dqe'], ans: 0 },
  { stage: 'intro', kind: 'dot', set: ['q dqe q', 'e2 dqe q', 'e2 q e2 q'], ans: 2 },
  { stage: 'grow', kind: 'dh', set: ['dh q', 'q dh', 'h q q'], ans: 0 },
  { stage: 'grow', kind: 'dh', set: ['dh q', 'q dh', 'h h'], ans: 1 },
  { stage: 'grow', kind: 'dh', set: ['dqe h', 'h dqe', 'q e2 h'], ans: 2 },
  { stage: 'twist', kind: 'syn', set: ['syn q q', 'dqe q q', 'e2 e2 q q'], ans: 0 },
  { stage: 'twist', kind: 'syn', set: ['q dqe q', 'q syn q', 'q e2 e2 q'], ans: 1 },
  { stage: 'twist', kind: 'syn', set: ['q q syn', 'syn q q', 'q syn q'], ans: 2 },
  { stage: 'twist', kind: 'syn', set: ['syn syn', 'syn e2 e2', 'e2 e2 syn'], ans: 0 },
  { stage: 'end', kind: 'mix', grp: 'dot', set: ['q e2 syn', 'syn dqe', 'dqe syn'], ans: 1 },
  { stage: 'end', kind: 'mix', grp: 'syn', set: ['q syn q', 'dqe e2 q', 'q dqe q'], ans: 2 },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: flipCard, answerOf: ansKey };
// 그 판에 새로 나온 꼴(카드 꼴 봇 · 덧검사가 씀)
export const NEW = { dot: ['dqe'], dh: ['dh'], syn: ['syn'], mix: ['syn', 'dqe'] };
const grp = p => p.grp || p.kind;

const SAY_K = { dot: '점4분음표 — 한 박 반 길게 났어요', dh: '점2분음표 — 세 박 길게 났어요', syn: '박 사이에서 시작한 음이 다음 박까지 이어졌어요(당김음)' };
const wrong = row => `${NTH[row.ans]} 카드였어요 · ${SAY_K[grp(row)]}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['점4분음표', '점2분음표', '당김음'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(grp(p))).length;
  return factTip(results, [
    { n: miss(g => g === 'dot'), text: '점4분음표 카드를 헷갈렸어요. 점4분음표는 한 박 반 동안 이어지고, 뒤에 8분음표가 짧게 붙어요.' },
    { n: miss(g => g === 'dh'), text: '점2분음표 카드를 헷갈렸어요. 점2분음표는 세 박 동안 이어져요 — 박을 세며 소리가 몇 박 이어지는지 들어 봐요.' },
    { n: miss(g => g === 'syn'), text: '당김음 카드를 헷갈렸어요. 당김음은 박 사이에서 시작한 음이 다음 박까지 이어져요.' },
  ], '박을 넘는 긴 음을 듣고 같은 카드를 골랐어요.');
}

const card = (text, k) => ({ key: KEYS[k], label: NTH[k], chip: glyph(beatsOf(text), { label: `${NTH[k]} 카드` }), tv: NTH[k] });
export const cards = row => row.set.map((t, k) => card(t, k));
const one = t => ({ set: [t], ans: 0 });

// 헷갈리는 두 소리 — 당김음(♪♩♪) ↔ 점4분음표(♩.♪)
export const NEAR = [
  { label: '박 사이에서 시작해요(♪♩♪)', play: nearSegs(buildCard({ set: PLAN[6].set, ans: 0 })) },
  { label: '박에서 시작해 길어요(♩.♪)', play: nearSegs(buildCard({ set: PLAN[6].set, ans: 1 })) },
];

const ASK = lo => (lo ? '들어요 — 같은 카드는 어느 것인가요?' : '들어요 — 들은 리듬은 어느 카드인가요?');
const cell = pickCell({
  friend: 'hog',
  keys: KEYS,
  label: k => NTH[KEYS.indexOf(k)],
  cards,
  rightOf: ansKey,
  build: buildCard,
  names: () => ['준비', '리듬'],
  say: {
    show: lo => (lo ? '길게 이어지는 소리가 있어요. 박을 세며 눌러서 들어 봐요.' : '점이 붙으면 그 음표의 반만큼 길어져요. 박 사이에서 시작해 박을 넘는 음도 있어요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 같은 리듬 카드를 골라요',
  },
  wrong,
  note: () => '컴퓨터로 만든 소리예요 · 작은 소리는 박이에요',
  EX: lo => [
    { title: lo ? '한 박 반 길게' : '점4분음표', sub: '♩.♪ — 한 박 반 + 반 박', row: one('dqe q q') },
    { title: lo ? '세 박 길게' : '점2분음표', sub: '세 박 동안 이어져요', row: one('dh q') },
    { title: lo ? '박 사이에서 시작' : '당김음', sub: '박 사이에서 시작해 다음 박까지', row: one('syn q q') },
    { title: '네 박', sub: '박마다 소리 하나', row: one('q q q q') },
  ],
  pool: [PLAN[0], PLAN[1], PLAN[3], PLAN[4], PLAN[6], PLAN[7]],
  passText: '세 번 이어서 같은 리듬 카드를 골랐어요',
  game: { title: '긴 음 카드 찾기', sub: () => '두 박을 센 뒤 네 박 리듬이 나와요. 같은 리듬 카드를 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
