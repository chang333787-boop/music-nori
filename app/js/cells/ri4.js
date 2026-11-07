// 리4 2분음표 — 한 소리가 박 여러 개를 차지한다(박 점 두 개가 한 막대로 이어진 그림)
//  보기: 예시 넷(4분 넷 · 2분 둘 · 섞음 둘 · 악기 넷) — 박 점 위 막대가 소리 나는 동안 차오른다
//  따라 하기: 한 마디씩 — 막대가 선에 닿으면 누르고, 막대가 끝날 때 뗀다 · 세 번 이어서 맞히면 지남
//  확인 게임: 풍선 불기 9마디(22음) · 4분음표 = 짧게 누르기(동그란 풍선) · 2분음표 = 두 박 동안 누르기(긴 풍선)
//  판정: 누름 시작 = engine/judge.js 판정 창 · 뗌 = 2분음표는 끝 박 ±(학년군 비율) · 4분음표는 한 박 반 안에만 떼면 됨(_beat.js releaseGrade)
//  길이는 가로 길이로(화면 약속) — 풍선도 길게 늘어난다
import { bpmOf, releaseGrade, HOLD_WIN, layoutNotes, newBus, killBus, heardNow, perfOf, autoScheduler, pressInput, fireDown, fireUp, startCard, noteSVG, SYL, LEN } from './_beat.js';
import { windows } from '../../../engine/judge.js';

const PX = 170, COUNT = 4, PITCH = 67;                      // 박 하나 = 170px · 솔(G4) 한 음
const BAL = ['#BFDDEF', '#F2B6C6', '#CFE5C3', '#F3D98B', '#D9CDEB'];
const EXAMPLES = [
  { bars: [['q', 'q', 'q', 'q']], name: '4분음표 넷', inst: 'recorder', inName: '리코더' },
  { bars: [['h', 'h']], name: '2분음표 둘', inst: 'strings', inName: '현악기' },
  { bars: [['q', 'q', 'h']], name: '섞어서', inst: 'flute', inName: '플루트' },
  { bars: [['h', 'q', 'q']], name: '섞어서', inst: 'choir', inName: '목소리' },
];
const FOLLOW = [['q', 'q', 'h'], ['h', 'h'], ['h', 'q', 'q'], ['q', 'h', 'q'], ['q', 'q', 'h']];
// 확인 게임 9마디 22음 — 소개(1·2) → 발전(3~5 · 5는 짧게만) → 비틀기(6 둘째 박 2분음표 · 7·8 쉼표) → 마무리(9)
//  음 수는 22개까지(결과 카드 다시 보기 줄이 한 줄에 들어가게) · 약 31초
const PLAN = [['q', 'q', 'h'], ['q', 'q', 'h'], ['h', 'h'], ['h', 'q', 'q'], ['q', 'q', 'q', 'qr'], ['q', 'h', 'q'], ['h', 'qr', 'q'], ['h', 'qr', 'qr'], ['h', 'h']];
let RUN = 0;
const sylOf = k => (k === 'q' ? '따' : SYL[k]);

// 박 길(가로) — 박 점 · 마디줄 · 음표 막대(길이만큼) · 준비 박 숫자
function laneView(kit, bars, { scroll = true } = {}) {
  const { h } = kit;
  const stick = kit.band === 'low';
  const { notes, beats } = layoutNotes(bars);
  const rests = [];
  { let b = 0; for (const bar of bars) for (const k of bar) { if (k === 'qr') rests.push(b); b += LEN[k]; } }
  const track = h('div', { class: 'r4-track' });
  for (let b = scroll ? -COUNT : 0; b < beats; b++) {
    if (b > 0 && b % 4 === 0) track.append(h('i', { class: 'r4-barline', style: { left: `${b * PX - 32}px` } }));
    track.append(h('i', { class: 'r4-dot' + (b < 0 ? ' cnt' : ''), style: { left: `${b * PX}px` } }, b < 0 ? String(b + COUNT + 1) : ''));
  }
  const els = notes.map(n => {
    const fill = h('i', { class: 'fill' });
    const el = h('div', { class: 'r4-note ' + n.kind, style: { left: `${n.beat * PX - 22}px`, width: `${n.len * PX - 20}px` } },
      fill, h('span', { class: 'sym', html: noteSVG(n.kind, { stick, size: 56 }) }), h('b', { class: 'syl' }, sylOf(n.kind)));
    track.append(el);
    // 막대 위 박 점(이 음이 차지하는 박마다 하나 — 2분음표는 둘이 한 막대로 이어진다)
    for (let j = 0; j < n.len; j++) el.append(h('i', { class: 'pdot', style: { left: `${19 + j * PX}px` } }));
    return { el, fill };
  });
  for (const b of rests) track.append(h('span', { class: 'r4-rest', style: { left: `${b * PX}px` }, html: noteSVG('qr', { size: 56 }) }, h('b', {}, '쉼')));
  const hit = h('i', { class: 'r4-hit' });
  const cnum = h('b', { class: 'r4-cnum' });                  // 멈춘 길(보기)의 준비 박 숫자
  const lane = h('div', { class: 'r4-lane' + (scroll ? '' : ' still') }, track, hit, cnum);
  let x0 = 0;
  return {
    lane, notes, beats, els,
    // nowBeat = 첫 박에서 몇 박 지났나(준비 박은 음수) · 길을 옮기거나(scroll) 선을 옮긴다(still)
    place(nowBeat) {
      if (scroll) { track.style.transform = `translateX(${(220 - nowBeat * PX).toFixed(1)}px)`; return; }
      if (!x0) x0 = Math.max(60, (lane.clientWidth - beats * PX) / 2 + 22);
      const c = nowBeat < 0 && nowBeat >= -COUNT ? String(Math.floor(nowBeat) + COUNT + 1) : '';
      if (cnum.textContent !== c) cnum.textContent = c;
      track.style.transform = `translateX(${x0}px)`;
      hit.style.transform = `translateX(${(x0 + Math.max(-0.5, Math.min(beats - 0.3, nowBeat)) * PX).toFixed(1)}px)`;
    },
    fillTo(i, p) { els[i].fill.style.width = `${(Math.max(0, Math.min(1, p)) * 100).toFixed(1)}%`; },
    mark(i, cls) { els[i].el.classList.remove('now', 'ok', 'great', 'short', 'long', 'miss'); if (cls) els[i].el.classList.add(...cls.split(' ')); },
    now(i, on) { els[i].el.classList.toggle('now', on); },
  };
}

// 하늘 · 고슴도치 · 풍선 줄
function skyView(kit) {
  const { h } = kit;
  const hog = kit.friendImg(kit.friend, 'idle', { label: false });
  const hogBox = h('div', { class: 'r4-hog' }, hog);
  const word = h('div', { class: 'r4-word' });
  const sky = h('div', { class: 'r4-sky' }, hogBox, word);
  const ROW0 = 420;
  let slot = 0, n = 0, rowX = [ROW0, ROW0];
  function balloon(len) {
    const color = BAL[n++ % BAL.length];
    const el = h('div', { class: 'r4-bal' + (len >= 2 ? ' long' : ''), style: { '--c': color, top: `${Math.max(40, sky.clientHeight - 122)}px` } }, h('i', { class: 'knot' }));
    sky.append(el);
    const W = p => (len >= 2 ? 34 + 112 * p : 34 + 26 * p);
    const grow = p => { el.style.width = `${W(Math.max(0, Math.min(1, p))).toFixed(1)}px`; };
    grow(0);
    return {
      grow,
      tie() {                                   // 줄에 매달기(성공한 풍선이 하늘에 남는다)
        grow(1);
        const w = W(1) * 0.5, lim = sky.clientWidth - 190, row = rowX[0] + w > lim ? 1 : 0;   /* 오른쪽 위 = 셈 자리 */
        if (rowX[row] + w > lim) rowX = [ROW0, ROW0];
        const x = rowX[row]; rowX[row] += w + 8;
        el.classList.add('tied');
        el.style.left = `${x}px`; el.style.top = `${row ? 74 : 16}px`;
        slot++;
      },
      pop() { el.classList.add('pop'); setTimeout(() => el.remove(), 450); },
      away() { el.classList.add('away'); setTimeout(() => el.remove(), 900); },
    };
  }
  const say = (t, k) => { word.textContent = t; word.dataset.k = k || ''; word.classList.remove('show'); void word.offsetWidth; word.classList.add('show'); };
  return { sky, hog, hogBox, balloon, say };
}

// 한 판 틀 — 준비 박 넷 → 마디들(쉼 없이) · 누르기/떼기 판정 · 소리 · 그림
function holdRun(kit, view, lane, { bars, bpm, onNote, onEnd }) {
  const { engine } = kit;
  const ac = engine.ensure();
  const bus = newBus(engine);
  const beat = 60 / bpm, beatMs = beat * 1000, band = kit.band, lat = kit.device.latencyMs;
  const w = windows(band, beatMs), relLate = (HOLD_WIN[band] || HOLD_WIN.mid)[1];
  const t0 = ac.currentTime + 0.5 + COUNT * beat;            // 첫 박(준비 박 다음)
  const tOf = b => t0 + b * beat;
  const runId = ++RUN;
  // 박자기 · 반주(마디 첫 박에 낮은 소리 · 박마다 작은 소리)
  for (let i = 0; i < COUNT; i++) engine.click(tOf(i - COUNT), i === 0, bus);
  for (let b = 0; b < lane.beats; b++) {
    engine.drum('hat', tOf(b), b % 4 === 0 ? 0.4 : 0.28, bus);
    if (b % 4 === 0) engine.note('marimba', [48, 53, 55, 48][(b / 4) % 4], tOf(b), beat * 1.6, 0.4, bus);
  }
  engine.note('marimba', 60, tOf(lane.beats), beat * 2, 0.45, bus);
  const notes = lane.notes.map(n => ({ ...n, at: tOf(n.beat), res: null, press: null, down: null, bal: null }));
  let holding = null, tone = null, gone = false, raf = 0, ended = false;
  const atMs = n => perfOf(ac, n.at);

  function down(e) {
    if (gone) return;
    const ms = e && e.timeStamp ? e.timeStamp : performance.now();
    tone = engine.note('recorder', PITCH, ac.currentTime, 8, 0.7, bus);
    // 판정 창 안에서 가장 가까운, 아직 안 누른 음
    let best = -1, bestAbs = Infinity;
    notes.forEach((n, i) => {
      if (n.press) return;
      const d = ms - lat - atMs(n);
      if (d < -w.early || d > w.late) return;
      if (Math.abs(d) < bestAbs) { best = i; bestAbs = Math.abs(d); }
    });
    if (best < 0) return;
    const n = notes[best];
    n.press = bestAbs <= w.great ? 'great' : 'ok';
    n.down = ms;
    n.bal = view.balloon(n.len);
    holding = best;
    kit.setPose(view.hog, kit.friend, 'play');
    lane.now(best, true);
  }
  function up(e) {
    if (tone) { tone.stop(ac.currentTime); tone = null; }
    if (gone || holding == null) return;
    const ms = e && e.timeStamp ? e.timeStamp : performance.now();
    settle(holding, ms);
  }
  // 한 음을 마무리(뗐을 때 또는 너무 오래 눌러 끝났을 때)
  function settle(i, upMs) {
    const n = notes[i];
    if (n.res) return;
    const rel = releaseGrade(n.len, atMs(n), upMs - lat, beatMs, band);
    n.res = { press: n.press, rel, ok: rel === 'ok' };
    if (holding === i) holding = null;
    lane.now(i, false);
    if (rel === 'ok') {
      lane.fillTo(i, 1); lane.mark(i, n.press === 'great' ? 'ok great' : 'ok'); n.bal.tie();
      view.say(n.press === 'great' ? '딱!' : '좋아', n.press === 'great' ? 'great' : 'good');
      kit.setPose(view.hog, kit.friend, 'happy');
    } else if (rel === 'short') {
      lane.mark(i, 'short'); n.bal.pop(); view.say('일찍 뗐어요', 'oops'); kit.setPose(view.hog, kit.friend, 'oops');
    } else {
      lane.mark(i, 'long'); n.bal.away(); view.say(n.len >= 2 ? '두 박에서 떼요' : '짧게 떼요', 'oops'); kit.setPose(view.hog, kit.friend, 'oops');
    }
    onNote && onNote(i, n.res);
  }
  function loop() {
    if (gone) return;
    const now = heardNow(ac);
    lane.place((now - t0) / beat);
    notes.forEach((n, i) => {
      if (n.res) return;
      if (!n.press) {
        if (now > n.at + (w.late + lat) / 1000) { n.res = { press: 'miss', rel: null, ok: false }; lane.mark(i, 'miss'); view.say('놓쳤어요', 'oops'); onNote && onNote(i, n.res); }
        return;
      }
      // 누르는 중 — 막대가 차오르고 풍선이 커진다
      const p = (now - n.at) / (n.len * beat);
      lane.fillTo(i, p); n.bal.grow(p);
      if (now > n.at + (n.len + relLate) * beat + lat / 1000) settle(i, Infinity);
    });
    if (!ended && notes.every(n => n.res) && now > tOf(lane.beats) - beat * 0.5) {
      ended = true;
      onEnd(notes.map(n => n.res));
    }
    raf = requestAnimationFrame(loop);
  }
  lane.place(-COUNT - 0.6);
  raf = requestAnimationFrame(loop);
  // 자동 시험: 음 시작에 누르고, 4분음표는 0.6박 · 2분음표는 끝 0.15박 전에 뗀다
  const targets = () => notes.flatMap((n, i) => {
    const d = perfOf(ac, n.at) + lat, u = perfOf(ac, n.at + (n.len >= 2 ? n.len - 0.15 : 0.6) * beat) + lat;
    return [{ id: `${runId}:${i}:d`, ms: d, kind: 'd' }, { id: `${runId}:${i}:u`, ms: u, kind: 'u' }];
  });
  return {
    down, up, targets,
    stop() { gone = true; cancelAnimationFrame(raf); if (tone) { tone.stop(ac.currentTime); tone = null; } killBus(engine, bus); },
  };
}

function holdScene(kit, bars) {
  const { h } = kit;
  const view = skyView(kit);
  const lane = laneView(kit, bars);
  return { view, lane, el: h('div', { class: 'r4 r4-play' }, view.sky, lane.lane) };
}

export default {
  // ── 보기: 4분음표(박 하나) 대 2분음표(박 둘) ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const stick = kit.band === 'low';
    ui.say('2분음표는 소리 하나가 박 두 개 동안 이어져요');
    let lane = laneView(kit, EXAMPLES[0].bars, { scroll: false });
    const laneBox = h('div', { class: 'r4-lanebox' }, lane.lane);
    const hog = kit.friendImg(kit.friend, 'idle', { label: false });
    const pair = (kind, beats, text, sub) => h('div', { class: 'r4-pair' },
      h('span', { class: 'r4-psym', html: noteSVG(kind, { stick, size: 70 }) }),
      h('span', { class: 'r4-pbar ' + kind }, ...Array.from({ length: beats }, () => h('i'))),
      h('span', { class: 'r4-ptxt' }, h('b', {}, text), h('small', {}, sub)));
    let bus = null, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); killBus(engine, bus); bus = null; kit.setPose(hog, kit.friend, 'idle'); };
    const cards = EXAMPLES.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard r4-ex' },
        h('b', {}, ex.bars[0].map(sylOf).join(' ')),
        h('span', { class: 'r4-mini', html: ex.bars[0].map(k => noteSVG(k, { stick, size: 38 })).join('') }),
        h('span', {}, `${ex.name} · ${ex.inName}`));
      onPress(btn, () => {
        stop();
        const nl = laneView(kit, ex.bars, { scroll: false });
        laneBox.replaceChildren(nl.lane); lane = nl;
        const ac = engine.ensure();
        bus = newBus(engine);
        const beat = 60 / 92, t0 = ac.currentTime + 0.35 + COUNT * beat;
        for (let i = 0; i < COUNT; i++) engine.click(t0 + (i - COUNT) * beat, i === 0, bus);
        for (let b = 0; b < lane.beats; b++) engine.drum('hat', t0 + b * beat, 0.25, bus);
        lane.notes.forEach(n => engine.note(ex.inst, PITCH, t0 + n.beat * beat, (n.len - 0.12) * beat, 0.75, bus));
        const loop = () => {
          const nb = (heardNow(ac) - t0) / beat;
          lane.place(nb);
          lane.notes.forEach((n, i) => { lane.fillTo(i, (nb - n.beat) / (n.len - 0.12)); lane.now(i, nb >= n.beat && nb < n.beat + n.len); });
          kit.setPose(hog, kit.friend, nb >= 0 && nb < lane.beats ? 'play' : 'idle');
          if (nb > lane.beats + 0.6) { stop(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r4 r4-show' },
      h('div', { class: 'r4-pairs' }, h('div', { class: 'r4-shog' }, hog),
        pair('q', 1, '4분음표 = 박 하나', '따 · 손뼉 한 번'),
        pair('h', 2, '2분음표 = 박 둘', '따아 · 쭈욱 이어서')),
      laneBox,
      h('div', { class: 'r4-exgrid' }, ...cards)));
    requestAnimationFrame(() => lane.place(-1));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => stop();
  },

  // ── 따라 하기: 한 마디씩 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('막대가 선에 닿으면 누르고, 막대가 끝나면 떼요');
    const host = h('div', { class: 'r4-host' });
    const msg = h('p', { class: 'fmsg' });
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    ui.stage.append(h('div', { class: 'r4-wrap' }, host, h('div', { class: 'r4-info' }, dots, msg)));
    let streak = 0, run = null, n = 0, passed = false;
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    const input = pressInput(ui, kit, { onDown: e => run && run.down(e), onUp: e => run && run.up(e), label: '꾹!', aria: '꾹 — 누르고 있기' });
    const skip = h('button', { type: 'button' }, '넘어가기');
    kit.onPress(skip, () => kit.next());
    ui.setBar(skip, input.btn);
    const auto = autoScheduler(T);
    function attempt() {
      if (passed) return;
      const bar = n === 0 ? FOLLOW[0] : FOLLOW[1 + Math.floor(r() * (FOLLOW.length - 1))];
      n++;
      msg.textContent = '';
      run && run.stop();
      const sc = holdScene(kit, [bar]);
      host.replaceChildren(sc.el);
      run = holdRun(kit, sc.view, sc.lane, {
        bars: [bar], bpm: bpmOf('hold', kit.band),
        onEnd: res => {
          const bad = res.findIndex(x => !x.ok);
          if (bad < 0) {
            kit.sfx.good(kit.engine); streak++; paint();
            msg.textContent = '맞아요 — 따는 한 박, 따아는 두 박 동안 눌렀어요';
            if (streak >= 3) { passed = true; run.stop(); input.off(); kit.pass('세 번 이어서 길이를 맞혔어요'); return; }
          } else {
            streak = 0; paint();
            const kind = sc.lane.notes[bad].kind, x = res[bad];
            msg.textContent = x.press === 'miss' ? `${bad + 1}번째 음을 놓쳤어요 — 막대가 선에 닿을 때 눌러요`
              : x.rel === 'short' ? '따아(2분음표)를 일찍 뗐어요 — 박 점 두 개가 지날 때까지 눌러요'
                : kind === 'q' ? '따(4분음표)는 한 박만 — 짧게 눌렀다 떼요' : '따아는 두 박까지만 — 막대가 끝나면 떼요';
          }
          T.after(1500, attempt);
        },
      });
    }
    T.after(400, attempt);
    kit.setAuto(() => { if (run) auto(run.targets(), tg => (tg.kind === 'd' ? fireDown(input.btn) : fireUp())); });
    return () => { T.clear(); run && run.stop(); input.off(); };
  },

  // ── 확인 게임: 풍선 불기 8마디 ──
  game(ui, kit) {
    const { h } = kit;
    const T = kit.timers();
    ui.say('');
    const sc = holdScene(kit, PLAN);
    const counter = h('div', { class: 'r4-counter' });
    ui.stage.append(h('div', { class: 'r4-wrap game' }, sc.el, h('div', { class: 'r4-info' }, counter)));
    sc.lane.place(-COUNT - 0.6);
    const total = sc.lane.notes.length;
    let run = null, input = null, done = 0;
    const auto = autoScheduler(T);
    const card = startCard(ui, kit, {
      title: '풍선 불기',
      sub: [h('p', { class: 'sub r4-cardpair', html: `${noteSVG('q', { stick: kit.band === 'low', size: 46 })}<span>따 = 짧게 꾹</span>${noteSVG('h', { size: 46 })}<span>따아 = 두 박 동안 꾹</span>` }),
        `막대가 선에 닿으면 눌러요 · ${PLAN.length}마디`],
      onStart: () => {
        input = pressInput(ui, kit, { onDown: e => run && run.down(e), onUp: e => run && run.up(e), label: '꾹!', aria: '꾹 — 누르고 있기' });
        ui.setBar(...input.nodes);
        counter.textContent = `풍선 0 / ${total}`;
        run = holdRun(kit, sc.view, sc.lane, {
          bars: PLAN, bpm: bpmOf('hold', kit.band),
          onNote: (i, x) => { if (x.ok) done++; counter.textContent = `풍선 ${done} / ${total}`; },
          onEnd: res => T.after(900, () => end(res)),
        });
      },
    });
    kit.setAuto(() => { if (card.open()) card.press(); else if (run) auto(run.targets(), tg => (tg.kind === 'd' ? fireDown(input.btn) : fireUp())); });
    function end(res) {
      run && run.stop(); input && input.off();
      const ok = res.map(x => x.ok);
      const s = kit.scoreChoices(ok, 8);
      const notes = sc.lane.notes;
      const hAll = notes.filter(n => n.kind === 'h').length, hOk = notes.filter((n, i) => n.kind === 'h' && ok[i]).length;
      const shortH = res.filter((x, i) => x.rel === 'short' && notes[i].kind === 'h').length;
      const longQ = res.filter((x, i) => x.rel === 'long' && notes[i].kind === 'q').length;
      const longH = res.filter((x, i) => x.rel === 'long' && notes[i].kind === 'h').length;
      const miss = res.filter(x => x.press === 'miss').length;
      let tip;
      if (s.kept === s.total) tip = '4분음표는 한 박, 2분음표는 두 박 — 길이를 모두 맞게 눌렀어요.';
      else if (shortH >= Math.max(longQ, longH, miss)) tip = `2분음표를 일찍 뗀 적이 ${shortH}번 있었어요. 박 점 두 개가 다 지날 때까지 눌러요.`;
      else if (longQ >= Math.max(longH, miss)) tip = `4분음표를 길게 누른 적이 ${longQ}번 있었어요. 따는 한 박만 — 짧게 눌렀다 떼요.`;
      else if (longH >= miss) tip = `2분음표를 두 박보다 오래 누른 적이 ${longH}번 있었어요. 막대가 끝나면 떼요.`;
      else tip = `누르는 때를 놓친 음이 ${miss}개 있었어요. 막대가 선에 닿을 때 눌러요.`;
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 알맞게 눌렀어요`, replay: ok,
        facts: [`가장 길게 이어서 ${s.streak}번`, `2분음표 ${hAll}개 중 ${hOk}개를 두 박 동안`],
        starOn: s.starOn, rules: s.rules, tip,
      });
    }
    return () => { T.clear(); run && run.stop(); input && input.off(); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임을 확인)
export { PLAN };
