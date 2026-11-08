// 출처 화면 — 옮겨 온 코드 · 글꼴 · 곡 근거 · 교육과정 인용 표시(연구대회 저작권 증빙 5번 '앱의 저작권·출처 화면')
import { h } from '../util.js';

const ROWS = [
  ['소리 합성(audio.js)', '우리반RPG 음악실 music/js/audio.js — 같은 저자가 만든 코드를 옮겨 다듬음', 'MIT(이 저장소)'],
  ['오선 그리기(notation.js)', '우리반RPG 음악실 music/js/notation.js — 같은 저자', 'MIT(이 저장소)'],
  ['리코더 운지(recorder.js)', '우리반RPG 음악실 music/js/recorder.js — 같은 저자 · 확인한 운지만', 'MIT(이 저장소)'],
  ['음 이름 · 음계 · 화음(theory.js)', '우리반RPG 음악실 music/js/theory.js — 같은 저자 · 틱 계산은 새로', 'MIT(이 저장소)'],
  ['박 판정 · 마디 채우기 · 곡 모양', '이 앱에서 새로 만듦(engine/)', 'MIT(이 저장소)'],
  ['악보 글꼴 Noto Music', 'Google Fonts — 높은음자리표·쉼표 글자만 받음', 'SIL Open Font License 1.1'],
  ['글꼴 Jua', 'Google Fonts', 'SIL Open Font License 1.1'],
  ['효과음 · 악기 소리', 'Web Audio로 직접 합성(소리 파일 없음)', '—'],
  ['주제곡 「숲속 음악대」 · 반주 · 팡파르', '이 앱에서 새로 지음(engine/theme.js · 2026-11-08) — 유명 곡 닮음 검사 통과', 'MIT(이 저장소)'],
  ['음악대 그림 · 배경 · 징검돌', 'OpenAI 코덱스 이미지 생성으로 그림(2026-11-07) — 모델 시트 한 장을 기준으로 자세를 그리고 tools/img_prep.py로 손질 · 이 앱 전용', 'MIT(이 저장소)'],
];

export default function mount(root) {
  root.append(h('div', { class: 'card credits' },
    h('p', {}, '이 앱의 곡은 작곡·작사·편곡한 사람이 모두 1962년 이전에 세상을 떠났거나, 오래 구전된 전래 가락이거나, 이 앱이 새로 지은 것만 넣어요. 노랫말은 아직 넣지 않았어요. 곡마다 근거는 곡 보기 화면 아래와 저장소의 docs/rights.md에 있어요.'),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, '무엇'), h('th', {}, '어디서'), h('th', {}, '이용 조건'))),
      h('tbody', {}, ...ROWS.map(r => h('tr', {}, ...r.map(c => h('td', {}, c)))))),
    h('p', { class: 'small muted', style: { marginTop: '14px' } }, '교육과정 대응은 2022 개정 음악과·즐거운 생활과 성취기준(교육부 고시 제2022-33호 [별책 12] 등)을 기준으로 해요. 칸 이름과 차례는 이 앱이 붙인 것이고, 특정 출판사 교과서·지도서와 관계없어요.'),
    h('p', { class: 'small muted' }, '저장소: github.com/chang333787-boop/music-nori · 코드 MIT 라이선스')));
}
