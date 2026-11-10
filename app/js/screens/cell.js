// 개념 칸 화면 — #/cell/<칸> · 한 칸이 도는 순서(계획서): 보기 → 연습 → 확인 게임 → 결과
//  칸 내용은 app/js/cells/<칸>.js 가 그린다(약속: docs/cells.md). 이 화면은 차례 · 머리띠 · 맨 위 한 줄 · 아래 띠 · 결과 · 진행 저장.
//  11-07 평가 2차: 모든 칸이 같은 자리를 쓰게 — 맨 위 한 줄 = [문제 번호] 지시 글 …… [말풍선(맞아 · 다시 들어 봐 · 1 2 3 4)]
//   연습 점은 아래 띠 왼쪽 한 곳("3번 이어서 맞히면 게임") · 넘어가기는 머리띠 오른쪽 작은 단추 · 아래 띠 높이는 늘 그대로
//  앞 칸을 건너뛰고 들어오면 "이 칸은 ○○를 알면 더 쉬워요" 한 번 + 바로 가기(잠그지 않음).
//  방 번호 다같이(docs/room.md): #/cell/<칸>/<단계>로 시작 단계를 받음 · TV 모드에서 방이 열려 있으면 단계마다 알리고 모인 결과 띠를 보임
//   · 방에 있는 아이 기기는 확인 게임 결과를 보내고 결과 아래 '다음 놀이' 대신 "선생님을 기다려요"
//  1~2학년 판(device.band 'low' · 성취기준 점검 11-08): 칸 이름 = cellName · 지시 · 말풍선 · 답 단추 · 결과 카드 · 시작 카드 글은
//   여기 한 곳에서 쉬운 말 바꾸기 표(engine/cells.js easyText)를 거친다. 칸이 무대에 직접 그리는 글은 kit.ez로.
//  결과 기록(과정 평가 자료): 확인 게임이 끝날 때마다 cellkit.saveResult(날짜 · 별 · 맞힌 수/전체 · 틀린 갈래 한 줄 · 최근 10개)
import { h, onPress, josa, copyText, lsGet } from '../util.js';
import { friendImg, setPose, preload, BAND } from '../band.js';
import * as room from '../room.js';
import { cellById, LANES, missingPre, nextCell, cellName, easyText, PLAY_CARD } from '../../../engine/cells.js';
import * as K from '../cellkit.js';
import { TV_STEPS, TV_SCRIPT } from '../../../engine/tvscript.js';
import { starSounds } from '../music.js';
import * as music from '../music.js';
import { levelsOf, newParts } from '../../../engine/theme.js';

const PHASES = [['show', '보기'], ['follow', '연습'], ['game', '확인 게임']];
// 소리는 TV 하나 · 답은 각자(11-08 토론 T1 · 교사 승인) — 이 칸들은 방이 열린 TV의 확인 게임에서 TV만 소리를 내고 아이 기기는 답만
//  TVS_LEAD = 알림 뒤 첫 판까지(아이 기기가 따라오고 서버 시각을 맞출 틈) · 이 기기 시각(Date ms) → performance.now() 시각
const TVS = new Set(['so4']), TVS_LEAD = 5000;
const perfAt = wall => performance.now() + (wall - Date.now());
const warned = new Set();                    // 이 창에서 한 번만 안내

export default function mount(root, ctx) {
  const { engine, device, bar } = ctx;
  const cell = cellById(ctx.args && ctx.args[0]);
  const tv = ctx.mode === 'tvcell';                 // TV 하나로 반 전체 — 아이들은 몸으로 답하고 선생님이 대신 누름
  if (!cell) { ctx.go(tv ? 'tv' : 'map'); return null; }
  const troom = tv ? room.teacher.get() : null;     // 선생님 방(열려 있으면 단계마다 아이 기기에 알림)
  if (cell.route) { if (troom) room.teacher.pub(cell.id, 'game'); ctx.go(tv ? 'tv' + cell.route : cell.route); return null; }   // TV면 TV판(#/tvtap — 아이 기록 X)
  const startAt = Math.max(0, PHASES.findIndex(p => p[0] === (ctx.args && ctx.args[1])));
  const inRoom = !tv && !!room.kid.get();          // 방에 있는 아이 기기
  const friend = LANES[cell.lane].friend;
  const band = device.band || 'mid', low = band === 'low';
  const E = low ? easyText : (t => t);              // 1~2학년 판 쉬운 말(그 밖에는 그대로)
  bar.title(cellName(cell, band), friend);
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
  //  단계 칩 옆 = 이 칸의 성취기준(선생님만 · TV 모드에서만 보임)
  const guideStd = cell.std ? K.stdEl(cell.std, 'tvg-std') : null;
  const guideToggle = h('button', { type: 'button', class: 'tvg-hide', 'aria-label': '안내 접기' }, '접기');
  // 모인 결과 띠(방이 열린 TV만) — 보기 · 연습 = 들어온 기기 수 · 확인 게임 · 결과 = '끝낸 아이 n / m' 반 막대 하나 + '아직 k명'(수만)
  //  TV에는 아이 번호 · 아이별 별을 보이지 않음(11-08 토론 X6 · 9살 공격 채택: 반 전체 앞에 누가 못 끝냈는지 · 별이 몇 개인지 드러남)
  const stripHead = h('span', { class: 'rs-head' }), stripDone = h('span', { class: 'rs-done' });
  //  띠를 누르면 무대 위에 크게(같은 규칙 + 별 분포 — 1~3명인 칸은 '조금')
  const strip = troom ? h('div', { class: 'rstrip', role: 'button', tabindex: '0', 'aria-label': '모인 결과 크게 보기' }, h('span', { class: 'rs-room' }, `방 ${troom.room}`), stripHead, stripDone) : null;
  const allEl = h('div', { class: 'overlay rsall', hidden: true });
  if (strip) onPress(strip, () => { allEl.hidden = !allEl.hidden; stripSig = ''; drawStrip(); });
  //  모인 결과 복사 — "번호 · 짝꿍 · 별 · 맞힌 수/전체" 줄(탭으로 나눔 · 표 프로그램에 붙여 넣기 좋게 · 선생님 클립보드로 — TV 화면에는 번호 X)
  const copyBtn = troom ? h('button', { type: 'button', class: 'rs-copy', 'aria-label': '모인 결과 복사' }, '복사') : null;
  if (copyBtn) onPress(copyBtn, () => copyText(stripCopyText(), { title: '모인 결과' }));
  const guide = h('div', { class: 'tvguide' + (troom ? ' hasroom' : ''), hidden: !tv }, guideStep, guideStd, guideText, strip, copyBtn, guideToggle);
  onPress(guideToggle, () => { guide.classList.toggle('folded'); guideToggle.textContent = guide.classList.contains('folded') ? '안내' : '접기'; stripSig = ''; drawStrip(); });
  const setGuide = key => {
    if (!tv) return;
    const i = TV_STEPS.findIndex(s => s.key === key), st = TV_STEPS[i], sc = TV_SCRIPT[cell.id] || {};
    guideStep.textContent = `${i + 1} ${st.name} · ${st.min}분`;
    guideText.textContent = E((key === 'game' && troom && TVS.has(cell.id) && sc.game_tvs) || sc[key] || '');   // 방이 열린 TVS 칸은 'TV 소리 · 각자 답' 발문
  };
  if (troom) stage.append(allEl);
  const screenEl = h('div', { class: 'cellscreen' + (tv ? ' tvmode' : '') }, stage, guide, barEl);
  root.append(screenEl);

  let mod = null, phase = -1, cleanup = null, auto = null, gone = false, tellTimer = 0;
  let showTap = null, tvsReady = null, resSubs = new Set(), since = 0, gameAt = 0, resList = [], resultShown = false, sentP = null, stripSig = '';   // gameAt = 확인 게임 알림의 서버 시각(판 씨앗 · N2)       // since = 이번 판 시작(서버 시각) — 이 뒤에 온 이 칸 결과만 모음
  const ui = {
    stage: body,
    bar: barSlot,
    // 지시 한 줄 — 단계마다(확인 게임 중에도) 같은 자리
    say: t => { sayEl.textContent = E(t || ''); },
    // 문제 번호 '3 / 12' — 맨 위 한 줄 왼쪽
    count: (i, n) => { if (i == null) { countEl.hidden = true; return; } countEl.hidden = false; countEl.textContent = `${i} / ${n}`; },
    // 말풍선 — 맞아 · 다시 들어 봐 · 박 세기(1 2 3 4). kind: good | oops | count | info · ms 뒤 사라짐(0 = 그대로)
    tell(t, kind = 'info', ms = 1200) {
      clearTimeout(tellTimer);
      if (!t) { tellEl.hidden = true; return; }
      tellEl.hidden = false; tellEl.textContent = E(t); tellEl.dataset.k = kind;
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
    if (showTap) { body.removeEventListener('pointerdown', showTap, true); showTap = null; }
    phase = i; auto = null; K.sfx.reset(); music.stopFx();   // 이어 맞힘 사다리는 단계마다 처음부터 · 결과 팡파르는 멈춤
    // 소리는 TV 하나 · 답은 각자(TVS 칸 · 방이 열린 TV의 확인 게임) — 판 씨앗을 함께 알리고, 알림 시각 + LEAD부터 모든 기기가 같은 판 시간표
    tvsReady = null;
    const tvsOn = troom && i === 2 && TVS.has(cell.id);
    const sdNew = tvsOn ? (Math.random() * 4294967296) >>> 0 : null;
    if (troom) {
      const job = room.teacher.pub(cell.id, PHASES[i][0], undefined, tvsOn ? { sd: sdNew } : {});
      job.then(r => { if (r.at && i === 2) gameAt = r.at; if (r.at && (!since || again)) { since = r.at; drawStrip(); } });
      if (tvsOn) tvsReady = job.then(r => (r.ok ? { sd: sdNew, start: perfAt(r.at + TVS_LEAD - r.off) } : null));
    } else if (inRoom && i === 2 && TVS.has(cell.id) && room.kid.last && room.kid.last.cell === cell.id && room.kid.last.phase === 'game' && Number.isInteger(room.kid.last.sd)) {
      const p = room.kid.last;
      tvsReady = room.kid.clock().then(c => ({ sd: p.sd, start: perfAt(p.at + TVS_LEAD - (c ? c.off : 0)) }));
    }
    overlay.hidden = true; overlay.replaceChildren(); overlay.classList.remove('result');
    body.replaceChildren(); ui.say(''); ui.count(null); ui.tell(null); ui.practice(i === 1 && !tv ? 0 : null);
    setGuide(PHASES[i][0]);
    bar.mid(steps());
    bar.right(rightBtns(i));
    const key = PHASES[i][0];
    // 기본 아래 띠 — 칸 모듈이 ui.setBar로 바꿀 수 있다(연습 · 게임은 '다시 듣기'나 큰 '톡'을 칸이 넣음)
    if (key === 'show') {
      // 보기 — '연습해 볼래요'는 처음엔 흰 단추, 예시 카드를 두 번 들으면 주황(지금 누를 것)으로(X10 · 9살 눈: 첫 10초에 보기를 건너뜀)
      //  잠금 X — 흰 단추일 때도 누르면 바로 연습. TV는 선생님이 시범하므로 처음부터 주황
      const b = goBtn('연습해 볼래요', () => runPhase(1));
      if (!tv) {
        b.classList.remove('go'); b.classList.add('soon');
        let n = 0;
        showTap = e => { if (e.target.closest && e.target.closest('.excard') && ++n >= 2) { b.classList.add('go'); b.classList.remove('soon'); body.removeEventListener('pointerdown', showTap, true); showTap = null; } };
        body.addEventListener('pointerdown', showTap, true);
      }
      ui.setBar(b);
    }
    else ui.setBar();
    cleanup = mod[key](ui, kit) || null;
    drawStrip();
  }

  // 모인 결과 띠 그리기 — 보기 · 연습 단계는 들어온 기기 수만, 확인 게임 · 결과 단계는 '끝낸 아이 n / m' 반 막대(번호 · 아이별 별 X · X6)
  //  m = 들어온 기기(방 res 칸 수) · n = 이 칸 · 이번 판 시작 뒤 결과를 보낸 기기(TVS 판 중간 답 글자는 n = 0이라 안 셈)
  const FEW = 3;                                    // 별 분포에서 이 수 이하인 칸은 '조금'(1~3명 — 누군지 짐작하지 않게)
  const classBar = (n, m) => h('span', { class: 'rs-bar', role: 'img', 'aria-label': `끝낸 아이 ${n} / ${m}` }, h('i', { style: { width: `${m ? Math.round(100 * Math.min(n, m) / m) : 0}%` } }));
  function drawStrip() {
    if (!strip) return;
    const showDone = phase === 2 || resultShown;
    const done = resList.filter(r => r.c === cell.id && r.n > 0 && (r.at || 0) >= since);
    const m = resList.length, n = done.length, left = Math.max(0, m - n);
    const dist = [3, 2, 1, 0].map(s => done.filter(r => (r.s || 0) === s).length);
    const sig = [showDone, allEl.hidden, m, n, dist.join(',')].join('|');
    if (sig === stripSig) return;                   // 바뀐 것이 없으면 다시 그리지 않음(그림 깜빡임 X)
    stripSig = sig;
    const head = showDone ? `끝낸 아이 ${n} / ${m}` : `들어온 기기 ${m}대`;
    stripHead.textContent = head;
    stripDone.replaceChildren(...(showDone ? [classBar(n, m), left ? h('span', { class: 'rs-left' }, `아직 ${left}명`) : null] : []).filter(Boolean));   /* replaceChildren(null)은 'null' 글이 됨 */
    // 크게 보기 — 같은 규칙 + 별 분포(별 셋 · 둘 · 하나 · 0 칸마다 몇 명 · 1~3명은 '조금'으로 막대도 같은 짧은 토막)
    if (!allEl.hidden) {
      const close = h('button', { type: 'button' }, '닫기');
      onPress(close, () => { allEl.hidden = true; });
      const copy2 = h('button', { type: 'button' }, '복사');
      onPress(copy2, () => copyText(stripCopyText(), { title: '모인 결과' }));
      const dist2 = h('div', { class: 'rsall-dist', role: 'list', 'aria-label': '별 분포' }, ...dist.map((c, j) => {
        const st = 3 - j, few = c > 0 && c <= FEW;
        return h('div', { class: 'rsd-row', role: 'listitem' },
          h('span', { class: 'rsd-stars', 'aria-label': `별 ${st}개`, html: [0, 1, 2].map(k => K.STAR_SVG(k < st)).join('') }),
          h('span', { class: 'rsd-bar' }, c ? h('i', { class: few ? 'few' : null, style: few ? null : { width: `${Math.round(100 * c / n)}%` } }) : null),
          h('b', {}, few ? '조금' : `${c}명`));
      }));
      allEl.replaceChildren(h('div', { class: 'panelcard rsall-card' },
        h('div', { class: 'rsall-top' }, h('h2', {}, head), h('span', { class: 'rsall-btns' }, copy2, close)),
        showDone ? h('div', { class: 'rsall-done' }, classBar(n, m), h('span', { class: 'rs-left' }, left ? `아직 ${left}명` : '')) : null,
        showDone && n ? dist2 : h('p', { class: 'rsall-none' }, showDone ? '아직 끝낸 아이가 없어요' : '확인 게임이 끝나면 여기에 모여요')));
    }
  }
  // 모인 결과를 글로 — 지금 판(이 칸 · since 뒤)에 끝낸 아이, 번호 차례
  function stripCopyText() {
    const done = resList.filter(r => r.c === cell.id && r.n > 0 && (r.at || 0) >= since).sort((a, b) => (a.no || 0) - (b.no || 0));
    const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [`${cell.label} ${cell.name}\t${day}\t방 ${troom.room}`, '번호\t짝꿍\t별\t맞힌 수/전체',
      ...done.map(r => `${r.no ?? ''}\t${(BAND[r.a] || BAND[0]).name}\t${r.s ?? 0}\t${r.k ?? ''}/${r.n ?? ''}`)].join('\n');
  }
  const stripLoop = troom ? room.loop(async () => {
    const r = await room.teacher.res(troom);
    if (!r.ok || gone) { if (strip) strip.classList.toggle('off', !r.net); return; }
    strip.classList.remove('off');
    resList = r.list;
    drawStrip();
    for (const f of resSubs) try { f(resList, gameAt); } catch (e) { console.error(e); }
  }, room.TV_TICK) : null;

  const kit = {
    engine, device, cell, friend,
    band,
    h, onPress, friendImg, setPose,
    ...K,
    ez: E,                                          // 칸이 무대에 직접 그리는 글 — 1~2학년 판이면 쉬운 말로
    // 고르기 답 단추 — 글 라벨은 쉬운 말 표를 거침(그림 · 노드 라벨은 그대로)
    answers: (items, onPick, o) => K.answers(items.map(it => (typeof it.label === 'string' ? { ...it, label: E(it.label) } : it)), onPick, o),
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
      const before = K.getProg(), best0 = (before[cell.id] && before[cell.id].stars) || 0, lv0 = levelsOf(before);
      if (!tv) K.saveResult(cell.id, { ...r, stars, mode: r.mode || (inRoom ? 'room' : 'solo') });   // TV 반 전체 결과는 이 기기 아이 기록에 넣지 않음 · 기록은 원래 말 그대로(선생님이 봄) · r 꼬리표 = 혼자/방/TV 소리(X4)
      // 결과 소리 — 별 하나씩(도 미 솔) · 셋이면 팡파르 · 이번에 처음 받은 별엔 '새 별' · 처음 화면 음악에 새 줄이 생겼으면 한 줄(docs/sound.md §5)
      const delays = starSounds(stars, r.starOn);
      const fresh = tv || !music.enabled() ? [] : newParts(lv0, levelsOf(K.getProg()));   // 배경 음악을 안 트는 기기(끔 · 방)면 X
      resultShown = true;
      // 방에 있는 아이 기기 + 선생님 칸이면 결과를 TV로(맞힌 수 = 제목 'N번 중 M번' · 없으면 다시 보기 줄)
      const roomCell = inRoom && (room.kid.last ? room.kid.isTeacherCell(cell.id) : startAt > 0 || !!(ctx.args && ctx.args[1]));
      if (roomCell) {
        const m = /(\d+)번 중 (\d+)번/.exec(r.title || '');
        const n = m ? +m[1] : (r.replay || []).length, k = m ? +m[2] : (r.replay || []).filter(Boolean).length;
        sentP = room.kid.send(cell.id, stars, k, n, r.ans || null);
      }
      ui.tell(null); ui.say(''); ui.count(null); ui.practice(null);
      const pose = stars >= 3 ? 'happy' : stars >= 1 ? 'play' : 'idle';   /* 평가 3차: 점수와 상관없는 만세 X */
      overlay.classList.add('result');
      const shown0 = low ? { ...r, title: E(r.title), facts: (r.facts || []).map(E), rules: (r.rules || []).map(E), tip: E(r.tip) } : r;
      const shown = { ...shown0, delays, newFrom: tv ? 3 : best0, fresh };
      overlay.replaceChildren(h('div', { class: 'resultwrap' }, K.resultCard(shown), friendImg(friend, pose, { label: false, cls: 'resultpal' })));
      overlay.hidden = false;
      bar.mid(h('span', { class: 'steps labeled' }, ...PHASES.map(([, name]) => h('span', { class: 'st done' }, h('span', { class: 'd' }), name))));
      bar.right(null);
      if (tv) {                                     // TV: 반 결과 뒤 '먼저 예측하기' — 놀이터에서 하나만 바꿔 보기 전에 묻기
        setGuide('predict');
        if (troom) room.teacher.pub(cell.id, 'done');
        drawStrip();
        const pc = PLAY_CARD[cell.id];   // 배운 요소의 부탁으로 바로(11-10)
        ui.setBar(subBtn('한 번 더', () => runPhase(2), 'again'), goBtn(pc ? '곡에서 ' + pc[1] : '곡 바꾸기에서 해 보기', () => ctx.go(pc ? 'play/' + pc[0] : 'play')));
        auto = null;
        window.__cellResult = { id: cell.id, stars, ...r };
        return;
      }
      const again = subBtn('한 번 더', () => runPhase(2), 'again');
      if (roomCell) {                               // 방: 다음 놀이는 선생님이 고름
        ui.setBar(again, h('span', { class: 'rwait' }, friendImg((BAND[room.kid.get().a] || BAND[0]).key, 'face', { label: false }), h('span', { class: 'rwait-t' }, '선생님을 기다려요')));
        // 결과를 보냈으면 결과 카드에 한 줄(X6 — TV에는 번호 · 별이 안 뜨니 '내 것도 갔나'를 내 기기에서)
        const card = overlay.querySelector('.resultcard');
        if (sentP) sentP.then(ok => { if (ok && card && card.isConnected && !card.querySelector('.rsent')) card.append(h('p', { class: 'rsent' }, 'TV에 갔어요')); });
        auto = null;
        window.__cellResult = { id: cell.id, stars, ...r };
        return;
      }
      const nx = nextCell(K.getProg(), cell.id);
      const goNext = () => { const c = cellById(nx); ctx.go(c.route || 'cell/' + nx); };
      if (stars === 0) {                            // 별 0개 — 주황(지금 누를 것)은 '한 번 더' · 다음은 흰 단추(평가 3차)
        ui.setBar(subBtn(nx && nx !== cell.id ? '다음 놀이' : '마을 지도', () => (nx && nx !== cell.id ? goNext() : ctx.go('map'))), goBtn('한 번 더', () => runPhase(2)));
      } else {
        const pc = PLAY_CARD[cell.id];               // 별을 받았으면 흰 단추로 '곡에서 ○○ 바꿔 보기'(그 부탁이 바로 열림 · 11-10)
        ui.setBar(again, ...(pc ? [subBtn('곡에서 ' + pc[1], () => ctx.go('play/' + pc[0]), 'toplay')] : []), nx && nx !== cell.id ? goBtn('다음 놀이', goNext) : goBtn('마을 지도', () => ctx.go('map')));
      }
      auto = null;
      window.__cellResult = { id: cell.id, stars, ...r };
    },
    setAuto: fn => { auto = fn; },
    // 소리는 TV 하나 · 답은 각자 — 이 판이 그 모드면 { role: 'tv' | 'kid', ready: Promise<{ sd, start(performance.now ms) } | null> } · 아니면 null
    tvs: () => (tvsReady ? { role: troom ? 'tv' : 'kid', ready: tvsReady } : null),
    // TV: 모인 결과가 새로 올 때마다 fn(list, gameAt) — 정리 함수를 돌려줌
    onRes: fn => { resSubs.add(fn); if (resList.length) fn(resList, gameAt); return () => resSubs.delete(fn); },
    refreshRes: () => { if (stripLoop) stripLoop.now(); },
    // 아이: 판마다 답 글자 보내기(TV 비율 막대)
    sendAns: ans => (inRoom ? room.kid.progress(cell.id, ans) : Promise.resolve(false)),
    // 판 씨앗(N2) — 시험 덮어쓰기(?seed=N · 저장 'seed') > 방 아이 기기(방 · 칸 · 선생님 알림 시각) > 방이 열린 TV(같은 값) > 혼자(그때그때)
    //  같은 방 같은 판이면 TV와 아이 기기가 같은 차례 — DB 규칙은 그대로(pub.at은 이미 있음)
    seed() {
      const q = /[?&]seed=(\d+)/.exec(location.search), ls = lsGet('seed', null);
      if (q || ls != null) return K.seedOf('seed', q ? q[1] : ls, cell.id);
      const kr = inRoom && room.kid.get();
      if (kr && room.kid.last && room.kid.last.cell === cell.id && room.kid.last.at) return K.seedOf(kr.room, cell.id, room.kid.last.at);
      if (troom && gameAt) return K.seedOf(troom.room, cell.id, gameAt);
      return K.seedOf(cell.id, Date.now(), Math.random());
    },
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
        h('h2', {}, `이 놀이는 ${josa(cellName(m, band), '을/를')} 알면 더 쉬워요`),
        h('p', { class: 'sub' }, '먼저 해 봐도 되고, 그냥 해도 돼요')));
      ui.setBar(subBtn(`${cellName(m, band)} 먼저`, () => ctx.go(m.route || 'cell/' + m.id)), goBtn('그냥 할래요', () => runPhase(0)));
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
