// 셈4 센 음 찾기(악센트) — 셈여림의 넷째 칸(11-14 · 흐름 d6)
//  악센트 = 한 음만 세게. 네 음(한 박씩)을 두 번 들려주고 **몇째 음이 세게 났는지 자리로** 고른다(귀 + 자리 세기 → 단추 넷).
//   센 음은 두 번 다 같은 자리 — 첫 번째에 놓쳐도 두 번째에 다시 들을 수 있다.
//  차례: 같은 음 네 번 · 피아노 → 악기만 바뀜(실로폰 · 리코더) → 비틀기(한 판에 한 가지만)
//   '네 음이 달라도 가장 높은 음 ≠ 센 음' · '조금만 세진 음(0.75 ↔ 0.5)' → 섞어서
//  모든 판이 여덟 박(3.36초)이라 답과 상관없이 길이가 같다. 바탕 세기 0.45 · 센 음 0.9.
//  ⚠ 귀로 확인하지 못한 것: ① 작은 판(0.75 ↔ 0.5)이 크롬북 스피커 · 압축기를 지나서도 가려지는지
//   ② 리코더처럼 소리가 늦게 차오르는 악기에서 센 음이 덜 도드라질 수 있는지 ③ 첫 음은 앞에 소리가 없어 세게 들릴 수 있음
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const ORD = { 1: '첫째', 2: '둘째', 3: '셋째', 4: '넷째' };
const VEL = { base: [0.45, 0.9], small: [0.5, 0.75] };          // [바탕, 센 음]
const P = 67, HI = 72, REST = [64, 60, 67];                      // tune 판 — 가장 높은 음(높은 도)이 아닌 세 자리에 미 · 도 · 솔

// 판 — kind: plain | inst(악기만 바뀜) | tune(네 음이 다름 · 가장 높은 음 자리 hi ≠ 답) | small(조금만 세짐)
//  ans = 센 음 자리 '1'~'4'(섞을 때 다음 자리로 · tune은 hi 자리를 건너뜀)
export const PLAN = [
  { stage: 'intro', kind: 'plain', ans: '1' },
  { stage: 'intro', kind: 'plain', ans: '3' },
  { stage: 'intro', kind: 'plain', ans: '2' },
  { stage: 'grow', kind: 'plain', ans: '4' },
  { stage: 'grow', kind: 'inst', inst: 'xylo', ans: '2' },
  { stage: 'grow', kind: 'inst', inst: 'recorder', ans: '4' },
  { stage: 'twist', kind: 'tune', hi: 3, ans: '1' },
  { stage: 'twist', kind: 'tune', hi: 2, ans: '3' },
  { stage: 'twist', kind: 'small', ans: '4' },
  { stage: 'twist', kind: 'small', ans: '1' },
  { stage: 'end', kind: 'tune', hi: 4, ans: '2' },
  { stage: 'end', kind: 'small', ans: '3' },
];
export const CUTS = stageCuts(PLAN);
const nextPos = a => (a % 4) + 1;
export const SHUF = {
  flip: p => { let a = nextPos(Number(p.ans)); if (p.kind === 'tune' && a === p.hi) a = nextPos(a); return { ...p, ans: String(a) }; },
  answerOf: p => p.ans,
};

// 그 판의 네 음 높이 — tune은 hi 자리가 가장 높고 나머지 셋은 REST 차례
const tuneOf = row => { const rest = REST.slice(); return [1, 2, 3, 4].map(k => (k === row.hi ? HI : rest.shift())); };
// 판 → 도막 하나 · 네 음을 두 번(여덟 박). 센 음은 두 번 다 같은 자리
function build(row) {
  const ps = row.kind === 'tune' ? tuneOf(row) : [P, P, P, P], [v0, v1] = row.kind === 'small' ? VEL.small : VEL.base, at = Number(row.ans) - 1;
  const ns = line([...ps, ...ps].map(p => [p, 1]), { inst: row.kind === 'inst' ? row.inst : 'piano' }).map((n, i) => ({ ...n, vel: i % 4 === at ? v1 : v0 }));
  return [{ lines: [ns], cap: `${ORD[row.ans]} 음이 세게` }];
}
const wrong = row => `${ORD[row.ans]} 음이 세게 났어요${row.kind === 'tune' ? ` · 가장 높은 음은 ${ORD[row.hi]}였어요` : ''}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높은 음을 센 음으로', '조금만 세진 음', '악기가 바뀐 판'];
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    { n: miss((p, pick) => p.kind === 'tune' && (pick == null || pick === String(p.hi))), text: '가장 높은 음을 센 음으로 고른 적이 있어요. 높은 음과 센 음은 달라요 — 세기만 들어 봐요.' },
    { n: miss(p => p.kind === 'small'), text: '조금만 세진 음의 자리를 놓친 적이 있어요. 다시 듣기로 네 음의 세기를 하나씩 견줘 봐요.' },
    { n: miss(p => p.kind === 'inst'), text: '악기가 바뀐 판에서 센 음의 자리를 놓친 적이 있어요. 악기가 달라도 한 음만 세게 나는 자리를 찾아요.' },
  ], '높이 · 악기가 달라져도 세기만 듣고 센 음을 찾았어요.');
}
// 헷갈리는 두 소리 — 높은 음과 센 음이 다른 자리 ↔ 같은 자리
export const NEAR = [
  { label: '높은 음 셋째 · 센 음 첫째', low: null, play: nearSegs(build({ kind: 'tune', hi: 3, ans: '1' })) },
  { label: '높은 음도 센 음도 셋째', low: null, play: nearSegs(build({ kind: 'tune', hi: 3, ans: '3' })) },
];

// 단추 그림 — 점 넷 · 답 자리 점만 크고 위에 '>'
const CHIP = k => {
  const at = Number(k) - 1, xs = [9, 24, 40, 55];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${xs.map((x, i) => (i === at
    ? `<circle cx="${x}" cy="40" r="8" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.6"/><path d="M${x - 6} 14L${x + 6} 21L${x - 6} 28" fill="none" stroke="#3B2A1E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="${x}" cy="40" r="4.5" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="2.4"/>`)).join('')}</svg>`;
};

const ASK = '네 음을 두 번 들어요 — 몇째 음이 세게 났나요?';
const cell = pickCell({
  friend: 'bear',
  keys: ['1', '2', '3', '4'],
  label: k => ORD[k],
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['소리 그림'],
  say: {
    show: lo => (lo ? '네 음 가운데 한 음만 세게 나요. 눌러서 들어 봐요.' : '한 음만 세게 내는 것을 악센트라고 해요. 악보에는 > 로 적어요.'),
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 몇째 음이 세게 났는지 골라요',
  },
  wrong,
  note: () => '막대가 굵을수록 센 소리예요',
  EX: () => [
    { title: '첫째가 세게', sub: '같은 음 넷 · 두 번', row: { kind: 'plain', ans: '1' } },
    { title: '셋째가 세게', sub: '같은 음 넷 · 두 번', row: { kind: 'plain', ans: '3' } },
    { title: '높은 음 · 센 음', sub: '높은 음은 셋째 · 센 음은 첫째', row: { kind: 'tune', hi: 3, ans: '1' } },
    { title: '조금만 세게', sub: '둘째가 조금 세요', row: { kind: 'small', ans: '2' } },
  ],
  pool: [
    { kind: 'plain', ans: '1' },
    { kind: 'plain', ans: '3' },
    { kind: 'inst', inst: 'xylo', ans: '2' },
    { kind: 'inst', inst: 'recorder', ans: '4' },
    { kind: 'tune', hi: 2, ans: '4' },
    { kind: 'small', ans: '2' },
  ],
  passText: '세 번 이어서 센 음의 자리를 찾았어요',
  game: { title: '센 음 찾기', sub: () => '네 음을 두 번 들려줘요. 몇째 음이 세게 났는지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
