// 기준표 점수판 — docs/bar.md의 갈래마다 '지금 몇 %인지'를 장부에서 뽑는다(손으로 적지 않는다).
//  node tools/bar.mjs → 표 · --json → 숫자만 · --list → 비어 있는 단계까지
//  장부: engine/flow.js(단계 62) · engine/cells.js(first = 만든 칸) · engine/load.js(난이도) · engine/depth.js(활동 종류 — 있으면) · tests/ear.report.json(소리 — 있으면)
import fs from 'node:fs';
import { ELEMENTS } from '../engine/flow.js';
import { CELLS } from '../engine/cells.js';
import { loadOf } from '../engine/load.js';

const root = new URL('..', import.meta.url);
const built = new Set(CELLS.filter(c => c.first).map(c => c.id));
const known = new Set(CELLS.map(c => c.id));
const steps = ELEMENTS.flatMap(el => el.steps.map(s => ({
  el: el.id, elName: el.name, id: s.id, name: s.name, lv: loadOf(s.id).lv,
  cells: s.acts.filter(a => a.startsWith('cell:')).map(a => a.slice(5)),
})));
for (const x of steps) x.has = x.cells.some(id => built.has(id));
const pct = (a, b) => (b ? Math.round(a / b * 100) : 100);
const frac = (list, f) => { const n = list.filter(f).length; return { n, of: list.length, pct: pct(n, list.length) }; };

const cover = frac(steps, x => x.has);
const upper = frac(steps.filter(x => x.lv >= 4), x => x.has);
const byEl = ELEMENTS.map(el => ({ id: el.id, name: el.name, ...frac(steps.filter(x => x.el === el.id), x => x.has) }));
const even = { pct: Math.min(...byEl.map(e => e.pct)), low: byEl.filter(e => e.pct < 100).map(e => `${e.name} ${e.n}/${e.of}`) };
const dead = steps.flatMap(x => x.cells.filter(id => !known.has(id)).map(id => `${x.id} → ${id}`));

// 활동 깊이 — engine/depth.js가 생기면 읽는다: DEPTH[단계 id] = 'LDEM' 가운데 있는 글자
let depth = null;
try {
  const { DEPTH } = await import('../engine/depth.js');
  const ok = x => { const k = DEPTH[x.id] || ''; return k.includes('L') && (k.includes('D') || k.includes('E')); };
  const make = ELEMENTS.map(el => ({ name: el.name, has: steps.some(x => x.el === el.id && (DEPTH[x.id] || '').includes('M')) }));
  const a = frac(steps, ok), m = frac(make, e => e.has);
  depth = { steps: a, make: m, pct: Math.round((a.pct * steps.length + m.pct * make.length) / (steps.length + make.length)),
    noHands: steps.filter(x => !ok(x)).map(x => x.id), noMake: make.filter(e => !e.has).map(e => e.name) };
} catch { /* 아직 없음 */ }

// 소리 — tests/ear.report.json이 생기면 읽는다: checks[] = { id, ok }
let ear = null;
try {
  const r = JSON.parse(fs.readFileSync(new URL('tests/ear.report.json', root), 'utf8'));
  if (Array.isArray(r.checks)) { const f = frac(r.checks, c => c.ok); ear = { ...f, open: r.checks.filter(c => !c.ok).map(c => c.id) }; }
} catch { /* 아직 없음 */ }

const out = { cover, upper, even, byEl, depth, ear, dead, cells: built.size };
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }

const row = (name, v, note) => console.log(`${name.padEnd(14)} ${String(v).padStart(4)}   ${note}`);
console.log(`음악 놀이터 기준표 — 만든 칸 ${built.size} · 단계 ${steps.length}`);
row('내용 범위', cover.pct + '%', `칸이 있는 단계 ${cover.n}/${cover.of}`);
row('5~6학년 쪽', upper.pct + '%', `난이도 4~5 단계 ${upper.n}/${upper.of}`);
row('요소 고르기', even.pct + '%', even.low.length ? '가장 낮은 요소 기준 — ' + even.low.join(' · ') : '요소 열 개 모두 참');
row('활동 깊이', depth ? depth.pct + '%' : '—', depth ? `듣기 + 손으로 하기 ${depth.steps.n}/${depth.steps.of} · 만들기 있는 요소 ${depth.make.n}/${depth.make.of}` : 'engine/depth.js 없음(조사 중)');
row('소리(기계)', ear ? ear.pct + '%' : '—', ear ? `잰 항목 ${ear.n}/${ear.of} 통과` : 'tests/ear.report.json 없음(재는 중)');
if (dead.length) console.log('죽은 연결: ' + dead.join(' · '));
if (process.argv.includes('--list')) {
  console.log('\n칸이 없는 단계');
  for (const x of steps.filter(s => !s.has)) console.log(`  ${x.id.padEnd(4)} 난이도 ${x.lv}  ${x.elName} — ${x.name}${x.cells.length ? '  (장부: ' + x.cells.join(', ') + ')' : ''}`);
}
