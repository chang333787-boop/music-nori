// 처음 화면 — 위: 숲속 공연장(친구를 누르면 바로 소리 · 계획서 '첫 10초') · 아래: 카드(추천 '다음 칸' 하나만 크게 + 주황 '시작')
//  선생님 도구(지연 · 스피커 · 출처)는 머리띠 오른쪽 톱니 안(11-07 처음 보는 눈 평가).
import { h, onPress } from '../util.js';
import { BAND, friendImg, setPose, friendSound, preload, IMG_DIR } from '../band.js';
import { cellById, LANES, nextCell, ORDER } from '../../../engine/cells.js';
import { getProg } from '../cellkit.js';

let tapped = false;                         // 첫 탭 뒤 말풍선 숨김(이 창에서만)

export default function mount(root, ctx) {
  preload(BAND.map(f => [f.key, 'play']));
  const stage = h('div', { class: 'stage' });
  const bg = new Image();
  bg.className = 'bg'; bg.alt = ''; bg.src = IMG_DIR + 'bg_stage.webp';
  bg.onerror = () => bg.replaceWith(h('div', { class: 'floor' }));
  stage.append(bg);
  const bubble = h('div', { class: 'bubble' }, '친구를 눌러 보세요');
  if (!tapped) stage.append(bubble);
  const timers = [];
  for (const f of BAND) {
    const pic = friendImg(f.key, 'idle', { label: false });
    const btn = h('button', { class: 'friend', type: 'button', 'aria-label': `${f.name} — ${f.lane}` }, pic, h('span', { class: 'tag' }, f.name));
    onPress(btn, () => {
      friendSound(ctx.engine, f.key);
      if (!tapped) { tapped = true; bubble.remove(); }
      btn.classList.remove('nod'); void btn.offsetWidth; btn.classList.add('nod');
      setPose(pic, f.key, 'play');
      timers.push(setTimeout(() => setPose(pic, f.key, 'idle'), 650));
    });
    stage.append(btn);
  }

  const prog = getProg();
  const nx = nextCell(prog);
  const done = ORDER.filter(id => prog[id] && prog[id].stars >= 1).length;
  let main;
  if (nx) {
    const c = cellById(nx), fr = LANES[c.lane].friend;
    main = h('a', { class: 'btn acard wide', href: '#/' + (c.route || 'cell/' + nx), style: { '--a-t': `var(--${fr}-t)` } },
      h('span', { class: 'art' }, friendImg(fr, 'play', { label: false })),
      h('span', { class: 'txt' },
        h('small', { class: 'kicker' }, done ? '다음 칸' : '처음 칸'),
        h('b', {}, c.name),
        h('small', {}, c.game),
        h('span', { class: 'gotag' }, '시작')));
  } else {
    main = h('a', { class: 'btn acard wide', href: '#/map', style: { '--a-t': 'var(--hog-t)' } },
      h('span', { class: 'art' }, friendImg('hog', 'happy', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '13칸을 모두 지났어요'), h('small', {}, '마을 지도에서 별을 더 모아 봐요'), h('span', { class: 'gotag' }, '지도')));
  }
  const cards = h('div', { class: 'cards', style: { gridTemplateColumns: 'repeat(4,minmax(0,1fr))' } },
    main,
    h('a', { class: 'btn acard', href: '#/map', style: { '--a-t': 'var(--bird-t)' } },
      h('span', { class: 'art' }, friendImg('bird', 'idle', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '마을 지도'), h('small', {}, `13칸 중 ${done}칸 지남`))),
    h('a', { class: 'btn acard', href: '#/songs', style: { '--a-t': 'var(--turtle-t)' } },
      h('span', { class: 'art' }, friendImg('turtle', 'idle', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '곡 듣기'), h('small', {}, '노래를 듣고 악보를 따라가요'))));
  root.append(h('div', { class: 'home' }, stage, cards));
  return () => timers.forEach(clearTimeout);
}
