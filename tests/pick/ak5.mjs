// 악5 조표 넣고 듣기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick' · 카드 칸)

// 첫 도막 = 바탕(파 둘 · 시 하나 · 마디마다 두 음) · 둘째 도막 − 첫 도막 높이 차:
//  모두 0 → 그대로 · 파 자리 둘 다 +1 → ♯ 조표 · 둘째 마디 파만 +1 → ♯ 임시표 · 시 자리만 −1 → ♭ 조표
export function right(row, ns) {
  if (ns.length !== 2 || ns[0].length !== 4 || ns[1].length !== 4) return false;
  const [a, b] = ns.map(s => s.map(n => n.p)), pc = p => ((p % 12) + 12) % 12;
  if (new Set([...ns[0], ...ns[1]].map(n => n.d)).size !== 1) return false;
  const fa = a.map((p, i) => (pc(p) === 5 ? i : -1)).filter(i => i >= 0), ti = a.map((p, i) => (pc(p) === 11 ? i : -1)).filter(i => i >= 0);
  if (fa.length !== 2 || ti.length !== 1 || !(fa[0] < 2 && fa[1] >= 2)) return false;           // 파는 마디마다 하나
  const d = b.map((p, i) => p - a[i]);
  const want = { none: [], ksharp: fa.map(i => [i, 1]), osharp: [[fa[1], 1]], kflat: [[ti[0], -1]] }[row.right];
  const exp = a.map(() => 0);
  for (const [i, v] of want) exp[i] = v;
  return JSON.stringify(d) === JSON.stringify(exp) && (row.kind === 'inst') === (ns[1][0].inst !== ns[0][0].inst);
}
export const opts = (p, k, { mod }) => (k < mod.CUTS[0] ? ['none', 'ksharp', 'kflat'] : ['none', 'ksharp', 'osharp', 'kflat']);
export const norm = p => `${p.kind}:${p.base}`;

// 임시표 단추가 나온 판부터 그 단추만 · 카드 꼴 봇(그림에서 기호가 가장 많은 카드 · 홀로 다른 카드는 카드 넷이 바탕만 보고 정해져 판마다 같은 자리)
export const bots = ({ mod, rr }) => [
  ['새 단추', (k, p, o) => (k >= mod.CUTS[0] ? 'osharp' : o[Math.floor(rr() * o.length)])],
  ['기호가 가장 많은 카드', (k, p, o) => { const c = mod.cards(p).filter(x => o.includes(x.key)); const n = x => (x.chip.match(/data-acc="([^"]*)"/)[1].split(',').filter(Boolean).length + (/data-key="(sharp|flat)"/.test(x.chip) ? 1 : 0)); return c.reduce((a, b) => (n(b) > n(a) ? b : a)).key; }],
  ['높이만 보는 봇', (k, p, o) => (p.kind === 'high' ? 'ksharp' : p.kind === 'inst' ? 'none' : o[Math.floor(rr() * o.length)])],
];
export function seedCheck(plan, { mod, ansOf, assert }) {
  assert.ok(plan.slice(0, mod.CUTS[0]).every(p => ansOf(p) !== 'osharp'), '악5 임시표 판은 단추가 나온 뒤에만');
}
export function extra({ mod, spec, assert }) {
  assert.deepEqual(spec.items.map(it => it.locked), [false, false, true, false], '악5 임시표 단추는 중간에 나옴');
  for (const p of mod.PLAN) {
    assert.deepEqual(mod.cards(p), mod.cards(mod.SHUF.flip(p)), '악5 뒤집어도 같은 카드');
    const cs = mod.cards(p), acc = k => cs.find(c => c.key === k).chip.match(/data-acc="([^"]*)"/)[1], key = k => cs.find(c => c.key === k).chip.match(/data-key="([^"]*)"/)[1];
    assert.equal(key('ksharp'), 'sharp', '악5 ♯ 조표 카드');
    assert.equal(key('kflat'), 'flat', '악5 ♭ 조표 카드');
    assert.equal(acc('ksharp'), ',,,', '악5 ♯ 조표 카드에는 음마다 ♯을 그리지 않음');
    assert.equal(acc('kflat'), ',,,', '악5 ♭ 조표 카드에는 음마다 ♭을 그리지 않음');
    assert.equal(acc('none'), ',,,', '악5 그대로 카드');
    assert.equal(acc('osharp').split(',').filter(Boolean).join(''), '#', '악5 임시표 카드 = ♯ 하나');
    assert.equal(key('osharp'), '', '악5 임시표 카드에 조표 없음');
    // 같은 마디에 파가 둘이면 '한 음만'이 거짓 — 마디마다 파 하나
    const fa = mod.BASE[p.base].map((x, i) => (x % 12 === 5 ? i : -1)).filter(i => i >= 0);
    assert.ok(fa.length === 2 && fa[0] < 2 && fa[1] >= 2, '악5 파는 마디마다 하나');
  }
  assert.ok(!/장조/.test(JSON.stringify(mod.PLAN.map(p => mod.cards(p)))) && !/장조/.test(spec.say.kid), '악5 화면 글에 장조 이름 없음');
}
