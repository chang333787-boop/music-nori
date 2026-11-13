// 리3 8분음표 둘 — 박 하나에 소리 둘(박은 그대로 걷고, 그 안을 반으로 나눈다)
//  리듬 음절은 한 가지만: ‘따’(4분음표) · ‘띠띠’(8분음표 둘) · ‘쉼’ · ‘따아’(2분음표) — 2분할 음절(Colley 1987 · 기획 evidence §③-2 · _beat.js SYL · cells.js 쉬운 말 표와 같음)
//  보기: 예시 넷(같은 북으로 ‘따’ 넷 ↔ ‘띠띠’ 넷 · 섞은 것 둘) — 박 점(걸음)은 박마다 하나, 음절은 소리마다 하나씩 반짝
//  연습: 고슴도치가 한 마디(‘따’ · ‘띠띠’ · ‘쉼’)를 치면 다음 네 박에 그대로 — 세 번 이어서 맞히면 지남
//  확인 게임: 따라 치기 10판 — 단계 꼬리표 문항 표(PLAN) · 단계 안 섞기 + 씨앗(kit.seed)
//   소개(그림 + 소리) → 발전(그림 + 소리 · 리2 ‘쉼’) → 비틀기(그림 없이 듣고만 · 리2 ‘쉼’으로 시작 · 두 박 동안 길게 이어지는 소리 하나) → 마무리(듣고만 · 소개 리듬 그대로 빨라진 판)
//   그림 판 4 · 듣기만 판 6 — 악보만 보고 치면 10판 중 4판(별 ① '절반 넘게' X · 별 ② '5번 이어서' X) → 별은 귀로 들어야 받음(tests/cells.test.mjs 화면 틈 봇)
//  판정: 한 마디 = 반 박 자리 8개. 소리 자리는 engine/judge.js 판정 창(가장 짧은 간격 = 반 박의 35%까지) · 소리 없는 자리(‘따’ 뒤 반 박 · ‘쉼’ · ‘따아’가 이어지는 동안)에서
//   반 박의 0.35 안에 치면 '덤'(틀림) · 그 사이는 셈하지 않음(너그럽게 · 리2 쉼과 같은 규칙)
//   빠르기는 반 박 때문에 판정 창이 줄지 않게 리2보다 느리게(docs/measure.md §5-1) · 마무리 두 판만 리2 빠르기
//  그림 없는 판은 화면이 소리를 알려 주지 않는다: 카드 '?' · 고슴도치는 박마다 똑같이 · 소리마다 반짝 X · 그 음표 자리가 다 지난 뒤에만 그림을 보임
//  2분음표 ‘따아’는 한 번 치면 된다(꾹 누르고 있으면 내 소리가 길게 이어짐 · 누름 길이는 판정하지 않음) — 리4가 차례상 뒤라 이름 없이 '길게 이어지는 소리'로만 섞음
import { newBus, killBus, heardNow, perfOf, autoScheduler, pressInput, fireDown, fireUp, startCard, noteSVG, palmSVG, exampleGroup, countTeller, barPump, accompSound, endChord } from './_beat.js';
import { windows, tapStats } from '../../../engine/judge.js';
import { chordAt, holdPitch } from '../../../engine/theme.js';
import { factTip, stageCuts } from '../cellkit.js';

// ── 빠르기 · 음표 ──
//  반 박 간격 = 30000 / BPM ms · 판정 창은 그 35%까지만(judge.js windows) — 바탕 빠르기는 3~4 · 5~6학년 창이 하나도 줄지 않는 값,
//  1~2학년은 '8분음표 판은 100 BPM 이하 · 80 미만은 도전 판만'(기획 evidence §③-4) 안에서 가장 넓은 창(±125ms)
export const TEMPO = { low: 84, mid: 88, high: 96 };
export const FAST = { low: 96, mid: 100, high: 108 };      // 마무리 '빨라진 판' = 리2 따라 치기 빠르기(창 ±97~109ms)
export const bpmFor = (band, fast = false) => { const T = fast ? FAST : TEMPO; return T[band] || T.mid; };
const BEATS = { q: 1, ee: 1, qr: 1, h: 2 };
export const SYLS = { q: ['따'], ee: ['띠', '띠'], qr: ['쉼'], h: ['따아'] };
const NOTE = { q: 'q', ee: 'ee', qr: 'qr', h: 'h' };
const COUNT = 4;
const ORD = ['첫째', '둘째', '셋째', '넷째'];
export const beatsOf = pat => pat.reduce((a, k) => a + BEATS[k], 0);

// ── 확인 게임 문항 표(X2) — 줄 하나 = 한 판(한 마디 4/4) · right = 그 리듬 그대로 치기 ──
export const PLAN = [
  { stage: 'intro', pat: ['q', 'q', 'ee', 'q'] },
  { stage: 'intro', pat: ['ee', 'q', 'ee', 'q'] },
  { stage: 'grow', pat: ['q', 'ee', 'ee', 'q'] },
  { stage: 'grow', pat: ['ee', 'ee', 'q', 'qr'] },                   // 리2 ‘쉼’
  { stage: 'twist', pat: ['q', 'ee', 'q', 'ee'], hidden: true },
  { stage: 'twist', pat: ['ee', 'ee', 'h'], hidden: true },          // 짧은 소리 둘(한 박) ↔ 길게 이어지는 소리 하나(두 박)
  { stage: 'twist', pat: ['qr', 'ee', 'q', 'ee'], hidden: true },    // 리2 ‘쉼’으로 시작
  { stage: 'twist', pat: ['ee', 'ee', 'ee', 'q'], hidden: true },
  { stage: 'end', pat: ['ee', 'q', 'ee', 'q'], hidden: true, fast: true },   // 소개 둘째 리듬 그대로 · 빨라짐
  { stage: 'end', pat: ['q', 'q', 'ee', 'q'], hidden: true, fast: true },    // 소개 첫째 리듬 그대로 · 빨라짐
];
export const CUTS = stageCuts(PLAN);                 // [2, 4, 8] — 섞어도 '5번째 판부터 그림 없이'가 그대로 맞게
//  뒤집기 X(빨라진 판이 소개 리듬과 같아야 함) · 리듬이 다 달라 답 수 맞추기 X
export const SHUF = { answerOf: p => p.pat.join(' '), balance: false };
//  박 칸이라 찍기 바닥(chance) 없이 예전 규칙(① 절반 넘게 ② 5번 이어서 ③ 모두) — 듣지 않는 길은 듣기만 판 6으로 막음(위)
const STREAK = 5;

const FOLLOW = [['q', 'q', 'ee', 'q'], ['ee', 'q', 'ee', 'q'], ['q', 'ee', 'q', 'ee'], ['ee', 'ee', 'q', 'q'], ['q', 'ee', 'ee', 'q'], ['ee', 'q', 'q', 'qr'], ['ee', 'ee', 'ee', 'q'], ['q', 'qr', 'ee', 'q']];
const EXAMPLES = [
  { pat: ['q', 'q', 'q', 'q'], name: '북 — 박마다 하나', play: (e, t, d, b) => e.drum('deong', t, 0.85, b) },
  { pat: ['ee', 'ee', 'ee', 'ee'], name: '북 — 박마다 둘', play: (e, t, d, b) => e.drum('deong', t, 0.85, b) },
  { pat: ['q', 'q', 'ee', 'q'], name: '실로폰', play: (e, t, d, b) => e.note('xylo', 79, t, Math.min(0.3, d), 0.8, b) },
  { pat: ['ee', 'q', 'ee', 'qr'], name: '피아노', play: (e, t, d, b) => e.note('piano', 72, t, d * 0.9, 0.75, b) },
];

// ── 판정(순수 계산 · node 시험 tests/beatcells.test.mjs · cells.test.mjs 봇) ──
// 한 마디 → 반 박 자리 [{ kind: 'hit' 소리 · 'off' ‘따’ 뒤 반 박 · 'rest' 쉼 · 'hold' ‘따아’가 이어지는 동안, tok: 몇째 음표, s: 그 음표 안 몇째 소리 }]
export function slotsOf(pat) {
  const out = [];
  pat.forEach((k, tok) => {
    if (k === 'q') out.push({ kind: 'hit', tok, s: 0 }, { kind: 'off', tok });
    else if (k === 'ee') out.push({ kind: 'hit', tok, s: 0 }, { kind: 'hit', tok, s: 1 });
    else if (k === 'qr') out.push({ kind: 'rest', tok }, { kind: 'rest', tok });
    else if (k === 'h') out.push({ kind: 'hit', tok, s: 0 }, { kind: 'hold', tok }, { kind: 'hold', tok }, { kind: 'hold', tok });
  });
  return out;
}
// 소리 차례 [{ tok, s, b(마디 안 박 · 0.5 단위), len(박) }] — 고슴도치 소리 · 보기 반짝
export function soundsOf(pat) {
  const out = [];
  let b = 0;
  pat.forEach((k, tok) => {
    if (k === 'q') out.push({ tok, s: 0, b, len: 1 });
    else if (k === 'ee') out.push({ tok, s: 0, b, len: 0.5 }, { tok, s: 1, b: b + 0.5, len: 0.5 });
    else if (k === 'h') out.push({ tok, s: 0, b, len: 2 });
    b += BEATS[k];
  });
  return out;
}
// 두드림 하나(t ms · 기기 지연 뺀 뒤) → 가장 가까운 반 박 자리. 소리 자리는 판정 창 안일 때만 great/ok ·
//  소리 없는 자리는 그 자리에서 반 박의 0.35 안이면 덤(extra) · 그 밖(자리와 자리 사이 · 창 밖)은 null(셈하지 않음)
export function classifySlot(t, slotMs, slots, w, halfMs) {
  if (!slotMs.length || t < slotMs[0] - halfMs / 2 || t >= slotMs[slotMs.length - 1] + halfMs / 2) return null;
  let j = 0;
  for (let i = 1; i < slotMs.length; i++) if (Math.abs(t - slotMs[i]) < Math.abs(t - slotMs[j])) j = i;
  const d = t - slotMs[j], sl = slots[j];
  if (sl.kind !== 'hit') return Math.abs(d) <= halfMs * 0.35 ? { j, kind: sl.kind, extra: true, off: d } : null;
  if (d < -w.early || d > w.late) return null;
  return { j, kind: Math.abs(d) <= w.great ? 'great' : 'ok', off: d };
}
// 음표 하나의 결과 — 덤이 있으면 'extra' · 쉼을 지켰으면 'rest' · 놓친 소리가 있으면 'miss' · 모두 딱이면 'great' · 아니면 'ok'
export function tokResult(k, marks) {
  if (marks.some(m => m === 'extra')) return 'extra';
  if (k === 'qr') return 'rest';
  const hits = marks.filter(m => m !== null && m !== undefined && m !== 'quiet');
  if (hits.some(m => m === 'miss')) return 'miss';
  return hits.every(m => m === 'great') ? 'great' : 'ok';
}
// 한 마디 판정 — pat · slotMs(반 박 자리 시각 ms) · taps(두드린 시각 ms · 같은 시계)
//  → { slots: [{ kind, tok, s, got: 'great'|'ok'|'miss'|'extra'|null, off }], toks: [결과], ok, misses, extras: { off, rest, hold }, nExtra, win }
export function judgeBar(pat, slotMs, taps, { band = 'mid', latency = 0, halfMs } = {}) {
  const slots = slotsOf(pat);
  if (halfMs == null) halfMs = slotMs.length > 1 ? slotMs[1] - slotMs[0] : 300;
  const w = windows(band, halfMs);
  const out = slots.map(sl => ({ ...sl, got: sl.kind === 'hit' ? 'miss' : null, off: null }));
  for (const raw of [...taps].sort((a, z) => a - z)) {
    const c = classifySlot(raw - latency, slotMs, slots, w, halfMs);
    if (!c) continue;
    const g = out[c.j];
    if (c.extra) { g.got = 'extra'; continue; }
    if (g.got !== 'miss') continue;                         // 같은 소리를 두 번 — 첫 번째만
    g.got = c.kind; g.off = c.off;
  }
  const extras = { off: 0, rest: 0, hold: 0 };
  for (const g of out) if (g.got === 'extra') extras[g.kind]++;
  const misses = out.filter(g => g.got === 'miss').length, nExtra = extras.off + extras.rest + extras.hold;
  const toks = pat.map((k, tok) => tokResult(k, out.filter(g => g.tok === tok).map(g => g.got)));
  return { slots: out, toks, ok: !misses && !nExtra, misses, extras, nExtra, win: w };
}

// ── 결과 한 줄(사실만 · N1 factTip) — 틀린 판의 갈래 ──
// TV '틀린 갈래' 막대 이름(X6 둘째) — 아래 tipOf 갈래와 같은 차례 · 짧게(선생님이 다시 짚을 곳)
export const TIPS_TV = ['띠띠를 한 번만', '따 박에 두 번', '쉼 박에 침', '긴 소리 동안 또 침', '빨라진 판', '듣기만 한 판'];
export function tipOf(plan, results, judged = []) {
  const wrongWith = f => plan.reduce((n, p, k) => n + (results[k] === false && judged[k] && f(judged[k], p) ? 1 : 0), 0);
  const eeHalf = (j, p) => p.pat.some((k, tok) => k === 'ee' && j.slots.filter(g => g.tok === tok && g.got === 'miss').length === 1);
  const n = {
    half: wrongWith(eeHalf), off: wrongWith(j => j.extras.off > 0), rest: wrongWith(j => j.extras.rest > 0), hold: wrongWith(j => j.extras.hold > 0),
    fast: wrongWith((j, p) => !!p.fast), hid: wrongWith((j, p) => !!p.hidden),
  };
  return factTip(results, [
    { n: n.half, text: `‘띠띠’를 한 번만 친 판이 ${n.half}번 있었어요. ‘띠띠’는 한 박에 두 번이에요.` },
    { n: n.off, text: `‘따’ 박에 두 번 친 판이 ${n.off}번 있었어요. ‘따’는 한 박에 한 번이에요.` },
    { n: n.rest, text: `‘쉼’ 박에 친 판이 ${n.rest}번 있었어요. ‘쉼’에는 손바닥을 펴요.` },
    { n: n.hold, text: `길게 이어지는 소리 동안 또 친 판이 ${n.hold}번 있었어요. 길게 이어지면 한 번만 쳐요.` },
    { n: n.fast, text: `빨라진 판에서 ${n.fast}번 헷갈렸어요. 빨라져도 ‘띠띠’는 한 박에 둘이에요.` },
    { n: n.hid, text: `그림 없이 듣기만 한 판에서 ${n.hid}번 헷갈렸어요. 고슴도치 소리를 끝까지 들어요.` },
  ], '‘따’는 한 번, ‘띠띠’는 한 박에 두 번 — 그림 없이 듣기만 한 판과 빨라진 판까지 모두 그대로 쳤어요.');
}

// ── 소리 ──
//  고슴도치 = 딱(채편) + 짧은 피리 소리(그 마디 화음 음 · 길이 = 음표 길이 — 길게 이어지는 소리가 귀로 들리게) · 반주는 박과 화음만(docs/sound.md §4)
function callSounds(engine, bus, pat, tb, beat, themeBar) {
  for (const n of soundsOf(pat)) {
    const t = tb + n.b * beat, p = holdPitch(chordAt(themeBar, Math.floor(n.b)));
    engine.drum('deok', t, 0.62, bus);
    engine.note('lead', p, t, (n.len >= 2 ? n.len - 0.15 : n.len * 0.8) * beat, 0.5, bus);
  }
}
let RUN = 0;                                           // 판 틀마다 번호(자동 시험 목표 id가 겹치지 않게)
const SAY_GAME = '고슴도치가 치면, 다음 네 박에 그대로 쳐요';
const bump = el => { if (el.animate) el.animate([{ transform: 'none' }, { transform: 'translateY(5px) scaleY(.93)', offset: 0.35 }, { transform: 'none' }], { duration: 200, easing: 'ease-out' }); };

// ── 박 카드 한 줄(네 박) — 음표 하나 = 카드 하나(‘따아’는 두 칸 너비) · 기호 · 음절(소리마다) · 박 점(박마다 하나 = 걸음) ──
//  그림 없는 줄(hidden)은 박마다 '?' 카드 넷 — 음표를 보이면(reveal) 그때 제 모양으로
function beatRow(kit, { label, cls }) {
  const { h } = kit;
  const stick = kit.band === 'low';
  const cards = [0, 1, 2, 3].map(() => h('div', { class: 'r3-beat' }));
  const row = h('div', { class: 'r3-row ' + (cls || '') }, label, h('div', { class: 'r3-cards' }, ...cards));
  let pat = null, hidden = false, open = new Set(), tokBeat = [], beatTok = [];
  let nowB = -1, pastB = -1;
  const litB = new Set(), sylOn = new Set(), slotMark = new Map(), tokMark = new Map();
  let cardOf = [], sylEl = new Map(), dotEl = [];
  const shown = tok => !hidden || open.has(tok);
  function paint() {
    cardOf = []; sylEl = new Map(); dotEl = [];
    cards.forEach(c => { c.className = 'r3-beat'; c.replaceChildren(); });
    if (!pat) return;
    pat.forEach((k, tok) => {
      const b0 = tokBeat[tok], nb = BEATS[k];
      if (!shown(tok)) {                              // 그림 없음 — 박마다 '?'
        for (let i = 0; i < nb; i++) {
          const c = cards[b0 + i], dot = h('i', { class: 'dot' });
          c.classList.add('hid');
          c.append(h('div', { class: 'sym' }, h('span', { class: 'q' }, '?')), h('div', { class: 'syl' }), h('div', { class: 'dots' }, dot));
          cardOf[b0 + i] = c; dotEl[b0 + i] = dot;
        }
        return;
      }
      const c = cards[b0];
      if (k === 'qr') c.classList.add('rest');
      if (nb === 2) { c.classList.add('span2'); cards[b0 + 1].classList.add('gone'); }
      const sy = SYLS[k].map((t, s) => { const el = h('i', {}, t); sylEl.set(tok + ':' + s, el); return el; });
      const dots = Array.from({ length: nb }, (_, i) => { const d = h('i', { class: 'dot' }); dotEl[b0 + i] = d; cardOf[b0 + i] = c; return d; });
      c.append(h('div', { class: 'sym', html: noteSVG(NOTE[k], { stick: stick && k !== 'h', size: 86 }) }), h('div', { class: 'syl' }, ...sy), h('div', { class: 'dots' }, ...dots));
      if (k === 'qr') c.append(h('span', { class: 'pm', html: palmSVG(34) }));
    });
    // 상태 다시 입히기
    cardOf.forEach((c, b) => { if (litB.has(b)) c.classList.add('lit'); });
    dotEl.forEach((d, b) => d.classList.toggle('past', b <= pastB));
    for (const key of sylOn) { const el = sylEl.get(key); if (el) el.classList.add('on'); }
    for (const [key, m] of slotMark) { const el = sylEl.get(key); if (el) el.classList.add(m); }
    for (const [tok, m] of tokMark) { const c = cardOf[tokBeat[tok]]; if (c) c.classList.add('t-' + m); }
    now(nowB);
  }
  function now(b) {
    nowB = b;
    cards.forEach(c => c.classList.remove('now'));
    if (b >= 0 && cardOf[b]) cardOf[b].classList.add('now');
  }
  return {
    row,
    set(p, { hidden: hd = false } = {}) {
      pat = p; hidden = hd; open = new Set(); nowB = -1; pastB = -1;
      litB.clear(); sylOn.clear(); slotMark.clear(); tokMark.clear();
      tokBeat = []; beatTok = [];
      if (p) { let b = 0; p.forEach((k, tok) => { tokBeat[tok] = b; for (let i = 0; i < BEATS[k]; i++) beatTok[b + i] = tok; b += BEATS[k]; }); }
      paint();
    },
    reveal(tok) { if (!hidden || open.has(tok)) return; open.add(tok); paint(); },
    now,
    lit(b) { litB.add(b); if (cardOf[b]) cardOf[b].classList.add('lit'); },
    past(b) { pastB = Math.max(pastB, b); dotEl.forEach((d, i) => d.classList.toggle('past', i <= pastB)); },
    sound(tok, s) { const key = tok + ':' + s; sylOn.add(key); const el = sylEl.get(key); if (el) el.classList.add('on'); },
    markSlot(tok, s, m) { const key = tok + ':' + s; slotMark.set(key, m); const el = sylEl.get(key); if (el) { el.classList.remove('great', 'ok', 'miss'); el.classList.add(m); } },
    markTok(tok, m) { tokMark.set(tok, m); const c = cardOf[tokBeat[tok]]; if (c) { c.classList.remove('t-great', 't-ok', 't-miss', 't-rest', 't-extra'); c.classList.add('t-' + m); } },
    tokOfBeat: b => beatTok[b],
  };
}

// ── 따라 치기 틀 — 연습과 확인 게임이 같이 씀 ──
//  rounds = [{ pat, hidden, fast }] · 판마다 8박(고슴도치 4 + 나 4) · 준비 박 넷 뒤 쉼 없이 이어짐 · 판마다 빠르기가 다를 수 있음(마무리 빨라진 판)
function echoRun(kit, ui, view, { rounds, onRound, onEnd }) {
  const { engine } = kit;
  const ac = engine.ensure();
  const bus = newBus(engine), T = kit.timers();
  const band = kit.band, lat = kit.device.latencyMs;
  const R = rounds.length, total = COUNT + R * 8;
  const spb = r => 60 / bpmFor(band, rounds[r].fast);            // 판 r의 한 박(초)
  const roundOf = i => (i < COUNT ? 0 : Math.min(R - 1, Math.floor((i - COUNT) / 8)));
  const bt = [ac.currentTime + 0.45];                              // 박 시작 시각(오디오 초) — 준비 박부터
  for (let i = 0; i < total; i++) bt.push(bt[i] + spb(roundOf(i)));
  const callAt = r => COUNT + r * 8, respAt = r => COUNT + r * 8 + 4;
  const slotT = (r, j) => bt[respAt(r)] + j * spb(r) / 2;
  const st = rounds.map((rd, r) => {
    const slots = slotsOf(rd.pat), halfMs = spb(r) * 500;
    return { slots, halfMs, w: windows(band, halfMs), taps: [], marks: slots.map(() => null), tokDone: rd.pat.map(() => false), done: false };
  });
  const slotMs = r => st[r].slots.map((_, j) => perfOf(ac, slotT(r, j)));
  const counter = countTeller(view.board);
  // 소리 예약 — 한 마디씩, 시작 0.3초 앞에만(barPump) · 마디 0 = 준비 박 · 홀수 = 고슴도치 차례 · 짝수 = 내 차례 · 마지막 = 끝 화음(여러 판일 때)
  const nBars = 1 + R * 2;
  const pump = barPump(ac, T, nBars + (R > 1 ? 1 : 0), i => bt[Math.min(total, i * 4)], i => {
    if (i === 0) { for (let k = 0; k < COUNT; k++) engine.click(bt[k], k === 0, bus); return; }
    if (i === nBars) { engine.drum('deong', bt[total], 0.8, bus); endChord(engine, bus, bt[total], spb(R - 1)); return; }
    const r = (i - 1) >> 1, call = (i - 1) % 2 === 0;
    accompSound(engine, bus, bt[i * 4], spb(r), i - 1, { sal: 'pulse' });   // 반주는 두 차례 내내 · 맞혀야 할 리듬은 고슴도치만
    if (call) callSounds(engine, bus, rounds[r].pat, bt[i * 4], spb(r), i - 1);
  });
  const runId = ++RUN;
  let cur = -1, meR = -1, lastBeat = -99, bi = -1, gone = false, raf = 0, tone = null, snd = null;
  // 내 소리 — 딱 + 피리(그 마디 화음 음 · 손을 떼면 그침 · 꾹 누르면 길게)
  const pitchNow = () => { const i = Math.max(0, bi); return holdPitch(chordAt(Math.floor(i / 4) - 1, i % 4)); };
  // 내 줄 표시 — 지금 그 판이 내 줄에 있을 때만(앞 판 결과는 다음 판 고슴도치 차례 동안 남겨 둠)
  const showSlot = (q, j) => {
    if (q !== meR) return;
    const sl = st[q].slots[j], m = st[q].marks[j];
    if (m === 'extra') view.me.markTok(sl.tok, 'extra');
    else if (sl.kind === 'hit') view.me.markSlot(sl.tok, sl.s, m);
  };
  const settleTok = (q, tok) => {
    const s = st[q], k = rounds[q].pat[tok];
    const res = tokResult(k, s.slots.map((sl, j) => (sl.tok === tok ? s.marks[j] : undefined)).filter(m => m !== undefined));
    if (q === cur) view.call.reveal(tok);                    // 그림 없는 판은 음표 자리가 다 지난 뒤에만 그림을 보임
    if (q === meR) { view.me.reveal(tok); view.me.markTok(tok, res); }
  };
  const TELL = { rest: '쉼이에요', off: '‘따’는 한 번', hold: '길게 이어져요' };

  function down(e) {
    const t = ac.currentTime;
    engine.drum('deok', t, 0.7);
    if (tone) tone.stop(t);
    tone = engine.note('lead', pitchNow(), t, 2.4 * spb(roundOf(Math.max(0, bi))), 0.42);
    if (gone) return;
    const ms = e && e.timeStamp ? e.timeStamp : performance.now(), tt = ms - lat;
    for (let r = 0; r < R; r++) {
      const s = st[r];
      if (s.done) continue;
      const sm = slotMs(r);
      if (tt < sm[0] - s.halfMs / 2 || tt >= sm[sm.length - 1] + s.halfMs / 2) continue;
      s.taps.push(ms);
      const c = classifySlot(tt, sm, s.slots, s.w, s.halfMs);
      if (!c) return;
      if (c.extra) {
        s.marks[c.j] = 'extra'; showSlot(r, c.j);
        kit.setPose(view.hog, kit.friend, 'oops'); ui.tell(TELL[c.kind], 'oops', 900);
        return;
      }
      if (s.marks[c.j]) return;
      s.marks[c.j] = c.kind; showSlot(r, c.j);
      kit.setPose(view.hog, kit.friend, 'happy');
      return;
    }
  }
  function up() { if (tone) { tone.stop(ac.currentTime); tone = null; } }

  function loop() {
    if (gone) return;
    const now = heardNow(ac);
    while (bi + 1 <= total && bt[bi + 1] - 0.12 * spb(roundOf(Math.min(total - 1, bi + 1))) <= now) bi++;
    counter(bi >= 0 && bi < COUNT ? bi + 1 : 0);
    // 판 바뀜 — 고슴도치 줄은 그 판 시작에, 내 줄은 내 차례가 올 때 새 판으로
    if (bi >= COUNT - 1 && bi < total) {
      const r = bi < COUNT ? 0 : Math.floor((bi - COUNT) / 8), k = bi < COUNT ? -1 : (bi - COUNT) % 8;
      if (r !== cur) {
        cur = r;
        const rd = rounds[r];
        view.call.set(rd.pat, { hidden: rd.hidden });
        if (meR < 0) { meR = 0; view.me.set(rd.pat, { hidden: rd.hidden }); }
        snd = { r, list: soundsOf(rd.pat).map(n => ({ ...n, t: bt[callAt(r)] + n.b * spb(r) })), k: 0 };
        onRound && onRound(r, rd);
      }
      if (k >= 4 && meR !== r) { meR = r; view.me.set(rounds[r].pat, { hidden: rounds[r].hidden }); }
    }
    if (bi !== lastBeat && cur >= 0) {
      lastBeat = bi;
      const k = bi < COUNT ? -1 : (bi - COUNT) % 8, rd = rounds[cur];
      const live = bi >= COUNT && bi < total, inCall = live && k < 4, inResp = live && k >= 4;
      view.call.now(inCall ? k : -1);
      view.me.now(inResp ? k - 4 : -1);
      view.call.row.classList.toggle('active', inCall);
      view.me.row.classList.toggle('active', inResp);
      view.me.row.classList.toggle('ghost', !inResp);
      if (inCall) {
        view.call.lit(k); view.call.past(k);
        // 그림 없는 판은 고슴도치가 박마다 똑같이(소리 수를 몸짓으로 알려 주지 않음)
        const tok = view.call.tokOfBeat(k), quiet = !rd.hidden && rd.pat[tok] === 'qr';
        kit.setPose(view.hog, kit.friend, quiet ? 'idle' : 'play');
        view.tag('call', rd.fast ? '빨라졌어요' : rd.hidden ? '그림 없이 들어요' : '들어요');
      } else if (inResp) { view.me.past(k - 4); kit.setPose(view.hog, kit.friend, 'idle'); view.tag('me', '쳐요!'); }
      else view.tag(bi < COUNT ? 'call' : '', bi < COUNT ? '잘 들어요' : '');
    }
    // 그림 판의 고슴도치 차례 — 소리마다 음절이 반짝 + 고슴도치가 북을 침
    if (snd && !rounds[snd.r].hidden && snd.r === cur) {
      while (snd.k < snd.list.length && snd.list[snd.k].t <= now + 0.02) { const n = snd.list[snd.k++]; view.call.sound(n.tok, n.s); bump(view.hogBox); }
    }
    // 받는 자리가 지나면: 소리를 안 쳤으면 놓침 · 소리 없는 자리는 그냥 지남 · 음표 자리가 다 지나면 그 음표 표시
    for (let q = 0; q < R; q++) {
      const s = st[q];
      if (s.done || now < slotT(q, 0) - 0.5) continue;
      for (let j = 0; j < s.slots.length; j++) {                // 매 프레임 — 새 함수 · 배열을 만들지 않게 for로
        if (s.marks[j]) continue;
        const pass = now - slotT(q, j) - lat / 1000;
        if (s.slots[j].kind === 'hit') { if (pass > s.w.late / 1000) { s.marks[j] = 'miss'; showSlot(q, j); if (q === meR) kit.setPose(view.hog, kit.friend, 'oops'); } }
        else if (pass > s.halfMs * 0.36 / 1000) s.marks[j] = 'quiet';
      }
      for (let tok = 0; tok < s.tokDone.length; tok++) {
        if (s.tokDone[tok]) continue;
        let all = true;
        for (let j = 0; j < s.slots.length; j++) if (s.slots[j].tok === tok && !s.marks[j]) { all = false; break; }
        if (all) { s.tokDone[tok] = true; settleTok(q, tok); }
      }
      if (s.tokDone.every(Boolean) && now > slotT(q, 7) + spb(q) * 0.25 + lat / 1000) {
        s.done = true;
        onEnd(q, judgeBar(rounds[q].pat, slotMs(q), s.taps, { band, latency: lat, halfMs: s.halfMs }));
      }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  // 자동 시험: 받는 마디의 소리 자리마다 누르고 곧 뗌(‘따아’는 길게 누르고 있다가 뗌)
  const targets = () => {
    const out = [];
    rounds.forEach((rd, r) => st[r].slots.forEach((sl, j) => {
      if (sl.kind !== 'hit') return;
      const ms = perfOf(ac, slotT(r, j)) + lat, hold = rd.pat[sl.tok] === 'h' ? 1.6 : 0.25;
      out.push({ id: `${runId}:${r}:${j}:d`, ms, kind: 'd' }, { id: `${runId}:${r}:${j}:u`, ms: ms + hold * spb(r) * 1000, kind: 'u' });
    }));
    return out;
  };
  return {
    down, up, targets,
    stop() { gone = true; cancelAnimationFrame(raf); pump.stop(); T.clear(); killBus(engine, bus); counter(0); up(); },
  };
}

// 따라 치기 화면(두 줄: 고슴도치 · 나)
function echoView(kit) {
  const { h } = kit;
  const hog = kit.friendImg(kit.friend, 'idle', { label: false });
  const hogBox = h('div', { class: 'r3-hog' }, hog);
  const callTag = h('span', { class: 'r3-tag' }), meTag = h('span', { class: 'r3-tag' });
  const call = beatRow(kit, { label: h('div', { class: 'r3-lab' }, hogBox, callTag), cls: 'call' });
  const me = beatRow(kit, { label: h('div', { class: 'r3-lab me' }, h('b', { class: 'r3-me' }, '나'), meTag), cls: 'me' });
  const tag = (who, text) => { callTag.textContent = who === 'call' ? text : ''; meTag.textContent = who === 'me' ? text : ''; };
  return { hog, hogBox, tag, call, me, board: null };
}
// 틀린 까닭 한 줄(연습) — 첫 번째로 어긋난 음표
function why(j, pat) {
  const tok = j.toks.findIndex(r => r === 'extra' || r === 'miss');
  if (tok < 0) return '';
  const b = pat.slice(0, tok).reduce((a, k) => a + BEATS[k], 0), k = pat[tok], mine = j.slots.filter(g => g.tok === tok);
  const ex = mine.find(g => g.got === 'extra');
  if (ex) return ex.kind === 'rest' ? `${ORD[b]} 박은 ‘쉼’이에요 — 손바닥을 펴요` : ex.kind === 'off' ? `${ORD[b]} 박 ‘따’는 한 번만 쳐요` : '길게 이어지는 소리는 한 번만 쳐요';
  if (k === 'ee' && mine.filter(g => g.got === 'miss').length === 1) return `${ORD[b]} 박 ‘띠띠’는 한 박에 두 번 쳐요`;
  return `${ORD[b]} 박 ‘${SYLS[k].join('')}’를 놓쳤어요`;
}

export default {
  // ── 보기: ‘따’(박 하나에 소리 하나) · ‘띠띠’(박 하나에 소리 둘) — 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const stick = kit.band === 'low';
    ui.say('‘띠띠’는 박 하나에 소리 둘 — 박은 그대로 걸어요');
    const hog = kit.friendImg(kit.friend, 'idle', { label: false });
    const hogBox = h('div', { class: 'r3-hog big' }, hog);
    const strip = beatRow(kit, { label: h('div', { class: 'r3-lab' }, hogBox), cls: 'show' });
    strip.set(EXAMPLES[2].pat);                                   // 처음 그림부터 ‘따’와 ‘띠띠’가 같이 보이게
    const counter = countTeller(strip.row);
    let bus = null, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); killBus(engine, bus); bus = null; counter(0); strip.now(-1); kit.setPose(hog, kit.friend, 'idle'); };
    const sylText = pat => pat.map(k => SYLS[k].join('')).join(' ');
    const cards = EXAMPLES.map(ex => {
      const mini = h('span', { class: 'r3-mini', html: ex.pat.map(k => noteSVG(NOTE[k], { stick, size: 40 })).join('') });
      const btn = h('button', { type: 'button', class: 'excard r3-ex', 'aria-label': `${ex.name} — ${sylText(ex.pat)} 들어 보기` }, h('b', {}, sylText(ex.pat)), mini, h('span', {}, ex.name));
      onPress(btn, () => {
        stop();
        const ac = engine.ensure();
        bus = newBus(engine);
        const beat = 60 / bpmFor(kit.band), t0 = ac.currentTime + 0.3;
        strip.set(ex.pat);
        for (let i = 0; i < COUNT; i++) engine.click(t0 + i * beat, i === 0, bus);
        for (let i = 0; i < 4; i++) engine.drum('hat', t0 + (COUNT + i) * beat, 0.3, bus);   // 박(걸음)은 그대로
        const list = soundsOf(ex.pat).map(n => ({ ...n, t: t0 + (COUNT + n.b) * beat }));
        for (const n of list) ex.play(engine, n.t, n.len * beat, bus);
        let last = -9, k = 0;
        const loop = () => {
          const now = heardNow(ac), bi = Math.floor((now - t0) / beat + 0.1);
          counter(bi >= 0 && bi < COUNT ? bi + 1 : 0);
          if (bi !== last) {
            last = bi;
            const b = bi - COUNT;
            strip.now(b >= 0 && b < 4 ? b : -1);
            if (b >= 0 && b < 4) { strip.lit(b); strip.past(b); kit.setPose(hog, kit.friend, ex.pat[strip.tokOfBeat(b)] === 'qr' ? 'idle' : 'play'); }
          }
          while (k < list.length && list[k].t <= now + 0.02) { const n = list[k++]; strip.sound(n.tok, n.s); bump(hogBox); }
          if (bi > COUNT + 4) { stop(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r3 r3-show' },
      strip.row,
      h('div', { class: 'r3-legend' },
        h('span', { html: noteSVG('q', { stick, size: 44 }) }), h('span', {}, stick ? '‘따’ = 박 하나에 소리 하나' : '4분음표 = ‘따’(박 하나에 소리 하나)'),   /* 1~2학년 판은 음표 이름 X */
        h('span', { html: noteSVG('ee', { stick, size: 44 }) }), h('span', {}, stick ? '‘띠띠’ = 박 하나에 소리 둘' : '8분음표 둘 = ‘띠띠’(박 하나에 소리 둘)'),
        h('i', { class: 'r3-ldot', 'aria-hidden': 'true' }), h('span', {}, '점 하나 = 박 하나')),
      exampleGroup(kit, cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => stop();
  },

  // ── 연습: 고슴도치가 치면 그대로 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('고슴도치가 치는 대로, 다음 네 박에 똑같이 쳐요');
    const view = echoView(kit);
    const msg = h('p', { class: 'fmsg' });
    let streak = 0, run = null, n = 0, passed = false;
    const input = pressInput(ui, kit, { onDown: e => run && run.down(e), onUp: e => run && run.up(e) });
    ui.setBar(...input.nodes);
    view.board = h('div', { class: 'r3 r3-echo' }, view.call.row, view.me.row, h('div', { class: 'r3-info' }, msg));
    ui.stage.append(view.board);
    const auto = autoScheduler(T);
    function attempt() {
      if (passed) return;
      const pat = n === 0 ? FOLLOW[0] : FOLLOW[1 + Math.floor(r() * (FOLLOW.length - 1))];
      n++;
      msg.textContent = '';
      run && run.stop();
      run = echoRun(kit, ui, view, {
        rounds: [{ pat }],
        onEnd: (q, j) => {
          if (j.ok) {
            kit.sfx.good(kit.engine); streak++; ui.practice(streak);
            kit.setPose(view.hog, kit.friend, 'happy');
            ui.tell('맞아요', 'good');
            msg.textContent = '‘따’는 한 번, ‘띠띠’는 한 박에 두 번 쳤어요';
            if (streak >= 3) { passed = true; run.stop(); input.off(); kit.pass('세 번 이어서 그대로 쳤어요'); return; }
          } else {
            streak = 0; ui.practice(0);
            kit.setPose(view.hog, kit.friend, 'oops');
            ui.tell('다시 들어 봐요', 'oops', 1500);
            msg.textContent = why(j, pat);
          }
          T.after(1500, attempt);
        },
      });
    }
    T.after(500, attempt);
    kit.setAuto(() => { if (run) auto(run.targets(), tg => (tg.kind === 'd' ? fireDown(input.btn) : fireUp())); });
    return () => { T.clear(); run && run.stop(); input.off(); };
  },

  // ── 확인 게임: 따라 치기 10판 ──
  game(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers();
    const sd = kit.seed ? kit.seed() : 1;
    const plan = kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF);
    const firstHidden = plan.findIndex(p => p.hidden) + 1;
    ui.say(SAY_GAME);
    const view = echoView(kit);
    const scene = h('div', { class: 'r3 r3-echo r3-game' }, view.call.row, view.me.row);
    view.board = scene;
    ui.stage.append(scene);
    view.call.set(plan[0].pat); view.me.set(plan[0].pat);
    let run = null, input = null;
    const results = [], judged = [];
    const auto = autoScheduler(T);
    const stick = kit.band === 'low';
    const sc = startCard(ui, kit, {
      title: '따라 치기',
      sub: [h('p', { class: 'sub r3-cardpair', html: `${noteSVG('q', { stick, size: 46 })}<span>‘따’ = 한 번</span>${noteSVG('ee', { stick, size: 46 })}<span>‘띠띠’ = 한 박에 두 번</span>` }),
        '고슴도치가 네 박을 치면, 다음 네 박에 그대로 쳐요', `${firstHidden}번째 판부터는 그림 없이 들어요·${plan.length}번`],
      onStart: () => {
        input = pressInput(ui, kit, { onDown: e => run && run.down(e), onUp: e => run && run.up(e) });
        ui.setBar(...input.nodes);
        ui.count(1, plan.length);
        run = echoRun(kit, ui, view, {
          rounds: plan,
          onRound: (r, rd) => { ui.count(r + 1, plan.length); ui.say(rd.fast ? '빨라졌어요 — 그래도 ‘띠띠’는 한 박에 둘' : rd.hidden ? '그림 없이 듣고, 그대로 쳐요' : SAY_GAME); },
          onEnd: (q, j) => {
            results[q] = j.ok; judged[q] = j;
            if (j.ok) { kit.sfx.good(engine); ui.tell('맞아요', 'good'); }
            else ui.tell(j.nExtra ? (j.extras.rest ? '쉼에 쳤어요' : '더 많이 쳤어요') : '놓친 소리가 있어요', 'oops', 1300);
            if (q === plan.length - 1) T.after(900, end);
          },
        });
      },
    });
    kit.setAuto(() => { if (sc.open()) sc.press(); else if (run) auto(run.targets(), tg => (tg.kind === 'd' ? fireDown(input.btn) : fireUp())); });
    function end() {
      run && run.stop(); input && input.off();
      const res = plan.map((_, i) => !!results[i]);
      const s = kit.scoreChoices(res, STREAK);
      let eeAll = 0, eeOk = 0, miss = 0;
      const offs = [];
      plan.forEach((p, i) => {
        const j = judged[i]; if (!j) { miss += slotsOf(p.pat).filter(x => x.kind === 'hit').length; return; }
        p.pat.forEach((k, tok) => { if (k === 'ee') { eeAll++; if (j.slots.filter(g => g.tok === tok).every(g => g.got === 'great' || g.got === 'ok')) eeOk++; } });
        for (const g of j.slots) { if (g.got === 'great' || g.got === 'ok') offs.push(g.off); else if (g.got === 'miss') miss++; }
      });
      // 두드림 어긋남(X4 · 기기 기록만) — 소리 자리에 붙은 두드림 · 놓침 = 안 친 소리(덤으로 친 것은 tip이 따로 셈) · bpm = 바탕 빠르기(마무리 두 판은 리2 빠르기)
      const t = tapStats(offs, miss, { lat: kit.device.latencyMs, band: kit.band, bpm: bpmFor(kit.band) });
      ui.stage.replaceChildren(); ui.count(null);                // 결과 뒤에는 칸 그림 · 번호를 남기지 않음(친구 그림은 칸 화면이 붙임)
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: res, group: [...CUTS, plan.length].map((c, i, a) => c - (i ? a[i - 1] : 0)),   /* 다시 보기는 단계마다 끊음 */
        facts: [`이어서 맞힌 최고 기록 ${s.streak}번`, `‘띠띠’ ${eeAll}개 중 ${eeOk}개를 한 박에 두 번 쳤어요`],
        starOn: s.starOn, rules: s.rules, tip: tipOf(plan, res, judged), t, sd,
      });
    }
    return () => { T.clear(); run && run.stop(); input && input.off(); };
  },
};
