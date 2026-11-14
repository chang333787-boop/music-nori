// 화1 하나씩·함께 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 함께 = 어느 때든 두 음이 겹쳐 남 / 하나씩 = 겹치는 음이 없음
export const right = (row, ns, { overlap }) => ns.length === 1 && overlap(ns[0]) === (row.ans === 'many');
export const opts = () => ['one', 'many'];
export const norm = p => `${p.kind}:${p.m}`;

// 악기가 둘인데 하나씩인 판 · 악기가 하나인데 함께인 판이 원판에 있다(악기 수로 답을 못 맞힘)
export function extra({ mod, notesOf, assert }) {
  const kinds = mod.PLAN.map(p => `${p.kind}:${p.ans}`);
  assert.ok(kinds.includes('turn:one') && kinds.includes('self:many') && kinds.includes('soft:many') && kinds.includes('round:many'));
  for (const p of mod.PLAN.filter(q => q.kind === 'turn')) {
    const insts = q => new Set(notesOf(q)[0].map(n => n.inst)).size;
    assert.equal(insts({ ...p, ans: 'one' }), 2, '번갈아 = 악기 둘');
    assert.equal(insts({ ...p, ans: 'many' }), 2, '함께도 악기 둘(악기 수는 같음)');
  }
  for (const p of mod.PLAN.filter(q => q.kind === 'self' || q.kind === 'chord')) assert.equal(new Set(notesOf({ ...p, ans: 'many' })[0].map(n => n.inst)).size, 1, '한 악기가 여러 음');
}
