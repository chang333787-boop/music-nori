// 도막 짜기 판(#/form) — 도막 카드 셋(가 · 나 · 다)을 칸 여섯에 놓아 짜임을 만들고, 놓은 차례대로 듣는 곳(11-14 묶음 D5)
//  왼쪽: 도막 고르기(누르면 고르고 한 번 들림) → 칸을 누르면 고른 도막이 들어감(같은 도막을 한 번 더 누르면 빠짐 · 다른 도막이면 바뀜)
//   칸 아래 단추 둘 = 혼자 ↔ 여럿(메기고 받기) · 느리게 ↔ 빠르게(긴자진) — 바꾸면 그 칸이 한 번 들림 · 빈 칸은 건너뜀(단추는 점선 자리만)
//   아래 줄 = 짜임 이름(놓은 차례 그대로 · 가나가 …) + 셀 수 있는 사실 한두 줄 + [듣기](주황은 이것 하나)
//  오른쪽: 부탁 카드 넷(가나가 · 메기고 받기 · 느리게 다음 빠르게 · 내 짜임 짓기) — 잠금 X(카드 점 = 단추) · 진행 form.done = 끝낸 부탁 번호 목록(기기에만)
//   부탁은 판이 맞은 뒤 '듣기'로 끝까지 들으면 끝 · 내 짜임은 정답 없음(적어도 네 칸) · 끝낸 내 짜임은 form.mine에 저장
//  규칙 · 소리 사건 · 짜임 글은 engine/form.js(화면 없이 시험 · tests/form.test.mjs). 여기는 그리기 · 누르기 · 틀기만.
//  1~2학년 판(device.band 'low')은 '도막' 대신 '조각'(engine/form.js W).
//  자동 시험: window.__formAuto() = 지금 부탁을 푸는 맞는 행동 하나 · window.__formState() = { card, done, ok, all, key, st, name, … }
import { h, svg, onPress, lsGet, lsSet } from '../util.js';
import { Player } from '../audio.js';
import * as F from '../../../engine/form.js';

(() => {
  if (typeof document === 'undefined' || document.querySelector('link[data-form]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'app/css/form.css'; l.dataset.form = '1';
  document.head.append(l);
})();

// 도막 그림 — 가로 = 시간 · 세로 = 높이(도막 셋이 같은 눈금) · 막대 = 음
const LO = 60, HI = 74;
function pict(piece) {
  const g = svg('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none', class: 'fm-pict', 'aria-hidden': 'true' });
  let t = 0;
  for (const [p, b] of piece.notes) {
    if (p != null) g.append(svg('rect', { x: (t / F.BEATS * 100 + 1).toFixed(1), y: ((HI - p) / (HI - LO) * 30).toFixed(1), width: (b / F.BEATS * 100 - 3).toFixed(1), height: 10, rx: 3, fill: 'currentColor' }));
    t += b;
  }
  return g;
}
// 혼자 = 점 하나 · 여럿 = 점 셋(형2 칸 단추와 같은 그림) · 느리게 = 발자국 둘 · 빠르게 = 발자국 다섯(놀이터 빠르기와 같은 그림)
const DOT = (x, y) => svg('circle', { cx: x, cy: y, r: 5, fill: 'currentColor' });
const voiceIco = v => svg('svg', { viewBox: '0 0 32 24', class: 'fm-ico', 'aria-hidden': 'true' }, ...(v === 'one' ? [DOT(16, 12)] : [DOT(16, 6), DOT(8, 18), DOT(24, 18)]));
function speedIco(v) {
  const n = v === 'slow' ? 2 : 5, W = 44, g = svg('svg', { viewBox: `0 0 ${W} 20`, class: 'fm-ico wide', 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) { const x = n === 1 ? W / 2 : 6 + i * (W - 12) / (n - 1); g.append(svg('ellipse', { cx: x, cy: i % 2 ? 14 : 6, rx: 3.6, ry: 5, fill: 'currentColor' })); }
  return g;
}

export default function mount(root, ctx) {
  const { engine, bar, device } = ctx;
  const lo = device.band === 'low', w = F.W(lo), T = F.TASKS;
  bar.title(lo ? '노래 조각 짜 보기' : '도막 짜 보기', 'turtle');

  const done = new Set((lsGet('form.done', []) || []).filter(k => Number.isInteger(k) && k >= 0 && k < T.length));
  const firstOpen = () => { for (let k = 0; k < T.length; k++) if (!done.has(k)) return k; return T.length; };
  const want = T.findIndex(t => (ctx.args || []).includes(t.key));      // #/form/call — 그 부탁을 바로
  let cardNo = want >= 0 ? want : firstOpen();
  let board = F.emptyBoard(), sel = 'ga';
  let card = null;                        // { task, st, msg, at, part, done, doneMsg }
  let heardSig = null;                    // '듣기'로 끝까지 들은 판(F.sigOf)
  let player = null, pre = null, raf = 0, playT0 = 0, segs = [], nowK = -1;

  const noFocus = el => { el.addEventListener('mousedown', e => e.preventDefault()); return el; };   // 눌러도 스페이스 = 듣기가 그대로
  const press = (el, fn) => noFocus(onPress(el, fn));

  // ── 그릇 ──
  const pieceBtns = F.PIECES.map(p => press(h('button', { type: 'button', class: 'fm-piece', 'data-id': p.id, 'aria-label': `${p.name} ${w} — 고르면 한 번 들려요` },
    h('b', {}, p.name), pict(p)), () => choosePiece(p.id)));
  const cols = Array.from({ length: F.SLOTS }, (_, k) => {
    const face = press(h('button', { type: 'button', class: 'fm-slot', 'data-k': k }), () => tapSlot(k));
    const voice = press(h('button', { type: 'button', class: 'fm-tg', 'data-k': k, 'data-t': 'voice' }), () => tapVoice(k));
    const speed = press(h('button', { type: 'button', class: 'fm-tg', 'data-k': k, 'data-t': 'speed' }), () => tapSpeed(k));
    const col = h('div', { class: 'fm-col' }, h('span', { class: 'fm-num', 'aria-hidden': 'true' }, String(k + 1)), face, voice, speed);
    return { col, face, voice, speed };
  });
  const nameEl = h('b', { class: 'fm-nm' });
  const factEl = h('span', { class: 'fm-facts' });
  const playBtn = press(h('button', { type: 'button', class: 'go big fm-play' }, '듣기'), () => togglePlay());
  const board_ = h('section', { class: 'fm-board' },
    h('div', { class: 'fm-pieces', role: 'group', 'aria-label': `${w} 고르기` }, h('span', { class: 'fm-lab' }, `${w} 고르기`), ...pieceBtns),
    h('div', { class: 'fm-slots' }, ...cols.map(c => c.col)),
    h('div', { class: 'fm-foot' }, h('div', { class: 'fm-name', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'fm-lab' }, '짜임'), nameEl, factEl), playBtn));
  const cardEl = h('section', { class: 'fm-card' });
  const wrap = h('div', { class: 'form' }, board_, cardEl);
  root.append(wrap);
  const clearBtn = press(h('button', { type: 'button' }, '모두 비우기'), () => commit(F.emptyBoard()));
  bar.right(h('div', { class: 'bar-btns' }, clearBtn));

  // ── 바꾸기 ── 판이 바뀌면 틀던 것을 멈추고 · 저장(내 짜임 · 자유) · 부탁 다시 보기
  function commit(next, hearK = null) {
    if (next === board) return;
    stopAll();
    board = next;
    if (!card || card.task.key === 'mine') lsSet('form.mine', board);
    evalCard(false);
    render();
    if (hearK != null) preview(F.slotEvents(board, hearK));
  }
  function choosePiece(id, hear = true) {
    sel = id;
    render();
    if (hear) preview(F.pieceEvents(id));
  }
  function tapSlot(k) {
    const has = board[k].piece;
    commit(F.place(board, k, sel), has === sel ? null : k);   // 빼면 소리 없음 · 넣거나 바꾸면 그 칸이 한 번
  }
  const tapVoice = k => commit(F.toggleVoice(board, k), k);
  const tapSpeed = k => commit(F.toggleSpeed(board, k), k);

  // ── 소리 ──
  function preview({ events, total }) {
    stopAll();
    if (!events.length) return;
    engine.ensure();
    pre = new Player(engine);
    pre.start(events, { total });
  }
  function stopPre() { if (pre) { pre.stop(); pre = null; } }
  function togglePlay() { if (player && player.playing) { stopPlay(); return; } startPlay(); }
  function startPlay() {
    stopAll();
    const r = F.events(board);
    if (!r.events.length) { factEl.textContent = `먼저 ${w}을 고르고 칸을 눌러요`; return; }
    engine.ensure();
    player = new Player(engine);
    segs = r.segs;
    const me = player, sig = F.sigOf(board);
    playT0 = player.start(r.events, { total: r.total, onEnd: () => { if (player !== me) return; heardSig = sig; stopPlay(); evalCard(); } });
    playBtn.textContent = '멈추기';
    raf = requestAnimationFrame(frame);
  }
  function stopPlay() {
    if (player) player.stop();
    player = null;
    cancelAnimationFrame(raf);
    playBtn.textContent = '듣기';
    setNow(-1, 0);
  }
  function stopAll() { stopPre(); stopPlay(); }
  function frame() {
    if (!player || !player.playing) return;
    const t = engine.now - playT0;
    const s = segs.find(x => t >= x.t0 && t < x.t1);
    setNow(s ? s.k : -1, s ? (t - s.t0) / (s.t1 - s.t0) : 0);
    raf = requestAnimationFrame(frame);
  }
  // 지금 들리는 칸 — 칸 테두리 + 칸 안 진행 막대 · 짜임 이름의 그 글자
  function setNow(k, f) {
    if (k !== nowK) {
      cols.forEach((c, i) => c.col.classList.toggle('now', i === k));
      const order = F.filled(board).map(s => s.k);
      nameEl.querySelectorAll('i').forEach((el, i) => el.classList.toggle('now', order[i] === k));
      nowK = k;
    }
    if (k >= 0) cols[k].face.style.setProperty('--p', f.toFixed(3));
  }
  function sfxGood() { const t = engine.ensure().currentTime + 0.05; engine.note('marimba', 79, t, 0.12, 0.45); engine.note('marimba', 84, t + 0.09, 0.2, 0.45); }

  // ── 부탁 ──
  function startCard() {
    stopAll();
    heardSig = null;
    if (cardNo >= T.length) { card = null; board = F.fromSaved(lsGet('form.mine')) || board; render(); return; }
    const task = T[cardNo];
    board = task.key === 'mine' ? (F.fromSaved(lsGet('form.mine')) || F.emptyBoard()) : F.emptyBoard();
    card = { task, st: 'idle', msg: '', at: null, part: 'piece', done: false, doneMsg: '' };
    evalCard(false);
    render();
  }
  function evalCard(rerender = true) {
    if (card && !card.done) {
      const r = card.task.check(board, lo);
      Object.assign(card, { st: r.st, msg: r.msg || '', at: r.at ?? null, part: r.part || 'piece' });
      if (r.st === 'ready' && heardSig === F.sigOf(board)) return finishCard();
    }
    if (rerender) render();
  }
  function finishCard() {
    card.done = true; card.st = 'done'; card.doneMsg = card.task.done(lo, board);
    if (card.task.key === 'mine') lsSet('form.mine', board);
    if (!done.has(cardNo)) { done.add(cardNo); lsSet('form.done', [...done].sort((a, b) => a - b)); }
    sfxGood();
    render();
  }
  function nextCard() { cardNo = Math.min(T.length, cardNo + 1); startCard(); }
  function openCard(k) {
    if (k === cardNo && card) return;
    const kb = document.activeElement && document.activeElement.closest && document.activeElement.closest('.pc-dots');
    cardNo = k; startCard();
    if (kb) { const b = cardEl.querySelector(`.pc-dots button[data-k="${k}"]`); if (b) b.focus(); }
  }

  // ── 그리기 ──
  function render() {
    pieceBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === sel)));
    const selName = F.pieceById(sel).name, mark = card && !card.done && card.st === 'idle' ? card : null;
    cols.forEach((c, k) => {
      const s = board[k], p = s.piece && F.pieceById(s.piece);
      c.face.className = 'fm-slot' + (p ? '' : ' empty') + (s.speed === 'fast' ? ' fast' : '') + (s.voice === 'many' ? ' many' : '');
      c.face.replaceChildren(...(p ? [h('b', {}, p.name), pict(p), h('i', { class: 'fm-prog' })] : [h('span', { class: 'fm-empty' }, '빈 칸')]));
      c.face.setAttribute('aria-label', p
        ? `${k + 1}번 칸 ${p.name} ${w} — 누르면 ${s.piece === sel ? '빠져요' : `${selName}로 바뀌어요`}`
        : `${k + 1}번 칸 빈 칸 — 누르면 ${selName} ${w}이 들어가요`);
      c.col.classList.toggle('off', !p);
      const vo = s.voice === 'one';
      c.voice.dataset.v = s.voice;
      c.voice.replaceChildren(voiceIco(s.voice), h('span', { class: 'fm-tl' }, h('span', {}, vo ? '혼자' : '여럿'), lo ? null : h('small', {}, vo ? '메기는 소리' : '받는 소리')));
      c.voice.setAttribute('aria-label', `${k + 1}번 칸 ${vo ? '혼자' : '여럿'} — 누르면 ${vo ? '여럿' : '혼자'}`);
      const sl = s.speed === 'slow';
      c.speed.dataset.v = s.speed;
      c.speed.replaceChildren(speedIco(s.speed), h('span', { class: 'fm-tl' }, h('span', {}, sl ? '느리게' : '빠르게')));
      c.speed.setAttribute('aria-label', `${k + 1}번 칸 ${sl ? '느리게' : '빠르게'} — 누르면 ${sl ? '빠르게' : '느리게'}`);
      c.voice.disabled = c.speed.disabled = !p;          // 빈 칸은 점선 자리만(도막을 놓으면 열림)
      for (const part of ['piece', 'voice', 'speed']) c.col.classList.toggle('at-' + part, !!mark && mark.at === k && mark.part === part);
    });
    const N = F.filled(board);
    nameEl.replaceChildren(...(N.length ? N.map(s => h('i', {}, F.pieceById(s.piece).name)) : [h('span', { class: 'fm-none' }, '아직 없어요')]));
    factEl.textContent = N.length ? F.facts(board, lo).join(' · ') : `${w}을 고르고 칸을 눌러요`;
    nowK = -2;                            // 다시 그렸으니 지금 칸 표시도 다시
    renderCard();
  }
  function renderCard() {
    // 점 = 부탁 단추(놀이터와 같은 모양 · 채움 = 끝냄 · 고리 = 지금 · 잠금 X)
    const dots = h('div', { class: 'pc-dots', role: 'group', 'aria-label': '부탁 고르기' }, ...T.map((_, k) => {
      const on = done.has(k) || (k === cardNo && card && card.done), now = k === cardNo && card && !card.done;
      return press(h('button', { type: 'button', class: [on ? 'on' : '', now ? 'now' : ''].join(' ').trim(), 'data-k': k, 'aria-label': `부탁 ${k + 1}`, 'aria-current': k === cardNo && card ? 'step' : null }, h('i', {})), () => openCard(k));
    }));
    if (!card) {
      const again = press(h('button', { type: 'button' }, '처음 부탁부터'), () => { cardNo = 0; startCard(); });
      cardEl.replaceChildren(dots,
        h('p', { class: 'pc-text' }, done.size >= T.length ? `부탁 ${T.length}개를 다 했어요` : `부탁 ${T.length}개 중 ${done.size}개를 했어요`),
        h('p', { class: 'pc-hint' }, done.size >= T.length ? `이제 마음대로 짜 봐요. 놓은 차례대로 들려요.` : '빈 점을 누르면 남은 부탁을 할 수 있어요.'),
        h('div', { class: 'pc-act' }, again));
      return;
    }
    const t = card.task, k = card.st;
    const hint = card.done ? card.doneMsg : k === 'ready' ? "됐어요 — 이제 '듣기'로 끝까지 들어 봐요" : card.msg;
    const kids = [dots, h('p', { class: 'pc-text' }, t.text(lo)), h('p', { class: 'pc-hint', 'data-k': k }, hint),
      h('div', { class: 'fm-word' }, h('p', {}, t.word(lo)), t.note ? h('p', { class: 'fm-note' }, t.note) : null)];
    if (card.done) kids.push(h('div', { class: 'pc-act' }, press(h('button', { type: 'button', class: 'pc-next' }, cardNo + 1 < T.length ? '다음 부탁' : '부탁 끝'), () => nextCard())));
    cardEl.replaceChildren(...kids);
  }

  // ── 키보드 ── 스페이스 = 듣기 · 1 2 3 = 도막 고르기
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const onBtn = e.target && e.target.closest && e.target.closest('button,a');
    if (e.key === ' ' && !onBtn) { e.preventDefault(); if (!e.repeat) togglePlay(); return; }
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) choosePiece(F.PIECE_IDS[i]);
  }
  document.addEventListener('keydown', onKey);

  // ── 자동 시험 고리 ──
  window.__formAuto = () => {
    if (!card) return 'all';
    if (card.done) { nextCard(); return 'next'; }
    if (card.st === 'ready') { if (!(player && player.playing)) startPlay(); return 'listen'; }
    const a = F.autoStep(card.task, board, lo);
    if (!a) return 'none';
    if (a.op === 'place') { if (sel !== a.id) { choosePiece(a.id, false); return 'pick'; } tapSlot(a.k); return 'place'; }
    if (a.op === 'voice') { tapVoice(a.k); return 'voice'; }
    tapSpeed(a.k); return 'speed';
  };
  window.__formState = () => ({ card: Math.min(cardNo + 1, T.length), done: done.size, doneList: [...done].sort((a, b) => a - b), ok: card ? card.done : true, all: !card,
    key: card ? card.task.key : 'end', st: card ? card.st : 'end', name: F.nameOf(board), board: F.sigOf(board), playing: !!(player && player.playing), lo });

  startCard();

  return () => {
    stopAll();
    document.removeEventListener('keydown', onKey);
    delete window.__formAuto; delete window.__formState;
  };
}
