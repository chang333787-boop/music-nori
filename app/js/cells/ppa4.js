// 빠4 빠르기말 — 우리말 빠르기말을 귀로 쓰는 칸(11-14 · 흐름 t3 · 듣고 고르기 틀 · 북 소리 · 음마다 연주법(art)을 쓰는 첫 칸)
//  절대 빠르기는 기준 없이 이름 붙이기 어렵다 → 판마다 **「보통 빠르게」 기준 도막을 먼저** 들려주고, 둘째 도막이 그보다 얼마나 느린지 빠른지 고른다.
//   단추 넷 = 느리게 · 조금 느리게 · 조금 빠르게 · 빠르게(악보 판 engine/marks.js SIGNS의 우리말 · 이탈리아어 낱말은 거기 없으므로 쓰지 않음)
//  **소리 길이는 답과 상관없이 같다** — 두 도막 모두 1.95초 창 안에서 같은 간격으로 음을 낸다(빠1 · 빠2처럼 창을 고정하고 음 수를 바꿈).
//   기준 = 5번(간격 0.39초 · 약 154) · 느리게 3번(0.6배 · 약 92) · 조금 느리게 4번(0.8배 · 약 123) · 조금 빠르게 6번(1.2배 · 약 185) · 빠르게 8번(1.6배 · 약 246)
//   창 길이는 TV 소리 모드 한 판 100초 안(판마다 소리 + 3.8초)에 맞춘 값 — 두 도막 + 쉼 0.3초 = 4.2초. 기준의 절대 빠르기는 귀로 고르지 않음(견주기만)
//   이웃한 두 말의 빠르기 비는 1.25 ~ 1.5배 — 같은 시간에 몇 번 나는지로도 셀 수 있음(소리를 듣는 길)
//  차례: 소개(느리게 · 빠르게 — 큰 차이) → 발전(조금 느리게 · 조금 빠르게) → 비틀기(한 판에 한 가지만: 높아지며 느려짐 · 작아지며 빨라짐 · 북으로 · 낮아지며 빨라짐)
//   → 마무리(짧게 끊어 내도 · 북으로). 섞을 때 느리게 ↔ 빠르게 · 조금 느리게 ↔ 조금 빠르게로 뒤집고, 높이 · 세기 쪽도 같이 뒤집어 '높으면 빠름'이 늘 틀리게.
//  ⚠ 귀로 확인하지 못한 것: ① 조금 느리게(0.8배)와 느리게(0.6배) · 조금 빠르게(1.2배)와 빠르게(1.6배)가 아이 귀에 갈리는지 ② 빠르게(간격 0.244초)의 피아노 음이 겹쳐 뭉개지는지
//   ③ 북(큰북 · 작은북 번갈아)이 같은 빠르기에서 더 빠르게 들리는지 ④ 짧게 끊은 바이올린 음이 빨라진 것처럼 들리는지
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, drumLine, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { signById } from '../../../engine/marks.js';

export const KEYS = ['slow', 'slowish', 'fastish', 'fast'];
export const word = k => signById(k).name;                           // 느리게 · 조금 느리게 · 보통 빠르게 · 조금 빠르게 · 빠르게
export const WIN = 1.95, REF_N = 5;                                    // 두 도막의 창(초) · 기준 음 수
export const N = { slow: 3, slowish: 4, fastish: 6, fast: 8 };        // 둘째 도막 음 수(같은 창 안)
const MIRROR = { slow: 'fast', fast: 'slow', slowish: 'fastish', fastish: 'slowish' };
const REF = [67, 64, 65, 67, 64];                                     // 기준 가락(솔 미 파 솔 미) — 이 칸에서 만든 것
const MOT = [67, 69, 67, 64, 65, 67, 64, 62];                         // 둘째 가락(앞에서 n개)
const VEL = 0.6, SOFT = 0.32, LOUD = 0.9, SHIFT = 7;
const DRUMS = ['kick', 'snare'];

// 판 — kind: plain | high(둘째가 5도 위) | low(5도 아래) | soft(둘째가 작게) | loud(크게) | drum(둘째를 큰북 · 작은북으로) | stacc(바이올린 · 둘째를 짧게 끊어)
export const PLAN = [
  { stage: 'intro', kind: 'plain', right: 'fast' },
  { stage: 'intro', kind: 'plain', right: 'slow' },
  { stage: 'intro', kind: 'plain', right: 'fast' },
  { stage: 'grow', kind: 'plain', right: 'slowish' },
  { stage: 'grow', kind: 'plain', right: 'fastish' },
  { stage: 'grow', kind: 'plain', right: 'slow' },
  { stage: 'twist', kind: 'high', right: 'slowish' },
  { stage: 'twist', kind: 'soft', right: 'fastish' },
  { stage: 'twist', kind: 'drum', right: 'slow' },
  { stage: 'twist', kind: 'low', right: 'fastish' },
  { stage: 'end', kind: 'stacc', right: 'slowish' },
  { stage: 'end', kind: 'drum', right: 'fast' },
];
export const CUTS = stageCuts(PLAN);
const KIND_FLIP = { high: 'low', low: 'high', soft: 'loud', loud: 'soft' };
export const SHUF = { flip: p => ({ ...p, right: MIRROR[p.right], kind: KIND_FLIP[p.kind] || p.kind }), answerOf: p => p.right };
// 맞힐 확률 — 소개 판은 느리게 · 빠르게 둘 중 하나뿐(아는 아이는 반을 찍어 맞힘) · 그 뒤는 넷 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 2 : 1 / 4));

// 판 → 도막 둘(기준 · 둘째). 두 도막 모두 WIN초 창 · 음 사이 간격은 고름
function build(row) {
  const n = N[row.right], beat = WIN / n, inst = row.kind === 'stacc' ? 'violin' : 'piano';
  const ref = line(REF.map(p => [p, 1]), { inst, vel: VEL, beat: WIN / REF_N });
  let sec;
  if (row.kind === 'drum') sec = drumLine(Array.from({ length: n }, (_, i) => [DRUMS[i % 2], 1]), { vel: 0.75, beat });
  else {
    const shift = row.kind === 'high' ? SHIFT : row.kind === 'low' ? -SHIFT : 0, vel = row.kind === 'soft' ? SOFT : row.kind === 'loud' ? LOUD : VEL;
    sec = line(MOT.slice(0, n).map(p => [p, 1]), { inst, vel, shift, beat, art: row.kind === 'stacc' ? 'stacc' : undefined });
    if (row.kind === 'stacc') sec = sec.map(x => ({ ...x, d: +(beat * 0.35).toFixed(4), gap: +(beat * 0.65).toFixed(4) }));   // 짧게 끊어 냄(간격은 그대로)
  }
  return [
    { lines: [ref], cap: `${REF_N}번`, gap: 0.3 },
    { lines: [sec], cap: `${n}번 · ${word(row.right)}` },
  ];
}
const wrong = row => {
  const n = N[row.right], why = { high: '높아졌지만 ', low: '낮아졌지만 ', soft: '작아졌지만 ', loud: '커졌지만 ', drum: '북이지만 ', stacc: '짧게 끊었지만 ' }[row.kind] || '';
  return `${why}${word(row.right)}예요 — 같은 시간에 ${n}번(보통 빠르게는 ${REF_N}번)`;
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높이를 빠르기로', '조금과 그냥을 헷갈림', '악기 · 세기가 달라진 판'];
const fastSide = k => k === 'fast' || k === 'fastish';
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    // 높아진 판에서 빠른 쪽 · 낮아진 판에서 느린 쪽을 고름
    { n: miss((p, pick) => (p.kind === 'high' || p.kind === 'low') && (pick == null || fastSide(pick) === (p.kind === 'high'))), text: '높아진 소리를 빠르게로, 낮아진 소리를 느리게로 고른 적이 있어요. 높이와 빠르기는 달라요 — 같은 시간에 몇 번 나는지 들어요.' },
    // 느린 쪽 · 빠른 쪽은 맞혔는데 '조금'을 헷갈림
    { n: miss((p, pick) => pick != null && fastSide(pick) === fastSide(p.right)), text: '느린지 빠른지는 맞혔는데 「조금」을 헷갈린 적이 있어요. 보통 빠르게와 차이가 작으면 「조금」이에요.' },
    { n: miss(p => ['soft', 'loud', 'drum', 'stacc'].includes(p.kind)), text: '세기나 악기, 끊어 내기가 달라진 소리에서 헷갈린 적이 있어요. 소리가 달라져도 같은 시간에 몇 번 나는지만 들어요.' },
  ], '높이 · 세기 · 악기가 바뀌어도 빠르기만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 쪽 이웃한 둘(조금 빠르게 ↔ 빠르게)
export const NEAR = [
  { label: '조금 빠르게 · 6번', play: nearSegs(build({ kind: 'plain', right: 'fastish' })) },
  { label: '빠르게 · 8번', play: nearSegs(build({ kind: 'plain', right: 'fast' })) },
];

// 단추 그림 — 같은 길이에 점 몇 개(느릴수록 성김 · 빠를수록 촘촘)
const DOTS = { slow: 2, slowish: 3, fastish: 5, fast: 7 };
const CHIP = k => { const n = DOTS[k], xs = Array.from({ length: n }, (_, i) => 8 + (48 * i) / (n - 1)); return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M4 44H60" stroke="#3B2A1E" stroke-width="3" stroke-linecap="round"/>${xs.map(x => `<circle cx="${x.toFixed(1)}" cy="32" r="${n > 5 ? 4.5 : 6}" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2"/>`).join('')}</svg>`; };

const ASK = () => '보통 빠르게를 먼저 들어요 — 둘째 소리는 어떤 빠르기일까요?';
const cell = pickCell({
  friend: 'bear',
  keys: KEYS,
  label: k => word(k),
  chip: CHIP,
  rightOf: row => row.right,
  build,
  names: () => [word('mid'), '둘째'],
  say: {
    show: () => '보통 빠르게와 견주어 빠르기말을 붙여요. 눌러서 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 보통 빠르게와 견줘 빠르기말을 골라요',
  },
  wrong,
  EX: () => KEYS.map(k => ({ title: word(k), sub: `같은 시간에 ${N[k]}번`, row: { kind: 'plain', right: k } })),
  note: () => `보통 빠르게는 같은 시간에 ${REF_N}번이에요`,
  pool: [
    { kind: 'plain', right: 'fast' },
    { kind: 'plain', right: 'slow' },
    { kind: 'plain', right: 'slowish' },
    { kind: 'plain', right: 'fastish' },
    { kind: 'high', right: 'slowish' },
    { kind: 'drum', right: 'fastish' },
  ],
  passText: '세 번 이어서 빠르기말을 골랐어요',
  game: {
    title: '빠르기말 고르기',
    sub: () => '보통 빠르게를 먼저 들려주고 둘째 소리를 들려줘요. 둘째 소리의 빠르기말을 골라요.',
  },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
