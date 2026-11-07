# 칸 모듈 약속 — `app/js/cells/<칸>.js` (견본: `so4.js` 높게·낮게)

칸 하나 = 파일 둘: `app/js/cells/<칸>.js` + `app/css/cells/<칸>.css`(비어 있어도 꼭 있어야 함 — 칸 화면이 불러옴). 칸 id·이름·먼저 필요한 칸·확인 게임 설명은 `engine/cells.js`가 정본.

```js
export default {
  show(ui, kit)   { … return 정리함수 },   // 보기
  follow(ui, kit) { … return 정리함수 },   // 따라 하기
  game(ui, kit)   { … return 정리함수 },   // 확인 게임
};
```

## ui (칸 화면이 줌)
- `ui.stage` — 무대 그릇(가로 약 1300 × 세로 약 470 · display:flex). 여기에 그린다
- `ui.say(글)` — 무대 맨 위 지시 한 줄(30px). 짧게 · 한 문장
- `ui.setBar(...단추)` — 아래 띠(140px). 비우면 띠가 사라지고 무대가 커진다(확인 게임 중에 씀)
- 기본 아래 띠: 보기 = '따라 해 볼래요' · 따라 하기 = '넘어가기' · 확인 게임 = 비움

## kit
- `engine`(소리) · `device` · `band`(low·mid·high — 박 판정 너그러움) · `cell` · `friend`(갈래 친구)
- `h` · `onPress`(누르는 순간 반응) · `friendImg(친구, 자세)` · `setPose(그림, 친구, 자세)` — 자세: idle · play · happy · oops(고슴도치만 jump 더)
- `next()` 다음 단계 · `pass(글)` 따라 하기를 지남(→ '확인 게임' 단추) · `finish(결과)` 확인 게임 끝
- `setAuto(fn)` — **자동 시험용 '지금 맞는 행동 하나'**. 단계마다 꼭 정한다(보기: 예시 하나씩 누르다 `next()` · 따라 하기: 맞는 답 · 확인 게임: 시작 단추 → 맞는 답 / 맞는 때 두드림). `tests/cells.browser.cjs`가 0.16초마다 부른다
- `sfx.good(engine)` · `sfx.oops(engine)` · `playSeq(engine, [{p, d, gap}], {inst})` → `{ starts, end, ac }` · `msUntil(ac, t)` · `timers()`(정리 때 한꺼번에 멈춤) · `rng(seed)` · `shuffle`
- `scoreChoices(맞음틀림[], 이어서n)` → `{ total, kept, streak, starOn, rules }`
- 박 판정이 필요하면 `engine/judge.js`(windows · judgeTaps)와 `app/js/clock.js`(audioToPerf)를 import — 징검다리(`screens/tap.js`)가 본보기

## finish(결과)
`{ title: '12번 중 10번 맞혔어요', replay: [true, false, …], facts: ['가장 길게 이어서 6번'], starOn: [①, ②, ③], rules: ['절반 넘게 맞혔어요', '5번 이어서 맞혔어요', '모두 맞혔어요'], tip: '사실 한 줄' }`
- 별 셋은 기준 글과 함께. 받은 별만 채움. 칭찬은 기준을 넘었을 때만, 무엇을 잘했는지 사실로
- tip = 틀린 곳에서 찾은 사실("높이 차이가 작을 때 헷갈렸어요") — 빈 칭찬 X

## 한 칸이 도는 순서(계획서)
1. **보기** — 예시 여러 개(다른 악기 · 다른 높이/길이). 소리와 그림이 함께 · 기호는 소리와 함께 반짝
2. **따라 하기** — 세 번 이어서 맞히면 `kit.pass()` · 못 해도 '넘어가기' · 틀리면 까닭이 보이는 피드백("두 번째 소리가 더 낮았어요") + 다시 듣기
3. **확인 게임** — 시작 카드(무엇을 하는지 한 줄 + 판 수) → 30~60초 · 소개 → 발전 → 비틀기 → 마무리 · 실수해도 끝까지 · 키보드도 됨

## 지킬 것
- `docs/ui.md` 화면 약속(잉크 외곽선 · 주황은 누를 것 하나 · 판정에 빨강 X · 글자 18px 이상 · 1366×768 스크롤 0)
- 높낮이 = 세로 위치 · 길이 = 가로 길이 · 셈여림 = 크기. 한 가지만 바꿀 때는 나머지(세기 · 악기 · 길이)를 같게
- 높낮이 판은 가온 도(C4) 위 음역(C4~C6) · 세기 같게
- 곡을 쓰면 `engine/songs/index.js`의 대장에 오른 곡만. 노랫말 X
- 매 프레임 새 객체 줄이기 · 정리 함수에서 타이머 · 소리 · 키 듣기 모두 멈춤
- 화면 글은 쉬운 해요체, 짧게. 학년 · '만드는 중' 글 X
