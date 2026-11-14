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
    // near = 옮긴 수 k가 한 음만 빼고 모두 · 그 한 음은 k ± 2 · 첫 음은 옮겨짐 / head = 첫 음만 그대로(0) · 나머지는 모두 k
    const off = diff.map((d, i) => (d === row.k ? null : i)).filter(i => i != null);
    if (off.length !== 1) return false;
    return row.kind === 'head' ? off[0] === 0 && diff[0] === 0 : row.kind === 'near' && off[0] > 0 && Math.abs(diff[off[0]] - row.k) === 2;
  }
  return true;
}
export const opts = () => ['same', 'moved', 'other'];
export const norm = p => `${p.kind}:${p.m}:${p.k}`;

// 첫 음 봇(첫 음만 들음 — 같으면 그대로 · 다르면 옮긴 가락) — 이 봇이 별을 받으면 '옮긴 가락 ↔ 다른 가락'을 확인하지 못함(11-14 메인 결정)
export const firstNote = (k, p, o, notesOf) => { const [a, b] = notesOf(p); return a[0].p === b[0].p ? 'same' : 'moved'; };
// 둘째 음까지 듣는 봇(참고 · 시험 기준 아님) — 두 음의 차가 모두 0이면 그대로 · 같으면 옮긴 가락 · 다르면 다른 가락
export const secondNote = (k, p, o, notesOf) => {
  const [a, b] = notesOf(p), d0 = b[0].p - a[0].p, d1 = b[1].p - a[1].p;
  const v = d0 !== d1 ? 'other' : d0 === 0 ? 'same' : 'moved';
  return o.includes(v) ? v : 'moved';
};
export const bots = ({ notesOf }) => [['첫 음', (k, p, o) => firstNote(k, p, o, notesOf)]];
// 1~2학년 판은 '가락' 대신 '노래' · 단추 셋은 처음부터 · 옮기는 수가 위아래 · 크고 작게 섞임 · 다른 가락 판은 섞어도 그대로
export function extra({ mod, spec, kitOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(!low.items.some(it => /가락/.test(it.label)) && !/가락/.test(low.say.kid), "가8 1~2학년 '노래'");
  assert.deepEqual(spec.items.map(it => it.label), ['그대로', '옮긴 가락', '다른 가락']);
  assert.deepEqual(spec.items.map(it => it.locked), [false, false, false], '가8 단추 셋은 처음부터');
  const ks = new Set(mod.PLAN.filter(p => p.ans !== 'same').map(p => p.k));
  for (const k of [7, 5, 2, -5]) assert.ok(ks.has(k), '가8 옮기는 수 ' + k);
  for (const p of mod.PLAN.filter(q => q.ans === 'other')) assert.deepEqual(mod.SHUF.flip(p), p, '가8 다른 가락 판은 섞어도 그대로');
  assert.ok(mod.PLAN.some(p => p.kind === 'head') && mod.PLAN.some(p => p.kind === 'near'), '가8 다른 가락 두 꼴(첫 음 그대로 · 한 음 ±2)');
}
