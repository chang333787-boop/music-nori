// 음3 악기 이름 맞히기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

const TUNE = { base: [67, 64, 67], A: [60, 62, 64, 67], B: [72, 69, 67] };
// 도막 하나 · 악기 하나 = 답 · 꼴에 맞는 가락(high = 다섯 음 위) · 세기(loud만 0.6과 다름)
export function right(row, ns) {
  if (ns.length !== 1) return false;
  const a = ns[0], insts = new Set(a.map(n => n.inst));
  if (insts.size !== 1 || [...insts][0] !== row.ans) return false;
  const want = (row.kind === 'tune' ? TUNE[row.tune] : TUNE.base).map(p => p + (row.kind === 'high' ? 7 : 0));
  if (a.length !== want.length || !a.every((n, k) => n.p === want[k])) return false;
  const loud = Math.abs(a[0].vel - 0.62) > 0.1;
  return loud === (row.kind === 'loud') && new Set(a.map(n => n.vel)).size === 1;
}
export const opts = () => ['piano', 'recorder', 'violin', 'xylo'];
export const norm = p => `${p.kind}:${p.tune || ''}:${p.vel || ''}`;
export function extra({ spec, assert }) {
  assert.deepEqual(spec.items.map(it => it.label), ['피아노', '리코더', '바이올린', '실로폰'], '음3 단추 글');
}
