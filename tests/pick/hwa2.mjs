// 화2 다장조 주요 3화음 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 첫째 도막 = 도(60) 한 음 · 둘째 도막 = 세 음이 함께(끝 두 박 넘게 겹침). 둘째 음들의 음이름 모음(12로 나눈 나머지)으로 답을 다시 셈
//  Ⅰ = {도 미 솔} · Ⅳ = {파 라 도} · Ⅴ = {솔 시 레} — 다른 모음이면 떨어짐 · 높은 판은 한 옥타브 위 · 악기 판은 하프 · 실로폰
const PC = { I: [0, 4, 7], IV: [5, 9, 0], V: [7, 11, 2] };
export const pcsOf = ns => [...new Set(ns.map(n => ((n.p % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
export const degreeOf = (ns, tonic) => Object.keys(PC).find(k => pcsOf(ns.map(n => ({ p: n.p - tonic }))) === PC[k].slice().sort((a, b) => a - b).join(',')) || null;
export function right(row, ns, { overlap }) {
  if (ns.length !== 2 || ns[0].length !== 1 || ns[0][0].p !== 60) return false;
  const ch = ns[1];
  if (!overlap(ch) || new Set(ch.map(n => n.p)).size !== 3) return false;
  if (row.kind === 'high' ? Math.min(...ch.map(n => n.p)) < 72 : Math.max(...ch.map(n => n.p)) > 74) return false;
  if (!ch.every(n => n.inst === (row.kind === 'inst' ? ['harp', 'xylo'][row.m] : 'piano'))) return false;
  return degreeOf(ch, 60) === row.ans;
}
export const opts = () => ['I', 'IV', 'V'];
export const norm = p => `${p.kind}:${p.m ?? ''}`;

// 1~2학년 판은 '도미솔'처럼 · 3학년부터 'Ⅰ 도미솔' · 화음 음은 설계서의 MIDI 수 그대로
export function extra({ mod, spec, kitOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['도미솔', '파라도', '솔시레'], '화2 1~2학년 단추');
  assert.deepEqual(spec.items.map(it => it.label), ['Ⅰ 도미솔', 'Ⅳ 파라도', 'Ⅴ 솔시레'], '화2 단추');
  assert.deepEqual(mod.CHORD, { I: [60, 64, 67], IV: [65, 69, 72], V: [67, 71, 74] });
  assert.ok(['arp', 'block', 'inst', 'high'].every(k => mod.PLAN.some(p => p.kind === k)), '화2 꼴 넷');
}
