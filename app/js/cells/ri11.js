// 리11 들은 리듬 찾기 — 한 마디 리듬을 듣고 리듬 카드 셋 가운데 같은 것을 고르는 칸(11-14 묶음 D6 · 흐름 r2 · r3 · r4 · r5 · b4 · 듣고 고르기 틀 '판마다 다른 카드')
//  소리: 준비 박 둘(하이햇) → 한 마디(네 박) — 마디 안에서도 하이햇이 박마다 작게 이어진다(쉬는 박 · 첫 박 쉼을 귀로 셀 수 있게).
//   소개 · 발전 = 작은북(4분음표 · 4분쉼표 · 8분음표 둘은 소리가 시작하는 때만으로 갈림)
//   비틀기 · 마무리 = 리코더 한 높이(솔) — 2분음표는 두 박 동안 이어져야 4분음표 + 4분쉼표와 갈리므로 이어지는 소리로 바꿈(북은 길이가 안 들림)
//   음마다 끝에 0.07초 틈(같은 높이 8분음표 둘이 한 소리로 뭉치지 않게) · 모든 판 소리 길이 3.3초(준비 두 박 + 네 박 · 박 0.55초 ≈ 109)
//  카드: 판마다 셋 — 소개 · 발전 · 마무리의 세 카드는 같은 음표들(같은 음 수 · 같은 쉼 수)을 자리만 바꾼 꼴이라 '음이 많은 카드' · '쉼표가 있는 카드'로는 못 고른다.
//   비틀기는 같은 네 박에서 따아 · 따 쉼 · 따 따처럼 꼴만 다른 카드(소리 시작이 같은 두 카드는 이어짐을 들어야 갈림).
//   그 가운데 하나가 들리고(ans) 섞을 때 다른 하나(alt)로 바뀐다 — 카드는 그대로 · 들리는 것만 바뀜(카드로 답이 새지 않음 · 셈3과 같은 약속).
//   남은 하나는 그 판에서 늘 비켜 있는 카드 — 판마다 그 자리(단계마다 첫째 · 둘째 · 셋째 한 번씩) · 모양(음 수 · 쉼 · 2분음표 · 앞뒤 · 가운데 꼴)이 달라
//   카드 모양만 보고 고르는 봇이 별을 못 받게 했다(tests/pick/ri11.mjs 봇 · 비켜 있는 카드는 봇 맞힘 몫이 가장 고르게 되도록 전수로 고름).
//   같은 카드는 열두 판에 두 번 나오지 않는다(처음 보는 카드 · 지난 판 답을 고르는 봇이 맞힐 길이 없게).
//  차례: 소개 4분음표 · 4분쉼표만(쉬는 박 자리) → 발전 8분음표 둘(띠띠 자리) → 비틀기 2분음표(같은 네 박 · 따아 / 따 쉼 / 따 따) → 마무리 섞인 리듬꼴
//  1~2학년 판은 막대 그림 카드(박 칸 넷 · 소리 = 막대 · 길이 = 막대 길이 · 쉬는 박 = 빈 점선 칸) — 음표 · 쉼표 낱말을 쓰지 않음.
//  ⚠ 귀로 확인하지 못한 것: ① 작은북과 하이햇이 함께 날 때 아이가 작은북만 따로 듣는지 ② 0.07초 틈으로 리코더 8분음표 둘이 둘로 들리는지
//   ③ 첫 박이 쉬는 마디(준비 박 둘 뒤)를 아이가 '첫 박 쉼'으로 세는지 ④ 0.55초 박이 3학년에게 알맞은 빠르기인지
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, nearSegs } from './_pick.js';
import { glyph } from './_glyph.js';
import { factTip, stageCuts } from '../cellkit.js';

export const BEAT = 0.55, COUNT = 2, ART = 0.07;                     // 박(초) · 준비 박 수 · 음 끝 틈(초)
export const KEYS = ['a', 'b', 'c'];
export const ORD = ['첫째', '둘째', '셋째'];
// 리듬꼴 글(q 4분음표 · r 4분쉼표 · e 8분음표 둘 · h 2분음표) → 박 목록(_glyph.js) · 읽는 말
const TOK = { q: [1], r: [-1], e: [0.5, 0.5], h: [2] };
const SAY = { q: '따', r: '쉼', e: '띠띠', h: '따아' };
export const beatsOf = s => s.split(' ').flatMap(t => TOK[t]);
export const readOf = s => s.split(' ').map(t => SAY[t]).join(' ');
const HAT = 0.32, SNARE = 0.8, REC = 0.62, PITCH = 67;

// 판 — set = 카드 셋(차례 = 단추 차례) · ans = 들리는 카드 · alt = 섞을 때 들리는 카드 · snd = drum(작은북) | rec(리코더)
//  kind(틀린 갈래): rest 쉬는 박 자리 · ee 8분음표 둘 자리 · long 2분음표 길이 · mix 섞인 리듬꼴
const R = (stage, kind, snd, set, ans, alt) => ({ stage, kind, snd, set, ans, alt });
export const PLAN = [
  R('intro', 'rest', 'drum', ['q q r q', 'q q q r', 'q r q q'], 0, 1),
  R('intro', 'rest', 'drum', ['q q r r', 'q r r q', 'q r q r'], 1, 2),
  R('intro', 'rest', 'drum', ['r q q r', 'r q r q', 'r r q q'], 2, 0),
  R('grow', 'ee', 'drum', ['q q q e', 'e q q q', 'q e q q'], 2, 0),
  R('grow', 'ee', 'drum', ['r q q e', 'r e q q', 'r q e q'], 0, 1),
  R('grow', 'ee', 'drum', ['e e q q', 'e q e q', 'q e e q'], 1, 2),
  R('twist', 'long', 'rec', ['h q q', 'q h q', 'q q h'], 1, 2),
  R('twist', 'long', 'rec', ['h q r', 'q r h', 'h h'], 2, 0),
  R('twist', 'long', 'rec', ['q r e q', 'q q q q', 'h e q'], 0, 1),
  R('end', 'mix', 'rec', ['h q e', 'e h q', 'q e h'], 0, 1),
  R('end', 'mix', 'rec', ['q q r e', 'q e r q', 'e q r q'], 1, 2),
  R('end', 'mix', 'rec', ['r q h', 'h r q', 'q h r'], 2, 0),
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.alt, alt: p.ans }), answerOf: p => KEYS[p.ans] };
export const heard = row => row.set[row.ans];

// 판 → 도막 둘(준비 박 · 들은 리듬). 박마다 하이햇(작게) + 리듬 줄(작은북 또는 리코더 솔)
const pulse = n => Array.from({ length: n }, () => ({ drum: 'hat', d: 0.12, gap: BEAT - 0.12, vel: HAT }));
function rhythm(s, snd) {
  return beatsOf(s).map(b => {
    const len = Math.abs(b) * BEAT;
    if (b < 0) return { p: null, d: len, gap: 0 };
    return snd === 'drum' ? { drum: 'snare', d: len - ART, gap: ART, vel: SNARE } : { p: PITCH, d: len - ART, gap: ART, vel: REC, inst: 'recorder' };
  });
}
function build(row) {
  const s = heard(row);
  return [
    { lines: [pulse(COUNT)], cap: '하나 둘', gap: 0 },
    { lines: [pulse(4), rhythm(s, row.snd)], cap: readOf(s) },
  ];
}

// 1~2학년 판 막대 그림 — 박 칸 넷(바닥 눈금) · 소리 = 막대(길이 = 박 수 · 띠띠 = 짧은 막대 둘) · 쉬는 박 = 빈 점선 칸
const INK = '#3B2A1E', HOG = '#8B5A2B';
export function barChip(s) {
  const W = 46, X0 = 8, out = [`<path d="M${X0} 54H${X0 + 4 * W}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`];
  for (let k = 0; k <= 4; k++) out.push(`<path d="M${X0 + k * W} 49V59" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`);
  let at = 0;
  for (const t of s.split(' ')) {
    const x = X0 + at * W;
    if (t === 'r') out.push(`<rect class="bc-rest" x="${x + 6}" y="22" width="${W - 12}" height="20" rx="8" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="5 5"/>`);
    else if (t === 'e') for (const j of [0, 1]) out.push(`<rect class="bc-n" x="${x + 4 + j * (W / 2)}" y="22" width="${W / 2 - 8}" height="20" rx="7" fill="${HOG}" stroke="${INK}" stroke-width="2.5"/>`);
    else { const len = t === 'h' ? 2 : 1; out.push(`<rect class="bc-n" x="${x + 4}" y="22" width="${len * W - 8}" height="20" rx="9" fill="${HOG}" stroke="${INK}" stroke-width="2.5"/>`); }
    at += t === 'h' ? 2 : 1;
  }
  return `<svg class="barchip" viewBox="0 0 ${X0 * 2 + 4 * W} 64" width="${Math.round(64 * (X0 * 2 + 4 * W) / 64)}" height="64" aria-hidden="true">${out.join('')}</svg>`;
}
const chipOf = (s, lo) => (lo ? barChip(s) : glyph(beatsOf(s), { size: 64 }));
// 판의 카드 셋 — 답과 상관없이 그 판의 set으로만(뒤집어도 같음)
export const cards = (row, lo) => row.set.map((s, k) => ({ key: KEYS[k], label: ORD[k], chip: chipOf(s, lo), tv: ORD[k] }));

const wrong = (row, lo) => (lo ? `들은 소리는 ${ORD[row.ans]} 그림이에요 — ${readOf(heard(row))}` : `들은 리듬은 ${ORD[row.ans]} 카드예요 — ${readOf(heard(row))}`);

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['쉬는 박 자리', '8분음표 둘 자리', '2분음표 길이', '섞인 리듬꼴'];
export function tipOf(plan, results) {
  const miss = kind => plan.filter((p, k) => results[k] === false && p.kind === kind).length;
  return factTip(results, [
    { n: miss('rest'), text: '4분쉼표가 몇째 박인지 헷갈린 적이 있어요. 박을 하나 둘 셋 넷 세며 소리가 안 나는 박을 찾아요.' },
    { n: miss('ee'), text: '8분음표 둘이 몇째 박인지 헷갈린 적이 있어요. 한 박에 소리가 두 번 나는 자리를 찾아요.' },
    { n: miss('long'), text: '2분음표와 4분음표 · 4분쉼표를 헷갈린 적이 있어요. 소리가 두 박 동안 이어지는지, 한 박 뒤에 멈추는지 들어요.' },
    { n: miss('mix'), text: '여러 음표가 섞인 리듬에서 헷갈린 적이 있어요. 한 박씩 나눠 들으며 카드를 앞에서부터 견줘요.' },
  ], '4분쉼표 · 8분음표 둘 · 2분음표까지 들은 리듬과 같은 카드를 골랐어요.');
}
// 헷갈리는 두 소리 — 비틀기의 가장 작은 차이(첫 두 박이 따아 ↔ 따 쉼 · 뒤는 같음)
const one = (s, snd = 'rec') => build({ snd, set: [s], ans: 0 });
export const NEAR = [
  { label: '2분음표로 시작', low: '첫 소리가 길어요', play: nearSegs(one('h e q')) },
  { label: '4분음표 · 쉼표로 시작', low: '첫 소리 뒤 쉬어요', play: nearSegs(one('q r e q')) },
];

const ASK = lo => (lo ? '하나 둘 다음 한 마디 — 같은 막대 그림은?' : '하나 둘 다음 한 마디 — 같은 리듬 카드는?');
const ex = (title, sub, s, snd, lo) => ({ title, sub, chip: chipOf(s, lo), row: { snd, set: [s], ans: 0 } });
const cell = pickCell({
  friend: 'hog',
  keys: KEYS,
  label: k => ORD[KEYS.indexOf(k)],
  cards,
  rightOf: row => KEYS[row.ans],
  build,
  names: () => ['준비', '들은 한 마디'],
  say: {
    show: lo => (lo ? '한 마디를 듣고 같은 막대 그림을 찾아요. 눌러서 들어 봐요.' : '한 마디 리듬을 듣고 같은 리듬 카드를 찾아요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 같은 막대 그림 카드를 골라요' : 'TV 소리를 듣고 — 들은 한 마디와 같은 리듬 카드를 골라요'),
  },
  wrong,
  EX: lo => [
    ex(readOf('q q r q'), lo ? '셋째 박은 쉬어요' : '4분음표 · 4분쉼표', 'q q r q', 'drum', lo),
    ex(readOf('e q q q'), lo ? '첫 박에 짧게 두 번' : '8분음표 둘로 시작', 'e q q q', 'drum', lo),
    ex(readOf('h q q'), lo ? '첫 소리가 두 박 길게' : '2분음표 — 두 박 이어져요', 'h q q', 'rec', lo),
    ex(readOf('q r e q'), lo ? '섞어서' : '섞인 리듬꼴', 'q r e q', 'rec', lo),
  ],
  note: lo => (lo ? '작은 탁 소리는 박이에요' : '작은 탁 소리(하이햇)는 박을 알려 줘요'),
  pool: [
    R(null, 'rest', 'drum', ['q q r q', 'r q q q', 'q r q q'], 0, 1),
    R(null, 'ee', 'drum', ['e q q r', 'q e q r', 'q q e r'], 1, 2),
    R(null, 'long', 'rec', ['h q q', 'q r q q', 'q q q q'], 0, 1),
    R(null, 'long', 'rec', ['q q h', 'q q q r', 'q e h'], 2, 0),
    R(null, 'ee', 'drum', ['e e q q', 'q q e e', 'e q q e'], 1, 0),
    R(null, 'mix', 'rec', ['q e h', 'h q e', 'e h q'], 2, 1),
  ],
  passText: '세 번 이어서 들은 리듬 카드를 찾았어요',
  game: {
    title: lo => (lo ? '들은 소리 그림 찾기' : '들은 리듬 찾기'),
    sub: lo => (lo ? '하나 둘 다음에 한 마디를 들려줘요. 들은 소리와 같은 막대 그림을 골라요. 판마다 그림이 바뀌어요.' : '하나 둘 다음에 한 마디를 들려줘요. 들은 리듬과 같은 리듬 카드를 골라요. 판마다 카드가 바뀌어요.'),
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
