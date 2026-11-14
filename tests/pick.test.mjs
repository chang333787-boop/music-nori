// 듣고 고르기 칸(장부 engine/cells.js에서 frame: 'pick'인 칸 모두 — app/js/cells/_pick.js) — 문항 표가 스스로 한 말을 지키는지(소리 · 화면 없이 표만)
//  칸마다 검사 파일 하나: tests/pick/<id>.mjs = right(답 = 소리) · opts(판마다 단추) · norm(같은 문항 열쇠) + 있으면 bots · seedCheck · extra(그 칸만의 덧검사)
//   파일이 없으면 떨어진다 — 새 고르기 칸은 장부 줄에 frame: 'pick'을 적고 이 파일을 만든다(이 시험 파일은 고치지 않음)
//  ① 줄의 답 = 실제로 나는 소리(뒤집어도) ② 답과 상관없이 소리 길이가 같음(열리는 때로 답이 새지 않음)
//  ③ 듣지 않고 누르는 봇(같은 답 · 번갈아 · 단계 꼴 · 찍기 · 소리 길이)이 별을 못 받음 ④ 같은 답 세 번 연속 X
//  node tests/pick.test.mjs
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const K = await import('../app/js/cellkit.js');
const P = await import('../app/js/cells/_pick.js');
const { CELLS } = await import('../engine/cells.js');
const { existsSync } = await import('node:fs');
const PICK = CELLS.filter(c => c.frame === 'pick').map(c => c.id);
// 11-14에 이 시험에 손 목록으로 있던 칸 — 빠지면 안 됨
for (const id of ['so6', 'hy1', 'hwa1']) assert.ok(PICK.includes(id), id + ' — 장부에 frame: \'pick\'');
const { readdirSync } = await import('node:fs');
for (const f of readdirSync(new URL('./pick/', import.meta.url)).filter(f => f.endsWith('.mjs'))) assert.ok(PICK.includes(f.slice(0, -4)), `tests/pick/${f} — 장부에 frame: 'pick'인 칸이 아님`);
const M = {}, T = {};
for (const id of PICK) {
  assert.ok(CELLS.find(c => c.id === id).first, id + ' — frame: \'pick\' 칸은 first(만든 칸)');
  const tf = new URL(`./pick/${id}.mjs`, import.meta.url);
  assert.ok(existsSync(tf), `${id} — tests/pick/${id}.mjs가 없음(고르기 칸마다 검사 파일 하나)`);
  M[id] = await import(`../app/js/cells/${id}.js`);
  T[id] = await import(tf.href);
  for (const f of ['right', 'opts', 'norm']) assert.equal(typeof T[id][f], 'function', `${id} 검사 파일에 ${f}`);
}
const STAGES = ['intro', 'grow', 'twist', 'end'];

// TV 표(tvsSpec) — OPEN(row) = 300 + 소리 길이(ms) = 아이 기기에서 답이 열리는 때 · segs(row) = 그 판의 도막들
const kitOf = band => ({ band, stageShuffle: K.stageShuffle, rng: K.rng });
const SPEC = Object.fromEntries(Object.keys(M).map(id => [id, M[id].tvsSpec({ tell() {}, say() {} }, kitOf('mid'))]));

// 도막마다 실제로 나는 음 목록(쉼은 뺌) — 줄마다 처음부터 차례로 · t는 그 도막 처음부터 잰 초
//  북 음(음 객체에 drum)은 { drum, t, d, vel } · 연주법(art)이 있는 음은 art도
const notesOf = (id, row) => SPEC[id].segs(row).map(sg => sg.lines.flatMap(ln => {
  let t = 0;
  const out = [];
  for (const n of ln) {
    if (n.drum) out.push({ drum: n.drum, t: +t.toFixed(4), d: +n.d.toFixed(4), vel: n.vel });
    else if (n.p != null) out.push({ inst: n.inst, p: n.p, t: +t.toFixed(4), d: +n.d.toFixed(4), vel: n.vel, ...(n.art ? { art: n.art } : {}) });
    t += n.d + n.gap;
  }
  return out;
}).sort((a, b) => a.t - b.t || (a.p ?? 0) - (b.p ?? 0)));
const overlap = ns => ns.some((a, i) => ns.some((b, j) => j > i && b.t < a.t + a.d - 1e-6 && a.t < b.t + b.d - 1e-6));
const seq = ns => ns.map(n => `${n.p}:${n.d}`).join(' ');
const rel = ns => ns.map(n => +(n.t - ns[0].t).toFixed(3));
// 칸별 검사 파일에 넘기는 도우미
const ctxOf = id => ({ id, mod: M[id], spec: SPEC[id], notesOf: row => notesOf(id, row), overlap, seq, rel, kitOf, K, P, assert, STAGES, ansOf: M[id].SHUF.answerOf });

for (const [id, mod] of Object.entries(M)) {
  const { PLAN, CUTS, SHUF } = mod, S = SPEC[id], ansOf = SHUF.answerOf, X = T[id], ctx = ctxOf(id);
  assert.equal(PLAN.length, 12, id + ' 12판');
  assert.ok(PLAN.every(p => STAGES.includes(p.stage)), id + ' 줄마다 단계 꼬리표');
  assert.deepEqual(PLAN.map(p => STAGES.indexOf(p.stage)), PLAN.map(p => STAGES.indexOf(p.stage)).slice().sort((a, b) => a - b), id + ' 단계 차례');
  assert.deepEqual(CUTS, K.stageCuts(PLAN), id + ' CUTS = 표의 단계 경계');
  assert.ok(PLAN.every(p => S.rightOf(p) === ansOf(p)), id + ' 답 키 한 가지');
  // ① 원판 · 뒤집은 판 모두 답 = 소리
  for (const p of PLAN) for (const q of [p, SHUF.flip(p)]) assert.ok(X.right(q, notesOf(id, q), ctx), `${id} 답이 소리와 맞음: ${JSON.stringify(q)}`);
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
  ctx.rr = rr;
  const bots = [['단계 꼴', (k, p) => common[p.stage]], ...vals.map(v => [`늘 ${v}`, () => v]), ['찍기', (k, p, o) => o[Math.floor(rr() * o.length)]]];
  for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) bots.push([`번갈아 ${vals[a]}/${vals[b]}`, k => (k % 2 ? vals[b] : vals[a])], [`번갈아 ${vals[b]}/${vals[a]}`, k => (k % 2 ? vals[a] : vals[b])]);
  // 소리 길이 봇 — 소리를 끄고 답이 열리는 때만 봄: 그 단계의 다른 판보다 길면 첫 답 · 짧으면 끝 답 · 같으면 아무거나
  bots.push(['소리 길이', (k, p, o, plan) => {
    const same = plan.filter(x => x.stage === p.stage).map(S.OPEN), mean = same.reduce((a, b) => a + b) / same.length, d = S.OPEN(p) - mean;
    return d > 1 ? o[o.length - 1] : d < -1 ? o[0] : o[Math.floor(rr() * o.length)];
  }]);
  // 그 칸만의 봇(형1 '새 단추' 등 — tests/pick/<id>.mjs의 bots)
  if (X.bots) bots.push(...X.bots(ctx));
  const got = new Map(bots.map(([n]) => [n, 0]));
  let same = 0, alt = 0, origin = 0;
  for (let sd = 1; sd <= 1000; sd++) {
    const plan = make(sd);
    assert.equal(plan.length, PLAN.length);
    if (plan.every((p, k) => X.norm(p) === X.norm(PLAN[k]) && ansOf(p) === ansOf(PLAN[k]))) origin++;
    for (let b = 0; b + 1 < bounds.length; b++) assert.deepEqual(plan.slice(bounds[b], bounds[b + 1]).map(X.norm).sort(), PLAN.slice(bounds[b], bounds[b + 1]).map(X.norm).sort(), `${id} 씨앗 ${sd} ${b + 1}단계 문항 묶음`);
    const a = plan.map(ansOf);
    for (let i = 2; i < a.length; i++) if (a[i] === a[i - 1] && a[i] === a[i - 2]) same++;
    if (a[0] === a[2] && a[1] === a[3] && a[0] !== a[1]) alt++;
    if (X.seedCheck) X.seedCheck(plan, ctx);
    if (sd === 1) assert.deepEqual(make(1), plan, id + ' 같은 씨앗이면 같은 판');
    const chance = chanceOf(plan);
    for (const [name, bot] of bots) {
      const res = plan.map((p, k) => { const o = X.opts(p, k, ctx), v = bot(k, p, o, plan); return o.includes(v) ? v === ansOf(p) : null; });
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
  // 그 칸만의 덧검사(tests/pick/<id>.mjs의 extra)
  if (X.extra) X.extra(ctx);
}
console.log(`✓ 듣고 고르기 ${PICK.length}칸(${PICK.join(' · ')}) — 답 = 소리(뒤집어도) · 소리 길이 같음 · 듣지 않는 봇 별 10% 아래 · 같은 답 세 번 연속 0 · 1~2학년 글 · 칸별 덧검사`);
