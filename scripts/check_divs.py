from pathlib import Path
p=Path('resources/js/GameBoards/SnapsBoard.tsx')
open_count=0
for i,line in enumerate(p.read_text(encoding='utf-8').splitlines(),start=1):
    open_count += line.count('<div')
    open_count -= line.count('</div>')
    if open_count < 0:
        print('Negative at',i)
        break
print('Final balance',open_count)
