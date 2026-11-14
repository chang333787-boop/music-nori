// 리듬 악보 그림(app/js/cells/_glyph.js) — 박 합 · 음표 수 · 묶음 수 · 붙임줄 · 같은 입력 같은 출력 · 쓸 수 없는 길이는 오류
//  node tests/glyph.test.mjs
import assert from 'node:assert/strict';
import { glyph, parseBeats, headSVG, GREEN } from '../app/js/cells/_glyph.js';
import { noteSVG } from '../app/js/cells/_beat.js';

const attr = (s, k) => Number(s.match(new RegExp(`data-${k}="([^"]+)"`))[1]);
const count = (s, cls) => (s.match(new RegExp(`class="${cls}"`, 'g')) || []).length;
const CASES = [
  // [박 목록, 박 합, 음표, 쉼표, 묶음, 깃발, 둘째 줄 묶음, 붙임줄]
  [[1, 0.5, 0.5, 2], 4, 4, 0, 1, 0, 0, 0],
  [[0.5, 0.5, 0.5, 0.5, 1, 1], 4, 6, 0, 2, 0, 0, 0],
  [[0.25, 0.25, 0.25, 0.25, 1, 2], 4, 6, 0, 1, 0, 3, 0],
  [[0.75, 0.25, 1, 1, 1], 4, 5, 0, 1, 0, 1, 0],                 // 점8분 + 16분 = 묶음 하나 · 16분 토막 하나
  [[1.5, 0.5, 2], 4, 3, 0, 0, 1, 0, 0],                         // 점4분 뒤 8분은 혼자(엇박) → 깃발
  [[0.5, -0.5, 1, -1, 1], 4, 3, 2, 0, 1, 0, 0],                 // 쉼표가 끼면 묶지 않음
  [[{ d: 1, tie: true }, 1, { r: 2 }], 4, 2, 1, 0, 0, 0, 1],
  [[3, 1], 4, 2, 0, 0, 0, 0, 0],
  [[4], 4, 1, 0, 0, 0, 0, 0],
  [[0.5, 0.25, 0.25, 0.25, 0.25, 0.5], 2, 6, 0, 2, 0, 2, 0],    // 한 박씩 따로 묶음
];
for (const [b, beats, notes, rests, beams, flags, beam2, ties] of CASES) {
  const s = glyph(b), k = JSON.stringify(b);
  assert.equal(attr(s, 'beats'), beats, k + ' 박 합');
  assert.equal(attr(s, 'notes'), notes, k + ' 음표 수');
  assert.equal(count(s, 'g-head'), notes, k + ' 머리 수 = 음표 수');
  assert.equal(attr(s, 'rests'), rests, k + ' 쉼표 수');
  assert.equal(count(s, 'g-rest'), rests, k + ' 쉼표 그림 수');
  assert.equal(attr(s, 'beams'), beams, k + ' 묶음 수');
  assert.equal(count(s, 'g-beam'), beams, k + ' 묶음 그림 수');
  assert.equal(count(s, 'g-flag'), flags, k + ' 깃발 수');
  assert.equal(count(s, 'g-beam2'), beam2, k + ' 16분 둘째 줄');
  assert.equal(attr(s, 'ties'), ties, k + ' 붙임줄');
  assert.equal(glyph(b), s, k + ' 같은 입력 같은 출력');
  assert.ok(/^<svg class="glyph" viewBox="0 2 \d+ 84" width="\d+" height="64"/.test(s), k + ' 높이 64 · 한 줄');
  assert.ok(!/NaN|undefined/.test(s), k + ' 수가 다 있음');
}
// 셋잇단 — 한 박에 셋 · 묶음 하나 · 위에 3
{ const t = glyph([1 / 3, 1 / 3, 1 / 3, 1, 2]); assert.equal(attr(t, 'beats'), 4); assert.equal(attr(t, 'beams'), 1); assert.equal(count(t, 'g-trip'), 1, '셋잇단 3'); }
// 점음표 · 박 위치
assert.deepEqual(parseBeats([1.5, 0.5, -1]).map(it => [it.shape, it.dot, it.t, it.rest]), [['q', 1, 0, false], ['e', 0, 1.5, false], ['q', 0, 2, true]]);
assert.equal(count(glyph([1.5, 0.5, 3]), 'g-dot'), 2, '점 둘');
// 강조 = 초록(쉼표를 뺀 음표 차례)
assert.equal((glyph([1, -1, 1, 1], { hi: [1] }).match(new RegExp(GREEN, 'g')) || []).length > 0, true, '강조 초록');
assert.ok(!glyph([1, 1]).includes(GREEN), '강조가 없으면 잉크만');
// 쓸 수 없는 길이
assert.throws(() => glyph([1, 0.3]), /쓸 수 없는 길이/);
assert.throws(() => glyph([5]), /쓸 수 없는 길이/);
// 리듬 칸 음표 그림과 같은 머리(두 벌 X)
assert.ok(noteSVG('q').includes(headSVG(16, false)), '_beat.js noteSVG가 같은 머리를 씀');
// 크기
assert.ok(glyph([1, 1, 1, 1], { size: 96 }).includes('height="96"'));
console.log(`✓ 리듬 악보 그림 — ${CASES.length}가지 박 목록(박 합 · 음표 · 쉼표 · 묶음 · 깃발 · 16분 둘째 줄 · 붙임줄 · 같은 출력) · 강조 · 오류`);
