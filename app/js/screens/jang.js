// 장단 판(#/jang · 11-14 묶음 D4) — 장단 한 바퀴 = 소박 칸 줄. 칸마다 구음(덩 · 쿵 · 덕 · 기덕 · 더러러러)을 놓거나 빼고 장구 소리로 듣는다.
//  왼쪽 무대: 위 '보기' 장단보(읽기만) · 아래 '내 장단' 장단보(칸을 눌러 놓기) · 맨 아래 사실 한 줄
//  오른쪽: 부탁 카드(점 = 단추 · 잠금 X) + 장단 고르기(자진모리 · 세마치 · 굿거리 · 중중모리 / 내 장단은 세 박 · 네 박 빈 틀)
//  아래 선반: 구음 여섯(덩 · 쿵 · 덕 · 기덕 · 더러러러 · 쉼) · 손뼉 · 듣기(주황은 이것 하나)
//  놓는 법은 악보 판과 같다 — 구음을 고르고 칸을 누르면 들어가고, 같은 구음으로 한 번 더 누르면 빠진다(쉼을 고르면 빼기).
//  '듣기'는 내 장단을 멈출 때까지 되풀이한다. 도는 동안 칸을 바꾸면 다음 바퀴에 들린다. 손뼉(스페이스)은 누르면 바로 소리 — 때 판정 없음.
//  부탁 카드 셋: ① 보기 장단을 그대로 놓아 듣기 ② 한 칸을 바꿔 듣기 — '번갈아 듣기'(보기 한 바퀴 → 내 것 한 바퀴) · 바뀐 칸을 두 장단보에 표시하고 사실로 적음 ③ 내 장단 짓기(정답 없음)
//  부탁을 끝낸 뒤 장단을 바꾸거나 '처음대로'를 누르면 그 부탁을 다시 할 수 있다(진행 점은 그대로)
//  저장은 이 기기에만(jang = { done, pick, frame, free } · 2초 간격 상한) · 규칙 · 소리 계산은 engine/jang.js(node 시험)
//  자동 시험: window.__jangAuto() = 지금 부탁을 푸는 맞는 행동 하나 · window.__jangState()
import { h, onPress, lsGet, lsSet } from '../util.js';
import { preload } from '../band.js';
import * as J from '../../../engine/jang.js';

const PAL = [...J.HITS, 'rest'];                 // 고르는 구음 — 마지막은 쉼(빼기)
const SAVE_GAP = 2000;                           // 기기 저장 간격 상한(ms)

export default function mount(root, ctx) {
  const { engine, bar } = ctx;
  preload([['hog', 'idle']]);
  const css = h('link', { rel: 'stylesheet', href: 'app/css/jang.css' });
  document.head.append(css);

  // ── 저장(기기에만) ──
  const saved = lsGet('jang', null) || {};
  const done = new Set((Array.isArray(saved.done) ? saved.done : []).filter(k => Number.isInteger(k) && k >= 0 && k < J.CARDS.length));
  const free = { ...(saved.free && typeof saved.free === 'object' ? saved.free : {}) };
  let pick = J.JANG[saved.pick] ? saved.pick : J.ORDER[0];
  let frame = J.FRAMES[saved.frame] ? saved.frame : 'b4';
  let saveAt = 0, saveTimer = 0;
  const writeNow = () => { clearTimeout(saveTimer); saveTimer = 0; saveAt = Date.now(); lsSet('jang', { done: [...done].sort((a, b) => a - b), pick, frame, free }); };
  const save = () => {                           // 마지막 저장에서 2초가 안 지났으면 남은 만큼 미룸(한 번만)
    if (saveTimer) return;
    const wait = SAVE_GAP - (Date.now() - saveAt);
    if (wait <= 0) writeNow(); else saveTimer = setTimeout(writeNow, wait);
  };

  // 주소: #/jang/free(부탁) · #/jang/gg(보기 장단)
  const args = (ctx.args || []).filter(Boolean);
  const argCard = J.CARDS.findIndex(c => args.includes(c.key));
  const argJang = args.find(a => J.JANG[a]);
  if (argJang) pick = argJang;
  const firstOpen = () => { for (let k = 0; k < J.CARDS.length; k++) if (!done.has(k)) return k; return J.CARDS.length; };
  let cardNo = argCard >= 0 ? argCard : firstOpen();
  let card = null;                               // { key, def, done, doneMsg }
  let brush = 'deong';
  let mine = [], ref = [];
  let loop = null, raf = 0, lineMsg = '', lineUntil = 0, lineTimer = 0;

  const noFocus = el => { el.addEventListener('mousedown', e => e.preventDefault()); return el; };   // 눌러도 스페이스 = 손뼉이 그대로
  const press = (el, fn) => noFocus(onPress(el, fn));

  // ── 그릇 ──
  const refBox = h('section', { class: 'jg-board ref', 'aria-label': '보기 장단보' });
  const mineBox = h('section', { class: 'jg-board mine', 'aria-label': '내 장단보' });
  const lineEl = h('p', { class: 'jg-line', role: 'status', 'aria-live': 'polite' });
  const stage = h('div', { class: 'jg-stage' }, refBox, mineBox, lineEl);
  const cardEl = h('section', { class: 'jg-card' });
  const pickEl = h('section', { class: 'jg-pick' });
  const palEl = h('div', { class: 'jg-pal', role: 'group', 'aria-label': '구음 고르기' });
  const clapBtn = press(h('button', { type: 'button', class: 'jg-clap' }, h('b', {}, '손뼉'), h('span', {}, '스페이스')), () => clap());
  const playBtn = press(h('button', { type: 'button', class: 'go big jg-play' }, '듣기'), () => togglePlay());
  const shelf = h('div', { class: 'jg-shelf' }, palEl, clapBtn, playBtn);
  const wrap = h('div', { class: 'jang-board' }, stage, h('aside', { class: 'jg-side' }, cardEl, pickEl), shelf);
  root.append(wrap);
  const resetBtn = press(h('button', { type: 'button' }, '처음대로'), () => resetBoard(true));
  bar.right(h('div', { class: 'bar-btns' }, resetBtn));

  // 구음 단추 여섯 — 고른 것은 잉크로 채움
  const palBtns = PAL.map(k => {
    const b = press(h('button', { type: 'button', 'data-k': k, 'aria-label': k === 'rest' ? '쉼 — 칸 비우기' : `${J.SYL[k]} — ${J.HAND[k]}` },
      h('b', {}, k === 'rest' ? '쉼' : J.SYL[k]), h('span', {}, k === 'rest' ? '칸 비우기' : J.HAND[k])), () => setBrush(k, true));
    palEl.append(b); return b;
  });
  function setBrush(k, sound = false) {        // sound: 사람이 고를 때만 그 구음을 한 번 들려줌(처음 그릴 때 · 자동 시험은 조용히)
    brush = k;
    palBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    if (sound && k !== 'rest' && !loop) hit(k);
  }

  // ── 지금 장단(보기) · 틀 ──
  const isFree = () => card && card.key === 'free';
  const defNow = () => (isFree() ? J.FRAMES[frame] : J.JANG[pick]);

  // ── 장단보 그리기 ──
  //  칸 = 소박 하나 · 박 첫 칸 앞은 굵은 실선 · 소박 사이는 점선 · 센 칸 위에 '>' · 칸 아래 번호 · 쉼은 빈칸('·'를 쓰지 않음)
  function sylKids(x) {
    if (!x) return [];
    if (x === 'durr') return [h('span', {}, '더러'), h('span', {}, '러러')];   // 칸이 좁아 두 줄로(사실 장부 — '더러 · 러러'로 나눠 적은 자료도 있음)
    return [J.SYL[x]];
  }
  function boardHTML(box, kind) {
    const d = defNow(), n = J.lenOf(d), pat = kind === 'ref' ? ref : mine;
    box.style.setProperty('--n', n);
    const chg = card && card.key === 'one' ? new Set(J.diffCells(mine, ref)) : new Set();
    const cell = (x, i) => {
      const cls = 'jg-cell' + (i % d.sub === 0 ? ' head' : '') + (x ? ' on' : '') + (x === 'kideok' || x === 'durr' ? ' long' : '') + (x === 'durr' ? ' durr' : '') + (chg.has(i) ? ' chg' : '');
      const label = `${i + 1}번째 칸 — ${J.sylOf(x)}`;
      if (kind === 'ref') return h('div', { class: cls, 'data-i': i, role: 'img', 'aria-label': label }, ...sylKids(x));
      return press(h('button', { type: 'button', class: cls, 'data-i': i, 'aria-label': label }, ...sylKids(x)), () => tapCell(i));
    };
    const head = kind === 'ref'
      ? h('div', { class: 'jg-head' }, h('b', {}, '보기'), h('span', { class: 'jg-name' }, d.name), h('span', { class: 'jg-info' }, d.info), refPlayBtn)
      : h('div', { class: 'jg-head' }, h('b', {}, '내 장단'), h('span', { class: 'jg-info' }, isFree() ? `${d.name} · ${d.info} · 빈 칸에 마음대로` : `보기와 같은 ${J.lenOf(d)}칸`));
    box.replaceChildren(head,
      h('div', { class: 'jg-acc', 'aria-hidden': 'true' }, ...pat.map((_, i) => h('span', {}, d.acc.includes(i) ? '>' : ''))),
      h('div', { class: 'jg-cells' }, ...pat.map(cell)),
      h('div', { class: 'jg-nums', 'aria-hidden': 'true' }, ...pat.map((_, i) => h('span', {}, String(i + 1)))));
  }
  const refPlayBtn = press(h('button', { type: 'button', class: 'jg-refplay' }, '보기 듣기'), () => toggleRef());
  const refWord = () => (card && card.key === 'one' ? '번갈아 듣기' : '보기 듣기');   // 한 칸 바꾸기 = 보기 한 바퀴 → 내 것 한 바퀴

  function renderBoards() {
    refBox.hidden = isFree();
    if (!refBox.hidden) boardHTML(refBox, 'ref');
    boardHTML(mineBox, 'mine');
    stage.classList.toggle('solo', refBox.hidden);
    if (loop) loop.now = -1;                      // 칸을 새로 그렸으니 도는 칸 표시를 다시
    renderLine();
  }
  function renderLine() {
    if (performance.now() < lineUntil && lineMsg) { lineEl.textContent = lineMsg; return; }
    const d = defNow();
    if (card && card.key === 'one') {
      const D = J.diffCells(mine, ref);
      if (D.length) { lineEl.textContent = D.slice(0, 2).map(i => J.changeLine(d, ref, mine, i)).join(' · ') + (D.length > 2 ? ` 외 ${D.length - 2}칸` : ''); return; }
    }
    if (loop && loop.which === 'mine') { lineEl.textContent = "들으며 박마다 손뼉을 쳐 봐요 — 스페이스 또는 '손뼉'"; return; }
    if (isFree()) { const k = J.countHits(mine); lineEl.textContent = `소리 ${k}개 · 쉼 ${mine.length - k}칸`; return; }
    lineEl.textContent = '구음을 고르고 칸을 눌러요 — 같은 구음으로 한 번 더 누르면 빠져요';
  }
  function say(text, ms = 3200) {
    lineMsg = text; lineUntil = performance.now() + ms; renderLine();
    clearTimeout(lineTimer); lineTimer = setTimeout(renderLine, ms + 30);
  }

  // ── 부탁 카드 ──
  function judge() { return card ? J.judge(card.key, mine, ref) : { st: 'idle' }; }
  function startCard() {
    stopLoop();
    if (cardNo >= J.CARDS.length) { card = null; resetBoard(false); return; }
    const c = J.CARDS[cardNo];
    card = { key: c.key, def: c, done: false, doneMsg: '' };
    resetBoard(false);
  }
  function resetBoard(announce) {
    stopLoop();
    if (card && card.done) { card.done = false; card.doneMsg = ''; }   // 끝낸 부탁도 다시(진행 점은 그대로)
    const d = defNow();
    ref = isFree() ? J.emptyPat(d) : d.pat.slice();
    if (!card) mine = ref.slice();                // 부탁을 다 한 뒤 — 보기에서 시작해 마음대로
    else if (card.key === 'copy') mine = J.emptyPat(d);
    else if (card.key === 'one') mine = ref.slice();
    else mine = (announce ? null : J.decode(free[frame], J.lenOf(d))) || J.emptyPat(d);
    if (announce && isFree()) { free[frame] = J.encode(mine); save(); }
    renderAll();
    if (announce) say(!card || card.key === 'one' ? '보기와 같은 장단으로 돌아왔어요' : '칸을 모두 비웠어요');
  }
  function finishCard(pat) {
    if (!card || card.done) return;
    card.done = true;
    const d = defNow();
    if (card.key === 'copy') card.doneMsg = `보기와 똑같은 ${d.name} 장단을 들었어요. 계속 들으며 박마다 손뼉을 쳐 봐요`;
    else if (card.key === 'one') { const i = J.diffCells(pat, ref)[0]; card.doneMsg = `${J.changeLine(d, ref, pat, i)}. '번갈아 듣기'로 보기와 견주어 들어 봐요`; }
    else { free[frame] = J.encode(pat); card.doneMsg = `내 장단(소리 ${J.countHits(pat)}개 · ${d.info})을 이 기기에 저장했어요. 다른 칸도 바꿔 들어 봐요`; }
    done.add(cardNo); save();
    sfxGood();
    renderCard();
  }
  function nextCard() { cardNo = Math.min(J.CARDS.length, cardNo + 1); startCard(); }
  function openCard(k) { if (k === cardNo && card) return; cardNo = k; startCard(); }
  function renderCard() {
    const dots = h('div', { class: 'jg-dots', role: 'group', 'aria-label': '부탁 고르기' }, ...J.CARDS.map((c, k) => {
      const on = done.has(k), now = k === cardNo && card && !card.done;
      return press(h('button', { type: 'button', class: [on ? 'on' : '', now ? 'now' : ''].join(' ').trim(), 'data-k': k, 'aria-label': `부탁 ${k + 1}`, 'aria-current': k === cardNo && card ? 'step' : null }, h('i', {})), () => openCard(k));
    }), h('span', { class: 'jg-kind' }, card ? `부탁 ${cardNo + 1}` : ''));
    if (!card) {
      const again = press(h('button', { type: 'button' }, '처음 부탁부터'), () => { cardNo = 0; startCard(); });
      cardEl.replaceChildren(dots, h('p', { class: 'jg-text' }, done.size >= J.CARDS.length ? `부탁 ${J.CARDS.length}개를 다 했어요` : `부탁 ${J.CARDS.length}개 중 ${done.size}개를 했어요`),
        h('p', { class: 'jg-hint' }, done.size >= J.CARDS.length ? '이제 마음대로 놓아 들어 봐요. 오른쪽 아래에서 장단을 바꿀 수 있어요.' : '빈 점을 누르면 남은 부탁을 할 수 있어요.'), h('div', { class: 'jg-act' }, again));
      return;
    }
    const r = judge();
    let hint, k = r.st;
    if (card.done) { hint = card.doneMsg; k = 'done'; }
    else if (r.st === 'ready') hint = loop && loop.which === 'mine' ? '됐어요 — 다음 바퀴에 들려요' : card.key === 'one' ? "됐어요 — 이제 '번갈아 듣기'나 '듣기'로 들어 봐요" : "됐어요 — 이제 '듣기'로 들어 봐요";
    else hint = r.msg;
    const kids = [dots, h('p', { class: 'jg-text' }, card.def.text(defNow())), h('p', { class: 'jg-hint', 'data-k': k }, hint)];
    if (card.done) kids.push(h('div', { class: 'jg-act' }, press(h('button', { type: 'button' }, cardNo + 1 < J.CARDS.length ? '다음 부탁' : '부탁 끝'), () => nextCard())));
    cardEl.replaceChildren(...kids);
  }
  // 장단 고르기 — 부탁 ① ② = 보기 장단 넷 · 부탁 ③ = 빈 틀 둘(장단 이름 없이 박 수만)
  function renderPick() {
    const items = isFree() ? Object.values(J.FRAMES) : J.ORDER.map(k => J.JANG[k]);
    const cur = isFree() ? frame : pick;
    pickEl.replaceChildren(h('h3', {}, isFree() ? '빈 틀' : '보기 장단'), h('div', { class: 'jg-pickgrid' + (items.length === 2 ? ' two' : '') }, ...items.map(d =>
      press(h('button', { type: 'button', 'data-k': d.key, 'aria-pressed': String(d.key === cur) }, h('b', {}, d.name), h('span', {}, d.tag)), () => choose(d.key)))));
  }
  function choose(k) {
    if (isFree()) { if (k === frame) return; frame = k; }
    else { if (k === pick) return; pick = k; }
    save();
    resetBoard(false);
    say(isFree() ? `${J.FRAMES[k].name} · ${J.FRAMES[k].info} 빈 틀이에요` : `보기 장단 — ${J.JANG[k].name} · ${J.JANG[k].info}`);
  }
  function renderAll() { renderBoards(); renderCard(); renderPick(); renderPlay(); }

  // ── 놓기 ──
  function tapCell(i) {
    const before = mine[i], next = J.place(mine, i, brush === 'rest' ? null : brush);
    if (next === mine) { say(`${i + 1}번째 칸은 이미 비어 있어요`); return; }
    mine = next;
    if (isFree()) { free[frame] = J.encode(mine); save(); }
    if (mine[i] && !loop) hit(mine[i]);
    say(`${J.cellPlace(defNow(), i)}: ${J.sylOf(before)} → ${J.sylOf(mine[i])}`);
    renderBoards(); renderCard();
    const c = mineBox.querySelector(`.jg-cell[data-i="${i}"]`);
    if (c && c.animate) c.animate([{ transform: 'scale(.9)' }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
  }

  // ── 소리 ──
  function hit(x) {                              // 구음 하나 바로(놓을 때 · 고를 때)
    const ac = engine.ensure(), t = ac.currentTime + 0.03, s = J.subSec(defNow().bpm);
    for (const e of J.cycleEvents([x], { bpm: defNow().bpm })) engine.drum(e.drum, t + Math.max(0, e.t + (x === 'kideok' ? J.GI : 0)), e.vel, null, s);
  }
  function clap() {
    const ac = engine.ensure();
    engine.drum('clap', ac.currentTime + 0.005, 0.85);
    clapBtn.classList.remove('hit'); void clapBtn.offsetWidth; clapBtn.classList.add('hit');
  }
  const newBus = () => { engine.ensure(); return engine.bus(); };
  function killBus(b) {
    if (!b || !engine.ctx) return;
    const now = engine.ctx.currentTime;
    try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.05); } catch { /* */ }
    setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, 300);
  }
  // 바퀴마다 예약 — 바퀴가 시작하기 0.3초 전에 그때의 칸 줄을 찍어 예약(돌다가 바꾼 칸은 다음 바퀴에 들림)
  //  which: mine(멈출 때까지 되풀이) · ref(보기 두 바퀴) · alt(보기 한 바퀴 → 내 것 한 바퀴 — 한 칸 바꾸기)
  function startLoop(which) {
    stopLoop();
    const ac = engine.ensure();
    loop = { which, d: defNow(), bus: newBus(), cycles: [], next: ac.currentTime + 0.15, left: which === 'mine' ? Infinity : 2, k: 0, timer: 0, row: null, now: -1 };
    loop.timer = setInterval(tick, 25);
    tick();
    raf = requestAnimationFrame(frameNow);
    renderPlay(); renderLine(); renderCard();
  }
  function tick() {
    if (!loop) return;
    const now = engine.ctx.currentTime, L = loop;
    while (L.left > 0 && L.next < now + 0.3) {
      const src = L.which === 'alt' ? (L.k % 2 ? 'mine' : 'ref') : L.which;
      const pat = src === 'ref' ? ref.slice() : mine.slice(), len = J.cycleSec(L.d);
      for (const e of J.cycleEvents(pat, L.d)) engine.drum(e.drum, L.next + e.t, e.vel, L.bus, e.span);
      L.cycles.push({ start: L.next, end: L.next + len, pat, src });
      L.next += len; L.left--; L.k++;
    }
    while (L.cycles.length && L.cycles[0].end <= now) {
      const c = L.cycles.shift();
      if (c.src === 'mine' && card && !card.done && J.judge(card.key, c.pat, ref).st === 'ready') finishCard(c.pat);
      if (loop !== L) return;
    }
    if (!L.cycles.length && L.left <= 0) stopLoop();
  }
  function frameNow() {
    if (!loop) return;
    const now = engine.ctx.currentTime, c = loop.cycles.find(x => x.start <= now && now < x.end);
    const i = c ? Math.floor((now - c.start) / J.subSec(loop.d.bpm)) : -1, row = c ? (c.src === 'ref' ? refBox : mineBox) : null;
    if (i !== loop.now || row !== loop.row) {
      clearNow();
      if (i >= 0) { const el = row.querySelector(`.jg-cell[data-i="${i}"]`); if (el) el.classList.add('now'); }
      loop.now = i; loop.row = row;
    }
    raf = requestAnimationFrame(frameNow);
  }
  function stopLoop() {
    if (!loop) return;
    clearInterval(loop.timer); cancelAnimationFrame(raf);
    killBus(loop.bus);
    clearNow();
    loop = null;
    renderPlay(); renderLine();
    renderCard();
  }
  const clearNow = () => stage.querySelectorAll('.jg-cell.now').forEach(el => el.classList.remove('now'));
  function togglePlay() { if (loop && loop.which === 'mine') stopLoop(); else startLoop('mine'); }
  function toggleRef() { const w = card && card.key === 'one' ? 'alt' : 'ref'; if (loop && loop.which === w) stopLoop(); else startLoop(w); }
  function renderPlay() {
    playBtn.textContent = loop && loop.which === 'mine' ? '멈추기' : '듣기';
    refPlayBtn.textContent = loop && loop.which !== 'mine' ? '멈추기' : refWord();
  }
  function sfxGood() { const t = engine.ensure().currentTime + 0.05; engine.note('marimba', 79, t, 0.12, 0.45); engine.note('marimba', 84, t + 0.09, 0.2, 0.45); }

  // ── 키보드 — 스페이스 = 손뼉 · 1~6 = 구음 고르기 ──
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') { if (e.target && e.target.closest && e.target.closest('button,a')) return; e.preventDefault(); if (!e.repeat) clap(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= PAL.length) setBrush(PAL[n - 1]);
  }
  document.addEventListener('keydown', onKey);

  // ── 자동 시험 고리 ──
  window.__jangAuto = () => {
    if (!card) return 'all';
    if (card.done) { nextCard(); return 'next'; }
    if (judge().st === 'ready') { if (!(loop && loop.which === 'mine')) startLoop('mine'); return 'listen'; }
    const m = J.nextMove(card.key, mine, ref);
    if (!m) return 'none';
    const want = m.hit ?? 'rest';
    if (brush !== want) { setBrush(want); return 'brush'; }
    tapCell(m.i);
    return 'place';
  };
  window.__jangState = () => ({ card: Math.min(cardNo + 1, J.CARDS.length), key: card ? card.key : 'end', done: done.size, doneList: [...done].sort((a, b) => a - b),
    ok: card ? card.done : true, all: !card, st: card ? (card.done ? 'done' : judge().st) : 'end', pick, frame, pat: J.encode(mine), ref: J.encode(ref),
    diff: J.diffCells(mine, ref).length, playing: loop ? loop.which : null });

  setBrush('deong');
  startCard();

  return () => {
    stopLoop();
    clearTimeout(lineTimer);
    if (saveTimer) writeNow();
    document.removeEventListener('keydown', onKey);
    css.remove();
    delete window.__jangAuto; delete window.__jangState;
  };
}
