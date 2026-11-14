// 듣고 고르기 칸 공용 틀(11-14) — 소6 같은 악기·다른 악기 · 형1 같은 가락·다른 가락 · 화1 하나씩·함께
//  세 칸은 모양이 같다: 소리 도막(하나 또는 둘)을 듣고 → 단추 둘(셋) 가운데 하나를 고름 → 고른 뒤에 소리 그림이 열림.
//  칸 파일은 '무엇을 들려주고 무엇이 답인가'(문항 표 · 도막 만들기 · 글)만 적고, 보기 · 연습 · 확인 게임 · TV 소리 모드는 여기서 만든다.
//  소리 그림: 가로 = 시간 · 세로 = 높이 · 굵기 = 세기 · 무늬 = 악기(첫째 악기 = 채움 · 둘째 = 테두리만 · 셋째 = 회색).
//    듣는 동안에는 지나가는 띠만 보이고(그림으로 답을 읽지 못하게) 고른 뒤에 열린다. 보기 단계는 처음부터 열려 있다.
//  한 도막 안의 줄(lines)은 같은 때에 함께 난다 — 화1 '함께'가 이것.
//  모양은 app/css/cells/_pick.css(세 칸이 같이 씀 · 처음 불릴 때 한 번 붙임)
//
//  pickCell(C) — C = {
//    friend            친구 키(색 · 그림)
//    keys              답 키 차례(단추 차례 = 키보드 1 2 3)
//    label(key, lo)    단추 글(lo = 1~2학년 판)  ·  chip(key)? 단추 그림(svg 글)
//    lock?             { key, at, tell(lo) } — 확인 게임에서 at번째 판부터 나타나는 단추(연습에서는 처음부터 보임)
//    rightOf(row)      그 판의 답 키
//    build(row, lo)    → [{ lines: [음 줄, …], cap }] 도막(둘이면 사이에 GAP초 쉼) · 화면 · 소리 없이 표만 만들어야 함(시험이 부름)
//    names(row, lo)    도막 이름(['첫째', '둘째'])
//    say               { show, follow, game, kid }(lo) → 맨 위 한 줄
//    wrong(row, lo)    틀렸을 때 사실 한 줄
//    EX(lo)            보기 카드 [{ title, sub, row }]  ·  note(lo)? 보기 화면의 작은 알림
//    pool              연습 문항(여기서 무작위 · flip이 있으면 반은 뒤집음)  ·  passText
//    game              { title | title(lo), sub(lo) } 시작 창
//    PLAN · CUTS · SHUF · GUESS? · tipOf(plan, results, picks)
//  }
import { voice, exGroup, nowCard, pal, pose } from './_snd.js';
import { tvsGame } from './_tvs.js';

(() => {
  if (typeof document === 'undefined' || document.querySelector('link[data-pick]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'app/css/cells/_pick.css'; l.dataset.pick = '1';
  document.head.append(l);
})();

export const BEAT = 0.42, GAP = 0.5;
// 가락 [[음 높이(없으면 쉼), 박 수], …] → 음 줄. 음 사이 틈은 박의 8%(셈1과 같음)
export const line = (mel, { inst = 'piano', vel = 0.6, shift = 0, beat = BEAT } = {}) =>
  mel.map(([p, b]) => ({ p: p == null ? null : p + shift, d: b * beat * 0.92, gap: b * beat * 0.08, vel, inst }));
export const lineSec = ln => ln.reduce((a, n) => a + n.d + (n.gap ?? 0.12), 0);
export const segLen = sg => Math.max(...sg.lines.map(lineSec));
export const segSec = segs => segs.reduce((t, sg, k) => t + segLen(sg) + (k === segs.length - 1 ? 0 : GAP), 0);
// 헷갈리는 두 소리(NEAR)용 — 도막들을 받은 소리 길로 틀고 끝날 때까지 초를 돌려줌(소리 엔진만 씀 · 화면 X)
export const nearSegs = segs => (kit, out) => {
  const ac = kit.engine.ensure();
  let at = 0.05;
  segs.forEach((sg, k) => {
    for (const ln of sg.lines) {
      let t = ac.currentTime + at;
      for (const n of ln) { if (n.p != null) kit.engine.note(n.inst, n.p, t, n.d, n.vel, out, null); t += n.d + (n.gap ?? 0.12); }
    }
    at += segLen(sg) + (k === segs.length - 1 ? 0 : GAP);
  });
  return at;
};

const INST_KO = { piano: '피아노', xylo: '실로폰', marimba: '마림바', recorder: '리코더', flute: '플루트', clarinet: '클라리넷', oboe: '오보에',
  trumpet: '트럼펫', horn: '호른', violin: '바이올린', cello: '첼로', harp: '하프', glock: '글로켄슈필', celesta: '첼레스타' };
export const instName = k => INST_KO[k] || k;

// 소리 그림 띠 — 도막마다 상자 하나
function strip(kit) {
  const { h } = kit;
  const el = h('div', { class: 'pk-strip' });
  let segs = [], gen = 0, longest = 1;
  const quiet = () => { for (const s of segs) for (const a of s.head.getAnimations()) a.cancel(); };
  return {
    el,
    set(list, names, open = false) {
      quiet(); gen++;
      const all = list.flatMap(sg => sg.lines.flat()).filter(n => n.p != null);
      const lo = Math.min(...all.map(n => n.p)), hi = Math.max(...all.map(n => n.p));
      const insts = [...new Set(all.map(n => n.inst))], ix = inst => Math.min(insts.indexOf(inst), 2);
      longest = Math.max(...list.map(segLen));
      segs = list.map((sg, k) => {
        const head = h('i', { class: 'pk-head' }), pic = h('div', { class: 'pk-pic' }, head), mine = [];
        for (const ln of sg.lines) {
          let t = 0;
          for (const n of ln) {
            if (n.p != null) {
              const w = 6 + Math.round(n.vel * 16), y = hi === lo ? 0.5 : (hi - n.p) / (hi - lo);
              if (!mine.includes(n.inst)) mine.push(n.inst);
              pic.append(h('i', { class: 'pk-n k' + ix(n.inst), style: {
                left: (t / longest * 100).toFixed(2) + '%', width: Math.max(1.5, n.d / longest * 100).toFixed(2) + '%',
                top: `calc((100% - ${w}px) * ${y.toFixed(3)})`, height: w + 'px' } }));
            }
            t += n.d + (n.gap ?? 0.12);
          }
        }
        const leg = h('span', { class: 'pk-leg' }, ...mine.map(inst => h('span', { class: 'pk-in' }, h('i', { class: 'pk-sw k' + ix(inst) }), instName(inst))));
        const box = h('div', { class: 'pk-seg' + (open ? ' open' : '') }, h('b', { class: 'pk-name' }, names[k] || ''), pic,
          h('div', { class: 'pk-foot' }, leg, h('span', { class: 'pk-cap' }, sg.cap || '')));
        return { box, head, len: segLen(sg) };
      });
      el.replaceChildren(...segs.map(s => s.box));
    },
    begin() { quiet(); return ++gen; },
    // 지나가는 띠 — at초 뒤부터 len초 동안 왼쪽에서 오른쪽으로(끝나면 다시 숨음)
    run(k, at, len) {
      const s = segs[k];
      if (!s) return;
      s.head.animate([{ transform: 'translateX(-100%)' }, { transform: `translateX(${((len / longest - 1) * 100).toFixed(2)}%)` }], { duration: len * 1000, delay: at * 1000, easing: 'linear' });
    },
    now(k, g) { if (g === gen) segs.forEach((s, a) => s.box.classList.toggle('now', a === k)); },
    reveal() { for (const s of segs) s.box.classList.add('open'); },
    stop() { quiet(); gen++; for (const s of segs) s.box.classList.remove('now'); },
  };
}

// 도막들을 틀고 그림을 맞춤 → 끝날 때까지 ms
function playSegs(kit, V, T, S, segs, at0 = 0.1) {
  kit.engine.ensure();
  const g = S.begin();
  let at = at0;
  segs.forEach((sg, k) => {
    for (const ln of sg.lines) V.play(ln, { at, art: null });
    const len = segLen(sg), my = at;
    S.run(k, my, len);
    T.after(my * 1000, () => S.now(k, g));
    at += len + (k === segs.length - 1 ? 0 : GAP);
  });
  T.after(at * 1000, () => S.now(-1, g));
  return at * 1000;
}

const POP = [{ transform: 'scale(.7)' }, { transform: 'scale(1.05)', offset: 0.7 }, { transform: 'none' }];

export function pickCell(C) {
  const items = (lo, lockOn) => C.keys.map(k => ({ key: k, label: C.label(k, lo), chip: C.chip ? C.chip(k) : null, locked: !!(lockOn && C.lock && C.lock.key === k) }));
  const chance = plan => (C.GUESS ? C.GUESS(plan) : plan.map(() => 1 / C.keys.length));
  const root = (kit, cls, ...kids) => kit.h('div', { class: 'pk ' + cls, style: { '--pk': `var(--${C.friend})`, '--pk-t': `var(--${C.friend}-t)` } }, ...kids);
  const palBox = kit => kit.h('div', { class: 'pk-pal' }, pal(kit, C.friend));
  const face = (kit, box, p) => pose(kit, box.firstChild, C.friend, p);
  const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  const keyOf = e => (e.repeat || e.ctrlKey || e.metaKey || e.altKey ? null : C.keys[Number(e.key) - 1] || null);

  // ── 보기 — 카드를 누르면 그 소리가 나고 그림이 바로 보임 ──
  function show(ui, kit) {
    const { h, onPress } = kit, T = kit.timers(), V = voice(kit.engine), lo = kit.band === 'low';
    ui.say(C.say.show(lo));
    const S = strip(kit), fr = palBox(kit), EX = C.EX(lo);
    const cards = EX.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard pk-ex' }, h('b', {}, ex.title), h('span', {}, ex.sub));
      onPress(btn, () => {
        T.clear(); V.hush(); nowCard(cards, btn);
        const segs = C.build(ex.row, lo);
        S.set(segs, C.names(ex.row, lo), true);
        const end = playSegs(kit, V, T, S, segs);
        face(kit, fr, 'play');
        T.after(end + 100, () => { nowCard(cards, null); face(kit, fr, 'idle'); });
        btn.classList.add('heard');
      });
      return btn;
    });
    S.set(C.build(EX[0].row, lo), C.names(EX[0].row, lo), true);
    const grid = exGroup(kit, cards, 'exgrid pk-exgrid');
    if (C.note) grid.firstChild.append(h('span', { class: 'pk-note' }, C.note(lo)));
    const el = root(kit, 'pk-show', h('div', { class: 'pk-top' }, S.el, fr), grid);
    el.style.setProperty('--pk-n', String(cards.length));
    ui.stage.append(el);
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) press(cards[k++]); else kit.next(); });
    return () => { T.clear(); V.hush(); S.stop(); };
  }

  // ── 연습 — 세 번 이어서 맞히면 통과 ──
  function follow(ui, kit) {
    const { h, onPress, engine } = kit, T = kit.timers(), V = voice(engine), r = kit.rng(), lo = kit.band === 'low';
    ui.say(C.say.follow(lo));
    const S = strip(kit), fr = palBox(kit);
    const A = kit.answers(items(lo, false), k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(root(kit, 'pk-play', h('div', { class: 'pk-left' }, S.el, fr), A.el));
    ui.setBar(again);
    let streak = 0, cur = null, segs = null, open = false, live = false, passed = false, tok = 0, lastKey = '';
    const hist = [];
    function pickRow() {
      for (let t = 0; t < 40; t++) {
        let row = C.pool[Math.floor(r() * C.pool.length)];
        if (C.SHUF.flip && r() < 0.5) row = C.SHUF.flip(row);
        const key = JSON.stringify(row), a = C.rightOf(row), n = hist.length;
        if (key === lastKey) continue;
        if (n >= 2 && hist[n - 1] === a && hist[n - 2] === a) continue;
        lastKey = key; hist.push(a);
        return row;
      }
      return C.pool[0];
    }
    function hear() {
      const my = ++tok;
      open = false; A.busy(true); V.hush();
      const end = playSegs(kit, V, T, S, segs);
      T.after(end, () => { if (my === tok && !passed) { open = true; A.busy(false); } });
    }
    function ask() {
      if (passed) return;
      cur = pickRow(); segs = C.build(cur, lo); live = true;
      S.set(segs, C.names(cur, lo));
      A.clear(); face(kit, fr, 'idle');
      hear();
    }
    function answer(k) {
      if (!open || !cur) return;
      open = false; live = false; tok++;
      const want = C.rightOf(cur), ok = k === want;
      A.mark(k, ok ? 'right' : 'wrong');
      if (!ok) A.reveal(want);
      S.reveal();
      if (ok) {
        kit.sfx.good(engine); streak++; ui.practice(streak); ui.tell('맞아요', 'good'); face(kit, fr, 'happy');
        if (streak >= 3) { passed = true; kit.pass(C.passText); return; }
        T.after(1300, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0); ui.tell(C.wrong(cur, lo), 'oops', 2000); face(kit, fr, 'oops');
        T.after(2200, ask);
      }
    }
    onPress(again, () => { if (live && !passed) hear(); });
    const onKey = e => { const k = keyOf(e); if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    T.after(300, ask);
    kit.setAuto(() => { if (open && cur) answer(C.rightOf(cur)); });
    return () => { passed = true; T.clear(); V.hush(); S.stop(); window.removeEventListener('keydown', onKey); };
  }

  // ── 소리는 TV 하나 · 답은 각자 ──
  const tvsSpec = (ui, kit) => {
    const lo = kit.band === 'low', open = row => 300 + Math.round(segSec(C.build(row, lo)) * 1000);
    return {
      plan: sd => kit.stageShuffle(C.PLAN, C.CUTS, kit.rng(sd), C.SHUF),
      OPEN: open, CLOSE: row => open(row) + 3000, P: row => open(row) + 3800,
      say: { kid: C.say.kid(lo), tv: '소리는 TV에서 — 아이들은 각자 기기로 골라요' },
      items: items(lo, true),
      setup: (row, A, k) => {
        if (!C.lock || k < C.lock.at) return;
        A.lock(C.lock.key, false);                      // 늦게 들어온 기기도 지금 판에 맞게
        if (k === C.lock.at) { A.btn(C.lock.key).animate(POP, { duration: 360, easing: 'ease-out' }); ui.tell(C.lock.tell(lo), 'info', 1800); }
      },
      rightOf: C.rightOf,
      segs: row => C.build(row, lo),                    // 시험이 소리 내용을 직접 봄(tests/pick.test.mjs)
      wrongText: row => C.wrong(row, lo),
      view({ kidSide, V, T, side }) {
        const S = strip(kit), fr = palBox(kit);
        return {
          el: root(kit, 'pk-play', kit.h('div', { class: 'pk-left' }, S.el, fr), side),
          item: row => { S.set(C.build(row, lo), C.names(row, lo)); face(kit, fr, 'idle'); },
          play: (row, at) => playSegs(kit, V, T, S, C.build(row, lo), at),
          close: (row, res) => { S.reveal(); face(kit, fr, !kidSide || res ? 'happy' : res === false ? 'oops' : 'idle'); },
          done: () => { S.stop(); fr.hidden = true; },
        };
      },
      tip: C.tipOf,
      chance,
    };
  };

  // ── 확인 게임 — 12판 ──
  function game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));
    const { h, onPress, engine } = kit, T = kit.timers(), V = voice(engine), lo = kit.band === 'low';
    ui.say(C.say.game(lo));
    const S = strip(kit), fr = palBox(kit);
    const A = kit.answers(items(lo, true), k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(root(kit, 'pk-play', h('div', { class: 'pk-left' }, S.el, fr), A.el));
    const results = [], picks = [];
    let plan = C.PLAN, sd = null, i = -1, cur = null, segs = null, open = false, live = false, tok = 0, gone = false;
    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, typeof C.game.title === 'function' ? C.game.title(lo) : C.game.title),
      h('p', { class: 'sub' }, C.game.sub(lo)),
      h('p', { class: 'sub' }, `${C.PLAN.length}판 · 다시 듣기는 몇 번이든 돼요`)));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(go, () => {
      sd = kit.seed ? kit.seed() : 1;
      plan = kit.stageShuffle(C.PLAN, C.CUTS, kit.rng(sd), C.SHUF);
      card.remove(); ui.setBar(again); next();
    });
    ui.setBar(go);
    function hear() {
      const my = ++tok;
      open = false; A.busy(true); V.hush();
      const end = playSegs(kit, V, T, S, segs);
      T.after(end, () => { if (my === tok && !gone) { open = true; A.busy(false); } });
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      cur = plan[i]; segs = C.build(cur, lo); live = true;
      ui.count(i + 1, plan.length);
      S.set(segs, C.names(cur, lo));
      A.clear(); open = false; A.busy(true); face(kit, fr, 'idle');
      let wait = 250;
      if (C.lock && i === C.lock.at) {                  // 이 판부터 단추가 하나 더(자리는 처음부터 있었음)
        A.lock(C.lock.key, false);
        A.btn(C.lock.key).animate(POP, { duration: 360, easing: 'ease-out' });
        ui.tell(C.lock.tell(lo), 'info', 1800);
        wait = 1700;
      }
      T.after(wait, () => { if (!gone) hear(); });
    }
    function answer(k) {
      if (!open || !cur) return;
      const b = A.btn(k);
      if (!b || b.classList.contains('locked')) return;
      open = false; live = false; tok++;
      const want = C.rightOf(cur), ok = k === want;
      results.push(ok); picks.push(k);
      A.mark(k, ok ? 'right' : 'wrong');
      if (!ok) A.reveal(want);
      S.reveal();
      if (ok) { kit.sfx.good(engine); ui.tell('맞아요', 'good', 900); face(kit, fr, 'happy'); }
      else { kit.sfx.oops(engine); ui.tell(C.wrong(cur, lo), 'oops', 1800); face(kit, fr, 'oops'); }
      T.after(ok ? 900 : 1800, next);
    }
    function end() {
      live = false;
      ui.tell(null); ui.count(null); A.clear(); A.busy(false); ui.setBar(); S.stop(); fr.hidden = true;
      const s = kit.scoreChoices(results, 5, { chance: chance(plan) }), tip = C.tipOf(plan, results, picks);
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
    }
    onPress(again, () => { if (live && !gone) hear(); });
    const onKey = e => { const k = keyOf(e); if (k && !card.isConnected) answer(k); };
    window.addEventListener('keydown', onKey);
    kit.setAuto(() => { if (card.isConnected) press(go); else if (open && cur) answer(C.rightOf(cur)); });
    return () => { gone = true; T.clear(); V.hush(); S.stop(); window.removeEventListener('keydown', onKey); };
  }

  return { mod: { show, follow, game }, tvsSpec };
}
