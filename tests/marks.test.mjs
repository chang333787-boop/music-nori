// 악보 판 규칙 시험 — 기호를 넣었다 빼면 소리(사건)와 악보가 말한 대로 달라지는가
import assert from 'node:assert/strict';
import { GROUPS, SIGNS, PHRASES, LV, LV0, phraseById, signById, signsOf, emptyMarks, countMarks, fitsMeter, meterNow, build, places, has, hasMeter, toggle, perform, scoreOf, factOf } from '../engine/marks.js';
import { songById } from '../engine/songs/index.js';
import { LEDGER } from '../engine/songs/ledger.js';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const freeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && freeze(v)); return Object.freeze(o); };
const put = (ph, m, id, at) => { const r = toggle(ph, freeze(m), id, at); assert.ok(!r.blocked, `${id}@${at} 막힘`); return r.marks; };
const notes = r => r.events.filter(e => e.kind === 'note');
const ode = phraseById('ode'), auclair = phraseById('auclair'), haenschen = phraseById('haenschen'), frere = phraseById('frere');
const E = emptyMarks;

ok('묶음 · 기호 표', () => {
  assert.deepEqual(GROUPS.map(g => g.id), ['dyn', 'tempo', 'inst', 'len', 'repeat', 'meter']);
  assert.equal(new Set(SIGNS.map(s => s.id)).size, SIGNS.length);
  for (const g of GROUPS) { assert.ok(phraseById(g.phrase), g.id + ' 가락'); assert.ok(signsOf(g.id).length >= 1, g.id + ' 기호'); }
  for (const s of SIGNS) assert.ok(GROUPS.some(g => g.id === s.group), s.id);
  for (const g of ['tempo', 'inst']) assert.equal(signsOf(g).filter(s => s.base).length, 1, g + ' 기본값 하나');
});

ok('가락 도막은 대장 곡에서 자른 것 · 붙임줄 · 셈여림 · 못갖춘마디 없음', () => {
  const led = new Set((Array.isArray(LEDGER) ? LEDGER : Object.values(LEDGER)).map(r => r.id));
  for (const ph of PHRASES) {
    assert.ok(songById(ph.src), ph.src);
    assert.ok(led.has(ph.src), ph.src + ' 대장');
    assert.deepEqual(ph.song.errors, [], ph.id);
    assert.equal(ph.song.pickup, 0);
    assert.ok(ph.song.ev.every(e => !e.tie && e.dyn === 'mf'));
    assert.equal(ph.N.length, ph.song.ev.filter(e => e.p != null).length);
    assert.ok(songById(ph.src).mel.includes(ph.mel.split(' | ')[0]), '본래 가락 그대로');
    assert.ok(ph.N.every(x => x.t % 3 === 0 && x.d % 3 === 0), '16분 칸에 맞음');
    assert.ok(ph.N.every(x => x.p >= 55 && x.p <= 72));
  }
  assert.equal(ode.N.length, 15); assert.equal(auclair.N.length, 11); assert.equal(haenschen.N.length, 13); assert.equal(frere.N.length, 11);
});

ok('박자표로 다시 나눌 수 있는 가락', () => {
  for (const m of [[2, 4], [3, 4], [4, 4]]) assert.ok(fitsMeter(frere, m), 'frere ' + m);
  assert.ok(fitsMeter(ode, [2, 4])); assert.ok(!fitsMeter(ode, [3, 4]));
  assert.ok(!fitsMeter(auclair, [2, 4])); assert.ok(!fitsMeter(auclair, [3, 4]));
  assert.ok(fitsMeter(haenschen, [4, 4])); assert.ok(!fitsMeter(haenschen, [3, 4]));
});

ok('아무것도 안 넣으면 본래 가락 그대로', () => {
  for (const ph of PHRASES) {
    const r = perform(ph, E()), sec = 60 / ph.tempo / 12;
    assert.equal(r.events.length, ph.N.length);
    r.events.forEach((e, k) => { assert.ok(near(e.t, ph.N[k].t * sec)); assert.equal(e.vel, LV0); assert.equal(e.inst, 'piano'); assert.equal(e.p, ph.N[k].p); });
    assert.ok(near(r.total, ph.total * sec + 0.35));
    assert.equal(countMarks(E()), 0);
  }
});

ok('셈여림표 — 그 음부터 크기가 바뀜 · 다시 누르면 빠짐 · 다른 표로 바꿈', () => {
  let m = put(ode, E(), 'p', 0);
  assert.ok(notes(perform(ode, m)).every(e => e.vel === LV.p));
  m = put(ode, m, 'f', 4);
  const v = notes(perform(ode, m)).map(e => e.vel);
  assert.deepEqual(v.slice(0, 4), [LV.p, LV.p, LV.p, LV.p]);
  assert.ok(v.slice(4).every(x => x === LV.f));
  assert.ok(has(m, 'f', 4) && !has(m, 'p', 4));
  m = put(ode, m, 'ff', 4);
  assert.ok(has(m, 'ff', 4) && !has(m, 'f', 4));
  const r = toggle(ode, m, 'ff', 4);
  assert.equal(r.on, false); assert.equal(r.marks.dyn[4], undefined);
  assert.ok(LV.pp < LV.p && LV.p < LV.mp && LV.mp < LV0 && LV0 < LV.mf && LV.mf < LV.f && LV.f < LV.ff);
});

ok('점점 세게 · 점점 여리게', () => {
  let m = put(ode, E(), 'cresc', 1);
  let v = notes(perform(ode, m)).map(e => e.vel);
  assert.deepEqual(v.slice(0, 4), [LV0, LV0, LV0, LV0]);
  assert.ok(near(v[4], LV0));
  for (let k = 5; k < 8; k++) assert.ok(v[k] > v[k - 1], '커짐 ' + k);
  assert.ok(near(v[7], LV0 * 2.2));
  assert.ok(v.slice(8).every(x => near(x, LV0 * 2.2)), '커진 채로 이어짐');
  // 뒤에 f가 있으면 거기까지 이어 감
  m = put(ode, put(ode, E(), 'p', 4), 'cresc', 1); m = put(ode, m, 'f', 8);
  v = notes(perform(ode, m)).map(e => e.vel);
  assert.ok(near(v[4], LV.p) && v[7] > v[4] && v[7] < LV.f && near(v[8], LV.f));
  // 점점 여리게는 바닥 아래로 내려가지 않음
  m = put(ode, put(ode, E(), 'pp', 0), 'decresc', 0);
  assert.ok(notes(perform(ode, m)).every(e => e.vel >= 0.08));
  // 두 마디에 이어 넣으면 한 줄로 이어짐
  m = put(ode, put(ode, E(), 'decresc', 1), 'decresc', 2);
  v = notes(perform(ode, m)).map(e => e.vel);
  for (let k = 5; k < 12; k++) assert.ok(v[k] < v[k - 1]);
  assert.deepEqual(scoreOf(ode, m).model.hairs, [{ kind: 'decresc', b0: 1, b1: 2 }]);
  // 같은 마디의 다른 쪽 표로 바뀜
  m = put(ode, m, 'cresc', 2);
  assert.deepEqual(scoreOf(ode, m).model.hairs, [{ kind: 'decresc', b0: 1, b1: 1 }, { kind: 'cresc', b0: 2, b1: 2 }]);
});

ok('악센트 — 그 음만', () => {
  const m = put(ode, E(), 'accent', 2), v = notes(perform(ode, m)).map(e => e.vel);
  v.forEach((x, k) => assert.ok(near(x, k === 2 ? LV0 * 1.6 : LV0)));
  assert.deepEqual(scoreOf(ode, m).score.staves[0].voices[0].events[2].ex, { accent: true });
});

ok('쉼표 — 그 음만 빠지고 다른 음의 때는 그대로 · 마지막 한 음은 남김', () => {
  const base = perform(ode, E()).events;
  const m = put(ode, E(), 'rest', 5), r = notes(perform(ode, m));
  assert.equal(r.length, 14);
  assert.deepEqual(r.map(e => e.t), base.filter(e => e.k !== 5).map(e => e.t));
  assert.equal(scoreOf(ode, m).score.staves[0].voices[0].events.length, 14);
  assert.ok(!places(ode, m, 'p').includes(5), '쉬는 음에는 다른 기호를 못 넣음');
  let all = E();
  for (let k = 0; k < 10; k++) all = put(auclair, all, 'rest', k);
  assert.deepEqual(places(auclair, all, 'rest'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], '남은 한 음은 못 뺌');
  assert.equal(toggle(auclair, all, 'rest', 10).blocked, true);
  assert.equal(put(ode, m, 'rest', 5).rest[5], undefined);
});

ok('붙임줄 — 같은 높이로 이어진 두 음만 · 한 음처럼 길어짐', () => {
  assert.deepEqual(places(ode, E(), 'tie'), [0, 3, 8, 11, 13]);
  assert.deepEqual(places(auclair, E(), 'tie'), [0, 1, 8]);
  assert.deepEqual(places(haenschen, E(), 'tie'), [1, 4, 10, 11]);
  assert.deepEqual(places(frere, E(), 'tie'), [3]);
  assert.equal(toggle(ode, E(), 'tie', 1).blocked, true);
  const base = perform(ode, E()).events;
  let m = put(ode, E(), 'tie', 0);
  let r = notes(perform(ode, m));
  assert.equal(r.length, 14);
  assert.deepEqual(r[0].ks, [0, 1]);
  assert.ok(near(r[0].len, base[0].len * 2));
  assert.ok(near(r[1].t, base[2].t));
  assert.deepEqual(scoreOf(ode, m).model.ties, [0]);
  // 세 음을 이으면 한 덩이
  m = put(haenschen, put(haenschen, E(), 'tie', 10), 'tie', 11);
  r = notes(perform(haenschen, m));
  assert.deepEqual(r[r.length - 1].ks, [10, 11, 12]);
  // 쉼표가 끼면 그 붙임줄은 소리에도 악보에도 없음
  m = put(ode, put(ode, E(), 'tie', 0), 'rest', 1);
  assert.deepEqual(scoreOf(ode, m).model.ties, []);
  assert.equal(notes(perform(ode, m)).length, 14);
});

ok('스타카토 · 늘임표', () => {
  const base = perform(ode, E()).events;
  let m = put(ode, E(), 'stacc', 3), r = notes(perform(ode, m));
  assert.ok(near(r[3].d, base[3].len * 0.4)); assert.ok(near(r[2].d, base[2].d)); assert.ok(near(r[4].t, base[4].t));
  m = put(ode, m, 'tie', 3);
  assert.ok(notes(perform(ode, m))[3].d > base[3].len, '이은 음은 끊지 않음');
  assert.equal(scoreOf(ode, m).score.staves[0].voices[0].events[3].ex, undefined);
  m = put(ode, E(), 'fermata', 7); r = perform(ode, m);
  const nn = notes(r);
  assert.ok(near(nn[7].len, base[7].len * 2));
  assert.ok(near(nn[7].t, base[7].t));
  assert.ok(near(nn[8].t, base[8].t + base[7].len), '뒤 음은 늘인 만큼 늦게');
  assert.ok(near(r.total, perform(ode, E()).total + base[7].len));
  assert.deepEqual(scoreOf(ode, m).model.fermatas, [7]);
});

ok('빠르기말 — 전체가 같은 비율로', () => {
  const base = perform(ode, E());
  for (const [id, bpm] of [['slow', 66], ['slowish', 80], ['fastish', 120], ['fast', 144]]) {
    const m = put(ode, E(), id), r = perform(ode, m);
    assert.equal(r.bpm, bpm);
    r.events.forEach((e, k) => { assert.ok(near(e.t, base.events[k].t * ode.tempo / bpm)); assert.ok(near(e.d, base.events[k].d * ode.tempo / bpm)); assert.equal(e.vel, LV0); });
    assert.equal(toggle(ode, m, id).marks.tempo, null, '또 누르면 본래 빠르기');
    assert.equal(toggle(ode, m, 'mid').marks.tempo, null);
  }
  assert.ok(has(E(), 'mid') && !has(E(), 'fast'));
  assert.equal(scoreOf(ode, put(ode, E(), 'fast')).model.tempoWord, '빠르게');
  assert.equal(scoreOf(ode, E()).model.tempoWord, '보통 빠르게');
});

ok('점점 느리게 · 점점 빠르게 — 그 마디부터 끝까지', () => {
  const base = perform(ode, E());
  const gaps = ev => ev.slice(1).map((e, k) => e.t - ev[k].t);
  let m = put(ode, E(), 'rit', 2), r = perform(ode, m);
  for (let k = 0; k <= 8; k++) assert.ok(near(r.events[k].t, base.events[k].t), '앞은 그대로');
  let g = gaps(r.events.slice(8, 12));
  assert.ok(g[1] > g[0] && g[2] > g[1], '점점 벌어짐');
  assert.ok(r.total > base.total);
  m = put(ode, m, 'accel', 2); r = perform(ode, m);
  assert.equal(m.tchange.kind, 'accel');
  g = gaps(r.events.slice(8, 12));
  assert.ok(g[1] < g[0] && g[2] < g[1], '점점 좁아짐');
  assert.ok(r.total < base.total);
  m = put(ode, m, 'rit', 0);
  assert.deepEqual(m.tchange, { bar: 0, kind: 'rit' }, '하나만');
  assert.equal(put(ode, m, 'rit', 0).tchange, null);
});

ok('도돌이표 — 처음부터 그 마디까지 한 번 더', () => {
  const base = perform(ode, E()), sec = 60 / ode.tempo / 12;
  let m = put(ode, E(), 'repeat', 1), r = perform(ode, m);
  assert.equal(r.events.length, 8 + 15);
  assert.equal(r.passes, 2);
  assert.deepEqual(r.events.slice(0, 8).map(e => e.k), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(r.events.slice(8, 12).map(e => e.k), [0, 1, 2, 3]);
  assert.ok(near(r.events[8].t, 96 * sec));
  assert.ok(near(r.total, base.total + 96 * sec));
  assert.deepEqual(scoreOf(ode, m).score.repeat, { from: -1, to: 1 });
  m = put(ode, m, 'repeat', 3); r = perform(ode, m);
  assert.equal(r.events.length, 30);
  assert.equal(put(ode, m, 'repeat', 3).repeat, null);
  // 도돌이표에 걸친 붙임줄은 첫 번에는 끊기고 둘째 번에 이어짐
  m = put(ode, put(ode, E(), 'repeat', 0), 'tie', 3); r = notes(perform(ode, m));
  assert.deepEqual(r[3].ks, [3]); assert.deepEqual(r[7].ks, [3, 4]);
  // 셈여림은 되풀이할 때도 이어짐(처음에 표가 없으면 끝난 크기 그대로)
  m = put(ode, put(ode, E(), 'repeat', 0), 'f', 2); r = notes(perform(ode, m));
  assert.equal(r[0].vel, LV0); assert.equal(r[2].vel, LV.f); assert.equal(r[4].vel, LV.f);
});

ok('박자표 — 마디가 다시 나뉘고 센박 자리가 달라짐', () => {
  assert.deepEqual(meterNow(frere, E()), [2, 4]);
  assert.ok(hasMeter(frere, E(), 'm24') && !hasMeter(frere, E(), 'm34'));
  let r = toggle(frere, E(), 'm34');
  assert.ok(r.on && !r.note);
  let m = r.marks;
  assert.deepEqual(m.meter, [3, 4]);
  assert.equal(build(frere, m).bars, 4);
  const p = perform(frere, m, { beat: true });
  assert.deepEqual(p.events.filter(e => e.kind === 'drum' && e.drum === 'kick').map(e => e.tick), [0, 36, 72, 108]);
  assert.equal(p.events.filter(e => e.kind === 'drum').length, 12);
  for (const e of notes(p)) assert.ok(near(e.vel, LV0 * (e.tick % 36 === 0 ? 1.3 : 0.85)));
  const p2 = perform(frere, E(), { beat: true });
  assert.deepEqual(p2.events.filter(e => e.drum === 'kick').map(e => e.tick), [0, 24, 48, 72, 96, 120]);
  assert.deepEqual(notes(p).map(e => e.t), notes(p2).map(e => e.t), '음의 때는 같음');
  const sc = scoreOf(frere, m).score;
  assert.deepEqual(sc.ts, [3, 4]); assert.equal(sc.beats, 3); assert.equal(sc.bars, 4);
  // 마디에 넣은 기호는 박자표를 바꾸면 빠지고, 그 까닭을 알려 줌
  m = put(frere, put(frere, put(frere, E(), 'cresc', 1), 'repeat', 2), 'rit', 4);
  m = put(frere, m, 'accent', 2);
  r = toggle(frere, m, 'm44');
  assert.ok(r.note && r.note.includes('마디'));
  assert.deepEqual(r.marks.hair, {}); assert.equal(r.marks.repeat, null); assert.equal(r.marks.tchange, null);
  assert.ok(r.marks.accent[2], '음에 넣은 기호는 그대로');
  // 지금 박자를 또 누르면 본래 박자로
  r = toggle(frere, r.marks, 'm44');
  assert.equal(r.marks.meter, null); assert.equal(r.on, false);
  assert.equal(toggle(frere, E(), 'm24').marks.meter, null);
  // 딱 떨어지지 않으면 막고 까닭을 말함
  r = toggle(ode, E(), 'm34');
  assert.ok(r.blocked && r.note); assert.equal(r.marks.meter, null);
  assert.deepEqual(toggle(ode, E(), 'm24').marks.meter, [2, 4]);
  assert.equal(build(ode, toggle(ode, E(), 'm24').marks).bars, 8);
});

ok('악기 — 가락은 그대로 소리만', () => {
  const m = put(ode, E(), 'violin'), r = perform(ode, m), base = perform(ode, E());
  assert.ok(r.events.every(e => e.inst === 'violin'));
  assert.deepEqual(r.events.map(e => [e.t, e.p]), base.events.map(e => [e.t, e.p]));
  assert.equal(toggle(ode, m, 'piano').marks.inst, null);
  assert.equal(toggle(ode, m, 'violin').marks.inst, null);
  assert.ok(has(E(), 'piano') && has(m, 'violin') && !has(m, 'piano'));
  assert.deepEqual(scoreOf(ode, m).score.staves, scoreOf(ode, E()).score.staves, '악보는 그대로');
});

ok('넣을 자리', () => {
  assert.equal(places(ode, E(), 'fast'), 'start'); assert.equal(places(ode, E(), 'm24'), 'start'); assert.equal(places(ode, E(), 'violin'), 'start');
  assert.deepEqual(places(ode, E(), 'cresc'), [0, 1, 2, 3]); assert.deepEqual(places(frere, E(), 'repeat'), [0, 1, 2, 3, 4, 5]);
  assert.equal(places(ode, E(), 'p').length, 15);
  let m = E();
  for (const k of [0, 1, 2, 3]) m = put(ode, m, 'rest', k);
  assert.deepEqual(places(ode, m, 'cresc'), [1, 2, 3], '음이 없는 마디에는 못 넣음');
  assert.equal(toggle(ode, E(), 'p', 99).blocked, true);
  assert.equal(toggle(ode, E(), 'cresc', 9).blocked, true);
});

ok('악보 모양', () => {
  for (const ph of PHRASES) {
    const { score, model } = scoreOf(ph, E());
    assert.equal(score.bars, ph.total / (ph.meter[0] * 12)); assert.equal(score.sub, 4); assert.deepEqual(score.ts, ph.meter);
    assert.equal(score.staves.length, 1); assert.equal(score.staves[0].name, undefined);
    assert.equal(score.tempo, undefined); assert.equal(score.marks, undefined); assert.equal(score.repeat, undefined);
    const ev = score.staves[0].voices[0].events;
    assert.ok(ev.every(e => Number.isInteger(e.s) && Number.isInteger(e.d) && e.ps.length === 1));
    assert.deepEqual(ev.map(e => e.i), ph.N.map(x => x.k));
    assert.deepEqual([model.letters, model.hairs, model.ties, model.fermatas, model.tchange], [[], [], [], [], null]);
  }
  const m = put(ode, put(ode, put(ode, E(), 'p', 0), 'rit', 3), 'rest', 0);
  const { model } = scoreOf(ode, m);
  assert.deepEqual(model.letters, [], '쉬는 음의 셈여림표는 그리지 않음');
  assert.deepEqual(model.tchange, { bar: 3, text: 'rit.' });
});

ok('사건은 시간순 · 크기는 범위 안 · 넣은 것 목록은 고치지 않음', () => {
  let m = E();
  for (const [id, at] of [['pp', 0], ['cresc', 0], ['cresc', 1], ['ff', 8], ['accent', 9], ['stacc', 5], ['fermata', 14], ['tie', 11], ['rest', 6], ['rit', 3], ['repeat', 1], ['fast', null], ['violin', null], ['m24', null]]) m = put(ode, m, id, at);
  assert.equal(countMarks(m), 10, '박자표를 바꾸며 마디 기호 넷은 빠짐');
  for (const [id, at] of [['cresc', 0], ['decresc', 5], ['rit', 6], ['repeat', 3]]) m = put(ode, m, id, at);
  const r = perform(ode, m, { beat: true });
  for (let k = 1; k < r.events.length; k++) assert.ok(r.events[k].t >= r.events[k - 1].t);
  for (const e of r.events) { assert.ok(Number.isFinite(e.t) && e.t >= 0); if (e.kind === 'note') { assert.ok(e.vel >= 0.08 && e.vel <= 1.45); assert.ok(e.d > 0 && Number.isFinite(e.d)); } }
  assert.ok(r.total > r.events[r.events.length - 1].t);
});

ok('알려 주는 말 — 기호마다 넣을 때 · 뺄 때', () => {
  const bad = /틀렸|안 돼|잘했|훌륭|대단|멋져|최고/;
  for (const s of SIGNS) for (const on of [true, false]) {
    const t = factOf(s.id, on);
    assert.ok(t && t.length >= 8, s.id); assert.ok(!bad.test(t), t);
  }
  assert.ok(factOf('p', false).startsWith('여리게를 뺐어요'));
  assert.ok(factOf('tie', false).startsWith('붙임줄을 뺐어요'));
  assert.ok(factOf('m34', true).includes('3개'));
  assert.ok(factOf('m34', false, { meter: [2, 4] }).includes('2개'));
  assert.equal(factOf('m34', false, { note: '까닭' }), '까닭');
  assert.ok(signById('fermata') && signById('nope') === null);
});

console.log(`✓ 악보 판 규칙 시험 통과 — ${n}묶음 · 기호 ${SIGNS.length}개 · 가락 ${PHRASES.length}도막`);
