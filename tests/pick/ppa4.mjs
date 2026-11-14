// 빠4 빠르기말 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 둘: 기준(피아노 · 다섯 음 · 고른 간격) + 둘째(n음 · 고른 간격). 두 도막 모두 같은 창(마지막 음 시작 + 간격 = 창).
//  답 = 기준 간격 ÷ 둘째 간격(0.6 느리게 · 0.8 조금 느리게 · 1.2 조금 빠르게 · 1.6 빠르게) — 표의 답을 믿지 않고 음 시각에서 다시 셈
const RATIO = { slow: 0.6, slowish: 0.8, fastish: 1.2, fast: 1.6 };
const iois = a => a.slice(1).map((n, k) => +(n.t - a[k].t).toFixed(4));
const even = xs => xs.every(x => Math.abs(x - xs[0]) < 1e-3);
export function right(row, ns, { mod }) {
  if (ns.length !== 2) return false;
  const [ref, sec] = ns, ri = iois(ref), si = iois(sec);
  if (ref.length !== 5 || ref.some(n => n.drum) || !even(ri) || !even(si) || sec.length < 3) return false;
  const win = a => a[a.length - 1].t + iois(a)[0];
  if (Math.abs(win(ref) - mod.WIN) > 1e-3 || Math.abs(win(sec) - mod.WIN) > 1e-3) return false;   // 소리 길이 = 창(답과 상관없이)
  const r = ri[0] / si[0], want = Object.keys(RATIO).find(k => Math.abs(RATIO[k] - r) < 0.01);
  if (want !== row.right) return false;
  const mean = a => a.reduce((s, n) => s + n.p, 0) / a.length;
  const refInst = ref[0].inst, v0 = ref[0].vel;
  if (row.kind === 'drum') return sec.every(n => n.drum) && refInst === 'piano';
  if (sec.some(n => n.drum)) return false;
  const lift = sec[0].p - 67, v1 = sec[0].vel;
  if (row.kind === 'high') return lift === 7 && mean(sec) > mean(ref) && v1 === v0;
  if (row.kind === 'low') return lift === -7 && mean(sec) < mean(ref) && v1 === v0;
  if (lift !== 0) return false;
  if (row.kind === 'soft') return v1 < v0 - 0.2;
  if (row.kind === 'loud') return v1 > v0 + 0.2;
  if (v1 !== v0) return false;
  if (row.kind === 'stacc') return refInst === 'violin' && sec.every(n => n.inst === 'violin' && n.art === 'stacc' && n.d < si[0] * 0.5) && ref.every(n => !n.art);
  return row.kind === 'plain' && refInst === 'piano' && sec.every(n => n.inst === 'piano' && !n.art);
}
export const opts = () => ['slow', 'slowish', 'fastish', 'fast'];
export const norm = p => `${p.kind.replace(/high|low/, 'hl').replace(/soft|loud/, 'sl')}:${p.right.replace(/^(slow|fast)ish$/, 'ish').replace(/^(slow|fast)$/, 'big')}`;

// 높이만 보는 봇(높아지면 빠르게 · 낮아지면 느리게) · 세기만 보는 봇(커지면 빠르게)
export const bots = ({ notesOf, rr }) => [
  ['높낮이', (k, p, o) => { const [a, b] = notesOf(p); if (b[0].drum) return o[Math.floor(rr() * o.length)]; const d = b[0].p - a[0].p; return d > 0 ? 'fast' : d < 0 ? 'slow' : o[Math.floor(rr() * o.length)]; }],
  ['세기', (k, p, o) => { const [a, b] = notesOf(p), d = b[0].vel - a[0].vel; return d > 0.1 ? 'fast' : d < -0.1 ? 'slow' : o[Math.floor(rr() * o.length)]; }],
];
export function extra({ mod, spec, assert, notesOf }) {
  const { PLAN, SHUF, word } = mod;
  assert.deepEqual(spec.items.map(it => it.label), ['느리게', '조금 느리게', '조금 빠르게', '빠르게'], '빠4 단추 = 악보 판의 우리말');
  assert.equal(word('mid'), '보통 빠르게', '빠4 기준 이름');
  // 원판 · 뒤집은 판 — 높아지면 늘 느린 쪽 · 낮아지면 빠른 쪽 · 작아지면 빠른 쪽 · 커지면 느린 쪽(높이 · 세기를 따라 고르면 틀림)
  const fast = k => k === 'fast' || k === 'fastish';
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) {
    if (q.kind === 'high' || q.kind === 'loud') assert.ok(!fast(q.right), '빠4 높아지거나 커지면 느린 쪽: ' + JSON.stringify(q));
    if (q.kind === 'low' || q.kind === 'soft') assert.ok(fast(q.right), '빠4 낮아지거나 작아지면 빠른 쪽: ' + JSON.stringify(q));
  }
  assert.ok(PLAN.filter(p => p.stage === 'intro').every(p => p.kind === 'plain' && (p.right === 'slow' || p.right === 'fast')), '빠4 소개 = 큰 차이만');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => p.kind !== 'plain'), '빠4 비틀기 판은 한 가지씩 바뀜');
  assert.ok(PLAN.some(p => p.kind === 'drum') && notesOf(PLAN.find(p => p.kind === 'drum'))[1].every(n => n.drum), '빠4 북 판 = 북 음');
  // 틀린 갈래
  const deg = { slow: 'slowish', slowish: 'slow', fastish: 'fast', fast: 'fastish' };
  const r1 = PLAN.map(p => p.stage === 'intro');
  assert.ok(/「조금」/.test(mod.tipOf(PLAN, r1, PLAN.map(p => deg[p.right]))), '빠4 조금 갈래');
}
