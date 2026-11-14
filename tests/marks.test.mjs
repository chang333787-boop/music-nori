// 악보 판 규칙 시험 — 기호를 넣었다 빼면 소리(사건)와 악보가 말한 대로 달라지는가
import assert from 'node:assert/strict';
import { GROUPS, SIGNS, PHRASES, LV, LV0, phraseById, signById, signsOf, emptyMarks, countMarks, fitsMeter, meterNow, build, places, has, hasMeter, toggle, perform, scoreOf, factOf, orderOf, keyShift, CHORD, CHORD_G } from '../engine/marks.js';
import { songById } from '../engine/songs/index.js';
import { makeSong, sounding } from '../engine/song.js';
import { chordPcs, pc } from '../engine/theory.js';
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
  assert.deepEqual(GROUPS.map(g => g.id), ['dyn', 'tempo', 'inst', 'len', 'repeat', 'meter', 'key', 'chord']);
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

// ════ 묶음 D2 — 조 · 임시표 · 둘째 줄 · 화음 · 1 · 2번 괄호 · D.C. · Fine · 북 반주 ════
const odev = phraseById('odev'), dcph = phraseById('ahvousdc'), tw = phraseById('ahvous8');
const melo = r => r.events.filter(e => e.kind === 'note' && !e.part);
const part = (r, x) => r.events.filter(e => e.part === x);
const D2 = ['drum', 'volta', 'dc', 'fine', 'up', 'sharp', 'flat', 'second', 'I', 'IV', 'V'];

ok('D2 — 묶음 · 기호 · 도막', () => {
  assert.deepEqual(signsOf('key').map(s => s.id), ['up', 'sharp', 'flat']);
  assert.deepEqual(signsOf('chord').map(s => s.id), ['second', 'I', 'IV', 'V']);
  assert.deepEqual(signsOf('repeat').map(s => s.id), ['repeat', 'volta', 'dc', 'fine']);
  assert.ok(signsOf('inst').some(s => s.id === 'drum'));
  for (const id of D2) assert.ok(signById(id), id);
  assert.equal(odev.N.length, 18); assert.equal(odev.total / 48, 5);
  assert.equal(dcph.total / 24, 12); assert.equal(tw.total / 24, 8);
  // 1 · 2번 괄호 도막 = 환희의 송가 1~4마디 + 8마디(마디째 · 음 하나 바꾸지 않음)
  const bars = songById('ode').mel.split('|').map(x => x.trim());
  assert.equal(odev.mel, [0, 1, 2, 3, 7].map(i => bars[i]).join(' | '));
  for (const ph of PHRASES) assert.ok(ph.N.every(n => [0, 2, 4, 5, 7, 9, 11].includes(pc(n.p))), ph.id + ' 다장조 음만');
  // 화음은 다장조 주요 3화음 그대로(화2 칸과 같은 자리)
  for (const id of ['I', 'IV', 'V']) assert.deepEqual(CHORD[id].map(pc), chordPcs(id, 0));
  for (const id of ['I', 'IV', 'V']) assert.deepEqual(CHORD_G[id].map(pc).sort((a, b) => a - b), chordPcs(id, 7).sort((a, b) => a - b), '사장조 ' + id);
});

ok('D2 — 기호마다 넣으면 소리가 달라지고 · 한 번 더 누르면 원래 소리와 같음', () => {
  for (const id of D2) {
    const s = signById(id), ph = phraseById(s.phrase || groupById2(s.group).phrase);
    let base = E();
    if (id === 'fine') base = put(ph, base, 'dc', ph.total / barTicks2(ph) - 1);   // Fine은 D.C.와 함께여야 소리가 바뀐다
    const at = s.where === 'start' ? null : places(ph, base, id)[0];
    assert.ok(s.where === 'start' || at != null, id + ' 자리');
    const r = toggle(ph, freeze(base), id, at);
    assert.ok(!r.blocked && r.on, id + ' 넣기');
    assert.notDeepEqual(perform(ph, r.marks).events, perform(ph, base).events, id + ' 소리가 달라짐');
    assert.equal(countMarks(r.marks), countMarks(base) + (id === 'volta' ? 2 : 1), id + ' 수');
    const back = toggle(ph, freeze(r.marks), id, at);
    assert.ok(!back.blocked && !back.on, id + ' 빼기');
    assert.deepEqual(back.marks, base, id + ' 넣은 것 목록이 처음과 같음');
    assert.deepEqual(perform(ph, back.marks), perform(ph, base), id + ' 소리가 처음과 같음');
    assert.deepEqual(scoreOf(ph, back.marks).score, scoreOf(ph, base).score, id + ' 악보가 처음과 같음');
  }
});
function groupById2(id) { return GROUPS.find(g => g.id === id); }
function barTicks2(ph) { return ph.meter[0] * 48 / ph.meter[1]; }

ok('조 옮기기 — 다장조 → 사장조 · 모든 음이 같은 만큼 · 조표 ♯ 하나 · 계이름 그대로', () => {
  assert.equal(keyShift(ode), 7); assert.equal(keyShift(frere), 7); assert.equal(keyShift(tw), 7);
  assert.equal(keyShift({ N: [{ p: 72 }, { p: 76 }, { p: 77 }] }), -5, '높은 가락은 4도 아래로');
  const base = perform(ode, E()), m = put(ode, E(), 'up'), r = perform(ode, m);
  assert.deepEqual(r.events.map(e => e.p), base.events.map(e => e.p + 7));
  assert.deepEqual(r.events.map(e => [e.t, e.d, e.vel]), base.events.map(e => [e.t, e.d, e.vel]), '때 · 길이 · 세기는 그대로');
  const s0 = scoreOf(ode, E()), s1 = scoreOf(ode, m);
  assert.equal(s0.score.ksig, undefined); assert.deepEqual(s1.score.ksig, [8]);
  assert.equal(s1.score.staves[0].words, 'lab');
  const ev = s1.score.staves[0].voices[0].events;
  assert.deepEqual(ev.map(e => e.lab).join(''), '미미파솔솔파미레도도레미미레레', '사장조 계이름(솔 자리가 도) = 다장조일 때와 같은 이름');
  assert.ok(ev.every(e => e.sp[0].acc === '' && e.oct === 0));
  assert.deepEqual(ev.map(e => e.sp[0].pos), ode.N.map(n => [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 6][pc(n.p)] + (Math.floor(n.p / 12) - 5) * 7 - 2 + 4), '오선 자리는 네 칸 위(5도)');
  // 조표가 붙은 파(F)는 기호 없이 반음 올린 소리 — 사장조의 둘째 줄에서 라 아래 파#
  const m2 = put(ode, m, 'second'), sec = part(perform(ode, m2), 'second');
  const fs = sec.filter(e => pc(e.p) === 6);
  assert.ok(fs.length > 0 && sec.every(e => pc(e.p) !== 5), '사장조에는 파가 아니라 파#');
  const low = scoreOf(ode, m2).score.staves[1];
  assert.deepEqual(scoreOf(ode, m2).score.ksig, [8]);
  assert.ok(low.voices[0].events.every(e => e.sp[0].acc === ''), '조표가 있으니 파# 앞에 ♯을 따로 붙이지 않음');
  assert.ok(factOf('up', true).includes('조표'));
  assert.ok(factOf('up', false).includes('다장조'));
});

ok('올림표 · 내림표 — 그 음 + 같은 마디 뒤의 같은 자리 음 · 다음 마디는 제자리', () => {
  // ode = 미미파솔 | 솔파미레 | 도도레미 | 미. 레레
  assert.deepEqual(places(ode, E(), 'sharp'), [2, 3, 4, 5, 7, 8, 9, 10, 13, 14], '미 · 시에는 올림표 X');
  assert.deepEqual(places(ode, E(), 'flat'), [0, 1, 3, 4, 6, 7, 10, 11, 12, 13, 14], '도 · 파에는 내림표 X');
  assert.equal(toggle(ode, E(), 'sharp', 0).blocked, true);
  assert.equal(toggle(ode, E(), 'flat', 8).blocked, true);
  const base = perform(ode, E()).events.map(e => e.p);
  let m = put(ode, E(), 'sharp', 8), p = perform(ode, m).events.map(e => e.p);
  assert.deepEqual(p, base.map((x, k) => (k === 8 || k === 9 ? x + 1 : x)), '도# 도# — 같은 마디의 둘째 도도 올라감');
  let ev = scoreOf(ode, m).score.staves[0].voices[0].events;
  assert.equal(ev[8].sp[0].acc, '♯'); assert.equal(ev[9].sp[0].acc, '', '둘째 도에는 ♯을 다시 적지 않음');
  assert.equal(ev[8].lab, '도#'); assert.equal(ev[9].lab, '도#');
  assert.ok(!places(ode, m, 'sharp').includes(9), '이미 올라간 음에는 또 넣지 않음');
  m = put(ode, E(), 'sharp', 2); p = perform(ode, m).events.map(e => e.p);
  assert.equal(p[2], 66); assert.equal(p[5], 65, '다음 마디의 파는 제자리');
  m = put(ode, E(), 'flat', 0); p = perform(ode, m).events.map(e => e.p);
  assert.deepEqual([p[0], p[1], p[6]], [63, 63, 64], '미♭ 미♭ | … 미');
  ev = scoreOf(ode, m).score.staves[0].voices[0].events;
  assert.deepEqual([ev[0].sp[0], ev[0].lab], [{ pos: 0, acc: '♭' }, '미♭'], '미 자리에 ♭(레# 자리가 아님)');
  // 같은 마디에서 올렸다가 내리기 — 뒤의 임시표부터 그 뒤가 바뀜
  m = put(ode, put(ode, E(), 'sharp', 13), 'flat', 14); p = perform(ode, m).events.map(e => e.p);
  assert.deepEqual([p[13], p[14]], [63, 61], '레# 레♭');
  ev = scoreOf(ode, m).score.staves[0].voices[0].events;
  assert.deepEqual([ev[13].sp[0].acc, ev[14].sp[0].acc, ev[13].sp[0].pos, ev[14].sp[0].pos], ['♯', '♭', -1, -1]);
  // 같은 음에 다른 쪽 표를 넣으면 바뀜 · 또 누르면 빠짐
  m = put(ode, put(ode, E(), 'sharp', 13), 'flat', 13);
  assert.equal(m.acc[13], 'flat'); assert.ok(has(m, 'flat', 13) && !has(m, 'sharp', 13));
  assert.deepEqual(put(ode, m, 'flat', 13).acc, {});
  // 다른 오선(둘째 줄)에는 걸리지 않음
  m = put(ode, put(ode, E(), 'sharp', 2), 'second');
  assert.equal(part(perform(ode, m), 'second')[2].p, 62, '파# 아래 둘째 줄은 레 그대로');
  assert.ok(factOf('sharp', true).includes('같은 마디') && factOf('flat', true).includes('다음 마디'));
});

ok('조 옮기기 + 임시표 · 화음 — 임시표는 사장조에서 쓰지 않는 자리만 쉬고, 화음은 사장조 Ⅰ · Ⅳ · Ⅴ로 따라감', () => {
  const m0 = put(ode, E(), 'up');
  assert.deepEqual(places(ode, m0, 'sharp'), [2, 3, 4, 5, 7, 8, 9, 10, 13, 14], '시(미에서 옮긴 음) X');
  assert.deepEqual(places(ode, m0, 'flat'), [0, 1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14], '도(파에서 옮긴 음) X');
  // 작은 별 라(넷째 · 다섯째 음)에 올림표 → 사장조에서는 미가 되어 올림표를 쓰지 않음
  let m = put(tw, put(tw, put(tw, put(tw, E(), 'sharp', 4), 'I', 0), 'IV', 2), 'V', 6);
  const r = toggle(tw, m, 'up');
  assert.ok(r.on && /임시표/.test(r.note) && !/화음/.test(r.note), r.note);
  const b = build(tw, r.marks);
  assert.equal(b.notes[4].mark, null); assert.equal(b.notes[4].p, 69 + 7);
  // 사장조 주요 3화음 — 솔시레 · 도미솔 · 레파#라(화3 칸과 같은 자리) · 이름(Ⅰ · Ⅳ · Ⅴ)과 계이름(도미솔 …)은 그대로
  const ch = part(perform(tw, r.marks), 'chord');
  assert.deepEqual(ch.map(e => e.p), [67, 71, 74, 60, 64, 67, 62, 66, 69]);
  assert.deepEqual(part(perform(tw, m), 'chord').map(e => e.p), [60, 64, 67, 65, 69, 72, 67, 71, 74], '다장조일 때');
  assert.deepEqual(ch.map(e => e.t), part(perform(tw, m), 'chord').map(e => e.t), '때는 같음');
  assert.deepEqual(places(tw, r.marks, 'I'), [0, 1, 2, 3, 4, 5, 6, 7], '사장조에서도 마디마다 넣을 수 있음');
  const sc = scoreOf(tw, r.marks);
  assert.deepEqual(sc.model.chords.map(c => c.sym + c.ko), ['Ⅰ도미솔', 'Ⅳ파라도', 'Ⅴ솔시레'], '화음 이름 · 계이름 그대로');
  const low = sc.score.staves[1].voices[0].events;
  assert.deepEqual(low[2].ps, [62, 66, 69]); assert.deepEqual(low[2].sp.map(x => x.pos), [-1, 1, 3], '레 · 파 · 라 자리');
  assert.ok(low.every(e => e.sp.every(x => x.acc === '')), '파#은 조표가 맡아 따로 ♯을 붙이지 않음');
  assert.deepEqual(sc.score.ksig, [8]);
  // 사장조에서 넣어도 됨 · 사실 줄은 사장조 화음
  const g = put(tw, put(tw, E(), 'up'), 'V', 6);
  assert.deepEqual(part(perform(tw, g), 'chord').map(e => e.p), [62, 66, 69]);
  assert.ok(factOf('V', true, { marks: g }).includes('사장조') && factOf('V', true, { marks: g }).includes('올림바'));
  assert.ok(!factOf('V', true, { marks: put(tw, E(), 'V', 6) }).includes('사장조'));
  // 둘째 줄도 사장조 음계 안 3도
  const s2 = part(perform(tw, put(tw, put(tw, E(), 'up'), 'second')), 'second').map(e => e.p);
  assert.deepEqual(s2, [57, 57, 64, 64, 65, 65, 64, 62, 62, 60, 60, 59, 59, 57].map(p => p + 7).map(p => (pc(p) === 5 ? p + 1 : p)), '다장조 둘째 줄을 5도 위로 · 파는 파#');
  assert.ok(factOf('up', true, { note: r.note }).includes('돌아와요'));
  assert.ok(factOf('up', true).includes('계이름은 그대로') && factOf('up', true).includes('사장조만'));
  // 조 옮기기를 빼면 다장조 화음 · 임시표가 그대로 돌아옴
  const back = toggle(tw, r.marks, 'up');
  assert.deepEqual(back.marks, m);
  assert.deepEqual(perform(tw, back.marks), perform(tw, m), '조 옮기기를 빼면 다장조 화음 · 임시표가 돌아옴');
  assert.deepEqual(scoreOf(tw, back.marks).score, scoreOf(tw, m).score);
  // 사장조에서 화음을 빼면 화음 없는 사장조로
  assert.deepEqual(perform(tw, put(tw, g, 'V', 6)), perform(tw, put(tw, E(), 'up')));
});

ok('둘째 줄 — 3도 아래 · 같은 리듬 · 아래 오선', () => {
  const base = perform(tw, E()), m = put(tw, E(), 'second'), r = perform(tw, m), sec = part(r, 'second');
  assert.deepEqual(melo(r), base.events, '가락은 그대로');
  assert.equal(sec.length, base.events.length);
  // 도도솔솔라라솔 파파미미레레도 → 3도 아래(다장조 음계 두 칸 아래)
  assert.deepEqual(sec.map(e => e.p), [57, 57, 64, 64, 65, 65, 64, 62, 62, 60, 60, 59, 59, 57]);
  sec.forEach((e, k) => { assert.ok(near(e.t, base.events[k].t) && near(e.d, base.events[k].d)); assert.ok(near(e.vel, base.events[k].vel * 0.75)); });
  const sc = scoreOf(tw, m);
  assert.equal(sc.score.staves.length, 2); assert.equal(sc.score.staves[1].clef, 'treble');
  assert.deepEqual(sc.score.staves[1].voices[0].events.map(e => e.ps[0]), sec.map(e => e.p));
  assert.ok(sc.model.second && sc.model.lower);
  // 붙임줄로 이은 음은 둘째 줄도 한 소리
  const t = put(ode, put(ode, E(), 'tie', 0), 'second');
  assert.deepEqual(part(perform(ode, t), 'second')[0].ks, [0, 1]);
});

ok('화음 Ⅰ · Ⅳ · Ⅴ — 고른 마디 동안 세 음이 길게 · 마디마다 하나', () => {
  assert.deepEqual(places(tw, E(), 'I'), [0, 1, 2, 3, 4, 5, 6, 7]);
  const sec = 60 / tw.tempo / 12;
  let m = put(tw, E(), 'I', 0), ch = part(perform(tw, m), 'chord');
  assert.deepEqual(ch.map(e => e.p), [60, 64, 67]);
  assert.ok(ch.every(e => near(e.t, 0) && near(e.d, 24 * sec * 0.92) && e.vel < LV0));
  assert.deepEqual(melo(perform(tw, m)), perform(tw, E()).events, '가락은 그대로');
  m = put(tw, m, 'IV', 2); ch = part(perform(tw, m), 'chord');
  assert.deepEqual(ch.slice(3).map(e => e.p), [65, 69, 72]); assert.ok(near(ch[3].t, 48 * sec));
  m = put(tw, m, 'V', 2);
  assert.deepEqual(m.chord, { 0: 'I', 2: 'V' }, '같은 마디에 다른 화음 = 바뀜');
  assert.deepEqual(part(perform(tw, m), 'chord').slice(3).map(e => e.p), [67, 71, 74]);
  assert.deepEqual(put(tw, m, 'V', 2).chord, { 0: 'I' });
  const sc = scoreOf(tw, m);
  assert.deepEqual(sc.model.chords, [{ bar: 0, id: 'I', sym: 'Ⅰ', ko: '도미솔' }, { bar: 2, id: 'V', sym: 'Ⅴ', ko: '솔시레' }]);
  assert.deepEqual(sc.score.staves[1].voices[0].events.map(e => [e.s, e.d, e.ps]), [[0, 8, [60, 64, 67]], [16, 8, [67, 71, 74]]]);
  // 둘째 줄과 함께 — 화음을 넣은 마디는 화음이, 나머지 마디는 둘째 줄이
  const both = put(tw, put(tw, E(), 'second'), 'IV', 2), r = perform(tw, both);
  assert.deepEqual(part(r, 'second').map(e => e.k).filter(k => k === 4 || k === 5), [], '셋째 마디(라라)에는 둘째 줄 대신 화음');
  assert.equal(part(r, 'second').length, 12); assert.equal(part(r, 'chord').length, 3);
  assert.deepEqual(perform(tw, put(tw, both, 'IV', 2)), perform(tw, put(tw, E(), 'second')), '화음을 빼면 둘째 줄이 돌아옴');
  // 셈여림을 따라 화음도 여려짐
  const pm = put(tw, put(tw, E(), 'p', 0), 'I', 0);
  assert.ok(part(perform(tw, pm), 'chord')[0].vel < ch[0].vel);
});

ok('1 · 2번 괄호 — 1번은 처음에만 · 되돌아온 뒤에는 2번', () => {
  assert.deepEqual(orderOf(odev, E()), [0, 1, 2, 3, 4]);
  let m = put(odev, E(), 'repeat', 3);
  assert.deepEqual(orderOf(odev, m), [0, 1, 2, 3, 0, 1, 2, 3, 4]);
  assert.deepEqual(places(odev, m, 'volta'), [3], '도돌이표가 있으면 그 마디에');
  const v = put(odev, m, 'volta', 3);
  assert.deepEqual(orderOf(odev, v), [0, 1, 2, 3, 0, 1, 2, 4]);
  // 괄호를 넣은 다섯 마디 = 환희의 송가 여덟 마디 그대로
  const full = sounding(makeSong({ mel: songById('ode').mel, meter: [4, 4], tempo: 100 })).map(n => n.p);
  assert.deepEqual(melo(perform(odev, v)).map(e => e.p), full);
  assert.deepEqual(put(odev, v, 'volta', 3), m, '괄호만 빠지고 도돌이표는 그대로');
  // 도돌이표 없이 넣으면 그 마디 끝에 도돌이표도 함께 — 빼면 함께 빠짐
  assert.deepEqual(places(odev, E(), 'volta'), [1, 2, 3], '첫 마디 · 끝 마디 X');
  const own = put(odev, E(), 'volta', 3);
  assert.deepEqual([own.repeat, own.volta], [{ to: 3 }, { own: true }]);
  assert.deepEqual(orderOf(odev, own), [0, 1, 2, 3, 0, 1, 2, 4]);
  assert.deepEqual(put(odev, own, 'volta', 3), E());
  // 도돌이표를 옮기면 괄호가 따라감 · 도돌이표를 빼면 괄호도 빠짐
  const mv = put(odev, own, 'repeat', 2);
  assert.deepEqual(orderOf(odev, mv), [0, 1, 2, 0, 1, 3, 4]);
  assert.equal(put(odev, mv, 'repeat', 2).volta, null);
  assert.equal(put(odev, own, 'repeat', 4).volta, null, '끝 마디로 옮기면 2번이 없어 빠짐');
  assert.deepEqual(places(odev, put(odev, E(), 'repeat', 0), 'volta'), [], '첫 마디의 도돌이표에는 X');
  const sc = scoreOf(odev, v);
  assert.equal(sc.model.volta, 3); assert.deepEqual(sc.score.repeat, { from: -1, to: 3 });
  assert.equal(perform(odev, v).passes, 3);
});

ok('D.C. · Fine — 처음으로 돌아가 Fine에서 마침 · 둘이 함께일 때 뜻이 섬', () => {
  const all = [...Array(12).keys()];
  assert.deepEqual(places(dcph, E(), 'dc'), [11], 'D.C.는 끝 마디');
  assert.deepEqual(places(dcph, E(), 'fine'), all.slice(0, 11));
  assert.equal(toggle(dcph, E(), 'dc', 5).blocked, true);
  const dc = put(dcph, E(), 'dc', 11);
  assert.deepEqual(orderOf(dcph, dc), [...all, ...all], 'D.C.만 = 처음부터 끝까지 한 번 더');
  const both = put(dcph, dc, 'fine', 7);
  assert.deepEqual(orderOf(dcph, both), [...all, 0, 1, 2, 3, 4, 5, 6, 7], 'a b a');
  const fine = put(dcph, E(), 'fine', 7);
  assert.deepEqual(perform(dcph, fine), perform(dcph, E()), 'Fine만 = 소리 그대로(D.C.로 돌아왔을 때만 쓰임)');
  // 끝나는 음 — D.C.만이면 레(덜 끝난 느낌) · D.C. + Fine이면 도
  const last = m => { const ev = melo(perform(dcph, m)); return ev[ev.length - 1].p; };
  assert.equal(last(E()), 62); assert.equal(last(dc), 62); assert.equal(last(both), 60);
  // D.C.로 돌아온 뒤에는 도돌이표를 지키지 않음
  const rp = put(dcph, both, 'repeat', 3);
  assert.deepEqual(orderOf(dcph, rp), [0, 1, 2, 3, ...all, 0, 1, 2, 3, 4, 5, 6, 7]);
  // 1 · 2번 괄호와 함께 — D.C. 뒤에는 1번을 건너뛰고 2번
  let v = put(odev, put(odev, E(), 'volta', 3), 'dc', 4);
  assert.deepEqual(orderOf(odev, v), [0, 1, 2, 3, 0, 1, 2, 4, 0, 1, 2, 4]);
  assert.deepEqual(places(odev, v, 'fine'), [0, 1, 2], '1번 괄호 마디에는 Fine X');
  v = put(odev, v, 'fine', 2);
  assert.deepEqual(orderOf(odev, v), [0, 1, 2, 3, 0, 1, 2, 4, 0, 1, 2]);
  const sc = scoreOf(dcph, both).model;
  assert.deepEqual([sc.dc, sc.fine], [11, 7]);
  assert.ok(factOf('dc', true, { marks: both }).includes('Fine(피네)까지'));
  assert.ok(factOf('dc', true, { marks: dc }).includes('한 번 더'));
  assert.ok(factOf('fine', true, { marks: fine }).includes('D.C.가 없어'));
  assert.ok(factOf('fine', true, { marks: both }).includes('여기서 마쳐요'));
});

ok('북 반주 — 센박 큰북 · 여린박 작은북 · 가락은 그대로', () => {
  const kinds = r => part(r, 'drum').map(e => e.drum);
  let m = put(ode, E(), 'drum'), r = perform(ode, m);
  assert.deepEqual(melo(r), perform(ode, E()).events);
  assert.deepEqual(kinds(r), Array(4).fill(['bassdrum', 'snare', 'bassdrum', 'snare']).flat(), '4분의 4박자 = 쿵 짝 쿵 짝');
  assert.deepEqual(part(r, 'drum').map(e => e.tick), [...Array(16).keys()].map(i => i * 12));
  const v = part(r, 'drum').map(e => e.vel);
  assert.ok(v[0] > v[2] && v[2] > v[1], '첫 박이 가장 세게');
  assert.deepEqual(kinds(perform(frere, put(frere, E(), 'drum'))).slice(0, 4), ['bassdrum', 'snare', 'bassdrum', 'snare'], '4분의 2박자 = 쿵 짝');
  const f3 = put(frere, toggle(frere, E(), 'm34').marks, 'drum');
  assert.deepEqual(kinds(perform(frere, f3)).slice(0, 6), ['bassdrum', 'snare', 'snare', 'bassdrum', 'snare', 'snare'], '4분의 3박자 = 쿵 짝 짝');
  const bt = perform(frere, f3, { beat: true });
  assert.equal(bt.events.filter(e => e.drum === 'kick' || e.drum === 'hat').length, 0, '박 소리 대신 북이 박을 침');
  const pp = perform(ode, put(ode, put(ode, E(), 'pp', 0), 'drum'));
  assert.ok(part(pp, 'drum')[0].vel < v[0], '여리게 연주하면 북도 여리게');
  assert.ok(has(m, 'drum') && has(m, 'piano'), '악기와 따로 켜고 끔');
  const dst = scoreOf(ode, m).score.staves;
  assert.deepEqual([dst.length, dst[1].clef], [2, 'perc1'], '악보에 북 반주 줄(한 줄 오선)');
  assert.equal(dst[1].voices[0].events.map(e => e.lab).join(''), '쿵짝쿵짝'.repeat(4));
  assert.ok(scoreOf(ode, m).model.drum);
  assert.equal(put(ode, m, 'violin').drum, true);
});

ok('D2 — 박자표를 바꾸면 마디에 넣은 화음 · 괄호 · D.C. · Fine은 빠짐', () => {
  let m = put(frere, put(frere, put(frere, E(), 'I', 1), 'dc', 5), 'fine', 2);
  m = put(frere, m, 'volta', 2);
  const r = toggle(frere, m, 'm34');
  assert.ok(r.note && r.note.includes('마디'));
  assert.deepEqual([r.marks.chord, r.marks.volta, r.marks.dc, r.marks.fine, r.marks.repeat], [{}, null, null, null, null]);
  assert.equal(countMarks(m), 5, '화음 · D.C. · Fine · 괄호 + 함께 들어간 도돌이표');
});

console.log(`✓ 악보 판 규칙 시험 통과 — ${n}묶음 · 기호 ${SIGNS.length}개 · 가락 ${PHRASES.length}도막`);
