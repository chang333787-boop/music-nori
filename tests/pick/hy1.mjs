// 형1 같은 가락·다른 가락 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 같은 = 높이 · 길이가 모두 같음 / 비슷한 = 끝 음 높이만 다름 / 다른 = 첫 음부터 다름(길이 판은 길이는 같음)
export function right(row, ns, { seq, rel }) {
  const [a, b] = ns;
  if (ns.length !== 2) return false;
  const sameLen = a.length === b.length && a.every((n, k) => n.d === b[k].d);
  const diffAt = a.length === b.length ? a.map((n, k) => (n.p === b[k].p ? null : k)).filter(k => k != null) : null;
  if (row.right === 'same') return seq(a) === seq(b) && (row.kind === 'inst') === (a[0].inst !== b[0].inst) && (row.kind === 'loud') === (a[0].vel !== b[0].vel);
  if (row.right === 'near') return sameLen && diffAt.length === 1 && diffAt[0] === a.length - 1 && a[0].inst === b[0].inst;
  return a[0].p !== b[0].p && (row.kind !== 'rhythm' || (sameLen && JSON.stringify(rel(a)) === JSON.stringify(rel(b))));
}
export const opts = (p, k, { mod }) => (k < mod.CUTS[0] ? ['same', 'diff'] : ['same', 'near', 'diff']);
export const norm = p => `${p.kind}:${p.a}:${p.b || ''}`;

// '비슷한' 단추가 새로 나온 판에 그 단추를 누르는 봇(단추가 나온 까닭을 읽음)
export const bots = ({ mod, rr }) => [['새 단추', (k, p, o) => (k >= mod.CUTS[0] ? 'near' : o[Math.floor(rr() * o.length)])]];
// 씨앗마다 — 비슷한 판은 단추가 나온 뒤에만
export function seedCheck(plan, { mod, ansOf, assert }) {
  assert.ok(plan.slice(0, mod.CUTS[0]).every(p => ansOf(p) !== 'near'), '형1 비슷한 판은 단추가 나온 뒤에만');
}
// 1~2학년 판은 '가락' 대신 '노래'
export function extra({ mod, spec, kitOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(low.items.every(it => /노래$/.test(it.label)) && !/가락/.test(low.say.kid), "형1 1~2학년 '노래'");
  assert.ok(spec.items.every(it => /가락$/.test(it.label)), "형1 3학년부터 '가락'");
  assert.deepEqual(spec.items.map(it => it.locked), [false, true, false], "형1 '비슷한' 단추는 중간에 나옴");
}
