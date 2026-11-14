// 박1 고른 박 — 박의 첫 칸(11-14 · 흐름 b1)
//  박 = 같은 간격으로 이어지는 소리. 박에 맞춰 치기(리1) 전에 **소리 사이 간격이 고른지**부터 귀로 가려낸다.
//   한 번 들려주는 여덟 소리를 듣고 '고르게' · '들쭉날쭉' 가운데 하나만 고른다(귀 하나 · 낱말 없음 → 난이도 1).
//  차례: 보통 빠르기에서 뚜렷이 들쭉날쭉(간격 ±40%) → 빠르게 · 느리게(±30%) → 비틀기(한 판에 한 가지만)
//   '크기가 달라져도 간격이 같으면 고르게' · '음이 움직여도 간격이 같으면 고르게' → 섞어서(±25%)
//  들쭉날쭉한 간격 = B × (1 + s × J[i]) — J의 합이 0이라 같은 꼴이면 답과 상관없이 소리 길이가 같다(8B · 열리는 때로 답이 새지 않음).
//   긴-짧은이 되풀이되는 꼴(리듬으로 들림)은 쓰지 않는다.
//  틀(_pick.js)의 line(…)은 박 수로 길이를 정하므로, 이 칸은 음 객체 { p, d, gap, vel, inst }를 손으로 만든다(짧은 실로폰 소리 · 간격 = d + gap).
//  ⚠ 귀로 확인하지 못한 것: ① 크롬북 스피커에서 ±25% 간격 차이가 빠른 판(B 0.3 · 간격 0.225 ~ 0.375초)에서도 들리는지
//   ② 세기가 들쭉날쭉한 판에서 센 소리가 먼저 오는 것처럼(간격이 달라진 것처럼) 들릴 수 있는지
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const BEAT = { plain: 0.42, fast: 0.3, slow: 0.6, loud: 0.42, tune: 0.42 };   // 소리 사이 간격(초)
const S = { intro: 0.4, grow: 0.3, twist: 0.25, end: 0.25 };                   // 들쭉날쭉한 정도(단계마다 줄어듦)
const J = [[1, -0.5, -0.5, 0.5, -1, 0.5, 0], [-1, 0.5, 1, -0.5, 0.5, -0.5, 0], [0.5, 1, -1, -0.5, 0.5, -0.5, 0]];
const VEL = [0.9, 0.35, 0.6, 0.9, 0.4, 0.75, 0.35, 0.85];                     // loud 판 — 세기만 들쭉날쭉(고르게 판에서도)
const TUNE = [60, 62, 64, 65, 67, 65, 64, 62];                                 // tune 판 — 도 레 미 파 솔 파 미 레
const P = 72, D = 0.12, MID = 0.6;

// 판 — kind: plain | fast | slow | loud | tune · j = 들쭉날쭉한 꼴(J 차례) · ans = even | uneven(섞을 때 뒤집힘)
export const PLAN = [
  { stage: 'intro', kind: 'plain', j: 0, ans: 'uneven' },
  { stage: 'intro', kind: 'plain', j: 1, ans: 'even' },
  { stage: 'intro', kind: 'plain', j: 2, ans: 'uneven' },
  { stage: 'grow', kind: 'plain', j: 0, ans: 'even' },
  { stage: 'grow', kind: 'fast', j: 1, ans: 'uneven' },
  { stage: 'grow', kind: 'slow', j: 2, ans: 'even' },
  { stage: 'twist', kind: 'loud', j: 0, ans: 'even' },
  { stage: 'twist', kind: 'loud', j: 1, ans: 'uneven' },
  { stage: 'twist', kind: 'tune', j: 2, ans: 'even' },
  { stage: 'twist', kind: 'tune', j: 0, ans: 'uneven' },
  { stage: 'end', kind: 'fast', j: 2, ans: 'even' },
  { stage: 'end', kind: 'plain', j: 1, ans: 'uneven' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'even' ? 'uneven' : 'even' }), answerOf: p => p.ans };

// 판 → 도막 하나 · 여덟 소리. 간격 일곱 + 끝 소리 뒤 꼬리(B) = 늘 8B
function build(row) {
  const B = BEAT[row.kind], s = S[row.stage] ?? 0.3;
  const gaps = J[row.j].map(x => (row.ans === 'even' ? B : B * (1 + s * x))).concat(B);
  const ns = gaps.map((g, i) => ({
    p: row.kind === 'tune' ? TUNE[i] : P, d: D, gap: +(g - D).toFixed(4),
    vel: row.kind === 'loud' ? VEL[i] : MID, inst: 'xylo',
  }));
  return [{ lines: [ns], cap: row.ans === 'even' ? '간격이 같아요' : '간격이 달라요' }];
}
const EVEN_WHY = { plain: '간격이 모두 같았어요', fast: '빠르지만 간격이 같았어요', slow: '느리지만 간격이 같았어요', loud: '크기는 달라도 간격이 같았어요', tune: '음은 달라도 간격이 같았어요' };
const wrong = row => (row.ans === 'even' ? EVEN_WHY[row.kind] : '간격이 길었다 짧았다 했어요');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['빠르거나 느린 고른 박', '크기가 달라지는 고른 박', '음이 달라지는 고른 박'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => (p.kind === 'fast' || p.kind === 'slow') && p.ans === 'even'), text: '빠르거나 느린 고른 박을 들쭉날쭉으로 고른 적이 있어요. 빠르기와 상관없이 간격이 같으면 고르게예요.' },
    { n: miss(p => p.kind === 'loud' && p.ans === 'even'), text: '크기가 달라지는 고른 박을 들쭉날쭉으로 고른 적이 있어요. 크기가 달라도 간격이 같으면 고르게예요.' },
    { n: miss(p => p.kind === 'tune' && p.ans === 'even'), text: '음이 달라지는 고른 박을 들쭉날쭉으로 고른 적이 있어요. 음이 움직여도 간격이 같으면 고르게예요.' },
  ], '빠르기 · 크기 · 음이 달라져도 간격만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 크기만 들쭉날쭉한 고른 박 ↔ 간격이 들쭉날쭉한 소리
export const NEAR = [
  { label: '크기만 달라요 · 고르게', low: null, play: nearSegs(build({ stage: 'twist', kind: 'loud', j: 0, ans: 'even' })) },
  { label: '간격이 달라요 · 들쭉날쭉', low: null, play: nearSegs(build({ stage: 'twist', kind: 'plain', j: 0, ans: 'uneven' })) },
];

// 단추 그림 — 고르게 = 점 넷이 같은 간격 · 들쭉날쭉 = 점 넷이 다른 간격
const DOT = x => `<circle cx="${x}" cy="32" r="5" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.4"/>`;
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${(k === 'even' ? [8, 24, 40, 56] : [8, 17, 43, 56]).map(DOT).join('')}</svg>`;

const ASK = '잘 들어요 — 소리가 고르게 나나요, 들쭉날쭉 나나요?';
const cell = pickCell({
  friend: 'hog',
  keys: ['even', 'uneven'],
  label: k => (k === 'even' ? '고르게' : '들쭉날쭉'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '소리가 같은 간격으로 이어지면 고른 박이에요. 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 고르게인지 들쭉날쭉인지 골라요',
  },
  wrong,
  note: () => '막대 사이가 같으면 고르게예요',
  EX: () => [
    { title: '고르게', sub: '간격이 같아요', row: { stage: 'intro', kind: 'plain', j: 0, ans: 'even' } },
    { title: '들쭉날쭉', sub: '간격이 달라요', row: { stage: 'intro', kind: 'plain', j: 0, ans: 'uneven' } },
    { title: '빨라도 고르게', sub: '빠르기만 달라요', row: { stage: 'grow', kind: 'fast', j: 0, ans: 'even' } },
    { title: '크기가 달라도 고르게', sub: '간격은 같아요', row: { stage: 'twist', kind: 'loud', j: 0, ans: 'even' } },
  ],
  pool: [
    { stage: 'intro', kind: 'plain', j: 0, ans: 'even' },
    { stage: 'intro', kind: 'plain', j: 1, ans: 'uneven' },
    { stage: 'grow', kind: 'fast', j: 2, ans: 'even' },
    { stage: 'grow', kind: 'slow', j: 0, ans: 'uneven' },
    { stage: 'twist', kind: 'loud', j: 1, ans: 'even' },
    { stage: 'twist', kind: 'tune', j: 2, ans: 'uneven' },
  ],
  passText: '세 번 이어서 고른 박을 가려냈어요',
  game: { title: '고른 박 찾기', sub: () => '소리를 한 번 들려줘요. 소리가 같은 간격으로 고르게 나는지, 들쭉날쭉 나는지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
