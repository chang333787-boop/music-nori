// 화3 바장조·사장조 주요 3화음 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 첫째 도막 = 그 조의 으뜸음 한 음(바장조 파 65 · 사장조 솔 67) · 둘째 = 세 음이 함께.
//  답 = 둘째 음들의 음이름 모음을 **으뜸음에서 잰 자리**(0 · 5 · 7 반음 위의 장3화음)로 다시 셈 — 표에 적은 답을 믿지 않음
const TONIC = { F: 65, G: 67 };
const PC = { I: [0, 4, 7], IV: [0, 5, 9], V: [2, 7, 11] };
const rel = (ns, t) => [...new Set(ns.map(n => (((n.p - t) % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
export function right(row, ns, { overlap }) {
  if (ns.length !== 2 || ns[0].length !== 1 || ns[0][0].p !== TONIC[row.key]) return false;
  const ch = ns[1];
  if (!overlap(ch) || new Set(ch.map(n => n.p)).size !== 3) return false;
  if (!ch.every(n => n.inst === (row.kind === 'inst' ? ['harp', 'xylo'][row.m] : 'piano'))) return false;
  const deg = Object.keys(PC).find(k => rel(ch, TONIC[row.key]) === PC[k].join(','));
  // home 판 = 도미솔(음이름 0 4 7) · 그 밖의 판은 도미솔이 아님
  const ceg = rel(ch, 0) === '0,4,7';
  return deg === row.ans && ceg === (row.kind === 'home');
}
export const opts = () => ['I', 'IV', 'V'];
export const norm = p => `${p.key}:${p.kind}:${p.m ?? ''}:${p.block ? 'b' : ''}`;

// 조만 보는 봇(바장조면 Ⅰ · 사장조면 Ⅴ) · 도미솔이면 늘 Ⅰ이라 고르는 봇(다장조에서 배운 대로)
export const bots = ({ notesOf }) => [
  ['조만', (k, p) => (p.key === 'F' ? 'I' : 'V')],
  ['도미솔은 Ⅰ', (k, p, o) => { const ps = notesOf(p)[1].map(n => n.p % 12).sort((a, b) => a - b).join(','); return ps === '0,4,7' ? 'I' : o[k % o.length]; }],
];
// 조마다 6판 · 도미솔이 바장조 Ⅴ · 사장조 Ⅳ로 다 나옴 · 화음 음은 설계서의 MIDI 수 그대로 · 도미솔 판은 섞어도 그대로
export function extra({ mod, assert }) {
  assert.equal(mod.PLAN.filter(p => p.key === 'F').length, 6, '화3 바장조 6판');
  assert.equal(mod.PLAN.filter(p => p.key === 'G').length, 6, '화3 사장조 6판');
  assert.ok(mod.PLAN.some(p => p.kind === 'home' && p.key === 'F' && p.ans === 'V') && mod.PLAN.some(p => p.kind === 'home' && p.key === 'G' && p.ans === 'IV'), '화3 도미솔 = 바장조 Ⅴ · 사장조 Ⅳ');
  assert.deepEqual(mod.KEY.F.CH, { I: [65, 69, 72], IV: [70, 74, 77], V: [60, 64, 67] });
  assert.deepEqual(mod.KEY.G.CH, { I: [67, 71, 74], IV: [60, 64, 67], V: [62, 66, 69] });
  for (const p of mod.PLAN.filter(q => q.kind === 'home')) assert.deepEqual(mod.SHUF.flip(p), p, '화3 도미솔 판은 섞어도 그대로');
}
