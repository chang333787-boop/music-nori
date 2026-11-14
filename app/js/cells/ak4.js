// 악4 음이름 찾기 — 다 라 마 바 사 가 나(11-14 · 묶음 C · 흐름 m8 · s5 · 난이도 4 · 거북 줄)
//  계이름(도 레 미)은 도의 자리를 따라 움직이지만 음이름은 자리가 정해져 있다(다 = 가온 도 자리). 이 칸은
//   **첫 음 하나를 이름과 함께 듣고 → 그 음부터 네 음 가락을 들은 뒤 → 들은 가락의 음이름 카드**를 고른다(카드 = 글 '사 가 나 다').
//  차례: 소개(다에서 시작) → 발전(다가 아닌 음 — 사 · 바 · 마에서 시작) → 비틀기(반 계단 마-바 · 나-다 / 나 다음 다로 넘어감) → 마무리(섞어서)
//  음 높이 정본 = 표의 글을 MIDI로 바꾼 것(다 60 · 라 62 · 마 64 · 바 65 · 사 67 · 가 69 · 나 71 · 높은 다 72 · 높은 라 74 — 앞 음에서 가장 가까운 자리 · 60~74 안)
//   카드 글에는 '높은'을 붙이지 않는다(음이름은 옥타브와 상관없이 같은 이름).
//  섞을 때 뒤집기 = 답을 다음 카드로(카드 글 · 자리 그대로 · 소리만 바뀜). 모든 판: 첫 음 한 박 · 쉼 0.4초 · 네 박(BEAT 0.42 · 피아노 0.6).
//  보기 카드 넷은 오선 그림 + 음이름(흐름 m8 '오선에서 읽기') — 게임은 듣기 + 음이름(오선만 읽는 판은 악3 · 악5가 맡음)
//  ⚠ 성취기준 표시(std)는 악2 것을 그대로 옮겼고 5~6학년 칸에 맞는지 원문으로 확인하지 못했다.
//  보기 · 연습 · 확인 게임 · TV 소리 모드는 공용 틀(_pick.js)
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { staffCard } from './_staff.js';

export const KEYS = ['a', 'b', 'c'];
const ORD = ['첫째', '둘째', '셋째'];
const PC = { 다: 0, 라: 2, 마: 4, 바: 5, 사: 7, 가: 9, 나: 11 };
export const NM = { 0: '다', 2: '라', 4: '마', 5: '바', 7: '사', 9: '가', 11: '나' };
// '사 가 나 다' → [67, 69, 71, 72] — 첫 음은 60~71 · 다음 음은 앞 음에서 가장 가까운 같은 이름 자리(60~74 안)
export function midi(text) {
  const ns = text.split(' ');
  const out = [60 + PC[ns[0]]];
  for (const n of ns.slice(1)) {
    const c = [PC[n] + 60, PC[n] + 72].filter(p => p <= 74), prev = out[out.length - 1];
    out.push(c.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a)));
  }
  return out;
}
export const nameOf = p => NM[((p % 12) + 12) % 12];

// 판 — { stage, kind, set: [카드 글 셋], ans } · kind: do(다에서) · other(다가 아닌 음에서) · half(반 계단) · wrap(나 다음 다) · mix
const R = (stage, kind, set, ans) => ({ stage, kind, set, ans });
export const PLAN = [
  R('intro', 'do', ['다 라 마 바', '다 마 사 마', '다 다 라 마'], 0),
  R('intro', 'do', ['다 마 라 다', '다 사 마 다', '다 바 마 라'], 1),
  R('intro', 'do', ['다 라 마 라', '다 마 바 사', '다 사 가 사'], 2),
  R('grow', 'other', ['사 가 나 다', '사 마 다 마', '사 바 마 라'], 0),
  R('grow', 'other', ['바 사 가 사', '바 가 다 가', '바 마 라 다'], 1),
  R('grow', 'other', ['마 사 마 다', '마 바 사 가', '마 라 다 라'], 2),
  R('twist', 'half', ['마 바 마 라', '마 사 마 라', '마 라 마 바'], 0),
  R('twist', 'wrap', ['가 나 다 나', '가 다 라 다', '가 사 바 사'], 1),
  R('twist', 'wrap', ['사 가 나 다', '사 가 사 바', '사 나 라 나'], 2),
  R('twist', 'half', ['나 다 라 다', '나 가 사 가', '나 다 나 가'], 0),
  R('end', 'mix', ['가 사 바 마', '가 나 다 라', '가 바 라 다'], 1),
  R('end', 'mix', ['라 마 바 마', '라 바 가 바', '라 다 라 마'], 2),
];
export const CUTS = stageCuts(PLAN);
export const SHUF = { flip: p => ({ ...p, ans: (p.ans + 1) % 3 }), answerOf: p => KEYS[p.ans] };

const first = row => row.set[0].split(' ')[0];
function build(row) {
  const ps = midi(row.set[row.ans]);
  return [
    { lines: [line([[ps[0], 1]], { inst: 'piano', vel: 0.6 })], cap: `첫 음 = ${first(row)}`, gap: 0.4 },
    { lines: [line(ps.map(p => [p, 1]), { inst: 'piano', vel: 0.6 })], cap: row.set[row.ans] },
  ];
}
const wrong = row => `${row.set[row.ans]} — ${first(row)}부터 시작했어요${row.kind === 'half' ? ' · 마-바 · 나-다는 반 계단이에요' : row.kind === 'wrap' ? ' · 나 다음은 다예요' : ''}`;
// 판마다 카드 셋(음이름 글 + 같은 음의 작은 오선 — 흐름 m8 '오선에서 읽기') — 표의 글만 보고 정함(뒤집어도 같은 카드)
export const cards = row => row.set.map((t, k) => ({ key: KEYS[k], label: t, chip: staffCard(midi(t), { lo: -2, hi: 9 }), tv: t }));

export const TIPS_TV = ['다가 아닌 음에서 시작한 가락', '반 계단(마-바 · 나-다)', '나 다음 다로 넘어가는 가락'];
export function tipOf(plan, results) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p)).length;
  return factTip(results, [
    { n: miss(p => p.kind === 'other'), text: '다가 아닌 음에서 시작한 가락에서 헷갈린 적이 있어요. 첫 음 이름을 먼저 듣고, 거기서 한 계단씩 세어 봐요.' },
    { n: miss(p => p.kind === 'half'), text: '반 계단이 든 가락에서 헷갈린 적이 있어요. 마와 바 · 나와 다 사이는 반 계단이라 아주 가깝게 들려요.' },
    { n: miss(p => p.kind === 'wrap'), text: '나 다음으로 올라가는 가락에서 헷갈린 적이 있어요. 나 다음은 다시 다예요.' },
  ], '첫 음 이름에서 시작해 음이름을 모두 읽었어요.');
}
export const NEAR = [
  { label: '마 바 마 라(반 계단)', low: '마 바 마 라', play: nearSegs(build({ ...PLAN[6], ans: 0 })) },
  { label: '마 사 마 라(한 계단 더)', low: '마 사 마 라', play: nearSegs(build({ ...PLAN[6], ans: 1 })) },
];

// 보기 카드 — 소리 + 오선 그림(아래 show에서 덧붙임)
const EXS = [
  { title: '다 라 마 바 사 가 나 다', sub: '가온 도 자리가 다', text: '다 라 마 바 사 가 나 다' },
  { title: '사에서 시작', sub: '사 가 나 다', text: '사 가 나 다' },
  { title: '마-바 반 계단', sub: '마 바 마 바', text: '마 바 마 바' },
  { title: '나-다 반 계단', sub: '나 다 나 다', text: '나 다 나 다' },
];
const ASK = () => '첫 음 이름을 보고 — 들은 가락의 음이름은 어느 것인가요?';
const cell = pickCell({
  friend: 'turtle',
  keys: KEYS,
  label: k => ORD[KEYS.indexOf(k)],
  cards,
  rightOf: row => KEYS[row.ans],
  build,
  names: () => ['첫 음', '들은 가락'],
  say: {
    show: () => '음이름은 다 라 마 바 사 가 나 — 도가 어디 있든 자리가 정해져 있어요. 눌러서 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: () => 'TV 소리를 듣고 — 들은 가락의 음이름 카드를 골라요',
  },
  wrong,
  EX: () => EXS.map(e => ({ title: e.title, sub: e.sub, row: { set: [e.text], ans: 0 } })),
  note: () => '컴퓨터로 만든 피아노 소리예요',
  pool: PLAN.slice(0, 10),
  passText: '세 번 이어서 음이름 카드를 찾았어요',
  game: {
    title: '음이름 찾기',
    sub: () => '첫 음을 이름과 함께 들려주고, 그 음부터 네 음 가락을 들려줘요. 들은 가락의 음이름 카드를 골라요.',
  },
  PLAN, CUTS, SHUF, tipOf,
});

function show(ui, kit) {
  const off = cell.mod.show(ui, kit);
  ui.stage.querySelectorAll('.pk-ex').forEach((b, i) => {
    const e = EXS[i];
    if (e) b.insertAdjacentHTML('beforeend', `<span class="ak-staff">${staffCard(midi(e.text), { lo: -2, hi: 7, width: e.text.length > 10 ? 220 : 150 })}</span>`);
  });
  return off;
}

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default { ...cell.mod, show };
