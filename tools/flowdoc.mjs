// docs/flow.md의 표 — engine/flow.js(공부 흐름) · engine/marks.js(악보 판 기호)에서 뽑아 쓴다.
//  문서의 <!-- flow:begin --> … <!-- flow:end --> 사이만 바꾼다(그 밖의 글은 손으로 쓴 것).
//  node tools/flowdoc.mjs → 다시 씀 · --check → 문서의 표가 자료와 다르면 실패(npm test에 들어 있음)
import { readFileSync, writeFileSync } from 'node:fs';
import { ELEMENTS, EV, WALK, CLUSTERS, actInfo, elementById } from '../engine/flow.js';
import { GROUPS, PHRASES, signsOf } from '../engine/marks.js';
import { FACTORS, loadOf, needNames, ladder, earlyOk, gradeGaps } from '../engine/load.js';

const P = new URL('../docs/flow.md', import.meta.url).pathname;
const A = '<!-- flow:begin -->', Z = '<!-- flow:end -->';
const FRIEND = { hog: '고슴도치', bird: '참새', bunny: '토끼', turtle: '거북', bear: '곰' };
const cell = s => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
const actText = a => { const i = actInfo(a); return `${i.kindName} 「${i.label}」` + (i.built ? '' : '(아직 없음)'); };

const out = [];
const acts = ELEMENTS.flatMap(el => el.steps.flatMap(s => s.acts));
const built = acts.filter(a => actInfo(a).built);
out.push(`요소 ${ELEMENTS.length} · 단계 ${ELEMENTS.reduce((n, el) => n + el.steps.length, 0)} · 앱에서 쓸 것 ${acts.length}자리(만든 것 ${built.length}자리 = 서로 다른 화면 ${new Set(built).size}곳 · 아직 없는 것 ${acts.length - built.length}자리)`);
out.push('');
out.push('### 한 요소를 익히는 다섯 걸음');
out.push('');
out.push(WALK.map((w, i) => `${i + 1}. ${w.name} — ${w.where}`).join('\n'));
out.push('');
out.push('### 요소 사이의 차례(세 덩어리)');
out.push('');
out.push('| 덩어리 | 요소 | 근거 | 까닭 |');
out.push('|---|---|---|---|');
for (const c of CLUSTERS) out.push(`| ${c.name} | ${c.els.map(id => elementById(id).name).join(' · ')} | ${EV[c.ev]} | ${cell(c.why)} |`);
out.push('');
const inCluster = new Set(CLUSTERS.flatMap(c => c.els));
out.push('덩어리에 넣지 않은 것: ' + ELEMENTS.filter(el => !inCluster.has(el.id)).map(el => el.name).join(' · ') + '(견줄 연구를 찾지 못함)');

out.push('');
out.push('근거 꼬리표: ' + Object.values(EV).join(' / '));
for (const el of ELEMENTS) {
  out.push('');
  out.push(`### ${el.name} — ${FRIEND[el.friend]}`);
  out.push('');
  out.push(`교육과정(2022 개정) 요소: ${el.curr}`);
  out.push('');
  out.push('| 차례 | 단계 | 학년 | 난이도(앱 분석) | 먼저 하면 좋은 것 | 근거 | 앱에서 쓸 것 | 까닭 |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const s of el.steps) {
    const l = loadOf(s.id), needs = needNames(s.id).map(x => `${x.id} ${cell(x.step.name)}`).join(' · ') || '—';
    out.push(`| ${s.id} | ${cell(s.name)} | ${cell(s.g)} | ${l.lv} ${l.word}(${l.f.join('·')} = ${l.sum}) | ${needs} | ${s.ev.map(k => EV[k]).join(' · ')} | ${s.acts.length ? s.acts.map(actText).join(' · ') : '(없음)'} | ${cell(s.why)} |`);
  }
  if (el.mix.length) {
    out.push('');
    out.push('헷갈리기 쉬운 곳');
    for (const m of el.mix) out.push(`- ${m.t} — ${m.src} · ${EV[m.ev]}`);
  }
}

// 난이도 — engine/load.js(앱이 스스로 따져 본 것 · 뜻은 문서 8장)
const stepText = x => `${x.id} ${cell(x.step.name)}`;
out.push('');
out.push('### 난이도 사다리(앱 분석 — 연구나 아이들 자료로 확인한 것이 아님)');
out.push('');
out.push(`난이도 칸의 괄호는 여섯 가지 점수(${FACTORS.map(f => f.name).join('·')})와 합계다. 난이도는 먼저 하면 좋은 단계보다 낮을 수 없다.`);
out.push('');
out.push('| 난이도 | 단계 수 | 단계(요소마다) |');
out.push('|---|---|---|');
for (const r of ladder()) out.push(`| ${r.lv} ${r.word} | ${r.els.reduce((n, x) => n + x.steps.length, 0)} | ${r.els.map(x => `${x.el.name}: ${x.steps.map(s => `${s.id} ${cell(s.name)}`).join(', ')}`).join(' / ')} |`);
out.push('');
out.push('점수 기준');
for (const f of FACTORS) out.push(`- ${f.name}(${f.full}) — ${f.at.map((t, i) => `${i} ${t}`).join(' / ')}`);
out.push('');
const GG = gradeGaps();
out.push('교과서 자리와 난이도가 다른 곳');
out.push(`- 4학년이나 그 뒤에 처음 나오지만 난이도 2 이하: ${GG.soon.map(stepText).join(' · ')}`);
out.push(`- 3학년이나 그 앞에 처음 나오지만 난이도 4 이상: ${GG.slow.map(stepText).join(' · ')}`);
out.push(`- 요소 안 차례는 뒤인데 앞 단계보다 난이도가 낮은 단계: ${earlyOk().map(x => `${x.step.id} ${cell(x.step.name)}(${x.lv}) ← ${x.after.id}(${x.afterLv})`).join(' · ')}`);
out.push('');
out.push('### 악보 판의 묶음 · 기호 · 가락');
out.push('');
out.push('| 묶음 | 친구 | 기호 | 가락(곡 대장에서 자른 도막) |');
out.push('|---|---|---|---|');
for (const g of GROUPS) {
  const ph = PHRASES.find(p => p.id === g.phrase);
  const signs = signsOf(g.id).map(s => (s.kind === 'letter' ? `${s.name} ${s.sym}` : s.name)).join(' · ');
  out.push(`| ${g.name} | ${FRIEND[g.friend]} | ${signs} | ${cell(ph.title)} — ${ph.part}(${ph.meter.join('/')}) |`);
}

const body = out.join('\n');
const cur = readFileSync(P, 'utf8');
const a = cur.indexOf(A), z = cur.indexOf(Z);
if (a < 0 || z < a) { console.log('✗ docs/flow.md에 ' + A + ' … ' + Z + ' 자리가 없음'); process.exit(1); }
const next = cur.slice(0, a + A.length) + '\n' + body + '\n' + cur.slice(z);
if (process.argv.includes('--check')) {
  if (next !== cur) { console.log('✗ docs/flow.md의 표가 engine/flow.js와 다름 — node tools/flowdoc.mjs'); process.exit(1); }
  console.log('✓ docs/flow.md 표가 자료와 같음');
} else { writeFileSync(P, next); console.log('docs/flow.md 표 다시 씀 — ' + out[0]); }
