// 악1 그림 악보 — 세로 자리 = 높이(두 층 · 5~6학년 판은 세 층) · 가로 막대 길이 = 소리 길이(박 수)
//  재생 선이 왼쪽에서 오른쪽으로 지나간다. 막대가 오면 그 높이의 단추를 누르면 막대 길이만큼 소리가 난다.
//  높이 단추는 그 줄 오른쪽 끝에 붙어 있다 — 아래 띠에 나란히 두면 '위 줄 = 왼쪽 단추'로 한 번 더 바꿔 생각해야 해서(처음 쓰는 아이 눈).
//  줄을 직접 눌러도 된다. 쓰는 음은 솔 · 미(세 층이면 라 · 솔 · 미) — 가1 · 가2와 같은 음, 소리는 이어지는 리코더(길이가 들리게).
//  보기: 같은 그림 악보를 소리와 함께(막대가 소리 나는 동안 반짝) · 예시 넷(오르는 · 내리는 · 길고 짧게 · 자작 곡 「솔미 인사」/「라가 왔어요」)
//  따라 하기: 막대 셋짜리 짧은 악보 — 재생 선이 기다려 준다(맞는 단추를 누르면 그 길이만큼 소리와 함께 지나감) · 세 번 이어서 맞히면 지남
//  확인 게임: 네 줄(줄마다 8박 · 넷 세고 시작) — 소개 → 발전(긴 막대가 먼저) → 비틀기(빨라지고 자주 바뀜) → 마무리(자작 곡 앞 두 마디)
//  때는 너그럽게(engine/judge.js 'low' 창 = 이르게 150ms · 늦게 180ms) · 높이가 맞아야 맞음 · 실수해도 줄은 끝까지 흐른다
import { voice } from './_snd.js';
import { windows } from '../../../engine/judge.js';
import { audioToPerf } from '../clock.js';
import { SONGS } from '../../../engine/songs/index.js';
import { parseMel } from '../../../engine/song.js';
import { TPQ } from '../../../engine/theory.js';

const ROWS = {
  2: { p: [67, 64], name: ['높은 소리', '낮은 소리'], keys: '↑ ↓' },
  3: { p: [69, 67, 64], name: ['높은 소리', '가운데 소리', '낮은 소리'], keys: '1 2 3' },
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

// 그림 악보 — 줄 n개 · 오른쪽 끝에 줄 이름(또는 누르는 단추) · 재생 선 + 거북
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
  const turtle = h('div', { class: 'ps-turtle' }, kit.friendImg('turtle', 'idle', { label: false }));
  const word = h('span', { class: 'ps-word' });
  const line = h('div', { class: 'ps-head' }, turtle, word, h('i', { class: 'ps-line' }));
  const count = h('div', { class: 'ps-count' });
  const track = h('div', { class: 'ps-track' }, grid, line);
  const el = h('div', { class: 'pscore' + (keys ? ' keys' : ''), style: { '--rowh': rowh + 'px', '--headh': head + 'px', '--n': String(n) } }, sheet, ...keyEls, track, count);
  let bars = [], beats = 8, px = 0;
  const api = {
    el, keys: keyEls, lanes,
    set(notes, total) {
      beats = total;
      for (const l of lanes) l.inner.replaceChildren();
      grid.replaceChildren(...Array.from({ length: total + 1 }, (_, k) => h('i', { class: k % 4 === 0 ? 'bar4' : '', style: { left: `${(k / total) * 100}%` } })));
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
    count(t) { count.textContent = t || ''; },
    say(t, k) { word.textContent = t; word.dataset.k = k || ''; word.classList.remove('pop'); void word.offsetWidth; if (t) word.classList.add('pop'); },
    pose(p) { kit.setPose(turtle.firstChild, 'turtle', p); },
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
    const S = score(kit, n, { rowh: n === 3 ? 70 : 96, head: 76 });
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
        if (b < endB + 0.2) raf = requestAnimationFrame(loop); else S.pose('happy');
      };
      raf = requestAnimationFrame(loop);
    }
    const cards = exs.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard' }, h('b', {}, ex.name), h('span', {}, ex.sub));
      onPress(btn, () => { play(ex); btn.classList.add('heard'); });
      return btn;
    });
    ui.stage.append(h('div', { class: 'ps-show' }, S.el, h('div', { class: 'ps-cards' }, ...cards)));
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
    ui.say('지금 막대가 있는 줄의 단추를 눌러요');
    const S = score(kit, n, { keys: true, rowh: n === 3 ? 92 : 128, head: 76 });
    let streak = 0, notes = [], bars = [], idx = 0, busy = true, passed = false;
    const msg = h('p', { class: 'fmsg' });
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
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
      if (r === nt.r) {
        busy = true;
        const ac = engine.ensure(), t = ac.currentTime + 0.02, len = nt.d * beat;
        V.note(INST, R.p[r], t, len * 0.92, 0.6);
        bar.classList.remove('now'); bar.classList.add('on');
        S.headAt(nt.b + nt.d, len); S.pose('play');
        streak++; paint();
        msg.textContent = `맞아요 — ${R.name[r]}를 ${nt.d >= 2 ? '길게' : '짧게'}`;
        T.after(len * 1000 + 80, () => {
          bar.classList.remove('on'); bar.classList.add('g'); S.pose('idle');
          if (streak >= 3) { passed = true; kit.pass(); return; }
          idx++;
          if (idx >= notes.length) T.after(500, phrase);
          else { busy = false; mark(); }
        });
      } else {
        kit.sfx.oops(engine); streak = 0; paint(); S.pose('oops');
        msg.textContent = `이 막대는 ${R.name[nt.r]} 줄에 있어요. 다시 눌러 봐요`;
        bar.classList.remove('nope'); void bar.offsetWidth; bar.classList.add('nope');
        busy = true; T.after(450, () => { busy = false; S.pose('idle'); });
      }
    }
    S.keys.forEach((k, r) => onPress(k, () => press(r)));
    S.lanes.forEach((l, r) => l.lane.addEventListener('pointerdown', e => { if (e.button > 0) return; press(r); }));
    ui.stage.append(h('div', { class: 'ps-follow' }, S.el, h('div', { class: 'row' }, dots, msg)));
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
    let li = -1, run = null, mode = 'ready', raf = 0, gone = false, rushed = 0;
    const all = [];                                   // 막대마다 { st, long, afterLong }
    ui.say('');
    const S = score(kit, n, { keys: true, rowh: n === 3 ? 128 : 156, head: 84 });
    const counter = h('div', { class: 'ak-count' });
    const scene = h('div', { class: 'ak-scene' }, S.el, counter);
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '그림 악보 따라 연주'),
      h('p', { class: 'sub' }, '넷 세고, 거북이 막대에 닿으면 그 줄 단추를 눌러요'),
      h('p', { class: 'sub' }, `네 줄 · 키보드 ${R.keys} 도 돼요`)));
    ui.stage.append(scene, start);
    S.set(lines[0].notes, lines[0].beats);
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(); S.measure(); T.after(200, nextLine); });
    ui.setBar(startBtn);

    function nextLine() {
      if (gone) return;
      li++;
      if (li >= lines.length) return end();
      const L = lines[li];
      const bars = S.set(L.notes, L.beats);
      S.measure();
      counter.textContent = `${li + 1} / ${lines.length} 줄`;
      const ac = engine.ensure(), beat = 60 / L.bpm, t0 = ac.currentTime + 0.5, tStart = t0 + 4 * beat;
      for (let k = 0; k < 4; k++) V.click(t0 + k * beat, k === 0);
      for (let k = 0; k < L.beats; k++) engine.drum('hat', tStart + k * beat, 0.22, V.out);   // 박 소리(작게)
      run = {
        L, bars, ac, beat, t0, tStart, end: tStart + L.beats * beat,
        outLat: ac.outputLatency || ac.baseLatency || 0, lat: device.latencyMs || 0,
        win: windows('low', beat * 1000),
        notes: L.notes.map((nt, k) => ({ ...nt, t: tStart + nt.b * beat, st: null, k })),
      };
      S.pose('idle'); S.say('');
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
      if (r === best.r) {
        best.st = bestAbs <= run.win.great ? 'great' : 'ok';
        bar.classList.add(best.st === 'great' ? 'gg' : 'g', 'on');
        T.after(len * 1000, () => bar.classList.remove('on'));
        S.say(best.st === 'great' ? '딱!' : '좋아', best.st); S.pose('play');
      } else {
        best.st = 'wrong';
        bar.classList.add('m');
        S.say('삐끗', 'oops'); S.pose('oops');
      }
    }
    function loop() {
      if (gone) return;
      if (run && mode === 'play') {
        const now = run.ac.currentTime - run.outLat;
        const b = (now - run.tStart) / run.beat;
        S.headAt(Math.max(0, Math.min(run.L.beats, b)));
        const ci = Math.floor((now - run.t0) / run.beat);
        S.count(ci >= 0 && ci < 4 ? String(ci + 1) : '');
        const lateS = (run.win.late + run.lat) / 1000;
        for (const nt of run.notes) {
          if (!nt.st && now > nt.t + lateS) { nt.st = 'miss'; run.bars[nt.k].classList.add('m'); S.say('놓쳤어요', 'oops'); S.pose('oops'); }
        }
        if (now > run.end + 0.35) {
          mode = 'between';
          run.notes.forEach((nt, k) => all.push({ st: nt.st, long: nt.d >= 2, afterLong: k > 0 && run.notes[k - 1].d >= 2 }));
          S.say(''); S.pose('happy');
          T.after(900, nextLine);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    function end() {
      mode = 'done'; S.count(''); S.pose('happy');
      const results = all.map(x => x.st === 'great' || x.st === 'ok');
      const s = kit.scoreChoices(results, 6);
      const great = all.filter(x => x.st === 'great').length;
      const wrongRow = all.filter(x => x.st === 'wrong').length, missed = all.filter(x => x.st === 'miss').length;
      const missAfterLong = all.filter(x => x.st === 'miss' && x.afterLong).length;
      let tip;
      if (!wrongRow && !missed) tip = '막대 높이를 읽고, 긴 막대는 기다렸다가 다음 막대를 제때 눌렀어요.';
      else if (wrongRow >= missed) tip = `줄을 바꿔 누른 막대가 ${wrongRow}개 있었어요. 막대가 위 줄에 있으면 높은 소리예요.`;
      else if (rushed || missAfterLong * 2 >= missed) tip = `긴 막대 다음에서 놓친 적이 ${missAfterLong}번 있었어요. 긴 막대는 거북이 막대 끝까지 갈 때까지 기다려요.`;
      else tip = `놓친 막대가 ${missed}개 있었어요. 거북이 막대 앞 끝에 닿을 때 눌러요.`;
      T.after(700, () => kit.finish({ title: `막대 ${s.total}개 중 ${s.kept}개 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}개`, `딱 맞은 막대 ${great}개`], starOn: s.starOn, rules: s.rules.map(t => t.replace('번', '개')), tip }));
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
    return () => { gone = true; mode = 'gone'; cancelAnimationFrame(raf); T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};
