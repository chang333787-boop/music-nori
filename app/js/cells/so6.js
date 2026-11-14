// 소6 같은 악기·다른 악기 — 음색의 첫 칸(11-14 · 흐름 e1 '소리 구별하기')
//  음색 = 어떤 악기(목소리 · 물체)가 낸 소리인지 알게 해 주는 소리의 성질. 악기 이름을 맞히게 하지 않고(이름은 배워야 아는 낱말)
//   **두 번 들려주고 같은 악기인지 다른 악기인지만** 고르게 한다 → 귀 하나만 쓰는 가장 가벼운 꼴(난이도 1).
//  차례: 소리가 뚜렷이 다른 짝(두드려서 곧 사라지는 소리 ↔ 불거나 그어서 이어지는 소리) → 소리가 가까운 짝
//   → 비틀기 '높이 · 세기가 달라져도 같은 악기'(소5에서 익힌 한 가지만 바뀌는 짝을 음색에 씀) → 섞어서
//  가락은 늘 같은 세 음(솔 미 솔) — 달라지는 것은 악기(와 비틀기에서는 높이 · 세기)뿐.
//  ⚠ 악기 소리는 모두 컴퓨터로 만든 소리다(app/js/audio.js) — 보기 화면에 그렇게 적는다. 진짜 목소리 · 물체 · 타악기 녹음은 넣지 않았다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs, instName } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const MOTIF = [[67, 1], [64, 1], [67, 2]];          // 솔 미 솔 — 주제곡 인사 동기의 앞
const UP = 7;                                       // 비틀기 '높게' — 다섯 음 위(레 시 레)
const SOFT = 0.25, MID = 0.6, LOUD = 0.9;          // 작게 0.35 → 0.25(11-14 · 기계 귀: '크게'가 3.3dB(A)만 커서 · 이제 8dB(A) 넘게)

// 판 — a 첫째 악기 · b 다른 악기일 때의 둘째 악기 · kind: plain(그대로) | pitch(둘째를 높게) | loud(첫째 작게 · 둘째 크게)
//  close = 소리가 가까운 짝(둘 다 이어지는 소리이거나 둘 다 곧 사라지는 소리) · ans = same | diff(섞을 때 뒤집힘)
//  짝은 기계 귀가 잰 음색 거리(tests/ear · 무게중심 · 차오름 · 0.5초 뒤 크기 · 홀짝 배음)로 다시 골랐다(11-14) — 가까운 짝 다섯이 모두 0.6~1.5 ·
//   나머지 짝 일곱이 모두 2.9 넘게(예전엔 피아노–리코더 1.4 · 트럼펫–피아노 1.2가 '뚜렷한 짝'인데 '가까운 짝' 플루트–바이올린 3.1보다 가까웠다).
export const PLAN = [
  { stage: 'intro', kind: 'plain', a: 'xylo', b: 'flute', ans: 'diff' },
  { stage: 'intro', kind: 'plain', a: 'xylo', b: 'violin', ans: 'same' },
  { stage: 'intro', kind: 'plain', a: 'clarinet', b: 'harp', ans: 'diff' },
  { stage: 'grow', kind: 'plain', a: 'flute', b: 'cello', close: true, ans: 'same' },
  { stage: 'grow', kind: 'plain', a: 'recorder', b: 'flute', close: true, ans: 'diff' },
  { stage: 'grow', kind: 'plain', a: 'violin', b: 'trumpet', close: true, ans: 'same' },
  { stage: 'twist', kind: 'pitch', a: 'piano', b: 'xylo', ans: 'same' },
  { stage: 'twist', kind: 'loud', a: 'recorder', b: 'violin', ans: 'diff' },
  { stage: 'twist', kind: 'pitch', a: 'violin', b: 'recorder', ans: 'diff' },
  { stage: 'twist', kind: 'loud', a: 'trumpet', b: 'xylo', ans: 'same' },
  { stage: 'end', kind: 'pitch', a: 'recorder', b: 'cello', close: true, ans: 'same' },
  { stage: 'end', kind: 'plain', a: 'harp', b: 'piano', close: true, ans: 'diff' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'same' ? 'diff' : 'same' }), answerOf: p => p.ans };

// 판 → 도막 둘(첫째 · 둘째). 같은 꼴이면 답과 상관없이 길이가 같다(열리는 때로 답이 새지 않음)
function build(row) {
  const second = row.ans === 'same' ? row.a : row.b, pitch = row.kind === 'pitch', loud = row.kind === 'loud';
  return [
    { lines: [line(MOTIF, { inst: row.a, vel: loud ? SOFT : MID })], cap: loud ? '작게' : '' },
    { lines: [line(MOTIF, { inst: second, vel: loud ? LOUD : MID, shift: pitch ? UP : 0 })], cap: pitch ? '더 높게' : loud ? '크게' : '' },
  ];
}
const wrong = row => (row.ans === 'same'
  ? `둘 다 ${instName(row.a)}${row.kind === 'pitch' ? ' · 높이만 달라요' : row.kind === 'loud' ? ' · 세기만 달라요' : ''}`
  : `첫째 ${instName(row.a)} · 둘째 ${instName(row.b)}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높이가 달라진 같은 악기', '세기가 달라진 같은 악기', '소리가 가까운 두 악기'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'pitch' && p.ans === 'same'), text: '높이가 달라진 같은 악기를 다른 악기로 고른 적이 있어요. 같은 악기도 높은 소리와 낮은 소리를 내요.' },
    { n: miss(p => p.kind === 'loud' && p.ans === 'same'), text: '세기가 달라진 같은 악기를 다른 악기로 고른 적이 있어요. 같은 악기도 작게도 크게도 소리 내요.' },
    { n: miss(p => p.close && p.ans === 'diff'), text: '소리가 가까운 두 악기를 같은 악기로 고른 적이 있어요. 다시 듣기로 두 소리를 한 번 더 견줘 봐요.' },
  ], '높이 · 세기가 달라져도 악기 소리만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 첫째는 둘 다 피아노 · 둘째만 다름(높아진 피아노 ↔ 높이가 같은 리코더)
export const NEAR = [
  { label: '같은 악기 · 높게', low: null, play: nearSegs(build({ kind: 'pitch', a: 'piano', b: 'recorder', ans: 'same' })) },
  { label: '다른 악기 · 같은 높이', low: null, play: nearSegs(build({ kind: 'plain', a: 'piano', b: 'recorder', ans: 'diff' })) },
];

// 단추 그림 — 같은 악기 = 같은 모양 둘 · 다른 악기 = 다른 모양 둘
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="19" cy="32" r="12" fill="#C8557A" stroke="#3B2A1E" stroke-width="2.6"/>${k === 'same'
  ? '<circle cx="45" cy="32" r="12" fill="#C8557A" stroke="#3B2A1E" stroke-width="2.6"/>'
  : '<rect x="34" y="21" width="22" height="22" rx="4" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="2.6"/>'}</svg>`;

const ASK = '두 번 들어요 — 같은 악기일까요, 다른 악기일까요?';
const cell = pickCell({
  friend: 'bunny',
  keys: ['same', 'diff'],
  label: k => (k === 'same' ? '같은 악기' : '다른 악기'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['첫째', '둘째'],
  say: {
    show: () => '악기마다 소리가 달라요. 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 같은 악기인지 다른 악기인지 골라요',
  },
  wrong,
  note: () => '컴퓨터로 만든 악기 소리예요',
  EX: () => [
    { title: '같은 악기', sub: '피아노 · 피아노', row: { kind: 'plain', a: 'piano', b: 'recorder', ans: 'same' } },
    { title: '다른 악기', sub: '피아노 · 리코더', row: { kind: 'plain', a: 'piano', b: 'recorder', ans: 'diff' } },
    { title: '높이만 달라요', sub: '같은 악기예요', row: { kind: 'pitch', a: 'piano', b: 'recorder', ans: 'same' } },
    { title: '세기만 달라요', sub: '같은 악기예요', row: { kind: 'loud', a: 'piano', b: 'recorder', ans: 'same' } },
  ],
  pool: [
    { kind: 'plain', a: 'piano', b: 'recorder', ans: 'same' },
    { kind: 'plain', a: 'xylo', b: 'violin', ans: 'diff' },
    { kind: 'plain', a: 'trumpet', b: 'harp', ans: 'same' },
    { kind: 'plain', a: 'recorder', b: 'xylo', ans: 'diff' },
    { kind: 'pitch', a: 'piano', b: 'violin', ans: 'same' },
    { kind: 'loud', a: 'recorder', b: 'piano', ans: 'diff' },
  ],
  passText: '세 번 이어서 악기 소리를 가려냈어요',
  game: { title: '악기 짝 맞히기', sub: () => '두 번 들려줘요. 같은 악기가 두 번 연주했는지, 다른 악기로 바뀌었는지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
