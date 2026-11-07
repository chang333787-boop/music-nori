// 선생님 칸 — 아이 화면에서 뺀 기기 설정과 출처. 처음 화면 오른쪽 위 톱니로 들어온다.
import { h } from '../util.js';
import { BANDS } from '../../../engine/judge.js';

export default function mount(root, ctx) {
  const { device } = ctx;
  const lat = device.latency, sp = device.speaker;
  const band = BANDS[device.band] || BANDS.mid;
  const card = (to, title, desc, st, need) => h('a', { class: 'btn tcard', href: '#/' + to },
    h('b', {}, title), h('span', {}, desc), h('span', { class: 'st' + (need ? ' need' : '') }, st));
  root.append(h('div', { class: 'teacher' },
    h('h1', {}, '이 기기 맞추기'),
    card('calib', '지연 맞추기', '딸깍 소리에 맞춰 8번 두드려 이 기기의 두드림 지연을 재요. 박 판정에서 이만큼 빼요.',
      lat ? `맞춤 · ${lat.ms}ms · 판정 ${band.name} 기준` : '아직 안 맞췄어요 — 처음 한 번 꼭', !lat),
    card('speaker', '스피커 점검', '크롬북 작은 스피커는 낮은 음이 작게 들려요. 음높이마다 크기를 맞춰요.',
      sp ? '맞춤 · 음높이별 크기 저장됨' : '안 맞춰도 돼요 — 높낮이 놀이 전에 권해요', false),
    card('credits', '출처와 저작권', '곡마다 권리 근거, 옮겨 온 코드, 글꼴 이용 조건.', '곡 30곡 · 노랫말 없음', false)));
}
