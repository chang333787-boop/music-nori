// 빠1 느리게·보통·빠르게 — 곰 갈래 둘째 칸(11-10)
//  빠르기 = 박(곰의 걸음)이 얼마나 빨리 오나. 말보다 소리 먼저 — 같은 가락을 같은 시간(3.6초) 동안 들려주면 느리게는 박 4번 · 보통 6번 · 빠르게 9번
//  빠르기 셋 = 박 0.9 · 0.6 · 0.4초(♩ ≈ 67 · 100 · 150) — 한 칸마다 1.5배(빠르기 차이는 비율로 느낌 · 8~12세 박 흔들림 약 10%
//   [McAuley 외 2006 · 근거 표 4절] → 50% 차이는 흔들림의 다섯 배 넘게 또렷) · 보통 = 주제곡 「숲속 음악대」 제 빠르기(100) = 8~12세가 편하게 두드리는 간격(약 520~550ms) 가까이
//  헷갈림 거리(비틀기 · 앞 칸 복습): ① 음이 촘촘함 ≠ 빠르기 — 느린 박 위 잘게 쪼갠 음 ↔ 빠른 박 위 긴 음(박은 받침 발소리로 들림)
//   ② 세기 ≠ 빠르기(셈1) — 빠르고 여린 ↔ 느리고 센 ③ 높이 ≠ 빠르기(소4) — 보통인데 아주 높게 ↔ 아주 낮게
//  받침(곰 발소리 = 낮은 쿵 + 나무 톡 · 박마다)이 있는 판과 없는 판(가락이 박마다 한 음)을 섞어 '박을 찾아 듣기'를 본다
//  화면으로 답이 새지 않게(N2 · 가2 화면 틈 교훈): 소리 창은 빠르기와 상관없이 늘 3.6초 · 답은 소리가 시작하고 2초 뒤에 열림(판 꼴마다 늘 같음)
//   · 고르기 전에는 박에 맞춰 움직이는 그림 X(재생선은 빠르기와 상관없이 같은 속도) · 고른 뒤에야 발자국(박) · 음 막대가 보이고 곰이 그 빠르기로 걸음
//  보기(예시 다섯) → 연습(셋 중 고르기 · 세 번 이어서) → 확인 게임 '곰의 산책' 12판(소개 = 보통과 견주기 · 발전 = 셋 중 고르기 · 비틀기 · 마무리 = 주제곡 가락)
import { voice, exGroup, nowCard, pal, pose } from './_snd.js';
import { factTip, stageCuts } from '../cellkit.js';
import { tvsGame } from './_tvs.js';

export const WIN = 3.6;                               // 소리 창(초) — 빠르기와 상관없이 같음
export const BEAT = { slow: 0.9, mid: 0.6, fast: 0.4 };
const KEYS = ['slow', 'mid', 'fast'];
const NAME = { slow: '느리게', mid: '보통', fast: '빠르게' };
const REF_N = 4, REF_WIN = REF_N * BEAT.mid, GAP = 0.5;   // 소개 판의 '보통' 견줌 소리 — 박 넷(2.4초) 뒤 0.5초 쉬고 견줄 소리
export const OPEN_IN = 2.0;                            // 견줄 소리가 시작하고 이만큼 뒤에 답이 열림(느리게도 박 셋을 들은 뒤)
const VEL = 0.55, SOFT = 0.18, LOUD = 0.9;
// 가락 — 주제곡 「숲속 음악대」 조각(솔 · 미 · 라 · 도 · 레 다섯 음)
const TUNE = [67, 64, 67, 64, 69, 69, 72, 69, 67];                  // 박마다 한 음: 솔미솔미 라라도라 솔(1 · 3마디)
const DENSE = [67, 69, 67, 64, 67, 69, 72, 69, 72, 74, 72, 69, 67, 64, 62, 60];   // 박마다 16분음 넷(느린 박 넷 위)
const LONG = [[67, 2], [64, 2], [69, 2], [67, 3]];                   // 긴 음 [음, 박](빠른 박 아홉 위)
const THEME_MEL = [[67, 1], [64, 1], [67, 1], [64, 1], [69, 0.5], [69, 0.5], [67, 1]];   // 주제곡 첫 마디 반(8분음 섞임 · 보통 박 여섯)

// 소리 한 조각 — { win(초), beat, steps(박 시각), notes [{ at, p, d, vel }], acc(받침), inst, vel } · n = 창 안 박 수(4 · 6 · 9)
export function clip(t, mel = 'plain', { inst = 'piano', acc = false, vel = VEL, shift = 0 } = {}, n = null) {
  const b = BEAT[t], cnt = n || Math.round(WIN / b), out = [];
  if (mel === 'dense') DENSE.forEach((p, k) => out.push({ at: (k * b) / 4, p, d: (b / 4) * 0.8, up: k % 4 === 0 }));
  else if (mel === 'long' || mel === 'theme') { let x = 0; for (const [p, nb] of mel === 'long' ? LONG : THEME_MEL) { out.push({ at: x * b, p, d: nb * b * (mel === 'long' ? 0.94 : 0.85), up: x % 1 === 0 }); x += nb; } }
  else for (let k = 0; k < cnt; k++) out.push({ at: k * b, p: TUNE[k % TUNE.length], d: b * 0.8, up: false });
  return {
    win: +(cnt * b).toFixed(3), beat: b, acc, inst, vel,
    steps: Array.from({ length: cnt }, (_, k) => +(k * b).toFixed(3)),
    notes: out.map(o => ({ at: +o.at.toFixed(4), p: o.p + shift, d: +o.d.toFixed(4), vel: Math.min(1, vel * (o.up && mel === 'dense' ? 1.2 : 1)) })),
  };
}
// 판 줄 → 견줄 소리 · 보통 소리(소개 판만) · 소리 시작부터 견줄 소리까지(초)
export const clipOf = it => clip(it.t, it.mel, { inst: it.inst, acc: it.acc, vel: it.vel, shift: it.shift });
const refOf = it => clip('mid', 'plain', { inst: it.inst, acc: it.acc }, REF_N);
const preOf = it => (it.kind === 'cmp' ? REF_WIN + GAP : 0);
// 화면 틈 시험용(tests/cells.test.mjs) — 판 소리 전체 길이 · 답이 열리는 때(소리 시작부터 초)
export const soundSec = it => +(preOf(it) + clipOf(it).win).toFixed(3);
export const openSec = it => +(preOf(it) + OPEN_IN).toFixed(3);

// 확인 게임 문항 표(X2 · 단계 꼬리표) — 줄 = { stage, kind(판 꼴 · 뒤집어도 그대로), t(빠르기 = 답), inst, mel, acc, vel, shift, right }
//  kind: cmp 보통과 견주기 · plain 하나만 · dens 음이 촘촘함 ≠ 빠르기 · dyn 세기 ≠ 빠르기 · high 높이 ≠ 빠르기 · theme 주제곡 가락
//  답 수 느리게 4 · 보통 4 · 빠르게 4(뒤집어도 단계 안 섞기가 같게 맞춤)
const q = (stage, kind, t, o = {}) => ({ stage, kind, t, inst: 'piano', mel: 'plain', acc: false, vel: VEL, shift: 0, ...o, right: t });
export const PLAN = [
  // 소개 — 보통을 먼저 듣고 견주기(같은 가락 · 같은 악기 · 보통 단추는 잠김)
  q('intro', 'cmp', 'slow', { inst: 'piano' }), q('intro', 'cmp', 'fast', { inst: 'marimba' }), q('intro', 'cmp', 'slow', { inst: 'flute', acc: true }),
  // 발전 — 하나만 듣고 셋 중 고르기(보통 단추가 나옴) · 받침 있는 판 · 없는 판
  q('grow', 'plain', 'mid', { inst: 'piano' }), q('grow', 'plain', 'fast', { inst: 'marimba', acc: true }), q('grow', 'plain', 'mid', { inst: 'flute', acc: true }), q('grow', 'plain', 'slow', { inst: 'violin' }),
  // 비틀기 — 느린 박 위 16분음 · 빠른 박 위 긴 음(받침으로 박이 들림) · 빠르고 여린(셈1) · 보통인데 아주 높게(소4)
  q('twist', 'dens', 'slow', { inst: 'piano', mel: 'dense', acc: true }), q('twist', 'dens', 'fast', { inst: 'flute', mel: 'long', acc: true }),
  q('twist', 'dyn', 'fast', { inst: 'xylo', vel: SOFT }), q('twist', 'high', 'mid', { inst: 'marimba', shift: 12, acc: true }),
  // 마무리 — 주제곡 가락 그대로(8분음 섞임 · 받침)
  q('end', 'theme', 'mid', { inst: 'piano', mel: 'theme', acc: true }),
];
export const CUTS = stageCuts(PLAN);                  // [3, 7, 11]
const MID_AT = CUTS[0];                               // 보통 단추가 열리는 판 = 발전 첫 판(섞어도 자리는 그대로)
// 뒤집기 — 느리게 ↔ 빠르게(헷갈림 거리는 그대로: 촘촘한 음은 늘 느린 박 위 · 긴 음은 늘 빠른 박 위 · 센 소리는 늘 느리게 · 여린 소리는 늘 빠르게) · 보통 = 높게 ↔ 낮게
const OPP = { slow: 'fast', fast: 'slow' };
export function flip(p) {
  if (p.kind === 'high') return { ...p, shift: -p.shift };
  if (p.right === 'mid') return p;
  const t = OPP[p.t], o = { ...p, t, right: t };
  if (p.kind === 'dens') o.mel = t === 'slow' ? 'dense' : 'long';
  if (p.kind === 'dyn') o.vel = t === 'slow' ? LOUD : SOFT;
  return o;
}
export const SHUF = { flip, answerOf: p => p.right };
// 찍기 바닥 — 소개는 둘 중 하나 · 보통 단추가 나온 뒤엔 셋 중 하나
export const GUESS = plan => plan.map((x, k) => (k < MID_AT ? 1 / 2 : 1 / 3));
// 결과 한 줄 — 사실만(N1): 갈래 말은 그 갈래가 틀린 판(시간 지남 뺌)의 2/3를 넘고 3번 이상일 때만
// TV '틀린 갈래' 막대 이름(X6 둘째) — 아래 tipOf 갈래와 같은 차례 · 짧게(선생님이 다시 짚을 곳)
export const TIPS_TV = ['음 수 · 세기 · 높이에 속음', '보통과 헷갈림', '보통과 견주기'];
// 헷갈리는 두 소리(X11) — 별 0일 때 결과 화면에서 번갈아 듣기(점수 없음) · 같은 가락 · 같은 길이, 박(걸음)만 다른 짝(보통 ↔ 빠르게)
const nearClip = t => (kit, out) => {
  const c = clip(t, 'plain', { inst: 'piano', acc: true }), { engine } = kit, at = engine.ensure().currentTime + 0.1;
  for (const n of c.notes) engine.note(c.inst, n.p, at + n.at, n.d, n.vel, out);
  for (const s of c.steps) { engine.drum('kick', at + s, 0.5, out); engine.drum('gi', at + s, 0.3, out); }
  return 0.1 + c.win;
};
export const NEAR = [
  { label: NAME.mid, play: nearClip('mid') },
  { label: NAME.fast, play: nearClip('fast') },
];
export function tipOf(plan, results, picks = []) {
  const miss = f => plan.filter((p, k) => results[k] === false && f(p, picks[k])).length;
  const fool = { dens: miss(p => p.kind === 'dens'), dyn: miss(p => p.kind === 'dyn'), high: miss(p => p.kind === 'high') };
  const words = [['dens', '음 수'], ['dyn', '세기'], ['high', '높이']].filter(([k]) => fool[k]).map(([, w]) => w);
  return factTip(results, [
    { n: fool.dens + fool.dyn + fool.high, text: `${words.join(' · ')}에 속은 적이 있어요. 빠르기는 박(걸음)이 얼마나 빨리 오는지만 들어요.` },
    { n: miss((p, pk) => p.stage !== 'twist' && p.kind !== 'cmp' && (p.right === 'mid' || pk === 'mid')), text: '보통과 헷갈렸어요. 보통은 처음 화면 음악(숲속 음악대)의 빠르기예요.' },
    { n: miss(p => p.kind === 'cmp'), text: '보통과 견줄 때 헷갈렸어요. 먼저 들은 보통 박을 떠올리며 견줘요.' },
  ], '음 수 · 세기 · 높이가 달라도 박(걸음)의 빠르기만 듣고 골랐어요.');
}

// ── 말 ──
const SAY = { intro: '보통 다음 소리는 — 느리게? 빠르게?', grow: '박(걸음)이 얼마나 빨리 오나요?', twist: '음 수 · 세기 · 높이 말고 박만 들어요', end: '마지막 — 박(걸음)이 얼마나 빨리 오나요?' };
const LOW = { intro: '보통 다음 걸음은 — 느리게? 빠르게?', grow: '곰의 걸음이 얼마나 빨리 오나요?', twist: '음 수 · 크기 · 높이 말고 걸음만 들어요', end: '마지막 — 곰의 걸음이 얼마나 빨리 오나요?' };
const sayOf = (stage, low) => (low ? LOW : SAY)[stage];

// ── 그림 ──
const pct = x => (Math.max(0, Math.min(1, x)) * 100).toFixed(2) + '%';
// 답 칩 — 발자국 사이가 넓으면 느리게 · 좁으면 빠르게(왼발 · 오른발 번갈아)
const CHIP = t => {
  const n = { slow: 3, mid: 4, fast: 6 }[t], xs = Array.from({ length: n }, (_, k) => 9 + (k * 46) / (n - 1));
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${xs.map((x, k) => `<ellipse cx="${x.toFixed(1)}" cy="${k % 2 ? 40 : 24}" rx="5.2" ry="7.4" fill="#6A4C93" stroke="#3B2A1E" stroke-width="2.6"/>`).join('')}</svg>`;
};
const items = lockMid => KEYS.map(k => ({ key: k, label: NAME[k], chip: CHIP(k), locked: lockMid && k === 'mid' }));
// 걸음 띠 하나 — 가로 = 시간(띠 길이 = 소리 창 · 견줌 띠는 짧게) · 위 = 음 막대(세로 = 높이 · 가로 = 길이) · 아래 = 발자국(박)
//  가림(hid) = 재생선만 · 보임(shown) = 발자국 · 음 막대 · step(k)/note(j) = 지금 소리 나는 것(잉크)
function track(kit, label, win = WIN) {
  const { h } = kit;
  const notesEl = h('div', { class: 'pp-notes' }), stepsEl = h('div', { class: 'pp-steps' });
  const sweep = h('div', { class: 'pp-sweep', hidden: true }, h('i', { class: 'pp-head' }));
  const lane = h('div', { class: 'pp-lane hid' }, notesEl, stepsEl, sweep);
  const lab = h('b', { class: 'pp-lab' }, label);
  const el = h('div', { class: 'pp-trk', style: { width: pct(win / WIN) } }, lab, lane);
  let notes = [], steps = [], anim = null, onS = -1, onN = -1;
  return {
    el, lane,
    label(t) { lab.textContent = t; },
    set(c) {
      notes = c.notes.map(n => h('i', { class: 'pp-note', style: { left: pct(n.at / c.win), width: pct(n.d / c.win), bottom: pct((n.p - 54) / 32) } }));   /* 세로 = 높이(E3~C6 · 높이 판이 위아래로 또렷이) */
      steps = c.steps.map(s => h('i', { class: 'pp-step', style: { left: pct(s / c.win) } }));
      notesEl.replaceChildren(...notes); stepsEl.replaceChildren(...steps);
      onS = onN = -1; this.hide(); this.stop();
    },
    reveal() { lane.classList.remove('hid'); lane.classList.add('shown'); },
    hide() { lane.classList.add('hid'); lane.classList.remove('shown'); },
    step(k) { if (steps[onS]) steps[onS].classList.remove('on'); onS = k; if (steps[k]) steps[k].classList.add('on'); },
    note(j) { if (notes[onN]) notes[onN].classList.remove('on'); onN = j; if (notes[j]) notes[j].classList.add('on'); },
    // 재생선 — 띠 왼쪽 → 오른쪽을 소리 창 길이 동안(빠르기와 상관없이 같은 속도 · transform)
    run(sec) {
      if (anim) anim.cancel();
      sweep.hidden = false;
      anim = sweep.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
      anim.onfinish = () => { sweep.hidden = true; };
    },
    stop() { if (anim) anim.cancel(); anim = null; sweep.hidden = true; this.step(-1); this.note(-1); },
  };
}
// 곰 — 고른 뒤 그 빠르기로 걸음(끄덕임 한 번 = 박 하나 · 박 길이 CSS 변수)
function bearEl(kit) {
  const img = pal(kit, 'bear');
  const el = kit.h('div', { class: 'pp-bear' }, img);
  let tm = 0;
  return {
    el,
    pose: p => pose(kit, img, 'bear', p),
    walk(beat, ms) { clearTimeout(tm); el.style.setProperty('--beat', beat + 's'); el.classList.add('walk'); if (ms) tm = setTimeout(() => el.classList.remove('walk'), ms); },
    still() { clearTimeout(tm); el.classList.remove('walk'); },
  };
}
// 소리 틀기 — at = 오디오 시각 · tr에 재생선 · sync = 박 · 음에 맞춰 그림을 밝힘(보기 · 고른 뒤 다시 듣기 · 늘 보통인 견줌 소리만)
function sound(kit, V, T, c, at, tr = null, sync = false) {
  const { engine } = kit, ac = engine.ensure();
  for (const n of c.notes) V.note(c.inst, n.p, at + n.at, n.d, n.vel, null);
  if (c.acc) {                                        // 받침 = 곰 발소리(낮은 쿵 + 작은 스피커에서도 들리는 나무 톡) · 판 세기를 따라감
    const g = Math.min(1.6, c.vel / VEL);
    for (const s of c.steps) { engine.drum('kick', at + s, 0.5 * g, V.out); engine.drum('gi', at + s, 0.3 * g, V.out); }
  }
  if (tr) {
    T.after(kit.msUntil(ac, at), () => tr.run(c.win));
    if (sync) {
      c.steps.forEach((s, k) => T.after(kit.msUntil(ac, at + s), () => tr.step(k)));
      c.notes.forEach((n, j) => T.after(kit.msUntil(ac, at + n.at), () => tr.note(j)));
      T.after(kit.msUntil(ac, at + c.win), () => { tr.step(-1); tr.note(-1); });
    }
  }
  return at + c.win;
}

// 게임 무대(혼자 · TV 소리 모드가 같이 씀) — 곰 + 걸음 띠 둘(위 = 보통 견줌 · 소개 판만 / 아래 = 이번 소리)
//  그림 맞춤 타이머는 무대 것(T) — 새로 틀 때마다 지워서 앞 소리의 재생선 · 밝힘이 끼어들지 않게
function scene(kit, V) {
  const { h } = kit, low = kit.band === 'low', T = kit.timers();
  const bear = bearEl(kit);
  const ref = track(kit, '보통', REF_WIN), tgt = track(kit, low ? '이번 걸음' : '이번 소리');
  const box = h('div', { class: 'pp-tracks' }, ref.el, tgt.el);
  let cur = null;
  return {
    el: h('div', { class: 'pp-scene' }, bear.el, box),
    bear,
    item(it) {
      cur = { it, c: clipOf(it), r: it.kind === 'cmp' ? refOf(it) : null };
      ref.el.hidden = !cur.r; box.classList.toggle('one', !cur.r);
      if (cur.r) { ref.set(cur.r); ref.reveal(); }    // 보통은 늘 보통 — 처음부터 보이고 박에 맞춰 밝혀도 답이 새지 않음
      tgt.set(cur.c); bear.still(); bear.pose('idle');
    },
    // 판 소리 — atSec = 지금부터 초 · 돌려주는 값 = 견줄 소리 시작(오디오 시각)
    play(atSec = 0.1) {
      T.clear(); tgt.stop(); ref.stop();
      const ac = kit.engine.ensure();
      let at = ac.currentTime + atSec;
      if (cur.r) { sound(kit, V, T, cur.r, at, ref, true); T.after(kit.msUntil(ac, at), () => bear.walk(BEAT.mid, REF_WIN * 1000)); at += REF_WIN + GAP; }
      sound(kit, V, T, cur.c, at, tgt, false);
      return at;
    },
    // 고른 뒤 — 발자국 · 음 막대가 보이고 곰이 그 빠르기로 걸음
    //  ok = true 맞음 · false 틀림 · null 고르지 않음(TV 소리 모드) — 곰은 어느 쪽이든 그 빠르기로 걸어 보임(답 보여 주기)
    reveal(ok) { T.clear(); tgt.stop(); ref.stop(); tgt.reveal(); bear.pose(ok === true ? 'happy' : ok === false ? 'oops' : 'idle'); bear.walk(cur.c.beat, 2000); },
    // 그림을 보며 이번 소리만 다시(박 · 음에 맞춰 밝힘) → 끝 오디오 시각
    replay() { T.clear(); const ac = kit.engine.ensure(), at = ac.currentTime + 0.15; bear.pose('idle'); bear.still(); T.after(kit.msUntil(ac, at), () => bear.walk(cur.c.beat, WIN * 1000)); return sound(kit, V, T, cur.c, at, tgt, true); },
    stop() { T.clear(); tgt.stop(); ref.stop(); bear.still(); },
  };
}

// ── 소리는 TV 하나 · 답은 각자(_tvs.js) — 판 시간은 판 꼴(소개 · 나머지)마다 늘 같음: 소리 창이 빠르기와 상관없이 3.6초라 가장 느린 판도 그 안에 끝남
//  답 열림 = 견줄 소리 시작 + 2초 · 닫힘 = 열림 + 3초(소리 끝 + 1.4초) · 소개 판은 보통 2.4초 + 0.5초가 앞에
export const TVS = true;
const tvsOpen = it => 300 + openSec(it) * 1000;
export const tvsSpec = (ui, kit) => {
  const low = kit.band === 'low';
  return {
    plan: sd => kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF),
    OPEN: tvsOpen, CLOSE: it => tvsOpen(it) + 3000, P: it => tvsOpen(it) + 3800,
    say: { kid: low ? 'TV 소리를 듣고 — 곰의 걸음 빠르기를 골라요' : 'TV 소리를 듣고 — 박(걸음)의 빠르기를 골라요', tv: '소리는 TV에서 — 아이들은 각자 기기로 골라요' },
    items: items(true),
    setup(it, A, k) {
      ui.say(sayOf(it.stage, low));
      if (k < MID_AT) return;
      A.lock('mid', false);
      if (k === MID_AT) { A.btn('mid').animate([{ transform: 'scale(.7)' }, { transform: 'scale(1.05)', offset: 0.7 }, { transform: 'none' }], { duration: 360, easing: 'ease-out' }); ui.tell('보통 단추가 나왔어요', 'info', 1800); }
    },
    rightOf: it => it.right,
    wrongText: it => '이번엔 ' + NAME[it.right],
    view({ kidSide, V, T, side }) {
      const S = scene(kit, V);
      return {
        el: kit.h('div', { class: 'pp pp-play' }, S.el, side),
        item: it => S.item(it),
        play: (it, at) => S.play(at),
        close: (it, r) => S.reveal(!kidSide ? true : r),
        done: () => { S.stop(); S.bear.el.hidden = true; },
      };
    },
    tip: tipOf, chance: GUESS,
  };
};

const press = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

export default {
  // ── 보기: 예시 다섯(같은 시간 동안 박 4 · 6 · 9번 + 헷갈림 거리 둘) ──
  show(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), low = kit.band === 'low';
    ui.say(low ? '곰의 걸음을 들어 봐요 — 느리게 · 보통 · 빠르게' : '빠르기 — 박(곰의 걸음)이 얼마나 빨리 오나요');
    const bear = bearEl(kit);
    const tr = track(kit, '');
    const EX = [
      { title: '느리게', sub: '천천히 걷는 곰 · 피아노', c: clip('slow', 'plain', { inst: 'piano', acc: true }) },
      { title: '보통', sub: '주제곡 빠르기 · 마림바', c: clip('mid', 'plain', { inst: 'marimba', acc: true }) },
      { title: '빠르게', sub: '바쁜 걸음 · 플루트', c: clip('fast', 'plain', { inst: 'flute', acc: true }) },
      { title: '음이 많아도 느리게', sub: '느린 걸음 위에 짧은 음', c: clip('slow', 'dense', { inst: 'piano', acc: true }) },
      { title: '음이 길어도 빠르게', sub: '빠른 걸음 위에 긴 음', c: clip('fast', 'long', { inst: 'flute', acc: true }) },
    ];
    const caption = ex => `${ex.title} — ${low ? '걸음' : '박'} ${ex.c.steps.length}번`;
    const draw = ex => { tr.set(ex.c); tr.reveal(); tr.label(kit.ez(caption(ex))); };
    const cards = EX.map(ex => {
      const btn = h('button', { type: 'button', class: 'excard pp-ex' }, h('b', {}, kit.ez(ex.title)), h('span', {}, kit.ez(ex.sub)));
      onPress(btn, () => {
        T.clear(); V.hush(); nowCard(cards, btn); draw(ex);
        const ac = engine.ensure(), at = ac.currentTime + 0.1;
        const end = sound(kit, V, T, ex.c, at, tr, true);
        T.after(kit.msUntil(ac, at), () => bear.walk(ex.c.beat, ex.c.win * 1000));
        T.after(kit.msUntil(ac, end) + 150, () => nowCard(cards, null));
        btn.classList.add('heard');
      });
      return btn;
    });
    draw(EX[0]);
    const legend = h('p', { class: 'pp-legend' }, kit.ez(low ? '띠 길이 = 같은 시간 · 발자국 = 곰의 걸음' : '띠 길이 = 같은 시간 · 발자국 = 박(걸음) · 막대 = 가락의 음'));
    ui.stage.append(h('div', { class: 'pp pp-show' }, h('div', { class: 'pp-scene' }, bear.el, h('div', { class: 'pp-tracks one' }, tr.el, legend)), exGroup(kit, cards, 'exgrid pp-exgrid')));
    let k = 0;
    kit.setAuto(() => { if (k < cards.length) press(cards[k++]); else kit.next(); });
    return () => { T.clear(); V.hush(); bear.still(); };
  },

  // ── 연습: 하나만 듣고 느리게 · 보통 · 빠르게 — 세 번 이어서 · '보통과 견줘 듣기'로 기준을 언제든 ──
  follow(ui, kit) {
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), r = kit.rng(), low = kit.band === 'low';
    const ASK = low ? '곰의 걸음은 — 느리게? 보통? 빠르게?' : '박(걸음)은 느리게 · 보통 · 빠르게 중 무엇일까요?';
    ui.say(ASK);
    const S = scene(kit, V);
    const A = kit.answers(items(false), k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    const cmp = h('button', { type: 'button' }, '보통과 견줘 듣기');
    ui.stage.append(h('div', { class: 'pp pp-play' }, S.el, A.el));
    ui.setBar(again, cmp);
    let streak = 0, cur = null, open = false, passed = false, tok = 0, last = [], fb = false;   // fb = 고른 뒤 다음 문제까지(다시 듣기 X)
    function hear(withRef = false) {
      const my = ++tok; open = false; A.busy(true); V.hush();
      S.item(withRef ? { ...cur, kind: 'cmp' } : cur);
      const at = S.play(0.1), ac = engine.ensure();
      T.after(kit.msUntil(ac, at + OPEN_IN), () => { if (my === tok && !passed) { open = true; A.busy(false); } });
    }
    function ask() {
      if (passed) return;
      let t = KEYS[Math.floor(r() * 3)];
      if (last.length >= 2 && last[0] === t && last[1] === t) t = KEYS[(KEYS.indexOf(t) + 1 + Math.floor(r() * 2)) % 3];   // 같은 빠르기 세 번 X
      last = [t, ...last].slice(0, 2);
      cur = { kind: 'plain', t, right: t, mel: 'plain', inst: ['piano', 'marimba', 'flute'][Math.floor(r() * 3)], acc: r() < 0.5, vel: VEL, shift: 0 };
      A.clear(); ui.say(ASK); fb = false;
      hear();
    }
    function answer(k) {
      if (!open || passed) return;
      open = false; tok++; V.hush(); fb = true;
      const right = k === cur.t;
      A.mark(k, right ? 'right' : 'wrong'); if (!right) A.reveal(cur.t);
      S.reveal(right);
      if (right) {
        kit.sfx.good(engine); streak++; ui.practice(streak); ui.tell('맞아요', 'good');
        if (streak >= 3) { passed = true; kit.pass('세 번 이어서 빠르기를 맞혔어요'); return; }
        T.after(1700, ask);
      } else {
        kit.sfx.oops(engine); streak = 0; ui.practice(0);
        ui.tell(`${NAME[cur.t]}예요`, 'oops', 2400);
        ui.say(low ? '발자국(걸음)을 보며 다시 들어요' : '발자국(박)을 보며 다시 들어요');
        T.after(900, () => { const end = S.replay(); T.after(kit.msUntil(engine.ensure(), end) + 900, ask); });
      }
    }
    onPress(again, () => { if (cur && !passed && !fb) hear(); });
    onPress(cmp, () => { if (cur && !passed && !fb) hear(true); });
    T.after(400, ask);
    kit.setAuto(() => { if (open) answer(cur.t); });
    const onKey = e => { if (e.repeat) return; const k = { 1: 'slow', 2: 'mid', 3: 'fast' }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { passed = true; T.clear(); V.hush(); S.stop(); window.removeEventListener('keydown', onKey); };
  },

  // ── 확인 게임: 곰의 산책 — 12판 · 4판째부터 보통 단추 ──
  game(ui, kit) {
    const tvs = kit.tvs && kit.tvs();
    if (tvs) return tvsGame(ui, kit, tvs, tvsSpec(ui, kit));   // 방이 열린 TV 수업: 소리는 TV 하나 · 답은 각자(_tvs.js)
    const { h, onPress, engine } = kit;
    const T = kit.timers(), V = voice(engine), low = kit.band === 'low';
    ui.say(low ? '곰의 걸음 빠르기를 골라요' : '박(걸음)의 빠르기만 듣고 골라요');
    const S = scene(kit, V);
    const A = kit.answers(items(true), k => answer(k));
    const again = h('button', { type: 'button' }, '다시 듣기');
    ui.stage.append(h('div', { class: 'pp pp-play' }, S.el, A.el));
    const results = [], picks = [];
    let plan = PLAN, sd = null, i = -1, cur = null, open = false, tok = 0, gone = false;
    const card = h('div', { class: 'overlay clear' }, h('div', { class: 'panelcard startcard' },
      h('h2', {}, '곰의 산책'),
      h('p', { class: 'sub' }, low ? '곰의 걸음이 느리게 · 보통 · 빠르게 중 무엇인지 골라요' : '곰의 걸음(박)이 느리게 · 보통 · 빠르게 중 무엇인지 골라요', h('br'), '보통 단추는 중간에 나와요'),
      h('p', { class: 'sub' }, `${PLAN.length}판 · 키보드 `, h('span', { class: 'kbd' }, '1'), ' ', h('span', { class: 'kbd' }, '2'), ' ', h('span', { class: 'kbd' }, '3'), ' 도 돼요')));
    ui.stage.append(card);
    const go = h('button', { type: 'button', class: 'go huge' }, '시작');
    // 시작할 때 판 차례를 정함 — 단계(소개 0~2 · 발전 3~6 · 비틀기 7~10 · 마무리 11) 안에서만 섞고 반쯤 느리게 ↔ 빠르게를 뒤집음(N2 · 씨앗은 기록에)
    onPress(go, () => { sd = kit.seed ? kit.seed() : 1; plan = kit.stageShuffle(PLAN, CUTS, kit.rng(sd), SHUF); card.remove(); ui.setBar(again); T.after(250, next); });
    ui.setBar(go);
    function hear() {
      const my = ++tok; open = false; A.busy(true); V.hush();
      S.item(cur);
      const at = S.play(0.1), ac = engine.ensure();
      T.after(kit.msUntil(ac, at + OPEN_IN), () => { if (my === tok && !gone) { open = true; A.busy(false); } });   // 빠르기와 상관없이 늘 같은 때(화면으로 답이 새지 않게)
    }
    function next() {
      if (gone) return;
      i++;
      if (i >= plan.length) return end();
      cur = plan[i];
      ui.count(i + 1, plan.length); ui.say(sayOf(cur.stage, low));
      A.clear(); open = false; A.busy(true);
      S.item(cur);
      let wait = 250;
      if (i === MID_AT) {                               // 발전 — 보통 단추가 나타남(자리는 처음부터 있었음)
        A.lock('mid', false);
        A.btn('mid').animate([{ transform: 'scale(.7)' }, { transform: 'scale(1.05)', offset: 0.7 }, { transform: 'none' }], { duration: 360, easing: 'ease-out' });
        ui.tell('보통 단추가 나왔어요', 'info', 1800);
        wait = 1700;
      }
      T.after(wait, () => { if (!gone) hear(); });
    }
    function answer(k) {
      if (!open || !cur) return;
      if (k === 'mid' && i < MID_AT) return;
      open = false; tok++; V.hush();
      const right = k === cur.right;
      results.push(right); picks.push(k);
      A.mark(k, right ? 'right' : 'wrong'); if (!right) A.reveal(cur.right);
      S.reveal(right);
      if (right) { kit.sfx.good(engine); ui.tell('맞아요', 'good', 900); T.after(1000, next); }
      else {
        kit.sfx.oops(engine); ui.tell('이번엔 ' + NAME[cur.right], 'oops', 2000);
        // 발자국을 보며 이번 소리만 한 번 더 듣고 다음 판
        T.after(900, () => { if (gone) return; const endAt = S.replay(); T.after(kit.msUntil(engine.ensure(), endAt) + 500, next); });
      }
    }
    function end() {
      open = false; tok++; ui.tell(null); A.clear(); A.busy(false); ui.setBar(); S.stop(); S.bear.el.hidden = true;
      const s = kit.scoreChoices(results, 5, { chance: GUESS(plan) }), tip = tipOf(plan, results, picks);
      ui.count(null);
      kit.finish({ title: `${s.total}번 중 ${s.kept}번 맞혔어요`, replay: results, group: [CUTS[0], CUTS[1] - CUTS[0], plan.length - CUTS[1]], facts: [`이어서 맞힌 최고 기록 ${s.streak}번`], starOn: s.starOn, rules: s.rules, tip, sd });
    }
    onPress(again, () => { if (cur && !gone && i < plan.length && (open || A.el.classList.contains('busy'))) hear(); });
    kit.setAuto(() => { if (card.isConnected) press(go); else if (open && cur) answer(cur.right); });
    const onKey = e => { if (e.repeat) return; const k = { 1: 'slow', 2: 'mid', 3: 'fast' }[e.key]; if (k) answer(k); };
    window.addEventListener('keydown', onKey);
    return () => { gone = true; T.clear(); V.hush(); S.stop(); window.removeEventListener('keydown', onKey); };
  },
};
