// 곡 시험 — node tests/songs.test.mjs (의존성 없음)
//  30곡 마디 검사 · id 겹침 · 권리 대장(가락·미국 기준 '가능') · 노랫말 칸 없음 · 칸 이름 ·
//  자작 곡이 칸 규칙 안 · 높낮이 칸 음역 C4~E5 · 닮음 검사(해시 파일만 읽음).
//  끝에 '공개 전 할 일'(판본 대조 안 된 곡)을 경고로 찍는다 — 실패로 치지 않는다.
import assert from 'node:assert/strict';
import { makeSong } from '../engine/song.js';
import { parsePitch, durTicks } from '../engine/theory.js';
import { SONGS, songById } from '../engine/songs/index.js';
import { LEDGER, ledgerById } from '../engine/songs/ledger.js';
import { checkAll, loadHashes, pct, LIMIT } from '../tools/simcheck.mjs';

const KNOWN_CELLS = new Set([
  ...[1, 2, 3, 4, 5, 6].map(n => `소${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `가${n}`),
  '건1', '건2', '건3', '코1', '코2', '코3', ...Array.from({ length: 10 }, (_, i) => `리${i + 1}`),
  ...[1, 2, 3, 4, 5].map(n => `악${n}`), '셈1', '셈2', '빠1', '빠2', '음1', '음2', '형1', '반1', '반2', '형2', '화1',
]);
const KINDS = new Set(['자작', '외국 전래', '클래식', '국내 전래']);
const VERDICTS = new Set(['가능', '불가', '확인 필요']);
const P = n => parsePitch(n);
const LOW = P('C4'), HIGH = P('E5');
const Q = durTicks('q'), H = durTicks('h');

// 자작 곡의 칸 규칙(계획서 칸 표의 뼈대)
const RULES = {
  가1: { pitches: ['G4', 'E4'], durs: [Q, H] },
  가2: { pitches: ['G4', 'E4', 'A4'], must: 'A4', durs: [Q, H] },
  가3: { pitches: ['C4', 'E4', 'G4', 'A4'], must: 'C4', durs: [Q, H] },
  리2: { onePitch: true, durs: [Q] },
  리4: { onePitch: true, durs: [Q, H], mustDur: H },
  리5: { meters: ['2/4', '3/4', '4/4'] },
};

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const songs = SONGS.map(s => ({ def: s, song: makeSong(s) }));

// 1. 곡 수 · id
ok(SONGS.length === 30, `곡은 정확히 30곡이어야 함 — 지금 ${SONGS.length}곡`);
const ids = SONGS.map(s => s.id);
ok(new Set(ids).size === ids.length, `곡 id 겹침: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(', ')}`);
const lids = LEDGER.map(r => r.id);
ok(new Set(lids).size === lids.length, `대장 id 겹침: ${lids.filter((x, i) => lids.indexOf(x) !== i).join(', ')}`);
ok(songById('ode') && songById('ode').id === 'ode' && songById('없는곡') === null, 'songById 가 id로 곡을 찾아야 함');

// 2. 곡마다
for (const { def, song } of songs) {
  const at = `[${def.id}]`;
  ok(song.errors.length === 0, `${at} 마디 검사 오류: ${song.errors.join(' / ')}`);
  ok(!('lyrics' in def) && !('words' in def), `${at} 곡에 노랫말 칸이 있으면 안 됨`);
  ok(typeof def.title === 'string' && def.title && typeof def.use === 'string' && def.use, `${at} title·use 가 있어야 함`);
  ok(Array.isArray(def.meter) && Number.isFinite(def.tempo) && def.key === 0, `${at} meter·tempo·key(0) 확인`);
  ok(Array.isArray(def.cells) && def.cells.length > 0, `${at} cells 가 비었음`);
  for (const c of def.cells) ok(KNOWN_CELLS.has(c), `${at} 모르는 칸 이름: ${c}`);

  const row = ledgerById(def.id);
  ok(row, `${at} 권리 대장에 줄이 없음`);
  ok(KINDS.has(row.kind), `${at} 대장 kind 가 이상함: ${row.kind}`);
  ok(row.melody.verdict === '가능' && row.melody.us === '가능', `${at} 가락 판정(${row.melody.verdict})·미국 기준(${row.melody.us}) 둘 다 '가능'이어야 앱에 넣음`);
  ok(row.lyrics && row.lyrics.verdict === '안 씀', `${at} 이번 판은 노랫말을 넣지 않음(lyrics.verdict = '안 씀')`);
  if (row.kind === '국내 전래') ok(row.edition.checked === true, `${at} 국내 전래는 옛 출처 대조 뒤에만 앱에 넣음`);
  if (row.kind !== '자작' && row.melody.died != null) ok(row.melody.died <= 1962, `${at} 작곡자 ${row.melody.died}년 사망 — 1962년 이전이어야 함`);

  const notes = song.ev.filter(e => e.p != null);
  // 높낮이 칸(소·가)은 가온 도 위쪽 C4~E5
  if (def.cells.some(c => /^(소|가)\d/.test(c))) {
    for (const n of notes) ok(n.p >= LOW && n.p <= HIGH, `${at} 높낮이 칸 곡의 음 ${n.p}(MIDI)가 C4~E5 밖`);
  }
  // 자작 곡은 칸 규칙 안
  if (row.kind === '자작') {
    ok(row.made && row.made.skeleton && row.made.by && row.made.simcheck, `${at} 자작 곡은 made(skeleton·by·simcheck)가 있어야 함`);
    ok(song.bars.length >= 2 && song.bars.length <= 4, `${at} 자작 곡은 2~4마디 — 지금 ${song.bars.length}마디`);
    const ruled = def.cells.filter(c => RULES[c]);
    ok(ruled.length > 0, `${at} 자작 곡의 칸(${def.cells.join(',')})에 규칙이 없음`);
    for (const c of ruled) {
      const r = RULES[c];
      if (r.pitches) {
        const allow = new Set(r.pitches.map(P));
        for (const n of notes) ok(allow.has(n.p), `${at} ${c} 칸은 ${r.pitches.join('·')}만 — ${n.p}(MIDI)가 섞임`);
        if (r.must) ok(notes.some(n => n.p === P(r.must)), `${at} ${c} 칸 곡엔 ${r.must}가 꼭 나와야 함`);
      }
      if (r.onePitch) ok(new Set(notes.map(n => n.p)).size === 1, `${at} ${c} 칸은 한 음 높이로 리듬만`);
      if (r.durs) for (const e of song.ev) ok(r.durs.includes(e.d), `${at} ${c} 칸에 쓸 수 없는 길이 ${e.d}틱`);
      if (r.mustDur) ok(notes.some(n => n.d === r.mustDur), `${at} ${c} 칸 곡엔 2분음표가 꼭 나와야 함`);
      if (r.meters) ok(r.meters.includes(def.meter.join('/')), `${at} ${c} 칸 박자 ${def.meter.join('/')}`);
      if (!r.meters) ok(['2/4', '4/4'].includes(def.meter.join('/')), `${at} 1~2학년 자작 곡은 4/4 또는 2/4`);
    }
  } else {
    ok(row.edition && Array.isArray(row.edition.sources) && typeof row.edition.checked === 'boolean', `${at} 판본(edition) 칸이 있어야 함`);
    if (row.edition.checked) ok(row.edition.sources.length >= 2, `${at} checked:true 면 출처가 둘 이상이어야 함`);
  }
}

// 3. 리5 박자 비교 짝 — 같은 음 모음 · 같은 빠르기 · 박자만 다름
const r5 = songs.filter(x => x.def.cells.includes('리5') && ledgerById(x.def.id).kind === '자작');
ok(r5.length === 2, `리5 자작 짝은 둘 — 지금 ${r5.length}`);
const pset = x => [...new Set(x.song.ev.filter(e => e.p != null).map(e => e.p))].sort().join(',');
ok(pset(r5[0]) === pset(r5[1]), '리5 짝은 같은 음들로');
ok(r5[0].def.tempo === r5[1].def.tempo, '리5 짝은 같은 빠르기');
ok(new Set(r5.map(x => x.def.meter.join('/'))).size === 2 && r5.some(x => x.def.meter.join('/') === '2/4') && r5.some(x => x.def.meter.join('/') === '3/4'), '리5 짝은 2/4 하나 · 3/4 하나');

// 4. 대장 줄 모양
for (const r of LEDGER) {
  const at = `[대장 ${r.id}]`;
  ok(KINDS.has(r.kind) && r.title && r.checkedAt, `${at} kind·title·checkedAt`);
  ok(VERDICTS.has(r.melody.verdict) && VERDICTS.has(r.melody.us) && r.melody.why, `${at} melody 판정 칸`);
  ok(r.lyrics && r.lyrics.verdict === '안 씀', `${at} 노랫말은 '안 씀'`);
  ok(r.kind === '자작' ? !!r.made : !!r.edition, `${at} 자작은 made, 나머지는 edition`);
}
const kinds = k => SONGS.filter(s => ledgerById(s.id).kind === k).length;
ok(kinds('자작') === 12 && kinds('외국 전래') === 12 && kinds('클래식') === 6, `구성 자작 12·외국 전래 12·클래식 6 — 지금 ${kinds('자작')}·${kinds('외국 전래')}·${kinds('클래식')}`);

// 5. 닮음 검사(해시 파일만 읽음)
const hashes = loadHashes();
ok(hashes.length >= 10, '닮음 검사 해시 파일에 유명 곡이 열 곡 이상');
const sim = checkAll(SONGS, LEDGER, hashes);
const warn = [];
for (const r of sim) {
  ok(r.pass, `[${r.id}] 닮음 ${pct(r.best.g)}(${r.best.name}) — 기준 ${pct(LIMIT)} 넘음, 다시 지어야 함`);
  const row = ledgerById(r.id);
  ok(row.made.simcheck.startsWith('통과'), `[${r.id}] 대장 made.simcheck 가 '통과'가 아님`);
  const m = /최고 (\d+)%/.exec(row.made.simcheck);
  if (!m || Number(m[1]) !== Math.round(r.best.g * 100)) warn.push(`${r.id}: 대장엔 '${row.made.simcheck}', 지금 계산은 최고 ${pct(r.best.g)}(${r.best.name}) — 대장 줄을 고쳐 주세요`);
}
const top = sim.reduce((a, b) => (b.best.g > a.best.g ? b : a));
// 역시험 — 베낀 곡을 자작이라고 넣으면 잡아내야 한다(도구가 살아 있는지)
{
  const fake = (id, mel, meter = [4, 4]) => ({ id, title: id, meter, tempo: 100, key: 0, cells: ['가5'], use: '-', mel });
  const probe = [fake('zz-copy-app', SONGS.find(s => s.id === 'ode').mel),                       // 앱 곡 그대로
    fake('zz-copy-hash', 'C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h')];      // 해시에만 있는 첫머리(트윙클)
  const led = [...LEDGER, ...probe.map(p => ({ id: p.id, kind: '자작' }))];
  const res = checkAll([...SONGS, ...probe], led, hashes).filter(r => r.id.startsWith('zz-'));
  for (const r of res) ok(!r.pass && r.best.g >= LIMIT, `[역시험 ${r.id}] 베낀 곡을 못 잡음(${pct(r.best.g)})`);
}

// 6. 공개 전 할 일(실패 아님)
const todo = SONGS.map(s => ledgerById(s.id)).filter(r => r.edition && !r.edition.checked);
if (todo.length || warn.length) {
  console.warn(`⚠ 공개 전 할 일 — 판본 대조 안 된 곡 ${todo.length}개:`);
  for (const r of todo) console.warn(`   · ${r.id} ${r.title} — ${r.edition.note}`);
  for (const w of warn) console.warn(`   · 닮음 기록 어긋남 ${w}`);
}
console.log(`✓ 곡 시험 통과 — 30곡 · 확인 ${checks}개 · 닮음 최고 ${pct(top.best.g)}(${top.id} ↔ ${top.best.name}) · 판본 대조 남은 곡 ${todo.length}개`);
