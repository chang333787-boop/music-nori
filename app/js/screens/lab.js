// 악보 판 — 악보에 기호를 넣었다 빼며, 무엇이 달라지는지 보고 듣는 곳(docs/flow.md)
//  · 맞고 틀림이 없다. 기호를 고르고 → 악보의 자리를 누르면 들어가고, 한 번 더 누르면 빠진다.
//  · 넣거나 빼면 그 마디가 한 번 들린다. 가락 전체는 [듣기] 하나로.
//  · 넣은 기호는 가락마다 이 화면에 있는 동안만 기억한다(기기에 저장하지 않음).
//  규칙 · 소리 계산은 engine/marks.js(화면 없이 시험), 여기는 그리기와 누르기만.
import { h, svg, onPress, josa } from '../util.js';
import { Player } from '../audio.js';
import { friendImg, setPose, preload } from '../band.js';
import { renderScore, staffPos } from '../notation.js';
import { GROUPS, SIGNS, groupById, signById, signsOf, PHRASES, phraseById, emptyMarks, countMarks, places, has, hasMeter, toggle, perform, scoreOf, factOf, orderOf } from '../../../engine/marks.js';
import { solfege } from '../../../engine/theory.js';

const INTRO = {
  dyn: '셈여림 — 소리를 얼마나 세게 낼지 알려 주는 기호예요.',
  tempo: '빠르기 — 곡을 얼마나 빠르게 연주할지 알려 주는 말이에요.',
  inst: '악기 소리 — 같은 가락도 악기에 따라 소리의 빛깔이 달라요.',
  len: '음의 길이 — 소리를 쉬거나, 잇거나, 끊거나, 늘이는 기호예요.',
  repeat: '되풀이 — 어디로 돌아가고, 어디를 건너뛰고, 어디서 마칠지 연주 차례를 알려 주는 기호예요.',
  meter: '박자 — 한 마디에 박이 몇 개 들어가는지 알려 주는 숫자예요.',
  key: '조 — 가락을 다른 조로 옮기거나, 음 하나를 반음 올리고 내리는 기호예요.',
  chord: '화음 — 가락 아래에 다른 소리를 함께 울려 어울리게 하는 것이에요.',
};
const PICK = {
  tempo: '빠르기말을 골라요 — 곡 전체의 빠르기가 바뀌어요',
  inst: '악기를 골라요 — 같은 가락을 다른 악기 소리로 들어요 · 북 반주도 넣어 봐요',
  meter: '박자표를 골라요 — 마디줄 자리와 센박이 달라져요',
  key: '[조 옮기기]를 누르거나, 올림표 · 내림표를 골라 음을 눌러요',
  chord: '[둘째 줄] · [조 옮기기]를 누르거나, 화음을 골라 마디를 눌러요',
};
const ORDER_KINDS = new Set(['repeat', 'volta', 'dc', 'fine']);     // 연주 차례를 바꾸는 기호 — 저절로 들려주지 않고 [듣기]로 처음부터
const VW = 760, VH = 180;                      // 악보 그림의 크기(그림 단위) — 화면에서는 틀에 맞춰 커진다

const pt = (w, pair) => josa(w, pair).slice(String(w).length);        // 조사만
// 가락 이름 — 외국 말 제목은 어느 나라 무슨 노래인지를 앞에(「프랑스 민요 · Au clair de la lune 앞 도막」)
const phraseName = ph => {
  const m = ph.title.match(/^(.*?)\(([^)]*)\)\s*$/);
  const t = (m ? m[1] : ph.title).trim();
  const name = t.includes(ph.part) ? t : t + ' · ' + ph.part;
  return m && /^[A-Za-z\u00C0-\u00FF]/.test(t) ? m[2] + ' · ' + name : name;
};

// 단추 안의 작은 기호 그림(글꼴에 없는 기호는 선으로 그림)
const ico = (w, hgt, ...kids) => svg('svg', { class: 'sl-ico', viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, 'aria-hidden': 'true' }, ...kids);
const head = (x, y) => svg('ellipse', { cx: x, cy: y, rx: 5.6, ry: 4.1, transform: `rotate(-20 ${x} ${y})`, class: 'fl' });
function symOf(s, ph) {
  switch (s.kind) {
    case 'letter': return h('span', { class: 'sl-dynl' }, s.sym);
    case 'hair': return ico(48, 20, svg('path', { d: s.id === 'cresc' ? 'M45 3L3 10L45 17' : 'M3 3L45 10L3 17', class: 'ln' }));
    case 'accent': return ico(28, 20, svg('path', { d: 'M4 4L24 10L4 16', class: 'ln' }));
    case 'rest': return h('span', { class: 'sl-glyph' }, '\u{1D13D}');
    case 'tie': return ico(48, 26, head(9, 8), head(39, 8), svg('path', { d: 'M12 15Q24 25 36 15', class: 'ln' }));
    case 'stacc': return ico(28, 26, head(14, 8), svg('circle', { cx: 14, cy: 20, r: 2.4, class: 'fl' }));
    case 'fermata': return ico(32, 22, svg('path', { d: 'M4 19a12 13 0 0 1 24 0', class: 'ln' }), svg('circle', { cx: 16, cy: 16, r: 2.6, class: 'fl' }));
    case 'repeat': return ico(30, 26, svg('circle', { cx: 6, cy: 9, r: 2.4, class: 'fl' }), svg('circle', { cx: 6, cy: 17, r: 2.4, class: 'fl' }), svg('path', { d: 'M14 2V24', class: 'ln' }), svg('path', { d: 'M22 2V24', class: 'ln thick' }));
    case 'tchange': return h('span', { class: 'sl-ital' }, s.sym);
    case 'meter': return h('span', { class: 'sl-ts' }, h('span', {}, String(s.meter[0])), h('span', {}, String(s.meter[1])));
    case 'keyup': return ico(44, 26, ...[3, 8, 13, 18, 23].map(y => svg('path', { d: `M2 ${y}H42`, class: 'ln hair' })), svg('text', { x: 22, y: 9, 'text-anchor': 'middle', class: 'tx acc' }, '♯'));
    case 'acc': return h('span', { class: 'sl-accg' }, s.sym);
    case 'second': return ico(44, 26, head(9, 6), head(23, 3), head(37, 6), head(9, 15), head(23, 12), head(37, 15));
    case 'chord': return h('span', { class: 'sl-roman' }, s.sym);
    case 'volta': return ico(52, 26, svg('path', { d: 'M3 24V4H24V24', class: 'ln' }), svg('path', { d: 'M29 24V4H50', class: 'ln' }), svg('text', { x: 6, y: 18, class: 'tx' }, '1.'), svg('text', { x: 32, y: 18, class: 'tx' }, '2.'));
    case 'dc': case 'fine': return h('span', { class: 'sl-ital' }, s.sym);
    default: return null;
  }
}
function chipKids(s, ph) {
  if (s.kind === 'tempo') return [h('span', { class: 'sl-word' }, s.name), h('span', { class: 'sl-sub' }, h('span', { class: 'sl-q' }, '♩'), ` = ${s.base ? ph.tempo : s.bpm}`)];
  if (s.kind === 'inst' || s.kind === 'drum') return [h('span', { class: 'sl-word' }, s.name)];
  return [h('span', { class: 'sl-sym', 'aria-hidden': 'true' }, symOf(s, ph)), h('span', { class: 'sl-name' }, s.ko || s.name)];
}

export default function lab(root, ctx) {
  const { engine, bar } = ctx;
  const args = (ctx.args || []).filter(Boolean);

  let group = groupById(args[0]) ? args[0] : 'dyn';
  let phrase = phraseById(groupById(group).phrase);
  let sign = null;                 // 지금 고른(악보에 넣을) 기호
  let hint = null;                 // 주소로 가리킨 '눌러 보세요' 단추(곡 전체에 걸리는 기호는 저절로 넣지 않는다)
  let fact = INTRO[group];
  // 기호가 하나뿐인 묶음(되풀이)은 들어오자마자 그 기호를 골라 둔다 — 아이는 악보의 마디만 누르면 된다
  const lone = g => { const l = signsOf(g); return l.length === 1 && l[0].where !== 'start' ? l[0].id : null; };
  const deep = signById(args[1]);
  if (deep && deep.group === group) {
    if (deep.phrase) phrase = phraseById(deep.phrase);           // 그 기호가 잘 들리는 가락으로(1 · 2번 괄호 · D.C. · Fine)
    if (deep.where === 'start') hint = deep.id;
    else { sign = deep.id; fact = factOf(deep.id, true); }
  } else if (lone(group)) { sign = lone(group); fact = factOf(sign, true); }
  const store = new Map();         // 가락 id → 넣은 기호(이 화면에 있는 동안만)
  const marksNow = () => { if (!store.has(phrase.id)) store.set(phrase.id, emptyMarks()); return store.get(phrase.id); };
  let bare = false;                // 기호를 빼고 듣는 중 — 악보도 기호 없이 보인다
  let mode = null;                 // null | 'full' | 'bare' | 'pre'(넣고 뺀 마디만 한 번)
  let player = null, raf = 0, nowEvents = [];
  let R = null, M = null, TOP = 0, VHN = VH, lit = [], litKey = '';
  let friend = groupById(group).friend, pal = null;

  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const noFocus = el => { el.addEventListener('mousedown', e => e.preventDefault()); return el; };
  const press = (el, fn) => noFocus(onPress(el, fn));
  const beatOn = marks => group === 'meter' || !!marks.meter;      // 박자를 볼 때는 박 소리도 함께

  // ── 틀 ──
  const tabs = h('div', { class: 'sl-tabs', role: 'group', 'aria-label': '기호 묶음' },
    ...GROUPS.map(g => press(h('button', { type: 'button', 'data-group': g.id, 'aria-pressed': 'false' }, g.name), () => setGroup(g.id))));
  const phName = h('span', { class: 'sl-phname' });
  const nextBtn = press(h('button', { type: 'button', class: 'sl-next' }, '다른 가락'), nextPhrase);
  const tray = h('div', { class: 'sl-tray', role: 'group', 'aria-label': '기호' });
  const guide = h('p', { class: 'sl-guide', role: 'status' });
  const instCap = h('span', { class: 'sl-inst' });
  const staffBox = h('div', { class: 'sl-staff' });
  const factEl = h('p', { class: 'sl-fact', 'aria-live': 'polite' });
  const playBtn = press(h('button', { type: 'button', class: 'go sl-play' }, '듣기'), togglePlay);
  const bareBtn = press(h('button', { type: 'button', class: 'sl-bare' }, '기호 빼고 듣기'), () => { if (!bareBtn.disabled) playBare(); });
  const clearBtn = press(h('button', { type: 'button', class: 'sl-clear' }, '다 빼기'), () => { if (!clearBtn.disabled) clearAll(); });
  const palBox = h('span', { class: 'sl-palbox', 'aria-hidden': 'true' });
  const wrap = h('div', { class: 'signlab' },
    h('div', { class: 'sl-top' }, tabs, h('div', { class: 'sl-ph' }, phName, nextBtn)),
    tray,
    h('div', { class: 'sl-stage' }, h('div', { class: 'sl-head' }, guide, instCap), staffBox, factEl),
    h('div', { class: 'sl-foot' }, playBtn, bareBtn, clearBtn, palBox));
  root.append(wrap);

  function applyFriend() {
    friend = groupById(group).friend;
    wrap.style.setProperty('--f', `var(--${friend})`);
    wrap.style.setProperty('--f-t', `var(--${friend}-t)`);
    bar.title('악보 판', friend);
    pal = friendImg(friend, 'idle', { label: false, cls: 'sl-pal' });
    palBox.replaceChildren(pal);
    preload([[friend, 'play']]);
  }

  function buildTray() {
    const list = [...signsOf(group), ...SIGNS.filter(s => s.group !== group && (s.also || []).includes(group))].sort((a, b) => (a.where === 'start' ? 0 : 1) - (b.where === 'start' ? 0 : 1));   // 다른 묶음 기호를 함께 둘 때(화음 묶음의 조 옮기기) · 곡 전체 기호가 앞
    let seenStart = false, gapDone = false;
    tray.replaceChildren(...list.map(s => {
      const b = press(h('button', { type: 'button', class: 'sl-chip', 'data-sign': s.id, 'aria-pressed': 'false' }, ...chipKids(s, phrase)), () => tapChip(s.id));
      if (s.where === 'start') seenStart = true;
      else if (seenStart && !gapDone) { b.classList.add('gap'); gapDone = true; }      // 곡 전체 기호와 자리 기호 사이를 조금 띄움
      if (s.kind === 'drum') b.classList.add('gap');                                  // 북 반주는 악기 고르기와 따로 켜고 끈다
      return b;
    }));
  }

  // ── 자리 계산(그림 단위) ──
  const xAt = (b, tick) => R.xs.get(b).X((tick - b * M.cap) / 3);
  const xOf = n => xAt(n.bar, n.t);
  const yOf = n => TOP + 40 - (n.step != null ? n.step - 37 : staffPos(n.p)) * 5;      // step = 음이름 자리(조 · 임시표를 입힌 뒤 · engine/marks.js)

  function guideText(marks) {
    if (bare) return '기호를 뺀 악보로 듣는 중이에요';
    if (hint) { const s = signById(hint); return `「${s.name}」${pt(s.name, '을/를')} 눌러 넣어 보세요`; }
    if (sign) {
      const s = signById(sign);
      if (!places(phrase, marks, sign).length) {
        if (s.kind === 'volta') return '도돌이표를 가운데 마디로 옮기면 1 · 2번 괄호를 넣을 수 있어요';
        return '지금은 넣을 자리가 없어요 · [다른 가락]을 눌러 보세요';
      }
      if (s.kind === 'volta') return marks.repeat ? '도돌이표가 있는 마디를 눌러 1 · 2번 괄호를 넣고 빼요 — 그 마디가 1번, 다음 마디가 2번' : '악보에서 1번 괄호를 넣을 마디를 눌러요 · 그 마디 끝에 도돌이표도 함께 들어가요';
      if (s.kind === 'dc') return '악보의 끝 마디를 눌러 「D.C.」를 넣어요 · 넣은 곳을 또 누르면 빠져요';
      if (s.kind === 'fine') return '악보에서 「Fine」으로 마칠 마디를 눌러요 · 넣은 곳을 또 누르면 빠져요';
      const tail = ' · 넣은 곳을 또 누르면 빠져요';
      if (s.where === 'tie') return '악보에서 붙임줄로 이을 두 음 사이를 눌러요' + tail;
      return `악보에서 「${s.name}」${pt(s.name, '을/를')} 넣을 ${s.where === 'bar' ? '마디를' : '음을'} 눌러요` + tail;
    }
    return PICK[group] || '넣을 기호를 골라요';
  }

  function paint() {
    const marks = marksNow();
    for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.group === group));
    for (const b of tray.children) {
      const s = signById(b.dataset.sign);
      const on = s.where === 'start' ? (s.kind === 'meter' ? hasMeter(phrase, marks, s.id) : has(marks, s.id)) : sign === s.id;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('hint', hint === s.id && !on);
    }
    phName.textContent = phraseName(phrase);
    guide.textContent = guideText(marks);
    factEl.textContent = fact;
    instCap.textContent = '악기 · ' + signById(M.inst).name;
    const none = countMarks(marks) === 0;
    bareBtn.disabled = none; clearBtn.disabled = none;
    playBtn.textContent = mode === 'full' || mode === 'bare' ? '멈추기' : '듣기';
  }

  // ── 악보 그리기 ──
  function draw() {
    const hadFocus = staffBox.contains(document.activeElement) ? document.activeElement.getAttribute('data-at') : null;
    const marks = bare ? emptyMarks() : marksNow();
    const { score, model } = scoreOf(phrase, marks);
    M = model;
    const opt = { width: VW, barsPerLine: score.bars, barNumbers: false, minStep: 6 };
    R = renderScore(score, opt);
    VHN = VH;
    if (score.staves.length > 1) {                               // 오선이 여럿(둘째 줄 · 화음 · 북) — 높이에 맞춰 너비도 늘려 틀을 꽉 채운다
      VHN = Math.max(VH, Math.ceil(R.sys[0].y1 - (R.sys[0].top - 58)));
      R = renderScore(score, { ...opt, width: Math.round(VW * VHN / VH) });
    }
    TOP = R.sys[0].top;
    lit = []; litKey = '';
    const el = R.el;
    el.setAttribute('viewBox', `0 ${TOP - 58} ${R.width} ${VHN}`);
    el.removeAttribute('width'); el.removeAttribute('height');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', phraseName(phrase) + ' 악보');
    const hits = svg('g', { class: 'sl-hits' });
    if (!bare) drawHits(hits, marks);
    el.insertBefore(hits, el.firstChild);
    staffBox.replaceChildren(el);
    const sc = Math.min(staffBox.clientWidth / R.width, staffBox.clientHeight / VHN);    // 그림 단위 1 = 화면 몇 px
    el.style.setProperty('--k', sc > 0 ? Math.max(1, 1.4 / sc).toFixed(3) : '1');       // 오선이 여럿이라 작아지면 글자만 키워 화면에서 18px 아래로 내려가지 않게
    const over = svg('g', { class: 'sl-over' });
    el.append(over);
    drawOver(over);
    if (hadFocus != null) { const f = el.querySelector(`.sl-hit[data-at="${hadFocus}"]`); if (f) f.focus({ preventScroll: true }); }
  }

  function hitRect(g, x0, x1, at, label, cls, on, fn) {
    const r = svg('rect', { x: x0, y: TOP - 34, width: Math.max(14, x1 - x0), height: VHN - 26, rx: 6, class: 'sl-hit ' + cls, 'data-at': at, role: 'button', tabindex: 0, 'aria-label': label });
    if (on != null) r.setAttribute('aria-pressed', String(on));
    onPress(r, fn);
    g.append(r);
  }
  function drawHits(g, marks) {
    const noteSpan = n => [xOf(n) - 8.5, xAt(n.bar, n.t + n.d) - 11.5];
    if (!sign) {                                                 // 기호를 안 골랐으면 — 음을 누르면 그 음만 들린다
      for (const n of M.notes) if (!n.rest) { const [a, b] = noteSpan(n); hitRect(g, a, b, n.k, `${n.k + 1}번째 음 ${solfege(n.p)} 듣기`, '', null, () => tapNote(n.k)); }
      return;
    }
    const s = signById(sign);
    for (const at of places(phrase, marks, sign)) {
      const on = has(marks, sign, at);
      const cls = 'can' + (on ? ' in' : '');
      if (s.where === 'note') {
        const n = M.notes[at], [a, b] = noteSpan(n);
        hitRect(g, a, b, at, `${at + 1}번째 음 ${solfege(n.p)}`, cls, on, () => tapPlace(at));
      } else if (s.where === 'tie') {
        const a = M.notes[at], b = M.notes[at + 1];
        hitRect(g, xOf(a) + 1.5, xOf(b) - 1.5, at, `${at + 1}번째 음과 ${at + 2}번째 음 사이`, cls, on, () => tapPlace(at));
      } else {
        const c = R.xs.get(at);
        hitRect(g, c.x0 + 3, c.x0 + c.w - 3, at, `${at + 1}번째 마디`, cls, on, () => tapPlace(at));
      }
    }
  }

  // 글꼴 · 그리기 함수에 없는 기호(셈여림표 · 점점 세게 · 붙임줄 · 늘임표 · 빠르기말)는 여기서 얹는다
  function drawOver(g) {
    for (const l of M.letters) g.append(svg('text', { x: xOf(M.notes[l.k]), y: TOP + 100, 'text-anchor': 'middle', class: 'sl-letter' }, l.text));
    for (const hp of M.hairs) {
      const a = R.xs.get(hp.b0), b = R.xs.get(hp.b1);
      const x0 = a.x0 + 14, x1 = b.x0 + b.w - 10, y = TOP + 112;
      g.append(svg('path', { d: hp.kind === 'cresc' ? `M${x1} ${y - 5}L${x0} ${y}L${x1} ${y + 5}` : `M${x0} ${y - 5}L${x1} ${y}L${x0} ${y + 5}`, class: 'sl-hair' }));
    }
    for (const k of M.ties) {
      const a = M.notes[k], b = M.notes[k + 1];
      if (!a || !b) continue;
      const xa = xOf(a), xb = xOf(b), yy = yOf(a) + 8;
      g.append(svg('path', { d: `M${xa + 4} ${yy}Q${(xa + xb) / 2} ${yy + 7} ${xb - 4} ${yy}`, class: 'st-tie' }));
    }
    for (const k of M.fermatas) {
      const x = xOf(M.notes[k]), fy = TOP - 22;
      g.append(svg('path', { d: `M${x - 9} ${fy}a9 8.5 0 0 1 18 0`, class: 'sl-ferm' }), svg('circle', { cx: x, cy: fy - 2.6, r: 1.9, class: 'st-dot' }));
    }
    let right = 0;
    if (M.tempoSet || group === 'tempo') {
      const t = svg('text', { x: 4, y: TOP - 42, class: 'sl-tempo' }, M.tempoWord + ' ', svg('tspan', { class: 'sl-q' }, '♩'), ` = ${M.bpm}`);
      g.append(t);
      try { const bb = t.getBBox(); right = bb.x + bb.width; } catch { right = 150; }
    }
    if (M.tchange) g.append(svg('text', { x: Math.max(R.xs.get(M.tchange.bar).x0 + 6, right + 14), y: TOP - 42, class: 'sl-tch' }, M.tchange.text));
    drawOverD2(g);
  }
  // 묶음 D2 — 아래 오선의 이름 · 화음 이름 · 둘째 줄 붙임줄 · 1 · 2번 괄호 · D.C. · Fine
  function drawOverD2(g) {
    if (M.lower) {
      const t2 = R.sys[0].tops[1];
      if (M.second) g.append(svg('text', { x: 4, y: t2 - 28, class: 'sl-low' }, '둘째 줄'));
      for (const c of M.chords) {                                // 화음 이름 — 화음 기둥(마디 앞)을 비켜 오른쪽에 · 마디가 좁으면 Ⅰ · Ⅳ · Ⅴ만
        const x = R.xs.get(c.bar);
        g.append(svg('text', { x: x.x0 + 30, y: t2 - 10, class: 'sl-chd' }, svg('tspan', { class: 'sl-chdr' }, c.sym), x.w >= 110 ? ' ' + c.ko : ''));
      }
      if (M.second) for (const k of M.ties) {
        const a = M.notes[k], b = M.notes[k + 1];
        if (!a || !b || a.step == null || M.chords.some(c => c.bar === a.bar || c.bar === b.bar)) continue;
        const xa = xOf(a), xb = xOf(b), yy = t2 + 40 - (a.step - 2 - 37) * 5 + 8;
        g.append(svg('path', { d: `M${xa + 4} ${yy}Q${(xa + xb) / 2} ${yy + 7} ${xb - 4} ${yy}`, class: 'st-tie' }));
      }
    }
    if (M.drum) { const td = R.sys[0].tops[R.sys[0].tops.length - 1]; g.append(svg('text', { x: 4, y: td + 6, class: 'sl-low' }, '북')); }
    if (M.volta != null) {
      const yv = TOP - 31;
      [[M.volta, '1.', true], [M.volta + 1, '2.', false]].forEach(([b, t, close]) => {
        const c = R.xs.get(b);
        if (!c) return;
        const x0 = c.x0 + 3, x1 = c.x0 + c.w - (close ? 5 : 14);
        g.append(svg('path', { d: `M${x0} ${yv + 11}V${yv}H${x1}` + (close ? `V${yv + 11}` : ''), class: 'sl-volta' }));
        g.append(svg('text', { x: x0 + 5, y: yv + 12, class: 'sl-voltat' }, t));
      });
    }
    const endText = (b, text) => { const c = R.xs.get(b); g.append(svg('text', { x: c.x0 + c.w - 3, y: TOP - 42, 'text-anchor': 'end', class: 'sl-dc' }, text)); };
    if (M.dc != null) endText(M.dc, 'D.C.');
    if (M.fine != null) {
      endText(M.fine, 'Fine');
      if (!(M.repeat && M.repeat.to === M.fine)) {               // 마치는 자리는 겹세로줄
        const c = R.xs.get(M.fine), x = c.x0 + c.w - 4.5;
        for (const t of R.sys[0].tops) g.append(svg('line', { x1: x, x2: x, y1: t, y2: t + 40, class: 'sl-dbar' }));
      }
    }
  }

  // ── 누르기 ──
  function tapChip(id) {
    const s = signById(id);
    hint = null;
    if (s.where !== 'start') {                                   // 자리에 넣는 기호 — 고르기만 한다
      stopPlay(true);
      sign = sign === id ? null : id;
      if (sign && s.phrase && phrase.id !== s.phrase && countMarks(marksNow()) === 0) { phrase = phraseById(s.phrase); buildTray(); }   // 아직 아무것도 안 넣었으면 그 기호가 잘 들리는 가락으로
      fact = sign ? factOf(id, true, { marks: marksNow() }) : INTRO[group];
      draw(); paint();
      return;
    }
    const r = toggle(phrase, marksNow(), id);                   // 곡 전체에 걸리는 기호 — 바로 바뀐다
    if (r.blocked) { fact = r.note || fact; paint(); return; }
    stopPlay(true);
    store.set(phrase.id, r.marks);
    fact = factOf(id, r.on, { note: r.note, meter: r.meter });
    draw(); paint();
    preview(0, Math.ceil(4 / M.meter[0]) - 1);                   // 앞의 네 박쯤을 바뀐 소리로
  }

  function tapPlace(at) {
    if (!sign) return;
    const s = signById(sign);
    const r = toggle(phrase, marksNow(), sign, at);
    if (r.blocked) return;
    stopPlay(true);
    store.set(phrase.id, r.marks);
    fact = factOf(sign, r.on, { marks: r.marks });
    draw(); paint();
    if (ORDER_KINDS.has(s.kind)) return;                         // 도돌이표 · 괄호 · D.C. · Fine은 [듣기]로 처음부터
    const barOf = k => M.notes[k].bar;
    if (s.where === 'bar') preview(at, s.kind === 'tchange' ? M.bars - 1 : at);
    else if (s.where === 'tie') preview(barOf(at), barOf(at + 1));
    else preview(barOf(at), barOf(at));
  }

  function tapNote(k) {
    const n = M.notes[k];
    if (!n || n.rest) return;
    if (mode) stopPlay();
    engine.ensure();
    engine.note(M.inst, n.p, engine.now + 0.02, 0.5, 0.8);
    const els = R.noteEls.get(k) || [];
    for (const el of els) el.classList.add('now');
    later(() => { for (const el of els) el.classList.remove('now'); }, 420);
  }

  // ── 소리 ──
  function setNow(ks) {
    const key = ks ? ks.join(',') : '';
    if (key === litKey) return;
    for (const el of lit) el.classList.remove('now');
    lit = []; litKey = key;
    if (!ks || !R) return;
    for (const k of ks) for (const el of R.noteEls.get(k) || []) { el.classList.add('now'); lit.push(el); }
  }
  function frame() {
    raf = 0;
    if (!player || !player.playing) return;
    const pos = player.pos;
    let ks = null;
    for (const ev of nowEvents) { if (ev.t > pos) break; if (pos < ev.t + ev.len) ks = ev.ks; }
    setNow(ks);
    raf = requestAnimationFrame(frame);
  }
  function startPlay(events, total, m) {
    stopPlay(true);
    if (m === 'bare') { bare = true; draw(); }
    engine.ensure();
    player = new Player(engine);
    const me = player;
    nowEvents = events.filter(e => e.kind === 'note' && !e.part);     // 가락 음만(둘째 줄 · 화음은 불빛을 따로 켜지 않음)
    mode = m;
    player.start(events, { total, onEnd: () => { if (player !== me) return; stopPlay(); } });
    if (m !== 'pre') setPose(pal, friend, 'play');
    raf = requestAnimationFrame(frame);
    paint();
  }
  function stopPlay(quiet) {
    if (player) { const p = player; player = null; p.stop(); }
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    setNow(null);
    mode = null;
    if (bare) { bare = false; draw(); }
    setPose(pal, friend, 'idle');
    if (!quiet) paint();
  }
  function preview(b0, b1) {
    const marks = marksNow();
    const P = perform(phrase, marks, { beat: beatOn(marks) });
    let si = -1;                                                 // 그 마디를 지나가는 마지막 구간(되풀이 · D.C.가 있어도 한 번만)
    P.segs.forEach((g, i) => { if (g.a <= b0 * M.cap && b0 * M.cap < g.b) si = i; });
    const evs = P.events.filter(e => e.seg === si && Math.floor(e.tick / M.cap) >= b0 && Math.floor(e.tick / M.cap) <= b1);
    if (!evs.some(e => e.kind === 'note')) return;
    const t0 = evs[0].t;
    const out = evs.map(e => ({ ...e, t: e.t - t0 }));
    const total = Math.max(...out.map(e => e.t + (e.len || 0.2))) + 0.25;
    startPlay(out, total, 'pre');
  }
  function playFull() {
    const marks = marksNow();
    const P = perform(phrase, marks, { beat: beatOn(marks) });
    startPlay(P.events, P.total, 'full');
  }
  function playBare() {
    if (mode === 'bare') { stopPlay(); return; }
    const P = perform(phrase, emptyMarks(), { beat: group === 'meter' });
    startPlay(P.events, P.total, 'bare');
  }
  function togglePlay() { if (mode === 'full' || mode === 'bare') stopPlay(); else playFull(); }

  function setGroup(id) {
    if (id === group) return;
    stopPlay(true);
    group = id; sign = lone(id); hint = null;
    phrase = phraseById(groupById(id).phrase);
    fact = sign ? factOf(sign, true) : INTRO[id];
    history.replaceState(null, '', '#/lab/' + id);               // 뒤로 가기로 묶음을 되짚지 않는다
    applyFriend(); buildTray(); draw(); paint();
  }
  function nextPhrase() {
    stopPlay(true);
    phrase = PHRASES[(PHRASES.findIndex(p => p.id === phrase.id) + 1) % PHRASES.length];
    if (!sign) fact = INTRO[group];
    buildTray(); draw(); paint();
  }
  function clearAll() {
    stopPlay(true);
    store.set(phrase.id, emptyMarks());
    fact = '기호를 모두 뺐어요. [듣기]로 본래 가락을 들어 보세요.';
    draw(); paint();
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.key === 'Escape' && sign) { stopPlay(true); sign = null; fact = INTRO[group]; draw(); paint(); return; }
    if (e.key !== ' ' && e.code !== 'Space') return;
    if (e.target && e.target.closest && e.target.closest('button,a,[role="button"]')) return;
    e.preventDefault();
    togglePlay();
  }
  document.addEventListener('keydown', onKey);

  applyFriend(); buildTray(); draw(); paint();

  window.__labState = () => ({ group, sign, hint, phrase: phrase.id, marks: marksNow(), count: countMarks(marksNow()), playing: !!(player && player.playing), mode, bare, bars: M.bars, meter: M.meter,
    key: M.key, lower: M.lower, chords: M.chords.map(c => c.bar + c.id), order: orderOf(phrase, marksNow()), staves: R.sys[0].tops.length });

  return () => {
    if (player) { player.stop(); player = null; }
    if (raf) cancelAnimationFrame(raf);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    document.removeEventListener('keydown', onKey);
    delete window.__labState;
  };
}
