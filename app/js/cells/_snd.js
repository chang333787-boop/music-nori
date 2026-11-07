// 칸 공용 소리 도우미 — 소3 길게·짧게 · 소4 높게·낮게 · 소5 한 가지만 바뀌는 짝 · 악1 그림 악보가 같이 쓴다(다른 칸도 써도 됨)
//  · seq: 음 차례 틀기 — kit.playSeq와 같되 음마다 악기 · 세기 · 연주법을 따로 줄 수 있다.
//    길이를 견주는 칸은 끝이 또렷해야 해서 연주법을 늘 같게(stacc = 짧게 들어가고 짧게 끝남) 준다.
//    긴 소리 · 짧은 소리가 '길이만' 다르고 들어가는 모양 · 끝나는 모양은 같다.
//  · voice: 칸 하나가 쓰는 소리 길(bus) — 정리 함수에서 hush()로 지금 울리는 소리 · 예약한 소리까지 끈다.
//  · 숨은 오차 없이 맞추려고 소리 시각은 늘 오디오 시계(초)로 돌려준다 → 그림은 kit.msUntil로 맞춘다.

export function seq(engine, notes, { inst = 'flute', vel = 0.55, at = 0.05, out = null, art = 'stacc' } = {}) {
  const ac = engine.ensure();
  let t = ac.currentTime + at;
  const starts = [], ends = [];
  for (const n of notes) {
    starts.push(t); ends.push(t + n.d);
    if (n.p != null) engine.note(n.inst || inst, n.p, t, n.d, n.vel ?? vel, out, n.art === undefined ? art : n.art);
    t += n.d + (n.gap ?? 0.12);
  }
  return { starts, ends, end: t, ac };
}

export function voice(engine) {
  let bus = null;
  const fade = b => {
    const ac = engine.ctx;
    if (!ac) return;
    const now = ac.currentTime;
    try { b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.05); } catch { /* 이미 끊김 */ }
    setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, 250);
  };
  return {
    get out() { engine.ensure(); if (!bus) bus = engine.bus(); return bus; },
    play(notes, opts = {}) { return seq(engine, notes, { ...opts, out: this.out }); },
    note(inst, p, t, d, vel = 0.55, art = 'stacc') { return engine.note(inst, p, t, d, vel, this.out, art); },
    click(t, accent = false) { engine.click(t, accent, this.out); },
    hush() { if (bus) { fade(bus); bus = null; } },
  };
}

// ── 칸 화면 조각(소3 · 소4 · 소5 · 악1이 같이 씀 · 모양은 각 칸 css의 .snd-*) ──
// 스피커 그림 — 보기 카드가 '누르면 소리가 나요'를 알려 줌
export const SPEAKER = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 15h7l9-8v26l-9-8H6z" fill="#FFFFFF" stroke="#3B2A1E" stroke-width="3" stroke-linejoin="round"/><path d="M27 14c3 3 3 9 0 12M31 10c5 5 5 15 0 20" fill="none" stroke="#3B2A1E" stroke-width="3" stroke-linecap="round"/></svg>';
// 보기 카드 묶음 — 위에 "눌러서 들어 봐요" · 카드마다 오른쪽 위 스피커
export function exGroup(kit, cards, cls = 'exgrid') {
  const { h } = kit;
  for (const c of cards) c.append(h('span', { class: 'snd-spk', html: SPEAKER }));
  return h('div', { class: 'snd-exwrap' }, h('p', { class: 'snd-exhead' }, h('span', { class: 'snd-spk in', html: SPEAKER }), '눌러서 들어 봐요'), h('div', { class: cls }, ...cards));
}
// 보기 카드 하나를 '지금 소리 나는 카드'로(잉크 테두리 — 주황 X)
export function nowCard(cards, btn) { for (const c of cards) c.classList.toggle('now', c === btn); }

// 자라는 막대(평가 3차 성능 — width를 늘이지 않고 transform으로)
//  바깥 상자(.snd-bar)는 처음부터 다 자란 길이 · 넘침 숨김 · 안쪽 알약(.snd-fill)이 왼쪽에서 밀려 나온다.
//  왼쪽 끝 반원(.snd-bar::before)은 처음부터 그려 둬서 자라는 동안에도 막대 모양이 그대로(앞 끝 = 진짜 알약 끝)
export function growBar(h, cls = '') { const fill = h('i', { class: 'snd-fill' }); return { el: h('div', { class: ('snd-bar ' + cls).trim() }, fill), fill }; }
export function slide(fill, sec = 0, easing = 'linear') {
  for (const a of fill.getAnimations()) a.cancel();
  if (sec > 0) fill.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], { duration: sec * 1000, easing });
}
// 톡 나타나기 · 흔들기(평가 3차 — 클래스를 뗐다 붙이며 offsetWidth로 레이아웃을 강제하지 않음)
export const pop = (el, ms = 280) => el.animate([{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: ms, easing: 'ease-out' });
export const shake = (el, ms = 320) => el.animate([{ translate: '0' }, { translate: '-7px' }, { translate: '6px' }, { translate: '-3px' }, { translate: '0' }], { duration: ms, easing: 'ease-out' });

// 친구 그림 — 없는 자세는 band.js poseOf가 가까운 자세로 바꿔 준다(파일을 찾으러 가지 않음 · 404 X)
export function pal(kit, key, pose = 'idle') { return kit.friendImg(key, pose, { label: false }); }
export function pose(kit, img, key, p) { kit.setPose(img, key, p); }

