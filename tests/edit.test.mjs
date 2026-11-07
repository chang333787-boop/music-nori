// 놀이터 편집 엔진 시험 — engine/edit.js. node만으로 돈다(의존성 X): node tests/edit.test.mjs
import assert from 'node:assert/strict';
import { makeSong, sounding, toStaffSong } from '../engine/song.js';
import { barTicks } from '../engine/theory.js';
import { SONGS, songById } from '../engine/songs/index.js';
import * as E from '../engine/edit.js';

let n = 0;
const ok = (name, fn) => {
  try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; }
};
const song = id => makeSong(songById(id));
const S = (mel, meter = [4, 4]) => makeSong({ mel, meter, tempo: 100 });
const pitches = s => s.ev.map(e => e.p);
const durs = s => s.ev.map(e => e.d);
const snap = s => JSON.stringify(s);
// 왕복: 곡을 글 한 줄로 적었다가 다시 만들면 같은 곡(글 자체만 빼고)
const strip = ({ mel, ...rest }) => rest;
const roundTrip = s => assert.deepEqual(strip(makeSong({ ...s, mel: E.toMel(s) })), strip(s));
// 박 · 높이를 뺀 오류(적는 법 · 붙임줄)가 없어야 — 마디 길이 오류는 넘침 · 모자람이라 있을 수 있음
const noParseErr = s => assert.deepEqual(s.errors.filter(m => !/마디:/.test(m)), [], s.errors.join(' / '));

const INSA = 'G4h E4h | G4q G4q E4h | E4q G4q E4q G4q | E4h Rh';   // 솔미 인사(처음 곡)

// ── 읽기 ──
ok('마디 묶음 · 덩어리 · 마디 상태', () => {
  const s = S(INSA);
  const G = E.groupsOf(s);
  assert.equal(G.length, 4);
  assert.deepEqual(G.map(g => g.length), [2, 3, 4, 2]);
  assert.equal(G[3][1].p, null);
  const U = E.unitsOf(s);
  assert.equal(U.length, 11);
  assert.deepEqual(U[2], { i0: 2, i1: 2, t: 48, d: 12, p: 67, dyn: 'mf', b0: 1, b1: 1 });
  const B = E.bars(s);
  assert.deepEqual(B.map(b => [b.start, b.ticks, b.over, b.left]), [[0, 48, 0, 0], [48, 48, 0, 0], [96, 48, 0, 0], [144, 48, 0, 0]]);
  assert.deepEqual(B.map(b => [b.first, b.last]), [[0, 1], [2, 4], [5, 8], [9, 10]]);
  assert.equal(E.problems(s).length, 0);
  assert.equal(E.indexAtTick(s, 50), 2);
  assert.equal(E.indexAtTick(s, 999), -1);
});

ok('toMel 왕복 — 앱 곡 모두(셈여림 · 못갖춘마디 · 6/8 · 16분 · 점음표)', () => {
  for (const def of SONGS) {
    const s = makeSong(def);
    roundTrip(s);
    assert.deepEqual(makeSong({ ...s, mel: E.toMel(s) }).errors, s.errors, def.id);
  }
  assert.ok(E.toMel(song('haydn94')).startsWith('!p '));
  assert.ok(E.toMel(song('haydn94')).includes('!ff G5q'));
  assert.equal(E.toMel(S(INSA)), INSA);
});

ok('음계 한 칸', () => {
  assert.equal(E.stepScale(64, 1), 65);  // 미 → 파
  assert.equal(E.stepScale(71, 1), 72);  // 시 → 높은 도
  assert.equal(E.stepScale(60, -1), 59); // 도 → 낮은 시
  assert.equal(E.stepScale(66, 1), 67);  // 파# → 솔
  assert.equal(E.stepScale(66, -1), 65); // 파# → 파
  assert.equal(E.stepScale(70, -1), 69); // 시♭ → 라
});

// ── 높이 ──
ok('셋째 음 한 칸 높게 — 다른 것은 그대로 · 원래 곡은 안 바뀜', () => {
  const s = S(INSA), before = snap(s);
  const t = E.stepPitch(s, 2, +1);
  assert.equal(snap(s), before);
  assert.equal(t.ev[2].p, 69);
  assert.deepEqual(pitches(t).filter((_, k) => k !== 2), pitches(s).filter((_, k) => k !== 2));
  assert.deepEqual(durs(t), durs(s));
  assert.deepEqual(t.bars, s.bars);
  assert.equal(E.stepPitch(t, 2, -1).ev[2].p, 67);
  roundTrip(t);
});
ok('높이 경계 — 첫 음 · 끝 음 · C4 아래 · E6 위 · 쉼표 · 0', () => {
  const s = S('C4q E6q G4q Rq');
  assert.equal(E.stepPitch(s, 0, -1), s);            // C4 아래로는 그대로
  assert.equal(E.stepPitch(s, 1, +1), s);            // E6 위로는 그대로
  assert.equal(E.stepPitch(s, 0, +1).ev[0].p, 62);   // 첫 음은 오를 수 있음
  assert.equal(E.stepPitch(s, 1, -1).ev[1].p, 86);   // E6 → D6
  assert.equal(E.stepPitch(s, 3, +1), s);            // 쉼표
  assert.equal(E.stepPitch(s, 2, 0), s);
  assert.equal(E.stepPitch(s, 9, 1), s);             // 없는 음
  const last = S(INSA);
  assert.equal(E.stepPitch(last, 9, -1).ev[9].p, 62); // 끝 음(미 → 레)
  // 화면 범위(낮은 솔 ~ 높은 미)를 넘겨줄 수 있다
  const low = S('G3q A3q B3q C4q');
  assert.equal(E.stepPitch(low, 0, -1, { lo: 55, hi: 76 }), low);
  assert.equal(E.stepPitch(low, 3, -1, { lo: 55, hi: 76 }).ev[3].p, 59);
  assert.equal(E.stepPitch(S('E5w'), 0, +1, { lo: 55, hi: 76 }).ev[0].p, 76);   // 높은 미 위는 그대로
});

// ── 길이 ──
ok('음 하나를 길게 — 뒤 음이 밀리고 그 마디만 넘침(1박)', () => {
  const s = S(INSA);
  const t = E.setDur(s, 8, 24);               // 셋째 마디 마지막 음(솔 4분 → 2분)
  assert.equal(t.ev[8].d, 24);
  assert.equal(t.total, s.total + 12);
  const B = E.bars(t);
  assert.deepEqual(B.map(b => b.over), [0, 0, 12, 0]);
  assert.equal(B[3].start, 156);              // 넷째 마디가 1박 늦게 시작(밀린 소리)
  assert.equal(E.problems(t).length, 1);
  assert.equal(t.errors.length, 1);           // makeSong 마디 검사도 같은 곳을 잡음
  roundTrip(t);
  assert.equal(E.setDur(s, 8, 12), s);        // 같은 길이 = 그대로
  assert.equal(E.setDur(s, 99, 24), s);
  assert.equal(E.setDur(s, 0, 0), s);
});
ok('음 하나를 짧게 — 그 마디가 모자람', () => {
  const t = E.setDur(S(INSA), 0, 12);
  assert.deepEqual(E.bars(t).map(b => b.left), [12, 0, 0, 0]);
  assert.equal(t.ev[1].t, 12);                // 같은 마디 뒤 음이 당겨짐
  roundTrip(t);
});
ok('넘친 마디가 여럿 · 넘침과 모자람이 같이', () => {
  let t = E.setDur(S(INSA), 2, 24);
  t = E.setDur(t, 6, 24);   // 셋째 마디 둘째 음
  t = E.setDur(t, 9, 12);   // 넷째 마디 첫 음(미 2분 → 4분)
  assert.deepEqual(E.bars(t).map(b => [b.over, b.left]), [[0, 0], [12, 0], [12, 0], [0, 12]]);
  assert.equal(E.problems(t).length, 3);
  roundTrip(t);
});
ok('3/4에서 2분음표 · 점2분음표 · 온음표', () => {
  const s = song('ri5-waltz');             // C4q G4q G4q | … | C4h.
  const a = E.setDur(s, 0, 24);
  assert.deepEqual(E.bars(a).map(b => b.over), [12, 0, 0, 0]);
  const b = E.setDur(s, 0, 36);
  assert.deepEqual(E.bars(b).map(b => b.over), [24, 0, 0, 0]);
  const c = E.setDur(s, 9, 48);            // 끝 점2분 → 온음표: 끝 마디가 1박 넘침
  assert.deepEqual(E.bars(c).map(b => b.over), [0, 0, 0, 12]);
  const d = E.setDur(s, 9, 24);            // 끝 점2분 → 2분: 끝 마디 1박 모자람
  assert.deepEqual(E.bars(d).map(b => b.left), [0, 0, 0, 12]);
  for (const x of [a, b, c, d]) { roundTrip(x); noParseErr(x); }
});
ok('길이 차례(◀▶)', () => {
  assert.equal(E.nextLen(12, 1), 24); assert.equal(E.nextLen(12, -1), 6);
  assert.equal(E.nextLen(6, -1), 6); assert.equal(E.nextLen(48, 1), 48);
  assert.equal(E.nextLen(18, 1), 24); assert.equal(E.nextLen(18, -1), 12);   // 점4분처럼 차례에 없는 길이
  assert.equal(E.nextLen(36, 1), 48); assert.equal(E.nextLen(36, -1), 24);
});

// ── 쉼표 ──
ok('음표 ↔ 쉼표 — 박은 그대로', () => {
  const s = S(INSA);
  const t = E.toggleRest(s, 2);            // 둘째 마디 첫 음
  assert.equal(t.ev[2].p, null);
  assert.equal(t.ev[2].d, 12);
  assert.equal(t.total, s.total);
  assert.deepEqual(t.bars, s.bars);
  assert.equal(E.toggleRest(t, 2).ev[2].p, 64);   // 다시 음으로 = 앞 음(미) 높이
  roundTrip(t);
});
ok('쉼표 → 음: 높이를 주면 그 높이 · 없으면 앞 음 · 앞에 없으면 뒤 음 · 아무도 없으면 솔', () => {
  const s = S(INSA);
  assert.equal(E.toggleRest(s, 10).ev[10].p, 64);       // 끝 쉼표 → 앞 음(미)
  assert.equal(E.toggleRest(s, 10, 72).ev[10].p, 72);
  assert.equal(E.toggleRest(S('Rq C4q G4h | C4w'), 0).ev[0].p, 60);
  assert.equal(E.toggleRest(S('Rw'), 0).ev[0].p, 67);
  assert.equal(E.neighborPitch(s, 2), 64);
});
ok('첫 음 · 끝 음을 쉼표로', () => {
  const s = S(INSA);
  const a = E.toggleRest(s, 0);
  assert.equal(a.ev[0].p, null); assert.equal(E.problems(a).length, 0);
  const b = E.toggleRest(s, 9);
  assert.equal(b.ev[9].p, null); assert.equal(b.ev[10].p, null);
  roundTrip(a); roundTrip(b);
});

// ── 넣기 · 빼기 ──
ok('쉼표 안에 넣기 = 쉼표를 메움(박 그대로)', () => {
  const s = S(INSA);
  const at = 144 + 24 + 12;                 // 끝 마디 2분쉼표의 뒤 반
  const t = E.insertNote(s, at, 69);
  assert.equal(E.insertTick(s, at), 180);
  assert.equal(t.total, s.total);
  assert.equal(E.problems(t).length, 0);
  const k = E.indexAtTick(t, 180);
  assert.equal(t.ev[k].p, 69); assert.equal(t.ev[k].d, 12);
  assert.equal(t.ev[k - 1].p, null);        // 앞에 4분쉼표가 남음
  roundTrip(t);
  // 8분 칸에 맞춤 · 쉼표가 4분보다 짧으면 그 길이만큼
  const e = E.insertNote(S('C4q Re C4e C4h'), 13, 64);
  assert.deepEqual(durs(e), [12, 6, 6, 24]);
  assert.equal(e.ev[1].p, 64);
  // 쉼표 끝에 붙어 있으면 앞으로 당겨 넣음
  const f = E.insertNote(S('C4h Rh'), 46, 64);
  assert.deepEqual(durs(f), [24, 12, 12]);
  assert.equal(f.ev[2].p, 64);
});
ok('음 안에 넣기 = 가까운 쪽 끝에 끼우고 뒤 음은 밀림(마디 넘침)', () => {
  const s = S(INSA);
  const front = E.insertNote(s, 49, 72);     // 둘째 마디 첫 음 앞 반 → 그 앞에
  assert.equal(E.insertTick(s, 49), 48);
  assert.equal(front.ev[2].p, 72); assert.equal(front.ev[3].p, 67);
  assert.deepEqual(E.bars(front).map(b => b.over), [0, 12, 0, 0]);
  const back = E.insertNote(s, 58, 72);      // 뒤 반 → 그 뒤에
  assert.equal(E.insertTick(s, 58), 60);
  assert.equal(back.ev[3].p, 72);
  const first = E.insertNote(s, 0, 60);      // 맨 첫 음 앞
  assert.equal(first.ev[0].p, 60); assert.equal(first.ev[0].t, 0);
  assert.deepEqual(E.bars(first).map(b => b.over), [12, 0, 0, 0]);
  for (const x of [front, back, first]) roundTrip(x);
});
ok('곡 끝 뒤에 넣기 — 끝 마디가 차 있으면 새 마디 · 모자라면 그 마디에', () => {
  const s = S(INSA);
  const a = E.insertNote(s, 500, 67);
  assert.equal(E.insertTick(s, 500), 192);
  assert.equal(a.bars.length, 5);
  assert.deepEqual(E.bars(a).map(b => b.left), [0, 0, 0, 0, 36]);
  const short = S('C4w | C4h');
  const b = E.insertNote(short, 999, 64);
  assert.equal(b.bars.length, 2);
  assert.deepEqual(E.bars(b).map(b => b.left), [0, 12]);
  const empty = makeSong({ mel: '', meter: [4, 4] });
  const c = E.insertNote(empty, 30, 65);
  assert.equal(c.ev.length, 1); assert.equal(c.ev[0].t, 0); assert.equal(c.ev[0].p, 65);
  assert.equal(E.insertTick(empty, 30), 0);
});
ok('모자란 마디 끝에 붙이기', () => {
  const t = E.setDur(S(INSA), 0, 12);
  const u = E.appendToBar(t, 0, 69);
  assert.equal(E.problems(u).length, 0);
  assert.equal(u.ev[2].p, 69);
  assert.equal(E.appendToBar(t, 9, 69), t);
});
ok('빼기 — 마디가 모자람 · 마디가 비면 없어짐 · 마지막 하나는 안 빠짐', () => {
  const s = S(INSA);
  const a = E.remove(s, 2);
  assert.deepEqual(E.bars(a).map(b => b.left), [0, 12, 0, 0]);
  let b = E.remove(E.remove(s, 0), 0);       // 첫 마디를 다 지움
  assert.equal(b.bars.length, 3);
  assert.equal(b.ev[0].p, 67); assert.equal(b.ev[0].t, 0);
  const one = S('G4w');
  assert.equal(E.remove(one, 0), one);
  assert.equal(E.remove(s, 99), s);
  roundTrip(a); roundTrip(b);
});

// ── 박자표 ──
ok('4/4 → 3/4: 같은 음을 세 박씩 다시 묶음 · 마디선을 넘는 음은 붙임줄 · 소리는 그대로', () => {
  const s = S(INSA);
  const t = E.setMeter(s, [3, 4]);
  assert.deepEqual(t.meter, [3, 4]);
  assert.equal(E.problems(t).length, 0);
  assert.equal(t.bars.length, 5);
  assert.ok(t.bars.every(b => b.ticks === 36));
  assert.ok(t.ev.some(e => e.tie));         // 미 2분이 1박 + 1박으로 갈라져 이어짐
  noParseErr(t);
  assert.deepEqual(t.errors, []);
  // 소리 나는 음(붙임줄 합침)은 같음
  const keyOf = x => sounding(x).map(m => [m.t, m.d, m.p].join(':')).join(' ');
  assert.equal(keyOf(t), keyOf(s));
  // 오선 그리기 모양도 만들어짐(마디선을 넘는 음 = 붙임줄 그리기)
  const st = toStaffSong(t);
  assert.equal(st.beats, 3); assert.equal(st.bars, 5); assert.equal(st.notes.length, sounding(s).length);
  roundTrip(t);
});
ok('4/4 → 3/4 → 4/4 = 처음 곡 · 2/4도', () => {
  const s = S(INSA);
  assert.deepEqual(strip(E.setMeter(E.setMeter(s, [3, 4]), [4, 4])), strip(s));
  assert.deepEqual(strip(E.setMeter(E.setMeter(s, [2, 4]), [4, 4])), strip(s));
  const w = song('ri5-waltz');
  assert.deepEqual(strip(E.setMeter(E.setMeter(w, [4, 4]), [3, 4])), strip(w));
  assert.equal(E.setMeter(s, [4, 4]), s);
  assert.equal(E.setMeter(s, 'x'), s);
  // 놀이터 곡 = 못갖춘마디 없는 곡만(첫 마디가 짧으면 '모자람'으로 봄)
  for (const def of SONGS.filter(d => d.meter[1] === 4 && d.mel.split(/\s+/).every(tok => !/[st]$/.test(tok)))) {
    const x = makeSong(def);
    if (x.pickup) continue;
    for (const m of [[2, 4], [3, 4], [4, 4]]) {
      const y = E.setMeter(x, m);
      noParseErr(y);
      assert.equal(E.problems(y).length, 0, def.id + ' ' + m);
      roundTrip(y);
    }
  }
});
ok('3/4에서 온음표 = 점2분 + 4분 붙임줄 · 끝 쉼표로 끝 마디 채움', () => {
  const t = E.setMeter(S('C4w | E4h G4h'), [3, 4]);
  assert.equal(E.toMel(t), 'C4h.~ | C4q E4h | G4h Rq');
  assert.equal(E.problems(t).length, 0);
});
ok('넘친 마디가 있는 곡의 박자표를 바꾸면 시간대로 다시 묶임', () => {
  const t = E.setDur(S(INSA), 8, 24);
  const u = E.setMeter(t, [3, 4]);
  assert.equal(E.problems(u).length, 0);
  assert.equal(sounding(u).length, sounding(t).length);
});

// ── 붙임줄로 이어진 음(박자표를 바꾼 뒤)도 한 덩어리 ──
ok('이어진 음 — 높이 · 쉼표 · 길이 · 빼기를 덩어리째', () => {
  const t = E.setMeter(S(INSA), [3, 4]);   // G4h E4q~ | E4q G4q G4q | …
  const U = E.unitsOf(t);
  assert.equal(U[1].i0, 1); assert.equal(U[1].i1, 2); assert.equal(U[1].d, 24); assert.equal(U[1].b0, 0); assert.equal(U[1].b1, 1);
  const up = E.stepPitch(t, 2, +1);        // 뒤 조각을 골라도 둘 다
  assert.equal(up.ev[1].p, 65); assert.equal(up.ev[2].p, 65); assert.ok(up.ev[1].tie);
  noParseErr(up);
  const rest = E.toggleRest(t, 1);
  assert.equal(rest.ev[1].p, null); assert.equal(rest.ev[2].p, null); assert.ok(!rest.ev[1].tie);
  noParseErr(rest);
  const shorter = E.setDur(t, 2, 12);      // 2박 → 1박: 두 마디를 다시 묶고 끝(둘째) 마디가 1박 모자람
  assert.deepEqual(E.bars(shorter).map(b => b.left), [0, 12, 0, 0, 0]);
  assert.ok(!shorter.ev.some(e => e.tie));
  const longer = E.setDur(t, 1, 36);       // 3박: 둘째 마디가 1박 넘침
  assert.deepEqual(E.bars(longer).map(b => b.over), [0, 12, 0, 0, 0]);
  noParseErr(longer);
  const gone = E.remove(t, 2);
  assert.equal(E.unitsOf(gone).length, U.length - 1);
  assert.deepEqual(E.bars(gone).map(b => b.left), [0, 24, 0, 0, 0]);
  for (const x of [up, rest, shorter, longer, gone]) roundTrip(x);
});

// ── 곡 전체 ──
ok('빠르기 · 셈여림 · 빈 마디 붙이기', () => {
  const s = S(INSA);
  const f = E.setTempo(s, 136);
  assert.equal(f.tempo, 136); assert.deepEqual(f.ev, s.ev);
  assert.equal(E.setTempo(s, 100), s);
  const loud = E.setDyn(s, 'f');
  assert.ok(loud.ev.every(e => e.dyn === 'f'));
  assert.deepEqual(pitches(loud), pitches(s));
  assert.ok(sounding(loud).every(m => m.vel === 0.9));
  assert.ok(E.toMel(loud).startsWith('!f G4h'));
  assert.equal(E.setDyn(loud, 'f'), loud);
  roundTrip(loud);
  const two = E.appendBars(s, 2);
  assert.equal(two.bars.length, 6);
  assert.equal(E.problems(two).length, 0);
  assert.ok(two.ev.slice(11).every(e => e.p == null));
  const w = E.appendBars(song('ri5-waltz'), 2);
  assert.ok(E.toMel(w).endsWith('C4h. | Rh. | Rh.'));
  const filled = E.insertNote(two, 192 + 13, 67);   // 새 마디 둘째 8분 칸 → 첫 4분 안
  assert.equal(E.problems(filled).length, 0);
  // 쉼표 안은 누른 박의 첫머리에(박 사이를 눌러도 엇박이 안 생김)
  assert.ok(E.toMel(E.insertNote(two, 192 + 30, 60)).endsWith('| Rh C4q Rq | Rw'));
  assert.equal(E.insertTick(two, 192 + 30), 216);
});

// ── 무작위로 이어서 고쳐도 곡 모양이 깨지지 않음(씨앗 고정) ──
ok('무작위 편집 4000번 — 왕복 · 적는 법 오류 0 · 틱 합 · 붙임줄 짝', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const plain = d => d.mel.split(/\s+/).every(tok => !/[st]$/.test(tok.replace('~', '')));
  const pool = SONGS.filter(d => plain(d) && d.meter[1] === 4).map(makeSong).filter(x => !x.pickup);
  assert.ok(pool.length >= 10);
  let s = pool[0];
  for (let k = 0; k < 4000; k++) {
    if (k % 250 === 0) s = pick(pool);
    const i = Math.floor(rnd() * s.ev.length);
    const op = Math.floor(rnd() * 9);
    if (op === 0) s = E.stepPitch(s, i, rnd() < 0.5 ? 1 : -1, { lo: 55, hi: 76 });
    else if (op === 1) s = E.setDur(s, i, pick(E.LENS));
    else if (op === 2) s = E.toggleRest(s, i);
    else if (op === 3) s = E.insertNote(s, Math.floor(rnd() * (s.total + 24)), pick([60, 64, 67, 69]));
    else if (op === 4) s = E.remove(s, i);
    else if (op === 5) s = E.setMeter(s, pick([[2, 4], [3, 4], [4, 4]]));
    else if (op === 6) s = E.setDyn(s, pick(['p', 'mf', 'f']));
    else if (op === 7) s = E.appendToBar(s, Math.floor(rnd() * s.bars.length), 67);
    else s = E.appendBars(s, 1);
    if (s.ev.length > 80) s = pick(pool);
    noParseErr(s);
    assert.equal(s.bars.reduce((a, b) => a + b.ticks, 0), s.total);
    assert.equal(s.ev.reduce((a, e) => a + e.d, 0), s.total);
    assert.ok(s.ev.every(e => e.d > 0));
    s.ev.forEach((e, j) => { if (e.tie) assert.equal(s.ev[j + 1].p, e.p); });
    assert.ok(s.ev.every(e => e.p == null || (e.p >= 43 && e.p <= 91)));
    const cap = barTicks(s.meter);
    assert.equal(E.bars(s).every(b => b.cap === cap), true);
    if (k % 20 === 0) roundTrip(s);
  }
});

console.log(`✓ 놀이터 편집 엔진 시험 ${n}개 통과`);
