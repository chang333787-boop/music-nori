// 형3 도막 짜임(ab · aba) — 형식 칸(11-14 · 흐름 f3 · f6)
//  형1(두 가락이 같은지)에서 가려낸 귀를 **세 도막**으로 넓힌다: 세 도막을 이어 듣고 어느 도막이 같았는지 글자 꼴로 고른다.
//   a-a-b · a-b-a · a-b-b · a-b-c(답마다 3판). 같은 글자 = 음 높이 · 길이가 모두 같은 도막. 조금 다른 도막(a′)이나 옮긴 도막은 쓰지 않는다.
//  차례: 뚜렷한 짜임 → 세 도막이 모두 다른 a-b-c · 길이 꼴이 같은 다른 도막 → 비틀기 '악기 · 세기가 달라져도 같은 도막' → 섞어서
//  동기는 이 칸에서 만든 세 박짜리 짧은 가락(있는 노래를 쓰지 않음) — 모든 도막이 세 박이라 답과 상관없이 길이가 같다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 동기 — [음 높이, 박 수] · 길이 꼴 넷([1,1,1] · [0.5,0.5,1,1] · [1,0.5,0.5,1] · [1,2]) · 이름 뒤 2 = 길이 꼴은 같고 높낮이가 다른 것
const M = {
  p: [[67, 1], [64, 1], [67, 1]],                        // 솔 미 솔
  p2: [[60, 1], [64, 1], [62, 1]],                       // 도 미 레
  q: [[60, 0.5], [62, 0.5], [64, 1], [60, 1]],           // 도레 미 도
  q2: [[67, 0.5], [65, 0.5], [64, 1], [67, 1]],          // 솔파 미 솔
  r: [[72, 1], [69, 0.5], [67, 0.5], [64, 1]],           // 높은 도 라솔 미
  s: [[65, 1], [64, 2]],                                 // 파 미―
};
export const FORMS = ['aab', 'aba', 'abb', 'abc'];
// 한 박 0.34초(다른 칸 0.42보다 빠름) — 도막 셋이라 TV 소리 모드 한 판이 100초 안에 들게(0.42면 107초)
const MID = 0.6, SOFT = 0.4, BT = 0.34;

// 판 — a · b · c 도막(글자 → 동기) · ans = 짜임(섞을 때 다음 짜임으로)
//  kind: plain | inst(셋째 도막을 리코더로 — a-b-a · a-b-b면 되풀이된 도막) | soft(셋째만 작게) | rhythm(b가 a와 길이 꼴이 같고 높낮이가 다름)
export const PLAN = [
  { stage: 'intro', kind: 'plain', a: 'p', b: 'q', c: 's', ans: 'aba' },
  { stage: 'intro', kind: 'plain', a: 'q', b: 'r', c: 'p', ans: 'aab' },
  { stage: 'intro', kind: 'plain', a: 'r', b: 's', c: 'q', ans: 'abb' },
  { stage: 'grow', kind: 'plain', a: 's', b: 'p', c: 'r', ans: 'abc' },
  { stage: 'grow', kind: 'plain', a: 'r', b: 'q', c: 'p', ans: 'aba' },
  { stage: 'grow', kind: 'rhythm', a: 'p', b: 'p2', c: 's', ans: 'aab' },
  { stage: 'twist', kind: 'inst', a: 'q', b: 's', c: 'r', ans: 'aba' },
  { stage: 'twist', kind: 'inst', a: 'p', b: 'r', c: 'q', ans: 'abc' },
  { stage: 'twist', kind: 'soft', a: 's', b: 'q', c: 'p', ans: 'abb' },
  { stage: 'twist', kind: 'rhythm', a: 'q', b: 'q2', c: 'r', ans: 'abc' },
  { stage: 'end', kind: 'inst', a: 'r', b: 'p', c: 's', ans: 'aab' },
  { stage: 'end', kind: 'soft', a: 'p', b: 'r', c: 'q', ans: 'abb' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: FORMS[(FORMS.indexOf(p.ans) + 1) % FORMS.length] }), answerOf: p => p.ans };

// 리코더 · 작게는 늘 셋째 도막 — 설계서는 a-a-b의 둘째(되풀이된 a)를 리코더로 했으나, 그러면 리코더가 둘째에서 나면 a-a-b · 셋째면 다른 짜임이라
//  리코더 자리만 보고 짜임을 맞히는 봇이 별을 받았다(시험 29.5%) → 자리를 셋째로 묶음
function build(row) {
  return [...row.ans].map((ch, k) => {
    const inst = row.kind === 'inst' && k === 2, soft = row.kind === 'soft' && k === 2;
    return { lines: [line(M[row[ch]], { inst: inst ? 'recorder' : 'piano', vel: soft ? SOFT : MID, beat: BT })], cap: soft ? '작게' : '' };
  });
}
const SAME = { aba: '첫째와 셋째가 같았어요', aab: '첫째와 둘째가 같았어요', abb: '둘째와 셋째가 같았어요', abc: '세 도막이 모두 달랐어요' };
// 덧붙임은 셋째 도막이 되풀이된 도막일 때만(a-b-c · a-a-b의 셋째는 되풀이가 아님)
const wrong = row => SAME[row.ans]
  + (row.kind === 'inst' && (row.ans === 'aba' || row.ans === 'abb') ? ' · 악기만 달라요' : '')
  + (row.kind === 'soft' && (row.ans === 'aba' || row.ans === 'abb') ? ' · 세기만 달라요' : '');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['악기가 달라진 같은 도막', '작아진 같은 도막', '길이가 같은 다른 도막'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'inst'), text: '악기가 달라진 판에서 짜임을 다르게 고른 적이 있어요. 악기가 바뀌어도 높낮이와 길이가 그대로면 같은 도막이에요.' },
    { n: miss(p => p.kind === 'soft'), text: '셋째 도막이 작아진 판에서 짜임을 다르게 고른 적이 있어요. 작게 나도 높낮이와 길이가 그대로면 같은 도막이에요.' },
    { n: miss(p => p.kind === 'rhythm'), text: '길이 꼴이 같은 도막을 같은 도막으로 고른 적이 있어요. 길고 짧은 것이 같아도 높낮이가 다르면 다른 도막이에요.' },
  ], '악기 · 세기가 달라져도 도막을 견줘 짜임을 골랐어요.');
}
// 헷갈리는 두 소리 — 첫째 · 둘째는 같음 · 셋째만 다름(악기만 달라진 a ↔ 다른 도막 c)
export const NEAR = [
  { label: 'a-b-a · 셋째만 리코더', low: null, play: nearSegs(build({ kind: 'inst', a: 'p', b: 'q', c: 'r', ans: 'aba' })) },
  { label: 'a-b-c · 셋째 다른 도막', low: null, play: nearSegs(build({ kind: 'plain', a: 'p', b: 'q', c: 'r', ans: 'abc' })) },
];

// 단추 그림 — 도막 셋 = 칸 셋 · 같은 글자 = 같은 모양(a 초록 동그라미 · b 빈 네모 · c 세모)
const SHAPE = (ch, x) => (ch === 'a' ? `<circle cx="${x}" cy="32" r="8" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.4"/>`
  : ch === 'b' ? `<rect x="${x - 8}" y="24" width="16" height="16" rx="3" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="2.4"/>`
    : `<path d="M${x} 23 L${x + 9} 40 L${x - 9} 40 Z" fill="#3B2A1E" stroke="#3B2A1E" stroke-width="2" stroke-linejoin="round"/>`);
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${[...k].map((ch, i) => SHAPE(ch, 11 + i * 21)).join('')}</svg>`;

const ASK = '세 도막을 들어요 — 어느 도막이 같았나요?';
const ROW = (ans, kind = 'plain') => ({ kind, a: 'p', b: 'q', c: 'r', ans });
const cell = pickCell({
  friend: 'turtle',
  keys: FORMS,
  label: k => [...k].join('-'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['첫째', '둘째', '셋째'],
  say: {
    show: () => '노래는 도막으로 나눌 수 있어요. 같은 도막에는 같은 글자를 붙여요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 세 도막 가운데 어느 도막이 같았는지 골라요',
  },
  wrong,
  EX: () => [
    { title: 'a-b-a', sub: '첫째와 셋째가 같아요', row: ROW('aba') },
    { title: 'a-a-b', sub: '첫째와 둘째가 같아요', row: ROW('aab') },
    { title: 'a-b-b', sub: '둘째와 셋째가 같아요', row: ROW('abb') },
    { title: 'a-b-c', sub: '세 도막이 모두 달라요', row: ROW('abc') },
  ],
  pool: [
    ROW('aba'), ROW('aab'), ROW('abb'), ROW('abc'),
    { kind: 'inst', a: 'q', b: 's', c: 'r', ans: 'aba' },
    { kind: 'rhythm', a: 'p', b: 'p2', c: 's', ans: 'aab' },
  ],
  passText: '세 번 이어서 도막 짜임을 맞혔어요',
  game: { title: '도막 짜임 맞히기', sub: () => '세 도막을 이어서 들려줘요. 같은 도막에 같은 글자를 붙여 짜임을 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
