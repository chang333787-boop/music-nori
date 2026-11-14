// 음1 두드리는 소리(북·나무·쇠) — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 하나 · 소리 하나(북 종류 하나 또는 악기 하나) → 갈래 표로 답(큰북 · 작은북 · 팀파니 = 북 · 마림바 = 나무 · 트라이앵글 · 심벌즈 · 글로켄슈필 = 쇠)
//  리듬 = 1 · 1 · 반 · 반 · 1박(fast 판은 16분 여덟 + 4분 둘) · tune 판은 음 높이가 다섯 가지 넘게 오르내림
const E = 1e-3;
export function right(row, ns, { mod }) {
  if (ns.length !== 1) return false;
  const a = ns[0], srcs = [...new Set(a.map(n => n.drum || n.inst))];
  if (srcs.length !== 1 || !(srcs[0] in mod.GROUP)) return false;
  const rhy = mod.RHY[row.kind === 'fast' ? 'fast' : 'plain'];
  if (a.length !== rhy.length) return false;
  let t = 0;
  for (let i = 0; i < rhy.length; i++) { if (Math.abs(a[i].t - t) > E) return false; t += rhy[i] * mod.BEAT; }
  const ps = a.map(n => n.p).filter(p => p != null);
  if (row.kind === 'tune' && new Set(ps).size < 4) return false;
  if (row.kind !== 'tune' && new Set(ps).size > 1) return false;
  return mod.GROUP[srcs[0]] === row.ans;
}
export const opts = () => ['skin', 'wood', 'metal'];
export const norm = p => `${p.kind}:${Object.values(p.alt).join('/')}`;

// 음 높이가 있으면 나무 · 높은 음이면 쇠 · 음 높이가 없으면 북 봇(소리의 겉모습만 보고 고름)
export const bots = ({ rr, notesOf }) => {
  const any = o => o[Math.floor(rr() * o.length)];
  return [
    ['음 높이 = 나무', (k, p, o) => (notesOf(p)[0].some(n => n.p != null) ? 'wood' : any(o))],
    ['높은 음 = 쇠', (k, p, o) => { const ps = notesOf(p)[0].map(n => n.p).filter(x => x != null); return ps.length && Math.max(...ps) >= 79 ? 'metal' : any(o); }],
    ['높이 없음 = 북', (k, p, o) => (notesOf(p)[0].every(n => n.p == null) ? 'skin' : any(o))],
  ];
};
// 한 판의 세 갈래 소리 길이가 같음 · 갈래마다 다른 갈래 소리 · 거꾸로 적힌 답 · 비틀기 소리가 원판에 있음
export function extra({ mod, spec: S, notesOf, assert }) {
  const { PLAN, SHUF, GROUP, parse } = mod;
  for (const p of PLAN) {
    for (const k of ['skin', 'wood', 'metal']) assert.equal(GROUP[parse(p.alt[k]).src], k, '음1 갈래 자리: ' + p.alt[k]);
    const q1 = SHUF.flip(p), q2 = SHUF.flip(q1);
    assert.equal(SHUF.flip(q2).ans, p.ans, '음1 뒤집기 세 번이면 제자리');
    assert.equal(new Set([p, q1, q2].map(S.OPEN)).size, 1, '음1 세 갈래 길이 같음: ' + JSON.stringify(p.alt));
    assert.ok(!right(q1, notesOf(p), { mod }) && !right(q2, notesOf(p), { mod }), '음1 거꾸로 적힌 답: ' + JSON.stringify(p));
  }
  const used = new Set(PLAN.map(p => parse(p.alt[p.ans]).src));
  for (const s of ['timpani', 'glock', 'marimba', 'bassdrum', 'snare', 'triangle', 'cymbal']) assert.ok(PLAN.some(p => Object.values(p.alt).some(v => parse(v).src === s)), '음1 소리 ' + s);
  assert.ok(used.has('timpani') && used.has('glock'), '음1 원판에 팀파니 · 글로켄슈필 답');
  assert.deepEqual(S.items.map(it => it.label), ['북', '나무', '쇠'], '음1 단추 글');
  for (const p of PLAN) assert.ok(!/가죽|금속|플라스틱/.test(S.wrongText(p)), '음1 재료 낱말 X');
}
