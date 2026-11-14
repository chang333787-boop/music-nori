# 기준표를 100으로 채우는 차례 (11-14 · 일하는 동안 쓰는 계획 — 끝나면 지운다)

점수판 = `node tools/bar.mjs`(뜻은 docs/bar.md). 「실제 사용」만 빼고 모두 100이 될 때까지.
세는 법: 단계 OK = 듣기(L) + 손으로 하기(D 직접 내기 또는 E 넣고 빼기) · 요소 OK = 만들기(M)가 하나라도 · 실제로 열리는 활동만(engine/depth.js).

## 1. 단계마다 무엇으로 채우나 (★ = 새로 만들 것)
| 단계 | 듣기 L | 하기 D·E | 
|---|---|---|
| b1 일정박 | ★bak1 고른 박 ↔ 흔들리는 박 | ri1(D) · play:tempo |
| b2 · b3 | ri5 | ri5 · lab:meter |
| b4 한 마디 채우기 | ★ri11 들은 리듬 찾기 | ri6 · play:fix |
| b5 6/8 | ★ri13 둘로 나뉘는 박 ↔ 셋으로 나뉘는 박 | ★lab:meter:m68 |
| b6 못갖춘마디 | ★ri10 첫 박부터 ↔ 여린박부터 | ★lab:meter:pickup |
| b7 변박자 | ★ri14 박자가 그대로 ↔ 중간에 바뀜 | ★lab:meter:mixed |
| r1 | so3 | play:long |
| r2 · r3 · r4 · r5 | ★ri11(리듬 카드 고르기) | ri2 · ri3 · ri4(D) · ri6 |
| r6 점음표 | ★ri9 고르게 ↔ 길게-짧게 | ★lab:len:dot |
| r7 붙임줄 · r8 당김음 | ★ri12 붙임줄·당김음 | lab:len:tie · ★lab:len:sync |
| r9 16분·셋잇단 | ★ri8 둘 · 셋 · 넷으로 쪼갠 박 | ★lab:len:six · ★lab:len:trip |
| r10 스타카토·늘임표 · t5 | ★ri15 끊어서 ↔ 이어서 · 끝 음 늘임 | lab:len:stacc · fermata |
| j1 · j2 | jd1 | ★play:jang 장단 판 |
| j3 굿거리 · j4 중중모리 | ★jd2(둘을 한 칸에 — jd1처럼) | ★play:jang |
| m1 · m2 · m3 · m5 | so4 · so5 · ga1~2 · ga4 | play:pitch(+ m3에 ak1 D) |
| m4 | ga3 | play:make + play:pitch 더하기 |
| m6 다섯 음 | ga5(첫 묶음) | play:pitch 더하기 |
| m7 장음계 | ★ga7 | play:pitch(일곱 음 다 되는지 확인) |
| m8 음이름 읽기 · s5 | ★ak4(LD — 듣고 음이름 건반 누르기) | ak4 D |
| m9 조 | ★ga8 통째로 옮긴 같은 가락 ↔ 다른 가락 | ★lab:key:up |
| d1 · d2 | sem1 | lab:dyn |
| d3 · d5 | ★sem3 셈여림 여섯 단계(둘 중 더 센 쪽 → 차례) | lab:dyn |
| d4 | sem2(첫 묶음) | lab:dyn:cresc |
| d6 악센트 | ★sem4 어느 음이 세졌나 | lab:dyn:accent |
| t1 | ppa1 | ri1 · lab:tempo |
| t2 빠르기만 떼어 듣기 | ★ppa3(높이·세기·촘촘함이 달라져도 빠르기만) | lab:tempo · play:tempo |
| t3 빠르기말 | ★ppa4 다섯 빠르기 | lab:tempo |
| t4 점점 느리게·빠르게 | ★ppa2 | lab:tempo:rit · accel |
| e1 | so6 | lab:inst |
| e2 타악기 | ★eum1 두드리는 소리(북·나무·쇠) | ★lab:inst:drum 북 반주 |
| e3 | ★eum3 악기 이름 맞히기 | lab:inst |
| e4 관·현 | ★eum2 부는 소리 ↔ 줄 소리 | lab:inst 더하기 |
| f1 · f3 · f6 | hy1 · ★hy4 ab · ★hy3 aba | ★play:form 도막 카드 |
| f2 메기고 받기 | hy2(첫 묶음) | ★play:form |
| f4 · f5 | ★ban1 도돌이표·1·2번 괄호(들은 차례의 악보 고르기) | lab:repeat · ★lab:repeat:volta |
| f7 긴자진·시조 | ★hy5(국악 조사 gugak_facts.md의 안전한 문장만) | lab:tempo:slow → fast |
| f8 D.C.·Fine | ★ban2 | ★lab:repeat:dc · fine |
| h1 | hwa1 | ★lab:chord:second 둘째 줄 |
| h2 · h3 | ★hwa2 · ★hwa3 | ★lab:chord:I · IV · V(조를 옮기면 따라감) |
| s1 그림 악보 | ★ak7 듣고 그림 악보 고르기 | ak1 · play:long |
| s2 · s3 | ★ak3 듣고 오선 악보 고르기(가온 도·덧줄) | play:pitch · play:make |
| s4 | ★ak6 기호가 붙은 악보 듣고 고르기 | lab:* |
| s6 조표·임시표 | ★ak5 | ★lab:key:sharp · flat |

## 2. 만들기 M (요소마다 하나)
박·리듬 = ★play:rmake 내 리듬 짓기(리6 블록) · 장단 = ★play:jang · 가락 · 악보 = play:make · 셈여림 · 빠르기 · 음색 = ★play:dress 내 곡 꾸미기(지은 가락에 셈여림·빠르기·악기 입히기) · 형식 = ★play:form · 화음 = ★play:chord 반주 화음 고르기
engine/depth.js PLAY_KIND에 `rmake jang form dress chord = 'EM'` · flow.js PLAY_KEYS는 칸 카드 + 따로 서는 카드.

## 3. 틀 넓히기 (새 칸보다 먼저)
- `_pick.js` 판마다 다른 고르기 카드: `cards: row => [{ key, svg }]`(리듬·오선·그림 악보 카드) — ri11 ri9 ri12 ri8 ri10 ak7 ak3 ak6 ban1 ban2 ak5가 씀
- 리듬 악보 그림 한 벌(4분 · 8분 둘 · 2분 · 쉼표 · 점4분 · 16분 넷 · 셋잇단 · 붙임줄 · 8분쉼표) — 공용 모듈
- 고르기 틀에서 타악기 소리(쿵 · 톡 · 쇠)를 줄로 쓰기
- 시험 목록(cells.test · cells.browser · rules · perf · 개수 글)을 장부(`first` · `frame`)에서 저절로 — 묶음마다 한 줄 목록이 부딪히지 않게
- 지도 · TV 고르기 화면이 칸 56개를 1366×768 스크롤 0으로 담게(학년 띠 먼저 · 나머지는 잠금 없는 「더 보기」)

## 4. 차례
① 첫 묶음(sem2 `227ab99` · hy2 · ga5 · ear) 합치기 + 시험 목록 저절로 + TV 대본 빠진 것 + TV 곰 줄 → push
② 틀 넓히기(3절) + 새 칸 장부·흐름·난이도 미리 등록(`first` 없이 · `kinds`) → push
③ 칸 묶음(Opus 만드는 팀 · 한 팀 세 칸 · 한 번에 세 팀 · 각자 worktree · 브라우저 시험은 잠금 한 자리) → 합치기 → 화면만 보는 평가 → 고침 → push · 되풀이
④ 악보 판 새 기호 · 놀이터 새 카드 다섯(2절)
⑤ 소리 재기에서 걸린 것 고침 · 마지막 처음 보는 눈 평가(docs/eyes.md)

## 5. 지키는 것
사실만(국악은 gugak_facts.md의 '안전한 문장' · 2022 교과서는 확인 못 함) · 악기 소리는 모두 컴퓨터 소리라고 적음 · 목소리 · 물체 소리 녹음은 없음(100이어도 남는 것) · 빨강·X·부정하는 말 X · 주황은 지금 누를 하나 · 잠금 X · TV에 아이 번호 X · 4학년 눈높이 쉬운 말 · 같은 꼴이면 답과 상관없이 길이가 같게(열리는 때로 답이 새지 않음)

## 6. 11-14 저녁 조정
- 안 만듦: ppa3(흐름 t2 '빠르기만 떼어 듣기'는 빠1이 이미 함 — t2 acts에 `cell:ppa1`) · hy4(f3 ab = 형1 + 형3 + play:form)
- sem3 · ppa4는 '판마다 다른 카드' 틀이 생긴 뒤 묶음으로 · t3(빠르기말) = ppa4 · t4(점점 느리게 · 점점 빠르게) = ppa2(t3에서 `cell:ppa2`를 뺌)
- 도막마다 쉼(gap)은 형2가 고르기 틀(`_pick.js`)에 넣음
- 묶음 B(아홉 칸 — bak1 sem4 ppa2 eum2 eum3 hy3 ga8 hwa2 hwa3) 설계서 = `docs/plan100_batchB.md`. 장부 · 흐름 · 차례(`ORDER_ALL`)에는 `first` 없이 미리 등록함. Opus 세 팀이 worktree `music-nori-wt-b1`(bak1 sem4 ppa2) · `music-nori-wt-b2`(eum2 eum3 hy3) · `music-nori-wt-b3`(ga8 hwa2 hwa3)에서 만드는 중
- 소리 고치기는 worktree `music-nori-wt-ear` 가지 `ear-fix`
- 그다음 차례: 틀 넓히기(판마다 카드 · 북 소리 · 음마다 art · 리듬 글리프) → 리듬 칸(ri8~ri15 · ri11) · 악보 칸(ak3~ak7) · 되풀이(ban1 · ban2) · eum1 · 장단(jd2 · hy5 — 국악 사실은 확인된 문장만) → 악보 판 기호 · 놀이터 카드(play:jang · form · rmake · dress · chord) → TV 고르기 · 지도(칸 56개쯤 · 요소마다 한 줄)

## 7. 이어받는 법(11-14 밤)
- **합치기 반장** = 본 저장소(main 체크아웃)를 고치고 commit · push하는 세션은 하나뿐. 다른 팀은 각자 worktree `/Users/dobuk/Projects/music-nori-wt-<이름>`에서 가지에 commit만 한다.
- 돌던 팀 · 가지(합치는 차례): `cell-ga5`(ga5 · 가5 5음 · 가락 틀 `_mel.js`) → `batch-b1`(b1 · bak1 sem4 ppa2) → `batch-b2`(b2 · eum2 eum3 hy3) → `batch-b3`(b3 · ga8 hwa2 hwa3) → `ear-fix`(ear · 소리 재기 + 고치기) → `frame-f4`(f4 · 고르기 틀 넓히기 + sem3 ppa4) → 묶음 C(`batch-c1` …). 합친 가지: `cell-sem2`(셈2) · `cell-hy2`(형2).
- 가지가 '준비됨' = 그 가지에 일한 commit이 있고 그 worktree의 `git status --short`가 비어 있음. 합치기 = `git merge <가지>` → 충돌은 두 쪽 칸을 다 살림(장부 줄 · `ORDER_ALL`은 난이도가 내려가지 않게 · 흐름 acts 합집합 · TV 대본 · docs/cells.md) → `node tools/flowdoc.mjs && node tools/ver.mjs && npm test` → 브라우저 시험 → commit → push → `version.json` 배포 확인.
- **묶음 C**(15칸 · 다섯 팀 · 설계서 = `docs/plan100_batchC.md` · 설계와 만들기 모두 Opus · Fable 검토 없음): worktree `music-nori-wt-c1..c5` · 가지 `batch-c1..c5`(c1 ri8 ri9 ri13 · c2 ri10 ri14 eum1 · c3 ak3 ak4 ak5 ga7 · c4 ban1 ban2 ak6 · c5 jd2 hy5). 장부 · 흐름 · ORDER_ALL은 메인이 미리 등록(first 없이). 합치는 차례 … → `ear-fix` → `frame-f4`(commit이 생기면 먼저 — 고르기 칸 전부 + sound + pitch 시험) → `batch-c2` → `c3` → `c4` → `c1` → `c5`(준비되는 대로). 확인 게임이 70초 안팎인 칸 여섯(ban1 · ban2 · ri10 · ri14 · ak5 · hy5) · 설계서 §F의 확인 못 한 사실은 칸 글에 쓰지 않음 · jd2의 std는 jd1(3~4학년 번호)을 옮긴 것이라 5~6학년 번호 확인 필요.
- 흐름 j3 · j4(굿거리 · 중중모리) 학년 글은 국악 사실 장부(11-14)에 맞춰 고침 — 굿거리 '주로 6학년(2015 교과서 8종 분석)' · 중중모리 '미래엔 5학년 기본 꼴 · 6학년 두 꼴' · 2022 교과서는 ⚠ 확인 못 함.
- 옛 손 목록 꼴로 시험을 고친 가지는 장부에서 나오는 꼴로 옮겨 합친다(docs/cells.md '새 칸을 더하는 법' — 고르기 칸 검사는 `tests/pick/<id>.mjs`).
- **브라우저 시험 자물쇠**(한 번에 하나): `while ! mkdir /private/tmp/claude-501/nori-browser.lock 2>/dev/null; do sleep 7; done; <명령>; rmdir /private/tmp/claude-501/nori-browser.lock` — 떨어져도 rmdir. 본 저장소를 계속 고쳐야 하면 `git worktree add --detach <임시 자리> <commit>`에서 시험을 돌린다.
- **사람 눈 · 귀로 확인 안 된 것**: Opus 팀이 만든 칸(셈2 · 형2 · 묶음 B · 묶음 C)은 처음 보는 눈 평가(docs/eyes.md) 전 · 악기 소리 · 세기 · 빠르기 값은 기계로만 잼(ear) · 묶음 C는 설계도 Opus가 씀 · 성취기준 표시(std)는 같은 요소의 칸 것을 옮긴 것.
- 다음 차례: 리듬 · 악보 · 되풀이 · 장단 칸 → 악보 판 기호 · 놀이터 카드(만들기) → TV 고르기 · 지도 줄 늘리기 → 처음 보는 눈 평가.

## 8. 진행 기록
(시각 · 합친 가지 · 만든 칸 수 · `node tools/bar.mjs` 내용 범위 · 5~6학년 · 요소 고르기 · 활동 깊이 · 소리 · 확인 못 한 것)
- 11-14 19:44 · 합침(push 전 · 브라우저 시험 중): cell-sem2 · cell-hy2 · 묶음 B 미리 등록 · cell-ga5 · 묶음 C 미리 등록 · frame-f4(78f3347까지) · batch-b3 · batch-b2 · batch-b1 · batch-c2 · pre-d · batch-c3 · batch-c5 · ear-fix · 만든 칸 44 · bar 내용 범위 82% · 5~6학년 70% · 요소 고르기 50% · 활동 깊이 37% · 소리(기계) 100% · 확인 못 한 것: Opus 칸은 처음 보는 눈 평가 전 · jd2 std는 장1(3~4학년) 번호를 옮긴 것(5~6학년 번호 확인 필요) · 새 칸 화면 사진은 scratchpad shots에 모두 있음 · TV 고르기는 여덟 칸 넘는 줄을 옆으로 밀어 보는 임시 꼴
- 11-14 19:50 · push 4cac74a(origin 00e4ae9 → 4cac74a · 배포 version 74124d1b03a0 확인) — 셈2 · 형2 · 가5 · 틀 넓히기 · 묶음 B 셋 · 묶음 B/C 미리 등록 · 만든 칸 32 · 브라우저: cells(고르기 칸 + 가5) · rules 전체 · sound · pitch 통과 · app은 #/tv 스크롤 하나(그 뒤 f4e6fef에서 고침 · 다음 push에 들어감)
- 11-14 20:19 · push 3476102(배포 version 3adad615cbdc 확인) · 합침: ga5 · 묶음 C 미리 등록 · frame-f4 · batch-b1 · b2 · b3(+22456d3) · c1 · c2 · c3 · c4 · c5 · ear-fix · pre-d · d3 · d4 · d5 · d7 · 만든 칸 50 · bar 내용 범위 100%(62/62) · 5~6학년 100% · 요소 고르기 100% · 활동 깊이 72%(만들기 있는 요소 10/10) · 소리(기계) 100%(204/204) · 브라우저: 고르기 칸 25 cells · rules(전체 1회 + 새 칸) · app · sound · pitch · form · jang · play 통과 · 확인 못 한 것: 사람 눈 · 귀(처음 보는 눈 평가 전) · jd2 std는 장1(3~4학년) 번호 · ga8은 둘째 음까지만 듣는 봇이 별을 받음(참고 지표) · 게임 63초 · C4 카드 안 글자 12~16px(고침 commit 대기)
- 11-14 20:23 · push 5ae4840(배포 2b34e69f2012 확인 · D1 악보 판 박자·길이 기호 · lab.browser · app 통과) · 합쳤으나 push 전(브라우저 시험 중): D6(ri11 · ak7) · C4 고침 07278b1(카드 글자 검사 — rules 전체 돌리는 중) · ⚠ batch-d2는 합치지 않고 되돌림: D1과 engine/marks.js 14곳(build 몸통 · 길이 기호 · 조/화음 · 도돌이) · lab.js 6곳 · notation.js 3곳 · marks.test · lab.browser가 겹쳐 20줄 넘는 손질이 필요 — D2 팀이 main(5ae4840 뒤)을 받아 합친 결과로 다시 올려 주길 · 만든 칸 52
- 11-14 21:12 · push 2d740c6(배포 2ea747c98dad 확인) — D6 리11 · 악7 · C4 고침(카드 글자 18px) · 만든 칸 52 · bar 내용 범위 100% · 5~6학년 100% · 요소 고르기 100% · 활동 깊이 91% · 소리(기계) 100% · 브라우저: rules 전체 1회 · cells(ri11 ak7 ban1 ban2 ak6) · app 통과 · ⚠ 알려진 실패 하나: rules 'ri8 결과: 카드 글자 text 11.3px "3"'(셋잇단 숫자 — C1 팀 고칠 것) · ⚠ batch-d2(9d60488 · 173bc8d)는 아직 D1(5ae4840)을 받지 않아 marks.js 14곳 · lab.js 6곳 · notation.js 3곳이 겹친 채 — 반장이 손으로 합치기엔 커서 보류. D2 팀이 `git merge main`으로 D1과 합친 뒤 marks.test · lab.browser를 통과시켜 다시 올려야 함 · frame-f5(6290c59)는 main에 들어옴(빨리 감기) — 칸 51 전부 cells.browser · truth 시험 중
- 11-14 21:34 · frame-f5(앞 판 기억 봇 · stageShuffle 고침) 시험 — 만든 칸 51 + 리1 cells.browser 모두 별 3 · truth · app 통과 → push
- 11-14 22:35 · push(D2 악보 판 조 · 화음 · 되풀이 · 북 + C1 리8 셋잇단 숫자 20px) · 만든 칸 52 · bar 내용 범위 100% · 5~6학년 100% · 요소 고르기 100% · 활동 깊이 97%(60/62) · 소리(기계) 100% · 브라우저 lab · app · rules ri8(화면 페이지 + 리8) 통과 · 알려진 실패(리8 11.3px) 풀림
- 11-14 22:40 · push(D8 놀이터 부탁 12 오선 보고 놓기 · 13 음이름 보고 놓기) · 만든 칸 52 · bar 내용 범위 100% · 5~6학년 100% · 요소 고르기 100% · 활동 깊이 100%(62/62 · 만들기 10/10) · 소리(기계) 100% · 브라우저 play · app 통과 · 남은 가지: frame-f5 두 번째(대기)
