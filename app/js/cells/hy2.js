// 형2 메기고 받기 — 형식의 둘째 칸(11-14 · 흐름 f2 '메기고 받기')
//  쓰는 사실은 이것뿐: 한 사람이 메기면(메기는 소리) 여러 사람이 받는다(받는 소리).
//   받는 소리는 같은 가락이 되풀이되고, 메기는 소리는 그때그때 바뀐다. (민요 이름 · 지역 · 유래는 쓰지 않음)
//  한 판 = 짧은 노래 한 토막을 네 도막으로 듣고 **마지막 도막이 메기는 소리인지 받는 소리인지** 고른다
//   (귀 + 앞 도막을 잠깐 기억하기 + 낱말 둘 → 난이도 3). 따라 부르지는 않는다 — 듣고 가려내기만.
//   메기는 소리 = 악기 하나가 혼자 · 도막마다 가락이 다름 / 받는 소리 = 다른 악기 여럿이 같은 가락을 함께(옥타브로 겹침) · 늘 같은 가락
//  차례: 혼자 ↔ 셋이(또렷하게) → 받는 쪽이 둘로 줄고 메기는 가락이 잘게 꾸며짐
//   → 비틀기 '네 도막 모두 같은 악기 하나'(같은 가락이 돌아온 도막 = 받는 소리로만 가려냄) + '받는 소리가 메기는 소리보다 작음'(크기는 단서가 아님) → 섞어서
//  자리 · 길이로 답이 새지 않게:
//   · 메기는 소리로 시작하는 판(메·받·메·받)과 받는 소리로 시작하는 판(받·메·받·메 — 노래 가운데부터)이 반반(섞을 때 뒤집힘) → '몇째 도막'으로는 못 맞힘
//   · 모든 도막이 세 박, 모든 판이 같은 길이 → 열리는 때로는 못 맞힘
//   · 받는 소리가 큰 판도 작은 판도 있음 → 크기로는 못 맞힘
//   그래서 '혼자인가 여럿인가' 또는 '같은 가락이 돌아왔는가'를 들어야 고를 수 있다.
//  가락은 이 칸에서 만든 세 박짜리 짧은 동기(도 레 미 솔 라 · 있는 노래 · 민요 가락을 쓰지 않음).
//  ⚠ 악기 소리는 모두 컴퓨터로 만든 소리다(app/js/audio.js) — 국악기 소리가 아니다. 보기 화면에 그렇게 적는다.
//  ⚠ '받는 소리가 작은 판'의 크기 차이(혼자 0.85 ↔ 셋이 저마다 0.28)는 숫자로만 정했다 — 귀로 확인하지는 못했다.
//  울림이 긴 악기(하프 · 마림바)는 쓰지 않는다 — 앞 도막의 울림이 다음 도막(혼자 내는 소리)에 겹치지 않게.
//  1~2학년 판은 '가락' 대신 '노래'라고 부른다(형1과 같음).
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 한 박 0.28초 — 도막 = 세 박(0.84초) + 한 박 쉼 → 네 도막이 박을 이어 감(한 판 4.2초 · TV 소리 모드 100초 안)
const BEAT = 0.28;
const ONE = 0.6, TEAM = 0.5, LOUD = 0.85, HUSH = 0.28;
const DO = 60, RE = 62, MI = 64, SOL = 67, LA = 69;
const Q = ps => ps.map(p => [p, 1]);                                     // 한 박씩 세 음

// 꼴마다 쓰는 것 — solo 메기는 악기 · team 받는 악기 [악기, 옥타브 옮김] · a · b 메기는 가락 둘 · r 받는 가락(늘 같음)
const SET = {
  // 혼자 ↔ 셋이(낮게 · 가운데 · 높게 같은 가락)
  many: [
    { solo: 'piano', team: [['cello', -12], ['horn', 0], ['recorder', 12]], a: Q([DO, RE, MI]), r: Q([SOL, MI, DO]), b: Q([MI, SOL, LA]) },
    { solo: 'xylo', team: [['cello', -12], ['clarinet', 0], ['flute', 12]], a: Q([SOL, LA, SOL]), r: [[MI, 2], [DO, 1]], b: Q([DO, RE, SOL]) },
    { solo: 'recorder', team: [['cello', -12], ['piano', 0], ['flute', 12]], a: Q([LA, SOL, MI]), r: [[DO, 1], [SOL, 2]], b: Q([RE, MI, RE]) },
  ],
  // 혼자(잘게 꾸민 가락) ↔ 둘이
  two: [
    { solo: 'xylo', team: [['cello', -12], ['recorder', 0]], a: [[MI, 0.5], [SOL, 0.5], [LA, 1], [SOL, 1]], r: Q([DO, RE, DO]), b: [[LA, 0.5], [SOL, 0.5], [MI, 1], [RE, 1]] },
    { solo: 'piano', team: [['horn', 0], ['flute', 12]], a: [[DO, 0.5], [RE, 0.5], [MI, 0.5], [SOL, 0.5], [LA, 1]], r: Q([SOL, SOL, DO]), b: [[LA, 0.5], [SOL, 0.5], [LA, 0.5], [SOL, 0.5], [MI, 1]] },
    { solo: 'recorder', team: [['cello', -12], ['piano', 0]], a: [[SOL, 1], [LA, 0.5], [SOL, 0.5], [MI, 1]], r: Q([MI, RE, DO]), b: [[RE, 0.5], [MI, 0.5], [SOL, 1], [LA, 1]] },
  ],
  // 네 도막 모두 같은 악기 하나 — 같은 가락이 돌아온 도막이 받는 소리
  mono: [
    { solo: 'recorder', a: Q([MI, MI, RE]), r: Q([LA, SOL, DO]), b: Q([DO, MI, SOL]) },
    { solo: 'xylo', a: [[SOL, 0.5], [LA, 0.5], [SOL, 1], [MI, 1]], r: [[RE, 1], [DO, 2]], b: [[MI, 0.5], [SOL, 0.5], [LA, 1], [SOL, 1]] },
    { solo: 'piano', a: Q([RE, MI, SOL]), r: Q([DO, SOL, MI]), b: Q([LA, SOL, RE]) },
    { solo: 'cello', a: Q([DO, RE, SOL]), r: Q([LA, SOL, LA]), b: Q([MI, RE, DO]) },      // 보기 · 연습 · 헷갈리는 두 소리
  ],
  // 혼자 크게 ↔ 셋이 작게
  soft: [
    { solo: 'trumpet', team: [['cello', -12], ['horn', 0], ['recorder', 12]], a: Q([DO, MI, RE]), r: Q([MI, SOL, DO]), b: Q([SOL, MI, RE]) },
    { solo: 'piano', team: [['cello', -12], ['clarinet', 0], ['flute', 12]], a: Q([LA, LA, SOL]), r: [[SOL, 2], [DO, 1]], b: Q([RE, RE, MI]) },
    { solo: 'xylo', team: [['cello', -12], ['horn', 0], ['flute', 12]], a: Q([MI, RE, MI]), r: Q([RE, MI, DO]), b: Q([SOL, LA, LA]) },
  ],
};

// 판 — kind 꼴 · m 그 꼴의 몇째 묶음 · ans = 마지막 도막(call 메기는 소리 | resp 받는 소리 · 섞을 때 뒤집힘)
//  ans가 resp면 메·받·메·받, call이면 받·메·받·메
export const PLAN = [
  { stage: 'intro', kind: 'many', m: 0, ans: 'resp' },
  { stage: 'intro', kind: 'many', m: 1, ans: 'call' },
  { stage: 'intro', kind: 'many', m: 2, ans: 'resp' },
  { stage: 'grow', kind: 'two', m: 0, ans: 'call' },
  { stage: 'grow', kind: 'two', m: 1, ans: 'resp' },
  { stage: 'grow', kind: 'two', m: 2, ans: 'call' },
  { stage: 'twist', kind: 'mono', m: 0, ans: 'resp' },
  { stage: 'twist', kind: 'soft', m: 0, ans: 'call' },
  { stage: 'twist', kind: 'mono', m: 1, ans: 'call' },
  { stage: 'twist', kind: 'soft', m: 1, ans: 'resp' },
  { stage: 'end', kind: 'mono', m: 2, ans: 'call' },
  { stage: 'end', kind: 'soft', m: 2, ans: 'resp' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'call' ? 'resp' : 'call' }), answerOf: p => p.ans };

const W = lo => (lo ? '노래' : '가락');
// 그 판의 도막 차례 — r 받는 소리 · a · b 메기는 소리
const rolesOf = row => (row.ans === 'resp' ? ['a', 'r', 'b', 'r'] : ['r', 'a', 'r', 'b']);
// 도막 아래 한 줄 말 — 보기 화면(tell)은 도막 이름이 '메기는 소리 · 받는 소리'라 까닭만, 연습 · 게임은 까닭 + 구실
function capOf(row, recv, lo) {
  if (row.kind === 'mono') return recv ? `같은 ${W(lo)}` : `바뀌는 ${W(lo)}`;
  const who = recv ? (row.kind === 'two' ? '둘이' : '여럿이') : '혼자';
  return row.tell ? who : `${who} ${recv ? '받아요' : '메겨요'}`;
}
function build(row, lo) {
  const x = SET[row.kind][row.m], soft = row.kind === 'soft';
  const L = (mel, inst, vel, shift = 0) => line(mel, { inst, vel, shift, beat: BEAT });
  return rolesOf(row).map(k => {
    const recv = k === 'r';
    const lines = recv && x.team
      ? x.team.map(([inst, shift]) => L(x.r, inst, soft ? HUSH : TEAM, shift))
      : [L(x[k], x.solo, soft ? LOUD : ONE)];
    return { lines, cap: capOf(row, recv, lo), gap: BEAT };
  });
}
const wrong = (row, lo) => (row.ans === 'call'
  ? (row.kind === 'mono' ? `앞에 없던 새 ${W(lo)}이에요 · 메기는 소리` : '혼자 낸 소리예요 · 메기는 소리')
  : row.kind === 'mono' ? `앞에 나온 ${W(lo)}이 돌아왔어요 · 받는 소리`
    : row.kind === 'soft' ? '작아도 여럿이 낸 소리예요 · 받는 소리'
      : row.kind === 'two' ? '둘이 함께 낸 소리예요 · 받는 소리' : '여럿이 낸 소리예요 · 받는 소리');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['악기 하나로 한 판', '받는 소리가 작은 판', '둘이 받는 판'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'mono'), text: '악기 하나가 다 낸 판에서 다르게 고른 적이 있어요. 앞에 나온 가락이 돌아오면 받는 소리예요.' },
    { n: miss(p => p.kind === 'soft'), text: '받는 소리가 작은 판에서 다르게 고른 적이 있어요. 작아도 여럿이 내면 받는 소리예요.' },
    { n: miss(p => p.kind === 'two'), text: '둘이 받는 판에서 다르게 고른 적이 있어요. 둘이 함께 내도 받는 소리예요.' },
  ], '혼자인지 여럿인지, 같은 가락이 돌아오는지 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 같은 악기 하나(첼로)가 같은 세 가락을 메·받·메·받 ↔ 받·메·받·메
export const NEAR = [
  { label: '끝이 받는 소리', low: null, play: nearSegs(build({ kind: 'mono', m: 3, ans: 'resp' })) },
  { label: '끝이 메기는 소리', low: null, play: nearSegs(build({ kind: 'mono', m: 3, ans: 'call' })) },
];

// 단추 그림 — 메기는 소리 = 점 하나(혼자) · 받는 소리 = 점 셋(여럿)
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="2.6"/>`;
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${k === 'call' ? DOT(32, 32) : DOT(32, 20) + DOT(19, 43) + DOT(45, 43)}</svg>`;

const ASK = '네 번 들어요 — 마지막은 메기는 소리일까요, 받는 소리일까요?';
const cell = pickCell({
  friend: 'turtle',
  keys: ['call', 'resp'],
  label: k => (k === 'call' ? '메기는 소리' : '받는 소리'),
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  // 연습 · 게임은 자리 이름만(마지막을 묻는다는 것이 보이게) · 보기 화면은 도막마다 무슨 소리인지
  names: row => (row.tell ? rolesOf(row).map(k => (k === 'r' ? '받는 소리' : '메기는 소리')) : ['첫째', '둘째', '셋째', '마지막']),
  say: {
    show: () => '한 사람이 메기면 여럿이 받아요. 눌러서 들어 봐요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 마지막이 메기는 소리인지 받는 소리인지 골라요',
  },
  wrong,
  EX: lo => [
    { title: '메기고 받기', sub: '혼자 메기고 여럿이 받아요', row: { kind: 'many', m: 0, ans: 'resp', tell: true } },
    { title: '받는 소리부터', sub: `받는 소리는 늘 같은 ${W(lo)}`, row: { kind: 'many', m: 0, ans: 'call', tell: true } },
    { title: '악기 하나로', sub: `같은 ${W(lo)}이 받는 소리`, row: { kind: 'mono', m: 3, ans: 'resp', tell: true } },
    { title: '받는 소리가 작게', sub: '작아도 여럿이 받아요', row: { kind: 'soft', m: 0, ans: 'resp', tell: true } },
  ],
  note: () => '컴퓨터로 만든 악기 소리예요',
  pool: [
    { kind: 'many', m: 0, ans: 'resp' },
    { kind: 'many', m: 1, ans: 'call' },
    { kind: 'two', m: 0, ans: 'call' },
    { kind: 'mono', m: 3, ans: 'resp' },
    { kind: 'mono', m: 0, ans: 'call' },
    { kind: 'soft', m: 0, ans: 'resp' },
  ],
  passText: '세 번 이어서 메기는 소리와 받는 소리를 가려냈어요',
  game: { title: '메기는 소리일까 받는 소리일까', sub: () => '소리를 네 번 이어서 들려줘요. 마지막 소리가 메기는 소리인지 받는 소리인지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
