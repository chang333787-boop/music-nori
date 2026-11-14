// 화2 다장조 주요 3화음 — 화음 줄의 듣고 고르기 칸(11-14 · 흐름 h2)
//  화1에서 '여러 음이 함께 나는 소리'를 가려냈다. 이제 다장조에서 많이 쓰는 3화음 셋(Ⅰ 도미솔 · Ⅳ 파라도 · Ⅴ 솔시레)을 귀로 가려낸다.
//   한 판 = 으뜸음 도를 먼저 두 박 듣고(기준) → 화음을 듣고 셋 가운데 고름(귀 + 세 음의 이름 → 난이도 4).
//  차례: 세 음을 하나씩 펼친 뒤 함께 → 한꺼번에 낸 화음 → 비틀기 '악기가 달라진 판(하프 · 실로폰)' + '한 옥타브 높아진 화음' → 섞어서
//  꼴과 상관없이 화음 도막은 다섯 박이라 답과 상관없이 길이가 같다.
//  1~2학년 판은 '화음' · 'Ⅰ'을 쓰지 않고 '도미솔'처럼 세 음 이름만 쓴다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js) · 도막 만들기는 _chord.js(화3과 같이 씀)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { ROMAN, NEXT, chordNames, chordSegs, chordChip, togetherText } from './_chord.js';

export const CHORD = { I: [60, 64, 67], IV: [65, 69, 72], V: [67, 71, 74] };   // 도미솔 · 파라도 · 솔시레
export const TONIC = 60;
const INST = ['harp', 'xylo'];

// 판 — kind: arp(하나씩 펼친 뒤 함께) | block(한꺼번에) | inst(하프 · 실로폰 — m) | high(한 옥타브 위) · ans = I | IV | V(섞을 때 다음 화음으로)
export const PLAN = [
  { stage: 'intro', kind: 'arp', ans: 'I' },
  { stage: 'intro', kind: 'arp', ans: 'V' },
  { stage: 'intro', kind: 'arp', ans: 'IV' },
  { stage: 'grow', kind: 'arp', ans: 'IV' },
  { stage: 'grow', kind: 'block', ans: 'I' },
  { stage: 'grow', kind: 'block', ans: 'V' },
  { stage: 'twist', kind: 'inst', m: 0, ans: 'IV' },
  { stage: 'twist', kind: 'inst', m: 1, ans: 'I' },
  { stage: 'twist', kind: 'high', ans: 'V' },
  { stage: 'twist', kind: 'high', ans: 'IV' },
  { stage: 'end', kind: 'block', ans: 'I' },
  { stage: 'end', kind: 'block', ans: 'V' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: NEXT[p.ans] }), answerOf: p => p.ans };

const build = row => chordSegs({
  ps: CHORD[row.ans], tonic: TONIC,
  form: row.kind === 'block' ? 'block' : 'arp',
  inst: row.kind === 'inst' ? INST[row.m] : 'piano',
  up: row.kind === 'high' ? 12 : 0,
  caps: ['', row.kind === 'block' ? '한꺼번에' : row.kind === 'high' ? '한 옥타브 위' : ''],
});
const NAMES = k => chordNames(CHORD[k]).replace(/ · /g, '');
const wrong = (row, lo) => `${lo ? '' : ROMAN[row.ans] + ' — '}${togetherText(CHORD[row.ans])}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['한꺼번에 낸 화음', '악기가 달라진 판', '높아진 화음'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'block'), text: '한꺼번에 낸 화음을 틀린 적이 있어요. 세 음이 함께 나도 맨 아래 음과 맨 위 음을 따로 들어 봐요.' },
    { n: miss(p => p.kind === 'inst'), text: '악기가 달라진 판을 틀린 적이 있어요. 악기는 빼고 세 음의 높이만 들어 봐요.' },
    { n: miss(p => p.kind === 'high'), text: '한 옥타브 높아진 화음을 틀린 적이 있어요. 높아져도 세 음의 이름은 그대로예요.' },
  ], '도를 기준으로 세 음을 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 둘 다 도가 든 Ⅳ 파라도 ↔ Ⅰ 도미솔(펼친 뒤 함께)
export const NEAR = [
  { label: 'Ⅳ 파라도', low: '파라도', play: nearSegs(build({ kind: 'arp', ans: 'IV' })) },
  { label: 'Ⅰ 도미솔', low: '도미솔', play: nearSegs(build({ kind: 'arp', ans: 'I' })) },
];

const cell = pickCell({
  friend: 'turtle',
  keys: ['I', 'IV', 'V'],
  label: (k, lo) => (lo ? NAMES(k) : `${ROMAN[k]} ${NAMES(k)}`),
  chip: chordChip,
  rightOf: row => row.ans,
  build,
  names: () => ['도', '화음'],
  say: {
    show: lo => (lo ? '세 음이 함께 나는 소리 셋이에요. 눌러서 들어 봐요.' : '다장조에서 많이 쓰는 화음 셋이에요. 눌러서 들어 봐요.'),
    follow: lo => (lo ? '도를 듣고 — 어느 소리인지 골라요' : '도를 듣고 — 어느 화음인지 골라요'),
    game: lo => (lo ? '도를 듣고 — 어느 소리인지 골라요' : '도를 듣고 — 어느 화음인지 골라요'),
    kid: lo => (lo ? 'TV 소리를 듣고 — 도미솔 · 파라도 · 솔시레 가운데 골라요' : 'TV 소리를 듣고 — Ⅰ · Ⅳ · Ⅴ 가운데 어느 화음인지 골라요'),
  },
  wrong,
  EX: lo => [
    { title: lo ? '도미솔' : 'Ⅰ 도미솔', sub: '도 · 미 · 솔', row: { kind: 'arp', ans: 'I' } },
    { title: lo ? '파라도' : 'Ⅳ 파라도', sub: '파 · 라 · 도', row: { kind: 'arp', ans: 'IV' } },
    { title: lo ? '솔시레' : 'Ⅴ 솔시레', sub: '솔 · 시 · 레', row: { kind: 'arp', ans: 'V' } },
    { title: '한꺼번에', sub: lo ? '도미솔을 한 번에' : 'Ⅰ을 한 번에', row: { kind: 'block', ans: 'I' } },
  ],
  pool: [
    { kind: 'arp', ans: 'I' },
    { kind: 'arp', ans: 'IV' },
    { kind: 'arp', ans: 'V' },
    { kind: 'block', ans: 'IV' },
    { kind: 'inst', m: 0, ans: 'V' },
    { kind: 'high', ans: 'I' },
  ],
  passText: '세 번 이어서 화음 셋을 가려냈어요',
  game: {
    title: lo => (lo ? '함께 소리 셋 맞히기' : '화음 셋 맞히기'),
    sub: lo => (lo ? '도를 먼저 들려줘요. 이어서 나는 세 음이 도미솔인지, 파라도인지, 솔시레인지 골라요.'
      : '도를 먼저 들려줘요. 이어서 나는 화음이 Ⅰ 도미솔인지, Ⅳ 파라도인지, Ⅴ 솔시레인지 골라요.'),
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
