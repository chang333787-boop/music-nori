// 동물 친구 음악대 — 코드로 그리는 단순 도형(계획서: 처음엔 단순 도형 · 그라데이션·빛 번짐 X · 굵은 먹선)
//  '숲속 악단' 안(이름 후보 탭의 추천)으로 먼저 그린다. 교사가 음악대를 고르면 이 파일만 바꾼다.
//  갈래마다 한 명: 고슴도치 = 박·리듬(북) · 참새 = 가락(노래) · 토끼 = 소리(트라이앵글) · 거북 = 악보 · 곰 = 셈여림·빠르기(큰북)
import { svg } from './util.js';

const INK = '#1F1B16', CREAM = '#F3E6CF', CHEEK = '#E9A38F';
const eye = (x, y) => svg('circle', { cx: x, cy: y, r: 3.4, fill: INK });
const cheek = (x, y) => svg('ellipse', { cx: x, cy: y, rx: 4.5, ry: 3, fill: CHEEK });
const S = { stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };

function hedgehog() {
  // 가시 = 반원을 따라 바깥·안 반지름을 번갈아 찍은 톱니
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (i / 18) * Math.PI, r = i % 2 ? 54 : 44;
    pts.push(`${(60 + Math.cos(a) * r).toFixed(1)},${(98 + Math.sin(a) * r * 0.86).toFixed(1)}`);
  }
  return [
    svg('polygon', { points: pts.join(' ') + ' 104,112 16,112', fill: '#8A5A2B', ...S }),
    svg('ellipse', { cx: 60, cy: 102, rx: 30, ry: 25, fill: CREAM, ...S }),
    eye(49, 97), eye(71, 97), cheek(42, 106), cheek(78, 106),
    svg('ellipse', { cx: 60, cy: 106, rx: 4.5, ry: 3.6, fill: INK }),
    // 북
    svg('rect', { x: 36, y: 116, width: 48, height: 18, rx: 3, fill: '#C4511A', ...S }),
    svg('ellipse', { cx: 60, cy: 116, rx: 24, ry: 6, fill: '#FAF6EE', ...S }),
    svg('path', { d: 'M40 122 L52 132 M58 122 L70 132 M76 122 L82 128', ...S, 'stroke-width': 2, fill: 'none' }),
    svg('line', { x1: 28, y1: 98, x2: 46, y2: 114, ...S, class: 'stick l' }),
    svg('line', { x1: 92, y1: 98, x2: 74, y2: 114, ...S, class: 'stick r' }),
  ];
}
function sparrow() {
  return [
    svg('path', { d: 'M88 96 L112 84 L106 104 Z', fill: '#6E4A2A', ...S }),
    svg('ellipse', { cx: 60, cy: 98, rx: 36, ry: 32, fill: '#B07A47', ...S }),
    svg('ellipse', { cx: 58, cy: 106, rx: 22, ry: 19, fill: CREAM, ...S }),
    svg('circle', { cx: 56, cy: 64, r: 25, fill: '#8A5A2B', ...S }),
    svg('ellipse', { cx: 54, cy: 70, rx: 18, ry: 14, fill: CREAM, stroke: 'none' }),
    eye(47, 66), eye(63, 66), svg('ellipse', { cx: 40, cy: 74, rx: 4, ry: 3, fill: '#5A3C22' }),
    svg('path', { d: 'M52 73 L58 80 L64 73 Z', fill: '#F4C247', ...S, 'stroke-width': 2.4, class: 'beak' }),
    svg('path', { d: 'M76 92 Q96 104 80 120 Q70 108 76 92 Z', fill: '#6E4A2A', ...S }),
    svg('path', { d: 'M36 86 Q58 96 80 86', fill: 'none', stroke: '#2D6CB0', 'stroke-width': 8, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M50 128 L48 136 M68 128 L70 136', ...S, stroke: '#C4511A' }),
  ];
}
function bunny() {
  return [
    svg('ellipse', { cx: 46, cy: 36, rx: 9, ry: 28, fill: '#FFFFFF', ...S, transform: 'rotate(-10 46 36)' }),
    svg('ellipse', { cx: 74, cy: 36, rx: 9, ry: 28, fill: '#FFFFFF', ...S, transform: 'rotate(10 74 36)' }),
    svg('ellipse', { cx: 46, cy: 38, rx: 4, ry: 18, fill: '#F2B6C6', transform: 'rotate(-10 46 38)' }),
    svg('ellipse', { cx: 74, cy: 38, rx: 4, ry: 18, fill: '#F2B6C6', transform: 'rotate(10 74 38)' }),
    svg('ellipse', { cx: 60, cy: 108, rx: 30, ry: 26, fill: '#FFFFFF', ...S }),
    svg('circle', { cx: 60, cy: 74, r: 24, fill: '#FFFFFF', ...S }),
    eye(51, 72), eye(69, 72), cheek(44, 80), cheek(76, 80),
    svg('path', { d: 'M56 80 L64 80 L60 85 Z', fill: '#E57A97' }),
    // 트라이앵글
    svg('path', { d: 'M92 92 L108 122 L76 122 Z', fill: 'none', stroke: '#9A8F80', 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    svg('line', { x1: 92, y1: 84, x2: 92, y2: 92, ...S, 'stroke-width': 2 }),
  ];
}
function turtle() {
  return [
    svg('circle', { cx: 24, cy: 92, r: 15, fill: '#9CC98A', ...S }),
    eye(20, 89), cheek(18, 97),
    svg('path', { d: 'M28 120 Q30 68 66 66 Q104 68 106 120 Z', fill: '#2E7D4F', ...S }),
    svg('path', { d: 'M52 76 L80 76 L88 96 L66 110 L44 96 Z', fill: 'none', stroke: '#9CC98A', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M44 96 L30 104 M88 96 L102 104 M66 110 L66 120', stroke: '#9CC98A', 'stroke-width': 3 }),
    svg('ellipse', { cx: 42, cy: 124, rx: 10, ry: 7, fill: '#9CC98A', ...S }),
    svg('ellipse', { cx: 92, cy: 124, rx: 10, ry: 7, fill: '#9CC98A', ...S }),
    // 악보 한 장
    svg('rect', { x: 70, y: 22, width: 40, height: 34, rx: 3, fill: '#FFFFFF', ...S, 'stroke-width': 2.4 }),
    ...[0, 1, 2, 3, 4].map(k => svg('line', { x1: 74, x2: 106, y1: 29 + k * 5, y2: 29 + k * 5, stroke: INK, 'stroke-width': 1 })),
    svg('ellipse', { cx: 84, cy: 41, rx: 3.6, ry: 2.6, fill: INK, transform: 'rotate(-20 84 41)' }),
    svg('line', { x1: 87.4, y1: 40, x2: 87.4, y2: 27, stroke: INK, 'stroke-width': 1.4 }),
  ];
}
function bear() {
  return [
    svg('circle', { cx: 38, cy: 52, r: 11, fill: '#6B4E2E', ...S }),
    svg('circle', { cx: 82, cy: 52, r: 11, fill: '#6B4E2E', ...S }),
    svg('ellipse', { cx: 60, cy: 104, rx: 38, ry: 32, fill: '#6B4E2E', ...S }),
    svg('circle', { cx: 60, cy: 70, r: 28, fill: '#6B4E2E', ...S }),
    svg('ellipse', { cx: 60, cy: 80, rx: 13, ry: 10, fill: CREAM, ...S, 'stroke-width': 2.4 }),
    eye(49, 66), eye(71, 66),
    svg('ellipse', { cx: 60, cy: 76, rx: 4.5, ry: 3.4, fill: INK }),
    // 큰북
    svg('circle', { cx: 60, cy: 112, r: 20, fill: '#FAF6EE', ...S }),
    svg('circle', { cx: 60, cy: 112, r: 12, fill: 'none', stroke: '#C4511A', 'stroke-width': 3 }),
  ];
}

export const BAND = [
  { key: 'hog', name: '고슴도치', lane: '박·리듬', draw: hedgehog },
  { key: 'bird', name: '참새', lane: '가락', draw: sparrow },
  { key: 'bunny', name: '토끼', lane: '소리', draw: bunny },
  { key: 'turtle', name: '거북', lane: '악보', draw: turtle },
  { key: 'bear', name: '곰', lane: '셈여림·빠르기', draw: bear },
];
export const friendOf = key => BAND.find(b => b.key === key) || BAND[0];

// 그림 파일(코덱스가 그린 일러스트 · tools/img_prep.py로 손질한 webp) — 없으면 아래 코드 도형으로 바꿔 끼운다
//  pose: idle 서기 · play 연주 · jump 뛰기 · oops 삐끗 · happy 기쁨(지금은 고슴도치만 다섯 가지)
export const IMG_DIR = 'app/img/band/';
// 있는 그림 — 없는 자세는 가까운 자세로 바꿔 받는다(없는 파일을 찾느라 404가 나지 않게). 그림이 더 들어오면 여기에 더한다
export const POSES = {
  hog: ['idle', 'play', 'jump', 'oops', 'happy', 'face'],
  bird: ['idle', 'play', 'face'],
  bunny: ['idle', 'play', 'face'],
  turtle: ['idle', 'play', 'face'],
  bear: ['idle', 'play', 'face'],
};
const NEAR = { happy: 'play', jump: 'play', oops: 'idle', face: 'idle', play: 'idle' };
export function poseOf(key, pose) {
  const have = POSES[key] || [];
  let p = pose;
  for (let k = 0; k < 4 && !have.includes(p); k++) p = NEAR[p] || 'idle';
  return p;
}
export function friendImg(key, pose = 'idle', { label = true, cls = '' } = {}) {
  const f = friendOf(key);
  const img = new Image();
  img.src = `${IMG_DIR}${f.key}_${poseOf(f.key, pose)}.webp`;
  img.alt = label ? f.name : '';
  img.draggable = false;
  img.decoding = 'async';
  img.className = ('pal pal-' + f.key + ' ' + cls).trim();
  img.dataset.pose = pose;
  img.onerror = () => { img.onerror = null; img.replaceWith(friendSVG(key, { label })); };
  return img;
}
// 같은 그릇 안에서 자세만 바꾸기(그림이 미리 받아져 있으면 깜빡임 없음)
export function setPose(img, key, pose) {
  if (!img || img.tagName !== 'IMG' || !img.isConnected || img.dataset.pose === pose) return;
  img.dataset.pose = pose;
  img.src = `${IMG_DIR}${friendOf(key).key}_${poseOf(friendOf(key).key, pose)}.webp`;
}
export function preload(list) {
  for (const [key, pose] of list) { const i = new Image(); i.src = `${IMG_DIR}${key}_${poseOf(key, pose)}.webp`; }
}

export function friendSVG(key, { label = true } = {}) {
  const f = friendOf(key);
  return svg('svg', { viewBox: '0 0 120 140', role: label ? 'img' : null, 'aria-label': label ? f.name : null, 'aria-hidden': label ? null : 'true', class: 'pal pal-' + f.key }, ...f.draw());
}

// 처음 화면에서 두드리면 내는 소리 — 각자 맡은 갈래를 한 번에 느끼게(곰은 크게 한 번 · 작게 한 번 = 셈여림)
export function friendSound(engine, key) {
  const ctx = engine.ensure(), t = ctx.currentTime + 0.01;
  switch (key) {
    case 'hog': engine.drum('kick', t, 0.9); engine.drum('snare', t + 0.22, 0.8); break;
    case 'bird': engine.note('flute', 67, t, 0.24, 0.85); engine.note('flute', 64, t + 0.28, 0.32, 0.85); break;
    case 'bunny': engine.drum('triangle', t, 0.8); break;
    case 'turtle': [60, 64, 67].forEach((p, i) => engine.note('marimba', p, t + i * 0.16, 0.3, 0.8)); break;
    case 'bear': engine.drum('bassdrum', t, 1); engine.drum('bassdrum', t + 0.5, 0.3); break;
  }
}
