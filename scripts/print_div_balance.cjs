const fs = require('fs');
const path = 'resources/js/GameBoards/SnapsBoard.tsx';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);
let balance=0;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  balance += (line.match(/<div/g)||[]).length;
  balance -= (line.match(/<\/div>/g)||[]).length;
  if (i+1 >= 160 && i+1 <= 210) console.log(i+1, balance, line.replace(/\t/g,'    '));
}
console.log('Final',balance);
