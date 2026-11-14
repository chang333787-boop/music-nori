// 셈3 셈여림표 차례 — 셈여림표(pp · p · mp · mf · f · ff)를 귀로 쓰는 칸(11-14 · 흐름 d2 · d3 · d5 · 듣고 고르기 틀 '판마다 다른 카드'의 첫 칸)
//  절대 크기는 기기 음량에 따라 달라 귀로 못 맞힌다(셈1과 같은 까닭) → **두 도막(첫째 · 둘째)을 이어 듣고, 그 세기 차례에 맞는 셈여림표 짝 카드**를 고른다.
//   판마다 카드 셋 — 그 판의 기호 둘(a가 여림 · b가 셈)로 만든 'a → b'(커짐) · 'b → a'(작아짐) · 'x → x'(같음). 답 키는 up | down | same.
//   카드는 그 판의 기호 짝과 '같음' 카드 기호(x)로만 정해진다 — 답이 무엇이든 같은 카드(뒤집어도 같음 · 카드로 답이 새지 않음).
//  차례: 소개 p · f → 발전 mp · mf(세기 차가 가장 작음) → 비틀기(한 판에 한 가지만: 높은 도막이 더 여림 · 높아져도 같은 세기 · 악기가 바뀌어도 · 다른 악기로만)
//   → 마무리 pp · ff를 섞어서. 두 도막은 같은 가락 · 같은 길이(네 박씩 · 모든 판 3.86초) — 길이 · 열리는 때로 답이 새지 않음.
//  세기 값(vel)은 기호 차례를 그대로 따르고, 한 판의 두 도막 차는 0.3 이상(같음은 같은 값). 기호 글자 · 읽는 말은 악보 판(engine/marks.js SIGNS)의 것만 쓴다.
//  ⚠ 귀로 확인하지 못한 것: ① mp ↔ mf(0.42 ↔ 0.72)가 크롬북 스피커에서 가려지는지(압축기가 센 쪽을 누를 수 있음) ② 높은 도막이 세기가 같아도 더 크게 들리는지
//   ③ 리코더 · 실로폰에서 같은 세기 차가 피아노처럼 들리는지 ④ 피아노 → 실로폰(악기가 바뀌는 판)에서 악기 자체의 크기 차가 세기 차를 가리는지
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { signById } from '../../../engine/marks.js';

export const SYMS = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
export const nameOf = s => signById(s).name;                          // 매우 여리게 · 여리게 · 조금 여리게 · 조금 세게 · 세게 · 매우 세게
// 소리 세기 — 기호 차례대로 커짐 · 이 칸에서 쓰는 짝은 모두 0.3 넘게 벌어짐(mp ↔ mf 0.30 · p ↔ f 0.6 · pp ↔ ff 0.9)
export const VEL = { pp: 0.2, p: 0.3, mp: 0.42, mf: 0.72, f: 0.9, ff: 1.1 };
// 가락 — 네 박 · 이 칸에서 만든 것(있는 노래 X)
const M = {
  a: [[67, 1], [64, 1], [65, 1], [67, 1]],                            // 솔 미 파 솔
  b: [[60, 1], [64, 1], [67, 1], [64, 1]],                            // 도 미 솔 미
  c: [[72, 1], [71, 1], [69, 1], [67, 1]],                            // 높은 도 시 라 솔
};
const UP = 7;                                                          // 높은 도막은 완전5도 위

// 판 — pair = [a(여림), b(셈)] · s = [첫째 기호, 둘째 기호] · x = '같음' 카드 기호(판마다 고정 · 같음 판은 s = [x, x])
//  kind: plain | hi(hi번째 도막이 5도 위) | inst(두 도막 모두 다른 악기) | swap(둘째 도막만 다른 악기 · 세기 차가 큰 판만)
//  섞을 때 up ↔ down = 두 도막의 기호를 바꿈 · 높은 도막 자리도 같이 옮김(높은 도막이 늘 더 여리거나 같음) · swap 판의 다른 악기는 늘 둘째(뒤집으면 다른 악기 쪽이 여림)
export const PLAN = [
  { stage: 'intro', kind: 'plain', m: 'a', pair: ['p', 'f'], s: ['p', 'f'], x: 'f', right: 'up' },
  { stage: 'intro', kind: 'plain', m: 'b', pair: ['p', 'f'], s: ['f', 'p'], x: 'p', right: 'down' },
  { stage: 'intro', kind: 'plain', m: 'c', pair: ['p', 'f'], s: ['f', 'f'], x: 'f', right: 'same' },
  { stage: 'grow', kind: 'plain', m: 'a', pair: ['mp', 'mf'], s: ['mp', 'mf'], x: 'mp', right: 'up' },
  { stage: 'grow', kind: 'plain', m: 'b', pair: ['mp', 'mf'], s: ['mp', 'mp'], x: 'mp', right: 'same' },
  { stage: 'grow', kind: 'plain', m: 'c', pair: ['mp', 'mf'], s: ['mf', 'mp'], x: 'mf', right: 'down' },
  { stage: 'twist', kind: 'hi', hi: 1, m: 'b', pair: ['mp', 'f'], s: ['f', 'mp'], x: 'f', right: 'down' },
  { stage: 'twist', kind: 'hi', hi: 1, m: 'a', pair: ['p', 'mf'], s: ['mf', 'mf'], x: 'mf', right: 'same' },
  { stage: 'twist', kind: 'swap', inst: 'xylo', m: 'b', pair: ['p', 'f'], s: ['p', 'f'], x: 'p', right: 'up' },
  { stage: 'twist', kind: 'inst', inst: 'recorder', m: 'a', pair: ['mp', 'mf'], s: ['mf', 'mf'], x: 'mf', right: 'same' },
  { stage: 'end', kind: 'plain', m: 'c', pair: ['pp', 'mf'], s: ['pp', 'mf'], x: 'pp', right: 'up' },
  { stage: 'end', kind: 'plain', m: 'b', pair: ['pp', 'ff'], s: ['ff', 'pp'], x: 'ff', right: 'down' },
];
export const CUTS = stageCuts(PLAN);
const swapRow = p => ({ ...p, s: [p.s[1], p.s[0]], right: p.right === 'up' ? 'down' : p.right === 'down' ? 'up' : 'same', ...(p.hi != null ? { hi: 1 - p.hi } : {}) });
export const SHUF = { flip: p => (p.right === 'same' ? p : swapRow(p)), answerOf: p => p.right };

// 판 → 도막 둘. 같은 가락 · 같은 길이 · 세기만(비틀기는 높이 또는 악기 한 가지만 더)
//  swap 판: 둘째 도막만 다른 악기(원판은 다른 악기 쪽이 셈 · 뒤집은 판은 여림 — '다른 악기 = 센 도막'으로 고를 수 없음)
function build(row) {
  return row.s.map((sym, k) => {
    const other = row.kind === 'inst' || (row.kind === 'swap' && k === 1);
    const shift = row.kind === 'hi' && row.hi === k ? UP : 0;
    return { lines: [line(M[row.m], { inst: other ? row.inst : 'piano', vel: VEL[sym], shift })], cap: `${sym} ${nameOf(sym)}` };
  });
}

// 판의 카드 셋 — 답과 상관없이 그 판의 기호 짝(pair)과 x로만 정함
const CHIP = (a, b) => `<svg viewBox="0 0 156 64" aria-hidden="true"><g font-family="Georgia,'Times New Roman',serif" font-style="italic" font-weight="700" font-size="36" fill="#3B2A1E">` +
  `<text x="60" y="44" text-anchor="end">${a}</text><text x="98" y="44">${b}</text></g>` +
  `<path d="M66 33H90M82 25L91 33L82 41" fill="none" stroke="#2F6F4E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const card = (key, a, b) => ({ key, label: `${nameOf(a)}\n→ ${nameOf(b)}`, chip: CHIP(a, b), tv: `${a} → ${b}` });
export const cards = row => { const [a, b] = row.pair; return [card('up', a, b), card('down', b, a), card('same', row.x, row.x)]; };

const louder = row => (row.right === 'up' ? '둘째' : '첫째');
const wrong = row => {
  const [s1, s2] = row.s;
  if (row.right === 'same') return row.kind === 'hi' ? `높아져도 세기가 같았어요 — ${s1} → ${s2}` : row.kind === 'inst' ? `악기가 바뀌어도 세기가 같았어요 — ${s1} → ${s2}` : `두 도막의 세기가 같았어요 — ${s1} → ${s2}`;
  if (row.kind === 'hi') return `높은 도막이 더 여렸어요 — ${s1} → ${s2}`;
  return `${louder(row)} 도막이 더 셌어요${row.kind === 'swap' ? ' · 악기도 바뀌었어요' : ''} — ${s1} → ${s2}`;
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높이를 세기로', '같은 세기를 다르다고', '조금 여리게 · 조금 세게'];
// picks[k] = 그 판에 고른 단추
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    // 높은 도막 쪽을 센 쪽으로 고름(둘째가 높으면 up · 첫째가 높으면 down)
    { n: miss((p, pick) => p.kind === 'hi' && (pick == null || pick === (p.hi === 1 ? 'up' : 'down'))), text: '높은 도막을 더 센 도막으로 고른 적이 있어요. 높이와 세기는 달라요 — 높아져도 세기는 같거나 더 여릴 수 있어요.' },
    { n: miss(p => p.right === 'same'), text: '세기가 같은 두 도막을 다르다고 고른 적이 있어요. 높이나 악기가 바뀌어도 세기가 같으면 같은 기호 둘이에요.' },
    { n: miss(p => p.pair[0] === 'mp' && p.pair[1] === 'mf'), text: '조금 여리게(mp)와 조금 세게(mf)를 헷갈린 적이 있어요. 두 기호는 세기 차가 가장 작아요 — 두 도막을 견줘 들어요.' },
  ], '높이 · 악기가 바뀌어도 세기 차례만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 세기 차가 가장 작은 짝(mp → mf) ↔ 같은 세기(mf → mf)
export const NEAR = [
  { label: 'mp → mf 둘째가 더 셈', play: nearSegs(build({ kind: 'plain', m: 'a', s: ['mp', 'mf'] })) },
  { label: 'mf → mf 세기가 같음', play: nearSegs(build({ kind: 'plain', m: 'a', s: ['mf', 'mf'] })) },
];

const ASK = () => '두 도막을 들어요 — 세기 차례에 맞는 셈여림표는?';
const cell = pickCell({
  friend: 'bear',
  keys: ['up', 'down', 'same'],
  label: k => ({ up: '커져요', down: '작아져요', same: '같아요' })[k],
  cards,
  rightOf: row => row.right,
  build,
  names: () => ['첫째', '둘째'],
  say: {
    show: () => '셈여림표는 소리의 세기를 알려 줘요. 두 도막을 견줘 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 두 도막의 세기 차례에 맞는 셈여림표를 골라요',
  },
  wrong,
  EX: () => [
    { title: 'p → f', sub: '여리게에서 세게로', row: { kind: 'plain', m: 'a', s: ['p', 'f'] } },
    { title: 'f → p', sub: '세게에서 여리게로', row: { kind: 'plain', m: 'a', s: ['f', 'p'] } },
    { title: 'mp → mf', sub: '조금 여리게에서 조금 세게로', row: { kind: 'plain', m: 'b', s: ['mp', 'mf'] } },
    { title: 'mf → mf', sub: '세기가 같아요', row: { kind: 'plain', m: 'b', s: ['mf', 'mf'] } },
  ],
  note: () => '막대가 굵을수록 센 소리예요',
  pool: [
    { kind: 'plain', m: 'a', pair: ['p', 'f'], s: ['p', 'f'], x: 'f', right: 'up' },
    { kind: 'plain', m: 'b', pair: ['p', 'f'], s: ['p', 'p'], x: 'p', right: 'same' },
    { kind: 'plain', m: 'c', pair: ['mp', 'mf'], s: ['mf', 'mp'], x: 'mp', right: 'down' },
    { kind: 'plain', m: 'a', pair: ['mp', 'mf'], s: ['mf', 'mf'], x: 'mf', right: 'same' },
    { kind: 'hi', hi: 1, m: 'b', pair: ['p', 'f'], s: ['f', 'p'], x: 'f', right: 'down' },
    { kind: 'plain', m: 'c', pair: ['pp', 'ff'], s: ['pp', 'ff'], x: 'pp', right: 'up' },
  ],
  passText: '세 번 이어서 세기 차례를 셈여림표로 골랐어요',
  game: {
    title: '셈여림표 짝 고르기',
    sub: () => '두 도막을 이어 들려줘요. 세기 차례에 맞는 셈여림표 짝을 골라요. 판마다 기호가 바뀌어요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
