// 가8 통째로 옮긴 가락 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막 둘 · 길고 짧은 것과 음 수가 같음. 둘째 − 첫째 음 높이 차가 모두 0 = 그대로 / 모두 같은 0 아닌 수(= 줄의 k) = 옮긴 가락 / 한 음만 어긋남 = 다른 가락
//  악기 판만 둘째가 리코더 · 나머지는 둘 다 피아노 · 세기는 모두 같음
export function right(row, ns) {
  if (ns.length !== 2) return false;
  const [a, b] = ns;
  if (a.length !== b.length || !a.every((n, k) => n.d === b[k].d && n.t === b[k].t && n.vel === b[k].vel)) return false;
  if (!a.every(n => n.inst === 'piano') || !b.every(n => n.inst === (row.kind === 'inst' ? 'recorder' : 'piano'))) return false;
  const diff = a.map((n, k) => b[k].p - n.p), uniq = [...new Set(diff)];
  const got = uniq.length === 1 ? (uniq[0] === 0 ? 'same' : 'moved') : 'other';
  if (got !== row.ans) return false;
  if (got === 'moved') return uniq[0] === row.k && (row.kind !== 'small' || Math.abs(row.k) === 2);
  if (got === 'other') {
    // 옮긴 수 k가 한 음만 빼고 모두 · 그 한 음은 k ± 2
    const off = diff.filter(d => d !== row.k);
    return diff.filter(d => d === row.k).length === diff.length - 1 && off.length === 1 && Math.abs(off[0] - row.k) === 2 && diff[0] === row.k;
  }
  return true;
}
export const opts = (p, k, { mod }) => (k < mod.CUTS[0] ? ['same', 'moved'] : ['same', 'moved', 'other']);
export const norm = p => `${p.kind}:${p.m}:${p.k}`;

// '다른 가락' 단추가 새로 나온 판부터 그 단추를 누르는 봇
export const bots = ({ mod, rr }) => [['새 단추', (k, p, o) => (k >= mod.CUTS[0] ? 'other' : o[Math.floor(rr() * o.length)])]];
export function seedCheck(plan, { mod, ansOf, assert }) {
  assert.ok(plan.slice(0, mod.CUTS[0]).every(p => ansOf(p) !== 'other'), '가8 다른 가락 판은 단추가 나온 뒤에만');
}
// 1~2학년 판은 '가락' 대신 '노래' · 옮기는 수가 위아래 · 크고 작게 섞임 · 다른 가락 판은 섞어도 그대로
export function extra({ mod, spec, kitOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(!low.items.some(it => /가락/.test(it.label)) && !/가락/.test(low.say.kid), "가8 1~2학년 '노래'");
  assert.deepEqual(spec.items.map(it => it.label), ['그대로', '옮긴 가락', '다른 가락']);
  assert.deepEqual(spec.items.map(it => it.locked), [false, false, true], "가8 '다른 가락' 단추는 중간에 나옴");
  const ks = new Set(mod.PLAN.filter(p => p.ans !== 'same').map(p => p.k));
  for (const k of [7, 5, 2, -5]) assert.ok(ks.has(k), '가8 옮기는 수 ' + k);
  for (const p of mod.PLAN.filter(q => q.ans === 'other')) assert.deepEqual(mod.SHUF.flip(p), p, '가8 다른 가락 판은 섞어도 그대로');
}
