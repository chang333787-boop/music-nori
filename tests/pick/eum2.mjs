// 음2 관악기·현악기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

const WIND = ['recorder', 'flute', 'clarinet', 'oboe', 'trumpet', 'horn'], STRING = ['violin', 'cello', 'harp'];
const BASE = [67, 64, 67], SHIFT = { low: -12, high: 12 };
// 도막 하나 · 악기 하나 · 솔 미 솔(꼴 low · high만 한 옥타브 아래 · 위) · 답 = 그 악기가 관 목록인지 현 목록인지(표의 ans를 믿지 않고 소리에서 다시 셈)
export function right(row, ns) {
  if (ns.length !== 1) return false;
  const a = ns[0], insts = new Set(a.map(n => n.inst));
  if (insts.size !== 1) return false;
  const inst = [...insts][0], sh = SHIFT[row.kind] || 0;
  const heard = WIND.includes(inst) ? 'wind' : STRING.includes(inst) ? 'string' : null;
  if (!heard || heard !== row.ans) return false;
  if (a.length !== 3 || !a.every((n, k) => n.p === BASE[k] + sh)) return false;
  if (row.kind === 'brass' && heard === 'wind' && !['trumpet', 'horn'].includes(inst)) return false;
  if (row.kind === 'pluck' && heard === 'string' && inst !== 'harp') return false;
  if (row.kind === 'low' && !['horn', 'cello'].includes(inst)) return false;
  if (row.kind === 'high' && !['flute', 'violin'].includes(inst)) return false;
  return true;
}
export const opts = () => ['wind', 'string'];
export const norm = p => `${p.kind}:${p.w}:${p.s}`;

// 높이만 듣는 봇 — 높은 소리면 관 · 낮으면 현 · 그대로면 관
export const bots = ({ notesOf }) => [['높이', (k, p) => (notesOf(p)[0][0].p > 67 ? 'wind' : notesOf(p)[0][0].p < 67 ? 'string' : 'wind')]];
// 1~2학년 판은 '부는 악기 · 줄 악기' · 보기 화면에 컴퓨터로 만든 소리라고 적음
export function extra({ mod, spec, kitOf, assert }) {
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['부는 악기', '줄 악기'], '음2 1~2학년 단추 글');
  assert.deepEqual(spec.items.map(it => it.label), ['관악기', '현악기'], '음2 단추 글');
  assert.ok(mod.PLAN.every(p => WIND.includes(p.w) && STRING.includes(p.s)), '음2 줄마다 관 · 현 악기');
}
