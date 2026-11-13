// 리2 4분음표·4분쉼표 — 따 = 박 하나에 소리 하나 · 쉼 = 박은 흐르는데 소리는 쉰다(손바닥 펴기)
//  보기: 예시 넷(악기 넷 · 쉼 자리가 다름) — 준비 박 넷 뒤 네 박을 소리와 그림으로
//  연습: 고슴도치가 네 박을 치면 다음 네 박에 그대로 — 세 번 이어서 맞히면 지남
//  확인 게임: 따라 치기 8판(소개 → 발전 → 비틀기: 듣고만 → 마무리) · 음악은 끝까지 흐른다
//  판정: 따 박 = engine/judge.js 판정 창 안에 두드림 · 쉼 박 = 박에서 0.35박 안에 두드림이 없음(_beat.js judgeEcho)
//  11-07 평가 2차: 준비 박 숫자 · 맞음/틀림 말은 말풍선(ui.tell) · 판 번호는 ui.count · 연습 점은 ui.practice
//   '지금' 카드 = 잉크 고리 + 작은 세모 · 지난 박 = 진한 점 · 남은 박 = 빈 동그라미
//  1~2학년(band low)은 머리 없는 막대 음표로 그린다.
//  11-07 평가 3차: 준비 박 숫자는 판 가운데 큰 숫자(세는 동안만 · 오른쪽 위 상자 X) · 반주는 네 박씩 0.3초 앞에만 예약(동시 소리 166 → 75) · ‘따’ ‘쉼’ 둥근 따옴표
import { bpmOf, judgeEcho, classifyTap, newBus, killBus, heardNow, perfOf, autoScheduler, pressInput, fireDown, startCard, noteSVG, palmSVG, exampleGroup, countTeller, barPump, accompSound, endChord } from './_beat.js';
import { windows, tapStats } from '../../../engine/judge.js';

const ORD = ['첫째', '둘째', '셋째', '넷째'];
const EXAMPLES = [
  { pat: ['ta', 'ta', 'ta', 'ta'], name: '북', play: (e, t, b) => e.drum('deong', t, 0.85, b) },
  { pat: ['ta', 'ta', 'ta', 'rest'], name: '실로폰', play: (e, t, b) => e.note('xylo', 79, t, 0.3, 0.8, b) },
  { pat: ['ta', 'rest', 'ta', 'rest'], name: '피아노', play: (e, t, b) => e.note('piano', 72, t, 0.4, 0.75, b) },
  { pat: ['rest', 'ta', 'ta', 'ta'], name: '작은북', play: (e, t, b) => e.drum('snare', t, 0.8, b) },
];
const FOLLOW = [['ta', 'ta', 'ta', 'rest'], ['ta', 'rest', 'ta', 'rest'], ['ta', 'ta', 'rest', 'ta'], ['ta', 'rest', 'rest', 'ta'], ['rest', 'ta', 'ta', 'ta'], ['ta', 'rest', 'ta', 'ta']];
// 확인 게임 8판 — 소개(1·2) → 발전(3~5) → 비틀기: 그림 없이 듣고만(6·7) → 마무리(8)
const PLAN = [
  { pat: ['ta', 'ta', 'ta', 'rest'] },
  { pat: ['ta', 'rest', 'ta', 'rest'] },
  { pat: ['ta', 'ta', 'rest', 'ta'] },
  { pat: ['ta', 'rest', 'rest', 'ta'] },
  { pat: ['rest', 'ta', 'ta', 'ta'] },
  { pat: ['ta', 'rest', 'ta', 'ta'], hidden: true },
  { pat: ['rest', 'ta', 'rest', 'ta'], hidden: true },
  { pat: ['ta', 'ta', 'ta', 'rest'] },
];
const COUNT = 4;
let RUN = 0;                                           // 판 틀마다 번호(자동 시험 목표 id가 겹치지 않게)
const callSound = (engine, t, bus) => engine.drum('deong', t, 0.85, bus);
const pulse = (engine, t, bus, v = 0.3) => engine.drum('hat', t, v, bus);
const tapSound = engine => engine.drum('deok', engine.ensure().currentTime, 0.7);
const SAY_GAME = '고슴도치가 치면, 다음 네 박에 그대로 쳐요';
// 고슴도치가 북을 칠 때 살짝 눌림(강제 레이아웃 X — el.animate · 평가 3차 성능)
const bump = el => { if (el.animate) el.animate([{ transform: 'none' }, { transform: 'translateY(5px) scaleY(.93)', offset: 0.35 }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }); };

// 박 카드 한 줄(네 칸) — 기호 · 음절 · 박 점(지난 박 = 진한 점 · 남은 박 = 빈 동그라미)
function beatRow(kit, { label, cls }) {
  const { h } = kit;
  const stick = kit.band === 'low';
  const cards = [0, 1, 2, 3].map(() => h('div', { class: 'r2-beat' }, h('div', { class: 'sym' }), h('b', { class: 'syl' }), h('i', { class: 'dot' }), h('span', { class: 'pm', html: palmSVG(34) })));
  const row = h('div', { class: 'r2-row ' + (cls || '') }, label, h('div', { class: 'r2-cards' }, ...cards));
  const draw = (c, k) => { c.querySelector('.sym').innerHTML = k === 'ta' ? noteSVG('q', { stick, size: 86 }) : noteSVG('qr', { size: 86 }); c.querySelector('.syl').textContent = k === 'ta' ? '따' : '쉼'; };
  const set = (pat, { hidden = false } = {}) => cards.forEach((c, i) => {
    c.className = 'r2-beat' + (hidden ? ' hid' : '') + (pat && pat[i] === 'rest' ? ' rest' : '');
    if (!pat) { c.querySelector('.sym').innerHTML = ''; c.querySelector('.syl').textContent = ''; }
    else if (hidden) { c.querySelector('.sym').innerHTML = '<span class="q">?</span>'; c.querySelector('.syl').textContent = ''; }
    else draw(c, pat[i]);
  });
  const now = k => cards.forEach((c, i) => c.classList.toggle('now', i === k));
  const past = k => { if (cards[k]) cards[k].classList.add('past'); };
  const mark = (k, st) => { const c = cards[k]; c.classList.remove('g', 'k', 'm', 'rk', 'rh'); if (st) c.classList.add(st); };
  const reveal = (k, pat) => { const c = cards[k]; if (!c.classList.contains('hid')) return; c.classList.remove('hid'); draw(c, pat[k]); };
  const lit = (k, on) => { cards[k].classList.toggle('lit', on); if (on) past(k); };
  return { row, cards, set, now, past, mark, reveal, lit };
}
// 판정 → 카드 표시(딱 = 금 · 좋아 = 초록 · 놓침 = 점선 · 쉼 지킴 = 초록 · 쉼에 침 = 회갈)
const SHOW = { great: 'g', ok: 'k', miss: 'm', rest: 'rk', resthit: 'rh' };

// 따라 치기 한 판(또는 여러 판)을 도는 틀 — 연습과 확인 게임이 같이 쓴다
//  rounds = [{ pat, hidden }] · 판마다 8박(고슴도치 4 + 나 4) · 준비 박 넷 뒤 쉼 없이 이어짐
function echoRun(kit, ui, view, { rounds, bpm, onRound, onEnd }) {
  const { engine } = kit;
  const ac = engine.ensure();
  const bus = newBus(engine), T = kit.timers();
  const beat = 60 / bpm, beatMs = beat * 1000, band = kit.band, lat = kit.device.latencyMs;
  const w = windows(band, beatMs);
  const t0 = ac.currentTime + 0.45;
  const tOf = i => t0 + i * beat;                     // i = 준비 박부터 센 박 번호
  const callAt = r => COUNT + r * 8, respAt = r => COUNT + r * 8 + 4;
  const total = COUNT + rounds.length * 8;
  const counter = countTeller(view.board);
  // 소리 예약 — 네 박(한 마디)씩, 시작 0.3초 앞에만(오디오 시계라 화면이 버벅여도 박이 안 흔들림 · 한꺼번에 걸면 소리 노드가 쌓임)
  //  마디 0 = 준비 박 · 1, 3, 5 … = 고슴도치 차례 · 2, 4, 6 … = 내 차례 · 마지막 = 끝 화음(여러 판일 때)
  const nBars = 1 + rounds.length * 2;
  const pump = barPump(ac, T, nBars + (rounds.length > 1 ? 1 : 0), i => tOf(i * 4), i => {
    if (i === 0) { for (let k = 0; k < COUNT; k++) engine.click(tOf(k), k === 0, bus); return; }
    if (i === nBars) { engine.drum('deong', tOf(total), 0.8, bus); endChord(engine, bus, tOf(total), beat); return; }
    const rd = rounds[(i - 1) >> 1], call = (i - 1) % 2 === 0;
    // 반주(주제곡 화음 · 낮은 소리 · 박마다 작은 햇)는 고슴도치 차례 · 내 차례 내내 이어짐 — 쉼에도 박은 흐른다(docs/sound.md §4) · 답 리듬은 고슴도치 북만
    accompSound(engine, bus, tOf(i * 4), beat, i - 1, { sal: 'pulse' });
    for (let k = 0; k < 4; k++) if (call && rd.pat[k] === 'ta') callSound(engine, tOf(i * 4 + k), bus);
  });
  const st = rounds.map(() => ({ taps: [], marks: [null, null, null, null], done: false }));
  const runId = ++RUN;
  let cur = -1, meR = -1, lastBeat = -99, gone = false, raf = 0;
  const respMs = r => [0, 1, 2, 3].map(i => perfOf(ac, tOf(respAt(r) + i)));
  // 내 줄 표시 — 지금 그 판이 내 줄에 그려져 있을 때만(앞 판 결과는 다음 판 고슴도치 차례 동안 남겨 둔다)
  const showMark = (q, i, got) => {
    if (q === cur) view.call.reveal(i, rounds[q].pat);          // 듣고만 한 판은 내가 친 박부터 그림을 보여 줌
    if (q !== meR) return;
    view.me.reveal(i, rounds[q].pat); view.me.mark(i, SHOW[got]);
  };

  function tap(e) {
    tapSound(engine);
    if (gone) return;
    const ms = e && e.timeStamp ? e.timeStamp : performance.now();
    // 지금 받는 판(받는 박 자리 ± 반 박)
    for (let r = 0; r < rounds.length; r++) {
      if (st[r].done) continue;
      const ms0 = respMs(r);
      if (ms - lat < ms0[0] - beatMs / 2 || ms - lat >= ms0[3] + beatMs / 2) continue;
      st[r].taps.push(ms);
      const c = classifyTap(ms - lat, ms0, rounds[r].pat, w, beatMs);
      if (!c) return;
      if (c.kind === 'resthit') { st[r].marks[c.k] = 'resthit'; showMark(r, c.k, 'resthit'); kit.setPose(view.hog, kit.friend, 'oops'); ui.tell('쉼이에요', 'oops', 900); return; }
      if (st[r].marks[c.k]) return;
      st[r].marks[c.k] = c.kind;
      showMark(r, c.k, c.kind);
      kit.setPose(view.hog, kit.friend, 'happy');
      return;
    }
  }
  function loop() {
    if (gone) return;
    const now = heardNow(ac);
    const bi = Math.floor((now - t0) / beat + 0.12);
    // 준비 박 세기 — 말풍선
    counter(bi >= 0 && bi < COUNT ? bi + 1 : 0);
    // 판 바뀜 — 고슴도치 줄은 그 판 시작에, 내 줄은 내 차례가 올 때 새 판으로
    if (bi >= COUNT - 1 && bi < total) {
      const r = bi < COUNT ? 0 : Math.floor((bi - COUNT) / 8), k = bi < COUNT ? -1 : (bi - COUNT) % 8;
      if (r !== cur) {
        cur = r;
        const rd = rounds[r];
        view.call.set(rd.pat, { hidden: rd.hidden });
        if (meR < 0) { meR = 0; view.me.set(rd.pat, { hidden: rd.hidden }); }
        onRound && onRound(r, rd);
      }
      if (k >= 4 && meR !== r) { meR = r; view.me.set(rounds[r].pat, { hidden: rounds[r].hidden }); }
    }
    if (bi !== lastBeat && cur >= 0) {
      lastBeat = bi;
      const k = bi < COUNT ? -1 : (bi - COUNT) % 8;
      const live = bi >= COUNT && bi < total;
      const inCall = live && k < 4, inResp = live && k >= 4;
      view.call.now(inCall ? k : -1);
      view.me.now(inResp ? k - 4 : -1);
      view.call.row.classList.toggle('active', inCall);
      view.me.row.classList.toggle('active', inResp);
      view.me.row.classList.toggle('ghost', !inResp);
      if (inCall) {
        const ta = rounds[cur].pat[k] === 'ta';
        kit.setPose(view.hog, kit.friend, ta ? 'play' : 'idle');
        if (ta) bump(view.hogBox);
        view.call.lit(k, true);
        view.tag('call', rounds[cur].hidden ? '그림 없이 들어요' : '들어요');
      } else if (inResp) { view.me.past(k - 4); kit.setPose(view.hog, kit.friend, 'idle'); view.tag('me', '쳐요!'); }
      else view.tag(bi < COUNT ? 'call' : '', bi < COUNT ? '잘 들어요' : '');
    }
    // 받는 박이 지나면: 따를 안 쳤으면 놓침 · 쉼을 지켰으면 쉼 지킴
    for (let q = 0; q < rounds.length; q++) {
      const s = st[q];
      if (s.done) continue;
      for (let i = 0; i < 4; i++) {
        if (s.marks[i]) continue;
        const pass = now - tOf(respAt(q) + i) - lat / 1000;
        const isRest = rounds[q].pat[i] === 'rest';
        if (pass > (isRest ? beat * 0.36 : w.late / 1000)) {
          s.marks[i] = isRest ? 'rest' : 'miss';
          showMark(q, i, s.marks[i]);
          if (!isRest && q === meR) kit.setPose(view.hog, kit.friend, 'oops');
        }
      }
      if (s.marks.every(Boolean) && now > tOf(respAt(q) + 3) + beat * 0.4 + lat / 1000) {
        s.done = true;
        const j = judgeEcho(rounds[q].pat, respMs(q), s.taps, { band, latency: lat, beatMs });
        onEnd(q, j);
      }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  // 자동 시험: 받는 박 중 '따'에만 맞춰 두드림
  const targets = () => {
    const out = [];
    rounds.forEach((rd, r) => rd.pat.forEach((k, i) => { if (k === 'ta') out.push({ id: runId + ':' + (r * 4 + i), ms: perfOf(ac, tOf(respAt(r) + i)) + lat }); }));
    return out;
  };
  return {
    tap, targets, beat, endAt: tOf(total),
    stop() { gone = true; cancelAnimationFrame(raf); pump.stop(); T.clear(); killBus(engine, bus); counter(0); },
  };
}

// 따라 치기 화면(두 줄: 고슴도치 · 나)
function echoView(kit) {
  const { h } = kit;
  const hog = kit.friendImg(kit.friend, 'idle', { label: false });
  const hogBox = h('div', { class: 'r2-hog' }, hog);
  // 차례 표시는 그 줄 이름표 바로 밑
  const callTag = h('span', { class: 'r2-tag' }), meTag = h('span', { class: 'r2-tag' });
  const call = beatRow(kit, { label: h('div', { class: 'r2-lab' }, hogBox, callTag), cls: 'call' });
  const me = beatRow(kit, { label: h('div', { class: 'r2-lab me' }, h('b', { class: 'r2-me' }, '나'), meTag), cls: 'me' });
  const tag = (who, text) => { callTag.textContent = who === 'call' ? text : ''; meTag.textContent = who === 'me' ? text : ''; };
  return { hog, hogBox, tag, call, me, board: null };       // board = 준비 박 숫자를 띄울 판(화면이 붙인 뒤 채움)
}
// 틀린 까닭 한 줄(연습)
function why(j) {
  const bad = j.beats.findIndex(b => b.got === 'resthit' || b.got === 'miss');
  if (bad < 0) return '';
  return j.beats[bad].got === 'resthit' ? `${ORD[bad]} 박은 ‘쉼’이었어요 — 손바닥을 펴요` : `${ORD[bad]} 박 ‘따’를 놓쳤어요`;
}

// TV '틀린 갈래' 막대 이름(X6 둘째) — 확인 게임 끝(end)의 갈래 차례(bi)와 같게 · 짧게(선생님이 다시 짚을 곳)
export const TIPS_TV = ['쉼 박에 침', '쉼 다음 따를 놓침', '듣기만 한 판', '따를 놓침'];

export default {
  // ── 보기: 따 · 쉼 — 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers();
    const stick = kit.band === 'low';
    ui.say('‘따’는 박 하나에 소리 하나, ‘쉼’은 박만 흐르고 소리는 쉬어요');
    const hog = kit.friendImg(kit.friend, 'idle', { label: false });
    const hogBox = h('div', { class: 'r2-hog big' }, hog);
    const strip = beatRow(kit, { label: h('div', { class: 'r2-lab' }, hogBox), cls: 'show' });
    strip.set(EXAMPLES[1].pat);                                   // 처음 그림부터 '따'와 '쉼'이 같이 보이게
    const counter = countTeller(strip.row);
    let bus = null, raf = 0;
    const stop = () => { cancelAnimationFrame(raf); killBus(engine, bus); bus = null; counter(0); strip.now(-1); [0, 1, 2, 3].forEach(i => strip.lit(i, false)); kit.setPose(hog, kit.friend, 'idle'); };
    const cards = EXAMPLES.map(ex => {
      const mini = h('span', { class: 'r2-mini', html: ex.pat.map(k => noteSVG(k === 'ta' ? 'q' : 'qr', { stick, size: 40 })).join('') });
      const btn = h('button', { type: 'button', class: 'excard r2-ex', 'aria-label': `${ex.name} — ${ex.pat.map(k => (k === 'ta' ? '따' : '쉼')).join(' ')} 들어 보기` },
        h('b', {}, ex.pat.map(k => (k === 'ta' ? '따' : '쉼')).join(' ')), mini, h('span', {}, ex.name));
      onPress(btn, () => {
        stop();
        const ac = engine.ensure();
        bus = newBus(engine);
        const beat = 60 / 100, t0 = ac.currentTime + 0.3;
        strip.set(ex.pat);
        for (let i = 0; i < COUNT; i++) engine.click(t0 + i * beat, i === 0, bus);
        ex.pat.forEach((k, i) => { const t = t0 + (COUNT + i) * beat; pulse(engine, t, bus); if (k === 'ta') ex.play(engine, t, bus); });
        let last = -9;
        const loop = () => {
          const now = heardNow(ac), bi = Math.floor((now - t0) / beat + 0.1);
          counter(bi >= 0 && bi < COUNT ? bi + 1 : 0);
          if (bi !== last) {
            last = bi;
            const k = bi - COUNT;
            strip.now(k >= 0 && k < 4 ? k : -1);
            if (k >= 0 && k < 4) {
              strip.lit(k, true);
              const ta = ex.pat[k] === 'ta';
              kit.setPose(hog, kit.friend, ta ? 'play' : 'idle');
              if (ta) bump(hogBox);
            }
          }
          if (bi > COUNT + 4) { stop(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'r2 r2-show' },
      strip.row,
      h('div', { class: 'r2-legend' },
        h('span', { html: noteSVG('q', { stick, size: 44 }) }), h('span', {}, stick ? '‘따’ = 박 하나에 소리 하나' : '4분음표 = ‘따’(박 하나에 소리 하나)'),   /* 1~2학년 판은 음표 이름 X */
        h('span', { html: noteSVG('qr', { size: 44 }) }), h('span', {}, stick ? '‘쉼’ = 소리 없이 손바닥을 펴요' : '4분쉼표 = ‘쉼’(손바닥을 펴요)')),
      exampleGroup(kit, cards)));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { stop(); T.clear(); };
  },

  // ── 연습: 고슴도치가 치면 그대로 — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h } = kit;
    const T = kit.timers(), r = kit.rng();
    ui.say('고슴도치가 치는 대로, 다음 네 박에 똑같이 쳐요');
    const view = echoView(kit);
    const msg = h('p', { class: 'fmsg' });
    let streak = 0, run = null, n = 0, passed = false;
    const input = pressInput(ui, kit, { onDown: e => run && run.tap(e) });
    ui.setBar(...input.nodes);
    view.board = h('div', { class: 'r2 r2-echo' }, view.call.row, view.me.row, h('div', { class: 'r2-info' }, msg));
    ui.stage.append(view.board);
    const auto = autoScheduler(T);
    function attempt() {
      if (passed) return;
      const pat = n === 0 ? FOLLOW[0] : FOLLOW[1 + Math.floor(r() * (FOLLOW.length - 1))];
      n++;
      msg.textContent = '';
      run && run.stop();
      run = echoRun(kit, ui, view, {
        rounds: [{ pat }], bpm: bpmOf('echo', kit.band),
        onEnd: (q, j) => {
          if (j.ok) {
            kit.sfx.good(kit.engine); streak++; ui.practice(streak);
            kit.setPose(view.hog, kit.friend, 'happy');
            ui.tell('맞아요', 'good');
            msg.textContent = '‘따’와 ‘쉼’을 그대로 쳤어요';
            if (streak >= 3) { passed = true; run.stop(); input.off(); kit.pass('세 번 이어서 그대로 쳤어요'); return; }
          } else {
            streak = 0; ui.practice(0);
            kit.setPose(view.hog, kit.friend, 'oops');
            ui.tell('다시 들어 봐요', 'oops', 1500);
            msg.textContent = why(j);
          }
          T.after(1500, attempt);
        },
      });
    }
    T.after(500, attempt);
    kit.setAuto(() => { if (run) auto(run.targets(), () => fireDown(input.btn)); });
    return () => { T.clear(); run && run.stop(); input.off(); };
  },

  // ── 확인 게임: 따라 치기 8판 ──
  game(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers();
    ui.say(SAY_GAME);
    const view = echoView(kit);
    const scene = h('div', { class: 'r2 r2-echo r2-game' }, view.call.row, view.me.row);
    view.board = scene;
    ui.stage.append(scene);
    view.call.set(PLAN[0].pat); view.me.set(PLAN[0].pat);
    let run = null, input = null;
    const results = [], judged = [];
    const auto = autoScheduler(T);
    const sc = startCard(ui, kit, {
      title: '따라 치기',
      sub: ['고슴도치가 네 박을 치면, 다음 네 박에 그대로 쳐요', `‘쉼’ 박에는 치지 않아요·${PLAN.length}번`],
      onStart: () => {
        input = pressInput(ui, kit, { onDown: e => run && run.tap(e) });
        ui.setBar(...input.nodes);
        ui.count(1, PLAN.length);
        run = echoRun(kit, ui, view, {
          rounds: PLAN, bpm: bpmOf('echo', kit.band),
          onRound: (r, rd) => { ui.count(r + 1, PLAN.length); ui.say(rd.hidden ? '그림 없이 듣고, 그대로 쳐요' : SAY_GAME); },
          onEnd: (q, j) => {
            results[q] = j.ok; judged[q] = j;
            if (j.ok) { kit.sfx.good(engine); ui.tell('맞아요', 'good'); }
            else ui.tell(j.restHits ? '쉼에 쳤어요' : '놓친 박이 있어요', 'oops', 1300);
            if (q === PLAN.length - 1) T.after(900, end);
          },
        });
      },
    });
    kit.setAuto(() => { if (sc.open()) sc.press(); else if (run) auto(run.targets(), () => fireDown(input.btn)); });
    function end() {
      run && run.stop(); input && input.off();
      const res = PLAN.map((_, i) => !!results[i]);
      const s = kit.scoreChoices(res, 4);
      let restKept = 0, restAll = 0, restHits = 0, misses = 0, afterRest = 0;
      PLAN.forEach((p, i) => {
        const j = judged[i]; if (!j) return;
        j.beats.forEach((b, k) => {
          if (b.kind === 'rest') { restAll++; if (b.got === 'rest') restKept++; else restHits++; }
          else if (b.got === 'miss') { misses++; if (k > 0 && p.pat[k - 1] === 'rest') afterRest++; }
        });
      });
      const hiddenWrong = PLAN.filter((p, i) => p.hidden && !res[i]).length;
      let tip, bi = -1;                              // bi = 고른 갈래의 차례(TIPS_TV · TV '틀린 갈래' 막대 · X6 둘째)
      if (s.kept === s.total) tip = '‘쉼’으로 시작하는 리듬과 그림 없이 듣기만 한 판까지 모두 그대로 쳤어요.';
      else if (restHits >= misses) { bi = 0; tip = `‘쉼’ 박에 친 적이 ${restHits}번 있었어요. ‘쉼’ 박에는 손바닥을 펴요.`; }
      else if (afterRest * 2 >= misses) { bi = 1; tip = `‘쉼’ 바로 다음 ‘따’를 ${afterRest}번 놓쳤어요. 쉬는 동안에도 박은 계속 흘러요.`; }
      else if (hiddenWrong) { bi = 2; tip = `그림 없이 듣기만 한 판(6·7번째)에서 ${hiddenWrong}번 헷갈렸어요.`; }
      else { bi = 3; tip = `‘따’를 놓친 박이 ${misses}개 있었어요. 고슴도치 소리를 잘 듣고 그대로 쳐요.`; }
      // 두드림 어긋남(X4 · 기기 기록만) — '따' 박에 붙은 두드림 · 놓침 = 안 친 '따'(쉼에 친 것은 따로 · tip)
      const offs = judged.flatMap(j => (j ? j.beats.filter(b => b.got === 'great' || b.got === 'ok').map(b => b.off) : []));
      const t = tapStats(offs, misses, { lat: kit.device.latencyMs, band: kit.band, bpm: bpmOf('echo', kit.band) });
      ui.stage.replaceChildren(); ui.count(null);                // 결과 뒤에는 칸 그림 · 번호를 남기지 않음(친구 그림은 칸 화면이 붙임)
      kit.finish({
        title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: res,
        facts: [`이어서 맞힌 최고 기록 ${s.streak}번`, `‘쉼’ 박 ${restAll}개 중 ${restKept}개를 지켰어요`],
        starOn: s.starOn, rules: s.rules, tip, t, b: bi,
      });
    }
    return () => { T.clear(); run && run.stop(); input && input.off(); };
  },
};

// 시험용(tests/beatcells.test.mjs가 판 짜임을 확인)
export { PLAN };
