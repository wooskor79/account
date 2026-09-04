import os

with open('api.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == '}' and i > 1799 and i < 1805:
        lines[i] = '\n'

lines.append('}\n')

with open('api.php', 'w', encoding='utf-8') as f:
    f.writelines(lines)