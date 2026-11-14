// 리14 박자가 그대로·바뀜(변박자) — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 하나 · 큰북 = 마디 첫 박. 큰북 시각 → 마디 길이(박) 목록(마지막 마디 = 소리 끝 - 마지막 큰북)이 모두 같으면 그대로
//  가락은 박마다 한 음 · 큰북 자리마다 솔(67) · 마지막 음은 도(60) · inst = 둘째 마디부터 리코더 · accent = 마디 둘째 박이 0.9 · nohat = 하이햇 없음
const E = 1e-3;
export function barsOf(ns, BEAT) {
  const a = ns[0], kicks = a.filter(n => n.drum === 'kick').map(n => n.t);
  const end = Math.max(...a.map(n => n.t + n.d / 0.92));
  return kicks.map((t, i) => +(((i + 1 < kicks.length ? kicks[i + 1] : end) - t) / BEAT).toFixed(3));
}
export function right(row, ns, { mod }) {
  if (ns.length !== 1) return false;
  const a = ns[0], B = mod.BEAT, kicks = a.filter(n => n.drum === 'kick').map(n => n.t), mel = a.filter(n => n.p != null), hats = a.filter(n => n.drum === 'hat');
  if (a.some(n => n.drum && !['kick', 'hat'].includes(n.drum)) || kicks.length < 2) return false;
  const bars = barsOf(ns, B);
  if (bars.some(n => !Number.isInteger(n) || n < 2)) return false;
  const total = bars.reduce((x, y) => x + y, 0);
  if (mel.length !== total || hats.length !== (row.kind === 'nohat' ? 0 : total - kicks.length)) return false;
  // 가락이 박마다 · 큰북 자리마다 솔
  if (mel.some((n, i) => Math.abs(n.t - i * B) > E)) return false;
  const onKick = n => kicks.some(t => Math.abs(t - n.t) < E);
  if (mel.slice(0, -1).some(n => (n.p === 67) !== onKick(n)) || mel[mel.length - 1].p !== 60) return false;
  const insts = [...new Set(mel.map(n => n.inst))];
  if (row.kind === 'inst' ? !(mel.filter(n => n.t < kicks[1] - E).every(n => n.inst === 'piano') && mel.filter(n => n.t > kicks[1] - E).every(n => n.inst === 'recorder')) : insts.join() !== 'piano') return false;
  const seconds = new Set(kicks.map(t => +(t + B).toFixed(3)));
  if (mel.some(n => (n.vel === 0.9) !== (row.kind === 'accent' && seconds.has(+n.t.toFixed(3))) || (n.vel !== 0.9 && n.vel !== 0.55))) return false;
  return (bars.every(n => n === bars[0])) === (row.right === 'keep');
}
export const opts = () => ['keep', 'change'];
export const norm = p => `${p.kind}:${p.pair}`;

// 악기가 바뀌면 바뀜 · 소리가 길면 바뀜 봇
export const bots = ({ rr, notesOf }) => {
  const any = o => o[Math.floor(rr() * o.length)];
  return [
    ['악기 바뀜', (k, p, o) => (new Set(notesOf(p)[0].filter(n => n.p != null).map(n => n.inst)).size > 1 ? 'change' : any(o))],
    ['센 둘째 박', (k, p, o) => (notesOf(p)[0].some(n => n.vel === 0.9) ? 'change' : any(o))],
  ];
};
// 두 꼴 박 수 같음 · 거꾸로 적힌 답 · 비틀기 판에 두 답 · 마디 목록이 PAIR와 같음
export function extra({ mod, spec: S, notesOf, assert }) {
  const { PLAN, SHUF, PAIR, BEAT } = mod;
  for (const k of Object.keys(PAIR)) assert.equal(PAIR[k].keep.reduce((a, b) => a + b), PAIR[k].change.reduce((a, b) => a + b), '리14 짝 박 수 같음 ' + k);
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) {
    assert.deepEqual(barsOf(notesOf(q), BEAT), PAIR[q.pair][q.right], '리14 마디 목록: ' + JSON.stringify(q));
    assert.ok(!right(SHUF.flip(q), notesOf(q), { mod }), '리14 거꾸로 적힌 답: ' + JSON.stringify(q));
  }
  const kinds = PLAN.map(p => `${p.kind}:${p.right}`);
  for (const k of ['inst:keep', 'inst:change', 'accent:keep', 'accent:change', 'nohat:keep', 'nohat:change']) assert.ok(kinds.includes(k), '리14 원판에 ' + k);
  assert.ok(PLAN.filter(p => p.stage === 'intro').every(p => p.kind === 'plain'), '리14 소개 = 기본');
  for (const p of PLAN) assert.ok(/박/.test(S.wrongText(p)), '리14 다르게 골랐을 때 말');
}
