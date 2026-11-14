// 악6 기호가 붙은 악보 — 스타카토 · 늘임표 · 악센트(11-14 · 묶음 C · 흐름 r10 · t5 · s4 · 난이도 2)
//  짧은 가락 하나를 듣고, 쓰인 악보와 견주어 어떤 기호가 붙었는지 단추 넷(스타카토 · 늘임표 · 악센트 · 기호 없음) 가운데 고른다.
//   단추 카드 = 그 판 가락의 오선 카드에 기호를 붙인 넷(notation.js renderScore 그대로 — 스타카토 = 모든 음 · 늘임표 = 음 f · 악센트 = 음 a · 없음).
//   f · a 자리는 넷 카드에 모두 그대로 보이므로 그림으로는 답을 못 고른다 — 들어야 고른다.
//  소리: 기호 없음 = 쓰인 길이의 0.92 · 세기 0.5 / 스타카토 = 모든 음을 짧게(0.12초 · 8분음은 박의 35%) + art 'stacc' /
//   늘임표 = 음 f만 두 배 길이(뒤 음들은 그만큼 늦게) / 악센트 = 음 a만 세기 0.9.
//   네 꼴 모두 끝에 쉼을 붙여 전체 = 쓰인 박 + 2박(늘임표가 늘인 만큼 쉼을 뺌) — 답과 상관없이 소리 길이가 같다.
//  가락은 이 칸에서 만든 것(있는 노래 X) · BEAT 0.4(느린 판 0.6) · 악기는 컴퓨터로 만든 바이올린 소리(art를 보는 악기 — _pick.js 주석)
//  기호를 직접 넣었다 빼기는 악보 판(lab:len · lab:dyn)이 맡는다 — 이 칸은 '쓰인 것과 들은 것 견주기'(L)
//  ⚠ 성취기준 표시(std)는 악2 것을 그대로 옮겼다(설계서 batchC §F 6 — 원문으로 다시 판정하지 않음)
//  ⚠ 귀로 확인 못 함: 크롬북 스피커에서 8분음 스타카토(0.07초)가 또렷한지 · 악센트 0.9 ↔ 0.5가 낮은 음에서도 가려지는지
import { pickCell, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { renderScore } from '../notation.js';

const BEAT = 0.4, SLOW = 0.6, SOFT = 0.5, LOUD = 0.9;
// 가락 — 음 높이 · 박 수(모두 네 박 · 한 마디)
export const MEL = {
  P1: { p: [60, 64, 67, 64], b: [1, 1, 1, 1] },              // 도 미 솔 미
  P2: { p: [67, 65, 64, 62, 60], b: [0.5, 0.5, 1, 1, 1] },   // 솔파 미 레 도
  P3: { p: [64, 67, 72], b: [1, 1, 2] },                     // 미 솔 높은 도―
  P4: { p: [72, 69, 67, 64], b: [1, 1, 1, 1] },              // 높은 도 라 솔 미
};
export const KEYS = ['stacc', 'ferm', 'acc', 'none'];
// 판 — m 가락 · f 늘임표 붙는 음(0부터) · a 악센트 붙는 음 · ans 답(섞을 때 stacc → ferm → acc → none → stacc)
//  kind: plain | mid(늘임표가 가운데) | slow(느린 스타카토) | long(원래 긴 음에 늘임표) | low(센 음이 가장 낮은 음) | dense(8분이 섞인 가락)
export const PLAN = [
  { stage: 'intro', kind: 'plain', m: 'P1', f: 3, a: 1, ans: 'stacc' },
  { stage: 'intro', kind: 'plain', m: 'P1', f: 3, a: 1, ans: 'ferm' },
  { stage: 'intro', kind: 'plain', m: 'P4', f: 3, a: 1, ans: 'none' },
  { stage: 'grow', kind: 'plain', m: 'P4', f: 1, a: 2, ans: 'acc' },
  { stage: 'grow', kind: 'mid', m: 'P1', f: 1, a: 2, ans: 'ferm' },
  { stage: 'grow', kind: 'plain', m: 'P2', f: 4, a: 2, ans: 'stacc' },
  { stage: 'twist', kind: 'slow', m: 'P4', f: 3, a: 1, ans: 'stacc' },
  { stage: 'twist', kind: 'long', m: 'P3', f: 2, a: 0, ans: 'ferm' },
  { stage: 'twist', kind: 'low', m: 'P4', f: 1, a: 3, ans: 'acc' },
  { stage: 'twist', kind: 'dense', m: 'P2', f: 4, a: 2, ans: 'none' },
  { stage: 'end', kind: 'plain', m: 'P3', f: 2, a: 0, ans: 'acc' },
  { stage: 'end', kind: 'plain', m: 'P2', f: 4, a: 1, ans: 'none' },
];
export const CUTS = stageCuts(PLAN);
const NEXT = { stacc: 'ferm', ferm: 'acc', acc: 'none', none: 'stacc' };
export const SHUF = { flip: p => ({ ...p, ans: NEXT[p.ans] }), answerOf: p => p.ans };
export const beatOf = row => (row.kind === 'slow' ? SLOW : BEAT);

// 판 → 음 줄 하나(쉼 포함)
function notes(row) {
  const { p, b } = MEL[row.m], beat = beatOf(row), k = row.ans;
  const out = p.map((pitch, i) => {
    const w = b[i] * beat;
    if (k === 'stacc') { const d = Math.min(0.12, w * 0.35); return { p: pitch, d, gap: w - d, vel: SOFT, inst: 'violin', art: 'stacc' }; }
    const W = k === 'ferm' && i === row.f ? w * 2 : w;
    return { p: pitch, d: W * 0.92, gap: W * 0.08, vel: k === 'acc' && i === row.a ? LOUD : SOFT, inst: 'violin' };
  });
  const rest = (2 - (k === 'ferm' ? b[row.f] : 0)) * beat;
  if (rest > 1e-6) out.push({ p: null, d: rest * 0.92, gap: rest * 0.08 });
  return out;
}
const build = row => [{ lines: [notes(row)], cap: row.kind === 'slow' ? '느리게' : '' }];

// 단추 카드 — 그 판 가락의 오선 카드(기호만 다름 · 뒤집어도 같은 카드). 화면이 없으면(node 시험) 그림 없이
const LAB = { stacc: '스타카토', ferm: '늘임표', acc: '악센트', none: '기호 없음' };
const LAB_LO = { stacc: '짧게 끊어서', ferm: '길게 늘여서', acc: '한 음만 세게', none: '쓰인 그대로' };
const chipCache = new Map();
function staffChip(row, key) {
  if (typeof document === 'undefined') return '';
  const id = `${row.m}:${row.f}:${row.a}:${key}`;
  if (chipCache.has(id)) return chipCache.get(id);
  const { p, b } = MEL[row.m];
  let s = 0;
  const events = p.map((pitch, i) => {
    const ex = key === 'stacc' ? { stacc: true } : key === 'acc' && i === row.a ? { accent: true } : null;
    const e = { s, d: b[i] * 2, ps: [pitch], i, ...(ex ? { ex } : {}) };
    s += b[i] * 2;
    return e;
  });
  const fs = p.slice(0, row.f).reduce((a, _, i) => a + b[i] * 2, 0);
  const score = { beats: 4, sub: 2, bars: 1, ts: [4, 4], staves: [{ id: 'm', clef: 'treble', voices: [{ stem: 'up', events }] }], ...(key === 'ferm' ? { fermata: { s: fs } } : {}) };
  const R = renderScore(score, { width: 240, barsPerLine: 1, barNumbers: false, names: false, minStep: 18 });
  const el = R.el, top = R.sys && R.sys[0] ? R.sys[0].top : 0;
  el.setAttribute('viewBox', `0 ${top - 46} ${R.width} 104`);
  el.removeAttribute('width'); el.removeAttribute('height');
  el.setAttribute('class', (el.getAttribute('class') || '') + ' ak6-staff');
  const html = el.outerHTML;
  chipCache.set(id, html);
  return html;
}
const cards = (row, lo) => KEYS.map(k => ({ key: k, label: (lo ? LAB_LO : LAB)[k], chip: staffChip(row, k), tv: LAB[k] }));

const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
const wrong = row => ({
  stacc: '모든 음을 짧게 끊었어요 — 스타카토',
  ferm: `${ORD[row.f]} 음을 더 늘였어요 — 늘임표`,
  acc: `${ORD[row.a]} 음만 세게 — 악센트`,
  none: '쓰인 그대로 연주했어요' + (row.kind === 'dense' ? ' · 짧은 음이어도 이어서 냈어요' : ''),
})[row.ans];

// TV '틀린 갈래' 막대 이름 — 아래 tipOf 갈래와 같은 차례
export const TIPS_TV = ['느린 스타카토', '원래 긴 음에 붙은 늘임표', '높은 음이 아닌 센 음'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'slow'), text: '느린 가락에서 다르게 고른 적이 있어요. 느려도 음마다 짧게 끊기면 스타카토예요.' },
    { n: miss(p => p.kind === 'long'), text: '원래 긴 음에 붙은 늘임표에서 다르게 고른 적이 있어요. 쓰인 것보다 더 길게 끌면 늘임표예요.' },
    { n: miss(p => p.kind === 'low' || p.kind === 'mid'), text: '높은 음이 아닌 음이 세게 나거나 가운데 음이 늘어난 판에서 다르게 고른 적이 있어요. 높이보다 세기와 길이를 들어요.' },
  ], '쓰인 악보와 들은 소리를 견주어 기호를 찾았어요.');
}
// 헷갈리는 두 소리 — 8분이 섞인 가락을 쓰인 그대로 ↔ 스타카토로
export const NEAR = [
  { label: '쓰인 그대로', low: '쓰인 그대로', play: nearSegs(build({ kind: 'dense', m: 'P2', f: 4, a: 2, ans: 'none' })) },
  { label: '스타카토', low: '짧게 끊어서', play: nearSegs(build({ kind: 'dense', m: 'P2', f: 4, a: 2, ans: 'stacc' })) },
];

const ASK = lo => (lo ? '들어요 — 어떻게 바뀌었을까요?' : '들어요 — 어떤 기호가 붙은 악보일까요?');
const cell = pickCell({
  friend: 'turtle',
  keys: KEYS,
  label: (k, lo) => (lo ? LAB_LO : LAB)[k],
  cards,
  rightOf: row => row.ans,
  build,
  names: () => ['들은 소리'],
  say: {
    show: lo => (lo ? '같은 노래를 다르게 불러요. 눌러서 들어 봐요.' : '기호 하나가 소리를 바꿔요. 눌러서 들어 봐요.'),
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 어떻게 바뀌었는지 골라요' : 'TV 소리를 듣고 — 어떤 기호가 붙었는지 골라요'),
  },
  wrong,
  EX: lo => KEYS.map(k => ({ title: LAB[k], sub: LAB_LO[k], row: { kind: 'plain', m: 'P1', f: 3, a: 1, ans: k } })).map(x => (lo ? { ...x, title: x.sub, sub: '' } : x)),
  note: () => '쓰인 그대로와 견주어 들어요 · 컴퓨터로 만든 소리예요',
  pool: [PLAN[0], PLAN[1], PLAN[2], PLAN[3], PLAN[4], PLAN[5], PLAN[7]],
  passText: '세 번 이어서 들은 소리에 붙은 기호를 찾았어요',
  game: { title: lo => (lo ? '어떻게 바뀌었을까' : '어떤 기호가 붙었을까'), sub: lo => (lo ? '짧은 노래를 들려줘요. 짧게 끊었는지, 길게 늘였는지, 한 음만 세게 했는지, 그대로인지 골라요.' : '짧은 가락을 들려줘요. 단추의 악보와 견주어 어떤 기호가 붙었는지 골라요.') },
  PLAN, CUTS, SHUF, tipOf,
});

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default cell.mod;
