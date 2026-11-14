// 악4 음이름 찾기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick' · 카드 칸)

const NM = { 0: '다', 2: '라', 4: '마', 5: '바', 7: '사', 9: '가', 11: '나' };
const nm = p => NM[p % 12];
// 첫 도막 = 첫 음 하나(= 둘째 도막 첫 음) · 둘째 도막 네 음의 음이름 줄 = 답 카드 글 · 모든 음이 다~높은 라(60~74) · 이웃 음은 가장 가까운 자리
export function right(row, ns, { P }) {
  if (ns.length !== 2 || ns[0].length !== 1 || ns[1].length !== 4 || ns[0][0].p !== ns[1][0].p) return false;
  const all = [...ns[0], ...ns[1]];
  if (new Set(all.map(n => n.inst)).size !== 1 || new Set(all.map(n => n.d)).size !== 1 || Math.abs(all[0].d - P.BEAT * 0.92) > 1e-3) return false;
  if (all.some(n => n.p < 60 || n.p > 74 || !nm(n.p))) return false;
  if (ns[1].some((n, i) => i && Math.abs(n.p - ns[1][i - 1].p) > 7)) return false;
  return ns[1].map(n => nm(n.p)).join(' ') === row.set[row.ans];
}
export const opts = () => ['a', 'b', 'c'];
export const norm = p => p.set.join('|');

const K = ['a', 'b', 'c'];
const W = t => t.split(' ');
const half = t => W(t).some((n, i) => i && ((n === '바' && W(t)[i - 1] === '마') || (n === '마' && W(t)[i - 1] === '바') || (n === '다' && W(t)[i - 1] === '나') || (n === '나' && W(t)[i - 1] === '다')));
const far = (set, k) => set.reduce((a, s, j) => a + (j === k ? 0 : W(s).filter((n, i) => n !== W(set[k])[i]).length), 0);
const argmax = xs => xs.indexOf(Math.max(...xs));
export const bots = ({ rr }) => [
  // 새 꼴 = 반 계단(마-바 · 나-다)이 든 카드
  ['새 꼴이 든 카드', (k, p, o) => { const i = p.set.findIndex(half); return i < 0 ? o[Math.floor(rr() * 3)] : K[i]; }],
  ['이름이 가장 많은 카드', (k, p) => K[argmax(p.set.map(t => new Set(W(t)).size))]],
  ['홀로 다른 카드', (k, p) => K[argmax(p.set.map((s, i) => far(p.set, i)))]],
  ['차례대로 올라가는 카드', (k, p, o) => { const ORDN = '다라마바사가나다라'; const i = p.set.findIndex(t => ORDN.includes(W(t).join(''))); return i < 0 ? o[Math.floor(rr() * 3)] : K[i]; }],
];
export function extra({ mod, assert }) {
  for (const p of mod.PLAN) {
    assert.equal(new Set(p.set).size, 3, '악4 카드 셋 글이 다름');
    assert.equal(new Set(p.set.map(t => mod.midi(t).join('.'))).size, 3, '악4 카드 셋 소리가 다름');
    assert.ok(p.set.every(t => W(t)[0] === W(p.set[0])[0]), '악4 카드 셋 첫 음이 같음');
    assert.deepEqual(mod.cards(p), mod.cards(mod.SHUF.flip(p)), '악4 뒤집어도 같은 카드');
    assert.ok(mod.cards(p).every(c => !/높은/.test(c.label)), "악4 카드 글에 '높은' 없음");
  }
  // 설계서의 MIDI가 적힌 카드
  const want = { '사 가 나 다': [67, 69, 71, 72], '바 가 다 가': [65, 69, 72, 69], '가 다 라 다': [69, 72, 74, 72], '사 나 라 나': [67, 71, 74, 71], '나 다 라 다': [71, 72, 74, 72], '가 바 라 다': [69, 65, 62, 60], '라 다 라 마': [62, 60, 62, 64], '다 마 사 마': [60, 64, 67, 64], '사 마 다 마': [67, 64, 60, 64] };
  for (const [t, ps] of Object.entries(want)) assert.deepEqual(mod.midi(t), ps, '악4 음 높이 ' + t);
  assert.ok(mod.PLAN.filter(p => p.stage === 'intro').every(p => W(p.set[0])[0] === '다'), '악4 소개 = 다에서');
  assert.ok(mod.PLAN.filter(p => p.stage === 'grow').every(p => W(p.set[0])[0] !== '다'), '악4 발전 = 다가 아닌 음에서');
}
