// 셈2 점점 세게·점점 여리게 — 셈여림 변화의 첫 칸(11-14 · 흐름 d4 '점점 세게 · 점점 여리게')
//  셈1은 두 소리를 견주어 '여리게 · 세게'를 골랐다. 이 칸은 **한 번 들려주는 짧은 소리 안에서** 세기가 점점 세지는지 · 점점 여려지는지 · 그대로인지 고른다.
//   세기 변화는 한 번 듣는 소리 안에서 일어나므로(처음 음과 끝 음을 견줌) 기기 음량과 상관없이 가려낼 수 있다 — 스피커가 작아도 · 소리를 줄여 놓아도 같은 답.
//   기호(꺾쇠)는 단추 그림으로만 보이고, 글자 mp · mf · pp · ff는 악보 판(흐름 d3 · d5)에서 다룬다(귀 + 처음과 끝을 견주기 → 난이도 2).
//  차례: 같은 음을 여덟 번 · 세기만 크게 변함(단추 둘) → '그대로' 단추 · 변화 폭이 작아짐 · 짧은 가락 위에서
//   → 비틀기(한 판에 한 가지만) '높아져도 세기는 그대로' · '낮아지는데 점점 세게(높아지는데 점점 여리게)' · '촘촘해져도 세기는 그대로' → 섞어서
//  모든 판이 여덟 음 · 여덟 박이라 답과 상관없이 길이가 같다(열리는 때로 답이 새지 않음). 가락은 이 칸에서 만든 짧은 것(있는 노래를 쓰지 않음).
//  '그대로' 판은 판마다 세기가 다르다(여린 채로 · 보통으로 · 센 채로) — 첫 음의 크기만 듣고는 답을 못 고른다.
//  올라가는 판의 답은 '그대로' 또는 '점점 여리게', 내려가는 판의 답은 '그대로' 또는 '점점 세게' — 높낮이를 따라 고르면 틀린다.
//  1~2학년 판은 셈1처럼 '세게 · 여리게' 대신 '크게 · 작게'라고 부른다.
//  ⚠ 귀로 확인하지 못한 것(코드로 값만 맞춤): ① 세기 값이 크롬북 스피커에서 가려지는지 — 특히 좁은 폭(0.4 ↔ 0.8 · 두 배)은 압축기가 센 쪽을 눌러 더 좁게 들릴 수 있다
//   ② 올라가는 가락은 작은 스피커(낮은 음이 약함)와 귀의 특성 때문에 세기가 같아도 점점 세게로 들릴 수 있다 — 스피커 점검(eq.js)을 한 기기에서만 음높이별 크기가 맞춰진다
//   ③ 촘촘해지는 판은 한 음 한 음의 세기는 같아도 울림이 겹쳐 소리의 양은 늘 수 있다 ④ 물결 가락 위에서는 높은 음 · 낮은 음의 차이가 작은 세기 변화를 가릴 수 있다
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 세기 폭 — [가장 여린 음, 가장 센 음]. 바닥 0.25(더 여리면 작은 스피커에서 첫 음이 안 들릴 수 있음 · 셈1은 여리게 0.2 · 세게 0.9)
const WIDTH = { wide: [0.25, 0.9], mid: [0.32, 0.86], narrow: [0.4, 0.8] };
// 음 — 물결 가락(앞에서 읽어도 뒤에서 읽어도 같음 · 첫 음 = 끝 음 → 높낮이가 한쪽으로 쏠리지 않음) · 음계(한쪽으로만 움직임) · 촘촘해지는 박
const TUNE = {
  a: [60, 64, 67, 64, 64, 67, 64, 60],                        // 도 미 솔 미 미 솔 미 도
  b: [69, 67, 64, 67, 67, 64, 67, 69],                        // 라 솔 미 솔 솔 미 솔 라
  c: [62, 65, 69, 65, 65, 69, 65, 62],                        // 레 파 라 파 파 라 파 레
};
const SCALE = {
  c: [60, 62, 64, 65, 67, 69, 71, 72],                        // 도 레 미 파 솔 라 시 높은 도
  g: [67, 69, 71, 72, 74, 76, 78, 79],                        // 솔 라 시 도 레 미 파# 솔
};
const EVEN = [1, 1, 1, 1, 1, 1, 1, 1];
const DENSE = [2, 2, 1, 1, 0.5, 0.5, 0.5, 0.5];               // 여덟 음 · 여덟 박 — 뒤로 갈수록 촘촘

// 판 — right = cresc(점점 세게) | decresc(점점 여리게) | same(그대로)
//  kind: rep(같은 음 p를 여덟 번) | tune(물결 가락 m) | slope(음계 m이 dir 쪽으로) | cross(음계 m · 높낮이가 세기와 거꾸로 — 방향은 답에서 나옴) | dense(같은 음 p · 점점 촘촘)
//  w = 세기 폭(cresc · decresc 판) · v = 세기(same 판). same 판은 섞어도 그대로 · 나머지는 cresc ↔ decresc가 뒤집힘
export const PLAN = [
  { stage: 'intro', kind: 'rep', p: 67, w: 'wide', right: 'cresc' },
  { stage: 'intro', kind: 'rep', p: 72, w: 'wide', right: 'decresc' },
  { stage: 'intro', kind: 'rep', p: 64, w: 'wide', right: 'cresc' },
  { stage: 'grow', kind: 'rep', p: 67, v: 0.6, right: 'same' },
  { stage: 'grow', kind: 'tune', m: 'a', w: 'mid', right: 'cresc' },
  { stage: 'grow', kind: 'tune', m: 'b', w: 'narrow', right: 'decresc' },
  { stage: 'twist', kind: 'slope', m: 'c', dir: 'up', v: 0.4, right: 'same' },
  { stage: 'twist', kind: 'cross', m: 'g', right: 'cresc' },
  { stage: 'twist', kind: 'dense', p: 67, v: 0.8, right: 'same' },
  { stage: 'twist', kind: 'cross', m: 'c', right: 'decresc' },
  { stage: 'end', kind: 'slope', m: 'g', dir: 'down', v: 0.6, right: 'same' },
  { stage: 'end', kind: 'tune', m: 'c', w: 'narrow', right: 'decresc' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => (p.right === 'same' ? p : { ...p, right: p.right === 'cresc' ? 'decresc' : 'cresc' }), answerOf: p => p.right };
// 맞힐 확률 — '그대로' 단추가 나오기 전(소개 판)은 둘 중 하나 · 그 뒤는 셋 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 2 : 1 / 3));

// 그 판의 가락이 올라가는가(cross는 세기와 거꾸로 — 점점 여리게면 올라감) · 한쪽으로 움직이지 않는 판은 null
const rising = row => (row.kind === 'cross' ? row.right === 'decresc' : row.kind === 'slope' ? row.dir === 'up' : null);
const pitches = row => {
  if (row.kind === 'rep' || row.kind === 'dense') return EVEN.map(() => row.p);
  if (row.kind === 'tune') return TUNE[row.m];
  return rising(row) ? SCALE[row.m] : SCALE[row.m].slice().reverse();
};
const WORD = lo => (lo ? { up: '크게', dn: '작게', v: '크기' } : { up: '세게', dn: '여리게', v: '세기' });
// 판 → 도막 하나. 음마다 세기를 고르게 올리거나 내림(첫 음 v0 → 끝 음 v1)
function build(row, lo) {
  const beats = row.kind === 'dense' ? DENSE : EVEN, w = WIDTH[row.w || 'wide'], T = WORD(lo);
  const [v0, v1] = row.right === 'same' ? [row.v, row.v] : row.right === 'cresc' ? w : [w[1], w[0]];
  const ns = line(pitches(row).map((p, i) => [p, beats[i]]), { inst: 'piano' })
    .map((n, i, a) => ({ ...n, vel: +(v0 + (v1 - v0) * i / (a.length - 1)).toFixed(3) }));
  return [{ lines: [ns], cap: row.right === 'same' ? `${T.v} 그대로` : `점점 ${row.right === 'cresc' ? T.up : T.dn}` }];
}
const wrong = (row, lo) => {
  const T = WORD(lo);
  if (row.right === 'cresc') return row.kind === 'cross' ? `낮아지지만 점점 ${T.up}예요` : `점점 ${T.up}예요 · 막대가 점점 굵어져요`;
  if (row.right === 'decresc') return row.kind === 'cross' ? `높아지지만 점점 ${T.dn}예요` : `점점 ${T.dn}예요 · 막대가 점점 가늘어져요`;
  return row.kind === 'slope' ? `${row.dir === 'up' ? '높아져도' : '낮아져도'} ${T.v}는 그대로예요`
    : row.kind === 'dense' ? `촘촘해져도 ${T.v}는 그대로예요` : `${T.v}가 그대로예요 · 막대 굵기가 같아요`;
};

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['높낮이를 세기로', '그대로인 소리를 변한다고', '작은 변화를 그대로로'];
// picks[k] = 그 판에 고른 단추(없으면 고른 것을 모르는 채로 틀린 판만 셈)
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    // 높낮이가 한쪽으로 움직이는 판에서 높낮이 쪽을 따라 고름(올라가면 점점 세게 · 내려가면 점점 여리게)
    { n: miss((p, pick) => rising(p) != null && (pick == null || pick === (rising(p) ? 'cresc' : 'decresc'))), text: '높아지는 소리를 점점 세게로, 낮아지는 소리를 점점 여리게로 고른 적이 있어요. 높이와 세기는 달라요 — 높아져도 세기는 그대로일 수 있어요.' },
    { n: miss(p => p.right === 'same'), text: '세기가 그대로인 소리를 변한다고 고른 적이 있어요. 음이 촘촘해지거나 높아져도 한 음 한 음의 세기가 같으면 그대로예요.' },
    { n: miss((p, pick) => p.kind === 'tune' && (pick == null || pick === 'same')), text: '조금씩 변하는 세기를 그대로로 고른 적이 있어요. 처음 음과 끝 음의 세기가 다르면 점점 변한 소리예요.' },
  ], '높낮이가 움직여도 세기만 듣고 골랐어요.');
}
// 헷갈리는 두 소리 — 둘 다 같은 올라가는 가락 · 세기만 다름(그대로 ↔ 점점 세게)
export const NEAR = [
  { label: '높아져도 세기는 그대로', low: '높아져도 크기는 그대로', play: nearSegs(build({ kind: 'slope', m: 'c', dir: 'up', v: 0.6, right: 'same' })) },
  { label: '높아지며 점점 세게', low: '높아지며 점점 크게', play: nearSegs(build({ kind: 'slope', m: 'c', dir: 'up', w: 'wide', right: 'cresc' })) },
];

// 단추 그림 — 악보 기호와 같은 꼴(악보 판 lab.js의 꺾쇠): 점점 세게 = 벌어지는 꺾쇠 · 점점 여리게 = 오므라드는 꺾쇠 · 그대로 = 나란한 두 줄
const HAIR = { cresc: 'M56 16L8 32L56 48', decresc: 'M8 16L56 32L8 48', same: 'M8 24H56M8 40H56' };
const CHIP = k => `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${HAIR[k]}" fill="none" stroke="#3B2A1E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ASK = lo => `한 번 들어요 — 점점 ${WORD(lo).up}일까요, 점점 ${WORD(lo).dn}일까요?`;
const cell = pickCell({
  friend: 'bear',
  keys: ['cresc', 'decresc', 'same'],
  label: (k, lo) => (k === 'same' ? '그대로' : `점점 ${k === 'cresc' ? WORD(lo).up : WORD(lo).dn}`),
  chip: CHIP,
  lock: { key: 'same', at: CUTS[0], tell: () => '그대로 단추가 나왔어요' },
  rightOf: row => row.right,
  build,
  names: () => ['소리 그림'],
  say: {
    show: lo => (lo ? '소리가 점점 커지기도 하고 점점 작아지기도 해요. 눌러서 들어 봐요.' : '소리가 점점 세지기도 하고 점점 여려지기도 해요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => `TV 소리를 듣고 — 점점 ${WORD(lo).up}인지 점점 ${WORD(lo).dn}인지 골라요`,
  },
  wrong,
  EX: lo => [
    { title: `점점 ${WORD(lo).up}`, sub: '막대가 점점 굵어져요', row: { kind: 'rep', p: 67, w: 'wide', right: 'cresc' } },
    { title: `점점 ${WORD(lo).dn}`, sub: '막대가 점점 가늘어져요', row: { kind: 'rep', p: 67, w: 'wide', right: 'decresc' } },
    { title: '그대로', sub: '막대 굵기가 같아요', row: { kind: 'rep', p: 67, v: 0.6, right: 'same' } },
    { title: '높아져도 그대로', sub: `높이만 변하고 ${WORD(lo).v}는 같아요`, row: { kind: 'slope', m: 'c', dir: 'up', v: 0.6, right: 'same' } },
  ],
  note: lo => (lo ? '막대가 굵을수록 큰 소리예요' : '막대가 굵을수록 센 소리예요'),
  pool: [
    { kind: 'rep', p: 67, w: 'wide', right: 'cresc' },
    { kind: 'rep', p: 72, w: 'wide', right: 'decresc' },
    { kind: 'tune', m: 'a', w: 'mid', right: 'cresc' },
    { kind: 'cross', m: 'c', right: 'decresc' },
    { kind: 'rep', p: 64, v: 0.6, right: 'same' },
    { kind: 'slope', m: 'c', dir: 'up', v: 0.4, right: 'same' },
    { kind: 'dense', p: 67, v: 0.6, right: 'same' },
  ],
  passText: '세 번 이어서 세기 변화를 가려냈어요',
  game: {
    title: lo => `점점 ${WORD(lo).up}일까 점점 ${WORD(lo).dn}일까`,
    sub: lo => (lo
      ? '소리를 한 번 들려줘요. 소리가 점점 커지는지, 점점 작아지는지 골라요. 그대로 단추는 중간에 나와요.'
      : '소리를 한 번 들려줘요. 세기가 점점 세지는지, 점점 여려지는지 골라요. 그대로 단추는 중간에 나와요.'),
  },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
