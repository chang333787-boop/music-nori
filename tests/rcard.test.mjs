// 리듬 카드 글 → 박 목록 · 소리 줄(app/js/cells/_rcard.js) — 낱말 · 붙임줄 · 음 시작 · 길이 · 소리 열쇠
//  node tests/rcard.test.mjs
import assert from 'node:assert/strict';
import { TOKENS, beatsOf, totalOf, eventsOf, soundKey, rhythmLine, wordsOf, marksOf, wordDist, buildCard, flipCard, ansKey, RB } from '../app/js/cells/_rcard.js';
import { glyph } from '../app/js/cells/_glyph.js';

// 낱말마다 박 합 · 그림이 받는 꼴
const LEN = { q: 1, h: 2, dh: 3, e2: 1, s4: 1, s2e: 1, es2: 1, er: 1, re: 1, trip: 1, dqe: 2, syn: 2 };
for (const [k, v] of Object.entries(LEN)) {
  assert.ok(TOKENS[k], k);
  assert.ok(Math.abs(totalOf(k) - v) < 1e-9, `${k} 박 합 ${v}`);
  assert.equal(Number(glyph(beatsOf(k)).match(/data-beats="([^"]+)"/)[1]), v, `${k} 그림 박 합`);
}
assert.deepEqual(beatsOf('q er'), [1, 0.5, -0.5]);
assert.deepEqual(beatsOf('q~q q'), [{ d: 1, tie: true }, 1, 1]);
assert.deepEqual(beatsOf('e2~q'), [0.5, { d: 0.5, tie: true }, 1]);
// 음 시작 · 길이(붙임줄은 한 음)
assert.deepEqual(eventsOf('q q~q q'), [{ t: 0, len: 1 }, { t: 1, len: 2 }, { t: 3, len: 1 }]);
assert.deepEqual(eventsOf('re q'), [{ t: 0.5, len: 0.5 }, { t: 1, len: 1 }]);
assert.deepEqual(eventsOf('syn').map(e => e.t), [0, 0.5, 1.5]);
assert.deepEqual(eventsOf('trip').map(e => +e.t.toFixed(3)), [0, 0.333, 0.667]);
// 붙임줄 ♩‿♩ = 2분음표(소리 같음) · 8분 + 쉼표 ≠ 4분(길이가 다름)
assert.equal(soundKey('q~q q q'), soundKey('h q q'));
assert.notEqual(soundKey('q er q q'), soundKey('q q q q'));
assert.notEqual(soundKey('q s2e q q'), soundKey('q es2 q q'));
// 소리 줄 — 길이 = 박 합 × 박 · 음 d = 길이 × 박 × 0.8(가장 짧아도 0.06) · 쉼은 p: null
for (const t of ['q s4 q q', 'trip q er q', 're q es2 q', 'q e2~q q', 'dqe syn']) {
  const ln = rhythmLine(t, { beat: RB });
  assert.ok(Math.abs(ln.reduce((s, n) => s + n.d + n.gap, 0) - totalOf(t) * RB) < 1e-9, t + ' 줄 길이');
  assert.ok(ln.every(n => n.gap >= -1e-12 && n.d > 0), t + ' 음 길이 · 틈');
  const ev = eventsOf(t), on = ln.filter(n => n.p != null);
  assert.equal(on.length, ev.length, t + ' 음 수');
  on.forEach((n, k) => assert.ok(Math.abs(n.d - Math.max(0.06, ev[k].len * RB * 0.8)) < 1e-9, t + ' 음 d'));
}
assert.equal(rhythmLine('re q')[0].p, null, '처음 쉼표 = 쉼');
// 봇 · 덧검사 도우미
assert.deepEqual(wordsOf('q q~q'), ['q', 'q', 'q', '~']);
assert.equal(marksOf('q s4'), 5);
assert.equal(wordDist('q q q q', 'q s4 q q'), 1);
assert.equal(wordDist('q q', 'q q'), 0);
// 모르는 낱말 · 쉼표에 붙임줄은 오류
assert.throws(() => beatsOf('q x'), /모르는 낱말/);
assert.throws(() => beatsOf('er~q'), /붙임줄/);
// 카드 칸 도막 — 준비 두 박(도막 뒤 쉼 0) + 네 박 리듬 · 박 하이햇 넷 · 뒤집으면 답만 다음 카드로
const row = { set: ['q q q q', 'q s4 q q', 'q trip q q'], ans: 1 }, segs = buildCard(row);
assert.equal(segs.length, 2); assert.equal(segs[0].gap, 0); assert.equal(segs[0].lines[0].length, 2);
assert.equal(segs[1].lines[1].length, 4);
assert.deepEqual(flipCard(row), { ...row, ans: 2 }); assert.equal(ansKey(row), 'b'); assert.equal(ansKey(flipCard(flipCard(row))), 'a');
console.log(`✓ 리듬 카드 — 낱말 ${Object.keys(LEN).length}개 박 합 · 그림 · 붙임줄 · 음 시작 · 소리 열쇠 · 소리 줄 길이 · 카드 칸 도막`);
