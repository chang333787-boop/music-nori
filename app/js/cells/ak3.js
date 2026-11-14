// 악3 가온 도에서 읽기 — 높은음자리표 · 가온 도 · 덧줄(11-14 · 묶음 C · 흐름 s3 · 난이도 3 · 거북 줄)
//  악2는 줄 음 · 칸 음을 눈으로 갈랐다. 이 칸은 **가온 도를 먼저 듣고 → 네 음 가락을 들은 뒤 → 같은 가락이 적힌 오선 카드**를 고른다.
//   높은음자리표가 '첫째 줄 = 미'를 정해 주므로 가온 도는 오선 아래 짧은 덧줄 하나 · 그보다 낮은 라 · 솔은 덧줄 둘(낮은 라 = 덧줄 둘 사이 아래 · 낮은 솔 = 둘째 덧줄 아래).
//  카드 = 작은 오선 카드(_staff.js · 4분음표 넷 · 높은음자리표) — 판마다 셋(고르기 틀 cards). 단추 키는 자리(첫째 · 둘째 · 셋째).
//  차례: 소개(셋 다 가온 도에서 시작 · 모양만 다름) → 발전(모양은 같고 첫 음만 도 · 레 · 미) → 비틀기(덧줄 둘 — 낮은 라 · 낮은 솔) → 마무리(섞어서)
//   비틀기는 가6(낮은 라 · 솔) 음역을 여기서 맡는다(묶음 C §A-2 — 가6은 만들지 않음). 높은 쪽 덧줄(높은 라)은 4학년 음역 밖이라 넣지 않음.
//  섞을 때 뒤집기 = 답을 다음 카드로(소리만 그 카드 소리로 · 카드 셋 · 자리는 그대로) — 카드 그림만 보고는 답을 못 고른다.
//  모든 판: 가온 도 한 박 · 쉼 0.5초 · 네 박(BEAT 0.42 · 피아노 0.6) — 답과 상관없이 길이가 같다.
//  ⚠ 성취기준 표시(std)는 악2 것('6음03-02○')을 그대로 옮겼고 원문으로 다시 판정하지 않았다(확인 못 함).
//  ⚠ 귀로 확인하지 못한 것: 낮은 솔(55)이 크롬북 스피커에서 낮은 라(57)와 갈려 들리는지(작은 스피커는 낮은 음이 약함).
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js) — 보기 카드에만 오선 그림을 덧붙임(틀의 보기 카드는 글뿐이라 칸 안에서)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { staffCard } from './_staff.js';

export const KEYS = ['a', 'b', 'c'];
const ORD = ['첫째', '둘째', '셋째'];
// 카드 그림 높이 — 낮은 솔(덧줄 둘 아래)부터 높은 도까지 한 크기로(한 칸의 카드가 모두 같은 크기)
export const RANGE = { lo: -5, hi: 7 };
export const NAME = { 55: '낮은 솔', 57: '낮은 라', 59: '시', 60: '가온 도', 62: '레', 64: '미', 65: '파', 67: '솔', 69: '라', 71: '시', 72: '높은 도' };

// 판 — { stage, kind, set: [카드 셋(네 음씩)], ans: 0|1|2 } · kind: shape(셋 다 가온 도에서) · start(같은 모양 · 첫 음이 다름) · low(덧줄 둘) · mix
const R = (stage, kind, set, ans) => ({ stage, kind, set, ans });
export const PLAN = [
  R('intro', 'shape', [[60, 62, 64, 65], [60, 64, 67, 64], [60, 60, 64, 64]], 1),
  R('intro', 'shape', [[60, 67, 64, 60], [60, 64, 62, 60], [60, 65, 64, 62]], 2),
  R('intro', 'shape', [[60, 62, 64, 62], [60, 64, 60, 64], [60, 67, 65, 64]], 0),
  R('grow', 'start', [[60, 64, 67, 64], [62, 65, 69, 65], [64, 67, 71, 67]], 0),
  R('grow', 'start', [[62, 64, 65, 64], [60, 62, 64, 62], [64, 65, 67, 65]], 2),
  R('grow', 'start', [[64, 62, 60, 60], [62, 60, 62, 64], [60, 62, 64, 64]], 1),
  R('twist', 'low', [[64, 62, 60, 57], [64, 62, 60, 60], [64, 62, 60, 59]], 0),
  R('twist', 'low', [[60, 57, 60, 64], [60, 55, 60, 64], [60, 59, 60, 64]], 1),
  R('twist', 'low', [[57, 60, 64, 60], [55, 60, 64, 60], [60, 60, 64, 60]], 2),
  R('twist', 'low', [[60, 57, 55, 57], [60, 59, 57, 59], [60, 57, 59, 60]], 0),
  R('end', 'mix', [[62, 60, 57, 60], [60, 64, 67, 72], [60, 64, 67, 69]], 1),
  R('end', 'mix', [[57, 62, 64, 62], [55, 62, 64, 62], [60, 62, 64, 62]], 2),
];
export const CUTS = stageCuts(PLAN);
// 뒤집기 = 답을 다음 카드로(카드 셋 · 자리 그대로 · 소리만 바뀜)
export const SHUF = { flip: p => ({ ...p, ans: (p.ans + 1) % 3 }), answerOf: p => KEYS[p.ans] };

const tune = row => row.set[row.ans];
const lowIn = ps => ps.some(p => p < 59);
function build(row) {
  return [
    { lines: [line([[60, 1]], { inst: 'piano', vel: 0.6 })], cap: '가온 도', gap: 0.5 },
    { lines: [line(tune(row).map(p => [p, 1]), { inst: 'piano', vel: 0.6 })], cap: `${ORD[row.ans] || ''} 카드` },
  ];
}
const wrong = row => {
  const ps = tune(row);
  return `${ORD[row.ans]} 카드 — ${NAME[ps[0]]}에서 시작했어요${row.kind === 'low' && lowIn(ps) ? ' · 덧줄 둘은 낮은 라 · 낮은 솔이에요' : ''}`;
};
// 판마다 카드 셋 — 표의 카드만 보고 정함(답과 상관없음 · 뒤집어도 같은 카드)
export const cards = row => row.set.map((ps, k) => ({ key: KEYS[k], label: ORD[k], chip: staffCard(ps, RANGE), tv: ORD[k] }));

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['첫 음이 다른 같은 모양', '덧줄 아래 낮은 음', '모양이 다른 가락'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'start'), text: '모양이 같은 카드 가운데서 헷갈린 적이 있어요. 가온 도를 먼저 듣고, 첫 음이 가온 도와 같은지 · 더 높은지 견줘 봐요.' },
    { n: miss(p => p.kind === 'low'), text: '덧줄 아래 낮은 음에서 헷갈린 적이 있어요. 가온 도는 덧줄 하나 · 낮은 라와 낮은 솔은 덧줄 둘이에요 — 덧줄이 늘면 더 낮아요.' },
    { n: miss(p => p.kind === 'shape' || p.kind === 'mix'), text: '높낮이 모양이 다른 카드에서 헷갈린 적이 있어요. 음표가 올라가는지 · 내려가는지 · 같은 자리에 머무는지 소리와 견줘 봐요.' },
  ], '가온 도를 기준으로 오선 카드를 모두 읽었어요.');
}
// 헷갈리는 두 소리 — 모양이 같고 첫 음만 다름(가온 도 ↔ 레)
export const NEAR = [
  { label: '가온 도에서 시작', low: '가온 도에서 시작', play: nearSegs(build({ ...PLAN[3], ans: 0 })) },
  { label: '레에서 시작(모양은 같음)', low: '레에서 시작(모양은 같음)', play: nearSegs(build({ ...PLAN[3], ans: 1 })) },
];

// 보기 카드 — 소리 + 오선 그림(아래 show에서 카드에 덧붙임)
const EXS = [
  { title: '가온 도', sub: '아래 짧은 덧줄 하나', ps: [60] },
  { title: '도 레 미', sub: '덧줄 → 줄 아래 → 첫째 줄', ps: [60, 62, 64] },
  { title: '낮은 라', sub: '덧줄 둘 — 더 낮아요', ps: [60, 57] },
  { title: '낮은 솔', sub: '둘째 덧줄 아래', ps: [60, 55] },
];
const ASK = lo => (lo ? '처음 소리를 듣고 — 같은 그림 카드를 골라요' : '가온 도를 듣고 — 들은 가락은 어느 카드인가요?');
const cell = pickCell({
  friend: 'turtle',
  keys: KEYS,
  label: k => ORD[KEYS.indexOf(k)],
  cards,
  rightOf: row => KEYS[row.ans],
  build,
  names: () => ['가온 도', '들은 가락'],
  say: {
    show: lo => (lo ? '가온 도는 다섯 줄 아래 짧은 덧줄에 있어요. 덧줄이 늘면 더 낮아요. 눌러서 들어 봐요.'
      : '가온 도는 오선 아래 짧은 덧줄에 있어요. 덧줄이 늘면 더 낮아요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 같은 그림 카드를 골라요' : 'TV 소리를 듣고 — 들은 가락이 적힌 카드를 골라요'),
  },
  wrong,
  EX: () => EXS.map(e => ({ title: e.title, sub: e.sub, row: { set: [e.ps], ans: 0 } })),
  note: () => '컴퓨터로 만든 피아노 소리예요',
  pool: PLAN.slice(0, 10),
  passText: '세 번 이어서 들은 가락의 카드를 찾았어요',
  game: {
    title: '가온 도에서 읽기',
    sub: lo => (lo ? '가온 도를 먼저 들려주고, 네 음을 들려줘요. 들은 소리와 같은 그림 카드를 골라요.'
      : '가온 도를 먼저 들려주고, 네 음 가락을 들려줘요. 들은 가락이 적힌 오선 카드를 골라요.'),
  },
  PLAN, CUTS, SHUF, tipOf,
});

// 보기 — 틀의 보기 카드(글)에 오선 그림을 붙임(누르면 소리 · 그림은 그대로)
function show(ui, kit) {
  const off = cell.mod.show(ui, kit);
  ui.stage.querySelectorAll('.pk-ex').forEach((b, i) => {
    const e = EXS[i];
    if (e) b.insertAdjacentHTML('beforeend', `<span class="ak-staff">${staffCard(e.ps, { ...RANGE, width: 150, mark: [e.ps.length - 1] })}</span>`);
  });
  return off;
}

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default { ...cell.mod, show };
