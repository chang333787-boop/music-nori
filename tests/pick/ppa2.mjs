// 빠2 점점 빠르게·점점 느리게 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 소리 사이 간격(시작 때 차이)을 음 목록에서 다시 셈 — 점점 빠르게 = 줄기만 하고 끝 ≤ 처음 × 0.7 · 점점 느리게 = 거꾸로 · 그대로 = 모두 같음
//  꼴: up = 음계가 빠르기와 거꾸로(점점 느리게면 올라감) · loud = 세기가 빠르기와 거꾸로(점점 느리게면 커짐) · half = 앞 네 음은 같은 간격
//   rep = 같은 음 · tune / half = 오르내리는 가락 · 그대로 판은 음 수가 5 · 8 · 12
export function right(row, ns) {
  if (ns.length !== 1 || new Set(ns[0].map(n => n.inst)).size !== 1) return false;
  const a = ns[0], iv = a.slice(1).map((n, k) => n.t - a[k].t), E = 1e-3, step = f => a.slice(1).map((n, k) => Math.sign(f(n) - f(a[k])));
  const first = iv[0], last = iv[iv.length - 1];
  let ans = null;
  if (Math.max(...iv) - Math.min(...iv) < E) ans = 'same';
  else if (iv.every((x, k) => !k || x <= iv[k - 1] + E) && last <= first * 0.7) ans = 'accel';
  else if (iv.every((x, k) => !k || x >= iv[k - 1] - E) && first <= last * 0.7) ans = 'rit';
  if (ans !== row.right) return false;
  if (ans === 'same' ? ![5, 8, 12].includes(a.length) || a.length !== (row.n || 8) : a.length !== 8) return false;
  const pit = step(n => n.p), vel = step(n => n.vel), dir = ans === 'rit' ? 1 : -1;
  if (row.kind === 'loud') return pit.every(x => x === 0) && vel.every(x => x === dir);
  if (!vel.every(x => x === 0)) return false;
  if (row.kind === 'up') return pit.every(x => x === dir);
  if (row.kind === 'half') return Math.abs(iv[0] - iv[1]) < E && Math.abs(iv[1] - iv[2]) < E && iv[3] < iv[2] - E === (ans === 'accel') && pit.includes(1) && pit.includes(-1);
  if (row.kind === 'tune') return pit.includes(1) && pit.includes(-1);
  return row.kind === 'rep' && pit.every(x => x === 0);
}
export const opts = (p, k, { mod }) => (k < mod.CUTS[0] ? ['accel', 'rit'] : ['accel', 'rit', 'same']);
export const norm = p => `${p.kind}:${p.p || p.m || ''}:${p.w || p.n || ''}`;

// '그대로' 단추가 나온 뒤로 그 단추만 누르는 봇 · 음 수만 보는 봇(많으면 점점 빠르게 · 적으면 점점 느리게) · 높낮이 봇(올라가면 점점 빠르게)
export const bots = ({ mod, rr, notesOf }) => [
  ['새 단추', (k, p, o) => (k >= mod.CUTS[0] ? 'same' : o[Math.floor(rr() * o.length)])],
  ['음 수', (k, p, o) => { const n = notesOf(p)[0].length; return n > 8 ? 'accel' : n < 8 ? 'rit' : o[Math.floor(rr() * o.length)]; }],
  ['높낮이', (k, p, o) => { const ps = notesOf(p)[0].map(n => n.p), d = Math.sign(ps[ps.length - 1] - ps[0]); return d > 0 ? 'accel' : d < 0 ? 'rit' : o[Math.floor(rr() * o.length)]; }],
];
export function seedCheck(plan, { mod, ansOf, assert }) {
  assert.ok(plan.slice(0, mod.CUTS[0]).every(p => ansOf(p) !== 'same'), '빠2 그대로 판은 단추가 나온 뒤에만');
}
export function extra({ mod, spec, notesOf, assert }) {
  assert.deepEqual(spec.items.map(it => it.locked), [false, false, true], "빠2 '그대로' 단추는 중간에 나옴");
  const { PLAN } = mod;
  // 모든 판의 전체 길이가 같음(끝 음 시작 + 그 음 길이 + 꼬리 = 3.52초) — 그대로 판의 음 수가 달라도
  for (const p of PLAN) for (const q of [p, mod.SHUF.flip(p)]) assert.equal(spec.segs(q)[0].lines[0].reduce((t, n) => t + n.d + n.gap, 0).toFixed(3), '3.520', '빠2 길이 3.52초: ' + JSON.stringify(q));
  assert.deepEqual(PLAN.filter(p => p.right === 'same').map(p => notesOf(p)[0].length).sort((x, y) => x - y), [5, 8, 12, 12], '빠2 그대로 판의 음 수');
  const kinds = PLAN.map(p => p.kind);
  assert.ok(['up', 'loud', 'half'].every(k => kinds.includes(k)), '빠2 비틀기 셋');
  const tw = PLAN.filter(p => p.stage === 'twist');
  assert.ok(tw.every(p => ['up', 'loud'].includes(p.kind) || (p.right === 'same' && p.n !== 8)), '빠2 비틀기 판은 한 가지씩만');
  // 틀린 갈래 — 고른 단추를 봄: 높이 · 세기를 따라 고르면(올라가며 느려짐에 점점 빠르게) 그 갈래 · 거꾸로 고르면 아님(원판엔 up · loud가 한 판씩이라 갈래 셋을 이은 판으로 봄)
  const ups = [0, 1, 2].map(k => ({ stage: 'twist', kind: 'up', w: 'mid', right: k % 2 ? 'accel' : 'rit' })), rev = p => (p.right === 'rit' ? 'accel' : 'rit');
  assert.ok(/높이와 빠르기는 달라요/.test(mod.tipOf(ups, [false, false, false], ups.map(rev))), '빠2 높이 갈래');
  assert.ok(!/높이와 빠르기는 달라요/.test(mod.tipOf(ups, [false, false, false], ups.map(() => 'same'))), '빠2 그대로를 고른 것은 높이 갈래가 아님');
  const louds = ups.map(p => ({ ...p, kind: 'loud', p: 67 }));
  assert.ok(/세기와 빠르기는 달라요/.test(mod.tipOf(louds, [false, false, false], louds.map(rev))), '빠2 세기 갈래');
  const res = PLAN.map(p => !(p.right === 'same' && p.n !== 8));
  assert.ok(/빠르거나 느린 그대로/.test(mod.tipOf(PLAN, res, PLAN.map(p => (res[PLAN.indexOf(p)] ? p.right : 'accel')))), '빠2 그대로 갈래(원판 세 판)');
}
