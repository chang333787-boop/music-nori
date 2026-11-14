// 리13 둘로 나눌까 셋으로 나눌까 — 둘로 나뉘는 박 · 셋으로 나뉘는 박(6/8)(11-14 · 묶음 C · 흐름 b5 '6/8박자')
//  6/8박자는 한 박이 셋으로 나뉜다(자진모리에서 먼저 겪음). 큰 박(큰북)과 쪼갠 박(하이햇)이 함께 나는 소리를 한 번 듣고
//   한 박이 둘로 나뉘었는지(2/4) 셋으로 나뉘었는지(6/8) 고른다 — 마디 묶음도 빠르기도 아니라 '한 박을 몇으로 쪼갰나'만.
//  빠르기로 답이 새지 않게(설계서 §C를 고침 — 11-14 C1 팀): 판마다 빠르기 짝(mode)이 정해져 있고 뒤집어도 짝은 그대로(답만 바뀜 · 소리 길이 같음).
//   K6 · K8 = 큰 박 빠르기가 같음(쪼갠 박만 다름) · S25 = 쪼갠 박 빠르기가 같음(큰 박만 다름) · R = 6/8 쪽이 큰 박 · 쪼갠 박 모두 느림 ·
//   Rp2 = 6/8 쪽이 큰 박 · 쪼갠 박 모두 빠름. 그래서 '쪼갠 박이 빠르면 셋' · '큰 박이 느리면 셋' 어느 한 가지만 들어서는 맞히지 못한다.
//   한 가지만 듣는 길을 0으로 만들 수는 없어서(한 박을 둘 · 셋으로 쪼개면 큰 박이나 쪼갠 박 가운데 하나는 꼭 빠르기가 달라짐)
//   찍기 바닥을 판마다 0.55로 셈(GUESS — 별 ① = 12번 중 10번 · 가1 · 가2와 같은 까닭).
//  비틀기: 3/4(세 박씩 묶임 · 한 박은 둘로) ↔ 6/8(두 박씩 묶임 · 한 박은 셋으로) — 두 꼴 모두 마디 첫 박이 세고 센 박이 1.5초마다 와서
//   묶음 · 센 박 간격으로는 못 가림 · 가락이 얹힌 판(가락은 이 칸에서 만든 것 · 있는 노래가 아님).
//  소리는 컴퓨터로 만든 큰북 · 하이햇 · 피아노.
//  ⚠ std는 리5 것을 그대로 옮김(설계서 §C) — 원문으로 다시 판정하지 못함. ⚠ 귀로 확인 못 함: 0.167초 하이햇이 크롬북 스피커에서 또렷한지.
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { glyph } from './_glyph.js';

// 빠르기 짝 — [2/4 큰 박 수, 2/4 큰 박 초, 6/8 큰 박 수, 6/8 큰 박 초](큰 박 수 × 초가 같음 = 뒤집어도 길이 같음)
export const MODES = { K6: [4, 0.6, 4, 0.6], K8: [4, 0.8, 4, 0.8], S25: [6, 0.5, 4, 0.75], R: [8, 0.3, 4, 0.6], Rp2: [4, 0.75, 6, 0.5] };
// 판 — kind: pulse(큰 박 + 쪼갠 박) · tune(가락이 얹힘) · trap(3/4 세 박 묶음 ↔ 6/8 두 박 묶음 · 마디 첫 박이 셈)
export const PLAN = [
  { stage: 'intro', kind: 'pulse', mode: 'K6', right: 'three' },
  { stage: 'intro', kind: 'pulse', mode: 'K6', right: 'two' },
  { stage: 'intro', kind: 'pulse', mode: 'Rp2', right: 'three' },
  { stage: 'grow', kind: 'pulse', mode: 'K8', right: 'two' },
  { stage: 'grow', kind: 'pulse', mode: 'R', right: 'three' },
  { stage: 'grow', kind: 'pulse', mode: 'Rp2', right: 'two' },
  { stage: 'twist', kind: 'trap', mode: 'S25', right: 'two' },
  { stage: 'twist', kind: 'tune', mode: 'S25', right: 'three' },
  { stage: 'twist', kind: 'trap', mode: 'S25', right: 'three' },
  { stage: 'twist', kind: 'tune', mode: 'S25', right: 'two' },
  { stage: 'end', kind: 'tune', mode: 'S25', right: 'two' },
  { stage: 'end', kind: 'trap', mode: 'S25', right: 'three' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, right: p.right === 'two' ? 'three' : 'two' }), answerOf: p => p.right };
export const GUESS = plan => plan.map(() => 0.55);

// 박 하나의 가락(쪼갠 박 단위 [음, 칸 수]) — 차례로 되풀이 · 끝 박은 늘 길게(도)
const TUNE = {
  two: { cycle: [[[67, 1], [64, 1]], [[67, 1], [64, 1]], [[65, 2]], [[64, 1], [62, 1]]], last: [[60, 2]] },
  three: { cycle: [[[67, 2], [64, 1]], [[67, 2], [64, 1]], [[65, 1], [64, 1], [62, 1]]], last: [[60, 3]] },
};
export const shape = row => { const [n2, k2, n3, k3] = MODES[row.mode]; return row.right === 'two' ? { n: n2, k: k2, r: 2 } : { n: n3, k: k3, r: 3 }; };
function build(row) {
  const { n, k, r } = shape(row), sub = k / r, bar = r === 2 ? 3 : 2;
  const kick = Array.from({ length: n }, (_, i) => ({ drum: 'kick', d: 0.08, gap: k - 0.08, vel: row.kind === 'trap' ? (i % bar ? 0.6 : 0.85) : 0.75 }));
  const hat = Array.from({ length: n * r }, () => ({ drum: 'hat', d: 0.04, gap: sub - 0.04, vel: row.kind === 'tune' ? 0.18 : 0.3 }));
  const lines = [kick, hat];
  if (row.kind === 'tune') {
    const T = TUNE[row.right], mel = [];
    for (let i = 0; i < n - 1; i++) mel.push(...T.cycle[i % T.cycle.length]);
    mel.push(...T.last);
    lines.push(line(mel, { inst: 'piano', vel: 0.6, beat: sub }));
  }
  return [{ lines, cap: row.kind === 'trap' ? (r === 2 ? '세 박씩 묶음' : '두 박씩 묶음') : '' }];
}

const wrong = row => (row.right === 'two'
  ? `한 박이 둘로 나뉘었어요${row.kind === 'trap' ? ' · 셋씩 묶여도 한 박은 둘로 나뉘었어요' : row.kind === 'tune' ? ' · 가락이 얹혀도 같아요' : ''}`
  : `한 박이 셋으로 나뉘었어요${row.mode === 'R' ? ' · 느려도 셋으로 나뉘었어요' : row.mode === 'Rp2' ? ' · 빨라도 셋으로 나뉘었어요' : row.kind === 'tune' ? ' · 가락이 얹혀도 같아요' : ''}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['세 박 묶음(3/4)을 셋으로', '빠르기가 다른 6/8', '가락이 얹힌 판'];
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'trap'), text: '셋씩 묶인 소리(3/4)를 헷갈렸어요. 큰 박이 세 개씩 묶여도, 큰 박 하나가 둘로 나뉘면 둘로 나눈 박이에요.' },
    { n: miss(p => p.mode === 'R' || p.mode === 'Rp2'), text: '빠르기가 달라진 판을 헷갈렸어요. 빠르거나 느려도 큰 박 하나 사이에 작은 소리가 몇 번 나는지만 세어 봐요.' },
    { n: miss(p => p.kind === 'tune'), text: '가락이 얹힌 판을 헷갈렸어요. 가락보다 큰북과 작은 소리를 들으며 큰 박 하나를 몇으로 나눴는지 세어 봐요.' },
  ], '빠르기와 묶음이 바뀌어도 한 박을 몇으로 나눴는지 듣고 골랐어요.');
}

// 헷갈리는 두 소리 — 3/4(세 박씩 묶음 · 둘로) ↔ 6/8(두 박씩 묶음 · 셋으로) · 센 박 간격이 같음
export const NEAR = [
  { label: '셋씩 묶어도 둘로(3/4)', low: '셋씩 묶여도 둘씩', play: nearSegs(build({ kind: 'trap', mode: 'S25', right: 'two' })) },
  { label: '한 박을 셋으로(6/8)', low: '한 박이 셋씩', play: nearSegs(build({ kind: 'trap', mode: 'S25', right: 'three' })) },
];

const CHIP = { two: glyph([0.5, 0.5], { size: 56 }), three: glyph([0.5, 0.5, 0.5], { size: 56, unit: 1.5 }) };
const ASK = lo => (lo ? '들어요 — 큰 박 하나에 작은 소리가 둘씩일까요, 셋씩일까요?' : '들어요 — 한 박이 둘로 나뉠까요, 셋으로 나뉠까요?');
const cell = pickCell({
  friend: 'hog',
  keys: ['two', 'three'],
  label: (k, lo) => (lo ? (k === 'two' ? '둘씩' : '셋씩') : k === 'two' ? '둘로 — 2/4' : '셋으로 — 6/8'),
  chip: k => CHIP[k],
  rightOf: row => row.right,
  build,
  names: () => ['소리'],
  say: {
    show: lo => (lo ? '큰 소리 하나 사이에 작은 소리가 둘 날 때도, 셋 날 때도 있어요. 눌러서 들어 봐요.' : '한 박을 둘로 나누면 2/4, 셋으로 나누면 6/8이에요. 큰북이 박, 작은 소리가 나눈 박이에요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 둘씩인지 셋씩인지 골라요' : 'TV 소리를 듣고 — 한 박이 둘로인지 셋으로인지 골라요'),
  },
  wrong,
  note: () => '컴퓨터로 만든 소리예요 · 큰북 = 박 · 작은 소리 = 나눈 박',
  EX: lo => [
    { title: lo ? '둘씩' : '둘로 — 2/4', sub: '큰 박 하나에 작은 소리 둘', row: { kind: 'pulse', mode: 'K6', right: 'two' } },
    { title: lo ? '셋씩' : '셋으로 — 6/8', sub: '큰 박 하나에 작은 소리 셋', row: { kind: 'pulse', mode: 'K6', right: 'three' } },
    { title: lo ? '셋씩 묶어도 둘씩' : '3/4 세 박 묶음', sub: '셋씩 묶여도 한 박은 둘', row: { kind: 'trap', mode: 'S25', right: 'two' } },
    { title: lo ? '가락과 함께 셋씩' : '6/8 가락', sub: '가락이 얹혀도 한 박은 셋', row: { kind: 'tune', mode: 'S25', right: 'three' } },
  ],
  pool: [PLAN[0], PLAN[1], PLAN[2], PLAN[3], PLAN[6], PLAN[7]],
  passText: '세 번 이어서 한 박을 몇으로 나눴는지 가려냈어요',
  game: { title: '둘로 나눌까 셋으로 나눌까', sub: lo => (lo ? '한 번 들려줘요. 큰 박 하나에 작은 소리가 둘씩인지 셋씩인지 골라요.' : '한 번 들려줘요. 한 박이 둘로 나뉘는지(2/4) 셋으로 나뉘는지(6/8) 골라요.') },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
