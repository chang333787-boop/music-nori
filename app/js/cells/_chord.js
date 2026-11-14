// 화2 · 화3 주요 3화음 칸이 같이 쓰는 것(11-14) — 도막 만들기 · 음이름 · 단추 그림
//  한 판 = 도막 둘: 첫째 = 그 조의 으뜸음 두 박 → 둘째 = 화음 다섯 박(꼴과 상관없이 길이가 같다 · 답이 열리는 때로 새지 않음)
//   arp   세 음을 한 박씩 하나씩 낸 뒤 두 박 함께
//   block 두 박 함께 → 세 박 함께(두 번)
import { line } from './_pick.js';

export const ROMAN = { I: 'Ⅰ', IV: 'Ⅳ', V: 'Ⅴ' };
export const NEXT = { I: 'IV', IV: 'V', V: 'I' };
const NAME = { 0: '도', 2: '레', 4: '미', 5: '파', 6: '파♯', 7: '솔', 9: '라', 10: '시♭', 11: '시' };
export const noteName = p => NAME[((p % 12) + 12) % 12];
export const chordNames = ps => ps.map(noteName).join(' · ');

const TONIC_VEL = 0.6, CH_VEL = 0.45;
// ps = 화음 세 음(MIDI) · tonic = 으뜸음(MIDI) · form = arp | block · inst = 화음 악기 · up = 화음을 옮길 반음 수(옥타브 위 = 12)
export function chordSegs({ ps, tonic, form = 'arp', inst = 'piano', up = 0, caps = ['', ''] }) {
  const q = ps.map(p => p + up), o = { inst, vel: CH_VEL };
  const lines = form === 'block'
    ? q.map(p => line([[p, 2], [p, 3]], o))
    : q.map((p, i) => line([...(i ? [[null, i]] : []), [p, 1], ...(i < 2 ? [[null, 2 - i]] : []), [p, 2]], o));
  return [
    { lines: [line([[tonic, 2]], { inst: 'piano', vel: TONIC_VEL })], cap: caps[0] },
    { lines, cap: caps[1] },
  ];
}

// 단추 그림 — 쌓인 음 셋(Ⅰ 낮게 · Ⅳ 가운데 · Ⅴ 높게) · 왼쪽 아래 점 = 으뜸음
const DOT = (x, y, on = true) => `<circle cx="${x}" cy="${y}" r="7" ${on ? 'fill="#2F6F4E"' : 'style="fill:var(--surface)"'} stroke="#3B2A1E" stroke-width="2.4"/>`;
const BASE = { I: 54, IV: 47, V: 40 };
export const chordChip = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${DOT(12, 54, false)}${[0, 1, 2].map(i => DOT(40, BASE[k] - i * 14)).join('')}</svg>`;
// 'Ⅰ — 도 · 미 · 솔이 함께 났어요' — 끝 음이름 받침에 따라 이 · 가
const josa = s => { const c = s.replace(/[♯♭]/g, '').slice(-1).charCodeAt(0) - 0xAC00; return c >= 0 && c % 28 ? '이' : '가'; };
export const togetherText = ps => `${chordNames(ps)}${josa(chordNames(ps))} 함께 났어요`;
