// 반2 처음으로 · 𝄋로 · 끝 — D.C. · Fine · D.S. · 코다(11-14 · 묶음 C · 흐름 f8 · 난이도 4)
//  여섯 마디를 들은 차례와 같은 길이 그려진 카드를 셋 가운데 고른다. 카드 = 마디 상자 줄(_road.js — 기호 밑에 우리말 작은 글: 처음으로 · 끝 · 𝄋로 · ⊕로)
//  D.C. · D.S. 카드 안에는 도돌이표를 넣지 않는다(돌아간 뒤 도돌이를 다시 하는지는 관례가 갈림 · 설계서 §E)
//  마디 = 두 박 동기(이 칸에서 만든 것 · 있는 노래 X) · BEAT 0.3 · 연주 차례는 늘 여섯 마디(3.6초) — 카드가 짧아도 길어도 소리 길이가 같다
//  차례: 소개(D.C.와 Fine · 도돌이표 카드와 견줌) → 발전(D.S.와 𝄋) → 비틀기(코다로 건너뛰기) → 섞어서
//  10번 판은 코다 없는 카드가 답(D.S.) — 기호가 많은 카드를 고르는 봇을 막음
//  설계서 표에서 바꾼 것: 5번 판 카드 자리(DC1 DS2 DS1 · 답 셋째) · 9번 판(CO1 CO2 DC2 · 답 둘째 = D.C. al Coda) · 10번 · 11번 판 카드 자리 — '기호가 가장 많은 카드' 봇 · 단계 꼴 봇이 별 13%여서
//  ⚠ D.C. al Fine · D.S. al Coda 읽는 차례는 일반 악전(저장소 · 사실 파일 근거 없음 — 설계서 §F 7)
//  ⚠ 성취기준 표시(std)는 형1 것을 그대로 옮겼다(설계서 batchC §F 6 — 원문으로 다시 판정하지 않음)
//  ⚠ 소리는 컴퓨터로 만든 피아노 소리(app/js/audio.js)
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js) · 판마다 다른 단추 카드(cards)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { ROAD_BEAT, ROAD_KEYS, ROAD_ORD, roadFlip, roadCards, roadMelody, roadHeard, roadOrder } from './_road.js';

// 판 — set 카드 셋(_road.js ROAD_CARDS 이름) · ans 답 카드 자리(섞을 때 다음 카드로 옮김)
export const PLAN = [
  { stage: 'intro', kind: 'dc', set: ['DC1', 'DC2', 'R1'], ans: 0 },
  { stage: 'intro', kind: 'dc', set: ['R1', 'DC1', 'DC2'], ans: 2 },
  { stage: 'intro', kind: 'dc', set: ['DC2', 'R1', 'DC1'], ans: 1 },
  { stage: 'grow', kind: 'ds', set: ['DS1', 'DC1', 'DS2'], ans: 2 },
  { stage: 'grow', kind: 'ds', set: ['DC1', 'DS2', 'DS1'], ans: 2 },
  { stage: 'grow', kind: 'ds', set: ['DS2', 'DS1', 'DC2'], ans: 0 },
  { stage: 'twist', kind: 'coda', set: ['CO1', 'CO2', 'DS1'], ans: 1 },
  { stage: 'twist', kind: 'coda', set: ['CO1', 'DC1', 'CO2'], ans: 0 },
  { stage: 'twist', kind: 'coda', set: ['CO1', 'CO2', 'DC2'], ans: 1 },
  { stage: 'twist', kind: 'coda', set: ['DS1', 'DC1', 'CO1'], ans: 0 },
  { stage: 'end', kind: 'coda', set: ['DC2', 'DS2', 'CO2'], ans: 1 },
  { stage: 'end', kind: 'coda', set: ['CO2', 'DC1', 'CO1'], ans: 2 },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: roadFlip, answerOf: p => ROAD_KEYS[p.ans] };

const build = row => [{ lines: [line(roadMelody(row), { inst: 'piano', vel: 0.6, beat: ROAD_BEAT })], cap: '' }];
const WHY = { DC: ' · D.C.에서 처음으로 돌아가 Fine에서 끝났어요', DS: ' · D.S.에서 𝄋로 돌아갔어요', CO: ' · ⊕에서 코다로 건너뛰었어요' };
const wrong = row => roadHeard(row) + (WHY[row.set[row.ans].slice(0, 2)] || '');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례(판에 놓인 카드로 가름: 코다 카드가 있으면 코다 · D.S. 카드가 있으면 D.S. · 그 밖은 D.C.)
export const TIPS_TV = ['D.C.와 Fine', 'D.S.와 𝄋', '코다로 건너뛰기'];
export const tipKind = p => (p.set.some(c => c.startsWith('CO')) ? 2 : p.set.some(c => c.startsWith('DS')) ? 1 : 0);
export function tipOf(plan, results) {
  const miss = g => plan.filter((p, k) => results[k] === false && tipKind(p) === g).length;
  return factTip(results, [
    { n: miss(0), text: 'D.C. 카드에서 다르게 고른 적이 있어요. D.C.를 만나면 처음으로 돌아가 Fine에서 끝나요.' },
    { n: miss(1), text: 'D.S. 카드에서 다르게 고른 적이 있어요. D.S.를 만나면 𝄋 표가 있는 마디로 돌아가요.' },
    { n: miss(2), text: '코다 카드에서 다르게 고른 적이 있어요. 돌아간 뒤 To Coda를 만나면 ⊕ 마디로 건너뛰어요.' },
  ], 'D.C. · D.S. · 코다를 따라 들은 차례를 찾았어요.');
}
// 헷갈리는 두 소리 — 처음으로 돌아감 ↔ 𝄋로 돌아감(1 2 3 4 1 2 ↔ 1 2 3 4 2 3)
export const NEAR = [
  { label: '1 2 3 4 1 2', low: null, play: nearSegs(build({ set: ['DC1'], ans: 0 })) },
  { label: '1 2 3 4 2 3', low: null, play: nearSegs(build({ set: ['DS1'], ans: 0 })) },
];

const ASK = () => '들어요 — 들은 차례는 어느 카드인가요?';
const ex = (title, name) => ({ title, sub: roadOrder(name).join(' '), row: { set: [name], ans: 0 } });
const cell = pickCell({
  friend: 'turtle',
  keys: ROAD_KEYS,
  label: k => ROAD_ORD[ROAD_KEYS.indexOf(k)],
  cards: roadCards,
  rightOf: row => ROAD_KEYS[row.ans],
  build,
  names: () => ['노래'],
  say: {
    show: lo => (lo ? '돌아가는 표시가 여러 가지예요. 눌러서 들어 봐요.' : 'D.C.는 처음으로, D.S.는 𝄋 표로 돌아가요. Fine에서 끝나요. ⊕를 만나면 코다로 건너뛰어요.'),
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 들은 차례와 같은 카드를 골라요',
  },
  wrong,
  EX: () => [ex('D.C.와 Fine', 'DC1'), ex('D.S.와 𝄋', 'DS1'), ex('코다로 건너뛰기', 'CO1'), { ...ex('도돌이표', 'R1'), sub: '도돌이표와 견줘요 · ' + roadOrder('R1').join(' ') }],
  note: () => '컴퓨터로 만든 피아노 소리예요',
  pool: [PLAN[0], PLAN[2], PLAN[3], PLAN[4], PLAN[6], PLAN[7], PLAN[8]],
  passText: '세 번 이어서 D.C. · D.S. 카드를 찾았어요',
  game: { title: '처음으로 · 𝄋로 · 끝', sub: () => '여섯 마디를 들려줘요. 들은 차례와 같은 길이 그려진 카드를 골라요. 기호 밑 작은 글이 어디로 가는지 알려 줘요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
