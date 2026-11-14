// 가8 통째로 옮긴 가락(조옮김) — 가락 줄의 듣고 고르기 칸(11-14 · 흐름 m9)
//  조옮김 = 가락의 모든 음을 똑같이 높이거나 낮춤. 음 높이는 달라져도 사이(얼마나 오르고 내리는지)가 그대로라 같은 노래로 들린다.
//   그래서 기호도 조표도 없이 **짧은 가락 둘을 듣고 둘째가 그대로인지 · 통째로 옮겼는지 · 옮겼지만 한 음이 다르게 움직였는지** 고른다.
//  차례: 그대로 ↔ 통째로 옮김(단추 둘) → '다른 가락'(옮긴 뒤 한 음만 ±2 · 단추 셋)
//   → 비틀기 '조금만(온음 하나) 옮긴 가락' + '악기가 달라진 판' → 섞어서
//  가락은 이 칸에서 만든 네 박짜리 짧은 동기(있는 노래를 쓰지 않음). 둘째 도막의 길고 짧은 것은 첫째와 늘 같아 답과 상관없이 길이가 같다.
//  1~2학년 판은 '가락' 대신 '노래'라고 부른다(형1과 같음).
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 동기 — [음 높이, 박 수] · 모두 네 박. alt = '다른 가락'일 때 다르게 움직이는 음의 자리 · 얼마나(반음 ±2)
const M = {
  a: { mel: [[60, 1], [64, 1], [67, 1], [64, 1]], alt: [2, 2] },                          // 도 미 솔 미
  b: { mel: [[64, 1], [62, 0.5], [60, 0.5], [62, 1], [64, 1]], alt: [3, -2] },             // 미 레도 레 미
  c: { mel: [[67, 1], [67, 1], [69, 1], [67, 1]], alt: [2, -2] },                          // 솔 솔 라 솔
  d: { mel: [[60, 0.5], [62, 0.5], [64, 1], [65, 1], [67, 1]], alt: [3, 2] },              // 도레 미 파 솔
};
const VEL = 0.6;

// 판 — m 동기 · k 옮기는 반음 수(그대로일 때는 쓰지 않음)
//  kind: plain(그대로 · 5도 · 4도 옮김) | small(온음 하나만 옮김) | inst(둘째를 리코더로) | near(옮긴 뒤 한 음만 다름 = 다른 가락)
//  ans = same | moved | other — near 판은 섞어도 그대로 · 나머지는 same ↔ moved가 뒤집힘
export const PLAN = [
  { stage: 'intro', kind: 'plain', m: 'a', k: 7, ans: 'moved' },
  { stage: 'intro', kind: 'plain', m: 'b', k: 5, ans: 'same' },
  { stage: 'intro', kind: 'plain', m: 'c', k: -5, ans: 'moved' },
  { stage: 'grow', kind: 'near', m: 'a', k: 7, ans: 'other' },
  { stage: 'grow', kind: 'plain', m: 'd', k: 7, ans: 'same' },
  { stage: 'grow', kind: 'near', m: 'c', k: 5, ans: 'other' },
  { stage: 'twist', kind: 'small', m: 'b', k: 2, ans: 'moved' },
  { stage: 'twist', kind: 'inst', m: 'a', k: 5, ans: 'same' },
  { stage: 'twist', kind: 'inst', m: 'd', k: -5, ans: 'moved' },
  { stage: 'twist', kind: 'near', m: 'b', k: 2, ans: 'other' },
  { stage: 'end', kind: 'small', m: 'c', k: 2, ans: 'same' },
  { stage: 'end', kind: 'near', m: 'd', k: 7, ans: 'other' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => (p.ans === 'other' ? p : { ...p, ans: p.ans === 'same' ? 'moved' : 'same' }), answerOf: p => p.ans };
// 맞힐 확률 — '다른 가락' 단추가 나오기 전(소개 판)은 둘 중 하나 · 그 뒤는 셋 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 2 : 1 / 3));

// 둘째 가락 — 그대로 / 모든 음 + k / 모든 음 + k 뒤 한 음만 ±2
function second(row) {
  const { mel, alt } = M[row.m];
  if (row.ans === 'same') return mel;
  return mel.map(([p, b], i) => [p + row.k + (row.ans === 'other' && i === alt[0] ? alt[1] : 0), b]);
}
const capOf = row => (row.ans === 'same' ? '그대로' : row.ans === 'other' ? '한 음이 달라요' : row.k > 0 ? '통째로 올림' : '통째로 내림');
function build(row) {
  return [
    { lines: [line(M[row.m].mel, { inst: 'piano', vel: VEL })], cap: '' },
    { lines: [line(second(row), { inst: row.kind === 'inst' ? 'recorder' : 'piano', vel: VEL })], cap: capOf(row) },
  ];
}
const W = lo => (lo ? '노래' : '가락');
const wrong = row => (row.ans === 'same'
  ? `음 높이가 모두 같았어요${row.kind === 'inst' ? ' · 악기만 달라요' : ''}`
  : row.ans === 'other' ? '한 음이 다르게 움직였어요'
    : `모든 음이 똑같이 ${row.k > 0 ? '올라갔어요' : '내려갔어요'}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['조금만 옮긴 가락', '악기가 달라진 판', '한 음만 다른 가락'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'small'), text: '조금만 옮긴 판을 틀린 적이 있어요. 온음 하나만 옮겨도 모든 음이 똑같이 움직이면 옮긴 가락이에요.' },
    { n: miss(p => p.kind === 'inst'), text: '악기가 달라진 판을 틀린 적이 있어요. 악기는 빼고 음 높이만 들어 봐요.' },
    { n: miss(p => p.ans === 'other'), text: '한 음만 다르게 움직인 가락을 옮긴 가락으로 고른 적이 있어요. 모든 음이 똑같이 움직였는지 끝까지 들어 봐요.' },
  ], '음 높이가 어떻게 움직였는지 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 동기를 온음 하나 옮김 ↔ 온음 하나 옮긴 뒤 한 음만 다름
export const NEAR = [
  { label: '통째로 옮긴 가락', low: '통째로 옮긴 노래', play: nearSegs(build({ kind: 'small', m: 'b', k: 2, ans: 'moved' })) },
  { label: '한 음만 다른 가락', low: '한 음만 다른 노래', play: nearSegs(build({ kind: 'near', m: 'b', k: 2, ans: 'other' })) },
];

// 단추 그림 — 윗줄 = 첫째 가락 · 아랫줄 = 둘째 가락(옮기면 모두 같이 위로 · 다른 음은 빈 막대)
const BAR = (x, y, on) => `<rect x="${x}" y="${y}" width="14" height="8" rx="3" ${on ? 'fill="#2F6F4E"' : 'style="fill:var(--surface)"'} stroke="#3B2A1E" stroke-width="2.2"/>`;
const TOP = [24, 14, 24], LOW = { same: [[50, 40, 50], [1, 1, 1]], moved: [[40, 30, 40], [1, 1, 1]], other: [[40, 30, 52], [1, 1, 0]] };
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${TOP.map((y, i) => BAR(6 + i * 19, y - 10, 1)).join('')}${LOW[k][0].map((y, i) => BAR(6 + i * 19, y, LOW[k][1][i])).join('')}</svg>`;

const ASK = () => '두 번 들어요 — 그대로일까요, 통째로 옮겼을까요?';
const cell = pickCell({
  friend: 'bird',
  keys: ['same', 'moved', 'other'],
  label: (k, lo) => (k === 'same' ? '그대로' : k === 'moved' ? `옮긴 ${W(lo)}` : `다른 ${W(lo)}`),
  chip: CHIP,
  lock: { key: 'other', at: CUTS[0], tell: lo => `다른 ${W(lo)} 단추가 나왔어요` },
  rightOf: row => row.ans,
  build,
  names: () => ['첫째', '둘째'],
  say: {
    show: lo => (lo ? '노래를 통째로 높여도 같은 노래예요.' : '가락을 통째로 높이거나 낮춰도 같은 노래로 들려요. 이것을 조옮김이라고 해요.'),
    follow: ASK,
    game: ASK,
    kid: lo => `TV 소리를 듣고 — 그대로인지 옮긴 ${W(lo)}인지 골라요`,
  },
  wrong,
  EX: lo => [
    { title: '그대로', sub: '음 높이가 모두 같아요', row: { kind: 'plain', m: 'a', k: 7, ans: 'same' } },
    { title: `옮긴 ${W(lo)}`, sub: '모든 음이 똑같이 높아져요', row: { kind: 'plain', m: 'a', k: 7, ans: 'moved' } },
    { title: `다른 ${W(lo)}`, sub: '한 음이 다르게 움직여요', row: { kind: 'near', m: 'a', k: 7, ans: 'other' } },
    { title: `낮게 옮긴 ${W(lo)}`, sub: '모든 음이 똑같이 낮아져요', row: { kind: 'plain', m: 'c', k: -5, ans: 'moved' } },
  ],
  pool: [
    { kind: 'plain', m: 'a', k: 7, ans: 'moved' },
    { kind: 'plain', m: 'b', k: 5, ans: 'same' },
    { kind: 'plain', m: 'c', k: -5, ans: 'moved' },
    { kind: 'near', m: 'a', k: 7, ans: 'other' },
    { kind: 'near', m: 'c', k: 5, ans: 'other' },
    { kind: 'small', m: 'd', k: 2, ans: 'moved' },
    { kind: 'inst', m: 'b', k: 5, ans: 'same' },
  ],
  passText: '세 번 이어서 옮긴 가락을 가려냈어요',
  game: {
    title: lo => `옮긴 ${W(lo)} 찾기`,
    sub: lo => `두 번 들려줘요. 둘째가 그대로인지, 통째로 옮긴 ${W(lo)}인지 골라요. 다른 ${W(lo)} 단추는 중간에 나와요.`,
  },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
