// 칸 장부(engine/cells.js)를 CJS 브라우저 시험에서 읽기 — 손 목록 대신(11-14 · 칸을 더할 때 시험 파일을 고치지 않게)
//  장부 줄 꼴: C('id', '라벨', …, { first: true, frame: 'pick', … }) — 한 줄에 칸 하나. 글에서 정규식으로 읽는다(ESM을 부르지 않음)
//  tests/cells.test.mjs가 이 읽기 = engine/cells.js의 FIRST · frame인지 견준다(정규식이 틀리면 거기서 떨어짐)
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const rows = () => fs.readFileSync(path.join(ROOT, 'engine/cells.js'), 'utf8').split('\n')
  .map(l => l.match(/^\s*C\('([a-z0-9]+)',(.*)$/)).filter(Boolean)
  .map(([, id, rest]) => ({ id, first: /\bfirst: true\b/.test(rest), frame: (rest.match(/\bframe: '([a-z]+)'/) || [])[1] || null }));
// 만든 칸(first) id — 장부 차례
const firstCells = () => rows().filter(r => r.first).map(r => r.id);
// 만든 칸 가운데 칸 파일 app/js/cells/<id>.js가 있는 것(리1 = 징검다리 화면이라 없음)
const cellFile = id => path.join(ROOT, 'app/js/cells', id + '.js');
const builtCells = () => firstCells().filter(id => fs.existsSync(cellFile(id)));
const frameOf = id => (rows().find(r => r.id === id) || {}).frame || null;
module.exports = { rows, firstCells, builtCells, frameOf, cellFile };
