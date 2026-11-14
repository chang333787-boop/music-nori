// 박1 고른 박 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 소리 사이 간격(시작 때 차이 일곱)을 음 목록에서 다시 셈 — 고르게 = 모두 같음 · 들쭉날쭉 = 가장 긴 ÷ 가장 짧은 ≥ 1.25
//  꼴: loud = 세기만 달라짐(간격과 상관없음) · tune = 음만 움직임 · 그 밖은 세기 · 음 모두 같음
export function right(row, ns) {
  if (ns.length !== 1 || ns[0].length !== 8) return false;
  const a = ns[0], iv = a.slice(1).map((n, k) => n.t - a[k].t), lo = Math.min(...iv), hi = Math.max(...iv);
  const even = hi - lo < 1e-3, uneven = hi / lo >= 1.25;
  if (row.ans === 'even' ? !even : !uneven) return false;
  const vels = new Set(a.map(n => n.vel)).size, ps = new Set(a.map(n => n.p)).size;
  return (row.kind === 'loud') === (vels > 1) && (row.kind === 'tune') === (ps > 1);
}
export const opts = () => ['even', 'uneven'];
export const norm = p => `${p.kind}:${p.j}`;

// 빠르기 · 크기 · 음이 판마다 달라도 꼴로는 답을 못 고름 — 원판에 꼴마다 고르게 판이 있음 · 같은 꼴이면 답과 상관없이 소리 길이가 같음(8B)
export function extra({ mod, notesOf, spec, assert }) {
  const kinds = mod.PLAN.map(p => `${p.kind}:${p.ans}`);
  for (const k of ['plain', 'fast', 'slow', 'loud', 'tune']) assert.ok(kinds.includes(k + ':even'), '박1 고르게 판 꼴 ' + k);
  for (const k of ['loud', 'tune']) assert.ok(kinds.includes(k + ':uneven'), '박1 들쭉날쭉 판 꼴 ' + k);
  assert.ok(mod.PLAN.filter(p => p.stage === 'twist').every(p => p.kind === 'loud' || p.kind === 'tune'), '박1 비틀기 판은 한 가지씩만');
  // 들쭉날쭉한 꼴은 긴-짧은이 되풀이되지 않음(리듬으로 들리지 않게) — 차이 부호가 + - + - …로 번갈아 가지 않음
  for (const p of mod.PLAN.filter(q => q.ans === 'uneven')) {
    const a = notesOf(p)[0], iv = a.slice(1).map((n, k) => n.t - a[k].t), sg = iv.slice(1).map((x, k) => Math.sign(x - iv[k]));
    assert.ok(!sg.every((s, k) => !k || s === -sg[k - 1]), '박1 긴-짧은 되풀이 X: ' + JSON.stringify(p));
  }
  assert.ok(spec.items.every(it => !it.locked), '박1 단추 둘은 처음부터');
}
