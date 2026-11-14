// 듣고 고르기 네 칸(소6 · 형1 · 화1 · 셈2 — app/js/cells/_pick.js) — 문항 표가 스스로 한 말을 지키는지(소리 · 화면 없이 표만)
//  ① 줄의 답 = 실제로 나는 소리(뒤집어도) ② 답과 상관없이 소리 길이가 같음(열리는 때로 답이 새지 않음)
//  ③ 듣지 않고 누르는 봇(같은 답 · 번갈아 · 단계 꼴 · 찍기 · 소리 길이)이 별을 못 받음 ④ 같은 답 세 번 연속 X
//  node tests/pick.test.mjs
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const K = await import('../app/js/cellkit.js');
const P = await import('../app/js/cells/_pick.js');
const M = {};
for (const id of ['so6', 'hy1', 'hwa1', 'sem2']) M[id] = await import(`../app/js/cells/${id}.js`);
const STAGES = ['intro', 'grow', 'twist', 'end'];

// TV 표(tvsSpec) — OPEN(row) = 300 + 소리 길이(ms) = 아이 기기에서 답이 열리는 때 · segs(row) = 그 판의 도막들
const kitOf = band => ({ band, stageShuffle: K.stageShuffle, rng: K.rng });
const SPEC = Object.fromEntries(Object.keys(M).map(id => [id, M[id].tvsSpec({ tell() {}, say() {} }, kitOf('mid'))]));

// 도막마다 실제로 나는 음 목록(쉼은 뺌) — 줄마다 처음부터 차례로 · t는 그 도막 처음부터 잰 초
const notesOf = (id, row) => SPEC[id].segs(row).map(sg => sg.lines.flatMap(ln => {
  let t = 0;
  const out = [];
  for (const n of ln) { if (n.p != null) out.push({ inst: n.inst, p: n.p, t: +t.toFixed(4), d: +n.d.toFixed(4), vel: n.vel }); t += n.d + n.gap; }
  return out;
}).sort((a, b) => a.t - b.t || a.p - b.p));
const overlap = ns => ns.some((a, i) => ns.some((b, j) => j > i && b.t < a.t + a.d - 1e-6 && a.t < b.t + b.d - 1e-6));
const seq = ns => ns.map(n => `${n.p}:${n.d}`).join(' ');
const rel = ns => ns.map(n => +(n.t - ns[0].t).toFixed(3));

// ① 답 = 소리
const RIGHT = {
  // 소6 — 같은 악기 ↔ 두 도막의 악기가 같음 · 가락은 같고(더 높게 판만 다섯 음 위) · 세기 판만 세기가 다름
  so6(row, ns) {
    const [a, b] = ns;
    if (ns.length !== 2) return false;
    const ia = new Set(a.map(n => n.inst)), ib = new Set(b.map(n => n.inst));
    if (ia.size !== 1 || ib.size !== 1 || row.a === row.b) return false;
    const same = [...ia][0] === [...ib][0];
    const up = b[0].p - a[0].p, sameTune = a.length === b.length && a.every((n, k) => b[k].p - n.p === up && b[k].d === n.d);
    return same === (row.ans === 'same') && sameTune && up === (row.kind === 'pitch' ? 7 : 0) && (a[0].vel !== b[0].vel) === (row.kind === 'loud');
  },
  // 형1 — 같은 = 높이 · 길이가 모두 같음 / 비슷한 = 끝 음 높이만 다름 / 다른 = 첫 음부터 다름(길이 판은 길이는 같음)
  hy1(row, ns) {
    const [a, b] = ns;
    if (ns.length !== 2) return false;
    const sameLen = a.length === b.length && a.every((n, k) => n.d === b[k].d);
    const diffAt = a.length === b.length ? a.map((n, k) => (n.p === b[k].p ? null : k)).filter(k => k != null) : null;
    if (row.right === 'same') return seq(a) === seq(b) && (row.kind === 'inst') === (a[0].inst !== b[0].inst) && (row.kind === 'loud') === (a[0].vel !== b[0].vel);
    if (row.right === 'near') return sameLen && diffAt.length === 1 && diffAt[0] === a.length - 1 && a[0].inst === b[0].inst;
    return a[0].p !== b[0].p && (row.kind !== 'rhythm' || (sameLen && JSON.stringify(rel(a)) === JSON.stringify(rel(b))));
  },
  // 화1 — 함께 = 어느 때든 두 음이 겹쳐 남 / 하나씩 = 겹치는 음이 없음
  hwa1(row, ns) { return ns.length === 1 && overlap(ns[0]) === (row.ans === 'many'); },
  // 셈2 — 도막 하나 · 악기 하나 · 여덟 음 · 여덟 박. 점점 세게 = 음마다 세기가 오름 / 점점 여리게 = 내림 / 그대로 = 모두 같음(가장 여린 음도 0.25 이상)
  //  꼴: rep 같은 음 · 같은 길이 / tune 높낮이가 오르내림 / slope 높낮이가 한쪽으로 / cross 높낮이가 세기와 거꾸로 / dense 같은 음 · 길이가 줄어듦
  sem2(row, ns) {
    if (ns.length !== 1 || ns[0].length !== 8 || new Set(ns[0].map(n => n.inst)).size !== 1) return false;
    const a = ns[0], step = f => a.slice(1).map((n, k) => Math.sign(f(n) - f(a[k]))), all = (xs, v) => xs.every(x => x === v);
    const vel = step(n => n.vel), pit = step(n => n.p), len = step(n => n.d);
    const total = a[7].t + a[7].d / 0.92, loud = row.right === 'cresc' ? 1 : row.right === 'decresc' ? -1 : 0;
    if (!all(vel, loud) || Math.min(...a.map(n => n.vel)) < 0.25 || Math.abs(total - 8 * P.BEAT) > 1e-3) return false;
    if (loud && a[7].vel / a[0].vel < 2 && a[0].vel / a[7].vel < 2) return false;          // 변하는 판은 처음과 끝이 두 배 이상
    if (row.kind === 'rep') return all(pit, 0) && all(len, 0);
    if (row.kind === 'tune') return all(len, 0) && pit.includes(1) && pit.includes(-1);
    if (row.kind === 'slope') return all(len, 0) && all(pit, row.dir === 'up' ? 1 : -1);
    if (row.kind === 'cross') return all(len, 0) && loud !== 0 && all(pit, -loud);
    return row.kind === 'dense' && all(pit, 0) && len.every(x => x <= 0) && len.includes(-1) && loud === 0;
  },
};
const OPTS = {
  so6: () => ['same', 'diff'],
  hy1: (p, k) => (k < M.hy1.CUTS[0] ? ['same', 'diff'] : ['same', 'near', 'diff']),
  hwa1: () => ['one', 'many'],
  sem2: (p, k) => (k < M.sem2.CUTS[0] ? ['cresc', 'decresc'] : ['cresc', 'decresc', 'same']),
};
// 섞어도 단계마다 같은 문항 묶음인지 견주는 열쇠(뒤집기는 같은 문항으로 봄)
const NORM = {
  so6: p => `${p.kind}:${p.a}:${p.b}`,
  hy1: p => `${p.kind}:${p.a}:${p.b || ''}`,
  hwa1: p => `${p.kind}:${p.m}`,
  sem2: p => `${p.kind}:${p.p || p.m}:${p.dir || ''}:${p.w || p.v || ''}`,
};

for (const [id, mod] of Object.entries(M)) {
  const { PLAN, CUTS, SHUF } = mod, S = SPEC[id], ansOf = SHUF.answerOf;
  assert.equal(PLAN.length, 12, id + ' 12판');
  assert.ok(PLAN.every(p => STAGES.includes(p.stage)), id + ' 줄마다 단계 꼬리표');
  assert.deepEqual(PLAN.map(p => STAGES.indexOf(p.stage)), PLAN.map(p => STAGES.indexOf(p.stage)).slice().sort((a, b) => a - b), id + ' 단계 차례');
  assert.deepEqual(CUTS, K.stageCuts(PLAN), id + ' CUTS = 표의 단계 경계');
  assert.ok(PLAN.every(p => S.rightOf(p) === ansOf(p)), id + ' 답 키 한 가지');
  // ① 원판 · 뒤집은 판 모두 답 = 소리
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) assert.ok(RIGHT[id](q, notesOf(id, q)), `${id} 답이 소리와 맞음: ${JSON.stringify(q)}`);
  // ② 뒤집어도 답이 열리는 때가 같다
  for (const p of PLAN) assert.equal(S.OPEN(p), S.OPEN(SHUF.flip(p)), `${id} 뒤집어도 소리 길이 같음: ${JSON.stringify(p)}`);
  // 답 고르게 — 원판에서 어느 답도 반을 넘지 않음(형1은 셋이라 5판까지)
  const count = v => PLAN.filter(p => ansOf(p) === v).length;
  for (const v of S.items.map(it => it.key)) assert.ok(count(v) >= 3 && count(v) <= 6, `${id} 답 ${v} ${count(v)}판`);
  // 모두 시간 지남 → 갈래 말 X
  const tl = mod.tipOf(PLAN, Array(PLAN.length).fill(null), []);
  assert.ok(!/헷갈렸어요|더 많이|고른 적이/.test(tl) && tl.includes(`시간이 지난 판이 ${PLAN.length}번`), id + ' 모두 시간 지남: ' + tl);

  // ③ 봇
  const chanceOf = plan => S.chance(plan);
  const make = sd => K.stageShuffle(PLAN, CUTS, K.rng(K.seedOf('t', sd)), SHUF);
  const vals = S.items.map(it => it.key), bounds = [0, ...CUTS, PLAN.length];
  const common = {};
  for (const st of STAGES) { const a = PLAN.filter(p => p.stage === st).map(ansOf); common[st] = a.slice().sort((x, y) => a.filter(z => z === y).length - a.filter(z => z === x).length)[0]; }
  const rr = K.rng(99);
  const bots = [['단계 꼴', (k, p) => common[p.stage]], ...vals.map(v => [`늘 ${v}`, () => v]), ['찍기', (k, p, o) => o[Math.floor(rr() * o.length)]]];
  for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) bots.push([`번갈아 ${vals[a]}/${vals[b]}`, k => (k % 2 ? vals[b] : vals[a])], [`번갈아 ${vals[b]}/${vals[a]}`, k => (k % 2 ? vals[a] : vals[b])]);
  // 소리 길이 봇 — 소리를 끄고 답이 열리는 때만 봄: 그 단계의 다른 판보다 길면 첫 답 · 짧으면 끝 답 · 같으면 아무거나
  bots.push(['소리 길이', (k, p, o, plan) => {
    const same = plan.filter(x => x.stage === p.stage).map(S.OPEN), mean = same.reduce((a, b) => a + b) / same.length, d = S.OPEN(p) - mean;
    return d > 1 ? o[o.length - 1] : d < -1 ? o[0] : o[Math.floor(rr() * o.length)];
  }]);
  // 형1 — '비슷한' 단추가 새로 나온 판에 그 단추를 누르는 봇(단추가 나온 까닭을 읽음)
  if (id === 'hy1') bots.push(['새 단추', (k, p, o) => (k >= CUTS[0] ? 'near' : o[Math.floor(rr() * o.length)])]);
  // 셈2 — '그대로' 단추가 나온 뒤로 그 단추만 누르는 봇 · 높낮이만 보는 봇(올라가면 점점 세게 · 내려가면 점점 여리게 · 그 밖에는 아무거나)
  if (id === 'sem2') {
    bots.push(['새 단추', (k, p, o) => (k >= CUTS[0] ? 'same' : o[Math.floor(rr() * o.length)])]);
    bots.push(['높낮이', (k, p, o) => { const ps = notesOf(id, p)[0].map(n => n.p), d = Math.sign(ps[7] - ps[0]); return d > 0 ? 'cresc' : d < 0 ? 'decresc' : o[Math.floor(rr() * o.length)]; }]);
  }
  const got = new Map(bots.map(([n]) => [n, 0]));
  let same = 0, alt = 0, origin = 0;
  for (let sd = 1; sd <= 1000; sd++) {
    const plan = make(sd);
    assert.equal(plan.length, PLAN.length);
    if (plan.every((p, k) => NORM[id](p) === NORM[id](PLAN[k]) && ansOf(p) === ansOf(PLAN[k]))) origin++;
    for (let b = 0; b + 1 < bounds.length; b++) assert.deepEqual(plan.slice(bounds[b], bounds[b + 1]).map(NORM[id]).sort(), PLAN.slice(bounds[b], bounds[b + 1]).map(NORM[id]).sort(), `${id} 씨앗 ${sd} ${b + 1}단계 문항 묶음`);
    const a = plan.map(ansOf);
    for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) same++;
    if (a[0] === a[2] && a[1] === a[3] && a[0] !== a[1]) alt++;
    if (id === 'hy1') assert.ok(plan.slice(0, CUTS[0]).every(p => ansOf(p) !== 'near'), '형1 비슷한 판은 단추가 나온 뒤에만');
    if (id === 'sem2') assert.ok(plan.slice(0, CUTS[0]).every(p => ansOf(p) !== 'same'), '셈2 그대로 판은 단추가 나온 뒤에만');
    if (sd === 1) assert.deepEqual(make(1), plan, id + ' 같은 씨앗이면 같은 판');
    const chance = chanceOf(plan);
    for (const [name, bot] of bots) {
      const res = plan.map((p, k) => { const o = OPTS[id](p, k), v = bot(k, p, o, plan); return o.includes(v) ? v === ansOf(p) : null; });
      if (K.scoreChoices(res, 5, { chance }).stars > 0) got.set(name, got.get(name) + 1);
    }
  }
  assert.equal(same, 0, `${id} 같은 답 세 번 연속`);
  assert.equal(alt, 0, `${id} 처음 네 판 번갈아`);
  assert.ok(origin < 50, `${id} 원판 차례 그대로인 씨앗 ${origin}`);
  if (process.env.X2LOG) console.log(id, { origin, floor: K.minKeepP(chanceOf(make(1))) }, [...got].map(([n, v]) => `${n} ${v / 10}%`).join(' · '));
  for (const [name, n] of got) assert.ok(n / 1000 < 0.10, `${id} ${name} 봇 별 비율 ${n / 10}%`);
  assert.equal(K.scoreChoices(PLAN.map(() => true), 5, { chance: chanceOf(make(1)) }).stars, 3, id + ' 다 맞히면 별 셋');
  // 1~2학년 판 — 단추 글 · 한 줄 말에 어려운 낱말이 없음
  const low = M[id].tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  for (const t of [...low.items.map(it => it.label), low.say.kid]) assert.ok(!/음표|쉼표|박자표|오선|악보|계이름|화음|음색|형식/.test(t), `${id} 1~2학년 글: ${t}`);
}
// 형1 — 1~2학년 판은 '가락' 대신 '노래'
{
  const low = M.hy1.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.ok(low.items.every(it => /노래$/.test(it.label)) && !/가락/.test(low.say.kid), "형1 1~2학년 '노래'");
  assert.ok(SPEC.hy1.items.every(it => /가락$/.test(it.label)), "형1 3학년부터 '가락'");
  assert.deepEqual(SPEC.hy1.items.map(it => it.locked), [false, true, false], "형1 '비슷한' 단추는 중간에 나옴");
}
// 화1 — 악기가 둘인데 하나씩인 판 · 악기가 하나인데 함께인 판이 원판에 있다(악기 수로 답을 못 맞힘)
{
  const kinds = M.hwa1.PLAN.map(p => `${p.kind}:${p.ans}`);
  assert.ok(kinds.includes('turn:one') && kinds.includes('self:many') && kinds.includes('soft:many') && kinds.includes('round:many'));
  for (const p of M.hwa1.PLAN.filter(q => q.kind === 'turn')) {
    const insts = q => new Set(notesOf('hwa1', q)[0].map(n => n.inst)).size;
    assert.equal(insts({ ...p, ans: 'one' }), 2, '번갈아 = 악기 둘');
    assert.equal(insts({ ...p, ans: 'many' }), 2, '함께도 악기 둘(악기 수는 같음)');
  }
  for (const p of M.hwa1.PLAN.filter(q => q.kind === 'self' || q.kind === 'chord')) assert.equal(new Set(notesOf('hwa1', { ...p, ans: 'many' })[0].map(n => n.inst)).size, 1, '한 악기가 여러 음');
}
// 셈2 — 1~2학년 판은 '크게 · 작게' · '그대로' 단추는 중간에 · 높낮이로는 답을 못 맞힘 · 그대로 판의 세기가 판마다 다름
{
  const low = M.sem2.tvsSpec({ tell() {}, say() {} }, kitOf('low'));
  assert.deepEqual(low.items.map(it => it.label), ['점점 크게', '점점 작게', '그대로'], "셈2 1~2학년 '크게 · 작게'");
  assert.ok(!/세게|여리게/.test(low.say.kid), '셈2 1~2학년 한 줄 말');
  assert.deepEqual(SPEC.sem2.items.map(it => it.label), ['점점 세게', '점점 여리게', '그대로'], "셈2 3학년부터 '세게 · 여리게'");
  assert.deepEqual(SPEC.sem2.items.map(it => it.locked), [false, false, true], "셈2 '그대로' 단추는 중간에 나옴");
  const { PLAN } = M.sem2, dirOf = p => { const ps = notesOf('sem2', p)[0].map(n => n.p); return Math.sign(ps[7] - ps[0]); };
  assert.ok(PLAN.slice(0, M.sem2.CUTS[0]).every(p => p.kind === 'rep' && p.w === 'wide'), '셈2 소개 판 = 같은 음 · 넓은 폭');
  // 원판 · 뒤집은 판 어디에도 '올라가며 점점 세게' · '내려가며 점점 여리게'가 없다(높낮이를 따라 고르면 그 판은 꼭 틀림)
  for (const p of PLAN) for (const q of [p, M.sem2.SHUF.flip(p)]) { const d = dirOf(q); assert.ok(!(d > 0 && q.right === 'cresc') && !(d < 0 && q.right === 'decresc'), '셈2 높낮이 ≠ 세기: ' + JSON.stringify(q)); }
  const kinds = PLAN.map(p => `${p.kind}:${p.right}`);
  assert.ok(kinds.includes('slope:same') && kinds.includes('dense:same') && kinds.includes('cross:cresc') && kinds.includes('cross:decresc'), '셈2 비틀기 셋');
  assert.ok(PLAN.filter(p => p.stage === 'twist').every(p => ['slope', 'cross', 'dense'].includes(p.kind)), '셈2 비틀기 판은 한 가지씩만');
  const flat = PLAN.filter(p => p.right === 'same').map(p => notesOf('sem2', p)[0][0].vel);
  assert.ok(new Set(flat).size >= 3 && Math.min(...flat) <= 0.4 && Math.max(...flat) >= 0.8, '셈2 그대로 판의 세기가 여린 것부터 센 것까지');
  // 틀린 갈래 — 고른 단추를 봄: 올라가는 그대로 판에 점점 세게 = 높낮이 갈래 · 점점 여리게면 그 갈래가 아님
  const res = PLAN.map(p => !(p.kind === 'slope' || p.kind === 'cross')), follow = PLAN.map(p => (p.kind === 'cross' ? (p.right === 'cresc' ? 'decresc' : 'cresc') : p.kind === 'slope' ? (p.dir === 'up' ? 'cresc' : 'decresc') : p.right));
  assert.ok(/높이와 세기는 달라요/.test(M.sem2.tipOf(PLAN, res, follow)), '셈2 높낮이를 따라 고른 판 넷 → 높낮이 갈래');
  assert.ok(/높이와 세기는 달라요/.test(M.sem2.tipOf(PLAN, res, [])), '셈2 고른 단추를 몰라도 그 판이 틀렸으면 높낮이 갈래');
  const small = PLAN.map(p => p.kind !== 'tune');
  assert.ok(/조금씩 변하는 세기/.test(M.sem2.tipOf(PLAN, small, PLAN.map(p => (p.kind === 'tune' ? 'same' : p.right)))), '셈2 작은 변화를 그대로로');
  assert.ok(!/조금씩 변하는 세기/.test(M.sem2.tipOf(PLAN, small, PLAN.map(p => (p.kind === 'tune' ? (p.right === 'cresc' ? 'decresc' : 'cresc') : p.right)))), '셈2 거꾸로 고른 것은 작은 변화 갈래가 아님');
}
console.log('✓ 듣고 고르기 네 칸(소6 · 형1 · 화1 · 셈2) — 답 = 소리(뒤집어도) · 소리 길이 같음 · 듣지 않는 봇 별 10% 아래 · 같은 답 세 번 연속 0 · 1~2학년 글');
