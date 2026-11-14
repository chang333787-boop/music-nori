// 음2 관악기·현악기(부는 악기·줄 악기) — 음색 칸(11-14 · 흐름 e4)
//  소6(같은 악기인지)에서 가려낸 귀로, 이번에는 **소리 내는 방법**으로 나눈다: 입으로 불어서 소리 내는 관악기 ↔ 줄로 소리 내는 현악기.
//   한 판 = 도막 하나 · 같은 가락(솔 미 솔―)을 답에 따라 관악기 또는 현악기가 연주한다(가락 · 길이는 늘 같음 → 열리는 때로 답이 새지 않음).
//  차례: 뚜렷한 짝(리코더 · 플루트 · 클라리넷 ↔ 바이올린 · 첼로) → 금관(트럼펫 · 호른) · 줄을 뜯는 하프
//   → 비틀기 '높이가 달라진 판'(한 옥타브 아래 호른 · 첼로 / 위 플루트 · 바이올린) → 섞어서
//  관 = recorder flute clarinet oboe trumpet horn · 현 = violin cello harp(피아노는 쓰지 않음 — 줄을 망치로 치는 악기라 이 칸의 두 갈래에 넣지 않음)
//  ⚠ 악기 소리는 모두 컴퓨터로 만든 소리다(app/js/audio.js) — 보기 화면에 그렇게 적는다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs, instName } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

const MOTIF = [[67, 1], [64, 1], [67, 2]];          // 솔 미 솔― (소6과 같은 가락)
export const WIND = ['recorder', 'flute', 'clarinet', 'oboe', 'trumpet', 'horn'];
export const STRING = ['violin', 'cello', 'harp'];
const SHIFT = { low: -12, high: 12 };
const VEL = 0.62;

// 판 — w 관악기일 때의 악기 · s 현악기일 때의 악기 · ans = wind | string(섞을 때 뒤집힘)
//  kind: plain | brass(w = 트럼펫 · 호른) | pluck(s = 하프) | low(한 옥타브 아래 · 호른 | 첼로) | high(한 옥타브 위 · 플루트 | 바이올린)
export const PLAN = [
  { stage: 'intro', kind: 'plain', w: 'recorder', s: 'violin', ans: 'wind' },
  { stage: 'intro', kind: 'plain', w: 'clarinet', s: 'violin', ans: 'string' },
  { stage: 'intro', kind: 'plain', w: 'flute', s: 'cello', ans: 'wind' },
  { stage: 'grow', kind: 'plain', w: 'oboe', s: 'violin', ans: 'string' },
  { stage: 'grow', kind: 'brass', w: 'trumpet', s: 'violin', ans: 'wind' },
  { stage: 'grow', kind: 'pluck', w: 'clarinet', s: 'harp', ans: 'string' },
  { stage: 'twist', kind: 'low', w: 'horn', s: 'cello', ans: 'wind' },
  { stage: 'twist', kind: 'high', w: 'flute', s: 'violin', ans: 'string' },
  { stage: 'twist', kind: 'brass', w: 'horn', s: 'cello', ans: 'wind' },
  { stage: 'twist', kind: 'pluck', w: 'oboe', s: 'harp', ans: 'string' },
  { stage: 'end', kind: 'high', w: 'flute', s: 'violin', ans: 'wind' },
  { stage: 'end', kind: 'low', w: 'horn', s: 'cello', ans: 'string' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'wind' ? 'string' : 'wind' }), answerOf: p => p.ans };

const instOf = row => (row.ans === 'wind' ? row.w : row.s);
const CAP = { low: '낮게', high: '높게' };
function build(row) {
  return [{ lines: [line(MOTIF, { inst: instOf(row), vel: VEL, shift: SHIFT[row.kind] || 0 })], cap: CAP[row.kind] || '' }];
}
const HOW = inst => (WIND.includes(inst) ? '입으로 불어서 소리 내요' : inst === 'harp' ? '줄을 뜯어서 소리 내요' : '줄을 활로 그어서 소리 내요');
const wrong = row => `${instName(instOf(row))} — ${HOW(instOf(row))}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['줄을 뜯는 하프', '트럼펫 · 호른', '높이가 달라진 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'pluck' && p.ans === 'string'), text: '하프 소리를 관악기로 고른 적이 있어요. 하프는 줄을 뜯어서 소리 내는 현악기예요.' },
    { n: miss(p => p.kind === 'brass' && p.ans === 'wind'), text: '트럼펫 · 호른 소리를 현악기로 고른 적이 있어요. 트럼펫 · 호른은 입으로 불어서 소리 내는 관악기예요.' },
    { n: miss(p => p.kind === 'low' || p.kind === 'high'), text: '높이가 달라진 판에서 고른 것이 달랐어요. 높은 소리든 낮은 소리든 소리 내는 방법을 들어 봐요.' },
  ], '높이가 달라져도 소리 내는 방법을 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 둘 다 낮게 이어지는 소리(호른 ↔ 첼로)
export const NEAR = [
  { label: '호른 · 관악기', low: '호른 · 부는 악기', play: nearSegs(build({ kind: 'low', w: 'horn', s: 'cello', ans: 'wind' })) },
  { label: '첼로 · 현악기', low: '첼로 · 줄 악기', play: nearSegs(build({ kind: 'low', w: 'horn', s: 'cello', ans: 'string' })) },
];

// 단추 그림 — 관 = 구멍 난 긴 관 · 현 = 몸통 위 줄 넷
const CHIP = k => (k === 'wind'
  ? '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="25" width="48" height="14" rx="6" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.6"/>'
    + [22, 32, 42].map(x => `<circle cx="${x}" cy="32" r="3" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="1.8"/>`).join('') + '</svg>'
  : '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="10" width="36" height="44" rx="14" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="2.6"/>'
    + [25, 30, 35, 40].map(x => `<line x1="${x}" y1="14" x2="${x}" y2="50" stroke="#2F6F4E" stroke-width="2.4"/>`).join('') + '</svg>');

const W = lo => (lo ? '부는 악기' : '관악기'), S = lo => (lo ? '줄 악기' : '현악기');
const ASK = lo => `잘 들어요 — ${W(lo)}일까요, ${S(lo)}일까요?`;
const ROW = (ans, w, s, kind = 'plain') => ({ kind, w, s, ans });
const cell = pickCell({
  friend: 'bear',
  keys: ['wind', 'string'],
  label: (k, lo) => (k === 'wind' ? W(lo) : S(lo)),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['가락'],
  say: {
    show: lo => (lo ? '입으로 부는 악기와 줄로 소리 내는 악기가 있어요. 눌러서 들어 봐요.'
      : '입으로 불어서 소리 내면 관악기, 줄로 소리 내면 현악기예요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => `TV 소리를 듣고 — ${W(lo)}인지 ${S(lo)}인지 골라요`,
  },
  wrong,
  note: () => '컴퓨터로 만든 악기 소리예요',
  EX: lo => [
    { title: '리코더', sub: '입으로 불어요', row: ROW('wind', 'recorder', 'violin') },
    { title: '바이올린', sub: '줄을 활로 그어요', row: ROW('string', 'recorder', 'violin') },
    { title: '트럼펫', sub: `입으로 불어요 · ${W(lo)}예요`, row: ROW('wind', 'trumpet', 'harp', 'brass') },
    { title: '하프', sub: `줄을 뜯어요 · ${S(lo)}예요`, row: ROW('string', 'trumpet', 'harp', 'pluck') },
  ],
  pool: [
    ROW('wind', 'recorder', 'violin'),
    ROW('string', 'flute', 'cello'),
    ROW('wind', 'trumpet', 'violin', 'brass'),
    ROW('string', 'clarinet', 'harp', 'pluck'),
    ROW('wind', 'horn', 'cello', 'low'),
    ROW('string', 'flute', 'violin', 'high'),
  ],
  passText: '세 번 이어서 소리 내는 방법을 가려냈어요',
  game: {
    title: '부는 악기 줄 악기',
    sub: lo => `한 악기가 가락을 연주해요. ${W(lo)}인지 ${S(lo)}인지 골라요.`,
  },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
