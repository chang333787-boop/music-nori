// 닮음 검사(simcheck) — 새로 지은 단계 곡(자작)이 유명 곡과 닮았는지 본다.
//
//  비교 단위: 음 다섯 개짜리 조각(5음 조각). 조각 하나 = 이웃한 음 사이 네 칸의
//    '음정(반음 차) + 길이 비율'. 조를 옮기거나 빠르기를 바꿔도 같은 조각으로 센다.
//    쉼표도 한 칸으로 넣는다(같은 음정이라도 쉬는 자리가 다르면 다른 리듬).
//  겹침 비율 = 자작 곡의 서로 다른 조각 가운데 상대 곡에도 있는 조각의 몫.
//  기준: 겹침 40% 이상이면 '다시 짓기'. (참고로 리듬을 뺀 '음정만' 겹침도 같이 찍는다.)
//
//  유명 곡 첫머리는 저장소에 읽을 수 있는 꼴로 두지 않는다 — 조각의 해시만
//  tools/simcheck.hashes.json 에 둔다. 원본(첫머리 음)은 저장소 밖 비공개 파일에서 만든다.
//
//  쓰는 법
//    node tools/simcheck.mjs                    자작 곡마다 가장 닮은 곡과 겹침 비율을 찍는다
//    node tools/simcheck.mjs --build <원본 파일>   비공개 원본에서 해시 파일을 다시 만든다
//  원본 파일 꼴(한 줄 = 곡 하나):  이름 | 박자(4/4) | 가락(engine/song.js 적는 법)   · '#' 줄은 주석
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeSong } from '../engine/song.js';

export const N = 5;               // 조각 길이(음·쉼표 개수)
export const LIMIT = 0.4;         // 이 몫 이상 겹치면 다시 짓기
const HERE = dirname(fileURLToPath(import.meta.url));
export const HASH_FILE = join(HERE, 'simcheck.hashes.json');

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratio = (a, b) => { const g = gcd(a, b); return `${a / g}/${b / g}`; };
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

// 곡 → 사건 목록 [{ p: 음높이 | null(쉼표), d: 틱 }] — 붙임줄은 합치고, 이어진 쉼표는 하나로
export function events(song) {
  const out = [];
  for (const e of song.ev) {
    const last = out[out.length - 1];
    if (e.p == null) {
      if (last && last.p == null) last.d += e.d; else out.push({ p: null, d: e.d });
      continue;
    }
    if (last && last.tie && last.p === e.p) { last.d += e.d; last.tie = !!e.tie; continue; }
    out.push({ p: e.p, d: e.d, tie: !!e.tie });
  }
  return out.map(({ p, d }) => ({ p, d }));
}

// 칸 = 앞 사건에서 이 사건으로 넘어가는 한 걸음. 음정은 바로 앞 '음'과의 반음 차(쉼표는 'R')
function steps(ev) {
  const full = [], pitch = [];
  let lastP = null;
  ev.forEach((e, i) => {
    if (i > 0) {
      const iv = e.p == null ? 'R' : (lastP == null ? 'S' : String(e.p - lastP));
      full.push(`${iv}:${ratio(e.d, ev[i - 1].d)}`);
    }
    if (e.p != null) lastP = e.p;
  });
  const notes = ev.filter(e => e.p != null);
  for (let i = 1; i < notes.length; i++) pitch.push(String(notes[i].p - notes[i - 1].p));
  return { full, pitch };
}

// 곡 → 조각 해시 집합 { g: 음정+길이, p: 음정만 }
export function grams(song) {
  const { full, pitch } = steps(events(song));
  const take = (arr, tag) => {
    const set = new Set();
    for (let i = 0; i + (N - 1) <= arr.length; i++) set.add(hash(`${tag}|${arr.slice(i, i + N - 1).join(',')}`));
    return set;
  };
  return { g: take(full, 'g'), p: take(pitch, 'p') };
}

const share = (mine, theirs) => {
  if (!mine.size) return 0;
  let hit = 0;
  for (const h of mine) if (theirs.has(h)) hit++;
  return hit / mine.size;
};

export function loadHashes(file = HASH_FILE) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  return j.songs.map(s => ({ name: s.name, g: new Set(s.g), p: new Set(s.p) }));
}

// 자작 곡마다 가장 닮은 곡 찾기. targets = 해시(유명 곡) + 앱의 다른 갈래 곡(외국 전래·클래식)
export function checkAll(songs, ledger, hashes = loadHashes()) {
  const kindOf = id => (ledger.find(r => r.id === id) || {}).kind;
  const own = songs.filter(s => kindOf(s.id) === '자작');
  const targets = [
    ...hashes.map(h => ({ name: h.name, g: h.g, p: h.p })),
    ...songs.filter(s => kindOf(s.id) !== '자작').map(s => ({ name: `${s.title}(앱 곡)`, ...grams(makeSong(s)) })),
  ];
  return own.map(s => {
    const mine = grams(makeSong(s));
    let best = { name: '-', g: 0, p: 0 }, bestP = { name: '-', p: 0 };
    for (const t of targets) {
      const g = share(mine.g, t.g), p = share(mine.p, t.p);
      if (g > 0 && (g > best.g || (g === best.g && p > best.p))) best = { name: t.name, g, p };   // 겹침 0%면 이름 '-'
      if (p > bestP.p) bestP = { name: t.name, p };
    }
    return { id: s.id, title: s.title, grams: mine.g.size, best, bestP, pass: best.g < LIMIT };
  });
}

export const pct = x => `${Math.round(x * 100)}%`;

// ── 명령줄 ──
async function main(argv) {
  if (argv[0] === '--build') {
    const src = argv[1];
    if (!src) { console.error('원본 파일 경로를 주세요: --build <파일>'); process.exit(2); }
    const out = [];
    for (const line of readFileSync(src, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const parts = t.split(' | ');                       // 가락 안의 마디줄 ' | ' 은 셋째 칸부터 다시 잇는다
      const name = parts[0].trim(), meter = parts[1].trim(), mel = parts.slice(2).join(' | ').trim();
      const m = meter.split('/').map(Number);
      const song = makeSong({ id: name, mel, meter: m });
      if (song.errors.length) { console.error(`✗ ${name}: ${song.errors.join(' / ')}`); process.exit(1); }
      const { g, p } = grams(song);
      out.push({ name, g: [...g].sort(), p: [...p].sort() });
    }
    const body = {
      about: '유명 곡 첫머리의 5음 조각 해시(sha256 앞 16자리). 음은 저장소에 두지 않는다 — tools/simcheck.mjs 맨 위 주석 참고.',
      n: N, made: new Date().toISOString().slice(0, 10), songs: out,
    };
    const lines = out.map(s => '  ' + JSON.stringify(s));             // 곡 하나 = 한 줄(차이 보기 쉽게)
    const head = JSON.stringify({ about: body.about, n: body.n, made: body.made }).slice(0, -1);
    writeFileSync(HASH_FILE, `${head},"songs":[\n${lines.join(',\n')}\n]}\n`);
    console.log(`해시 파일을 만들었어요: 곡 ${out.length}개 → ${HASH_FILE}`);
    return;
  }
  const { SONGS } = await import('../engine/songs/index.js');
  const { LEDGER } = await import('../engine/songs/ledger.js');
  const res = checkAll(SONGS, LEDGER);
  let bad = 0;
  for (const r of res) {
    if (!r.pass) bad++;
    console.log(`${r.pass ? '통과' : '다시 짓기'}  ${r.id.padEnd(14)} 최고 ${pct(r.best.g).padStart(4)} · ${r.best.name}   (음정만 최고 ${pct(r.bestP.p)} · ${r.bestP.name})`);
  }
  console.log(bad ? `✗ 기준(${pct(LIMIT)}) 넘는 자작 곡 ${bad}개` : `✓ 자작 곡 ${res.length}개 모두 기준(${pct(LIMIT)}) 아래`);
  if (bad) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
