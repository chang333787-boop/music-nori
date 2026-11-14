// 형5 느리게 다음 빠르게(긴자진 형식) — 형식 칸(11-14 · 묶음 C · 흐름 f7 · 듣고 고르기 틀)
//  쓰는 사실(국악 사실 장부 11-14):
//   · 긴자진 형식은 느린 노래를 부르고 이어서 빠른 노래를 부르는 짜임 · 우리 음악에서 '긴'은 느리게, '자진'은 빠르게라는 뜻(미래엔 5학년 · 2015)
//   · 가락은 비슷한데 빨라진다(미래엔 5학년 '한배의 변화') → 빠른 쪽은 같은 동기를 이어서 낸다
//   · 반주가 복잡할수록 빨라짐을 알아채기 어렵고 기본박만 칠 때 더 잘 알아챈다(김유진 2018) → 소개는 기본박만 · 장단 반주 판은 발전부터
//   · 시조는 초장 · 중장 · 종장 세 부분 · 아주 느리게 · 무릎장단(5박 덩 · 덕 쿵 덕 · 8박 덩 · 덕 쿵 · 쿵 덕 쿵 — 미래엔 6학년 한 곳)
//  한 판 = 도막 하나(다섯 박) — 그 안에서 빠르기가 바뀌는지(느리게 → 빠르게) 그대로인지 고른다.
//   세기 · 음 수 · 가락 · 반주가 바뀌어도 빠르기만 듣는다(비틀기 판은 한 판에 한 가지 · 뒤집어도 같은 비틀기).
//   '빠르게 → 느리게'는 단추로 두지 않는다(이름 없는 짜임을 단추로 만들지 않음 — 설계서 §E).
//  길이로 답이 새지 않게: 긴자진 판(느린 두 박 + 빠른 세 박)과 그대로 판(다섯 박)은 길이가 같다 — 그대로 판의 박 = 긴자진 판 길이 ÷ 5.
//   폭 큰 판 ♩.=72 → 108(그대로 = 박 0.667초 · 약 90) · 폭 작은 판 76 → 99(그대로 = 박 0.679초 · 약 88)
//   빠르기 숫자는 모두 앱이 정한 값 — 느린 쪽 72 · 76은 굿거리 범위(국악아카데미 66~90) 안 · ⚠ 빠른 쪽(108 · 99)은 자진모리 빠르기 출처를 확인하지 못함(장1은 100)
//   ⚠ 시조 보기 카드의 박 1.0초도 앱이 정한 값(한배 수치 출처 없음) · 무릎장단 칸 자리는 미래엔 한 곳에서만 확인
//  가락은 이 칸에서 만든 것(솔 라 · 높은 도 라 동기) · 곡 이름(〈칭칭이 소리〉 등) · 율명 · 토리 이름은 쓰지 않는다(2022 교과서 확인 못 함)
//  ⚠ 귀로 확인하지 못한 것: 폭 작은 판(76 → 99)이 아이 귀에 '빨라짐'으로 들리는지 · 장단 반주 위 가야금 가락이 또렷한지
//  ⚠ 성취기준(std)은 형1 것을 옮겼다(설계서) — 5~6학년 '형식(긴자진 형식 …)' 칸에 맞는지 확인 못 함
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { jangLine, GG } from './jd2.js';

// 박 길이(초) — 폭마다 [느린 박, 빠른 박] · 그대로 판은 그 둘로 만든 다섯 박 길이 ÷ 5
const W = { big: [60 / 72, 60 / 108], small: [60 / 76, 60 / 99] };
export const beatsOf = row => {
  const [a, b] = W[row.w];
  return row.ans === 'gin' ? [a, a, b, b, b] : Array(5).fill((2 * a + 3 * b) / 5);
};
// 가락 — 박마다 [[음, 소박 수], …] · 느린 쪽 동기 A(두 박)를 빠른 쪽에서 이어서 냄
const A1 = [[67, 2], [69, 1]], A2 = [[72, 2], [69, 1]];
const MEL = {
  base: [A1, A2, A1, A2, A1],
  dense: [A1, A2, [[67, 1], [69, 1], [67, 1]], [[72, 1], [69, 1], [72, 1]], [[67, 1], [64, 1], [67, 1]]],   // 뒤 셋 박 = 소박마다 음
  tune: [A1, A2, [[64, 2], [62, 1]], [[60, 2], [62, 1]], [[64, 2], [62, 1]]],                             // 뒤 셋 박 = 다른 가락(리듬은 그대로)
};
const MEL_V = 0.55, KUNG_V = 0.7, LOUD = 1.6;
const late = j => j >= 2;                                               // 뒤 셋 박

// 판 — kind: beat(기본박 쿵) | jang(굿거리 장단 반주) | loud(뒤 셋 박 크게) | dense(뒤 셋 박 촘촘) | tune(뒤 셋 박 다른 가락)
//  w: big | small(빠르기 폭) · ans: gin | same(섞을 때 뒤집힘 — kind · w는 그대로)
export const PLAN = [
  { stage: 'intro', kind: 'beat', w: 'big', ans: 'gin' },
  { stage: 'intro', kind: 'beat', w: 'big', ans: 'same' },
  { stage: 'intro', kind: 'beat', w: 'big', ans: 'gin' },
  { stage: 'grow', kind: 'beat', w: 'small', ans: 'same' },
  { stage: 'grow', kind: 'beat', w: 'small', ans: 'gin' },
  { stage: 'grow', kind: 'jang', w: 'big', ans: 'same' },
  { stage: 'twist', kind: 'loud', w: 'big', ans: 'same' },
  { stage: 'twist', kind: 'dense', w: 'big', ans: 'gin' },
  { stage: 'twist', kind: 'tune', w: 'big', ans: 'same' },
  { stage: 'twist', kind: 'jang', w: 'small', ans: 'gin' },
  { stage: 'end', kind: 'dense', w: 'small', ans: 'same' },
  { stage: 'end', kind: 'loud', w: 'small', ans: 'gin' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'gin' ? 'same' : 'gin' }), answerOf: p => p.ans };

// 시조 무릎장단(보기 카드만 · 게임 판 X) — 박 단위 · 박 1.0초(앱이 정함)
const SJ5 = ['deong', null, 'deok', 'kung', 'deok'];
const SJ8 = ['deong', null, 'deok', 'kung', null, 'kung', 'deok', 'kung'];

function build(row) {
  if (row.sijo) return [
    { lines: [jangLine(SJ5, 1.0, { acc: [] })], cap: '덩 · 덕 쿵 덕', gap: 0.6 },
    { lines: [jangLine(SJ8, 1.0, { acc: [] })], cap: '덩 · 덕 쿵 · 쿵 덕 쿵' },
  ];
  const bs = beatsOf(row), mul = j => (row.kind === 'loud' && late(j) ? LOUD : 1);
  const mel = (MEL[row.kind] || MEL.base).flatMap((notes, j) => notes.map(([p, n]) => {
    const sub = bs[j] / 3;
    return { p, d: n * sub * 0.92, gap: n * sub * 0.08, vel: Math.min(1, MEL_V * mul(j)), inst: 'gayageum' };
  }));
  const beat = row.kind === 'jang'
    ? jangLine(Array.from({ length: 15 }, (_, i) => GG[i % 12]), i => bs[Math.floor(i / 3)] / 3)
    : bs.map((b, j) => ({ drum: 'kung', d: b * 0.3, gap: b * 0.7, vel: Math.min(1, KUNG_V * mul(j)) }));
  return [{ lines: [beat, mel], cap: row.ans === 'gin' ? '느리게 → 빠르게' : '빠르기 그대로' }];
}
const wrong = row => (row.ans === 'gin' ? '느리게 부르다가 빠르게 이어 불렀어요(긴자진)'
  : '빠르기가 그대로였어요' + ({ loud: ' · 세기만 달라졌어요', dense: ' · 음만 촘촘해졌어요', tune: ' · 가락만 달라졌어요' }[row.kind] || ''));

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['세기만 커진 소리', '음만 촘촘해진 소리', '장단 반주 위 빨라짐'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'loud'), text: '뒤쪽이 커진 소리에서 다르게 고른 적이 있어요. 커지는 것과 빨라지는 것은 달라요 — 쿵 소리가 오는 사이를 들어요.' },
    { n: miss(p => p.kind === 'dense'), text: '뒤쪽 음이 촘촘해진 소리에서 다르게 고른 적이 있어요. 음이 많아져도 쿵 소리 사이가 그대로면 빠르기도 그대로예요.' },
    { n: miss(p => p.kind === 'jang'), text: '장단 반주가 있는 소리에서 다르게 고른 적이 있어요. 덩 · 쿵이 오는 사이가 짧아지는지 들어요.' },
  ], '세기 · 음 수 · 가락이 바뀌어도 빠르기만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 길이 · 같은 가락의 긴자진(폭 큰 판) ↔ 그대로
export const NEAR = [
  { label: '느리게 다음 빠르게', play: nearSegs(build({ kind: 'beat', w: 'big', ans: 'gin' })) },
  { label: '빠르기 그대로', play: nearSegs(build({ kind: 'beat', w: 'big', ans: 'same' })) },
];

// 단추 그림 — 점 다섯(박): 긴자진 = 앞 둘은 넓게 · 뒤 셋은 좁게 / 그대로 = 고르게
const DOT = x => `<circle cx="${x}" cy="32" r="5.2" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.2"/>`;
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${(k === 'gin' ? [7, 23, 39, 48, 57] : [8, 20, 32, 44, 56]).map(DOT).join('')}</svg>`;

const ASK = '들어요 — 느리게 다음 빠르게일까요, 빠르기 그대로일까요?';
const cell = pickCell({
  friend: 'turtle',
  keys: ['gin', 'same'],
  label: (k, lo) => (k === 'gin' ? (lo ? '느리게 → 빠르게' : '긴자진 — 느리게 다음 빠르게') : '빠르기 그대로'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: row => (row.sijo ? ['5박', '8박'] : ['한 번 듣기']),
  say: {
    show: lo => (lo ? '느리게 부르다가 이어서 빠르게 부르는 노래가 있어요. 눌러서 들어 봐요.'
      : '긴자진 형식은 느린 노래를 부르고, 이어서 빠른 노래를 부르는 짜임이에요. 우리 음악에서 긴은 느리게, 자진은 빠르게라는 뜻이에요.'),
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 느리게 다음 빠르게인지 빠르기 그대로인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '긴자진', sub: '느리게 부르다가 빠르게', row: { kind: 'beat', w: 'big', ans: 'gin' } },
    { title: '빠르기 그대로', sub: '처음부터 끝까지 같은 빠르기', row: { kind: 'beat', w: 'big', ans: 'same' } },
    { title: '커지기만', sub: '커져도 빠르기는 그대로', row: { kind: 'loud', w: 'big', ans: 'same' } },
    { title: '시조', sub: '시조는 초장 · 중장 · 종장, 세 부분으로 되어 있어요. 아주 느리게 불러요. 무릎장단을 치며 부를 수 있어요.', row: { sijo: true } },
  ],
  note: () => '컴퓨터로 만든 가야금 · 장구 소리예요',
  pool: [
    { kind: 'beat', w: 'big', ans: 'gin' },
    { kind: 'beat', w: 'big', ans: 'same' },
    { kind: 'beat', w: 'small', ans: 'gin' },
    { kind: 'loud', w: 'big', ans: 'same' },
    { kind: 'dense', w: 'big', ans: 'gin' },
    { kind: 'jang', w: 'big', ans: 'same' },
  ],
  passText: '세 번 이어서 빠르기가 바뀌는지 가려냈어요',
  game: { title: '느리게 다음 빠르게', sub: () => '가야금 가락을 한 번씩 들려줘요. 느리게 부르다가 빠르게 이어지는지, 빠르기가 그대로인지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
