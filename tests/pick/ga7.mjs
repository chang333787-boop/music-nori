// 가7 파와 시 찾기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 첫 도막 = 도 미 솔(같은 높이 자리) · 둘째 도막 = 다섯 음 · 음이름 모음에 파(5) · 시(11)가 있는가 = 답 · 파 · 시 말고는 다섯 음(도 레 미 솔 라) 안
export function right(row, ns) {
  if (ns.length !== 2 || ns[0].length !== 3 || ns[1].length !== 5) return false;
  const pc = p => ((p % 12) + 12) % 12, base = ns[0][0].p;
  if (JSON.stringify(ns[0].map(n => n.p - base)) !== '[0,4,7]' || pc(base) !== 0) return false;
  if (new Set(ns[1].map(n => n.d)).size !== 1 || new Set([...ns[0], ...ns[1]].map(n => n.inst)).size !== 1) return false;
  if ((row.kind === 'high') !== (base === 72) || (row.kind === 'inst') !== (ns[0][0].inst === 'recorder')) return false;
  const cs = ns[1].map(n => pc(n.p));
  if (cs.some(c => ![0, 2, 4, 5, 7, 9, 11].includes(c))) return false;
  const f = cs.includes(5), t = cs.includes(11);
  return row.right === (f && t ? 'both' : f ? 'fa' : t ? 'ti' : 'none');
}
export const opts = () => ['fa', 'ti', 'both', 'none'];
export const norm = p => `${p.kind}:${p.tune}`;

// 뛰는 꼴 봇 — 도에서 뛰어오른 가락이면 늘 '파'(뛰어 만난 음을 파로 읽는 버릇)
export const bots = ({ rr }) => [
  ['뛰는 꼴 봇', (k, p, o) => (p.kind === 'leap' ? 'fa' : o[Math.floor(rr() * 4)])],
];
export function extra({ mod, notesOf, assert }) {
  // 꼴마다 넷 꼴의 음 수 · 리듬이 같고, 대신 들어가는 음은 다섯 음 안
  for (const t of Object.keys(mod.TUNE)) {
    const lens = ['fa', 'ti', 'both', 'none'].map(r => notesOf({ kind: 'plain', tune: t, right: r })[1].map(n => `${n.t}:${n.d}`).join(' '));
    assert.equal(new Set(lens).size, 1, '가7 넷 꼴 리듬이 같음 ' + t);
  }
  assert.ok(mod.PLAN.filter(p => p.stage === 'twist').every(p => p.kind !== 'plain'), '가7 비틀기는 한 가지씩');
}
