// 형3 도막 짜임(ab · aba) — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick')

// 도막마다 (음 높이 : 길이) 줄 → 같은 줄에 같은 글자를 붙여 짜임을 다시 셈(악기 · 세기는 보지 않음)
export function right(row, ns, { seq, rel }) {
  if (ns.length !== 3) return false;
  const keys = ns.map(seq), seen = [];
  const form = keys.map(k => { let i = seen.indexOf(k); if (i < 0) { seen.push(k); i = seen.length - 1; } return 'abc'[i]; }).join('');
  if (form !== row.ans) return false;
  // 모든 도막 세 박(같은 길이) · 꼴마다 달라진 것 한 가지만
  const len = ns.map(a => +(a[a.length - 1].t + a[a.length - 1].d / 0.92).toFixed(3));
  if (new Set(len).size !== 1) return false;
  const inst = ns.map(a => a[0].inst), vel = ns.map(a => a[0].vel);
  const rep = 2;                                   // 리코더는 늘 셋째 도막
  if (row.kind === 'inst') { if (!inst.every((x, k) => x === (k === rep ? 'recorder' : 'piano'))) return false; } else if (!inst.every(x => x === 'piano')) return false;
  if (row.kind === 'soft') { if (!(vel[2] < vel[0] && vel[0] === vel[1])) return false; } else if (new Set(vel).size !== 1) return false;
  // 길이 꼴 판 — 첫째(a)와 b 도막의 길이 꼴이 같고 높낮이는 다름
  if (row.kind === 'rhythm') {
    const b = ns[form.indexOf('b')];
    if (!b || JSON.stringify(rel(ns[0])) !== JSON.stringify(rel(b)) || seq(ns[0]) === seq(b)) return false;
  }
  return true;
}
export const opts = () => ['aab', 'aba', 'abb', 'abc'];
export const norm = p => `${p.kind}:${p.a}:${p.b}:${p.c}`;
// 셋째 도막 악기만 보는 봇(리코더면 a-b-a) · 세기만 보는 봇(셋째가 작으면 a-b-b)
export const bots = ({ notesOf, rr }) => [
  ['악기', (k, p, o) => (notesOf(p)[2][0].inst === 'recorder' ? 'aba' : o[Math.floor(rr() * o.length)])],
  ['세기', (k, p, o) => (notesOf(p)[2][0].vel < notesOf(p)[0][0].vel ? 'abb' : o[Math.floor(rr() * o.length)])],
];
