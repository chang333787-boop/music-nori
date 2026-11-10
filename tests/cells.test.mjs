// 개념 칸 지도 시험 — 먼저 필요한 칸이 모두 있는지 · 고리(순환) 없음 · 첫 판 13칸 · 추천 차례가 앞 칸을 지키는지
import assert from 'node:assert/strict';
import { CELLS, LANES, FIRST, ORDER, cellById, nextCell, missingPre, passed, cellName, easyText, EASY_WORDS, stdText, PLAY_STD, PLAY_CARD } from '../engine/cells.js';

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
assert.equal(FIRST.length, 15);
assert.deepEqual([...ORDER].sort(), [...FIRST].sort(), '추천 차례 = 첫 판 15칸');
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
  // 늦게(N1) — 다시 보기 줄의 null = 고르기 전에 시간이 지난 판 · hist 줄에 l
  saveResult('so4', { starOn: [false, false, false], replay: [true, null, false, null], tip: '' });
  assert.equal(getProg().so4.hist[0].l, 2, 'hist에 늦게 수');
  assert.equal(getProg().ri1.hist[0].l, null, '징검다리(다시 보기 줄 없음)는 늦게 없음');
  delete globalThis.localStorage;
}

// ── 결과가 사실만 말하게(N1 · 11-08 토론) ──
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const { scoreChoices, factTip } = await import('../app/js/cellkit.js');
  const allLate = Array(12).fill(null);
  const sc = scoreChoices(allLate, 5);
  assert.deepEqual([sc.kept, sc.late, sc.stars], [0, 12, 0], '모두 시간 지남 = 맞힘 0 · 늦게 12');
  assert.equal(scoreChoices([true, null, false, true], 5).late, 1);
  assert.equal(factTip([true, true], [], '완벽'), '완벽');
  assert.equal(factTip([true, false, true, false], [{ n: 2, text: '갈래' }], '완벽'), '2 · 4번째 판을 틀렸어요.', '틀린 판 셋 미만이면 갈래 말 X');
  assert.match(factTip([false, false, false, false, false, false], [{ n: 3, text: '갈래' }], '완벽'), /^1 · 2 · 3 · 4번째 판을 틀렸어요\(그 밖에 2판 더\)\.$/, '갈래가 2/3를 못 넘으면 사실만');
  assert.equal(factTip([false, false, false, true], [{ n: 3, text: '갈래' }], '완벽'), '갈래');
  assert.equal(factTip([null, true], [], '완벽'), '고르기 전에 시간이 지난 판이 1번 있었어요.');
  const SO = {};
  for (const id of ['so3', 'so4', 'so5']) SO[id] = await import(`../app/js/cells/${id}.js`);
  const BRANCH = /헷갈렸어요|더 많이|고른 적이/;
  for (const id of ['so3', 'so4', 'so5']) {
    const t = SO[id].tipOf(SO[id].PLAN, allLate, Array(12).fill(null));
    assert.ok(!BRANCH.test(t) && t.includes('시간이 지난 판이 12번'), id + ' 모두 시간 지남 → 갈래 말 X · 시간 지남 한 줄: ' + t);
  }
  const P4 = SO.so4.PLAN, res = P4.map(() => true);
  const downs = P4.map((p, k) => (p[0] < 0 ? k : -1)).filter(k => k >= 0), ups = P4.map((p, k) => (p[0] > 0 ? k : -1)).filter(k => k >= 0);
  const one = [...res]; one[downs[0]] = false;
  let t = SO.so4.tipOf(P4, one);
  assert.ok(!t.includes('더 많이') && t.includes('번째 판을 틀렸어요'), '소4 하나만 틀림 → 사실만: ' + t);
  const many = [...res]; downs.slice(0, 4).forEach(k => { many[k] = false; }); many[ups[0]] = false;
  const smallN = P4.filter((p, k) => many[k] === false && Math.abs(p[0]) <= 5).length;
  t = SO.so4.tipOf(P4, many);
  assert.ok(smallN > 5 * 2 / 3 ? t.includes('높이 차이가 작을 때') : t.includes('낮아지는 소리'), '소4 내려가는 판 넷 + 올라가는 판 하나 → 갈래 말: ' + t);
  delete globalThis.localStorage;
}
// ── 듣지 않고 별 받기 막기(N2 · 11-08 토론) ──
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const K = await import('../app/js/cellkit.js');
  assert.equal(K.minKeep(12, 2), 9); assert.equal(K.minKeep(12, 3), 7);
  assert.equal(K.seedOf('1234', 'so4', 1700000000000), K.seedOf('1234', 'so4', 1700000000000));
  assert.notEqual(K.seedOf('1234', 'so4', 1), K.seedOf('1234', 'ga1', 1));
  // 찍기 봇 1만 번 — 별 하나라도 받는 비율 < 10%
  const r = K.rng(7);
  for (const [n, ch] of [[12, 2], [12, 3]]) {
    let got = 0;
    for (let t = 0; t < 10000; t++) { const res = Array.from({ length: n }, () => r() < 1 / ch); if (K.scoreChoices(res, 5, { chance: Array(n).fill(1 / ch) }).stars > 0) got++; }
    assert.ok(got / 10000 < 0.10, `${ch}지선다 찍기 봇 별 비율 ${got / 100}%`);
  }
  // 이어서 다섯 번만 채우고 맞힌 수가 바닥(9) 아래 → 별 0
  assert.equal(K.scoreChoices([1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1].map(Boolean), 5, { chance: Array(12).fill(0.5) }).stars, 0);
  assert.equal(K.scoreChoices(Array(12).fill(true), 5, { chance: Array(12).fill(0.5) }).stars, 3);
  assert.equal(K.scoreChoices([1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0].map(Boolean), 5).stars, 1, '찍기 바닥 없이 부르면 예전 규칙(박 칸)');
  // 소4 · 가1 단계 안 섞기 — 씨앗 1000개
  const so4 = await import('../app/js/cells/so4.js'), ga1 = await import('../app/js/cells/ga1.js');
  const norm4 = p => `${Math.abs(p[0])}:${p[1]}`;
  const normG = p => { const a = p[0].join(','), b = ga1.SHUF.flip(p)[0].join(','); return (a < b ? a : b) + ':' + p[1]; };
  for (const [name, mod, norm] of [['so4', so4, norm4], ['ga1', ga1, normG]]) {
    const bounds = [0, ...mod.CUTS, mod.PLAN.length];
    let alt = 0, same = 0, cheat = 0, origin = 0;
    for (let sd = 1; sd <= 1000; sd++) {
      const plan = K.stageShuffle(mod.PLAN, mod.CUTS, K.rng(K.seedOf('t', sd)), mod.SHUF);
      if (plan === mod.PLAN || plan.every((p, k) => p === mod.PLAN[k])) origin++;
      for (let b = 0; b + 1 < bounds.length; b++) assert.deepEqual(plan.slice(bounds[b], bounds[b + 1]).map(norm).sort(), mod.PLAN.slice(bounds[b], bounds[b + 1]).map(norm).sort(), `${name} 씨앗 ${sd} ${b + 1}단계 문항 묶음`);
      const a = plan.map(mod.SHUF.answerOf);
      for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) same++;
      if (a[0] === a[2] && a[1] === a[3] && a[0] !== a[1]) alt++;
      const c = {}; a.forEach(x => { c[x] = (c[x] || 0) + 1; });
      assert.deepEqual(Object.values(c), [6, 6], `${name} 씨앗 ${sd} 답 수 6:6`);
      // 번갈아 누르기(두 위상) · 늘 같은 답 봇 — 답(첫 음 · 높아지나)만 맞추는 봇이 별을 받으면 안 됨
      const chance = name === 'so4' ? plan.map(() => 0.5) : mod.GUESS(plan);
      const vals = [...new Set(a)];
      const bots = [k => vals[k % 2], k => vals[(k + 1) % 2], () => vals[0], () => vals[1]];
      for (const bot of bots) {
        // 소4 봇: 그 차례 답을 누름 · 가1 봇: 첫 음은 봇 차례 음, 나머지는 반대 음(솔미 · 미솔 · 솔미솔…만 누름)
        const res = name === 'so4' ? plan.map((p, k) => mod.SHUF.answerOf(p) === bot(k))
          : plan.map((p, k) => p[0].every((x, j) => x === (j % 2 === 0 ? bot(k) : vals.find(v => v !== bot(k)))));
        if (K.scoreChoices(res, 5, { chance }).stars > 0) cheat++;
      }
      // 같은 씨앗이면 같은 판
      if (sd === 1) assert.deepEqual(K.stageShuffle(mod.PLAN, mod.CUTS, K.rng(K.seedOf('t', 1)), mod.SHUF), plan);
    }
    assert.equal(same, 0, `${name} 같은 답 세 번 연속`);
    assert.equal(alt, 0, `${name} 처음 네 판 번갈아`);
    assert.ok(origin < 5, `${name} 원판으로 되돌아간 씨앗 ${origin}`);
    assert.ok(cheat / 4000 < 0.10, `${name} 번갈아 · 같은 답 봇 별 비율 ${cheat / 40}%`);
  }
  delete globalThis.localStorage;
}
// ── 장1 장단보 채우기(11-08 · docs/gugak.md 표기 그대로) ──
{
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const jd = await import('../app/js/cells/jd1.js');
  const T = { deong: '덩', kung: '쿵', deok: '덕' }, txt = d => d.pat.map(x => (x ? T[x] : '_')).join('');
  assert.equal(txt(jd.JANGDAN.JJ), '덩__쿵__쿵_덕쿵__', '자진모리 A꼴(교과서 가장 흔한 꼴)');
  assert.equal(txt(jd.JANGDAN.JJB), '덩_덕쿵덕_쿵_덕쿵덕_', '자진모리 B꼴');
  assert.equal(txt(jd.JANGDAN.SM), '덩__덩_덕쿵덕_', '민요 세마치');
  assert.equal(txt(jd.JANGDAN.SME), '덩__쿵_덕___', '세마치 맺는 꼴');
  for (const d of Object.values(jd.JANGDAN)) { assert.equal(d.pat.length, d.beats * d.sub, d.name + ' 칸 수'); assert.equal(d.pat[0], 'deong', d.name + ' 첫 칸 덩'); }
  assert.deepEqual(jd.JANGDAN.JJ.acc, [0, 8]); assert.deepEqual(jd.JANGDAN.SM.acc, [0]);
  // 빈칸은 늘 소리가 있는 칸 · 답 셋이 고르게(덩 3 · 쿵 4 · 덕 4) · 묶음 = 판 수
  const ans = jd.PLAN.flatMap(p => p.blank.map(i => p.def.pat[i]));
  assert.ok(ans.every(Boolean), '빈칸은 소리가 있는 칸');
  assert.deepEqual(['deong', 'kung', 'deok'].map(k => ans.filter(x => x === k).length), [3, 4, 4]);
  assert.equal(jd.GROUP.reduce((a, b) => a + b, 0), ans.length);
  assert.ok(jd.symSVG('deong').includes('<circle') && jd.symSVG('deong').includes('<line') && !jd.symSVG('kung').includes('<line') && !jd.symSVG('deok').includes('<circle'), '부호 ⦶ ○ |');
  const all = ans.map(() => true);
  assert.equal(jd.tipOf(jd.PLAN, all), '덩 · 쿵 · 덕을 듣고 장단보 빈칸을 모두 채웠어요.');
  const deokMiss = ans.map(x => x !== 'deok');
  assert.match(jd.tipOf(jd.PLAN, deokMiss), /덕\(채편\)/);
  delete globalThis.localStorage;
}
console.log(`✓ 칸 지도 시험 통과 — ${CELLS.length}칸 · 첫 판 ${FIRST.length}칸 · 1~2학년 이름 · 쉬운 말 ${EZ.length} · 성취기준 · 결과 기록 · 사실만 말하는 결과(N1) · 찍기 바닥 · 단계 안 섞기(N2) · 장1 장단 표기`);

// 칸 결과 → 곡 바꾸기 부탁(11-10): 첫 판 칸만 · 부탁 키는 play.js CARDS의 여덟 중 하나 · 단추 글은 '바꿔/넣어/고쳐/지어/늘여 보기'
{
  const KEYS = ['pitch', 'long', 'fix', 'rest', 'meter', 'tempo', 'dyn', 'make'];
  for (const [id, [key, label]] of Object.entries(PLAY_CARD)) {
    assert.ok(FIRST.includes(id), 'PLAY_CARD 칸이 첫 판에 없음: ' + id);
    assert.ok(KEYS.includes(key), 'PLAY_CARD 부탁 키가 없음: ' + id + ' ' + key);
    assert.ok(/ 보기$/.test(label) && label.length <= 12, 'PLAY_CARD 단추 글: ' + label);
  }
  console.log('✓ 칸 → 곡 바꾸기 부탁 ' + Object.keys(PLAY_CARD).length + '칸');
}
