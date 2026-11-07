// 앱 시작 — 주소 뒤 #/이름 으로 화면을 고른다. 화면 모듈 = export default mount(root, ctx) → 정리 함수
//  머리띠: 왼쪽 뒤로 · 제목(+맡은 친구 얼굴) · 가운데 단계(화면이 채움) · 오른쪽 처음 화면은 선생님 톱니, 놀이 화면은 화면이 채움
import { h, toast } from './util.js';
import { engine } from './audio.js';
import { device } from './device.js';
import { friendImg } from './band.js';
import './eq.js';                       // 스피커 점검 값(음높이별 크기)을 모든 소리에

const ROUTES = {
  '': { load: () => import('./screens/home.js') },
  tap: { load: () => import('./screens/tap.js'), title: '징검다리 박 놀이', friend: 'hog', parent: 'map' },
  songs: { load: () => import('./screens/songs.js'), title: '곡 듣기', friend: 'turtle' },
  map: { load: () => import('./screens/map.js'), title: '음악 마을 지도', friend: 'bird' },
  play: { load: () => import('./screens/play.js'), title: '놀이터', friend: 'turtle' },
  cell: { load: () => import('./screens/cell.js'), title: '', parent: 'map' },
  teacher: { load: () => import('./screens/teacher.js'), title: '선생님' },
  calib: { load: () => import('./screens/calib.js'), title: '지연 맞추기', parent: 'teacher' },
  speaker: { load: () => import('./screens/speaker.js'), title: '스피커 점검', parent: 'teacher' },
  credits: { load: () => import('./screens/credits.js'), title: '출처와 저작권', parent: 'teacher' },
};

const main = document.getElementById('main');
const back = document.getElementById('back');
const titleEl = document.getElementById('title');
const barMid = document.getElementById('barMid');
const barR = document.getElementById('barR');
let cleanup = null, token = 0, parent = '';

// 첫 두드림에 소리 길을 연다(브라우저는 사람이 누르기 전에는 소리를 막는다)
const unlock = () => { try { engine.ensure(); } catch { /* 소리가 없는 기기 */ } };
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });

const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

export const bar = {
  title(text, friend) {
    titleEl.replaceChildren();
    if (friend) titleEl.append(friendImg(friend, 'face', { label: false }));
    titleEl.append(text);
  },
  mid(node) { barMid.replaceChildren(...(node ? [node] : [])); },
  right(node) { barR.replaceChildren(...(node ? [node] : [])); },
};

export const ctx = {
  go: (name) => { location.hash = '#/' + name; },
  engine, device, toast, bar,
};

function gearBtn() {
  const b = h('a', { class: 'btn icon-btn', href: '#/teacher', 'aria-label': '선생님', html: GEAR });
  if (!device.latency) b.append(h('span', { class: 'dot', 'aria-hidden': 'true' }));
  return b;
}

async function route() {
  const my = ++token;
  const [name, ...args] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  const r = ROUTES[name] || ROUTES[''];
  const key = ROUTES[name] ? name : '';
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.body.dataset.screen = key || 'home';
  parent = r.parent || '';
  back.hidden = !key;
  back.setAttribute('aria-label', parent === 'teacher' ? '선생님 칸으로' : parent === 'map' ? '마을 지도로' : '처음으로');
  bar.title(r.title || '음악 놀이터', r.friend);
  bar.mid(null);
  bar.right(key ? null : gearBtn());
  main.replaceChildren();
  try {
    const mod = await r.load();
    if (my !== token) return;
    cleanup = mod.default(main, { ...ctx, args }) || null;
    main.focus({ preventScroll: true });
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'card', style: { maxWidth: '720px', margin: '40px auto' } }, h('h2', {}, '화면을 열지 못했어요'), h('p', {}, '새로고침해 보세요.')));
  }
}
back.addEventListener('click', () => ctx.go(parent));
window.addEventListener('hashchange', route);
route();
