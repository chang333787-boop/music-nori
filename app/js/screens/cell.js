// 개념 칸 화면 — #/cell/<칸> · 한 칸이 도는 순서(계획서): 보기 → 연습 → 확인 게임 → 결과
//  칸 내용은 app/js/cells/<칸>.js 가 그린다(약속: docs/cells.md). 이 화면은 차례 · 머리띠 · 맨 위 한 줄 · 아래 띠 · 결과 · 진행 저장.
//  11-07 평가 2차: 모든 칸이 같은 자리를 쓰게 — 맨 위 한 줄 = [문제 번호] 지시 글 …… [말풍선(맞아 · 다시 들어 봐 · 1 2 3 4)]
//   연습 점은 아래 띠 왼쪽 한 곳("3번 이어서 맞히면 게임") · 넘어가기는 머리띠 오른쪽 작은 단추 · 아래 띠 높이는 늘 그대로
//  앞 칸을 건너뛰고 들어오면 "이 칸은 ○○를 알면 더 쉬워요" 한 번 + 바로 가기(잠그지 않음).
//  방 번호 다같이(docs/room.md): #/cell/<칸>/<단계>로 시작 단계를 받음 · TV 모드에서 방이 열려 있으면 단계마다 알리고 모인 결과 띠를 보임
//   · 방에 있는 아이 기기는 확인 게임 결과를 보내고 결과 아래 '다음 놀이' 대신 "선생님을 기다려요"
import { h, onPress, josa } from '../util.js';
import { friendImg, setPose, preload, BAND } from '../band.js';
import * as room from '../room.js';
import { cellById, LANES, missingPre, nextCell } from '../../../engine/cells.js';
import * as K from '../cellkit.js';
import { TV_STEPS, TV_SCRIPT } from '../../../engine/tvscript.js';

const PHASES = [['show', '보기'], ['follow', '연습'], ['game', '확인 게임']];
const warned = new Set();                    // 이 창에서 한 번만 안내

export default function mount(root, ctx) {
  const { engine, device, bar } = ctx;
  const cell = cellById(ctx.args && ctx.args[0]);
  const tv = ctx.mode === 'tvcell';                 // TV 하나로 반 전체 — 아이들은 몸으로 답하고 선생님이 대신 누름
  if (!cell) { ctx.go(tv ? 'tv' : 'map'); return null; }
  const troom = tv ? room.teacher.get() : null;     // 선생님 방(열려 있으면 단계마다 아이 기기에 알림)
  if (cell.route) { if (troom) room.teacher.pub(cell.id, 'game'); ctx.go(cell.route); return null; }
  const startAt = Math.max(0, PHASES.findIndex(p => p[0] === (ctx.args && ctx.args[1])));
  const inRoom = !tv && !!room.kid.get();          // 방에 있는 아이 기기
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
  // TV 수업 안내 줄(선생님용 · 접을 수 있음) — 단계 · 시간 · 그대로 읽어도 되는 발문
  const guideStep = h('span', { class: 'tvg-step' }), guideText = h('span', { class: 'tvg-text' });
  const guideToggle = h('button', { type: 'button', class: 'tvg-hide', 'aria-label': '안내 접기' }, '접기');
  // 모인 결과 띠(방이 열린 TV만) — 들어온 기기 · 끝낸 아이 + 끝낸 아이 칩(친구 얼굴 + 번호 + 별)
  const stripHead = h('span', { class: 'rs-head' }), stripChips = h('span', { class: 'rs-chips' });
  //  띠를 누르면 무대 위에 모두 크게(반 전체 30명은 띠에 다 안 들어감 — 띠는 막 끝낸 아이부터)
  const strip = troom ? h('div', { class: 'rstrip', role: 'button', tabindex: '0', 'aria-label': '모인 결과 크게 보기' }, h('span', { class: 'rs-room' }, `방 ${troom.room}`), stripHead, stripChips) : null;
  const allEl = h('div', { class: 'overlay rsall', hidden: true });
  if (strip) onPress(strip, () => { allEl.hidden = !allEl.hidden; stripSig = ''; drawStrip(); });
  const guide = h('div', { class: 'tvguide' + (troom ? ' hasroom' : ''), hidden: !tv }, guideStep, guideText, strip, guideToggle);
  onPress(guideToggle, () => { guide.classList.toggle('folded'); guideToggle.textContent = guide.classList.contains('folded') ? '안내' : '접기'; stripSig = ''; drawStrip(); });
  const setGuide = key => {
    if (!tv) return;
    const i = TV_STEPS.findIndex(s => s.key === key), st = TV_STEPS[i], sc = TV_SCRIPT[cell.id] || {};
    guideStep.textContent = `${i + 1} ${st.name} · ${st.min}분`;
    guideText.textContent = sc[key] || '';
  };
  if (troom) stage.append(allEl);
  const screenEl = h('div', { class: 'cellscreen' + (tv ? ' tvmode' : '') }, stage, guide, barEl);
  root.append(screenEl);

  let mod = null, phase = -1, cleanup = null, auto = null, gone = false, tellTimer = 0;
  let since = 0, resList = [], resultShown = false, sentP = null, stripSig = '';       // since = 이번 판 시작(서버 시각) — 이 뒤에 온 이 칸 결과만 모음
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
      if (tellEl.animate) tellEl.animate([{ transform: 'scale(.85)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });   /* 강제 레이아웃 X(성능) */
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
    const again = resultShown && i === 2;           // 결과 뒤 '한 번 더' → 새 판(앞 판 결과는 띠에서 뺌)
    resultShown = false;
    phase = i; auto = null;
    if (troom) room.teacher.pub(cell.id, PHASES[i][0]).then(r => { if (r.at && (!since || again)) { since = r.at; drawStrip(); } });
    overlay.hidden = true; overlay.replaceChildren(); overlay.classList.remove('result');
    body.replaceChildren(); ui.say(''); ui.count(null); ui.tell(null); ui.practice(i === 1 && !tv ? 0 : null);
    setGuide(PHASES[i][0]);
    bar.mid(steps());
    bar.right(rightBtns(i));
    const key = PHASES[i][0];
    // 기본 아래 띠 — 칸 모듈이 ui.setBar로 바꿀 수 있다(연습 · 게임은 '다시 듣기'나 큰 '톡'을 칸이 넣음)
    if (key === 'show') ui.setBar(goBtn('연습해 볼래요', () => runPhase(1)));
    else ui.setBar();
    cleanup = mod[key](ui, kit) || null;
    drawStrip();
  }

  // 모인 결과 띠 그리기 — 보기 · 연습 단계는 들어온 기기 수만, 확인 게임 · 결과 단계는 끝낸 아이 칩까지
  function drawStrip() {
    if (!strip) return;
    const showDone = phase === 2 || resultShown;
    const done = resList.filter(r => r.c === cell.id && r.n > 0 && (r.at || 0) >= since);
    const sig = [showDone, allEl.hidden, resList.length, done.map(r => `${r.dev}:${r.s}:${r.at}`).join(',')].join('|');
    if (sig === stripSig) return;                   // 바뀐 것이 없으면 다시 그리지 않음(그림 깜빡임 X)
    stripSig = sig;
    const head = showDone ? `들어온 기기 ${resList.length}대 · 끝낸 아이 ${done.length}명` : `들어온 기기 ${resList.length}대`;
    stripHead.textContent = head;
    const chip = r => h('span', { class: 'rs-chip', 'data-no': r.no, 'data-s': r.s },
      friendImg((BAND[r.a] || BAND[0]).key, 'face', { label: false }),
      h('b', {}, String(r.no)),
      h('span', { class: 'rs-stars', 'aria-label': `별 ${r.s}`, html: [0, 1, 2].map(j => K.STAR_SVG(j < r.s)).join('') }));
    // 띠 = 막 끝낸 아이부터(자기 번호가 뜨는 걸 보게) · 넘치는 칩은 숨기고 '+n'(스크롤 X)
    stripChips.replaceChildren(...(showDone ? [...done].sort((a, b) => (b.at || 0) - (a.at || 0)) : []).map(chip));
    requestAnimationFrame(() => {
      if (gone || !stripChips.isConnected) return;
      const kids = [...stripChips.children], max = stripChips.clientWidth;
      const total = kids.reduce((w, c) => w + c.offsetWidth + 8, -8);
      if (total <= max + 1) return;
      let w = 0, hiddenN = 0;
      for (const c of kids) { w += c.offsetWidth + 8; if (w > max - 130) { c.hidden = true; hiddenN++; } }
      if (hiddenN) stripChips.append(h('span', { class: 'rs-more' }, `+${hiddenN} 모두 보기`));
    });
    // 크게 보기 — 번호 차례로 모두
    if (!allEl.hidden) {
      const close = h('button', { type: 'button' }, '닫기');
      onPress(close, () => { allEl.hidden = true; });
      allEl.replaceChildren(h('div', { class: 'panelcard rsall-card' },
        h('div', { class: 'rsall-top' }, h('h2', {}, head), close),
        done.length ? h('div', { class: 'rsall-grid' }, ...[...done].sort((a, b) => (a.no || 0) - (b.no || 0)).map(chip))
          : h('p', { class: 'rsall-none' }, showDone ? '아직 끝낸 아이가 없어요' : '확인 게임이 끝나면 여기에 모여요')));
    }
  }
  const stripLoop = troom ? room.loop(async () => {
    const r = await room.teacher.res(troom);
    if (!r.ok || gone) { if (strip) strip.classList.toggle('off', !r.net); return; }
    strip.classList.remove('off');
    resList = r.list;
    drawStrip();
  }, room.TV_TICK) : null;

  const kit = {
    engine, device, cell, friend,
    band: device.band || 'mid',
    h, onPress, friendImg, setPose,
    ...K,
    next: () => runPhase(Math.min(PHASES.length - 1, phase + 1)),
    // 연습을 세 번 이어서 맞혀 지남 → 확인 게임 단추
    pass(msg = '세 번 이어서 맞혔어요') {
      if (PHASES[phase][0] !== 'follow') return;
      if (!tv) ui.practice(3);
      ui.say(msg + ' — 이제 ' + (tv ? '반 전체 게임!' : '확인 게임!'));
      ui.setBar(goBtn('확인 게임', () => runPhase(2)));
      auto = () => runPhase(2);
    },
    // 확인 게임 끝 — r = { title, facts, starOn, rules, tip, replay, group }
    finish(r) {
      if (gone) return;
      const stars = r.starOn.filter(Boolean).length;
      if (!tv) K.saveStars(cell.id, stars);         // TV 반 전체 결과는 이 기기 아이 기록에 넣지 않음
      resultShown = true;
      // 방에 있는 아이 기기 + 선생님 칸이면 결과를 TV로(맞힌 수 = 제목 'N번 중 M번' · 없으면 다시 보기 줄)
      const roomCell = inRoom && (room.kid.last ? room.kid.isTeacherCell(cell.id) : startAt > 0 || !!(ctx.args && ctx.args[1]));
      if (roomCell) {
        const m = /(\d+)번 중 (\d+)번/.exec(r.title || '');
        const n = m ? +m[1] : (r.replay || []).length, k = m ? +m[2] : (r.replay || []).filter(Boolean).length;
        sentP = room.kid.send(cell.id, stars, k, n);
      }
      ui.tell(null); ui.say(''); ui.count(null); ui.practice(null);
      const pose = stars >= 3 ? 'happy' : stars >= 1 ? 'play' : 'idle';   /* 평가 3차: 점수와 상관없는 만세 X */
      overlay.classList.add('result');
      overlay.replaceChildren(h('div', { class: 'resultwrap' }, K.resultCard(r), friendImg(friend, pose, { label: false, cls: 'resultpal' })));
      overlay.hidden = false;
      bar.mid(h('span', { class: 'steps labeled' }, ...PHASES.map(([, name]) => h('span', { class: 'st done' }, h('span', { class: 'd' }), name))));
      bar.right(null);
      if (tv) {                                     // TV: 반 결과 뒤 '먼저 예측하기' — 놀이터에서 하나만 바꿔 보기 전에 묻기
        setGuide('predict');
        if (troom) room.teacher.pub(cell.id, 'done');
        drawStrip();
        ui.setBar(subBtn('한 번 더', () => runPhase(2), 'again'), goBtn('곡 바꾸기에서 해 보기', () => ctx.go('play')));
        auto = null;
        window.__cellResult = { id: cell.id, stars, ...r };
        return;
      }
      const again = subBtn('한 번 더', () => runPhase(2), 'again');
      if (roomCell) {                               // 방: 다음 놀이는 선생님이 고름
        const sub = h('small', {}, '');
        ui.setBar(again, h('span', { class: 'rwait' }, friendImg((BAND[room.kid.get().a] || BAND[0]).key, 'face', { label: false }), h('span', { class: 'rwait-t' }, '선생님을 기다려요', sub)));
        if (sentP) sentP.then(ok => { if (ok && sub.isConnected) sub.textContent = '별을 TV로 보냈어요'; });
        auto = null;
        window.__cellResult = { id: cell.id, stars, ...r };
        return;
      }
      const nx = nextCell(K.getProg(), cell.id);
      const goNext = () => { const c = cellById(nx); ctx.go(c.route || 'cell/' + nx); };
      if (stars === 0) {                            // 별 0개 — 주황(지금 누를 것)은 '한 번 더' · 다음은 흰 단추(평가 3차)
        ui.setBar(subBtn(nx && nx !== cell.id ? '다음 놀이' : '마을 지도', () => (nx && nx !== cell.id ? goNext() : ctx.go('map'))), goBtn('한 번 더', () => runPhase(2)));
      } else {
        ui.setBar(again, nx && nx !== cell.id ? goBtn('다음 놀이', goNext) : goBtn('마을 지도', () => ctx.go('map')));
      }
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
    // 방 아이 기기가 선생님 단계를 따라가게 — 같은 칸이면 다시 열지 않고 단계만 바꿈
    if (inRoom) room.here.cur = { cell: cell.id, idx: () => (overlay.hidden ? phase : 3), go: i => runPhase(i) };
    const miss = missingPre(K.getProg(), cell.id).map(cellById).filter(c => c && c.first);
    if (miss.length && !warned.has(cell.id) && !tv && !inRoom && !startAt) {
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
    runPhase(startAt);
  })();

  return () => {
    gone = true; clearTimeout(tellTimer); if (cleanup) try { cleanup(); } catch { /* */ }
    window.__cellAuto = null; window.__cellPhase = null; css.remove();
    if (stripLoop) stripLoop.stop();
    if (room.here.cur && room.here.cur.cell === cell.id) room.here.cur = null;
  };
}
