// 개념 칸 지도 시험 — 먼저 필요한 칸이 모두 있는지 · 고리(순환) 없음 · 만든 칸(first) · 추천 차례가 앞 칸을 지키는지
//  칸 목록은 손으로 적지 않는다 — 장부(engine/cells.js)의 first · frame과 칸 모듈이 내보내는 것(TVS · NEAR …)에서 읽음(11-14)
import assert from 'node:assert/strict';
import { CELLS, LANES, FIRST, ORDER, ORDER_ALL, cellById, nextCell, missingPre, passed, cellName, easyText, EASY_WORDS, stdText, PLAY_STD, PLAY_CARD } from '../engine/cells.js';

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
assert.ok(FIRST.length >= 21, '만든 칸 수(first) — 11-14 첫 판 21칸에서 더해 감');
assert.deepEqual([...ORDER].sort(), [...FIRST].sort(), '추천 차례 = 첫 판 칸 모두(새 칸은 ORDER_ALL에 자리가 있어야 함)');
assert.equal(new Set(ORDER_ALL).size, ORDER_ALL.length, 'ORDER_ALL 겹침');
for (const id of ORDER_ALL) assert.ok(cellById(id), 'ORDER_ALL에 장부에 없는 칸 ' + id);
// 장부 줄의 frame · kinds 꼴(frame은 틀 이름 · kinds는 L D E M만)
for (const c of CELLS) {
  if (c.frame != null) assert.ok(['pick', 'snd', 'mel', 'beat', 'own'].includes(c.frame), c.id + ' frame ' + c.frame);
  if (c.kinds != null) assert.ok(typeof c.kinds === 'string' && /^[LDEM]*$/.test(c.kinds), c.id + ' kinds ' + c.kinds);
}
// 활동 깊이 갈래(engine/depth.js) — 만든 칸은 모두 갈래가 정해져 있다: 11-14 표(CELL_KIND)에 있거나 장부 줄에 kinds(새 칸은 장부 줄에만 · 둘 다 X)
{
  const { CELL_KIND } = await import('../engine/depth.js');
  for (const id of FIRST) {
    const inTable = Object.hasOwn(CELL_KIND, id), inRow = cellById(id).kinds != null;
    assert.ok(inTable !== inRow, `${id} 활동 갈래 — 장부 줄의 kinds 하나로 적어요(지금 표 ${inTable} · 장부 ${inRow})`);
  }
  for (const id of Object.keys(CELL_KIND)) assert.ok(FIRST.includes(id), 'CELL_KIND에 만든 칸이 아닌 ' + id);
}
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
// 성취기준 — 만든 칸(first) 모두 · 기호 꼴
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
// ── 나머지 고르기 여섯 칸(X2 · 가4 11-10) — 단계 꼬리표 문항 표 · 단계 안 섞기 · 씨앗 1000개 · 찍기 · 번갈아 · 같은 답 · 단계 꼴 봇 ──
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const K = await import('../app/js/cellkit.js');
  const M = {};
  for (const id of ['so3', 'so5', 'ga2', 'ga3', 'ga4', 'ak2', 'ppa1']) M[id] = await import(`../app/js/cells/${id}.js`);
  const STAGES = ['intro', 'grow', 'twist', 'end'];
  // 판마다 고를 수 있는 답(찍기 봇이 누를 수 있는 것) — 소5는 크기 단추가 비틀기부터 · 가3은 그림 수 · 악2는 비틀기부터 넷
  const OPTS = {
    so3: () => ['long', 'short'],
    so5: (p, k) => (k < M.so5.CUTS[1] ? ['pitch', 'len'] : ['pitch', 'len', 'vol']),
    ga2: () => [69, 67, 64],
    ga3: p => p.opts.map((_, j) => j),
    ga4: p => (p.fmt === 'q' ? [0, 1, 2] : [0, 1]),
    ak2: p => (p.twist ? [0, 1, 2, 3] : [0, 1]),
    ppa1: (p, k) => (k < M.ppa1.CUTS[0] ? ['slow', 'fast'] : ['slow', 'mid', 'fast']),
  };
  // 줄의 답이 문항 내용과 맞는지(표 하나가 정본 — 뒤집어도 맞아야 함)
  const RIGHT = {
    so3: p => p.right === (p.d >= 0.6 ? 'long' : 'short'),
    so5: p => p.right === p.k && (p.k === 'pitch' ? p.a.p !== p.b.p && p.a.d === p.b.d && p.a.v === p.b.v : p.k === 'len' ? p.a.d !== p.b.d && p.a.p === p.b.p && p.a.v === p.b.v : p.a.v !== p.b.v && p.a.p === p.b.p && p.a.d === p.b.d),
    ga2: p => p.right === p.ps[p.q],
    ga3: p => p.opts[p.right] === p.ps && p.opts.length === 1 + p.alt.length,
    // 가4 — ? 판: 답 자리 = 미 · 레 · 도 중 ? 자리 음 / 그림 판: 들려줄 가락과 다른 그림이 차례가기 · 뛰어가기 하나씩 · 높낮이 모양 같음 · (섞은 뒤) 답 자리 = 들려줄 그림
    ga4: p => (p.fmt === 'q' ? p.right === [64, 62, 60].indexOf(p.ps[p.q])
      : M.ga4.kindOf(p.ps) === p.kind && [p.kind, M.ga4.kindOf(p.alt)].sort().join() === 'skip,step' && p.ps.length === p.alt.length
        && p.ps.every((x, j) => !j || Math.sign(x - p.ps[j - 1]) === Math.sign(p.alt[j] - p.alt[j - 1])) && (!p.opts || (p.opts[p.right] === p.ps && p.opts.length === 2))),
    ak2: p => p.right === (p.twist ? [3, 2, 0, -2].indexOf(p.pos) : p.pos % 2 === 0 ? 0 : 1),
    // 빠1 — 답 = 박 빠르기 · 헷갈림 거리는 뒤집어도 헷갈림 거리(촘촘한 음 = 늘 느린 박 · 긴 음 = 늘 빠른 박 · 센 = 느리게 · 여린 = 빠르게 · 높이 판 = 보통)
    ppa1: p => p.right === p.t && M.ppa1.clipOf(p).steps.length === { slow: 4, mid: 6, fast: 9 }[p.t]
      && ({ cmp: p.t !== 'mid' && p.mel === 'plain', plain: p.mel === 'plain', theme: p.t === 'mid' && p.mel === 'theme',
        dens: (p.t === 'slow' && p.mel === 'dense') || (p.t === 'fast' && p.mel === 'long'), dyn: (p.t === 'slow' && p.vel > 0.7) || (p.t === 'fast' && p.vel < 0.3),
        high: p.t === 'mid' && Math.abs(p.shift) === 12 })[p.kind],
  };
  // 섞어도 단계마다 같은 문항 묶음인지 견주는 열쇠(뒤집기는 같은 문항으로 봄)
  const NORM = {
    so3: p => `${p.stage}:${p.inst}:${p.p}`,
    so5: p => `${p.k}:${p.inst}:${[JSON.stringify(p.a), JSON.stringify(p.b)].sort().join('|')}`,
    ga2: p => `${p.ps.join(',')}:${p.q}:${p.inst}`,
    ga3: p => `${p.ps.join(',')}:${p.inst}`,
    ga4: p => (p.fmt === 'q' ? `q:${p.ps.join(',')}:${p.q}:${p.inst}` : `pic:${[p.ps.join(','), p.alt.join(',')].sort().join('|')}:${p.inst}`),
    ak2: p => `${p.pos}:${p.twist}`,
    ppa1: p => `${p.stage}:${p.kind}:${p.inst}:${p.acc}`,
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
    // 가2 화면 틈 봇(11-10) — 화면에 안 보이는 음을 고름(하나면 그것 · 둘이면 그중 하나 · 다 보이면 아무거나)
    if (id === 'ga2') bots.push(['안 보이는 음', (k, p, o) => { const shown = p.ps.filter((_, j) => j !== p.q), miss = o.filter(v => !shown.includes(v)), from = miss.length ? miss : o; return from[Math.floor(rr() * from.length)]; }]);
    // 가4 화면 틈 봇(11-10) — ? 판: 안 보이는 음 · 사이 음(양옆 두 음 사이에 끼는 음) / 그림 판: 레가 든 그림 · 차례가기 그림 · 뛰어가기 그림 · 높낮이 모양(오르내림만 듣고 같은 모양 그림)
    //  ? 판 넷은 화면이 같은 짝 둘(도-?-미 · 미-?-도)이라 보이는 것만으로는 둘까지 · 그림 판은 두 그림 모양이 같고 들려줄 쪽 · 자리를 씨앗이 정해 반반
    if (id === 'ga4') {
      const QK = [64, 62, 60], any = o => o[Math.floor(rr() * o.length)];
      const shape = ps => ps.slice(1).map((x, j) => Math.sign(x - ps[j])).join();
      const picBy = (p, o, f) => { const hit = o.filter(j => f(p.opts[j])); return any(hit.length && hit.length < o.length ? hit : o); };
      bots.push(
        ['안 보이는 음', (k, p, o) => { if (p.fmt !== 'q') return any(o); const shown = p.ps.filter((_, j) => j !== p.q), miss = o.filter(v => !shown.includes(QK[v])); return any(miss.length ? miss : o); }],
        ['사이 음', (k, p, o) => { if (p.fmt !== 'q') return any(o); const a = p.ps[p.q - 1], b = p.ps[p.q + 1], mid = o.filter(v => a != null && b != null && (QK[v] - a) * (QK[v] - b) < 0); return any(mid.length ? mid : o); }],
        ['레가 든 그림', (k, p, o) => (p.fmt === 'q' ? 1 : picBy(p, o, ps => ps.includes(62)))],
        ['차례가기 그림', (k, p, o) => (p.fmt === 'q' ? 1 : picBy(p, o, ps => M.ga4.kindOf(ps) === 'step'))],
        ['뛰어가기 그림', (k, p, o) => (p.fmt === 'q' ? any(o) : picBy(p, o, ps => M.ga4.kindOf(ps) === 'skip'))],
        ['높낮이 모양', (k, p, o) => (p.fmt === 'q' ? 1 : picBy(p, o, ps => shape(ps) === shape(p.ps)))],
      );
    }
    // 빠1 화면 틈 봇(11-10) — 소리를 끄고 '잘 들어요'가 얼마나 오래 가는지(답 열림) · 소리 길이만 봄: 길면 느리게 · 짧으면 빠르게 · 같으면 아무거나
    //  (소리 창이 빠르기와 상관없이 3.6초라 단서가 없어야 함 → 찍기와 같아야)
    if (id === 'ppa1') {
      const md = (k, p) => { const same = PLAN.filter(x => x.stage === p.stage); return [same.map(M.ppa1.openSec), same.map(M.ppa1.soundSec)]; };
      bots.push(['소리 길이', (k, p, o) => { const [opens, lens] = md(k, p), mo = opens.reduce((a, b) => a + b) / opens.length, ml = lens.reduce((a, b) => a + b) / lens.length; const d = (M.ppa1.openSec(p) - mo) + (M.ppa1.soundSec(p) - ml); return d > 1e-6 ? 'slow' : d < -1e-6 ? 'fast' : o[Math.floor(rr() * o.length)]; }]);
    }
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
  // 가4 — ? 판 넷 · 그림 판 여덟 · ? 판은 화면이 같은 짝 둘(소리로만 갈림) · 그림 판 짝은 모두 높낮이 모양이 같음 · 바닥 9/12
  {
    const G = M.ga4, Q = G.PLAN.filter(p => p.fmt === 'q'), P = G.PLAN.filter(p => p.fmt === 'pic');
    assert.deepEqual([Q.length, P.length], [4, 8], '가4 ? 판 넷 · 그림 판 여덟');
    assert.ok(G.PLAN.slice(0, 4).every(p => p.fmt === 'q'), '가4 ? 판은 앞 넷(소개)');
    const screen = p => p.ps.map((x, j) => (j === p.q ? '?' : x)).join();
    const byScreen = {}; for (const p of Q) (byScreen[screen(p)] = byScreen[screen(p)] || new Set()).add(p.right);
    assert.ok(Object.values(byScreen).every(v => v.size === 2), '가4 ? 판 화면마다 답이 둘(화면만으로는 반)');
    assert.equal(Q.filter(p => p.ps.filter((_, j) => j !== p.q).includes(p.ps[p.q])).length, 2, '가4 답 음이 화면에 한 번 더 보이는 ? 판 둘');
    assert.ok(P.every(p => G.kindOf(p.ps) !== 'mix' && G.kindOf(p.alt) !== 'mix'), '가4 그림 판 가락은 차례가기 · 뛰어가기 둘 중 하나로만');
    assert.equal(K.minKeepP(G.GUESS(G.PLAN)), 9, '가4 별 ① 바닥 9/12');
  }
  delete globalThis.localStorage;
}
// ── 리3 8분음표 둘(박 칸 · 11-10) — 단계 꼬리표 문항 표 · 단계 안 섞기 · 씨앗 1000개 · 두드림 봇(찍기 · 같은 답 · 번갈아 · 단계 꼴 · 화면 틈) ──
//  봇 = 판마다 '칠 리듬' 하나를 정해 그 소리 자리에 딱 맞춰 두드림 → 맞는 리듬이 아니면 그 판은 틀림. 별은 박 칸 규칙(① 절반 넘게 ② 5번 이어서 ③ 모두)
{
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const K = await import('../app/js/cellkit.js'), R3 = await import('../app/js/cells/ri3.js');
  const { PLAN, CUTS, SHUF } = R3, STAGES = ['intro', 'grow', 'twist', 'end'];
  assert.ok(PLAN.every(p => STAGES.includes(p.stage)), '리3 줄마다 단계 꼬리표');
  assert.deepEqual(PLAN.map(p => STAGES.indexOf(p.stage)), PLAN.map(p => STAGES.indexOf(p.stage)).slice().sort((a, b) => a - b), '리3 단계 차례');
  assert.deepEqual(CUTS, K.stageCuts(PLAN), '리3 CUTS = 표의 단계 경계');
  assert.ok(PLAN.length >= 10 && PLAN.length <= 12, '리3 판 수 10~12');
  // 그림 판 = 소개 · 발전(섞어도 'n번째 판부터 그림 없이'가 맞게) · 듣기만 판이 절반 넘게 — 악보만 읽고 치는 길로는 별 X
  assert.ok(PLAN.every((p, k) => !!p.hidden === (k >= CUTS[1])), '리3 그림 판 = 소개 · 발전 단계');
  assert.ok(PLAN.filter(p => !p.hidden).length * 2 < PLAN.length && PLAN.filter(p => !p.hidden).length < 5, '리3 그림 판 < 절반 · < 5(별 ② 이어서 5번)');
  // 비틀기 = 앞 칸 헷갈림 거리(리2 쉼 · 길게 이어지는 소리) · 마무리 = 소개 리듬 그대로 빨라짐
  const tw = PLAN.filter(p => p.stage === 'twist');
  assert.ok(tw.some(p => p.pat.includes('qr')) && tw.some(p => p.pat.includes('h')), '리3 비틀기에 쉼 · 길게 이어지는 소리');
  for (const p of PLAN.filter(q => q.fast)) assert.ok(PLAN.some(q => !q.fast && !q.hidden && q.pat.join() === p.pat.join()), '리3 빨라진 판은 그림 판 리듬 그대로: ' + p.pat.join(' '));
  const H = 340, S = Array.from({ length: 8 }, (_, i) => i * H);
  const tapsOf = bp => R3.slotsOf(bp).map((s, j) => (s.kind === 'hit' ? S[j] : null)).filter(x => x != null);
  const okWith = (row, bp) => R3.judgeBar(row.pat, S, tapsOf(bp), { halfMs: H }).ok;
  const common = {};
  for (const st of STAGES) { const a = PLAN.filter(p => p.stage === st).map(p => p.pat.join(' ')); common[st] = a.slice().sort((x, y) => a.filter(z => z === y).length - a.filter(z => z === x).length)[0].split(' '); }
  const rr = K.rng(11), KINDS = ['q', 'ee', 'qr'];
  const bots = [
    ['찍기', () => [0, 1, 2, 3].map(() => KINDS[Math.floor(rr() * 3)])],
    ['늘 한 번(박마다 반짝만 보고)', () => ['q', 'q', 'q', 'q']],
    ['늘 두 번(반 박마다)', () => ['ee', 'ee', 'ee', 'ee']],
    ['번갈아 따/띠띠', () => ['q', 'ee', 'q', 'ee']],
    ['번갈아 띠띠/따', () => ['ee', 'q', 'ee', 'q']],
    ['판마다 번갈아 따 넷/띠띠 넷', (p, k) => (k % 2 ? ['ee', 'ee', 'ee', 'ee'] : ['q', 'q', 'q', 'q'])],
    ['단계 꼴', p => common[p.stage]],
    ['화면 틈(그림 판은 악보대로 · 그림 없는 판은 박마다 반짝만 보고)', p => (p.hidden ? ['q', 'q', 'q', 'q'] : p.pat)],
  ];
  const got = new Map(bots.map(([n]) => [n, 0]));
  const bounds = [0, ...CUTS, PLAN.length];
  let origin = 0;
  for (let sd = 1; sd <= 1000; sd++) {
    const plan = K.stageShuffle(PLAN, CUTS, K.rng(K.seedOf('t', sd)), SHUF);
    assert.equal(plan.length, PLAN.length);
    for (let b = 0; b + 1 < bounds.length; b++) assert.deepEqual(plan.slice(bounds[b], bounds[b + 1]).map(SHUF.answerOf).sort(), PLAN.slice(bounds[b], bounds[b + 1]).map(SHUF.answerOf).sort(), `리3 씨앗 ${sd} ${b + 1}단계 문항 묶음`);
    if (plan.every((p, k) => p === PLAN[k])) origin++;
    if (sd === 1) assert.deepEqual(K.stageShuffle(PLAN, CUTS, K.rng(K.seedOf('t', 1)), SHUF), plan, '리3 같은 씨앗이면 같은 판');
    assert.equal(K.scoreChoices(plan.map(p => okWith(p, p.pat)), 5).stars, 3, '리3 그대로 치면 별 셋');
    for (const [name, bot] of bots) if (K.scoreChoices(plan.map((p, k) => okWith(p, bot(p, k))), 5).stars > 0) got.set(name, got.get(name) + 1);
  }
  assert.ok(origin < 50, `리3 원판 차례 그대로인 씨앗 ${origin}`);
  if (process.env.X2LOG) console.log('ri3', [...got].map(([n, v]) => `${n} ${v / 10}%`).join(' · '));
  for (const [name, n] of got) assert.ok(n / 1000 < 0.10, `리3 ${name} 봇 별 비율 ${n / 10}%`);
  delete globalThis.localStorage;
}
// ── 만든 칸 모듈 — 장부의 first 칸 가운데 app/js/cells/<id>.js가 있는 것 모두(리1은 징검다리 화면 screens/tap.js라 파일 없음) ──
const { existsSync } = await import('node:fs');
const CELL_FILE = id => new URL(`../app/js/cells/${id}.js`, import.meta.url);
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const MODS = {};
for (const id of FIRST) if (existsSync(CELL_FILE(id))) MODS[id] = await import(CELL_FILE(id).href);
delete globalThis.localStorage;
const ALL_CELLS = Object.keys(MODS);
// 브라우저 시험(CJS)이 장부를 글로 읽는 tests/ledger.cjs가 이 장부와 같게 읽는지
{
  const { createRequire } = await import('node:module');
  const L = createRequire(import.meta.url)('./ledger.cjs');
  assert.deepEqual(L.firstCells(), FIRST, 'tests/ledger.cjs firstCells = FIRST');
  assert.deepEqual(L.builtCells(), ALL_CELLS, 'tests/ledger.cjs builtCells = 칸 파일이 있는 만든 칸');
  for (const c of CELLS) assert.equal(L.frameOf(c.id), c.frame ?? null, c.id + ' tests/ledger.cjs frame');
}
assert.deepEqual(FIRST.filter(id => !MODS[id]), ['ri1'], '칸 파일이 없는 만든 칸은 리1(징검다리 화면)뿐');
for (const id of ALL_CELLS) assert.ok(existsSync(new URL(`../app/css/cells/${id}.css`, import.meta.url)), id + ' — app/css/cells/<id>.css가 없음(비어 있어도 꼭 · 칸 화면이 불러옴)');
// 11-14에 이 시험에 손 목록으로 있던 칸 — 장부에서 읽어도 빠지면 안 됨
for (const id of ['so3', 'so4', 'so5', 'so6', 'sem1', 'ga1', 'ga2', 'ga3', 'ga4', 'ppa1', 'hy1', 'hwa1', 'jd1', 'ak1', 'ak2', 'ri2', 'ri3', 'ri4', 'ri5', 'ri6']) assert.ok(MODS[id], id + ' — 만든 칸 모듈 목록에 있음');
// 공용 고르기 틀 칸(frame: 'pick')은 시험 · TV · 결과가 읽는 것을 모두 내보낸다
for (const c of CELLS.filter(x => x.frame === 'pick')) {
  const m = MODS[c.id];
  assert.ok(m, c.id + ' — frame: pick 칸은 first이고 칸 파일이 있음');
  for (const k of ['TVS', 'NEAR', 'TIPS_TV', 'PLAN', 'CUTS', 'SHUF', 'tipOf', 'tvsSpec']) assert.ok(m[k] != null, `${c.id}(frame: pick)가 ${k}를 내보내지 않음`);
  assert.equal(m.TVS, true, c.id + ' TVS = true');
  assert.equal(typeof m.tipOf, 'function', c.id + ' tipOf');
}
// TV 대본 — 만든 칸은 모두 engine/tvscript.js TV_SCRIPT에 단계 넷의 발문이 있다 · TVS 칸은 방이 열렸을 때 발문(game_tvs)도
{
  const { TV_SCRIPT, TV_STEPS } = await import('../engine/tvscript.js');
  for (const id of FIRST) {
    const sc = TV_SCRIPT[id];
    assert.ok(sc, id + ' — TV 대본(engine/tvscript.js TV_SCRIPT)이 없음');
    for (const st of TV_STEPS) assert.ok(typeof sc[st.key] === 'string' && sc[st.key].length >= 10, `${id} TV 대본 ${st.key}`);
    if (MODS[id]?.TVS) assert.ok(typeof sc.game_tvs === 'string' && sc.game_tvs.length >= 10, id + ' TVS 칸 — TV 대본 game_tvs');
  }
  for (const id of Object.keys(TV_SCRIPT)) assert.ok(cellById(id), 'TV 대본에 장부에 없는 칸 ' + id);
}

// ── 소리는 TV 하나 · 답은 각자(X2 둘째 커밋) — TVS 칸(TVS = true를 내보내는 칸 모두)의 시간표 · 답 글자(소리 · 화면 없이 표만) ──
{
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const K = await import('../app/js/cellkit.js'), TV = await import('../app/js/cells/_tvs.js');
  const TVS_CELLS = ALL_CELLS.filter(id => MODS[id].TVS === true);
  for (const id of ['so3', 'so4', 'so5', 'so6', 'sem1', 'ga1', 'ga2', 'ga3', 'ga4', 'ppa1', 'hy1', 'hwa1']) assert.ok(TVS_CELLS.includes(id), id + ' — TVS 칸(11-14 손 목록)이 빠짐');
  const fakeH = (tag, attrs, ...kids) => ({ tag, attrs, kids, nodeType: 1, cloneNode() { return this; } });
  const kit = { h: fakeH, band: 'mid', stageShuffle: K.stageShuffle, rng: K.rng, engine: null, playSeq: () => ({}), friendImg: () => fakeH('img'), setPose: () => {} };
  const num = (x, row) => (typeof x === 'function' ? x(row) : x);
  for (const id of TVS_CELLS) {
    const mod = MODS[id];
    assert.equal(mod.TVS, true, id + ' TVS = true');
    assert.equal(typeof mod.tvsSpec, 'function', id + ' TVS 칸은 tvsSpec');
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
// ── 빠1 느리게·보통·빠르게(11-10) — 박 빠르기 · 화면 틈 · 차례 ──
{
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const K = await import('../app/js/cellkit.js'), P = await import('../app/js/cells/ppa1.js');
  assert.deepEqual(cellById('ppa1').pre, ['ri1'], '빠1은 일정박(리1) 뒤 — 빠르기 = 박의 빠르기');
  assert.ok(ORDER.indexOf('ri1') < ORDER.indexOf('ppa1') && ORDER.indexOf('sem1') < ORDER.indexOf('ppa1'), '추천 차례 셈1 → 리1 → 빠1');
  // 빠르기 셋 = 박 0.9 · 0.6 · 0.4초(1.5배씩) · 같은 시간(3.6초) 안 박 4 · 6 · 9번
  assert.deepEqual(['slow', 'mid', 'fast'].map(t => P.clip(t).steps.length), [4, 6, 9]);
  assert.ok(Math.abs(P.BEAT.slow / P.BEAT.mid - 1.5) < 1e-9 && Math.abs(P.BEAT.mid / P.BEAT.fast - 1.5) < 1e-9, '빠르기 칸마다 1.5배');
  // 화면 틈: 한 단계 안에서는 소리 길이 · 답 열림이 빠르기(답)와 상관없이 같음 — 뒤집은 문항도
  for (const st of ['intro', 'grow', 'twist', 'end']) {
    const rows = P.PLAN.filter(p => p.stage === st).flatMap(p => [p, P.flip(p)]);
    assert.equal(new Set(rows.map(P.soundSec)).size, 1, st + ' 소리 길이가 답마다 다름');
    assert.equal(new Set(rows.map(P.openSec)).size, 1, st + ' 답 열림이 답마다 다름');
  }
  // 음이 창 밖으로 넘치지 않음 · 높이는 C4~C6(높이 판만 한 옥타브 아래 E3까지) · 박이 창 처음에 하나
  for (const p of P.PLAN.flatMap(x => [x, P.flip(x)])) {
    const c = P.clipOf(p);
    assert.ok(c.notes.every(n => n.at + n.d <= c.win + 1e-9 && n.p >= (p.kind === 'high' ? 52 : 60) && n.p <= 84), p.kind + ' 음 자리');
    assert.equal(c.steps[0], 0);
  }
  // 촘촘함 판 — 느린 박 위 음이 박보다 많고(4배) · 빠른 박 위 음이 박보다 적음(음 수로 고르는 아이는 틀림)
  const dense = P.clipOf({ ...P.PLAN.find(p => p.mel === 'dense') }), long = P.clipOf(P.flip(P.PLAN.find(p => p.mel === 'dense')));
  assert.ok(dense.notes.length === dense.steps.length * 4 && long.notes.length < long.steps.length / 2, '촘촘함 판 음 수');
  // 음 촘촘함 봇(오개념 '음이 많으면 빠르게') — 별 셋은 못 받음 · 결과 한 줄에 '음 수'
  {
    const rate = p => P.clipOf(p).notes.length / P.WIN, plan = K.stageShuffle(P.PLAN, P.CUTS, K.rng(3), P.SHUF);
    const res = plan.map((p, k) => { const r = rate(p), g = r > 2.1 ? 'fast' : r < 1.3 ? 'slow' : 'mid'; return (k < P.CUTS[0] && g === 'mid' ? 'slow' : g) === p.right; });
    assert.ok(res.filter(x => !x).length >= 2 && !K.scoreChoices(res, 5, { chance: P.GUESS(plan) }).starOn[2], '음 촘촘함 봇은 별 셋 X');
    const three = plan.map(p => p.stage !== 'twist');
    assert.match(P.tipOf(plan, three, plan.map(p => p.right)), /음 수 · 세기 · 높이에 속은 적이 있어요/, '비틀기 넷을 다 틀리면 헷갈림 거리 한 줄');
  }
  // TV 소리 모드 한 판 길이(가장 느린 판에 맞춘 시간표)
  const S = P.tvsSpec({ tell() {}, say() {} }, { h: () => ({}), band: 'mid', stageShuffle: K.stageShuffle, rng: K.rng });
  const total = P.PLAN.reduce((a, r) => a + S.P(r), 0);
  assert.ok(total <= 90000, `빠1 TV 소리 모드 ${Math.round(total / 1000)}초`);
  console.log(`✓ 빠1 — 박 4 · 6 · 9 · 단계마다 소리 길이 · 답 열림 같음 · TV 소리 모드 ${Math.round(total / 1000)}초 · 찍기 바닥 ${K.minKeepP(P.GUESS(P.PLAN))}/12`);
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

// ── 틀린 갈래 차례 · 별 0 이어짐 · 헷갈리는 두 소리(11-13 · X6 둘째 · X11) ──
{
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const K = await import('../app/js/cellkit.js');
  // 별 0이 이어진 수 — 기록 끝(가장 새 줄)에서부터 · since보다 앞선 줄에서 멈춤
  assert.equal(K.zeroRun(undefined), 0); assert.equal(K.zeroRun([]), 0);
  assert.equal(K.zeroRun([{ s: 0, at: 5 }, { s: 2, at: 6 }]), 0, '가장 새 줄이 별 0이 아니면 0');
  assert.equal(K.zeroRun([{ s: 3, at: 1 }, { s: 0, at: 2 }, { s: 0, at: 3 }]), 2);
  assert.equal(K.zeroRun([{ s: 0, at: 1 }, { s: 0, at: 2 }, { s: 0, at: 3 }], 2), 2, 'since 앞 줄은 세지 않음(오늘 것만)');
  assert.equal(K.zeroRun([{ s: 0 }, { s: 0 }], 10), 0, '때가 없는 옛 줄은 since가 있으면 세지 않음');
  assert.equal(K.zeroRun([{ s: 0 }, { s: 0 }]), 2, 'since가 없으면 옛 줄도 셈(기록 화면)');
  // 갈래 차례(tipPick) — factTip이 갈래 말을 했을 때만 그 차례 · 아니면 -1
  K.factTip([true, true], [{ n: 0, text: 'a' }], '완벽'); assert.deepEqual({ ...K.tipPick }, { b: -1, n: 1 });
  K.factTip([false, false, false, true], [{ n: 0, text: 'a' }, { n: 3, text: 'b' }], '완벽'); assert.deepEqual({ ...K.tipPick }, { b: 1, n: 2 });
  K.factTip([false, false, true, true], [{ n: 2, text: 'a' }], '완벽'); assert.equal(K.tipPick.b, -1, '틀린 판 셋 미만이면 갈래 X');
  K.factTip([false, false, false, false, false, false], [{ n: 3, text: 'a' }], '완벽'); assert.equal(K.tipPick.b, -1, '갈래가 2/3를 못 넘으면 X');
  // 칸마다 TIPS_TV(TV 막대 이름) — 열 개 안(t 첫 글자 0~9) · 짧게 · factTip을 쓰는 칸은 갈래 수와 같아야(차례가 밀리면 TV가 다른 이름을 그림)
  const ALL = ALL_CELLS, M = MODS;
  let viaTip = 0;
  for (const id of ALL) {
    const T = M[id].TIPS_TV;
    assert.ok(Array.isArray(T) && T.length >= 1 && T.length <= 10, id + ' TIPS_TV 1~10개');
    assert.ok(T.every(x => typeof x === 'string' && x.length >= 2 && x.length <= 20) && new Set(T).size === T.length, id + ' TIPS_TV 짧고 서로 다른 이름: ' + T.join(' | '));
    assert.ok(!T.some(x => /소개|발전|비틀기|마무리|intro|grow|twist/.test(x)), id + ' TV 막대에 단계 이름(속말) X');
    if (!M[id].tipOf || !M[id].PLAN) continue;
    const mod = M[id], r = K.rng(K.seedOf('t', 1));
    const plan = mod.CUTS && mod.SHUF ? (p => (mod.arrange ? mod.arrange(p, r) : p))(K.stageShuffle(mod.PLAN, mod.CUTS, r, mod.SHUF)) : mod.PLAN;
    K.tipPick.n = -1;
    mod.tipOf(plan, Array(40).fill(false), []);
    if (K.tipPick.n < 0) continue;                  // 제 손으로 갈래를 고르는 칸(kit.finish({ b }))
    assert.equal(K.tipPick.n, T.length, `${id} TIPS_TV ${T.length}개 = tipOf 갈래 ${K.tipPick.n}개`);
    viaTip++;
  }
  assert.ok(viaTip >= 9, 'factTip 갈래 수를 견준 칸 ' + viaTip);
  // 헷갈리는 두 소리(NEAR) — NEAR를 내보내는 칸(듣는 칸) 모두 · 꼭 둘 · 받은 소리 길(out)로만 틀고(멈출 수 있게) 끝날 때까지 초를 돌려줌
  const calls = [], OUT = { bus: 1 };
  const eng = { ctx: { currentTime: 2 }, ensure() { return this.ctx; },
    note: (inst, p, t, d, vel, out) => calls.push({ k: 'n', inst, p, t, d, vel, out }),
    drum: (kind, t, vel, out) => calls.push({ k: 'd', kind, t, vel, out }) };
  const run = it => { calls.length = 0; const sec = it.play({ engine: eng }, OUT); return { sec, c: calls.map(x => ({ ...x })) }; };
  const HEAR = ALL.filter(id => M[id].NEAR != null);
  for (const id of ['so3', 'so4', 'so5', 'so6', 'sem1', 'ga1', 'ga2', 'ga3', 'ga4', 'ppa1', 'hy1', 'hwa1', 'jd1']) assert.ok(HEAR.includes(id), id + ' — NEAR 칸(11-14 손 목록)이 빠짐');
  for (const id of ALL.filter(x => M[x].TVS)) assert.ok(HEAR.includes(id), id + ' — TV 소리 모드 칸(듣고 고르기)은 NEAR가 있어야 함');
  const R = {};
  for (const id of HEAR) {
    const N = M[id].NEAR;
    assert.ok(Array.isArray(N) && N.length === 2, id + ' NEAR = 둘');
    assert.notEqual(N[0].label, N[1].label, id + ' 두 이름이 다름');
    R[id] = N.map(it => {
      assert.ok(typeof it.label === 'string' && it.label.length >= 2 && it.label.length <= 16, id + ' 이름: ' + it.label);
      assert.ok(it.low == null || (typeof it.low === 'string' && it.low.length <= 16), id + ' 1~2학년 이름');
      const x = run(it);
      assert.ok(x.sec >= 0.5 && x.sec <= 6, `${id} ${it.label} ${x.sec}초(0.5~6초)`);
      assert.ok(x.c.length >= 1 && x.c.every(c => c.out === OUT), id + ' 소리는 모두 받은 소리 길로');
      assert.ok(x.c.every(c => c.t >= 2 && c.t <= 2 + x.sec && (c.k === 'd' || (c.d > 0 && c.vel > 0 && c.vel <= 1))), id + ' 음 때 · 길이 · 세기');
      return x;
    });
    assert.notEqual(JSON.stringify(R[id][0].c), JSON.stringify(R[id][1].c), id + ' 두 소리가 서로 다름');
  }
  for (const id of ['ak1', 'ak2', 'ri2', 'ri3', 'ri4', 'ri5', 'ri6']) assert.ok(!M[id].NEAR, id + '(눈으로 풀거나 치는 칸)에는 NEAR X');
  const notes = x => x.c.filter(c => c.k === 'n'), only = (a, b, key) => ['inst', 'p', 'd', 'vel'].filter(f => a[f] !== b[f]).join() === key;
  // 짝마다 그 칸이 가르치는 한 가지만 다름
  assert.ok(only(notes(R.so3[0])[0], notes(R.so3[1])[0], 'd'), '소3 — 길이만 다름');
  assert.ok(notes(R.so4[0])[1].p > notes(R.so4[0])[0].p && notes(R.so4[1])[1].p < notes(R.so4[1])[0].p, '소4 — 높아짐 · 낮아짐');
  assert.ok(only(notes(R.so5[0])[0], notes(R.so5[0])[1], 'vel') && only(notes(R.so5[1])[0], notes(R.so5[1])[1], 'p'), '소5 — 크기만 · 높이만');
  { const [a, b] = R.sem1.map(notes), avg = (ns, f) => ns.reduce((s, n) => s + n[f], 0) / ns.length;
    assert.ok(avg(a, 'p') > avg(b, 'p') && avg(a, 'vel') < avg(b, 'vel') && a.length === b.length, '셈1 — 높지만 여리게 · 낮지만 세게(같은 가락)'); }
  for (const id of ['ga1', 'ga2', 'ga3', 'ga4']) { const [a, b] = R[id].map(notes); assert.ok(a.length === b.length && a.every((n, j) => n.d === b[j].d && n.inst === b[j].inst) && a.some((n, j) => n.p !== b[j].p), id + ' — 음 높이만 다름'); }
  { const [a, b] = R.ppa1, kicks = x => x.c.filter(c => c.kind === 'kick').length;
    assert.equal(a.sec, b.sec, '빠1 — 두 소리 길이가 같음(길이로 못 고르게)'); assert.ok(kicks(a) < kicks(b), '빠1 — 박 수만 다름(보통 < 빠르게)'); }
  assert.deepEqual(R.jd1.map(x => [...new Set(x.c.map(c => c.kind))].join()), ['deong', 'kung'], '장1 — 덩 · 쿵');
  assert.equal(typeof K.nearSeq([{ p: 60, d: 0.3 }]), 'function');
  delete globalThis.localStorage;
  console.log(`✓ 틀린 갈래 차례 · 별 0 이어짐 · 헷갈리는 두 소리 — TIPS_TV ${ALL.length}칸(갈래 수 견줌 ${viaTip}) · NEAR ${HEAR.length}칸`);
}

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
console.log(`✓ 칸 지도 시험 통과 — ${CELLS.length}칸 · 첫 판 ${FIRST.length}칸 · 1~2학년 이름 · 쉬운 말 ${EZ.length} · 성취기준 · 결과 기록 · 사실만 말하는 결과(N1) · 찍기 바닥 · 단계 안 섞기(N2) · 고르기 일곱 칸 문항 표(X2) · TV 소리 모드 ${ALL_CELLS.filter(id => MODS[id].TVS).length}칸 · TV 대본 ${FIRST.length}칸 · 장1 장단 표기`);
