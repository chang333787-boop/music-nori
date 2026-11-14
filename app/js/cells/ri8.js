// 리8 리듬 카드 찾기 ① — 16분음표 · 셋잇단 · 붙임줄(11-14 · 묶음 C · 흐름 r7 붙임줄 · r9 16분음표 · 셋잇단음표)
//  박 하나를 넷 · 셋으로 쪼개고, 두 음을 붙임줄로 잇는다. '하나 둘' 두 박을 센 뒤 네 박 리듬이 나오고, 판마다 다른 리듬 카드 셋 가운데
//   들은 리듬과 같은 카드를 고른다(쪼갠 수와 이은 자리를 귀로 가려냄).
//  차례: 소개 16분 넷 → 발전 16분 섞임(♬♪ · ♪♬) · 8분쉼표 → 비틀기 붙임줄 둘 · 셋잇단 둘 → 마무리 섞어서
//  한 판의 카드 셋은 소리가 모두 다르다(붙임줄 ♩‿♩와 2분음표 같은 짝을 한 판에 두지 않음 — tests/pick/ri8.mjs).
//  리듬은 이 칸에서 만든 것(있는 노래를 쓰지 않음) · 소리는 컴퓨터로 만든 실로폰 · 하이햇.
//  ⚠ std는 리5 것을 그대로 옮김(설계서 §C) — 원문으로 다시 판정하지 못함. 16분음표 학년 근거는 flow r9 글대로 찾지 못함.
//  ⚠ 귀로 확인 못 함: 16분(0.125초)이 실로폰으로 크롬북 스피커에서 또렷한지.
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { glyph } from './_glyph.js';
import { beatsOf, buildCard, flipCard, ansKey, KEYS, NTH } from './_rcard.js';

// 판 — kind: k16(16분) · rest(8분쉼표) · tie(붙임줄) · trip(셋잇단) · mix(섞어서 — grp가 tip 갈래)
export const PLAN = [
  { stage: 'intro', kind: 'k16', set: ['q s4 q q', 'q q s4 q', 'q q q s4'], ans: 1 },
  { stage: 'intro', kind: 'k16', set: ['s4 q e2 q', 'e2 q s4 q', 'q s4 q e2'], ans: 0 },
  { stage: 'intro', kind: 'k16', set: ['e2 e2 s4 q', 's4 e2 e2 q', 'e2 s4 e2 q'], ans: 2 },
  { stage: 'grow', kind: 'k16', set: ['q s2e q q', 'q es2 q q', 'q s4 q q'], ans: 0 },
  { stage: 'grow', kind: 'rest', set: ['q er q q', 'q re q q', 'q e2 q q'], ans: 1 },
  { stage: 'grow', kind: 'rest', set: ['es2 q re q', 's2e q er q', 'es2 q er q'], ans: 2 },
  { stage: 'twist', kind: 'tie', set: ['q q~q q', 'q q q q', 'q~q q q'], ans: 0 },
  { stage: 'twist', kind: 'tie', set: ['q e2 q q', 'q e2~q q', 'q q q q'], ans: 1 },
  { stage: 'twist', kind: 'trip', set: ['q e2 q q', 'q s4 q q', 'q trip q q'], ans: 2 },
  { stage: 'twist', kind: 'trip', set: ['trip q e2 q', 'e2 q trip q', 'trip q trip q'], ans: 0 },
  { stage: 'end', kind: 'mix', grp: 'tie', set: ['q s2e q~q', 'q es2 q~q', 'q s2e q q'], ans: 1 },
  { stage: 'end', kind: 'mix', grp: 'trip', set: ['trip q er q', 'e2 q er q', 'trip q re q'], ans: 2 },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: flipCard, answerOf: ansKey };
// 그 판에 새로 나온 꼴(카드 꼴 봇 · 덧검사가 씀)
export const NEW = { k16: ['s4', 's2e', 'es2'], rest: ['er', 're'], tie: ['~'], trip: ['trip'], mix: ['~', 'trip', 's2e', 'es2', 'er', 're'] };
const grp = p => p.grp || p.kind;

const SAY_K = { k16: ' · 한 박에 네 음이 났어요', rest: ' · 쉼표 자리는 소리가 없어요', tie: ' · 붙임줄로 이은 두 음은 한 번만 소리 나요', trip: ' · 한 박에 세 음이 고르게 났어요' };
const wrong = row => `${NTH[row.ans]} 카드였어요${SAY_K[grp(row)] || ''}`;

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['16분음표 자리', '붙임줄로 이은 소리', '셋잇단음표'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(grp(p))).length;
  return factTip(results, [
    { n: miss(g => g === 'k16' || g === 'rest'), text: '16분음표 · 쉼표가 든 카드를 헷갈렸어요. 한 박에 소리가 몇 개 났는지, 소리가 빈 자리가 어디인지 박을 세며 들어 봐요.' },
    { n: miss(g => g === 'tie'), text: '붙임줄 카드를 헷갈렸어요. 붙임줄로 이은 두 음은 한 번만 소리 나고 길게 이어져요.' },
    { n: miss(g => g === 'trip'), text: '셋잇단음표 카드를 헷갈렸어요. 셋잇단은 한 박에 세 음이 고르게 나요 — 16분(넷)보다 하나 적어요.' },
  ], '쪼갠 수와 이은 자리를 듣고 같은 카드를 골랐어요.');
}

const card = (text, k, lo) => ({ key: KEYS[k], label: NTH[k], chip: glyph(beatsOf(text), { label: `${NTH[k]} 카드` }), tv: NTH[k] });
export const cards = (row, lo) => row.set.map((t, k) => card(t, k, lo));
const one = t => ({ set: [t], ans: 0 });

// 헷갈리는 두 소리 — ♬♪(16-16-8) ↔ ♪♬(8-16-16)
export const NEAR = [
  { label: '앞이 촘촘해요(♬♪)', play: nearSegs(buildCard({ set: PLAN[3].set, ans: 0 })) },
  { label: '뒤가 촘촘해요(♪♬)', play: nearSegs(buildCard({ set: PLAN[3].set, ans: 1 })) },
];

const ASK = lo => (lo ? '들어요 — 같은 카드는 어느 것인가요?' : '들어요 — 들은 리듬은 어느 카드인가요?');
const cell = pickCell({
  friend: 'hog',
  keys: KEYS,
  label: k => NTH[KEYS.indexOf(k)],
  cards,
  rightOf: ansKey,
  build: buildCard,
  names: () => ['준비', '리듬'],
  say: {
    show: lo => (lo ? '박 하나에 소리가 넷, 셋 들어갈 수 있어요. 눌러서 들어 봐요.' : '박 하나를 넷으로, 셋으로 나눌 수 있어요. 붙임줄로 이은 두 음은 한 번만 소리 나요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 같은 리듬 카드를 골라요',
  },
  wrong,
  note: () => '컴퓨터로 만든 소리예요 · 작은 소리는 박이에요',
  EX: lo => [
    { title: '네 박', sub: '박마다 소리 하나', row: one('q q q q') },
    { title: lo ? '한 박에 넷' : '16분음표 넷', sub: '박 하나에 소리 넷', row: one('q s4 q q') },
    { title: lo ? '이어서 길게' : '붙임줄', sub: '이은 두 음은 한 번만 소리 나요', row: one('q~q q q') },
    { title: lo ? '한 박에 셋' : '셋잇단음표', sub: '박 하나에 소리 셋', row: one('q trip q q') },
  ],
  pool: [PLAN[0], PLAN[1], PLAN[3], PLAN[4], PLAN[6], PLAN[8]],
  passText: '세 번 이어서 같은 리듬 카드를 골랐어요',
  game: { title: '리듬 카드 찾기', sub: () => '두 박을 센 뒤 네 박 리듬이 나와요. 같은 리듬 카드를 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
