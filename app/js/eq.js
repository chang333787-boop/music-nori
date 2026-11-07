// 음높이별 크기 맞추기 — 크롬북 작은 스피커는 낮은 음이 작게 들린다. 스피커 점검(#/speaker)에서 맞춘 배수를 소리마다 곱한다.
//  device.speaker.gains = { MIDI 번호: 배수 } (라4 = 69 가 기준 1). 사이 음은 음 번호 사이를 직선으로 잇고, 끝 밖은 끝 값.
//  표가 없으면 1. 배수는 0.5~2로 자른다(소리가 갑자기 두 배 넘게 커지거나 작아지지 않게).
//  이 파일을 import 하기만 해도 engine.pitchGain 이 붙는다 → audio.js Engine.note 가 세기(vel)에 곱한다.
import { engine } from './audio.js';
import { device } from './device.js';

export const GAIN_MIN = 0.5, GAIN_MAX = 2;
export const clampGain = g => Math.min(GAIN_MAX, Math.max(GAIN_MIN, g));

// { 음: 배수 } → 음 차례로 놓은 [[음, 배수], …] (바뀔 때만 만든다 — 소리마다 만들지 않게)
export function toPoints(gains) {
  const pts = [];
  if (gains && typeof gains === 'object') {
    for (const [k, v] of Object.entries(gains)) {
      const p = Number(k), g = Number(v);
      if (Number.isFinite(p) && Number.isFinite(g) && g > 0) pts.push([p, clampGain(g)]);
    }
  }
  return pts.sort((a, b) => a[0] - b[0]);
}

// 점들 사이 직선 보간 — 점이 없으면 1
export function interp(pts, p) {
  const n = pts.length;
  if (!n) return 1;
  if (p <= pts[0][0]) return pts[0][1];
  if (p >= pts[n - 1][0]) return pts[n - 1][1];
  for (let i = 1; i < n; i++) {
    const b = pts[i];
    if (p <= b[0]) {
      const a = pts[i - 1], k = (p - a[0]) / (b[0] - a[0]);
      return clampGain(a[1] + (b[1] - a[1]) * k);
    }
  }
  return 1;
}

// 아직 저장 안 한 표로 들어 볼 때(스피커 점검 화면의 '고친 대로 들어 보기')
export const gainAt = (gains, p) => interp(toPoints(gains), p);

let cache = null;
// 저장한 표를 다시 읽는다 — 스피커 점검에서 저장 · 초기화한 뒤 부른다
export function refreshEq() {
  const s = device.speaker;
  cache = toPoints(s && s.gains);
  return cache;
}
export function pitchGain(p) {
  if (!cache) refreshEq();
  return interp(cache, p);
}

// 부작용 import — 붙이기만 해도 모든 음(Engine.note)에 적용된다
engine.pitchGain = pitchGain;
// 다른 탭에서 바꾸면 따라 읽는다
window.addEventListener('storage', e => { if (!e.key || e.key === 'mn.speaker') refreshEq(); });
