// 앱 곡 21개 — 가락만(노랫말 없음). 권리 근거는 같은 폴더 ledger.js(곡 권리 대장) · 규칙은 docs/rights.md.
//  옛 곡은 판본 대조가 끝난 것(대장 edition.checked:true)만 둔다 — 대조 전 9곡은 11-08에 가락째 내림(대장 줄만 남김 ·
//  대조 뒤 git에서 되살림 · '애매하면 상담 없이 뺀다' 교사 결정). tests/songs.test.mjs가 막는다.
//  적는 법은 engine/song.js 맨 위 주석. 모두 다장조(key 0)로 옮겨 적었다(원조는 대장 note에).
//  cells = 이 곡을 쓰는 칸(계획서 칸 이름). 높낮이 칸(소·가)에 쓰는 곡은 C4~E5 안.
//  곡을 더할 때: 대장 줄 먼저 → 여기 → node tests/songs.test.mjs (docs/rights.md '곡 하나 더하는 차례')

export const SONGS = [
  // ── 자작 12곡: 계획서 칸 표의 뼈대(쓰는 음·마디 수·리듬) 안에서 새로 지음 · 교사 확인 전 ──
  // 가1 = 솔·미(G4·E4)만 · 4분음표·2분음표(+쉼표)
  { id: 'ga1-insa', title: '솔미 인사', meter: [4, 4], tempo: 100, key: 0, cells: ['가1', '악1'],
    mel: 'G4h E4h | G4q G4q E4h | E4q G4q E4q G4q | E4h Rh',
    use: '솔·미 두 음 처음 듣기 — 높은 솔·낮은 미를 손 높이로 따라 하기' },
  { id: 'ga1-dol', title: '솔미 징검돌', meter: [2, 4], tempo: 100, key: 0, cells: ['가1'],
    mel: 'E4q E4q | G4h | E4q G4q | E4h',
    use: '메아리 언덕 — 들린 순서대로 두 돌 놓기(짧은 2/4 네 마디)' },
  { id: 'ga1-swim', title: '쉬었다 가는 솔미', meter: [4, 4], tempo: 100, key: 0, cells: ['가1', '악1'],
    mel: 'G4q Rq G4q Rq | E4q E4q G4h | G4q E4q Rq E4q | G4h Rh',
    use: '솔·미 사이에 쉼이 끼어도 높낮이를 따라가기' },
  // 가2 = 솔·미·라(G4·E4·A4) · 라가 꼭 나옴
  { id: 'ga2-ra', title: '라가 왔어요', meter: [4, 4], tempo: 100, key: 0, cells: ['가2', '악1', '악2'],
    mel: 'G4q A4q G4h | E4h G4h | A4q A4q G4q E4q | G4h Rh',
    use: '새로 온 음(라)이 나온 자리 찾기' },
  { id: 'ga2-stair', title: '솔미라 계단', meter: [4, 4], tempo: 100, key: 0, cells: ['가2'],
    mel: 'E4q G4q A4h | G4q E4q G4h | A4q G4q E4q G4q | E4h Rh',
    use: '미 → 솔 → 라로 올라가는 계단 — 셋째 음 찾기' },
  { id: 'ga2-slide', title: '라솔미 미끄럼', meter: [2, 4], tempo: 100, key: 0, cells: ['가2'],
    mel: 'A4q G4q | E4h | G4q A4q | G4h',
    use: '라에서 미로 미끄러져 내려오기(짧은 2/4 네 마디)' },
  // 가3 = 도·미·솔·라(C4·E4·G4·A4) · 도가 꼭 나옴(뛰어가는 가락)
  { id: 'ga3-jump', title: '도에서 뛰어올라', meter: [4, 4], tempo: 100, key: 0, cells: ['가3'],
    mel: 'C4q E4q G4h | A4q G4q E4h | C4q E4q G4q A4q | G4h C4h',
    use: '뛰는 가락(도-미-솔) 그림 고르기' },
  { id: 'ga3-home', title: '솔에서 도까지', meter: [4, 4], tempo: 100, key: 0, cells: ['가3', '악1'],
    mel: 'G4h E4q C4q | E4q G4q A4h | G4q A4q E4q G4q | C4h Rh',
    use: '솔-미-도로 뛰어 내려와 도에서 마치는 느낌' },
  // 리2 = 4분음표·4분쉼표만 · 한 음 높이
  { id: 'ri2-ttasum', title: '따 따 쉼', meter: [4, 4], tempo: 104, key: 0, cells: ['리2'],
    mel: 'G4q G4q G4q Rq | G4q Rq G4q Rq | G4q G4q Rq G4q | G4q G4q G4q Rq',
    use: '따라 치기 — 소리(따)와 쉼(쉼)을 박 위에 두드리기' },
  // 리4 = 2분음표 섞임 · 한 음 높이
  { id: 'ri4-balloon', title: '길게 부는 풍선', meter: [4, 4], tempo: 100, key: 0, cells: ['리4'],
    mel: 'G4q G4q G4h | G4h G4h | G4q Rq G4h | G4h Rh',
    use: '풍선 불기 — 2분음표는 두 박 동안 누르고 있기' },
  // 리5 박자 비교 짝 = 같은 음(도·미·솔) · 같은 빠르기 · 묶음만 다름
  { id: 'ri5-march', title: '두 박 행진', meter: [2, 4], tempo: 108, key: 0, cells: ['리5'],
    mel: 'C4q G4q | E4q G4q | C4q G4q | C4h',
    use: '행진일까 왈츠일까 — 둘씩 묶음(쿵 짝) · 「세 박 왈츠」와 짝' },
  { id: 'ri5-waltz', title: '세 박 왈츠', meter: [3, 4], tempo: 108, key: 0, cells: ['리5'],
    mel: 'C4q G4q G4q | E4q G4q G4q | C4q G4q G4q | C4h.',
    use: '행진일까 왈츠일까 — 셋씩 묶음(쿵 짝 짝) · 「두 박 행진」과 짝' },

  // ── 외국 전래 7곡(가락만 · 노랫말 X · 판본 대조 끝) ──
  { id: 'ahvous', title: '작은 별 가락(프랑스 민요 「Ah! vous dirai-je, maman」)', meter: [2, 4], tempo: 100, key: 0,
    cells: ['형3', '반2'],
    mel: 'C4q C4q | G4q G4q | A4q A4q | G4h | F4q F4q | E4q E4q | D4q D4q | C4h | G4q G4q | F4q F4q | E4q E4q | E4q D4q | G4q G4q | F4q F4q | E4q E4q | E4q D4q | C4q C4q | G4q G4q | A4q A4q | G4h | F4q F4q | E4q E4q | D4q D4q | C4h',
    use: 'aba 꼴 — 앞 도막이 끝에 돌아온다 · D.C. al Fine로 줄여 적기 알맞음' },
  { id: 'auclair', title: 'Au clair de la lune 앞 도막(프랑스 민요)', meter: [4, 4], tempo: 96, key: 0,
    cells: ['건1', '리6', '가4'],
    mel: 'C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4h. Rq',
    use: '건반 도-레-미 세 음만으로 된 앞 도막 · 넷째 마디 점2분음표로 마디 채우기 · 가4 보기: 거의 차례가기 · 도→미 한 번 뛰어가기' },
  { id: 'frere', title: 'Frère Jacques(프랑스 돌림노래)', meter: [2, 4], tempo: 100, key: 0,
    cells: ['반1'],
    mel: 'C4q D4q | E4q C4q | C4q D4q | E4q C4q | E4q F4q | G4h | E4q F4q | G4h | G4e A4e G4e F4e | E4q C4q | G4e A4e G4e F4e | E4q C4q | C4q G3q | C4q Rq | C4q G3q | C4q Rq',
    use: '두 마디씩 똑같이 되풀이 → 도돌이표로 줄여 적기' },
  { id: 'london', title: 'London Bridge(영미 동요)', meter: [2, 4], tempo: 104, key: 0,
    cells: ['리8'],
    mel: 'G4e. A4s G4e F4e | E4e F4e G4q | D4e E4e F4q | E4e F4e G4q | G4e. A4s G4e F4e | E4e F4e G4q | D4q G4q | E4e C4q.',
    use: '점8분+16분 리듬(따안-따)이 첫머리마다' },
  { id: 'summ', title: 'Summ, summ, summ(보헤미아 민요)', meter: [2, 4], tempo: 100, key: 0,
    cells: ['건2', '리3'],
    mel: 'G4q F4q | E4q Rq | D4e E4e F4e D4e | C4q Rq | E4e F4e G4e E4e | D4e E4e F4e D4e | E4e F4e G4e E4e | D4e E4e F4e D4e | G4q F4q | E4q Rq | D4e E4e F4e D4e | C4q Rq',
    use: '도~솔 다섯 손가락 자리 · 8분음표 넷 묶음과 4분쉼표' },
  { id: 'rowrow', title: 'Row, Row, Row Your Boat(미국 동요)', meter: [6, 8], tempo: 96, key: 0,
    cells: ['리9'],
    mel: 'C4q. C4q. | C4q D4e E4q. | E4q D4e E4q F4e | G4h. | C5e C5e C5e G4e G4e G4e | E4e E4e E4e C4e C4e C4e | G4q F4e E4q D4e | C4h.',
    use: '6/8 — 한 박을 셋으로 나누는 느낌(배 젓기)' },
  { id: 'haenschen', title: 'Hänschen klein 첫 도막(독일 민요)', meter: [2, 4], tempo: 100, key: 0,
    cells: ['건2'],
    mel: 'G4e E4e E4q | F4e D4e D4q | C4e D4e E4e F4e | G4e G4e G4q',
    use: '도레미파솔 다섯 손가락이 차례로 — 셋째 마디에서 한 칸씩 오르기' },

  // ── 클래식 2곡(주제 몇 마디만 · 판본 대조 끝) ──
  { id: 'ode', title: '환희의 송가 주제(베토벤 교향곡 9번)', meter: [4, 4], tempo: 100, key: 0,
    cells: ['건2', '리9'],
    mel: 'E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h | E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | D4q. C4e C4h',
    use: '도~솔 다섯 손가락 · 넷째·여덟째 마디의 점4분+8분' },
  { id: 'haydn94', title: '놀람 교향곡 2악장 주제(하이든 교향곡 94번)', meter: [2, 4], tempo: 104, key: 0,
    cells: ['셈1'],
    mel: '!p C4e C4e E4e E4e | G4e G4e E4q | F4e F4e D4e D4e | B3e B3e G3q | C4e C4e E4e E4e | G4e G4e E4q | C5e C5e F#4e F#4e | G4q G3e Re | !pp C4e C4e E4e E4e | G4e G4e E4q | F4e F4e D4e D4e | B3e B3e G3q | C4e C4e E4e E4e | G4e G4e E4q | C5e C5e F#4e F#4e | G4e Re !ff G5q',
    use: '여리게(p) → 더 여리게(pp) → 갑자기 아주 세게(ff)' },
];

const BY_ID = new Map(SONGS.map(s => [s.id, s]));
export const songById = id => BY_ID.get(id) || null;
