// 악2 오선의 줄과 칸 — 그림 악보(악1)의 세로 높이를 다섯 줄로 옮긴다. 줄 음 = 줄이 음표 가운데를 지나는 음 · 칸 음 = 두 줄 사이에 있는 음
//  가락 칸과 잇기: 미 = 첫째 줄 · 솔 = 둘째 줄 · 라 = 둘째 칸 · 도 = 아래 덧줄(가1~가3 높이 판과 같은 '음 자리'를 그대로 씀)
//  오선은 RPG 악보(notation.js · 줄 사이 10px) 대신 손가락보다 넓게 직접 그린다 — 줄 사이 50~54px(1366×768)
//  왼쪽에 높은음자리표(notation.js와 같은 Noto Music 글자 U+1D11E) — 자리표가 있어야 '첫째 줄 = 미'가 맞는 말이 됨(평가 2차)
//   글자 크기 = 줄 사이 × 4.4 · 글자 바닥선 = 둘째 줄 + 줄 사이 × 0.8(소용돌이 끝이 둘째 줄에 오게 — 11-07 브라우저에서 잼)
//  보기: 오선 위에 도 · 미 · 솔 · 라(도는 아래 덧줄)를 계단처럼 + 카드 넷(누르면 그 음만 남고 줄 · 칸 이름이 밝아짐) + 그림 악보 막대가 오선 위로 내려앉기
//  연습: 음표 하나(흰 머리 — 색이 답을 알려 주지 않게) — 줄이 가운데를 지나나, 줄 사이에 있나(눈으로 푸는 문제라 '다시 듣기' 없음)
//  확인 게임 '줄과 칸 가려내기' 12판 — 오른쪽 답 자리 넷은 처음부터(앞 여덟 판은 둘만 열고 둘은 잠가 둠)
//   소개(미 · 라 · 파 · 솔) → 발전(위쪽 줄과 칸까지) → 비틀기(몇째 줄 · 몇째 칸 — 아래부터 세기 · 답 넷 = 둘째 칸 · 둘째 줄 · 첫째 줄 · 아래 덧줄) → 마무리(도 = 아래 덧줄)
//  11-07 평가 3차: 잠근 답 단추는 빼고 남은 단추를 세로 가운데 · 게임은 눈으로 푸는 문제라 '다시 듣기' 대신 아래 띠 자리까지 무대를 키움(오선도 크게)
//   · 막대 → 음표 바뀜은 transform · opacity로만(left · width 움직임 X)
import { colorOf, badge, voice, songNotes, playBeats, startCard, press, speaker, hearHead, markPick, judge } from './_mel.js';

const PITCH = { '-2': 60, '-1': 62, 0: 64, 1: 65, 2: 67, 3: 69, 4: 71, 5: 72, 6: 74, 7: 76, 8: 77 };
const POS_OF = Object.fromEntries(Object.entries(PITCH).map(([k, v]) => [v, Number(k)]));
const ORDN = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
const isLine = pos => pos % 2 === 0;                 // -2(아래 덧줄)도 줄
const posName = pos => (pos === -2 ? '아래 덧줄' : isLine(pos) ? `${ORDN[pos / 2]} 줄` : `${ORDN[(pos - 1) / 2]} 칸`);
const LINE_T = '줄이 가운데를 지나는 음', SPACE_T = '줄 사이에 있는 음';
const EXAMPLES = [
  { pos: -2, x: 20, sub: '짧은 덧줄이 가운데를 지나요' },
  { pos: 0, x: 42, sub: '줄이 가운데를 지나요' },
  { pos: 2, x: 64, sub: '줄이 가운데를 지나요' },
  { pos: 3, x: 86, sub: '줄 사이에 있어요' },
];
const TWIST = [3, 2, 0, -2];                          // 비틀기 답(위 → 아래 = 오선 높이 차례)
const PLAN = [
  { pos: 0 }, { pos: 3 }, { pos: 1 }, { pos: 2 },
  { pos: 6 }, { pos: 5 }, { pos: 4 }, { pos: 7 },
  { pos: 2, twist: true }, { pos: 3, twist: true }, { pos: 0, twist: true },
  { pos: -2, twist: true },
];
// 답 칩 그림 — 줄이 지나는 음표 · 줄 사이 음표 · 아래 덧줄 음표
const INK = '#3B2A1E';
const HEAD = (y, x = 28) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="8.5" transform="rotate(-14 ${x} ${y})" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/>`;
const LN = (y, x1 = 2, x2 = 54) => `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${INK}" stroke-width="3"/>`;
const CHIP = {
  line: `<svg viewBox="0 0 56 44" aria-hidden="true">${HEAD(22)}${LN(22)}</svg>`,
  space: `<svg viewBox="0 0 56 44" aria-hidden="true">${HEAD(22)}${LN(12.5)}${LN(31.5)}</svg>`,
  ledger: `<svg viewBox="0 0 56 44" aria-hidden="true">${LN(8)}${HEAD(31)}${LN(31, 12, 44)}</svg>`,
};
const chipOf = pos => (pos === -2 ? CHIP.ledger : isLine(pos) ? CHIP.line : CHIP.space);

// ── 큰 오선(HTML) — 줄 다섯(아래가 첫째) · 칸 넷 · 왼쪽 높은음자리표 · 줄이 음표 위로 지나가게 ──
//  음표 x는 자리표 오른쪽 '음표 자리'(.k2-area) 안의 % · 위아래로 자리표가 들어갈 여백을 둠
function bigStaff(kit, { gap = 50, labels = false } = {}) {
  const { h } = kit;
  const top = gap * 2.1, H = gap * 7.8, clefW = gap * 3.1;   /* 자리표 꼭대기는 다섯째 줄보다 약 2칸 위 · 꼬리는 첫째 줄보다 1.5칸 아래 */
  const y = pos => top + (8 - pos) * gap / 2;
  const field = h('div', { class: 'k2-field' });
  const spaces = [1, 2, 3, 4].map(k => h('div', { class: 'k2-space', style: { top: y(2 * k) + 'px', height: gap + 'px' } }));
  const lines = [0, 1, 2, 3, 4].map(k => h('div', { class: 'k2-line', style: { top: y(2 * k) + 'px' } }));
  const clef = h('div', { class: 'k2-clef', style: { width: clefW + 'px' },
    html: `<svg width="${Math.round(clefW)}" height="${Math.round(H)}" aria-hidden="true"><text x="${(gap * 0.2).toFixed(1)}" y="${(y(2) + gap * 0.8).toFixed(1)}" class="st-clef" style="font-size:${(gap * 4.4).toFixed(1)}px">\u{1D11E}</text></svg>` });
  const area = h('div', { class: 'k2-area', style: { left: clefW + 'px' } });
  field.append(...spaces, ...lines, clef, area);
  const llab = labels ? lines.map((_, k) => h('span', { class: 'k2-lab l', style: { top: y(2 * k) + 'px' } }, `${ORDN[k]} 줄`)) : [];
  const slab = labels ? spaces.map((_, k) => h('span', { class: 'k2-lab s', style: { top: y(2 * k + 1) + 'px' } }, `${ORDN[k]} 칸`)) : [];
  const el = h('div', { class: 'k2-staff' + (labels ? ' labeled' : ''), style: { height: H + 'px', '--g': gap + 'px' } },
    h('div', { class: 'k2-labs' }, ...llab), field, h('div', { class: 'k2-labs' }, ...slab));
  const ledgers = new Set();
  function mark(pos) {
    lines.forEach((x, k) => { x.classList.toggle('on', pos === 2 * k); if (llab[k]) llab[k].classList.toggle('on', pos === 2 * k); });
    spaces.forEach((x, k) => { x.classList.toggle('on', pos === 2 * k + 1); if (slab[k]) slab[k].classList.toggle('on', pos === 2 * k + 1); });
    ledgers.forEach(l => l.classList.toggle('on', pos === -2));
  }
  // 음표 — x = 음표 자리 왼쪽에서 %(가운데) · fill = 계이름 색 / 흰 머리(연습 · 게임)
  function note(pos, x, { fill = null } = {}) {
    const n = h('div', { class: 'k2-note' + (fill ? '' : ' hollow'), style: { top: y(pos) + 'px', left: x, ...(fill ? { '--c': fill } : {}) } });
    area.append(n);
    let led = null;
    if (pos <= -2) { led = h('div', { class: 'k2-ledger', style: { top: y(-2) + 'px', left: x } }); area.append(led); ledgers.add(led); }
    return { n, led, pos, remove() { n.remove(); if (led) { led.remove(); ledgers.delete(led); } } };
  }
  // 그림 악보 막대 — 왼쪽 끝 x0(%) · 너비 w(%) · 음표로 바뀔 때 왼쪽 끝으로 줄어들며 사라짐(transform-origin 왼쪽)
  function bar(pos, x0, w, fill) {
    const b = h('div', { class: 'k2-bar', style: { top: y(pos) + 'px', left: x0 + '%', width: `calc(${w}% - 10px)`, '--c': fill } });
    area.append(b);
    return b;
  }
  function tag(pos, x, text) {
    const t = h('span', { class: 'k2-tag', style: { top: y(pos) + 'px', left: `calc(${x} + ${gap * 1.05}px)` } }, text);
    area.append(t);
    return t;
  }
  const clear = () => { area.querySelectorAll('.k2-note,.k2-ledger,.k2-tag,.k2-bar').forEach(e => e.remove()); ledgers.clear(); mark(null); };
  return { el, field, y, mark, note, bar, tag, clear, gap };
}

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say(kit.band === 'low' ? '다섯 줄 — 줄에도, 줄 사이에도 음을 놓아요' : '오선은 다섯 줄 — 줄에도, 줄 사이에도 음표를 놓아요');
    const st = bigStaff(kit, { gap: 50, labels: true });
    let shown = [];
    // 처음 모습 — 도 · 미 · 솔 · 라를 계단처럼(도는 아래 덧줄)
    function drawSteps(only = null) {
      st.clear(); st.el.classList.remove('picture');
      shown = EXAMPLES.map(ex => {
        const nt = st.note(ex.pos, ex.x + '%', { fill: colorOf(PITCH[ex.pos]) });
        if (only != null && ex.pos !== only) { nt.n.classList.add('dim'); if (nt.led) nt.led.classList.add('dim'); }
        return nt;
      });
    }
    // 「라가 왔어요」 첫 마디(솔 라 솔) — 막대(길이 = 박)로 시작해 음표로 내려앉음
    //  평가 3차: 두 마디(8박)는 한 박이 음표 머리보다 좁아 솔 · 라 · 솔 머리가 겹쳤음 → 한 마디(4박 · 한 박 ≈ 머리 + 14px)
    const song = songNotes('ga2-ra'), mel = song.notes.filter(n => n.t < 4);
    const beat = 92 / 4, headW = st.gap * 1.3;
    let bars = [];
    //  막대(길이 = 박)를 먼저 보이고, 같은 왼쪽 끝에 음표 머리를 숨겨 둠 → toHeads: 막대는 왼쪽으로 줄며 사라지고 머리가 나타남(transform · opacity만)
    function drawBars() {
      st.clear(); st.el.classList.add('picture'); shown = [];
      bars = mel.map(n => {
        const x0 = 4 + n.t * beat, pos = POS_OF[n.p];
        const b = st.bar(pos, x0, n.d * beat, colorOf(n.p));
        const nt = st.note(pos, `calc(${x0}% + ${headW / 2 + 4}px)`, { fill: colorOf(n.p) });
        nt.n.classList.add('pre');
        return { ...nt, b };
      });
    }
    const SHRINK = [{ transform: 'translateY(-50%) scaleX(1)', opacity: 1 }, { transform: 'translateY(-50%) scaleX(.15)', opacity: 0 }];
    const LAND = [{ transform: 'translate(-50%,-50%) rotate(-14deg) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-14deg) scale(1)', opacity: 1 }];
    const toHeads = () => {
      st.el.classList.remove('picture');
      bars.forEach(x => {
        if (!x.b.isConnected) return;
        const a = x.b.animate(SHRINK, { duration: 420, easing: 'ease-in', fill: 'forwards' });
        a.onfinish = () => x.b.remove();
        x.n.classList.remove('pre');
        x.n.animate(LAND, { duration: 300, delay: 220, easing: 'ease-out', fill: 'backwards' });
      });
    };
    drawSteps();
    const lightBar = k => bars.forEach((x, j) => { x.n.classList.toggle('on', j === k); x.b.classList.toggle('on', j === k); });
    const quiet = () => { T.clear(); V.cut(); lightBar(-1); };
    const card = (head, sub, cls = '') => h('button', { type: 'button', class: ('excard k2-ex ' + cls).trim() }, h('span', { class: 'k2-exhead' }, speaker(h), ...head), h('span', { class: 'k2-exsub' }, sub));
    const morph = card([h('b', {}, kit.ez('그림 악보 → 오선'))], '막대가 다섯 줄 위에 내려앉아요', 'wide');
    onPress(morph, () => {
      quiet(); drawBars();
      const s = playBeats(V, kit, mel, { tempo: song.tempo, inst: 'xylo' });
      mel.forEach((n, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => lightBar(k)));
      T.after(900, toHeads);
      T.after(kit.msUntil(s.ac, s.end) + 300, () => lightBar(-1));
      morph.classList.add('heard');
    });
    const cards = EXAMPLES.map(ex => {
      const p = PITCH[ex.pos];
      const btn = card([badge(h, p), h('b', {}, kit.ez(posName(ex.pos)))], kit.ez(ex.sub));
      onPress(btn, () => {
        quiet(); bars = [];
        drawSteps(ex.pos);
        st.mark(ex.pos);
        const nt = shown.find(n => n.pos === ex.pos);
        nt.n.classList.add('on');
        if (ex.pos === -2) st.tag(ex.pos, ex.x + '%', kit.ez(posName(ex.pos)));
        V.play(kit, [{ p, d: 0.8 }], { inst: 'xylo' });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols k2-cols' }, h('div', { class: 'k2-panel' }, st.el),
      h('div', { class: 'k2-excol' }, hearHead(h), h('div', { class: 'k2-grid' }, morph, ...cards))));
    const all = [...cards, morph];
    let k = 0;
    kit.setAuto(() => { if (k < all.length) press(all[k++]); else kit.next(); });
    return () => { T.clear(); V.cut(); };
  },

  // ── 연습: 이 음표는 줄이 가운데를 지나나요, 줄 사이에 있나요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('이 음표는 줄이 가운데를 지나나요, 줄 사이에 있나요?');
    const st = bigStaff(kit, { gap: 46 });
    let streak = 0, cur = null, busy = false, prev = null;
    const msg = h('p', { class: 'm-why' });
    const A = kit.answers([{ key: 'line', label: LINE_T, chip: CHIP.line }, { key: 'space', label: SPACE_T, chip: CHIP.space }], k => answer(k === 'line'), { cls: 'k2-ans' });
    const POS = [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    function ask() {
      let pos; do { pos = POS[Math.floor(r() * POS.length)]; } while (pos === prev || (prev != null && isLine(pos) === isLine(prev) && r() < 0.4));
      prev = pos; cur = { pos };
      busy = true; V.cut(); T.clear(); st.clear(); A.clear();
      msg.textContent = '';
      const nt = st.note(cur.pos, '50%');
      nt.n.classList.add('pop');
      V.play(kit, [{ p: PITCH[cur.pos], d: 0.7 }], { inst: 'xylo' });   /* 보이는 음표와 소리를 함께(문제는 눈으로) */
      T.after(250, () => { busy = false; });
    }
    function why(pos) {
      if (pos === -2) return '짧은 덧줄이 음표 가운데를 지나가요 — 아래 덧줄';
      return isLine(pos) ? `줄이 음표 가운데를 지나가요 — ${posName(pos)}` : `두 줄 사이에 있어요 — ${posName(pos)}`;
    }
    function answer(line) {
      if (busy || !cur) return;
      busy = true;
      const right = line === isLine(cur.pos);
      st.mark(cur.pos); st.tag(cur.pos, '50%', kit.ez(posName(cur.pos)));
      markPick(A, isLine(cur.pos) ? 'line' : 'space', line ? 'line' : 'space'); judge(ui, right, { eye: true });
      msg.textContent = kit.ez(why(cur.pos));
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1200, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        T.after(2000, ask);
      }
    }
    ui.stage.append(h('div', { class: 'k2-play' }, h('div', { class: 'k2-left' }, h('div', { class: 'k2-panel' }, st.el), msg), A.el));
    T.after(400, ask);
    kit.setAuto(() => { if (!busy && cur) answer(isLine(cur.pos)); });
    const onKey = e => { if (e.key === '1' || e.key === 'ArrowUp') answer(true); else if (e.key === '2' || e.key === 'ArrowDown') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 줄과 칸 가려내기 — 12판 ──
  game(ui, kit) {
    const { h, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, gone = false, twist = false;
    const SAY1 = '줄이 음표 가운데를 지나나요, 줄 사이에 있나요?', SAY2 = '몇째 줄, 몇째 칸일까요? 아래 줄부터 세어요';
    ui.say(SAY1);
    let st = bigStaff(kit, { gap: 52 });
    const turtle = h('div', { class: 'k2-turtle' }, kit.friendImg('turtle', 'idle', { label: false }));
    const pose = ps => kit.setPose(turtle.firstChild, 'turtle', ps);
    // 답 자리 넷 — 앞 여덟 판: 줄 · 사이 둘만 열림 / 비틀기: 넷 모두 몇째(자리가 밀리지 않게 처음부터 깔아 둠)
    const A = kit.answers([
      { key: 0, label: LINE_T, chip: CHIP.line }, { key: 1, label: SPACE_T, chip: CHIP.space },
      { key: 2, label: '', chip: ' ', locked: true }, { key: 3, label: '', chip: ' ', locked: true },
    ], k => choose(k), { cls: 'k2-ans four' });
    const relabel = () => TWIST.forEach((pos, k) => {
      const b = A.btn(k);
      b.querySelector('.lab').textContent = kit.ez(posName(pos));
      b.querySelector('.chip').innerHTML = chipOf(pos);
      A.lock(k, false);
    });
    const panel = h('div', { class: 'k2-gpanel' }, st.el, turtle);
    const scene = h('div', { class: 'k2-scene' }, panel, A.el);
    ui.stage.append(scene);
    // 무대 키우기 — 눈으로 푸는 문제라 아래 띠에 둘 것('다시 듣기')이 없음 → 게임 동안 띠 자리까지 무대로 쓰고 오선도 크게(결과 앞 · 정리 때 되돌림)
    const screen = ui.stage.closest('.cellscreen');
    const tall = on => { if (screen) screen.classList.toggle('k2-tall', on); };
    function grow() {
      tall(true);
      const room = panel.clientHeight - 16;           /* 한 번만 잼(시작 때) — TV 모드는 안내 줄 몫만큼 낮음 · 오선 높이 = 줄 사이 × 7.8 */
      const big = bigStaff(kit, { gap: Math.max(52, Math.min(64, Math.floor(room / 7.8))) });
      st.el.replaceWith(big.el);
      st = big;
    }
    const sc = startCard(ui, kit, {
      title: '줄과 칸 가려내기',
      lines: ['음표 가운데를 줄이 지나는지, 줄 사이에 있는지 골라요', '9번째부터는 몇째 줄·몇째 칸인지 골라요', '12번'],
      onStart: () => { grow(); T.after(300, next); },
    });
    ui.stage.append(sc.card);
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const pl = PLAN[i];
      if (pl.twist && !twist) {                           // 비틀기 들어가기 — 답 넷을 열고 한 번 알려 줌
        twist = true; i--;
        st.clear(); A.clear(); relabel();
        ui.say(SAY2); ui.tell('새 문제', 'info', 2200);
        T.after(2200, next);
        return;
      }
      const mine = cur = { ...pl, open: false };
      ui.count(i + 1, PLAN.length);
      st.clear(); A.clear();
      const nt = st.note(pl.pos, '50%'); nt.n.classList.add('pop');
      pose('idle');
      const s = V.play(kit, [{ p: PITCH[pl.pos], d: 0.6 }], { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.starts[0]) + 150, () => { if (cur === mine) mine.open = true; });
      T.after(kit.msUntil(s.ac, s.end) + 4200, () => { if (cur === mine && mine.open) choose(null); });
    }
    const want = c => (c.twist ? TWIST.indexOf(c.pos) : isLine(c.pos) ? 0 : 1);
    function choose(k) {
      if (!cur || !cur.open) return;
      cur.open = false;
      const ans = want(cur), right = k === ans;
      results.push(right);
      markPick(A, ans, k);
      st.mark(cur.pos); st.tag(cur.pos, '50%', kit.ez(posName(cur.pos)));
      judge(ui, right, { missed: k == null, eye: true });
      if (right) { kit.sfx.good(engine); pose('happy'); T.after(1000, next); return; }
      kit.sfx.oops(engine); pose('oops');
      T.after(1700, next);
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const wrongAt = results.map((ok, k) => (ok ? -1 : k)).filter(k => k >= 0);
      const num = wrongAt.filter(k => PLAN[k].twist).length, sp = wrongAt.filter(k => !PLAN[k].twist && !isLine(PLAN[k].pos)).length;
      let tip;
      if (!wrongAt.length) tip = '줄 음·칸 음도, 몇째 줄·몇째 칸도 모두 가려냈어요.';
      else if (num >= wrongAt.length / 2) tip = '몇째인지 고를 때(9번째부터) 헷갈렸어요. 줄과 칸은 맨 아래 줄부터 첫째, 둘째로 세요.';
      else if (sp >= wrongAt.length / 2) tip = '줄 사이에 있는 음을 더 많이 놓쳤어요. 칸 음은 위아래 두 줄에 닿아 있어요.';
      else tip = '줄이 지나는 음을 더 많이 놓쳤어요. 줄 음은 줄이 음표 한가운데를 지나가요.';
      turtle.hidden = true; A.el.hidden = true; st.clear(); ui.count(null); tall(false);   /* 결과 앞에 띠를 되돌림(결과 단추가 띠에 놓임) */
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open) choose(want(cur)); });
    const onKey = e => { const k = '1234'.indexOf(e.key); if (k >= 0 && cur && !A.btn(k).classList.contains('locked')) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); tall(false); window.removeEventListener('keydown', onKey); };
  },
};
