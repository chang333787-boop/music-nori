// 리13 둘로 나눌까 셋으로 나눌까 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 답 = 큰북 간격 ÷ 하이햇 간격(2 → two · 3 → three · 오차 0.02) · 큰북 · 하이햇은 고른 간격 · 하이햇이 큰북마다 함께 시작
//  3/4(trap two)은 큰북 셋마다 센 박 · 6/8(trap three)은 둘마다 — 센 박 간격이 같음 · 가락은 tune 판에만(피아노)
const gaps = ts => ts.slice(1).map((t, i) => t - ts[i]);
const even = gs => gs.every(g => Math.abs(g - gs[0]) < 1e-3);
export function right(row, ns) {
  if (ns.length !== 1) return false;
  const a = ns[0], kick = a.filter(n => n.drum === 'kick'), hat = a.filter(n => n.drum === 'hat'), mel = a.filter(n => !n.drum);
  const kg = gaps(kick.map(n => n.t)), hg = gaps(hat.map(n => n.t));
  if (kick.length < 4 || !even(kg) || !even(hg)) return false;
  const ratio = kg[0] / hg[0], want = row.right === 'two' ? 2 : 3;
  if (Math.abs(ratio - want) > 0.02 || hat.length !== kick.length * want) return false;
  if ((row.kind === 'tune') !== (mel.length > 0) || mel.some(n => n.inst !== 'piano')) return false;
  const loud = kick.map(n => n.vel > 0.8);
  if (row.kind === 'trap') {
    const bar = want === 2 ? 3 : 2;
    if (!loud.every((l, i) => l === (i % bar === 0)) || Math.abs(bar * kg[0] - 1.5) > 1e-3) return false;
  } else if (new Set(kick.map(n => n.vel)).size !== 1) return false;
  return true;
}
export const opts = () => ['two', 'three'];
export const norm = p => `${p.kind}:${p.mode}`;

// 빠르기만 듣는 봇 — 큰북 간격(또는 하이햇 간격)이 어떤 값보다 크면/작으면 셋(값은 이 표에서 나오는 모든 간격 사이 · 두 방향)
//  + 센 박이 있으면 둘(3/4 함정만 보는 봇) · 가락이 있으면 셋
export function bots({ mod, notesOf }) {
  const iv = (p, d) => { const ts = notesOf(p)[0].filter(n => n.drum === d).map(n => n.t); return +(ts[1] - ts[0]).toFixed(4); };
  const all = d => [...new Set(mod.PLAN.flatMap(p => [p, mod.SHUF.flip(p)]).map(p => iv(p, d)))].sort((x, y) => x - y);
  const out = [];
  for (const d of ['kick', 'hat']) {
    const vs = all(d);
    for (let i = 1; i < vs.length; i++) {
      const th = (vs[i] + vs[i - 1]) / 2;
      out.push([`${d} > ${th.toFixed(3)} → 셋`, (k, p) => (iv(p, d) > th ? 'three' : 'two')], [`${d} < ${th.toFixed(3)} → 셋`, (k, p) => (iv(p, d) < th ? 'three' : 'two')]);
    }
  }
  out.push(['센 박 → 둘', (k, p) => (new Set(notesOf(p)[0].filter(n => n.drum === 'kick').map(n => n.vel)).size > 1 ? 'two' : 'three')]);
  out.push(['가락 → 셋', (k, p) => (notesOf(p)[0].some(n => !n.drum) ? 'three' : 'two')]);
  return out;
}
// 뒤집어도 빠르기 짝 · 꼴 그대로 · 단추 글 · 1~2학년 글 · 빠르기 짝마다 두 답이 같은 길이
export function extra({ mod, spec, kitOf, assert }) {
  assert.deepEqual(spec.items.map(it => it.label), ['둘로 — 2/4', '셋으로 — 6/8'], '리13 단추 글');
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['둘씩', '셋씩'], '리13 1~2학년 단추 글');
  for (const [m, [n2, k2, n3, k3]] of Object.entries(mod.MODES)) assert.ok(Math.abs(n2 * k2 - n3 * k3) < 1e-9, `리13 ${m} 두 답 길이 같음`);
  for (const p of mod.PLAN) { const q = mod.SHUF.flip(p); assert.ok(q.mode === p.mode && q.kind === p.kind && q.right !== p.right, '리13 뒤집으면 답만'); }
  // 빠르기 한 가지만으로 답이 새지 않게 — 6/8 쪽 큰 박이 느린 짝 · 빠른 짝 · 같은 짝이 모두 있고, 쪼갠 박도 마찬가지
  const rel = f => new Set(mod.PLAN.map(p => { const [, k2, , k3] = mod.MODES[p.mode]; return Math.sign(+(f(k3, 3) - f(k2, 2)).toFixed(4)); }));
  assert.equal(rel(k => k).size, 3, '리13 큰 박 빠르기 관계 셋 다');
  assert.equal(rel((k, r) => k / r).size, 3, '리13 쪼갠 박 빠르기 관계 셋 다');
}
