// 앱 시작 — 주소 뒤 #/이름 으로 화면을 고른다. 화면 모듈 = export default mount(root, ctx) → 정리 함수
//  머리띠: 왼쪽 뒤로 · 제목(+맡은 친구 얼굴) · 가운데 단계(화면이 채움) · 오른쪽 처음 화면은 선생님 톱니, 놀이 화면은 화면이 채움
import { h, toast, josa } from './util.js';
import { engine } from './audio.js';
import { device } from './device.js';
import { friendImg, BAND } from './band.js';
import * as room from './room.js';
import * as music from './music.js';
import { STEP_TEXT } from '../../engine/theme.js';
import './eq.js';                       // 스피커 점검 값(음높이별 크기)을 모든 소리에

const ROUTES = {
  '': { load: () => import('./screens/home.js') },
  tap: { load: () => import('./screens/tap.js'), title: '징검다리 박 놀이', friend: 'hog', parent: 'map' },
  songs: { load: () => import('./screens/songs.js'), title: '곡 듣기', friend: 'turtle' },
  map: { load: () => import('./screens/map.js'), title: '음악 마을 지도', friend: 'bird' },
  play: { load: () => import('./screens/play.js'), title: '곡 바꾸기', friend: 'bear' },
  tv: { load: () => import('./screens/tvpick.js'), title: 'TV로 다같이', parent: 'teacher' },
  join: { load: () => import('./screens/join.js'), title: '방 들어가기' },
  tvcell: { load: () => import('./screens/cell.js'), title: '', parent: 'tv' },
  tvtap: { load: () => import('./screens/tap.js'), title: '징검다리 박 놀이', friend: 'hog', parent: 'tv' },
  cell: { load: () => import('./screens/cell.js'), title: '', parent: 'map' },
  teacher: { load: () => import('./screens/teacher.js'), title: '선생님' },
  calib: { load: () => import('./screens/calib.js'), title: '지연 맞추기', parent: 'teacher' },
  speaker: { load: () => import('./screens/speaker.js'), title: '스피커 점검', parent: 'teacher' },
  credits: { load: () => import('./screens/credits.js'), title: '출처와 저작권', parent: 'teacher' },
  records: { load: () => import('./screens/records.js'), title: '이 기기 기록', parent: 'teacher' },
};

const main = document.getElementById('main');
const back = document.getElementById('back');
const titleEl = document.getElementById('title');
const barMid = document.getElementById('barMid');
const barR = document.getElementById('barR');
let cleanup = null, token = 0, parent = '', rightNode = null, isHome = false;

// 첫 두드림에 소리 길을 연다(브라우저는 사람이 누르기 전에는 소리를 막는다)
const unlock = () => { try { engine.ensure(); music.kick(); } catch { /* 소리가 없는 기기 */ } };
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });
// 배경 음악(docs/sound.md) — 방에 들어온 아이 기기는 X(교실 소음)
music.setGate(() => !room.kid.get());
const MUSIC_ROUTES = new Set(['', 'map']);
// 새 줄 한 줄(머리띠 아래 · 5초 · 막지 않음) — "참새가 가락 앞부분 소리를 더했어요" · 처음 화면이든 지도든 새 줄이 처음 울릴 때
music.onFresh(fresh => {
  document.querySelectorAll('.freshbanner').forEach(e => e.remove());
  const name = k => (BAND.find(b => b.key === k) || {}).name || '';
  const text = fresh.length === 1 ? `${josa(name(fresh[0].key), '이/가')} ${STEP_TEXT[fresh[0].key][fresh[0].to]} 소리를 더했어요` : `${josa(fresh.map(x => name(x.key)).join(' · '), '이/가')} 새 소리를 더했어요`;
  const b = h('div', { class: 'freshbanner', role: 'status' }, ...fresh.map(x => friendImg(x.key, 'face', { label: false })), h('span', {}, text));
  document.body.append(b);
  setTimeout(() => b.remove(), 5200);
});
// 이동 단추 누름 소리(아주 작게) — 화면을 옮기는 단추만(링크 카드 · 지도 칸 · 주황 단추 · 뒤로).
//  문제 소리를 바로 내는 단추(예시 카드 · 다시 듣기 · 막대 건반 · 답 · 톡)는 뺀다 — 듣기 직전에 다른 소리가 끼지 않게(docs/sound.md §1)
window.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  const b = e.target.closest && e.target.closest('a.btn, .mnode, button.go, #back');
  if (!b || b.disabled || b.matches('[data-tap], .excard, .ans')) return;
  music.uiTick();
}, { capture: true });

const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

export const bar = {
  title(text, friend) {
    titleEl.replaceChildren();
    if (friend) titleEl.append(friendImg(friend, 'face', { label: false }));
    titleEl.append(text);
  },
  mid(node) { barMid.replaceChildren(...(node ? [node] : [])); },
  // 화면이 채우는 것 + (방에 있는 아이 기기면) 맨 오른쪽 '방 1234' 칩 · 처음 화면은 '방 번호' + 톱니
  right(node) { rightNode = node || null; renderRight(); },
};

export const ctx = {
  go: (name) => { location.hash = '#/' + name; },
  engine, device, toast, bar,
};

function gearBtn() {
  const b = h('a', { class: 'btn icon-btn', href: '#/teacher', 'aria-label': '선생님', html: GEAR });
  return b;
}

// ── 방 번호 다같이(docs/room.md) — 아이 기기 머리띠 ──
function renderRight() {
  const k = room.kid.get(), onJoin = document.body.dataset.screen === 'join';
  const kids = [];
  if (rightNode) kids.push(rightNode);
  if (isHome && !k) kids.push(h('a', { class: 'btn roombtn', href: '#/join' }, '방 번호'));
  if (k && !onJoin) kids.push(roomChip(k));
  if (isHome) kids.push(gearBtn());
  barR.replaceChildren(...kids);
}
function roomChip(k) {
  const off = !room.kid.online;
  const b = h('button', { type: 'button', class: 'roomchip' + (off ? ' off' : ''), 'aria-label': `방 ${k.room} — 나가기` },
    friendImg((BAND[k.a] || BAND[0]).key, 'face', { label: false }), off ? '연결 끊김' : `방 ${k.room}`);
  b.addEventListener('click', () => askLeave(k));
  return b;
}
function askLeave(k) {
  if (document.querySelector('.rmodal')) return;
  const close = () => { m.remove(); window.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const stay = h('button', { type: 'button' }, '그대로 있기');
  const out = h('button', { type: 'button' }, '나가기');
  const m = h('div', { class: 'rmodal', role: 'dialog', 'aria-label': '방에서 나가기' },
    h('div', { class: 'panelcard rmodal-card' },
      h('h2', {}, `방 ${k.room}에서 나갈까요?`),
      h('p', { class: 'sub' }, '나가면 선생님이 고르는 놀이가 열리지 않아요'),
      h('div', { class: 'row' }, stay, out)));
  stay.addEventListener('click', close);
  out.addEventListener('click', () => { close(); room.kid.leave(); ctx.go(''); });
  m.addEventListener('click', e => { if (e.target === m) close(); });
  window.addEventListener('keydown', esc);
  document.body.append(m);
  stay.focus();
}
room.kid.on(() => { renderRight(); if (room.kid.get()) music.stop(true); });
// 이 기기에 저장이 안 되면(개인 창 · 저장소 꽉 참) 톱니에 주황 점 + 한 번 알림 — 별 · 기록이 남지 않음을 선생님이 알게(X3)
window.addEventListener('save-fail', () => { if (document.body.dataset.savefail) return; document.body.dataset.savefail = '1'; toast('이 기기에 저장이 안 돼요 — 별과 기록이 남지 않아요', 3600); });
window.addEventListener('room-gone', () => toast('방이 끝났어요'));

async function route() {
  const my = ++token;
  const [name, ...args] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  const r = ROUTES[name] || ROUTES[''];
  const key = ROUTES[name] ? name : '';
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.body.dataset.screen = key || 'home';
  parent = r.parent || '';
  isHome = !key;
  back.hidden = !key;
  back.setAttribute('aria-label', parent === 'teacher' ? '선생님 칸으로' : parent === 'map' ? '마을 지도로' : parent === 'tv' ? 'TV 놀이 고르기로' : '처음으로');
  bar.title(r.title || '음악 놀이터', r.friend);
  bar.mid(null);
  bar.right(null);
  main.replaceChildren();
  music.stopFx();                       // 결과 별 소리 · 팡파르는 화면을 떠나면 멈춤
  music.wantMusic(MUSIC_ROUTES.has(key));
  try {
    const mod = await r.load();
    if (my !== token) return;
    cleanup = mod.default(main, { ...ctx, args, mode: key }) || null;
    main.focus({ preventScroll: true });
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'card', style: { maxWidth: '720px', margin: '40px auto' } }, h('h2', {}, '화면을 열지 못했어요'), h('p', {}, '새로고침해 보세요.')));
  }
}
back.addEventListener('click', () => ctx.go(parent));
window.addEventListener('hashchange', route);
route();
// 첫 화면이 뜬 뒤 쉬는 틈에 소리 장치를 미리 지어 둠(첫 두드림에서는 resume만)
(window.requestIdleCallback || ((f) => setTimeout(f, 900)))(() => engine.prepare());
room.startKid(ctx.go);                 // 방에 들어가 있던 아이 기기면 선생님 놀이를 따라가기 시작
