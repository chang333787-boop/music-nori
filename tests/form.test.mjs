// 도막 짜기 판 규칙 시험 — engine/form.js. node만으로 돈다(의존성 X): node tests/form.test.mjs
import assert from 'node:assert/strict';
import { makeSong } from '../engine/song.js';
import { grams, loadHashes, LIMIT } from '../tools/simcheck.mjs';
import * as F from '../engine/form.js';

let n = 0;
const ok = (name, fn) => {
  try { fn(); n++; } catch (e) { console.error('✗ ' + name); throw e; }
};
// 판 만들기 — [['ga'], ['na', 'many'], null, ['da', 'one', 'fast']] → 판(모자란 칸은 빈 칸)
const B = (...xs) => {
  let b = F.emptyBoard();
  xs.forEach((x, k) => {
    if (!x) return;
    b = F.place(b, k, x[0]);
    if (x[1] === 'many') b = F.toggleVoice(b, k);
    if (x[2] === 'fast') b = F.toggleSpeed(b, k);
  });
  return b;
};
const near = (a, b) => Math.abs(a - b) < 1e-9;
// 씨앗 있는 무작위(시험이 늘 같게)
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const randomBoard = () => {
  let b = F.emptyBoard();
  for (let k = 0; k < F.SLOTS; k++) {
    if (rnd() < 0.35) continue;
    b = F.place(b, k, F.PIECE_IDS[Math.floor(rnd() * 3)]);
    if (rnd() < 0.5) b = F.toggleVoice(b, k);
    if (rnd() < 0.5) b = F.toggleSpeed(b, k);
  }
  return b;
};

ok('도막 셋 — 두 마디(2/4) · 네 박 · 다장조 5음(도 레 미 솔 라) · 서로 다른 가락', () => {
  assert.deepEqual(F.PIECES.map(p => p.name), ['가', '나', '다']);
  for (const p of F.PIECES) {
    const s = makeSong({ mel: p.mel, meter: F.METER });
    assert.deepEqual(s.errors, [], p.name);
    assert.equal(s.bars.length, 2, p.name + ' 두 마디');
    assert.equal(p.notes.reduce((a, [, b]) => a + b, 0), F.BEATS, p.name + ' 네 박');
    for (const [pp] of p.notes) assert.ok([0, 2, 4, 7, 9].includes(pp % 12) && pp >= 60 && pp <= 74, p.name + ' 음 ' + pp);
  }
  const sig = p => JSON.stringify(p.notes);
  assert.equal(new Set(F.PIECES.map(sig)).size, 3);
  // 끝 음이 다름(도 · 라 · 솔) — 같은 도막이 돌아오는 것이 끝에서도 들리게
  assert.deepEqual(F.PIECES.map(p => p.notes[p.notes.length - 1][0]), [60, 69, 67]);
});

ok('있는 노래 X — 도막 하나하나와 셋 · 넷 칸 짜임 모두 유명 곡 해시와 겹침 40% 아래(tools/simcheck.mjs)', () => {
  const H = loadHashes();
  const worst = { v: 0, name: '', what: '' };
  const check = (what, mel) => {
    const g = grams(makeSong({ mel, meter: F.METER })).g;
    for (const h of H) {
      let hit = 0; for (const x of g) if (h.g.has(x)) hit++;
      const v = g.size ? hit / g.size : 0;
      if (v > worst.v) Object.assign(worst, { v, name: h.name, what });
    }
  };
  const mel = ids => ids.map(id => F.pieceById(id).mel).join(' | ');
  for (const p of F.PIECES) check(p.name, p.mel);
  const ids = F.PIECE_IDS;
  for (const a of ids) for (const b of ids) for (const c of ids) {
    check(a + b + c, mel([a, b, c]));
    for (const d of ids) check(a + b + c + d, mel([a, b, c, d]));
  }
  assert.ok(worst.v < LIMIT, `닮음 ${Math.round(worst.v * 100)}% — ${worst.what} ↔ ${worst.name}`);
});

ok('놓기 · 빼기 · 바꾸기 — 같은 도막을 다시 놓으면 빠지고 빈 칸은 기본값 · 다른 도막이면 혼자 · 빠르기는 그대로 · 원래 판은 그대로', () => {
  const e = F.emptyBoard();
  const a = F.place(e, 2, 'ga');
  assert.equal(e[2].piece, null, '원래 판을 고치지 않음');
  assert.equal(a[2].piece, 'ga');
  const v = F.toggleSpeed(F.toggleVoice(a, 2), 2);
  assert.deepEqual(v[2], { piece: 'ga', voice: 'many', speed: 'fast' });
  assert.deepEqual(F.place(v, 2, 'na')[2], { piece: 'na', voice: 'many', speed: 'fast' }, '바꾸기는 설정 그대로');
  assert.deepEqual(F.place(v, 2, 'ga')[2], F.emptySlot(), '같은 도막 = 빼기');
  assert.equal(F.toggleVoice(e, 0), e, '빈 칸은 혼자 · 여럿을 못 바꿈');
  assert.equal(F.toggleSpeed(e, 0), e);
  assert.equal(F.place(e, 9, 'ga'), e, '없는 칸');
  assert.equal(F.place(e, 0, 'zz'), e, '없는 도막');
  assert.deepEqual(F.clearSlot(v, 2)[2], F.emptySlot());
});

ok('짜임 이름 — 놓은 칸 차례대로(빈 칸은 건너뜀)', () => {
  assert.equal(F.nameOf(F.emptyBoard()), '');
  assert.equal(F.nameOf(B(['ga'], ['na'], ['ga'])), '가나가');
  assert.equal(F.nameOf(B(['ga'], null, ['ga'], ['na'], null, ['na'])), '가가나나');
  assert.equal(F.nameOf(B(null, ['da'], ['na'])), '다나');
});

ok('소리 사건 — 놓은 차례 · 빈 칸 건너뜀 · 빠르기 = 박 길이 · 여럿 = 같은 가락 셋(옥타브) · 도막 사이 쉼 없음', () => {
  const b = B(['ga'], null, ['na', 'many'], ['ga', 'one', 'fast']);
  const { events, total, segs } = F.events(b);
  const S = F.SPEED, beats = F.BEATS;
  assert.deepEqual(segs.map(s => s.k), [0, 2, 3]);
  assert.ok(near(segs[0].t1, beats * S.slow) && near(segs[1].t0, segs[0].t1) && near(segs[2].t0, segs[1].t1), '이어 붙음');
  assert.ok(near(total, beats * S.slow * 2 + beats * S.fast));
  assert.ok(events.every((e, i) => i === 0 || events[i - 1].t <= e.t), '시각 차례');
  const of = k => events.filter(e => e.slot === k);
  assert.equal(of(0).length, F.pieceById('ga').notes.length, '혼자 = 줄 하나');
  assert.equal(of(2).length, F.pieceById('na').notes.length * 3, '여럿 = 줄 셋');
  assert.deepEqual(new Set(of(2).map(e => e.inst)).size, 3, '여럿 = 악기 셋');
  // 여럿의 세 줄은 같은 가락(옥타브만 다름) · 같은 때
  const lines = F.VOICES.many.map(([inst]) => of(2).filter(e => e.inst === inst));
  F.VOICES.many.forEach(([, shift], i) => {
    const ln = lines[i];
    assert.deepEqual(ln.map(e => e.t), lines[0].map(e => e.t), '같은 때');
    assert.deepEqual(ln.map(e => e.p), F.pieceById('na').notes.map(([p]) => p + shift), '같은 가락 · 옥타브만 옮김');
  });
  // 빠르게 칸의 음은 느리게 칸의 같은 도막보다 짧음(같은 비율)
  const r = of(3)[0].d / of(0)[0].d;
  assert.ok(near(r, S.fast / S.slow));
  assert.ok(S.slow / S.fast >= 1.5, '빠르기 차이가 또렷함');
  // 한 칸만 · 도막만
  assert.ok(near(F.slotEvents(b, 3).total, beats * S.fast));
  assert.equal(F.slotEvents(b, 1).events.length, 0, '빈 칸은 소리 없음');
  assert.ok(near(F.pieceEvents('da').total, beats * S.slow));
  assert.equal(F.events(F.emptyBoard()).total, 0);
});

ok('메기고 받기 판정 — 혼자 · 여럿 번갈아 · 받는 칸 같은 도막 · 메기는 칸은 다른 도막 · 적어도 네 칸 · 받는 소리로 끝', () => {
  const yes = [
    B(['na'], ['ga', 'many'], ['da'], ['ga', 'many']),
    B(['na'], ['ga', 'many'], ['na'], ['ga', 'many']),
    B(['da'], ['na', 'many'], ['ga'], ['na', 'many'], ['da'], ['na', 'many']),
    B(['na'], null, ['ga', 'many'], ['da'], null, ['ga', 'many']),          // 빈 칸은 건너뜀
  ];
  for (const b of yes) assert.ok(F.callResponse(b).ok, F.sigOf(b));
  const no = [
    [B(['na'], ['ga', 'many'], ['da'], ['ga', 'many'], ['na']), 'odd'],     // 메기는 소리로 끝
    [B(['na'], ['ga', 'many'], ['da']), 'few'],
    [B(['na'], ['ga', 'many']), 'few'],
    [B(['na'], ['ga'], ['da'], ['ga']), 'voice'],                            // 모두 혼자
    [B(['na', 'many'], ['ga'], ['da', 'many'], ['ga']), 'voice'],            // 받는 소리로 시작
    [B(['na'], ['ga', 'many'], ['da'], ['na', 'many']), 'resp'],             // 받는 가락이 바뀜
    [B(['ga'], ['ga', 'many'], ['ga'], ['ga', 'many']), 'same'],             // 메기는 칸 = 받는 도막
  ];
  for (const [b, why] of no) assert.equal(F.callResponse(b).why, why, F.sigOf(b));
  assert.equal(F.callResponse(B(['na'], ['ga'], ['da'], ['ga'])).at, 1, '손볼 칸 = 둘째');
});

ok('느리게 다음 빠르게 판정 — 느리게가 먼저 · 빠르게가 뒤 · 섞이지 않음', () => {
  const yes = [B(['ga'], ['ga', 'one', 'fast']), B(['na'], ['ga'], ['na', 'one', 'fast'], ['ga', 'one', 'fast']), B(['da'], null, ['da', 'many', 'fast'])];
  for (const b of yes) assert.ok(F.slowFast(b).ok, F.sigOf(b));
  assert.equal(F.slowFast(B(['ga'])).why, 'few');
  assert.equal(F.slowFast(B(['ga'], ['na'])).why, 'nofast');
  assert.equal(F.slowFast(B(['ga', 'one', 'fast'], ['na'])).why, 'noslow');
  const back = F.slowFast(B(['ga'], ['na', 'one', 'fast'], ['ga']));
  assert.equal(back.why, 'back'); assert.equal(back.at, 2);
});

ok('짜임 글 — 셀 수 있는 사실만 · 형식 이름은 맞을 때만 「…처럼」', () => {
  assert.deepEqual(F.facts(F.emptyBoard()), []);
  assert.equal(F.shapeText(B(['ga'])), '도막 하나예요');
  assert.equal(F.shapeText(B(['ga'], ['ga'], ['ga'], ['ga'])), '같은 도막이 네 번 이어져요');
  assert.equal(F.shapeText(B(['ga'], ['na'], ['da'])), '도막이 모두 달라요');
  assert.equal(F.shapeText(B(['ga'], ['na'], ['ga'])), '처음 도막이 끝에 다시 나와요');
  assert.equal(F.shapeText(B(['ga'], ['ga'], ['na'], ['na'])), '가 · 나 도막이 다시 나와요');
  assert.equal(F.shapeText(B(['ga'], ['na'], ['na'], ['da'])), '나 도막이 다시 나와요');
  assert.ok(F.facts(B(['na'], ['ga', 'many'], ['da'], ['ga', 'many'])).includes('메기고 받는 형식처럼 혼자 메기고 여럿이 받아요'));
  assert.ok(F.facts(B(['ga'], ['ga', 'one', 'fast'])).includes('긴자진 형식처럼 느리게 부르다 빠르게 이어 불러요'));
  assert.ok(!F.facts(B(['ga'], ['na'])).some(t => /형식/.test(t)), '맞지 않으면 형식 이름 X');
  assert.ok(F.facts(B(['ga'], null, ['na'])).includes('빈 칸은 건너뛰어요'));
  assert.ok(!F.facts(B(null, ['ga'], ['na'])).includes('빈 칸은 건너뛰어요'), '앞쪽 빈 칸은 사이가 아님');
});

ok('부탁 카드 넷 — E 셋 · M 하나 · 빈 판에서 자동 풀이가 ready까지 · target 판은 ready', () => {
  assert.deepEqual(F.TASKS.map(t => t.key + ':' + t.kind), ['aba:E', 'call:E', 'slowfast:E', 'mine:M']);
  for (const t of F.TASKS) {
    for (const lo of [false, true]) {
      const tb = t.target.reduce((b, s, k) => F.apply(F.apply(F.apply(b, { op: 'place', k, id: s.piece }), s.voice === 'many' ? { op: 'voice', k } : null), s.speed === 'fast' ? { op: 'speed', k } : null), F.emptyBoard());
      assert.equal(t.check(tb, lo).st, 'ready', t.key + ' target');
      let b = F.emptyBoard(), a, steps = 0;
      while ((a = F.autoStep(t, b, lo)) && steps < 30) { const r = t.check(b, lo); assert.ok(r.msg && r.st === 'idle', t.key + ' 안내 글'); b = F.apply(b, a); steps++; }
      assert.equal(t.check(b, lo).st, 'ready', t.key + ' 빈 판에서 풀이');
      assert.ok(steps <= 12, t.key + ' 걸음 ' + steps);
    }
  }
  // 부탁별 그대로의 판정
  const T = F.taskByKey;
  assert.equal(T('aba').check(B(['ga'], ['na'], ['ga'])).st, 'ready');
  assert.equal(T('aba').check(B(['ga'], null, ['na'], ['ga'])).st, 'ready', '빈 칸 사이도 가나가');
  assert.equal(T('aba').check(B(['na'], ['ga'], ['na'])).st, 'idle', '나가나는 가나가가 아님(이름 그대로)');
  assert.equal(T('aba').check(B(['ga'], ['na'], ['ga'], ['na'])).at, 3, '넷째를 빼라');
  assert.equal(T('mine').check(B(['ga'], ['ga'], ['ga'])).st, 'idle');
  assert.equal(T('mine').check(B(['ga'], ['ga'], ['ga'], ['ga'])).st, 'ready', '정답 없음 — 네 칸이면 무엇이든');
  assert.match(T('mine').done(false, B(['ga'], ['na'], ['ga'], ['da'])), /^내 짜임 「가나가다」 — /);
});

ok('어떤 판에서 시작해도 자동 풀이가 ready에 닿음(무작위 판 300)', () => {
  for (let i = 0; i < 300; i++) {
    const t = F.TASKS[i % 4];
    let b = randomBoard(), a, steps = 0;
    while ((a = F.autoStep(t, b)) && steps < 40) { b = F.apply(b, a); steps++; }
    assert.equal(t.check(b).st, 'ready', t.key + ' ' + F.sigOf(b));
  }
});

ok('말 약속 — 부정하는 말 · X 없음 · 1~2학년 판은 「도막」 대신 「조각」 · 「긴자진」 낱말 X', () => {
  const texts = lo => {
    const out = [];
    for (const t of F.TASKS) {
      out.push(t.text(lo), t.word(lo), t.done(lo, B(['ga'], ['na'], ['ga'], ['da'])));
      for (let i = 0; i < 200; i++) { const r = t.check(randomBoard(), lo); if (r.msg) out.push(r.msg); }
      let b = F.emptyBoard(), a;
      while ((a = F.autoStep(t, b, lo))) { out.push(t.check(b, lo).msg); b = F.apply(b, a); }
    }
    for (let i = 0; i < 200; i++) out.push(...F.facts(randomBoard(), lo));
    return out;
  };
  for (const lo of [false, true]) {
    for (const s of texts(lo)) {
      assert.ok(!/틀렸|틀려|아니에요|안 돼|잘못|실패|X/.test(s), '부정하는 말: ' + s);
      assert.ok(!/undefined|null|NaN/.test(s), '빈 값: ' + s);
    }
  }
  const low = texts(true).join('\n');
  assert.ok(!/도막|긴자진|메기|가락/.test(low), '1~2학년 판 낱말');
  assert.ok(/조각/.test(low));
  // 국악 뜻 글은 확인된 문장 그대로(형2 칸 · 국악 사실 장부)
  assert.equal(F.taskByKey('call').word(false), '메기고 받기 — 한 사람이 메기면 여럿이 받아요. 받는 소리는 같은 가락이 되풀이되고, 메기는 소리는 그때그때 바뀌어요.');
  assert.equal(F.taskByKey('slowfast').word(false), "긴자진 형식 — 느린 노래를 부르고, 이어서 빠른 노래를 부르는 짜임이에요. 우리 음악에서 '긴'은 느리게, '자진'은 빠르게라는 뜻이에요.");
});

ok('기기 저장 읽기 — 모양이 맞을 때만', () => {
  const b = B(['ga'], ['na', 'many'], null, ['da', 'one', 'fast']);
  assert.deepEqual(F.fromSaved(JSON.parse(JSON.stringify(b))), b);
  assert.equal(F.fromSaved(null), null);
  assert.equal(F.fromSaved([]), null);
  assert.equal(F.fromSaved(b.map((s, k) => (k === 0 ? { ...s, piece: 'zz' } : s))), null);
  assert.equal(F.fromSaved(b.map((s, k) => (k === 1 ? { ...s, voice: 'loud' } : s))), null);
});

console.log(`✓ 도막 짜기 판 규칙 시험 ${n}개 통과 — 도막 셋(두 마디 · 닮음 40% 아래) · 소리 사건 · 메기고 받기 · 느리게 다음 빠르게 · 부탁 넷 자동 풀이 · 말 약속`);
