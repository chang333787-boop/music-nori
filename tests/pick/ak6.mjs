// 악6 기호가 붙은 악보 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')
//  답 = 쓰인 길이 · 세기와 들린 소리를 견줌: 모든 음이 쓰인 길이의 반보다 짧음 → 스타카토 · 음 f만 1.6배보다 김 → 늘임표 ·
//   음 a만 나머지보다 0.3 넘게 셈 → 악센트 · 모든 음이 쓰인 길이의 0.92이고 세기가 같음 → 기호 없음
export function right(row, ns, { mod }) {
  if (ns.length !== 1) return false;
  const { p, b } = mod.MEL[row.m], beat = mod.beatOf(row), n = ns[0];
  if (n.length !== p.length || n.some((x, i) => x.p !== p[i])) return false;
  const W = b.map(x => x * beat), ix = f => n.map((x, i) => (f(x, i) ? i : -1)).filter(i => i >= 0);
  const stacc = n.every((x, i) => x.d < 0.5 * W[i] && x.art === 'stacc');
  const long = ix((x, i) => x.d > 1.6 * W[i]);
  const others = i => n.filter((_, j) => j !== i).map(x => x.vel);
  const loud = ix((x, i) => x.vel >= Math.max(...others(i)) + 0.3);
  const plain = n.every((x, i) => Math.abs(x.d - W[i] * 0.92) < 1e-3 && !x.art) && new Set(n.map(x => x.vel)).size === 1;
  const kind = stacc ? 'stacc' : long.length === 1 && long[0] === row.f && loud.length === 0 ? 'ferm' : loud.length === 1 && loud[0] === row.a && long.length === 0 ? 'acc' : plain ? 'none' : null;
  // 소리 순서가 그대로(뒤 음은 늘인 만큼 늦게) — 음 사이가 겹치지 않음
  const inOrder = n.every((x, i) => i === 0 || x.t >= n[i - 1].t + n[i - 1].d - 1e-6);
  return kind === row.ans && inOrder;
}
export const opts = () => ['stacc', 'ferm', 'acc', 'none'];
export const norm = p => `${p.kind}:${p.m}:${p.f}:${p.a}`;

export function extra({ mod, spec: S, kitOf, notesOf, assert }) {
  const { PLAN, SHUF } = mod;
  // 같은 가락(같은 빠르기)이면 답과 상관없이 소리 길이가 같다 — 쓰인 박 + 2박
  for (const p of PLAN) {
    const lens = new Set(['stacc', 'ferm', 'acc', 'none'].map(a => S.OPEN({ ...p, ans: a })));
    assert.equal(lens.size, 1, '악6 네 꼴 길이 같음: ' + JSON.stringify(p));
    for (const a of ['stacc', 'ferm', 'acc', 'none']) if (a !== p.ans) assert.ok(!right({ ...p, ans: a }, notesOf(p), { mod }), `악6 다른 답을 적으면 잡힘 ${a}: ${JSON.stringify(p)}`);
  }
  // 늘임표 · 악센트 자리는 가락 안 · 비틀기 판 꼴(느림 · 원래 긴 음 · 낮은 음이 셈 · 8분이 섞임)
  for (const p of PLAN) assert.ok(p.f < mod.MEL[p.m].p.length && p.a < mod.MEL[p.m].p.length, '악6 기호 자리');
  const lowA = PLAN.find(p => p.kind === 'low'), m = mod.MEL[lowA.m].p;
  assert.equal(m[lowA.a], Math.min(...m), '악6 low 판 = 센 음이 가장 낮은 음');
  const lg = PLAN.find(p => p.kind === 'long');
  assert.equal(mod.MEL[lg.m].b[lg.f], Math.max(...mod.MEL[lg.m].b), '악6 long 판 = 원래 긴 음에 늘임표');
  // 단추 넷 글(3학년부터 · 1~2학년) · 카드는 뒤집어도 같음
  assert.deepEqual(S.items.map(it => it.label), ['스타카토', '늘임표', '악센트', '기호 없음'], '악6 단추 글');
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['짧게 끊어서', '길게 늘여서', '한 음만 세게', '쓰인 그대로'], '악6 1~2학년 단추 글');
  for (const p of PLAN) assert.deepEqual(S.side(p, 'acc'), S.side(SHUF.flip(p), 'acc'), '악6 뒤집어도 같은 카드');
}
