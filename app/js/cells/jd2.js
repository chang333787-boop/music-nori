// 장2 굿거리일까 중중모리일까 — 장단의 둘째 칸(11-14 · 묶음 C · 흐름 j3 굿거리 · j4 중중모리 · 듣고 고르기 틀)
//  한 판 = 장구 장단 한 장단(열두 칸)을 듣고 굿거리인지 중중모리인지 고른다.
//  쓰는 사실(국악 사실 장부 11-14 · 국악사전 · 미래엔 교사용 2015):
//   · 둘 다 네 박 · 한 박을 셋으로 나눠 열두 칸 · 센 곳은 1 · 9번 칸(국악사전 · 미래엔 6학년 칸 표시)
//   · 빠르기로는 갈리지 않는다(국악사전 표에서 둘 다 ♩.=80~90) — 치는 자리가 다르다. 굿거리에는 더러러러가, 중중모리에는 덕이 많다
//   · 굿거리 꼴 = 덩 · 기덕 쿵 더러러러 · 쿵 · 기덕 쿵 더러러러 · (미래엔 6학년 · 더러러러는 한 칸 · 6 · 12번 칸은 쉼)
//   · 중중모리 꼴 = 덩 · 덕 쿵 · 덕 쿵 · 덕 쿵 · 쿵(미래엔 5학년 맺는 꼴) · 다는 꼴은 끝이 쿵 덕 덕(미래엔 6학년)
//   · '기'는 앞꾸밈 — 3번 칸 조금 앞에서 나고 칸을 하나 더 쓰지 않는다
//  틀 고른 까닭: 장1 꼴(장단보 빈칸)은 굿거리에 '기덕' · '더러러러' 부호가 더 필요한데 굴림표 그림의 출처를 확인하지 못했다.
//   소리로 두 장단을 가려내는 고르기 칸이면 부호를 지어내지 않는다(단추 그림도 부호가 아니라 '어느 칸을 치는지' 점만).
//  빠르기 · 길이로 답이 새지 않게: bpm 80 · 85 · 90(앱이 정한 값 — 두 출처가 겹치는 ♩.=80~90 안)을 두 답에 고르게 두고,
//   뒤집어도(섞을 때 굿거리 ↔ 중중모리) bpm · 꼴(강세 없음 · 가락 얹힘)은 그대로 → 같은 판은 답과 상관없이 길이가 같다.
//  차례: 소개(85 · 그대로) → 발전(80 · 90 · 중중모리 다는 꼴) → 비틀기(한 판에 한 가지: 강세 없음 · 가야금 가락이 얹힘) → 마무리
//  ⚠ 귀로 확인하지 못한 것: gi + deok가 '기덕'으로 · roll 한 칸이 '더러러러'로 들리는지(audio.js 합성 소리) · 가야금 가락 위에서 덕 · 더러러러가 가려지는지
//  ⚠ 성취기준(std)은 장1 것을 옮겼다(설계서) — 장1은 3~4학년 번호(4음…)라 5~6학년 칸에 맞는지 확인 못 함
//  ⚠ 흐름 j3 · j4의 학년 글은 사실 장부와 맞춰 두었는지 메인이 확인(설계서 §A-4)
//  가락(tune 판)은 이 칸에서 만든 것 · 율명 · 토리 이름 · 곡 이름은 쓰지 않는다
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';

// 장단 — 칸마다 'deong' | 'kung' | 'deok' | 'kideok' | 'durr' | null(쉼) · 센 곳 1 · 9번 칸(0 · 8)
export const GG = ['deong', null, 'kideok', 'kung', 'durr', null, 'kung', null, 'kideok', 'kung', 'durr', null];
export const JJM = ['deong', null, 'deok', 'kung', null, 'deok', 'kung', null, 'deok', 'kung', null, 'kung'];
export const JJMD = ['deong', null, 'deok', 'kung', null, 'deok', 'kung', null, 'deok', 'kung', 'deok', 'deok'];
const ACC = [0, 8], ACC_UP = 1.12;                                    // 장1과 같음
const VEL = { deong: 0.85, kung: 0.8, deok: 0.7, gi: 0.7, roll: 0.7 }; // 장1 VEL + 기 · 굴림은 덕과 같은 세기(audio.js가 기를 더 작게 냄)
const GI = 0.05;                                                       // 기 = 칸 0.05초 앞

// 칸 줄 → 음 줄(북 소리 { drum, d, gap, vel } · 쉼 { p: null }) — 칸 하나 = s초 · 줄 전체 = 칸 수 × s(앞꾸밈은 앞 칸에서 떼어 씀)
//  s: 칸 길이(초) 또는 칸 번호 → 초(형5 — 장단 반주 위에서 빨라짐) · acc: 센 칸(강세 없는 판은 [] · 열두 칸마다 되풀이) · mul(i): 칸마다 세기 배수(형5 '뒤 셋 박 크게')
export function jangLine(pat, sec, { acc = ACC, mul = () => 1 } = {}) {
  const sOf = typeof sec === 'function' ? sec : () => sec;
  const out = [];
  const take = sec => {                                                 // 앞 칸에서 sec초를 떼어 냄(쉼 · 소리 꼬리부터)
    const last = out[out.length - 1];
    if (!last) return;
    const g = Math.min(last.gap, sec);
    last.gap = last.gap - g; last.d = last.d - (sec - g);
  };
  pat.forEach((hit, i) => {
    const s = sOf(i), v = k => Math.min(1, VEL[k] * (acc.includes(i % 12) ? ACC_UP : 1) * mul(i));
    if (hit == null) out.push({ p: null, d: s, gap: 0 });
    else if (hit === 'durr') out.push({ drum: 'roll', d: s * 0.92, gap: s * 0.08, vel: v('roll'), span: s });
    else if (hit === 'kideok') {
      take(GI);
      out.push({ drum: 'gi', d: GI, gap: 0, vel: v('gi') }, { drum: 'deok', d: s * 0.5, gap: s * 0.5, vel: v('deok') });
    } else out.push({ drum: hit, d: s * 0.5, gap: s * 0.5, vel: v(hit) });
  });
  return out;
}
export const subOf = bpm => 60 / bpm / 3;                              // 소박 한 칸(초) — ♩. = bpm

// 가야금 가락(tune 판 · 이 칸에서 만든 것) — 박마다 [음, 소박 수] · 두 장단에 같은 가락
const TUNE = [[67, 2], [69, 1], [72, 3], [69, 2], [67, 1], [64, 3]];

// 판 — kind: plain | dan(중중모리는 다는 꼴) | flat(강세 없음) | tune(가야금 가락이 얹힘) · ans: gg | jjm(섞을 때 뒤집힘 · bpm · kind는 그대로)
export const PLAN = [
  { stage: 'intro', kind: 'plain', bpm: 85, ans: 'gg' },
  { stage: 'intro', kind: 'plain', bpm: 85, ans: 'jjm' },
  { stage: 'intro', kind: 'plain', bpm: 85, ans: 'gg' },
  { stage: 'grow', kind: 'plain', bpm: 80, ans: 'jjm' },
  { stage: 'grow', kind: 'plain', bpm: 90, ans: 'gg' },
  { stage: 'grow', kind: 'dan', bpm: 85, ans: 'jjm' },
  { stage: 'twist', kind: 'flat', bpm: 80, ans: 'gg' },
  { stage: 'twist', kind: 'flat', bpm: 90, ans: 'jjm' },
  { stage: 'twist', kind: 'tune', bpm: 85, ans: 'jjm' },
  { stage: 'twist', kind: 'tune', bpm: 80, ans: 'gg' },
  { stage: 'end', kind: 'tune', bpm: 90, ans: 'gg' },
  { stage: 'end', kind: 'dan', bpm: 80, ans: 'jjm' },
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: p.ans === 'gg' ? 'jjm' : 'gg' }), answerOf: p => p.ans };

export const patOf = row => (row.ans === 'gg' ? GG : row.kind === 'dan' ? JJMD : JJM);
const NAME = { gg: '굿거리', jjm: '중중모리' };
// 보기 카드 하나짜리 소리(one = 'durr' | 'kideok') — 앞에 쉼 한 칸을 두고 두 번
const ONE = { durr: [null, 'durr', null, null, 'durr', null], kideok: [null, 'kideok', null, null, 'kideok', null] };

function build(row) {
  const s = subOf(row.bpm);
  if (row.one) return [{ lines: [jangLine(ONE[row.one], s, { acc: [] })], cap: row.one === 'durr' ? '더러러러' : '기덕' }];
  const lines = [jangLine(patOf(row), s, { acc: row.kind === 'flat' ? [] : ACC })];
  if (row.kind === 'tune') lines.push(line(TUNE, { inst: 'gayageum', vel: 0.5, beat: s }));
  return [{ lines, cap: NAME[row.ans] + (row.kind === 'dan' && row.ans === 'jjm' ? ' 다는 꼴' : '') }];
}
const wrong = row => (row.ans === 'gg' ? '굿거리예요 — 더러러러가 있어요' : '중중모리예요 — 덕이 많아요');

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['강세 없는 장단', '가락이 얹힌 장단', '중중모리 다는 꼴'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'flat'), text: '센 곳이 없는 장단에서 다르게 고른 적이 있어요. 세기가 아니라 치는 자리를 들어요 — 더러러러가 있으면 굿거리예요.' },
    { n: miss(p => p.kind === 'tune'), text: '가야금 가락이 얹힌 장단에서 다르게 고른 적이 있어요. 가락은 두 장단에 똑같아요 — 장구 소리만 들어요.' },
    { n: miss(p => p.kind === 'dan'), text: '중중모리 다는 꼴(끝이 쿵 덕 덕)이 나온 판에서 다르게 고른 적이 있어요. 덕이 많고 더러러러가 없으면 중중모리예요.' },
  ], '더러러러와 덕을 듣고 굿거리와 중중모리를 가려냈어요.');
}
// 헷갈리는 두 소리 — 같은 빠르기(85)의 굿거리 ↔ 중중모리
export const NEAR = [
  { label: '굿거리 — 더러러러가 있어요', play: nearSegs(build({ kind: 'plain', bpm: 85, ans: 'gg' })) },
  { label: '중중모리 — 덕이 많아요', play: nearSegs(build({ kind: 'plain', bpm: 85, ans: 'jjm' })) },
];

// 단추 그림 — 부호가 아니라 '어느 칸을 치는지'만: 두 줄(1 · 2박 / 3 · 4박) × 여섯 칸 · 치는 칸 = 초록 점 · 쉬는 칸 = 비움 · 박 사이 세로줄
const CHIP = k => {
  const pat = k === 'gg' ? GG : JJM;
  const dots = pat.map((hit, i) => {
    const row = Math.floor(i / 6), col = i % 6, x = 9 + col * 9.2 + (col >= 3 ? 1.4 : 0), y = 22 + row * 20;
    return hit ? `<circle cx="${x.toFixed(1)}" cy="${y}" r="3.8" fill="#2F6F4E" stroke="#3B2A1E" stroke-width="1.6"/>` : '';
  }).join('');
  const bars = [12, 32].map(y => `<line x1="32" y1="${y}" x2="32" y2="${y + 20}" stroke="#3B2A1E" stroke-width="2"/>`).join('');
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="10" width="58" height="44" rx="8" style="fill:var(--surface)" stroke="#3B2A1E" stroke-width="2.6"/>${bars}${dots}</svg>`;
};

const ASK = '한 장단을 들어요 — 굿거리일까요, 중중모리일까요?';
const cell = pickCell({
  friend: 'hog',
  keys: ['gg', 'jjm'],
  label: k => NAME[k],
  chip: CHIP,
  rightOf: row => row.ans,
  build,
  names: () => ['한 장단'],
  say: {
    show: () => '굿거리장단은 네 박이에요. 한 박을 셋으로 나눠서 모두 열두 칸이에요. 중중모리장단도 네 박, 열두 칸이에요.',
    follow: () => ASK,
    game: () => ASK,
    kid: () => 'TV 소리를 듣고 — 굿거리인지 중중모리인지 골라요',
  },
  wrong,
  EX: () => [
    { title: '굿거리', sub: '더러러러가 있어요', row: { kind: 'plain', bpm: 85, ans: 'gg' } },
    { title: '중중모리', sub: '덕이 많아요', row: { kind: 'plain', bpm: 85, ans: 'jjm' } },
    { title: '더러러러', sub: '채 끝을 굴려서 드르르 하고 쳐요', row: { one: 'durr', bpm: 85 } },
    { title: '기덕', sub: '덕 앞에 아주 짧은 소리를 하나 붙여요', row: { one: 'kideok', bpm: 85 } },
  ],
  note: () => '컴퓨터로 만든 장구 소리예요',
  pool: [
    { kind: 'plain', bpm: 85, ans: 'gg' },
    { kind: 'plain', bpm: 80, ans: 'jjm' },
    { kind: 'plain', bpm: 90, ans: 'gg' },
    { kind: 'dan', bpm: 85, ans: 'jjm' },
    { kind: 'flat', bpm: 85, ans: 'gg' },
    { kind: 'tune', bpm: 85, ans: 'jjm' },
  ],
  passText: '세 번 이어서 굿거리와 중중모리를 가려냈어요',
  game: { title: '굿거리일까 중중모리일까', sub: () => '장구 장단을 한 장단씩 들려줘요. 굿거리인지 중중모리인지 골라요.' },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
