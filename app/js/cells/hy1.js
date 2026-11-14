// 형1 같은 가락·다른 가락 — 형식의 첫 칸(11-14 · 흐름 f1 '같은 가락 · 다른 가락')
//  형식(메기고 받기 · aba)은 '같은 것이 돌아오고 다른 것이 끼어드는' 짜임이다. 그 바탕은 방금 들은 가락이 앞의 것과 같은지 가려내는 귀.
//   그래서 기호도 낱말도 없이 **짧은 가락 둘을 듣고 같은지 · 비슷한지 · 다른지만** 고른다(귀 + 앞 가락을 잠깐 기억하기 → 난이도 2).
//  차례: 뚜렷이 같은 짝 · 다른 짝(단추 둘) → '비슷한 가락'(앞은 같고 끝 음만 다름 · 단추 셋)
//   → 비틀기 '악기 · 세기가 달라져도 같은 가락' + '길고 짧은 것은 같은데 높낮이가 다른 가락' → 섞어서
//  가락은 이 칸에서 만든 네 박짜리 짧은 동기(있는 노래를 쓰지 않음). 모든 도막의 길이가 같다(열리는 때로 답이 새지 않음).
//  1~2학년 판은 '가락' 대신 '노래'라고 부른다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 동기 — [음 높이, 박 수]. 이름 뒤 2 = 끝 음만 다른 것 · r = 길고 짧은 것은 같고 높낮이가 다른 것
const M = {
  a: [[67, 1], [64, 1], [67, 1], [64, 1]],                               // 솔 미 솔 미
  a2: [[67, 1], [64, 1], [67, 1], [72, 1]],                              // 솔 미 솔 높은 도
  b: [[60, 1], [62, 1], [64, 1], [67, 1]],                               // 도 레 미 솔
  b2: [[60, 1], [62, 1], [64, 1], [62, 1]],                              // 도 레 미 레
  c: [[72, 1], [69, 1], [67, 2]],                                        // 높은 도 라 솔―
  c2: [[72, 1], [69, 1], [64, 2]],                                       // 높은 도 라 미―
  cr: [[60, 1], [64, 1], [62, 2]],                                       // 도 미 레―
  d: [[64, 0.5], [64, 0.5], [67, 1], [64, 0.5], [64, 0.5], [60, 1]],     // 미미 솔 미미 도
  d2: [[64, 0.5], [64, 0.5], [67, 1], [64, 0.5], [64, 0.5], [67, 1]],    // 미미 솔 미미 솔
  dr: [[60, 0.5], [60, 0.5], [62, 1], [65, 0.5], [65, 0.5], [69, 1]],    // 도도 레 파파 라
};
const SOFT = 0.4, MID = 0.6, LOUD = 0.85;

// 판 — a 첫째 가락 · b 다른 가락일 때의 둘째 가락
//  kind: plain(그대로) | inst(둘째를 리코더로) | loud(첫째 작게 · 둘째 크게) | rhythm(b가 a와 길고 짧은 것이 같음) | near(끝 음만 다름)
//  right = same | near | diff — near 판은 섞어도 그대로 · 나머지는 same ↔ diff가 뒤집힘
export const PLAN = [
  { stage: 'intro', kind: 'plain', a: 'a', b: 'b', right: 'diff' },
  { stage: 'intro', kind: 'plain', a: 'b', b: 'c', right: 'same' },
  { stage: 'intro', kind: 'plain', a: 'c', b: 'a', right: 'diff' },
  { stage: 'grow', kind: 'near', a: 'a', right: 'near' },
  { stage: 'grow', kind: 'plain', a: 'd', b: 'b', right: 'same' },
  { stage: 'grow', kind: 'near', a: 'b', right: 'near' },
  { stage: 'grow', kind: 'rhythm', a: 'd', b: 'dr', right: 'diff' },
  { stage: 'twist', kind: 'inst', a: 'a', b: 'c', right: 'same' },
  { stage: 'twist', kind: 'loud', a: 'b', b: 'd', right: 'same' },
  { stage: 'twist', kind: 'near', a: 'd', right: 'near' },
  { stage: 'end', kind: 'near', a: 'c', right: 'near' },
  { stage: 'end', kind: 'rhythm', a: 'c', b: 'cr', right: 'diff' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => (p.right === 'near' ? p : { ...p, right: p.right === 'same' ? 'diff' : 'same' }), answerOf: p => p.right };
// 맞힐 확률 — '비슷한' 단추가 나오기 전(소개 판)은 둘 중 하나 · 그 뒤는 셋 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 2 : 1 / 3));

// 판 → 도막 둘(첫째 · 둘째). 모든 동기가 네 박이라 답과 상관없이 길이가 같다
function build(row) {
  const near = row.right === 'near', inst = row.kind === 'inst', loud = row.kind === 'loud';
  const second = row.right === 'same' ? M[row.a] : near ? M[row.a + '2'] : M[row.b];
  return [
    { lines: [line(M[row.a], { inst: 'piano', vel: loud ? SOFT : MID })], cap: loud ? '작게' : '' },
    { lines: [line(second, { inst: inst ? 'recorder' : 'piano', vel: loud ? LOUD : MID })], cap: near ? '끝만 달라요' : loud ? '크게' : '' },
  ];
}
const W = lo => (lo ? '노래' : '가락');
const IS = lo => (lo ? '노래예요' : '가락이에요');
const wrong = (row, lo) => (row.right === 'same'
  ? `같은 ${IS(lo)}${row.kind === 'inst' ? ' · 악기만 달라요' : row.kind === 'loud' ? ' · 세기만 달라요' : ''}`
  : row.right === 'near' ? '앞은 같고 끝만 달라요'
    : row.kind === 'rhythm' ? '길이는 같고 높낮이가 달라요' : `처음부터 다른 ${IS(lo)}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['악기·세기가 달라진 같은 가락', '끝만 다른 비슷한 가락', '길이가 같은 다른 가락'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => (p.kind === 'inst' || p.kind === 'loud') && p.right === 'same'), text: '악기나 세기가 달라진 같은 가락을 같지 않다고 고른 적이 있어요. 악기가 바뀌어도 높낮이와 길이가 그대로면 같은 가락이에요.' },
    { n: miss(p => p.right === 'near'), text: '끝만 다른 가락에 다른 단추를 고른 적이 있어요. 앞은 같고 끝만 다르면 비슷한 가락이에요.' },
    { n: miss(p => p.kind === 'rhythm' && p.right === 'diff'), text: '길이가 같고 높낮이가 다른 가락을 다른 가락이 아니라고 고른 적이 있어요. 길고 짧은 것이 같아도 높낮이가 다르면 다른 가락이에요.' },
  ], '악기 · 세기가 달라져도 가락만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 첫째는 둘 다 같은 가락(피아노) · 둘째만 다름(끝 음이 달라진 것 ↔ 악기만 달라진 것)
export const NEAR = [
  { label: '끝만 다른 가락', low: '끝만 다른 노래', play: nearSegs(build({ kind: 'near', a: 'a', right: 'near' })) },
  { label: '악기만 다른 가락', low: '악기만 다른 노래', play: nearSegs(build({ kind: 'inst', a: 'a', b: 'c', right: 'same' })) },
];

// 단추 그림 — 윗줄 = 첫째 가락 · 아랫줄 = 둘째 가락(달라진 음은 빈 막대)
const BAR = (x, y, on) => `<rect x="${x}" y="${y}" width="14" height="8" rx="3" ${on ? 'fill="#2F6F4E"' : 'style="fill:var(--surface)"'} stroke="#3B2A1E" stroke-width="2.2"/>`;
const LOW = { same: [[40, 50, 40], [1, 1, 1]], near: [[40, 50, 34], [1, 1, 0]], diff: [[52, 44, 36], [0, 0, 0]] };
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${[10, 20, 10].map((y, i) => BAR(6 + i * 19, y, 1)).join('')}${LOW[k][0].map((y, i) => BAR(6 + i * 19, y, LOW[k][1][i])).join('')}</svg>`;

const ASK = lo => `두 번 들어요 — 같은 ${W(lo)}일까요, 다른 ${W(lo)}일까요?`;
const cell = pickCell({
  friend: 'turtle',
  keys: ['same', 'near', 'diff'],
  label: (k, lo) => `${k === 'same' ? '같은' : k === 'near' ? '비슷한' : '다른'} ${W(lo)}`,
  chip: CHIP,
  lock: { key: 'near', at: CUTS[0], tell: lo => `비슷한 ${W(lo)} 단추가 나왔어요` },
  rightOf: row => row.right,
  build,
  names: () => ['첫째', '둘째'],
  say: {
    show: lo => `두 ${W(lo)}${lo ? '가' : '이'} 같은지 다른지 들어 봐요. 눌러서 들어요.`,
    follow: ASK,
    game: ASK,
    kid: lo => `TV 소리를 듣고 — 같은 ${W(lo)}인지 다른 ${W(lo)}인지 골라요`,
  },
  wrong,
  EX: lo => [
    { title: `같은 ${W(lo)}`, sub: '처음부터 끝까지 같아요', row: { kind: 'plain', a: 'a', b: 'b', right: 'same' } },
    { title: `비슷한 ${W(lo)}`, sub: '끝만 달라요', row: { kind: 'near', a: 'a', right: 'near' } },
    { title: `다른 ${W(lo)}`, sub: '처음부터 달라요', row: { kind: 'plain', a: 'a', b: 'b', right: 'diff' } },
    { title: '악기만 달라요', sub: `같은 ${IS(lo)}`, row: { kind: 'inst', a: 'a', b: 'c', right: 'same' } },
  ],
  pool: [
    { kind: 'plain', a: 'a', b: 'b', right: 'same' },
    { kind: 'plain', a: 'b', b: 'c', right: 'diff' },
    { kind: 'near', a: 'a', right: 'near' },
    { kind: 'near', a: 'b', right: 'near' },
    { kind: 'inst', a: 'a', b: 'c', right: 'same' },
    { kind: 'rhythm', a: 'd', b: 'dr', right: 'diff' },
  ],
  passText: '세 번 이어서 같은지 다른지 가려냈어요',
  game: {
    title: lo => `${W(lo)} 짝 맞히기`,
    sub: lo => `두 번 들려줘요. 둘째가 첫째와 같은 ${W(lo)}인지, 다른 ${W(lo)}인지 골라요. 비슷한 ${W(lo)} 단추는 중간에 나와요.`,
  },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
