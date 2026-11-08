// 처음 화면 — 위: 숲속 공연장(친구를 누르면 바로 소리 · 계획서 '첫 10초') · 아래: 카드(추천 '다음 칸' 하나만 크게 + 주황 '시작')
//  선생님 도구(지연 · 스피커 · 출처)는 머리띠 오른쪽 톱니 안(11-07 처음 보는 눈 평가).
import { h, onPress, lsGet, lsSet, josa } from '../util.js';
import { BAND, friendImg, setPose, friendSound, preload, IMG_DIR } from '../band.js';
import { cellById, LANES, nextCell, ORDER, cellName, easyText } from '../../../engine/cells.js';
import { getProg } from '../cellkit.js';
import * as music from '../music.js';


export default function mount(root, ctx) {
  preload(BAND.map(f => [f.key, 'play']));
  const stage = h('div', { class: 'stage' });
  const bg = new Image();
  bg.className = 'bg'; bg.alt = ''; bg.src = IMG_DIR + 'bg_stage.webp';
  bg.onerror = () => bg.replaceWith(h('div', { class: 'floor' }));
  stage.append(bg);
  // 말풍선은 친구 머리 위를 가려서 뺌(평가 2차) — 이름표가 누르는 곳임을 보여 줌
  // 모이는 음악대(docs/sound.md §3): 배경 음악 = 주제곡 · 갈래에서 별을 받을수록 그 친구 줄이 더해짐 · 연주 중인 친구는 박에 맞춰 끄덕임
  //  친구를 누르면: 연주 중 → 그 친구 줄만 두 마디 크게(음색 듣기) · 아직 → 그 친구 소리 한 번 + 어떤 놀이를 하면 오는지
  const timers = [];
  const lv = music.levels();
  if (!music.enabled()) lsSet('bgm.heard', lv);       // 배경 음악을 안 틀면 새 줄 알림 없이 들은 것으로(알림은 음악이 울릴 때 main.js가)
  for (const f of BAND) {
    const joined = f.key === 'bear' || lv[f.key] >= 1;
    const pic = friendImg(f.key, 'idle', { label: false });
    const btn = h('button', { class: 'friend' + (joined ? ' joined' : ''), type: 'button', 'aria-label': `${f.name} — ${f.lane}` }, pic, h('span', { class: 'tag' }, f.name));
    onPress(btn, () => {
      const on = music.info().playing;
      if (on && joined) music.spotlight(f.key, 2);
      else friendSound(ctx.engine, f.key);
      if (on && !joined) ctx.toast(`${josa(f.name, '은/는')} ${f.lane} 놀이를 하면 같이 연주해요`);
      btn.classList.remove('nod'); void btn.offsetWidth; btn.classList.add('nod');
      timers.push(setTimeout(() => btn.classList.remove('nod'), 320));   // 끄덕임이 끝나면 다시 박에 맞춰
      setPose(pic, f.key, 'play');
      timers.push(setTimeout(() => setPose(pic, f.key, 'idle'), on && joined ? 1600 : 650));
    });
    stage.append(btn);
  }
  // 박에 맞춰 끄덕임 — 첫 박에 맞춰 시작(오디오 시계 → 기다릴 ms)
  const sync = i => {
    stage.classList.toggle('playing', !!i.playing);
    if (!i.playing || !i.ac) return;
    // 지금이 박 안 어디쯤인지(들리는 시각 기준) → 음수 지연으로 그 자리부터(이미 틀고 있던 음악에 들어와도 박이 맞게)
    const beat = 60 / i.bpm, el = i.ac.currentTime - (i.ac.outputLatency || 0) - i.startAt, ph = ((el % beat) + beat) % beat;
    stage.style.setProperty('--beat', beat.toFixed(3) + 's');
    stage.style.setProperty('--bob-delay', (-ph).toFixed(3) + 's');
  };
  const off = music.onChange(sync);
  sync(music.info());

  const prog = getProg();
  const nx = nextCell(prog, lsGet('startCell', undefined));
  const done = ORDER.filter(id => prog[id] && prog[id].stars >= 1).length;
  let main;
  if (nx) {
    const c = cellById(nx), fr = LANES[c.lane].friend, band = ctx.device.band;   // 1~2학년 판(band low)이면 쉬운 이름
    main = h('a', { class: 'btn acard wide', href: '#/' + (c.route || 'cell/' + nx), style: { '--a-t': `var(--${fr}-t)` } },
      h('span', { class: 'art' }, friendImg(fr, 'play', { label: false })),
      h('span', { class: 'txt' },
        h('small', { class: 'kicker' }, done ? '다음 놀이' : '처음 놀이'),
        h('b', {}, cellName(c, band)),
        h('small', {}, band === 'low' ? easyText(c.game) : c.game),
        h('span', { class: 'gotag' }, '시작')));
  } else {
    main = h('a', { class: 'btn acard wide', href: '#/map', style: { '--a-t': 'var(--hog-t)' } },
      h('span', { class: 'art' }, friendImg('hog', 'happy', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '13칸을 모두 지났어요'), h('small', {}, '마을 지도에서 별을 더 모아 봐요'), h('span', { class: 'gotag' }, '지도')));
  }
  const cards = h('div', { class: 'cards', style: { gridTemplateColumns: 'repeat(5,minmax(0,1fr))' } },
    main,
    h('a', { class: 'btn acard', href: '#/map', style: { '--a-t': 'var(--bird-t)' } },
      h('span', { class: 'art' }, h('span', { class: 'faces' }, ...['bunny', 'bird', 'hog', 'turtle'].map(k => friendImg(k, 'face', { label: false })))),
      h('span', { class: 'txt' }, h('b', {}, '마을 지도'), h('small', {}, `13개 중 ${done}개 했어요`))),
    h('a', { class: 'btn acard', href: '#/play', style: { '--a-t': 'var(--bear-t)' } },
      h('span', { class: 'art' }, friendImg('bear', 'play', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '곡 바꾸기'), h('small', {}, '음을 바꿔 보며 들어요'))),
    h('a', { class: 'btn acard', href: '#/songs', style: { '--a-t': 'var(--turtle-t)' } },
      h('span', { class: 'art' }, friendImg('turtle', 'idle', { label: false })),
      h('span', { class: 'txt' }, h('b', {}, '곡 듣기'), h('small', {}, '노래를 듣고 악보를 따라가요'))));
  root.append(h('div', { class: 'home' }, stage, cards));
  return () => { timers.forEach(clearTimeout); off(); };
}
