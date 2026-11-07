// 악2 오선의 줄과 칸 — 그림 악보(악1)의 세로 높이를 다섯 줄로 옮긴다. 줄 음 = 줄이 음표 가운데를 꿰뚫음 · 칸 음 = 두 줄 사이에 앉음
//  가락 칸과 잇기: 미 = 첫째 줄 · 솔 = 둘째 줄 · 라 = 둘째 칸 · 도 = 아래 덧줄(가1~가3 높이 판과 같은 '음 자리'를 그대로 씀)
//  오선은 RPG 악보(notation.js · 줄 사이 10px) 대신 손가락보다 넓게 직접 그린다 — 줄 사이 44~56px(1366×768)
//  보기: 그림 악보 막대가 오선 위로 내려앉기(「라가 왔어요」 앞 두 마디) + 줄 음 · 칸 음 예시 넷(미 · 솔 · 라 · 도)
//  따라 하기: 음표 하나 — 줄에 꿰였나, 칸에 앉았나
//  확인 게임 '줄에 꿰인 음 / 칸에 앉은 음' 12판
//   소개(미 · 라 · 파 · 솔) → 발전(위쪽 줄과 칸까지) → 비틀기(몇째 줄 · 몇째 칸 — 아래부터 세기) → 마무리(도 = 아래 덧줄)
import { colorOf, badge, voice, songNotes, playBeats, startCard, press, sayWord } from './_mel.js';

const PITCH = { '-2': 60, '-1': 62, 0: 64, 1: 65, 2: 67, 3: 69, 4: 71, 5: 72, 6: 74, 7: 76, 8: 77 };
const POS_OF = Object.fromEntries(Object.entries(PITCH).map(([k, v]) => [v, Number(k)]));
const ORDN = ['첫째', '둘째', '셋째', '넷째', '다섯째'];
const isLine = pos => pos % 2 === 0;                 // -2(아래 덧줄)도 줄
const posName = pos => (pos === -2 ? '아래 덧줄' : isLine(pos) ? `${ORDN[pos / 2]} 줄` : `${ORDN[(pos - 1) / 2]} 칸`);
const EXAMPLES = [
  { pos: 0, sub: '줄에 꿰인 음' },
  { pos: 2, sub: '줄에 꿰인 음' },
  { pos: 3, sub: '칸에 앉은 음' },
  { pos: -2, sub: '짧은 줄에 꿰인 음' },
];
const PLAN = [
  { pos: 0 }, { pos: 3 }, { pos: 1 }, { pos: 2 },
  { pos: 6 }, { pos: 5 }, { pos: 4 }, { pos: 7 },
  { pos: 2, opts: [4, 3, 2, 0] }, { pos: 3, opts: [5, 3, 2, 1] }, { pos: 0, opts: [2, 1, 0, -2] },
  { pos: -2, opts: [2, 1, 0, -2] },
];

// ── 큰 오선(HTML) — 줄 다섯(아래가 첫째) · 칸 넷 · 줄 위에 음표가 깔리게(줄이 음표를 꿰뚫어 보이게) ──
function bigStaff(kit, { gap = 48, labels = false } = {}) {
  const { h } = kit;
  const top = gap * 0.8, H = gap * 6.6;
  const y = pos => top + (8 - pos) * gap / 2;
  const field = h('div', { class: 'k2-field' });
  const spaces = [1, 2, 3, 4].map(k => h('div', { class: 'k2-space', style: { top: y(2 * k) + 'px', height: gap + 'px' } }));
  const lines = [0, 1, 2, 3, 4].map(k => h('div', { class: 'k2-line', style: { top: y(2 * k) + 'px' } }));
  field.append(...spaces, ...lines);
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
  // 음표 — x = 왼쪽에서 %(가운데) · fill = 계이름 색 / 흰 머리(오선 칸 게임)
  function note(pos, x, { fill = null } = {}) {
    const n = h('div', { class: 'k2-note' + (fill ? '' : ' hollow'), style: { top: y(pos) + 'px', left: x, ...(fill ? { '--c': fill } : {}) } });
    field.append(n);
    let led = null;
    if (pos <= -2) { led = h('div', { class: 'k2-ledger', style: { top: y(-2) + 'px', left: x } }); field.append(led); ledgers.add(led); }
    return { n, led, remove() { n.remove(); if (led) { led.remove(); ledgers.delete(led); } } };
  }
  function tag(pos, x, text) {
    const t = h('span', { class: 'k2-tag', style: { top: y(pos) + 'px', left: `calc(${x} + ${gap * 1.05}px)` } }, text);
    field.append(t);
    return t;
  }
  const clear = () => { field.querySelectorAll('.k2-note,.k2-ledger,.k2-tag').forEach(e => e.remove()); ledgers.clear(); mark(null); };
  return { el, field, y, mark, note, tag, clear, gap };
}

export default {
  // ── 보기 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('그림 악보의 높이를 다섯 줄 위에 옮겨요');
    const st = bigStaff(kit, { gap: 52, labels: true });
    // 「라가 왔어요」 앞 두 마디(솔 라 솔 | 미 솔) — 막대(길이 = 박)로 시작해 음표로 내려앉음
    const song = songNotes('ga2-ra'), mel = song.notes.filter(n => n.t < 8);
    const beat = 92 / 8, headW = st.gap * 1.3;
    let bars = [];
    function drawBars() {
      st.clear(); st.el.classList.add('picture');
      bars = mel.map(n => {
        const x0 = 4 + n.t * beat, nt = st.note(POS_OF[n.p], `${x0 + n.d * beat / 2}%`, { fill: colorOf(n.p) });
        nt.n.classList.add('bar');
        nt.n.style.width = `calc(${n.d * beat}% - 10px)`;
        return { ...nt, x0 };
      });
    }
    const toHeads = () => {
      st.el.classList.remove('picture');
      bars.forEach(b => { b.n.classList.remove('bar'); b.n.style.width = ''; b.n.style.left = `calc(${b.x0}% + ${headW / 2 + 4}px)`; });
    };
    drawBars();
    const quiet = () => { T.clear(); V.cut(); bars.forEach(b => b.n.classList.remove('on')); };
    const morph = h('button', { type: 'button', class: 'excard k2-ex wide' }, h('b', {}, '그림 악보 → 오선'), h('span', {}, '막대가 다섯 줄 위에 내려앉아요'));
    onPress(morph, () => {
      quiet(); drawBars();
      const s = playBeats(V, kit, mel, { tempo: song.tempo, inst: 'xylo' });
      mel.forEach((n, k) => T.after(kit.msUntil(s.ac, s.starts[k]), () => bars.forEach((b, j) => b.n.classList.toggle('on', j === k))));
      T.after(900, toHeads);
      T.after(kit.msUntil(s.ac, s.end) + 300, () => bars.forEach(b => b.n.classList.remove('on')));
      morph.classList.add('heard');
    });
    const cards = EXAMPLES.map(ex => {
      const p = PITCH[ex.pos];
      const btn = h('button', { type: 'button', class: 'excard k2-ex' }, h('span', { class: 'k2-exhead' }, badge(h, p), h('b', {}, posName(ex.pos))), h('span', {}, ex.sub));
      onPress(btn, () => {
        quiet(); st.clear(); st.el.classList.remove('picture'); bars = [];
        st.note(ex.pos, '50%', { fill: colorOf(p) });
        st.mark(ex.pos);
        if (ex.pos === -2) st.tag(ex.pos, '50%', posName(ex.pos));
        V.play(kit, [{ p, d: 0.8 }], { inst: 'xylo' });
        btn.classList.add('heard');
      });
      return btn;
    });
    ui.stage.append(h('div', { class: 'cols k2-cols' }, h('div', { class: 'k2-panel' }, st.el), h('div', { class: 'k2-grid' }, morph, ...cards)));
    const all = [morph, ...cards];
    let k = 0;
    kit.setAuto(() => { if (k < all.length) press(all[k++]); else kit.next(); });
    return () => { T.clear(); V.cut(); };
  },

  // ── 따라 하기: 이 음표는 줄에 꿰였나요, 칸에 앉았나요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('이 음표는 줄에 꿰였나요, 칸에 앉았나요?');
    const st = bigStaff(kit, { gap: 50 });
    let streak = 0, cur = null, busy = false, prev = null;
    const msg = h('p', { class: 'm-why' });
    const lineBtn = h('button', { type: 'button', class: 'pick k2-pick' }, h('i', { class: 'k2-ico line', 'aria-hidden': 'true' }), '줄에 꿰인 음');
    const spaceBtn = h('button', { type: 'button', class: 'pick k2-pick' }, h('i', { class: 'k2-ico space', 'aria-hidden': 'true' }), '칸에 앉은 음');
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    const POS = [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    function ask(newOne = true) {
      if (newOne) {
        let pos; do { pos = POS[Math.floor(r() * POS.length)]; } while (pos === prev || (prev != null && isLine(pos) === isLine(prev) && r() < 0.4));
        prev = pos; cur = { pos };
      }
      busy = true; V.cut(); T.clear(); st.clear();
      msg.className = 'm-why'; msg.textContent = '';
      const nt = st.note(cur.pos, '50%');
      nt.n.classList.add('pop');
      const s = V.play(kit, [{ p: PITCH[cur.pos], d: 0.7 }], { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.starts[0]) + 200, () => { busy = false; });
    }
    function why(pos) {
      if (pos === -2) return '짧은 덧줄이 음표 가운데를 지나가요(아래 덧줄)';
      return isLine(pos) ? `줄이 음표 가운데를 지나가요(${posName(pos)})` : `두 줄 사이에 앉았어요(${posName(pos)})`;
    }
    function answer(line) {
      if (busy || !cur) return;
      busy = true;
      const right = line === isLine(cur.pos);
      st.mark(cur.pos); st.tag(cur.pos, '50%', posName(cur.pos));
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = '맞아요 — ' + why(cur.pos);
        if (streak >= 3) { kit.pass(); return; }
        T.after(1200, () => ask());
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = why(cur.pos) + '. 한 번 더 봐요';
        T.after(1900, () => ask(false));
      }
    }
    onPress(lineBtn, () => answer(true)); onPress(spaceBtn, () => answer(false));
    onPress(again, () => { if (!busy) ask(false); });
    ui.stage.append(h('div', { class: 'cols k2-cols' }, h('div', { class: 'k2-panel' }, st.el), h('div', { class: 'pickcol' }, lineBtn, spaceBtn, h('div', { class: 'row' }, again, dots), msg)));
    T.after(400, () => ask());
    kit.setAuto(() => { if (!busy && cur) answer(isLine(cur.pos)); });
    const onKey = e => { if (e.key === '1' || e.key === 'ArrowLeft') answer(true); else if (e.key === '2' || e.key === 'ArrowRight') answer(false); };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 줄에 꿰인 음 / 칸에 앉은 음 — 12판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [];
    let i = -1, cur = null, gone = false, banner = false;
    ui.say('');
    const st = bigStaff(kit, { gap: 62 });
    const turtle = h('div', { class: 'k2-turtle' }, kit.friendImg('turtle', 'idle', { label: false }));
    const pose = ps => kit.setPose(turtle.firstChild, 'turtle', ps);
    const opts = h('div', { class: 'k2-opts' });
    const counter = h('div', { class: 'm-count' }), word = h('div', { class: 'm-word' });
    const scene = h('div', { class: 'k2-scene' }, h('div', { class: 'k2-gpanel' }, st.el), h('div', { class: 'k2-side' }, turtle, opts), counter, word);
    ui.stage.append(scene);
    const sc = startCard(ui, kit, {
      title: '줄에 꿰인 음, 칸에 앉은 음',
      lines: ['음표가 줄에 꿰였는지 칸에 앉았는지 골라요 — 뒤에는 몇째인지도', '12번 · 키보드 1 2 3 4'],
      onStart: () => T.after(300, next),
    });
    ui.stage.append(sc.card);
    const BIN = [[true, 'line', '줄에 꿰인 음'], [false, 'space', '칸에 앉은 음']];
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const pl = PLAN[i];
      if (i === 8 && !banner) {                         // 비틀기 들어가기 — 한 번 알려 주고
        banner = true; i--;
        st.clear(); opts.replaceChildren();
        sayWord(word, '이제 몇째인지 골라요 — 아래 줄부터 세요', 'info');
        T.after(2000, next);
        return;
      }
      const mine = cur = { ...pl, open: false, btns: [] };
      counter.textContent = `${i + 1} / ${PLAN.length}`; sayWord(word, '');
      st.clear(); opts.className = 'k2-opts' + (pl.opts ? ' num' : '');
      if (pl.opts) mine.btns = pl.opts.map(q => [q, h('button', { type: 'button', class: 'k2-opt' }, posName(q))]);
      else mine.btns = BIN.map(([v, ico, label]) => [v, h('button', { type: 'button', class: 'k2-opt bin' }, h('i', { class: 'k2-ico ' + ico, 'aria-hidden': 'true' }), label)]);
      mine.btns.forEach(([v, b], k) => onPress(b, () => choose(k)));
      opts.replaceChildren(...mine.btns.map(x => x[1]));
      const nt = st.note(pl.pos, '50%'); nt.n.classList.add('pop');
      pose('idle');
      const s = V.play(kit, [{ p: PITCH[pl.pos], d: 0.6 }], { inst: 'xylo' });
      T.after(kit.msUntil(s.ac, s.starts[0]) + 150, () => { if (cur === mine) mine.open = true; });
      T.after(kit.msUntil(s.ac, s.end) + 4200, () => { if (cur === mine && mine.open) choose(null); });
    }
    const want = c => (c.opts ? c.opts.indexOf(c.pos) : isLine(c.pos) ? 0 : 1);
    function choose(k) {
      if (!cur || !cur.open) return;
      cur.open = false;
      const ans = want(cur), right = k === ans;
      results.push(right);
      opts.classList.add('done');
      cur.btns[ans][1].classList.add('right');
      st.mark(cur.pos); st.tag(cur.pos, '50%', posName(cur.pos));
      if (right) { kit.sfx.good(engine); sayWord(word, '좋아', 'good'); pose('happy'); T.after(1000, next); return; }
      if (k != null) cur.btns[k][1].classList.add('miss');
      kit.sfx.oops(engine); sayWord(word, k == null ? '놓쳤어요' : '삐끗', 'oops'); pose('oops');
      T.after(1700, next);
    }
    function end() {
      const s = kit.scoreChoices(results, 5);
      const wrongAt = results.map((ok, k) => (ok ? -1 : k)).filter(k => k >= 0);
      const num = wrongAt.filter(k => k >= 8).length, sp = wrongAt.filter(k => k < 8 && !isLine(PLAN[k].pos)).length;
      let tip;
      if (!wrongAt.length) tip = '줄 음 · 칸 음도, 몇째 줄 · 몇째 칸도 모두 가려냈어요.';
      else if (num >= wrongAt.length / 2) tip = '몇째인지 고를 때(9번째부터) 헷갈렸어요. 줄과 칸은 맨 아래 줄부터 첫째, 둘째로 세요.';
      else if (sp >= wrongAt.length / 2) tip = '칸에 앉은 음을 더 많이 놓쳤어요. 칸 음은 위아래 두 줄에 닿아 있어요.';
      else tip = '줄에 꿰인 음을 더 많이 놓쳤어요. 줄 음은 줄이 음표 한가운데를 지나가요.';
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
    }
    kit.setAuto(() => { if (sc.waiting()) press(sc.btn); else if (cur && cur.open) choose(want(cur)); });
    const onKey = e => { const k = '1234'.indexOf(e.key); if (k >= 0 && cur && k < cur.btns.length) choose(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.cut(); window.removeEventListener('keydown', onKey); };
  },
};
