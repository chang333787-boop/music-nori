// 소6 같은 악기·다른 악기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')
//  right(row, ns, ctx) = 이 줄의 답이 실제로 나는 소리와 맞는지 · opts(p, k, ctx) = k번째 판에 누를 수 있는 단추 · norm(p) = 섞어도 같은 문항인지 견주는 열쇠(뒤집기는 같은 문항)

// 같은 악기 ↔ 두 도막의 악기가 같음 · 가락은 같고(더 높게 판만 다섯 음 위) · 세기 판만 세기가 다름
export function right(row, ns) {
  const [a, b] = ns;
  if (ns.length !== 2) return false;
  const ia = new Set(a.map(n => n.inst)), ib = new Set(b.map(n => n.inst));
  if (ia.size !== 1 || ib.size !== 1 || row.a === row.b) return false;
  const same = [...ia][0] === [...ib][0];
  const up = b[0].p - a[0].p, sameTune = a.length === b.length && a.every((n, k) => b[k].p - n.p === up && b[k].d === n.d);
  return same === (row.ans === 'same') && sameTune && up === (row.kind === 'pitch' ? 7 : 0) && (a[0].vel !== b[0].vel) === (row.kind === 'loud');
}
export const opts = () => ['same', 'diff'];
export const norm = p => `${p.kind}:${p.a}:${p.b}`;
