// 요소별 공부 흐름 시험 — 차례 자료가 앱에 있는 것만 가리키는지, 찾기가 선생님 말로 되는지
import assert from 'node:assert/strict';
import { ELEMENTS, EV, WALK, CLUSTERS, PLAY_KEYS, SAMPLES, actInfo, elementById, stepById, parseQuery, search } from '../engine/flow.js';
import { CELLS, FIRST } from '../engine/cells.js';
import { GROUPS, SIGNS } from '../engine/marks.js';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; } };
const steps = ELEMENTS.flatMap(el => el.steps.map(step => ({ el, step })));
const acts = steps.flatMap(({ el, step }) => step.acts.map(act => ({ el, step, act })));
const hits = (q, elId) => (search(q).find(r => r.el.id === elId)?.steps || []).filter(s => s.hit).map(s => s.step.id);

ok('요소 열 가지 · id와 단계 id가 겹치지 않는다', () => {
  assert.equal(ELEMENTS.length, 10);
  assert.equal(new Set(ELEMENTS.map(e => e.id)).size, ELEMENTS.length);
  assert.equal(new Set(steps.map(s => s.step.id)).size, steps.length);
  for (const el of ELEMENTS) {
    assert.ok(el.steps.length >= 3, el.id);
    assert.ok(['hog', 'bird', 'bunny', 'turtle', 'bear'].includes(el.friend), el.id);
    assert.ok(el.curr && el.name && el.keys, el.id);
    assert.equal(elementById(el.id), el);
  }
  assert.equal(elementById('nope'), null);
  assert.equal(stepById('d4').el.id, 'dyn');
  assert.equal(stepById('nope'), null);
});

ok('단계마다 학년 범위 · 까닭 · 근거가 있다', () => {
  for (const { step } of steps) {
    const [lo, hi] = step.gr;
    assert.ok(Number.isInteger(lo) && Number.isInteger(hi) && lo >= 1 && hi <= 6 && lo <= hi, step.id);
    assert.ok(step.g && step.why && step.why.length >= 8, step.id);
    assert.ok(step.ev.length >= 1 && step.ev.length <= 2, step.id);
    for (const e of step.ev) assert.ok(EV[e], `${step.id} 근거 ${e}`);
  }
  for (const el of ELEMENTS) for (const m of el.mix) { assert.ok(EV[m.ev], el.id); assert.ok(m.t && m.src, el.id); }
});

ok("학년 근거를 찾지 못한 단계는 학년을 지어내지 않는다('근거를 찾지 못' 또는 '악보에 나올 때')", () => {
  for (const { step } of steps.filter(s => s.step.ev.includes('none')))
    assert.ok(/찾지 못|나올 때/.test(step.g), `${step.id} — ${step.g}`);
});

ok('앱에서 쓸 것(acts)이 모두 실제로 있는 것을 가리킨다', () => {
  for (const { step, act } of acts) {
    const i = actInfo(act);
    assert.ok(i, `${step.id} ${act}`);
    assert.ok(i.label && i.kindName && i.friend, act);
    if (i.kind === 'cell') {
      assert.ok(CELLS.some(c => c.id === i.ref), act);
      assert.equal(i.built, FIRST.includes(i.ref), act);
      assert.equal(!!i.href, i.built, act);                 // 만들지 않은 칸은 여는 주소가 없다
      assert.equal(!!i.tv, i.built, act);
    }
    if (i.kind === 'lab') {
      assert.ok(GROUPS.some(g => g.id === i.ref), act);
      if (i.sign) assert.equal(SIGNS.find(s => s.id === i.sign).group, i.ref, act);
      assert.ok(i.href.startsWith('#/lab/' + i.ref), act);
    }
    if (i.kind === 'play') { assert.ok(PLAY_KEYS.includes(i.ref), act); assert.equal(i.href, '#/play/' + i.ref); }
  }
  assert.equal(actInfo('cell:ri1').href, '#/tap');
  assert.equal(actInfo('cell:ri1').tv, '#/tvtap');
  assert.equal(actInfo('cell:ri5').tv, '#/tvcell/ri5');
  assert.equal(actInfo('lab:dyn:p').label, '여리게 p');
  assert.equal(actInfo('lab:dyn:cresc').label, '점점 세게');
  assert.equal(actInfo('lab:len').label, '음의 길이');
});

ok('없는 것은 null — 다른 묶음의 기호 · 없는 칸 · 없는 카드', () => {
  for (const bad of ['cell:zz9', 'lab:zz', 'lab:dyn:rest', 'lab:len:p', 'play:zz', 'zz:ri1', ''])
    assert.equal(actInfo(bad), null, bad);
});

ok('악보 판의 모든 묶음 · 모든 기호가 어느 단계에든 걸려 있다', () => {
  const used = new Set(acts.filter(a => a.act.startsWith('lab:')).map(a => a.act));
  for (const g of GROUPS) assert.ok([...used].some(a => a.split(':')[1] === g.id), g.id);
  for (const s of SIGNS.filter(s => !['inst', 'meter'].includes(s.group)))
    assert.ok(used.has(`lab:${s.group}:${s.id}`) || used.has(`lab:${s.group}`), s.id);
});

ok('만든 칸(장부 first)은 모두 어느 흐름에든 들어 있다', () => {
  const used = new Set(acts.filter(a => a.act.startsWith('cell:')).map(a => a.act.slice(5)));
  for (const id of FIRST) assert.ok(used.has(id), id);
});

ok('걸음 다섯 · 덩어리 셋이 있는 요소만 가리킨다', () => {
  assert.equal(WALK.length, 5);
  assert.deepEqual(WALK.map(w => w.kind || null), [null, 'cell', 'cell', 'lab', 'play']);
  for (const c of CLUSTERS) { assert.ok(EV[c.ev]); for (const id of c.els) assert.ok(elementById(id), id); }
  assert.equal(new Set(CLUSTERS.flatMap(c => c.els)).size, CLUSTERS.flatMap(c => c.els).length);
});

ok('찾는 말 나누기 — 학년과 낱말', () => {
  assert.deepEqual(parseQuery('4학년 박자'), { words: ['박자'], grade: [4, 4] });
  assert.deepEqual(parseQuery('  3~4학년   점점  세게 '), { words: ['점점', '세게'], grade: [3, 4] });
  assert.deepEqual(parseQuery('6-5학년'), { words: [], grade: [5, 6] });
  assert.deepEqual(parseQuery(''), { words: [], grade: null });
  assert.deepEqual(parseQuery('MP'), { words: ['mp'], grade: null });
});

ok("'박자' — 박·박자 흐름이 통째로, 맨 앞에", () => {
  const r = search('박자');
  assert.equal(r[0].el.id, 'beat');
  assert.equal(r[0].level, 'element');
  assert.equal(r[0].steps.length, elementById('beat').steps.length);
  assert.deepEqual(r.map(x => x.el.id), ['beat']);
});

ok("'점점 세게' — 셈여림 흐름 안의 그 단계만 찾은 곳", () => {
  const r = search('점점 세게');
  assert.deepEqual(r.map(x => x.el.id), ['dyn']);
  assert.equal(r[0].level, 'step');
  assert.equal(r[0].steps.length, elementById('dyn').steps.length);   // 앞뒤 단계가 함께 보인다
  assert.deepEqual(hits('점점 세게', 'dyn'), ['d4']);
  assert.deepEqual(hits('점점세게', 'dyn'), ['d4']);                    // 붙여 써도
});

ok("기호 글자 — 'p'는 여리게만, 'mp'는 조금 여리게만", () => {
  assert.deepEqual(hits('p', 'dyn'), ['d2']);
  assert.deepEqual(hits('f', 'dyn'), ['d2']);
  assert.deepEqual(hits('mp', 'dyn'), ['d3']);
  assert.deepEqual(hits('ff', 'dyn'), ['d5']);
  assert.deepEqual(hits('P', 'dyn'), ['d2']);
});

ok('낱말로 찾기 — 쉼표 · 도돌이표 · 자진모리 · 붙임줄 · 늘임표 · 바이올린', () => {
  assert.ok(hits('쉼표', 'rhythm').includes('r2'));
  assert.ok(hits('도돌이표', 'form').includes('f4'));
  assert.deepEqual(hits('자진모리', 'jangdan'), ['j1']);
  assert.deepEqual(hits('붙임줄', 'rhythm'), ['r7', 'r9']);            // r9 = 아직 없는 칸(16분음표·8분쉼표·붙임줄)에 걸림
  assert.deepEqual(hits('늘임표', 'tempo'), ['t5']);
  assert.ok(hits('늘임표', 'rhythm').includes('r10'));
  assert.deepEqual(hits('바이올린', 'timbre'), ['e3']);
  assert.deepEqual(hits('크레셴도', 'dyn'), ['d4']);
  assert.deepEqual(hits('3화음', 'harmony'), ['h2', 'h3']);
});

ok('학년을 적으면 그 학년에 걸치는 단계만', () => {
  const r = search('4학년 박자');
  assert.equal(r[0].el.id, 'beat');
  for (const { step } of r[0].steps) assert.ok(step.gr[0] <= 4 && step.gr[1] >= 4, step.id);
  assert.ok(r[0].steps.length < elementById('beat').steps.length);
  const six = search('6학년');
  assert.ok(six.length >= 8);
  for (const x of six) for (const { step } of x.steps) assert.ok(step.gr[1] >= 6, step.id);
  assert.equal(search('1학년 화음').length, 0);                          // 1학년에 걸치는 화음 단계는 없다
});

ok('성취기준 번호로도 찾는다', () => {
  const r = search('4음02-01');
  assert.ok(r.length >= 3);
  assert.ok(r.every(x => x.level === 'step'));
});

ok('찾는 말이 없으면 열 요소 모두 · 없는 말이면 빈 결과', () => {
  assert.equal(search('').length, 10);
  assert.ok(search('').every(x => x.level === 'all' && x.steps.every(s => !s.hit)));
  assert.deepEqual(search('없는말쿵'), []);
  assert.deepEqual(search(null).map(x => x.el.id), ELEMENTS.map(e => e.id));
});

ok('미리 보여 주는 찾는 말은 모두 결과가 있다', () => {
  for (const q of SAMPLES) assert.ok(search(q).length >= 1, q);
});

ok('선생님 글에 쓰지 않는 말 — 보편 · 틀렸 · 반드시', () => {
  const all = JSON.stringify(ELEMENTS) + JSON.stringify(CLUSTERS) + JSON.stringify(WALK);
  for (const w of ['보편', '틀렸', '반드시', '입증', '검증된']) assert.ok(!all.includes(w), w);
});

console.log(`✓ 요소별 공부 흐름 시험 통과 — ${n}묶음 · 요소 ${ELEMENTS.length} · 단계 ${steps.length} · 앱에서 쓸 것 ${acts.length}개`);
