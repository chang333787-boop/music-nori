// 음3 악기 이름 맞히기 — 음색 칸(11-14 · 흐름 e3)
//  소6(같은 악기인지)에서 가려낸 귀로 이번에는 **이름을 붙인다**: 같은 가락을 악기만 바꿔 듣고 피아노 · 리코더 · 바이올린 · 실로폰 가운데 고른다.
//   한 판 = 도막 하나 · 답 악기가 가락을 연주(같은 꼴이면 답과 상관없이 길이가 같음 → 열리는 때로 답이 새지 않음).
//  차례: 같은 가락(솔 미 솔―) → 높이가 달라진 판(다섯 음 위) → 비틀기 '세기 · 가락이 달라져도 같은 악기' → 섞어서
//  ⚠ 악기 소리는 모두 컴퓨터로 만든 소리다(app/js/audio.js) — 보기 화면에 그렇게 적는다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs, instName } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

export const INSTS = ['piano', 'recorder', 'violin', 'xylo'];
const TUNE = {
  base: [[67, 1], [64, 1], [67, 2]],                 // 솔 미 솔―
  A: [[60, 1], [62, 1], [64, 1], [67, 1]],           // 도 레 미 솔
  B: [[72, 1], [69, 1], [67, 2]],                    // 높은 도 라 솔―
};
const UP = 7, MID = 0.62;

// 판 — ans = 악기(섞을 때 다음 악기로) · kind: plain | high(다섯 음 위) | loud(세기 vel) | tune(다른 가락 A · B)
export const PLAN = [
  { stage: 'intro', kind: 'plain', ans: 'piano' },
  { stage: 'intro', kind: 'plain', ans: 'recorder' },
  { stage: 'intro', kind: 'plain', ans: 'violin' },
  { stage: 'grow', kind: 'plain', ans: 'xylo' },
  { stage: 'grow', kind: 'high', ans: 'violin' },
  { stage: 'grow', kind: 'high', ans: 'piano' },
  { stage: 'twist', kind: 'loud', vel: 0.4, ans: 'recorder' },
  { stage: 'twist', kind: 'loud', vel: 0.88, ans: 'xylo' },
  { stage: 'twist', kind: 'tune', tune: 'A', ans: 'violin' },
  { stage: 'twist', kind: 'tune', tune: 'B', ans: 'piano' },
  { stage: 'end', kind: 'high', ans: 'xylo' },
  { stage: 'end', kind: 'tune', tune: 'A', ans: 'recorder' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: INSTS[(INSTS.indexOf(p.ans) + 1) % INSTS.length] }), answerOf: p => p.ans };

const CAP = row => (row.kind === 'high' ? '더 높게' : row.kind === 'loud' ? (row.vel < MID ? '작게' : '크게') : row.kind === 'tune' ? '다른 가락' : '');
function build(row) {
  const mel = row.kind === 'tune' ? TUNE[row.tune] : TUNE.base;
  return [{ lines: [line(mel, { inst: row.ans, vel: row.kind === 'loud' ? row.vel : MID, shift: row.kind === 'high' ? UP : 0 })], cap: CAP(row) }];
}
const wrong = row => `${instName(row.ans)} 소리였어요`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높이가 달라진 판', '세기가 달라진 판', '가락이 달라진 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'high'), text: '높이가 달라진 판에서 다른 악기를 고른 적이 있어요. 같은 악기도 높은 소리와 낮은 소리를 내요.' },
    { n: miss(p => p.kind === 'loud'), text: '세기가 달라진 판에서 다른 악기를 고른 적이 있어요. 같은 악기도 작게도 크게도 소리 내요.' },
    { n: miss(p => p.kind === 'tune'), text: '가락이 달라진 판에서 다른 악기를 고른 적이 있어요. 가락이 바뀌어도 악기 소리를 들어 봐요.' },
  ], '높이 · 세기 · 가락이 달라져도 악기 소리를 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 둘 다 두드려서 소리 내는 악기(피아노 ↔ 실로폰)
export const NEAR = [
  { label: '피아노', low: null, play: nearSegs(build({ kind: 'plain', ans: 'piano' })) },
  { label: '실로폰', low: null, play: nearSegs(build({ kind: 'plain', ans: 'xylo' })) },
];

// 단추 그림 — 피아노 = 건반 셋 · 리코더 = 긴 관 · 바이올린 = 줄 넷 · 실로폰 = 막대 넷
const SVG = s => `<svg viewBox="0 0 64 64" aria-hidden="true">${s}</svg>`;
const INK = 'stroke="#3B2A1E" stroke-width="2.6"';
const CHIP = {
  piano: SVG([8, 24, 40].map(x => `<rect x="${x}" y="12" width="16" height="40" rx="3" style="fill:var(--surface)" ${INK}/>`).join('')
    + [20, 36].map(x => `<rect x="${x}" y="12" width="8" height="22" rx="2" fill="#3B2A1E"/>`).join('')),
  recorder: SVG(`<rect x="25" y="6" width="14" height="52" rx="6" fill="#2F6F4E" ${INK}/>`
    + [20, 29, 38, 47].map(y => `<circle cx="32" cy="${y}" r="2.6" style="fill:var(--surface)"/>`).join('')),
  violin: SVG(`<rect x="14" y="10" width="36" height="44" rx="14" style="fill:var(--surface)" ${INK}/>`
    + [25, 30, 35, 40].map(x => `<line x1="${x}" y1="14" x2="${x}" y2="50" stroke="#2F6F4E" stroke-width="2.4"/>`).join('')),
  xylo: SVG([[8, 46], [20, 38], [32, 30], [44, 22]].map(([x, hgt]) => `<rect x="${x}" y="${32 - hgt / 2}" width="10" height="${hgt}" rx="3" fill="#2F6F4E" ${INK}/>`).join('')),
};

const ASK = '잘 들어요 — 어느 악기 소리일까요?';
const SUB = { piano: '건반을 눌러요', recorder: '입으로 불어요', violin: '줄을 활로 그어요', xylo: '채로 두드려요' };
const cell = pickCell({
  friend: 'bear',
  keys: INSTS,
  label: k => instName(k),
  chip: k => CHIP[k],
  rightOf: row => row.ans,
  build,
  names: () => ['가락'],
  say: {
    show: () => '악기마다 소리가 달라요. 네 악기를 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 어느 악기인지 골라요',
  },
  wrong,
  note: () => '컴퓨터로 만든 악기 소리예요',
  EX: () => INSTS.map(k => ({ title: instName(k), sub: SUB[k], row: { kind: 'plain', ans: k } })),
  pool: [
    { kind: 'plain', ans: 'piano' },
    { kind: 'plain', ans: 'recorder' },
    { kind: 'plain', ans: 'violin' },
    { kind: 'plain', ans: 'xylo' },
    { kind: 'high', ans: 'recorder' },
    { kind: 'tune', tune: 'B', ans: 'violin' },
  ],
  passText: '세 번 이어서 악기 이름을 맞혔어요',
  game: { title: '악기 이름 맞히기', sub: () => '한 악기가 가락을 연주해요. 피아노 · 리코더 · 바이올린 · 실로폰 가운데 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
