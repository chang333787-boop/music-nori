// 악5 조표 넣고 듣기 — 조표 · 임시표(11-14 · 묶음 C · 흐름 s6 · 난이도 4 · 거북 줄)
//  같은 두 마디 가락을 **조표 없이 먼저 듣고 → 무엇인가 붙은 소리를 들은 뒤 → 어느 악보였는지** 고른다(단추 넷 = 오선 카드 넷 · 같은 가락을 네 가지로 적음).
//   그대로(아무것도 없음) · ♯ 조표(다섯째 줄 파 자리 — 파가 모두 반음 올라감) · ♯ 임시표(둘째 마디 파 앞 — 그 음만) · ♭ 조표(셋째 줄 시 자리 — 시가 반음 내려감)
//  가락 바탕 셋(두 마디 · 마디마다 두 음 · 파가 마디마다 하나 · 시가 하나): B1 파 미 | 파 시 · B2 솔 파 | 파 시 · B3 시 파 | 미 파
//   파 둘을 서로 다른 마디에 둔다 — 임시표는 그 마디 안에서만 쓰이므로(같은 마디면 둘째 파도 올라가 '한 음만'이 거짓이 됨).
//  차례: 소개(임시표 단추 없이 셋) → 발전(임시표 단추가 나옴) → 비틀기(둘째 소리만 리코더 · 한 옥타브 높게 — 한 판에 하나) → 마무리(새 바탕 B3)
//  섞을 때 뒤집기: 소개는 그대로 → ♯ 조표 → ♭ 조표 → 그대로(임시표 단추가 나오기 전) · 그 뒤는 넷을 돎. 카드 넷은 바탕만 보고 그림(답과 상관없음).
//  모든 판: 네 음(0.36초씩) · 쉼 0.4초 · 네 음 — 답과 상관없이 길이가 같다.
//  화면 글에 장조 이름은 쓰지 않는다 — 조표가 무엇을 바꾸는지만(묶음 C §F 7).
//  ⚠ '임시표는 그 마디 안에서만' · '조표 ♯ 하나 = 파 · ♭ 하나 = 시'는 일반 악전이고 저장소 · 사실 파일 근거가 없다(확인 못 함).
//  ⚠ 성취기준 표시(std)는 악2 것을 그대로 옮겼고 5~6학년 칸에 맞는지 원문으로 확인하지 못했다.
//  ⚠ 귀로 확인하지 못한 것: 반음 하나 차이(파 ↔ 파♯ · 시 ↔ 시♭)가 크롬북 스피커에서 · 리코더로 바뀐 판에서 또렷이 갈리는지.
import { pickCell, line, nearSegs } from './_pick.js';
import { factTip, stageCuts } from '../cellkit.js';
import { staffCard } from './_staff.js';

export const KEYS = ['none', 'ksharp', 'osharp', 'kflat'];
export const BASE = { B1: [65, 64, 65, 71], B2: [67, 65, 65, 71], B3: [71, 65, 64, 65] };
const NOTE = 0.36;
// 꼴 — 바탕 음에 조표 · 임시표를 붙인 소리(마디마다 두 음 · 둘째 마디 = 셋째 · 넷째 음)
export function variant(ps, k) {
  const pc = p => ((p % 12) + 12) % 12;
  if (k === 'ksharp') return ps.map(p => (pc(p) === 5 ? p + 1 : p));
  if (k === 'osharp') return ps.map((p, i) => (i >= 2 && pc(p) === 5 ? p + 1 : p));
  if (k === 'kflat') return ps.map(p => (pc(p) === 11 ? p - 1 : p));
  return ps.slice();
}
const KEYSIG = { ksharp: 'sharp', kflat: 'flat' };
export const RANGE = { lo: -1, hi: 11 };

// 판 — { stage, kind: plain | inst(둘째 소리만 리코더) | high(한 옥타브 높게), base, right }
//  마무리 둘째 판은 ♭ 조표(뒤집으면 그대로) — 첫째 판(♯ 임시표 · 뒤집으면 ♭ 조표)과 같은 답이 될 수 있게. 예전(그대로)엔 끝 두 판의 답이 늘 달라
//  '앞 판 답 피하기' 봇이 9%대에 머물렀음(F5) · 답 수를 3 · 3 · 3 · 3으로 두려고 비틀기 리코더 B1 판을 ♭ 조표 → 그대로로
const R = (stage, kind, base, right) => ({ stage, kind, base, right });
export const PLAN = [
  R('intro', 'plain', 'B1', 'ksharp'),
  R('intro', 'plain', 'B1', 'kflat'),
  R('intro', 'plain', 'B2', 'none'),
  R('grow', 'plain', 'B1', 'osharp'),
  R('grow', 'plain', 'B2', 'ksharp'),
  R('grow', 'plain', 'B2', 'kflat'),
  R('twist', 'inst', 'B1', 'none'),
  R('twist', 'high', 'B2', 'osharp'),
  R('twist', 'inst', 'B2', 'ksharp'),
  R('twist', 'high', 'B1', 'none'),
  R('end', 'plain', 'B3', 'osharp'),
  R('end', 'plain', 'B3', 'kflat'),
];
export const CUTS = stageCuts(PLAN);
const CYC3 = { none: 'ksharp', ksharp: 'kflat', kflat: 'none' };
const CYC4 = { none: 'ksharp', ksharp: 'osharp', osharp: 'kflat', kflat: 'none' };
export const SHUF = { flip: p => ({ ...p, right: (p.stage === 'intro' ? CYC3 : CYC4)[p.right] }), answerOf: p => p.right };
// 맞힐 확률 — 임시표 단추가 나오기 전은 셋 중 하나 · 그 뒤는 넷 중 하나
export const GUESS = plan => plan.map((x, k) => (k < CUTS[0] ? 1 / 3 : 1 / 4));

const baseOf = row => BASE[row.base].map(p => p + (row.kind === 'high' ? 12 : 0));
function build(row) {
  const b = baseOf(row), opt = { inst: 'piano', vel: 0.6, beat: NOTE };
  return [
    { lines: [line(b.map(p => [p, 1]), opt)], cap: '조표 없이', gap: 0.4 },
    { lines: [line(variant(b, row.right).map(p => [p, 1]), { ...opt, inst: row.kind === 'inst' ? 'recorder' : 'piano' })], cap: LAB[row.right].replace('\n', ' ') },
  ];
}
const LAB = { none: '그대로', ksharp: '♯ 조표\n파마다', osharp: '♯ 임시표\n한 음만', kflat: '♭ 조표\n시마다' };
const wrong = row => ({
  none: `쓰인 그대로였어요${row.kind === 'inst' ? ' · 악기만 달라요' : ''}`,
  ksharp: '♯ 조표 — 파가 모두 반음 올라갔어요',
  osharp: '♯ 임시표 — 둘째 마디의 파만 올라갔어요',
  kflat: '♭ 조표 — 시가 반음 내려갔어요',
}[row.right]);
// 카드 넷 — 바탕(과 높이)만 보고 그림
const card = (row, k) => staffCard(variant(baseOf(row), k), { ...RANGE, bars: 2, key: KEYSIG[k] || null });
export const cards = row => KEYS.map(k => ({ key: k, label: LAB[k], chip: card(row, k), tv: LAB[k].replace('\n', ' ') }));

export const TIPS_TV = ['조표와 임시표', '악기가 달라진 판', '높아진 판'];
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  return factTip(results, [
    { n: miss((p, pick) => (p.right === 'ksharp' && (pick == null || pick === 'osharp')) || (p.right === 'osharp' && (pick == null || pick === 'ksharp'))), text: '♯ 조표와 ♯ 임시표를 헷갈린 적이 있어요. 조표는 파를 모두 올리고, 임시표는 그 마디의 그 음만 올려요 — 파가 몇 번 올라갔는지 들어 봐요.' },
    { n: miss(p => p.kind === 'inst'), text: '둘째 소리의 악기가 달라진 판에서 헷갈린 적이 있어요. 악기가 바뀌어도 높이만 견줘 봐요.' },
    { n: miss(p => p.kind === 'high'), text: '높아진 판에서 헷갈린 적이 있어요. 높이가 달라도 파 · 시 자리가 바뀌었는지만 들어요.' },
  ], '조표 · 임시표가 무엇을 바꾸는지 모두 가려냈어요.');
}
export const NEAR = [
  { label: '♯ 조표(파 둘 다)', low: '♯ 조표(파 둘 다)', play: nearSegs(build({ kind: 'plain', base: 'B1', right: 'ksharp' })) },
  { label: '♯ 임시표(둘째 마디 파만)', low: '♯ 임시표(둘째 마디 파만)', play: nearSegs(build({ kind: 'plain', base: 'B1', right: 'osharp' })) },
];

const EXS = [
  { title: '♯ 조표', sub: '파마다 올려요', k: 'ksharp' },
  { title: '♯ 임시표', sub: '그 마디의 그 음만', k: 'osharp' },
  { title: '♭ 조표', sub: '시마다 내려요', k: 'kflat' },
  { title: '그대로', sub: '쓰인 그대로', k: 'none' },
];
const ASK = lo => (lo ? '처음 소리와 견주어 — 둘째 소리에 맞는 그림을 골라요' : '조표 없이 먼저 듣고 — 둘째 소리는 어느 악보인가요?');
const cell = pickCell({
  friend: 'turtle',
  keys: KEYS,
  label: k => LAB[k].replace('\n', ' '),
  cards,
  lock: { key: 'osharp', at: CUTS[0], tell: () => '임시표 단추가 나왔어요' },
  rightOf: row => row.right,
  build,
  names: () => ['조표 없이', '들은 소리'],
  say: {
    show: () => '조표는 그 음을 모두 바꾸고, 임시표는 그 마디의 그 음만 바꿔요. 눌러서 들어 봐요.',
    follow: ASK,
    game: ASK,
    kid: lo => (lo ? 'TV 소리를 듣고 — 둘째 소리에 맞는 그림을 골라요' : 'TV 소리를 듣고 — 둘째 소리에 맞는 악보를 골라요'),
  },
  wrong,
  EX: () => EXS.map(e => ({ title: e.title, sub: e.sub, row: { kind: 'plain', base: 'B1', right: e.k } })),
  note: () => '컴퓨터로 만든 악기 소리예요',
  pool: PLAN.filter(p => p.stage !== 'intro'),
  passText: '세 번 이어서 조표 · 임시표를 가려냈어요',
  game: {
    title: '조표 넣고 듣기',
    sub: () => '조표 없이 먼저 들려주고, 무엇인가 붙은 소리를 들려줘요. 둘째 소리에 맞는 악보를 골라요. 임시표 단추는 중간에 나와요.',
  },
  PLAN, CUTS, SHUF, GUESS, tipOf,
});

function show(ui, kit) {
  const off = cell.mod.show(ui, kit);
  ui.stage.querySelectorAll('.pk-ex').forEach((b, i) => {
    const e = EXS[i];
    if (e) b.insertAdjacentHTML('beforeend', `<span class="ak-staff">${card({ kind: 'plain', base: 'B1' }, e.k)}</span>`);
  });
  return off;
}

export const TVS = true;
export const tvsSpec = cell.tvsSpec;
export default { ...cell.mod, show };
