// 셈2 점점 세게·점점 여리게 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 하나 · 악기 하나 · 여덟 음 · 여덟 박. 점점 세게 = 음마다 세기가 오름 / 점점 여리게 = 내림 / 그대로 = 모두 같음(가장 여린 음도 0.25 이상)
//  꼴: rep 같은 음 · 같은 길이 / tune 높낮이가 오르내림 / slope 높낮이가 한쪽으로 / cross 높낮이가 세기와 거꾸로 / dense 같은 음 · 길이가 줄어듦
export function right(row, ns, { P }) {
  if (ns.length !== 1 || ns[0].length !== 8 || new Set(ns[0].map(n => n.inst)).size !== 1) return false;
  const a = ns[0], step = f => a.slice(1).map((n, k) => Math.sign(f(n) - f(a[k]))), all = (xs, v) => xs.every(x => x === v);
  const vel = step(n => n.vel), pit = step(n => n.p), len = step(n => n.d);
  const total = a[7].t + a[7].d / 0.92, loud = row.right === 'cresc' ? 1 : row.right === 'decresc' ? -1 : 0;
  if (!all(vel, loud) || Math.min(...a.map(n => n.vel)) < 0.25 || Math.abs(total - 8 * P.BEAT) > 1e-3) return false;
  if (loud && a[7].vel / a[0].vel < 2 && a[0].vel / a[7].vel < 2) return false;          // 변하는 판은 처음과 끝이 두 배 이상
  if (row.kind === 'rep') return all(pit, 0) && all(len, 0);
  if (row.kind === 'tune') return all(len, 0) && pit.includes(1) && pit.includes(-1);
  if (row.kind === 'slope') return all(len, 0) && all(pit, row.dir === 'up' ? 1 : -1);
  if (row.kind === 'cross') return all(len, 0) && loud !== 0 && all(pit, -loud);
  return row.kind === 'dense' && all(pit, 0) && len.every(x => x <= 0) && len.includes(-1) && loud === 0;
}
export const opts = (p, k, { mod }) => (k < mod.CUTS[0] ? ['cresc', 'decresc'] : ['cresc', 'decresc', 'same']);
export const norm = p => `${p.kind}:${p.p || p.m}:${p.dir || ''}:${p.w || p.v || ''}`;

// '그대로' 단추가 나온 뒤로 그 단추만 누르는 봇 · 높낮이만 보는 봇(올라가면 점점 세게 · 내려가면 점점 여리게 · 그 밖에는 아무거나)
export const bots = ({ mod, rr, notesOf }) => [
  ['새 단추', (k, p, o) => (k >= mod.CUTS[0] ? 'same' : o[Math.floor(rr() * o.length)])],
  ['높낮이', (k, p, o) => { const ps = notesOf(p)[0].map(n => n.p), d = Math.sign(ps[7] - ps[0]); return d > 0 ? 'cresc' : d < 0 ? 'decresc' : o[Math.floor(rr() * o.length)]; }],
];
export function seedCheck(plan, { mod, ansOf, assert }) {
  assert.ok(plan.slice(0, mod.CUTS[0]).every(p => ansOf(p) !== 'same'), '셈2 그대로 판은 단추가 나온 뒤에만');
}
// 1~2학년 판은 '크게 · 작게' · '그대로' 단추는 중간에 · 높낮이로는 답을 못 맞힘 · 그대로 판의 세기가 판마다 다름
export function extra({ mod, spec, kitOf, notesOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['점점 크게', '점점 작게', '그대로'], "셈2 1~2학년 '크게 · 작게'");
  assert.ok(!/세게|여리게/.test(low.say.kid), '셈2 1~2학년 한 줄 말');
  assert.deepEqual(spec.items.map(it => it.label), ['점점 세게', '점점 여리게', '그대로'], "셈2 3학년부터 '세게 · 여리게'");
  assert.deepEqual(spec.items.map(it => it.locked), [false, false, true], "셈2 '그대로' 단추는 중간에 나옴");
  const { PLAN } = mod, dirOf = p => { const ps = notesOf(p)[0].map(n => n.p); return Math.sign(ps[7] - ps[0]); };
  assert.ok(PLAN.slice(0, mod.CUTS[0]).every(p => p.kind === 'rep' && p.w === 'wide'), '셈2 소개 판 = 같은 음 · 넓은 폭');
  // 원판 · 뒤집은 판 어디에도 '올라가며 점점 세게' · '내려가며 점점 여리게'가 없다(높낮이를 따라 고르면 그 판은 꼭 틀림)
  for (const p of PLAN) for (const q of [p, mod.SHUF.flip(p)]) { const d = dirOf(q); assert.ok(!(d > 0 && q.right === 'cresc') && !(d < 0 && q.right === 'decresc'), '셈2 높낮이 ≠ 세기: ' + JSON.stringify(q)); }
  const kinds = PLAN.map(p => `${p.kind}:${p.right}`);
  assert.ok(kinds.includes('slope:same') && kinds.includes('dense:same') && kinds.includes('cross:cresc') && kinds.includes('cross:decresc'), '셈2 비틀기 셋');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => ['slope', 'cross', 'dense'].includes(p.kind)), '셈2 비틀기 판은 한 가지씩만');
  const flat = PLAN.filter(p => p.right === 'same').map(p => notesOf(p)[0][0].vel);
  assert.ok(new Set(flat).size >= 3 && Math.min(...flat) <= 0.4 && Math.max(...flat) >= 0.8, '셈2 그대로 판의 세기가 여린 것부터 센 것까지');
  // 틀린 갈래 — 고른 단추를 봄: 올라가는 그대로 판에 점점 세게 = 높낮이 갈래 · 점점 여리게면 그 갈래가 아님
  const res = PLAN.map(p => !(p.kind === 'slope' || p.kind === 'cross')), follow = PLAN.map(p => (p.kind === 'cross' ? (p.right === 'cresc' ? 'decresc' : 'cresc') : p.kind === 'slope' ? (p.dir === 'up' ? 'cresc' : 'decresc') : p.right));
  assert.ok(/높이와 세기는 달라요/.test(mod.tipOf(PLAN, res, follow)), '셈2 높낮이를 따라 고른 판 넷 → 높낮이 갈래');
  assert.ok(/높이와 세기는 달라요/.test(mod.tipOf(PLAN, res, [])), '셈2 고른 단추를 몰라도 그 판이 틀렸으면 높낮이 갈래');
  const small = PLAN.map(p => p.kind !== 'tune');
  assert.ok(/조금씩 변하는 세기/.test(mod.tipOf(PLAN, small, PLAN.map(p => (p.kind === 'tune' ? 'same' : p.right)))), '셈2 작은 변화를 그대로로');
  assert.ok(!/조금씩 변하는 세기/.test(mod.tipOf(PLAN, small, PLAN.map(p => (p.kind === 'tune' ? (p.right === 'cresc' ? 'decresc' : 'cresc') : p.right)))), '셈2 거꾸로 고른 것은 작은 변화 갈래가 아님');
}
