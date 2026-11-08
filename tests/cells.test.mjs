// 개념 칸 지도 시험 — 먼저 필요한 칸이 모두 있는지 · 고리(순환) 없음 · 첫 판 13칸 · 추천 차례가 앞 칸을 지키는지
import assert from 'node:assert/strict';
import { CELLS, LANES, FIRST, ORDER, cellById, nextCell, missingPre, passed, cellName, easyText, EASY_WORDS, stdText, PLAY_STD } from '../engine/cells.js';

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
// ── 1~2학년 판(성취기준 점검 11-08) ──
assert.equal(cellName(cellById('ri2'), 'low'), '따·쉼 따라 치기');
assert.equal(cellName(cellById('ri2'), 'mid'), '4분음표·4분쉼표');
assert.equal(cellName(cellById('so3'), 'low'), '길게·짧게', 'easy 없는 칸은 그대로');
assert.equal(cellById('ri2').game, '따라 치기(따 · 쉼)', "리2는 '따라 치기'(메기고 받기 X)");
for (const id of FIRST) assert.ok(!/음표|쉼표|박자표|오선|악보|계이름/.test(cellName(cellById(id), 'low')), id + ' 1~2학년 이름에 용어');
// 바꾸기 표 — 받침이 다른 낱말은 조사도 함께
const EZ = [
  ['4분음표는 한 박, 2분음표는 두 박', '따는 한 박, 긴 따는 두 박'],
  ['4분쉼표는 한 자리', '쉼은 한 자리'], ['4분쉼표를 넣어요', '쉼을 넣어요'], ['4분쉼표로', '쉼으로'], ['4분쉼표예요', '쉼이에요'],
  ['8분음표 둘은 한 자리', '띠띠는 한 자리'], ['온음표', '아주 긴 따'], ['점2분음표', '긴긴 따'], ['박자표', '묶음 표시'],
  ['‘따아’(2분음표)를 일찍 뗐어요', '‘따아’를 일찍 뗐어요'], ['2분음표 ‘따아’ 하나 = 두 박', '‘따아’ 하나 = 두 박'],
  ['이 음표는 줄이', '이 음은 줄이'], ['물음표 소리', '물음표 소리'], ['오선으로', '다섯 줄로'], ['악보 네 개', '그림 네 개'],
  ['센박을 놓친 마디가', '쿵을 놓친 마디가'], ['여린박(작은 점)에', '짝(작은 점)에'], ['한 마디', '한 마디'],
];
for (const [a, b] of EZ) assert.equal(easyText(a), b, a);
assert.equal(easyText(null), null);
for (const [a] of EASY_WORDS) assert.ok(!/마디/.test(a), "'마디'는 바꾸지 않음");
// 성취기준 — 첫 판 13칸 모두 · 기호 꼴
for (const id of FIRST) {
  const c = cellById(id);
  assert.ok(Array.isArray(c.std) && c.std.length, id + ' 성취기준');
  for (const [code, m] of c.std) { assert.match(code, /^[246](음|즐)0\d-0\d$/, id + ' ' + code); assert.ok(m === '◎' || m === '○', id + ' 정도'); }
}
assert.equal(stdText(cellById('ri2').std), '[4음01-02]○ [2즐02-02]◎ [2즐03-02]◎');
assert.equal(stdText(PLAY_STD), '[4음03-02]◎ [4음03-03]◎ [6음03-02]○ [6음03-03]○');

// ── 결과 기록(cellkit.saveResult) — 기기 저장을 흉내 냄 ──
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const { saveResult, getProg, HIST_MAX } = await import('../app/js/cellkit.js');
  mem.set('mn.prog', JSON.stringify({ so3: { stars: 2, at: 1 } }));          // 예전 모양
  saveResult('so3', { starOn: [true, false, false], replay: [true, false, true, true], tip: '틀린 갈래' });
  let p = getProg().so3;
  assert.equal(p.stars, 2, '최고 별은 그대로');
  assert.deepEqual([p.hist.length, p.hist[0].s, p.hist[0].k, p.hist[0].n, p.hist[0].tip], [1, 1, 3, 4, '틀린 갈래']);
  saveResult('ri1', { stars: 3, kept: 20, total: 24, tip: '' });               // 징검다리 — replay 없음
  assert.deepEqual([getProg().ri1.hist[0].k, getProg().ri1.hist[0].n, getProg().ri1.stars], [20, 24, 3]);
  for (let i = 0; i < 14; i++) saveResult('so3', { stars: 3, replay: [true] });
  p = getProg().so3;
  assert.equal(p.hist.length, HIST_MAX, '최근 10개만');
  assert.equal(p.stars, 3);
  delete globalThis.localStorage;
}
console.log(`✓ 칸 지도 시험 통과 — ${CELLS.length}칸 · 첫 판 ${FIRST.length}칸 · 1~2학년 이름 · 쉬운 말 ${EZ.length} · 성취기준 · 결과 기록`);
