// 반1 되풀이 길 찾기 — 도돌이표 · 1 · 2번 괄호(11-14 · 묶음 C · 흐름 f4 · f5 · 난이도 3)
//  여섯 마디를 들은 차례와 같은 길이 그려진 카드를 셋 가운데 고른다. 카드 = 마디 상자 줄(_road.js — 상자마다 번호 + 그 마디 가락의 높낮이 점)
//  마디 = 두 박 동기(이 칸에서 만든 것 · 있는 노래 X) · BEAT 0.3 · 연주 차례는 늘 여섯 마디(3.6초) — 카드가 짧아도 길어도 소리 길이가 같다
//  차례: 소개(도돌이표 자리만 다름) → 발전(되돌아가는 길이 · 되풀이 없는 카드) → 비틀기(1 · 2번 괄호) → 섞어서
//  5번 판은 되풀이 없는 카드 · 9번 판은 괄호 없는 카드가 답 — 기호가 많은 카드를 고르는 봇을 막음
//  ⚠ 성취기준 표시(std)는 형1 것을 그대로 옮겼다(설계서 batchC §F 6 — 원문으로 다시 판정하지 않음)
//  ⚠ 소리는 컴퓨터로 만든 피아노 소리(app/js/audio.js)
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js) · 판마다 다른 단추 카드(cards)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { ROAD_BEAT, ROAD_KEYS, ROAD_ORD, roadFlip, roadCards, roadMelody, roadHeard, roadOrder } from './_road.js';

// 판 — set 카드 셋(_road.js ROAD_CARDS 이름) · ans 답 카드 자리(섞을 때 다음 카드로 옮김)
export const PLAN = [
  { stage: 'intro', kind: 'place', set: ['R1', 'R2', 'R3'], ans: 1 },
  { stage: 'intro', kind: 'place', set: ['R3', 'R1', 'R2'], ans: 0 },
  { stage: 'intro', kind: 'place', set: ['R2', 'R3', 'R1'], ans: 2 },
  { stage: 'grow', kind: 'len', set: ['R4', 'R1', 'P6'], ans: 0 },
  { stage: 'grow', kind: 'len', set: ['R5', 'P6', 'R3'], ans: 1 },
  { stage: 'grow', kind: 'len', set: ['R1', 'R4', 'R5'], ans: 2 },
  { stage: 'twist', kind: 'volta', set: ['V1', 'R1', 'V2'], ans: 0 },
  { stage: 'twist', kind: 'volta', set: ['R2', 'V3', 'V1'], ans: 1 },
  { stage: 'twist', kind: 'volta', set: ['V2', 'V1', 'R1'], ans: 2 },
  { stage: 'twist', kind: 'volta', set: ['V3', 'V2', 'R3'], ans: 1 },
  { stage: 'end', kind: 'volta', set: ['R5', 'V3', 'R4'], ans: 0 },
  { stage: 'end', kind: 'volta', set: ['V1', 'R2', 'V2'], ans: 2 },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: roadFlip, answerOf: p => ROAD_KEYS[p.ans] };

const build = row => [{ lines: [line(roadMelody(row), { inst: 'piano', vel: 0.6, beat: ROAD_BEAT })], cap: '' }];
const wrong = row => roadHeard(row) + (row.set[row.ans][0] === 'V' ? ' · 돌아온 뒤에는 2번 괄호로 건너뛰어요' : '');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례(소개 · 발전 · 비틀기와 마무리)
export const TIPS_TV = ['도돌이표 자리', '되풀이 없는 카드', '1 · 2번 괄호'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'place'), text: '도돌이표 자리만 다른 카드에서 다르게 고른 적이 있어요. 어느 마디부터 다시 하는지 들어요.' },
    { n: miss(p => p.kind === 'len'), text: '되돌아가는 길이가 다른 카드에서 다르게 고른 적이 있어요. 몇 마디를 다시 하는지, 다시 하지 않는지 들어요.' },
    { n: miss(p => p.kind === 'volta'), text: '1 · 2번 괄호 카드에서 다르게 고른 적이 있어요. 돌아온 뒤에는 1번 괄호를 건너뛰고 2번 괄호로 가요.' },
  ], '도돌이표와 1 · 2번 괄호를 따라 들은 차례를 찾았어요.');
}
// 헷갈리는 두 소리 — 도돌이표 자리만 다른 두 길(1 2 1 2 3 4 ↔ 1 2 3 2 3 4)
export const NEAR = [
  { label: '1 2 1 2 3 4', low: null, play: nearSegs(build({ set: ['R1'], ans: 0 })) },
  { label: '1 2 3 2 3 4', low: null, play: nearSegs(build({ set: ['R2'], ans: 0 })) },
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
    show: lo => (lo ? '돌아가는 표시를 만나면 한 번 더 해요. 눌러서 들어 봐요.' : '도돌이표를 만나면 앞으로 돌아가 한 번 더 해요. 1번 괄호는 처음에, 2번 괄호는 돌아온 뒤에 연주해요.'),
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 들은 차례와 같은 카드를 골라요',
  },
  wrong,
  EX: () => [ex('도돌이표', 'R1'), ex('세 마디 되풀이', 'R4'), ex('되풀이 없음', 'P6'), ex('1 · 2번 괄호', 'V1')],
  note: () => '컴퓨터로 만든 피아노 소리예요',
  pool: [PLAN[0], PLAN[1], PLAN[3], PLAN[4], PLAN[6], PLAN[7], PLAN[9]],
  passText: '세 번 이어서 들은 차례와 같은 카드를 찾았어요',
  game: { title: '되풀이 길 찾기', sub: () => '여섯 마디를 들려줘요. 들은 차례와 같은 길이 그려진 카드를 골라요. 상자 안 점은 그 마디 가락의 높낮이예요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
