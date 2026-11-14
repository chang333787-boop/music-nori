// 합성음 높이 시험 — audio.js 악기마다 여러 음을 OfflineAudioContext로 그려, 소리가 자리 잡은 구간의 기본 주파수를 잰다.
//  freq(p)와 센트 차이 |센트| ≤ 6 이면 통과(0단계 관문). 결과 = window.__result = { rows:[{ inst, p, cents, ok, … }], worst }
//  재는 법(YIN 계열 · 시간 영역):
//   1) 거친 주기 — 구간 안 세 곳에서 정규화 자기상관(NSDF)을 기대 주기의 0.45~2.2배 사이에서 구해, 가장 높은 봉우리의 97%를 넘는
//      첫 봉우리(McLeod 방식)를 고른다. 한 옥타브 틀린 소리도 잡히게 기대 주기 둘레를 넓게 본다.
//   2) 다듬기 — 15ms마다 토막을 잘라, 주기 m개(약 20ms) 떨어진 곳의 차이 함수 Σ(x[i]−x[i+τ])² 가 가장 작은 τ를 포물선으로 다듬고
//      주기 = τ/m. 주기 여러 개를 건너 재면 표본 하나의 오차가 m으로 나뉜다(높은 음에서 중요).
//   3) 토막마다 센트를 내고 평균. 떨림(비브라토)이 있는 악기는 떨림이 여러 번 들어가는 1.55초를 평균한다(떨림이 반 번 남아도 1센트 아래).
//  소리 길: 악기 → dry → master → 압축기 → 출력(울림은 뺀다 — 울림은 음 높이를 바꾸지 않고 잡음만 섞는다).
import { Engine } from '../js/audio.js';
import { freq, letter } from '../../engine/theory.js';
import { ONSET, PLAN, measure, dcBlock } from './pitchmeasure.js';

const LIMIT = 6;

async function render(inst, p, dur, len, sr) {
  const ac = new OfflineAudioContext(1, Math.ceil(len * sr), sr);
  const e = new Engine();
  e._setup(ac);
  e.note(inst, p, ONSET, dur, 0.8, e.dry);
  return dcBlock((await ac.startRendering()).getChannelData(0));
}


const tbody = document.getElementById('rows'), sum = document.getElementById('sum');
const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; return td; };
function addRow(r) {
  const tr = document.createElement('tr');
  if (!r.ok) tr.className = 'bad';
  tr.append(cell(r.inst), cell(`${r.name} (${r.p})`), cell(r.sr), cell(r.fExp.toFixed(2), 'n'), cell(Number.isFinite(r.f) ? r.f.toFixed(2) : '—', 'n'),
    cell(Number.isFinite(r.cents) ? (r.cents > 0 ? '+' : '') + r.cents.toFixed(2) : '—', 'n'), cell(Number.isFinite(r.sd) ? r.sd.toFixed(1) : '—', 'n'),
    cell(r.seg), cell(r.ok ? '통과' : '넘음', r.ok ? 'ok' : 'no'));
  tbody.append(tr);
}

// 자가 점검 — 높이를 아는 소리(사인 · 톱니)를 일부러 몇 센트 어긋나게 그려, 재는 법이 그만큼을 돌려주는지 본다(시험의 시험)
async function selfCheck(sr) {
  const out = [];
  for (const [type, p, off] of [['sine', 33, 3], ['sawtooth', 45, -4.5], ['sine', 69, -2], ['sawtooth', 69, 5], ['square', 84, 2.5], ['sine', 100, -3]]) {
    const ac = new OfflineAudioContext(1, Math.ceil(0.8 * sr), sr), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq(p) * Math.pow(2, off / 1200); g.gain.value = 0.3;
    o.connect(g).connect(ac.destination); o.start(ONSET); o.stop(0.8);
    const x = (await ac.startRendering()).getChannelData(0);
    const r = measure(x, sr, freq(p), 0.05, 0.7);
    out.push({ type, p, sr, off, got: r ? Math.round(r.cents * 100) / 100 : NaN, err: r ? Math.abs(r.cents - off) : Infinity });
  }
  return out;
}

async function main() {
  const q = new URLSearchParams(location.search);
  const srs = (q.get('sr') || '48000,44100').split(',').map(Number).filter(v => v >= 8000);
  const only = q.get('inst') ? q.get('inst').split(',') : null;
  const t0 = performance.now(), rows = [], check = [];
  for (const sr of srs) check.push(...await selfCheck(sr));
  const checkErr = Math.max(...check.map(c => c.err));
  for (const sr of srs) {
    for (const plan of PLAN) {
      if (only && !only.includes(plan.inst)) continue;
      for (const p of plan.ps) {
        const fExp = freq(p);
        const x = await render(plan.inst, p, plan.dur, ONSET + plan.seg[1] + 0.05, sr);
        const res = measure(x, sr, fExp, plan.seg[0], plan.seg[1]);
        const seg = `${plan.seg[0].toFixed(2)}–${plan.seg[1].toFixed(2)}초` + (plan.how ? ` · ${plan.how}` : '') + (res ? ` · 토막 ${res.frames}개` : ' · 잴 수 없음') + (plan.why ? ` · ${plan.why(p, sr)}` : '');
        const cents = res ? Math.round(res.cents * 100) / 100 : NaN;
        const row = { inst: plan.inst, p, name: letter(p), sr, fExp, f: res ? res.f : NaN, cents, sd: res ? res.sd : NaN, seg, ok: Number.isFinite(cents) && Math.abs(cents) <= LIMIT };
        rows.push(row); addRow(row);
      }
      sum.textContent = `재는 중… ${rows.length}개`;
      await new Promise(r => setTimeout(r, 0));
    }
  }
  let worst = null;
  for (const r of rows) if (!worst || !Number.isFinite(r.cents) || Math.abs(r.cents) > Math.abs(worst.cents)) { if (!worst || Number.isFinite(worst.cents)) worst = r; }
  const bad = rows.filter(r => !r.ok);
  sum.textContent = (bad.length ? `넘음 ${bad.length}개 / ${rows.length}개` : `모두 통과 ${rows.length}개`) +
    (worst ? ` · 가장 큰 차이: ${worst.inst} ${worst.name} ${worst.sr}Hz ${Number.isFinite(worst.cents) ? worst.cents.toFixed(2) + '센트' : '잴 수 없음'}` : '') +
    ` · 자가 점검 최대 오차 ${checkErr.toFixed(2)}센트 · ${((performance.now() - t0) / 1000).toFixed(1)}초`;
  window.__result = { rows, worst, limit: LIMIT, srs, sec: (performance.now() - t0) / 1000, check, checkErr };
}
main().catch(e => { console.error(e); sum.textContent = '시험이 멈췄어요: ' + e.message; window.__result = { error: String(e && e.stack || e), rows: [], worst: null }; });
