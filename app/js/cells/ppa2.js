// 빠2 점점 빠르게·점점 느리게 — 빠르기 변화의 첫 칸(11-14 · 흐름 t4)
//  빠1은 두 소리의 걸음을 견주어 '느리게 · 빠르게'를 골랐다. 이 칸은 **한 번 들려주는 짧은 소리 안에서** 소리 사이 간격이
//   점점 좁아지는지(점점 빠르게) · 점점 넓어지는지(점점 느리게) · 그대로인지 고른다(귀 + 처음과 끝을 견주기 → 난이도 2). 꼴은 셈2와 같다.
//  모든 판의 전체 길이 T = 3.52초 — 간격 여덟 개(끝 음 뒤 꼬리까지)를 처음 값 → 끝 값으로 고르게 바꾸고 합이 T가 되게 맞춘다.
//   그래서 답과 상관없이 길이가 같고, 음 수로도 답을 못 읽는다('그대로' 판은 다섯 음 · 여덟 음 · 열두 음).
//  차례: 같은 음 여덟 번 · 크게 변함(단추 둘) → '그대로' 단추 · 변화 폭이 작아짐 · 짧은 가락 위에서
//   → 비틀기(한 판에 한 가지만) '음이 올라가며 느려짐(내려가며 빨라짐)' · '커지며 느려짐(작아지며 빨라짐)' · '앞 네 음은 그대로 · 뒤에서만 변함'
//   · '빠른 그대로(열두 음)' · '느린 그대로(다섯 음)' → 섞어서
//  '그대로' 판은 넷(여덟 음 · 열두 음 둘 · 다섯 음) — 섞기(stageShuffle)가 답 수를 4 · 4 · 4로 맞추므로 넷이어야 한다.
//  ⚠ 귀로 확인하지 못한 것: ① 좁은 폭(0.53 → 0.33초)이 크롬북 스피커에서 '그대로'와 가려지는지
//   ② 음이 올라가는 판은 빨라지는 느낌을 줄 수 있음(그것을 묻는 비틀기) — 실제로 얼마나 헷갈리는지는 아이들 결과로만 안다
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const T = 3.52, D = 0.16, MID = 0.6;
// 간격 폭 — [점점 빠르게의 처음 간격, 끝 간격](점점 느리게는 거꾸로 · 합은 T로 맞춤)
const WIDTH = { wide: [0.62, 0.26], mid: [0.56, 0.30], narrow: [0.53, 0.33] };
const TUNE = {
  a: [60, 64, 67, 64, 64, 67, 64, 60],                        // 도 미 솔 미 미 솔 미 도
  b: [69, 67, 64, 67, 67, 64, 67, 69],                        // 라 솔 미 솔 솔 미 솔 라
  c: [62, 65, 69, 65, 65, 69, 65, 62],                        // 레 파 라 파 파 라 파 레
};
const SCALE = [60, 62, 64, 65, 67, 69, 71, 72];               // 도 레 미 파 솔 라 시 높은 도

// 판 — right = accel(점점 빠르게) | rit(점점 느리게) | same(그대로)
//  kind: rep(같은 음 p · n음) | tune(물결 가락 m) | up(음계 — 점점 느리게면 올라감 · 점점 빠르게면 내려감) | loud(같은 음 p — 점점 느리게면 커짐 · 점점 빠르게면 작아짐)
//   | half(가락 m · 앞 네 음은 같은 간격 · 뒤에서만 변함). w = 간격 폭 · same 판은 섞어도 그대로 · 나머지는 accel ↔ rit가 뒤집힘
export const PLAN = [
  { stage: 'intro', kind: 'rep', p: 67, w: 'wide', right: 'accel' },
  { stage: 'intro', kind: 'rep', p: 72, w: 'wide', right: 'rit' },
  { stage: 'intro', kind: 'rep', p: 64, w: 'wide', right: 'accel' },
  { stage: 'grow', kind: 'rep', p: 67, n: 8, right: 'same' },
  { stage: 'grow', kind: 'tune', m: 'a', w: 'mid', right: 'accel' },
  { stage: 'grow', kind: 'tune', m: 'b', w: 'narrow', right: 'rit' },
  { stage: 'twist', kind: 'up', w: 'mid', right: 'rit' },
  { stage: 'twist', kind: 'rep', p: 67, n: 12, right: 'same' },
  { stage: 'twist', kind: 'loud', p: 67, w: 'mid', right: 'rit' },
  { stage: 'twist', kind: 'rep', p: 72, n: 5, right: 'same' },
  { stage: 'end', kind: 'half', m: 'a', w: 'wide', right: 'accel' },
  { stage: 'end', kind: 'rep', p: 64, n: 12, right: 'same' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => (p.right === 'same' ? p : { ...p, right: p.right === 'accel' ? 'rit' : 'accel' }), answerOf: p => p.right };
// 맞힐 확률 — '그대로' 단추가 나오기 전(소개 판)은 둘 중 하나 · 그 뒤는 셋 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 2 : 1 / 3));

// 간격 여덟 개(n음이면 n개 · 끝 음 뒤 꼬리까지) — 합 = T
function gapsOf(row) {
  if (row.right === 'same') { const n = row.n || 8; return Array(n).fill(T / n); }
  const [f, s] = WIDTH[row.w], [a, b] = row.right === 'accel' ? [f, s] : [s, f];
  const g = row.kind === 'half'
    ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => (i < 3 ? a : a + (b - a) * (i - 2) / 5))
    : [0, 1, 2, 3, 4, 5, 6, 7].map(i => a + (b - a) * i / 7);
  const k = T / g.reduce((x, y) => x + y);
  return g.map(x => x * k);
}
const pitches = (row, n) => {
  if (row.kind === 'tune' || row.kind === 'half') return TUNE[row.m];
  if (row.kind === 'up') return row.right === 'rit' ? SCALE : SCALE.slice().reverse();
  return Array(n).fill(row.p);
};
// 판 → 도막 하나. 간격 = d + gap
function build(row) {
  const gs = gapsOf(row), ps = pitches(row, gs.length), [v0, v1] = row.right === 'rit' ? [0.3, 0.85] : [0.85, 0.3];
  const ns = gs.map((g, i, a) => ({
    p: ps[i], d: D, gap: +(g - D).toFixed(4), inst: 'piano',
    vel: row.kind === 'loud' ? +(v0 + (v1 - v0) * i / (a.length - 1)).toFixed(3) : MID,     // loud — 점점 느리게면 커지고 점점 빠르게면 작아짐
  }));
  return [{ lines: [ns], cap: row.right === 'same' ? '빠르기 그대로' : row.right === 'accel' ? '점점 빠르게' : '점점 느리게' }];
}
const wrong = row => {
  if (row.right === 'same') return row.n === 12 ? '음이 많아도 간격이 같아요 · 빠른 그대로예요' : row.n === 5 ? '음이 적어도 간격이 같아요 · 느린 그대로예요' : '빠르기가 그대로예요 · 막대 사이가 같아요';
  const acc = row.right === 'accel', word = acc ? '점점 빨라져요' : '점점 느려져요';
  if (row.kind === 'up') return acc ? `낮아지면서 ${word}` : `높아지지만 ${word}`;
  if (row.kind === 'loud') return acc ? `작아지지만 ${word}` : `커지지만 ${word}`;
  if (row.kind === 'half') return `앞은 그대로 · 뒤에서 ${word}`;
  return `${word} · 막대 사이가 점점 ${acc ? '좁아져요' : '넓어져요'}`;
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['음이 올라가며 느려지는 소리', '커지며 느려지는 소리', '빠르거나 느린 그대로'];
// picks[k] = 그 판에 고른 단추(없으면 고른 것을 모르는 채로 틀린 판만 셈)
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  // 높이 · 세기 쪽을 따라 고름(올라가거나 커지면 점점 빠르게 · 내려가거나 작아지면 점점 느리게) = 답과 거꾸로인 단추
  const follow = (p, pick) => pick == null || pick === (p.right === 'rit' ? 'accel' : 'rit');
  return factTip(results, [
    { n: miss((p, pick) => p.kind === 'up' && follow(p, pick)), text: '높아지는 소리를 점점 빠르게로, 낮아지는 소리를 점점 느리게로 고른 적이 있어요. 높이와 빠르기는 달라요 — 음 사이 간격만 들어 봐요.' },
    { n: miss((p, pick) => p.kind === 'loud' && follow(p, pick)), text: '커지는 소리를 점점 빠르게로, 작아지는 소리를 점점 느리게로 고른 적이 있어요. 세기와 빠르기는 달라요 — 음 사이 간격만 들어 봐요.' },
    { n: miss(p => p.right === 'same' && (p.n === 12 || p.n === 5)), text: '빠르거나 느린 그대로인 소리를 변한다고 고른 적이 있어요. 음 사이 간격이 처음부터 끝까지 같으면 그대로예요.' },
  ], '높이 · 세기가 달라져도 음 사이 간격만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 빠른 그대로(열두 음) ↔ 점점 빠르게
export const NEAR = [
  { label: '빠른 그대로', low: null, play: nearSegs(build({ kind: 'rep', p: 67, n: 12, right: 'same' })) },
  { label: '점점 빠르게', low: null, play: nearSegs(build({ kind: 'rep', p: 67, w: 'wide', right: 'accel' })) },
];

// 단추 그림 — 점 다섯: 점점 빠르게 = 사이가 점점 좁아짐 · 점점 느리게 = 점점 넓어짐 · 그대로 = 같음
const XS = { accel: [6, 25, 39, 49, 56], rit: [8, 15, 25, 39, 58], same: [8, 20, 32, 44, 56] };
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${XS[k].map(x => `<circle cx="${x}" cy="32" r="5.5" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.4"/>`).join('')}</svg>`;

const ASK = '잘 들어요 — 점점 빨라지나요, 점점 느려지나요?';
const cell = pickCell({
  friend: 'bear',
  keys: ['accel', 'rit', 'same'],
  label: k => (k === 'accel' ? '점점 빠르게' : k === 'rit' ? '점점 느리게' : '그대로'),
  chip: CHIP,
  lock: { key: 'same', at: CUTS[0], tell: () => '그대로 단추가 나왔어요' },
  rightOf: row => row.right,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '빠르기가 조금씩 달라질 수 있어요. 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 점점 빠르게인지 점점 느리게인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '점점 빠르게', sub: '막대 사이가 점점 좁아져요', row: { kind: 'rep', p: 67, w: 'wide', right: 'accel' } },
    { title: '점점 느리게', sub: '막대 사이가 점점 넓어져요', row: { kind: 'rep', p: 67, w: 'wide', right: 'rit' } },
    { title: '그대로', sub: '막대 사이가 같아요', row: { kind: 'rep', p: 67, n: 8, right: 'same' } },
    { title: '높아지며 느리게', sub: '높이와 빠르기는 달라요', row: { kind: 'up', w: 'mid', right: 'rit' } },
  ],
  note: () => '막대 사이가 좁을수록 빠른 소리예요',
  pool: [
    { kind: 'rep', p: 67, w: 'wide', right: 'accel' },
    { kind: 'rep', p: 72, w: 'wide', right: 'rit' },
    { kind: 'tune', m: 'a', w: 'mid', right: 'accel' },
    { kind: 'up', w: 'mid', right: 'rit' },
    { kind: 'rep', p: 64, n: 8, right: 'same' },
    { kind: 'rep', p: 67, n: 12, right: 'same' },
    { kind: 'loud', p: 67, w: 'mid', right: 'accel' },
  ],
  passText: '세 번 이어서 빠르기 변화를 가려냈어요',
  game: { title: '빨라질까 느려질까', sub: () => '소리를 한 번 들려줘요. 점점 빨라지는지, 점점 느려지는지 골라요. 그대로 단추는 중간에 나와요.' },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
