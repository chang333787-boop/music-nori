// 칸 공용 소리 도우미 — 소3 길게·짧게 · 소5 한 가지만 바뀌는 짝 · 악1 그림 악보가 같이 쓴다(다른 칸도 써도 됨)
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
