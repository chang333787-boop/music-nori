// 작은 오선 카드(app/js/cells/_staff.js · 묶음 C G2) — 자리 · 덧줄 · 조표 · 임시표 · 같은 입력 같은 출력(화면 없이 글만)
//  node tests/staff.test.mjs
import assert from 'node:assert/strict';
const { staffCard, stateOf, ledgersOf } = await import('../app/js/cells/_staff.js');
const { staffPos } = await import('../app/js/notation.js');

const attr = (s, k) => s.match(new RegExp(`data-${k}="([^"]*)"`))[1];
// 자리 = notation.js staffPos(아래 첫 줄 미 = 0) · 가온 도 = -2(덧줄 하나) · 낮은 라 -4 · 낮은 솔 -5(덧줄 둘)
assert.deepEqual([60, 57, 55, 64, 77].map(staffPos), [-2, -4, -5, 0, 8]);
assert.deepEqual([60, 59, 57, 55, 64, 81, 84].map(p => ledgersOf(staffPos(p)).length), [1, 1, 2, 2, 0, 1, 2]);
const a = staffCard([60, 57, 55, 64]);
assert.equal(attr(a, 'pos'), '-2,-4,-5,0');
assert.equal(attr(a, 'ledgers'), '1,2,2,0');
assert.equal((a.match(/<ellipse/g) || []).length, 4, '음표 머리 넷');
assert.equal(staffCard([60, 57, 55, 64]), a, '같은 입력 같은 출력');
assert.ok(a.includes('\u{1D11E}'), '높은음자리표');
// 조표 — ♯ 하나 = 다섯째 줄 파 자리 · ♭ 하나 = 셋째 줄 시 자리 · 조표가 바꾼 음에는 임시표를 그리지 않음
const ks = staffCard([66, 64, 66, 71], { key: 'sharp', bars: 2 });
assert.equal(attr(ks, 'key'), 'sharp');
assert.equal(attr(ks, 'acc'), ',,,', '조표 ♯ 아래 파♯은 그대로');
const kf = staffCard([65, 64, 65, 70], { key: 'flat', bars: 2 });
assert.equal(attr(kf, 'acc'), ',,,', '조표 ♭ 아래 시♭은 그대로');
// 조표가 없으면 음마다 ♯ · ♭ — 임시표는 그 마디 안에서만(같은 마디 같은 자리는 한 번 · 다음 마디는 다시)
assert.equal(attr(staffCard([65, 64, 66, 71], { bars: 2 }), 'acc'), ',,#,');
assert.equal(attr(staffCard([66, 66, 66, 64], { bars: 2 }), 'acc'), '#,,#,');
assert.equal(attr(staffCard([66, 65, 64, 64], { bars: 2 }), 'acc'), '#,n,,', '같은 마디에서 제자리로 = ♮');
assert.equal(attr(staffCard([65, 64, 64, 64], { key: 'sharp', bars: 2 }), 'acc'), 'n,,,', '조표 ♯ 아래 파(제자리) = ♮');
assert.equal(attr(staffCard([70], {}), 'acc'), 'b');
assert.deepEqual([65, 66, 70, 71].map(p => stateOf(p, 'sharp')), ['n', 'k', 'b', '']);
// 그림 크기 — 한 칸의 카드는 lo · hi를 고정하면 높이가 같음(음과 상관없이)
const H = s => s.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
assert.deepEqual(H(staffCard([60, 62], { lo: -5, hi: 7 })), H(staffCard([55, 72], { lo: -5, hi: 7 })));
assert.equal(H(a)[0], 240, '카드 너비 240');
console.log('✓ 작은 오선 카드 — 자리 · 덧줄 · 조표(♯ 파 · ♭ 시) · 임시표(그 마디 안) · 같은 크기 · 같은 입력 같은 출력');
