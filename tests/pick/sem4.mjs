// 셈4 센 음 찾기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 네 음 × 두 번. 세기가 가장 큰 음의 자리 = 답 · 그 음은 나머지보다 0.2 넘게 셈 · 두 번 다 같은 자리
//  tune 판은 네 음이 다르고 가장 높은 음의 자리 ≠ 답 · 그 밖은 네 음이 같음 · inst 판만 피아노가 아님
export function right(row, ns) {
  if (ns.length !== 1 || ns[0].length !== 8) return false;
  const a = ns[0], top = Math.max(...a.map(n => n.vel)), at = a.map((n, i) => (n.vel === top ? i : -1)).filter(i => i >= 0);
  if (at.length !== 2 || at[1] - at[0] !== 4) return false;
  if (!a.every(n => n.vel === top || top - n.vel > 0.2)) return false;
  const pos = at[0] + 1, ps = a.slice(0, 4).map(n => n.p), hiPos = ps.indexOf(Math.max(...ps)) + 1;
  if (String(pos) !== row.ans || !a.every((n, i) => n.p === a[i % 4].p)) return false;
  if (row.kind === 'tune') { if (new Set(ps).size !== 4 || hiPos === pos || hiPos !== row.hi) return false; }
  else if (new Set(ps).size !== 1) return false;
  return (row.kind === 'inst') === (a[0].inst !== 'piano');
}
export const opts = () => ['1', '2', '3', '4'];
export const norm = p => `${p.kind}:${p.inst || ''}:${p.hi || ''}`;

// 가장 높은 음을 고르는 봇(높이 = 세기로 헷갈림 · 음이 같으면 아무거나)
export const bots = ({ rr, notesOf }) => [['높은 음', (k, p, o) => {
  const ps = notesOf(p)[0].slice(0, 4).map(n => n.p), hi = Math.max(...ps);
  return new Set(ps).size > 1 ? String(ps.indexOf(hi) + 1) : o[Math.floor(rr() * o.length)];
}]];
// 씨앗마다 — 섞은 뒤에도 tune 판의 답 ≠ 가장 높은 음 자리
export function seedCheck(plan, { assert }) {
  assert.ok(plan.filter(p => p.kind === 'tune').every(p => String(p.hi) !== p.ans), '셈4 섞어도 높은 음 ≠ 센 음');
}
export function extra({ mod, assert }) {
  const kinds = mod.PLAN.map(p => p.kind);
  assert.ok(['tune', 'small', 'inst'].every(k => kinds.includes(k)), '셈4 꼴 셋');
  assert.ok(mod.PLAN.filter(p => p.stage === 'twist').every(p => p.kind === 'tune' || p.kind === 'small'), '셈4 비틀기 판은 한 가지씩만');
  // 틀린 갈래 — 높은 음 자리를 고른 tune 판 셋 → 높은 음 갈래
  const res = mod.PLAN.map(p => p.kind !== 'tune'), picks = mod.PLAN.map(p => (p.kind === 'tune' ? String(p.hi) : p.ans));
  assert.ok(/높은 음과 센 음은 달라요/.test(mod.tipOf(mod.PLAN, res, picks)), '셈4 높은 음 갈래');
}
