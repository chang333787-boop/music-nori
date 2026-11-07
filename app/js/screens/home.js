// 처음 화면 — 위: 숲속 공연장(친구를 누르면 바로 소리 · 계획서 '첫 10초') · 아래: 놀이 카드(추천 하나만 크게 + 주황 '시작')
//  선생님 도구(지연 · 스피커 · 출처)는 머리띠 오른쪽 톱니 안으로 뺐다(11-07 처음 보는 눈 평가).
import { h, onPress, lsGet } from '../util.js';
import { BAND, friendImg, setPose, friendSound, preload, IMG_DIR } from '../band.js';

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

  const best = lsGet('tap.best', {});        // { 단계: 별 } — 징검다리 카드의 단계 점
  const stepDots = h('span', { class: 'steps', 'aria-label': '단계' },
    ...[1, 2, 3, 4].map(s => h('span', { class: 'd' + (best[s] >= 1 ? ' done' : '') })));
  const cards = h('div', { class: 'cards', style: { gridTemplateColumns: 'repeat(3,minmax(0,1fr))' } },
    h('a', { class: 'btn acard wide', href: '#/tap', style: { '--a-t': 'var(--hog-t)' } },
      h('span', { class: 'art' }, friendImg('hog', 'play', { label: false })),
      h('span', { class: 'txt' },
        h('b', {}, '징검다리 박 놀이'),
        h('small', {}, '박에 맞춰 톡! 하면 돌이 놓여요. 고슴도치가 강을 건너요.'),
        stepDots,
        h('span', { class: 'gotag' }, '시작'))),
    h('a', { class: 'btn acard', href: '#/songs', style: { '--a-t': 'var(--turtle-t)' } },
      h('span', { class: 'art' }, friendImg('turtle', 'idle', { label: false })),
      h('span', { class: 'txt' },
        h('b', {}, '곡 듣기'),
        h('small', {}, '노래를 듣고 악보를 따라가요'))));
  root.append(h('div', { class: 'home' }, stage, cards));
  return () => timers.forEach(clearTimeout);
}
