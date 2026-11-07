// 배포 버전 — version.json(앱이 처음에 캐시 없이 읽음) = 앱이 쓰는 파일 목록 + 내용 해시
//  버전이 바뀌면 앱이 모든 파일을 새로 받아 둔 뒤 시작한다(옛 파일과 새 파일이 섞이지 않게 · GitHub Pages 캐시 10분)
//  튼튼 수 다리 tools/ver.mjs(같은 저자)와 같은 방법. node tools/ver.mjs → 다시 씀 · --check → 맞지 않으면 실패
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const files = [...walk(join(ROOT, 'app', 'js')), ...walk(join(ROOT, 'app', 'css')), ...walk(join(ROOT, 'engine'))].filter((f) => /\.(js|css)$/.test(f)).sort();
const h = createHash('sha1');
for (const f of files) { h.update(relative(ROOT, f)); h.update(readFileSync(f)); }
const out = JSON.stringify({ v: h.digest('hex').slice(0, 12), files: files.map((f) => relative(ROOT, f)) }, null, 1) + '\n';
const P = join(ROOT, 'version.json');
if (process.argv.includes('--check')) {
  let cur = ''; try { cur = readFileSync(P, 'utf8'); } catch { /* */ }
  if (cur !== out) { console.log('✗ version.json이 지금 파일과 다름 — node tools/ver.mjs'); process.exit(1); }
  console.log('✓ version.json 맞음');
} else { writeFileSync(P, out); console.log('version.json', JSON.parse(out).v, JSON.parse(out).files.length, '파일'); }
