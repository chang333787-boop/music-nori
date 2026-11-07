// 곡 모양 — 글 한 줄로 적은 가락을 틱 사건으로 바꾸고, 마디가 맞는지 스스로 검사한다(화면 · 소리 없음 · node로 시험).
//
//  적는 법(mel):  'G4q E4q G4q E4q | G4e G4e E4q G4h'
//   음   = 음이름 + 옥타브 + 길이   예) C4q(가운데 도 4분음표) · F#4e · Bb4h.(점2분)
//   쉼표 = R + 길이               예) Rq · Rh
//   길이 = w 온 · h 2분 · q 4분 · e 8분 · s 16분 · 뒤에 '.' = 점 · 't' = 셋잇단
//   붙임줄 = 음 뒤에 '~'(다음 음과 같은 높이로 이어짐)   예) G4h~ | G4q
//   마디줄 = '|'  · 셈여림 = '!pp' '!p' '!mp' '!mf' '!f' '!ff'(뒤 음들에 붙음)
//  첫 마디가 짧으면 못갖춘마디로 보고, 끝 마디는 '마디 − 못갖춘마디'만큼이어야 한다.
import { parsePitch, durTicks, barTicks, beatTicks, compound, TPQ } from './theory.js';

export const DYN_VEL = { pp: 0.35, p: 0.5, mp: 0.62, mf: 0.75, f: 0.9, ff: 1 };

export function parseMel(mel, meter = [4, 4]) {
  const errors = [], ev = [], bars = [];
  const cap = barTicks(meter);
  let t = 0, barStart = 0, dyn = 'mf', i = 0;
  const closeBar = (final) => {
    const len = t - barStart;
    if (len > 0 || !final) bars.push({ t0: barStart, ticks: len });
    barStart = t;
  };
  for (const raw of String(mel).trim().split(/\s+/)) {
    i++;
    if (!raw) continue;
    if (raw === '|' || raw === '||') { closeBar(false); continue; }
    if (raw[0] === '!') {
      const k = raw.slice(1);
      if (DYN_VEL[k] == null) errors.push(`${i}번째 '${raw}': 모르는 셈여림`);
      else dyn = k;
      continue;
    }
    const tie = raw.endsWith('~');
    const tok = tie ? raw.slice(0, -1) : raw;
    let m = /^R([whqes]\.?t?)$/.exec(tok);
    if (m) {
      const d = durTicks(m[1]);
      if (d == null) { errors.push(`${i}번째 '${raw}': 길이를 모름`); continue; }
      ev.push({ t, d, p: null, dyn });
      t += d;
      continue;
    }
    m = /^([A-G][#b]?-?\d)([whqes]\.?t?)$/.exec(tok);
    if (!m) { errors.push(`${i}번째 '${raw}': 적는 법이 틀림`); continue; }
    const p = parsePitch(m[1]), d = durTicks(m[2]);
    if (p == null || d == null) { errors.push(`${i}번째 '${raw}': 음 또는 길이를 모름`); continue; }
    ev.push({ t, d, p, dyn, ...(tie ? { tie: true } : {}) });
    t += d;
  }
  if (t > barStart) closeBar(true);
  // 마디 검사
  let pickup = 0;
  bars.forEach((b, k) => {
    const last = k === bars.length - 1;
    if (k === 0 && b.ticks < cap && bars.length > 1) { pickup = b.ticks; return; }
    if (last && pickup && b.ticks === cap - pickup) return;
    if (b.ticks !== cap) errors.push(`${k + 1}째 마디: ${b.ticks}틱(${b.ticks / TPQ}박) — ${cap / TPQ}박이어야 함`);
  });
  // 붙임줄은 같은 높이 다음 음으로만
  ev.forEach((e, k) => {
    if (!e.tie) return;
    const nx = ev[k + 1];
    if (!nx || nx.p !== e.p) errors.push(`${k + 1}번째 음의 붙임줄: 다음 음이 같은 높이가 아님`);
  });
  return { ev, bars, pickup, total: t, errors };
}

// 곡 정의 → 쓸 수 있는 곡(사건 · 마디 · 못갖춘마디 · 검사 결과)
export function makeSong(def) {
  const meter = def.meter || [4, 4];
  const r = parseMel(def.mel, meter);
  return { tempo: 96, key: 0, ...def, meter, ...r };
}

// 붙임줄을 합친 '소리 나는 음' 목록 [{ t, d, p, vel }]
export function sounding(song) {
  const out = [];
  let hold = null;
  for (const e of song.ev) {
    if (e.p == null) { hold = null; continue; }
    if (hold && hold.p === e.p) { hold.d += e.d; hold.tie = !!e.tie; if (!e.tie) hold = null; continue; }
    const n = { t: e.t, d: e.d, p: e.p, vel: DYN_VEL[e.dyn] ?? 0.75, tie: !!e.tie };
    out.push(n);
    hold = e.tie ? n : null;
  }
  return out.map(({ tie, ...n }) => n);
}

// 소리 사건(초) — Player가 그대로 튼다. tempo = 4분음표 기준 빠르기(6/8도 4분음표 기준으로 적는다)
export function toEvents(song, { inst = 'piano', tempo = song.tempo, gap = 0.92, startTick = 0 } = {}) {
  const sec = 60 / tempo / TPQ;
  const evs = sounding(song).filter(n => n.t >= startTick)
    .map(n => ({ t: (n.t - startTick) * sec, kind: 'note', inst, p: n.p, d: n.d * sec * gap, vel: n.vel, tick: n.t }));
  return { events: evs, total: (song.total - startTick) * sec, sec };
}

// 박 시각(초) — 박자기 · 박 판정용. 못갖춘마디면 첫 박이 음보다 앞선다(음수 시각)
export function beatTimes(song, { tempo = song.tempo } = {}) {
  const sec = 60 / tempo / TPQ, bt = beatTicks(song.meter), cap = barTicks(song.meter);
  const start = song.pickup ? -(cap - song.pickup) : 0;
  const out = [];
  for (let t = start; t < song.total; t += bt) out.push({ t: t * sec, tick: t, down: ((t - start) % cap) === 0 });
  return out;
}

// 우리반RPG 오선 그리기(notation.js)가 읽는 모양으로 — 칸(step) = 16분음표(4분 박자) 또는 8분음표(겹박자)
//  못갖춘마디는 첫 마디 앞을 쉼표로 채워 그린다(다음 판에서 못갖춘마디 그리기를 더함)
export function toStaffSong(song) {
  const comp = compound(song.meter);
  const step = comp ? 6 : 3;
  const shift = song.pickup ? barTicks(song.meter) - song.pickup : 0;
  const notes = sounding(song).map(n => ({ s: (n.t + shift) / step, d: n.d / step, p: n.p }))
    .filter(n => Number.isInteger(n.s) && Number.isInteger(n.d));
  const beats = comp ? song.meter[0] / 3 : song.meter[0];
  const sub = comp ? 3 : 4;
  const bars = Math.ceil((song.total + shift) / barTicks(song.meter));
  return { notes, harm: [], bars, beats, sub, key: song.key || 0, scale: 'major', tempo: song.tempo, title: song.title };
}
