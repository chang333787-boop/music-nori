// 악1 그림 악보 — 세로 자리 = 높이(두 층 · 5~6학년 판은 세 층) · 가로 막대 길이 = 소리 길이(박 수)
//  재생 선이 왼쪽에서 오른쪽으로 지나간다. 막대가 오면 그 높이의 단추를 누르면 막대 길이만큼 소리가 난다.
//  높이 단추는 그 줄 오른쪽 끝에 붙어 있다 — 아래 띠에 나란히 두면 '위 줄 = 왼쪽 단추'로 한 번 더 바꿔 생각해야 해서(처음 쓰는 아이 눈).
//  줄을 직접 눌러도 된다. 쓰는 음은 솔 · 미(세 층이면 라 · 솔 · 미) — 가1 · 가2와 같은 음, 소리는 이어지는 리코더(길이가 들리게).
//  보기: 같은 그림 악보를 소리와 함께(막대가 소리 나는 동안 반짝) · 예시 넷(오르는 · 내리는 · 길고 짧게 · 자작 곡 「솔미 인사」/「라가 왔어요」)
//  따라 하기: 막대 셋짜리 짧은 악보 — 재생 선이 기다려 준다(맞는 단추를 누르면 그 길이만큼 소리와 함께 지나감) · 세 번 이어서 맞히면 지남
//  확인 게임: 네 줄(줄마다 8박 · 넷 세고 시작) — 소개 → 발전(긴 막대가 먼저) → 비틀기(빨라지고 자주 바뀜) → 마무리(자작 곡 앞 두 마디)
//  때는 너그럽게(engine/judge.js 'low' 창 = 이르게 150ms · 늦게 180ms) · 높이가 맞아야 맞음 · 실수해도 줄은 끝까지 흐른다
//  11-07 평가 2차: 아이 화면에서 위 · 아래 띠를 '줄'이라 부르지 않는다('줄'은 오선에서만 — 여기는 '위 · 아래') · 넷 세기와 판정 말은 맨 위 말풍선(ui.tell)
//   4박마다 굵은 세로선 X(마디는 ri5에서 배움)
//  11-07 평가 3차: 번호 = 막대 수 "3 / 23"(결과 단위와 같게) · 결과 "높이 23개 중 12개, 박자 23개 중 3개를 맞혔어요"
//   넷 세기는 오른쪽 위 상자 X → 악보 가운데 큰 숫자(세는 동안만) · 게임 아래 띠 = 악보 넷 중 몇째 + 키보드 · 박 소리는 0.3초 앞만 예약
import { voice, exGroup, nowCard, pal, pose, shake } from './_snd.js';
import { windows } from '../../../engine/judge.js';
import { audioToPerf } from '../clock.js';
import { SONGS } from '../../../engine/songs/index.js';
import { parseMel } from '../../../engine/song.js';
import { TPQ } from '../../../engine/theory.js';
import { harmonize } from '../../../engine/theme.js';
import { accompSound } from './_beat.js';

const ROWS = {
  2: { p: [67, 64], name: ['높은 소리', '낮은 소리'], at: ['위', '아래'], keys: ['↑', '↓'] },
  3: { p: [69, 67, 64], name: ['높은 소리', '가운데 소리', '낮은 소리'], at: ['위', '가운데', '아래'], keys: ['1', '2', '3'] },
};
const INST = 'recorder';
// 막대 적는 법: 줄(H 높은 · M 가운데 · L 낮은) + 박 수 · R = 쉼
const SHOW = {
  2: [
    { name: '오르는 가락', sub: '막대가 위로 올라가요', s: 'L1 L1 H2' },
    { name: '내리는 가락', sub: '막대가 아래로 내려가요', s: 'H1 H1 L2' },
    { name: '길고 짧게', sub: '긴 막대는 길게 불어요', s: 'H2 L1 L1 H1 H1 L2' },
    { name: '솔미 인사', sub: '노래 한 곡(16박)', song: 'ga1-insa' },
  ],
  3: [
    { name: '오르는 가락', sub: '막대가 위로 올라가요', s: 'L1 M1 H2' },
    { name: '내리는 가락', sub: '막대가 아래로 내려가요', s: 'H1 M1 L2' },
    { name: '길고 짧게', sub: '긴 막대는 길게 불어요', s: 'M2 H1 H1 L2 M2' },
    { name: '라가 왔어요', sub: '노래 한 곡(16박)', song: 'ga2-ra' },
  ],
};
// 확인 게임 네 줄 — 줄마다 8박 · 막대 23개(결과 줄에 다 들어가게)
const LINES = {
  2: [
    { bpm: 84, s: 'H1 H1 L1 L1 H2 L2' },            // 소개 — 둘씩 같은 높이 · 끝에 긴 막대
    { bpm: 84, s: 'H2 L1 L1 H1 H1 L2' },            // 발전 — 긴 막대가 먼저(두 박 기다리기)
    { bpm: 96, s: 'L1 H1 L1 H1 L2 H2' },            // 비틀기 — 빨라지고 막대마다 높이가 바뀜
    { bpm: 90, song: 'ga1-insa', beats: 8 },        // 마무리 — 「솔미 인사」 앞 두 마디
  ],
  3: [
    { bpm: 84, s: 'H1 M1 L1 M1 H2 L2' },
    { bpm: 84, s: 'M2 H1 H1 L1 M1 H2' },
    { bpm: 96, s: 'L1 M1 H1 M1 L2 H2' },
    { bpm: 90, song: 'ga2-ra', beats: 8 },
  ],
};
const SHOW_BPM = 92, FOLLOW_BPM = 90;

// 막대 글 → [{ b(시작 박), d(박 수), r(줄) }] · beats(전체 박)
function toBars(def, n) {
  const P = ROWS[n].p;
  if (def.song) {
    const s = SONGS.find(x => x.id === def.song);
    const { ev } = parseMel(s.mel, s.meter);
    const lim = def.beats || Infinity;
    const notes = ev.filter(e => e.p != null && e.t / TPQ < lim).map(e => ({ b: e.t / TPQ, d: e.d / TPQ, r: P.indexOf(e.p) }));
    const total = ev.reduce((m, e) => Math.max(m, (e.t + e.d) / TPQ), 0);
    return { notes, beats: Math.min(lim, total), bpm: def.bpm };
  }
  const R = n === 3 ? { H: 0, M: 1, L: 2 } : { H: 0, L: 1 };
  let b = 0;
  const notes = [];
  for (const tok of def.s.split(/\s+/)) {
    const d = Number(tok.slice(1));
    if (tok[0] !== 'R') notes.push({ b, d, r: R[tok[0]] });
    b += d;
  }
  return { notes, beats: b, bpm: def.bpm };
}

// 줄 아이콘 — n칸 가운데 r째 칸을 채움(단추에서 '어느 줄'인지 한눈에)
const rowIcon = (n, r) => `<svg viewBox="0 0 40 ${n * 14 + 4}" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<rect x="3" y="${3 + k * 14}" width="34" height="10" rx="5" fill="${k === r ? '#3B2A1E' : '#FFFFFF'}" stroke="#3B2A1E" stroke-width="2.5"/>`).join('')}</svg>`;

// 그림 악보 — 띠 n개(위 · 아래) · 오른쪽 끝에 높이 이름(또는 누르는 단추) · 재생 선 + 거북
function score(kit, n, { keys = false, rowh = 140, head = 70 } = {}) {
  const { h } = kit;
  const R = ROWS[n];
  const lanes = [], keyEls = [];
  const sheet = h('div', { class: 'ps-sheet' });
  for (let r = 0; r < n; r++) {
    const inner = h('div', { class: 'ps-in' });
    const lane = h('div', { class: 'ps-lane r' + r + ' of' + n }, inner);
    sheet.append(lane);
    lanes.push({ lane, inner });
    keyEls.push(keys
      ? h('button', { type: 'button', class: 'ps-key', style: { gridRow: String(r + 1) } }, h('span', { class: 'ps-ic', html: rowIcon(n, r) }), R.name[r])
      : h('span', { class: 'ps-name', style: { gridRow: String(r + 1) } }, h('span', { class: 'ps-ic', html: rowIcon(n, r) }), R.name[r]));
  }
  sheet.style.gridRow = `1 / span ${n}`;
  const grid = h('div', { class: 'ps-grid' });
  const turtle = h('div', { class: 'ps-turtle' }, pal(kit, 'turtle'));
  const line = h('div', { class: 'ps-head' }, turtle, h('i', { class: 'ps-line' }));
  const track = h('div', { class: 'ps-track' }, grid, line);
  const el = h('div', { class: 'pscore' + (keys ? ' keys' : ''), style: { '--rowh': rowh + 'px', '--headh': head + 'px', '--n': String(n) } }, sheet, ...keyEls, track);
  let bars = [], beats = 8, px = 0;
  const api = {
    el, keys: keyEls, lanes, track,
    set(notes, total) {
      beats = total;
      for (const l of lanes) l.inner.replaceChildren();
      grid.replaceChildren(...Array.from({ length: total + 1 }, (_, k) => h('i', { style: { left: `${(k / total) * 100}%` } })));
      bars = notes.map(nt => {
        const b = h('div', { class: 'ps-bar' + (nt.d >= 2 ? ' long' : ''), style: { left: `calc(${(nt.b / total) * 100}% + 5px)`, width: `calc(${(nt.d / total) * 100}% - 10px)` } });
        lanes[nt.r].inner.append(b);
        return b;
      });
      px = 0;
      api.headAt(0);
      return bars;
    },
    // 재생 선 자리(박) — sec 주면 그동안 미끄러짐(따라 하기)
    headAt(beat, sec = 0) {
      if (!px) px = lanes[0].inner.clientWidth / beats;
      line.style.transition = sec ? `transform ${sec}s linear` : 'none';
      line.style.transform = `translateX(${(beat * px).toFixed(1)}px)`;
    },
    measure() { px = lanes[0].inner.clientWidth / beats; },
    // 높이 단추 표시 — 누른 틀린 단추 회색 · 맞는 단추 초록 테두리 + ✓(답 묶음과 같은 말 · 평가 3차) · null = 지움
    markKeys(wrong, right) { keyEls.forEach((k, r) => { k.classList.toggle('wrong', r === wrong); k.classList.toggle('right', r === right); }); },
    pose(p) { pose(kit, turtle.firstChild, 'turtle', p); },
    showHead(on) { line.hidden = !on; },
  };
  return api;
}

// 키 → 줄
function keyRow(e, n) {
  if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) return Number(e.key) - 1;
  if (e.key === 'ArrowUp') return 0;
  if (e.key === 'ArrowDown') return n - 1;
  if (n === 3 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return 1;
  return -1;
}
const rowsFor = kit => (kit.band === 'high' ? 3 : 2);

export default {
  // ── 보기: 그림 악보를 소리와 함께 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const n = rowsFor(kit), T = kit.timers(), V = voice(engine);
    let raf = 0;
    ui.say('막대가 위에 있으면 높은 소리, 길면 긴 소리예요');
    const S = score(kit, n, { rowh: n === 3 ? 60 : 84, head: 72 });
    const exs = SHOW[n].map(d => ({ ...d, ...toBars(d, n) }));
    function play(ex) {
      cancelAnimationFrame(raf); T.clear(); V.hush();
      const total = Math.max(8, ex.beats);
      const bars = S.set(ex.notes, total);
      S.pose('play');
      const ac = engine.ensure(), beat = 60 / SHOW_BPM, t0 = ac.currentTime + 0.25, P = ROWS[n].p;
      ex.notes.forEach((nt, k) => {
        const t = t0 + nt.b * beat;
        V.note(INST, P[nt.r], t, nt.d * beat * 0.9, 0.6, null);
        T.after(kit.msUntil(ac, t), () => bars[k].classList.add('on'));
        T.after(kit.msUntil(ac, t + nt.d * beat * 0.9), () => bars[k].classList.remove('on'));
      });
      const endB = ex.notes.reduce((m, nt) => Math.max(m, nt.b + nt.d), 0);
      const outLat = ac.outputLatency || ac.baseLatency || 0;
      S.measure();
      const loop = () => {
        const b = (ac.currentTime - outLat - t0) / beat;
        S.headAt(Math.max(0, Math.min(endB, b)));
        if (b < endB + 0.2) raf = requestAnimationFrame(loop); else { S.pose('happy'); nowCard(cards, null); }
      };
      raf = requestAnimationFrame(loop);
    }
    const cards = exs.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard' }, h('b', {}, ex.name), h('span', {}, ex.sub));
      onPress(btn, () => { nowCard(cards, btn); play(ex); btn.classList.add('heard'); });
      return btn;
    });
    ui.stage.append(h('div', { class: 'ps-show' }, S.el, exGroup(kit, cards, 'ps-cards')));
    requestAnimationFrame(() => { S.set(exs[2].notes, Math.max(8, exs[2].beats)); });   // 처음엔 '길고 짧게' 악보를 그려 둠
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { cancelAnimationFrame(raf); T.clear(); V.hush(); };
  },

  // ── 따라 하기: 재생 선이 기다려 주는 짧은 악보 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const n = rowsFor(kit), T = kit.timers(), V = voice(engine), rnd = kit.rng();
    const R = ROWS[n], beat = 60 / FOLLOW_BPM;
    const ASK = n === 3 ? '막대가 위·가운데·아래 어디에 있나요? 그 단추를 눌러요' : '막대가 위에 있나요, 아래에 있나요? 그쪽 단추를 눌러요';
    ui.say(ASK);
    const S = score(kit, n, { keys: true, rowh: n === 3 ? 96 : 128, head: 76 });
    let streak = 0, notes = [], bars = [], idx = 0, busy = true, passed = false;
    function phrase() {
      const lens = [[1, 1, 2], [2, 1, 1], [1, 2, 1]][Math.floor(rnd() * 3)];
      let rows;
      do { rows = lens.map(() => Math.floor(rnd() * n)); } while (new Set(rows).size < 2);
      let b = 0;
      notes = lens.map((d, k) => { const nt = { b, d, r: rows[k] }; b += d; return nt; });
      bars = S.set(notes, 4);
      idx = 0; busy = false;
      mark();
    }
    const mark = () => { bars.forEach((b, k) => b.classList.toggle('now', k === idx)); S.headAt(notes[idx].b); };
    function press(r) {
      if (busy || passed || !notes.length) return;
      const nt = notes[idx], bar = bars[idx];
      S.markKeys(null, null);
      if (r === nt.r) {
        busy = true;
        const ac = engine.ensure(), t = ac.currentTime + 0.02, len = nt.d * beat;
        V.note(INST, R.p[r], t, len * 0.92, 0.6);
        bar.classList.remove('now'); bar.classList.add('on');
        S.headAt(nt.b + nt.d, len); S.pose('play');
        streak++; ui.practice(streak);
        ui.tell('맞아요', 'good'); ui.say(`${R.at[r]}에 있는 막대 — ${R.name[r]}를 ${nt.d >= 2 ? '길게' : '짧게'}`);
        T.after(len * 1000 + 80, () => {
          bar.classList.remove('on'); bar.classList.add('g'); S.pose('idle');
          if (streak >= 3) { passed = true; kit.pass(); return; }
          idx++;
          ui.say(ASK);
          if (idx >= notes.length) T.after(500, phrase);
          else { busy = false; mark(); }
        });
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0); S.pose('oops');
        ui.tell('다시 눌러 봐요', 'oops'); ui.say(`이 막대는 ${R.at[nt.r]}에 있어요 — ${R.name[nt.r]} 단추예요`);
        shake(bar); S.markKeys(r, nt.r);                // 다음에 누를 때까지 맞는 단추에 ✓
        busy = true; T.after(450, () => { busy = false; S.pose('idle'); });
      }
    }
    S.keys.forEach((k, r) => onPress(k, () => press(r)));
    S.lanes.forEach((l, r) => l.lane.addEventListener('pointerdown', e => { if (e.button > 0) return; press(r); }));
    ui.stage.append(h('div', { class: 'ps-follow' }, S.el));
    requestAnimationFrame(phrase);
    kit.setAuto(() => { if (!busy && !passed && notes.length) press(notes[idx].r); });
    const onKey = e => { if (e.repeat) return; const r = keyRow(e, n); if (r >= 0) { e.preventDefault(); press(r); } };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 그림 악보 따라 연주 — 네 줄 ──
  game(ui, kit) {
    const { h, onPress, engine, device } = kit;
    const n = rowsFor(kit), T = kit.timers(), V = voice(engine);
    const R = ROWS[n];
    const lines = LINES[n].map(d => toBars(d, n));
    const totalBars = lines.reduce((a, L) => a + L.notes.length, 0);
    let li = -1, run = null, mode = 'ready', raf = 0, gone = false, rushed = 0, cnt = -1, judged = 0, markT = 0;
    const all = [];                                   // 막대마다 { st, long, afterLong }
    ui.say('거북이 막대에 닿으면 그 높이 단추를 눌러요');
    const S = score(kit, n, { keys: true, rowh: n === 3 ? 104 : 156, head: 84 });
    // 넷 세기 — 악보 가운데 큰 숫자(세는 동안만 · 평가 3차: 오른쪽 위 상자 X)
    const cnum = h('div', { class: 'ak-count', hidden: true, 'aria-live': 'polite' });
    S.track.append(cnum);
    const scene = h('div', { class: 'ak-scene' }, S.el);
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, kit.ez('그림 악보 따라 연주')),                       /* 1~2학년 판 = '막대 그림'(악보 낱말 X) */
      h('p', { class: 'sub' }, kit.ez('악보 네 개 — 하나, 둘, 셋, 넷 세고 시작해요')),
      h('p', { class: 'sub' }, '키보드 ', ...R.keys.flatMap((k, j) => [j ? ' ' : null, h('span', { class: 'kbd' }, k)]), ' 도 돼요')));
    ui.stage.append(scene, start);
    S.set(lines[0].notes, lines[0].beats);
    // 아래 띠(노는 동안) — 악보 넷 중 몇째 + 키보드 키캡(두드리는 화면 약속)
    const sheetDots = lines.map(() => h('i'));
    const playBar = h('div', { class: 'ak-bar' },
      h('span', { class: 'ak-prog' }, kit.ez('악보'), h('span', { class: 'ak-dots', 'aria-hidden': 'true' }, ...sheetDots)),
      h('span', { class: 'ak-keys' }, '키보드 ', ...R.keys.flatMap((k, j) => [j ? ' ' : null, h('span', { class: 'kbd' }, k)]), ' 도 돼요'));
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(playBar); ui.count(1, totalBars); S.measure(); T.after(200, nextLine); });
    ui.setBar(startBtn);
    // 막대 하나가 판정될 때마다 번호(다음 막대 · 결과 단위와 같은 '막대 수')
    const judgedOne = () => { judged++; ui.count(Math.min(totalBars, judged + 1), totalBars); };

    function nextLine() {
      if (gone) return;
      li++;
      if (li >= lines.length) return end();
      const L = lines[li];
      const bars = S.set(L.notes, L.beats);
      S.measure();
      sheetDots.forEach((d, k) => { d.className = k < li ? 'done' : k === li ? 'now' : ''; });
      cnt = -1;
      const ac = engine.ensure(), beat = 60 / L.bpm, t0 = ac.currentTime + 0.5, tStart = t0 + 4 * beat;
      for (let k = 0; k < 4; k++) V.click(t0 + k * beat, k === 0);
      // 마디마다 반주 화음 — 그 마디 막대 음(솔 · 미 · 라)에 맞춰 고름(docs/sound.md §4)
      const chords = Array.from({ length: Math.ceil(L.beats / 4) }, (_, k) => harmonize(L.notes.filter(nt => nt.r >= 0 && nt.b >= k * 4 && nt.b < k * 4 + 4).map(nt => ({ p: R.p[nt.r], b: nt.b - k * 4, d: nt.d }))));
      run = {
        L, bars, ac, beat, t0, tStart, end: tStart + L.beats * beat, hat: 0, chords,
        outLat: ac.outputLatency || ac.baseLatency || 0, lat: device.latencyMs || 0,
        win: windows('low', beat * 1000),
        notes: L.notes.map((nt, k) => ({ ...nt, t: tStart + nt.b * beat, st: null, k })),
      };
      S.pose('idle');
      mode = 'play';
    }
    function press(r, ms) {
      if (mode !== 'play' || !run) return;
      const ac = run.ac, now = ac.currentTime;
      const adj = (ms ?? performance.now()) - run.lat;
      let best = null, bestAbs = Infinity;
      for (const nt of run.notes) {
        if (nt.st) continue;
        const d = adj - audioToPerf(ac, nt.t);
        if (d < -run.win.early || d > run.win.late) continue;
        if (Math.abs(d) < bestAbs) { best = nt; bestAbs = Math.abs(d); }
      }
      if (!best) {
        // 막대가 없는 때 — 소리만 짧게(손맛) · 긴 막대가 아직 울리는 동안이면 '서두름'
        V.note(INST, R.p[r], now + 0.01, 0.16, 0.35);
        const hold = run.notes.find(nt => nt.st && nt.d >= 2 && now > nt.t + 0.3 && now < nt.t + nt.d * run.beat - 0.2);
        if (hold) rushed++;
        return;
      }
      const len = best.d * run.beat * 0.92;
      V.note(INST, R.p[r], now + 0.01, len, 0.6);     // 누르면 막대 길이만큼 소리
      const bar = run.bars[best.k];
      clearTimeout(markT); S.markKeys(null, null);
      if (r === best.r) {
        best.st = bestAbs <= run.win.great ? 'great' : 'ok';
        bar.classList.add(best.st === 'great' ? 'gg' : 'g', 'on');
        T.after(len * 1000, () => bar.classList.remove('on'));
        ui.tell(best.st === 'great' ? '딱!' : '좋아', 'good', 700); S.pose('play');
      } else {
        best.st = 'wrong';
        bar.classList.add('m');
        ui.tell('삐끗', 'oops', 700); S.pose('oops');
        S.markKeys(r, best.r); markT = setTimeout(() => S.markKeys(null, null), 450);   // 잠깐 — 흐름은 멈추지 않음
      }
      judgedOne();
    }
    function loop() {
      if (gone) return;
      if (run && mode === 'play') {
        const now = run.ac.currentTime - run.outLat;
        const b = (now - run.tStart) / run.beat;
        S.headAt(Math.max(0, Math.min(run.L.beats, b)));
        // 반주(주제곡 결 — 낮은 소리 · 화음 · 박마다 작은 햇) — 한 마디씩, 0.3초 앞만(동시 소리 줄이기)
        while (run.hat < run.L.beats && run.tStart + run.hat * run.beat < run.ac.currentTime + 0.3) {
          const k = run.hat / 4;
          accompSound(engine, V.out, run.tStart + run.hat * run.beat, run.beat, 0, { sal: 'pulse', spans: [{ b: 0, len: 4, name: run.chords[k] }] }, Math.min(4, run.L.beats - run.hat));
          run.hat += 4;
        }
        // 넷 세기 — 악보 가운데 큰 숫자 1 2 3 4(박마다 한 번만 바꿈 · 세는 동안만)
        const ci = Math.floor((now - run.t0) / run.beat);
        if (ci !== cnt && ci >= 0 && ci <= 4) {
          cnt = ci;
          if (ci < 4) { cnum.hidden = false; cnum.textContent = String(ci + 1); cnum.animate([{ transform: 'translate(-50%, -50%) scale(.7)', opacity: 0.4 }, { transform: 'translate(-50%, -50%)', opacity: 1 }], { duration: 160, easing: 'ease-out' }); }
          else cnum.hidden = true;
        }
        const lateS = (run.win.late + run.lat) / 1000;
        for (const nt of run.notes) {
          if (!nt.st && now > nt.t + lateS) { nt.st = 'miss'; run.bars[nt.k].classList.add('m'); ui.tell('놓쳤어요', 'oops', 700); S.pose('oops'); judgedOne(); }
        }
        if (now > run.end + 0.35) {
          mode = 'between';
          run.notes.forEach((nt, k) => all.push({ st: nt.st, long: nt.d >= 2, afterLong: k > 0 && run.notes[k - 1].d >= 2 }));
          S.pose('happy');
          T.after(900, nextLine);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    function end() {
      mode = 'done'; ui.tell(null); S.pose('happy'); cnum.hidden = true;
      sheetDots.forEach(d => { d.className = 'done'; });
      const results = all.map(x => x.st === 'great' || x.st === 'ok');
      const s = kit.scoreChoices(results, 6);
      const great = all.filter(x => x.st === 'great').length;
      const wrongRow = all.filter(x => x.st === 'wrong').length, missed = all.filter(x => x.st === 'miss').length;
      const missAfterLong = all.filter(x => x.st === 'miss' && x.afterLong).length;
      let tip;
      if (!wrongRow && !missed) tip = '막대 높이를 읽고, 긴 막대는 기다렸다가 다음 막대를 제때 눌렀어요.';
      else if (wrongRow >= missed) tip = `위아래를 바꿔 누른 막대가 ${wrongRow}개 있었어요. 막대가 위에 있으면 높은 소리예요.`;
      else if (rushed || missAfterLong * 2 >= missed) tip = `긴 막대 다음에서 놓친 적이 ${missAfterLong}번 있었어요. 긴 막대는 거북이 막대 끝까지 갈 때까지 기다려요.`;
      else tip = `놓친 막대가 ${missed}개 있었어요. 거북이 막대 앞 끝에 닿을 때 눌러요.`;
      // 기준 둘 — 높이(맞는 단추를 제때 누름) · 박자(그중 '딱' 맞춘 것) — 둘 다 막대 수를 분모로
      T.after(700, () => {
        S.showHead(false); ui.count(null); ui.setBar();   // 결과 옆 친구는 칸 화면이 붙임
        kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, group: lines.map(L => L.notes.length), facts: [`높이 ${s.total}개 중 ${s.kept}개,`, kit.band === 'low' ? `‘딱’은 ${s.total}개 중 ${great}개였어요` : `박자 ${s.total}개 중 ${great}개를 맞혔어요`, `이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
      });
    }

    // 자동 시험 — 다음 막대의 때가 판정 창 안에 들면 그 줄을 누름
    kit.setAuto(() => {
      if (start.isConnected) { startBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; }
      if (mode !== 'play' || !run) return;
      const ms = performance.now(), adj = ms - run.lat;
      const nt = run.notes.find(x => !x.st);
      if (!nt) return;
      const d = adj - audioToPerf(run.ac, nt.t);
      if (d >= -run.win.early * 0.8 && d <= run.win.late * 0.8) press(nt.r, ms);
    });
    S.keys.forEach((k, r) => onPress(k, e => press(r, e && e.timeStamp)));
    S.lanes.forEach((l, r) => l.lane.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); press(r, e.timeStamp); }));
    const onKey = e => { if (e.repeat) return; const r = keyRow(e, n); if (r >= 0) { e.preventDefault(); press(r, e.timeStamp); } };
    window.addEventListener('keydown', onKey);
    raf = requestAnimationFrame(loop);
    return () => { gone = true; mode = 'gone'; cancelAnimationFrame(raf); clearTimeout(markT); T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};
