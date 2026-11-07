// 곡 권리 대장 — 한 줄 = 곡 하나. 곡을 조각(가락 · 노랫말 · 판본)으로 나눠 따로 판정한다.
//  규칙: docs/rights.md (정본 조사: 음악앱-기획/research/songs.md · copyright.md)
//   · 가락: 작곡자 1962년 이전 사망 또는 오래 구전된 전래·민요. 사망 연도를 모르면 넣지 않는다.
//   · 미국 기준(us): 1930년까지 공표된 곡만 '가능'(서버 = GitHub Pages, 미국).
//   · 노랫말: 이번 판은 넣지 않는다(lyrics.verdict = '안 씀'). 한국어 번안 가사는 절대 X.
//   · 판본: 교과서·악보집·인터넷 편곡을 베끼지 않는다. 출처 둘 이상을 대조해 공통 원형만 —
//           대조한 출처를 적고, 못 했으면 checked:false(공개 전에 다시 할 일).
//   · 애매하면 뺀다. 앱(index.js)에는 melody.verdict·us 가 둘 다 '가능'인 줄만 들어간다.
//  출처의 '확인' 날짜는 이 대장을 쓴 날 페이지(위키 원문 wikitext의 악보 블록)를 읽은 날이다.

const DAY = '2026-11-07';
const NO_LYRICS = { verdict: '안 씀' };
const src = (name, url, year = null) => ({ name, year, url, read: DAY });
const WECK = n => src(`J.-B. Weckerlin 『Chansons et rondes enfantines』(Garnier, 1870) ${n}쪽 — 프랑스어 위키문헌 옮김`,
  `https://fr.wikisource.org/wiki/Page:Weckerlin_-_Chansons_et_rondes_enfantines,_Garnier,_1870.djvu/${n}`, 1870);

// 자작(새로 지은 단계 곡) 한 줄
const OWN = (id, title, skeleton, simcheck, note = '') => ({
  id, title, kind: '자작',
  melody: { who: '새로 지음 — Claude(AI)가 계획서 칸 뼈대 안에서', died: null, published: `${DAY}(이 저장소 · 공개 전)`,
    verdict: '가능', why: '새로 지은 단계 곡 · 기존 곡을 옮기지 않음 · 짧은 관용 음형(솔미·도미솔)만 씀', us: '가능' },
  lyrics: NO_LYRICS,
  made: { skeleton, by: 'Claude가 뼈대 안에서 지음 · 교사 확인 전', simcheck },
  checkedAt: DAY, note,
});
const SK1 = m => `계획서 가1 칸: 솔·미(G4·E4)만 · 4마디 · 4분음표·2분음표(+쉼표) · ${m}`;
const SK2 = m => `계획서 가2 칸: 솔·미·라(G4·E4·A4) · 4마디 · 4분음표·2분음표(+쉼표) · ${m}`;
const SK3 = '계획서 가3 칸: 도·미·솔·라(C4·E4·G4·A4) · 4마디 · 4분음표·2분음표(+쉼표) · 4/4';
const SK5 = m => `계획서 리5 칸: 박자표 짝 비교 — 같은 음(도·미·솔) · 같은 빠르기 · 묶음만 다름 · ${m} 네 마디`;

export const LEDGER = [
  // ────────── 자작 12곡 ──────────
  OWN('ga1-insa', '솔미 인사', SK1('4/4'), '통과 · 최고 14% · Rain Rain Go Away(코다이식 솔미 외침) · 기준 40%'),
  OWN('ga1-dol', '솔미 징검돌', SK1('2/4'), '통과 · 최고 0% · 기준 40%(조각 2개뿐인 짧은 곡)'),
  OWN('ga1-swim', '쉬었다 가는 솔미', SK1('4/4'), '통과 · 최고 0% · 기준 40%'),
  OWN('ga2-ra', '라가 왔어요', SK2('4/4'), '통과 · 최고 0% · 기준 40%'),
  OWN('ga2-stair', '솔미라 계단', SK2('4/4'), '통과 · 최고 13% · 퐁당퐁당(홍난파 가락 · 유명) · 기준 40%'),
  OWN('ga2-slide', '라솔미 미끄럼', SK2('2/4'), '통과 · 최고 0% · 기준 40%(조각 2개뿐인 짧은 곡)'),
  OWN('ga3-jump', '도에서 뛰어올라', SK3, '통과 · 최고 0% · 기준 40%'),
  OWN('ga3-home', '솔에서 도까지', SK3, '통과 · 최고 0% · 기준 40%',
    '첫 판(솔미도-미솔라-솔미솔미-도)은 퐁당퐁당 첫머리와 38%로 기준에 가까워 다시 지음'),
  OWN('ri2-ttasum', '따 따 쉼', '계획서 리2 칸: 4분음표·4분쉼표만 · 한 음(G4) · 4마디 · 4/4',
    '통과 · 최고 13% · 아기 상어(핑크퐁 편곡 · 보호 중) · 기준 40%'),
  OWN('ri4-balloon', '길게 부는 풍선', '계획서 리4 칸: 4분음표·2분음표(+쉼표) · 한 음(G4) · 4마디 · 4/4',
    '통과 · 최고 0% · 기준 40%'),
  OWN('ri5-march', '두 박 행진', SK5('2/4'), '통과 · 최고 0% · 기준 40%'),
  OWN('ri5-waltz', '세 박 왈츠', SK5('3/4'), '통과 · 최고 0% · 기준 40%'),

  // ────────── 외국 전래 12곡(앱에 있음) ──────────
  { id: 'ahvous', title: '작은 별 가락(프랑스 민요 「Ah! vous dirai-je, maman」)', kind: '외국 전래',
    melody: { who: '작자 미상(18세기 프랑스 민요)', died: null, published: '1761(첫 출판 — 영어·프랑스어 위키백과)',
      verdict: '가능', why: '작자 미상 옛 민요 · 1761년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [WECK(16),
      src('프랑스어 위키백과 「Ah ! vous dirai-je, maman」 악보', 'https://fr.wikipedia.org/wiki/Ah_!_vous_dirai-je,_maman'),
      src('영어 위키백과 「Twinkle, Twinkle, Little Star」 악보(a 도막만 대조)', 'https://en.wikipedia.org/wiki/Twinkle,_Twinkle,_Little_Star')],
      checked: true,
      note: 'a 도막(도도솔솔 라라솔 …)은 셋 다 같음. b 도막은 옛 판·프랑스어판이 「솔솔 파파 미미 미레」(4분음표 넷+넷), 영어판(트윙클)은 「미미 레(2분)」 — 옛 판을 따름. 바장조 → 다장조. 박자는 옛 판대로 2/4.' },
    checkedAt: DAY, note: '한국어 번안 가사(윤석중)는 보호 중 — 가락만. 제목에 번안 제목을 쓰지 않음' },

  { id: 'auclair', title: 'Au clair de la lune 앞 도막(프랑스 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(18세기 프랑스 민요 · 륄리설은 근거 없음)', died: null,
      published: '1820 무렵 인쇄 기록(『Les Voitures versées』 — 영어 위키백과) · 1870 Weckerlin',
      verdict: '가능', why: '작자 미상 옛 민요', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [WECK(48),
      src('A. Girard 『Chansons populaires enfantines』 32쪽(스캔 36) — 프랑스어 위키문헌 옮김(연도 표시 없음)', 'https://fr.wikisource.org/wiki/Page:Chansons_populaires_enfantines.djvu/36'),
      src('프랑스어 위키백과 「Au clair de la lune」 악보', 'https://fr.wikipedia.org/wiki/Au_clair_de_la_lune')],
      checked: true,
      note: '앞 도막(넷째 마디까지)만. 음·리듬은 셋 다 같고 끝 음 길이만 다름(Weckerlin 4분음표+쉼표 · Girard 점2분음표+4분쉼표 · 위키 온음표) — Girard를 따름. 사장조 → 다장조.' },
    checkedAt: DAY, note: '' },

  { id: 'frere', title: 'Frère Jacques(프랑스 돌림노래)', kind: '외국 전래',
    melody: { who: '작자 미상(18세기 프랑스 돌림노래 · 1780 무렵 필사본)', died: null,
      published: '1811(첫 출판 — 영어·프랑스어 위키백과)', verdict: '가능', why: '작자 미상 옛 돌림노래 · 1811년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [WECK(103),
      src('영어 위키백과 「Frère Jacques」 악보', 'https://en.wikipedia.org/wiki/Fr%C3%A8re_Jacques')],
      checked: true,
      note: '첫째·둘째·넷째 도막은 두 판이 같음. 셋째 도막(솔라솔파 미도)은 옛 판·영어판이 8분음표 넷 — 프랑스어·독일어 위키판은 점8분+16분이라 따르지 않음. 끝 「도 솔 도」의 마지막 음은 옛 판대로 4분음표+쉼표(영어판 2분음표). 옛 판 뒤에 붙은 네 마디(맺음 가락)는 영어판에 없어 뺌. 바장조 → 다장조.' },
    checkedAt: DAY, note: '' },

  { id: 'london', title: 'London Bridge(영미 동요)', kind: '외국 전래',
    melody: { who: '작자 미상(영미 동요)', died: null, published: '1879(지금 가락의 첫 기록 — 미국)',
      verdict: '가능', why: '작자 미상 · 지금 가락 1879년 첫 기록', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「London Bridge Is Falling Down」 악보(바장조)', 'https://en.wikipedia.org/wiki/London_Bridge_Is_Falling_Down'),
      src('일본어 위키백과 「ロンドン橋落ちた」 악보(라장조)', 'https://ja.wikipedia.org/wiki/%E3%83%AD%E3%83%B3%E3%83%89%E3%83%B3%E6%A9%8B%E8%90%BD%E3%81%A1%E3%81%9F')],
      checked: true,
      note: '두 판 음·리듬 같음(조만 다름) → 다장조로 옮김. 1879년 첫 기록 책 이름이 영어판(A. H. Rosewig)과 일본어판(W. H. Shaw)에서 다르게 적혀 있음 — 연도는 같음.' },
    checkedAt: DAY, note: '한국어 번안 가사는 작자 미상 — 안 씀' },

  { id: 'summ', title: 'Summ, summ, summ(보헤미아 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(보헤미아 민요 · 1825 기록설)', died: null,
      published: '1843(『Fünfzig Kinderlieder』, 라이프치히 — 일본어 위키백과)', verdict: '가능', why: '작자 미상 옛 민요 · 1843년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('독일어 위키백과 「Summ, summ, summ」 악보(첫 판 사장조)', 'https://de.wikipedia.org/wiki/Summ,_summ,_summ'),
      src('일본어 위키백과 「ぶんぶんぶん」 악보(1843년 독일 판)', 'https://ja.wikipedia.org/wiki/%E3%81%B6%E3%82%93%E3%81%B6%E3%82%93%E3%81%B6%E3%82%93')],
      checked: true, note: '두 판 음·리듬·쉼표 같음. 사장조 → 다장조.' },
    checkedAt: DAY, note: '독일어 가사 Hoffmann von Fallersleben(1874 사망)·일본어 번안 가사 모두 안 씀' },

  { id: 'rowrow', title: 'Row, Row, Row Your Boat(미국 동요)', kind: '외국 전래',
    melody: { who: 'Eliphalet Oram Lyte가 기록(작곡인지 편곡인지 불분명)', died: 1913,
      published: '1881(『The Franklin Square Song Collection』, 뉴욕 — 영어 위키백과)', verdict: '가능',
      why: '지금 가락 1881년 첫 기록 · 기록자 Lyte 1913년 사망(영어 위키백과 「Eliphalet Oram Lyte」)', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Row, Row, Row Your Boat」 악보(6/8)', 'https://en.wikipedia.org/wiki/Row,_Row,_Row_Your_Boat'),
      src('프랑스어 위키백과 「Row, Row, Row Your Boat」 악보(4/4 셋잇단 표기)', 'https://fr.wikipedia.org/wiki/Row,_Row,_Row_Your_Boat')],
      checked: true, note: '음은 같음. 영어판 6/8의 긴-짧(4분+8분)을 프랑스어판은 4/4 점8분+16분·셋잇단으로 적음 — 6/8(영어판)을 따름.' },
    checkedAt: DAY, note: '' },

  { id: 'haenschen', title: 'Hänschen klein 첫 도막(독일 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(독일 민요 · 1784 춤곡 필사본)', died: null,
      published: '1807(『Sammlung deutscher Volkslieder』 Büsching·von der Hagen — 독일어 위키백과)', verdict: '가능',
      why: '작자 미상 옛 민요 · 1807년 출판(노랫말 Wiedemann 1882 사망 — 노랫말은 안 씀)', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('독일어 위키백과 「Hänschen klein」 악보', 'https://de.wikipedia.org/wiki/H%C3%A4nschen_klein'),
      src('영어 위키백과 「Hänschen klein」 악보(독일어판과 같은 표기를 옮김)', 'https://en.wikipedia.org/wiki/H%C3%A4nschen_klein'),
      src('일본어 위키백과 「ちょうちょう (唱歌)」 악보(일본 번안판 · 길이를 두 배로 적음)', 'https://ja.wikipedia.org/wiki/%E3%81%A1%E3%82%87%E3%81%86%E3%81%A1%E3%82%87%E3%81%86_(%E5%94%B1%E6%AD%8C)')],
      checked: true,
      note: '첫 도막(넷째 마디)만 넣음 — 여기까지는 독일판과 일본 번안판의 음·리듬 비율이 같음. 그 뒤는 끝맺음이 갈림(독일판 도로 끝 · 일본·한국 번안판 미로 끝). 바장조 → 다장조.' },
    checkedAt: DAY, note: '한국어 「나비야」 가사는 작사 미상 번안 — 안 씀. 제목도 원어로' },

  { id: 'kuckuck', title: 'Kuckuck, Kuckuck(오스트리아 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(오스트리아·바이에른 민요 「Stieglitz, Stieglitz」 가락 · 1817 전승)', died: null,
      published: '1842(이 가락으로 첫 인쇄 — 독일어 위키백과)', verdict: '가능', why: '작자 미상 옛 민요 · 1842년 인쇄', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('독일어 위키백과 「Kuckuck, Kuckuck, ruft’s aus dem Wald」 악보(두 성부 중 윗성부)', 'https://de.wikipedia.org/wiki/Kuckuck,_Kuckuck,_ruft%E2%80%99s_aus_dem_Wald')],
      checked: false, note: '대조 못 함 — 글로 된 악보 출처가 한 곳뿐(영어·일본어 위키엔 악보 없음). 공개 전에 옛 노래책 스캔과 다시 대조. 사장조 → 다장조.' },
    checkedAt: DAY, note: '독일어 가사 Hoffmann von Fallersleben · 한국어 번안 「뻐꾸기」(박목월설) 안 씀' },

  { id: 'weasel', title: 'Pop Goes the Weasel(영국 동요)', kind: '외국 전래',
    melody: { who: '작자 미상(영국 동요 · 춤곡)', died: null, published: '1852~1853(악보 출판 — 영어·프랑스어 위키백과)',
      verdict: '가능', why: '작자 미상 · 1850년대 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Pop Goes the Weasel」 악보', 'https://en.wikipedia.org/wiki/Pop_Goes_the_Weasel'),
      src('프랑스어 위키백과 「Pop Goes the Weasel」 악보(영어판과 같은 표기를 옮김)', 'https://fr.wikipedia.org/wiki/Pop_Goes_the_Weasel')],
      checked: false, note: '대조 못 함 — 두 위키 판이 같은 표기를 옮긴 것이라 독립 출처가 아님. 공개 전에 1850년대 악보 스캔과 다시 대조.' },
    checkedAt: DAY, note: '' },

  { id: 'mulberry', title: 'Here We Go Round the Mulberry Bush(영국 동요)', kind: '외국 전래',
    melody: { who: '작자 미상(18세기 중반 런던 곡조 「Nancy Dawson」)', died: null,
      published: '18세기 중반 곡조 · 『The Baby\'s Opera』(1877, 1900판)에 실림(영어 위키문헌 목록)', verdict: '가능',
      why: '작자 미상 옛 곡조 · 19세기 노래책에 실림', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Here We Go Round the Mulberry Bush」 악보(사장조)', 'https://en.wikipedia.org/wiki/Here_We_Go_Round_the_Mulberry_Bush')],
      checked: false, note: '대조 못 함 — 한 곳뿐. 『The Baby\'s Opera』 위키문헌 쪽은 그림만이라 음을 못 읽음. 공개 전에 옛 노래책 스캔과 다시 대조. 사장조 → 다장조(가장 낮은 음 G3).' },
    checkedAt: DAY, note: '' },

  { id: 'surlepont', title: 'Sur le pont d\'Avignon(프랑스 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(프랑스 민요 · 1853년 아당이 오페라에 써서 퍼짐)', died: null,
      published: '1853 무렵(프랑스어 위키백과) · 1870 Weckerlin', verdict: '가능', why: '작자 미상 옛 민요(아당 1856 사망)', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [WECK(34),
      src('영어 위키백과 「Sur le Pont d\'Avignon」 악보(Weckerlin 1870을 옮긴 것)', 'https://en.wikipedia.org/wiki/Sur_le_Pont_d%27Avignon')],
      checked: false,
      note: '옛 판(1870)과는 맞춰 봄. 영어판은 같은 옛 판을 옮긴 것이라 둘째 독립 출처가 아님. 프랑스어 위키판은 못갖춘마디·리듬이 다른 갈래(변형이 많은 노래). 공개 전에 다른 옛 판 하나와 더 대조. 사장조 → 다장조.' },
    checkedAt: DAY, note: '' },

  { id: 'choux', title: 'Savez-vous planter les choux(프랑스 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(프랑스 민요)', died: null, published: '1870(Weckerlin 노래책에 실림)',
      verdict: '가능', why: '작자 미상 옛 민요 · 1870년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [WECK(108)],
      checked: false, note: '옛 판(1870) 한 곳만 읽음 — 둘째 출처와 대조 못 함. 바장조 → 다장조(가장 낮은 음 B3).' },
    checkedAt: DAY, note: '' },

  // ────────── 클래식 6곡(앱에 있음 · 주제 몇 마디만) ──────────
  { id: 'ode', title: '환희의 송가 주제(베토벤 교향곡 9번)', kind: '클래식',
    melody: { who: 'Ludwig van Beethoven', died: 1827, published: '1824 완성·초연(영어 위키백과)',
      verdict: '가능', why: '작곡자 1827년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Ode to Joy」 악보(사장조)', 'https://en.wikipedia.org/wiki/Ode_to_Joy'),
      src('프랑스어 위키백과 「Ode à la joie」 악보(사장조)', 'https://fr.wikipedia.org/wiki/Ode_%C3%A0_la_joie')],
      checked: true,
      note: '앞 여덟 마디만(두 판 같음). 열두째 마디의 당김음은 영어판에만 있어 넣지 않음. 원곡 라장조 · 위키 두 판 사장조 → 다장조로 옮김.' },
    checkedAt: DAY, note: '실러 독일어 가사·한국어 번역 가사 안 씀' },

  { id: 'haydn94', title: '놀람 교향곡 2악장 주제(하이든 교향곡 94번)', kind: '클래식',
    melody: { who: 'Joseph Haydn', died: 1809, published: '1792 초연(런던 — 영어·일본어 위키백과)',
      verdict: '가능', why: '작곡자 1809년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Symphony No. 94 (Haydn)」 2악장 주제 악보', 'https://en.wikipedia.org/wiki/Symphony_No._94_(Haydn)'),
      src('일본어 위키백과 「交響曲第94番 (ハイドン)」 2악장 주제 악보', 'https://ja.wikipedia.org/wiki/%E4%BA%A4%E9%9F%BF%E6%9B%B2%E7%AC%AC94%E7%95%AA_(%E3%83%8F%E3%82%A4%E3%83%89%E3%83%B3)')],
      checked: true,
      note: '두 판 음·리듬·셈여림(p → pp → ff) 같음. 원조(다장조) 그대로. 끝의 놀람 화음(솔·시·솔 세 음)은 한 음 소리라 맨 윗음 G5 하나로 줄임.' },
    checkedAt: DAY, note: '' },

  { id: 'mountain', title: '산왕의 궁전에서 주제(그리그 「페르 귄트」)', kind: '클래식',
    melody: { who: 'Edvard Grieg', died: 1907, published: '1888(「페르 귄트」 모음곡 1번 Op.46 출판 — 영어 위키백과 「Peer Gynt (Grieg)」) · 1876 초연',
      verdict: '가능', why: '작곡자 1907년 사망 · 1888년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('독일어 위키백과 「In der Halle des Bergkönigs」 악보(주제 네 마디)', 'https://de.wikipedia.org/wiki/In_der_Halle_des_Bergk%C3%B6nigs'),
      src('영어 위키백과 「In the Hall of the Mountain King」 악보(독일어판과 같은 표기)', 'https://en.wikipedia.org/wiki/In_the_Hall_of_the_Mountain_King')],
      checked: false,
      note: '대조 못 함 — 두 위키 판의 네 마디가 음까지 같지만 같은 표기를 옮겨 쓴 것으로 보여 독립 출처가 아님(일본어 위키엔 악보 없음). 공개 전에 1888년 모음곡 판(IMSLP 작품 페이지)과 다시 대조. 나단조 → 가단조(조표 없음)로 옮기고 높게(A4~A5) 적음 — 원곡은 낮은 바순·첼로.' },
    checkedAt: DAY, note: '' },

  { id: 'brahms', title: '자장가(브람스 Op.49-4)', kind: '클래식',
    melody: { who: 'Johannes Brahms', died: 1897, published: '1868년 11월 Simrock 출판(영어 위키백과 「Wiegenlied (Brahms)」)',
      verdict: '가능', why: '작곡자 1897년 사망 · 1868년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('독일어 위키백과 「Guten Abend, gut’ Nacht」 악보', 'https://de.wikipedia.org/wiki/Guten_Abend,_gut%E2%80%99_Nacht'),
      src('영어 위키백과 「Wiegenlied (Brahms)」 악보(같은 표기)', 'https://en.wikipedia.org/wiki/Wiegenlied_(Brahms)'),
      src('일본어 위키백과 「子守歌 (ブラームス)」 악보(같은 표기)', 'https://ja.wikipedia.org/wiki/%E5%AD%90%E5%AE%88%E6%AD%8C_(%E3%83%96%E3%83%A9%E3%83%BC%E3%83%A0%E3%82%B9)')],
      checked: false,
      note: '대조 못 함 — 세 위키 판이 한 표기를 옮겨 쓴 것이라 독립 출처가 아님. 공개 전에 1868년 Simrock 판(IMSLP 작품 페이지)과 다시 대조. 꾸밈음(앞꾸밈·뒤꾸밈) 둘은 뺌. 내림마장조 → 다장조.' },
    checkedAt: DAY, note: '독일어 가사(민요시집·Scherer)·한국어 번역 가사 안 씀' },

  { id: 'k525', title: '아이네 클라이네 나흐트무지크 1악장 첫 주제(모차르트 K.525)', kind: '클래식',
    melody: { who: 'Wolfgang Amadeus Mozart', died: 1791, published: '1827 무렵 André 출판(영어 위키백과)',
      verdict: '가능', why: '작곡자 1791년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Eine kleine Nachtmusik」 1악장 첫 주제 악보', 'https://en.wikipedia.org/wiki/Eine_kleine_Nachtmusik')],
      checked: false,
      note: '대조 못 함 — 이 주제의 글로 된 악보는 영어판 한 곳(독일어판엔 2~4악장 주제만 있고 그 셋은 영어판과 같음). 공개 전에 옛 판 스캔과 다시 대조. 사장조 → 다장조(G4~G5).' },
    checkedAt: DAY, note: '' },

  { id: 'canon', title: '캐논 되풀이 베이스(파헬벨)', kind: '클래식',
    melody: { who: 'Johann Pachelbel', died: 1706, published: '1919년 Gustav Beckmann이 처음 출판(영어 위키백과)',
      verdict: '가능', why: '작곡자 1706년 사망 · 1919년 출판(1930년 이전)', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [
      src('영어 위키백과 「Pachelbel\'s Canon」 악보(첼로 성부)', 'https://en.wikipedia.org/wiki/Pachelbel%27s_Canon'),
      src('독일어 위키백과 「Kanon und Gigue in D-Dur (Pachelbel)」 악보(같은 표기)', 'https://de.wikipedia.org/wiki/Kanon_und_Gigue_in_D-Dur_(Pachelbel)')],
      checked: false,
      note: '대조 못 함 — 두 위키 판이 같은 표기를 옮긴 것. 베이스 여덟 음(라장조 D-A-B-F♯-G-D-G-A)은 두 판 글 설명과도 같음. 1919년 첫 출판본은 편집자 판이라, 공개 전에 옛 필사본 계열 출처와 다시 대조. 라장조 → 다장조 · 높게(C4~C5) 적고 두 번 되풀이.' },
    checkedAt: DAY, note: '' },

  // ────────── 국내 전래 — 대장 줄만(옛 출처 대조 전 · 앱에 아직 안 넣음) ──────────
  ...[
    ['jamjam', '잼잼 도리도리', '전래(경북 채록 · 『꿩꿩 장서방』)', '미·솔(단3도) · 12/8 — 전래에서 유일한 솔-미 두 음'],
    ['ibak', '이 박 저 박', '전래(7차 1학년 수록판)', '미·솔·라 · 4/4(단모리)'],
    ['kkokkok', '꼭꼭 숨어라', '전래(7차 2학년 수록판)', '솔·라 · 12/8(자진모리)'],
    ['dalpaengi', '달팽이(달팽아 뿔 내라)', '전래(경북 채록)', '도·레·미 · 12/8'],
  ].map(([id, title, who, tones]) => ({
    id, title, kind: '국내 전래',
    melody: { who, died: null, published: '구전(채록본 연도는 대조 때 확인)', verdict: '가능',
      why: '오래 구전된 전래동요 — 개인 작자 없음(조사 songs.md 갈래 1)', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [], checked: false,
      note: `옛 채록본 둘 이상 대조 전. 국립국악원 표준악보집·교과서 판면을 베끼지 않는다. 라 중심 표기 그대로(${tones}).` },
    checkedAt: DAY, note: '대조 전 · 앱에 아직 안 넣음 — 미국 기준은 구전이라 공표 연도로 셀 수 없어 판본 대조 때 같이 정함',
  })),

  // ────────── 검토했지만 뺀 곡(앱에 안 넣음 · 까닭) ──────────
  { id: 'x-rainrain', title: 'Rain, Rain, Go Away(솔·미 외침 가락)', kind: '외국 전래',
    melody: { who: '작자 미상', died: null, published: '노랫말 17세기 기록 · 솔·미 가락의 첫 인쇄는 못 찾음',
      verdict: '확인 필요', why: '쓰려던 솔·미 가락의 옛 출처를 못 찾음 — 영어 위키 악보(Halliwell 1844 판으로 적힘)는 파·레·도까지 쓰는 다른 가락', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('영어 위키백과 「Rain Rain Go Away」', 'https://en.wikipedia.org/wiki/Rain_Rain_Go_Away')], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음 — 애매하면 뺀다. 가1 칸은 자작 곡으로 채움' },
  { id: 'x-lucylocket', title: 'Lucy Locket(솔·미·라 가락)', kind: '외국 전래',
    melody: { who: '작자 미상', died: null, published: '노랫말 1842 기록 · 솔·미·라 가락의 첫 인쇄는 못 찾음',
      verdict: '확인 필요', why: '영어 위키백과는 「Yankee Doodle」 가락으로 부른다고 적음 — 코다이식 솔·미·라 판의 옛 출처를 못 찾음', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('영어 위키백과 「Lucy Locket」', 'https://en.wikipedia.org/wiki/Lucy_Locket')], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음. 가2 칸은 자작 곡으로 채움' },
  { id: 'x-hotcross', title: 'Hot Cross Buns(미·레·도 판)', kind: '외국 전래',
    melody: { who: '작자 미상', died: null, published: '1767 돌림노래 인쇄(다른 가락) · 미·레·도 판의 첫 인쇄는 못 찾음',
      verdict: '확인 필요', why: '위키 악보는 1767년 무렵 돌림노래(다른 가락) — 흔히 쓰는 미·레·도 세 음 판의 옛 출처를 못 찾음', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('영어 위키백과 「Hot Cross Buns (song)」', 'https://en.wikipedia.org/wiki/Hot_Cross_Buns_(song)')], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음' },
  { id: 'x-rosie', title: 'Ring Around the Rosie', kind: '외국 전래',
    melody: { who: '작자 미상', died: null, published: '노랫말 1881 인쇄 · 1898 Gomme 책에 가락 여럿',
      verdict: '확인 필요', why: '가락이 여러 갈래 · 지금 미국 가락의 첫 인쇄를 대조 못 함(위키에 악보 없음)', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('영어 위키백과 「Ring a Ring o\' Roses」', 'https://en.wikipedia.org/wiki/Ring_a_Ring_o%27_Roses')], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음' },
  { id: 'x-mary', title: 'Mary Had a Little Lamb(Merrily We Roll Along 가락)', kind: '외국 전래',
    melody: { who: '작자 미상(「Goodnight, Ladies」 후렴 가락)', died: null, published: '1867(「Goodnight, Ladies」 — 영어 위키백과)',
      verdict: '가능', why: '작자 미상 · 1867년 출판', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('일본어 위키백과 「メリーさんのひつじ」 악보', 'https://ja.wikipedia.org/wiki/%E3%83%A1%E3%83%AA%E3%83%BC%E3%81%95%E3%82%93%E3%81%AE%E3%81%B2%E3%81%A4%E3%81%98')],
      checked: false, note: '글로 된 악보가 일본어판 하나 — 흔한 판과 리듬이 다름(점4분 시작 · 긴 음 자리에 쉼표). 공통 원형을 못 정함.' },
    checkedAt: DAY, note: '앱에 아직 안 넣음 — 판본 대조 뒤 다음 판 후보. 한국어 「비행기」 가사(윤석중)는 보호 중' },
  { id: 'x-entchen', title: 'Alle meine Entchen(독일 민요)', kind: '외국 전래',
    melody: { who: '작자 미상(18세기 춤곡 필사본 · 1750 무렵·1784)', died: null, published: '첫 인쇄 연도 확인 못 함(1824설은 반박 있음)',
      verdict: '가능', why: '작자 미상 옛 가락', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('독일어 위키백과 「Alle meine Entchen」 악보', 'https://de.wikipedia.org/wiki/Alle_meine_Entchen')], checked: false, note: '한 곳뿐' },
    checkedAt: DAY, note: '앱에 안 넣음 — 1930년 이전 공표를 출처로 확인 못 함(미국 기준)' },
  { id: 'x-oldmac', title: 'Old MacDonald Had a Farm', kind: '외국 전래',
    melody: { who: '작자 미상', died: null, published: '1917 「Ohio」(비슷한 곡) · 1925 음반 — 지금 가락의 1930년 이전 인쇄 확인 못 함',
      verdict: '확인 필요', why: '지금 가락의 첫 인쇄를 출처로 확인 못 함', us: '확인 필요' },
    lyrics: NO_LYRICS,
    edition: { sources: [src('일본어 위키백과 「ゆかいな牧場」 악보', 'https://ja.wikipedia.org/wiki/%E3%82%86%E3%81%8B%E3%81%84%E3%81%AA%E7%89%A7%E5%A0%B4')], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음' },
  { id: 'x-dvorak', title: '신세계 교향곡 2악장 주제(드보르자크)', kind: '클래식',
    melody: { who: 'Antonín Dvořák', died: 1904, published: '1893 초연 · Simrock 출판(1893 말~1894 초 — 일본어 위키백과, 출처 요구 붙음)',
      verdict: '가능', why: '작곡자 1904년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [], checked: false, note: '글로 된 악보 출처를 못 찾음(영어·독일어·일본어 위키 모두 그림·PDF만) — 기억으로 적지 않음' },
    checkedAt: DAY, note: '앱에 아직 안 넣음 — 다음 판 후보(음색·느리게). 「Goin\' Home」 가사(1922)는 안 씀' },
  { id: 'x-cancan', title: '천국과 지옥 캉캉(오펜바흐 「Galop infernal」)', kind: '클래식',
    melody: { who: 'Jacques Offenbach', died: 1880, published: '1858 초연(영어 위키백과 「Orpheus in the Underworld」)',
      verdict: '가능', why: '작곡자 1880년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [], checked: false, note: '글로 된 악보 출처를 못 찾음 — 기억으로 적지 않음' },
    checkedAt: DAY, note: '앱에 아직 안 넣음 — 다음 판 후보(빠르기)' },
  { id: 'x-morning', title: '아침 기분(그리그 「페르 귄트」)', kind: '클래식',
    melody: { who: 'Edvard Grieg', died: 1907, published: '1888(모음곡 1번 — 영어 위키백과)', verdict: '가능', why: '작곡자 1907년 사망', us: '가능' },
    lyrics: NO_LYRICS,
    edition: { sources: [], checked: false, note: '글로 된 악보 출처를 못 찾음 — 기억으로 적지 않음' },
    checkedAt: DAY, note: '앱에 아직 안 넣음 — 다음 판 후보(6/8 · 음색)' },
  { id: 'x-peter', title: '피터와 늑대(프로코피예프)', kind: '클래식',
    melody: { who: 'Sergei Prokofiev', died: 1953, published: '1936(조사 songs.md #125)', verdict: '가능',
      why: '국내는 만료(1953 사망)', us: '불가' },
    lyrics: NO_LYRICS,
    edition: { sources: [], checked: false, note: '—' },
    checkedAt: DAY, note: '앱에 안 넣음 — 1931년 이후 공표라 미국에서 2031년 말까지 보호될 수 있음' },
];

const BY_ID = new Map(LEDGER.map(r => [r.id, r]));
export const ledgerById = id => BY_ID.get(id) || null;
