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
// ── 나머지 고르기 다섯 칸(X2) — 단계 꼬리표 문항 표 · 단계 안 섞기 · 씨앗 1000개 · 찍기 · 번갈아 · 같은 답 · 단계 꼴 봇 ──
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const K = await import('../app/js/cellkit.js');
  const M = {};
  for (const id of ['so3', 'so5', 'ga2', 'ga3', 'ak2']) M[id] = await import(`../app/js/cells/${id}.js`);
  const STAGES = ['intro', 'grow', 'twist', 'end'];
  // 판마다 고를 수 있는 답(찍기 봇이 누를 수 있는 것) — 소5는 크기 단추가 비틀기부터 · 가3은 그림 수 · 악2는 비틀기부터 넷
  const OPTS = {
    so3: () => ['long', 'short'],
    so5: (p, k) => (k < M.so5.CUTS[1] ? ['pitch', 'len'] : ['pitch', 'len', 'vol']),
    ga2: () => [69, 67, 64],
    ga3: p => p.opts.map((_, j) => j),
    ak2: p => (p.twist ? [0, 1, 2, 3] : [0, 1]),
  };
  // 줄의 답이 문항 내용과 맞는지(표 하나가 정본 — 뒤집어도 맞아야 함)
  const RIGHT = {
    so3: p => p.right === (p.d >= 0.6 ? 'long' : 'short'),
    so5: p => p.right === p.k && (p.k === 'pitch' ? p.a.p !== p.b.p && p.a.d === p.b.d && p.a.v === p.b.v : p.k === 'len' ? p.a.d !== p.b.d && p.a.p === p.b.p && p.a.v === p.b.v : p.a.v !== p.b.v && p.a.p === p.b.p && p.a.d === p.b.d),
    ga2: p => p.right === p.ps[p.q],
    ga3: p => p.opts[p.right] === p.ps && p.opts.length === 1 + p.alt.length,
    ak2: p => p.right === (p.twist ? [3, 2, 0, -2].indexOf(p.pos) : p.pos % 2 === 0 ? 0 : 1),
  };
  // 섞어도 단계마다 같은 문항 묶음인지 견주는 열쇠(뒤집기는 같은 문항으로 봄)
  const NORM = {
    so3: p => `${p.stage}:${p.inst}:${p.p}`,
    so5: p => `${p.k}:${p.inst}:${[JSON.stringify(p.a), JSON.stringify(p.b)].sort().join('|')}`,
    ga2: p => `${p.ps.join(',')}:${p.q}:${p.inst}`,
    ga3: p => `${p.ps.join(',')}:${p.inst}`,
    ak2: p => `${p.pos}:${p.twist}`,
  };
  const allLate = Array(12).fill(null);
  for (const [id, mod] of Object.entries(M)) {
    const { PLAN, CUTS, SHUF } = mod;
    assert.ok(PLAN.every(p => STAGES.includes(p.stage)), id + ' 줄마다 단계 꼬리표');
    assert.deepEqual(PLAN.map(p => STAGES.indexOf(p.stage)), PLAN.map(p => STAGES.indexOf(p.stage)).slice().sort((a, b) => a - b), id + ' 단계는 소개 → 발전 → 비틀기 → 마무리 차례');
    assert.deepEqual(CUTS, K.stageCuts(PLAN), id + ' CUTS = 표의 단계 경계');
    const make = sd => { const r = K.rng(K.seedOf('t', sd)), plan = K.stageShuffle(PLAN, CUTS, r, SHUF); return mod.arrange ? mod.arrange(plan, r) : plan; };
    if (id !== 'ga3') assert.ok(PLAN.every(RIGHT[id]), id + ' 원판 답이 문항 내용과 맞음');
    if (SHUF.flip) assert.ok(PLAN.every(p => RIGHT[id](SHUF.flip(p))), id + ' 뒤집은 문항도 답이 내용과 맞음');
    const tl = mod.tipOf(id === 'ga3' ? make(1) : PLAN, allLate.slice(0, PLAN.length), allLate);
    assert.ok(!/헷갈렸어요|더 많이|고른 적이/.test(tl) && tl.includes(`시간이 지난 판이 ${PLAN.length}번`), id + ' 모두 시간 지남 → 갈래 말 X: ' + tl);
    const bounds = [0, ...CUTS, PLAN.length];
    const vals = [...new Set(PLAN.flatMap((p, k) => OPTS[id](id === 'ga3' ? { opts: [p.ps, ...p.alt] } : p, k)))];
    // 단계 꼴 봇 — 원판 단계마다 가장 흔한 답만 누름
    const common = {};
    for (const st of STAGES) { const a = PLAN.filter(p => p.stage === st).map(p => p.right); common[st] = a.sort((x, y) => a.filter(z => z === y).length - a.filter(z => z === x).length)[0]; }
    const bots = [['단계 꼴', (k, p) => common[p.stage]], ...vals.map(v => [`늘 ${v}`, () => v])];
    for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) bots.push([`번갈아 ${vals[a]}/${vals[b]}`, k => (k % 2 ? vals[b] : vals[a])], [`번갈아 ${vals[b]}/${vals[a]}`, k => (k % 2 ? vals[a] : vals[b])]);
    const rr = K.rng(99);
    bots.push(['찍기', (k, p, o) => o[Math.floor(rr() * o.length)]]);
    const got = new Map(bots.map(([n]) => [n, 0]));
    let same = 0, alt = 0, origin = 0;
    for (let sd = 1; sd <= 1000; sd++) {
      const plan = make(sd);
      assert.equal(plan.length, PLAN.length, id + ' 판 수 그대로');
      if (plan.every((p, k) => NORM[id](p) === NORM[id](PLAN[k]) && p.right === PLAN[k].right)) origin++;
      for (let b = 0; b + 1 < bounds.length; b++) assert.deepEqual(plan.slice(bounds[b], bounds[b + 1]).map(NORM[id]).sort(), PLAN.slice(bounds[b], bounds[b + 1]).map(NORM[id]).sort(), `${id} 씨앗 ${sd} ${b + 1}단계 문항 묶음`);
      assert.ok(plan.every(RIGHT[id]), `${id} 씨앗 ${sd} 답이 문항 내용과 맞음`);
      if (SHUF.answerOf) {
        const a = plan.map(SHUF.answerOf);
        for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) same++;
        if (a[0] === a[2] && a[1] === a[3] && a[0] !== a[1]) alt++;
      }
      if (id === 'so3') assert.deepEqual(['long', 'short'].map(v => plan.filter(p => p.right === v).length), [6, 6], `so3 씨앗 ${sd} 긴 6 · 짧은 6(기차 자리)`);
      if (sd === 1) assert.deepEqual(make(1), plan, id + ' 같은 씨앗이면 같은 판');
      const chance = mod.GUESS(plan);
      for (const [name, bot] of bots) {
        const res = plan.map((p, k) => { const o = OPTS[id](p, k), v = bot(k, p, o); return o.includes(v) ? v === p.right : null; });
        if (K.scoreChoices(res, 5, { chance }).stars > 0) got.set(name, got.get(name) + 1);
      }
    }
    assert.equal(same, 0, `${id} 같은 답 세 번 연속`);
    assert.equal(alt, 0, `${id} 처음 네 판 번갈아`);
    assert.ok(origin < 50, `${id} 원판 차례 그대로인 씨앗 ${origin}`);
    if (process.env.X2LOG) console.log(id, { origin, floor: K.minKeepP(mod.GUESS(make(1))) }, [...got].map(([n, v]) => `${n} ${v / 10}%`).join(" · "));   // X2LOG=1 node tests/cells.test.mjs → 봇마다 별 비율
    for (const [name, n] of got) assert.ok(n / 1000 < 0.10, `${id} ${name} 봇 별 비율 ${n / 10}%`);
    // 완벽하게 맞히면 별 셋
    assert.equal(K.scoreChoices(PLAN.map(() => true), 5, { chance: mod.GUESS(make(1)) }).stars, 3, id + ' 다 맞히면 별 셋');
  }
  // 가2 — '늘 라'가 7판을 맞혀도 별 X(찍기 바닥 = 단계마다 가장 흔한 답의 몫)
  assert.ok(K.minKeepP(M.ga2.GUESS(M.ga2.PLAN)) > M.ga2.PLAN.filter(p => p.right === 69).length, '가2 바닥 > 늘 라 맞힌 수');
  delete globalThis.localStorage;
}
// ── 소리는 TV 하나 · 답은 각자(X2 둘째 커밋) — TVS 칸 일곱의 시간표 · 답 글자(소리 · 화면 없이 표만) ──
{
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const K = await import('../app/js/cellkit.js'), TV = await import('../app/js/cells/_tvs.js');
  const fakeH = (tag, attrs, ...kids) => ({ tag, attrs, kids, nodeType: 1, cloneNode() { return this; } });
  const kit = { h: fakeH, band: 'mid', stageShuffle: K.stageShuffle, rng: K.rng, engine: null, playSeq: () => ({}), friendImg: () => fakeH('img'), setPose: () => {} };
  const num = (x, row) => (typeof x === 'function' ? x(row) : x);
  for (const id of ['so3', 'so4', 'so5', 'sem1', 'ga1', 'ga2', 'ga3']) {
    const mod = await import(`../app/js/cells/${id}.js`);
    assert.equal(mod.TVS, true, id + ' TVS = true');
    const S = mod.tvsSpec({ tell() {}, say() {} }, kit);
    const keys = S.items.map(it => it.key), codes = S.items.map((it, j) => it.code || 'ABCD'[j]);
    assert.equal(new Set(codes).size, codes.length, id + ' 답 글자가 겹치지 않음');
    assert.ok(codes.every(c => /^[A-Za-z0-9.]$/.test(c) && c !== 'x'), id + ' 답 글자 = DB 규칙 한 글자(x = 못 고름)');
    let longest = 0;
    for (let sd = 1; sd <= 300; sd++) {
      const plan = S.plan(sd);
      if (sd === 1) assert.deepEqual(S.plan(1), plan, id + ' 같은 씨앗이면 같은 판(TV · 아이 기기)');
      for (const row of plan) {
        const o = num(S.OPEN, row), c = num(S.CLOSE, row), P = num(S.P, row);
        assert.ok(o >= 300 && c - o >= 2999 && P - c >= 400, `${id} 판 시간(열림 ${o} · 닫힘 ${c} · 판 ${P})`);
        const r = S.rightOf(row);
        if (S.seq) assert.ok(Array.isArray(r) && r.every(k => keys.includes(k)), id + ' 답 = 단추 차례');
        else assert.ok(keys.includes(r), `${id} 답 ${r}이 단추에 있음`);
        // 답 열림이 답에 따라 달라지면 소리 없는 아이 기기 화면으로 답이 샘 — 뒤집은 문항(답만 다름)도 같은 때에 열려야
        if (mod.SHUF && mod.SHUF.flip) assert.equal(num(S.OPEN, mod.SHUF.flip(row)), o, `${id} 뒤집어도 답 열림이 같음`);
      }
      longest = Math.max(longest, TV.tvsTimes(plan, S.P)[plan.length]);
    }
    if (id === 'so3' || id === 'so5') assert.equal(new Set(mod.PLAN.map(row => num(S.OPEN, row))).size, 1, id + ' 답 열림은 판마다 같음(길이가 새지 않게)');
    assert.ok(longest <= 100000, `${id} TV 소리 모드 한 판 ${Math.round(longest / 1000)}초(100초 안)`);
  }
  // 가1 메아리 답 글자 — 두 음 · 세 음 차례가 모두 다른 한 글자
  const g1 = await import('../app/js/cells/ga1.js'), S1 = g1.tvsSpec({}, kit);
  const seqs = [];
  for (const n of [2, 3]) for (let b = 0; b < 1 << n; b++) seqs.push(Array.from({ length: n }, (_, j) => (b >> j & 1 ? 67 : 64)));
  assert.equal(new Set(seqs.map(S1.seq.code)).size, seqs.length, '가1 메아리 차례마다 다른 글자');
  assert.ok(seqs.every(q => /^[0-9a-f]$/.test(S1.seq.code(q))), '가1 메아리 글자 0~f');
  assert.ok(!(await import('../app/js/cells/ak2.js')).TVS, '악2(오선을 보고 푸는 문제)는 TVS X');
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
console.log(`✓ 칸 지도 시험 통과 — ${CELLS.length}칸 · 첫 판 ${FIRST.length}칸 · 1~2학년 이름 · 쉬운 말 ${EZ.length} · 성취기준 · 결과 기록 · 사실만 말하는 결과(N1) · 찍기 바닥 · 단계 안 섞기(N2) · 고르기 다섯 칸 문항 표(X2) · TV 소리 모드 일곱 칸 · 장1 장단 표기`);
