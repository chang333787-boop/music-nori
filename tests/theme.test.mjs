// 주제곡 「숲속 음악대」 시험 — 곡 모양 · 화음 · 계단 · 박 놀이 반주 · 손맛(docs/sound.md §6)
import assert from 'node:assert/strict';
import { THEME, THEME_ERRORS, BARS, MEL, chordAt, chordSpans, isChordTone, PARTS, levelsOf, stepsOf, newParts, partOfCell, STEP_TEXT,
  themeBar, barLen, warpOf, cadence, accompBar, themeRun, harmonize, holdPitch, goodNotes, LADDER, STAR_NOTES, fanfare, COMP, ROOT } from '../engine/theme.js';
import { FIRST } from '../engine/cells.js';
import { pc } from '../engine/theory.js';
import { checkAll, loadHashes, pct, LIMIT } from '../tools/simcheck.mjs';
import { SONGS } from '../engine/songs/index.js';
import { LEDGER } from '../engine/songs/ledger.js';

// 곡 모양
assert.deepEqual(THEME_ERRORS, [], '가락 적기 오류');
assert.equal(BARS, 16);
for (let i = 0; i < BARS; i++) {
  const len = MEL[i].reduce((s, n) => s + n.d, 0);
  assert.equal(len, 4, `${i + 1}마디 박 수`);
  for (const s of chordSpans(i)) assert.ok(COMP[s.name] && ROOT[s.name] != null, `${i + 1}마디 화음 ${s.name}의 소리 자리`);
}
// 다섯 음(솔 · 미 · 라 · 도 · 레)만
const PENTA = new Set([0, 2, 4, 7, 9]);
for (const bar of MEL) for (const n of bar) assert.ok(PENTA.has(pc(n.p)), `다섯 음 밖 ${n.p}`);
// 센박(1 · 3박)에 놓인 가락 음은 그 마디 화음 음
for (let i = 0; i < BARS; i++) for (const n of MEL[i]) if (n.b === 0 || n.b === 2) assert.ok(isChordTone(n.p, chordAt(i, n.b)), `${i + 1}마디 ${n.b + 1}박 ${n.p} — ${chordAt(i, n.b)} 화음 음이 아님`);
// 첫 마디 = 솔 미 솔 미 · 8마디는 도로 끝남(마침)
assert.deepEqual(MEL[0].map(n => n.p), [67, 64, 67, 64]);
assert.equal(MEL[7][MEL[7].length - 1].p, 60);
assert.equal(chordAt(7), 'C'); assert.equal(chordAt(6, 0), 'F'); assert.equal(chordAt(6, 3), 'G');

// 계단 — 줄 다섯 · 첫 판 13칸 = 13계단
assert.deepEqual(PARTS.map(p => p.key), ['bear', 'bunny', 'bird', 'hog', 'turtle']);
assert.equal(PARTS.reduce((s, p) => s + (p.lane ? p.max - (p.base || 0) : 0), 0), FIRST.length, '계단 수 = 첫 판 칸 수');
for (const p of PARTS) if (p.lane) assert.equal(STEP_TEXT[p.key].length, p.max + 1, p.key + ' 계단 글');
const L0 = levelsOf({});
assert.deepEqual(L0, { bear: 1, bunny: 0, bird: 0, hog: 0, turtle: 0 });
const ALL = levelsOf(Object.fromEntries(FIRST.map(id => [id, { stars: 1 }])));
assert.equal(stepsOf(ALL), FIRST.length);
assert.deepEqual(levelsOf({ so3: { stars: 2 }, ri1: { stars: 0 }, ri2: { stars: 3 } }), { bear: 1, bunny: 1, bird: 0, hog: 1, turtle: 0 });
assert.deepEqual(newParts({ bunny: 1 }, { bear: 1, bunny: 2, bird: 1, hog: 0, turtle: 0 }), [{ key: 'bunny', from: 1, to: 2 }, { key: 'bird', from: 0, to: 1 }]);
assert.equal(partOfCell('ri4').key, 'hog'); assert.equal(partOfCell('ak2').key, 'turtle'); assert.equal(partOfCell('so5').key, 'bunny');
// 계단이 오를수록 사건이 늘기만(줄어드는 계단 없음) · 곰은 처음부터
const count = lv => { let n = 0; for (let i = 0; i < BARS; i++) n += themeBar(i, lv).length; return n; };
const sig = lv => JSON.stringify(Array.from({ length: BARS }, (_, i) => themeBar(i, lv)));
let prev = count(L0), prevSig = sig(L0), lv = { ...L0 };
assert.ok(prev > 0, '계단 0에도 곰 반주');
for (const p of PARTS) if (p.lane) for (let k = (p.base || 0) + 1; k <= p.max; k++) {
  lv = { ...lv, [p.key]: k };
  const n = count(lv), sg = sig(lv);
  assert.ok(n > prev || (n === prev && sg !== prevSig), `${p.key} ${k}계단에서 들리는 것이 바뀌어야 함 (${prev} → ${n})`);
  prev = n; prevSig = sg;
}
// 곰 2계단(셈1) = 셈여림 — B 앞은 점점 세게 · 뒤는 점점 여리게(가장 센 마디가 B 가운데)
{ const peak = (b, l) => Math.max(...themeBar(b, l).map(e => e.vel)); const L2 = { ...L0, bear: 2 }; assert.ok(peak(11, L2) > peak(8, L2) && peak(11, L2) > peak(15, L2), '곰 셈여림 곡선'); }
// 곰 3계단(빠1) = 빠르기 — 끝 두 마디(15 · 16)만 점점 느리게(마디가 길어지고 박 사이가 벌어짐) · 나머지 마디 · 다음 바퀴 첫 마디는 제 빠르기
{
  const L3 = { ...L0, bear: 3 }, L2 = { ...L0, bear: 2 };
  assert.deepEqual(Array.from({ length: BARS }, (_, i) => barLen(i, L2)), Array(BARS).fill(4), '곰 2계단까지는 마디 길이 그대로');
  assert.ok(Array.from({ length: 14 }, (_, i) => barLen(i, L3)).every(x => x === 4) && barLen(16, L3) === 4, '빠르기 계단도 1~14마디 · 다음 바퀴 첫 마디는 제 빠르기');
  assert.ok(barLen(14, L3) > 4 && barLen(15, L3) > barLen(14, L3), `끝 두 마디가 점점 길어짐(${barLen(14, L3)} · ${barLen(15, L3)})`);
  const w = warpOf(15, L3), gaps = [0, 1, 2, 3].map(b => w(b + 1) - w(b));
  assert.ok(gaps.every((g, k) => !k || g > gaps[k - 1]), '16마디 안에서도 박 사이가 점점 벌어짐(점점 느리게)');
  assert.ok(gaps[3] > 1.4 && gaps[3] < 1.55, `마지막 박 빠르기 약 ${Math.round(100 / gaps[3])} — 보통(100)에서 빠1 '느리게'(67) 가까이`);
  // 같은 음 · 같은 줄 · 같은 차례 — 박 자리만 옮김(16마디 가락 음이 그대로 · 마지막 음이 마디 안)
  const a = themeBar(15, L2).filter(e => e.part === 'bear'), b = themeBar(15, L3).filter(e => e.part === 'bear');
  assert.deepEqual(b.map(e => e.p), a.map(e => e.p));
  assert.ok(b.some((e, k) => e.b > a[k].b), '박 자리가 뒤로');
  assert.ok(JSON.stringify(themeBar(3, L2)) === JSON.stringify(themeBar(3, L3)), '느려지지 않는 마디는 셈여림 계단과 같음');
}
// 모든 사건이 마디 안 · 줄 이름이 친구
for (let i = 0; i < BARS; i++) for (const e of themeBar(i, ALL)) {
  assert.ok(e.b >= 0 && e.b < barLen(i, ALL), `${i + 1}마디 사건 박 ${e.b}`);
  assert.ok(PARTS.some(p => p.key === e.part), '줄 이름 ' + e.part);
  if (e.kind === 'note') assert.ok(e.p > 30 && e.p < 110 && e.d > 0 && e.vel > 0 && e.vel <= 1, '음 값');
}
// 가락 줄: 1계단은 A만 · 2계단부터 B도
const bird = (k, i) => themeBar(i, { ...L0, bird: k }).filter(e => e.part === 'bird').length;
assert.ok(bird(1, 0) > 0 && bird(1, 9) === 0 && bird(2, 9) > 0);
assert.ok(cadence(ALL).length > cadence(L0).length);

// 박 놀이 반주 — 박과 화음만(가락은 징검다리만) · 박 드러남
const kinds = (ev, d) => ev.filter(e => e.drum === d).map(e => e.b);
assert.deepEqual(kinds(accompBar(0, { sal: 3 }), 'kick'), [0, 1, 2, 3]);
assert.deepEqual(kinds(accompBar(0, { sal: 2 }), 'kick'), [0, 2]);
assert.equal(accompBar(0, { sal: 1 }).filter(e => e.kind === 'drum').length, 0, '박 드러남 1 = 북 없음');
assert.deepEqual(kinds(accompBar(3, { sal: 'pulse' }), 'hat'), [0, 1, 2, 3]);
assert.equal(accompBar(0).filter(e => e.inst === 'lead').length, 0, '따라 치기 반주에 가락 X');
assert.ok(accompBar(0, { mel: true }).some(e => e.inst === 'lead'));
assert.ok(accompBar(0, { sal: 2, mel: true }).every(e => e.kind === 'drum' || ['bass', 'keys', 'lead'].includes(e.inst)), '박 놀이 반주는 가벼운 소리만');
for (let i = 0; i < BARS; i++) for (const e of accompBar(i, { sal: 2, mel: true })) if (e.kind === 'note' && e.inst !== 'lead') assert.ok(isChordTone(e.p, chordAt(i, e.b)), `반주 ${i + 1}마디 ${e.p}`);
assert.deepEqual(themeRun(6), [0, 1, 2, 3, 6, 7]);
assert.deepEqual(themeRun(2), [6, 7]);
assert.equal(themeRun(9).length, 9);
// 막대 음에 맞는 화음 · 풍선 음
assert.equal(harmonize([{ p: 67, b: 0, d: 1 }, { p: 64, b: 1, d: 1 }, { p: 67, b: 2, d: 2 }]), 'C');
assert.equal(harmonize([{ p: 69, b: 0, d: 2 }, { p: 64, b: 2, d: 1 }, { p: 69, b: 3, d: 1 }]), 'Am');
assert.equal(harmonize([{ p: 69, b: 0, d: 2 }, { p: 69, b: 2, d: 2 }]), 'F');
assert.equal(harmonize([]), 'C');
assert.deepEqual(['C', 'Am', 'F', 'G', 'Em'].map(c => holdPitch(c)), [67, 69, 69, 67, 67]);

// 손맛
assert.deepEqual(goodNotes(1).pair, [79, 84], '첫 맞음 = 예전 소리(솔 → 도)');
assert.ok(LADDER.every((p, i) => !i || p > LADDER[i - 1]), '사다리는 오르기만');
assert.ok(goodNotes(6).chord && goodNotes(9).chord);
assert.ok(Math.min(...LADDER, ...STAR_NOTES) >= 79, '손맛 소리는 문제 음(C4~C5)보다 높게');
const F = fanfare();
assert.ok(F.every(e => e.b >= 0 && e.b < 8));
assert.deepEqual(F.filter(e => e.inst === 'lead').slice(0, 5).map(e => e.p), [67, 64, 67, 67, 72], '팡파르 = 첫 동기');
assert.ok(F.every(e => e.kind === 'drum' || ['lead', 'keys', 'bass'].includes(e.inst)), '팡파르는 가벼운 소리만');
// 닮음 검사 — 유명 곡 해시 · 앱의 전래 · 클래식 곡과 5음 조각이 기준(40%) 아래(우리 곡 규칙 docs/rights.md)
const sim = checkAll([{ id: 'theme', title: THEME.title, meter: [4, 4], tempo: THEME.bpm, mel: THEME.mel }, ...SONGS], [{ id: 'theme', kind: '자작' }, ...LEDGER], loadHashes()).find(r => r.id === 'theme');
assert.ok(sim.pass, `주제곡 닮음 ${pct(sim.best.g)}(${sim.best.name}) — 기준 ${pct(LIMIT)} 넘음`);
console.log(`✓ 주제곡 시험 통과 — ${BARS}마디 · 계단 ${stepsOf(ALL)} · 사건 ${count(L0)} → ${count(ALL)} · 반주 · 손맛 · 닮음 최고 ${pct(sim.best.g)}(${sim.best.name})`);
