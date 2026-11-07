// 개념 칸 지도 시험 — 먼저 필요한 칸이 모두 있는지 · 고리(순환) 없음 · 첫 판 13칸 · 추천 차례가 앞 칸을 지키는지
import assert from 'node:assert/strict';
import { CELLS, LANES, FIRST, ORDER, cellById, nextCell, missingPre, passed } from '../engine/cells.js';

const ids = new Set(CELLS.map(c => c.id));
assert.equal(ids.size, CELLS.length, '칸 id 겹침');
for (const c of CELLS) {
  assert.ok(LANES[c.lane], c.id + ' 갈래');
  for (const p of c.pre) assert.ok(ids.has(p), `${c.id}의 먼저 필요한 칸 ${p}가 없음`);
  assert.ok(c.why && c.name && c.label, c.id + ' 글 빠짐');
}
// 고리 없음(위상 정렬)
const seen = new Map();
const visit = (id, path = []) => {
  if (seen.get(id) === 1) throw new Error('고리: ' + [...path, id].join(' → '));
  if (seen.get(id) === 2) return;
  seen.set(id, 1);
  for (const p of cellById(id).pre) visit(p, [...path, id]);
  seen.set(id, 2);
};
for (const c of CELLS) visit(c.id);
// 첫 판
assert.equal(FIRST.length, 13);
assert.deepEqual([...ORDER].sort(), [...FIRST].sort(), '추천 차례 = 첫 판 13칸');
for (const id of FIRST) assert.ok(cellById(id).game, id + ' 확인 게임 설명');
// 추천 차례 안에서는 앞 칸(첫 판에 있는 것)이 먼저 온다
for (const [i, id] of ORDER.entries()) for (const p of cellById(id).pre) if (FIRST.includes(p)) assert.ok(ORDER.indexOf(p) < i, `${id}보다 ${p}가 먼저`);
// 추천 다음 칸
assert.equal(nextCell({}), 'so3');
assert.equal(nextCell({ so3: { stars: 1 } }), 'so4');
assert.equal(nextCell({ so3: { stars: 0 } }), 'so3');
assert.equal(nextCell({}, 'ga1'), 'ga1');
assert.equal(nextCell(Object.fromEntries(ORDER.map(id => [id, { stars: 2 }]))), null);
assert.deepEqual(missingPre({ so4: { stars: 1 } }, 'so5'), ['so1', 'so2', 'so3']);
assert.ok(passed({ ri1: { stars: 3 } }, 'ri1'));
console.log(`✓ 칸 지도 시험 통과 — ${CELLS.length}칸 · 첫 판 ${FIRST.length}칸`);
