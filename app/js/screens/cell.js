// 개념 칸 화면 — #/cell/<칸> · 한 칸이 도는 순서(계획서): 보기 → 연습 → 확인 게임 → 결과
//  칸 내용은 app/js/cells/<칸>.js 가 그린다(약속: docs/cells.md). 이 화면은 차례 · 머리띠 · 맨 위 한 줄 · 아래 띠 · 결과 · 진행 저장.
//  11-07 평가 2차: 모든 칸이 같은 자리를 쓰게 — 맨 위 한 줄 = [문제 번호] 지시 글 …… [말풍선(맞아 · 다시 들어 봐 · 1 2 3 4)]
//   연습 점은 아래 띠 왼쪽 한 곳("3번 이어서 맞히면 게임") · 넘어가기는 머리띠 오른쪽 작은 단추 · 아래 띠 높이는 늘 그대로
//  앞 칸을 건너뛰고 들어오면 "이 칸은 ○○를 알면 더 쉬워요" 한 번 + 바로 가기(잠그지 않음).
import { h, onPress, josa } from '../util.js';
import { friendImg, setPose, preload } from '../band.js';
import { cellById, LANES, missingPre, nextCell } from '../../../engine/cells.js';
import * as K from '../cellkit.js';

const PHASES = [['show', '보기'], ['follow', '연습'], ['game', '확인 게임']];
const warned = new Set();                    // 이 창에서 한 번만 안내

export default function mount(root, ctx) {
  const { engine, device, bar } = ctx;
  const cell = cellById(ctx.args && ctx.args[0]);
  if (!cell) { ctx.go('map'); return null; }
  if (cell.route) { ctx.go(cell.route); return null; }
  const friend = LANES[cell.lane].friend;
  bar.title(cell.name, friend);
  // 칸만의 모양(app/css/cells/<칸>.css — 칸마다 꼭 하나, 비어 있어도 됨)
  const css = h('link', { rel: 'stylesheet', href: `app/css/cells/${cell.id}.css` });
  document.head.append(css);
  preload(['idle', 'play', 'happy', 'oops'].map(p => [friend, p]));

  // 맨 위 한 줄
  const countEl = h('span', { class: 'ccount', hidden: true });
  const sayEl = h('span', { class: 'csay-t' });
  const tellEl = h('span', { class: 'ctell', hidden: true, role: 'status', 'aria-live': 'polite' });
  const top = h('div', { class: 'ctop' }, countEl, sayEl, tellEl);
  const body = h('div', { class: 'cbody' });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const stage = h('div', { class: 'cstage' }, top, body, overlay);
  // 아래 띠 = 가운데(칸이 채움) + 왼쪽 연습 점(이 화면이 그림)
  const practiceEl = h('div', { class: 'cpractice', hidden: true });
  const barSlot = h('div', { class: 'cbarslot' });
  const barEl = h('div', { class: 'tapbar cbar' }, practiceEl, barSlot);
  root.append(h('div', { class: 'cellscreen' }, stage, barEl));

  let mod = null, phase = -1, cleanup = null, auto = null, gone = false, tellTimer = 0;
  const ui = {
    stage: body,
    bar: barSlot,
    // 지시 한 줄 — 단계마다(확인 게임 중에도) 같은 자리
    say: t => { sayEl.textContent = t || ''; },
    // 문제 번호 '3 / 12' — 맨 위 한 줄 왼쪽
    count: (i, n) => { if (i == null) { countEl.hidden = true; return; } countEl.hidden = false; countEl.textContent = `${i} / ${n}`; },
    // 말풍선 — 맞아 · 다시 들어 봐 · 박 세기(1 2 3 4). kind: good | oops | count | info · ms 뒤 사라짐(0 = 그대로)
    tell(t, kind = 'info', ms = 1200) {
      clearTimeout(tellTimer);
      if (!t) { tellEl.hidden = true; return; }
      tellEl.hidden = false; tellEl.textContent = t; tellEl.dataset.k = kind;
      tellEl.classList.remove('pop'); void tellEl.offsetWidth; tellEl.classList.add('pop');
      if (ms) tellTimer = setTimeout(() => { tellEl.hidden = true; }, ms);
    },
    setBar: (...nodes) => barSlot.replaceChildren(...nodes.flat().filter(Boolean)),
    // 연습 점 — n = 지금 이어서 맞힌 수(need 개 되면 게임)
    practice(n, need = 3) {
      if (n == null) { practiceEl.hidden = true; return; }
      practiceEl.hidden = false;
      practiceEl.replaceChildren(h('span', { class: 'streak' }, ...Array.from({ length: need }, (_, i) => h('i', { class: i < n ? 'on' : '' }))), h('span', {}, `${need}번 이어서 맞히면 게임`));
    },
  };
  const goBtn = (label, fn) => { const b = h('button', { type: 'button', class: 'go huge' }, label); onPress(b, fn); return b; };
  const subBtn = (label, fn, cls = '') => { const b = h('button', { type: 'button', class: cls }, label); onPress(b, fn); return b; };

  const steps = () => h('span', { class: 'steps labeled', 'aria-label': PHASES[phase] ? PHASES[phase][1] : '' },
    ...PHASES.map(([, name], i) => h('span', { class: 'st' + (i < phase ? ' done' : '') + (i === phase ? ' now' : '') }, h('span', { class: 'd' }), name)));
  const rightBtns = i => {
    if (i === 0) return null;
    const wrap = h('span', { class: 'bar-btns' }, subBtn('다시 보기', () => runPhase(0)));
    if (i === 1) wrap.append(subBtn('넘어가기', () => runPhase(2)));
    return wrap;
  };

  function runPhase(i) {
    if (gone) return;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    phase = i; auto = null;
    overlay.hidden = true; overlay.replaceChildren();
    body.replaceChildren(); ui.say(''); ui.count(null); ui.tell(null); ui.practice(i === 1 ? 0 : null);
    bar.mid(steps());
    bar.right(rightBtns(i));
    const key = PHASES[i][0];
    // 기본 아래 띠 — 칸 모듈이 ui.setBar로 바꿀 수 있다(연습 · 게임은 '다시 듣기'나 큰 '톡'을 칸이 넣음)
    if (key === 'show') ui.setBar(goBtn('연습해 볼래요', () => runPhase(1)));
    else ui.setBar();
    cleanup = mod[key](ui, kit) || null;
  }

  const kit = {
    engine, device, cell, friend,
    band: device.band || 'mid',
    h, onPress, friendImg, setPose,
    ...K,
    next: () => runPhase(Math.min(PHASES.length - 1, phase + 1)),
    // 연습을 세 번 이어서 맞혀 지남 → 확인 게임 단추
    pass(msg = '세 번 이어서 맞혔어요') {
      if (PHASES[phase][0] !== 'follow') return;
      ui.practice(3); ui.say(msg + ' — 이제 확인 게임!');
      ui.setBar(goBtn('확인 게임', () => runPhase(2)));
      auto = () => runPhase(2);
    },
    // 확인 게임 끝 — r = { title, facts, starOn, rules, tip, replay, group }
    finish(r) {
      if (gone) return;
      const stars = r.starOn.filter(Boolean).length;
      K.saveStars(cell.id, stars);
      ui.tell(null); ui.say(''); ui.count(null); ui.practice(null);
      const pose = friend === 'hog' ? 'happy' : 'play';
      overlay.replaceChildren(h('div', { class: 'resultwrap' }, K.resultCard(r), friendImg(friend, pose, { label: false, cls: 'resultpal' })));
      overlay.hidden = false;
      bar.mid(h('span', { class: 'steps labeled' }, ...PHASES.map(([, name]) => h('span', { class: 'st done' }, h('span', { class: 'd' }), name))));
      bar.right(null);
      const nx = nextCell(K.getProg(), cell.id);
      const again = subBtn('한 번 더', () => runPhase(2), 'again');
      const fwd = nx && nx !== cell.id
        ? goBtn('다음 놀이', () => { const c = cellById(nx); ctx.go(c.route || 'cell/' + nx); })
        : goBtn('마을 지도', () => ctx.go('map'));
      ui.setBar(again, fwd);
      auto = null;
      window.__cellResult = { id: cell.id, stars, ...r };
    },
    setAuto: fn => { auto = fn; },
  };
  // 자동 시험용 — 지금 화면에서 맞는 행동 하나(칸 모듈이 정함). 화면에는 보이지 않는다
  window.__cellAuto = () => (auto ? auto() : false);
  window.__cellPhase = () => (overlay.hidden ? PHASES[phase] && PHASES[phase][0] : 'result');

  (async () => {
    try { mod = (await import(`../cells/${cell.id}.js`)).default; }
    catch (e) {
      console.error(e);
      body.replaceChildren(h('div', { class: 'panelcard startcard', style: { margin: 'auto' } }, h('h2', {}, '이 놀이는 다음에 열려요'), h('p', { class: 'sub' }, '마을 지도에서 다른 놀이를 골라요')));
      ui.setBar(goBtn('마을 지도', () => ctx.go('map')));
      return;
    }
    if (gone) return;
    const miss = missingPre(K.getProg(), cell.id).map(cellById).filter(c => c && c.first);
    if (miss.length && !warned.has(cell.id)) {
      warned.add(cell.id);
      const m = miss[0];
      body.replaceChildren(h('div', { class: 'panelcard startcard', style: { margin: 'auto' } },
        friendImg(LANES[m.lane].friend, 'idle', { label: false, cls: 'noteart' }),
        h('h2', {}, `이 놀이는 ${josa(m.name, '을/를')} 알면 더 쉬워요`),
        h('p', { class: 'sub' }, '먼저 해 봐도 되고, 그냥 해도 돼요')));
      ui.setBar(subBtn(`${m.name} 먼저`, () => ctx.go(m.route || 'cell/' + m.id)), goBtn('그냥 할래요', () => runPhase(0)));
      auto = () => runPhase(0);
      bar.mid(null);
      return;
    }
    runPhase(0);
  })();

  return () => { gone = true; clearTimeout(tellTimer); if (cleanup) try { cleanup(); } catch { /* */ } window.__cellAuto = null; css.remove(); };
}
