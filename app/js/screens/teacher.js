// 선생님 칸 — 아이 화면에서 뺀 기기 설정과 출처. 처음 화면 오른쪽 위 톱니로 들어온다.
import { h, onPress, lsGet, lsSet } from '../util.js';
import { ORDER, cellById } from '../../../engine/cells.js';
import { BANDS } from '../../../engine/judge.js';

export default function mount(root, ctx) {
  const { device } = ctx;
  const lat = device.latency, sp = device.speaker;
  const band = BANDS[device.band] || BANDS.mid;
  const card = (to, title, desc, st, need) => h('a', { class: 'btn tcard', href: '#/' + to },
    h('b', {}, title), h('span', {}, desc), h('span', { class: 'st' + (need ? ' need' : '') }, st));
  root.append(h('div', { class: 'teacher' },
    h('h1', {}, '선생님 칸'),
    card('tv', 'TV로 다같이', 'TV 하나로 반 전체 수업 — 시범 → 몸으로 따라 하기 → 반 전체 게임 → 먼저 예측하기. 단계마다 발문이 떠요.', '기기를 나눠 주지 않아도 돼요', false),
    card('calib', '지연 맞추기', '딸깍 소리에 맞춰 8번 두드려 이 기기의 두드림 지연을 재요. 박 판정에서 이만큼 빼요.',
      lat ? `맞춤 · ${lat.ms}ms · 판정 ${band.name} 기준` : '아직 안 맞췄어요 — 처음 한 번 꼭', !lat),
    card('speaker', '스피커 점검', '크롬북 작은 스피커는 낮은 음이 작게 들려요. 음높이마다 크기를 맞춰요.',
      sp ? '맞춤 · 음높이별 크기 저장됨' : '안 맞춰도 돼요 — 높낮이 놀이 전에 권해요', false),
    card('credits', '출처와 저작권', '곡마다 권리 근거, 옮겨 온 코드, 글꼴 이용 조건.', '곡 30곡 · 노랫말 없음', false),
    startPick(), resetCard()));

  // 시작 칸 — 반 학년에 맞춰 '다음 칸' 추천이 여기서 시작(잠그지 않음 · 계획서 '화면 약속')
  function startPick() {
    const cur = lsGet('startCell', ORDER[0]);
    const sel = h('select', { class: 'tselect', 'aria-label': '시작 칸' },
      ...ORDER.map(id => h('option', { value: id, selected: id === cur ? true : null }, `${cellById(id).label} ${cellById(id).name}`)));
    sel.addEventListener('change', () => { lsSet('startCell', sel.value); ctx.toast('시작 칸을 바꿨어요'); });
    return h('div', { class: 'card tcard tplain' }, h('b', {}, '시작 칸'), h('span', {}, "처음 화면의 '다음 칸'이 여기서부터 추천돼요. 3학년은 솔·미나 마디·박자표부터."), sel);
  }
  // 이 기기 기록 지우기 — 여러 아이가 한 기기를 돌려 쓸 때
  function resetCard() {
    const btn = h('button', { type: 'button' }, '기록 지우기');
    onPress(btn, () => {
      if (!btn.dataset.sure) { btn.dataset.sure = '1'; btn.textContent = '정말 지울까요? 한 번 더'; return; }
      lsSet('prog', {}); lsSet('tap.best', {}); lsSet('tap.step', 1);
      btn.textContent = '지웠어요'; delete btn.dataset.sure;
    });
    return h('div', { class: 'card tcard tplain' }, h('b', {}, '이 기기 기록'), h('span', {}, '칸의 별과 징검다리 단계를 지워요. 지연·스피커 맞춤은 그대로예요.'), btn);
  }
}
