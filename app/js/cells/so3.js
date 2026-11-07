// 소3 길게·짧게 — 길이는 늘 가로 길이로(계획서 '화면 약속'). 소리가 나는 동안 막대가 가로로 자란다.
//  길이만 바꾼다: 한 짝 안에서 높이 · 세기 · 악기 · 연주법(들어가고 끝나는 모양 — _snd.js stacc)을 같게.
//  실로폰 · 피아노처럼 저절로 사라지는 소리는 길이가 안 들려 쓰지 않는다 — 플루트 · 리코더 · 목소리 · 바이올린(이어지는 소리)만.
//  근거: 아이는 소리를 못 듣는 게 아니라 이름을 못 붙인다. 길이는 높낮이와 함께 가장 약한 성질이라(Taebel 1974)
//  몸으로 늘이기(긴 소리 = 팔을 쭉 · 짧은 소리 = 톡)를 그림 옆에 붙여 보여 준다.
//  보기: 예시 넷(악기 넷 · 짧게→길게 / 길게→짧게) → 따라 하기: 세 번 이어서 맞히면 지남 → 확인 게임 '다람쥐 기차' 12판
//  따라 하기 · 확인 게임에서는 소리가 나는 동안 아무것도 움직이지 않는다(움직임이 길이를 알려 주면 귀 대신 눈으로 풀게 됨) — 고른 뒤에 막대로 보여 줌.
import { voice } from './_snd.js';

const MAXD = 1.5;                                     // 줄 끝까지 = 1.5초
const LONG = 0.6;                                     // 이보다 길면 '긴 소리'
const EXAMPLES = [
  { inst: 'flute', name: '플루트', p: 72, a: 0.25, b: 1.2 },
  { inst: 'recorder', name: '리코더', p: 67, a: 1.2, b: 0.25 },
  { inst: 'choir', name: '목소리', p: 64, a: 0.3, b: 1.2 },
  { inst: 'violin', name: '바이올린', p: 69, a: 1.2, b: 0.3 },
];
// 확인 게임 판 [길이(초), 악기, 높이] — 긴 소리 여섯 · 짧은 소리 여섯(칸마다 자리 여섯)
const PLAN = [
  // 소개 — 아주 긴 소리 ↔ 아주 짧은 소리(플루트 · 같은 솔)
  [1.2, 'flute', 67], [0.25, 'flute', 67], [0.25, 'flute', 67], [1.2, 'flute', 67],
  // 발전 — 차이를 줄임(0.8초 ↔ 0.35초) · 리코더
  [0.35, 'flute', 67], [0.8, 'flute', 67], [0.8, 'recorder', 67], [0.35, 'recorder', 67],
  // 비틀기 — 악기 · 높이가 바뀌어도 길이만(높고 긴 · 낮고 짧은 · 높고 짧은)
  [0.9, 'violin', 79], [0.3, 'choir', 60], [0.3, 'violin', 81],
  // 마무리 — 낮고 긴 소리
  [1.0, 'recorder', 60],
];
const isLong = d => d >= LONG;
const pct = d => Math.min(100, (d / MAXD) * 100);

// 몸 동작 말 — 그림 옆에 붙인다
const BODY = d => (isLong(d) ? '길게 — 팔을 쭉' : '짧게 — 톡');
// 막대 아이콘(단추 · 예시 카드) — 짧은 막대 / 긴 막대
const barIcon = (kit, long) => kit.h('span', { class: 'ln-icon ' + (long ? 'l' : 's'), 'aria-hidden': 'true' }, kit.h('i'));

// 가로 길이 줄 — 줄마다 막대 하나. 토끼가 자라는 막대 끝을 따라간다.
function lanes(kit, n) {
  const { h } = kit;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const bar = h('div', { class: 'ln-bar' });
    const tag = h('span', { class: 'ln-tag' });
    const ask = h('span', { class: 'ln-ask', hidden: true }, '?');
    const track = h('div', { class: 'ln-track' }, bar, tag, ask);
    rows.push({ el: h('div', { class: 'ln-row' }, n > 1 ? h('span', { class: 'ln-num' }, `${i + 1}`) : null, track), bar, tag, ask, track });
  }
  const bunny = h('div', { class: 'ln-bunny' }, kit.friendImg('bunny', 'idle', { label: false }));
  const el = h('div', { class: 'lanes n' + n }, ...rows.map(r => r.el), bunny);
  const pose = p => kit.setPose(bunny.firstChild, 'bunny', p);
  // 토끼 자리 = i번째 줄 막대 끝(d초 만큼 자란 곳)
  const bunnyTo = (i, d, sec) => {
    const r = rows[i], x = r.track.offsetLeft + r.track.clientWidth * pct(d) / 100, y = r.track.offsetTop + 6;
    bunny.style.transition = sec ? `left ${sec}s linear, top 180ms ease-out` : 'top 180ms ease-out';
    bunny.style.left = `${x}px`; bunny.style.top = `${y}px`;
  };
  const api = {
    el,
    reset() {
      for (const r of rows) { r.bar.style.transition = 'none'; r.bar.style.width = '0'; r.bar.classList.add('off'); r.tag.textContent = ''; r.tag.classList.remove('on'); r.ask.hidden = true; }
      bunnyTo(0, 0, 0); pose('idle');
    },
    // 소리와 함께 자라기(sec = 자라는 시간 · 소리 길이와 같게) — 다 자라면 몸 동작 말
    grow(i, d, sec = d, T = null) {
      const r = rows[i];
      r.ask.hidden = true;
      r.bar.style.transition = 'none'; r.bar.style.width = '0'; r.bar.classList.remove('off');
      void r.bar.offsetWidth;                         // 0에서 다시 자라게
      r.bar.style.transition = `width ${sec}s linear`;
      r.bar.style.width = pct(d) + '%';
      r.bar.classList.toggle('long', isLong(d));
      bunnyTo(i, 0, 0);
      void bunny.offsetLeft;                          // 막대 시작에서 출발하게
      bunnyTo(i, d, sec);
      pose('play');
      // 긴 막대는 막대 위 왼쪽에, 짧은 막대는 막대 끝 뒤에(줄 밖으로 넘치지 않게)
      const show = () => { r.tag.textContent = BODY(d); r.tag.style.left = pct(d) > 45 ? '14px' : `calc(${pct(d)}% + 14px)`; r.tag.classList.add('on'); };
      if (T) T.after(sec * 1000 + 60, show); else show();
    },
    ask(i) { rows[i].ask.hidden = false; },
    pose,
  };
  return api;
}

export default {
  // ── 보기: 예시 넷 ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    ui.say('소리가 길면 막대가 길게, 짧으면 짧게 자라요');
    const ln = lanes(kit, 2);
    const cards = EXAMPLES.map(ex => {
      const up = ex.b > ex.a;
      const btn = h('button', { type: 'button', class: 'excard' },
        h('b', {}, ex.name),
        h('span', { class: 'ln-pair' }, barIcon(kit, !up), up ? '짧게 → 길게' : '길게 → 짧게', barIcon(kit, up)));
      onPress(btn, () => {
        T.clear(); V.hush();
        ln.reset();
        const s = V.play([{ p: ex.p, d: ex.a, gap: 0.5 }, { p: ex.p, d: ex.b }], { inst: ex.inst });
        T.after(kit.msUntil(s.ac, s.starts[0]), () => ln.grow(0, ex.a, ex.a, T));
        T.after(kit.msUntil(s.ac, s.starts[1]), () => ln.grow(1, ex.b, ex.b, T));
        T.after(kit.msUntil(s.ac, s.end) + 200, () => ln.pose('happy'));
        btn.classList.add('heard');
      });
      return btn;
    });
    const hint = h('p', { class: 'ln-hint' }, '몸으로 따라 해요: 긴 소리는 팔을 쭉, 짧은 소리는 손뼉 톡');
    ui.stage.append(h('div', { class: 'cols' }, h('div', { class: 'ln-left' }, ln.el, hint), h('div', { class: 'exgrid' }, ...cards)));
    requestAnimationFrame(() => ln.reset());
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) cards[k++].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else kit.next(); });
    return () => { T.clear(); V.hush(); };
  },

  // ── 따라 하기: 이 소리는 길어요? 짧아요? — 세 번 이어서 맞히면 지남 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng();
    ui.say('이 소리는 길어요, 짧아요?');
    const ln = lanes(kit, 1);
    let streak = 0, cur = null, busy = true, last = null;
    const msg = h('p', { class: 'fmsg' });
    const longBtn = h('button', { type: 'button', class: 'pick ln-pick' }, barIcon(kit, true), '길어요');
    const shortBtn = h('button', { type: 'button', class: 'pick ln-pick' }, barIcon(kit, false), '짧아요');
    const again = h('button', { type: 'button' }, '다시 듣기');
    const dots = h('span', { class: 'streak' }, ...[0, 1, 2].map(() => h('i')));
    const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < streak));
    // 소리 하나 — show = 막대를 보며 듣기(틀린 뒤 다시 들려줄 때)
    function play(show) {
      busy = true; T.clear(); V.hush();
      ln.reset(); if (!show) ln.ask(0);
      const s = V.play([{ p: cur.p, d: cur.d }], { inst: 'flute' });
      if (show) T.after(kit.msUntil(s.ac, s.starts[0]), () => ln.grow(0, cur.d, cur.d, T));
      return s;
    }
    function ask() {
      // 같은 길이가 세 번 넘게 이어지지 않게
      let long = r() < 0.5;
      if (last && last.n >= 2 && last.long === long) long = !long;
      last = last && last.long === long ? { long, n: last.n + 1 } : { long, n: 1 };
      cur = { d: long ? [1.2, 1.0, 0.9][Math.floor(r() * 3)] : [0.25, 0.3][Math.floor(r() * 2)], p: [67, 72, 64][Math.floor(r() * 3)] };
      msg.textContent = '';
      const s = play(false);
      // 긴 소리는 다 듣기 전에도 길다는 게 들리니 0.65초가 지나면 고를 수 있게(짧은 소리는 끝난 뒤)
      T.after(kit.msUntil(s.ac, s.starts[0] + Math.min(cur.d, LONG + 0.05)), () => { busy = false; });
    }
    function answer(long) {
      if (busy || !cur) return;
      busy = true;
      const want = isLong(cur.d), right = long === want;
      ln.grow(0, cur.d, 0.35, T);                     // 고른 뒤에 길이를 막대로
      ln.pose(right ? 'happy' : 'oops');
      if (right) {
        kit.sfx.good(engine); streak++; paint();
        msg.textContent = want ? '맞아요 — 길게 이어진 소리예요' : '맞아요 — 톡 짧게 끝난 소리예요';
        if (streak >= 3) { kit.pass(); return; }
        T.after(1000, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; paint();
        msg.textContent = want ? '길게 이어진 소리였어요. 막대를 보며 다시 들어 봐요' : '짧게 끝난 소리였어요. 막대를 보며 다시 들어 봐요';
        // 막대가 자라는 것을 보며 한 번 더 듣고 → 새 소리
        T.after(1300, () => { const s = play(true); T.after(kit.msUntil(s.ac, s.end) + 900, ask); });
      }
    }
    onPress(longBtn, () => answer(true)); onPress(shortBtn, () => answer(false));
    onPress(again, () => { if (!busy && cur) { const s = play(false); T.after(kit.msUntil(s.ac, s.end), () => { busy = false; }); } });
    ui.stage.append(h('div', { class: 'cols' }, h('div', { class: 'ln-left' }, ln.el), h('div', { class: 'pickcol' }, longBtn, shortBtn, h('div', { class: 'row' }, again, dots), msg)));
    requestAnimationFrame(() => ln.reset());
    T.after(450, ask);
    kit.setAuto(() => { if (!busy && cur) answer(isLong(cur.d)); });
    const onKey = e => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === '1') answer(true);
      else if (e.key === 'ArrowRight' || e.key === '2') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 다람쥐 기차 — 긴 소리면 긴 칸, 짧은 소리면 짧은 칸 · 12판 ──
  game(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine);
    const results = [], picks = [];
    let i = -1, cur = null, open = false, gone = false;
    ui.say('');
    const seats = n => Array.from({ length: n }, () => h('i', { class: 'tr-seat' }));
    const longSeats = seats(6), shortSeats = seats(6);
    const wheels = n => h('div', { class: 'tr-wheels' }, ...Array.from({ length: n }, () => h('i')));
    const longCar = h('button', { type: 'button', class: 'tr-car long', 'aria-label': '긴 칸 — 긴 소리' },
      h('div', { class: 'tr-win' }, ...longSeats), h('span', { class: 'tr-name' }, '긴 칸'), wheels(3));
    const shortCar = h('button', { type: 'button', class: 'tr-car short', 'aria-label': '짧은 칸 — 짧은 소리' },
      h('div', { class: 'tr-win' }, ...shortSeats), h('span', { class: 'tr-name' }, '짧은 칸'), wheels(2));
    const driver = h('div', { class: 'tr-driver' }, kit.friendImg('bunny', 'idle', { label: false }));
    const loco = h('div', { class: 'tr-loco' }, h('div', { class: 'tr-cab' }, driver), h('div', { class: 'tr-boiler' }, h('i', { class: 'tr-chim' })), wheels(3));
    const train = h('div', { class: 'tr-train' }, longCar, h('i', { class: 'tr-link' }), shortCar, h('i', { class: 'tr-link' }), loco);
    const sq = h('div', { class: 'tr-sq', html: SQUIRREL });
    const laneBar = h('div', { class: 'tr-lbar' }), laneTag = h('span', { class: 'tr-ltag' });
    const lane = h('div', { class: 'tr-lane' }, laneBar, laneTag);
    const counter = h('div', { class: 'tr-count' });
    const word = h('div', { class: 'tr-word' });
    const scene = h('div', { class: 'tr-scene' }, h('div', { class: 'tr-ground' }), h('div', { class: 'tr-rail' }), lane, train, sq, counter, word);
    const start = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '다람쥐 기차'),
      h('p', { class: 'sub' }, '긴 소리면 긴 칸, 짧은 소리면 짧은 칸을 눌러요'),
      h('p', { class: 'sub' }, '12번 · 키보드 ← → 도 돼요')));
    ui.stage.append(scene, start);
    const pose = p => kit.setPose(driver.firstChild, 'bunny', p);
    const startBtn = h('button', { type: 'button', class: 'go huge' }, '시작');
    onPress(startBtn, () => { start.remove(); ui.setBar(); T.after(300, next); });
    ui.setBar(startBtn);
    kit.setAuto(() => { if (start.isConnected) startBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); else if (open) answer(isLong(cur.d)); });

    // 긴 칸 너비 = 1.2초 막대(소리 막대와 기차 칸 길이가 같은 자로 보이게)
    const pxPerSec = () => longCar.offsetWidth / 1.2;
    function next() {
      if (gone) return;
      i++;
      if (i >= PLAN.length) return end();
      const [d, inst, p] = PLAN[i];
      cur = { d, inst, p };
      counter.textContent = `${i + 1} / ${PLAN.length}`;
      word.textContent = '';
      lane.classList.remove('on'); laneBar.style.width = '0'; laneTag.textContent = '';
      sq.className = 'tr-sq'; sq.style.transform = '';
      void sq.offsetWidth; sq.classList.add('in');   // 다음 다람쥐가 톡 나타남
      pose('idle');
      open = false;
      T.after(550, () => {
        if (gone) return;
        const s = V.play([{ p, d }], { inst });
        T.after(kit.msUntil(s.ac, s.starts[0]), () => { open = true; });
        T.after(kit.msUntil(s.ac, s.end) + 3000, () => { if (open) answer(null); });   // 3초 넘게 고르지 않으면 놓침
      });
    }
    function answer(long) {
      if (!open) return;
      open = false;
      const want = isLong(cur.d), right = long === want;
      results.push(right); picks.push(long);
      // 소리 길이를 막대로(긴 칸과 같은 자) + 이름
      lane.classList.add('on');
      laneBar.style.width = `${Math.round(cur.d * pxPerSec())}px`;
      laneTag.textContent = want ? '긴 소리' : '짧은 소리';
      if (right) { kit.sfx.good(engine); pose('happy'); word.textContent = '좋아'; word.dataset.k = 'good'; }
      else {
        kit.sfx.oops(engine); pose('oops'); word.textContent = long == null ? '놓쳤어요' : '삐끗'; word.dataset.k = 'oops';
        if (long != null) { const wrongCar = long ? longCar : shortCar; wrongCar.classList.remove('nope'); void wrongCar.offsetWidth; wrongCar.classList.add('nope'); }
      }
      // 다람쥐는 맞는 칸으로 폴짝
      const seat = (want ? longSeats : shortSeats).find(s => !s.classList.contains('on'));
      T.after(right ? 250 : 650, () => {
        if (gone || !seat) return;
        const a = sq.getBoundingClientRect(), b = seat.getBoundingClientRect();
        sq.classList.add('hop');
        sq.style.transform = `translate(${(b.left + b.width / 2 - (a.left + a.width / 2)).toFixed(0)}px, ${(b.top + b.height / 2 - (a.top + a.height / 2)).toFixed(0)}px) scale(.62)`;
        T.after(380, () => { seat.classList.add('on'); seat.innerHTML = SQUIRREL; sq.className = 'tr-sq gone'; });
      });
      T.after(right ? 1100 : 1700, next);
    }
    function end() {
      open = false;
      lane.classList.remove('on'); word.textContent = '';
      pose('happy');
      train.classList.add('leave');                   // 다람쥐를 다 태우고 떠남 → 결과
      T.after(1500, () => {
        const s = kit.scoreChoices(results, 5);
        const wrong = results.filter(x => !x).length;
        const missL = PLAN.filter((p, k) => !results[k] && isLong(p[0])).length;
        const missS = wrong - missL;
        const twist = [8, 9, 10, 11].filter(k => !results[k]).length;
        const dev = [4, 5, 6, 7].filter(k => !results[k]).length;
        let tip;
        if (!wrong) tip = '악기와 높이가 바뀌어도 길이만 듣고 골랐어요.';
        else if (twist >= Math.ceil(wrong / 2)) tip = '악기와 높이가 바뀐 소리(9번째부터)에서 헷갈렸어요. 높이 말고 소리가 이어지는 동안만 들어 봐요.';
        else if (dev >= Math.ceil(wrong / 2)) tip = '길이 차이가 줄었을 때(5~8번째) 헷갈렸어요. 소리가 나는 동안 팔을 쭉 펴 보면 잘 느껴져요.';
        else if (missL > missS) tip = '긴 소리를 짧은 칸에 더 많이 넣었어요. 소리가 끝날 때까지 기다렸다가 골라요.';
        else tip = '짧은 소리를 긴 칸에 더 많이 넣었어요. 톡 하고 바로 끝나면 짧은 소리예요.';
        kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, facts: [`가장 길게 이어서 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip });
      });
    }
    onPress(longCar, () => answer(true)); onPress(shortCar, () => answer(false));
    const onKey = e => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === '1') answer(true);
      else if (e.key === 'ArrowRight' || e.key === '2') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.hush(); window.removeEventListener('keydown', onKey); };
  },
};

// 다람쥐(납작한 단색 · 잉크 외곽선) — 확인 게임 손님
const SQUIRREL = `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M50 70 C78 66 80 34 66 20 C57 11 43 16 48 28 C54 40 63 50 47 60 Z" fill="#A85A2A" stroke="#3B2A1E" stroke-width="3.2" stroke-linejoin="round"/><path d="M60 26 C66 32 68 44 62 54" fill="none" stroke="#7E4320" stroke-width="3" stroke-linecap="round"/><ellipse cx="33" cy="56" rx="16" ry="16" fill="#C9773D" stroke="#3B2A1E" stroke-width="3.2"/><ellipse cx="32" cy="60" rx="9" ry="10" fill="#F3E6CF"/><path d="M19 24 L21 11 L30 21 Z" fill="#C9773D" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/><circle cx="29" cy="34" r="14" fill="#C9773D" stroke="#3B2A1E" stroke-width="3.2"/><ellipse cx="25" cy="39" rx="7" ry="5.5" fill="#F3E6CF"/><circle cx="24" cy="32" r="2.6" fill="#3B2A1E"/><circle cx="34" cy="32" r="2.6" fill="#3B2A1E"/><ellipse cx="25" cy="38" rx="2.4" ry="1.9" fill="#3B2A1E"/></svg>`;
