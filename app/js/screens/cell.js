// 개념 칸 화면 — #/cell/<칸> · 한 칸이 도는 순서(계획서): 보기 → 따라 하기 → 확인 게임 → 결과
//  칸 내용은 app/js/cells/<칸>.js 가 그린다(약속: docs/cells.md). 이 화면은 차례 · 머리띠 · 아래 띠 · 결과 · 진행 저장만.
//  앞 칸을 건너뛰고 들어오면 "이 칸은 ○○를 알면 더 쉬워요" 한 번 + 바로 가기(잠그지 않음).
import { h, onPress, josa } from '../util.js';
import { friendImg, setPose, preload } from '../band.js';
import { cellById, LANES, missingPre, nextCell } from '../../../engine/cells.js';
import * as K from '../cellkit.js';

const PHASES = [['show', '보기'], ['follow', '따라 하기'], ['game', '확인 게임']];
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

  const say = h('p', { class: 'csay' });
  const body = h('div', { class: 'cbody' });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const stage = h('div', { class: 'cstage' }, say, body, overlay);
  const barEl = h('div', { class: 'tapbar' });
  const screenEl = h('div', { class: 'cellscreen' }, stage, barEl);
  root.append(screenEl);

  let mod = null, phase = -1, cleanup = null, auto = null, gone = false;
  const ui = {
    stage: body,
    bar: barEl,
    say: t => { say.textContent = t || ''; say.hidden = !t; },
    setBar: (...nodes) => { const n = nodes.flat().filter(Boolean); barEl.replaceChildren(...n); screenEl.classList.toggle('nobar', !n.length); },
  };
  const goBtn = (label, fn) => { const b = h('button', { type: 'button', class: 'go huge' }, label); onPress(b, fn); return b; };
  const subBtn = (label, fn) => { const b = h('button', { type: 'button' }, label); onPress(b, fn); return b; };

  const steps = () => h('span', { class: 'steps labeled', 'aria-label': PHASES[phase] ? PHASES[phase][1] : '' },
    ...PHASES.map(([, name], i) => h('span', { class: 'st' + (i < phase ? ' done' : '') + (i === phase ? ' now' : '') }, h('span', { class: 'd' }), name)));

  function runPhase(i) {
    if (gone) return;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    phase = i; auto = null;
    overlay.hidden = true; overlay.replaceChildren();
    body.replaceChildren(); ui.say('');
    bar.mid(steps());
    bar.right(i > 0 ? subBtn('보기 다시', () => runPhase(0)) : null);
    const key = PHASES[i][0];
    // 기본 아래 띠 — 칸 모듈이 ui.setBar로 바꿀 수 있다
    if (key === 'show') ui.setBar(goBtn('따라 해 볼래요', () => runPhase(1)));
    else if (key === 'follow') ui.setBar(subBtn('넘어가기', () => runPhase(2)));
    else ui.setBar();
    cleanup = mod[key](ui, kit) || null;
  }

  const kit = {
    engine, device, cell, friend,
    band: device.band || 'mid',
    h, onPress, friendImg, setPose,
    ...K,
    next: () => runPhase(Math.min(PHASES.length - 1, phase + 1)),
    // 따라 하기를 세 번 맞혀 지남 → 확인 게임 단추
    pass(msg = '세 번 맞혔어요') {
      if (PHASES[phase][0] !== 'follow') return;
      ui.say(msg + ' — 이제 확인 게임!');
      ui.setBar(goBtn('확인 게임', () => runPhase(2)));
      auto = () => runPhase(2);
    },
    // 확인 게임 끝 — r = { title, facts, starOn, rules, tip, replay }
    finish(r) {
      if (gone) return;
      const stars = r.starOn.filter(Boolean).length;
      K.saveStars(cell.id, stars);
      overlay.replaceChildren(K.resultCard(r));
      overlay.hidden = false;
      bar.mid(h('span', { class: 'steps labeled' }, ...PHASES.map(([, name]) => h('span', { class: 'st done' }, h('span', { class: 'd' }), name))));
      const nx = nextCell(K.getProg(), cell.id);
      const again = subBtn('다시', () => runPhase(2));
      const fwd = nx && nx !== cell.id
        ? goBtn('다음 칸', () => { const c = cellById(nx); ctx.go(c.route || 'cell/' + nx); })
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
      body.replaceChildren(h('div', { class: 'panelcard startcard', style: { margin: 'auto' } }, h('h2', {}, '이 칸은 다음에 열려요'), h('p', { class: 'sub' }, '마을 지도에서 다른 칸을 골라요')));
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
        h('h2', {}, `이 칸은 ${josa(m.name, '을/를')} 알면 더 쉬워요`),
        h('p', { class: 'sub' }, '먼저 해 봐도 되고, 그냥 해도 돼요')));
      ui.setBar(subBtn(`${m.name} 먼저`, () => ctx.go(m.route || 'cell/' + m.id)), goBtn('그냥 할래요', () => runPhase(0)));
      auto = () => runPhase(0);
      bar.mid(null);
      return;
    }
    runPhase(0);
  })();

  return () => { gone = true; if (cleanup) try { cleanup(); } catch { /* */ } window.__cellAuto = null; css.remove(); };
}
