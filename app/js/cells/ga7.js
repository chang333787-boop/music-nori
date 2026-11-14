// 가7 파와 시 찾기 — 장음계(11-14 · 묶음 C · 흐름 m7 · 난이도 4 · 가락 줄) — 고르기 틀
//  가5까지 익힌 다섯 음(도 레 미 솔 라)에 반 계단 음 둘(미 바로 위 파 · 높은 도 바로 아래 시)이 들어오면 일곱 음이 다 모인다.
//   이 칸은 **도 자리(도 미 솔)를 먼저 듣고 → 다섯 음 가락을 들은 뒤 → 가락에 파 · 시가 있었는지** 고른다(단추 넷 = 파 · 시 · 둘 다 · 둘 다 없음).
//  왜 고르기 틀인가: 가락 틀(_mel.js) 칸은 칸마다 화면 · 시험을 손으로 짓는다. 이 칸이 묻는 것은 '반 계단 음이 있었나' 하나라
//   고르기 틀의 봇 · 길이 검사를 그대로 받는 쪽이 단단하다. 계단 그림은 보기 카드 글로만.
//  꼴(파 자리 X · 시 자리 Y — 넷 꼴의 리듬이 같음): T1 미 X 솔 Y 높은 도(X 파 | 레 · Y 시 | 라) · T2 높은 도 Y 솔 X 미(Y 시 | 라 · X 파 | 미)
//   · T3 뛰어서 도 X 미 Y 높은 도(X 파 | 솔 · Y 시 | 라). 파 · 시 대신 들어가는 음은 늘 다섯 음 안의 음.
//  차례: 소개(T1 · T2) → 발전 → 비틀기(한 판에 하나 — 리코더 · 한 옥타브 높게 · 도에서 뛰어 파로) → 마무리
//  섞을 때 뒤집기 = 파 → 시 → 둘 다 → 없음 → 파(같은 꼴 · 같은 갈래 · 소리만 바뀜). 모든 판 다섯 음 0.36초씩 — 답과 상관없이 길이가 같다.
//  ⚠ 성취기준 표시(std)는 가4 것('4음02-01◎')을 그대로 옮겼고 5~6학년 칸에 맞는지 원문으로 확인하지 못했다.
//  ⚠ 귀로 확인하지 못한 것: 리코더 · 높은 판에서 반 계단(미-파 · 시-도)이 크롬북 스피커로 또렷이 들리는지.
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

export const KEYS = ['fa', 'ti', 'both', 'none'];
// 꼴 — X(파 자리) · Y(시 자리)에 [반 계단 음, 대신 들어가는 음]
export const TUNE = {
  T1: { mel: (x, y) => [64, x, 67, y, 72], X: [65, 62], Y: [71, 69] },
  T2: { mel: (x, y) => [72, y, 67, x, 64], X: [65, 64], Y: [71, 69] },
  T3: { mel: (x, y) => [60, x, 64, y, 72], X: [65, 67], Y: [71, 69] },
};
const HAS = { fa: [1, 0], ti: [0, 1], both: [1, 1], none: [0, 0] };
export const melOf = row => {
  const t = TUNE[row.tune], [f, s] = HAS[row.right], up = row.kind === 'high' ? 12 : 0;
  return t.mel(t.X[f ? 0 : 1], t.Y[s ? 0 : 1]).map(p => p + up);
};
// 판 — { stage, kind: plain | inst(리코더) | high(한 옥타브 높게) | leap(T3 · 도에서 뛰어 파로), tune, right }
const R = (stage, kind, tune, right) => ({ stage, kind, tune, right });
export const PLAN = [
  R('intro', 'plain', 'T1', 'fa'),
  R('intro', 'plain', 'T1', 'ti'),
  R('intro', 'plain', 'T2', 'none'),
  R('grow', 'plain', 'T2', 'both'),
  R('grow', 'plain', 'T1', 'none'),
  R('grow', 'plain', 'T2', 'fa'),
  R('twist', 'inst', 'T1', 'fa'),
  R('twist', 'high', 'T2', 'ti'),
  R('twist', 'leap', 'T3', 'both'),
  R('twist', 'leap', 'T3', 'none'),
  R('end', 'plain', 'T2', 'ti'),
  R('end', 'plain', 'T1', 'both'),
];
export const CUTS = stageCuts(PLAN);
const CYC = { fa: 'ti', ti: 'both', both: 'none', none: 'fa' };
export const SHUF = { flip: p => ({ ...p, right: CYC[p.right] }), answerOf: p => p.right };

const NOTE = 0.36;
function build(row) {
  const up = row.kind === 'high' ? 12 : 0, inst = row.kind === 'inst' ? 'recorder' : 'piano';
  return [
    { lines: [line([60, 64, 67].map(p => [p + up, 1]), { inst, vel: 0.6, beat: 0.3 })], cap: '도 미 솔', gap: 0.4 },
    { lines: [line((row.kind === 'scale' ? [60, 62, 64, 65, 67, 69, 71, 72] : melOf(row)).map(p => [p, 1]), { inst, vel: 0.6, beat: NOTE })], cap: LAB[row.right] },
  ];
}
const LAB = { fa: '파', ti: '시', both: '파 · 시 모두', none: '파 · 시 없이 다섯 음' };
const wrong = row => ({
  fa: '미 바로 위 반 계단, 파가 있었어요',
  ti: '높은 도 바로 아래 반 계단, 시가 있었어요',
  both: '파와 시가 모두 있었어요 — 일곱 음이 다 모였어요',
  none: '파도 시도 없었어요 — 다섯 음이에요',
}[row.right] + (row.kind === 'leap' && HAS[row.right][0] ? ' · 도에서 뛰어 파로 갔어요' : ''));

// 단추 그림 — 일곱 계단(도 → 높은 도) · 파 · 시 계단을 초록으로 칠함(없음 = 다섯 계단만 · 파 · 시 자리는 비움)
const STEP = [0, 1, 2, 3, 4, 5, 6, 7];               // 도 레 미 파 솔 라 시 도
const CHIP = k => {
  const [f, s] = HAS[k];
  const bars = STEP.map(i => {
    const x = 4 + i * 7.2, y = 56 - i * 6, isF = i === 3, isT = i === 6;
    if ((isF && !f) || (isT && !s)) return `<rect x="${x.toFixed(1)}" y="${y}" width="6" height="${60 - y}" rx="1.5" fill="none" stroke="#3B2A1E" stroke-width="1.6" stroke-dasharray="2.5 2"/>`;
    return `<rect x="${x.toFixed(1)}" y="${y}" width="6" height="${60 - y}" rx="1.5" fill="${(isF && f) || (isT && s) ? '#2F6F4E' : '#3B2A1E'}"/>`;
  });
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${bars.join('')}</svg>`;
};

export const TIPS_TV = ['악기가 바뀐 판', '높아진 판', '뛰어서 만난 파'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'inst'), text: '악기가 바뀐 판에서 헷갈린 적이 있어요. 악기가 달라도 미 바로 위 · 높은 도 바로 아래의 반 계단을 찾아요.' },
    { n: miss(p => p.kind === 'high'), text: '높아진 판에서 헷갈린 적이 있어요. 높이가 달라도 도 미 솔을 먼저 듣고 그 자리에서 견줘요.' },
    { n: miss(p => p.kind === 'leap'), text: '도에서 뛰어 만난 음에서 헷갈린 적이 있어요. 도 다음에 바로 파로 뛸 수도 있어요 — 미 바로 위 음인지 들어 봐요.' },
  ], '파와 시가 있는지 모두 가려냈어요.');
}
export const NEAR = [
  { label: '파 · 시 없이 다섯 음', low: '파 · 시 없이 다섯 음', play: nearSegs(build({ kind: 'plain', tune: 'T1', right: 'none' })) },
  { label: '파가 든 가락', low: '파가 든 가락', play: nearSegs(build({ kind: 'plain', tune: 'T1', right: 'fa' })) },
];

const ASK = () => '도 자리를 듣고 — 가락에 파 · 시가 있었나요?';
const cell = pickCell({
  friend: 'bird',
  keys: KEYS,
  label: k => LAB[k],
  chip: CHIP,
  rightOf: row => row.right,
  build,
  names: () => ['도 자리', '가락'],
  say: {
    show: () => '파와 시가 들어오면 일곱 음이 다 모여요(장음계). 미-파 · 시-도는 반 계단이에요. 눌러서 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 가락에 파 · 시가 있었는지 골라요',
  },
  wrong,
  EX: () => [
    { title: '다섯 음', sub: '파 · 시 없이', row: { kind: 'plain', tune: 'T1', right: 'none' } },
    { title: '미-파 반 계단', sub: '미 바로 위가 파', row: { kind: 'plain', tune: 'T1', right: 'fa' } },
    { title: '시-도 반 계단', sub: '높은 도 바로 아래가 시', row: { kind: 'plain', tune: 'T1', right: 'ti' } },
    { title: '일곱 음', sub: '도 레 미 파 솔 라 시 도', row: { kind: 'scale', tune: 'T1', right: 'both' } },
  ],
  note: () => '컴퓨터로 만든 악기 소리예요',
  pool: PLAN.slice(3),
  passText: '세 번 이어서 파 · 시를 가려냈어요',
  game: {
    title: '파와 시 찾기',
    sub: () => '도 미 솔을 먼저 들려주고, 다섯 음 가락을 들려줘요. 가락에 파 · 시가 있었는지 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
