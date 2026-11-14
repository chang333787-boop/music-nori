// 악3 가온 도에서 읽기 — tests/pick.test.mjs가 읽는 칸별 검사(듣고 고르기 공용 틀 · 장부 frame: 'pick' · 카드 칸)

import { staffPos } from '../../app/js/notation.js';

// 첫 도막 = 가온 도 한 음 · 둘째 도막 = 답 카드의 네 음(같은 길이 · 피아노 하나)
export function right(row, ns, { P }) {
  if (ns.length !== 2 || ns[0].length !== 1 || ns[0][0].p !== 60 || ns[1].length !== 4) return false;
  const all = [...ns[0], ...ns[1]];
  if (new Set(all.map(n => n.inst)).size !== 1 || new Set(all.map(n => n.d)).size !== 1 || Math.abs(all[0].d - P.BEAT * 0.92) > 1e-3) return false;
  return JSON.stringify(ns[1].map(n => n.p)) === JSON.stringify(row.set[row.ans]);
}
export const opts = () => ['a', 'b', 'c'];
export const norm = p => p.set.map(s => s.join('.')).join('|');

const K = ['a', 'b', 'c'];
const ledgers = ps => ps.reduce((a, p) => a + (p <= 55 ? 2 : p <= 57 ? 2 : p <= 60 ? 1 : 0), 0);
const far = (set, k) => set.reduce((a, s, j) => a + (j === k ? 0 : s.reduce((b, p, i) => b + Math.abs(p - set[k][i]), 0)), 0);
const argmax = xs => xs.indexOf(Math.max(...xs));
// 카드 꼴 봇(§0) — 카드 그림만 보고 고름
export const bots = ({ rr }) => [
  // 새 꼴 = 덧줄 둘(낮은 라 · 솔)이 든 카드 · 없으면 가온 도에서 시작하지 않는 카드 · 그도 없으면 아무거나
  ['새 꼴이 든 카드', (k, p, o) => { let i = p.set.findIndex(s => s.some(x => x < 59)); if (i < 0) i = p.set.findIndex(s => s[0] !== 60); return i < 0 ? o[Math.floor(rr() * 3)] : K[i]; }],
  ['덧줄이 가장 많은 카드', (k, p) => K[argmax(p.set.map(ledgers))]],
  ['홀로 다른 카드', (k, p) => K[argmax(p.set.map((s, i) => far(p.set, i)))]],
  ['가온 도에서 시작하는 카드', (k, p, o) => { const i = p.set.filter(s => s[0] === 60).length === 1 ? p.set.findIndex(s => s[0] === 60) : -1; return i < 0 ? o[Math.floor(rr() * 3)] : K[i]; }],
];
// 카드 셋은 소리가 모두 다르고 · 뒤집어도 같은 카드 · 카드 그림의 음 자리 = 카드 음 · 소개는 셋 다 가온 도에서 · 비틀기는 덧줄 둘
export function extra({ mod, spec, kitOf, assert }) {
  for (const p of mod.PLAN) {
    assert.equal(new Set(p.set.map(s => s.join('.'))).size, 3, '악3 카드 셋 소리가 다름: ' + JSON.stringify(p.set));
    assert.deepEqual(mod.cards(p), mod.cards(mod.SHUF.flip(p)), '악3 뒤집어도 같은 카드');
    mod.cards(p).forEach((c, k) => {
      const pos = c.chip.match(/data-pos="([^"]*)"/)[1].split(',').map(Number);
      assert.deepEqual(pos, p.set[k].map(staffPos), '악3 카드 그림 자리');
      assert.equal(c.label, ['첫째', '둘째', '셋째'][k], '악3 카드 이름 = 자리');
    });
  }
  assert.ok(mod.PLAN.filter(p => p.stage === 'intro').every(p => p.set.every(s => s[0] === 60)), '악3 소개 = 셋 다 가온 도에서');
  assert.ok(mod.PLAN.filter(p => p.stage === 'twist').every(p => p.set.some(s => s.some(x => x <= 57))), '악3 비틀기 = 덧줄 둘');
  // 가온 도 아래 덧줄 하나 · 낮은 라 · 솔은 덧줄 둘(그림의 덧줄 수)
  const c = mod.cards({ set: [[60, 57, 55, 64], [60, 60, 60, 60], [64, 64, 64, 64]], ans: 0 })[0].chip;
  assert.equal(c.match(/data-ledgers="([^"]*)"/)[1], '1,2,2,0', '악3 덧줄 수');
  const low = mod.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(!/오선/.test(low.say.kid) && spec.items.every(it => /째$/.test(it.label)), '악3 단추 = 자리 이름');
}
