// 장단 판 규칙 시험 — engine/jang.js(11-14 · 묶음 D4). node만으로 돈다: node tests/jang.test.mjs
//  ① 장단 표가 이 앱의 장1 칸(jd1.js) · 국악 사실 장부(굿거리 · 중중모리) 표와 같다 ② 칸 줄 → 소리 사건 ③ 바꾼 칸 찾기 ④ 부탁 판정 · 자동 수 ⑤ 저장 글
import assert from 'node:assert/strict';
import * as J from '../engine/jang.js';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; } };
const T = { deong: '덩', kung: '쿵', deok: '덕', kideok: '기', durr: '러' }, txt = p => p.map(x => (x ? T[x] : '_')).join('');

// ① 장단 표 — 새 국악 사실을 지어내지 않았는지
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const jd1 = await import('../app/js/cells/jd1.js');
ok('자진모리 · 세마치 = 장1 칸과 같음', () => {
  for (const [k, d1] of [['jj', jd1.JANGDAN.JJ], ['sm', jd1.JANGDAN.SM]]) {
    const d = J.JANG[k];
    assert.deepEqual(d.pat, d1.pat, d.name + ' 칸');
    assert.deepEqual(d.acc, d1.acc, d.name + ' 센 곳');
    assert.equal(d.bpm, d1.bpm, d.name + ' 빠르기');
    assert.equal(d.beats, d1.beats); assert.equal(d.sub, d1.sub); assert.equal(d.name, d1.name);
  }
  assert.equal(txt(J.JANG.jj.pat), '덩__쿵__쿵_덕쿵__', 'docs/gugak.md 자진모리 A꼴');
  assert.equal(txt(J.JANG.sm.pat), '덩__덩_덕쿵덕_', 'docs/gugak.md 민요 세마치');
});
ok('굿거리 · 중중모리 = 국악 사실 장부 §1 · §2 표', () => {
  assert.equal(txt(J.JANG.gg.pat), '덩_기쿵러_쿵_기쿵러_', '굿거리 — 미래엔 6학년 장단보(더러러러 한 칸 · 6 · 12번 칸 쉼)');
  assert.equal(txt(J.JANG.jjm.pat), '덩_덕쿵_덕쿵_덕쿵_쿵', '중중모리 — 미래엔 5학년 기본 꼴');
  for (const k of ['gg', 'jjm']) { assert.deepEqual(J.JANG[k].acc, [0, 8], '센 곳 1 · 9번 소박'); assert.ok(J.JANG[k].bpm >= 80 && J.JANG[k].bpm <= 90, '♩.=80~90 안'); }
  // 사실 장부 '칸에서 써도 안전한 문장' 3 — 굿거리에는 더러러러가, 중중모리에는 덕이 많다
  assert.ok(J.JANG.gg.pat.includes('durr') && !J.JANG.jjm.pat.includes('durr'));
  assert.ok(J.JANG.jjm.pat.filter(x => x === 'deok').length > J.JANG.gg.pat.filter(x => x === 'deok').length);
});
// 장2(묶음 C5 jd2.js)가 이 가지에 있으면 같은 칸인지 — 없으면 건너뜀(합칠 때 메인이 다시 돌림)
let jd2 = null;
try { jd2 = await import('../app/js/cells/jd2.js'); } catch { /* 아직 없음 */ }
if (jd2 && jd2.GG && jd2.JJM) ok('굿거리 · 중중모리 = 장2 칸과 같음', () => { assert.deepEqual(J.JANG.gg.pat, jd2.GG); assert.deepEqual(J.JANG.jjm.pat, jd2.JJM); });
ok('모든 장단 · 틀 — 칸 수 = 박 × 소박 · 첫 칸 덩 · 고르는 차례', () => {
  for (const d of Object.values(J.JANG)) { assert.equal(d.pat.length, J.lenOf(d), d.name); assert.equal(d.pat[0], 'deong'); assert.ok(d.pat.every(x => x === null || J.HITS.includes(x))); }
  assert.deepEqual([...J.ORDER].sort(), Object.keys(J.JANG).sort());
  assert.equal(J.ORDER[0], 'sm', '부탁 ①은 세마치부터(설계서)');
  assert.equal(J.lenOf(J.FRAMES.b3), 9); assert.equal(J.lenOf(J.FRAMES.b4), 12);
  for (const f of Object.values(J.FRAMES)) assert.deepEqual(f.acc, [], '빈 틀에는 센 곳 표시 없음(장단 이름이 없으니)');
  for (const h of J.HITS) { assert.ok(/^[가-힣]+$/.test(J.SYL[h]), '구음은 한글만'); assert.ok(J.HAND[h]); }
});

// ② 칸 줄 → 소리 사건
ok('소리 사건 — 때 · 세기 · 센 곳 · 쉼 · 기덕 · 더러러러', () => {
  const sm = J.JANG.sm, s = J.subSec(90);
  const ev = J.cycleEvents(sm.pat, sm);
  assert.equal(ev.length, J.countHits(sm.pat), '쉼은 사건 없음');
  assert.deepEqual(ev.map(e => e.i), [0, 3, 5, 6, 7]);
  ev.forEach(e => assert.ok(Math.abs(e.t - e.i * s) < 1e-9, '칸 i는 i × 소박'));
  assert.equal(ev[0].vel, Math.min(1, J.VEL.deong * J.ACC_UP), '센 칸은 1.12배');
  assert.equal(ev[1].vel, J.VEL.deong, '센 칸이 아니면 그대로');
  assert.ok(Math.abs(J.cycleSec(sm) - 9 * s) < 1e-9);
  const gg = J.cycleEvents(J.JANG.gg.pat, J.JANG.gg), s8 = J.subSec(80);
  const gi = gg.filter(e => e.drum === 'gi'), deok = gg.filter(e => e.drum === 'deok');
  assert.equal(gi.length, 2); assert.equal(deok.length, 2);
  gi.forEach((e, k) => assert.ok(Math.abs(deok[k].t - e.t - J.GI) < 1e-9, '기 = 덕보다 0.05초 앞'));
  assert.ok(Math.abs(deok[0].t - 2 * s8) < 1e-9, '기덕의 덕은 칸 시작');
  const roll = gg.filter(e => e.drum === 'roll');
  assert.deepEqual(roll.map(e => e.i), [4, 10]); roll.forEach(e => assert.ok(Math.abs(e.span - s8) < 1e-9, '굴림은 한 소박 안'));
  assert.ok(gg.every((e, k) => !k || gg[k - 1].t <= e.t), '때 차례');
  assert.deepEqual(J.cycleEvents(J.emptyPat(J.FRAMES.b4), J.FRAMES.b4), [], '빈 틀은 소리 없음');
  // 바꾸면 소리가 달라지고, 되돌리면 같다
  const one = J.place(sm.pat, 8, 'kung');
  assert.notDeepEqual(J.cycleEvents(one, sm), ev);
  assert.deepEqual(J.cycleEvents(J.place(one, 8, null), sm), ev);
});

// ③ 놓기 · 바꾼 칸 찾기
ok('놓기 — 넣기 · 같은 구음 한 번 더 = 빼기 · 쉼 = 빼기 · 원래 줄은 그대로', () => {
  const e = J.emptyPat(J.FRAMES.b3);
  const a = J.place(e, 2, 'deok');
  assert.equal(a[2], 'deok'); assert.equal(e[2], null, '원래 줄 그대로');
  assert.equal(J.place(a, 2, 'deok')[2], null, '같은 구음 한 번 더 = 빼기');
  assert.equal(J.place(a, 2, 'kung')[2], 'kung', '다른 구음 = 바꾸기');
  assert.equal(J.place(a, 2, null)[2], null, '쉼 = 빼기');
  assert.equal(J.place(e, 2, null), e, '빈 칸에 쉼 = 그대로(같은 줄)');
  assert.equal(J.place(e, 99, 'deok'), e, '없는 칸 = 그대로');
});
ok('바꾼 칸 찾기 · 자리 글', () => {
  const jj = J.JANG.jj;
  assert.deepEqual(J.diffCells(jj.pat, jj.pat), []);
  const b = J.place(J.place(jj.pat, 8, 'kung'), 11, 'deok');
  assert.deepEqual(J.diffCells(b, jj.pat), [8, 11]);
  assert.equal(J.cellPlace(jj, 8), '9번째 칸(3박 셋째 소박)');
  assert.equal(J.changeLine(jj, jj.pat, b, 8), '9번째 칸(3박 셋째 소박): 덕 → 쿵');
  assert.equal(J.changeLine(jj, jj.pat, b, 11), '12번째 칸(4박 셋째 소박): 쉼 → 덕');
  assert.deepEqual(J.diffCells([null], []), [], '빈 자리와 쉼은 같음');
});

// ④ 부탁 판정 · 자동 수 — 자동 수만 두면 부탁마다 끝난다(모든 장단 · 틀)
ok('부탁 판정 — 보기대로 · 한 칸만 · 내 장단(정답 없음)', () => {
  const sm = J.JANG.sm;
  assert.equal(J.judge('copy', sm.pat, sm.pat).st, 'ready');
  const c0 = J.judge('copy', J.emptyPat(sm), sm.pat);
  assert.equal(c0.st, 'idle'); assert.equal(c0.n, 5); assert.match(c0.msg, /구음을 고르고/);
  assert.match(J.judge('copy', J.place(J.emptyPat(sm), 0, 'deong'), sm.pat).msg, /4개 남았어요/);
  assert.equal(J.judge('one', sm.pat, sm.pat).st, 'idle');
  const r1 = J.judge('one', J.place(sm.pat, 1, 'kung'), sm.pat);
  assert.equal(r1.st, 'ready'); assert.equal(r1.at, 1);
  const r2 = J.judge('one', J.place(J.place(sm.pat, 1, 'kung'), 2, 'kung'), sm.pat);
  assert.equal(r2.st, 'diff'); assert.match(r2.msg, /2칸/);
  assert.equal(J.judge('free', J.emptyPat(J.FRAMES.b4)).st, 'idle');
  // 정답 없음 — 어떤 구음이든 셋이면 들어 볼 수 있음
  const any = ['durr', 'durr', 'durr', null, null, null, null, null, null];
  assert.equal(J.judge('free', any).st, 'ready');
  for (const c of J.CARDS) assert.ok(typeof c.text(sm) === 'string' && c.text(sm).length > 4);
  assert.equal(J.CARDS[0].text(sm), '세마치 장단을 보기대로 놓아 들어 봐요');
  assert.deepEqual(J.CARDS.map(c => c.kind), ['E', 'E', 'M']);
  // 부정하는 말 X
  const msgs = [c0.msg, r2.msg, J.judge('one', sm.pat, sm.pat).msg, J.judge('free', J.emptyPat(sm)).msg].join(' ');
  assert.doesNotMatch(msgs, /틀렸|아니에요|안 돼|잘못|X/);
});
ok('자동 수 — 부탁마다 끝까지 · 한 칸만은 여러 칸 바뀌어도 되돌림', () => {
  for (const d of Object.values(J.JANG)) {
    for (const key of ['copy', 'one']) {
      let p = key === 'copy' ? J.emptyPat(d) : d.pat.slice(), k = 0;
      while (J.judge(key, p, d.pat).st !== 'ready' && k++ < 40) { const m = J.nextMove(key, p, d.pat); p = J.place(p, m.i, m.hit ?? null); if (m.hit == null) p[m.i] = null; }
      assert.equal(J.judge(key, p, d.pat).st, 'ready', d.name + ' ' + key);
      assert.equal(J.nextMove(key, p, d.pat), null);
    }
    let p = J.place(J.place(d.pat, 1, 'deok'), 2, 'deok');
    for (let k = 0; k < 5 && J.judge('one', p, d.pat).st !== 'ready'; k++) { const m = J.nextMove('one', p, d.pat); p = J.place(p, m.i, m.hit); if (m.hit == null) p[m.i] = null; }
    assert.equal(J.judge('one', p, d.pat).st, 'ready', d.name + ' 두 칸 → 한 칸');
  }
  for (const f of Object.values(J.FRAMES)) {
    let p = J.emptyPat(f), k = 0;
    while (J.judge('free', p).st !== 'ready' && k++ < 20) { const m = J.nextMove('free', p); p = J.place(p, m.i, m.hit); }
    assert.equal(J.countHits(p), J.FREE_MIN, f.name);
  }
});

// ⑤ 저장 글
ok('저장 글 — 왕복 · 길이나 글자가 다르면 버림', () => {
  for (const d of Object.values(J.JANG)) assert.deepEqual(J.decode(J.encode(d.pat), d.pat.length), d.pat);
  assert.equal(J.encode(J.JANG.gg.pat), 'D.GKR.K.GKR.');
  assert.equal(J.decode('D.GKR.K.GKR.', 9), null, '길이 다름');
  assert.equal(J.decode('D.GKX.K.GKR.', 12), null, '모르는 글자');
  assert.equal(J.decode(null, 9), null);
  assert.deepEqual(J.decode('.........', 9), J.emptyPat(J.FRAMES.b3));
});

delete globalThis.localStorage;
console.log(`✓ 장단 판 규칙 시험 ${n}개 통과${jd2 && jd2.GG ? ' · 장2 칸과 대조' : ' · 장2 칸(jd2.js)은 이 가지에 없어 대조 건너뜀'}`);
