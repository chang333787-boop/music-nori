// 계열 · 난이도 표(engine/load.js) — 빠진 단계 · 점수 범위 · 먼저 할 것이 돌지 않는지 · 연구와 어긋나지 않는지 · 칸 차례가 난이도를 거스르지 않는지
import assert from 'node:assert/strict';
import { ELEMENTS, CLUSTERS, elementById } from '../engine/flow.js';
import { FACTORS, LOAD, MAX_SUM, levelOfSum, loadOf, order, ladder, earlyOk, gradeGaps, cellLevel } from '../engine/load.js';
import { ORDER, FIRST } from '../engine/cells.js';

const ids = ELEMENTS.flatMap(el => el.steps.map(s => s.id));

// 1. 흐름의 모든 단계에 점수가 있고, 남는 점수가 없다
assert.deepEqual(ids.filter(i => !LOAD[i]), [], '점수 없는 단계');
assert.deepEqual(Object.keys(LOAD).filter(i => !ids.includes(i)), [], '흐름에 없는 단계의 점수');

// 2. 점수는 기준표 범위 안의 정수
assert.equal(FACTORS.length, 6);
assert.equal(MAX_SUM, 16);
for (const f of FACTORS) for (const t of f.at) assert.ok(t.length >= 4 && t.length <= 40, `${f.name} 기준 글 길이: ${t}`);
for (const id of ids) {
  const f = LOAD[id].f;
  assert.equal(f.length, 6, id);
  f.forEach((v, i) => assert.ok(Number.isInteger(v) && v >= 0 && v < FACTORS[i].at.length, `${id} ${FACTORS[i].name} = ${v}`));
}
assert.deepEqual([0, 3, 4, 6, 7, 9, 10, 12, 13, 16].map(levelOfSum), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);

// 3. 먼저 할 것 — 있는 단계 · 자기 자신 아님 · 돌지 않음 · 먼저 할 것보다 쉬울 수 없음
for (const id of ids) {
  const l = loadOf(id);
  for (const n of l.needs) {
    assert.ok(LOAD[n], `${id}의 먼저 할 것 ${n}이 없음`);
    assert.notEqual(n, id);
    assert.ok(l.lv >= loadOf(n).lv, `${id}(${l.lv})가 먼저 할 ${n}(${loadOf(n).lv})보다 쉬움`);
  }
  assert.equal(new Set(l.needs).size, l.needs.length, `${id} 먼저 할 것 겹침`);
  assert.ok(l.lv >= l.own && l.lv >= 1 && l.lv <= 5);
  assert.ok(l.heavy.length <= 2 && l.heavy.every(h => h.v >= 2 && h.text), `${id} 무거운 것`);
}

// 4. 한 줄 차례 — 모든 단계가 한 번씩 · 먼저 할 것이 늘 앞
const ord = order();
assert.equal(ord.length, ids.length);
assert.equal(new Set(ord).size, ids.length);
ord.forEach((id, i) => LOAD[id].needs.forEach(n => assert.ok(ord.indexOf(n) < i, `${n}이 ${id}보다 뒤`)));

// 5. 요소마다 첫 단계가 그 요소에서 가장 쉽다
for (const el of ELEMENTS) {
  const lvs = el.steps.map(s => loadOf(s.id).lv);
  assert.equal(lvs[0], Math.min(...lvs), `${el.name} 첫 단계가 가장 쉽지 않음`);
}

// 6. 연구와 어긋나지 않는다 — 세 덩어리(이른 · 가운데 · 늦은)의 평균 난이도가 그 차례대로 높아진다
const mean = c => { const lv = c.els.flatMap(e => elementById(e).steps.map(s => loadOf(s.id).lv)); return lv.reduce((a, b) => a + b, 0) / lv.length; };
const means = CLUSTERS.map(mean);
for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], `덩어리 평균 난이도 ${means.map(m => m.toFixed(2)).join(' → ')}`);
//  이른 덩어리의 첫 단계는 모두 난이도 1
for (const e of CLUSTERS[0].els) assert.equal(loadOf(elementById(e).steps[0].id).lv, 1);

// 7. 요소 안 차례보다 쉬운 단계 — 문서(docs/flow.md)에 적어 둔 다섯 곳뿐. 바뀌면 문서의 까닭도 고친다
assert.deepEqual(earlyOk().map(x => x.step.id).sort(), ['d4', 'd5', 'd6', 'r10', 't5']);
const gaps = gradeGaps();
assert.deepEqual(gaps.slow.map(x => x.id).sort(), ['b6', 'r5', 'r6']);
assert.deepEqual(gaps.soon.map(x => x.id).sort(), ['d4', 'd5', 'e4', 'r10', 't5']);

// 8. 사다리 — 다섯 층에 모든 단계가 한 번씩
const lad = ladder();
assert.equal(lad.length, 5);
assert.equal(lad.flatMap(r => r.els.flatMap(x => x.steps)).length, ids.length);
assert.ok(lad.every(r => r.els.length), '빈 층');

// 9. 만든 칸의 추천 차례(ORDER)는 난이도를 거스르지 않는다
const lvs = ORDER.map(cellLevel);
FIRST.forEach(id => assert.ok(cellLevel(id) != null, `${id}가 어느 흐름에도 없음`));
assert.equal(cellLevel('hy2'), 3, '형2 메기고 받기 = 흐름 f2(난이도 3)');
for (let i = 1; i < lvs.length; i++) assert.ok(lvs[i] >= lvs[i - 1], `칸 차례 ${ORDER[i - 1]}(${lvs[i - 1]}) → ${ORDER[i]}(${lvs[i]})`);

const dist = [1, 2, 3, 4, 5].map(lv => ids.filter(i => loadOf(i).lv === lv).length);
console.log(`✓ 계열 · 난이도 — 단계 ${ids.length} · 난이도 분포 ${dist.join('/')} · 덩어리 평균 ${means.map(m => m.toFixed(2)).join(' → ')} · 칸 ${ORDER.length} 차례 ${lvs.join('')}`);
