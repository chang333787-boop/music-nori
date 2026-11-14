// 리10 센박부터·여린박부터(못갖춘마디) — 박·리듬 줄 · 흐름 b6 '못갖춘마디'(11-14 · 묶음 C2)
//  마디 첫 박(센박)마다 큰북 · 다른 박은 하이햇이 박을 짚어 주는 위에서 짧은 가락이 나온다.
//   가락이 마디 첫 박(큰북과 같은 때)에서 시작하면 '센박부터 — 갖춘마디', 그보다 먼저(앞 마디 끝 박 = 여린박)에서 시작하면 '여린박부터 — 못갖춘마디'.
//  소리 = 마디 둘 + 셋째 마디 첫 박(4박 마디 9박 · 3박 마디 7박 · 한 박 0.4초 = 3.6초 · 2.8초). 첫 마디는 북만(준비) · 가락은 둘째 마디 · 끝 음은 셋째 마디 첫 박.
//   두 꼴의 음 수가 같다(여린박 = 음이 하나 더 · 로 맞히지 못하게) · 뒤집어도(센박부터 ↔ 여린박부터) 박자 · 꼴 · 길이가 그대로.
//  비틀기(한 판에 한 가지): loud 첫 음만 크게(큰 첫 음 ≠ 센박) · nohat 하이햇 없이 큰북만(박을 마음속으로 셈) · high 첫 음이 가장 높은 음.
//  가락은 이 칸에서 만든 짧은 것(있는 노래를 쓰지 않음). 북 · 피아노 소리는 컴퓨터로 만든 소리.
//  성취기준(std)은 리5(마디·박자표) 것을 그대로 옮김 — ⚠ 확인 못 함(원문으로 다시 판정하지 않음).
//  ⚠ 귀로 확인하지 못한 것: 크롬북 스피커에서 큰북(kick)과 하이햇이 갈려 들리는지 · nohat 판에서 박을 셀 수 있는지 · loud 판 첫 음 0.9가 센박처럼 들리는지.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, drumLine, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

export const BEAT = 0.4;
// 가락 — [[음 높이(없으면 쉼), 박 수], …] · 앞의 쉼이 첫 마디(북만) 자리. 두 꼴의 음 수 · 전체 박 수(2m + 1)가 같다
const TUNE = {
  plain: {
    4: { full: [[null, 4], [67, 1], [64, 1], [65, 1], [62, 1], [60, 1]], pickup: [[null, 3], [67, 1], [64, 1], [65, 1], [62, 2], [60, 1]] },
    3: { full: [[null, 3], [64, 1], [67, 1], [65, 1], [64, 1]], pickup: [[null, 2], [64, 1], [67, 1], [65, 2], [64, 1]] },
  },
  // 여린박 둘 — 짧은 음 둘(반 박씩)
  two: {
    4: { full: [[null, 4], [62, 0.5], [64, 0.5], [67, 1], [65, 1], [64, 1], [60, 1]], pickup: [[null, 3], [62, 0.5], [64, 0.5], [67, 1], [65, 1], [64, 2], [60, 1]] },
    3: { full: [[null, 3], [62, 0.5], [64, 0.5], [67, 1], [65, 1], [64, 1]], pickup: [[null, 2], [62, 0.5], [64, 0.5], [67, 1], [65, 2], [64, 1]] },
  },
};
// 판 — right = full(센박부터) | pickup(여린박부터) · m = 마디 박 수 · kind: plain | two(여린박 둘) | loud | nohat | high
export const PLAN = [
  { stage: 'intro', kind: 'plain', m: 4, right: 'pickup' },
  { stage: 'intro', kind: 'plain', m: 4, right: 'full' },
  { stage: 'intro', kind: 'plain', m: 4, right: 'pickup' },
  { stage: 'grow', kind: 'plain', m: 3, right: 'full' },
  { stage: 'grow', kind: 'plain', m: 3, right: 'pickup' },
  { stage: 'grow', kind: 'two', m: 4, right: 'full' },
  { stage: 'twist', kind: 'loud', m: 4, right: 'pickup' },
  { stage: 'twist', kind: 'loud', m: 4, right: 'full' },
  { stage: 'twist', kind: 'nohat', m: 3, right: 'pickup' },
  { stage: 'twist', kind: 'high', m: 4, right: 'full' },
  { stage: 'end', kind: 'two', m: 3, right: 'full' },
  { stage: 'end', kind: 'nohat', m: 4, right: 'pickup' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, right: p.right === 'full' ? 'pickup' : 'full' }), answerOf: p => p.right };

// 북 줄 — 마디 첫 박 큰북(0.8) · 다른 박 하이햇(0.35 · nohat 판은 쉼) · 마디 둘 + 셋째 마디 첫 박
const drums = row => drumLine(Array.from({ length: 2 * row.m + 1 }, (_, i) => [i % row.m === 0 ? 'kick' : row.kind === 'nohat' ? null : 'hat', 1]), { beat: BEAT })
  .map(n => (n.drum ? { ...n, vel: n.drum === 'kick' ? 0.8 : 0.35 } : n));
// 가락 줄 — loud = 첫 음 0.9 · 다른 음 0.5 · high = 첫 음을 가장 높은 72로
function tune(row) {
  const mel = TUNE[row.kind === 'two' ? 'two' : 'plain'][row.m][row.right].map(x => x.slice());
  const first = mel.findIndex(([p]) => p != null);
  if (row.kind === 'high') mel[first][0] = 72;
  const ns = line(mel, { inst: 'piano', vel: 0.6, beat: BEAT });
  if (row.kind !== 'loud') return ns;
  let seen = false;
  return ns.map(n => { if (n.p == null) return n; const v = seen ? 0.5 : 0.9; seen = true; return { ...n, vel: v }; });
}
const build = row => [{ lines: [drums(row), tune(row)], cap: `${row.m}박 마디 · ${row.right === 'full' ? '센박부터' : '여린박부터'}` }];

const wrong = row => (row.right === 'full'
  ? '가락이 마디 첫 박(센박)에서 시작했어요'
  : '가락이 마디 첫 박보다 먼저(여린박에서) 시작했어요' + (row.kind === 'loud' ? ' · 첫 음이 커도 여린박이에요' : row.kind === 'high' ? ' · 첫 음이 높아도 여린박이에요' : ''));

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['크게 시작한 여린박', '세 박 마디', '쿵만 들리는 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'loud'), text: '첫 음이 크게 나는 판에서 다르게 고른 적이 있어요. 첫 음이 커도 큰북(마디 첫 박)보다 먼저 나오면 여린박부터예요.' },
    { n: miss(p => p.m === 3), text: '세 박 마디 판에서 다르게 고른 적이 있어요. 큰북이 세 박마다 와요 — 하나 둘 셋을 세며 들어요.' },
    { n: miss(p => p.kind === 'nohat'), text: '큰북만 들리는 판에서 다르게 고른 적이 있어요. 북이 쉬는 박도 마음속으로 세어요.' },
  ], '가락이 마디 첫 박에서 시작하는지, 그보다 먼저 시작하는지 들었어요.');
}
// 헷갈리는 두 소리 — 첫 음이 큰 판(7번) · 센박부터 ↔ 여린박부터
export const NEAR = [
  { label: '큰 첫 음 · 여린박부터', play: nearSegs(build({ kind: 'loud', m: 4, right: 'pickup' })) },
  { label: '큰 첫 음 · 센박부터', play: nearSegs(build({ kind: 'loud', m: 4, right: 'full' })) },
];

// 단추 그림 — 세로줄 = 마디 줄 · 초록 점 = 가락의 첫 음(센박부터 = 마디 줄 바로 뒤 · 여린박부터 = 마디 줄 앞)
const DOT = (x, first) => `<circle cx="${x}" cy="34" r="${first ? 7.5 : 5.5}" fill="${first ? '#2F6F4E' : '#3B2A1E'}"/>`;
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M${k === 'full' ? 12 : 26} 12V54" stroke="#3B2A1E" stroke-width="4" stroke-linecap="round"/>${
  (k === 'full' ? [[25, 1], [40, 0], [54, 0]] : [[12, 1], [40, 0], [54, 0]]).map(([x, f]) => DOT(x, f)).join('')}</svg>`;

const ASK = () => '들어요 — 가락이 센박부터 시작할까요, 여린박부터 시작할까요?';
const cell = pickCell({
  friend: 'hog',
  keys: ['full', 'pickup'],
  label: (k, lo) => (lo ? (k === 'full' ? '센박부터' : '여린박부터') : k === 'full' ? '센박부터 — 갖춘마디' : '여린박부터 — 못갖춘마디'),
  chip: CHIP,
  rightOf: row => row.right,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '노래는 마디 첫 박(센박)에서 시작하기도 하고, 그보다 먼저(여린박에서) 시작하기도 해요. 큰북 소리가 마디 첫 박이에요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 가락이 센박부터인지 여린박부터인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '갖춘마디', sub: '큰북과 함께 시작해요', row: { kind: 'plain', m: 4, right: 'full' } },
    { title: '못갖춘마디', sub: '큰북보다 한 박 먼저 시작해요', row: { kind: 'plain', m: 4, right: 'pickup' } },
    { title: '못갖춘마디 · 세 박', sub: '세 박 마디에서 한 박 먼저', row: { kind: 'plain', m: 3, right: 'pickup' } },
    { title: '여린박에 짧은 음 둘', sub: '반 박 음 둘이 먼저 나와요', row: { kind: 'two', m: 4, right: 'pickup' } },
  ],
  note: () => '큰북 = 마디 첫 박 · 컴퓨터로 만든 소리예요',
  pool: [
    { kind: 'plain', m: 4, right: 'full' },
    { kind: 'plain', m: 4, right: 'pickup' },
    { kind: 'plain', m: 3, right: 'full' },
    { kind: 'two', m: 4, right: 'pickup' },
    { kind: 'loud', m: 4, right: 'pickup' },
    { kind: 'nohat', m: 3, right: 'full' },
  ],
  passText: '세 번 이어서 가락이 시작하는 박을 가려냈어요',
  game: {
    title: '센박부터 여린박부터',
    sub: () => '소리를 한 번 들려줘요. 큰북이 마디 첫 박이에요. 가락이 큰북과 함께(센박부터) 시작하는지, 그보다 먼저(여린박부터) 시작하는지 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
