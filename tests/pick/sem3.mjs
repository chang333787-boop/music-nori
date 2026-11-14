// 셈3 셈여림표 차례 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 판마다 다른 카드 · 장부 frame: 'pick')

// 도막 둘 · 도막마다 네 음 · 도막 안 세기는 하나. 답 = 두 도막의 세기 차례(차가 0.3 이상이어야 up · down · 같으면 same)
//  두 도막의 길고 짧음은 같고, 높이 · 악기는 꼴(kind)이 말한 것만 다름
export function right(row, ns, { mod }) {
  if (ns.length !== 2 || ns.some(a => a.length !== 4)) return false;
  const v = ns.map(a => a[0].vel);
  if (ns.some((a, k) => a.some(n => n.vel !== v[k]))) return false;
  if (ns[0].map(n => `${n.t}:${n.d}`).join() !== ns[1].map(n => `${n.t}:${n.d}`).join()) return false;
  const want = v[0] === v[1] ? 'same' : v[1] - v[0] >= 0.3 - 1e-9 ? 'up' : v[0] - v[1] >= 0.3 - 1e-9 ? 'down' : null;
  if (want !== row.right) return false;
  // 세기 = 그 판 기호의 값 · 기호 차례 = 세기 차례
  if (row.s.some((s, k) => mod.VEL[s] !== v[k])) return false;
  const lift = ns[1][0].p - ns[0][0].p, inst = ns.map(a => a[0].inst);
  if (ns.some(a => a.some(n => n.inst !== a[0].inst))) return false;
  if (row.kind === 'hi') return lift === (row.hi === 1 ? 7 : -7) && inst[0] === 'piano' && inst[1] === 'piano';
  if (lift !== 0) return false;
  if (row.kind === 'inst') return inst[0] === row.inst && inst[1] === row.inst;
  if (row.kind === 'swap') return inst[0] === 'piano' && inst[1] === row.inst && Math.abs(v[0] - v[1]) >= 0.5;
  return row.kind === 'plain' && inst[0] === 'piano' && inst[1] === 'piano';
}
export const opts = () => ['up', 'down', 'same'];
export const norm = p => `${p.kind}:${p.m}:${p.pair.join('-')}:${p.x}:${p.right === 'same' ? 's' : 'ud'}`;

// 높이만 보는 봇(높은 도막 = 센 도막) · 카드만 보는 봇(같음 카드 기호가 더 센 쪽이면 down …)
export const bots = ({ notesOf, rr }) => [
  ['높낮이', (k, p, o) => { const [a, b] = notesOf(p).map(s => s[0].p); return b > a ? 'up' : a > b ? 'down' : o[Math.floor(rr() * o.length)]; }],
  ['같음 카드', (k, p) => (p.x === p.pair[1] ? 'down' : 'up')],
];
// 카드는 답과 상관없이 같다(뒤집어도) · key 모음 = 단추 키 · 답 카드의 기호 = 실제로 난 두 도막의 기호
export function extra({ mod, spec, assert, notesOf }) {
  const { PLAN, SHUF, cards, SYMS, VEL, nameOf } = mod;
  assert.deepEqual(spec.items.map(it => it.key), ['up', 'down', 'same'], '셈3 단추 키');
  assert.deepEqual(SYMS.map(nameOf), ['매우 여리게', '여리게', '조금 여리게', '조금 세게', '세게', '매우 세게'], '셈3 읽는 말 = 악보 판 SIGNS');
  for (let i = 1; i < SYMS.length; i++) assert.ok(VEL[SYMS[i]] > VEL[SYMS[i - 1]], '셈3 세기는 기호 차례대로');
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) {
    const cs = cards(q);
    assert.deepEqual(cs.map(c => c.key), ['up', 'down', 'same'], '셈3 카드 키');
    assert.deepEqual(cs, cards(p), '셈3 카드는 뒤집어도 같음(카드로 답이 안 샘): ' + JSON.stringify(p));
    const want = cs.find(c => c.key === q.right);
    assert.equal(want.tv, `${q.s[0]} → ${q.s[1]}`, '셈3 답 카드 = 난 소리의 기호 차례');
    assert.ok(q.pair.includes(q.x) && q.s.every(s => q.pair.includes(s)), '셈3 기호는 그 판의 짝 안에서');
    assert.ok(VEL[q.pair[1]] - VEL[q.pair[0]] >= 0.3 - 1e-9, '셈3 짝의 세기 차 0.3 이상');
    assert.equal(new Set(cs.map(c => c.tv)).size, 3, '셈3 카드 셋이 서로 다름');
  }
  // 단계 — 소개 p · f / 발전 mp · mf / 마무리에 pp · ff
  assert.ok(PLAN.filter(p => p.stage === 'intro').every(p => p.pair.join() === 'p,f'), '셈3 소개 = p · f');
  assert.ok(PLAN.filter(p => p.stage === 'grow').every(p => p.pair.join() === 'mp,mf'), '셈3 발전 = mp · mf');
  const endSyms = PLAN.filter(p => p.stage === 'end').flatMap(p => p.pair);
  assert.ok(endSyms.includes('pp') && endSyms.includes('ff'), '셈3 마무리에 pp · ff');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => p.kind !== 'plain'), '셈3 비틀기 판은 한 가지씩 바뀜');
  // 높은 도막은 늘 더 여리거나 같음(원판 · 뒤집은 판) — 높이를 따라 고르면 그 판은 틀림
  for (const p of PLAN.filter(q => q.kind === 'hi')) for (const q of [p, SHUF.flip(p)]) {
    const [a, b] = notesOf(q).map(s => s[0]), hi = b.p > a.p ? b : a, other = hi === b ? a : b;
    assert.ok(hi.vel <= other.vel, '셈3 높은 도막이 더 세지 않음: ' + JSON.stringify(q));
  }
  // 틀린 갈래
  //  (높이 갈래는 판이 둘뿐이라 갈래 말이 나오지 않음 — 2/3 · 3번 규칙 · 판 번호만 말함)
  const res = PLAN.map(p => p.kind !== 'hi'), follow = PLAN.map(p => (p.kind === 'hi' ? (p.hi === 1 ? 'up' : 'down') : p.right));
  assert.ok(/번째 판을 틀렸어요/.test(mod.tipOf(PLAN, res, follow)), '셈3 높이 판 둘만 틀림 → 판 번호');
  const r2 = PLAN.map(p => p.pair.join() !== 'mp,mf');
  assert.ok(/mp/.test(mod.tipOf(PLAN, r2, PLAN.map(p => (p.right === 'up' ? 'down' : 'up')))), '셈3 mp · mf 갈래');
  const r3 = PLAN.map(p => p.right !== 'same');
  assert.ok(/같은 두 도막/.test(mod.tipOf(PLAN, r3, PLAN.map(p => (p.right === 'same' ? 'up' : p.right)))), '셈3 같음 갈래');
}
