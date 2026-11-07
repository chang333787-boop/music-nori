// 엔진 시험 — 틱 · 곡 적는 법 · 마디 채우기 · 박 판정(자동 연주) · 지연 재기. node만으로 돈다.
import assert from 'node:assert/strict';
import * as T from '../engine/theory.js';
import { parseMel, makeSong, sounding, toEvents, beatTimes, toStaffSong } from '../engine/song.js';
import { fillBar, fractionText, countFills } from '../engine/measure.js';
import { windows, judgeTaps, score, estimateLatency, BANDS } from '../engine/judge.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; };

// ── 틱 ──
ok('길이', () => {
  assert.equal(T.durTicks('q'), 12); assert.equal(T.durTicks('h.'), 36); assert.equal(T.durTicks('et'), 4);
  assert.equal(T.durTicks('s'), 3); assert.equal(T.durTicks('x'), null); assert.equal(T.durTicks('s.'), null);
  assert.equal(T.durCode(36), 'h.'); assert.equal(T.durCode(4), 'et');
});
ok('박자표', () => {
  assert.equal(T.barTicks([4, 4]), 48); assert.equal(T.barTicks([3, 4]), 36); assert.equal(T.barTicks([6, 8]), 36);
  assert.equal(T.beatsPerBar([6, 8]), 2); assert.equal(T.beatTicks([6, 8]), 18); assert.equal(T.beatsPerBar([2, 4]), 2);
  assert.deepEqual(T.accents([4, 4]), [1, 0, 0.5, 0]); assert.deepEqual(T.accents([3, 4]), [1, 0, 0]);
  assert.deepEqual(T.fractionOf(24), [2, 4]); assert.equal(T.fractionOf(6), null); assert.deepEqual(T.fractionOf(6, 8), [1, 8]);
});

// ── 곡 적는 법 ──
ok('마디 맞음', () => {
  const r = parseMel('G4q E4q G4q E4q | G4e G4e E4q G4h', [4, 4]);
  assert.deepEqual(r.errors, []); assert.equal(r.total, 96); assert.equal(r.bars.length, 2); assert.equal(r.pickup, 0);
});
ok('마디 넘침·모자람을 잡음', () => {
  assert.equal(parseMel('G4q G4q G4q G4q G4q | G4w', [4, 4]).errors.length, 1);
  assert.equal(parseMel('G4w | G4h G4q', [4, 4]).errors.length, 1);
  assert.equal(parseMel('Z4q', [4, 4]).errors.length, 1);
  assert.equal(parseMel('G4q !zz G4h.', [4, 4]).errors.length, 1);
});
ok('못갖춘마디', () => {
  const r = parseMel('G4q | C5h G4q | C5h', [3, 4]);
  assert.equal(r.pickup, 12); assert.deepEqual(r.errors, []);
  const bt = beatTimes(makeSong({ mel: 'G4q | C5h G4q | C5h', meter: [3, 4], tempo: 60 }));
  assert.equal(bt[0].t, -2); assert.equal(bt[2].t, 0); assert.ok(!bt[2].down); assert.ok(bt[3].down);
});
ok('붙임줄 합치기', () => {
  const s = makeSong({ mel: 'G4h G4h~ | G4q E4q E4h', meter: [4, 4] });
  assert.deepEqual(s.errors, []);
  const so = sounding(s);
  assert.equal(so.length, 4); assert.equal(so[1].d, 36);
  assert.equal(parseMel('G4h~ E4h | G4w').errors.length, 1);
});
ok('셈여림 → 세기', () => {
  const so = sounding(makeSong({ mel: '!p G4q G4q !f G4q G4q' }));
  assert.equal(so[0].vel, 0.5); assert.equal(so[3].vel, 0.9);
});
ok('소리 사건 · 박 시각', () => {
  const s = makeSong({ mel: 'C4q D4q E4h', tempo: 120 });
  const { events, total } = toEvents(s, { inst: 'xylo' });
  assert.equal(events.length, 3); assert.equal(events[1].t, 0.5); assert.equal(total, 2);
  assert.deepEqual(beatTimes(s).map(b => b.t), [0, 0.5, 1, 1.5]);
});
ok('오선 그리기용 모양', () => {
  const a = toStaffSong(makeSong({ mel: 'C4q D4e E4e F4h | G4w' }));
  assert.equal(a.sub, 4); assert.equal(a.beats, 4); assert.equal(a.bars, 2);
  assert.deepEqual(a.notes.map(x => [x.s, x.d]), [[0, 4], [4, 2], [6, 2], [8, 8], [16, 16]]);
  const b = toStaffSong(makeSong({ mel: 'C4q. D4q. | E4h.', meter: [6, 8] }));
  assert.equal(b.sub, 3); assert.equal(b.beats, 2); assert.deepEqual(b.notes.map(x => [x.s, x.d]), [[0, 3], [3, 3], [6, 6]]);
  const c = toStaffSong(makeSong({ mel: 'G4q | C5h G4q | C5h', meter: [3, 4] }));
  assert.equal(c.notes[0].s, 8);
});

// ── 마디 채우기 ──
ok('마디 채우기', () => {
  const f = fillBar([12, 12, 24]);
  assert.ok(f.full); assert.equal(f.over, 0); assert.deepEqual(f.cells, [1, 1, 1, 1]);
  const g = fillBar([24, 36]);
  assert.equal(g.over, 12); assert.ok(g.blocks[1].over); assert.deepEqual(g.cells, [1, 1, 1, 1]);
  const k = fillBar([12, 6]);
  assert.equal(k.left, 30); assert.deepEqual(k.cells, [1, 0.5, 0, 0]);
  assert.ok(fillBar([12, 12, 12], [3, 4]).full);
});
ok('분수 보기', () => {
  assert.equal(fractionText([12, 12, 24], 4), '1/4 + 1/4 + 2/4 = 4/4');
  assert.equal(fractionText([12, 6, 6, 24], 4), null);
  assert.equal(fractionText([12, 6, 6, 24], 5), '1/4 + 1/8 + 1/8 + 1/2 = 8/8');
});
ok('채우는 방법 수', () => {
  assert.equal(countFills([12], [4, 4]), 1);
  assert.equal(countFills([12, 24], [4, 4]), 5);      // 4분 넷 · 2분 둘 · 2분+4분+4분 세 가지
  assert.equal(countFills([12, 24, 48], [4, 4]), 6);
});

// ── 박 판정 ──
ok('판정 창', () => {
  assert.deepEqual(windows('low'), { early: 150, late: 180, great: 70 });
  assert.deepEqual(windows('mid', 300), { early: 105, late: 105, great: 55 });   // 8분음표 300ms → 35% = 105
  assert.equal(windows('high').early, 100);
});
const beats = (n, ioi = 600, at = 1000) => Array.from({ length: n }, (_, i) => at + i * ioi);
ok('자동 연주 — 딱 맞게', () => {
  for (const band of Object.keys(BANDS)) {
    const e = beats(16), r = judgeTaps(e, e, { band });
    assert.equal(r.kept, 14); assert.equal(r.great, 14); assert.equal(r.stars, 3); assert.equal(r.streak, 14); assert.equal(r.extra, 0);
  }
});
ok('자동 연주 — 기기 지연을 빼면 딱', () => {
  const e = beats(12), taps = e.map(t => t + 90);
  assert.equal(judgeTaps(e, taps, { band: 'high', latency: 90 }).great, 10);
  assert.equal(judgeTaps(e, taps, { band: 'high', latency: 0 }).great, 0);
});
ok('자동 연주 — 창 끝', () => {
  for (const [band, b] of Object.entries(BANDS)) {
    const e = beats(6);
    assert.equal(judgeTaps(e, e.map(t => t - b.ok + 1), { band, skip: 0 }).kept, 6, band + ' 이른 쪽 안');
    assert.equal(judgeTaps(e, e.map(t => t - b.ok - 1), { band, skip: 0 }).kept, 0, band + ' 이른 쪽 밖');
    assert.equal(judgeTaps(e, e.map(t => t + b.okLate - 1), { band, skip: 0 }).kept, 6, band + ' 늦은 쪽 안');
    assert.equal(judgeTaps(e, e.map(t => t + b.okLate + 1), { band, skip: 0 }).kept, 0, band + ' 늦은 쪽 밖');
    assert.equal(judgeTaps(e, e.map(t => t + b.great), { band, skip: 0 }).great, 6, band + ' 딱 끝');
  }
  const e = beats(4);
  assert.equal(judgeTaps(e, e.map(t => t + 170), { band: 'low', skip: 0 }).kept, 4);   // 1~2학년은 늦은 쪽 +180까지
  assert.equal(judgeTaps(e, e.map(t => t + 170), { band: 'mid', skip: 0 }).kept, 0);
});
ok('자동 연주 — 한 번 놓쳐도 이어 지킨 박', () => {
  const e = beats(14), taps = e.filter((_, i) => i !== 7);
  const r = judgeTaps(e, taps, { band: 'mid' });
  assert.equal(r.kept, 11); assert.equal(r.streak, 6); assert.deepEqual(r.starOn, [true, false, false]); assert.equal(r.stars, 1);
  assert.equal(score(['miss', 'miss', 'ok']).stars, 0);
  assert.deepEqual(score([...Array(9).fill('ok'), 'miss', 'ok']).starOn, [true, true, false]);
  assert.deepEqual(score(['ok', 'great', 'ok']).starOn, [true, true, true]);
});
ok('자동 연주 — 두드림 하나가 박 둘을 맞히지 않음 · 남는 두드림', () => {
  const e = [1000, 1100], r = judgeTaps(e, [1050], { band: 'low', skip: 0, minIOI: 1000 });
  assert.equal(r.kept, 1);
  const r2 = judgeTaps(beats(4), [...beats(4), 1300, 2500], { band: 'mid', skip: 0 });
  assert.equal(r2.kept, 4); assert.equal(r2.extra, 2);
});
ok('자동 연주 — 아이 흔들림 흉내(재현되는 난수)', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const e = beats(26, 600);
  const r = judgeTaps(e, e.map(t => t + gauss() * 40), { band: 'mid' });
  assert.ok(r.rate >= 0.95, '흔들림 40ms 아이는 거의 다 지킴: ' + r.rate);
});

// ── 지연 재기 ──
ok('지연 재기', () => {
  const clicks = beats(8, 667, 2000);
  const a = estimateLatency(clicks, clicks.map((c, i) => c + 80 + (i % 2 ? 6 : -6)));
  assert.ok(a.ok); assert.equal(a.ms, 80); assert.equal(a.n, 8);
  const b = estimateLatency(clicks, [...clicks.map(c => c + 60).slice(0, 7), clicks[7] + 300]);
  assert.ok(b.ok); assert.equal(b.ms, 60); assert.equal(b.n, 7);
  assert.equal(estimateLatency(clicks, clicks.slice(0, 3)).ok, false);
  const c = estimateLatency(clicks, clicks.map((x, i) => x + [0, 100, -90, 110, -100, 95, -80, 105][i]));
  assert.equal(c.ok, false);
});

console.log(`✓ 엔진 시험 ${n}개 통과`);
