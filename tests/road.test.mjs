// 마디 상자 줄(app/js/cells/_road.js · 반1 · 반2) — 카드 글 → 연주 차례 · 그림 · 동기 표(화면 · 소리 없음)
//  node tests/road.test.mjs
import assert from 'node:assert/strict';
import { parseRoad, expandRoad, roadSVG, roadSymbols, ROAD_CARDS, ROAD_MOT, roadOrder } from '../app/js/cells/_road.js';

// 설계서 batchC §C4 카드 길 → 연주 차례(손으로 적은 표와 같아야 함)
const WANT = { R1: '121234', R2: '123234', R3: '123434', R4: '123123', R5: '112344', P6: '123456', V1: '123124', V2: '121345', V3: '123245',
  DC1: '123412', DC2: '123451', DS1: '123423', DS2: '123453', CO1: '123425', CO2: '123415' };
assert.deepEqual(Object.keys(ROAD_CARDS).sort(), Object.keys(WANT).sort(), '카드 이름');
for (const [k, v] of Object.entries(WANT)) assert.equal(roadOrder(k).join(''), v, `${k} 연주 차례`);
// 도돌이 시작이 없으면 처음으로 · 2번 괄호는 상자 하나 · 되돌아간 뒤 Fine에서 끝
assert.equal(expandRoad('1 2 :| 3').join(''), '12123');
assert.equal(expandRoad('|: 1 [1 2 :| [2 3 4').join(''), '12134');
assert.equal(expandRoad('1 2 Fine 3 DC').join(''), '12312');
assert.equal(expandRoad('1 2 3').join(''), '123');
assert.deepEqual(parseRoad('|: 1 [1 2 :| [2 3 4').map(b => b.v || 0), [0, 1, 2, 0]);
assert.throws(() => parseRoad('1 X 2'), /모르는 낱말/);
assert.throws(() => parseRoad(':| 1'), /상자가 없음/);
// 동기 — 모두 두 박 · 서로 다른 높이 줄(소리로 동기를 알아낼 수 있게)
for (const m of Object.values(ROAD_MOT)) assert.equal(m.reduce((a, [, b]) => a + b, 0), 2, '동기 두 박');
assert.equal(new Set(Object.values(ROAD_MOT).map(m => m.map(([p]) => p).join(' '))).size, 6, '동기 높이 줄 서로 다름');
// 그림 — 상자 수 · 연주 차례 · 기호는 path(기호 글꼴 X) · 우리말 작은 글 · 너비
for (const [k, t] of Object.entries(ROAD_CARDS)) {
  const s = roadSVG(t, { mot: ROAD_MOT });
  assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'), k + ' svg');
  assert.ok(s.includes(`data-boxes="${parseRoad(t).length}"`) && s.includes(`data-order="${roadOrder(k).join(' ')}"`), k + ' data');
  assert.ok(!/[𝄋𝄌⊕𝄆𝄇]/u.test(s), k + ' 기호 글자를 쓰지 않음(path)');
  const circles = (s.match(/<circle[^>]*fill="#2F6F4E"/g) || []).length;
  assert.equal(circles, parseRoad(t).reduce((a, b) => a + ROAD_MOT[b.n].length, 0), k + ' 상자마다 높낮이 점');
  const [, w, h] = s.match(/viewBox="[-\d.]+ 0 ([\d.]+) ([\d.]+)"/).map(Number);
  assert.ok(w <= 380 && h === 108 && s.includes('height="108"'), `${k} 그림 ${w} × ${h}(뷰박스 1 = 화면 1px)`);
  // 그림 안 글자는 모두 20(화면 18px 이상 — 카드 그림 높이 108px = 뷰박스 높이)
  for (const m of s.matchAll(/<text[^>]*font-size="([\d.]+)"/g)) assert.ok(Number(m[1]) >= 20, `${k} 글자 크기 ${m[1]}`);
  if (/DC/.test(t)) assert.ok(s.includes('>처음으로<'), k + ' 처음으로');
  if (/Fine/.test(t)) assert.ok(s.includes('>끝<'), k + ' 끝');
  if (/ S /.test(` ${t} `)) assert.ok(s.includes('>로<') && /D\.S\./.test(s), k + ' 𝄋로');
  if (/ToCoda/.test(t)) assert.ok(/>To</.test(s) && />Coda</.test(s), k + ' To Coda');
}
// 같은 입력 같은 출력
assert.equal(roadSVG(ROAD_CARDS.CO1, { mot: ROAD_MOT }), roadSVG(ROAD_CARDS.CO1, { mot: ROAD_MOT }));
assert.deepEqual(roadSymbols(ROAD_CARDS.V1), ['|:', '[1', ':|', '[2']);
console.log(`✓ 마디 상자 줄 — 카드 ${Object.keys(ROAD_CARDS).length}장 연주 차례 · 그림(path 기호 · 높낮이 점 · 우리말 글)`);
