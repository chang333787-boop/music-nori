// 리14 박자가 그대로·중간에 바뀜(변박자) — 박·리듬 줄 · 흐름 b7 '변박자'(11-14 · 묶음 C2)
//  변박자 = 한 곡 안에서 박자가 바뀜. 마디 첫 박(센박)마다 큰북 · 다른 박은 하이햇 · 가락은 박마다 한 음(마디 첫 박은 솔 · 다른 박은 미 · 마지막 박은 도).
//   큰북이 오는 간격(마디 길이)이 끝까지 같으면 '박자가 그대로' · 중간에 달라지면 '박자가 바뀌어요'.
//  마디 짝(뒤집어도 전체 박 수가 같음 — 열리는 때로 답이 새지 않음): P1 3 3 3 ↔ 3 2 4 · P2 2 2 2 2 ↔ 2 3 3 · P3 4 4 ↔ 3 3 2. 한 박 0.38초 · 8박 짝은 끝에 한 박 쉼(모든 판 3.42초).
//  비틀기(한 판에 한 가지 · 두 꼴 모두 같게): inst 둘째 마디부터 리코더(악기 바뀜 ≠ 박자 바뀜) · accent 마디 둘째 박 가락이 셈(센 음 ≠ 마디 첫 박) · nohat 하이햇 없이 큰북만.
//  가락은 이 칸에서 만든 것(있는 노래를 쓰지 않음). 북 · 피아노 · 리코더 소리는 컴퓨터로 만든 소리.
//  성취기준(std)은 리5(마디·박자표) 것을 그대로 옮김 — ⚠ 확인 못 함(원문으로 다시 판정하지 않음).
//  ⚠ 귀로 확인하지 못한 것: accent 판에서 센 둘째 박이 마디 첫 박처럼 들려 마디가 바뀐 것으로 들리는지 · 2박 마디(0.76초)가 너무 빨리 지나가는지.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, drumLine, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

export const BEAT = 0.38;
export const PAIR = { P1: { keep: [3, 3, 3], change: [3, 2, 4] }, P2: { keep: [2, 2, 2, 2], change: [2, 3, 3] }, P3: { keep: [4, 4], change: [3, 3, 2] } };
// 판 — right = keep(그대로) | change(바뀜) · pair = 마디 짝 · kind: plain | inst | accent | nohat
export const PLAN = [
  { stage: 'intro', kind: 'plain', pair: 'P1', right: 'change' },
  { stage: 'intro', kind: 'plain', pair: 'P2', right: 'keep' },
  { stage: 'intro', kind: 'plain', pair: 'P3', right: 'change' },
  { stage: 'grow', kind: 'plain', pair: 'P1', right: 'keep' },
  { stage: 'grow', kind: 'nohat', pair: 'P2', right: 'change' },
  { stage: 'grow', kind: 'plain', pair: 'P3', right: 'keep' },
  { stage: 'twist', kind: 'inst', pair: 'P1', right: 'keep' },
  { stage: 'twist', kind: 'accent', pair: 'P2', right: 'keep' },
  { stage: 'twist', kind: 'inst', pair: 'P3', right: 'change' },
  { stage: 'twist', kind: 'accent', pair: 'P1', right: 'change' },
  { stage: 'end', kind: 'nohat', pair: 'P3', right: 'keep' },
  { stage: 'end', kind: 'plain', pair: 'P2', right: 'change' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, right: p.right === 'keep' ? 'change' : 'keep' }), answerOf: p => p.right };

const barsOf = row => PAIR[row.pair][row.right];
// 박 목록 — 박마다 { first: 마디 첫 박인가, second: 마디 둘째 박인가, bar: 몇째 마디 }
const beatsOf = row => barsOf(row).flatMap((n, bar) => Array.from({ length: n }, (_, i) => ({ first: i === 0, second: i === 1, bar })));
function build(row) {
  const bs = beatsOf(row), bars = barsOf(row);
  const dr = drumLine(bs.map(b => [b.first ? 'kick' : row.kind === 'nohat' ? null : 'hat', 1]), { beat: BEAT })
    .map(n => (n.drum ? { ...n, vel: n.drum === 'kick' ? 0.8 : 0.35 } : n));
  const mel = line(bs.map((b, i) => [i === bs.length - 1 ? 60 : b.first ? 67 : 64, 1]), { inst: 'piano', vel: 0.55, beat: BEAT })
    .map((n, i) => ({ ...n, inst: row.kind === 'inst' && bs[i].bar > 0 ? 'recorder' : 'piano', vel: row.kind === 'accent' && bs[i].second ? 0.9 : 0.55 }));
  const keep = row.right === 'keep';
  // 8박 짝은 끝에 한 박 쉼 — 모든 판의 소리 창이 9박(3.42초)으로 같다(소리 길이로 짝을 알 수 없게)
  const pad = 9 - bs.length, rest = pad > 0 ? line([[null, pad]], { beat: BEAT }) : [];
  return [{ lines: [[...dr, ...rest], mel], cap: keep ? `${bars[0]}박씩 그대로` : bars.map(n => n + '박').join(' → ') }];
}
const firstChange = bars => bars.find(n => n !== bars[0]);
const wrong = row => {
  const bars = barsOf(row);
  if (row.right === 'keep') return `마디마다 ${bars[0]}박씩 그대로였어요` + (row.kind === 'inst' ? ' · 악기만 바뀌었어요' : row.kind === 'accent' ? ' · 센 음은 둘째 박이었어요' : '');
  return `${bars[0]}박 마디에서 ${firstChange(bars)}박 마디로 바뀌었어요`;
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['악기만 바뀐 판', '센 음이 둘째 박인 판', '마디 첫 박만 들리는 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'inst'), text: '중간에 악기가 바뀌는 판에서 다르게 고른 적이 있어요. 악기가 바뀌어도 큰북이 오는 간격이 같으면 박자는 그대로예요.' },
    { n: miss(p => p.kind === 'accent'), text: '둘째 박이 센 판에서 다르게 고른 적이 있어요. 센 음보다 큰북(마디 첫 박)이 오는 간격을 들어요.' },
    { n: miss(p => p.kind === 'nohat'), text: '큰북만 들리는 판에서 다르게 고른 적이 있어요. 큰북과 큰북 사이에 박이 몇 개인지 세어요.' },
  ], '큰북이 오는 간격으로 박자가 그대로인지 바뀌는지 들었어요.');
}
// 헷갈리는 두 소리 — 3박 마디 셋 ↔ 3박 · 2박 · 4박
export const NEAR = [
  { label: '3 · 3 · 3박 그대로', play: nearSegs(build({ kind: 'plain', pair: 'P1', right: 'keep' })) },
  { label: '3 · 2 · 4박 바뀜', play: nearSegs(build({ kind: 'plain', pair: 'P1', right: 'change' })) },
];

// 단추 그림 — 세로줄 = 마디 줄(그대로 = 고른 간격 · 바뀜 = 간격이 달라짐) · 초록 점 = 마디 첫 박
const CHIP = k => {
  const xs = k === 'keep' ? [6, 23, 40, 57] : [6, 17, 41, 57];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${xs.map(x => `<path d="M${x} 14V50" stroke="#3B2A1E" stroke-width="3.5" stroke-linecap="round"/>`).join('')}${
    xs.slice(0, 3).map(x => `<circle cx="${x + 5}" cy="32" r="3.5" fill="#2F6F4E"/>`).join('')}</svg>`;
};

const ASK = lo => (lo ? '들어요 — 큰북 간격이 그대로일까요, 중간에 바뀔까요?' : '들어요 — 박자가 그대로일까요, 중간에 바뀔까요?');
const cell = pickCell({
  friend: 'hog',
  keys: ['keep', 'change'],
  label: (k, lo) => (lo ? (k === 'keep' ? '그대로' : '중간에 바뀜') : k === 'keep' ? '박자가 그대로' : '박자가 바뀌어요'),
  chip: CHIP,
  rightOf: row => row.right,
  build,
  names: () => ['소리 그림'],
  say: {
    show: () => '큰북이 마디 첫 박이에요. 큰북이 오는 간격이 끝까지 같으면 박자가 그대로, 중간에 달라지면 박자가 바뀐 거예요.',
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 큰북 간격이 그대로인지 바뀌는지 골라요' : 'TV 소리를 듣고 — 박자가 그대로인지 바뀌는지 골라요'),
  },
  wrong,
  EX: () => [
    { title: '3박 그대로', sub: '큰북이 세 박마다', row: { kind: 'plain', pair: 'P1', right: 'keep' } },
    { title: '3박 → 2박 → 4박', sub: '큰북 간격이 바뀌어요', row: { kind: 'plain', pair: 'P1', right: 'change' } },
    { title: '2박 그대로', sub: '큰북이 두 박마다', row: { kind: 'plain', pair: 'P2', right: 'keep' } },
    { title: '2박 → 3박', sub: '두 박 마디 뒤에 세 박 마디', row: { kind: 'plain', pair: 'P2', right: 'change' } },
  ],
  note: () => '큰북 = 마디 첫 박 · 컴퓨터로 만든 소리예요',
  pool: [
    { kind: 'plain', pair: 'P1', right: 'keep' },
    { kind: 'plain', pair: 'P1', right: 'change' },
    { kind: 'plain', pair: 'P2', right: 'change' },
    { kind: 'plain', pair: 'P3', right: 'keep' },
    { kind: 'inst', pair: 'P3', right: 'keep' },
    { kind: 'nohat', pair: 'P2', right: 'keep' },
  ],
  passText: '세 번 이어서 박자가 그대로인지 바뀌는지 가려냈어요',
  game: {
    title: '박자가 바뀔까',
    sub: () => '소리를 한 번 들려줘요. 큰북이 마디 첫 박이에요. 큰북이 오는 간격이 끝까지 같은지(그대로), 중간에 달라지는지(바뀜) 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
