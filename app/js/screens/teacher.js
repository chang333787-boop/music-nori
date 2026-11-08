// 선생님 칸 — 아이 화면에서 뺀 기기 설정과 출처. 처음 화면 오른쪽 위 톱니로 들어온다.
//  성취기준 점검(11-08): '이 기기 기록 보기'(과정 평가 자료 · #/records) · 1~2학년 안내 카드(누르는 카드 아님)
import { h, onPress, lsGet, lsSet } from '../util.js';
import * as music from '../music.js';
import { ORDER, cellById, LANES, cellName } from '../../../engine/cells.js';
import { BANDS } from '../../../engine/judge.js';
import { getProg } from '../cellkit.js';

export default function mount(root, ctx) {
  const { device } = ctx;
  const lat = device.latency, sp = device.speaker;
  const band = BANDS[device.band] || BANDS.mid;
  const prog = getProg();
  const nRec = Object.values(prog).reduce((n, p) => n + (p && Array.isArray(p.hist) ? p.hist.length : p && p.stars != null ? 1 : 0), 0);
  const card = (to, title, desc, st, need) => h('a', { class: 'btn tcard', href: '#/' + to },
    h('b', {}, title), h('span', {}, desc), h('span', { class: 'st' + (need ? ' need' : '') }, st));
  root.append(h('div', { class: 'teacher' },
    card('tv', 'TV로 다같이', 'TV 하나로 반 전체 수업 — 시범 → 몸으로 따라 하기 → 반 전체 게임 → 먼저 예측하기. 단계마다 발문이 떠요.', '기기를 나눠 주지 않아도 돼요', false),
    card('calib', '지연 맞추기', '딸깍 소리에 맞춰 8번 두드려 이 기기의 두드림 지연을 재요. 박 판정에서 이만큼 빼요.',
      lat ? `맞춤 · ${lat.ms}ms · 판정 ${band.name} 기준` : '아직 안 맞췄어요 — 처음 한 번 꼭', !lat),
    card('speaker', '스피커 점검', '크롬북 작은 스피커는 낮은 음이 작게 들려요. 음높이마다 크기를 맞춰요.',
      sp ? '맞춤 · 음높이별 크기 저장됨' : '안 맞춰도 돼요 — 높낮이 놀이 전에 권해요', false),
    card('records', '이 기기 기록 보기', '칸마다 최근 10번 — 날짜 · 별 · 맞힌 수 · 틀린 갈래. 표로 복사해 과정 평가 자료로 써요.',
      nRec ? `기록 ${nRec}개 · 이름 없이 이 기기에만` : '아직 기록이 없어요', false),
    card('credits', '출처와 저작권', '곡마다 권리 근거, 옮겨 온 코드, 글꼴 이용 조건.', '곡 30곡 · 노랫말 없음', false),
    lowCard(), startPick(), deviceCard()));

  // 1~2학년 안내 — 누르는 카드 아님(판정 너그러움은 '지연 맞추기' 결과 화면에서 바꿈)
  function lowCard() {
    const on = device.band === 'low';
    return h('div', { class: 'card tcard tplain' }, h('b', {}, '1~2학년'),
      h('span', {}, "2027학년도까지 즐거운 생활(2022-33)은 음악 요소 낱말이 없어 이 앱을 청각 · 리듬 놀이로 써요. 요소는 2028 판 기준이에요. 판정을 '넉넉하게'로 두면 칸 이름과 글이 쉬운 말로 바뀌어요."),
      h('span', { class: 'st' + (on ? ' need' : '') }, on ? '지금 넉넉하게 — 쉬운 말로 보여요' : `지금 ${band.name} 판정 — 지연 맞추기에서 바꿔요`));
  }
  // 시작 칸 — 반 학년에 맞춰 '다음 칸' 추천이 여기서 시작(잠그지 않음 · 계획서 '화면 약속')
  function startPick() {
    const cur = lsGet('startCell', ORDER[0]);
    const sel = h('select', { class: 'tselect', 'aria-label': '시작 칸' },
      ...ORDER.map(id => { const c = cellById(id), k = ORDER.filter(x => cellById(x).lane === c.lane).indexOf(id); return h('option', { value: id, selected: id === cur ? true : null }, `${LANES[c.lane].name} ${k + 1} · ${cellName(c, device.band)}`); }));
    sel.addEventListener('change', () => { lsSet('startCell', sel.value); ctx.toast('시작 칸을 바꿨어요'); });
    return h('div', { class: 'card tcard tplain' }, h('b', {}, '시작 칸'), h('span', {}, "처음 화면의 '다음 칸'이 여기서부터 추천돼요. 3학년은 솔·미나 마디·박자표부터."), sel);
  }
  // 이 기기 — 배경 음악 켜기/끄기(docs/sound.md · 처음 화면 · 지도에서만) + 기록 지우기(여러 아이가 한 기기를 돌려 쓸 때 · 별 · 결과 기록 · 징검다리 단계)
  function deviceCard() {
    const bgm = h('button', { type: 'button' });
    const draw = () => { const on = lsGet('bgm', true) !== false; bgm.textContent = on ? '배경 음악 켜짐' : '배경 음악 꺼짐'; bgm.setAttribute('aria-pressed', String(on)); };
    onPress(bgm, () => { music.setEnabled(lsGet('bgm', true) === false); draw(); });
    draw();
    const btn = h('button', { type: 'button' }, '기록 지우기');
    onPress(btn, () => {
      if (!btn.dataset.sure) { btn.dataset.sure = '1'; btn.textContent = '정말 지울까요? 한 번 더'; return; }
      lsSet('prog', {}); lsSet('tap.best', {}); lsSet('tap.step', 1); lsSet('bgm.heard', null); lsSet('map.seen', null);
      btn.textContent = '지웠어요'; delete btn.dataset.sure;
    });
    return h('div', { class: 'card tcard tplain' }, h('b', {}, '이 기기'),
      h('span', {}, '배경 음악은 처음 화면 · 지도에서만 작게 나와요(칸 안 · 방 번호 기기 X). 기록 지우기는 별 · 결과 기록 · 징검다리 단계를 지워요.'),
      h('div', { class: 'trow' }, bgm, btn));
  }
}
