// 악보 판 규칙 시험 — 기호를 넣었다 빼면 소리(사건)와 악보가 말한 대로 달라지는가
import assert from 'node:assert/strict';
import { GROUPS, SIGNS, PHRASES, LV, LV0, phraseById, signById, signsOf, emptyMarks, countMarks, fitsMeter, meterNow, build, places, has, hasMeter, toggle, perform, scoreOf, factOf, barsOf, LEN_KINDS, orderOf, keyShift, CHORD, CHORD_G } from '../engine/marks.js';
import { songById } from '../engine/songs/index.js';
import { makeSong, sounding } from '../engine/song.js';
import { barTicks, compound, TPQ, chordPcs, pc } from '../engine/theory.js';
import { LEDGER } from '../engine/songs/ledger.js';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const freeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && freeze(v)); return Object.freeze(o); };
const put = (ph, m, id, at) => { const r = toggle(ph, freeze(m), id, at); assert.ok(!r.blocked, `${id}@${at} 막힘`); return r.marks; };
const notes = r => r.events.filter(e => e.kind === 'note');
const ode = phraseById('ode'), auclair = phraseById('auclair'), haenschen = phraseById('haenschen'), frere = phraseById('frere'), rowrow = phraseById('rowrow');
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
  assert.equal(rowrow.N.length, 17); assert.deepEqual(rowrow.meter, [6, 8]); assert.equal(rowrow.total, 144);
});

ok('박자표로 다시 나눌 수 있는 가락', () => {
  for (const m of [[2, 4], [3, 4], [4, 4]]) assert.ok(fitsMeter(frere, m), 'frere ' + m);
  assert.ok(fitsMeter(ode, [2, 4])); assert.ok(!fitsMeter(ode, [3, 4]));
  assert.ok(!fitsMeter(auclair, [2, 4])); assert.ok(!fitsMeter(auclair, [3, 4]));
  assert.ok(fitsMeter(haenschen, [4, 4])); assert.ok(!fitsMeter(haenschen, [3, 4]));
  // 8분의 6박자 — 마디가 나뉘어도 셋씩 묶음(점4분 박)에 걸치는 음이 있으면 안 됨(프레르 자크의 4분음표는 둘째 박에 걸침)
  assert.ok(fitsMeter(rowrow, [6, 8])); assert.ok(fitsMeter(rowrow, [3, 4])); assert.ok(!fitsMeter(rowrow, [2, 4])); assert.ok(!fitsMeter(rowrow, [4, 4]));
  assert.ok(!fitsMeter(frere, [6, 8]), '마디 수는 맞지만 박에 걸침');
  for (const ph of [ode, auclair, haenschen]) assert.ok(!fitsMeter(ph, [6, 8]));
  // 마디 목록 — 못갖춘마디(첫 마디 한 박 · 끝 마디 한 박 모자람) · 바뀌는 박자
  assert.deepEqual(barsOf(96, [2, 4], true).map(b => b.len), [12, 24, 24, 24, 12]);
  assert.equal(barsOf(96, [2, 4], true)[0].pick, true);
  assert.equal(barsOf(96, [4, 4], true).map(b => b.len).join(), '12,48,36');
  assert.equal(barsOf(144, [2, 4], false, { bar: 3, meter: [3, 4] }).map(b => b.len).join(), '24,24,24,36,36');
  assert.equal(barsOf(144, [2, 4], false, { bar: 1, meter: [3, 4] }), null, '뒤가 딱 떨어지지 않음');
  assert.equal(barsOf(144, [6, 8], true).map(b => b.len).join(), '18,36,36,36,18', '8분의 6박자의 못갖춘마디 = 점4분 한 박');
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
    assert.equal(score.bars, ph.total / barTicks(ph.meter)); assert.equal(score.sub, compound(ph.meter) ? 6 : 4); assert.deepEqual(score.ts, ph.meter);
    assert.equal(score.beats * score.sub * 3, barTicks(ph.meter), '한 마디 칸 수 = 16분 칸');
    assert.deepEqual([score.barLens, score.tsAt, score.spread], [undefined, undefined, undefined], '기호가 없으면 예전 모양 그대로');
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

// ══ D1 박자 · 길이 기호(11-14) ══════════════════════════════════════════
const sv = (ph, m) => JSON.stringify(scoreOf(ph, m));            // 악보 모양(그림 + 판이 덧그릴 것 · 함수는 빼고)
const durOf = (ph, m) => build(ph, m).parts.map(q => [q.t, q.d, q.p]);
// 마디마다 소리 나는 길이의 합 — 음 길이 기호를 넣어도 마디 길이는 그대로
const barSums = (ph, m) => { const b = build(ph, m), out = b.B.map(() => 0); for (const q of b.parts) { out[q.bar] += q.d; assert.ok(q.t + q.d <= b.B[q.bar].t0 + b.B[q.bar].len, '마디줄을 넘는 조각 없음'); } return out; };

ok('점음표 — 이 음이 반만큼 길어지고 바로 뒤 음이 그만큼 짧아짐(4분 둘 · 2분 둘 · 8분 둘)', () => {
  assert.deepEqual(places(auclair, E(), 'dot'), [0, 1, 2, 4, 6, 7, 8], '같은 마디 · 같은 길이 · 박 위');
  assert.deepEqual(places(haenschen, E(), 'dot'), [0, 3, 6, 8, 10], '8분 둘은 한 박 안에서만');
  assert.deepEqual(places(rowrow, E(), 'dot'), [0, 1, 3, 4, 6, 7, 9, 10], '8분의 6박자는 8분 둘이 한 박(점4분) 안에');
  const base = perform(auclair, E());
  let m = put(auclair, E(), 'dot', 0);
  assert.deepEqual(durOf(auclair, m).slice(0, 3), [[0, 18, 60], [18, 6, 60], [24, 12, 60]], '4분 4분 → 점4분 8분');
  let r = notes(perform(auclair, m));
  assert.ok(near(r[0].len, base.events[0].len * 1.5)); assert.ok(near(r[1].len, base.events[1].len / 2));
  assert.ok(near(r[1].t, base.events[0].t + base.events[0].len * 1.5), '뒤 음이 늦게 시작');
  for (let k = 2; k < r.length; k++) assert.ok(near(r[k].t, base.events[k].t), '그 뒤는 그대로');
  assert.ok(near(perform(auclair, m).total, base.total));
  assert.deepEqual(barSums(auclair, m), barSums(auclair, E()));
  m = put(auclair, E(), 'dot', 4);
  assert.deepEqual(durOf(auclair, m).slice(4, 6), [[48, 36, 64], [84, 12, 62]], '2분 2분 → 점2분 4분');
  m = put(haenschen, E(), 'dot', 0);
  assert.deepEqual(durOf(haenschen, m).slice(0, 2), [[0, 9, 67], [9, 3, 64]], '8분 8분 → 점8분 16분');
  // 악보: 점4분(6칸) + 8분(2칸) · 쪼갠 음 사이를 벌려 그림
  const sc = scoreOf(auclair, put(auclair, E(), 'dot', 0)).score;
  assert.deepEqual(sc.staves[0].voices[0].events.slice(0, 2).map(e => [e.s, e.d]), [[0, 6], [6, 2]]);
  assert.equal(sc.spread, true);
  // 걸린 음에는 다른 길이 기호 · 붙임줄을 못 넣고, 붙임줄이 있는 음에는 점음표를 못 넣음
  m = put(auclair, E(), 'dot', 0);
  assert.ok(!places(auclair, m, 'dot').includes(1) && !places(auclair, m, 'six').includes(0) && !places(auclair, m, 'six').includes(1));
  assert.ok(!places(auclair, m, 'tie').includes(0) && !places(auclair, m, 'tie').includes(1));
  m = put(auclair, E(), 'tie', 0);
  assert.ok(!places(auclair, m, 'dot').includes(0) && !places(auclair, m, 'dot').includes(1));
  assert.equal(toggle(auclair, E(), 'dot', 3).blocked, true, '뒤 음이 다음 마디');
  assert.equal(toggle(auclair, E(), 'dot', 9).blocked, true, '길이가 다름');
});

ok('당김음 — 4분 4분 → 8분 4분 8분 · 가운데 음이 박 사이에서 시작해 조금 세게', () => {
  assert.deepEqual(places(auclair, E(), 'sync'), [0, 2, 6, 8], '4분의 4박자는 첫째 · 셋째 박에서(마디 반을 넘지 않게)');
  assert.deepEqual(places(frere, E(), 'sync'), [0, 2, 4, 6, 8]);
  assert.deepEqual(places(frere, toggle(frere, E(), 'm34').marks, 'sync').length > 0, true);
  assert.deepEqual(places(rowrow, E(), 'sync'), [], '8분의 6박자에는 넣지 않음');
  const base = perform(auclair, E());
  const m = put(auclair, E(), 'sync', 0);
  assert.deepEqual(durOf(auclair, m).slice(0, 4), [[0, 6, 60], [6, 12, 60], [18, 6, 60], [24, 12, 60]]);
  const r = notes(perform(auclair, m));
  assert.equal(r.length, base.events.length + 1, '음이 하나 늘어남(뒤 음의 끝 8분)');
  assert.ok(near(r[1].vel, LV0 * 1.3) && near(r[0].vel, LV0) && near(r[2].vel, LV0), '가운데 음만 조금 세게');
  assert.deepEqual(r[1].ks, [1]); assert.deepEqual(r[2].ks, ['1.1']);
  assert.ok(near(r[3].t, base.events[2].t), '그 뒤는 그대로');
  assert.deepEqual(barSums(auclair, m), barSums(auclair, E()));
  // 박 소리와 함께 — 가운데 음은 여린 자리지만 센박만큼 셈
  const rb = notes(perform(auclair, m, { beat: true }));
  assert.ok(near(rb[1].vel, LV0 * 1.3) && near(rb[2].vel, LV0 * 0.85));
  // 악보: 가운데 4분음표는 한 음표로(♪♩♪)
  const ev = scoreOf(auclair, m).score.staves[0].voices[0].events;
  assert.deepEqual(ev.slice(0, 3).map(e => [e.s, e.d, !!e.whole]), [[0, 2, false], [2, 4, true], [6, 2, false]]);
  assert.ok(factOf('sync', true).includes('8분 · 4분 · 8분'));
});

ok('16분음표 · 셋잇단음표 — 4분음표 한 박을 넷으로 · 셋으로(같은 높이)', () => {
  assert.deepEqual(places(auclair, E(), 'six'), [0, 1, 2, 3, 6, 7, 8, 9]);
  assert.deepEqual(places(auclair, E(), 'trip'), [0, 1, 2, 3, 6, 7, 8, 9]);
  assert.deepEqual(places(rowrow, E(), 'six'), [12, 14], '8분의 6박자는 한 박 안의 4분음표');
  assert.deepEqual(places(rowrow, E(), 'trip'), [], '셋잇단은 4분분의 박자에서만');
  assert.equal(TPQ % 3, 0, '4분음표 틱이 셋으로 나뉨');
  const base = perform(auclair, E());
  let m = put(auclair, E(), 'six', 2), r = notes(perform(auclair, m));
  assert.deepEqual(r.slice(2, 6).map(e => [e.tick, e.p]), [[24, 60], [27, 60], [30, 60], [33, 60]]);
  assert.deepEqual(r.slice(2, 6).map(e => e.ks[0]), [2, '2.1', '2.2', '2.3']);
  assert.ok(r.slice(2, 6).every(e => near(e.len, base.events[2].len / 4)));
  assert.ok(near(r[6].t, base.events[3].t));
  let ev = scoreOf(auclair, m).score.staves[0].voices[0].events;
  assert.deepEqual(ev.slice(2, 6).map(e => [e.s, e.d, !!e.nosol]), [[8, 1, false], [9, 1, true], [10, 1, true], [11, 1, true]], '계이름은 첫 음에만');
  m = put(auclair, E(), 'trip', 1); r = notes(perform(auclair, m));
  assert.deepEqual(r.slice(1, 4).map(e => e.tick), [12, 16, 20]);
  assert.ok(r.slice(1, 4).every(e => near(e.len, base.events[1].len / 3)));
  ev = scoreOf(auclair, m).score.staves[0].voices[0].events;
  assert.equal(ev.length, auclair.N.length, '셋잇단은 악보에서 한 덩이');
  assert.deepEqual([ev[1].s, ev[1].d, ev[1].tri.map(q => q.i)], [4, 4, [1, '1.1', '1.2']]);
  assert.deepEqual(barSums(auclair, m), barSums(auclair, E()));
  // 다른 기호와 함께 — 악센트는 첫 조각 · 스타카토는 모든 조각 · 늘임표는 끝 조각
  m = put(auclair, put(auclair, put(auclair, E(), 'six', 2), 'accent', 2), 'stacc', 2); r = notes(perform(auclair, m));
  assert.ok(near(r[2].vel, LV0 * 1.6) && near(r[3].vel, LV0));
  assert.ok(r.slice(2, 6).every(e => e.d < e.len * 0.6), "스타카토는 모든 조각을 짧게");
  m = put(auclair, put(auclair, E(), 'trip', 1), 'fermata', 1); r = notes(perform(auclair, m));
  assert.ok(near(r[3].len, base.events[1].len / 3 * 2) && near(r[1].len, base.events[1].len / 3));
});

ok('8분의 6박자 — 8분음표 여섯이 셋씩 두 묶음 · 첫째 음이 센박 · 넷째 음이 그다음', () => {
  assert.ok(hasMeter(rowrow, E(), 'm68'), '이 가락은 본래 8분의 6박자');
  assert.equal(signById('m68').phrase, 'rowrow');
  const p = perform(rowrow, E(), { beat: true }), drums = p.events.filter(e => e.kind === 'drum');
  assert.equal(drums.length, 24, '8분마다 박 소리');
  assert.deepEqual(drums.filter(e => e.drum === 'kick').map(e => [e.tick, e.vel]), [[0, 0.6], [18, 0.36], [36, 0.6], [54, 0.36], [72, 0.6], [90, 0.36], [108, 0.6], [126, 0.36]]);
  for (const e of notes(p)) assert.ok(near(e.vel, LV0 * (e.tick % 36 === 0 ? 1.3 : e.tick % 18 === 0 ? 1.1 : 0.85)), String(e.tick));
  // 같은 음을 4분의 3박자로 — 둘씩 셋으로 묶임
  let r = toggle(rowrow, E(), 'm34');
  assert.ok(r.on && !r.blocked);
  const p3 = perform(rowrow, r.marks, { beat: true });
  assert.deepEqual(p3.events.filter(e => e.drum === 'kick').map(e => e.tick), [0, 36, 72, 108]);
  assert.equal(p3.events.filter(e => e.kind === 'drum').length, 12);
  assert.deepEqual(notes(p3).map(e => e.t), notes(p).map(e => e.t), '음의 때는 같음');
  assert.ok(notes(p3).some((e, k) => !near(e.vel, notes(p)[k].vel)), '세기는 달라짐');
  const sc = scoreOf(rowrow, E()).score, sc3 = scoreOf(rowrow, r.marks).score;
  assert.deepEqual([sc.beats, sc.sub, sc.ts], [2, 6, [6, 8]]); assert.deepEqual([sc3.beats, sc3.sub, sc3.ts], [3, 4, [3, 4]]);
  // 다시 8분의 6박자로 = 처음과 같음
  r = toggle(rowrow, r.marks, 'm68');
  assert.equal(r.marks.meter, null);
  assert.deepEqual(perform(rowrow, r.marks, { beat: true }), p);
  // 셋씩 묶음에 걸치는 가락은 막고 까닭을 말함
  r = toggle(frere, E(), 'm68');
  assert.ok(r.blocked && r.note.includes('박이')); assert.equal(r.marks.meter, null);
  assert.ok(factOf('m68', true).includes('8분음표가 6개') && factOf('m68', true).includes('넷째'));
  assert.ok(factOf('m34', false, { meter: [6, 8] }).startsWith('8분의 6박자'));
});

ok('못갖춘마디 — 첫 마디가 한 박 · 마디줄이 한 박 뒤로 · 센박 자리가 바뀜 · 끝 마디가 그만큼 짧음', () => {
  assert.equal(signById('pickup').phrase, 'haenschen');
  for (const ph of [ode, auclair, frere, rowrow]) { const r = toggle(ph, E(), 'pickup'); assert.ok(r.blocked && r.note.includes('못갖춘마디'), ph.id); }
  const base = perform(haenschen, E(), { beat: true });
  let r = toggle(haenschen, E(), 'pickup');
  assert.ok(r.on && !r.note && has(r.marks, 'pickup'));
  assert.equal(countMarks(r.marks), 1);
  const b = build(haenschen, r.marks);
  assert.deepEqual(b.B.map(x => x.len), [12, 24, 24, 24, 12]);
  assert.equal(b.B[0].len + b.B[4].len, 24, '첫 마디 + 끝 마디 = 한 마디');
  const p = perform(haenschen, r.marks, { beat: true });
  assert.deepEqual(p.events.filter(e => e.drum === 'kick').map(e => e.tick), [12, 36, 60, 84], '센박이 한 박 뒤로');
  assert.equal(p.events.find(e => e.kind === 'drum').drum, 'hat', '첫 박은 여린박');
  assert.ok(near(notes(p)[0].vel, LV0 * 0.85) && near(notes(p)[2].vel, LV0 * 1.3), '첫 음 여리게 · 셋째 음(둘째 마디 첫 음) 세게');
  assert.deepEqual(notes(p).map(e => e.t), notes(base).map(e => e.t), '음의 때는 같음');
  assert.deepEqual(scoreOf(haenschen, r.marks).score.barLens, [4, 8, 8, 8, 4]);
  // 빼면 처음과 같음
  const off = toggle(haenschen, r.marks, 'pickup');
  assert.equal(off.on, false); assert.equal(off.marks.pickup, null);
  assert.deepEqual(perform(haenschen, off.marks, { beat: true }), base);
  assert.equal(sv(haenschen, off.marks), sv(haenschen, E()));
  // 마디에 넣은 기호는 빠지고 까닭을 말함 · 음에 넣은 기호는 그대로
  let m = put(haenschen, put(haenschen, E(), 'cresc', 1), 'accent', 2);
  r = toggle(haenschen, m, 'pickup');
  assert.ok(r.note && r.note.includes('마디')); assert.deepEqual(r.marks.hair, {}); assert.ok(r.marks.accent[2]);
  // 박자표를 바꿔도 맞으면 못갖춘마디는 그대로(4분의 4박자 — 한 박 · 네 박 · 세 박)
  r = toggle(haenschen, toggle(haenschen, E(), 'pickup').marks, 'm44');
  assert.ok(r.marks.pickup); assert.deepEqual(build(haenschen, r.marks).B.map(x => x.len), [12, 48, 36]);
  // 못갖춘마디에서는 마디가 달라져 맞지 않게 된 길이 기호가 빠짐
  m = put(haenschen, E(), 'dot', 3);                                   // F D(24 · 30) → 못갖춘마디 뒤에도 한 박 안
  r = toggle(haenschen, m, 'pickup');
  assert.ok(r.marks.dot[3], '박 자리가 그대로면 남음');
  m = put(haenschen, E(), 'dot', 0);                                   // G E(0 · 6) — 못갖춘 첫 마디(한 박) 안
  assert.ok(toggle(haenschen, m, 'pickup').marks.dot[0]);
});

ok('바뀌는 박자 — 고른 마디부터 새 박자표 · 센박이 따라감', () => {
  assert.deepEqual(places(frere, E(), 'mixed'), [2, 3, 4], '뒤가 새 박자로 딱 떨어지는 마디만');
  assert.deepEqual(places(rowrow, E(), 'mixed'), [], '8분의 6박자에는 넣지 않음');
  const base = perform(frere, E(), { beat: true });
  let r = toggle(frere, E(), 'mixed', 3);
  assert.deepEqual(r.marks.mixed, { bar: 3, meter: [3, 4] }); assert.deepEqual(r.meter, [3, 4]);
  assert.ok(factOf('mixed', true, r).includes('4번째 마디부터 4분의 3박자'));
  assert.deepEqual(build(frere, r.marks).B.map(x => x.len), [24, 24, 24, 36, 36]);
  const p = perform(frere, r.marks, { beat: true });
  assert.deepEqual(p.events.filter(e => e.drum === 'kick').map(e => e.tick), [0, 24, 48, 72, 108]);
  assert.deepEqual(notes(p).map(e => e.t), notes(base).map(e => e.t), '음의 때는 같음');
  const sc = scoreOf(frere, r.marks).score;
  assert.deepEqual(sc.tsAt, [{ bar: 3, ts: [3, 4] }]); assert.deepEqual(sc.barLens, [8, 8, 8, 12, 12]);
  // 다른 마디로 옮김(하나만) · 같은 마디를 또 누르면 빠짐
  r = toggle(frere, r.marks, 'mixed', 2);
  assert.deepEqual(r.marks.mixed, { bar: 2, meter: [4, 4] });
  r = toggle(frere, r.marks, 'mixed', 2);
  assert.equal(r.marks.mixed, null); assert.ok(!r.note);
  assert.deepEqual(perform(frere, r.marks, { beat: true }), base);
  // 4분의 3박자 → 4분의 2박자(설계서의 보기)
  const m3 = toggle(frere, E(), 'm34').marks;
  assert.deepEqual(places(frere, m3, 'mixed'), [2]);
  assert.deepEqual(toggle(frere, m3, 'mixed', 2).marks.mixed, { bar: 2, meter: [2, 4] });
  // 박자표를 바꾸면 바뀌는 박자도 마디 기호처럼 빠짐
  r = toggle(frere, toggle(frere, E(), 'mixed', 3).marks, 'm34');
  assert.equal(r.marks.mixed, null); assert.ok(r.note && r.note.includes('마디'));
  assert.equal(toggle(frere, E(), 'mixed', 1).blocked, true);
  // 마디가 달라져 짝이 두 마디로 갈린 당김음은 빠지고 까닭을 말함 · 같은 마디에 남으면 그대로
  r = toggle(frere, put(frere, E(), 'sync', 2), 'm34');
  assert.equal(r.marks.sync[2], undefined); assert.ok(r.note.includes('길이 기호'));
  r = toggle(frere, put(frere, E(), 'sync', 4), 'm34');
  assert.ok(r.marks.sync[4] && !r.note);
  r = toggle(frere, put(frere, E(), 'sync', 2), 'mixed', 3);
  assert.ok(r.marks.sync[2], '바뀌기 앞 마디의 기호는 그대로');
});

ok('새 기호 모두 — 넣으면 소리가 달라지고, 한 번 더 누르면 처음과 똑같음 · 마디 길이 그대로', () => {
  let tried = 0;
  for (const ph of PHRASES) {
    const b0 = perform(ph, E(), { beat: true }), s0 = sv(ph, E());
    for (const id of [...LEN_KINDS, 'mixed']) for (const at of places(ph, E(), id)) {
      const on = put(ph, E(), id, at), off = put(ph, on, id, at);
      const pOn = perform(ph, on, { beat: true });
      const sig = r => JSON.stringify(r.events.map(e => [e.kind, +e.t.toFixed(6), +(e.d || 0).toFixed(6), +e.vel.toFixed(6)]));
      assert.notEqual(sig(pOn), sig(b0), `${ph.id} ${id}@${at} 달라짐`);
      assert.deepEqual(perform(ph, off, { beat: true }), b0, `${ph.id} ${id}@${at} 빼면 같음`);
      assert.deepEqual(perform(ph, off), perform(ph, E()));
      assert.equal(sv(ph, off), s0, `${ph.id} ${id}@${at} 악보도 같음`);
      assert.equal(countMarks(off), 0); assert.equal(countMarks(on), 1);
      if (id !== 'mixed') assert.deepEqual(barSums(ph, on), barSums(ph, E()), `${ph.id} ${id}@${at} 마디 길이`);
      tried++;
    }
    for (const id of ['pickup', 'm68']) {
      const r = toggle(ph, E(), id);
      if (r.blocked || hasMeter(ph, E(), id)) continue;
      assert.deepEqual(perform(ph, toggle(ph, r.marks, id).marks, { beat: true }), b0, `${ph.id} ${id} 빼면 같음`);
      tried++;
    }
  }
  assert.ok(tried > 100, String(tried));
});

ok('새 기호를 섞어도 사건은 시간순 · 범위 안', () => {
  let m = E();
  for (const [id, at] of [['dot', 0], ['six', 2], ['sync', 6], ['trip', 9], ['p', 0], ['accent', 2], ['stacc', 9], ['fermata', 4], ['rest', 3], ['cresc', 1], ['rit', 2], ['repeat', 1]]) m = put(auclair, m, id, at);
  for (const beat of [false, true]) {
    const r = perform(auclair, m, { beat });
    for (let k = 1; k < r.events.length; k++) assert.ok(r.events[k].t >= r.events[k - 1].t);
    for (const e of r.events) { assert.ok(Number.isFinite(e.t) && e.t >= 0); if (e.kind === 'note') { assert.ok(e.vel >= 0.08 && e.vel <= 1.45); assert.ok(e.d > 0); } }
  }
  const { score, model } = scoreOf(auclair, m);
  const ev = score.staves[0].voices[0].events;
  for (let k = 1; k < ev.length; k++) assert.ok(ev[k].s >= ev[k - 1].s + ev[k - 1].d - 1e-9, '겹치지 않음');
  assert.equal(new Set(ev.flatMap(e => (e.tri ? e.tri.map(q => q.i) : [e.i]))).size, ev.reduce((s, e) => s + (e.tri ? e.tri.length : 1), 0), '조각 id가 겹치지 않음');
  assert.equal(model.B.length, 4);
  assert.equal(countMarks(m), 12);
});

// ══ D1 × D2 — 기호를 섞어도 깨지지 않음(합치기 11-14) ══════════════════════
ok('섞기 — 8분의 6박자 가락에 조 옮기기 · 북 반주', () => {
  assert.equal(keyShift(rowrow), 7);
  const base = perform(rowrow, E()), m = put(rowrow, E(), 'up'), r = perform(rowrow, m);
  assert.deepEqual(r.events.map(e => e.p), base.events.map(e => e.p + 7));
  assert.deepEqual(r.events.map(e => e.t), base.events.map(e => e.t));
  const sc = scoreOf(rowrow, m).score;
  assert.equal(sc.sub, 6); assert.deepEqual(sc.ksig, [8]); assert.equal(sc.staves[0].words, 'lab');
  assert.equal(sc.staves[0].voices[0].events.map(e => e.lab).join(''), '도도도솔솔솔미미미도도도솔파미레도', '계이름 그대로');
  const d = part(perform(rowrow, put(rowrow, E(), 'drum')), 'drum');
  assert.deepEqual(d.map(e => [e.tick, e.drum]), [[0, 'bassdrum'], [18, 'snare'], [36, 'bassdrum'], [54, 'snare'], [72, 'bassdrum'], [90, 'snare'], [108, 'bassdrum'], [126, 'snare']], '점4분 박마다 쿵 짝');
  const ds = scoreOf(rowrow, put(rowrow, E(), 'drum')).score.staves[1].voices[0].events;
  assert.ok(ds.every(e => e.d === 6), '북 줄도 점4분음표');
  assert.deepEqual(perform(rowrow, toggle(rowrow, m, 'up').marks), base);
});

ok('섞기 — 셋잇단 · 16분음표 음에 임시표 · 둘째 줄', () => {
  // auclair = 도도도레 | 미 레 | 도미레레 | 도.
  let m = put(auclair, put(auclair, E(), 'trip', 0), 'sharp', 0);
  let b = build(auclair, m);
  assert.deepEqual(b.notes[0].parts.map(q => q.p), [61, 61, 61], '셋잇단 세 음 모두 도#');
  assert.deepEqual([b.notes[1].p, b.notes[2].p, b.notes[3].p], [61, 61, 62], '같은 마디 뒤의 도도 도#(효력)');
  assert.deepEqual(notes(perform(auclair, m)).slice(0, 5).map(e => e.p), [61, 61, 61, 61, 61]);
  let ev = scoreOf(auclair, m).score.staves[0].voices[0].events;
  assert.deepEqual(ev[0].tri.map(q => [q.pos, q.acc]), [[-2, '♯'], [-2, ''], [-2, '']], '셋잇단 첫 음에만 ♯');
  assert.equal(ev[0].lab, '도#');
  assert.equal(ev[1].sp[0].acc, '', '뒤 도에는 ♯을 다시 적지 않음');
  assert.deepEqual(toggle(auclair, m, 'sharp', 0).marks, put(auclair, E(), 'trip', 0));
  m = put(auclair, put(auclair, E(), 'six', 3), 'flat', 3);
  b = build(auclair, m);
  assert.deepEqual(b.notes[3].parts.map(q => q.p), [61, 61, 61, 61], '16분음표 넷 모두 레♭');
  ev = scoreOf(auclair, m).score.staves[0].voices[0].events.filter(e => parseInt(e.i, 10) === 3);
  assert.deepEqual(ev.map(e => [e.sp[0].pos, e.sp[0].acc]), [[-1, '♭'], [-1, ''], [-1, ''], [-1, '']], '레 자리 · ♭은 첫 음에만');
  // 둘째 줄도 조각을 따라감
  m = put(auclair, put(auclair, E(), 'trip', 0), 'second');
  const sec = part(perform(auclair, m), 'second');
  assert.deepEqual(sec.slice(0, 3).map(e => [e.p, e.tick]), [[57, 0], [57, 4], [57, 8]]);
  const low = scoreOf(auclair, m).score.staves[1].voices[0].events;
  assert.equal(low[0].tri.length, 3, '아래 오선에도 셋잇단');
});

ok('섞기 — 바뀌는 박자 + 도돌이표 · 1 · 2번 괄호 · 북 반주', () => {
  let m = put(frere, E(), 'mixed', 2);
  assert.deepEqual(build(frere, m).B.map(x => x.len), [24, 24, 48, 48]);
  const r = put(frere, m, 'repeat', 2);
  assert.deepEqual(orderOf(frere, r), [0, 1, 2, 0, 1, 2, 3]);
  assert.equal(perform(frere, r).segs[0].b, 96, '바뀐 마디 끝(4분의 4박자 마디)까지 가서 돌아감');
  assert.deepEqual(orderOf(frere, put(frere, m, 'volta', 2)), [0, 1, 2, 0, 1, 3]);
  const d = part(perform(frere, put(frere, m, 'drum')), 'drum').map(e => e.drum[0]);
  assert.equal(d.join(''), 'bsbs' + 'bsbs' + 'bsbs', '2/4 쿵짝 쿵짝 → 4/4 쿵짝쿵짝');
  // 화음 · D.C. · Fine을 넣은 뒤 바뀌는 박자를 넣으면 마디에 넣은 기호는 빠짐
  const t = toggle(frere, put(frere, put(frere, E(), 'I', 1), 'dc', 5), 'mixed', 2);
  assert.deepEqual([t.marks.chord, t.marks.dc], [{}, null]); assert.ok(/마디/.test(t.note));
});

ok('섞기 — 못갖춘마디 + 북 반주 · 화음 · D.C. · Fine', () => {
  const m = put(haenschen, E(), 'pickup');
  const d = part(perform(haenschen, put(haenschen, m, 'drum')), 'drum');
  assert.deepEqual(d.slice(0, 3).map(e => [e.tick, e.drum]), [[0, 'snare'], [12, 'bassdrum'], [24, 'snare']], '여린박으로 시작(작은북) → 첫 센박 큰북');
  const sec = 60 / haenschen.tempo / 12;
  const c = part(perform(haenschen, put(haenschen, m, 'I', 0)), 'chord');
  assert.ok(near(c[0].d, 12 * sec * 0.92), '못갖춘 첫 마디의 화음은 한 박');
  const c1 = part(perform(haenschen, put(haenschen, m, 'I', 1)), 'chord');
  assert.ok(near(c1[0].t, 12 * sec) && near(c1[0].d, 24 * sec * 0.92));
  assert.deepEqual(places(haenschen, m, 'dc'), [4]);
  assert.deepEqual(orderOf(haenschen, put(haenschen, put(haenschen, m, 'dc', 4), 'fine', 3)), [0, 1, 2, 3, 4, 0, 1, 2, 3]);
  const dsc = scoreOf(haenschen, put(haenschen, m, 'drum')).score.staves[1].voices[0].events;
  assert.equal(dsc.map(e => e.lab).join(''), '짝쿵짝쿵짝쿵짝쿵', '북 줄도 못갖춘마디대로');
});

ok('섞기 — 점음표 · 당김음에 조 옮기기 · 사건은 시간순', () => {
  let m = put(ode, put(ode, E(), 'dot', 0), 'up');
  assert.deepEqual(build(ode, m).parts.map(q => q.p), build(ode, put(ode, E(), 'dot', 0)).parts.map(q => q.p + 7));
  m = put(ode, put(ode, put(ode, put(ode, E(), 'sync', 4), 'up'), 'second'), 'drum');
  m = put(ode, m, 'sharp', 8);
  const r = perform(ode, m, { beat: true });
  for (let k = 1; k < r.events.length; k++) assert.ok(r.events[k].t >= r.events[k - 1].t);
  for (const e of r.events) { assert.ok(Number.isFinite(e.t) && e.t >= 0); if (e.kind === 'note') assert.ok(e.d > 0 && e.vel > 0); }
  const sc = scoreOf(ode, m).score;
  assert.equal(sc.staves.length, 3);
  assert.ok(sc.staves[0].voices[0].events.some(e => e.whole), '당김음 가운데 4분음표는 그대로');
});

console.log(`✓ 악보 판 규칙 시험 통과 — ${n}묶음 · 기호 ${SIGNS.length}개 · 가락 ${PHRASES.length}도막`);
