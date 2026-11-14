// 요소별 공부 흐름 — 선생님이 '박자'처럼 찾으면, 그 요소를 배우는 차례대로 앱에서 쓸 것(칸 · 악보 판 · 곡 바꾸기)을 보여 준다.
//  화면 · 소리 없음(node로 시험). 선생님 '찾아 쓰기' 화면만 읽는다 — 아이 화면에는 쓰지 않고, 아무것도 잠그지 않는다.
//
//  차례의 근거와 출처는 docs/flow.md.
//   · 학년 자리 = 2015 개정 검정 교과서 8종 분석(김은주 2020)과 2022 개정 교육과정 요소 표. 2022 개정 교과서와는 대조하지 못했다.
//   · 요소 안 차례 = 여러 나라 교육과정 · 교수법 문서가 겹치는 곳(전통 — 실험으로 밝힌 차례가 아님)과 발달 연구.
//   · 근거가 없는 곳은 '학년 근거를 찾지 못함'으로 적는다. 지어내지 않는다.
//  단계(steps)의 acts = 앱에서 쓸 것. 'cell:ri5'(칸) · 'lab:dyn:cresc'(악보 판 — 묶음[:기호]) · 'play:meter'(곡 바꾸기 카드).
//   아직 만들지 않은 칸도 적어 둔다(화면에는 '아직 없어요'로 보인다).
import { cellById, LANES, PLAY_CARD } from './cells.js';
import { groupById, signById } from './marks.js';

// 근거의 종류 — 단계마다 한두 개
export const EV = {
  strong: '연구(강)',
  mid: '연구(중)',
  weak: '연구(약)',
  book: '교과서(2015 개정 8종)',
  curr: '교육과정(2022 개정)',
  method: '교수법 · 여러 나라 문서(전통)',
  logic: '앞뒤 관계',
  design: '앱 설계',
  none: '학년 근거를 찾지 못함',
};

// 한 요소를 익히는 걸음(국내 교과서 지도 흐름과 교수법 문서가 겹치는 틀 · 실험으로 밝힌 것은 아님)
export const WALK = [
  { id: 'feel', name: '몸과 귀로 겪기', where: '교실 활동(노래 · 몸 움직임 · 악기)' },
  { id: 'tell', name: '견주어 가려내기', where: '칸', kind: 'cell' },
  { id: 'name', name: '이름 붙이기', where: '칸', kind: 'cell' },
  { id: 'sign', name: '악보 기호와 잇기', where: '악보 판 — 기호를 넣었다 빼며 듣기', kind: 'lab' },
  { id: 'make', name: '바꿔 보기 · 만들기', where: '곡 바꾸기', kind: 'play' },
];

// 요소 사이의 차례 — 발달 연구가 말해 주는 것은 세 덩어리까지다(덩어리 안의 앞뒤는 정해지지 않았다)
export const CLUSTERS = [
  { id: 'early', name: '먼저 다루기 쉬운 것', els: ['dyn', 'tempo', 'timbre'], ev: 'mid',
    why: '셈여림과 빠르기의 큰 차이, 서로 다른 음색은 어린 아이도 잘 가려낸다.' },
  { id: 'middle', name: '가운데', els: ['rhythm', 'melody'], ev: 'weak',
    why: '음의 길이, 리듬꼴, 가락의 오르내림, 음높이 이름. 이 안에서 무엇이 먼저인지는 연구로 정해지지 않았다.' },
  { id: 'late', name: '뒤에 오는 것', els: ['beat', 'form', 'harmony'], ev: 'strong',
    why: '마디마다 돌아오는 센박, 큰 형식, 화음은 초등 뒤쪽까지 어렵다. 다만 일정박에 맞추는 일은 일찍부터 된다.' },
];

export const PLAY_NAME = {
  pitch: '높이 바꿔 보기', long: '길이 바꿔 보기', tempo: '빠르기 바꿔 보기', dyn: '셈여림 바꿔 보기',
  rest: '쉼표 넣어 보기', make: '가락 지어 보기', meter: '박자표 바꿔 보기', fix: '마디 고쳐 보기',
};
export const PLAY_KEYS = [...new Set(Object.values(PLAY_CARD).map(v => v[0]))];

const S = (id, name, g, gr, why, ev, acts, keys = '') => ({ id, name, g, gr, why, ev, acts, keys });
const E = (id, name, friend, keys, curr, steps, mix = []) => ({ id, name, friend, keys, curr, steps, mix });
const X = (t, src, ev) => ({ t, src, ev });

export const ELEMENTS = [
  E('beat', '박·박자', 'hog', '박 박자 박자표',
    '3~4학년 「박, 박자」 · 5~6학년 「박, 박자」',
    [
      S('b1', '일정박 — 고르게 이어지는 박', '1~3학년', [1, 3],
        '박에 몸을 맞추는 일은 일찍부터 되고, 뒤에 오는 리듬 공부가 모두 여기에 기댄다. 교과서는 3학년 첫머리에 둔다.',
        ['mid', 'book'], ['cell:ri1', 'play:tempo'], '박 맞추기 박 치기'),
      S('b2', '센박·여린박 — 둘씩 · 셋씩 묶어 듣기', '3학년', [3, 4],
        '악보에 적기 전에 둘 묶음과 셋 묶음을 몸과 귀로 겪는다. 듣고 몇 박자인지 말하기는 초등 내내 어렵다는 연구가 있어, 맞히기보다 센박을 넣었다 빼며 듣는 활동을 앞에 둔다.',
        ['method', 'strong'], ['lab:meter', 'cell:ri5'], '센박 여린박 강박 약박 묶음'),
      S('b3', '마디 · 마디줄 · 박자표(2/4 · 3/4 · 4/4)', '3학년', [3, 4],
        '여러 나라 교육과정 문서는 악보에 적는 차례를 2박부터 둔다. 우리 교과서는 3학년에 세 박자를 함께 다룬다.',
        ['method', 'book'], ['cell:ri5', 'lab:meter', 'play:meter'], '마디 마디줄 2박자 3박자 4박자 2/4 3/4 4/4 4분의 2박자 4분의 3박자 4분의 4박자'),
      S('b4', '한 마디를 박 수에 맞게 채우기', '3학년', [3, 4],
        '박자표의 뜻을 알아야 한 마디에 음표가 얼마나 들어가는지 셀 수 있다.',
        ['logic'], ['cell:ri6', 'play:fix'], '마디 채우기'),
      S('b5', '6/8박자', '4학년(교과서 8종 가운데 6종)', [4, 6],
        '한 박을 셋으로 나누는 느낌은 3학년 자진모리장단에서 먼저 겪는다. 교육과정은 박자의 종류를 학년별로 정해 두지 않았다.',
        ['book'], ['cell:ri9'], '8분의 6박자'),
      S('b6', '못갖춘마디', '노래 악보에 나올 때', [3, 6],
        '학년을 정한 근거를 찾지 못했다. 마디와 박자표를 안 뒤, 못갖춘마디로 시작하는 노래를 만날 때 다룬다.',
        ['none', 'logic'], ['cell:ri10']),
      S('b7', '변박자', '5~6학년', [5, 6],
        '한 곡 안에서 박자가 바뀌는 것은 박자표를 읽을 수 있게 된 뒤에 다룬다.',
        ['book'], [], '박자 바뀜'),
    ],
    [
      X('박을 셀 줄 알면 박자도 안다고 보기 쉽다. 박은 느껴도 마디마다 돌아오는 센박은 5~8세에 잘 드러나지 않았고, 9~12세도 박자를 가려내기 어려워했다.', 'Nave-Blodgett 외(2021) · Jones(1976)', 'strong'),
      X('셋 묶음을 둘 묶음처럼 받아들일 수 있다(다른 나이의 자료에서 미루어 본 것).', 'Bergeson & Trehub(2006) · Drake(1993)', 'weak'),
      X('박자와 빠르기를 섞는다. 그래서 같은 빠르기에서 묶음만 바꿔 들려준다.', '앱 설계(마디·박자표 칸)', 'design'),
    ]),

  E('rhythm', '리듬·음의 길이', 'hog', '리듬 리듬꼴 음의 길이 길고 짧음 음표',
    '3~4학년 「음의 길고 짧음 · 간단한 리듬꼴」 · 5~6학년 「여러 가지 리듬꼴」',
    [
      S('r1', '길게·짧게', '1~2학년', [1, 2],
        '음의 길이는 셈여림 · 빠르기보다 가려 말하기 어렵다는 연구가 있어, 긴 소리와 짧은 소리의 큰 차이부터 듣는다.',
        ['mid', 'curr'], ['cell:so3', 'play:long'], '긴 소리 짧은 소리'),
      S('r2', '4분음표 · 4분쉼표', '3학년(교과서)', [1, 3],
        '한 박짜리 음표와 한 박 쉼표부터 읽는다. 일정박에 맞출 수 있어야 한다.',
        ['book', 'logic'], ['cell:ri2', 'lab:len:rest', 'play:rest']),
      S('r3', '8분음표 둘', '3학년(교과서)', [1, 3],
        '한 박을 둘로 나눈다. 4분음표와 견주어 듣는다.',
        ['book', 'logic'], ['cell:ri3']),
      S('r4', '2분음표', '3학년(교과서)', [2, 3],
        '두 박 동안 이어지는 소리. 길게 · 짧게를 가려 들을 수 있어야 한다.',
        ['book', 'logic'], ['cell:ri4', 'play:long']),
      S('r5', '간단한 리듬꼴 — 한 마디 채우기', '3~4학년', [3, 4],
        '배운 음표를 한 마디 안에서 섞어 쓴다. 교육과정 3~4학년 요소가 「간단한 리듬꼴」이다.',
        ['curr', 'logic'], ['cell:ri6', 'play:fix']),
      S('r6', '점음표', '3~4학년(교과서 · 점4분음표와 점2분음표)', [3, 4],
        '음표에 그 반을 더한 길이. 앞의 음표들을 읽을 수 있어야 한다.',
        ['book'], ['cell:ri9'], '점4분음표 점2분음표'),
      S('r7', '붙임줄', '4학년(교과서 1종) · 5학년(4종)', [4, 5],
        '같은 높이의 두 음을 이어 한 음처럼 길게 낸다. 악보 판에서 넣었다 빼면 끊어 내던 두 음이 하나로 이어진다.',
        ['book'], ['lab:len:tie', 'cell:ri8']),
      S('r8', '당김음', '5학년(교과서)', [5, 6],
        '여린박 자리가 세게 들리는 리듬. 붙임줄과 점음표를 안 뒤에 다룬다.',
        ['book', 'logic'], ['cell:ri9']),
      S('r9', '16분음표 · 셋잇단음표', '셋잇단음표 5~6학년(교과서 1종씩) · 16분음표는 학년 근거를 찾지 못함', [4, 6],
        '한 박을 넷으로, 셋으로 나눈다.',
        ['book', 'none'], ['cell:ri8']),
      S('r10', '스타카토 · 늘임표', '스타카토 5~6학년(교과서 1종씩) · 늘임표 4~6학년(출판사마다 다름)', [4, 6],
        '적힌 길이보다 짧게 끊거나 더 늘인다. 악보 판에서 넣었다 빼며 견준다.',
        ['book'], ['lab:len:stacc', 'lab:len:fermata']),
    ],
    [
      X('음이 잘게 많은 것과 빠른 것이 섞일 수 있다. 3 · 5 · 6학년의 빠르기 판단이 가락의 움직임에 흔들렸다(어느 쪽으로 흔들렸는지는 원문에서 확인하지 못했다).', 'Kuhn & Booth(1988)', 'mid'),
      X('두 가지가 함께 바뀌면 한쪽만 답한다(유아 자료). 그래서 한 가지만 바뀌는 짝을 먼저 듣는다.', 'Sims(1991, 1995)', 'strong'),
    ]),

  E('jangdan', '장단', 'hog', '장단 국악 장단꼴 말붙임새 한배 장구',
    '3~4학년 · 5~6학년 「장단, 장단의 세 · 장단꼴 · 말붙임새」',
    [
      S('j1', '자진모리장단', '3학년(교과서)', [3, 4],
        '덩 · 쿵 · 덕 장구 소리로 듣고 장단보에 적는다. 한 박을 셋으로 나누는 느낌을 여기서 처음 겪는다.',
        ['book'], ['cell:jd1'], '덩 쿵 덕 장단보'),
      S('j2', '세마치장단', '4학년(교과서)', [3, 4],
        '세 박이 한 장단. 자진모리장단과 견주어 듣는다.',
        ['book'], ['cell:jd1'], '덩 쿵 덕 장단보'),
      S('j3', '굿거리장단', '5학년(교과서)', [5, 6],
        '교과서 8종이 5학년에 둔다.',
        ['book'], []),
      S('j4', '중중모리장단', '6학년(교과서)', [6, 6],
        '교과서 8종이 6학년에 둔다.',
        ['book'], []),
    ]),

  E('melody', '가락·음높이', 'bird', '가락 음높이 높낮이 계이름 음계',
    '3~4학년 「음의 높고 낮음 · 차례가기와 뛰어가기 · 시김새」 · 5~6학년 「음이름, 계이름, 율명 · 장음계, 단음계 · 여러 지역의 토리 · 시김새」',
    [
      S('m1', '높게·낮게', '1~3학년', [1, 3],
        '음의 높낮이는 가려 말하기가 가장 어려운 쪽이라는 연구가 있다. 차이가 큰 두 소리부터 듣는다.',
        ['mid', 'curr'], ['cell:so4', 'play:pitch'], '높은 소리 낮은 소리 음의 높고 낮음'),
      S('m2', '높이만 떼어 듣기', '1~3학년', [1, 3],
        '크기나 길이가 함께 바뀌면 높이를 놓친다. 높이 하나만 바뀌는 짝을 듣는다.',
        ['strong', 'design'], ['cell:so5']),
      S('m3', '솔·미, 그다음 라', '1~3학년', [1, 3],
        '교과서는 세 음에서 다섯 음, 일곱 음으로 넓힌다. 솔 · 미로 시작하는 것은 코다이 교수법의 차례이고, 모든 아이에게 맞는 차례라는 뜻은 아니다.',
        ['book', 'method'], ['cell:ga1', 'cell:ga2', 'play:pitch'], '계이름 세 음'),
      S('m4', '도 — 건너뛰는 가락', '1~3학년', [1, 3],
        '솔 · 미 · 라에 도를 더하면 건너뛰는 가락이 생긴다.',
        ['method', 'logic'], ['cell:ga3', 'play:make'], '뛰어가기'),
      S('m5', '레 — 차례가기와 뛰어가기', '3학년', [2, 4],
        '교육과정 3~4학년 요소가 「차례가기와 뛰어가기」다. 레가 들어오면 도 · 레 · 미가 차례로 이어진다.',
        ['curr', 'book'], ['cell:ga4', 'play:pitch']),
      S('m6', '다섯 음(도 · 레 · 미 · 솔 · 라)', '3~4학년', [2, 4],
        '다섯 음으로 된 노래를 읽고 부른다. 낮은 라 · 솔과 높은 도까지 넓힌다.',
        ['book'], ['cell:ga5', 'cell:ga6'], '5음'),
      S('m7', '일곱 음 — 장음계', '5~6학년(교육과정 「장음계, 단음계」)', [5, 6],
        '파와 시가 들어오면 일곱 음이 다 모인다.',
        ['curr', 'book'], ['cell:ga7'], '7음 파 시 단음계'),
      S('m8', '음이름 · 계이름을 오선에서 읽기', '5학년(교과서)', [5, 6],
        '교육과정 5~6학년 요소가 「음이름, 계이름, 율명」이다. 3~4학년에는 계이름을 몸과 손기호로 익힌다.',
        ['book', 'curr'], ['cell:ak4'], '율명 다라마바사가나'),
      S('m9', '조 — 다장조에서 바장조 · 가단조, 사장조 · 라단조로', '5~6학년(교과서)', [5, 6],
        '교과서는 5학년에 다장조 · 바장조 · 가단조, 6학년에 사장조 · 라단조를 둔다.',
        ['book'], ['cell:ga8', 'cell:ak5'], '조 바꾸기 조옮김 장조 단조'),
    ],
    [
      X('조를 옮긴 같은 가락을 다른 가락으로 듣기 쉽다.', 'Stalinski & Schellenberg(2010)', 'mid'),
      X('큰 소리를 높은 소리로 섞어 말한다. 그래서 한 가지만 바뀌는 짝으로 떼어 듣는다.', '앱 설계(한 가지만 바뀌는 짝 칸)', 'design'),
    ]),

  E('dyn', '셈여림', 'bear', '셈여림 세기 셈여림표',
    '3~4학년 「셈여림」 · 5~6학년 「셈여림의 변화」',
    [
      S('d1', '크게·작게 — 큰 차이 듣기', '1~3학년', [1, 3],
        '셈여림의 큰 차이는 어린 아이도 잘 가려낸다는 연구가 있다. 가장 먼저 다루기 좋은 요소다.',
        ['mid', 'curr'], ['cell:sem1', 'play:dyn', 'cell:so1'], '큰 소리 작은 소리'),
      S('d2', '여리게 p · 세게 f', '3학년(교과서)', [3, 4],
        '귀로 가려낸 뒤에 이름과 기호를 붙인다. 악보 판에서 p와 f를 넣었다 빼며 듣는다.',
        ['book', 'method'], ['lab:dyn:p', 'lab:dyn:f', 'cell:sem1'], '피아노 포르테'),
      S('d3', '조금 여리게 mp · 조금 세게 mf', '3학년(교과서)', [3, 4],
        '교과서 8종은 3학년에 p · mp · mf · f를 함께 낸다. 나라 밖 문서들은 가운데 세기를 더 뒤에 두기도 해서, 앞뒤를 굳게 정할 까닭은 없다.',
        ['book', 'method'], ['lab:dyn:mp', 'lab:dyn:mf', 'cell:sem2'], '메조 피아노 메조 포르테'),
      S('d4', '점점 세게 · 점점 여리게', '4학년(교과서 2종) · 5학년(6종)', [4, 6],
        '뚜렷한 대비를 먼저, 점점 바뀌는 것은 나중에 둔다. 교육과정도 3~4학년 「셈여림」, 5~6학년 「셈여림의 변화」 차례다.',
        ['curr', 'book'], ['lab:dyn:cresc', 'lab:dyn:decresc', 'cell:sem2'], '크레셴도 데크레셴도 셈여림의 변화'),
      S('d5', '매우 여리게 pp · 매우 세게 ff', '4학년(교과서 1종) · 5학년(2종)', [4, 6],
        '점점 세게와 어느 쪽이 먼저인지는 문서마다 엇갈린다. 순서를 바꿔 써도 된다.',
        ['book', 'method'], ['lab:dyn:pp', 'lab:dyn:ff'], '피아니시모 포르티시모'),
      S('d6', '악센트', '학년 근거를 찾지 못함', [3, 6],
        '한 음만 세게. 셈여림표를 안 뒤에 다룬다.',
        ['none', 'method'], ['lab:dyn:accent']),
    ],
    [
      X('느리게와 여리게, 세게와 빠르게를 한데 묶는다(5~9세 연주 자료 · 6세와 11세 듣기 자료).', 'Flowers 외(1997) · Eitan & Tubul(2010)', 'mid'),
      X('센박(박자에서 오는 세기)과 셈여림표의 세기를 섞는다.', '앱 설계(여리게·세게 칸)', 'design'),
      X('기기의 소리 크기와 셈여림을 섞는다. 그래서 같은 기기에서 두 소리를 이어 들려주어 견준다.', '앱 설계', 'design'),
    ]),

  E('tempo', '빠르기', 'bear', '빠르기 빠르기말 한배',
    '3~4학년 「빠르기/한배」 · 5~6학년 「빠르기의 변화/한배의 변화」',
    [
      S('t1', '빠르게·느리게 — 큰 차이 듣기', '1~3학년', [1, 3],
        '빠르기의 큰 차이는 어린 아이도 잘 가려낸다는 연구가 있다. 교과서는 3학년에 「빠르게 · 느리게」를 둔다.',
        ['mid', 'book'], ['cell:ppa1', 'play:tempo', 'lab:tempo:slow', 'lab:tempo:fast', 'cell:so2'], '빠른 느린'),
      S('t2', '빠르기만 떼어 듣기', '3~4학년', [3, 4],
        '빠르기는 셈여림이나 음이 잘게 많은 것과 섞이기 쉽다. 같은 가락에서 빠르기만 바꿔 듣는다.',
        ['mid', 'design'], ['cell:so5', 'lab:tempo', 'play:tempo']),
      S('t3', '빠르기말(우리말)', '4학년 두세 개 · 5학년 다섯~일곱 개(교과서)', [4, 6],
        '느리게와 빠르게 사이의 말을 늘려 간다. 원어 빠르기말을 몇 학년에 내는지는 확인하지 못했다.',
        ['book'], ['lab:tempo:slowish', 'lab:tempo:mid', 'lab:tempo:fastish', 'cell:ppa2'], '보통 빠르게 조금 느리게 조금 빠르게'),
      S('t4', '점점 느리게 · 점점 빠르게', '5학년(교과서) · rit.와 a tempo는 6학년', [5, 6],
        '교육과정 5~6학년 요소가 「빠르기의 변화」다. 뚜렷한 대비를 먼저, 점점 바뀌는 것은 나중에 둔다.',
        ['curr', 'book'], ['lab:tempo:rit', 'lab:tempo:accel', 'cell:ppa2'], '리타르단도 아첼레란도 빠르기의 변화 rit accel'),
      S('t5', '늘임표', '4~6학년(출판사마다 다름)', [4, 6],
        '한 음을 적힌 길이보다 늘인다.',
        ['book'], ['lab:len:fermata'], '페르마타'),
    ],
    [
      X('느리게와 여리게, 세게와 빠르게를 한데 묶는다(5~9세 연주 자료).', 'Flowers 외(1997)', 'mid'),
      X('음이 잘게 많은 것과 빠른 것이 섞일 수 있다. 3 · 5 · 6학년의 빠르기 판단이 가락의 움직임에 흔들렸다(어느 쪽으로 흔들렸는지는 원문에서 확인하지 못했다).', 'Kuhn & Booth(1988)', 'mid'),
    ]),

  E('timbre', '음색', 'bunny', '음색 악기 소리',
    '3~4학년 「목소리, 물체 소리, 타악기의 음색」 · 5~6학년 「관악기, 현악기의 음색」',
    [
      S('e1', '무슨 소리일까 — 서로 다른 소리 듣기', '1~2학년', [1, 2],
        '소리가 서로 다르다는 것은 일찍부터 듣는다는 연구가 있다. 악기 이름을 대는 것은 그 뒤다.',
        ['mid'], ['cell:so6']),
      S('e2', '목소리 · 물체 소리 · 타악기', '3~4학년(교육과정)', [3, 4],
        '교육과정 3~4학년 요소 그대로다.',
        ['curr', 'book'], ['cell:eum1']),
      S('e3', '같은 가락, 다른 악기', '3~6학년', [3, 6],
        '악보는 그대로 두고 악기만 바꿔 듣는다. 앱의 악기 소리는 만든 소리라 진짜 악기와 다르다.',
        ['design'], ['lab:inst'], '피아노 리코더 실로폰 바이올린 트럼펫 악기 바꾸기'),
      S('e4', '관악기 · 현악기', '5~6학년(교육과정) · 4학년 교과서에 관악기 맛보기', [4, 6],
        '교육과정 5~6학년 요소 그대로다. 교과서는 5학년에 목관 · 금관 · 현악기를 가른다.',
        ['curr', 'book'], ['cell:eum2'], '목관 금관'),
    ],
    [
      X('음악 요소를 물으면 악기 이름이나 음악 밖 이야기로 답한다.', 'Flowers(1984, 2000) · Elkoshi(2015) · Reybrouck 외(2009)', 'strong'),
    ]),

  E('form', '형식·되풀이', 'turtle', '형식 되풀이 반복',
    '3~4학년 「형식(메기고 받는 형식, ab 등)」 · 5~6학년 「형식(긴자진 형식, 시조 형식, aba, AB 등)」',
    [
      S('f1', '같은 가락 · 다른 가락', '3학년(교과서)', [3, 4],
        '형식 공부는 두 도막이 같은지 다른지 듣는 데서 시작한다.',
        ['book', 'method'], [], '비슷한 가락'),
      S('f2', '메기고 받기', '3학년(교과서)', [3, 4],
        '교육과정 3~4학년 요소가 「메기고 받는 형식」이다.',
        ['curr', 'book'], ['cell:hy1'], '메기고 받는 형식'),
      S('f3', 'ab', '3~4학년(교육과정)', [3, 4],
        '같은 도막과 다른 도막에 글자를 붙인다.',
        ['curr', 'book'], [], '두 도막 형식'),
      S('f4', '도돌이표', '노래 악보에 나올 때', [3, 6],
        '학년을 정한 근거를 찾지 못했다. 마디를 알아야 어디로 돌아가는지 보인다. 악보 판에서 넣었다 빼면 같은 마디를 한 번 더 연주한다.',
        ['none', 'logic'], ['lab:repeat:repeat', 'cell:ban1'], '되돌아가기'),
      S('f5', '1 · 2번 괄호', '노래 악보에 나올 때', [3, 6],
        '학년을 정한 근거를 찾지 못했다. 도돌이표를 안 뒤에 다룬다.',
        ['none', 'method'], ['cell:ban1'], '1번 괄호 2번 괄호'),
      S('f6', 'aba · AB', '5~6학년(교육과정)', [5, 6],
        '교육과정 5~6학년 요소다. 큰 형식에 이름을 붙이는 일은 초등 뒤쪽에 둔다.',
        ['curr', 'book'], ['cell:hy2'], '세 도막 형식'),
      S('f7', '긴자진 형식 · 시조 형식', '5~6학년(교육과정)', [5, 6],
        '교육과정 5~6학년 요소다. 교과서는 긴자진 형식을 5학년, 시조 형식을 6학년에 둔다.',
        ['curr', 'book'], []),
      S('f8', 'D.C. · Fine · D.S. · 코다', '노래 악보에 나올 때', [4, 6],
        '학년을 정한 근거를 찾지 못했다. 나라 밖 문서들은 도돌이표, 1 · 2번 괄호, D.C. al Fine, D.S. 차례로 둔다(코다의 자리는 미루어 본 것).',
        ['none', 'method'], ['cell:ban2'], '다 카포 달 세뇨 피네'),
    ],
    [
      X('악구에 맞춰 움직이게 하면, 악구의 짜임보다 곡의 분위기(양식)에 맞춰 움직였다(유아 · 초등 저학년 · 예비 교사 자료).', 'Sims(1988)', 'mid'),
    ]),

  E('harmony', '화음·어울림', 'turtle', '화음 어울림',
    '3~4학년 「소리의 어울림」 · 5~6학년 「주요 3화음 · 다양한 소리의 어울림」',
    [
      S('h1', '소리의 어울림 — 돌림노래 · 2중주', '3~4학년(교육과정 · 교과서)', [3, 4],
        '화음 이름 없이, 여러 소리가 함께 울리는 것을 먼저 겪는다.',
        ['curr', 'book'], [], '돌림노래 2중주 합창'),
      S('h2', '다장조 주요 3화음', '5학년(교과서)', [5, 6],
        '가락만 듣고 어울리는 화음을 느끼는 것은 아홉 살쯤부터라는 연구가 있어, 화음은 뒤에 둔다.',
        ['book', 'strong'], ['cell:hwa1'], '3화음 으뜸화음 딸림화음 버금딸림화음'),
      S('h3', '바장조 · 사장조 주요 3화음', '6학년(교과서)', [6, 6],
        '교과서 8종이 6학년에 둔다.',
        ['book'], [], '3화음'),
    ],
    [
      X('가락이 얹히면 화음이 바뀐 것을 못 듣는다(5세 자료).', 'Costa-Giomi(1994)', 'mid'),
      X('「틀린 음」을 조 밖의 음으로만 안다. 5세는 조 밖 음만, 7세부터 화음 밖 음도 알아챘다.', 'Trainor & Trehub(1994) · Corrigall & Trainor(2014)', 'strong'),
      X('여러 소리가 함께 나면 가장 높은 소리나 가장 튀는 소리 하나만 듣는다.', 'Gudmundsdottir(1999)', 'mid'),
    ]),

  E('score', '악보 읽기', 'turtle', '악보 기보 오선',
    '3~4학년 「간단한 악보」 · 5~6학년 「기초적인 기보」(창작 영역의 지식 · 이해)',
    [
      S('s1', '그림 악보', '1~2학년', [1, 2],
        '소리를 먼저 겪고, 그림으로 적어 본 뒤에 약속된 기호로 간다.',
        ['method'], ['cell:ak1', 'play:long'], '그림으로 적기'),
      S('s2', '오선의 줄과 칸', '3학년', [3, 4],
        '높낮이를 줄과 칸의 자리로 읽는다.',
        ['method', 'logic'], ['cell:ak2', 'play:pitch'], '오선보'),
      S('s3', '높은음자리표 · 가온 도 · 덧줄', '3~4학년', [3, 4],
        '줄과 칸을 읽을 수 있어야 음자리표가 정하는 자리가 보인다.',
        ['method', 'logic'], ['cell:ak3'], '음자리표'),
      S('s4', '악보 기호를 넣었다 빼며 듣기', '3~6학년', [3, 6],
        '기호를 넣기 전과 넣은 뒤를 이어 들어서, 기호 하나가 소리를 어떻게 바꾸는지 귀로 확인한다.',
        ['method', 'design'], ['lab:dyn', 'lab:tempo', 'lab:len', 'lab:repeat', 'lab:meter', 'lab:inst'], '악보 기호 기호'),
      S('s5', '음이름(다라마바사가나)', '5학년(교과서)', [5, 6],
        '교육과정 5~6학년 요소가 「음이름, 계이름, 율명」이다.',
        ['book', 'curr'], ['cell:ak4']),
      S('s6', '조표 · 임시표', '5~6학년(교과서)', [5, 6],
        '조를 다루는 5~6학년에 함께 나온다.',
        ['book'], ['cell:ak5'], '올림표 내림표'),
    ]),
];

export const elementById = id => ELEMENTS.find(e => e.id === id) || null;
export function stepById(id) {
  for (const el of ELEMENTS) { const step = el.steps.find(s => s.id === id); if (step) return { el, step }; }
  return null;
}

// 'cell:ri5' → 화면에 쓸 이름 · 여는 주소 · TV 주소 · 만들었는지
export function actInfo(act) {
  const [kind, a, b] = String(act).split(':');
  if (kind === 'cell') {
    const c = cellById(a);
    if (!c) return null;
    const built = !!c.first;
    return { act, kind, kindName: '칸', ref: a, sign: null, label: c.name, friend: LANES[c.lane].friend, built,
      href: built ? '#/' + (c.route || 'cell/' + a) : null,
      tv: built ? (c.route === 'tap' ? '#/tvtap' : '#/tvcell/' + a) : null,
      std: c.std || null };
  }
  if (kind === 'lab') {
    const g = groupById(a), s = b ? signById(b) : null;
    if (!g || (b && (!s || s.group !== a))) return null;
    const label = !s ? g.name : s.kind === 'letter' ? `${s.name} ${s.sym}` : s.name;
    return { act, kind, kindName: '악보 판', ref: a, sign: b || null, label, friend: g.friend, built: true,
      href: '#/lab/' + a + (b ? '/' + b : ''), tv: null, std: null };
  }
  if (kind === 'play') {
    if (!PLAY_NAME[a] || !PLAY_KEYS.includes(a)) return null;
    return { act, kind, kindName: '곡 바꾸기', ref: a, sign: null, label: PLAY_NAME[a], friend: 'bear', built: true,
      href: '#/play/' + a, tv: null, std: null };
  }
  return null;
}

// ── 찾기 ──────────────────────────────────────────────────────────────────
const lower = s => String(s).toLowerCase();
const squash = s => lower(s).replace(/\s+/g, '');
const tokens = s => lower(s).split(/[\s·,()「」—→]+/).filter(Boolean);
function bag(...parts) {                                   // 찾을 글 한 덩이: 붙여 쓴 글 + 낱말 목록
  const text = parts.filter(Boolean).join(' ');
  return { flat: squash(text), words: new Set(tokens(text)) };
}
// 짧은 알파벳 낱말(p · f · mp · ab)은 낱말째 같아야 찾은 것 — 'p'가 'mp'에 걸리지 않게
const hit = (b, w) => (/^[a-z0-9]{1,2}$/.test(w) ? b.words.has(w) : b.flat.includes(w));

function actWords(act) {
  const i = actInfo(act);
  if (!i) return '';
  if (i.kind === 'cell') return [i.label, ...(i.std || []).map(x => x[0])].join(' ');
  if (i.kind === 'lab' && !i.sign) return '';            // 묶음째 여는 악보 판은 요소 이름과 같은 말이라 찾는 글에 넣지 않는다
  return i.label;
}
const elBag = new Map(ELEMENTS.map(el => [el.id, bag(el.name, el.keys)]));
const stepBag = new Map(ELEMENTS.flatMap(el => el.steps.map(s => [s.id, bag(s.name, s.keys, ...s.acts.map(actWords))])));

// '4학년 박자' → { words: ['박자'], grade: [4, 4] }
export function parseQuery(q) {
  const words = []; let grade = null;
  for (const raw of String(q || '').trim().split(/\s+/).filter(Boolean)) {
    const one = raw.match(/^([1-6])학년$/), two = raw.match(/^([1-6])[~∼\-]([1-6])학년$/);
    if (one) grade = [+one[1], +one[1]];
    else if (two) grade = [Math.min(+two[1], +two[2]), Math.max(+two[1], +two[2])];
    else words.push(squash(raw));
  }
  return { words, grade };
}

// 찾은 요소마다 공부 흐름을 통째로 돌려준다(찾은 단계는 hit) — 앞뒤 단계가 함께 보여야 골라 쓸 수 있다.
//  level: 'all'(찾는 말 없음) · 'element'(요소 이름으로 찾음 — 흐름 전체) · 'step'(단계에서 찾음)
//  학년을 적으면 그 학년에 걸치는 단계만 남긴다.
export function search(q) {
  const { words, grade } = parseQuery(q);
  const inGrade = s => !grade || (s.gr[0] <= grade[1] && s.gr[1] >= grade[0]);
  const out = [];
  for (const el of ELEMENTS) {
    const eb = elBag.get(el.id);
    const steps = el.steps.filter(inGrade);
    if (!steps.length) continue;
    if (!words.length) { out.push({ el, level: 'all', steps: steps.map(step => ({ step, hit: false })) }); continue; }
    if (words.every(w => hit(eb, w))) { out.push({ el, level: 'element', steps: steps.map(step => ({ step, hit: false })) }); continue; }
    const marked = steps.map(step => {
      const sb = stepBag.get(step.id);
      const here = words.filter(w => hit(sb, w)).length;
      return { step, hit: here > 0 && words.every(w => hit(sb, w) || hit(eb, w)) };
    });
    if (marked.some(m => m.hit)) out.push({ el, level: 'step', steps: marked });
  }
  const rank = { element: 0, all: 0, step: 1 };
  return out.map((r, i) => [r, i]).sort((a, b) => rank[a[0].level] - rank[b[0].level] || a[1] - b[1]).map(x => x[0]);
}

export const SAMPLES = ['박자', '점점 세게', '쉼표', '도돌이표', '4학년 리듬', '장단'];
