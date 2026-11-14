// 화3 바장조·사장조 주요 3화음 — 화음 줄의 듣고 고르기 칸(11-14 · 흐름 h3)
//  화2에서 다장조의 Ⅰ · Ⅳ · Ⅴ를 가려냈다. 화음 이름은 으뜸음에서 잰 자리라, 으뜸음이 바뀌면 같은 소리도 이름이 달라진다.
//   한 판 = 그 조의 으뜸음(바장조 파 · 사장조 솔)을 먼저 두 박 듣고 → 화음을 듣고 Ⅰ · Ⅳ · Ⅴ 가운데 고름(으뜸음에서 세기 → 난이도 5).
//  차례: 하나씩 펼친 뒤 함께 → 한꺼번에 → 비틀기 '같은 도미솔이 바장조에서는 Ⅴ · 사장조에서는 Ⅳ'(home) + '악기가 달라진 판' → 섞어서
//  home 판은 섞어도 그대로(도미솔을 그대로 둠) · 다른 판은 섞을 때 도미솔이 아닌 쪽으로만 뒤집힘(바장조 Ⅰ ↔ Ⅳ · 사장조 Ⅰ ↔ Ⅴ)
//   → 도미솔은 비틀기 판에서만 나와 한 판에 한 가지만 바뀐다.
//  꼴과 상관없이 화음 도막은 다섯 박이라 답과 상관없이 길이가 같다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js) · 도막 만들기는 _chord.js(화2와 같이 씀)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { ROMAN, chordSegs, chordChip, togetherText } from './_chord.js';

export const KEY = {
  F: { name: '바장조', tonic: 65, tname: '파', CH: { I: [65, 69, 72], IV: [70, 74, 77], V: [60, 64, 67] } },   // 파라도 · 시♭레파 · 도미솔
  G: { name: '사장조', tonic: 67, tname: '솔', CH: { I: [67, 71, 74], IV: [60, 64, 67], V: [62, 66, 69] } },   // 솔시레 · 도미솔 · 레파♯라
};
const INST = ['harp', 'xylo'];
const HOME = { F: 'V', G: 'IV' };                                   // 도미솔인 자리

// 판 — key F | G · kind: arp | block | inst(m) | home(도미솔 · block이면 한꺼번에) · ans = I | IV | V
export const PLAN = [
  { stage: 'intro', key: 'F', kind: 'arp', ans: 'I' },
  { stage: 'intro', key: 'G', kind: 'arp', ans: 'V' },
  { stage: 'intro', key: 'F', kind: 'arp', ans: 'IV' },
  { stage: 'grow', key: 'G', kind: 'arp', ans: 'I' },
  { stage: 'grow', key: 'F', kind: 'block', ans: 'IV' },
  { stage: 'grow', key: 'G', kind: 'block', ans: 'V' },
  { stage: 'twist', key: 'F', kind: 'home', ans: 'V' },
  { stage: 'twist', key: 'G', kind: 'home', ans: 'IV' },
  { stage: 'twist', key: 'F', kind: 'inst', m: 0, ans: 'I' },
  { stage: 'twist', key: 'G', kind: 'inst', m: 1, ans: 'V' },
  { stage: 'end', key: 'F', kind: 'block', ans: 'I' },
  { stage: 'end', key: 'G', kind: 'home', block: true, ans: 'IV' },
];
export const CUTS = stageCuts(PLAN);
const OTHER = { F: { I: 'IV', IV: 'I' }, G: { I: 'V', V: 'I' } };
export const SHUF = { flip: p => (p.kind === 'home' ? p : { ...p, ans: OTHER[p.key][p.ans] }), answerOf: p => p.ans };

const capOf = row => `${KEY[row.key].name} · 으뜸음 ${KEY[row.key].tname}`;
const build = row => chordSegs({
  ps: KEY[row.key].CH[row.ans], tonic: KEY[row.key].tonic,
  form: row.kind === 'block' || row.block ? 'block' : 'arp',
  inst: row.kind === 'inst' ? INST[row.m] : 'piano',
  caps: [capOf(row), ''],
});
const wrong = row => `${KEY[row.key].name} ${ROMAN[row.ans]} — ${togetherText(KEY[row.key].CH[row.ans])}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['조에 따라 이름이 달라지는 도미솔', '한꺼번에 낸 화음', '악기가 달라진 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'home'), text: '도미솔 판을 틀린 적이 있어요. 도미솔은 바장조에서는 Ⅴ, 사장조에서는 Ⅳ예요. 먼저 들은 으뜸음에서 세어 봐요.' },
    { n: miss(p => p.kind === 'block'), text: '한꺼번에 낸 화음을 틀린 적이 있어요. 맨 아래 음이 으뜸음에서 몇째 음인지 들어 봐요.' },
    { n: miss(p => p.kind === 'inst'), text: '악기가 달라진 판을 틀린 적이 있어요. 악기는 빼고 세 음의 높이만 들어 봐요.' },
  ], '으뜸음을 기준으로 화음을 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 도미솔 · 으뜸음만 다름(바장조 Ⅴ ↔ 사장조 Ⅳ)
export const NEAR = [
  { label: '바장조 Ⅴ 도미솔', low: null, play: nearSegs(build({ key: 'F', kind: 'home', ans: 'V' })) },
  { label: '사장조 Ⅳ 도미솔', low: null, play: nearSegs(build({ key: 'G', kind: 'home', ans: 'IV' })) },
];

const ASK = () => '으뜸음을 듣고 — Ⅰ · Ⅳ · Ⅴ 가운데 골라요';
const cell = pickCell({
  friend: 'turtle',
  keys: ['I', 'IV', 'V'],
  label: k => ROMAN[k],
  chip: chordChip,
  rightOf: row => row.ans,
  build,
  names: () => ['으뜸음', '화음'],
  say: {
    show: lo => (lo ? '첫 음이 바뀌면 같은 소리도 이름이 달라져요. 눌러서 들어 봐요.' : '으뜸음이 바뀌면 같은 화음도 이름이 달라져요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — Ⅰ · Ⅳ · Ⅴ 가운데 골라요' : 'TV 소리를 듣고 — 으뜸음에서 Ⅰ · Ⅳ · Ⅴ 가운데 골라요'),
  },
  wrong,
  EX: () => [
    { title: '바장조 Ⅰ', sub: '파 · 라 · 도', row: { key: 'F', kind: 'arp', ans: 'I' } },
    { title: '바장조 Ⅴ', sub: '도 · 미 · 솔', row: { key: 'F', kind: 'home', ans: 'V' } },
    { title: '사장조 Ⅰ', sub: '솔 · 시 · 레', row: { key: 'G', kind: 'arp', ans: 'I' } },
    { title: '사장조 Ⅳ', sub: '도 · 미 · 솔', row: { key: 'G', kind: 'home', ans: 'IV' } },
  ],
  pool: [
    { key: 'F', kind: 'arp', ans: 'I' },
    { key: 'F', kind: 'arp', ans: 'IV' },
    { key: 'G', kind: 'arp', ans: 'I' },
    { key: 'G', kind: 'block', ans: 'V' },
    { key: 'F', kind: 'home', ans: 'V' },
    { key: 'G', kind: 'home', ans: 'IV' },
  ],
  passText: '세 번 이어서 으뜸음에서 화음을 가려냈어요',
  game: {
    title: '조가 바뀐 화음 맞히기',
    sub: () => '으뜸음을 먼저 들려줘요. 이어서 나는 화음이 그 조의 Ⅰ인지, Ⅳ인지, Ⅴ인지 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
