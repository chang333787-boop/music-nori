// 박·리듬 칸(리2 · 리4 · 리5 · 리6) 판정 시험 — node만으로 돈다(화면 · 소리 없음)
//  메기면 받기(따 · 쉼) · 길게 누르기(누름 · 뗌) · 센박에만 · 판 짜임(마디가 4박 · 상자 답이 꼭 맞음)
import assert from 'node:assert/strict';
import { judgeEcho, classifyTap, releaseGrade, judgeHolds, strongPattern, barsOk, layoutNotes, LEN } from '../app/js/cells/_beat.js';
import { windows } from '../engine/judge.js';
import { fillBar } from '../engine/measure.js';
import { PLAN as P2 } from '../app/js/cells/ri2.js';
import { PLAN as P4 } from '../app/js/cells/ri4.js';
import { PLAN as P5, FINAL as F5, TOTAL as T5 } from '../app/js/cells/ri5.js';
import { PLAN as P6 } from '../app/js/cells/ri6.js';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; } };
const B = 600;                                             // 한 박 600ms(100bpm)
const beatsAt = (k, t0 = 1000) => Array.from({ length: k }, (_, i) => t0 + i * B);

// ── 메기면 받기 ──
ok('따 박마다 두드리고 쉼 박은 비우면 맞음', () => {
  const pat = ['ta', 'ta', 'rest', 'ta'], bs = beatsAt(4);
  const j = judgeEcho(pat, bs, [bs[0], bs[1] + 20, bs[3] - 30]);
  assert.equal(j.ok, true); assert.deepEqual(j.beats.map(b => b.got), ['great', 'great', 'rest', 'great']);
});
ok('쉼 박에 치면 쉼에 쳤어요', () => {
  const pat = ['ta', 'rest', 'ta', 'rest'], bs = beatsAt(4);
  const j = judgeEcho(pat, bs, [bs[0], bs[1] + 10, bs[2]]);
  assert.equal(j.ok, false); assert.equal(j.restHits, 1); assert.equal(j.beats[1].got, 'resthit');
});
ok('따를 안 치면 놓침', () => {
  const j = judgeEcho(['ta', 'ta', 'ta', 'rest'], beatsAt(4), [1000, 1600]);
  assert.equal(j.misses, 1); assert.equal(j.beats[2].got, 'miss');
});
ok('판정 창 끝(중간 학년 ±115ms)까지는 좋아', () => {
  const bs = beatsAt(4), w = windows('mid', B);
  const j = judgeEcho(['ta', 'ta', 'ta', 'ta'], bs, [bs[0] - w.early + 1, bs[1] + w.late - 1, bs[2] + 60, bs[3]]);
  assert.equal(j.ok, true); assert.deepEqual(j.beats.map(b => b.got), ['ok', 'ok', 'ok', 'great']);
});
ok('박과 박 사이 두드림은 셈하지 않음(쉼 박에서 0.35박보다 멀면 괜찮음)', () => {
  const bs = beatsAt(4);
  const j = judgeEcho(['ta', 'rest', 'ta', 'rest'], bs, [bs[0], bs[0] + 0.5 * B, bs[2], bs[2] + 0.62 * B]);
  assert.equal(j.ok, true);
  assert.equal(classifyTap(bs[1] + 0.3 * B, bs, ['ta', 'rest', 'ta', 'rest'], windows('mid', B), B).kind, 'resthit');
});
ok('기기 지연을 빼고 판정 · 같은 박 두 번은 하나만', () => {
  const bs = beatsAt(4);
  const j = judgeEcho(['ta', 'ta', 'rest', 'ta'], bs, [bs[0] + 90, bs[0] + 140, bs[1] + 90, bs[3] + 90], { latency: 90 });
  assert.equal(j.ok, true); assert.equal(j.beats[0].got, 'great');
});
ok('1~2학년은 창이 더 넓음', () => {
  const bs = beatsAt(2);
  assert.equal(judgeEcho(['ta', 'ta'], bs, [bs[0] + 160, bs[1]], { band: 'mid' }).ok, false);
  assert.equal(judgeEcho(['ta', 'ta'], bs, [bs[0] + 160, bs[1]], { band: 'low' }).ok, true);
});

// ── 길게 누르기 ──
ok('2분음표: 두 박 뒤에 떼면 맞음 · 일찍 떼면 short · 오래 누르면 long', () => {
  assert.equal(releaseGrade(2, 0, 2 * B - 80, B), 'ok');
  assert.equal(releaseGrade(2, 0, 2 * B + 0.35 * B, B), 'ok');
  assert.equal(releaseGrade(2, 0, 1.2 * B, B), 'short');
  assert.equal(releaseGrade(2, 0, 2.6 * B, B), 'long');
  assert.equal(releaseGrade(2, 0, Infinity, B), 'long');
});
ok('4분음표: 짧게 떼도 맞음 · 한 박 반 넘게 누르면 long', () => {
  assert.equal(releaseGrade(1, 0, 80, B), 'ok');
  assert.equal(releaseGrade(1, 0, 1.3 * B, B), 'ok');
  assert.equal(releaseGrade(1, 0, 1.6 * B, B), 'long');
});
ok('학년군마다 뗌 창이 다름', () => {
  assert.equal(releaseGrade(2, 0, 1.45 * B, B, 'low'), 'ok');
  assert.equal(releaseGrade(2, 0, 1.45 * B, B, 'mid'), 'short');
  assert.equal(releaseGrade(2, 0, 2.45 * B, B, 'high'), 'long');
});
ok('풍선 판 자동 연주(시작에 누르고 끝 조금 전에 뗌) = 모두 맞음', () => {
  const { notes } = layoutNotes(P4);
  const at = nt => 1000 + nt.beat * B;
  const holds = notes.map(nt => ({ down: at(nt) + 10, up: at(nt) + (nt.len >= 2 ? nt.len - 0.15 : 0.6) * B }));
  const j = judgeHolds(notes.map(nt => ({ at: at(nt), len: nt.len })), holds, { beatMs: B });
  assert.equal(j.kept, j.total); assert.equal(j.total, notes.length);
});
ok('2분음표 둘을 한 번에 길게 누르면: 앞은 long · 뒤는 놓침', () => {
  const notes = [{ at: 0, len: 2 }, { at: 2 * B, len: 2 }];
  const j = judgeHolds(notes, [{ down: 5, up: 4 * B - 50 }], { beatMs: B });
  assert.deepEqual(j.notes.map(x => [x.press, x.rel]), [['great', 'long'], ['miss', null]]);
});

// ── 센박에만 ──
ok('3/4 센박에만 치면 마디 모두 맞음 · 여린박에 치면 그 마디만 틀림', () => {
  const pat = strongPattern(3, 3), bs = beatsAt(9);
  const good = judgeEcho(pat, bs, [bs[0], bs[3], bs[6]]);
  assert.deepEqual(barsOk(good.beats, 3), [true, true, true]);
  const bad = judgeEcho(pat, bs, [bs[0], bs[3], bs[4], bs[6]]);
  assert.deepEqual(barsOk(bad.beats, 3), [true, false, true]);
});

// ── 판 짜임 ──
ok('리2: 8판 모두 네 박 · 쉼이 든 판이 대부분 · 쉼으로 시작하는 판이 있음', () => {
  assert.equal(P2.length, 8);
  for (const p of P2) assert.equal(p.pat.length, 4);
  assert.ok(P2.filter(p => p.pat.includes('rest')).length >= 7);
  assert.ok(P2.some(p => p.pat[0] === 'rest'));
});
ok('리4: 마디마다 4박 · 2분음표가 든 마디가 대부분 · 짧게만 누르는 마디 하나', () => {
  for (const bar of P4) assert.equal(bar.reduce((a, k) => a + LEN[k], 0), 4);
  assert.ok(P4.filter(b => b.includes('h')).length >= 6);
  assert.ok(P4.some(b => !b.includes('h') && b.filter(k => k === 'q').length >= 3));
  assert.ok(layoutNotes(P4).notes.length <= 24, '결과 카드 다시 보기 줄이 넘치지 않게');
});
ok('리5: 같은 빠르기 짝 · 2박 3박 반씩 · 비틀기는 빠르기를 바꿈', () => {
  assert.equal(P5[0].bpm, P5[1].bpm); assert.notEqual(P5[0].m, P5[1].m);
  assert.equal(P5.filter(p => p.m === 2).length, P5.filter(p => p.m === 3).length);
  const tw = P5.filter(p => p.twist);
  assert.ok(tw.some(p => p.m === 3 && p.bpm > 120) && tw.some(p => p.m === 2 && p.bpm < 90), '빠른 왈츠 · 느린 행진');
  // 화면 번호(ui.count) = 고르기 판 + 센박 마디 = 결과 'N번 중'
  assert.equal(P5.length + F5.segs.reduce((n, s) => n + s.bars, 0), T5);
});
ok('리6: 상자 답(자동 시험)이 꼭 4박 · 조건을 지킴 · 고르기 판은 답이 하나', () => {
  const T = { q: 12, h: 24, w: 48, qr: 12, ee: 12 };
  for (const p of P6) {
    const all = [...(p.pre || []), ...p.auto];
    const f = fillBar(all.map(k => T[k]));
    assert.ok(f.full && !f.over, p.task + ' ' + all.join(','));
    if (p.need) assert.ok(p.need(p.auto), p.task);
    for (const k of p.auto) assert.ok(p.tray.includes(k));
    if (p.one) {
      const left = 48 - (p.pre || []).reduce((a, k) => a + T[k], 0);
      assert.equal(p.tray.filter(k => T[k] === left).length, 1, '꼭 맞는 블록이 하나뿐: ' + p.pre.join(','));
    }
  }
  // 블록 판은 다섯 블록을 늘 같은 자리에 깔고 잠그기만 함 — 판마다 쓰는 블록이 그 다섯 안에 있어야 함
  for (const p of P6) for (const k of p.tray) assert.ok(['q', 'h', 'w', 'qr', 'ee'].includes(k), k);
  // 마지막 상자 '블록 셋으로' — 블록 수와 박 수가 다른 답
  const last = P6[P6.length - 1];
  assert.ok(last.need(['h', 'q', 'q']) && !last.need(['q', 'q', 'q', 'q']) && !last.need(['w']));
});

console.log(`✓ 박·리듬 칸 시험 통과 — ${n}개`);
